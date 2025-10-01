import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/services/database';
import { EBAY_SCOPES } from '@/app/lib/config/ebay';

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
      console.error('eBay OAuth error received:', error);
      return NextResponse.redirect(new URL('/ebay-connections?error=oauth_failed', baseUrl));
    }

    if (!code || !state) {
      console.error('Missing required parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(new URL('/ebay-connections?error=missing_params', baseUrl));
    }

    // Verify state parameter
    const storedState = request.cookies.get('ebay_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      console.error('State parameter mismatch or missing');
      return NextResponse.redirect(new URL('/ebay-connections?error=invalid_state', baseUrl));
    }

    // Extract account ID from state
    const accountId = state.split('_')[0];

    if (!accountId) {
      console.error('Could not extract account ID from state');
      return NextResponse.redirect(new URL('/ebay-connections?error=invalid_account', baseUrl));
    }

    // Validate required environment variables
    if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET || !process.env.EBAY_REDIRECT_URI) {
      console.error('Missing required environment variables');
      return NextResponse.redirect(new URL('/ebay-connections?error=missing_config', baseUrl));
    }

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

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    // DEBUG: Log complete OAuth token response
    console.log('=== OAUTH CALLBACK DEBUG - COMPLETE TOKEN DATA ===');
    console.log('Complete Token Data:', JSON.stringify(tokenData, null, 2));
    
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

        // DEBUG: Log complete user data response
        console.log('=== OAUTH CALLBACK DEBUG - COMPLETE USER DATA ===');
        console.log('Complete User Data:', JSON.stringify(userData, null, 2));

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

    // Get the account's selected scopes before updating
    const existingAccount = await prisma.ebayUserToken.findUnique({
      where: { id: accountId },
      select: { userSelectedScopes: true }
    }) as any;

    // DEBUG: Log existing account data
    console.log('=== OAUTH CALLBACK DEBUG - EXISTING ACCOUNT ===');
    console.log('Account ID:', accountId);
    console.log('Existing Account userSelectedScopes:', existingAccount?.userSelectedScopes);

    // PRESERVE the original userSelectedScopes format during reconnection
    // Don't convert or modify them - keep them exactly as they were
    const preservedUserSelectedScopes = existingAccount?.userSelectedScopes || JSON.stringify(['api_scope']);

    // DEBUG: Log preserved scopes
    console.log('=== OAUTH CALLBACK DEBUG - PRESERVED SCOPES ===');
    console.log('Preserved userSelectedScopes (no conversion):', preservedUserSelectedScopes);
    console.log('eBay granted scopes (from tokenData.scope):', tokenData.scope);

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
        scopes: tokenData.scope ? tokenData.scope.split(' ') : [EBAY_SCOPES.READ_BASIC], // What eBay actually granted
        userSelectedScopes: preservedUserSelectedScopes, // Preserve original user selections
        status: 'active',
        lastUsedAt: new Date(),
      } as any, // Cast to any to handle the userSelectedScopes field
    });

    // Clear the OAuth state cookie
    const response = NextResponse.redirect(new URL('/ebay-connections?success=connected', baseUrl));
    response.cookies.delete('ebay_oauth_state');

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