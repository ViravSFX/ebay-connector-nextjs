import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/middleware/requireAuth';
import { ApiTokenService } from '@/app/lib/services/apiTokenService';

// PATCH /api/tokens/[id]/status - Update API token status (activate/deactivate)
export const PATCH = requireAuth(async (
  request: NextRequest,
  user,
  context: { params: Promise<{ id: string }> }
) => {
  const params = await context.params;

  try {
    const body = await request.json();
    const { isActive } = body;

    // Validate isActive parameter
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'isActive must be a boolean value' },
        { status: 400 }
      );
    }

    // Update token status
    const updatedToken = isActive
      ? await ApiTokenService.activateToken(params.id, user.id)
      : await ApiTokenService.deactivateToken(params.id, user.id);

    return NextResponse.json({
      success: true,
      message: `Token ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedToken
    });

  } catch (error) {
    console.error('Update token status error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update token status' },
      { status: 500 }
    );
  }
});