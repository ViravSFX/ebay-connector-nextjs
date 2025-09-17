import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/middleware/requireAuth';
import { ApiTokenService } from '@/app/lib/services/apiTokenService';

// GET /api/tokens/[id] - Get specific API token
export const GET = requireAuth(async (
  request: NextRequest,
  user,
  context: { params: Promise<{ id: string }> }
) => {
  const params = await context.params;

  try {
    const token = await ApiTokenService.getTokenById(params.id, user.id);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token not found' },
        { status: 404 }
      );
    }

    // Don't return the actual token string for security
    const sanitizedToken = {
      id: token.id,
      name: token.name,
      token: `${token.token.substring(0, 12)}...${token.token.substring(token.token.length - 4)}`,
      permissions: token.permissions,
      isActive: token.isActive,
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: sanitizedToken
    });

  } catch (error) {
    console.error('Get token error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch token' },
      { status: 500 }
    );
  }
});

// PUT /api/tokens/[id] - Update API token permissions
export const PUT = requireAuth(async (
  request: NextRequest,
  user,
  context: { params: Promise<{ id: string }> }
) => {
  const params = await context.params;

  try {
    const body = await request.json();
    const { name, permissions, expiresAt } = body;

    // Validate name if provided
    if (name !== undefined) {
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

    // Update token
    const updatedToken = await ApiTokenService.updateTokenPermissions(
      params.id,
      user.id,
      { name: name?.trim(), permissions, expiresAt: expirationDate }
    );

    return NextResponse.json({
      success: true,
      data: {
        id: updatedToken.id,
        name: updatedToken.name,
        permissions: updatedToken.permissions,
        expiresAt: updatedToken.expiresAt,
        updatedAt: updatedToken.updatedAt
      },
      message: 'Token updated successfully'
    });

  } catch (error) {
    console.error('Update token error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update token' },
      { status: 500 }
    );
  }
});

// DELETE /api/tokens/[id] - Soft delete API token
export const DELETE = requireAuth(async (
  request: NextRequest,
  user,
  context: { params: Promise<{ id: string }> }
) => {
  const params = await context.params;

  try {
    await ApiTokenService.deleteToken(params.id, user.id);

    return NextResponse.json({
      success: true,
      message: 'Token deleted successfully'
    });

  } catch (error) {
    console.error('Delete token error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete token' },
      { status: 500 }
    );
  }
});