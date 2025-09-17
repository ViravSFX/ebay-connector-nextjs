import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/services/database';
import { TokenService } from '@/app/lib/services/auth';
import { ebayOAuthService } from '@/app/lib/services/ebayOAuth';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token and get user
    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Find the account that needs token refresh
    const account = await prisma.ebayUserToken.findFirst({
      where: {
        id: accountId,
        userId: decoded.userId,
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Account not found' },
        { status: 404 }
      );
    }

    if (!account.refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No refresh token available' },
        { status: 400 }
      );
    }

    // Check if token is actually expired
    if (!ebayOAuthService.isTokenExpired(account.expiresAt)) {
      return NextResponse.json(
        { success: true, message: 'Token is still valid', data: account },
        { status: 200 }
      );
    }

    // Refresh the access token using the official eBay client
    const newTokenData = await ebayOAuthService.refreshUserAccessToken(account.refreshToken);

    // Calculate new expiration date
    const newExpiresAt = ebayOAuthService.calculateExpirationDate(newTokenData.expires_in);

    // Update the account with new token data
    const updatedAccount = await prisma.ebayUserToken.update({
      where: { id: accountId },
      data: {
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token || account.refreshToken, // Keep old refresh token if new one not provided
        expiresAt: newExpiresAt,
        tokenType: newTokenData.token_type || account.tokenType,
        scopes: JSON.stringify(newTokenData.scope ? newTokenData.scope.split(' ') : JSON.parse(account.scopes as string)),
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        ...updatedAccount,
        scopes: JSON.parse(updatedAccount.scopes as string),
        tags: JSON.parse(updatedAccount.tags as string),
      },
    });
  } catch (error) {
    console.error('Error refreshing eBay token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}