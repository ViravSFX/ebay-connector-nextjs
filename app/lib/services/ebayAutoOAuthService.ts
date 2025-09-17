import puppeteer from 'puppeteer';
import { EbayOAuthService } from './ebayOAuthService';
import { debugLogService } from './debugLogService';
import prisma from './database';

export class EbayAutoOAuthService {
  // Automatically authorize eBay connection using username/password
  static async autoAuthorizeConnection(userId: string, connectionId: string): Promise<string> {
    let browser = null;

    try {
      debugLogService.info('AUTO_AUTH', '🔍 Starting automatic eBay OAuth authorization');

      // Get connection details
      const connection = await prisma.ebayConnection.findFirst({
        where: { id: connectionId, userId }
      });

      if (!connection) {
        throw new Error('eBay connection not found');
      }

      if (!connection.ebayUsername || !connection.ebayPassword) {
        throw new Error('eBay username and password are required for automatic authorization');
      }

      debugLogService.info('AUTO_AUTH', `🔍 Found connection: ${connection.name} (${connection.environment})`);
      debugLogService.info('AUTO_AUTH', `Credentials - Username: ${!!connection.ebayUsername}, Password: ${!!connection.ebayPassword}`);

      // Create OAuth config
      const config = EbayOAuthService.createConfigFromConnection(connection);

      // Generate authorization URL
      const authUrl = EbayOAuthService.generateAuthorizationUrl(config, `auto_${connectionId}`);
      debugLogService.info('AUTO_AUTH', `🔍 Generated authorization URL: ${authUrl}`);

      // Launch headless browser
      debugLogService.info('AUTO_AUTH', '🔍 Launching headless browser...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      debugLogService.info('AUTO_AUTH', '🔍 Navigating to eBay authorization page...');

      // Navigate to authorization URL
      await page.goto(authUrl, { waitUntil: 'networkidle2' });

      // Wait for login form
      debugLogService.info('AUTO_AUTH', '🔍 Waiting for login form...');
      await page.waitForSelector('#userid', { timeout: 10000 });

      // Fill in username
      debugLogService.info('AUTO_AUTH', '🔍 Filling username...');
      await page.type('#userid', connection.ebayUsername);

      // Click continue button
      await page.click('#signin-continue-btn');

      // Wait for password field
      debugLogService.info('AUTO_AUTH', '🔍 Waiting for password field...');
      await page.waitForSelector('#pass', { timeout: 10000 });

      // Fill in password
      debugLogService.info('AUTO_AUTH', '🔍 Filling password...');
      await page.type('#pass', connection.ebayPassword);

      // Click sign in button
      await page.click('#sgnBt');

      debugLogService.info('AUTO_AUTH', '🔍 Waiting for authorization consent page...');

      // Wait for consent page and agree
      try {
        // Wait for either the consent button or redirect
        await Promise.race([
          page.waitForSelector('#permissions-grant-button', { timeout: 15000 }),
          page.waitForFunction(() => window.location.href.includes('code='), { timeout: 15000 })
        ]);

        // If consent button exists, click it
        const consentButton = await page.$('#permissions-grant-button');
        if (consentButton) {
          debugLogService.info('AUTO_AUTH', '🔍 Clicking consent button...');
          await consentButton.click();
        }
      } catch (error) {
        debugLogService.info('AUTO_AUTH', '🔍 No consent page found or already redirected');
      }

      // Wait for redirect to callback URL
      debugLogService.info('AUTO_AUTH', '🔍 Waiting for callback redirect...');
      await page.waitForFunction(() =>
        window.location.href.includes('code=') || window.location.href.includes('error='),
        { timeout: 30000 }
      );

      const currentUrl = page.url();
      debugLogService.info('AUTO_AUTH', `🔍 Final redirect URL: ${currentUrl}`);

      // Extract authorization code
      const urlParams = new URL(currentUrl).searchParams;
      const authCode = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        throw new Error(`eBay authorization failed: ${error}`);
      }

      if (!authCode) {
        throw new Error('No authorization code received from eBay');
      }

      debugLogService.info('AUTO_AUTH', '✅ Successfully obtained authorization code');

      // Exchange code for token
      debugLogService.info('AUTO_AUTH', '🔍 Exchanging code for access token...');
      const tokenData = await EbayOAuthService.exchangeCodeForToken(config, authCode);

      // Store user token
      await EbayOAuthService.storeUserToken(userId, connectionId, tokenData);

      debugLogService.info('AUTO_AUTH', '✅ Automatic eBay authorization completed successfully');

      return tokenData.access_token;

    } catch (error: any) {
      debugLogService.error('AUTO_AUTH', `❌ Automatic eBay authorization failed: ${error.message}`);
      throw new Error(`Automatic eBay authorization failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Check if connection can use automatic authorization
  static async canAutoAuthorize(userId: string, connectionId: string): Promise<boolean> {
    try {
      const connection = await prisma.ebayConnection.findFirst({
        where: { id: connectionId, userId }
      });

      return !!(connection?.ebayUsername && connection?.ebayPassword);
    } catch (error) {
      return false;
    }
  }
}