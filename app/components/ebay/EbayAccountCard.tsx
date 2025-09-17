'use client';

import {
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Badge,
  Heading,
  Icon,
  Switch,
  Box,
} from '@chakra-ui/react';
import { MdDelete, MdVisibility } from 'react-icons/md';
import { FiGlobe, FiUser, FiClock, FiTag } from 'react-icons/fi';
import { EbayAccount } from '@/app/hooks/useEbayAccounts';

interface EbayAccountCardProps {
  account: EbayAccount;
  onView?: (account: EbayAccount) => void;
  onReconnect?: (accountId: string) => void;
  onToggleStatus?: (accountId: string, isActive: boolean) => void;
  onDelete?: (accountId: string) => void;
  isDisabled?: boolean;
  isReconnecting?: boolean;
  isDeleting?: boolean;
}

export default function EbayAccountCard({
  account,
  onView,
  onReconnect,
  onToggleStatus,
  onDelete,
  isDisabled = false,
  isReconnecting = false,
  isDeleting = false,
}: EbayAccountCardProps) {
  const isActive = account.status === 'active';
  const isExpired = new Date(account.expiresAt) < new Date();
  const environment = process.env.EBAY_SANDBOX === 'true' ? 'sandbox' : 'production';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const displayName = account.friendlyName || account.ebayUsername || account.ebayUserId;

  return (
    <Card.Root
      position="relative"
      maxW="380px"
      bg="white"
      borderRadius="16px"
      shadow="lg"
      border="1px solid"
      borderColor="gray.100"
      overflow="hidden"
      cursor="pointer"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      transform="translateY(0)"
      _hover={{
        transform: isDisabled ? 'translateY(0)' : 'translateY(-8px)',
        shadow: isDisabled ? 'lg' : '2xl',
        borderColor: isDisabled ? 'gray.100' : '#FF7A00',
      }}
      opacity={isDisabled ? 0.7 : 1}
      onClick={() => onView?.(account)}
    >
      <Card.Body p={6}>
        <VStack align="stretch" gap={4}>
          {/* Header Section */}
          <Box>
            <HStack justify="space-between" align="start" mb={3}>
              <VStack align="start" gap={1}>
                <Heading
                  size="md"
                  color={isDisabled ? 'gray.500' : 'gray.800'}
                  fontWeight="600"
                  letterSpacing="-0.025em"
                >
                  {displayName}
                </Heading>
                {account.friendlyName && account.ebayUsername && (
                  <HStack>
                    <Icon as={FiUser} color="gray.400" size="sm" />
                    <Text fontSize="sm" color="gray.500" fontFamily="mono">
                      @{account.ebayUsername}
                    </Text>
                  </HStack>
                )}
              </VStack>
              <Box
                w="12px"
                h="12px"
                borderRadius="full"
                bg={isActive ? 'green.400' : 'gray.300'}
                shadow="sm"
              />
            </HStack>
          </Box>

          {/* Stats Section */}
          <Box bg="gray.50" p={4} borderRadius="12px" border="1px solid" borderColor="gray.100">
            <HStack justify="space-between">
              <VStack align="start" gap={1}>
                <Text fontSize="xs" color="gray.500" fontWeight="500" textTransform="uppercase">
                  Environment
                </Text>
                <Badge
                  colorPalette={environment === 'production' ? 'red' : 'yellow'}
                  variant="solid"
                  fontSize="xs"
                  borderRadius="6px"
                >
                  {environment.toUpperCase()}
                </Badge>
              </VStack>

              <VStack align="center" gap={1}>
                <Text fontSize="xs" color="gray.500" fontWeight="500" textTransform="uppercase">
                  Status
                </Text>
                <Badge
                  colorPalette={isActive ? 'green' : 'gray'}
                  variant="solid"
                  fontSize="xs"
                  borderRadius="6px"
                >
                  {isActive ? 'Active' : 'Disabled'}
                </Badge>
              </VStack>

              {isExpired && (
                <VStack align="end" gap={1}>
                  <Text fontSize="xs" color="gray.500" fontWeight="500" textTransform="uppercase">
                    Token
                  </Text>
                  <Badge
                    colorPalette="red"
                    variant="solid"
                    fontSize="xs"
                    borderRadius="6px"
                  >
                    Expired
                  </Badge>
                </VStack>
              )}
            </HStack>
          </Box>

          {/* Connection Details */}
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between">
              <HStack>
                <Icon as={FiGlobe} color="blue.500" size="sm" />
                <VStack align="start" gap={0}>
                  <Text fontSize="xs" color="gray.500" fontWeight="500">
                    User ID
                  </Text>
                  <Text fontSize="sm" color="gray.700" fontFamily="mono" fontWeight="500">
                    {account.ebayUserId}
                  </Text>
                </VStack>
              </HStack>
              <HStack>
                <Icon as={FiClock} color="purple.500" size="sm" />
                <VStack align="end" gap={0}>
                  <Text fontSize="xs" color="gray.500" fontWeight="500">
                    Connected
                  </Text>
                  <Text fontSize="sm" color="gray.700" fontWeight="500">
                    {formatDate(account.createdAt)}
                  </Text>
                </VStack>
              </HStack>
            </HStack>
          </VStack>

          {/* Action Buttons */}
          <VStack gap={3}>
            <Button
              w="full"
              colorPalette="blue"
              variant="subtle"
              size="sm"
              borderRadius="10px"
              disabled={isDisabled}
              loading={isReconnecting}
              loadingText="Reconnecting..."
              onClick={(e) => {
                e.stopPropagation();
                onReconnect?.(account.id);
              }}
            >
              Reconnect Account
            </Button>

            <HStack justify="space-between" w="full">
              <Box onClick={(e) => e.stopPropagation()}>
                <Switch.Root
                  size="sm"
                  checked={isActive}
                  colorPalette="green"
                  onCheckedChange={(checked) => onToggleStatus?.(account.id, checked.checked)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control />
                  <Switch.Label fontSize="sm" ml={2} fontWeight="500">
                    {isActive ? 'Active' : 'Inactive'}
                  </Switch.Label>
                </Switch.Root>
              </Box>

              <Button
                size="sm"
                variant="ghost"
                colorPalette="red"
                borderRadius="8px"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(account.id);
                }}
                loading={isDeleting}
              >
                <MdDelete />
              </Button>
            </HStack>
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}