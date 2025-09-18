'use client';

import {
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Heading,
  Icon,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiShield } from 'react-icons/fi';
import {
  EBAY_OAUTH_SCOPES,
  SCOPE_CATEGORIES,
} from '@/app/lib/constants/ebayScopes';
import EbayScopeCategory from './scope/EbayScopeCategory';

interface EbayScopeSelectorProps {
  selectedScopes: string[];
  onScopeChange: (scopeIds: string[]) => void;
  disabled?: boolean;
}


export default function EbayScopeSelector({
  selectedScopes,
  onScopeChange,
  disabled = false,
}: EbayScopeSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const handleScopeToggle = (scopeId: string, isRequired: boolean = false) => {
    if (disabled || isRequired) return;

    const newScopes = selectedScopes.includes(scopeId)
      ? selectedScopes.filter(id => id !== scopeId)
      : [...selectedScopes, scopeId];

    onScopeChange(newScopes);
  };

  const handleCategoryToggle = (categoryKey: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryKey)
        ? prev.filter(cat => cat !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const totalSelectedCount = selectedScopes.length;
  const totalAvailableCount = EBAY_OAUTH_SCOPES.length;

  return (
    <VStack align="stretch" gap={4}>
      {/* Header */}
      <Box>
        <HStack justify="space-between" align="center" mb={2}>
          <Heading size="md" color="gray.700">
            Permissions & Scopes
          </Heading>
          <Badge
            colorPalette={totalSelectedCount > 0 ? 'blue' : 'gray'}
            variant="subtle"
            fontSize="sm"
          >
            {totalSelectedCount}/{totalAvailableCount} permissions selected
          </Badge>
        </HStack>

        <Text fontSize="sm" color="gray.600" mb={4}>
          Choose which eBay data and operations this account can access. Required permissions are pre-selected and cannot be changed.
        </Text>
      </Box>

      {/* Categories */}
      <VStack align="stretch" gap={4}>
        {Object.keys(SCOPE_CATEGORIES).map((categoryKey) => (
          <EbayScopeCategory
            key={categoryKey}
            categoryKey={categoryKey}
            isExpanded={expandedCategories.includes(categoryKey)}
            onToggle={() => handleCategoryToggle(categoryKey)}
            selectedScopes={selectedScopes}
            onScopeToggle={handleScopeToggle}
            disabled={disabled}
          />
        ))}
      </VStack>

      {/* Footer Info */}
      <Box
        p={3}
        bg="orange.50"
        borderRadius="md"
        border="1px solid"
        borderColor="orange.200"
      >
        <HStack gap={2}>
          <Icon as={FiShield} color="orange.600" />
          <Text fontSize="xs" color="orange.700">
            <strong>Security Note:</strong> You can revoke these permissions at any time through your eBay account settings.
            Only select the permissions your application actually needs.
          </Text>
        </HStack>
      </Box>
    </VStack>
  );
}