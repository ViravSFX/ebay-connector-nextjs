import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/services/database';
import { EbayListingService } from '../../../../../lib/services/ebay-listing';

interface CreateListingRequest {
  // SKU - unique identifier for the item
  sku: string;

  // Location information
  location?: {
    merchantLocationKey: string;
    name?: string;
    address: {
      addressLine1?: string;
      city?: string;
      stateOrProvince?: string;
      postalCode?: string;
      country: string; // Required - 2-letter ISO code
    };
  };

  // Inventory item data
  availability?: {
    shipToLocationAvailability?: {
      quantity: number;
    };
  };
  condition?: string;
  product?: {
    title: string;
    description: string;
    imageUrls: string[];
    brand?: string;
    mpn?: string;
    aspects?: Record<string, string[]>;
  };

  // Offer data
  marketplaceId?: string;
  format?: string;
  categoryId?: string;
  pricingSummary?: {
    price: {
      value: string;
      currency: string;
    };
  };
  availableQuantity?: number;
  listingDuration?: string;
  listingPolicies?: {
    fulfillmentPolicyId?: string;
    paymentPolicyId?: string;
    returnPolicyId?: string;
  };
  // Inline shipping details for basic accounts
  shippingCostOverrides?: Array<{
    priority: number;
    shippingCost?: {
      value: string;
      currency: string;
    };
    shippingServiceType: string;
  }>;

  // Whether to immediately publish (default: false)
  publish?: boolean;
}

// POST /api/ebay/[accountId]/listings/create - Complete listing creation workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;
  try {
    console.log(`[CREATE LISTING API] POST request for account: ${accountId}`);

    const body: CreateListingRequest = await request.json();

    // Validate required fields
    if (!body.sku) {
      return NextResponse.json(
        {
          success: false,
          message: 'SKU is required',
        },
        { status: 400 }
      );
    }

    // Validate required product fields if publishing
    if (body.publish) {
      if (!body.product?.title || !body.product?.description || !body.product?.imageUrls?.length) {
        return NextResponse.json(
          {
            success: false,
            message: 'Product title, description, and at least one image URL are required for publishing',
          },
          { status: 400 }
        );
      }

      if (!body.categoryId || !body.pricingSummary || !body.availableQuantity) {
        return NextResponse.json(
          {
            success: false,
            message: 'Category ID, pricing, and available quantity are required for publishing',
          },
          { status: 400 }
        );
      }
    }

    // Get the eBay account
    const account = await prisma.ebayUserToken.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          message: 'eBay account not found',
        },
        { status: 404 }
      );
    }

    // Initialize eBay service
    const ebayService = new EbayListingService(account);

    // Log the complete request data being sent to eBay
    console.log('=== COMPLETE REQUEST DATA TO EBAY API ===');
    console.log(JSON.stringify(body, null, 2));
    console.log('=== END REQUEST DATA ===');

    // Execute complete listing creation workflow
    console.log(`[CREATE LISTING API] Starting complete listing creation for SKU: ${body.sku}`);

    const results: any = {
      location: null,
      inventoryItem: null,
      offer: null,
      listing: null
    };

    try {
      // Step 1: Create location if provided
      if (body.location) {
        console.log('[CREATE LISTING API] Creating location...');
        try {
          const locationData: any = {
            ...body.location,
            locationTypes: ['WAREHOUSE']
          };
          results.location = await ebayService.createInventoryLocation(locationData);
          console.log('[CREATE LISTING API] Location created successfully');
        } catch (error: any) {
          // Continue if location already exists (204 status)
          if (!error.message.includes('204') && !error.message.includes('already exists')) {
            throw error;
          }
          console.log('[CREATE LISTING API] Location already exists, continuing...');
        }
      }

      // Step 2: Create or update inventory item
      console.log('[CREATE LISTING API] Creating inventory item...');
      const inventoryData: any = {};
      if (body.availability) inventoryData.availability = body.availability;
      if (body.condition) inventoryData.condition = body.condition;
      if (body.product) inventoryData.product = body.product;

      results.inventoryItem = await ebayService.createOrUpdateInventoryItem({
        sku: body.sku,
        ...inventoryData
      });
      console.log('[CREATE LISTING API] Inventory item created successfully');

      // Step 3: Create offer
      console.log('[CREATE LISTING API] Creating offer...');
      const offerData: any = {
        sku: body.sku,
        marketplaceId: body.marketplaceId || 'EBAY_US',
        format: body.format || 'FIXED_PRICE'
      };

      if (body.categoryId) offerData.categoryId = body.categoryId;
      if (body.pricingSummary) offerData.pricingSummary = body.pricingSummary;
      if (body.availableQuantity) offerData.availableQuantity = body.availableQuantity;
      if (body.location?.merchantLocationKey) offerData.merchantLocationKey = body.location.merchantLocationKey;
      if (body.listingDuration) offerData.listingDuration = body.listingDuration;
      if (body.listingPolicies) offerData.listingPolicies = body.listingPolicies;
      if (body.shippingCostOverrides) offerData.shippingCostOverrides = body.shippingCostOverrides;

      results.offer = await ebayService.createOffer(offerData);
      console.log('[CREATE LISTING API] Offer created:', results.offer);

      // Step 4: Publish if requested
      if (body.publish && results.offer.offerId) {
        console.log('[CREATE LISTING API] Publishing offer...');
        try {
          results.listing = await ebayService.publishOffer(results.offer.offerId);
          console.log('[CREATE LISTING API] Offer published successfully');
        } catch (error: any) {
          console.error('[CREATE LISTING API] Publish error:', error.message);
          // Return partial success
          return NextResponse.json({
            success: true,
            data: {
              sku: body.sku,
              steps_completed: ['inventory_item_created', 'offer_created'],
              details: results,
            },
            message: 'Listing created but not published. Check the error for details.',
            publishError: error.message,
            metadata: {
              account_used: account.friendlyName || account.ebayUsername,
              account_id: accountId,
            },
          });
        }
      }
    } catch (error: any) {
      throw error;
    }

    const result = results;

    console.log(`[CREATE LISTING API] Successfully created listing for SKU: ${body.sku}`);

    // Prepare response based on what was created
    const response: any = {
      success: true,
      data: {
        sku: body.sku,
        steps_completed: [],
        details: result,
      },
      message: 'Listing creation workflow completed successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        publish_requested: body.publish || false,
      },
    };

    // Track which steps were completed
    if (result.location) {
      response.data.steps_completed.push('location_created');
    }
    if (result.inventoryItem) {
      response.data.steps_completed.push('inventory_item_created');
    }
    if (result.offer) {
      response.data.steps_completed.push('offer_created');
    }
    if (result.listing) {
      response.data.steps_completed.push('listing_published');
      response.message = 'Listing created and published successfully - now live on eBay!';
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[CREATE LISTING API] POST Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create listing',
        error: error.message,
        details: 'The listing creation workflow encountered an error. Please check your data and try again.',
      },
      { status: 500 }
    );
  }
}