import prisma from './database';
import crypto from 'crypto';
import { DEFAULT_ENDPOINTS } from '../config/endpoints';

export interface CreateApiTokenData {
  name: string;
  permissions?: {
    endpoints?: string[];
    rateLimit?: number;
  };
  expiresAt?: Date;
}

export interface ApiTokenResponse {
  id: string;
  name: string;
  token: string;
  permissions: any;
  isActive: boolean;
  isDeleted: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiTokenWithUser extends ApiTokenResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export class ApiTokenService {
  /**
   * Generate a new API token with the format: ebay_live_[32_random_chars]
   */
  static generateTokenString(): string {
    const randomBytes = crypto.randomBytes(16);
    const tokenSuffix = randomBytes.toString('hex');
    return `ebay_live_${tokenSuffix}`;
  }

  /**
   * Create a new API token for a user
   */
  static async createToken(
    userId: string,
    data: CreateApiTokenData
  ): Promise<ApiTokenResponse> {
    const token = this.generateTokenString();

    // Default permissions for new tokens
    const defaultPermissions = {
      endpoints: DEFAULT_ENDPOINTS,
      rateLimit: 1000,
      ...data.permissions
    };

    const apiToken = await prisma.apiToken.create({
      data: {
        userId,
        name: data.name,
        token,
        permissions: defaultPermissions as any,
        expiresAt: data.expiresAt
      }
    });

    return apiToken as ApiTokenResponse;
  }

  /**
   * Get all API tokens for a user (excludes deleted tokens by default)
   */
  static async getUserTokens(
    userId: string,
    options?: {
      status?: 'active' | 'inactive' | 'all'
    }
  ): Promise<ApiTokenResponse[]> {
    const whereClause: any = {
      userId,
      isDeleted: false // Exclude deleted tokens by default
    };

    // Add status filtering
    if (options?.status === 'active') {
      whereClause.isActive = true;
    } else if (options?.status === 'inactive') {
      whereClause.isActive = false;
    }

    const tokens = await prisma.apiToken.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return tokens as ApiTokenResponse[];
  }

  /**
   * Get API token by token string (for authentication)
   */
  static async getTokenByString(token: string): Promise<ApiTokenWithUser | null> {
    const apiToken = await prisma.apiToken.findFirst({
      where: {
        token,
        isActive: true,
        isDeleted: false // Exclude deleted tokens
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      }
    });

    if (!apiToken) {
      return null;
    }

    // Check if token is expired
    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      return null;
    }

    return apiToken as ApiTokenWithUser;
  }

  /**
   * Update token last used timestamp
   */
  static async updateLastUsed(tokenId: string): Promise<void> {
    await prisma.apiToken.update({
      where: { id: tokenId },
      data: { lastUsedAt: new Date() }
    });
  }

  /**
   * Revoke (deactivate) an API token
   */
  static async revokeToken(tokenId: string, userId: string): Promise<void> {
    await prisma.apiToken.update({
      where: {
        id: tokenId,
        userId // Ensure user owns the token
      },
      data: { isActive: false }
    });
  }

  /**
   * Activate an API token
   */
  static async activateToken(tokenId: string, userId: string): Promise<ApiTokenResponse> {
    const updatedToken = await prisma.apiToken.update({
      where: {
        id: tokenId,
        userId
      },
      data: {
        isActive: true,
        updatedAt: new Date()
      }
    });

    return updatedToken as ApiTokenResponse;
  }

  /**
   * Deactivate an API token
   */
  static async deactivateToken(tokenId: string, userId: string): Promise<ApiTokenResponse> {
    const updatedToken = await prisma.apiToken.update({
      where: {
        id: tokenId,
        userId
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    return updatedToken as ApiTokenResponse;
  }

  /**
   * Soft delete an API token (mark as deleted)
   */
  static async deleteToken(tokenId: string, userId: string): Promise<void> {
    await prisma.apiToken.update({
      where: {
        id: tokenId,
        userId
      },
      data: {
        isActive: false,
        isDeleted: true,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update token details (name, permissions, expiresAt)
   */
  static async updateTokenPermissions(
    tokenId: string,
    userId: string,
    updateData: {
      name?: string;
      permissions?: any;
      expiresAt?: Date;
    }
  ): Promise<ApiTokenResponse> {
    const { name, permissions, expiresAt, ...rest } = updateData;

    const dataToUpdate: any = {
      updatedAt: new Date(),
      ...rest
    };

    // Add fields only if they are provided
    if (name !== undefined) {
      dataToUpdate.name = name;
    }
    if (permissions !== undefined) {
      dataToUpdate.permissions = permissions as any;
    }
    if (expiresAt !== undefined) {
      dataToUpdate.expiresAt = expiresAt;
    }

    const updatedToken = await prisma.apiToken.update({
      where: {
        id: tokenId,
        userId
      },
      data: dataToUpdate
    });

    return updatedToken as ApiTokenResponse;
  }

  /**
   * Get token by ID (for user's own tokens)
   */
  static async getTokenById(tokenId: string, userId: string): Promise<ApiTokenResponse | null> {
    const token = await prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        userId,
        isDeleted: false // Exclude deleted tokens
      }
    });

    return token as ApiTokenResponse | null;
  }

  /**
   * Validate API token format
   */
  static isValidTokenFormat(token: string): boolean {
    const tokenRegex = /^ebay_(live|test)_[a-f0-9]{32}$/;
    return tokenRegex.test(token);
  }

  /**
   * Get token usage statistics
   */
  static async getTokenUsageStats(tokenId: string, userId: string) {
    // Get token to verify ownership
    const token = await this.getTokenById(tokenId, userId);
    if (!token) {
      throw new Error('Token not found or access denied');
    }

    // Get usage stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usage = await prisma.apiUsage.aggregate({
      where: {
        apiTokenId: tokenId,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true },
      _avg: { responseTimeMs: true }
    });

    // Get usage by endpoint
    const usageByEndpoint = await prisma.apiUsage.groupBy({
      by: ['endpoint'],
      where: {
        apiTokenId: tokenId,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true }
    });

    return {
      totalRequests: usage._count.id,
      averageResponseTime: usage._avg.responseTimeMs,
      usageByEndpoint: usageByEndpoint.map(item => ({
        endpoint: item.endpoint,
        requests: item._count.id
      })),
      period: '30 days'
    };
  }

  /**
   * Check if user has reached their token limit
   */
  static async checkTokenLimit(userId: string): Promise<boolean> {
    const activeTokens = await prisma.apiToken.count({
      where: {
        userId,
        isActive: true,
        isDeleted: false // Exclude deleted tokens
      }
    });

    // For now, limit to 10 tokens per user
    const TOKEN_LIMIT = 10;
    return activeTokens < TOKEN_LIMIT;
  }
}

export const apiTokenService = ApiTokenService;