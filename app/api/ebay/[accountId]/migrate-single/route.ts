import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/services/database';
import { EbayListingService } from '../../../../lib/services/ebay-listing';

// POST /api/ebay/[accountId]/migrate-single - Migrate a single Trading API listing to Inventory API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;

  try {
    console.log(`[MIGRATE SINGLE API] POST request for account: ${accountId}`);

    const body = await request.json();
    const { listingId } = body;

    // Validate input
    if (!listingId) {
      return NextResponse.json(
        {
          success: false,
          message: 'listingId is required',
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

    console.log(`[MIGRATE SINGLE API] Migrating listing ${listingId}`);

    // Call eBay's bulk migration API with single item
    const migrationResult = await ebayService.bulkMigrateListing({
      requests: [
        {
          listingId: listingId
        }
      ]
    });

    console.log(`[MIGRATE SINGLE API] Migration result:`, JSON.stringify(migrationResult, null, 2));

    // Check if migration was successful
    const response = migrationResult.responses?.[0];
    const isSuccess = response?.statusCode === 200 || response?.statusCode === 201;

    return NextResponse.json({
      success: isSuccess,
      message: isSuccess
        ? `Successfully migrated listing ${listingId}`
        : `Failed to migrate listing ${listingId}`,
      data: {
        listingId,
        migrationResponse: response || migrationResult,
        inventorySku: response?.inventorySku,
        inventoryItemGroupKey: response?.inventoryItemGroupKey,
        offerId: response?.offerId,
        statusCode: response?.statusCode,
        warnings: response?.warnings,
        errors: response?.errors
      },
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        environment: process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production'
      }
    });

  } catch (error: any) {
    console.error('[MIGRATE SINGLE API] Error:', error);

    // Parse eBay API error details
    let errorDetails: any = {
      message: 'Failed to migrate listing',
      error: error.message,
      code: error.code || 'UNKNOWN',
      details: 'The migration API may require specific permissions or the listing may already be migrated'
    };

    // Handle specific error cases
    if (error.message.includes('404') || error.message.includes('Resource not found')) {
      errorDetails.details = 'The bulk migration API endpoint is not available. This may require Business Policies to be enabled on your eBay account.';
      errorDetails.suggestions = [
        'Enable Business Policies in eBay Seller Hub',
        'Use the Trading API for legacy listings',
        'Create new listings using the Inventory API'
      ];
    } else if (error.message.includes('401') || error.message.includes('Access token')) {
      errorDetails.details = 'Authentication failed. Your OAuth token may be expired or lack necessary scopes.';
      errorDetails.suggestions = [
        'Reconnect your eBay account',
        'Ensure OAuth token has sell.inventory and sell.account scopes'
      ];
    } else if (error.message.includes('Business policies')) {
      errorDetails.details = 'Business Policies are required for bulk migration but not enabled on your account.';
      errorDetails.suggestions = [
        'Enable Business Policies at: https://www.ebay.com/sh/opt-in',
        'Continue using Trading API for existing listings'
      ];
    } else if (error.message.includes('auction')) {
      errorDetails.details = 'Auction-style listings cannot be migrated to Inventory API.';
      errorDetails.suggestions = [
        'Only Fixed-Price listings can be migrated',
        'Convert auction to Fixed-Price format first'
      ];
    }

    return NextResponse.json(
      errorDetails,
      { status: error.status || 500 }
    );
  }
}