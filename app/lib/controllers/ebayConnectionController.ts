import { Request, Response } from 'express';
import { EbayConnectionService } from '../services/ebayConnectionService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export class EbayConnectionController {
  // POST /api/ebay/connections - Create new eBay connection
  static async createConnection(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { name, clientId, clientSecret, devId, redirectUrl, environment, ebayUsername, ebayPassword } = req.body;

      // Validation
      if (!name || !clientId || !clientSecret || !devId || !redirectUrl || !environment) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Please provide name, clientId, clientSecret, devId, redirectUrl, and environment'
        });
      }

      if (!['sandbox', 'production'].includes(environment)) {
        return res.status(400).json({
          error: 'Invalid environment',
          message: 'Environment must be either "sandbox" or "production"'
        });
      }

      const connection = await EbayConnectionService.createConnection(req.user.id, {
        name,
        clientId,
        clientSecret,
        devId,
        redirectUrl,
        environment,
        ebayUsername,
        ebayPassword
      });

      res.status(201).json({
        success: true,
        message: 'eBay connection created successfully',
        data: connection
      });

    } catch (error: any) {
      if (error.message === 'Connection name already exists') {
        return res.status(400).json({
          error: 'Connection name already exists',
          message: 'You already have an eBay connection with this name'
        });
      }

      // Error logged in response
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create eBay connection',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // GET /api/ebay/connections - Get all user's eBay connections
  static async getConnections(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const connections = await EbayConnectionService.getUserConnections(req.user.id);

      res.json({
        success: true,
        message: 'eBay connections retrieved successfully',
        data: {
          connections,
          count: connections.length
        }
      });

    } catch (error: any) {
      // Error logged in response
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve eBay connections',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // GET /api/ebay/connections/kanban - Get connections grouped for Kanban view
  static async getConnectionsKanban(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const kanbanData = await EbayConnectionService.getConnectionsForKanban(req.user.id);

      res.json({
        success: true,
        message: 'eBay connections kanban data retrieved successfully',
        data: kanbanData
      });

    } catch (error: any) {
      // Error logged in response
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve eBay connections kanban data',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // GET /api/ebay/connections/:id - Get specific eBay connection
  static async getConnection(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: 'Connection ID required',
          message: 'Please provide a valid connection ID'
        });
      }

      const connection = await EbayConnectionService.getConnectionById(id, req.user.id);

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found',
          message: 'eBay connection not found or you do not have access to it'
        });
      }

      res.json({
        success: true,
        message: 'eBay connection retrieved successfully',
        data: { connection }
      });

    } catch (error: any) {
      // Error logged in response
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve eBay connection',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // PUT /api/ebay/connections/:id - Update eBay connection
  static async updateConnection(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { id } = req.params;
      const { name, clientId, clientSecret, devId, redirectUrl, environment, ebayUsername, ebayPassword } = req.body;

      if (!id) {
        return res.status(400).json({
          error: 'Connection ID required',
          message: 'Please provide a valid connection ID'
        });
      }

      // Validate environment if provided
      if (environment !== undefined && !['sandbox', 'production'].includes(environment)) {
        return res.status(400).json({
          error: 'Invalid environment',
          message: 'Environment must be either "sandbox" or "production"'
        });
      }

      // Build update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (clientId !== undefined) updateData.clientId = clientId;
      if (clientSecret !== undefined) updateData.clientSecret = clientSecret;
      if (devId !== undefined) updateData.devId = devId;
      if (redirectUrl !== undefined) updateData.redirectUrl = redirectUrl;
      if (environment !== undefined) updateData.environment = environment;
      if (ebayUsername !== undefined) updateData.ebayUsername = ebayUsername;
      if (ebayPassword !== undefined) updateData.ebayPassword = ebayPassword;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'No update data provided',
          message: 'Please provide at least one field to update'
        });
      }

      const updatedConnection = await EbayConnectionService.updateConnection(id, req.user.id, updateData);

      if (!updatedConnection) {
        return res.status(404).json({
          error: 'Connection not found',
          message: 'eBay connection not found or you do not have access to it'
        });
      }

      res.json({
        success: true,
        message: 'eBay connection updated successfully',
        data: { connection: updatedConnection }
      });

    } catch (error: any) {
      if (error.message === 'Connection name already exists') {
        return res.status(400).json({
          error: 'Connection name already exists',
          message: 'You already have an eBay connection with this name'
        });
      }

      // Error logged in response
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update eBay connection',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // PATCH /api/ebay/connections/:id/status - Toggle connection status
  static async toggleConnectionStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { id } = req.params;
      const { isActive } = req.body;

      if (!id) {
        return res.status(400).json({
          error: 'Connection ID required',
          message: 'Please provide a valid connection ID'
        });
      }

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid status value',
          message: 'isActive must be a boolean value'
        });
      }

      const updatedConnection = await EbayConnectionService.toggleConnectionStatus(
        id,
        req.user.id,
        isActive
      );

      if (!updatedConnection) {
        return res.status(404).json({
          error: 'Connection not found',
          message: 'eBay connection not found or you do not have access to it'
        });
      }

      res.json({
        success: true,
        message: `eBay connection ${isActive ? 'enabled' : 'disabled'} successfully`,
        data: updatedConnection
      });

    } catch (error: any) {
      // Error logged in response
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to toggle eBay connection status',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // DELETE /api/ebay/connections/:id - Delete eBay connection
  static async deleteConnection(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid JWT token'
        });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: 'Connection ID required',
          message: 'Please provide a valid connection ID'
        });
      }

      const deleted = await EbayConnectionService.deleteConnection(id, req.user.id);

      if (!deleted) {
        return res.status(404).json({
          error: 'Connection not found',
          message: 'eBay connection not found or you do not have access to it'
        });
      }

      res.json({
        success: true,
        message: 'eBay connection deleted successfully'
      });

    } catch (error: any) {
      // Error logged in response
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete eBay connection',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }
}