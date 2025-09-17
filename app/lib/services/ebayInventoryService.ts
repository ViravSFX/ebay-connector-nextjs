import axios from 'axios';
import { EbayOAuthService } from './ebayOAuthService';
import { EbayAutoOAuthService } from './ebayAutoOAuthService';
import { EbayErrorHandler } from '../utils/ebayErrorHandler';
import { debugLogService } from './debugLogService';
import prisma from './database';

export interface EbayListingData {
  sku: string;
  title: string;
  description: string;
  categoryId: string;
  condition: 'NEW' | 'LIKE_NEW' | 'USED_EXCELLENT' | 'USED_VERY_GOOD' | 'USED_GOOD' | 'USED_ACCEPTABLE' | 'FOR_PARTS_OR_NOT_WORKING';
  price: {
    currency: string;
    value: string;
  };
  quantity: number;
  images?: string[];
  location?: {
    country: string;
    postalCode: string;
  };
  shippingPolicy?: {
    domesticShippingCost?: string;
    shippingService?: string;
  };
  returnPolicy?: {
    returnsAccepted: boolean;
    returnPeriod?: string;
  };
}

export interface EbayInventoryItem {
  sku: string;
  product: {
    title: string;
    description: string;
    aspects?: { [key: string]: string[] };
    brand?: string;
    mpn?: string;
    imageUrls?: string[];
  };
  condition: string;
  conditionDescription?: string;
  packageWeightAndSize?: {
    dimensions?: {
      height: number;
      length: number;
      width: number;
      unit: 'INCH' | 'FEET' | 'CENTIMETER' | 'METER';
    };
    weight?: {
      value: number;
      unit: 'POUND' | 'OUNCE' | 'KILOGRAM' | 'GRAM';
    };
  };
  availability: {
    shipToLocationAvailability: {
      quantity: number;
    };
  };
}

export interface EbayOffer {
  offerId?: string;
  sku: string;
  marketplaceId: 'EBAY_US' | 'EBAY_UK' | 'EBAY_DE' | 'EBAY_CA' | 'EBAY_AU' | 'EBAY_FR' | 'EBAY_IT' | 'EBAY_ES';
  categoryId: string;
  format: 'FIXED_PRICE' | 'AUCTION';
  availableQuantity: number;
  pricingSummary: {
    price: {
      currency: string;
      value: string;
    };
  };
  listingDescription: string;
  listingPolicies: {
    fulfillmentPolicyId?: string;
    paymentPolicyId?: string;
    returnPolicyId?: string;
  };
  merchantLocationKey?: string;
}

export class EbayInventoryService {
  private static getApiBaseUrl(environment: 'sandbox' | 'production'): string {
    return environment === 'sandbox'
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
  }

