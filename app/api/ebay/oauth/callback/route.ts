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

    if (!code) {
      console.error('Missing required parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(new URL('/ebay-connections?error=missing_params', baseUrl));
    }

    // Handle state parameter (might be missing in consent flow)
    if (state) {
      // Verify state parameter only if present
      const storedState = request.cookies.get('ebay_oauth_state')?.value;

      console.log('=== STATE PARAMETER DEBUG ===');
      console.log('Received state from eBay:', state);
      console.log('Stored state in cookie:', storedState);
      console.log('States match:', storedState === state);

      if (!storedState || storedState !== state) {
        console.error('State parameter mismatch or missing');
        console.error('This usually means multiple OAuth requests or expired cookie');
        return NextResponse.redirect(new URL('/ebay-connections?error=invalid_state', baseUrl));
      }
    } else {
      console.warn('State parameter missing - this might be from consent flow');
    }

    // Extract account ID from state (if available)
    let accountId: string | null = null;

    if (state) {
      accountId = state.split('_')[0];
    } else {
      // For consent flow without state, try to get from referrer or use a fallback
      console.warn('No state parameter - cannot determine account ID from consent flow');
      // You may need to store account ID in session/cookie or get from referrer
      return NextResponse.redirect(new URL('/ebay-connections?error=missing_account_id', baseUrl));
    }

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

    // Use RuName for both sandbox and production as per eBay documentation
    const redirectValue = process.env.EBAY_REDIRECT_URI;

    console.log('=== TOKEN EXCHANGE REDIRECT CONFIGURATION ===');
    console.log('Environment:', process.env.EBAY_SANDBOX === 'true' ? 'SANDBOX' : 'PRODUCTION');
    console.log('Using RuName (as per eBay docs):', redirectValue);

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectValue!
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
    console.log('Token Response Status:', tokenResponse.status);
    console.log('Token Response Headers:', Object.fromEntries(tokenResponse.headers.entries()));
    console.log('Complete Token Data:', JSON.stringify(tokenData, null, 2));
    console.log('Access Token (first 50 chars):', tokenData.access_token?.substring(0, 50) + '...');
    console.log('Refresh Token (first 50 chars):', tokenData.refresh_token?.substring(0, 50) + '...');
    console.log('Token Type:', tokenData.token_type);
    console.log('Expires In (seconds):', tokenData.expires_in);
    console.log('Granted Scopes:', tokenData.scope);
    console.log('Scope Array:', tokenData.scope ? tokenData.scope.split(' ') : 'No scopes');
    
    let ebayUserId = `ebay_user_${Date.now()}`;
    let ebayUsername = null;

    try {
      const baseApiUrl = process.env.EBAY_SANDBOX === 'true'
        ? 'https://apiz.sandbox.ebay.com'
        : 'https://apiz.ebay.com';

      console.log('=== FETCHING USER INFO ===');
      console.log('User Info URL:', `${baseApiUrl}/commerce/identity/v1/user/`);
      console.log('Authorization Header:', `Bearer ${tokenData.access_token?.substring(0, 20)}...`);

      const response = await fetch(`${baseApiUrl}/commerce/identity/v1/user/`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('User Info Response Status:', response.status);
      console.log('User Info Response Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const userData = await response.json();

        // DEBUG: Log complete user data response
        console.log('=== OAUTH CALLBACK DEBUG - COMPLETE USER DATA ===');
        console.log('Complete User Data:', JSON.stringify(userData, null, 2));
        console.log('User ID:', userData.userId);
        console.log('Username:', userData.username);
        console.log('Business Account:', userData.businessAccount);
        console.log('Registration Date:', userData.registrationDate);

        ebayUserId = userData.userId || ebayUserId;
        ebayUsername = userData.username || null;
      } else {
        const errorText = await response.text();
        console.error('User info request failed:', response.status, response.statusText);
        console.error('User info error response:', errorText);
      }
    } catch (userInfoError) {
      console.warn('Could not fetch user info, using fallback values:', userInfoError);
    }

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Get the account's selected scopes before updating
    const existingAccount = await prisma.ebayUserToken.findUnique({
      where: { id: accountId }
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

    // Prepare data for database update
    const updateData = {
      ebayUserId: ebayUserId,
      ebayUsername: ebayUsername,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: expiresAt,
      tokenType: tokenData.token_type || 'Bearer',
      scopes: tokenData.scope ? tokenData.scope.split(' ') : [EBAY_SCOPES.READ_BASIC],
      userSelectedScopes: preservedUserSelectedScopes,
      status: 'active',
      lastUsedAt: new Date(),
    };

    console.log('=== DATABASE UPDATE DEBUG ===');
    console.log('Account ID:', accountId);
    console.log('Update Data:', JSON.stringify(updateData, null, 2));
    console.log('Access Token Length:', tokenData.access_token?.length);
    console.log('Refresh Token Length:', tokenData.refresh_token?.length);
    console.log('Token Expires At:', expiresAt.toISOString());
    console.log('Granted Scopes Count:', updateData.scopes.length);
    console.log('Granted Scopes List:', updateData.scopes);

    // Update the placeholder account with real OAuth data
    const updatedAccount = await prisma.ebayUserToken.update({
      where: { id: accountId },
      data: updateData as any, // Cast to any to handle the userSelectedScopes field
    });

    console.log('=== DATABASE UPDATE RESULT ===');
    console.log('Updated Account ID:', updatedAccount.id);
    console.log('Updated eBay User ID:', updatedAccount.ebayUserId);
    console.log('Updated eBay Username:', updatedAccount.ebayUsername);
    console.log('Updated Status:', updatedAccount.status);
    console.log('Updated Scopes:', updatedAccount.scopes);
    console.log('Database Update Successful!');

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