import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/services/database';
import { EbayListingService, OfferRequest } from '../../../../../lib/services/ebay-listing';

// GET /api/ebay/[accountId]/offers/[offerId] - Get specific offer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; offerId: string }> }
): Promise<NextResponse> {
  const { accountId, offerId } = await params;
  try {
    console.log(`[OFFER API] GET request for account: ${accountId}, offer: ${offerId}`);

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

    // Get specific offer from eBay
    const offer = await ebayService.getOffer(offerId);

    console.log(`[OFFER API] Retrieved offer: ${offerId}`);

    return NextResponse.json({
      success: true,
      data: offer,
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[OFFER API] GET Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to retrieve offer: ${offerId}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT /api/ebay/[accountId]/offers/[offerId] - Update offer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; offerId: string }> }
): Promise<NextResponse> {
  const { accountId, offerId } = await params;
  try {
    console.log(`[OFFER API] PUT request for account: ${accountId}, offer: ${offerId}`);

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

    // Update offer on eBay
    const result = await ebayService.updateOffer(offerId, body);

    console.log(`[OFFER API] Updated offer: ${offerId}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Offer updated successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[OFFER API] PUT Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to update offer: ${offerId}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/ebay/[accountId]/offers/[offerId] - Delete offer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; offerId: string }> }
): Promise<NextResponse> {
  const { accountId, offerId } = await params;
  try {
    console.log(`[OFFER API] DELETE request for account: ${accountId}, offer: ${offerId}`);

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

    // Delete offer from eBay
    const result = await ebayService.deleteOffer(offerId);

    console.log(`[OFFER API] Deleted offer: ${offerId}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Offer deleted successfully',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
      },
    });
  } catch (error: any) {
    console.error('[OFFER API] DELETE Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to delete offer: ${offerId}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}