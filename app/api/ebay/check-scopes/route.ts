import { NextRequest } from 'next/server';
import { requireApiToken } from '@/app/lib/middleware/apiAuth';
import { withQueryDebugLogging, logToDebug } from '@/app/lib/middleware/queryDebugMiddleware';
import { getEbayConfig, getEbayUrls } from '@/app/lib/config/ebay';
import { EbayTokenRefreshService } from '@/app/lib/services/ebayTokenRefresh';
import prisma from '@/app/lib/services/database';

async function testEbayApiAccess(accessToken: string) {
  try {
    const config = getEbayConfig();
    const urls = getEbayUrls(config.isProduction);

    const response = await fetch(`${urls.api}/oauth/api_scope`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();

    return {
      hasAccess: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      responseData: response.ok ? responseText : null,
      error: response.ok ? null : responseText,
    };
  } catch (error) {
    return {
      hasAccess: false,
      statusCode: 0,
      statusText: 'Network Error',
      responseData: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

const postHandler = requireApiToken(async (request: NextRequest, authData) => {
  try {
    const config = getEbayConfig();
    const body = await request.json();
    const { accountId } = body;

    // Debug log the incoming request
    await logToDebug('EBAY', 'Check Scopes API Called', {
      requestBody: body,
      accountId,
      userId: authData.user.id,
      userEmail: authData.user.email
    }, 'INFO');

    if (!accountId) {
      return Response.json(
        { success: false, message: 'accountId is required' },
        { status: 400 }
      );
    }

    const ebayAccount = await prisma.ebayUserToken.findFirst({
      where: {
        id: accountId,
        userId: authData.user.id,
      },
      select: {
        id: true,
        friendlyName: true,
        ebayUserId: true,
        ebayUsername: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
        scopes: true,
        status: true,
        lastUsedAt: true,
      },
    });

    // Debug log the database query result
    await logToDebug('EBAY', 'Database Query Result', {
      queryAccountId: accountId,
      queryUserId: authData.user.id,
      foundAccount: !!ebayAccount,
      accountData: ebayAccount ? {
        id: ebayAccount.id,
        friendlyName: ebayAccount.friendlyName,
        expiresAt: ebayAccount.expiresAt,
        expiresAtType: typeof ebayAccount.expiresAt,
        expiresAtIsNull: ebayAccount.expiresAt === null,
        status: ebayAccount.status
      } : null
    }, 'INFO');

    if (!ebayAccount) {
      return Response.json(
        { success: false, message: 'eBay account not found' },
        { status: 404 }
      );
    }

    // Auto-refresh token if expired/expiring
    let validAccount;
    try {
      validAccount = await EbayTokenRefreshService.ensureValidToken({
        id: ebayAccount.id,
        accessToken: ebayAccount.accessToken,
        refreshToken: ebayAccount.refreshToken,
        expiresAt: ebayAccount.expiresAt,
        friendlyName: ebayAccount.friendlyName
      });

      await logToDebug('EBAY', 'Token validation completed', {
        accountId: validAccount.id,
        friendlyName: validAccount.friendlyName,
        expiresAt: validAccount.expiresAt?.toISOString(),
        wasRefreshed: validAccount.accessToken !== ebayAccount.accessToken
      }, 'INFO');

    } catch (error) {
      await logToDebug('EBAY', 'Token validation failed', {
        accountId: ebayAccount.id,
        friendlyName: ebayAccount.friendlyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'ERROR');

      return Response.json(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Token validation failed',
          data: {
            account: {
              id: ebayAccount.id,
              friendlyName: ebayAccount.friendlyName,
              isExpired: true,
              expiresAt: ebayAccount.expiresAt,
              requiresReauth: true
            }
          }
        },
        { status: 400 }
      );
    }

    const apiTest = await testEbayApiAccess(validAccount.accessToken);

    // Log the eBay API test result
    await logToDebug('EBAY', 'eBay scope check completed', {
      accountId: validAccount.id,
      friendlyName: validAccount.friendlyName,
      hasAccess: apiTest.hasAccess,
      statusCode: apiTest.statusCode,
      tokenWasRefreshed: validAccount.accessToken !== ebayAccount.accessToken
    }, 'INFO');

    const storedScopes = typeof ebayAccount.scopes === 'string'
      ? JSON.parse(ebayAccount.scopes)
      : ebayAccount.scopes || [];

    return Response.json({
      success: true,
      data: {
        account: {
          id: ebayAccount.id,
          friendlyName: ebayAccount.friendlyName,
          ebayUserId: ebayAccount.ebayUserId,
          ebayUsername: ebayAccount.ebayUsername,
          status: ebayAccount.status,
          isExpired: false,
          expiresAt: ebayAccount.expiresAt,
          lastUsedAt: ebayAccount.lastUsedAt,
        },
        apiScopeTest: {
          endpoint: 'https://api.ebay.com/oauth/api_scope',
          description: 'View public data from eBay',
          hasAccess: apiTest.hasAccess,
          statusCode: apiTest.statusCode,
          statusText: apiTest.statusText,
          responseData: apiTest.responseData,
          error: apiTest.error,
          testedAt: new Date().toISOString(),
          environment: config.isProduction ? 'production' : 'sandbox',
        },
        storedScopes: {
          total: storedScopes.length,
          scopes: storedScopes,
        },
        apiTokenInfo: {
          tokenName: authData.token.name,
          user: authData.user.email,
        }
      }
    });

  } catch (error) {
    console.error('Error checking eBay scopes:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = withQueryDebugLogging(postHandler);