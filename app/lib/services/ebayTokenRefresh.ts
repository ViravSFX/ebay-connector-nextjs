import { getEbayConfig, getEbayUrls } from '@/app/lib/config/ebay';
import prisma from './database';
import { logToDebug } from '@/app/lib/middleware/queryDebugMiddleware';

interface EbayTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface EbayAccount {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  friendlyName: string | null;
}

export class EbayTokenRefreshService {
  /**
   * Check if token is expired or will expire soon (within 5 minutes)
   */
  static isTokenExpired(expiresAt: Date | null, bufferMinutes: number = 5): boolean {
    if (!expiresAt) return false; // No expiry date = never expires

    const now = new Date();
    const expiryWithBuffer = new Date(expiresAt.getTime() - (bufferMinutes * 60 * 1000));
    return now >= expiryWithBuffer;
  }

  /**
   * Refresh eBay access token using refresh token
   */
  static async refreshEbayToken(refreshToken: string): Promise<EbayTokenResponse> {
    const config = getEbayConfig();
    const urls = getEbayUrls(config.isProduction);

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch(urls.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`eBay token refresh failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Update eBay account with new token data
   */
  static async updateTokenInDatabase(
    accountId: string,
    tokenData: EbayTokenResponse
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    await prisma.ebayUserToken.update({
      where: { id: accountId },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: expiresAt,
        tokenType: tokenData.token_type,
        lastUsedAt: new Date(),
      },
    });

    await logToDebug('EBAY', 'Token refreshed successfully', {
      accountId,
      newExpiresAt: expiresAt.toISOString(),
      tokenType: tokenData.token_type
    }, 'INFO');
  }

  /**
   * Automatically refresh token if expired/expiring
   * Returns updated account data or throws error
   */
  static async ensureValidToken(account: EbayAccount): Promise<EbayAccount> {
    const isExpired = this.isTokenExpired(account.expiresAt);

    if (!isExpired) {
      await logToDebug('EBAY', 'Token is still valid', {
        accountId: account.id,
        expiresAt: account.expiresAt?.toISOString(),
        friendlyName: account.friendlyName || 'Unknown'
      }, 'INFO');
      return account;
    }

    await logToDebug('EBAY', 'Token expired - attempting refresh', {
      accountId: account.id,
      expiresAt: account.expiresAt?.toISOString(),
      friendlyName: account.friendlyName || 'Unknown',
      hasRefreshToken: !!account.refreshToken
    }, 'WARN');

    if (!account.refreshToken) {
      throw new Error('Token expired and no refresh token available. Re-authentication required.');
    }

    try {
      // Refresh the token
      const newTokenData = await this.refreshEbayToken(account.refreshToken);

      // Update database
      await this.updateTokenInDatabase(account.id, newTokenData);

      // Return updated account data
      const updatedAccount = {
        ...account,
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token,
        expiresAt: new Date(Date.now() + (newTokenData.expires_in * 1000)),
      };

      await logToDebug('EBAY', 'Token refresh completed', {
        accountId: account.id,
        oldExpiresAt: account.expiresAt?.toISOString(),
        newExpiresAt: updatedAccount.expiresAt.toISOString(),
        friendlyName: account.friendlyName || 'Unknown'
      }, 'INFO');

      return updatedAccount;

    } catch (error) {
      await logToDebug('EBAY', 'Token refresh failed', {
        accountId: account.id,
        friendlyName: account.friendlyName || 'Unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'ERROR');

      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}. Re-authentication required.`);
    }
  }
}

export default EbayTokenRefreshService;