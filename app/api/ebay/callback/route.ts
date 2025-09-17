import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getEbayConfig, getEbayUrls } from '@/app/lib/config/ebay';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      const redirectUrl = new URL('/ebay-connections', request.url);
      redirectUrl.searchParams.set('error', error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      const redirectUrl = new URL('/ebay-connections', request.url);
      redirectUrl.searchParams.set('error', 'missing_code_or_state');
      return NextResponse.redirect(redirectUrl);
    }

    const userId = state.split('_')[0];
    if (!userId) {
      const redirectUrl = new URL('/ebay-connections', request.url);
      redirectUrl.searchParams.set('error', 'invalid_state');
      return NextResponse.redirect(redirectUrl);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const redirectUrl = new URL('/ebay-connections', request.url);
      redirectUrl.searchParams.set('error', 'user_not_found');
      return NextResponse.redirect(redirectUrl);
    }

    const config = getEbayConfig();
    const urls = getEbayUrls(config.isProduction);

    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const tokenResponse = await fetch(urls.token, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('eBay token exchange failed:', errorData);
      const redirectUrl = new URL('/ebay-connections', request.url);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenResponse.json();

    const userInfoResponse = await fetch(urls.userInfo, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    let ebayUserId = 'unknown';
    let ebayUsername = null;

    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      ebayUserId = userInfo.userId || userInfo.username || 'unknown';
      ebayUsername = userInfo.username || null;
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    const scopes = tokenData.scope ? tokenData.scope.split(' ') : [];

    await prisma.ebayUserToken.upsert({
      where: {
        userId_ebayUserId: {
          userId: user.id,
          ebayUserId: ebayUserId,
        }
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt,
        tokenType: tokenData.token_type || 'Bearer',
        scopes: scopes,
        status: 'active',
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        ebayUserId: ebayUserId,
        ebayUsername: ebayUsername,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt,
        tokenType: tokenData.token_type || 'Bearer',
        scopes: scopes,
        status: 'active',
        lastUsedAt: new Date(),
      },
    });

    const redirectUrl = new URL('/ebay-connections', request.url);
    redirectUrl.searchParams.set('success', 'account_connected');
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error in eBay OAuth callback:', error);
    const redirectUrl = new URL('/ebay-connections', request.url);
    redirectUrl.searchParams.set('error', 'internal_error');
    return NextResponse.redirect(redirectUrl);
  }
}