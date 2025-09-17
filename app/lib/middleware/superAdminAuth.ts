import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { debugLogService } from '../services/debugLogService';
import prisma from '../services/database';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export const authenticateSuperAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Super Admin access required. Please provide a valid token.',
        hint: 'Use: Authorization: Bearer <your-jwt-token>'
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      res.status(500).json({
        error: 'Configuration error',
        message: 'JWT secret not configured'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    // Get user from database with role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or token invalid'
      });
      return;
    }

    // Check if user is Super Admin
    if (user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Super Admin access required. Insufficient permissions.',
        userRole: user.role,
        requiredRole: 'SUPER_ADMIN'
      });
      return;
    }

    // Add user to request
    req.user = user;
    next();

  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format or signature'
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired. Please login again.'
      });
      return;
    }

    debugLogService.error('SUPER_ADMIN', `❌ Super Admin auth error: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};