import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../lib/services/authService';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Use AuthService to authenticate user
    const result = await AuthService.authenticateUser({ email, password });

    // Create response with user data and token
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        token: result.token,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);

    // Handle authentication errors
    if (error.message.includes('Email and password are required') ||
        error.message.includes('Invalid email or password')) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 401 }
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
}