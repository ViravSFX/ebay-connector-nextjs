export interface EbayScope {
  id: string;
  url: string;
  name: string;
  description: string;
  category: 'identity' | 'selling' | 'buying' | 'marketing' | 'analytics' | 'other';
  isRequired?: boolean;
}

// Authorization Code Grant Type Scopes - ONLY approved scopes for sfxconnector app
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

  // Payment & Disputes
  {
    id: 'sell_payment_dispute',
    url: 'https://api.ebay.com/oauth/api_scope/sell.payment.dispute',
    name: 'Payment Disputes',
    description: 'View and manage payment disputes',
    category: 'selling',
  },

  // Notifications
  {
    id: 'commerce_notification_subscription_readonly',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly',
    name: 'View Notifications',
    description: 'View notification subscriptions',
    category: 'other',
  },
  {
    id: 'commerce_notification_subscription',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription',
    name: 'Manage Notifications',
    description: 'View and manage notification subscriptions',
    category: 'other',
  },

  // eBay Stores
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

  // eDelivery (Note: uses /scope/ not /api_scope/)
  {
    id: 'sell_edelivery',
    url: 'https://api.ebay.com/oauth/scope/sell.edelivery',
    name: 'eDelivery Services',
    description: 'Access eDelivery services for digital goods',
    category: 'selling',
  },

  // VERO Program
  {
    id: 'commerce_vero',
    url: 'https://api.ebay.com/oauth/api_scope/commerce.vero',
    name: 'VERO Program',
    description: 'Access Verified Rights Owner program features',
    category: 'other',
  },
];

// Default scope selection for new accounts
export const DEFAULT_SCOPES = EBAY_OAUTH_SCOPES.filter(scope => scope.isRequired).map(scope => scope.id);

// Minimal scopes that should work in both sandbox and production
export const MINIMAL_SCOPES = ['api_scope', 'identity_readonly', 'sell_inventory_readonly', 'sell_inventory'];

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