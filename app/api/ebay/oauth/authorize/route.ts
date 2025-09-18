import { NextRequest, NextResponse } from 'next/server';
import { ebayOAuthService } from '@/app/lib/services/ebayOAuth';
import prisma from '@/app/lib/services/database';
import { EBAY_OAUTH_SCOPES } from '@/app/lib/constants/ebayScopes';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_REDIRECT_URI) {
      return NextResponse.json(
        { success: false, message: 'eBay OAuth configuration missing' },
        { status: 500 }
      );
    }

    // Fetch the account to get its selected scopes
    const account = await prisma.ebayUserToken.findUnique({
      where: { id: accountId },
      select: { scopes: true }
    });

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Account not found' },
        { status: 404 }
      );
    }

    // Parse the selected scopes from the database
    const selectedScopeIds = Array.isArray(account.scopes)
      ? account.scopes
      : typeof account.scopes === 'string'
        ? (account.scopes ? JSON.parse(account.scopes) : [])
        : [];

    // Convert scope IDs to eBay scope URLs
    const accountScopeUrls = selectedScopeIds
      .map((scopeId: string) => {
        const scope = EBAY_OAUTH_SCOPES.find(s => s.id === scopeId);
        return scope ? scope.url : null;
      })
      .filter(Boolean); // Remove any null values

    // Always include basic API scope if not already present
    const basicScope = 'https://api.ebay.com/oauth/api_scope';
    if (!accountScopeUrls.includes(basicScope)) {
      accountScopeUrls.unshift(basicScope);
    }

    // Use account-specific scopes or fall back to basic scopes
    const scopes = accountScopeUrls.length > 0
      ? accountScopeUrls.join(' ')
      : 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/commerce.identity.readonly';

    // Generate a random state parameter for security
    const state = `${accountId}_${Math.random().toString(36).substring(2, 15)}`;

    // Temporarily build authorization URL manually to bypass the library issue
    const baseUrl = process.env.EBAY_SANDBOX === 'true'
      ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
      : 'https://auth.ebay.com/oauth2/authorize';

    const authParams = new URLSearchParams({
      client_id: process.env.EBAY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: process.env.EBAY_REDIRECT_URI,
      scope: scopes,
      state: state
    });

    const authUrl = `${baseUrl}?${authParams.toString()}`;

    // Store state in session/cookie for verification
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('ebay_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Error initiating eBay OAuth:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initiate eBay OAuth' },
      { status: 500 }
    );
  }
}