  // Get user's eBay access token (handles refresh automatically)
  private static async getUserAccessToken(userId: string, connectionId?: string): Promise<{ token: string; connectionId: string }> {
    try {
      debugLogService.info('INVENTORY', '================== GET USER ACCESS TOKEN ==================');
      debugLogService.info('INVENTORY', `User ID: ${userId}`);
      debugLogService.info('INVENTORY', `Connection ID: ${connectionId || 'Auto-select'}`);

      // Get user's specific eBay connection or first available one
      let connection;
      try {
        connection = await EbayOAuthService.getEbayConnection(userId, connectionId);
        debugLogService.info('INVENTORY', `✅ Found eBay connection: ${connection.name}`);
        debugLogService.info('INVENTORY', `Connection details - ID: ${connection.id}, Environment: ${connection.environment}`);
        debugLogService.info('INVENTORY', `Credentials check - Client ID: ${!!connection.clientId}, Client Secret: ${!!connection.clientSecret}`);
      } catch (connectionError) {
        debugLogService.error('INVENTORY', `❌ No eBay connection found: ${connectionError}`);
        throw new Error('No eBay connection found. Please set up your eBay connection first using the /api/ebay/connections endpoint with your eBay Client ID and Secret.');
      }

      // Validate connection has required credentials
      if (!connection.clientId || !connection.clientSecret) {
        throw new Error('eBay connection is missing Client ID or Client Secret. Please update your eBay connection with valid credentials.');
      }

      // Check if user has authorized this connection
      let userToken = await prisma.ebayUserToken.findUnique({
        where: {
          userId_connectionId: {
            userId,
            connectionId: connection.id
          }
        }
      });

      debugLogService.info('INVENTORY', `User token status - Exists: ${!!userToken}, Expired: ${userToken ? (userToken.expiresAt.getTime() - Date.now()) / (1000 * 60) <= 5 : 'N/A'}, Has refresh: ${!!userToken?.refreshToken}`);

      // If no user token exists, try to get application token automatically
      if (!userToken) {
        debugLogService.warn('INVENTORY', '⚠️ No user token found - attempting automatic token acquisition');
        debugLogService.info('INVENTORY', '📋 Trying to get application token for basic operations...');

        try {
          const config = EbayOAuthService.createConfigFromConnection(connection);

          // Attempt to get application token
          debugLogService.info('INVENTORY', '🔄 Requesting eBay application token...');
          const appToken = await EbayOAuthService.getApplicationToken(config);

          // Store application token as fallback
          const tokenData = {
            access_token: appToken,
            token_type: 'Bearer',
            expires_in: 7200,
            refresh_token: null
          };

          await EbayOAuthService.storeUserToken(userId, connection.id, tokenData);
          debugLogService.info('INVENTORY', '✅ Application token acquired and stored successfully');

          return {
            token: appToken,
            connectionId: connection.id
          };

        } catch (appTokenError: any) {
          debugLogService.error('INVENTORY', `❌ Failed to get application token: ${appTokenError.message}`);
          debugLogService.info('INVENTORY', '📋 For full functionality, complete OAuth flow:');
          debugLogService.info('INVENTORY', '   1. Visit: /api/ebay/oauth/authorize?connectionId=' + connection.id);
          debugLogService.info('INVENTORY', '   2. Complete eBay authorization in browser');
          debugLogService.info('INVENTORY', '   3. eBay will redirect back with proper User Token');

          throw new Error(`Unable to acquire eBay access token automatically. For full inventory access, please complete OAuth flow: /api/ebay/oauth/authorize?connectionId=${connection.id}. Error: ${appTokenError.message}`);
        }
      }

      // Check if token is expired and try to refresh automatically
      const expiresInMinutes = (userToken.expiresAt.getTime() - Date.now()) / (1000 * 60);
      debugLogService.info('INVENTORY', `Token expires in ${expiresInMinutes.toFixed(2)} minutes`);

      if (expiresInMinutes <= 5) {
        debugLogService.warn('INVENTORY', '⚠️ Token expiring soon, attempting automatic refresh...');

        if (userToken.refreshToken) {
          // Try to refresh the user token using refresh token
          try {
            debugLogService.info('INVENTORY', '🔄 Refreshing user token with refresh token...');
            const config = EbayOAuthService.createConfigFromConnection(connection);
            const refreshedToken = await EbayOAuthService.refreshUserToken(config, userToken.refreshToken);

            // Store the refreshed token
            await EbayOAuthService.storeUserToken(userId, connection.id, refreshedToken);
            debugLogService.info('INVENTORY', '✅ User token refreshed successfully');

            return {
              token: refreshedToken.access_token,
              connectionId: connection.id
            };
          } catch (refreshError: any) {
            debugLogService.warn('INVENTORY', `⚠️ Refresh token failed: ${refreshError.message}, trying application token...`);
          }
        } else {
          debugLogService.info('INVENTORY', '🔄 No refresh token available, trying application token...');
        }

        // If refresh failed or no refresh token, get new application token
        try {
          const config = EbayOAuthService.createConfigFromConnection(connection);
          debugLogService.info('INVENTORY', '🔄 Requesting new eBay application token...');
          const appToken = await EbayOAuthService.getApplicationToken(config);

          // Update stored token
          const tokenData = {
            access_token: appToken,
            token_type: 'Bearer',
            expires_in: 7200,
            refresh_token: null
          };

          await EbayOAuthService.storeUserToken(userId, connection.id, tokenData);
          debugLogService.info('INVENTORY', '✅ Application token acquired and updated successfully');

          return {
            token: appToken,
            connectionId: connection.id
          };
        } catch (appTokenError: any) {
          debugLogService.error('INVENTORY', `❌ All token refresh attempts failed: ${appTokenError.message}`);
          throw new Error(`Failed to refresh eBay token automatically. Please check your eBay credentials or complete OAuth flow. Error: ${appTokenError.message}`);
        }
      }

      // Token is still valid
      debugLogService.info('INVENTORY', '✅ Using existing valid user token');
      return {
        token: userToken.accessToken,
        connectionId: connection.id
      };

    } catch (error: any) {
      debugLogService.error('INVENTORY', `❌ Error getting eBay access token: ${error.message}`);
      throw error; // Re-throw the original error to preserve the specific message
    }
  }

