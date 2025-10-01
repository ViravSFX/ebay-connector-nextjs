import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../../lib/services/database';
import { EbayListingService } from '../../../../../../lib/services/ebay-listing';

// POST /api/ebay/[accountId]/offers/[offerId]/withdraw - Withdraw offer (end listing)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; offerId: string }> }
): Promise<NextResponse> {
  const { accountId, offerId } = await params;
  try {
    console.log(`[WITHDRAW OFFER API] POST request for account: ${accountId}, offer: ${offerId}`);

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

    // Withdraw offer on eBay (end listing)
    const result = await ebayService.withdrawOffer(offerId);

    console.log(`[WITHDRAW OFFER API] Withdrew offer: ${offerId}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Offer withdrawn successfully - listing has been ended on eBay',
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        offer_id: offerId,
      },
    });
  } catch (error: any) {
    console.error('[WITHDRAW OFFER API] POST Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to withdraw offer: ${offerId}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}