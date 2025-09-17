'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Table,
  Badge,
  IconButton,
  Alert,
  Spinner,
  Flex,
  Input,
  Card,
  Code,
  Tooltip,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdSearch,
  MdContentCopy,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import axios from 'axios';
import ApiTokenModal from '@/app/components/modals/ApiTokenModal';
import DeleteConfirmDialog from '@/app/components/common/DeleteConfirmDialog';

interface ApiToken {
  id: string;
  name: string;
  token: string; // Sanitized version with only partial token shown
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

interface CreateApiTokenData {
  name: string;
  permissions?: {
    endpoints?: string[];
    rateLimit?: number;
  };
  expiresAt?: string;
}

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<ApiToken | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<ApiToken | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFullTokens, setShowFullTokens] = useState<Record<string, boolean>>({});
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tokens');
      if (response.data.success) {
        setTokens(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch API tokens');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch API tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (formData: CreateApiTokenData) => {
    try {
      setSubmitting(true);

      if (editingToken) {
        // Update existing token
        const response = await axios.put(`/api/tokens/${editingToken.id}`, formData);
        if (response.data.success) {
          setTokens(tokens.map(token =>
            token.id === editingToken.id ? { ...token, ...response.data.data } : token
          ));
          handleModalClose();
        } else {
          setError(response.data.message || 'Failed to update token');
        }
      } else {
        // Create new token
        const response = await axios.post('/api/tokens', formData);
        if (response.data.success) {
          const newToken = response.data.data;
          setNewlyCreatedToken(newToken.token); // Store the full token for display

          // Add the token to the list with sanitized version
          setTokens([
            {
              ...newToken,
              token: `${newToken.token.substring(0, 12)}...${newToken.token.substring(newToken.token.length - 4)}`
            },
            ...tokens
          ]);
          handleModalClose();
        } else {
          setError(response.data.message || 'Failed to create token');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save token');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (token: ApiToken) => {
    setTokenToDelete(token);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setTokenToDelete(null);
    setIsDeleting(false);
  };

  const handleDeleteToken = async () => {
    if (!tokenToDelete) return;

    try {
      setIsDeleting(true);
      const response = await axios.delete(`/api/tokens/${tokenToDelete.id}`);
      if (response.data.success) {
        setTokens(tokens.filter(t => t.id !== tokenToDelete.id));
        closeDeleteDialog();
      } else {
        setError(response.data.message || 'Failed to delete token');
        setIsDeleting(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete token');
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingToken(null);
  };

  const openCreateModal = () => {
    setEditingToken(null);
    setIsModalOpen(true);
  };

  const openEditModal = (token: ApiToken) => {
    setEditingToken(token);
    setIsModalOpen(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleTokenVisibility = (tokenId: string) => {
    setShowFullTokens(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? 'green' : 'gray';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredTokens = tokens.filter(token => {
    const matchesSearch =
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.token.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <Flex minH="400px" align="center" justify="center">
        <VStack gap={4}>
          <Spinner size="xl" colorPalette="blue" />
          <Text>Loading API tokens...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box p={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <VStack align="start" gap={1}>
            <Heading size="xl" color="gray.800">API Token Management</Heading>
            <Text color="gray.600">Manage API tokens for external integrations</Text>
          </VStack>
          <HStack gap={3}>
            <IconButton
              aria-label="Refresh"
              variant="ghost"
              onClick={fetchTokens}
            >
              <MdRefresh />
            </IconButton>
            <Button
              colorPalette="orange"
              onClick={openCreateModal}
            >
              <MdAdd style={{ marginRight: '8px' }} />
              Create Token
            </Button>
          </HStack>
        </HStack>

        {/* Error Alert */}
        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
            <IconButton
              aria-label="Close"
              size="sm"
              variant="ghost"
              position="absolute"
              top={2}
              right={2}
              onClick={() => setError('')}
            >
              ×
            </IconButton>
          </Alert.Root>
        )}

        {/* New Token Alert */}
        {newlyCreatedToken && (
          <Alert.Root status="success" borderRadius="md">
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

        {/* Search */}
        <Card.Root>
          <Card.Body p={6}>
            <HStack justify="space-between" align="center">
              <Box position="relative">
                <Input
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  pl={10}
                  w="300px"
                />
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
                  <MdSearch color="gray.400" />
                </Box>
              </Box>
              <Text color="gray.600" fontSize="sm">
                {filteredTokens.length} of {tokens.length} tokens
              </Text>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Tokens Table */}
        <Card.Root>
          <Table.Root variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Token</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Last Used</Table.ColumnHeader>
                <Table.ColumnHeader>Expires</Table.ColumnHeader>
                <Table.ColumnHeader w="120px">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredTokens.map((token) => (
                <Table.Row key={token.id}>
                  <Table.Cell>
                    <Text fontWeight="medium" color="gray.900">
                      {token.name}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap={2}>
                      <Code
                        fontSize="xs"
                        fontFamily="mono"
                        p={1}
                        bg="gray.50"
                        borderRadius="sm"
                      >
                        {token.token}
                      </Code>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette={getStatusBadgeColor(token.isActive && !isTokenExpired(token.expiresAt))}
                      size="sm"
                    >
                      {isTokenExpired(token.expiresAt) ? 'Expired' : getStatusText(token.isActive)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="gray.600">
                      {formatDate(token.lastUsedAt)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="gray.600">
                      {formatDate(token.expiresAt)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap={1}>
                      <IconButton
                        aria-label="Edit token"
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(token)}
                      >
                        <MdEdit />
                      </IconButton>
                      <IconButton
                        aria-label="Delete token"
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => openDeleteDialog(token)}
                      >
                        <MdDelete />
                      </IconButton>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          {filteredTokens.length === 0 && (
            <Box p={8} textAlign="center">
              <Text color="gray.500">
                {searchTerm ? 'No tokens found matching your search.' : 'No API tokens found.'}
              </Text>
            </Box>
          )}
        </Card.Root>

        {/* Token Modal */}
        <ApiTokenModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleTokenSubmit}
          token={editingToken}
          isSubmitting={submitting}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleDeleteToken}
          itemName={tokenToDelete?.name || ''}
          itemType="API token"
          isDeleting={isDeleting}
        />
      </VStack>
    </Box>
  );
}