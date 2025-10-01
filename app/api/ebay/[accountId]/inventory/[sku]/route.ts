import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/services/database';
import { EbayListingService, InventoryItemRequest, validateInventoryItem } from '../../../../../lib/services/ebay-listing';

// GET /api/ebay/[accountId]/inventory/[sku] - Get specific inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; sku: string }> }
): Promise<NextResponse> {
  const { accountId, sku } = await params;

  try {
    console.log(`[INVENTORY ITEM API] GET request for account: ${accountId}, SKU: ${sku}`);

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

    // Get inventory item from eBay
    const inventoryItem = await ebayService.getInventoryItem(sku);

    console.log(`[INVENTORY ITEM API] Retrieved inventory item: ${sku}`);

    return NextResponse.json({
      success: true,
      data: inventoryItem,
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[INVENTORY ITEM API] GET Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to retrieve inventory item: ${sku}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT /api/ebay/[accountId]/inventory/[sku] - Create or update inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; sku: string }> }
): Promise<NextResponse> {
  const { accountId, sku } = await params;

  try {
    console.log(`[INVENTORY ITEM API] PUT request for account: ${accountId}, SKU: ${sku}`);

    const body = await request.json();

    // Add SKU to the request body
    const inventoryItem: InventoryItemRequest = {
      sku: sku,
      ...body,
    };

    // Validate inventory item
    const validationErrors = validateInventoryItem(inventoryItem);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validationErrors,
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

    // Create or update inventory item on eBay
    const result = await ebayService.createOrUpdateInventoryItem(inventoryItem);

    console.log(`[INVENTORY ITEM API] Created/Updated inventory item: ${sku}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Inventory item created/updated successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[INVENTORY ITEM API] PUT Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to create/update inventory item: ${sku}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/ebay/[accountId]/inventory/[sku] - Delete inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; sku: string }> }
): Promise<NextResponse> {
  const { accountId, sku } = await params;

  try {
    console.log(`[INVENTORY ITEM API] DELETE request for account: ${accountId}, SKU: ${sku}`);

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

    // Delete inventory item from eBay
    const result = await ebayService.deleteInventoryItem(sku);

    console.log(`[INVENTORY ITEM API] Deleted inventory item: ${sku}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Inventory item deleted successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[INVENTORY ITEM API] DELETE Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to delete inventory item: ${sku}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}