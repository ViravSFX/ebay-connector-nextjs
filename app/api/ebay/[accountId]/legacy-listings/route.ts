import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/services/database';
import { EbayTradingService } from '../../../../lib/services/ebay-trading';

// GET /api/ebay/[accountId]/legacy-listings - Get all listings using Trading API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;

  try {
    console.log(`[LEGACY LISTINGS API] GET request for account: ${accountId}`);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const pageNumber = parseInt(searchParams.get('page') || '1');
    const entriesPerPage = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
    const apiType = searchParams.get('api') || 'selling'; // 'selling' or 'sellerlist'
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

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

    // Initialize Trading API service
    const tradingService = new EbayTradingService(account);

    let result;

    console.log(`[LEGACY LISTINGS API] Using ${apiType} API method`);

    if (apiType === 'sellerlist') {
      // Use GetSellerList - gets listings by date range
      result = await tradingService.getSellerList(startTime, endTime, pageNumber);
    } else {
      // Use GetMyeBaySelling - gets active listings
      result = await tradingService.getMyeBaySelling(pageNumber, entriesPerPage);
    }

    console.log(`[LEGACY LISTINGS API] Found ${result.items?.length || 0} legacy listings`);

    // Format response
    const response = {
      success: true,
      data: {
        items: result.items || [],
        pagination: result.pagination,
        apiUsed: apiType
      },
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production',
        message: 'These are legacy listings from Trading API. Consider migrating to Inventory API.'
      }
    };

    // Compare with Inventory API if requested
    if (searchParams.get('compare') === 'true') {
      try {
        const { EbayListingService } = await import('../../../../lib/services/ebay-listing');
        const inventoryService = new EbayListingService(account);
        const inventoryResult = await inventoryService.getInventoryItems(100, 0);

        response.data['inventoryApiItems'] = inventoryResult.inventoryItems || [];
        response.data['comparison'] = {
          tradingApiCount: result.items?.length || 0,
          inventoryApiCount: inventoryResult.total || 0,
          difference: (result.items?.length || 0) - (inventoryResult.total || 0)
        };
      } catch (error) {
        console.error('[LEGACY LISTINGS API] Comparison error:', error);
      }
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[LEGACY LISTINGS API] GET Error:', error);

    // Handle token expiration
    if (error.message.includes('Auth token') || error.message.includes('Invalid access token')) {
      return NextResponse.json(
        {
          success: false,
          message: 'eBay authentication failed. The Trading API requires special authentication.',
          error: error.message,
          suggestion: 'You may need to use Auth\'n\'Auth token or ensure OAuth token has Trading API access'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch legacy listings',
        error: error.message,
        details: 'The Trading API may require additional setup or permissions'
      },
      { status: 500 }
    );
  }
}

// POST /api/ebay/[accountId]/legacy-listings/migrate - Migrate legacy listings to Inventory API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;

  try {
    console.log(`[LEGACY LISTINGS API] POST migrate request for account: ${accountId}`);

    const body = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        {
          success: false,
          message: 'itemIds array is required',
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

    // Initialize services
    const tradingService = new EbayTradingService(account);
    const { EbayListingService } = await import('../../../../lib/services/ebay-listing');
    const inventoryService = new EbayListingService(account);

    const migrationResults = [];

    for (const itemId of itemIds) {
      try {
        console.log(`[LEGACY LISTINGS API] Migrating item: ${itemId}`);

        // Get item from Trading API
        const itemData = await tradingService.getItem(itemId);

        if (!itemData.items || itemData.items.length === 0) {
          migrationResults.push({
            itemId,
            success: false,
            error: 'Item not found in Trading API'
          });
          continue;
        }

        const legacyItem = itemData.items[0];

        // Convert to Inventory API format
        const inventoryItem = {
          sku: legacyItem.sku || `LEGACY-${itemId}`,
          product: {
            title: legacyItem.title,
            imageUrls: legacyItem.pictureUrls || [],
            aspects: {} // Would need proper mapping
          },
          condition: 'NEW', // Would need condition mapping
          availability: {
            shipToLocationAvailability: {
              quantity: parseInt(legacyItem.quantityAvailable || '0')
            }
          }
        };

        // Create in Inventory API
        await inventoryService.createOrUpdateInventoryItem(inventoryItem);

        migrationResults.push({
          itemId,
          sku: inventoryItem.sku,
          success: true,
          message: 'Successfully migrated to Inventory API'
        });

      } catch (error: any) {
        console.error(`[LEGACY LISTINGS API] Migration error for ${itemId}:`, error);
        migrationResults.push({
          itemId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = migrationResults.filter(r => r.success).length;
    const failCount = migrationResults.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Migration completed. Success: ${successCount}, Failed: ${failCount}`,
      data: {
        results: migrationResults,
        summary: {
          total: itemIds.length,
          succeeded: successCount,
          failed: failCount
        }
      },
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId
      }
    });

  } catch (error: any) {
    console.error('[LEGACY LISTINGS API] POST Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to migrate listings',
        error: error.message
      },
      { status: 500 }
    );
  }
}