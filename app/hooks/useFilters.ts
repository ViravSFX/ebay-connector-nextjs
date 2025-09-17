import { useState, useMemo, useCallback } from 'react';

export interface FilterConfig {
  key: string;
  type: 'search' | 'select' | 'dateRange' | 'boolean';
  label?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  searchFields?: string[]; // Fields to search in for search type
}

interface DateRange {
  start?: Date;
  end?: Date;
  from?: string;
  to?: string;
}

export type FilterValue = string | boolean | DateRange | undefined | null;

interface UseFiltersReturn<T> {
  filters: Record<string, FilterValue>;
  filteredData: T[];
  setFilter: (key: string, value: FilterValue) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Custom hook for managing client-side filtering
 * Supports search, select, date range, and boolean filters
 */
export function useFilters<T = any>(
  data: T[],
  filterConfigs: FilterConfig[]
): UseFiltersReturn<T> {
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilter = useCallback((key: string) => {
    setFilters(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'boolean') return value;
      if (typeof value === 'object' && value !== null) {
        const dateRange = value as DateRange;
        return dateRange.start || dateRange.end;
      }
      return false;
    });
  }, [filters]);

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(item => {
      return filterConfigs.every(config => {
        const filterValue = filters[config.key];

        // Skip if no filter value
        if (filterValue === undefined || filterValue === null) {
          return true;
        }

        switch (config.type) {
          case 'search':
            if (typeof filterValue !== 'string' || filterValue.trim() === '') {
              return true;
            }

            const searchTerm = filterValue.toLowerCase();
            const searchFields = config.searchFields || [config.key];

            return searchFields.some(field => {
              const fieldValue = getNestedValue(item, field);
              return String(fieldValue).toLowerCase().includes(searchTerm);
            });

          case 'select':
            if (typeof filterValue !== 'string' || filterValue === '') {
              return true;
            }

            const itemValue = getNestedValue(item, config.key);
            return String(itemValue) === filterValue;

          case 'boolean':
            if (typeof filterValue !== 'boolean') {
              return true;
            }

            const boolValue = getNestedValue(item, config.key);
            return Boolean(boolValue) === filterValue;

          case 'dateRange':
            if (typeof filterValue !== 'object' || !filterValue) {
              return true;
            }

            const dateRange = filterValue as DateRange;
            const itemDate = new Date(getNestedValue(item, config.key));

            if (isNaN(itemDate.getTime())) {
              return true; // Invalid date, don't filter
            }

            if (dateRange.start && itemDate < dateRange.start) {
              return false;
            }

            if (dateRange.end && itemDate > dateRange.end) {
              return false;
            }

            return true;

          default:
            return true;
        }
      });
    });
  }, [data, filters, filterConfigs]);

  return {
    filters,
    filteredData,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}

/**
 * Helper function to get nested object values using dot notation
 * e.g., getNestedValue(user, 'profile.name') returns user.profile.name
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
}