import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/services/database';
import { EbayListingService } from '../../../../lib/services/ebay-listing';

// POST /api/ebay/[accountId]/migrate-listings - Bulk migrate Trading API listings to Inventory API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;

  try {
    console.log(`[MIGRATE LISTINGS API] POST request for account: ${accountId}`);

    const body = await request.json();
    const {
      listingIds,
      testMode = false, // If true, only processes first 5 items
      autoCreateSKU = true // If true, generates SKUs for listings without them
    } = body;

    // Validate input
    if (!listingIds || !Array.isArray(listingIds)) {
      return NextResponse.json(
        {
          success: false,
          message: 'listingIds array is required',
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

    // Limit listings for test mode
    const itemsToMigrate = testMode ? listingIds.slice(0, 5) : listingIds;

    console.log(`[MIGRATE LISTINGS API] Migrating ${itemsToMigrate.length} listings`);

    // Call eBay's bulk migration API
    const migrationResult = await ebayService.bulkMigrateListing({
      requests: itemsToMigrate.map((listing: any) => {
        // Extract listing ID and SKU from the legacy listing data
        const listingId = typeof listing === 'string' ? listing : listing.itemId;
        let sku = typeof listing === 'object' ? listing.sku : null;

        // Auto-generate SKU if not present
        if (!sku && autoCreateSKU) {
          sku = `MIGRATED-${listingId}`;
        }

        return {
          listingId,
          ...(sku && { inventorySku: sku })
        };
      })
    });

    console.log(`[MIGRATE LISTINGS API] Migration completed`);

    // Process results
    const successCount = migrationResult.responses?.filter((r: any) => r.statusCode === 200).length || 0;
    const failureCount = migrationResult.responses?.filter((r: any) => r.statusCode !== 200).length || 0;

    return NextResponse.json({
      success: true,
      message: `Migration ${testMode ? 'test' : 'process'} completed`,
      data: {
        totalRequested: itemsToMigrate.length,
        successCount,
        failureCount,
        results: migrationResult.responses || [],
        testMode
      },
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production'
      }
    });

  } catch (error: any) {
    console.error('[MIGRATE LISTINGS API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to migrate listings',
        error: error.message,
        details: 'Check if your OAuth token has the necessary scopes for bulk migration'
      },
      { status: 500 }
    );
  }
}

// GET /api/ebay/[accountId]/migrate-listings - Get migration status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;

  try {
    console.log(`[MIGRATE LISTINGS API] GET migration suggestions for account: ${accountId}`);

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

    // First, get legacy listings from Trading API
    const { EbayTradingService } = await import('../../../../lib/services/ebay-trading');
    const tradingService = new EbayTradingService(account);

    console.log('[MIGRATE LISTINGS API] Fetching legacy listings...');
    const legacyListings = await tradingService.getMyeBaySelling(1, 200);

    // Then get current inventory items
    const ebayService = new EbayListingService(account);
    console.log('[MIGRATE LISTINGS API] Fetching inventory items...');
    const inventoryItems = await ebayService.getInventoryItems(200, 0);

    // Find listings that need migration (have itemId but no SKU in inventory)
    const inventorySkus = new Set(inventoryItems.inventoryItems?.map((item: any) => item.sku) || []);

    const needsMigration = legacyListings.items?.filter((item: any) => {
      // Check if this item's SKU exists in inventory
      if (item.sku && inventorySkus.has(item.sku)) {
        return false; // Already migrated
      }
      // Check if a migrated SKU exists
      const migratedSku = `MIGRATED-${item.itemId}`;
      if (inventorySkus.has(migratedSku)) {
        return false; // Already migrated
      }
      return true;
    }) || [];

    const alreadyMigrated = legacyListings.items?.filter((item: any) => {
      if (item.sku && inventorySkus.has(item.sku)) {
        return true;
      }
      const migratedSku = `MIGRATED-${item.itemId}`;
      return inventorySkus.has(migratedSku);
    }) || [];

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalLegacyListings: legacyListings.items?.length || 0,
          totalInventoryItems: inventoryItems.total || 0,
          needsMigration: needsMigration.length,
          alreadyMigrated: alreadyMigrated.length
        },
        needsMigration: needsMigration.slice(0, 20).map((item: any) => ({
          itemId: item.itemId,
          title: item.title,
          sku: item.sku || `Will be: MIGRATED-${item.itemId}`,
          currentPrice: item.currentPrice,
          quantity: item.quantityAvailable
        })),
        alreadyMigrated: alreadyMigrated.slice(0, 10).map((item: any) => ({
          itemId: item.itemId,
          title: item.title,
          sku: item.sku || `MIGRATED-${item.itemId}`,
          status: 'migrated'
        }))
      },
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production',
        message: 'Use POST with listingIds array to migrate specific listings'
      }
    });

  } catch (error: any) {
    console.error('[MIGRATE LISTINGS API] GET Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get migration status',
        error: error.message
      },
      { status: 500 }
    );
  }
}