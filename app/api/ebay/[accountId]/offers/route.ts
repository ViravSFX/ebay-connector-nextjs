import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/services/database';
import { EbayListingService, OfferRequest, validateOfferRequest } from '../../../../lib/services/ebay-listing';

// GET /api/ebay/[accountId]/offers - Get all offers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;
  try {
    console.log(`[OFFERS API] GET request for account: ${accountId}`);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sku = searchParams.get('sku') || undefined;

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

    // Get offers from eBay
    const offers = await ebayService.getOffers(limit, offset, sku);

    console.log(`[OFFERS API] Retrieved ${offers.offers?.length || 0} offers`);

    return NextResponse.json({
      success: true,
      data: offers,
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        query_params: { limit, offset, sku },
      },
    });
  } catch (error: any) {
    console.error('[OFFERS API] GET Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve offers',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/ebay/[accountId]/offers - Create new offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;
  try {
    console.log(`[OFFERS API] POST request for account: ${accountId}`);

    const body = await request.json();

    // Validate offer request
    const validationErrors = validateOfferRequest(body);
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

    // Create offer on eBay
    const offerData: OfferRequest = body;
    const result = await ebayService.createOffer(offerData);

    console.log(`[OFFERS API] Created offer for SKU: ${body.sku}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Offer created successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[OFFERS API] POST Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create offer',
        error: error.message,
      },
      { status: 500 }
    );
  }
}