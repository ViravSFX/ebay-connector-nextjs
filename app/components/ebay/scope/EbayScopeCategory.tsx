'use client';

import {
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Heading,
  Grid,
  GridItem,
  Icon,
} from '@chakra-ui/react';
import { FiUser, FiShoppingCart, FiTrendingUp, FiBarChart, FiSettings } from 'react-icons/fi';
import {
  SCOPE_CATEGORIES,
  getScopesByCategory,
} from '@/app/lib/constants/ebayScopes';
import EbayScopeCard from './EbayScopeCard';

const categoryIcons = {
  identity: FiUser,
  selling: FiShoppingCart,
  buying: FiShoppingCart,
  marketing: FiTrendingUp,
  analytics: FiBarChart,
  other: FiSettings,
} as const;

interface EbayScopeCategoryProps {
  categoryKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  selectedScopes: string[];
  onScopeToggle: (scopeId: string, isRequired?: boolean) => void;
  disabled?: boolean;
}

export default function EbayScopeCategory({
  categoryKey,
  isExpanded,
  onToggle,
  selectedScopes,
  onScopeToggle,
  disabled = false,
}: EbayScopeCategoryProps) {
  const category = SCOPE_CATEGORIES[categoryKey as keyof typeof SCOPE_CATEGORIES];
  const scopes = getScopesByCategory(categoryKey as keyof typeof SCOPE_CATEGORIES);
  const CategoryIcon = categoryIcons[categoryKey as keyof typeof categoryIcons];

  if (scopes.length === 0) return null;

  const selectedCount = scopes.filter(scope => selectedScopes.includes(scope.id)).length;
  const totalCount = scopes.length;

  return (
    <Box>
      <Box
        p={4}
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        cursor="pointer"
        onClick={onToggle}
        _hover={{ borderColor: `${category.color}.300` }}
        transition="all 0.2s"
      >
        <HStack justify="space-between" align="center">
          <HStack gap={3}>
            <Icon
              as={CategoryIcon}
              color={`${category.color}.600`}
              boxSize={5}
            />
            <VStack align="start" gap={1}>
              <Heading size="sm" color="gray.800">
                {category.name}
              </Heading>
              <Text fontSize="xs" color="gray.600">
                {category.description}
              </Text>
            </VStack>
          </HStack>

          <HStack gap={2}>
            <Badge
              colorPalette={selectedCount > 0 ? category.color : 'gray'}
              variant="subtle"
              fontSize="xs"
            >
              {selectedCount}/{totalCount} selected
            </Badge>
            <Text fontSize="xl" color="gray.400">
              {isExpanded ? '−' : '+'}
            </Text>
          </HStack>
        </HStack>
      </Box>

      {isExpanded && (
        <Box mt={3} ml={4}>
          <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={3}>
            {scopes.map((scope) => (
              <GridItem key={scope.id}>
                <EbayScopeCard
                  scope={scope}
                  isSelected={selectedScopes.includes(scope.id)}
                  onToggle={onScopeToggle}
                  disabled={disabled}
                />
              </GridItem>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}