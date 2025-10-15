// Using any type for now - you can create proper interfaces later
type EbayAccount = any;

// eBay Inventory API Base URLs
const EBAY_INVENTORY_API_URLS = {
  sandbox: 'https://api.sandbox.ebay.com/sell/inventory/v1',
  production: 'https://api.ebay.com/sell/inventory/v1'
};

const EBAY_ACCOUNT_API_URLS = {
  sandbox: 'https://api.sandbox.ebay.com/sell/account/v1',
  production: 'https://api.ebay.com/sell/account/v1'
};

// Type definitions for eBay listing creation

export interface InventoryLocation {
  merchantLocationKey: string;
  name: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateOrProvince: string;
    postalCode: string;
    country: string;  // Changed from countryCode to country
  };
  locationTypes: ('STORE' | 'WAREHOUSE' | 'FULFILLMENT_CENTER')[];  // Added FULFILLMENT_CENTER
  merchantLocationStatus?: 'ENABLED' | 'DISABLED';  // Made optional
}

export interface InventoryItemRequest {
  sku: string;
  product: {
    title: string;
    description?: string;
    imageUrls?: string[];
    brand?: string;
    mpn?: string;
    aspects?: Record<string, string[]>;
    ean?: string[];
    upc?: string[];
    isbn?: string[];
    epid?: string;
  };
  condition: 'NEW' | 'LIKE_NEW' | 'USED_EXCELLENT' | 'USED_GOOD' | 'USED_ACCEPTABLE' | 'FOR_PARTS_OR_NOT_WORKING';
  conditionDescription?: string;
  availability: {
    shipToLocationAvailability: {
      quantity: number;
      allocationByFormat?: {
        auction?: number;
        fixedPrice?: number;
      };
    };
  };
  packageWeightAndSize?: {
    dimensions: {
      height: number;
      length: number;
      width: number;
      unit: 'INCH' | 'CENTIMETER';
    };
    packageType?: string;
    weight: {
      value: number;
      unit: 'POUND' | 'KILOGRAM' | 'OUNCE' | 'GRAM';
    };
  };
}

export interface OfferRequest {
  sku: string;
  marketplaceId: 'EBAY_US' | 'EBAY_GB' | 'EBAY_DE' | 'EBAY_AU' | 'EBAY_CA' | 'EBAY_FR' | 'EBAY_IT' | 'EBAY_ES';
  format: 'AUCTION' | 'FIXED_PRICE';
  pricingSummary: {
    price: {
      value: string;
      currency: 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD';
    };
    pricingVisibility?: 'DURING_CHECKOUT' | 'NONE' | 'PRE_CHECKOUT';
  };
  listingDuration?: 'DAYS_1' | 'DAYS_3' | 'DAYS_5' | 'DAYS_7' | 'DAYS_10' | 'DAYS_30' | 'GTC';
  categoryId: string;
  merchantLocationKey?: string;
  availableQuantity?: number;
  tax?: {
    applyTax: boolean;
    thirdPartyTaxCategory?: string;
    vatPercentage?: number;
  };
  listingPolicies?: {
    paymentPolicyId?: string;
    returnPolicyId?: string;
    fulfillmentPolicyId?: string;
    shippingCostOverrides?: Array<{
      priority: number;
      shippingCost: {
        value: string;
        currency: string;
      };
      shippingServiceType: 'DOMESTIC' | 'INTERNATIONAL';
      surcharge: {
        value: string;
        currency: string;
      };
    }>;
  };
  storeCategoryNames?: string[];
  lotSize?: number;
  quantityLimitPerBuyer?: number;
}

export interface BusinessPolicy {
  id: string;
  name: string;
  description?: string;
  policyType: 'PAYMENT' | 'RETURN_POLICY' | 'FULFILLMENT';
  marketplaceId: string;
}

export class EbayListingService {
  private baseInventoryUrl: string;
  private baseAccountUrl: string;
  private accessToken: string;
  private refreshToken: string | null;
  private accountId: string;
  private tokenExpiresAt: Date;

