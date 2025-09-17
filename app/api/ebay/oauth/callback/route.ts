import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/services/database';
import { ebayOAuthService } from '@/app/lib/services/ebayOAuth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('eBay OAuth error:', error);
      return NextResponse.redirect(`${process.env.API_BASE_URL}/ebay-connections?error=oauth_failed`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.API_BASE_URL}/ebay-connections?error=missing_params`);
    }

    // Verify state parameter
    const storedState = request.cookies.get('ebay_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${process.env.API_BASE_URL}/ebay-connections?error=invalid_state`);
    }

    // Extract account ID from state
    const accountId = state.split('_')[0];
    if (!accountId) {
      return NextResponse.redirect(`${process.env.API_BASE_URL}/ebay-connections?error=invalid_account`);
    }

    // Exchange authorization code for access token using official eBay client
    const tokenData = await ebayOAuthService.exchangeCodeForAccessToken(code);

    // Get user info from eBay using official eBay client
    let ebayUserId = `ebay_user_${Date.now()}`;
    let ebayUsername = null;

    try {
      const userData = await ebayOAuthService.getUserInfo(tokenData.access_token);
      ebayUserId = userData.userId || ebayUserId;
      ebayUsername = userData.username || null;
    } catch (userInfoError) {
      console.warn('Could not fetch user info, using fallback values:', userInfoError);
    }

    // Calculate expiration date using the service helper
    const expiresAt = ebayOAuthService.calculateExpirationDate(tokenData.expires_in);

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
        scopes: JSON.stringify(tokenData.scope ? tokenData.scope.split(' ') : ['https://api.ebay.com/oauth/api_scope']),
        status: 'active',
        lastUsedAt: new Date(),
      },
    });

    // Clear the OAuth state cookie
    const response = NextResponse.redirect(`${process.env.API_BASE_URL}/ebay-connections?success=connected`);
    response.cookies.delete('ebay_oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.API_BASE_URL}/ebay-connections?error=callback_failed`);
  }
}