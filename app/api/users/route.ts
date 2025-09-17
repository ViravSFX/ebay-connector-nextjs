import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/app/lib/services/userService';
import { requireAuth } from '@/app/lib/middleware/requireAuth';

// GET /api/users - Get all users (Super Admin only)
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // Check if user is super admin
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Super Admin required.' },
        { status: 403 }
      );
    }

    const users = await userService.getAllUsers();
    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
});

// POST /api/users - Create new user (Super Admin only)
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    // Check if user is super admin
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Super Admin required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, role, password } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    const newUser = await userService.createUser({
      email,
      name: name || null,
      role,
      password
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('Create user error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create user' },
      { status: 500 }
    );
  }
});