  constructor(account: EbayAccount) {
    const environment = process.env.EBAY_SANDBOX === 'false' ? 'production' : 'sandbox';
    this.baseInventoryUrl = EBAY_INVENTORY_API_URLS[environment];
    this.baseAccountUrl = EBAY_ACCOUNT_API_URLS[environment];
    this.accountId = account.id;
    this.refreshToken = account.refreshToken;
    this.tokenExpiresAt = new Date(account.expiresAt);

    // Check token expiration
    const now = new Date();
    const isExpired = this.tokenExpiresAt < now;

    console.log('=== TOKEN VALIDATION DEBUG ===');
    console.log('Account ID:', account.id);
    console.log('Environment detected:', environment);
    console.log('EBAY_SANDBOX env var:', process.env.EBAY_SANDBOX);
    console.log('Using API URLs:');
    console.log('  Inventory:', this.baseInventoryUrl);
    console.log('  Account:', this.baseAccountUrl);
    console.log('Token expires at:', this.tokenExpiresAt.toISOString());
    console.log('Current time:', now.toISOString());
    console.log('Token is expired:', isExpired);
    console.log('Has refresh token:', !!this.refreshToken);
    console.log('Token length:', account.accessToken?.length);
    console.log('Token preview:', account.accessToken?.substring(0, 20) + '...');
    console.log('Token starts with "v^1.1":', account.accessToken?.startsWith('v^1.1'));

    // Decrypt access token
    this.accessToken = this.decryptToken(account.accessToken as string);
  }

  private decryptToken(encryptedToken: string): string {
    // TODO: Implement proper token decryption
    // For now, return as-is (assuming it's already decrypted)
    return encryptedToken;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Please reconnect the account.');
    }

    console.log('=== REFRESHING ACCESS TOKEN ===');
    console.log('Account ID:', this.accountId);
    console.log('Has refresh token:', !!this.refreshToken);

    const tokenUrl = process.env.EBAY_SANDBOX === 'true'
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    const credentials = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');

    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token refresh failed:', errorText);
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();

      console.log('✅ Token refreshed successfully');
      console.log('New token expires in (seconds):', tokenData.expires_in);

      // Update the in-memory token
      this.accessToken = tokenData.access_token;
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Update the database with new token
      if (typeof window === 'undefined') {
        // Server-side: Direct database update
        const prisma = await import('@/app/lib/services/database').then(m => m.default);
        await prisma.ebayUserToken.update({
          where: { id: this.accountId },
          data: {
            accessToken: tokenData.access_token,
            expiresAt: this.tokenExpiresAt
          } as any
        });
        console.log('✅ Database updated with new token');
      } else {
        // Client-side: Call an API endpoint to update the token
        console.log('⚠️ Client-side token refresh - database update skipped');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }

  private async ensureValidToken(): Promise<void> {
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    const tokenWillExpireSoon = this.tokenExpiresAt.getTime() - now.getTime() < bufferTime;

    if (tokenWillExpireSoon) {
      console.log('Token expired or expiring soon, refreshing...');
      await this.refreshAccessToken();
    }
  }

