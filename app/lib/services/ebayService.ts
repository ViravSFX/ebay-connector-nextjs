import EbayApi from 'ebay-api';
import { debugLogService } from './debugLogService';
import prisma from './database';

export interface EbayListingFilters {
  categoryId?: string;
  keywords?: string;
  limit?: number;
  offset?: number;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sortOrder?: 'BestMatch' | 'EndTimeSoonest' | 'PricePlusShippingLowest' | 'PricePlusShippingHighest';
}

export interface EbayListing {
  itemId: string;
  title: string;
  price: {
    currency: string;
    value: string;
  };
  condition: string;
  location: string;
  shippingCost?: {
    currency: string;
    value: string;
  };
  imageUrl?: string;
  listingUrl: string;
  endTime: string;
  bidCount?: number;
  buyItNowAvailable: boolean;
}

export class EbayService {
  private static ebayApi: EbayApi | null = null;

  // Initialize eBay API with user's connection settings
  static async initializeEbayApi(userId: string): Promise<EbayApi> {
    // Get user's eBay connection from database
    const ebayConnection = await prisma.ebayConnection.findFirst({
      where: { userId },
    });

    if (!ebayConnection) {
      throw new Error('No eBay connection found for user. Please configure eBay credentials first.');
    }

    // Create eBay API instance
    const ebayApi = new EbayApi({
      appId: ebayConnection.clientId,
      certId: ebayConnection.clientSecret,
      sandbox: ebayConnection.environment === 'sandbox',
      devId: process.env.EBAY_DEV_ID, // Optional dev ID from environment
    });

    return ebayApi;
  }

  // Get application token for public API calls (doesn't require user auth)
  static async getApplicationToken(ebayApi: EbayApi): Promise<string> {
    try {
      const token = await ebayApi.OAuth2.getApplicationAccessToken();
      return token;
    } catch (error: any) {
      debugLogService.error('EBAY_SERVICE', `❌ Error getting eBay application token: ${error.message}`);
      throw new Error('Failed to authenticate with eBay API');
    }
  }

  // Search for eBay listings
  static async searchListings(
    userId: string,
    filters: EbayListingFilters = {}
  ): Promise<{ listings: EbayListing[]; totalResults: number }> {
    try {
      const ebayApi = await this.initializeEbayApi(userId);
      const appToken = await this.getApplicationToken(ebayApi);

      // Set the application token
      ebayApi.OAuth2.setCredentials(appToken);

      // Build search parameters
      const searchParams: any = {
        q: filters.keywords || '',
        limit: Math.min(filters.limit || 20, 100), // Max 100 results per request
        offset: filters.offset || 0,
      };

      if (filters.categoryId) {
        searchParams.category_ids = filters.categoryId;
      }

      if (filters.condition) {
        searchParams.filter = `conditions:${filters.condition}`;
      }

      if (filters.minPrice || filters.maxPrice) {
        const priceFilter = [];
        if (filters.minPrice) priceFilter.push(`price:[${filters.minPrice}`);
        if (filters.maxPrice) priceFilter.push(`${filters.maxPrice}]`);
        searchParams.filter = (searchParams.filter ? searchParams.filter + ',' : '') + priceFilter.join('..');
      }

      if (filters.sortOrder) {
        searchParams.sort = filters.sortOrder;
      }

      // Make API call to eBay Browse API
      const response = await (ebayApi as any).browse.search(searchParams);

      // Transform eBay response to our format
      const listings: EbayListing[] = (response.itemSummaries || []).map((item: any) => ({
        itemId: item.itemId,
        title: item.title,
        price: {
          currency: item.price?.currency || 'USD',
          value: item.price?.value || '0',
        },
        condition: item.condition || 'Unknown',
        location: item.itemLocation?.city || 'Unknown',
        shippingCost: item.shippingOptions?.[0]?.shippingCost || null,
        imageUrl: item.thumbnailImages?.[0]?.imageUrl || null,
        listingUrl: item.itemWebUrl,
        endTime: item.itemEndDate || new Date().toISOString(),
        bidCount: item.bidCount || 0,
        buyItNowAvailable: item.buyingOptions?.includes('FIXED_PRICE') || false,
      }));

      return {
        listings,
        totalResults: response.total || 0,
      };

    } catch (error: any) {
      debugLogService.error('EBAY_SERVICE', `❌ Error searching eBay listings: ${error.message}`);

      if (error.message.includes('No eBay connection')) {
        throw error;
      }

      throw new Error('Failed to fetch eBay listings. Please check your eBay API credentials.');
    }
  }

  // Get specific listing details
  static async getListingDetails(userId: string, itemId: string): Promise<EbayListing | null> {
    try {
      const ebayApi = await this.initializeEbayApi(userId);
      const appToken = await this.getApplicationToken(ebayApi);

      ebayApi.OAuth2.setCredentials(appToken);

      const response = await (ebayApi as any).browse.getItem({ item_id: itemId });

      if (!response) {
        return null;
      }

      return {
        itemId: response.itemId,
        title: response.title,
        price: {
          currency: response.price?.currency || 'USD',
          value: response.price?.value || '0',
        },
        condition: response.condition || 'Unknown',
        location: response.itemLocation?.city || 'Unknown',
        shippingCost: response.shippingOptions?.[0]?.shippingCost || null,
        imageUrl: response.image?.imageUrl || null,
        listingUrl: response.itemWebUrl,
        endTime: response.itemEndDate || new Date().toISOString(),
        bidCount: response.bidCount || 0,
        buyItNowAvailable: response.buyingOptions?.includes('FIXED_PRICE') || false,
      };

    } catch (error: any) {
      debugLogService.error('EBAY_SERVICE', `❌ Error fetching eBay listing details: ${error.message}`);
      throw new Error('Failed to fetch listing details');
    }
  }
}