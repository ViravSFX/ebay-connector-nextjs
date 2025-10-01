import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/services/database';
import { EbayListingService, InventoryLocation } from '../../../../lib/services/ebay-listing';

// GET /api/ebay/[accountId]/locations - Get all inventory locations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;
  try {
    console.log(`[LOCATIONS API] GET request for account: ${accountId}`);

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

    // Get locations from eBay
    const locations = await ebayService.getInventoryLocations();

    console.log(`[LOCATIONS API] Retrieved ${locations.length || 0} locations`);

    return NextResponse.json({
      success: true,
      data: locations,
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[LOCATIONS API] GET Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve inventory locations',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/ebay/[accountId]/locations - Create new inventory location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;
  try {
    console.log(`[LOCATIONS API] POST request for account: ${accountId}`);

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['merchantLocationKey', 'name', 'address', 'locationTypes'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate address
    if (!body.address.addressLine1 || !body.address.city || !body.address.stateOrProvince ||
        !body.address.postalCode || !body.address.countryCode) {
      return NextResponse.json(
        {
          success: false,
          message: 'Address must include addressLine1, city, stateOrProvince, postalCode, and countryCode',
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

    // Create location on eBay
    const locationData: InventoryLocation = {
      merchantLocationKey: body.merchantLocationKey,
      name: body.name,
      address: body.address,
      locationTypes: body.locationTypes,
      merchantLocationStatus: body.merchantLocationStatus || 'ENABLED',
    };

    const result = await ebayService.createInventoryLocation(locationData);

    console.log(`[LOCATIONS API] Created location: ${body.merchantLocationKey}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Inventory location created successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[LOCATIONS API] POST Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create inventory location',
        error: error.message,
      },
      { status: 500 }
    );
  }
}