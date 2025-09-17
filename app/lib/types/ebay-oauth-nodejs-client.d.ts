declare module 'ebay-oauth-nodejs-client' {
  interface EbayAuthTokenConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    env?: 'SANDBOX' | 'PRODUCTION';
    baseUrl?: string;
  }

  interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
  }

  class EbayAuthToken {
    constructor(config: EbayAuthTokenConfig);

    generateUserAuthorizationUrl(
      environment: 'SANDBOX' | 'PRODUCTION',
      scopes: string[],
      options?: { state?: string; prompt?: string }
    ): string;

    exchangeCodeForAccessToken(
      environment: 'SANDBOX' | 'PRODUCTION',
      code: string
    ): Promise<TokenResponse>;

    getAccessToken(
      environment: 'SANDBOX' | 'PRODUCTION',
      refreshToken: string,
      scopes: string[]
    ): Promise<TokenResponse>;

    getApplicationToken(
      environment: 'SANDBOX' | 'PRODUCTION',
      scopes: string[]
    ): Promise<TokenResponse>;
  }

  export = EbayAuthToken;
}