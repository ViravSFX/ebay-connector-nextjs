import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/services/database';

const EbayAuthToken = require('ebay-oauth-nodejs-client');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Get base URL from request
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Check for OAuth errors
    if (error) {
      console.error('eBay OAuth error:', error);
      return NextResponse.redirect(new URL('/ebay-accounts?error=oauth_failed', baseUrl));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/ebay-accounts?error=missing_params', baseUrl));
    }

    // Verify state parameter
    const storedState = request.cookies.get('ebay_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/ebay-accounts?error=invalid_state', baseUrl));
    }

    // Extract account ID from state
    const accountId = state.split('_')[0];
    if (!accountId) {
      return NextResponse.redirect(new URL('/ebay-accounts?error=invalid_account', baseUrl));
    }

    // Initialize eBay client directly with credentials
    const ebayAuthToken = new EbayAuthToken({
      clientId: process.env.EBAY_CLIENT_ID,
      clientSecret: process.env.EBAY_CLIENT_SECRET,
      redirectUri: process.env.EBAY_REDIRECT_URI
    });

    // Exchange authorization code for access token
    const environment = process.env.EBAY_SANDBOX === 'true' ? 'SANDBOX' : 'PRODUCTION';
    const tokenData = await ebayAuthToken.exchangeCodeForAccessToken(environment, code);

    // Get user info from eBay
    let ebayUserId = `ebay_user_${Date.now()}`;
    let ebayUsername = null;

    try {
      const baseApiUrl = process.env.EBAY_SANDBOX === 'true'
        ? 'https://apiz.sandbox.ebay.com'
        : 'https://apiz.ebay.com';

      const response = await fetch(`${baseApiUrl}/commerce/identity/v1/user/`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        ebayUserId = userData.userId || ebayUserId;
        ebayUsername = userData.username || null;
      }
    } catch (userInfoError) {
      console.warn('Could not fetch user info, using fallback values:', userInfoError);
    }

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Update the placeholder account with real OAuth data
    const updatedAccount = await prisma.ebayUserToken.update({
      where: { id: accountId },
      data: {
        ebayUserId: ebayUserId,
        ebayUsername: ebayUsername,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt,
        tokenType: tokenData.token_type || 'Bearer',
        scopes: tokenData.scope ? tokenData.scope.split(' ') : ['https://api.ebay.com/oauth/api_scope'],
        status: 'active',
        lastUsedAt: new Date(),
      },
    });

    // Clear the OAuth state cookie
    const response = NextResponse.redirect(new URL('/ebay-accounts?success=connected', baseUrl));
    response.cookies.delete('ebay_oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    return NextResponse.redirect(new URL('/ebay-accounts?error=callback_failed', baseUrl));
  }
}