  private async makeEbayRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<any> {
    // Ensure token is valid before making request
    await this.ensureValidToken();

    const url = `${this.baseInventoryUrl}${endpoint}`;

    // Debug the exact request being made
    console.log('=== EBAY API REQUEST DEBUG ===');
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Access Token Length:', this.accessToken?.length);
    console.log('Access Token Preview:', this.accessToken?.substring(0, 30) + '...');
    console.log('Authorization Header:', `Bearer ${this.accessToken?.substring(0, 30)}...`);
    console.log('Request body:', body ? JSON.stringify(body, null, 2) : 'No body');

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Language': 'en-US',
      'Accept-Language': 'en-US'
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('=== EBAY API ERROR RESPONSE ===');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
        console.error('Response Headers:', Object.fromEntries(response.headers.entries()));
        console.error('Error Data:', errorData);
        throw new Error(`eBay API Error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error('eBay API request failed:', error);
      throw error;
    }
  }

  private async makeAccountRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'): Promise<any> {
    // Ensure token is valid before making request
    await this.ensureValidToken();

    const url = `${this.baseAccountUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Language': 'en-US'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`eBay Account API Error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('eBay Account API request failed:', error);
      throw error;
    }
  }

  // === INVENTORY LOCATIONS ===

  async getInventoryLocations(): Promise<any> {
    return this.makeEbayRequest('/location');
  }

  async getInventoryLocation(merchantLocationKey: string): Promise<any> {
    return this.makeEbayRequest(`/location/${merchantLocationKey}`);
  }

  async createInventoryLocation(location: InventoryLocation): Promise<any> {
    const { merchantLocationKey, address, name, locationTypes, merchantLocationStatus } = location;

    // eBay API requires specific structure with 'location' for address and name at root level
    const requestBody: any = {
      name: name,
      location: {
        address: address
      },
      locationTypes: locationTypes
    };

    // Only add merchantLocationStatus if provided
    if (merchantLocationStatus) {
      requestBody.merchantLocationStatus = merchantLocationStatus;
    }

    // Use POST method as per eBay API documentation (not PUT)
    return this.makeEbayRequest(`/location/${merchantLocationKey}`, 'POST', requestBody);
  }

  async updateInventoryLocation(merchantLocationKey: string, location: Partial<InventoryLocation>): Promise<any> {
    return this.makeEbayRequest(`/location/${merchantLocationKey}`, 'PUT', location);
  }

  async deleteInventoryLocation(merchantLocationKey: string): Promise<any> {
    return this.makeEbayRequest(`/location/${merchantLocationKey}`, 'DELETE');
  }

  // === INVENTORY ITEMS ===

  async getInventoryItems(limit: number = 25, offset: number = 0): Promise<any> {
    return this.makeEbayRequest(`/inventory_item?limit=${limit}&offset=${offset}`);
  }

  async getInventoryItem(sku: string): Promise<any> {
    return this.makeEbayRequest(`/inventory_item/${sku}`);
  }

  async createOrUpdateInventoryItem(inventoryItem: InventoryItemRequest): Promise<any> {
    const { sku, ...itemData } = inventoryItem;
    return this.makeEbayRequest(`/inventory_item/${sku}`, 'PUT', itemData);
  }

  async deleteInventoryItem(sku: string): Promise<any> {
    return this.makeEbayRequest(`/inventory_item/${sku}`, 'DELETE');
  }

  // Update inventory availability at a specific location
  async updateInventoryItemLocationAvailability(sku: string, merchantLocationKey: string, quantity: number): Promise<any> {
    return this.makeEbayRequest(`/inventory_item/${sku}/update_location_availability`, 'POST', {
      availabilityDistributions: [{
        merchantLocationKey: merchantLocationKey,
        quantity: quantity
      }]
    });
  }

  // === OFFERS ===

  async getOffers(limit: number = 25, offset: number = 0, sku?: string): Promise<any> {
    let query = `?limit=${limit}&offset=${offset}`;
    if (sku) {
      query += `&sku=${sku}`;
    }
    return this.makeEbayRequest(`/offer${query}`);
  }

  async getOffer(offerId: string): Promise<any> {
    return this.makeEbayRequest(`/offer/${offerId}`);
  }

  async createOffer(offer: OfferRequest): Promise<any> {
    return this.makeEbayRequest('/offer', 'POST', offer);
  }

  async updateOffer(offerId: string, offer: Partial<OfferRequest>): Promise<any> {
    return this.makeEbayRequest(`/offer/${offerId}`, 'PUT', offer);
  }

  async deleteOffer(offerId: string): Promise<any> {
    return this.makeEbayRequest(`/offer/${offerId}`, 'DELETE');
  }

  async publishOffer(offerId: string): Promise<any> {
    return this.makeEbayRequest(`/offer/${offerId}/publish`, 'POST');
  }

  async withdrawOffer(offerId: string): Promise<any> {
    return this.makeEbayRequest(`/offer/${offerId}/withdraw`, 'POST');
  }

  // === BUSINESS POLICIES ===

  async getPaymentPolicies(): Promise<BusinessPolicy[]> {
    const result = await this.makeAccountRequest('/payment_policy?marketplace_id=EBAY_US');
    return result.paymentPolicies || [];
  }

  async getFulfillmentPolicies(): Promise<BusinessPolicy[]> {
    const result = await this.makeAccountRequest('/fulfillment_policy?marketplace_id=EBAY_US');
    return result.fulfillmentPolicies || [];
  }

  async getReturnPolicies(): Promise<BusinessPolicy[]> {
    const result = await this.makeAccountRequest('/return_policy?marketplace_id=EBAY_US');
    return result.returnPolicies || [];
  }

  // === COMPLETE LISTING CREATION WORKFLOW ===

  async createCompleteListing(params: {
    location?: InventoryLocation;
    inventoryItem: InventoryItemRequest;
    offer: OfferRequest;
    publish?: boolean;
  }): Promise<{
    location?: any;
    inventoryItem: any;
    offer: any;
    listing?: any;
  }> {
    const results: any = {};

    try {
      // First, test if we can access the inventory API at all
      console.log('Testing inventory API access...');
      try {
        const testResponse = await this.getInventoryItems(1, 0);
        console.log('✅ Inventory API access test successful');
      } catch (testError) {
        console.error('❌ Inventory API access test failed:', testError);
        throw new Error('Cannot access eBay Inventory API. Check token scopes and permissions.');
      }

      // Step 1: ENSURE location exists (CRITICAL - required to avoid Item.Country error)
      console.log('=== LOCATION SETUP (CRITICAL STEP) ===');

      // First, check if any locations already exist
      let hasLocation = false;
      try {
        const existingLocations = await this.getInventoryLocations();
        if (existingLocations?.locations && existingLocations.locations.length > 0) {
          console.log(`✅ Found ${existingLocations.locations.length} existing location(s)`);
          results.location = existingLocations.locations[0];
          hasLocation = true;
        } else {
          console.log('⚠️ No existing locations found');
        }
      } catch (locErr: any) {
        console.log('⚠️ Could not fetch locations:', locErr.message);
      }

      // If no location exists, we MUST create one
      if (!hasLocation) {
        const locationToCreate: InventoryLocation = params.location || {
          merchantLocationKey: 'default-location-001',
          name: 'Default Location',
          address: {
            addressLine1: '123 Main Street',
            city: 'New York',
            stateOrProvince: 'NY',
            postalCode: '10001',
            country: 'US'
          },
          locationTypes: ['WAREHOUSE']
        };

        console.log('Creating location with key:', locationToCreate.merchantLocationKey);

        try {
          results.location = await this.createInventoryLocation(locationToCreate);
          console.log('✅ Location created successfully');
          hasLocation = true;
        } catch (locationError: any) {
          // Check if location already exists (error 25801)
          if (locationError.message?.includes('already exists') || locationError.message?.includes('25801')) {
            console.log('Location already exists, fetching it...');
            try {
              results.location = await this.getInventoryLocation(locationToCreate.merchantLocationKey);
              console.log('✅ Fetched existing location successfully');
              hasLocation = true;
            } catch (fetchError) {
              console.error('❌ Could not fetch existing location:', fetchError);
            }
          } else {
            console.error('❌ Failed to create location:', locationError.message);
          }
        }
      }

      // Final check - if still no location, this is a critical error
      if (!hasLocation) {
        throw new Error('CRITICAL: Cannot proceed without a location. Item.Country error will occur. Please create at least one inventory location manually in eBay Seller Hub.');
      }

      console.log('=== LOCATION SETUP COMPLETE ===');

      // Step 2: Create/Update inventory item with location availability
      console.log('Creating inventory item with location availability...');

      // Get the location key to use
      const locationKey = results.location?.merchantLocationKey || 'default-location-001';

      // Create inventory item with simple availability structure
      const quantity = params.inventoryItem.availability?.shipToLocationAvailability?.quantity || 10;

      const inventoryItemWithLocation = {
        ...params.inventoryItem,
        availability: {
          shipToLocationAvailability: {
            quantity: quantity
          }
        }
      };

      console.log('Creating inventory item with location:', locationKey);
      console.log('=== INVENTORY ITEM DATA BEING SENT TO EBAY ===');
      console.log(JSON.stringify(inventoryItemWithLocation, null, 2));
      console.log('=== END INVENTORY ITEM DATA ===');
      results.inventoryItem = await this.createOrUpdateInventoryItem(inventoryItemWithLocation);

      // Step 2.5: Handle business policies (optional for basic accounts)
      console.log('Checking business policy eligibility...');
      let updatedOffer = { ...params.offer };

      try {
        const [paymentPolicies, fulfillmentPolicies, returnPolicies] = await Promise.all([
          this.getPaymentPolicies(),
          this.getFulfillmentPolicies(),
          this.getReturnPolicies()
        ]);

        console.log('✅ Business policies available:');
        console.log('Payment Policies:', paymentPolicies.length);
        console.log('Fulfillment Policies:', fulfillmentPolicies.length);
        console.log('Return Policies:', returnPolicies.length);

        // Use business policies if available
        updatedOffer.listingPolicies = {
          paymentPolicyId: paymentPolicies[0]?.id,
          fulfillmentPolicyId: fulfillmentPolicies[0]?.id,
          returnPolicyId: returnPolicies[0]?.id
        };

        console.log('Using Business Policy IDs:', updatedOffer.listingPolicies);
      } catch (policyError) {
        console.log('⚠️ Business policies not available (basic account)');
        console.log('Creating offer without business policies...');

        // Remove listingPolicies entirely for basic accounts
        const { listingPolicies, ...offerWithoutPolicies } = updatedOffer;
        updatedOffer = offerWithoutPolicies;
      }

      // Ensure offer has location reference and quantity (required for publishing)
      if (!updatedOffer.merchantLocationKey) {
        updatedOffer.merchantLocationKey = results.location?.merchantLocationKey || 'default-location-001';
        console.log('Added merchant location key to offer:', updatedOffer.merchantLocationKey);
      }

      // Add availableQuantity to offer (crucial for Item.Country error)
      if (!updatedOffer.availableQuantity) {
        updatedOffer.availableQuantity = quantity;
        console.log('Added availableQuantity to offer:', updatedOffer.availableQuantity);
      }

      // Step 3: Create or get existing offer
      console.log('Creating offer...');
      console.log('=== OFFER DATA BEING SENT TO EBAY ===');
      console.log(JSON.stringify(updatedOffer, null, 2));
      console.log('=== END OFFER DATA ===');
      try {
        results.offer = await this.createOffer(updatedOffer);
        console.log('✅ New offer created with ID:', results.offer.offerId);
      } catch (offerError: any) {
        // Check if offer already exists
        if (offerError.message?.includes('Offer entity already exists')) {
          console.log('⚠️ Offer already exists for this SKU, fetching existing offers...');

          // Get existing offers for this SKU
          const existingOffers = await this.getOffers(25, 0, updatedOffer.sku);

          if (existingOffers.offers && existingOffers.offers.length > 0) {
            const existingOffer = existingOffers.offers[0];
            console.log('Found existing offer with ID:', existingOffer.offerId);

            // Update the existing offer with location and quantity information
            console.log('Updating existing offer with location and quantity...');
            const updateData = {
              merchantLocationKey: updatedOffer.merchantLocationKey,
              availableQuantity: updatedOffer.availableQuantity
            };

            try {
              await this.updateOffer(existingOffer.offerId, updateData);
              console.log('✅ Updated existing offer with location and quantity');
            } catch (updateError) {
              console.warn('Could not update offer:', updateError);
            }

            results.offer = existingOffer;
            console.log('✅ Using existing offer with ID:', results.offer.offerId);
          } else {
            throw new Error('Could not find existing offer despite error message');
          }
        } else {
          throw offerError;
        }
      }

      // Step 4: Publish offer if requested
      if (params.publish && results.offer.offerId) {
        console.log('Publishing offer...');
        console.log('Note: Inventory item already has location availability set');
        results.listing = await this.publishOffer(results.offer.offerId);
      }

      return results;
    } catch (error) {
      console.error('Complete listing creation failed:', error);
      throw error;
    }
  }

  // === BULK MIGRATION ===

  // Bulk migrate Trading API listings to Inventory API
  async bulkMigrateListing(migrationRequest: any): Promise<any> {
    console.log('[EBAY API] Bulk migrating listings to Inventory API');

    // eBay's bulk migration endpoint - correct path
    return this.makeEbayRequest('/bulk_migrate_listing', 'POST', migrationRequest);
  }
}

// Helper function to get marketplace currency
export function getMarketplaceCurrency(marketplaceId: string): string {
  const currencyMap: Record<string, string> = {
    'EBAY_US': 'USD',
    'EBAY_GB': 'GBP',
    'EBAY_DE': 'EUR',
    'EBAY_FR': 'EUR',
    'EBAY_IT': 'EUR',
    'EBAY_ES': 'EUR',
    'EBAY_AU': 'AUD',
    'EBAY_CA': 'CAD'
  };
  return currencyMap[marketplaceId] || 'USD';
}

// Helper function to validate required offer fields
export function validateOfferRequest(offer: OfferRequest): string[] {
  const errors: string[] = [];

  if (!offer.sku) errors.push('SKU is required');
  if (!offer.marketplaceId) errors.push('Marketplace ID is required');
  if (!offer.format) errors.push('Format (AUCTION/FIXED_PRICE) is required');
  if (!offer.pricingSummary?.price?.value) errors.push('Price is required');
  if (!offer.pricingSummary?.price?.currency) errors.push('Currency is required');
  if (!offer.categoryId) errors.push('Category ID is required');

  return errors;
}

// Helper function to validate inventory item
export function validateInventoryItem(item: InventoryItemRequest): string[] {
  const errors: string[] = [];

  if (!item.sku) errors.push('SKU is required');
  if (!item.product?.title) errors.push('Product title is required');
  if (!item.condition) errors.push('Condition is required');
  if (!item.availability?.shipToLocationAvailability?.quantity) {
    errors.push('Quantity is required');
  }

  return errors;
}