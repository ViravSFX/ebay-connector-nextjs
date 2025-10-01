import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/services/database';
import { EbayListingService } from '../../../../lib/services/ebay-listing';

// GET /api/ebay/[accountId]/policies - Get all business policies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params;
  try {
    console.log(`[POLICIES API] GET request for account: ${accountId}`);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // payment, fulfillment, return

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

    let policies: any = {};

    try {
      if (!type || type === 'payment') {
        console.log('Fetching payment policies...');
        policies.paymentPolicies = await ebayService.getPaymentPolicies();
      }

      if (!type || type === 'fulfillment') {
        console.log('Fetching fulfillment policies...');
        policies.fulfillmentPolicies = await ebayService.getFulfillmentPolicies();
      }

      if (!type || type === 'return') {
        console.log('Fetching return policies...');
        policies.returnPolicies = await ebayService.getReturnPolicies();
      }
    } catch (error: any) {
      console.warn('Some policies could not be fetched:', error.message);
      // Continue with partial data
    }

    const totalPolicies = (policies.paymentPolicies?.length || 0) +
                         (policies.fulfillmentPolicies?.length || 0) +
                         (policies.returnPolicies?.length || 0);

    console.log(`[POLICIES API] Retrieved ${totalPolicies} total policies`);

    return NextResponse.json({
      success: true,
      data: policies,
      metadata: {
        account_used: account.friendlyName || account.ebayUsername,
        account_id: accountId,
        total_policies: totalPolicies,
        filter_type: type || 'all',
      },
    });
  } catch (error: any) {
    console.error('[POLICIES API] GET Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve business policies',
        error: error.message,
      },
      { status: 500 }
    );
  }
}