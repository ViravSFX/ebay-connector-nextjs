import prisma from './database';
import { PasswordService } from './auth';

import { UserRole } from '@prisma/client';

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
}

export class UserService {

  static async findUserByEmail(email: string) {
    return await prisma.user.findUnique({
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
  }

  static async findUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  static async getUserWithPassword(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });
  }

  static async updateUserPassword(userId: string, hashedPassword: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  // CRUD Methods for User Management
  static async getAllUsers(): Promise<UserResponse[]> {
    return await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getUserById(id: string): Promise<UserResponse | null> {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  static async createUser(data: CreateUserData): Promise<UserResponse> {
    const { email, password, name, role = UserRole.USER } = data;

    // Validation
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role specified');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Create user
    return await prisma.user.create({
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
  }

  static async updateUser(id: string, data: Partial<{
    email: string;
    name: string;
    role: UserRole;
  }>): Promise<UserResponse | null> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return null;
    }

    // If email is being updated, check for duplicates
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new Error('User with this email already exists');
      }
    }

    return await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  static async deleteUser(id: string): Promise<UserResponse | null> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!existingUser) {
      return null;
    }

    await prisma.user.delete({
      where: { id },
    });

    return existingUser;
  }
}

export const userService = UserService;