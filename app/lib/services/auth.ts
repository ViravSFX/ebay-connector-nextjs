import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Password utilities
export class PasswordService {
  // Hash a plain text password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Higher = more secure but slower
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare plain text password with hashed password
  static async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}

// JWT token utilities
export class TokenService {
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  private static readonly JWT_EXPIRE = '7d'; // Token expires in 7 days

  // Create a JWT token for a user
  static generateToken(payload: {
    userId: string;
    email: string;
    role: string;
  }): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRE,
    });
  }

  // Verify and decode a JWT token
  static verifyToken(token: string): {
    userId: string;
    email: string;
    role: string;
  } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };
      return decoded;
    } catch (error) {
      return null; // Invalid or expired token
    }
  }
}
