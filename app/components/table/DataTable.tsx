'use client';

import {
  Box,
  HStack,
  VStack,
  Text,
  Button,
  Table,
  Card,
  IconButton,
  Flex,
  Spinner,
  Alert
} from '@chakra-ui/react';
import {
  MdArrowUpward,
  MdArrowDownward,
  MdRefresh
} from 'react-icons/md';
import { ReactNode } from 'react';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T, index: number) => ReactNode;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  sortConfig?: { key: string; order: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  error,
  onRefresh,
  sortConfig,
  onSort,
  emptyMessage = 'No data available',
  className,
  size = 'md'
}: DataTableProps<T>) {
  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }

    return sortConfig.order === 'asc' ?
      <MdArrowUpward size={16} /> :
      <MdArrowDownward size={16} />;
  };

  const handleSort = (columnKey: string) => {
    if (onSort) {
      onSort(columnKey);
    }
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  if (loading) {
    return (
      <Card.Root>
        <Card.Body>
          <Flex minH="200px" align="center" justify="center">
            <VStack gap={4}>
              <Spinner size="xl" colorPalette="blue" />
              <Text color="gray.600">Loading data...</Text>
            </VStack>
          </Flex>
        </Card.Body>
      </Card.Root>
    );
  }

  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Error Loading Data</Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
        {onRefresh && (
          <IconButton
            aria-label="Retry"
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            ml={2}
          >
            <MdRefresh />
          </IconButton>
        )}
      </Alert.Root>
    );
  }

  return (
    <Card.Root className={className}>
      <Table.Root variant="outline" size={size}>
        <Table.Header>
          <Table.Row>
            {columns.map((column) => (
              <Table.ColumnHeader
                key={column.key}
                width={column.width}
                cursor={column.sortable && onSort ? 'pointer' : 'default'}
                onClick={() => column.sortable && handleSort(column.key)}
                _hover={column.sortable && onSort ? { bg: 'gray.50' } : {}}
              >
                <HStack gap={2} justify="space-between">
                  <Text>{column.header}</Text>
                  {column.sortable && getSortIcon(column.key)}
                </HStack>
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.map((item, index) => (
            <Table.Row key={index}>
              {columns.map((column) => (
                <Table.Cell key={column.key}>
                  {column.render ?
                    column.render(item, index) :
                    String(getNestedValue(item, column.key) || '')
                  }
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {data.length === 0 && (
        <Box p={8} textAlign="center">
          <Text color="gray.500">{emptyMessage}</Text>
        </Box>
      )}
    </Card.Root>
  );
}