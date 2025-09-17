import prisma from './database';
import { debugLogService } from './debugLogService';

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
  // Check if user has eBay connection configured
  static async checkEbayConnection(userId: string): Promise<boolean> {
    const connection = await prisma.ebayConnection.findFirst({
      where: { userId },
    });
    return !!connection;
  }

  // Get user's eBay connection
  static async getEbayConnection(userId: string) {
    const connection = await prisma.ebayConnection.findFirst({
      where: { userId },
    });

    if (!connection) {
      throw new Error('No eBay connection found for user. Please configure eBay credentials first.');
    }

    return connection;
  }

  // Search for eBay listings (simplified version for testing)
  static async searchListings(
    userId: string,
    filters: EbayListingFilters = {}
  ): Promise<{ listings: EbayListing[]; totalResults: number }> {
    try {
      // Check if user has eBay connection
      await this.getEbayConnection(userId);

      // For now, return mock data for testing
      // In a real implementation, this would make actual eBay API calls
      const mockListings: EbayListing[] = [
        {
          itemId: "v1|264739477777|0",
          title: `${filters.keywords || 'Sample'} Vintage Item - Great Condition`,
          price: {
            currency: "USD",
            value: "25.99"
          },
          condition: "Used",
          location: "New York, NY",
          shippingCost: {
            currency: "USD",
            value: "5.99"
          },
          imageUrl: "https://i.ebayimg.com/images/g/sample/s-l225.jpg",
          listingUrl: "https://www.ebay.com/itm/264739477777",
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          bidCount: 3,
          buyItNowAvailable: true
        },
        {
          itemId: "v1|264739477778|0",
          title: `${filters.keywords || 'Sample'} Electronics Bundle`,
          price: {
            currency: "USD",
            value: "89.99"
          },
          condition: "New",
          location: "Los Angeles, CA",
          shippingCost: {
            currency: "USD",
            value: "Free"
          },
          imageUrl: "https://i.ebayimg.com/images/g/sample2/s-l225.jpg",
          listingUrl: "https://www.ebay.com/itm/264739477778",
          endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          bidCount: 0,
          buyItNowAvailable: true
        }
      ];

      // Apply basic filtering
      let filteredListings = mockListings;

      if (filters.minPrice) {
        filteredListings = filteredListings.filter(item =>
          parseFloat(item.price.value) >= filters.minPrice!
        );
      }

      if (filters.maxPrice) {
        filteredListings = filteredListings.filter(item =>
          parseFloat(item.price.value) <= filters.maxPrice!
        );
      }

      if (filters.condition) {
        filteredListings = filteredListings.filter(item =>
          item.condition.toLowerCase().includes(filters.condition!.toLowerCase())
        );
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      const paginatedListings = filteredListings.slice(offset, offset + limit);

      return {
        listings: paginatedListings,
        totalResults: filteredListings.length,
      };

    } catch (error: any) {
      debugLogService.error('EBAY_SERVICE', `❌ Error searching eBay listings: ${error.message}`);
      throw error;
    }
  }

  // Get specific listing details (simplified version)
  static async getListingDetails(userId: string, itemId: string): Promise<EbayListing | null> {
    try {
      // Check if user has eBay connection
      await this.getEbayConnection(userId);

      // For now, return mock data based on itemId
      // In real implementation, this would make actual eBay API call
      const mockListing: EbayListing = {
        itemId: itemId,
        title: "Detailed View - Premium Quality Item",
        price: {
          currency: "USD",
          value: "149.99"
        },
        condition: "Like New",
        location: "Chicago, IL",
        shippingCost: {
          currency: "USD",
          value: "9.99"
        },
        imageUrl: "https://i.ebayimg.com/images/g/detailed/s-l500.jpg",
        listingUrl: `https://www.ebay.com/itm/${itemId}`,
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        bidCount: 7,
        buyItNowAvailable: true
      };

      return mockListing;

    } catch (error: any) {
      debugLogService.error('EBAY_SERVICE', `❌ Error fetching eBay listing details: ${error.message}`);
      throw error;
    }
  }
}