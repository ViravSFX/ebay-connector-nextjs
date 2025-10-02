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
      where: { id: accountId },
      select: { userSelectedScopes: true }
    });

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Account not found' },
        { status: 404 }
      );
    }

    // Parse the selected scopes from the database
    const selectedScopeIds = Array.isArray(account.userSelectedScopes)
      ? account.userSelectedScopes
      : typeof account.userSelectedScopes === 'string'
        ? (account.userSelectedScopes ? JSON.parse(account.userSelectedScopes) : [])
        : [];

    // Convert scope IDs to eBay scope URLs
    // Use full scopes for both environments since production app has permissions
    const essentialScopeIds = [
      'api_scope',
      'identity_readonly',
      'sell_inventory',
      'sell_account',
      'sell_fulfillment'
    ];

    const accountScopeUrls = essentialScopeIds
      .map((scopeId: string) => {
        const scope = EBAY_OAUTH_SCOPES.find(s => s.id === scopeId);
        return scope ? scope.url : null;
      })
      .filter(Boolean); // Remove any null values

    // Use the essential scopes (already includes api_scope)
    const scopes = accountScopeUrls.join(' ');

    // Generate a random state parameter for security
    const state = `${accountId}_${Math.random().toString(36).substring(2, 15)}`;

    // Build authorization URL manually with explicit encoding
    const baseUrl = urls.auth;

    // Test with minimal required parameters first
    const authParams = new URLSearchParams();
    authParams.append('client_id', process.env.EBAY_CLIENT_ID!);
    authParams.append('response_type', 'code');
    authParams.append('redirect_uri', process.env.EBAY_REDIRECT_URI!);
    authParams.append('scope', scopes);
    authParams.append('state', state);

    const authUrl = `${baseUrl}?${authParams.toString()}`;

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

    // Test if any parameters contain invalid characters
    console.log('=== PARAMETER VALIDATION ===');
    console.log('Client ID valid:', /^[a-zA-Z0-9\-_]+$/.test(process.env.EBAY_CLIENT_ID || ''));
    console.log('Redirect URI valid:', /^https?:\/\/.+/.test(process.env.EBAY_REDIRECT_URI || ''));
    console.log('Scopes contain only valid chars:', /^[a-zA-Z0-9\/:._\s]+$/.test(scopes));

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