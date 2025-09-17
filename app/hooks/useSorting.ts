import { useState, useMemo, useCallback } from 'react';

export type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: string;
  order: SortOrder;
}

interface UseSortingReturn<T> {
  sortedData: T[];
  sortConfig: SortConfig | null;
  setSorting: (key: string, order?: SortOrder) => void;
  toggleSorting: (key: string) => void;
  clearSorting: () => void;
}

/**
 * Custom hook for client-side sorting
 * Handles sorting by any field with ascending/descending order
 */
export function useSorting<T = any>(data: T[]): UseSortingReturn<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const setSorting = useCallback((key: string, order: SortOrder = 'asc') => {
    setSortConfig({ key, order });
  }, []);

  const toggleSorting = useCallback((key: string) => {
    setSortConfig(prevConfig => {
      if (!prevConfig || prevConfig.key !== key) {
        return { key, order: 'asc' };
      }

      if (prevConfig.order === 'asc') {
        return { key, order: 'desc' };
      }

      // If already desc, remove sorting
      return null;
    });
  }, []);

  const clearSorting = useCallback(() => {
    setSortConfig(null);
  }, []);

  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    if (!sortConfig) {
      return data;
    }

    const { key, order } = sortConfig;

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, key);
      const bValue = getNestedValue(b, key);

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) {
        return bValue === null || bValue === undefined ? 0 : 1;
      }
      if (bValue === null || bValue === undefined) {
        return -1;
      }

      // Handle different data types
      let comparison = 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        // Convert to strings for comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        comparison = aStr.localeCompare(bStr, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return {
    sortedData,
    sortConfig,
    setSorting,
    toggleSorting,
    clearSorting,
  };
}

/**
 * Helper function to get nested object values using dot notation
 * e.g., getNestedValue(user, 'profile.name') returns user.profile.name
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}