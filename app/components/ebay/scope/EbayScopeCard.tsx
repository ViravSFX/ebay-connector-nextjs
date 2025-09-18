'use client';

import {
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Checkbox,
} from '@chakra-ui/react';
import { SCOPE_CATEGORIES, type EbayScope } from '@/app/lib/constants/ebayScopes';

interface EbayScopeCardProps {
  scope: EbayScope;
  isSelected: boolean;
  onToggle: (scopeId: string, isRequired?: boolean) => void;
  disabled?: boolean;
}

export default function EbayScopeCard({
  scope,
  isSelected,
  onToggle,
  disabled = false,
}: EbayScopeCardProps) {
  const isRequired = scope.isRequired;

  return (
    <Box
      p={4}
      bg={isSelected ? `${SCOPE_CATEGORIES[scope.category].color}.50` : 'gray.50'}
      borderRadius="md"
      border="1px solid"
      borderColor={isSelected ? `${SCOPE_CATEGORIES[scope.category].color}.200` : 'gray.200'}
      cursor={disabled || isRequired ? 'not-allowed' : 'pointer'}
      onClick={() => onToggle(scope.id, isRequired)}
      transition="all 0.2s"
      _hover={disabled || isRequired ? {} : {
        borderColor: `${SCOPE_CATEGORIES[scope.category].color}.300`,
        transform: 'translateY(-1px)',
      }}
      opacity={disabled && !isSelected ? 0.6 : 1}
    >
      <HStack align="start" gap={3}>
        <Checkbox.Root
          checked={isSelected}
          disabled={disabled || isRequired}
          onCheckedChange={() => onToggle(scope.id, isRequired)}
          colorPalette={SCOPE_CATEGORIES[scope.category].color}
          size="lg"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Indicator />
        </Checkbox.Root>

        <VStack align="start" gap={2} flex={1}>
          <HStack gap={2} flexWrap="wrap">
            <Text fontWeight="semibold" color="gray.800" fontSize="sm">
              {scope.name}
            </Text>
            {isRequired && (
              <Badge colorPalette="red" variant="solid" fontSize="xs">
                Required
              </Badge>
            )}
          </HStack>

          <Text fontSize="xs" color="gray.600" lineHeight="1.4">
            {scope.description}
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
}