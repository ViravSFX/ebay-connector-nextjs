import { EbayUserToken } from '@prisma/client';

interface TradingApiConfig {
  apiUrl: string;
  siteId: string;
  compatibilityLevel: string;
}

export class EbayTradingService {
  private account: EbayUserToken;
  private isSandbox: boolean;
  private config: TradingApiConfig;

  constructor(account: EbayUserToken) {
    this.account = account;
    this.isSandbox = process.env.EBAY_SANDBOX === 'true';

    // Configure Trading API endpoints
    this.config = {
      apiUrl: this.isSandbox
        ? 'https://api.sandbox.ebay.com/ws/api.dll'
        : 'https://api.ebay.com/ws/api.dll',
      siteId: '0', // 0 for US
      compatibilityLevel: '1157' // Latest compatibility level
    };
  }

  // Build Trading API headers
  private getHeaders(callName: string): HeadersInit {
    const appId = this.isSandbox
      ? process.env.EBAY_APP_ID_SANDBOX
      : process.env.EBAY_APP_ID_PRODUCTION;

    // Trading API can use OAuth tokens with IAF-TOKEN header
    return {
      'X-EBAY-API-COMPATIBILITY-LEVEL': this.config.compatibilityLevel,
      'X-EBAY-API-CALL-NAME': callName,
      'X-EBAY-API-SITEID': this.config.siteId,
      'X-EBAY-API-APP-NAME': appId || '',
      'X-EBAY-API-IAF-TOKEN': this.account.accessToken, // OAuth access token
      'Content-Type': 'text/xml; charset=utf-8'
    };
  }

  // Get seller's active listings using GetMyeBaySelling
  async getMyeBaySelling(pageNumber: number = 1, entriesPerPage: number = 100): Promise<any> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>${entriesPerPage}</EntriesPerPage>
      <PageNumber>${pageNumber}</PageNumber>
    </Pagination>
  </ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>
  <OutputSelector>ActiveList.ItemArray.Item</OutputSelector>
  <OutputSelector>ActiveList.PaginationResult</OutputSelector>
</GetMyeBaySellingRequest>`;

    try {
      console.log('[TRADING API] Calling GetMyeBaySelling');

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: this.getHeaders('GetMyeBaySelling'),
        body: xml
      });

      const xmlResponse = await response.text();
      console.log('[TRADING API] Response status:', response.status);

      // Parse XML response
      return this.parseXmlResponse(xmlResponse);
    } catch (error) {
      console.error('[TRADING API] GetMyeBaySelling error:', error);
      throw error;
    }
  }

  // Get seller's listings using GetSellerList (more comprehensive)
  async getSellerList(startTime?: string, endTime?: string, pageNumber: number = 1): Promise<any> {
    // Use date range - default to last 120 days to now
    const endDate = endTime || new Date().toISOString();
    const startDate = startTime || new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetSellerListRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <StartTimeFrom>${startDate}</StartTimeFrom>
  <StartTimeTo>${endDate}</StartTimeTo>
  <IncludeWatchCount>true</IncludeWatchCount>
  <Pagination>
    <EntriesPerPage>100</EntriesPerPage>
    <PageNumber>${pageNumber}</PageNumber>
  </Pagination>
  <DetailLevel>ReturnAll</DetailLevel>
  <OutputSelector>ItemArray.Item</OutputSelector>
  <OutputSelector>PaginationResult</OutputSelector>
  <OutputSelector>HasMoreItems</OutputSelector>
</GetSellerListRequest>`;

