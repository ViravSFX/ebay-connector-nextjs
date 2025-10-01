import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/services/database';
import { EbayListingService, InventoryLocation, InventoryItemRequest, OfferRequest, validateInventoryItem, validateOfferRequest } from '../../../../../lib/services/ebay-listing';

interface CreateListingRequest {
  // Optional location (if needed)
  location?: InventoryLocation;

  // Required inventory item
  inventoryItem: InventoryItemRequest;

  // Required offer
  offer: OfferRequest;

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
    if (!body.inventoryItem) {
      return NextResponse.json(
        {
          success: false,
          message: 'inventoryItem is required',
        },
        { status: 400 }
      );
    }

    if (!body.offer) {
      return NextResponse.json(
        {
          success: false,
          message: 'offer is required',
        },
        { status: 400 }
      );
    }

    // Validate inventory item
    const inventoryValidationErrors = validateInventoryItem(body.inventoryItem);
    if (inventoryValidationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Inventory item validation failed',
          errors: inventoryValidationErrors,
        },
        { status: 400 }
      );
    }

    // Validate offer
    const offerValidationErrors = validateOfferRequest(body.offer);
    if (offerValidationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Offer validation failed',
          errors: offerValidationErrors,
        },
        { status: 400 }
      );
    }

    // Ensure SKU consistency
    if (body.inventoryItem.sku !== body.offer.sku) {
      return NextResponse.json(
        {
          success: false,
          message: 'SKU must match between inventory item and offer',
        },
        { status: 400 }
      );
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

    // Execute complete listing creation workflow
    console.log(`[CREATE LISTING API] Starting complete listing creation for SKU: ${body.inventoryItem.sku}`);

    const result = await ebayService.createCompleteListing({
      location: body.location,
      inventoryItem: body.inventoryItem,
      offer: body.offer,
      publish: body.publish || false,
    });

    console.log(`[CREATE LISTING API] Successfully created listing for SKU: ${body.inventoryItem.sku}`);

    // Prepare response based on what was created
    const response: any = {
      success: true,
      data: {
        sku: body.inventoryItem.sku,
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