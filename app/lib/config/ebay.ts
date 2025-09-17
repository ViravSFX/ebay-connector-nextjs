export interface EbayConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isProduction: boolean;
}

export const getEbayConfig = (): EbayConfig => {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const redirectUri = process.env.EBAY_REDIRECT_URI;
  const isProduction = process.env.EBAY_SANDBOX === 'false';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing required eBay configuration in environment variables');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    isProduction,
  };
};

export const getEbayUrls = (isProduction: boolean) => {
  const baseUrls = isProduction
    ? {
        auth: 'https://auth.ebay.com/oauth2/authorize',
        token: 'https://api.ebay.com/identity/v1/oauth2/token',
        userInfo: 'https://api.ebay.com/commerce/identity/v1/user/',
        api: 'https://api.ebay.com',
      }
    : {
        auth: 'https://auth.sandbox.ebay.com/oauth2/authorize',
        token: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
        userInfo: 'https://api.sandbox.ebay.com/commerce/identity/v1/user/',
        api: 'https://api.sandbox.ebay.com',
      };

  return baseUrls;
};

export const EBAY_SCOPES = {
  READ_BASIC: 'https://api.ebay.com/oauth/api_scope',
  READ_SELL: 'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  WRITE_SELL: 'https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory',
  COMMERCE: 'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
} as const;