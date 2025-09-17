import { useMemo } from 'react';
import { useTableData } from './useTableData';
import { useFilters, FilterConfig } from './useFilters';
import { usePagination } from './usePagination';
import { useSorting } from './useSorting';

interface UseDataTableConfig {
  endpoint: string;
  filterConfigs?: FilterConfig[];
  initialParams?: Record<string, any>;
  autoFetch?: boolean;
  pagination?: {
    initialPage?: number;
    initialPageSize?: number;
    pageSizeOptions?: number[];
  };
}

/**
 * Combined hook that provides all data table functionality
 * Integrates API data fetching, filtering, sorting, and pagination
 */
export function useDataTable<T = any>(config: UseDataTableConfig) {
  const {
    endpoint,
    filterConfigs = [],
    initialParams,
    autoFetch = true,
    pagination: paginationConfig = {}
  } = config;

  // Memoize initialParams to prevent infinite re-renders
  const memoizedInitialParams = useMemo(() => initialParams || {}, [initialParams]);
  const memoizedPaginationConfig = useMemo(() => paginationConfig, [paginationConfig]);

  // Fetch data from API
  const tableData = useTableData<T>(endpoint, {
    initialParams: memoizedInitialParams,
    autoFetch
  });

  // Apply sorting to raw data
  const sorting = useSorting(tableData.data);

  // Apply filters to sorted data
  const filtering = useFilters(sorting.sortedData, filterConfigs);

  // Apply pagination to filtered data
  const pagination = usePagination(filtering.filteredData, memoizedPaginationConfig);

  // Combine all functionality
  return {
    // Raw data and API state
    rawData: tableData.data,
    loading: tableData.loading,
    error: tableData.error,
    refetch: tableData.refetch,
    mutate: tableData.mutate,

    // Final processed data for display
    displayData: pagination.paginatedData,

    // Filtering functionality
    filters: filtering.filters,
    setFilter: filtering.setFilter,
    clearFilter: filtering.clearFilter,
    clearAllFilters: filtering.clearAllFilters,
    hasActiveFilters: filtering.hasActiveFilters,

    // Sorting functionality
    sortConfig: sorting.sortConfig,
    setSorting: sorting.setSorting,
    toggleSorting: sorting.toggleSorting,
    clearSorting: sorting.clearSorting,

    // Pagination functionality
    pagination: pagination.pagination,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,
    setPageSize: pagination.setPageSize,
    goToFirstPage: pagination.goToFirstPage,
    goToLastPage: pagination.goToLastPage,

    // Computed stats
    stats: {
      totalItems: tableData.data?.length || 0,
      filteredItems: filtering.filteredData?.length || 0,
      displayedItems: pagination.paginatedData?.length || 0,
      currentPage: pagination.pagination.currentPage,
      totalPages: pagination.pagination.totalPages,
    }
  };
}