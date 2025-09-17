import { NextRequest, NextResponse } from 'next/server';
import { EbayOAuthService } from '../../../lib/services/ebayOAuth';
import { requireAuth } from '../../../lib/middleware/auth';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'authorize') {
      // Generate OAuth authorization URL
      const authUrl = await EbayOAuthService.getAuthorizationUrl(user.id);

      return NextResponse.json({
        success: true,
        data: { authUrl },
      });
    } else if (action === 'callback') {
      // Handle OAuth callback
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code) {
        return NextResponse.json(
          {
            success: false,
            message: 'Authorization code is required',
          },
          { status: 400 }
        );
      }

      const result = await EbayOAuthService.handleCallback(code, state || '', user.id);

      return NextResponse.json({
        success: true,
        message: 'eBay account connected successfully',
        data: result,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid action specified',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('eBay OAuth error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process eBay OAuth request',
      },
      { status: 500 }
    );
  }
});