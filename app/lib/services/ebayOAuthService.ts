import EbayAuthToken from 'ebay-oauth-nodejs-client';
import axios from 'axios';
import prisma from './database';
import { debugLogService } from './debugLogService';

export interface EbayOAuthConfig {
  clientId: string;
  clientSecret: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  redirectUri: string;
  scopes?: string[];
}

export class EbayOAuthService {
  // Required OAuth scopes for listing creation
  private static readonly REQUIRED_SCOPES = [
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
    'https://api.ebay.com/oauth/api_scope/sell.account',
    'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
    'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
    'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly'
  ];

  // Create eBay OAuth client instance
  private static createOAuthClient(config: EbayOAuthConfig): EbayAuthToken {
    debugLogService.info('OAUTH', '================== CREATING EBAY OAUTH CLIENT ==================');
    debugLogService.info('OAUTH', `Environment: ${config.environment}`);
    debugLogService.info('OAUTH', `Client ID: ${config.clientId.substring(0, 10)}...`);
    debugLogService.info('OAUTH', `Redirect URI: ${config.redirectUri}`);

    // Set environment variables before creating the client
    process.env.EBAY_CLIENT_ID = config.clientId;
    process.env.EBAY_CLIENT_SECRET = config.clientSecret;
    process.env.EBAY_REDIRECT_URI = config.redirectUri;

    try {
      const oauthClient = new EbayAuthToken({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        env: config.environment  // The library expects 'env', not 'environment'
      });

      debugLogService.info('OAUTH', '✅ eBay OAuth client created successfully');
      return oauthClient;
    } catch (error: any) {
      debugLogService.error('OAUTH', `❌ Error creating eBay OAuth client: ${error.message}`);
      throw error;
    }
  }

  // Step 1: Generate OAuth authorization URL for user consent (eBay Official Implementation)
  static generateAuthorizationUrl(config: EbayOAuthConfig, state?: string): string {
    debugLogService.info('OAUTH', '================== GENERATING AUTHORIZATION URL (Official eBay OAuth) ==================');

    try {
      // eBay Authorization Endpoint
      const authEndpoint = config.environment === 'SANDBOX'
        ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
        : 'https://auth.ebay.com/oauth2/authorize';

      // Build authorization URL with proper eBay scopes
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: this.REQUIRED_SCOPES.join(' ')
      });

      if (state) {
        params.append('state', state);
      }

      const authUrl = `${authEndpoint}?${params.toString()}`;

      debugLogService.info('OAUTH', `Authorization endpoint: ${authEndpoint}`);
      debugLogService.info('OAUTH', `Client ID: ${config.clientId.substring(0, 8)}***`);
      debugLogService.info('OAUTH', `Redirect URI: ${config.redirectUri}`);
      debugLogService.info('OAUTH', `Requested scopes: ${this.REQUIRED_SCOPES.length} scopes`);
      debugLogService.info('OAUTH', '✅ Generated eBay authorization URL successfully');

