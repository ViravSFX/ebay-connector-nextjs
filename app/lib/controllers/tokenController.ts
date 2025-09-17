import { Request, Response } from 'express';
import { ApiTokenService } from '../services/tokenService';
import { debugLogService } from '../services/debugLogService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export class TokenController {
  // Create a new API token
  static async createToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, description, connectionId } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
          error: 'Token name is required and must be a non-empty string',
        });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Create eBay-specific token if connectionId is provided, otherwise create general token
      const token = connectionId && connectionId.trim() !== ''
        ? await ApiTokenService.createEbayToken(req.user.id, connectionId.trim(), name.trim(), description?.trim())
        : await ApiTokenService.createToken(req.user.id, name.trim(), description?.trim());

      res.status(201).json({
        message: 'API token created successfully',
        data: {
          id: token.id,
          name: token.name,
          description: token.description,
          token: token.token, // Show token only once during creation
          createdAt: token.createdAt,
        },
      });
    } catch (error) {
      debugLogService.error('TOKEN', `❌ Error creating API token: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all user's API tokens
  static async getUserTokens(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const tokens = await ApiTokenService.getUserTokens(req.user.id);

      res.json({
        message: 'API tokens retrieved successfully',
        data: tokens,
      });
    } catch (error) {
      debugLogService.error('TOKEN', `❌ Error fetching API tokens: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get a single API token by ID
  static async getToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const token = await ApiTokenService.getTokenById(tokenId, req.user.id);

      if (!token) {
        return res.status(404).json({ error: 'Token not found or unauthorized' });
      }

      res.json({
        message: 'API token retrieved successfully',
        data: token,
      });
    } catch (error) {
      debugLogService.error('TOKEN', `❌ Error fetching API token: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update an API token
  static async updateToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { tokenId } = req.params;
      const { name, description, connectionId } = req.body;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Validate at least one field is provided
      if (!name && !description && description !== '' && connectionId === undefined) {
        return res.status(400).json({ error: 'At least one field (name, description, or connectionId) is required' });
      }

      const updateData: { name?: string; description?: string; connectionId?: string } = {};
      if (name && typeof name === 'string' && name.trim() !== '') {
        updateData.name = name.trim();
      }
      if (description !== undefined) {
        updateData.description = description?.trim() || '';
      }
      if (connectionId !== undefined) {
        updateData.connectionId = connectionId?.trim() || null;
      }

      const updatedToken = await ApiTokenService.updateToken(tokenId, req.user.id, updateData);

      if (!updatedToken) {
        return res.status(404).json({ error: 'Token not found or unauthorized' });
      }

      res.json({
        message: 'API token updated successfully',
        data: updatedToken,
      });
    } catch (error) {
      debugLogService.error('TOKEN', `❌ Error updating API token: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Toggle token status (enable/disable)
  static async toggleTokenStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { tokenId } = req.params;
      const { isActive } = req.body;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean value' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const updatedToken = await ApiTokenService.toggleTokenStatus(tokenId, req.user.id, isActive);

      if (!updatedToken) {
        return res.status(404).json({ error: 'Token not found or unauthorized' });
      }

      res.json({
        message: `API token ${isActive ? 'enabled' : 'disabled'} successfully`,
        data: updatedToken,
      });
    } catch (error) {
      debugLogService.error('TOKEN', `❌ Error toggling API token status: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete an API token
  static async deleteToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const deleted = await ApiTokenService.deleteToken(tokenId, req.user.id);

      if (!deleted) {
        return res.status(404).json({ error: 'Token not found or unauthorized' });
      }

      res.json({
        message: 'API token deleted successfully',
      });
    } catch (error) {
      debugLogService.error('TOKEN', `❌ Error deleting API token: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}