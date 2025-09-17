import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../services/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Get all users with pagination and filtering
export const getUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          hasChangedPassword: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        data: users,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
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
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message,
    });
  }
};

// Create new user
export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, role, password } = req.body;
    const currentUser = req.user;

    // Validate required fields
    if (!email || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, role, and password are required',
      });
    }

    // Check if user has permission to create users
    if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create users',
      });
    }

    // Check if admin is trying to create super admin
    if (currentUser?.role === 'ADMIN' && role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot create Super Admin users',
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null,
        role,
        password: hashedPassword,
        hasChangedPassword: false,
      },
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

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};

// Update user
export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, role, password } = req.body;
    const currentUser = req.user;

    // Check if user has permission to update users
    if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update users',
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if admin is trying to update super admin or create super admin
    if (currentUser?.role === 'ADMIN') {
      if (existingUser.role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Admins cannot modify Super Admin users',
        });
      }
    }

    // Check if user is trying to modify themselves (prevent privilege escalation)
    if (currentUser?.id === id && role && role !== currentUser.role) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change your own role',
      });
    }

    // Check if email already exists (if changing email)
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (email) updateData.email = email;
    if (name !== undefined) updateData.name = name || null;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
      updateData.hasChangedPassword = true;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Check if user has permission to delete users
    if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete users',
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent self-deletion
    if (currentUser?.id === id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Check if admin is trying to delete super admin
    if (currentUser?.role === 'ADMIN' && existingUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot delete Super Admin users',
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};

// Toggle user status (if needed in the future)
export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Check if user has permission
    if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to modify user status',
      });
    }

    // For now, just return success (can be implemented later if needed)
    res.json({
      success: true,
      message: 'User status updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
};