      return authUrl;
    } catch (error: any) {
      debugLogService.error('OAUTH', `❌ Error generating authorization URL: ${error.message}`);
      throw new Error(`Failed to generate eBay authorization URL: ${error.message}`);
    }
  }

  // Step 2: Exchange authorization code for user access token (eBay Official Implementation)
  static async exchangeCodeForToken(
    config: EbayOAuthConfig,
    authorizationCode: string
  ): Promise<any> {
    try {
      debugLogService.info('OAUTH', '================== EXCHANGING CODE FOR TOKEN (Official eBay API) ==================');
      debugLogService.info('OAUTH', `Environment: ${config.environment}`);
      debugLogService.info('OAUTH', `Code length: ${authorizationCode.length}`);

      // eBay OAuth Token Endpoint (Official Documentation)
      const tokenEndpoint = config.environment === 'SANDBOX'
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        : 'https://api.ebay.com/identity/v1/oauth2/token';

      // Prepare Basic Auth header as per eBay documentation
      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

      // Request payload as per eBay official documentation
      const payload = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode, // eBay returns URL-encoded codes
        redirect_uri: config.redirectUri
      });

      debugLogService.info('OAUTH', `Token endpoint: ${tokenEndpoint}`);
      debugLogService.info('OAUTH', `Redirect URI: ${config.redirectUri}`);
      debugLogService.info('OAUTH', 'Making direct token exchange request...');

      const response = await axios.post(tokenEndpoint, payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        timeout: 30000
      });

      debugLogService.info('OAUTH', '✅ Token exchange successful');
      debugLogService.info('OAUTH', `Token type: ${response.data.token_type}`);
      debugLogService.info('OAUTH', `Expires in: ${response.data.expires_in} seconds`);
      debugLogService.info('OAUTH', `Has refresh token: ${!!response.data.refresh_token}`);

      return response.data;
    } catch (error: any) {
      if (error.response) {
        debugLogService.error('OAUTH', `❌ eBay API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        debugLogService.error('OAUTH', `❌ Request Error: ${error.message}`);
      }
      throw new Error(`Failed to exchange authorization code: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Step 3: Refresh expired user token (eBay Official Implementation)
  static async refreshUserToken(
    config: EbayOAuthConfig,
    refreshToken: string,
    scopes?: string[]
  ): Promise<any> {
    try {
      debugLogService.info('OAUTH', '================== REFRESHING USER TOKEN (Official eBay API) ==================');
      debugLogService.info('OAUTH', `Environment: ${config.environment}`);
      debugLogService.info('OAUTH', `Using scopes: ${scopes || this.REQUIRED_SCOPES}`);

      // eBay OAuth Token Endpoint (same as token exchange)
      const tokenEndpoint = config.environment === 'SANDBOX'
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        : 'https://api.ebay.com/identity/v1/oauth2/token';

      // Prepare Basic Auth header
      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

      // Request payload for refresh token
      const payload = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      // Add scopes if provided (must be subset of original consent)
      if (scopes && scopes.length > 0) {
        payload.append('scope', scopes.join(' '));
      }

      debugLogService.info('OAUTH', `Token endpoint: ${tokenEndpoint}`);
      debugLogService.info('OAUTH', 'Making refresh token request...');

      const response = await axios.post(tokenEndpoint, payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        timeout: 30000
      });

      debugLogService.info('OAUTH', '✅ Token refresh successful');
      debugLogService.info('OAUTH', `New token expires in: ${response.data.expires_in} seconds`);

      return response.data;
    } catch (error: any) {
      if (error.response) {
        debugLogService.error('OAUTH', `❌ eBay Refresh Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        debugLogService.error('OAUTH', `❌ Refresh Request Error: ${error.message}`);
      }
      throw new Error(`Failed to refresh access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Store user token in database
  static async storeUserToken(
    userId: string,
    connectionId: string,
    tokenData: any
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Upsert token record (update if exists, create if not)
      await prisma.ebayUserToken.upsert({
        where: {
          userId_connectionId: {
            userId,
            connectionId
          }
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          tokenType: tokenData.token_type || 'Bearer'
        },
        create: {
          userId,
          connectionId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          tokenType: tokenData.token_type || 'Bearer'
        }
      });
    } catch (error: any) {
      debugLogService.error('OAUTH', `❌ Error storing user token: ${error.message}`);
      throw new Error('Failed to store user token in database');
    }
  }

  // Get valid user token (refresh if needed)
  static async getValidUserToken(userId: string, connectionId: string): Promise<string> {
    try {
      const tokenRecord = await prisma.ebayUserToken.findUnique({
        where: {
          userId_connectionId: {
            userId,
            connectionId
          }
        },
        include: {
          connection: true
        }
      });

      if (!tokenRecord) {
        throw new Error('No user token found. User needs to authorize the application first.');
      }

      // Check if token is still valid (refresh if expires in next 5 minutes)
      const expiresInMinutes = (tokenRecord.expiresAt.getTime() - Date.now()) / (1000 * 60);

      if (expiresInMinutes <= 5) {
        // Token expired or about to expire, refresh it
        const config: EbayOAuthConfig = {
          clientId: tokenRecord.connection.clientId,
          clientSecret: tokenRecord.connection.clientSecret,
          environment: tokenRecord.connection.environment.toUpperCase() as 'SANDBOX' | 'PRODUCTION',
          redirectUri: process.env.EBAY_REDIRECT_URI || `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/ebay/oauth/callback`
        };

        if (tokenRecord.refreshToken) {
          const refreshedToken = await this.refreshUserToken(config, tokenRecord.refreshToken);
          await this.storeUserToken(userId, connectionId, refreshedToken);
          return refreshedToken.access_token;
        } else {
          // No refresh token (application token), get new application token
          const appToken = await this.getApplicationToken(config);
          const tokenData = {
            access_token: appToken,
            token_type: 'Bearer',
            expires_in: 7200,
            refresh_token: null
          };
          await this.storeUserToken(userId, connectionId, tokenData);
          return appToken;
        }
      }

      return tokenRecord.accessToken;
    } catch (error: any) {
      debugLogService.error('OAUTH', `❌ Error getting valid user token: ${error.message}`);
      throw error;
    }
  }

  // Get application token with inventory scopes
  static async getApplicationToken(config: EbayOAuthConfig): Promise<string> {
    try {
      debugLogService.info('OAUTH', '================== GETTING APPLICATION TOKEN ==================');
      debugLogService.info('OAUTH', `Client ID: ${config.clientId.substring(0, 8)}***`);
      debugLogService.info('OAUTH', `Environment: ${config.environment}`);
      debugLogService.info('OAUTH', `Redirect URI: ${config.redirectUri}`);

      const ebayAuthToken = this.createOAuthClient(config);

      // Try with full inventory scopes first
      let appToken;
      let grantedScopes = [];

      debugLogService.info('OAUTH', 'Attempting to get application token with REQUIRED_SCOPES:', this.REQUIRED_SCOPES);

      try {
        appToken = await ebayAuthToken.getApplicationToken(
          config.environment,
          this.REQUIRED_SCOPES
        );
        grantedScopes = this.REQUIRED_SCOPES;
        debugLogService.info('OAUTH', '✅ Successfully obtained application token with inventory scopes');
      } catch (scopeError: any) {
        // Fallback to basic scope if inventory scopes fail
        debugLogService.warn('OAUTH', `⚠️ Inventory scopes failed, falling back to basic scope. Error: ${scopeError.message}`);
        debugLogService.info('OAUTH', 'Attempting with basic scope: https://api.ebay.com/oauth/api_scope');

        appToken = await ebayAuthToken.getApplicationToken(
          config.environment,
          ['https://api.ebay.com/oauth/api_scope']
        );
        grantedScopes = ['https://api.ebay.com/oauth/api_scope'];
        debugLogService.info('OAUTH', '✅ Successfully obtained application token with basic scope');
      }

      debugLogService.info('OAUTH', `Raw application token response - Type: ${typeof appToken}, Has token: ${!!appToken}, Scopes: ${grantedScopes.length}`);

      // Parse the response if it's a string
      let parsedToken = appToken;
      if (typeof appToken === 'string') {
        try {
          parsedToken = JSON.parse(appToken);
          debugLogService.info('OAUTH', `Parsed token - Access token: ${!!parsedToken?.access_token}, Type: ${parsedToken?.token_type}, Expires: ${parsedToken?.expires_in}s`);
        } catch (parseError) {
          debugLogService.error('OAUTH', '❌ Failed to parse token response as JSON');
          throw new Error('Invalid application token response format');
        }
      } else {
        debugLogService.info('OAUTH', `Token response object - Access token: ${!!parsedToken?.access_token}, Type: ${parsedToken?.token_type}, Expires: ${parsedToken?.expires_in}s`);
      }

      if (!parsedToken?.access_token) {
        debugLogService.error('OAUTH', `❌ No access token in response: ${JSON.stringify(parsedToken)}`);
        throw new Error('No access token in application token response');
      }

      debugLogService.info('OAUTH', `✅ Application token obtained successfully with scopes: ${grantedScopes.join(', ')}`);
      return parsedToken.access_token;
    } catch (error: any) {
      debugLogService.error('OAUTH', `❌ Failed to get application access token: ${error.message}`);
      throw new Error(`Failed to get application access token: ${error.message}`);
    }
  }

  // Helper: Get eBay connection for user
  static async getEbayConnection(userId: string, connectionId?: string) {
    const connection = await prisma.ebayConnection.findFirst({
      where: {
        userId,
        ...(connectionId && { id: connectionId })
      }
    });

    if (!connection) {
      throw new Error('No eBay connection found for user');
    }

    return connection;
  }

  // Helper: Create OAuth config from connection
  static createConfigFromConnection(connection: any): EbayOAuthConfig {
    // Use redirectUrl from database (dynamic RuName/redirect URI)
    const redirectUri = connection.redirectUrl ||
      (connection.environment === 'sandbox'
        ? 'Simon_Festl-SimonFes-n8n-SB-zjlvqmslq'  // Default sandbox RuName
        : `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/ebay/oauth/callback`);

    return {
      clientId: connection.clientId,
      clientSecret: connection.clientSecret,
      environment: connection.environment.toUpperCase() as 'SANDBOX' | 'PRODUCTION',
      redirectUri: redirectUri,
      scopes: connection.scopes ? JSON.parse(connection.scopes) : this.REQUIRED_SCOPES
    };
  }
}