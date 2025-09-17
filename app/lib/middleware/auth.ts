import { NextRequest } from 'next/server';
import { TokenService } from '../services/auth';
import prisma from '../services/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error?: string }> {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get('token')?.value;

    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return { user: null, error: 'No token provided' };
    }

    // Verify token
    const decoded = TokenService.verifyToken(token);
    if (!decoded) {
      return { user: null, error: 'Invalid or expired token' };
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return { user: null, error: 'User not found' };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { user: null, error: 'Authentication failed' };
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const { user, error } = await authenticateRequest(request);

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error || 'Authentication required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request, user);
  };
}