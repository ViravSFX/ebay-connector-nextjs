import { NextRequest, NextResponse } from 'next/server';
import { ApiTokenService, ApiTokenWithUser } from '../services/apiTokenService';

export interface ApiAuthenticatedRequest {
  token: ApiTokenWithUser;
  user: ApiTokenWithUser['user'];
}

/**
 * Middleware to authenticate API requests using API tokens
 * Usage: export const GET = requireApiToken(async (request, authData) => { ... });
 */
export function requireApiToken(
  handler: (
    request: NextRequest,
    authData: ApiAuthenticatedRequest,
    context?: any
  ) => Promise<Response>
) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');

      if (!authHeader) {
        return NextResponse.json(
          {
            success: false,
            error: 'MISSING_AUTHORIZATION',
            message: 'Authorization header is required'
          },
          { status: 401 }
        );
      }

      if (!authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_AUTHORIZATION_FORMAT',
            message: 'Authorization header must start with "Bearer "'
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Validate token format
      if (!ApiTokenService.isValidTokenFormat(token)) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_TOKEN_FORMAT',
            message: 'Invalid API token format'
          },
          { status: 401 }
        );
      }

      // Authenticate token
      const tokenData = await ApiTokenService.getTokenByString(token);

      if (!tokenData) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_TOKEN',
            message: 'Invalid or expired API token'
          },
          { status: 401 }
        );
      }

      // Update last used timestamp (fire and forget)
      ApiTokenService.updateLastUsed(tokenData.id).catch(console.error);

      // Create auth data object
      const authData: ApiAuthenticatedRequest = {
        token: tokenData,
        user: tokenData.user
      };

      // Call the handler with authenticated data
      return handler(request, authData, context);

    } catch (error) {
      console.error('API authentication error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'Internal authentication error'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Extract API token from request headers (utility function)
 */
export function extractApiToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

/**
 * Validate API token permissions for specific endpoint
 */
export function hasEndpointPermission(
  tokenData: ApiTokenWithUser,
  endpoint: string
): boolean {
  const permissions = tokenData.permissions as any;

  // If no endpoint restrictions, allow all
  if (!permissions.endpoints || !Array.isArray(permissions.endpoints)) {
    return true;
  }

  // Check if endpoint is in allowed list
  return permissions.endpoints.includes(endpoint);
}

/**
 * Get rate limit for token
 */
export function getTokenRateLimit(tokenData: ApiTokenWithUser): number {
  const permissions = tokenData.permissions as any;
  return permissions.rateLimit || 1000; // Default to 1000 requests per hour
}