import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/services/database';
import { PasswordService } from '../../../lib/services/auth';
import { requireAuth } from '../../../lib/middleware/auth';

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { currentPassword, newPassword } = await request.json();

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Current password and new password are required',
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'New password must be at least 8 characters long',
        },
        { status: 400 }
      );
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordService.comparePassword(
      currentPassword,
      dbUser.password
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Current password is incorrect',
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await PasswordService.hashPassword(newPassword);

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
});