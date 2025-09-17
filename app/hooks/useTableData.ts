import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface UseTableDataOptions {
  initialParams?: Record<string, any>;
  autoFetch?: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UseTableDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string;
  pagination?: PaginationInfo;
  refetch: (params?: Record<string, any>) => Promise<void>;
  mutate: (updater: (data: T[]) => T[]) => void;
}

/**
 * Custom hook for managing table data with API integration
 * Handles loading states, error handling, and data mutations
 */
export function useTableData<T = any>(
  endpoint: string,
  options: UseTableDataOptions = {}
): UseTableDataReturn<T> {
  const { initialParams = {}, autoFetch = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | undefined>();

  const fetchData = useCallback(async (params: Record<string, any> = {}) => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();

      // Merge initial params with current params
      const allParams = { ...initialParams, ...params };

      Object.entries(allParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const url = queryParams.toString()
        ? `${endpoint}?${queryParams.toString()}`
        : endpoint;

      const response = await axios.get(url);

      if (response.data.success) {
        setData(response.data.data || []);

        // Set pagination info if available
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setError(response.data.message || 'Failed to fetch data');
        setData([]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch data';
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  // Auto fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  // Mutate data locally (for optimistic updates)
  const mutate = useCallback((updater: (data: T[]) => T[]) => {
    setData(updater);
  }, []);

  const refetch = useCallback(async (params?: Record<string, any>) => {
    await fetchData(params);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch,
    mutate,
  };
}