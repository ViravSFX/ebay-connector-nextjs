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
    id: '/ebay/{accountId}/inventory',
    name: 'Inventory Management',
    description: 'View and manage inventory items, stock levels, and offers',
    category: 'core',
    requiredPlan: 'FREE'
  },
  {
    id: '/ebay/{accountId}/orders',
    name: 'Order Management',
    description: 'Access order data, fulfillment, and tracking information',
    category: 'core',
    requiredPlan: 'FREE'
  },
  {
    id: '/ebay/{accountId}/listings',
    name: 'Listing Management',
    description: 'Create, update, and manage eBay listings and items',
    category: 'core',
    requiredPlan: 'FREE'
  },
  {
    id: '/ebay/{accountId}/account',
    name: 'Account Settings',
    description: 'View and manage account settings and seller policies',
    category: 'core',
    requiredPlan: 'FREE'
  },
  {
    id: '/ebay/{accountId}/finances',
    name: 'Financial Information',
    description: 'View payment and financial data',
    category: 'advanced',
    requiredPlan: 'BASIC'
  },
  {
    id: '/ebay/{accountId}/marketing',
    name: 'Marketing Activities',
    description: 'View and manage marketing campaigns and promotions',
    category: 'advanced',
    requiredPlan: 'BASIC'
  },
  {
    id: '/ebay/{accountId}/analytics',
    name: 'Analytics & Reports',
    description: 'View selling performance data and marketplace insights',
    category: 'premium',
    requiredPlan: 'PRO'
  },
  {
    id: '/ebay/{accountId}/stores',
    name: 'eBay Stores',
    description: 'View and manage eBay store settings and configurations',
    category: 'premium',
    requiredPlan: 'PRO'
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
export const DEFAULT_ENDPOINTS = [
  '/ebay/{accountId}/inventory',
  '/ebay/{accountId}/orders',
  '/ebay/{accountId}/account'
];

// Rate limiting tiers based on endpoint categories
export const RATE_LIMITS = {
  core: 1000,      // requests per hour
  advanced: 500,   // requests per hour
  premium: 200     // requests per hour
};