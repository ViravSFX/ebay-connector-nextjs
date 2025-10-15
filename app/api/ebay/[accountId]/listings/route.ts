import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/services/database';
import { EbayListingService } from '../../../../lib/services/ebay-listing';

// GET /api/ebay/[accountId]/listings - Get all inventory items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;

  try {
    console.log(`[LISTINGS API] GET request for account: ${accountId}`);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sku = searchParams.get('sku');

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

    // Fetch inventory items
    console.log(`[LISTINGS API] Fetching inventory items with limit=${limit}, offset=${offset}`);

    let result;
    if (sku) {
      // Get single item by SKU
      console.log(`[LISTINGS API] Fetching single item with SKU: ${sku}`);
      try {
        const item = await ebayService.getInventoryItem(sku);
        result = {
          total: 1,
          limit,
          offset: 0,
          inventoryItems: [item]
        };
      } catch (error: any) {
        if (error.message.includes('404')) {
          result = {
            total: 0,
            limit,
            offset: 0,
            inventoryItems: []
          };
        } else {
          throw error;
        }
      }
    } else {
      // Get all items with pagination
      result = await ebayService.getInventoryItems(limit, offset);
    }

    console.log(`[LISTINGS API] Successfully fetched ${result.inventoryItems?.length || 0} items out of ${result.total || 0} total`);

    return NextResponse.json({
      success: true,
      data: {
        total: result.total || 0,
        limit: result.limit || limit,
        offset: offset,
        inventoryItems: result.inventoryItems || []
      },
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production'
      }
    });

  } catch (error: any) {
    console.error('[LISTINGS API] GET Error:', error);

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
        message: 'Failed to fetch listings',
        error: error.message
      },
      { status: 500 }
    );
  }
}

