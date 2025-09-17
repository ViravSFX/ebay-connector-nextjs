import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/services/database';

const EbayAuthToken = require('ebay-oauth-nodejs-client');

export async function GET(request: NextRequest) {
  try {
    console.log('=== OAUTH CALLBACK START ===');

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('Callback URL params:', {
      code: code ? `${code.substring(0, 20)}...` : 'MISSING',
      state,
      error,
      fullUrl: request.url
    });

    // Get base URL from request
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    console.log('Base URL:', baseUrl);

    // Check for OAuth errors
    if (error) {
      console.error('eBay OAuth error received:', error);
      return NextResponse.redirect(new URL('/ebay-connections?error=oauth_failed', baseUrl));
    }

    if (!code || !state) {
      console.error('Missing required parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(new URL('/ebay-connections?error=missing_params', baseUrl));
    }

    // Verify state parameter
    const storedState = request.cookies.get('ebay_oauth_state')?.value;
    console.log('State verification:', {
      received: state,
      stored: storedState,
      match: storedState === state
    });

    if (!storedState || storedState !== state) {
      console.error('State parameter mismatch or missing');
      return NextResponse.redirect(new URL('/ebay-connections?error=invalid_state', baseUrl));
    }

    // Extract account ID from state
    const accountId = state.split('_')[0];
    console.log('Extracted account ID:', accountId);

    if (!accountId) {
      console.error('Could not extract account ID from state');
      return NextResponse.redirect(new URL('/ebay-connections?error=invalid_account', baseUrl));
    }

    // Debug: Log environment variables (without exposing sensitive data)
    console.log('Environment variables check:', {
      clientId: process.env.EBAY_CLIENT_ID ? `${process.env.EBAY_CLIENT_ID.substring(0, 10)}...` : 'MISSING',
      clientSecret: process.env.EBAY_CLIENT_SECRET ? `${process.env.EBAY_CLIENT_SECRET.substring(0, 10)}...` : 'MISSING',
      redirectUri: process.env.EBAY_REDIRECT_URI,
      sandbox: process.env.EBAY_SANDBOX,
      nodeEnv: process.env.NODE_ENV
    });

    // Validate required environment variables
    if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET || !process.env.EBAY_REDIRECT_URI) {
      console.error('Missing required environment variables');
      return NextResponse.redirect(new URL('/ebay-connections?error=missing_config', baseUrl));
    }

    console.log('Performing manual token exchange to bypass library issue...');

    // Manual token exchange implementation
    const tokenUrl = process.env.EBAY_SANDBOX === 'true'
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    const credentials = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.EBAY_REDIRECT_URI
    });

    console.log('Making token exchange request to:', tokenUrl);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString()
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful:', {
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      scope: tokenData.scope
    });

    // Get user info from eBay
    console.log('Fetching user info from eBay...');
    let ebayUserId = `ebay_user_${Date.now()}`;
    let ebayUsername = null;

    try {
      const baseApiUrl = process.env.EBAY_SANDBOX === 'true'
        ? 'https://apiz.sandbox.ebay.com'
        : 'https://apiz.ebay.com';

      console.log('Making user info request to:', `${baseApiUrl}/commerce/identity/v1/user/`);

      const response = await fetch(`${baseApiUrl}/commerce/identity/v1/user/`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('User info response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('User info received:', {
          userId: userData.userId,
          username: userData.username
        });
        ebayUserId = userData.userId || ebayUserId;
        ebayUsername = userData.username || null;
      } else {
        console.warn('User info request failed:', response.statusText);
      }
    } catch (userInfoError) {
      console.warn('Could not fetch user info, using fallback values:', userInfoError);
    }

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    console.log('Token expires at:', expiresAt);

    console.log('Updating database record for account:', accountId);

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

    console.log('Database updated successfully for account:', updatedAccount.id);

    // Clear the OAuth state cookie
    const response = NextResponse.redirect(new URL('/ebay-connections?success=connected', baseUrl));
    response.cookies.delete('ebay_oauth_state');

    console.log('=== OAUTH CALLBACK SUCCESS ===');
    return response;

  } catch (error) {
    console.error('=== OAUTH CALLBACK ERROR ===');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
      fullError: error
    });

    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    return NextResponse.redirect(new URL('/ebay-connections?error=callback_failed', baseUrl));
  }
}