import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state');

    console.log('eBay OAuth declined:', {
      error,
      errorDescription,
      state
    });

    // Clear any OAuth state cookie if it exists
    const response = NextResponse.redirect(
      new URL('/ebay-connections?error=oauth_declined', request.url)
    );
    response.cookies.delete('ebay_oauth_state');

    return response;
  } catch (error) {
    console.error('Error handling OAuth decline:', error);
    return NextResponse.redirect(
      new URL('/ebay-connections?error=oauth_error', request.url)
    );
  }
}