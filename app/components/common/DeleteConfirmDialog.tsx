'use client';

import {
  Dialog,
  Button,
  VStack,
  HStack,
  Text,
  Alert,
} from '@chakra-ui/react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  itemType?: string;
  description?: string;
  isDeleting?: boolean;
  customWarning?: string;
}

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = 'item',
  description,
  isDeleting = false,
  customWarning,
}: DeleteConfirmDialogProps) {
  const defaultTitle = `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;
  const defaultDescription = `Are you sure you want to delete ${itemType.toLowerCase()}`;
  const defaultWarning = `This action cannot be undone. The ${itemType.toLowerCase()} will be permanently removed from the system.`;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && handleClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="md">
          <Dialog.Header>
            <Dialog.Title color="red.600">
              {title || defaultTitle}
            </Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Text>
                {description || defaultDescription}{' '}
                <Text as="span" fontWeight="bold" color="red.600">
                  {itemName}
                </Text>
                ?
              </Text>

              <Alert.Root status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    {customWarning || defaultWarning}
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={3} justify="end" w="full">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                colorPalette="red"
                onClick={handleConfirm}
                loading={isDeleting}
                loadingText="Deleting..."
              >
                Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}