    try {
      console.log('[TRADING API] Calling GetSellerList');
      console.log('[TRADING API] Date range:', startDate, 'to', endDate);

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: this.getHeaders('GetSellerList'),
        body: xml
      });

      const xmlResponse = await response.text();
      console.log('[TRADING API] Response status:', response.status);

      // Parse XML response
      return this.parseXmlResponse(xmlResponse);
    } catch (error) {
      console.error('[TRADING API] GetSellerList error:', error);
      throw error;
    }
  }

  // Get single item details
  async getItem(itemId: string): Promise<any> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ItemID>${itemId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
</GetItemRequest>`;

    try {
      console.log('[TRADING API] Calling GetItem for:', itemId);

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: this.getHeaders('GetItem'),
        body: xml
      });

      const xmlResponse = await response.text();
      console.log('[TRADING API] Response status:', response.status);

      // Parse XML response
      return this.parseXmlResponse(xmlResponse);
    } catch (error) {
      console.error('[TRADING API] GetItem error:', error);
      throw error;
    }
  }

  // Parse XML response to JSON
  private parseXmlResponse(xml: string): any {
    try {
      // Basic XML to JSON parsing
      // In production, you'd want to use a proper XML parser like xml2js

      // Extract error if present
      const errorMatch = xml.match(/<Errors>[\s\S]*?<\/Errors>/);
      if (errorMatch) {
        const errorCode = this.extractXmlValue(errorMatch[0], 'ErrorCode');
        const shortMessage = this.extractXmlValue(errorMatch[0], 'ShortMessage');
        const longMessage = this.extractXmlValue(errorMatch[0], 'LongMessage');

        if (errorCode && errorCode !== '0') {
          throw new Error(`eBay Trading API Error ${errorCode}: ${shortMessage || longMessage}`);
        }
      }

      // Extract items for GetSellerList/GetMyeBaySelling
      const items: any[] = [];
      const itemMatches = xml.match(/<Item>[\s\S]*?<\/Item>/g);

      if (itemMatches) {
        for (const itemXml of itemMatches) {
          const item = {
            itemId: this.extractXmlValue(itemXml, 'ItemID'),
            title: this.extractXmlValue(itemXml, 'Title'),
            sku: this.extractXmlValue(itemXml, 'SKU'),
            currentPrice: this.extractXmlValue(itemXml, 'CurrentPrice'),
            currency: this.extractXmlValue(itemXml, 'Currency'),
            quantity: this.extractXmlValue(itemXml, 'Quantity'),
            quantityAvailable: this.extractXmlValue(itemXml, 'QuantityAvailable'),
            listingType: this.extractXmlValue(itemXml, 'ListingType'),
            status: this.extractXmlValue(itemXml, 'SellingStatus'),
            startTime: this.extractXmlValue(itemXml, 'StartTime'),
            endTime: this.extractXmlValue(itemXml, 'EndTime'),
            viewItemURL: this.extractXmlValue(itemXml, 'ViewItemURL'),
            primaryCategory: {
              categoryId: this.extractXmlValue(itemXml, 'CategoryID'),
              categoryName: this.extractXmlValue(itemXml, 'CategoryName')
            },
            pictureUrls: this.extractMultipleXmlValues(itemXml, 'PictureURL')
          };

          if (item.itemId) {
            items.push(item);
          }
        }
      }

      // Extract pagination
      const totalNumberOfEntries = this.extractXmlValue(xml, 'TotalNumberOfEntries');
      const totalNumberOfPages = this.extractXmlValue(xml, 'TotalNumberOfPages');
      const pageNumber = this.extractXmlValue(xml, 'PageNumber');
      const hasMoreItems = this.extractXmlValue(xml, 'HasMoreItems') === 'true';

      return {
        success: true,
        items,
        pagination: {
          totalItems: parseInt(totalNumberOfEntries || '0'),
          totalPages: parseInt(totalNumberOfPages || '0'),
          currentPage: parseInt(pageNumber || '1'),
          hasMore: hasMoreItems
        },
        raw: xml // Include raw XML for debugging
      };
    } catch (error) {
      console.error('[TRADING API] XML parsing error:', error);
      throw error;
    }
  }

  // Extract single value from XML
  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  // Extract multiple values from XML
  private extractMultipleXmlValues(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    const matches = xml.match(regex) || [];
    return matches.map(match => match.replace(/<[^>]+>/g, '').trim());
  }

  // Migrate legacy listing to new Inventory API format
  async migrateLegacyListing(itemId: string): Promise<any> {
    try {
      // First get the item details from Trading API
      const itemDetails = await this.getItem(itemId);

      if (!itemDetails.items || itemDetails.items.length === 0) {
        throw new Error(`Item ${itemId} not found`);
      }

      const legacyItem = itemDetails.items[0];

      // Convert to Inventory API format
      const inventoryItem = {
        sku: legacyItem.sku || `LEGACY-${itemId}`,
        product: {
          title: legacyItem.title,
          imageUrls: legacyItem.pictureUrls || []
        },
        condition: 'NEW', // Would need mapping from legacy condition
        availability: {
          shipToLocationAvailability: {
            quantity: parseInt(legacyItem.quantityAvailable || '0')
          }
        }
      };

      return inventoryItem;
    } catch (error) {
      console.error('[TRADING API] Migration error:', error);
      throw error;
    }
  }
}