"use client";

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
    Text,
    Box,
    Checkbox,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { AVAILABLE_ENDPOINTS, DEFAULT_ENDPOINTS } from "@/app/lib/config/endpoints";

interface CreateApiTokenData {
    name: string;
    permissions?: {
        endpoints?: string[];
        rateLimit?: number;
    };
    scopes?: string[];
    expiresAt?: string;
}

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

interface ApiTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateApiTokenData) => void;
    token?: ApiToken | null;
    isSubmitting: boolean;
}


export default function ApiTokenModal({
    isOpen,
    onClose,
    onSubmit,
    token,
    isSubmitting,
}: ApiTokenModalProps) {
    const isEditing = !!token;

    // Helper function to format date for input field
    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) return "";

            // Use local date to avoid timezone issues with date input field
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Date formatting error:', error, 'Input:', dateString);
            return "";
        }
    };

    const [formData, setFormData] = useState<CreateApiTokenData>({
        name: token?.name || "",
        permissions: {
            endpoints: token?.permissions?.endpoints || DEFAULT_ENDPOINTS,
            rateLimit: token?.permissions?.rateLimit || 1000,
        },
        expiresAt: formatDateForInput(token?.expiresAt),
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Update form data when token prop changes (for editing)
    useEffect(() => {
        if (token) {
            setFormData({
                name: token.name || "",
                permissions: {
                    endpoints: token.permissions?.endpoints || DEFAULT_ENDPOINTS,
                    rateLimit: token.permissions?.rateLimit || 1000,
                },
                expiresAt: formatDateForInput(token.expiresAt),
            });
        } else {
            // Reset to defaults when creating new token
            setFormData({
                name: "",
                permissions: {
                    endpoints: DEFAULT_ENDPOINTS,
                    rateLimit: 1000,
                },
                expiresAt: "",
            });
        }
        // Clear any existing errors when switching tokens
        setErrors({});
    }, [token]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Record<string, string> = {};

        if (!formData.name) {
            newErrors.name = "Token name is required";
        } else if (formData.name.length > 100) {
            newErrors.name = "Token name must be less than 100 characters";
        }

        if (formData.permissions?.rateLimit && formData.permissions.rateLimit < 1) {
            newErrors.rateLimit = "Rate limit must be at least 1";
        }

        if (formData.permissions?.rateLimit && formData.permissions.rateLimit > 10000) {
            newErrors.rateLimit = "Rate limit cannot exceed 10,000 requests per hour";
        }

        if (formData.expiresAt && new Date(formData.expiresAt) <= new Date()) {
            newErrors.expiresAt = "Expiration date must be in the future";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});

        const submitData: CreateApiTokenData = {
            name: formData.name.trim(),
            permissions: {
                endpoints: formData.permissions?.endpoints || [],
                rateLimit: formData.permissions?.rateLimit || 1000,
            },
        };

        if (formData.expiresAt) {
            submitData.expiresAt = new Date(formData.expiresAt).toISOString();
        }

        onSubmit(submitData);
    };

    const handleClose = () => {
        setFormData({
            name: "",
            permissions: {
                endpoints: DEFAULT_ENDPOINTS,
                rateLimit: 1000,
            },
            expiresAt: "",
        });
        setErrors({});
        onClose();
    };

    const handleEndpointChange = (endpoint: string, checked: boolean) => {
        const currentEndpoints = formData.permissions?.endpoints || [];
        let newEndpoints;

        if (checked) {
            newEndpoints = [...currentEndpoints, endpoint];
        } else {
            newEndpoints = currentEndpoints.filter(e => e !== endpoint);
        }

        setFormData({
            ...formData,
            permissions: {
                ...formData.permissions,
                endpoints: newEndpoints,
            },
        });
    };

    const handleRateLimitChange = (details: { valueAsString: string; valueAsNumber: number }) => {
        setFormData({
            ...formData,
            permissions: {
                ...formData.permissions,
                rateLimit: details.valueAsNumber || 1000,
            },
        });
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={() => handleClose()}>
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content maxW="8/12" p={6}>
                    <Dialog.Header>
                        <Dialog.Title fontSize="xl" fontWeight="bold">
                            {isEditing ? "Edit API Token" : "Create New API Token"}
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
                                        <GridItem colSpan={2}>
                                            <Field.Root invalid={!!errors.name}>
                                                <Field.Label>Token Name</Field.Label>
                                                <Input
                                                    value={formData.name}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            name: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Enter a descriptive name for this token"
                                                />
                                                {errors.name && (
                                                    <Field.ErrorText>
                                                        {errors.name}
                                                    </Field.ErrorText>
                                                )}
                                                <Field.HelperText>
                                                    Choose a name that helps you identify where this token is used
                                                </Field.HelperText>
                                            </Field.Root>
                                        </GridItem>

                                        <GridItem>
                                            <Field.Root invalid={!!errors.expiresAt}>
                                                <Field.Label>Expiration Date (Optional)</Field.Label>
                                                <Input
                                                    type="date"
                                                    value={formData.expiresAt}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            expiresAt: e.target.value,
                                                        })
                                                    }
                                                />
                                                {errors.expiresAt && (
                                                    <Field.ErrorText>
                                                        {errors.expiresAt}
                                                    </Field.ErrorText>
                                                )}
                                                <Field.HelperText>
                                                    Leave blank for no expiration
                                                </Field.HelperText>
                                            </Field.Root>
                                        </GridItem>

                                        <GridItem>
                                            <Field.Root invalid={!!errors.rateLimit}>
                                                <Field.Label>Rate Limit (requests/hour)</Field.Label>
                                                <Input
                                                    type="number"
                                                    value={formData.permissions?.rateLimit?.toString() || "1000"}
                                                    onChange={(e) => handleRateLimitChange({ valueAsString: e.target.value, valueAsNumber: parseInt(e.target.value) || 1000 })}
                                                    min={1}
                                                    max={10000}
                                                    placeholder="1000"
                                                />
                                                {errors.rateLimit && (
                                                    <Field.ErrorText>
                                                        {errors.rateLimit}
                                                    </Field.ErrorText>
                                                )}
                                                <Field.HelperText>
                                                    Maximum API requests per hour
                                                </Field.HelperText>
                                            </Field.Root>
                                        </GridItem>
                                    </Grid>
                                </VStack>

                                {/* Permissions Section */}
                                <VStack align="stretch" gap={4}>
                                    <Heading size="md" color="gray.700">
                                        API Permissions
                                    </Heading>

                                    <Box>
                                        <Text fontSize="sm" color="gray.600" mb={3}>
                                            Select which API endpoints this token can access:
                                        </Text>
                                        <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                            {AVAILABLE_ENDPOINTS.map((endpoint) => (
                                                <GridItem key={endpoint.id}>
                                                    <Checkbox.Root
                                                        checked={formData.permissions?.endpoints?.includes(endpoint.id) || false}
                                                        onCheckedChange={(details) => handleEndpointChange(endpoint.id, !!details.checked)}
                                                    >
                                                        <Checkbox.HiddenInput />
                                                        <Checkbox.Control />
                                                        <Checkbox.Label>
                                                            <VStack align="start" gap={0}>
                                                                <Text fontSize="sm" fontWeight="medium">
                                                                    {endpoint.name}
                                                                </Text>
                                                                <Text fontSize="xs" color="gray.500">
                                                                    {endpoint.description}
                                                                </Text>
                                                                <Text fontSize="xs" color="orange.500" fontWeight="medium">
                                                                    {endpoint.id}
                                                                </Text>
                                                            </VStack>
                                                        </Checkbox.Label>
                                                    </Checkbox.Root>
                                                </GridItem>
                                            ))}
                                        </Grid>
                                        <Text fontSize="xs" color="gray.500" mt={2}>
                                            Token will only be able to access the selected API endpoints
                                        </Text>
                                    </Box>
                                </VStack>

                                {!isEditing && (
                                    <Box
                                        p={4}
                                        bg="orange.50"
                                        borderRadius="md"
                                        borderLeft="4px solid"
                                        borderLeftColor="orange.400"
                                    >
                                        <Text fontSize="sm" color="orange.800" fontWeight="medium">
                                            🔒 Security Notice
                                        </Text>
                                        <Text fontSize="sm" color="orange.700" mt={1}>
                                            Your token will be shown only once after creation. Make sure to copy and store it securely.
                                        </Text>
                                    </Box>
                                )}
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
                                loadingText={
                                    isEditing ? "Updating..." : "Creating..."
                                }
                            >
                                {isEditing ? "Update Token" : "Create Token"}
                            </Button>
                        </HStack>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
}