// API Endpoint Permissions Configuration
// This file defines all available API endpoints and their metadata

export interface EndpointConfig {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'advanced' | 'premium';
  requiredPlan?: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
}

export const AVAILABLE_ENDPOINTS: EndpointConfig[] = [
  // Core eBay API Endpoints
  {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Manage item inventory, stock levels, and SKUs',
    category: 'core',
    requiredPlan: 'FREE'
  },
  {
    id: 'orders',
    name: 'Order Management',
    description: 'Access order data, fulfillment, and tracking',
    category: 'core',
    requiredPlan: 'FREE'
  },
  {
    id: 'products',
    name: 'Product Catalog',
    description: 'Product catalog management and item details',
    category: 'core',
    requiredPlan: 'FREE'
  },
  {
    id: 'listings',
    name: 'Listing Management',
    description: 'Create, update, and manage eBay listings',
    category: 'core',
    requiredPlan: 'FREE'
  },
  {
    id: 'categories',
    name: 'Category Browse',
    description: 'Browse eBay categories and item specifics',
    category: 'core',
    requiredPlan: 'FREE'
  },

  // Advanced Features
  {
    id: 'seller-profiles',
    name: 'Seller Profiles',
    description: 'Seller account information and settings',
    category: 'advanced',
    requiredPlan: 'FREE'
  },
  {
    id: 'payments',
    name: 'Payment Processing',
    description: 'Payment transactions and financial data',
    category: 'advanced',
    requiredPlan: 'FREE'
  },
  {
    id: 'shipping',
    name: 'Shipping Management',
    description: 'Shipping labels, tracking, and logistics',
    category: 'advanced',
    requiredPlan: 'FREE'
  }
];

// Helper functions for working with endpoints
export const getEndpointById = (id: string): EndpointConfig | undefined => {
  return AVAILABLE_ENDPOINTS.find(endpoint => endpoint.id === id);
};

export const getEndpointsByCategory = (category: 'core' | 'advanced' | 'premium'): EndpointConfig[] => {
  return AVAILABLE_ENDPOINTS.filter(endpoint => endpoint.category === category);
};

export const getEndpointsForPlan = (plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'): EndpointConfig[] => {
  const planHierarchy = { 'FREE': 0, 'BASIC': 1, 'PRO': 2, 'ENTERPRISE': 3 };
  const userPlanLevel = planHierarchy[plan];

  return AVAILABLE_ENDPOINTS.filter(endpoint => {
    const requiredLevel = planHierarchy[endpoint.requiredPlan || 'FREE'];
    return userPlanLevel >= requiredLevel;
  });
};

export const getEndpointIds = (): string[] => {
  return AVAILABLE_ENDPOINTS.map(endpoint => endpoint.id);
};

// Default endpoints for new tokens
export const DEFAULT_ENDPOINTS = ['inventory', 'orders', 'categories'];

// Rate limiting tiers based on endpoint categories
export const RATE_LIMITS = {
  core: 1000,      // requests per hour
  advanced: 500,   // requests per hour
  premium: 200     // requests per hour
};