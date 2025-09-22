'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  IconButton,
  Alert,
  Code,
  Tooltip,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdPlayArrow,
  MdPause,
  MdContentCopy,
} from 'react-icons/md';
import { Table, TableAction, TableRef } from '@/app/components/table';
import { TableColumn } from '@/app/components/table/DataTable';
import { FilterConfig } from '@/app/hooks/useFilters';
import ApiTokenModal from '@/app/components/modals/ApiTokenModal';

interface ApiToken {
  id: string;
  name: string;
  token: string;
  permissions: {
    endpoints?: string[];
    rateLimit?: number;
  };
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ApiTokensPage() {
  const router = useRouter();

  // Table ref for refetching data
  const tableRef = useRef<TableRef>(null);

  // UI states
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [showFullTokens, setShowFullTokens] = useState<Record<string, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusBadge = (token: ApiToken) => {
    if (!token.isActive) {
      return <Badge colorPalette="gray">Inactive</Badge>;
    }

    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      return <Badge colorPalette="red">Expired</Badge>;
    }

    return <Badge colorPalette="green">Active</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  // Handle creating new token
  const handleCreateToken = async (data: any) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Show the newly created token
        setNewlyCreatedToken(result.data.token);
        setShowCreateModal(false);

        // Trigger table refresh to show the new token
        if (tableRef.current) {
          await tableRef.current.refetch();
        }
      } else {
        console.error('Failed to create token:', result.message);
      }
    } catch (error) {
      console.error('Error creating token:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Table column configuration (without actions - they're handled by the Table component now)
  const columns: TableColumn<ApiToken>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (token) => (
        <Box>
          <Text fontWeight="medium">{token.name}</Text>
          <Text fontSize="sm" color="gray.500">
            Created {formatDate(token.createdAt)}
          </Text>
        </Box>
      ),
    },
    {
      key: 'token',
      header: 'Token',
      render: (token) => (
        <HStack gap={2}>
          <Code fontSize="xs" maxW="200px" truncate>
            {showFullTokens[token.id] ? token.token : `${token.token.substring(0, 20)}...`}
          </Code>
        </HStack>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (token) => getStatusBadge(token),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (token) => (
        <Box>
          <Text fontSize="sm">{token.permissions.endpoints?.length || 0} endpoints</Text>
          <Text fontSize="xs" color="gray.500">
            Rate limit: {token.permissions.rateLimit || 1000}/hour
          </Text>
        </Box>
      ),
    },
    {
      key: 'lastUsedAt',
      header: 'Last Used',
      sortable: true,
      render: (token) => (
        <Text fontSize="sm">{formatDate(token.lastUsedAt)}</Text>
      ),
    },
  ];

  // Table actions configuration - this is where the magic happens!
  const actions: TableAction<ApiToken>[] = [
    {
      key: 'edit',
      label: 'Edit token',
      icon: MdEdit,
      type: 'edit',
      modalComponent: ApiTokenModal,
      editEndpoint: '/api/tokens/{id}',
      variant: 'ghost',
    },
    {
      key: 'status',
      label: 'Toggle status',
      type: 'switch',
      statusEndpoint: '/api/tokens/{id}/status',
      statusField: 'isActive',
      activeLabel: 'Deactivate',
      inactiveLabel: 'Activate',
      itemNameField: 'name',
    },
    {
      key: 'delete',
      label: 'Delete token',
      icon: MdDelete,
      type: 'delete',
      deleteEndpoint: '/api/tokens/{id}',
      itemNameField: 'name',
      variant: 'ghost',
      colorPalette: 'red',
    },
  ];

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Name',
      type: 'search',
      placeholder: 'Search tokens by name...',
    },
    {
      key: 'isActive',
      label: 'Status',
      type: 'select',
      placeholder: 'All Status',
      options: [
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' }
      ],
    },
  ];

  // Header actions
  const headerActions = (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button colorPalette="orange" onClick={() => setShowCreateModal(true)}>
          <MdAdd style={{ marginRight: '8px' }} />
          Create Token
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>
          Create a new API token for accessing the eBay Connector API
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );

  return (
    <Box p={8}>
      <VStack gap={6} align="stretch">
        {/* New Token Alert */}
        {newlyCreatedToken && (
          <Alert.Root status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Token Created Successfully!</Alert.Title>
              <Alert.Description>
                <VStack align="start" gap={2} mt={2}>
                  <Text fontSize="sm">
                    Your new API token has been created. Copy it now as it won't be shown again:
                  </Text>
                  <HStack gap={2}>
                    <Code
                      p={2}
                      bg="gray.50"
                      borderRadius="md"
                      fontSize="sm"
                      fontFamily="mono"
                      wordBreak="break-all"
                    >
                      {newlyCreatedToken}
                    </Code>
                    <IconButton
                      aria-label="Copy token"
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(newlyCreatedToken)}
                    >
                      <MdContentCopy />
                    </IconButton>
                  </HStack>
                </VStack>
              </Alert.Description>
            </Alert.Content>
            <IconButton
              aria-label="Close"
              size="sm"
              variant="ghost"
              position="absolute"
              top={2}
              right={2}
              onClick={() => setNewlyCreatedToken(null)}
            >
              ×
            </IconButton>
          </Alert.Root>
        )}

        {/* Unified Table Component with Built-in Actions */}
        <Table
          ref={tableRef}
          endpoint="/api/tokens"
          title="API Token Management"
          description="Create and manage API tokens for accessing the eBay Connector API"
          columns={columns}
          actions={actions}
          filterConfigs={filterConfigs}
          headerActions={headerActions}
          initialPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
        />

        {/* Create Token Modal */}
        {showCreateModal && (
          <ApiTokenModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateToken}
            isSubmitting={isCreating}
          />
        )}
      </VStack>
    </Box>
  );
}