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
} from "@chakra-ui/react";
import { useState } from "react";
import RoleSelect from '@/app/components/common/RoleSelect';

interface UserFormData {
    email: string;
    name: string;
    role: string;
    password?: string;
    confirmPassword?: string;
}

interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
}

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: UserFormData) => void;
    user?: User | null;
    isSubmitting: boolean;
    currentUserRole: string;
}


export default function UserModal({
    isOpen,
    onClose,
    onSubmit,
    user,
    isSubmitting,
    currentUserRole,
}: UserModalProps) {
    const isEditing = !!user;
    const [formData, setFormData] = useState<UserFormData>({
        email: user?.email || "",
        name: user?.name || "",
        role: user?.role || "USER",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Record<string, string> = {};

        if (!formData.email) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Email is invalid";
        }

        if (!formData.name) {
            newErrors.name = "Name is required";
        }

        if (!isEditing) {
            if (!formData.password) {
                newErrors.password = "Password is required";
            } else if (formData.password.length < 6) {
                newErrors.password = "Password must be at least 6 characters";
            }

            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = "Passwords do not match";
            }
        } else if (formData.password && formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        } else if (
            formData.password &&
            formData.password !== formData.confirmPassword
        ) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});

        const submitData = { ...formData };
        if (isEditing && !formData.password) {
            delete submitData.password;
        }
        delete submitData.confirmPassword;

        onSubmit(submitData);
    };

    const handleClose = () => {
        setFormData({
            email: "",
            name: "",
            role: "USER",
            password: "",
            confirmPassword: "",
        });
        setErrors({});
        onClose();
    };


    return (
        <Dialog.Root open={isOpen} onOpenChange={() => handleClose()}>
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content maxW="2xl" p={6}>
                    <Dialog.Header>
                        <Dialog.Title fontSize="xl" fontWeight="bold">
                            {isEditing ? "Edit User" : "Create New User"}
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

                                    <Grid
                                        templateColumns="repeat(2, 1fr)"
                                        gap={4}
                                    >
                                        <GridItem>
                                            <Field.Root
                                                invalid={!!errors.email}
                                            >
                                                <Field.Label>Email</Field.Label>
                                                <Input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            email: e.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="Enter email address"
                                                />
                                                {errors.email && (
                                                    <Field.ErrorText>
                                                        {errors.email}
                                                    </Field.ErrorText>
                                                )}
                                            </Field.Root>
                                        </GridItem>

                                        <GridItem>
                                            <Field.Root invalid={!!errors.name}>
                                                <Field.Label>
                                                    Full Name
                                                </Field.Label>
                                                <Input
                                                    value={formData.name}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            name: e.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="Enter full name"
                                                />
                                                {errors.name && (
                                                    <Field.ErrorText>
                                                        {errors.name}
                                                    </Field.ErrorText>
                                                )}
                                            </Field.Root>
                                        </GridItem>
                                    </Grid>
                                </VStack>

                                {/* Permissions Section */}
                                <VStack align="stretch" gap={4}>
                                    <Heading size="md" color="gray.700">
                                        Permissions
                                    </Heading>

                                    <RoleSelect
                                        value={formData.role}
                                        onChange={(value) => setFormData({ ...formData, role: value })}
                                        label="Role"
                                        currentUserRole={currentUserRole}
                                        placeholder="Select role..."
                                    />
                                </VStack>

                                {/* Security Section */}
                                <VStack align="stretch" gap={4}>
                                    <Heading size="md" color="gray.700">
                                        Security
                                    </Heading>

                                    <Grid
                                        templateColumns="repeat(2, 1fr)"
                                        gap={4}
                                    >
                                        <GridItem>
                                            <Field.Root
                                                invalid={!!errors.password}
                                            >
                                                <Field.Label>
                                                    {isEditing
                                                        ? "New Password (Optional)"
                                                        : "Password"}
                                                </Field.Label>
                                                <Input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            password:
                                                                e.target.value,
                                                        })
                                                    }
                                                    placeholder={
                                                        isEditing
                                                            ? "Leave blank to keep current"
                                                            : "Enter password"
                                                    }
                                                />
                                                {errors.password && (
                                                    <Field.ErrorText>
                                                        {errors.password}
                                                    </Field.ErrorText>
                                                )}
                                            </Field.Root>
                                        </GridItem>

                                        <GridItem>
                                            <Field.Root
                                                invalid={
                                                    !!errors.confirmPassword
                                                }
                                            >
                                                <Field.Label>
                                                    Confirm Password
                                                </Field.Label>
                                                <Input
                                                    type="password"
                                                    value={
                                                        formData.confirmPassword
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            confirmPassword:
                                                                e.target.value,
                                                        })
                                                    }
                                                    placeholder="Confirm password"
                                                />
                                                {errors.confirmPassword && (
                                                    <Field.ErrorText>
                                                        {errors.confirmPassword}
                                                    </Field.ErrorText>
                                                )}
                                            </Field.Root>
                                        </GridItem>
                                    </Grid>
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
                                loadingText={
                                    isEditing ? "Updating..." : "Creating..."
                                }
                            >
                                {isEditing ? "Update User" : "Create User"}
                            </Button>
                        </HStack>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
}
