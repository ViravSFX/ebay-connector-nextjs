'use client';

import { useState } from 'react';
import {
  Box,
  VStack,
  Grid,
  Text,
  Center,
  Spinner,
  GridItem,
} from '@chakra-ui/react';
import { useFilters, FilterConfig } from '@/app/hooks/useFilters';
import { usePagination } from '@/app/hooks/usePagination';
import { FilterBar } from '@/app/components/table/FilterBar';
import { Pagination } from '@/app/components/table/Pagination';
import EbayAccountCard from './EbayAccountCard';
import EbayAccountViewModal from './EbayAccountViewModal';
import { EbayAccount } from '@/app/hooks/useEbayAccounts';

interface EbayAccountsListViewProps {
  accounts: EbayAccount[];
  loading?: boolean;
  onView?: (account: EbayAccount) => void;
  onReconnect?: (accountId: string) => void;
  onToggleStatus?: (accountId: string, isActive: boolean) => void;
  onDelete?: (accountId: string) => void;
  isReconnecting?: Record<string, boolean>;
  isDeleting?: Record<string, boolean>;
}

export default function EbayAccountsListView({
  accounts,
  loading = false,
  onView,
  onReconnect,
  onToggleStatus,
  onDelete,
  isReconnecting = {},
  isDeleting = {},
}: EbayAccountsListViewProps) {
  const [selectedAccount, setSelectedAccount] = useState<EbayAccount | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Filter configuration for eBay accounts
  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      type: 'search',
      label: 'Search',
      placeholder: 'Search accounts...',
      searchFields: ['friendlyName', 'ebayUsername', 'ebayUserId']
    },
    {
      key: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      key: 'environment',
      type: 'select',
      label: 'Environment',
      options: [
        { value: 'production', label: 'Production' },
        { value: 'sandbox', label: 'Sandbox' }
      ]
    },
    {
      key: 'hasExpired',
      type: 'boolean',
      label: 'Expired',
    },
  ];

  // Enhance accounts data with computed fields for filtering
  const enhancedAccounts = accounts.map(account => ({
    ...account,
    environment: typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_EBAY_SANDBOX === 'true' ? 'sandbox' : 'production')
      : 'production', // default to production for SSR
    hasExpired: new Date(account.expiresAt) < new Date()
  }));

  // Apply filters
  const {
    filteredData,
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters
  } = useFilters(enhancedAccounts, filterConfigs);

  // Apply pagination
  const {
    paginatedData,
    pagination,
    goToPage,
    setPageSize
  } = usePagination(filteredData, {
    initialPageSize: 12, // 3x4 grid
    pageSizeOptions: [6, 12, 24, 48]
  });

  const handleView = (account: EbayAccount) => {
    setSelectedAccount(account);
    setIsViewModalOpen(true);
    onView?.(account);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedAccount(null);
  };

  return (
    <VStack gap={6} align="stretch">
      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        filterConfigs={filterConfigs}
        onFilterChange={setFilter}
        onClearFilter={clearFilter}
        onClearAllFilters={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
        showFilterCount={true}
      />

      {/* Results Summary */}
      <Box>
        <Text fontSize="sm" color="gray.600">
          Showing {pagination.totalItems} account{pagination.totalItems !== 1 ? 's' : ''}
          {hasActiveFilters && ` (filtered from ${accounts.length} total)`}
        </Text>
      </Box>

      {/* Loading State */}
      {loading && (
        <Center py={20}>
          <VStack gap={4}>
            <Spinner size="lg" colorPalette="blue" />
            <Text color="gray.500">Loading accounts...</Text>
          </VStack>
        </Center>
      )}

      {/* Empty State */}
      {!loading && paginatedData.length === 0 && (
        <Center py={20}>
          <VStack gap={4}>
            <Text fontSize="lg" fontWeight="medium" color="gray.600">
              {hasActiveFilters ? 'No accounts match your filters' : 'No eBay accounts found'}
            </Text>
            <Text color="gray.500" textAlign="center">
              {hasActiveFilters
                ? 'Try adjusting your search criteria or clearing filters'
                : 'Connect your first eBay account to get started'
              }
            </Text>
          </VStack>
        </Center>
      )}

      {/* Account Cards Grid */}
      {!loading && paginatedData.length > 0 && (
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
            xl: "repeat(4, 1fr)"
          }}
          gap={4}
        >
          {paginatedData.map((account) => (
            <GridItem key={account.id}>
              <EbayAccountCard
                account={account}
                onView={handleView}
                onReconnect={onReconnect}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
                isReconnecting={isReconnecting[account.id]}
                isDeleting={isDeleting[account.id]}
              />
            </GridItem>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
          showPageSizeSelector={true}
          showPageInfo={true}
          showNavButtons={true}
        />
      )}

      {/* View Modal */}
      <EbayAccountViewModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        account={selectedAccount}
      />
    </VStack>
  );
}