"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  IconButton,
  Tabs,
  Code,
  Alert,
  Table,
  Grid,
  Flex,
  Input,
  InputGroup,
  Select,
  Textarea,
  Separator
} from "@chakra-ui/react";
import {
  MdBook,
  MdCode,
  MdContentCopy,
  MdCheck,
  MdApi,
  MdKey,
  MdInventory,
  MdShoppingCart,
  MdLocationOn,
  MdError,
  MdDataObject,
  MdChevronRight,
  MdSearch,
  MdOpenInNew
} from "react-icons/md";
import PageHeader from "@/app/components/common/PageHeader";

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestBody?: any;
  response?: any;
  queryParams?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  headers?: Array<{
    name: string;
    value: string;
    description: string;
  }>;
}

export default function DocumentationPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('getting-started');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [testRequest, setTestRequest] = useState('');
  const [testResponse, setTestResponse] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const apiCategories = {
    'getting-started': {
      title: 'Getting Started',
      icon: <MdBook />,
      description: 'Introduction and setup guide'
    },
    'auth': {
      title: 'OAuth & Authentication',
      icon: <MdKey />,
      description: 'Account connection and OAuth flow'
    },
    'listings': {
      title: 'Listing Management',
      icon: <MdInventory />,
      description: 'Create and manage eBay listings'
    },
    'offers': {
      title: 'Offer Management',
      icon: <MdShoppingCart />,
      description: 'Manage offers and publish listings'
    },
    'locations': {
      title: 'Location Management',
      icon: <MdLocationOn />,
      description: 'Manage inventory locations'
    },
    'errors': {
      title: 'Error Codes',
      icon: <MdError />,
      description: 'Error responses and handling'
    },
    'data-types': {
      title: 'Data Types',
      icon: <MdDataObject />,
      description: 'Common data types and enums'
    }
  };

  const endpoints: Record<string, ApiEndpoint[]> = {
    'auth': [
      {
        method: 'POST',
        path: '/api/ebay/oauth/authorize',
        description: 'Initialize OAuth flow and create account connection',
        requestBody: {
          friendlyName: "My eBay Store",
          scopes: ["api_scope", "sell_inventory", "sell_marketing"]
        },
        response: {
          success: true,
          authUrl: "https://auth.ebay.com/oauth2/authorize?...",
          accountId: "cmg9dr1ei0001jl0443chvsun"
        }
      },
      {
        method: 'GET',
        path: '/api/ebay/oauth/callback',
        description: 'Handle OAuth callback from eBay',
        queryParams: [
          { name: 'code', type: 'string', required: true, description: 'Authorization code' },
          { name: 'state', type: 'string', required: true, description: 'State parameter' }
        ]
      },
      {
        method: 'GET',
        path: '/api/ebay/accounts',
        description: 'List all connected eBay accounts',
        response: {
          success: true,
          data: [
            {
              id: "cmg9dr1ei0001jl0443chvsun",
              friendlyName: "My eBay Store",
              ebayUsername: "mystore123",
              status: "active"
            }
          ]
        }
      }
    ],
    'listings': [
      {
        method: 'POST',
        path: '/api/ebay/[accountId]/listings/create',
        description: 'Create a complete eBay listing',
        requestBody: {
          sku: "unique-product-sku-001",
          location: {
            merchantLocationKey: "warehouse-01",
            name: "Main Warehouse",
            address: {
              addressLine1: "123 Main Street",
              city: "San Francisco",
              stateOrProvince: "CA",
              postalCode: "94105",
              country: "US"
            }
          },
          product: {
            title: "Product Title",
            description: "Product description",
            imageUrls: ["https://example.com/image.jpg"],
            brand: "BrandName",
            mpn: "MPN-12345"
          },
          condition: "NEW",
          marketplaceId: "EBAY_US",
          format: "FIXED_PRICE",
          categoryId: "9355",
          pricingSummary: {
            price: {
              value: "29.99",
              currency: "USD"
            }
          },
          availableQuantity: 10,
          publish: true
        }
      },
      {
        method: 'GET',
        path: '/api/ebay/[accountId]/listings',
        description: 'Get all listings for an account',
        queryParams: [
          { name: 'limit', type: 'number', required: false, description: 'Number of results' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset' },
          { name: 'sku', type: 'string', required: false, description: 'Filter by SKU' }
        ]
      },
      {
        method: 'GET',
        path: '/api/ebay/[accountId]/listings/[sku]',
        description: 'Get single listing details by SKU'
      },
      {
        method: 'PUT',
        path: '/api/ebay/[accountId]/listings/[sku]',
        description: 'Update an existing listing'
      },
      {
        method: 'DELETE',
        path: '/api/ebay/[accountId]/listings/[sku]',
        description: 'Delete a listing'
      }
    ],
    'offers': [
      {
        method: 'GET',
        path: '/api/ebay/[accountId]/offers',
        description: 'Get all offers',
        queryParams: [
          { name: 'sku', type: 'string', required: false, description: 'Filter by SKU' },
          { name: 'limit', type: 'number', required: false, description: 'Number of results' }
        ]
      },
      {
        method: 'POST',
        path: '/api/ebay/[accountId]/offers/[offerId]/publish',
        description: 'Publish an offer to eBay'
      },
      {
        method: 'POST',
        path: '/api/ebay/[accountId]/offers/[offerId]/withdraw',
        description: 'Withdraw a published offer'
      }
    ],
    'locations': [
      {
        method: 'GET',
        path: '/api/ebay/[accountId]/locations',
        description: 'Get all inventory locations'
      }
    ]
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'green',
      POST: 'blue',
      PUT: 'yellow',
      DELETE: 'red'
    };
    return colors[method] || 'gray';
  };

  const renderGettingStarted = () => (
    <VStack gap={6} align="stretch">
      <Card.Root>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            <Heading size="lg">Welcome to eBay Connector API</Heading>
            <Text color="gray.600">
              This documentation provides comprehensive information about integrating with eBay's marketplace APIs
              through our connector service.
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Heading size="md">Prerequisites</Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={3}>
            {[
              'eBay Developer Account',
              'App credentials (Client ID & Client Secret)',
              'Valid RuName for OAuth',
              'Business policies set up in eBay (for publishing)'
            ].map((item, idx) => (
              <HStack key={idx} gap={2}>
                <Box color="green.500">✓</Box>
                <Text>{item}</Text>
              </HStack>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Heading size="md">Base URL</Heading>
        </Card.Header>
        <Card.Body>
          <Code p={3} borderRadius="md" bg="gray.900" color="green.400" w="full">
            http://localhost:3000/api/ebay
          </Code>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Heading size="md">Authentication Flow</Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={3}>
            {[
              'Call POST /oauth/authorize to get OAuth URL',
              'Redirect user to eBay for authorization',
              'eBay redirects back to your callback URL',
              'Token is automatically stored and managed'
            ].map((step, idx) => (
              <HStack key={idx} gap={3}>
                <Badge colorPalette="blue" size="lg">{idx + 1}</Badge>
                <Text>{step}</Text>
              </HStack>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );

  const renderEndpoint = (endpoint: ApiEndpoint) => (
    <Card.Root key={endpoint.path}>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={3}>
            <Badge colorPalette={getMethodColor(endpoint.method)} size="lg">
              {endpoint.method}
            </Badge>
            <Code fontSize="sm">{endpoint.path}</Code>
          </HStack>
          <IconButton
            aria-label="Open in new tab"
            size="sm"
            variant="ghost"
            onClick={() => window.open(`http://localhost:3000${endpoint.path}`, '_blank')}
          >
            <MdOpenInNew />
          </IconButton>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          <Text>{endpoint.description}</Text>

          {endpoint.queryParams && (
            <Box>
              <Heading size="sm" mb={2}>Query Parameters</Heading>
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Name</Table.ColumnHeader>
                    <Table.ColumnHeader>Type</Table.ColumnHeader>
                    <Table.ColumnHeader>Required</Table.ColumnHeader>
                    <Table.ColumnHeader>Description</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {endpoint.queryParams.map((param) => (
                    <Table.Row key={param.name}>
                      <Table.Cell><Code>{param.name}</Code></Table.Cell>
                      <Table.Cell>{param.type}</Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={param.required ? 'red' : 'gray'}>
                          {param.required ? 'Required' : 'Optional'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>{param.description}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          {endpoint.requestBody && (
            <Box>
              <HStack justify="space-between" mb={2}>
                <Heading size="sm">Request Body</Heading>
                <IconButton
                  aria-label="Copy code"
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(
                    JSON.stringify(endpoint.requestBody, null, 2),
                    `${endpoint.path}-request`
                  )}
                >
                  {copiedCode === `${endpoint.path}-request` ? <MdCheck /> : <MdContentCopy />}
                </IconButton>
              </HStack>
              <Box bg="gray.900" p={3} borderRadius="md" overflow="auto">
                <Code color="gray.100" fontSize="xs" whiteSpace="pre">
                  {JSON.stringify(endpoint.requestBody, null, 2)}
                </Code>
              </Box>
            </Box>
          )}

          {endpoint.response && (
            <Box>
              <HStack justify="space-between" mb={2}>
                <Heading size="sm">Response</Heading>
                <IconButton
                  aria-label="Copy code"
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(
                    JSON.stringify(endpoint.response, null, 2),
                    `${endpoint.path}-response`
                  )}
                >
                  {copiedCode === `${endpoint.path}-response` ? <MdCheck /> : <MdContentCopy />}
                </IconButton>
              </HStack>
              <Box bg="gray.900" p={3} borderRadius="md" overflow="auto">
                <Code color="gray.100" fontSize="xs" whiteSpace="pre">
                  {JSON.stringify(endpoint.response, null, 2)}
                </Code>
              </Box>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );

  const renderErrorCodes = () => (
    <VStack gap={6} align="stretch">
      <Card.Root>
        <Card.Header>
          <Heading size="lg">Error Codes & Responses</Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            {[
              { code: '400', title: 'Bad Request', message: 'Validation error or invalid request' },
              { code: '401', title: 'Unauthorized', message: 'Authentication failed or token expired' },
              { code: '404', title: 'Not Found', message: 'Resource not found' },
              { code: '500', title: 'Internal Server Error', message: 'Server error occurred' }
            ].map((error) => (
              <Card.Root key={error.code} variant="outline">
                <Card.Body>
                  <HStack justify="space-between" mb={2}>
                    <HStack gap={2}>
                      <Badge colorPalette="red" size="lg">{error.code}</Badge>
                      <Text fontWeight="bold">{error.title}</Text>
                    </HStack>
                  </HStack>
                  <Text color="gray.600">{error.message}</Text>
                  <Box bg="gray.900" p={3} borderRadius="md" mt={3}>
                    <Code color="gray.100" fontSize="xs" whiteSpace="pre">
{`{
  "success": false,
  "message": "${error.message}",
  "error": "Details..."
}`}
                    </Code>
                  </Box>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Heading size="md">Common eBay Error Codes</Heading>
        </Card.Header>
        <Card.Body>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Code</Table.ColumnHeader>
                <Table.ColumnHeader>Description</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {[
                { code: '25002', desc: 'Offer already exists' },
                { code: '25003', desc: 'Invalid price' },
                { code: '25004', desc: 'Invalid quantity' },
                { code: '25005', desc: 'Invalid category ID' },
                { code: '25007', desc: 'Invalid fulfillment policy' },
                { code: '25014', desc: 'Invalid or missing pictures' }
              ].map((item) => (
                <Table.Row key={item.code}>
                  <Table.Cell><Badge>{item.code}</Badge></Table.Cell>
                  <Table.Cell>{item.desc}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card.Body>
      </Card.Root>
    </VStack>
  );

  const renderDataTypes = () => (
    <VStack gap={6} align="stretch">
      <Card.Root>
        <Card.Header>
          <Heading size="lg">Data Types & Enums</Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={6}>
            <Box>
              <Heading size="md" mb={3}>Condition Values</Heading>
              <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                {['NEW', 'LIKE_NEW', 'NEW_OTHER', 'NEW_WITH_DEFECTS',
                  'USED_EXCELLENT', 'USED_VERY_GOOD', 'USED_GOOD',
                  'FOR_PARTS_OR_NOT_WORKING'].map((condition) => (
                  <Badge key={condition} size="lg" variant="outline">
                    {condition}
                  </Badge>
                ))}
              </Grid>
            </Box>

            <Box>
              <Heading size="md" mb={3}>Marketplace IDs</Heading>
              <VStack align="stretch" gap={2}>
                {[
                  { code: 'EBAY_US', name: 'United States' },
                  { code: 'EBAY_GB', name: 'United Kingdom' },
                  { code: 'EBAY_DE', name: 'Germany' },
                  { code: 'EBAY_AU', name: 'Australia' },
                  { code: 'EBAY_CA', name: 'Canada' }
                ].map((market) => (
                  <HStack key={market.code} gap={3}>
                    <Code>{market.code}</Code>
                    <Text>- {market.name}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>

            <Box>
              <Heading size="md" mb={3}>Listing Duration</Heading>
              <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                {['GTC', 'DAYS_3', 'DAYS_5', 'DAYS_7', 'DAYS_10', 'DAYS_30'].map((duration) => (
                  <Badge key={duration} size="lg" variant="outline">
                    {duration}
                  </Badge>
                ))}
              </Grid>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );

  const renderContent = () => {
    switch (selectedCategory) {
      case 'getting-started':
        return renderGettingStarted();
      case 'errors':
        return renderErrorCodes();
      case 'data-types':
        return renderDataTypes();
      default:
        return (
          <VStack gap={6} align="stretch">
            {endpoints[selectedCategory]?.map((endpoint) => renderEndpoint(endpoint))}
          </VStack>
        );
    }
  };

  return (
    <Box p={8}>
      <VStack gap={6} align="stretch">
        {/* Page Header */}
        <PageHeader
          title="API Documentation"
          subtitle="Complete reference for eBay Connector APIs"
          primaryAction={{
            label: "View on GitHub",
            icon: <MdOpenInNew />,
            onClick: () => window.open('https://github.com/your-repo', '_blank'),
            colorPalette: "blue",
            variant: "outline"
          }}
        />

        {/* Main Content */}
        <Grid templateColumns={{ base: "1fr", lg: "300px 1fr" }} gap={6}>
          {/* Sidebar Navigation */}
          <Card.Root h="fit-content">
            <Card.Body p={2}>
              <VStack align="stretch" gap={1}>
                {Object.entries(apiCategories).map(([key, category]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? 'subtle' : 'ghost'}
                    colorPalette={selectedCategory === key ? 'blue' : 'gray'}
                    justifyContent="flex-start"
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                  >
                    <HStack gap={2}>
                      {category.icon}
                      <Text>{category.title}</Text>
                    </HStack>
                  </Button>
                ))}
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Content Area */}
          <Box>
            {renderContent()}
          </Box>
        </Grid>
      </VStack>
    </Box>
  );
}