import { Request, Response } from 'express';
import { EbayInventoryService, EbayListingData } from '../services/ebayInventoryService';
import { EbayApiError, EbayErrorHandler } from '../utils/ebayErrorHandler';
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

export class EbayListingController {
  // Helper method to handle eBay API errors in controllers
  private static handleEbayError(error: any, res: Response, context: string): void {
    if (error instanceof EbayApiError) {
      const userMessage = EbayErrorHandler.getUserFriendlyMessage(error);

      res.status(error.statusCode).json({
        error: error.type.toLowerCase().replace('_', ' '),
        message: userMessage,
        type: error.type,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          ebayErrorId: error.ebayErrorId
        })
      });
    } else {
      // Fallback for non-EbayApiError instances
      res.status(500).json({
        error: 'Internal server error',
        message: `Failed to ${context.toLowerCase()}`,
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }
  // POST /api/v2/ebay/listing - Create eBay listing
  static async createListing(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid API token'
        });
      }

      const listingData: EbayListingData = req.body;

      // Validate required fields
      const requiredFields = ['sku', 'title', 'description', 'categoryId', 'condition', 'price', 'quantity'];
      const missingFields = requiredFields.filter(field => !listingData[field as keyof EbayListingData]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          requiredFields
        });
      }

      // Validate price structure
      if (!listingData.price?.currency || !listingData.price?.value) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Price must include both currency and value',
          example: { currency: 'USD', value: '29.99' }
        });
      }

      try {
        // Call eBay Inventory Service to create complete listing
        // Use connection from token if available, otherwise service will pick first available
        const result = await EbayInventoryService.createCompleteListing(
          req.user.id,
          listingData,
          req.ebayConnection?.id // Pass connection ID if available from token
        );

        res.status(201).json({
          success: true,
          message: 'eBay listing created successfully',
          data: {
            sku: result.data.sku,
            title: result.data.title,
            ebayListingId: result.data.ebayListingId,
            ebayListingUrl: result.data.ebayListingUrl,
            status: 'published',
            inventoryCreated: result.data.inventoryItem.status,
            offerCreated: result.data.offer.status,
            listingPublished: result.data.listing.status
          }
        });

      } catch (serviceError: any) {
        return EbayListingController.handleEbayError(serviceError, res, 'Create eBay listing');
      }

    } catch (error: any) {


      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create eBay listing',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // GET /api/v2/ebay/listing - Get user's eBay listings
  static async getListings(req: AuthenticatedRequest, res: Response) {
    try {
      debugLogService.info('LISTING', '================== GET EBAY LISTINGS REQUEST ==================');
      debugLogService.info('LISTING', `User ID: ${req.user?.id}`);
      debugLogService.info('LISTING', `Connection ID: ${req.ebayConnection?.id || 'None'}`);
      debugLogService.info('LISTING', `Request query: ${JSON.stringify(req.query)}`);

      if (!req.user) {
        debugLogService.error('LISTING', 'User not authenticated - no user found in request');
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid API token'
        });
      }

      const { limit = '25', offset = '0' } = req.query;
      debugLogService.info('LISTING', `Parsed parameters - limit: ${limit}, offset: ${offset}`);

      try {
        // Get user's inventory items from eBay
        const inventoryResult = await EbayInventoryService.getInventoryItems(
          req.user.id,
          parseInt(limit as string),
          parseInt(offset as string),
          req.ebayConnection?.id
        );

        // Get user's offers (listings) from eBay
        const offersResult = await EbayInventoryService.getOffers(
          req.user.id,
          parseInt(limit as string),
          parseInt(offset as string),
          req.ebayConnection?.id
        );

        res.json({
          success: true,
          message: 'eBay listings retrieved successfully',
          data: {
            inventoryItems: inventoryResult.data?.inventoryItems || [],
            offers: offersResult.data?.offers || [],
            pagination: {
              limit: parseInt(limit as string),
              offset: parseInt(offset as string),
              inventoryTotal: inventoryResult.data?.total || 0,
              offersTotal: offersResult.data?.total || 0
            }
          }
        });

      } catch (serviceError: any) {
        return EbayListingController.handleEbayError(serviceError, res, 'Get eBay listings');
      }

    } catch (error: any) {


      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve eBay listings',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // GET /api/v2/ebay/listing/:sku - Get specific listing by SKU
  static async getListingBySku(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Please provide a valid API token'
        });
      }

      const { sku } = req.params;

      if (!sku) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'SKU is required'
        });
      }

      try {
        // Get all inventory items and find by SKU
        const inventoryResult = await EbayInventoryService.getInventoryItems(req.user.id, 100, 0, req.ebayConnection?.id);
        const inventoryItem = inventoryResult.data?.inventoryItems?.find((item: any) => item.sku === sku);

        // Get all offers and find by SKU
        const offersResult = await EbayInventoryService.getOffers(req.user.id, 100, 0, req.ebayConnection?.id);
        const offer = offersResult.data?.offers?.find((offer: any) => offer.sku === sku);

        if (!inventoryItem && !offer) {
          return res.status(404).json({
            error: 'Listing not found',
            message: `No listing found with SKU: ${sku}`
          });
        }

        res.json({
          success: true,
          message: 'Listing details retrieved successfully',
          data: {
            sku,
            inventoryItem: inventoryItem || null,
            offer: offer || null,
            hasInventory: !!inventoryItem,
            hasOffer: !!offer,
            isPublished: !!(offer?.status === 'PUBLISHED')
          }
        });

      } catch (serviceError: any) {
        return EbayListingController.handleEbayError(serviceError, res, 'Get listing details');
      }

    } catch (error: any) {


      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve listing details',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }
}