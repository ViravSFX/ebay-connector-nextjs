import { Request, Response, NextFunction } from 'express';
import { ApiTokenService } from '../services/tokenService';
import { debugLogService } from '../services/debugLogService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  tokenId?: string;
  ebayConnection?: {
    id: string;
    name: string;
    environment: string;
    clientId: string;
    clientSecret: string;
  } | null;
}

export const apiKeyAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Look for API key in headers
    const apiKey = req.header('X-API-Key') || req.header('Authorization')?.replace('Bearer ', '');

    debugLogService.info('AUTH', '================== BEARER TOKEN AUTHENTICATION ==================');
    debugLogService.info('AUTH', `Received API request: ${req.method} ${req.path}`);
    debugLogService.info('AUTH', `Bearer token received: ${apiKey ? `${apiKey.substring(0, 20)}...` : 'None'}`);

    if (!apiKey) {
      debugLogService.error('AUTH', 'No Bearer token provided in request');
      return res.status(401).json({
        error: 'API key required. Please provide X-API-Key header or Authorization Bearer token.',
      });
    }

    // Verify the API token
    debugLogService.info('AUTH', 'Verifying Bearer token...');
    const tokenData = await ApiTokenService.verifyApiToken(apiKey);

    if (!tokenData) {
      debugLogService.error('AUTH', 'Bearer token verification failed - invalid or expired');
      return res.status(401).json({
        error: 'Invalid or expired API key.',
      });
    }

    debugLogService.info('AUTH', 'Bearer token verified successfully!');
    debugLogService.info('AUTH', `Token belongs to user: ${tokenData.user?.email}`);
    debugLogService.info('AUTH', `Linked eBay connection: ${tokenData.ebayConnection?.name} (${tokenData.ebayConnection?.environment})`);

    // Add user, token, and eBay connection info to request
    req.user = tokenData.user;
    req.tokenId = tokenData.tokenId;
    req.ebayConnection = tokenData.ebayConnection;

    next();
  } catch (error) {
    debugLogService.error('AUTH', `❌ API key authentication error: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};