import { NextRequest, NextResponse } from 'next/server';
import { ebayOAuthService } from '@/app/lib/services/ebayOAuth';
import prisma from '@/app/lib/services/database';
import { EBAY_OAUTH_SCOPES } from '@/app/lib/constants/ebayScopes';
import { EBAY_SCOPES, getEbayConfig, getEbayUrls } from '@/app/lib/config/ebay';

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

    const config = getEbayConfig();
    const urls = getEbayUrls(config.isProduction);

    // Fetch the account to get its selected scopes
    const account = await prisma.ebayUserToken.findUnique({
      where: { id: accountId }
    }) as any;

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Account not found' },
        { status: 404 }
      );
    }

    // Parse the selected scopes from the database with type casting
    const accountData = account as any;
    const selectedScopeIds = Array.isArray(accountData.userSelectedScopes)
      ? accountData.userSelectedScopes
      : typeof accountData.userSelectedScopes === 'string'
        ? (accountData.userSelectedScopes ? JSON.parse(accountData.userSelectedScopes) : [])
        : [];

    // Convert user selected scope IDs to eBay scope URLs dynamically
    console.log('=== DYNAMIC SCOPE SELECTION ===');
    console.log('User selected scopes from DB:', selectedScopeIds);

    const accountScopeUrls = selectedScopeIds
      .map((scopeId: string) => {
        const scope = EBAY_OAUTH_SCOPES.find(s => s.id === scopeId);
        if (scope) {
          console.log(`✅ Mapped scope ID "${scopeId}" to URL: ${scope.url}`);
          return scope.url;
        } else {
          console.log(`❌ Could not find URL for scope ID: ${scopeId}`);
          return null;
        }
      })
      .filter(Boolean); // Remove any null values

    // Always ensure basic API scope is included
    const basicScope = EBAY_SCOPES.READ_BASIC;
    if (!accountScopeUrls.includes(basicScope)) {
      console.log(`➕ Adding basic API scope: ${basicScope}`);
      accountScopeUrls.unshift(basicScope);
    }

    // Use the user-selected scopes
    const scopes = accountScopeUrls.join(' ');

    console.log('=== FINAL SCOPE SELECTION ===');
    console.log('Total scopes being requested:', accountScopeUrls.length);
    console.log('Scope URLs:', accountScopeUrls);
    console.log('Scopes string:', scopes);

    // Generate a random state parameter for security
    const state = `${accountId}_${Math.random().toString(36).substring(2, 15)}`;

    // Build authorization URL manually with RuName
    const baseUrl = urls.auth;

    // Use RuName for both sandbox and production as per eBay documentation
    const redirectValue = process.env.EBAY_REDIRECT_URI!;

    console.log('=== OAUTH REDIRECT CONFIGURATION ===');
    console.log('Environment:', config.isProduction ? 'PRODUCTION' : 'SANDBOX');
    console.log('Using RuName (as per eBay docs):', redirectValue);

    // Manually construct URL to avoid over-encoding the scope URLs
    const encodedScopes = scopes.replace(/ /g, '%20'); // Only encode spaces as %20
    const authUrl = `${baseUrl}?client_id=${process.env.EBAY_CLIENT_ID}&response_type=code&redirect_uri=${redirectValue}&scope=${encodedScopes}&state=${state}`;

    // DEBUG: Log the complete OAuth request details
    console.log('=== PRODUCTION OAUTH DEBUG ===');
    console.log('Environment:', process.env.EBAY_SANDBOX === 'true' ? 'SANDBOX' : 'PRODUCTION');
    console.log('Client ID:', process.env.EBAY_CLIENT_ID);
    console.log('Client ID Length:', process.env.EBAY_CLIENT_ID?.length);
    console.log('Auth URL:', baseUrl);
    console.log('Redirect URI:', process.env.EBAY_REDIRECT_URI);
    console.log('Redirect URI Length:', process.env.EBAY_REDIRECT_URI?.length);
    console.log('Scopes being requested:', scopes);
    console.log('Scopes length:', scopes.length);
    console.log('State:', state);
    console.log('Complete auth URL:', authUrl);
    console.log('Auth URL Length:', authUrl.length);

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