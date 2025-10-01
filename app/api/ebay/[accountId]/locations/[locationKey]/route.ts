import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/services/database';
import { EbayListingService, InventoryLocation } from '../../../../../lib/services/ebay-listing';

// GET /api/ebay/[accountId]/locations/[locationKey] - Get specific inventory location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; locationKey: string }> }
): Promise<NextResponse> {
  const { accountId, locationKey } = await params;
  try {
    console.log(`[LOCATION API] GET request for account: ${accountId}, location: ${locationKey}`);

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

    // Get specific location from eBay
    const location = await ebayService.getInventoryLocation(locationKey);

    console.log(`[LOCATION API] Retrieved location: ${locationKey}`);

    return NextResponse.json({
      success: true,
      data: location,
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[LOCATION API] GET Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to retrieve inventory location: ${locationKey}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT /api/ebay/[accountId]/locations/[locationKey] - Update inventory location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; locationKey: string }> }
): Promise<NextResponse> {
  const { accountId, locationKey } = await params;
  try {
    console.log(`[LOCATION API] PUT request for account: ${accountId}, location: ${locationKey}`);

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

    // Update location on eBay
    const result = await ebayService.updateInventoryLocation(locationKey, body);

    console.log(`[LOCATION API] Updated location: ${locationKey}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Inventory location updated successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[LOCATION API] PUT Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to update inventory location: ${locationKey}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/ebay/[accountId]/locations/[locationKey] - Delete inventory location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; locationKey: string }> }
): Promise<NextResponse> {
  const { accountId, locationKey } = await params;
  try {
    console.log(`[LOCATION API] DELETE request for account: ${accountId}, location: ${locationKey}`);

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

    // Delete location from eBay
    const result = await ebayService.deleteInventoryLocation(locationKey);

    console.log(`[LOCATION API] Deleted location: ${locationKey}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Inventory location deleted successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[LOCATION API] DELETE Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to delete inventory location: ${locationKey}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}