import { useState, useMemo, useCallback } from 'react';

interface PaginationConfig {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

interface PaginationState {
  page: number;
  pageSize: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
}

interface UsePaginationReturn<T> {
  paginatedData: T[];
  pagination: PaginationInfo;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

/**
 * Custom hook for client-side pagination
 * Handles page navigation, page size changes, and pagination info
 */
export function usePagination<T = any>(
  data: T[],
  config: PaginationConfig = {}
): UsePaginationReturn<T> {
  const {
    initialPage = 1,
    initialPageSize = 25,
    pageSizeOptions = [10, 25, 50, 100]
  } = config;

  const [paginationState, setPaginationState] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize
  });

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / paginationState.pageSize);

  const pagination: PaginationInfo = useMemo(() => {
    const startIndex = (paginationState.page - 1) * paginationState.pageSize;
    const endIndex = Math.min(startIndex + paginationState.pageSize, totalItems);

    return {
      currentPage: paginationState.page,
      totalPages,
      totalItems,
      pageSize: paginationState.pageSize,
      hasNextPage: paginationState.page < totalPages,
      hasPreviousPage: paginationState.page > 1,
      startIndex: totalItems > 0 ? startIndex + 1 : 0,
      endIndex
    };
  }, [paginationState, totalItems, totalPages]);

  const paginatedData = useMemo(() => {
    const startIndex = (paginationState.page - 1) * paginationState.pageSize;
    const endIndex = startIndex + paginationState.pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, paginationState]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPaginationState(prev => ({ ...prev, page }));
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(paginationState.page + 1);
  }, [goToPage, paginationState.page]);

  const previousPage = useCallback(() => {
    goToPage(paginationState.page - 1);
  }, [goToPage, paginationState.page]);

  const setPageSize = useCallback((size: number) => {
    if (pageSizeOptions.includes(size)) {
      setPaginationState(prev => ({
        pageSize: size,
        page: 1 // Reset to first page when changing page size
      }));
    }
  }, [pageSizeOptions]);

  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToLastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  return {
    paginatedData,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    goToFirstPage,
    goToLastPage,
  };
}