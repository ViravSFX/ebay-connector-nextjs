import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../../lib/services/database';
import { EbayListingService } from '../../../../../../lib/services/ebay-listing';

// POST /api/ebay/[accountId]/offers/[offerId]/publish - Publish offer (make listing live)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; offerId: string }> }
): Promise<NextResponse> {
  const { accountId, offerId } = await params;
  try {
    console.log(`[PUBLISH OFFER API] POST request for account: ${accountId}, offer: ${offerId}`);

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

    // Publish offer on eBay (make listing live)
    const result = await ebayService.publishOffer(offerId);

    console.log(`[PUBLISH OFFER API] Published offer: ${offerId}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Offer published successfully - listing is now live on eBay',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        offer_id: offerId,
      },
    });
  } catch (error: any) {
    console.error('[PUBLISH OFFER API] POST Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to publish offer: ${offerId}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}