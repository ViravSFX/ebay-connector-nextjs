import { Request, Response } from 'express';
import { EbayOAuthService } from '../services/ebayOAuthService';
import { debugLogService } from '../services/debugLogService';
import prisma from '../services/database';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export class EbayOAuthController {
  // GET /api/ebay/oauth/authorize - Start OAuth flow
  static async startAuthorization(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { connectionId } = req.query;

      if (!connectionId) {
        return res.status(400).json({
          error: 'Connection ID required',
          message: 'Please provide a valid eBay connection ID'
        });
      }

      // Get user's eBay connection
      const connection = await prisma.ebayConnection.findFirst({
        where: {
          id: connectionId as string,
          userId: req.user.id
        }
      });

      if (!connection) {
        return res.status(404).json({
          error: 'eBay connection not found',
          message: 'Connection not found or you do not have access to it'
        });
      }

      // Create OAuth config
      const config = EbayOAuthService.createConfigFromConnection(connection);

      // Generate state parameter for security (include user ID and connection ID)
      const state = Buffer.from(JSON.stringify({
        userId: req.user.id,
        connectionId: connection.id,
        timestamp: Date.now()
      })).toString('base64');

      // Generate authorization URL
      const authUrl = EbayOAuthService.generateAuthorizationUrl(config, state);

      res.json({
        success: true,
        message: 'Authorization URL generated successfully',
        data: {
          authorizationUrl: authUrl,
          connectionName: connection.name,
          environment: connection.environment,
          expiresIn: '10 minutes'
        }
      });

    } catch (error: any) {
      debugLogService.error('OAUTH_CTRL', `❌ Error starting OAuth authorization: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to start eBay authorization',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // GET /api/ebay/oauth/callback - Handle OAuth callback
  static async handleCallback(req: Request, res: Response) {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        return res.status(400).json({
          error: 'OAuth authorization failed',
          message: error_description || error,
          suggestion: 'Please try the authorization process again'
        });
      }

      if (!code || !state) {
        return res.status(400).json({
          error: 'Invalid callback',
          message: 'Missing authorization code or state parameter'
        });
      }

      // Decode and validate state parameter
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      } catch {
        return res.status(400).json({
          error: 'Invalid state parameter',
          message: 'State parameter is corrupted or tampered with'
        });
      }

      const { userId, connectionId, timestamp } = stateData;

      // Check if state is not too old (10 minutes max)
      const ageInMinutes = (Date.now() - timestamp) / (1000 * 60);
      if (ageInMinutes > 10) {
        return res.status(400).json({
          error: 'Authorization expired',
          message: 'The authorization process has expired. Please start again.'
        });
      }

      // Get the eBay connection
      const connection = await prisma.ebayConnection.findFirst({
        where: {
          id: connectionId,
          userId: userId
        }
      });

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found',
          message: 'eBay connection not found'
        });
      }

      // Create OAuth config
      const config = EbayOAuthService.createConfigFromConnection(connection);

      // Exchange authorization code for access token
      const tokenData = await EbayOAuthService.exchangeCodeForToken(config, code as string);

      // Store the user token in database
      await EbayOAuthService.storeUserToken(userId, connectionId, tokenData);

      // Success response
      res.json({
        success: true,
        message: 'eBay authorization completed successfully',
        data: {
          connectionName: connection.name,
          environment: connection.environment,
          authorizedAt: new Date().toISOString(),
          expiresIn: `${tokenData.expires_in} seconds`,
          scopes: 'sell.inventory, sell.account, sell.fulfillment'
        }
      });

    } catch (error: any) {
      debugLogService.error('OAUTH_CTRL', `❌ Error handling OAuth callback: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to complete eBay authorization',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // GET /api/ebay/oauth/status - Check authorization status
  static async checkAuthorizationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { connectionId } = req.query;

      if (!connectionId) {
        return res.status(400).json({
          error: 'Connection ID required',
          message: 'Please provide a valid eBay connection ID'
        });
      }

      // Check if user has authorized token for this connection
      const userToken = await prisma.ebayUserToken.findUnique({
        where: {
          userId_connectionId: {
            userId: req.user.id,
            connectionId: connectionId as string
          }
        },
        include: {
          connection: true
        }
      });

      if (!userToken) {
        return res.json({
          success: true,
          data: {
            authorized: false,
            message: 'User has not authorized this eBay connection yet'
          }
        });
      }

      // Check if token is still valid
      const expiresInMinutes = (userToken.expiresAt.getTime() - Date.now()) / (1000 * 60);
      const isExpired = expiresInMinutes <= 0;

      res.json({
        success: true,
        data: {
          authorized: true,
          connectionName: userToken.connection.name,
          environment: userToken.connection.environment,
          authorizedAt: userToken.createdAt.toISOString(),
          expiresAt: userToken.expiresAt.toISOString(),
          isExpired,
          expiresInMinutes: Math.max(0, Math.floor(expiresInMinutes)),
          canRefresh: !isExpired || expiresInMinutes > -60 // Can refresh if not expired by more than 1 hour
        }
      });

    } catch (error: any) {
      debugLogService.error('OAUTH_CTRL', `❌ Error checking authorization status: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check authorization status',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // GET /api/ebay/oauth/authorize-url/:connectionId - Get authorization URL for specific connection
  static async getAuthorizationUrl(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { connectionId } = req.params;

      // Get user's eBay connection
      const connection = await prisma.ebayConnection.findFirst({
        where: {
          id: connectionId,
          userId: req.user.id
        }
      });

      if (!connection) {
        return res.status(404).json({
          error: 'eBay connection not found',
          message: 'Connection not found or you do not have access to it'
        });
      }

      // Create OAuth config
      const config = EbayOAuthService.createConfigFromConnection(connection);

      // Generate state parameter for security
      const state = Buffer.from(JSON.stringify({
        userId: req.user.id,
        connectionId: connection.id,
        timestamp: Date.now()
      })).toString('base64');

      // Generate authorization URL
      const authUrl = EbayOAuthService.generateAuthorizationUrl(config, state);

      debugLogService.info('OAUTH_CTRL', `✅ Authorization URL generated for connection: ${connection.name}`);

      res.json({
        success: true,
        message: 'Authorization URL generated successfully',
        data: {
          authUrl,
          connectionName: connection.name,
          environment: connection.environment,
          popup: true // Indicate this is for popup use
        }
      });

    } catch (error: any) {
      debugLogService.error('OAUTH_CTRL', `❌ Error generating authorization URL: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate authorization URL',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // DELETE /api/ebay/oauth/revoke - Revoke user authorization
  static async revokeAuthorization(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { connectionId } = req.params;

      if (!connectionId) {
        return res.status(400).json({
          error: 'Connection ID required',
          message: 'Please provide a valid eBay connection ID'
        });
      }

      // Delete user token from database
      const deletedToken = await prisma.ebayUserToken.deleteMany({
        where: {
          userId: req.user.id,
          connectionId: connectionId
        }
      });

      if (deletedToken.count === 0) {
        return res.status(404).json({
          error: 'Authorization not found',
          message: 'No authorization found for this connection'
        });
      }

      res.json({
        success: true,
        message: 'eBay authorization revoked successfully'
      });

    } catch (error: any) {
      debugLogService.error('OAUTH_CTRL', `❌ Error revoking authorization: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to revoke authorization',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }
}