  // Create inventory item
  static async createInventoryItem(userId: string, inventoryItem: EbayInventoryItem, connectionId?: string): Promise<any> {
    try {
      const { token, connectionId: resolvedConnectionId } = await this.getUserAccessToken(userId, connectionId);
      const connection = await EbayOAuthService.getEbayConnection(userId, resolvedConnectionId);
      const baseUrl = this.getApiBaseUrl(connection.environment as 'sandbox' | 'production');

      const response = await axios.put(
        `${baseUrl}/sell/inventory/v1/inventory_item/${inventoryItem.sku}`,
        inventoryItem,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Language': 'en-US'
          }
        }
      );

      return {
        success: true,
        sku: inventoryItem.sku,
        status: 'created',
        data: response.data
      };

    } catch (error: any) {
      EbayErrorHandler.handleEbayError(error, 'Create Inventory Item');
    }
  }

  // Create offer (listing)
  static async createOffer(userId: string, offer: EbayOffer, connectionId?: string): Promise<any> {
    try {
      const { token, connectionId: resolvedConnectionId } = await this.getUserAccessToken(userId, connectionId);
      const connection = await EbayOAuthService.getEbayConnection(userId, resolvedConnectionId);
      const baseUrl = this.getApiBaseUrl(connection.environment as 'sandbox' | 'production');

      const response = await axios.post(
        `${baseUrl}/sell/inventory/v1/offer`,
        offer,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Language': 'en-US'
          }
        }
      );

      return {
        success: true,
        offerId: response.data.offerId,
        sku: offer.sku,
        status: 'offer_created',
        data: response.data
      };

    } catch (error: any) {
      EbayErrorHandler.handleEbayError(error, 'Create Offer');
    }
  }

  // Publish offer (make it live)
  static async publishOffer(userId: string, offerId: string, connectionId?: string): Promise<any> {
    try {
      const { token, connectionId: resolvedConnectionId } = await this.getUserAccessToken(userId, connectionId);
      const connection = await EbayOAuthService.getEbayConnection(userId, resolvedConnectionId);
      const baseUrl = this.getApiBaseUrl(connection.environment as 'sandbox' | 'production');

      const response = await axios.post(
        `${baseUrl}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Language': 'en-US'
          }
        }
      );

      return {
        success: true,
        offerId,
        listingId: response.data.listingId,
        status: 'published',
        data: response.data
      };

    } catch (error: any) {
      EbayErrorHandler.handleEbayError(error, 'Publish Offer');
    }
  }

  // Complete listing creation (inventory + offer + publish)
  static async createCompleteListing(userId: string, listingData: EbayListingData, connectionId?: string): Promise<any> {
    try {
      // Step 1: Create inventory item
      const inventoryItem: EbayInventoryItem = {
        sku: listingData.sku,
        product: {
          title: listingData.title,
          description: listingData.description,
          imageUrls: listingData.images
        },
        condition: listingData.condition,
        availability: {
          shipToLocationAvailability: {
            quantity: listingData.quantity
          }
        }
      };

      const inventoryResult = await this.createInventoryItem(userId, inventoryItem, connectionId);

      // Step 2: Create offer
      const offer: EbayOffer = {
        sku: listingData.sku,
        marketplaceId: 'EBAY_US', // Default to US, could be configurable
        categoryId: listingData.categoryId,
        format: 'FIXED_PRICE',
        availableQuantity: listingData.quantity,
        pricingSummary: {
          price: listingData.price
        },
        listingDescription: listingData.description,
        listingPolicies: {
          // These would need to be configured by the user
          // fulfillmentPolicyId: 'user_fulfillment_policy',
          // paymentPolicyId: 'user_payment_policy',
          // returnPolicyId: 'user_return_policy'
        }
      };

      const offerResult = await this.createOffer(userId, offer, connectionId);

      // Step 3: Publish offer
      const publishResult = await this.publishOffer(userId, offerResult.offerId, connectionId);

      return {
        success: true,
        message: 'eBay listing created successfully',
        data: {
          sku: listingData.sku,
          title: listingData.title,
          inventoryItem: inventoryResult,
          offer: offerResult,
          listing: publishResult,
          ebayListingId: publishResult.listingId,
          ebayListingUrl: `https://www.ebay.com/itm/${publishResult.listingId}`
        }
      };

    } catch (error: any) {
      debugLogService.error('INVENTORY', `❌ Error creating complete listing: ${error.message}`);
      throw error;
    }
  }

  // Get user's inventory items
  static async getInventoryItems(userId: string, limit: number = 25, offset: number = 0, connectionId?: string): Promise<any> {
    try {
      debugLogService.info('INVENTORY', `================== GET INVENTORY ITEMS ==================`);
      debugLogService.info('INVENTORY', `Parameters - User: ${userId}, Limit: ${limit}, Offset: ${offset}, Connection: ${connectionId || 'Auto'}`);

      const { token, connectionId: resolvedConnectionId } = await this.getUserAccessToken(userId, connectionId);
      const connection = await EbayOAuthService.getEbayConnection(userId, resolvedConnectionId);
      const baseUrl = this.getApiBaseUrl(connection.environment as 'sandbox' | 'production');

      const apiUrl = `${baseUrl}/sell/inventory/v1/inventory_item`;
      debugLogService.info('INVENTORY', `Making API call to: ${apiUrl}`);
      debugLogService.info('INVENTORY', `Headers - Auth: Bearer ${token.substring(0, 20)}..., Language: en-US`);
      debugLogService.info('INVENTORY', `Parameters - limit: ${limit}, offset: ${offset}`);

      const response = await axios.get(
        apiUrl,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Language': 'en-US'
          },
          params: {
            limit,
            offset
          }
        }
      );

      debugLogService.info('INVENTORY', `✅ API call successful - Status: ${response.status}`);
      debugLogService.info('INVENTORY', `Response preview - Has data: ${!!response.data}, Keys: ${response.data ? Object.keys(response.data).join(', ') : 'None'}, Items: ${response.data?.inventoryItems?.length || 0}`);

      return {
        success: true,
        data: response.data
      };

    } catch (error: any) {
      EbayErrorHandler.handleEbayError(error, 'Get Inventory Items');
    }
  }

  // Get user's offers
  static async getOffers(userId: string, limit: number = 25, offset: number = 0, connectionId?: string): Promise<any> {
    try {
      const { token, connectionId: resolvedConnectionId } = await this.getUserAccessToken(userId, connectionId);
      const connection = await EbayOAuthService.getEbayConnection(userId, resolvedConnectionId);
      const baseUrl = this.getApiBaseUrl(connection.environment as 'sandbox' | 'production');

      const response = await axios.get(
        `${baseUrl}/sell/inventory/v1/offer`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Language': 'en-US'
          },
          params: {
            limit,
            offset
          }
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error: any) {
      EbayErrorHandler.handleEbayError(error, 'Get Offers');
    }
  }
}