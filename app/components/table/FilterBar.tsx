'use client';

import {
  Box,
  HStack,
  VStack,
  Input,
  Select,
  Button,
  Text,
  IconButton,
  Card,
  Badge,
  Flex,
  createListCollection
} from '@chakra-ui/react';
import {
  MdSearch,
  MdClear,
  MdFilterList
} from 'react-icons/md';
import { ReactNode } from 'react';
import { FilterConfig, FilterValue } from '@/app/hooks/useFilters';

export interface FilterBarProps {
  filters: Record<string, FilterValue>;
  filterConfigs: FilterConfig[];
  onFilterChange: (key: string, value: FilterValue) => void;
  onClearFilter: (key: string) => void;
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
  showFilterCount?: boolean;
  className?: string;
}

export function FilterBar({
  filters,
  filterConfigs,
  onFilterChange,
  onClearFilter,
  onClearAllFilters,
  hasActiveFilters,
  showFilterCount = true,
  className
}: FilterBarProps) {
  const activeFilterCount = Object.keys(filters).filter(key =>
    filters[key] !== null && filters[key] !== undefined && filters[key] !== ''
  ).length;

  const renderFilter = (config: FilterConfig) => {
    const value = filters[config.key] || '';

    switch (config.type) {
      case 'search':
        return (
          <Box position="relative" minW="250px">
            <Input
              placeholder={config.placeholder || `Search ${config.label?.toLowerCase() || 'items'}...`}
              value={value as string}
              onChange={(e) => onFilterChange(config.key, e.target.value)}
              pl={10}
              size="sm"
            />
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
              <MdSearch color="gray.400" size={16} />
            </Box>
            {value && (
              <IconButton
                aria-label="Clear search"
                size="xs"
                variant="ghost"
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                onClick={() => onClearFilter(config.key)}
              >
                <MdClear size={14} />
              </IconButton>
            )}
          </Box>
        );

      case 'select': {
        const selectOptions = [
          { label: `All ${config.label}`, value: 'ALL' },
          ...(config.options || [])
        ];
        const selectCollection = createListCollection({ items: selectOptions });
        const currentValue = (value as string) || 'ALL';

        return (
          <Box minW="150px">
            <Select.Root
              collection={selectCollection}
              value={[currentValue]}
              onValueChange={(details) => {
                const newValue = details.value[0];
                onFilterChange(config.key, newValue === 'ALL' ? '' : newValue);
              }}
              size="sm"
            >
              <Select.Trigger>
                <Select.ValueText placeholder={config.placeholder || `All ${config.label}`} />
              </Select.Trigger>
              <Select.Positioner>
                <Select.Content>
                  {selectCollection.items.map((option) => (
                    <Select.Item key={option.value} item={option}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
        );
      }

      case 'boolean': {
        const booleanOptions = [
          { label: `All ${config.label}`, value: 'ALL' },
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ];
        const booleanCollection = createListCollection({ items: booleanOptions });
        const currentValue = value === null || value === undefined ? 'ALL' : String(value);

        return (
          <Box minW="120px">
            <Select.Root
              collection={booleanCollection}
              value={[currentValue]}
              onValueChange={(details) => {
                const newValue = details.value[0];
                if (newValue === 'ALL') {
                  onFilterChange(config.key, null);
                } else {
                  onFilterChange(config.key, newValue === 'true');
                }
              }}
              size="sm"
            >
              <Select.Trigger>
                <Select.ValueText placeholder={config.placeholder || `All ${config.label}`} />
              </Select.Trigger>
              <Select.Positioner>
                <Select.Content>
                  {booleanCollection.items.map((option) => (
                    <Select.Item key={option.value} item={option}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
        );
      }

      case 'dateRange':
        // For now, implement as simple date inputs
        // Could be enhanced with a proper date range picker
        const dateValue = value as { from?: string; to?: string } || {};
        return (
          <HStack gap={2}>
            <Input
              type="date"
              size="sm"
              placeholder="From"
              value={dateValue.from || ''}
              onChange={(e) => onFilterChange(config.key, {
                ...dateValue,
                from: e.target.value
              })}
              w="130px"
            />
            <Text fontSize="sm" color="gray.500">to</Text>
            <Input
              type="date"
              size="sm"
              placeholder="To"
              value={dateValue.to || ''}
              onChange={(e) => onFilterChange(config.key, {
                ...dateValue,
                to: e.target.value
              })}
              w="130px"
            />
          </HStack>
        );

      default:
        return null;
    }
  };

  return (
    <Card.Root className={className}>
      <Card.Body p={4}>
        <VStack gap={4} align="stretch">
          {/* Filter Header */}
          <HStack justify="space-between" align="center">
            <HStack gap={2}>
              <MdFilterList size={20} color="gray.600" />
              <Text fontWeight="medium" color="gray.700">
                Filters
              </Text>
              {showFilterCount && activeFilterCount > 0 && (
                <Badge colorPalette="blue" size="sm">
                  {activeFilterCount} active
                </Badge>
              )}
            </HStack>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                colorPalette="gray"
                onClick={onClearAllFilters}
              >
                Clear All
              </Button>
            )}
          </HStack>

          {/* Filter Controls */}
          <Flex wrap="wrap" gap={4} align="center">
            {filterConfigs.map((config) => (
              <VStack key={config.key} align="start" gap={1}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  {config.label}
                </Text>
                {renderFilter(config)}
              </VStack>
            ))}
          </Flex>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}