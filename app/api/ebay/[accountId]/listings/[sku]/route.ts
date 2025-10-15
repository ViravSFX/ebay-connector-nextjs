import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/services/database';
import { EbayListingService } from '../../../../../lib/services/ebay-listing';

// GET /api/ebay/[accountId]/listings/[sku] - Get single inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; sku: string }> }
): Promise<NextResponse> {
  const { accountId, sku } = await params;

  try {
    console.log(`[LISTINGS API] GET single item request for account: ${accountId}, SKU: ${sku}`);

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

    // Fetch inventory item
    console.log(`[LISTINGS API] Fetching inventory item: ${sku}`);
    const item = await ebayService.getInventoryItem(sku);

    console.log(`[LISTINGS API] Successfully fetched item: ${sku}`);

    return NextResponse.json({
      success: true,
      data: item,
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production'
      }
    });

  } catch (error: any) {
    console.error('[LISTINGS API] GET Single Error:', error);

    if (error.message.includes('404')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Inventory item not found',
          error: `SKU ${sku} not found in inventory`
        },
        { status: 404 }
      );
    }

    // Handle token expiration
    if (error.message.includes('401') || error.message.includes('Access token')) {
      return NextResponse.json(
        {
          success: false,
          message: 'eBay authentication failed. Please reconnect your eBay account.',
          error: 'Access token expired or invalid'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch inventory item',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// PUT /api/ebay/[accountId]/listings/[sku] - Update inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; sku: string }> }
): Promise<NextResponse> {
  const { accountId, sku } = await params;

  try {
    console.log(`[LISTINGS API] PUT request for account: ${accountId}, SKU: ${sku}`);

    const body = await request.json();

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

    // Update inventory item
    console.log(`[LISTINGS API] Updating inventory item: ${sku}`);
    const result = await ebayService.createOrUpdateInventoryItem({ sku, ...body });

    console.log(`[LISTINGS API] Successfully updated item: ${sku}`);

    return NextResponse.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: result,
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production'
      }
    });

  } catch (error: any) {
    console.error('[LISTINGS API] PUT Error:', error);

    // Handle token expiration
    if (error.message.includes('401') || error.message.includes('Access token')) {
      return NextResponse.json(
        {
          success: false,
          message: 'eBay authentication failed. Please reconnect your eBay account.',
          error: 'Access token expired or invalid'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update inventory item',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE /api/ebay/[accountId]/listings/[sku] - Delete inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; sku: string }> }
): Promise<NextResponse> {
  const { accountId, sku } = await params;

  try {
    console.log(`[LISTINGS API] DELETE request for account: ${accountId}, SKU: ${sku}`);

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

    // Delete inventory item
    console.log(`[LISTINGS API] Deleting inventory item: ${sku}`);
    await ebayService.deleteInventoryItem(sku);

    console.log(`[LISTINGS API] Successfully deleted item: ${sku}`);

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        sku_deleted: sku,
        environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production'
      }
    });

  } catch (error: any) {
    console.error('[LISTINGS API] DELETE Error:', error);

    if (error.message.includes('404')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Inventory item not found',
          error: `SKU ${sku} not found in inventory`
        },
        { status: 404 }
      );
    }

    // Handle token expiration
    if (error.message.includes('401') || error.message.includes('Access token')) {
      return NextResponse.json(
        {
          success: false,
          message: 'eBay authentication failed. Please reconnect your eBay account.',
          error: 'Access token expired or invalid'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete inventory item',
        error: error.message
      },
      { status: 500 }
    );
  }
}