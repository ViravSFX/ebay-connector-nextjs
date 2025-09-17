import { NextRequest } from 'next/server';
import { TokenExtractor, AuthenticatedUser } from '../auth/tokenExtractor';

export function requireAuth(
  handler: (request: NextRequest, user: AuthenticatedUser, context?: any) => Promise<Response>
) {
  return async (request: NextRequest, context?: any) => {
    const { user, error } = await TokenExtractor.extractAndVerifyToken(request);

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error || 'Authentication required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request, user, context);
  };
}