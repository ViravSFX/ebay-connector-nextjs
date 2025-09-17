'use client';

import {
  VStack,
  HStack,
  Text,
  Badge,
  Heading,
  Icon,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  Button,
  Separator,
  Box,
} from '@chakra-ui/react';
import { FiGlobe, FiUser, FiClock, FiTag, FiShield, FiCalendar } from 'react-icons/fi';
import { EbayAccount } from '@/app/hooks/useEbayAccounts';

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

  const isActive = account.status === 'active';
  const isExpired = new Date(account.expiresAt) < new Date();
  const environment = process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatScope = (scope: string) => {
    return scope.replace('https://api.ebay.com/oauth/api_scope', 'Basic API Access');
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="2xl">
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
                <Heading size="md" color="gray.700">
                  Permissions & Scopes
                </Heading>

                <Box>
                  {account.scopes.length > 0 ? (
                    <VStack align="stretch" gap={2}>
                      {account.scopes.map((scope, index) => (
                        <HStack key={index} p={3} bg="gray.50" borderRadius="md">
                          <Icon as={FiShield} color="blue.600" />
                          <Text fontSize="sm" color="gray.800">
                            {formatScope(scope)}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.500" fontStyle="italic">
                      No specific scopes granted - Basic access only
                    </Text>
                  )}
                </Box>
              </VStack>

              {/* Tags */}
              {account.tags && account.tags.length > 0 && (
                <>
                  <Separator />
                  <VStack align="stretch" gap={4}>
                    <Heading size="md" color="gray.700">
                      Tags
                    </Heading>
                    <HStack gap={2} flexWrap="wrap">
                      {account.tags.map((tag, index) => (
                        <Badge key={index} colorPalette="blue" variant="outline">
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