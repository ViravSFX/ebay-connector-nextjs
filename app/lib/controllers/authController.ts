import { Request, Response } from 'express';
import prisma from '../services/database';
import { PasswordService, TokenService } from '../services/auth';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// User registration (Protected - Super Admin only)
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'USER' } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Validate role
    const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified',
        validRoles,
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Create user with role
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Return success response (no token for admin-created users)
    res.status(201).json({
      success: true,
      message: `User registered successfully with role: ${role}`,
      data: {
        user,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

// User login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare password
    const isPasswordValid = await PasswordService.comparePassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = TokenService.generateToken(user.id);

    // Set secure HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,      // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production',  // HTTPS in production
      sameSite: 'strict',  // CSRF protection
      maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    });

    // Return success response (without token in body)
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

// Change password
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
      });
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordService.comparePassword(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Check if new password is different
    const isSamePassword = await PasswordService.comparePassword(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    // Hash new password
    const hashedNewPassword = await PasswordService.hashPassword(newPassword);

    // Update password and mark as changed
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        hasChangedPassword: true,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: error.message,
    });
  }
};

// Check if password change is required
export const checkPasswordChangeRequired = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get user with hasChangedPassword flag
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        hasChangedPassword: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user needs to change password (based on database flag)
    const requiresPasswordChange = !user.hasChangedPassword;

    res.json({
      success: true,
      requiresPasswordChange,
      message: requiresPasswordChange ? 'Password change required' : 'Password is secure',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to check password status',
      error: error.message,
    });
  }
};

// Logout - clear cookie
export const logout = async (req: Request, res: Response) => {
  try {
    // Clear the authentication cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message,
    });
  }
};
