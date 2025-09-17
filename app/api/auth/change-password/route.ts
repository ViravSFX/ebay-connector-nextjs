import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../lib/services/authService';
import { requireAuth } from '../../../lib/middleware/requireAuth';

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { currentPassword, newPassword } = await request.json();

    // Use AuthService to change password
    await AuthService.changeUserPassword({
      userId: user.id,
      currentPassword,
      newPassword,
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error: any) {
    console.error('Password change error:', error);

    // Handle validation errors
    if (error.message.includes('required') ||
        error.message.includes('characters long') ||
        error.message.includes('incorrect') ||
        error.message.includes('different')) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (error.message.includes('User not found')) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
});