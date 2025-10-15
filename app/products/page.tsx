'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Table,
  Badge,
  IconButton,
  Alert,
  Spinner,
  Flex,
  Input,
  Card,
  Select,
  Center,
  createListCollection,
} from '@chakra-ui/react';
import {
  MdVisibility,
  MdSync,
} from 'react-icons/md';
import PageHeader from '@/app/components/common/PageHeader';
import axios from 'axios';
import { formatDateShort } from '@/app/lib/utils/date';

interface Product {
  itemId: string;
  title: string;
  sku?: string;
  currentPrice: string;
  currency: string;
  quantityAvailable: string;
  quantitySold?: string;
  sellingStatus: string;
  listingType: string;
  startTime: string;
  endTime?: string;
  pictureUrls?: string[];
}

interface PaginationInfo {
  pageNumber: number;
  entriesPerPage: number;
  totalPages: number;
  totalEntries: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
      return;
    }

    fetchAccounts();
  }, [router]);

  useEffect(() => {
    if (selectedAccount) {
      fetchProducts(currentPage);
    }
  }, [selectedAccount, currentPage]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/ebay-accounts');
      if (response.data.success) {
        // Filter for active accounts - check isActive property
        const activeAccounts = response.data.data.filter((acc: any) => acc.isActive === true);
        setAccounts(response.data.data); // Show all accounts in dropdown
        console.log('Accounts:', response.data.data);
        console.log('Active accounts:', activeAccounts);

        // Select first active account by default, or first account if none are active
        if (activeAccounts.length > 0) {
          setSelectedAccount(activeAccounts[0].id);
        } else if (response.data.data.length > 0) {
          setSelectedAccount(response.data.data[0].id);
          setError('Your eBay accounts need to be reconnected to access the Trading API. Please go to eBay Accounts and reconnect.');
        } else {
          setError('No eBay accounts found. Please connect an account first.');
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch accounts');
      setLoading(false);
    }
  };

  const fetchProducts = async (page = 1) => {
    if (!selectedAccount) return;

    try {
      setLoading(true);
      setError('');

      const response = await axios.get(
        `/api/ebay/${selectedAccount}/legacy-listings?page=${page}&limit=${pageSize}`
      );

      if (response.data.success) {
        setProducts(response.data.data.items || []);
        setPagination(response.data.data.pagination);
      } else {
        setError(response.data.message || 'Failed to fetch products');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch products';
      setError(errorMessage);

      // If token expired, show reconnection hint
      if (err.response?.data?.actionRequired === 'reconnect' || errorMessage.includes('expired')) {
        setError('Your eBay token has expired. Please go to eBay Accounts page and reconnect your account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProducts(currentPage);
    setIsRefreshing(false);
  };

  const handleViewProduct = (product: Product) => {
    // Open eBay listing in new tab
    if (product.itemId) {
      window.open(`https://www.ebay.com/itm/${product.itemId}`, '_blank');
    }
  };

  const handleMigrateProduct = async (product: Product) => {
    try {
      const response = await axios.post(`/api/ebay/${selectedAccount}/migrate-single`, {
        listingId: product.itemId
      });

      if (response.data.success) {
        alert(`Product migrated successfully! SKU: ${response.data.data.inventorySku}`);
      } else {
        alert(`Migration failed: ${response.data.message}`);
      }
    } catch (error: any) {
      alert(`Migration error: ${error.response?.data?.message || error.message}`);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' ||
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.itemId.includes(searchTerm) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && product.sellingStatus === 'Active') ||
      (statusFilter === 'completed' && product.sellingStatus === 'Completed') ||
      (statusFilter === 'ended' && product.sellingStatus === 'Ended');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'Active': 'green',
      'Completed': 'blue',
      'Ended': 'gray',
      'Sold': 'purple',
    };

    return (
      <Badge size="sm" colorPalette={colorMap[status] || 'gray'}>
        {status}
      </Badge>
    );
  };

  return (
    <Box p={8}>
      <VStack gap={6} align="stretch">
        {/* Page Header */}
        <PageHeader
          title="Products"
          subtitle="Manage your eBay product listings"
          showRefresh={true}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Account Selector and Filters */}
        <Card.Root>
          <Card.Body>
            <HStack gap={4} flexWrap="wrap">
              {/* Account Selector */}
              <Box flex="1" minW="200px">
                <Text fontSize="sm" mb={2} color="gray.600">eBay Account</Text>
                <Select.Root
                  collection={createListCollection({
                    items: accounts.map(acc => ({ value: acc.id, label: acc.friendlyName || acc.ebayUsername }))
                  })}
                  value={[selectedAccount]}
                  onValueChange={(e) => setSelectedAccount(e.value[0])}
                  disabled={accounts.length === 0}
                >
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select account" />
                  </Select.Trigger>
                  <Select.Positioner>
                    <Select.Content>
                      {accounts.map(account => (
                        <Select.Item key={account.id} item={account.id}>
                          <Select.ItemText>
                            {account.friendlyName || account.ebayUsername}
                          </Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </Box>

              {/* Search */}
              <Box flex="1" minW="250px">
                <Text fontSize="sm" mb={2} color="gray.600">Search</Text>
                <Input
                  placeholder="Search by title, SKU, or item ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Box>

              {/* Status Filter */}
              <Box minW="150px">
                <Text fontSize="sm" mb={2} color="gray.600">Status</Text>
                <Select.Root
                  collection={createListCollection({
                    items: [
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'ended', label: 'Ended' }
                    ]
                  })}
                  value={[statusFilter]}
                  onValueChange={(e) => setStatusFilter(e.value[0])}
                >
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Select.Positioner>
                    <Select.Content>
                      <Select.Item item="all">
                        <Select.ItemText>All Status</Select.ItemText>
                      </Select.Item>
                      <Select.Item item="active">
                        <Select.ItemText>Active</Select.ItemText>
                      </Select.Item>
                      <Select.Item item="completed">
                        <Select.ItemText>Completed</Select.ItemText>
                      </Select.Item>
                      <Select.Item item="ended">
                        <Select.ItemText>Ended</Select.ItemText>
                      </Select.Item>
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Results Summary */}
        {!loading && pagination && (
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600">
              Showing {filteredProducts.length} of {pagination.totalEntries} products
              {searchTerm && ` (filtered)`}
            </Text>
            {pagination.totalPages > 1 && (
              <HStack>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Text fontSize="sm">
                  Page {pagination.pageNumber} of {pagination.totalPages}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage === pagination.totalPages}
                >
                  Next
                </Button>
              </HStack>
            )}
          </HStack>
        )}

        {/* Error Alert */}
        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <VStack align="start" gap={2}>
                <Alert.Description>{error}</Alert.Description>
                {error.includes('expired') && (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={() => router.push('/ebay-connections')}
                  >
                    Go to eBay Accounts
                  </Button>
                )}
              </VStack>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* Loading State */}
        {loading && (
          <Center py={20}>
            <VStack gap={4}>
              <Spinner size="lg" colorPalette="blue" />
              <Text color="gray.500">Loading products...</Text>
            </VStack>
          </Center>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProducts.length === 0 && (
          <Center py={20}>
            <VStack gap={4}>
              <Text fontSize="lg" fontWeight="medium" color="gray.600">
                {searchTerm ? 'No products match your search' : 'No products found'}
              </Text>
              <Text color="gray.500" textAlign="center">
                {selectedAccount
                  ? 'Your eBay products will appear here once they are listed'
                  : 'Please select an eBay account to view products'
                }
              </Text>
            </VStack>
          </Center>
        )}

        {/* Products Table */}
        {!loading && !error && filteredProducts.length > 0 && (
          <Card.Root>
            <Card.Body p={0}>
              <Table.ScrollArea maxH="600px">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Item ID</Table.ColumnHeader>
                      <Table.ColumnHeader>Title</Table.ColumnHeader>
                      <Table.ColumnHeader>SKU</Table.ColumnHeader>
                      <Table.ColumnHeader>Price</Table.ColumnHeader>
                      <Table.ColumnHeader>Quantity</Table.ColumnHeader>
                      <Table.ColumnHeader>Status</Table.ColumnHeader>
                      <Table.ColumnHeader>Type</Table.ColumnHeader>
                      <Table.ColumnHeader>Started</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">Actions</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filteredProducts.map((product) => (
                      <Table.Row key={product.itemId}>
                        <Table.Cell>
                          <Text fontSize="sm" fontFamily="mono">
                            {product.itemId}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <VStack align="start" gap={1}>
                            <Text fontSize="sm" fontWeight="medium" lineClamp="2">
                              {product.title}
                            </Text>
                            {product.pictureUrls && product.pictureUrls[0] && (
                              <img
                                src={product.pictureUrls[0]}
                                alt={product.title}
                                style={{
                                  height: '40px',
                                  width: '40px',
                                  objectFit: 'cover',
                                  borderRadius: '6px'
                                }}
                              />
                            )}
                          </VStack>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">
                            {product.sku || '-'}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" fontWeight="medium">
                            {product.currency} {product.currentPrice}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <VStack align="start" gap={0}>
                            <Text fontSize="sm">
                              Available: {product.quantityAvailable}
                            </Text>
                            {product.quantitySold && (
                              <Text fontSize="xs" color="gray.600">
                                Sold: {product.quantitySold}
                              </Text>
                            )}
                          </VStack>
                        </Table.Cell>
                        <Table.Cell>
                          {getStatusBadge(product.sellingStatus)}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge size="sm" variant="outline">
                            {product.listingType}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">
                            {formatDateShort(product.startTime)}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <HStack justify="center">
                            <IconButton
                              aria-label="View on eBay"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewProduct(product)}
                            >
                              <MdVisibility />
                            </IconButton>
                            <IconButton
                              aria-label="Migrate to Inventory API"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMigrateProduct(product)}
                              title="Migrate to Inventory API"
                            >
                              <MdSync />
                            </IconButton>
                          </HStack>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Box>
  );
}