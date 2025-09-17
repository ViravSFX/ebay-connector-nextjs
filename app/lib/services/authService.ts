import { PasswordService, TokenService } from './auth';
import { UserService } from './userService';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
  };
  token: string;
}

export interface PasswordChangeData {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export class AuthService {
  static async authenticateUser(credentials: LoginCredentials): Promise<LoginResult> {
    const { email, password } = credentials;

    // Validation
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user by email
    const user = await UserService.findUserByEmail(email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isPasswordValid = await PasswordService.comparePassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = TokenService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async changeUserPassword(data: PasswordChangeData): Promise<void> {
    const { userId, currentPassword, newPassword } = data;

    // Validation
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // Get user with current password
    const user = await UserService.getUserWithPassword(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordService.comparePassword(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Check if new password is different
    const isSamePassword = await PasswordService.comparePassword(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      throw new Error('New password must be different from current password');
    }

    // Hash new password
    const hashedNewPassword = await PasswordService.hashPassword(newPassword);

    // Update password
    await UserService.updateUserPassword(userId, hashedNewPassword);
  }

  static async checkPasswordChangeRequired(userId: string) {
    const user = await UserService.findUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // For simplified functionality, password change is always optional
    return {
      requiresPasswordChange: false,
      message: 'Password is secure',
    };
  }
}