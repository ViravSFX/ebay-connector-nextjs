'use client';

import {
  VStack,
  HStack,
  Text,
  Badge,
  Heading,
  Icon,
  Dialog,
  Button,
  Separator,
  Box,
} from '@chakra-ui/react';
import { FiGlobe, FiUser, FiClock, FiTag, FiShield, FiCalendar } from 'react-icons/fi';
import { EbayAccount } from '@/app/hooks/useEbayAccounts';
import { EBAY_OAUTH_SCOPES, SCOPE_CATEGORIES, getScopesByCategory } from '@/app/lib/constants/ebayScopes';
import EbayScopeCategory from './scope/EbayScopeCategory';
import { useState } from 'react';

interface EbayAccountViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: EbayAccount | null;
}

export default function EbayAccountViewModal({
  isOpen,
  onClose,
  account,
}: EbayAccountViewModalProps) {
  if (!account) return null;

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const handleCategoryToggle = (categoryKey: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryKey)
        ? prev.filter(cat => cat !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const isActive = account.status === 'active';
  const isExpired = new Date(account.expiresAt) < new Date();
  const environment = process.env.NEXT_PUBLIC_EBAY_SANDBOX === 'true' ? 'sandbox' : 'production';

  // Safely parse scopes and tags
  const scopeIds = Array.isArray(account.userSelectedScopes)
    ? account.userSelectedScopes
    : typeof account.userSelectedScopes === 'string'
      ? (account.userSelectedScopes ? JSON.parse(account.userSelectedScopes) : [])
      : [];

  const tags = Array.isArray(account.tags)
    ? account.tags
    : typeof account.tags === 'string'
      ? (account.tags ? JSON.parse(account.tags) : [])
      : [];

  // Get scope objects from IDs
  const accountScopes = EBAY_OAUTH_SCOPES.filter(scope => scopeIds.includes(scope.id));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose} scrollBehavior="inside">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="11/12">
          <Dialog.Header>
            <Dialog.Title>
              eBay Account Details
            </Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            <VStack align="stretch" gap={6}>
              {/* Account Header */}
              <Box>
                <Heading size="lg" color="navy.800" mb={2}>
                  {account.friendlyName || account.ebayUsername || account.ebayUserId}
                </Heading>

                {/* Status Badges */}
                <HStack gap={2} flexWrap="wrap">
                  <Badge
                    colorPalette={environment === 'production' ? 'red' : 'yellow'}
                    variant="subtle"
                  >
                    {environment.toUpperCase()}
                  </Badge>

                  {account.ebayUsername && (
                    <Badge colorPalette="green" variant="subtle" fontSize="xs">
                      AUTO-AUTH
                    </Badge>
                  )}

                  <Badge
                    colorPalette={isActive ? 'green' : 'gray'}
                    variant="subtle"
                  >
                    {isActive ? 'Active' : 'Disabled'}
                  </Badge>

                  {isExpired && (
                    <Badge colorPalette="red" variant="outline">
                      Expired
                    </Badge>
                  )}
                </HStack>
              </Box>

              <Separator />

              {/* Account Information */}
              <VStack align="stretch" gap={4}>
                <Heading size="md" color="gray.700">
                  Account Information
                </Heading>

                <VStack align="stretch" gap={3} fontSize="sm">
                  {account.friendlyName && (
                    <HStack>
                      <Icon as={FiTag} color="gray.600" />
                      <Text fontWeight="medium" color="gray.600" minW="120px">
                        Friendly Name:
                      </Text>
                      <Text color="gray.800" fontWeight="semibold">
                        {account.friendlyName}
                      </Text>
                    </HStack>
                  )}

                  <HStack>
                    <Icon as={FiGlobe} color="gray.600" />
                    <Text fontWeight="medium" color="gray.600" minW="120px">
                      eBay User ID:
                    </Text>
                    <Text color="gray.800" fontFamily="mono">
                      {account.ebayUserId}
                    </Text>
                  </HStack>

                  {account.ebayUsername && (
                    <HStack>
                      <Icon as={FiUser} color="gray.600" />
                      <Text fontWeight="medium" color="gray.600" minW="120px">
                        Username:
                      </Text>
                      <Text color="gray.800" fontFamily="mono">
                        {account.ebayUsername}
                      </Text>
                    </HStack>
                  )}

                  <HStack>
                    <Icon as={FiShield} color="gray.600" />
                    <Text fontWeight="medium" color="gray.600" minW="120px">
                      Token Type:
                    </Text>
                    <Text color="gray.800">
                      {account.tokenType}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>

              <Separator />

              {/* Timestamps */}
              <VStack align="stretch" gap={4}>
                <Heading size="md" color="gray.700">
                  Timeline
                </Heading>

                <VStack align="stretch" gap={3} fontSize="sm">
                  <HStack>
                    <Icon as={FiCalendar} color="gray.600" />
                    <Text fontWeight="medium" color="gray.600" minW="120px">
                      Connected:
                    </Text>
                    <Text color="gray.800">
                      {formatDate(account.createdAt)}
                    </Text>
                  </HStack>

                  {account.lastUsedAt && (
                    <HStack>
                      <Icon as={FiClock} color="gray.600" />
                      <Text fontWeight="medium" color="gray.600" minW="120px">
                        Last Used:
                      </Text>
                      <Text color="gray.800">
                        {formatDate(account.lastUsedAt)}
                      </Text>
                    </HStack>
                  )}

                  <HStack>
                    <Icon as={FiCalendar} color={isExpired ? "red.600" : "gray.600"} />
                    <Text fontWeight="medium" color="gray.600" minW="120px">
                      Expires:
                    </Text>
                    <Text color={isExpired ? "red.600" : "gray.800"} fontWeight={isExpired ? "semibold" : "normal"}>
                      {formatDate(account.expiresAt)}
                    </Text>
                  </HStack>

                  <HStack>
                    <Icon as={FiClock} color="gray.600" />
                    <Text fontWeight="medium" color="gray.600" minW="120px">
                      Updated:
                    </Text>
                    <Text color="gray.800">
                      {formatDate(account.updatedAt)}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>

              <Separator />

              {/* Scopes */}
              <VStack align="stretch" gap={4}>
                <HStack justify="space-between" align="center">
                  <Heading size="md" color="gray.700">
                    Permissions & Scopes
                  </Heading>
                  <Badge
                    colorPalette={accountScopes.length > 0 ? 'blue' : 'gray'}
                    variant="subtle"
                    fontSize="sm"
                  >
                    {accountScopes.length} permissions granted
                  </Badge>
                </HStack>

                {accountScopes.length > 0 ? (
                  <VStack align="stretch" gap={4}>
                    {Object.keys(SCOPE_CATEGORIES).map((categoryKey) => (
                      <EbayScopeCategory
                        key={categoryKey}
                        categoryKey={categoryKey}
                        isExpanded={expandedCategories.includes(categoryKey)}
                        onToggle={() => handleCategoryToggle(categoryKey)}
                        selectedScopes={scopeIds}
                        onScopeToggle={() => {}} // Read-only mode
                        disabled={true}
                      />
                    ))}
                  </VStack>
                ) : (
                  <Box p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                    <HStack>
                      <Icon as={FiShield} color="gray.500" />
                      <Text fontSize="sm" color="gray.600" fontStyle="italic">
                        No specific scopes granted - Basic access only
                      </Text>
                    </HStack>
                  </Box>
                )}
              </VStack>

              {/* Tags */}
              {tags && tags.length > 0 && (
                <>
                  <Separator />
                  <VStack align="stretch" gap={4}>
                    <Heading size="md" color="gray.700">
                      Tags
                    </Heading>
                    <HStack gap={2} flexWrap="wrap">
                      {tags.map((tag: string, index: number) => (
                        <Badge key={index} colorPalette="orange" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </HStack>
                  </VStack>
                </>
              )}
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}