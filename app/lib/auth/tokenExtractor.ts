import { NextRequest } from 'next/server';
import { TokenService } from '../services/auth';
import { UserService } from '../services/userService';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
}

export class TokenExtractor {
  static async extractAndVerifyToken(request: NextRequest): Promise<AuthResult> {
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
      const user = await UserService.findUserById(decoded.userId);

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
      console.error('Token verification error:', error);
      return { user: null, error: 'Authentication failed' };
    }
  }
}