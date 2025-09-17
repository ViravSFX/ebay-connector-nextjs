import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/middleware/requireAuth';
import { ApiTokenService, CreateApiTokenData } from '@/app/lib/services/apiTokenService';

// GET /api/tokens - Get user's API tokens with filtering
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'inactive' | 'all' | null;

    const tokens = await ApiTokenService.getUserTokens(user.id, {
      status: status || 'all'
    });

    // Don't return the actual token string for security
    const sanitizedTokens = tokens.map(token => ({
      id: token.id,
      name: token.name,
      token: `${token.token.substring(0, 12)}...${token.token.substring(token.token.length - 4)}`, // Show first 12 and last 4 chars
      permissions: token.permissions,
      isActive: token.isActive,
      isDeleted: token.isDeleted,
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: sanitizedTokens
    });

  } catch (error) {
    console.error('Get tokens error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch API tokens' },
      { status: 500 }
    );
  }
});

// POST /api/tokens - Create new API token
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    // Check if user has reached token limit
    const canCreateToken = await ApiTokenService.checkTokenLimit(user.id);
    if (!canCreateToken) {
      return NextResponse.json(
        { success: false, message: 'Token limit reached. Please delete unused tokens first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, permissions, expiresAt } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Token name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Token name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Validate expiration date if provided
    let expirationDate: Date | undefined;
    if (expiresAt) {
      expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        return NextResponse.json(
          { success: false, message: 'Expiration date must be a valid future date' },
          { status: 400 }
        );
      }
    }

    // Create token data
    const tokenData: CreateApiTokenData = {
      name: name.trim(),
      permissions,
      expiresAt: expirationDate
    };

    const newToken = await ApiTokenService.createToken(user.id, tokenData);

    return NextResponse.json({
      success: true,
      data: newToken,
      message: 'API token created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create token error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create API token' },
      { status: 500 }
    );
  }
});