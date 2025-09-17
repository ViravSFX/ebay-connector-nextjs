import crypto from 'crypto';
import prisma from './database';

export class ApiTokenService {
  // Generate a secure random API token
  static generateApiToken(): string {
    // Generate 32 random bytes and convert to hex (64 character string)
    const token = crypto.randomBytes(32).toString('hex');
    return `ebay_${token}`;
  }

  // Create a new API token for a user
  static async createToken(userId: string, name: string, description?: string): Promise<{ id: string; token: string; name: string; description?: string; createdAt: Date }> {
    const token = this.generateApiToken();

    const apiToken = await prisma.apiToken.create({
      data: {
        token,
        name,
        description,
        userId,
      },
    });

    return {
      id: apiToken.id,
      token: apiToken.token,
      name: apiToken.name,
      description: apiToken.description || undefined,
      createdAt: apiToken.createdAt,
    };
  }

  // Create an eBay-specific API token for a user with connection binding
  static async createEbayToken(userId: string, connectionId: string, name: string, description?: string): Promise<{ id: string; token: string; name: string; description?: string; createdAt: Date }> {
    const token = this.generateApiToken();

    const apiToken = await prisma.apiToken.create({
      data: {
        token,
        name,
        description,
        userId,
        connectionId,
      },
    });

    return {
      id: apiToken.id,
      token: apiToken.token,
      name: apiToken.name,
      description: apiToken.description || undefined,
      createdAt: apiToken.createdAt,
    };
  }

  // Get all tokens for a user (without showing actual token values)
  static async getUserTokens(userId: string) {
    const tokens = await prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastUsed: true,
        connectionId: true,
        connection: {
          select: {
            id: true,
            name: true,
            environment: true,
            isActive: true,
          }
        },
        // Don't include the actual token for security
      },
      orderBy: { createdAt: 'desc' },
    });

    return tokens;
  }

  // Verify if an API token is valid
  static async verifyApiToken(token: string) {
    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        connection: {
          select: {
            id: true,
            name: true,
            environment: true,
            clientId: true,
            clientSecret: true,
          },
        },
      },
    });

    if (!apiToken || !apiToken.isActive) {
      return null;
    }

    // Update last used timestamp
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsed: new Date() },
    });

    return {
      tokenId: apiToken.id,
      user: {
        id: apiToken.user.id,
        email: apiToken.user.email,
        name: apiToken.user.name,
      },
      ebayConnection: apiToken.connection,
    };
  }

  // Update an API token
  static async updateToken(tokenId: string, userId: string, data: { name?: string; description?: string; connectionId?: string }): Promise<any> {
    const updatedToken = await prisma.apiToken.updateMany({
      where: {
        id: tokenId,
        userId, // Ensure user can only update their own tokens
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    if (updatedToken.count === 0) {
      return null;
    }

    // Return the updated token without the actual token value
    const token = await prisma.apiToken.findUnique({
      where: { id: tokenId },
      select: {
        id: true,
        name: true,
        description: true,
        connectionId: true,
        connection: {
          select: {
            id: true,
            name: true,
            environment: true,
            isActive: true,
          }
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastUsed: true,
      },
    });

    return token;
  }

  // Toggle token status (enable/disable)
  static async toggleTokenStatus(tokenId: string, userId: string, isActive: boolean): Promise<any> {
    const updatedToken = await prisma.apiToken.updateMany({
      where: {
        id: tokenId,
        userId, // Ensure user can only update their own tokens
      },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });

    if (updatedToken.count === 0) {
      return null;
    }

    // Return the updated token without the actual token value
    const token = await prisma.apiToken.findUnique({
      where: { id: tokenId },
      select: {
        id: true,
        name: true,
        description: true,
        connectionId: true,
        connection: {
          select: {
            id: true,
            name: true,
            environment: true,
            isActive: true,
          }
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastUsed: true,
      },
    });

    return token;
  }

  // Get a single token by ID (without actual token value)
  static async getTokenById(tokenId: string, userId: string) {
    const token = await prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        userId, // Ensure user can only view their own tokens
      },
      select: {
        id: true,
        name: true,
        description: true,
        connectionId: true,
        connection: {
          select: {
            id: true,
            name: true,
            environment: true,
            isActive: true,
          }
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastUsed: true,
      },
    });

    return token;
  }

  // Delete an API token
  static async deleteToken(tokenId: string, userId: string): Promise<boolean> {
    const result = await prisma.apiToken.deleteMany({
      where: {
        id: tokenId,
        userId, // Ensure user can only delete their own tokens
      },
    });

    return result.count > 0;
  }
}