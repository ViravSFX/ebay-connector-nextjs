export interface EbayScope {
  id: string;
  url: string;
  name: string;
  description: string;
  category: 'identity' | 'selling' | 'buying' | 'marketing' | 'analytics' | 'other';
  isRequired?: boolean;
}

// Authorization Code Grant Type Scopes
export const EBAY_OAUTH_SCOPES: EbayScope[] = [
  // Required/Basic Scopes
  {
    id: 'api_scope',
    url: 'https://api.ebay.com/oauth/api_scope',
    name: 'Basic API Access',
    description: 'View public data from eBay',
    category: 'other',
    isRequired: true,
  },
  {
    id: 'identity_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
    name: 'User Identity',
    description: 'View user\'s basic information, such as username or business account details',
    category: 'identity',
    isRequired: true,
  },

  // Identity & Personal Information
  {
    id: 'identity_email',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly',
    name: 'Email Information',
    description: 'View user\'s personal email information',
    category: 'identity',
  },
  {
    id: 'identity_phone',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly',
    name: 'Phone Information',
    description: 'View user\'s personal telephone information',
    category: 'identity',
  },
  {
    id: 'identity_address',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly',
    name: 'Address Information',
    description: 'View user\'s personal address information',
    category: 'identity',
  },
  {
    id: 'identity_name',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly',
    name: 'Name Information',
    description: 'View user\'s first and last name',
    category: 'identity',
  },
  {
    id: 'identity_status',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly',
    name: 'Account Status',
    description: 'View user\'s eBay member account status',
    category: 'identity',
  },

  // Selling Operations
  {
    id: 'sell_inventory_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
    name: 'View Inventory',
    description: 'View your inventory and offers',
    category: 'selling',
  },
  {
    id: 'sell_inventory',
    url: 'https://api.ebay.com/oauth/api_scope/sell.inventory',
    name: 'Manage Inventory',
    description: 'View and manage your inventory and offers',
    category: 'selling',
  },
  {
    id: 'sell_fulfillment_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
    name: 'View Order Fulfillments',
    description: 'View your order fulfillments',
    category: 'selling',
  },
  {
    id: 'sell_fulfillment',
    url: 'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
    name: 'Manage Order Fulfillments',
    description: 'View and manage your order fulfillments',
    category: 'selling',
  },
  {
    id: 'sell_account_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
    name: 'View Account Settings',
    description: 'View your account settings',
    category: 'selling',
  },
  {
    id: 'sell_account',
    url: 'https://api.ebay.com/oauth/api_scope/sell.account',
    name: 'Manage Account Settings',
    description: 'View and manage your account settings',
    category: 'selling',
  },
  {
    id: 'sell_item_draft',
    url: 'https://api.ebay.com/oauth/api_scope/sell.item.draft',
    name: 'Manage Item Drafts',
    description: 'View and manage your item drafts',
    category: 'selling',
  },
  {
    id: 'sell_item',
    url: 'https://api.ebay.com/oauth/api_scope/sell.item',
    name: 'Manage Items',
    description: 'View and manage your item information',
    category: 'selling',
  },

  // Buying Operations
  {
    id: 'buy_order_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/buy.order.readonly',
    name: 'View Order Details',
    description: 'View your order details',
    category: 'buying',
  },
  {
    id: 'buy_shopping_cart',
    url: 'https://api.ebay.com/oauth/api_scope/buy.shopping.cart',
    name: 'Shopping Cart Access',
    description: 'Access shopping carts',
    category: 'buying',
  },
  {
    id: 'buy_offer_auction',
    url: 'https://api.ebay.com/oauth/api_scope/buy.offer.auction',
    name: 'Auction Bidding',
    description: 'View and manage bidding activities for auctions',
    category: 'buying',
  },

  // Marketing & Analytics
  {
    id: 'sell_marketing_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
    name: 'View Marketing Activities',
    description: 'View your eBay marketing activities, such as ad campaigns and listing promotions',
    category: 'marketing',
  },
  {
    id: 'sell_marketing',
    url: 'https://api.ebay.com/oauth/api_scope/sell.marketing',
    name: 'Manage Marketing Activities',
    description: 'View and manage your eBay marketing activities, such as ad campaigns and listing promotions',
    category: 'marketing',
  },
  {
    id: 'sell_analytics_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
    name: 'Selling Analytics',
    description: 'View your selling analytics data, such as performance reports',
    category: 'analytics',
  },
  {
    id: 'marketplace_insights_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly',
    name: 'Marketplace Insights',
    description: 'Read access to marketplace insights',
    category: 'analytics',
  },

  // Financial & Reputation
  {
    id: 'sell_finances',
    url: 'https://api.ebay.com/oauth/api_scope/sell.finances',
    name: 'Financial Information',
    description: 'View and manage your payment and order information',
    category: 'selling',
  },
  {
    id: 'sell_reputation_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/sell.reputation.readonly',
    name: 'View Reputation',
    description: 'View your reputation data, such as feedback',
    category: 'selling',
  },
  {
    id: 'sell_reputation',
    url: 'https://api.ebay.com/oauth/api_scope/sell.reputation',
    name: 'Manage Reputation',
    description: 'View and manage your reputation data, such as feedback',
    category: 'selling',
  },

  // Other Services
  {
    id: 'commerce_catalog_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly',
    name: 'Catalog Access',
    description: 'Read catalog data',
    category: 'other',
  },
  {
    id: 'sell_stores_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/sell.stores.readonly',
    name: 'View eBay Stores',
    description: 'View eBay stores',
    category: 'selling',
  },
  {
    id: 'sell_stores',
    url: 'https://api.ebay.com/oauth/api_scope/sell.stores',
    name: 'Manage eBay Stores',
    description: 'View and manage eBay stores',
    category: 'selling',
  },
];

// Default scope selection for new accounts
export const DEFAULT_SCOPES = EBAY_OAUTH_SCOPES.filter(scope => scope.isRequired).map(scope => scope.id);

// Scope categories for UI organization
export const SCOPE_CATEGORIES = {
  identity: {
    name: 'Identity & Personal Information',
    description: 'Access to user profile and personal details',
    color: 'blue',
  },
  selling: {
    name: 'Selling Operations',
    description: 'Manage listings, inventory, orders, and account settings',
    color: 'green',
  },
  buying: {
    name: 'Buying Operations',
    description: 'Access to purchasing and bidding activities',
    color: 'purple',
  },
  marketing: {
    name: 'Marketing & Promotions',
    description: 'Manage advertising campaigns and promotional activities',
    color: 'orange',
  },
  analytics: {
    name: 'Analytics & Insights',
    description: 'Access to performance data and market insights',
    color: 'teal',
  },
  other: {
    name: 'Other Services',
    description: 'Additional eBay services and APIs',
    color: 'gray',
  },
} as const;

// Helper function to get scopes by category
export function getScopesByCategory(category: keyof typeof SCOPE_CATEGORIES): EbayScope[] {
  return EBAY_OAUTH_SCOPES.filter(scope => scope.category === category);
}

// Helper function to get scope URLs from IDs
export function getScopeUrls(scopeIds: string[]): string[] {
  return EBAY_OAUTH_SCOPES
    .filter(scope => scopeIds.includes(scope.id))
    .map(scope => scope.url);
}

// Helper function to get scope details from URLs
export function getScopeDetails(scopeUrls: string[]): EbayScope[] {
  return EBAY_OAUTH_SCOPES.filter(scope => scopeUrls.includes(scope.url));
}