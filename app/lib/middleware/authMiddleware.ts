import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/auth';
import prisma from '../services/database';

// Extend Request type to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
    hasChangedPassword: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Middleware to check if user is authenticated
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookie or Authorization header (fallback for API requests)
    let token = req.cookies?.authToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.',
      });
    }

    // Verify token
    const decoded = TokenService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.',
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hasChangedPassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found.',
      });
    }

    // Add user info to request object
    req.user = user as any;
    next(); // Continue to next middleware/route handler
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};
