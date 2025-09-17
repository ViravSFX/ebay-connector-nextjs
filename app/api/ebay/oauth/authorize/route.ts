import { NextRequest, NextResponse } from 'next/server';
import { ebayOAuthService } from '@/app/lib/services/ebayOAuth';

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

    // Debug: Log environment variables (without exposing sensitive data)
    console.log('eBay OAuth Debug:', {
      clientId: process.env.EBAY_CLIENT_ID ? `${process.env.EBAY_CLIENT_ID.substring(0, 10)}...` : 'MISSING',
      redirectUri: process.env.EBAY_REDIRECT_URI,
      sandbox: process.env.EBAY_SANDBOX
    });

    // Generate a random state parameter for security
    const state = `${accountId}_${Math.random().toString(36).substring(2, 15)}`;

    // Temporarily build authorization URL manually to bypass the library issue
    const baseUrl = process.env.EBAY_SANDBOX === 'true'
      ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
      : 'https://auth.ebay.com/oauth2/authorize';

    // Include identity scope to get user information
    const scopes = 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/commerce.identity.readonly';

    const authParams = new URLSearchParams({
      client_id: process.env.EBAY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: process.env.EBAY_REDIRECT_URI,
      scope: scopes,
      state: state
    });

    const authUrl = `${baseUrl}?${authParams.toString()}`;

    // Debug: Log the complete authorization URL
    console.log('Generated OAuth URL:', authUrl);
    console.log('OAuth Parameters:', Object.fromEntries(authParams.entries()));

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