import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/app/lib/services/userService';
import { requireAuth } from '@/app/lib/middleware/requireAuth';

// GET /api/users/[id] - Get user by ID
export const GET = requireAuth(async (
  request: NextRequest,
  user,
  context: { params: { id: string } }
) => {
  const { params } = context;
  try {
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Super Admin required.' },
        { status: 403 }
      );
    }

    const foundUser = await userService.getUserById(params.id);
    if (!foundUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: foundUser
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user' },
      { status: 500 }
    );
  }
});

// PUT /api/users/[id] - Update user
export const PUT = requireAuth(async (
  request: NextRequest,
  user,
  context: { params: { id: string } }
) => {
  const { params } = context;
  try {
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Super Admin required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, role } = body;

    const updatedUser = await userService.updateUser(params.id, {
      email,
      name,
      role
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    console.error('Update user error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update user' },
      { status: 500 }
    );
  }
});

// DELETE /api/users/[id] - Delete user
export const DELETE = requireAuth(async (
  request: NextRequest,
  user,
  context: { params: { id: string } }
) => {
  const { params } = context;
  try {
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Super Admin required.' },
        { status: 403 }
      );
    }

    // Prevent deleting self
    if (user.id === params.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const deletedUser = await userService.deleteUser(params.id);
    if (!deletedUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete user' },
      { status: 500 }
    );
  }
});