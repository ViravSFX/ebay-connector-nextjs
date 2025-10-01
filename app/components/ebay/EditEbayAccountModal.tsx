'use client';

import {
  Dialog,
  Field,
  Input,
  Button,
  VStack,
  HStack,
  Grid,
  GridItem,
  Heading,
  Badge,
  Text,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import EbayScopeSelector from './EbayScopeSelector';
import { EbayAccount } from '@/app/hooks/useEbayAccounts';
import { DEFAULT_SCOPES, EBAY_OAUTH_SCOPES } from '@/app/lib/constants/ebayScopes';

interface EditEbayAccountFormData {
  friendlyName: string;
  tags: string[];
  ebayUsername?: string;
  selectedScopes: string[];
}

interface EditEbayAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditEbayAccountFormData) => void;
  isSubmitting: boolean;
  account: EbayAccount | null;
}

export default function EditEbayAccountModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  account,
}: EditEbayAccountModalProps) {
  const [formData, setFormData] = useState<EditEbayAccountFormData>({
    friendlyName: '',
    tags: [],
    ebayUsername: '',
    selectedScopes: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (account && isOpen) {
      // Parse JSON fields safely
      const parseTags = (tags: any): string[] => {
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string') {
          try {
            const parsed = JSON.parse(tags);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const parseScopes = (scopes: any): string[] => {
        let parsedScopes: string[] = [];

        if (Array.isArray(scopes)) {
          parsedScopes = scopes;
        } else if (typeof scopes === 'string') {
          try {
            const parsed = JSON.parse(scopes);
            parsedScopes = Array.isArray(parsed) ? parsed : [];
          } catch {
            parsedScopes = [];
          }
        }

        // Convert URLs to scope IDs using EBAY_OAUTH_SCOPES mapping
        const scopeIds = parsedScopes.map(scope => {
          // If it's already an ID, keep it
          if (EBAY_OAUTH_SCOPES.find(s => s.id === scope)) {
            return scope;
          }
          // If it's a URL, convert to ID
          const scopeObj = EBAY_OAUTH_SCOPES.find(s => s.url === scope);
          return scopeObj ? scopeObj.id : scope;
        }).filter(Boolean);

        // Add missing required scopes using DEFAULT_SCOPES
        const missingRequiredScopes = DEFAULT_SCOPES.filter(
          scopeId => !scopeIds.includes(scopeId)
        );

        console.log('EditEbayAccountModal - Original scopes:', parsedScopes);
        console.log('EditEbayAccountModal - Converted scope IDs:', scopeIds);
        console.log('EditEbayAccountModal - Final scopes with required:', [...scopeIds, ...missingRequiredScopes]);

        return [...scopeIds, ...missingRequiredScopes];
      };

      setFormData({
        friendlyName: account.friendlyName || '',
        tags: parseTags(account.tags),
        ebayUsername: account.ebayUsername || '',
        selectedScopes: parseScopes(account.userSelectedScopes),
      });
    }
  }, [account, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.friendlyName) {
      newErrors.friendlyName = 'Friendly name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const handleClose = () => {
    setErrors({});
    setTagInput('');
    onClose();
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={() => handleClose()} scrollBehavior="inside">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="11/12" p={6}>
          <Dialog.Header>
            <Dialog.Title fontSize="xl" fontWeight="bold">
              Edit eBay Account
            </Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            <form onSubmit={handleSubmit}>
              <VStack gap={6} align="stretch">
                {/* Basic Information Section */}
                <VStack align="stretch" gap={4}>
                  <Heading size="md" color="gray.700">
                    Basic Information
                  </Heading>

                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <Field.Root invalid={!!errors.friendlyName}>
                        <Field.Label>Friendly Name *</Field.Label>
                        <Input
                          value={formData.friendlyName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              friendlyName: e.target.value,
                            })
                          }
                          placeholder="e.g., Main Store Account"
                        />
                        {errors.friendlyName && (
                          <Field.ErrorText>
                            {errors.friendlyName}
                          </Field.ErrorText>
                        )}
                      </Field.Root>
                    </GridItem>

                    <GridItem>
                      <Field.Root>
                        <Field.Label>eBay Username (Optional)</Field.Label>
                        <Input
                          value={formData.ebayUsername}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ebayUsername: e.target.value,
                            })
                          }
                          placeholder="Your eBay username"
                        />
                        <Field.HelperText>
                          If known, helps with identification
                        </Field.HelperText>
                      </Field.Root>
                    </GridItem>
                  </Grid>

                </VStack>

                {/* Organization Section */}
                <VStack align="stretch" gap={4}>
                  <Heading size="md" color="gray.700">
                    Organization
                  </Heading>

                  <Field.Root>
                    <Field.Label>Tags</Field.Label>
                    <HStack>
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add a tag (e.g., electronics, books)"
                        onKeyDown={handleTagInputKeyDown}
                      />
                      <Button
                        variant="outline"
                        onClick={addTag}
                        disabled={!tagInput.trim()}
                      >
                        Add
                      </Button>
                    </HStack>
                    <Field.HelperText>
                      Tags help organize and filter your accounts
                    </Field.HelperText>
                  </Field.Root>

                  {formData.tags.length > 0 && (
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.600">
                        Current Tags:
                      </Text>
                      <HStack gap={2} flexWrap="wrap">
                        {formData.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            colorPalette="blue"
                            variant="subtle"
                            fontSize="sm"
                            px={3}
                            py={1}
                            cursor="pointer"
                            onClick={() => removeTag(tag)}
                            _hover={{ bg: 'red.100', colorPalette: 'red' }}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        Click on a tag to remove it
                      </Text>
                    </VStack>
                  )}
                </VStack>

                {/* eBay Permissions Section */}
                <EbayScopeSelector
                  selectedScopes={formData.selectedScopes}
                  onScopeChange={(scopes) => setFormData({ ...formData, selectedScopes: scopes })}
                  disabled={isSubmitting}
                />

                {/* Update Info */}
                <VStack align="stretch" gap={4}>
                  <Heading size="md" color="gray.700">
                    Important Notes
                  </Heading>
                  <VStack align="stretch" gap={3} p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                    <Text fontSize="sm" fontWeight="medium" color="blue.800">
                      About updating permissions:
                    </Text>
                    <VStack align="stretch" gap={1} fontSize="sm" color="blue.700">
                      <Text>• Changing scopes may require re-authentication with eBay</Text>
                      <Text>• You may need to reconnect the account after saving changes</Text>
                      <Text>• Current tokens will remain valid until they expire</Text>
                    </VStack>
                  </VStack>
                </VStack>
              </VStack>
            </form>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={3} justify="flex-end" w="full">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                colorPalette="blue"
                onClick={handleSubmit}
                loading={isSubmitting}
                loadingText="Updating..."
              >
                Update Account
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}