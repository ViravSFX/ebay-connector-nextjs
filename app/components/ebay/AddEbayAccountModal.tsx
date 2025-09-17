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
  Select,
  Textarea,
  Badge,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';

interface EbayAccountFormData {
  friendlyName: string;
  description?: string;
  tags: string[];
  ebayUsername?: string;
}

interface AddEbayAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EbayAccountFormData) => void;
  isSubmitting: boolean;
}

export default function AddEbayAccountModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: AddEbayAccountModalProps) {
  const [formData, setFormData] = useState<EbayAccountFormData>({
    friendlyName: '',
    description: '',
    tags: [],
    ebayUsername: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

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
    setFormData({
      friendlyName: '',
      description: '',
      tags: [],
      ebayUsername: '',
    });
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

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={() => handleClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="2xl" p={6}>
          <Dialog.Header>
            <Dialog.Title fontSize="xl" fontWeight="bold">
              Add eBay Account
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

                  <Field.Root>
                    <Field.Label>Description (Optional)</Field.Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe this eBay account's purpose or usage..."
                      rows={3}
                    />
                  </Field.Root>
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
                        onKeyPress={handleTagInputKeyPress}
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

                {/* Connection Info */}
                <VStack align="stretch" gap={4}>
                  <Heading size="md" color="gray.700">
                    Next Steps
                  </Heading>
                  <VStack align="stretch" gap={3} p={4} bg="orange.50" borderRadius="md" border="1px solid" borderColor="orange.200">
                    <Text fontSize="sm" fontWeight="medium" color="orange.800">
                      After creating this account:
                    </Text>
                    <VStack align="stretch" gap={1} fontSize="sm" color="orange.700">
                      <Text>• Click "Reconnect Account" to authorize with eBay</Text>
                      <Text>• Complete the OAuth flow to link your eBay account</Text>
                      <Text>• Your account will be ready to use for API calls</Text>
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
                colorPalette="orange"
                onClick={handleSubmit}
                loading={isSubmitting}
                loadingText="Creating..."
              >
                Create Account
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}