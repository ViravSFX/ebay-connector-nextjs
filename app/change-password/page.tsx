"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Box,
    VStack,
    HStack,
    Heading,
    Text,
    Field,
    Input,
    Button,
    Alert,
    Card,
    Flex,
    Icon,
    Avatar,
} from "@chakra-ui/react";
import { FiLock, FiShield } from "react-icons/fi";
import axios from "axios";

interface PasswordChangeData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
}

export default function ChangePasswordPage() {
    const [user, setUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<PasswordChangeData>({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        // Check if user is logged in
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            // Redirect to login if no user found
            router.push("/login");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.newPassword !== formData.confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (formData.newPassword.length < 8) {
            setError("New password must be at least 8 characters long");
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post("/api/auth/change-password", {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });

            if (response.data.success) {
                // Redirect to dashboard after successful password change
                router.push("/dashboard");
            } else {
                setError(response.data.message || "Failed to change password");
            }
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                    "An error occurred while changing password"
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <Flex minH="100vh" align="center" justify="center" bg="gray.50" px={4}>
            <Box maxW="lg" w="full">
                <Card.Root shadow="xl" borderRadius="xl">
                    <Card.Body p={8}>
                        <VStack gap={6} align="stretch">
                            {/* Header */}
                            <VStack gap={4} textAlign="center">
                                <Box
                                    p={3}
                                    rounded="full"
                                    bg="red.100"
                                    color="red.500"
                                    display="inline-flex"
                                >
                                    <Icon as={FiLock} boxSize={6} />
                                </Box>
                                <Heading color="navy.800" size="lg">
                                    Password Change Required
                                </Heading>

                                {/* User Info */}
                                <VStack gap={2}>
                                    <HStack gap={3}>
                                        <Avatar.Root size="sm" bg="orange.500">
                                            <Avatar.Fallback
                                                name={user?.name || user?.email}
                                            />
                                        </Avatar.Root>
                                        <Text
                                            color="gray.700"
                                            fontWeight="medium"
                                        >
                                            Hello, {user?.name || user?.email}
                                        </Text>
                                    </HStack>
                                    <Text color="gray.600" textAlign="center">
                                        For security reasons, you must change
                                        your password before continuing.
                                    </Text>
                                </VStack>
                            </VStack>

                            {/* Error Alert */}
                            {error && (
                                <Alert.Root status="error" borderRadius="md">
                                    <Alert.Indicator />
                                    <Alert.Content>
                                        <Alert.Description>
                                            {error}
                                        </Alert.Description>
                                    </Alert.Content>
                                </Alert.Root>
                            )}

                            {/* Password Change Form */}
                            <Box as="form" onSubmit={handleSubmit}>
                                <VStack gap={5}>
                                    <Field.Root required>
                                        <Field.Label color="gray.700">
                                            Current Password
                                        </Field.Label>
                                        <Input
                                            type="password"
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleInputChange}
                                            autoComplete="current-password"
                                            disabled={isLoading}
                                            size="lg"
                                        />
                                    </Field.Root>

                                    <Field.Root required>
                                        <Field.Label color="gray.700">
                                            New Password
                                        </Field.Label>
                                        <Input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleInputChange}
                                            autoComplete="new-password"
                                            disabled={isLoading}
                                            size="lg"
                                            minLength={8}
                                        />
                                        <Field.HelperText color="gray.600">
                                            Password must be at least 8
                                            characters long
                                        </Field.HelperText>
                                    </Field.Root>

                                    <Field.Root required>
                                        <Field.Label color="gray.700">
                                            Confirm New Password
                                        </Field.Label>
                                        <Input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            autoComplete="new-password"
                                            disabled={isLoading}
                                            size="lg"
                                            minLength={8}
                                        />
                                    </Field.Root>

                                    <Button
                                        type="submit"
                                        colorPalette="orange"
                                        size="lg"
                                        w="full"
                                        loading={isLoading}
                                        loadingText="Changing Password..."
                                    >
                                        <FiLock
                                            size={16}
                                            style={{ marginRight: "8px" }}
                                        />
                                        Change Password
                                    </Button>
                                </VStack>
                            </Box>

                            {/* Footer */}
                            <HStack gap={2} justify="center" pt={4}>
                                <Icon as={FiShield} color="green.500" />
                                <Text
                                    fontSize="sm"
                                    color="gray.600"
                                    textAlign="center"
                                >
                                    Your new password will be securely encrypted
                                    and stored.
                                </Text>
                            </HStack>
                        </VStack>
                    </Card.Body>
                </Card.Root>
            </Box>
        </Flex>
    );
}
