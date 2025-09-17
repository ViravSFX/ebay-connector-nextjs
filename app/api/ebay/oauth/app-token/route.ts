import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/app/lib/services/auth';
import { ebayOAuthService } from '@/app/lib/services/ebayOAuth';

// In-memory cache for application token (production should use Redis or similar)
let cachedAppToken: { token: string; expiresAt: Date } | null = null;

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie for authentication
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if we have a valid cached token
    if (cachedAppToken && !ebayOAuthService.isTokenExpired(cachedAppToken.expiresAt)) {
      return NextResponse.json({
        success: true,
        data: {
          access_token: cachedAppToken.token,
          expires_at: cachedAppToken.expiresAt,
          token_type: 'Bearer',
          cached: true
        }
      });
    }

    // Get new application token
    const appToken = await ebayOAuthService.getApplicationToken();

    // Cache the token (Application tokens are valid for 2 hours)
    const expiresAt = new Date(Date.now() + (2 * 60 * 60 * 1000)); // 2 hours
    cachedAppToken = {
      token: appToken,
      expiresAt: expiresAt
    };

    return NextResponse.json({
      success: true,
      data: {
        access_token: appToken,
        expires_at: expiresAt,
        token_type: 'Bearer',
        cached: false
      }
    });
  } catch (error) {
    console.error('Error getting application token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get application token' },
      { status: 500 }
    );
  }
}

// Clear cached token (useful for testing or manual refresh)
export async function DELETE(request: NextRequest) {
  try {
    // Get token from cookie for authentication
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Clear cached token
    cachedAppToken = null;

    return NextResponse.json({
      success: true,
      message: 'Application token cache cleared'
    });
  } catch (error) {
    console.error('Error clearing application token cache:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear token cache' },
      { status: 500 }
    );
  }
}