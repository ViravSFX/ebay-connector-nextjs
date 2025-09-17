'use client';

import {
  Box,
  HStack,
  VStack,
  Text,
  Button,
  Select,
  IconButton,
  Card,
  Flex,
  createListCollection
} from '@chakra-ui/react';
import {
  MdChevronLeft,
  MdChevronRight,
  MdFirstPage,
  MdLastPage
} from 'react-icons/md';

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  showNavButtons?: boolean;
  maxVisiblePages?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
  showPageInfo = true,
  showNavButtons = true,
  maxVisiblePages = 5,
  className,
  size = 'sm'
}: PaginationProps) {
  const { currentPage, totalPages, pageSize, totalItems, startIndex, endIndex } = pagination;

  // Calculate which page numbers to show
  const getVisiblePages = () => {
    const pages: number[] = [];
    const half = Math.floor(maxVisiblePages / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (totalItems === 0) {
    return null;
  }

  return (
    <Card.Root className={className}>
      <Card.Body p={4}>
        <VStack gap={4}>
          {/* Page Info */}
          {showPageInfo && (
            <Flex justify="space-between" align="center" w="full">
              <Text fontSize="sm" color="gray.600">
                Showing {startIndex + 1} to {endIndex} of {totalItems} results
              </Text>

              {showPageSizeSelector && (
                <HStack gap={2} align="center">
                  <Text fontSize="sm" color="gray.600">
                    Show
                  </Text>
                  <Select.Root
                    collection={createListCollection({
                      items: pageSizeOptions.map(option => ({ label: String(option), value: String(option) }))
                    })}
                    value={[String(pageSize)]}
                    onValueChange={(details) => onPageSizeChange(Number(details.value[0]))}
                    size={size}
                  >
                    <Select.Trigger w="80px">
                      <Select.ValueText />
                    </Select.Trigger>
                    <Select.Positioner>
                      <Select.Content>
                        {pageSizeOptions.map((option) => (
                          <Select.Item key={option} item={{ label: String(option), value: String(option) }}>
                            {option}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                  <Text fontSize="sm" color="gray.600">
                    per page
                  </Text>
                </HStack>
              )}
            </Flex>
          )}

          {/* Navigation */}
          {showNavButtons && totalPages > 1 && (
            <HStack gap={1} justify="center">
              {/* First Page */}
              <IconButton
                aria-label="First page"
                size={size}
                variant="ghost"
                onClick={() => onPageChange(1)}
                disabled={!canGoPrevious}
              >
                <MdFirstPage />
              </IconButton>

              {/* Previous Page */}
              <IconButton
                aria-label="Previous page"
                size={size}
                variant="ghost"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!canGoPrevious}
              >
                <MdChevronLeft />
              </IconButton>

              {/* Page Numbers */}
              {visiblePages.map((page) => (
                <Button
                  key={page}
                  size={size}
                  variant={page === currentPage ? 'solid' : 'ghost'}
                  colorPalette={page === currentPage ? 'blue' : 'gray'}
                  onClick={() => onPageChange(page)}
                  minW="40px"
                >
                  {page}
                </Button>
              ))}

              {/* Show ellipsis if there are more pages */}
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <Text px={2} fontSize="sm" color="gray.500">
                  ...
                </Text>
              )}

              {/* Last page number if not visible */}
              {visiblePages[visiblePages.length - 1] < totalPages && (
                <Button
                  size={size}
                  variant="ghost"
                  colorPalette="gray"
                  onClick={() => onPageChange(totalPages)}
                  minW="40px"
                >
                  {totalPages}
                </Button>
              )}

              {/* Next Page */}
              <IconButton
                aria-label="Next page"
                size={size}
                variant="ghost"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!canGoNext}
              >
                <MdChevronRight />
              </IconButton>

              {/* Last Page */}
              <IconButton
                aria-label="Last page"
                size={size}
                variant="ghost"
                onClick={() => onPageChange(totalPages)}
                disabled={!canGoNext}
              >
                <MdLastPage />
              </IconButton>
            </HStack>
          )}

          {/* Simple page info for single page */}
          {totalPages === 1 && showPageInfo && (
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Page 1 of 1
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}