"use client";

import {
    HStack,
    VStack,
    Heading,
    Text,
    Button,
    IconButton,
} from "@chakra-ui/react";
import { MdAdd, MdRefresh } from "react-icons/md";
import { ReactNode } from "react";

interface ActionButton {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    colorPalette?: string;
    variant?: "solid" | "outline" | "ghost" | "subtle";
    size?: "xs" | "sm" | "md" | "lg";
    loading?: boolean;
    loadingText?: string;
    disabled?: boolean;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;

    // Refresh button
    showRefresh?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;

    // Primary action button (like "Create" or "Connect")
    primaryAction?: ActionButton;

    // Additional action buttons
    actions?: ActionButton[];

    // Custom content in the action area
    children?: ReactNode;
}

export default function PageHeader({
    title,
    subtitle,
    showRefresh = false,
    onRefresh,
    isRefreshing = false,
    primaryAction,
    actions = [],
    children,
}: PageHeaderProps) {
    return (
        <HStack justify="space-between" align="center">
            <VStack align="start" gap={1}>
                <Heading size="xl" color="gray.800">
                    {title}
                </Heading>
                {subtitle && (
                    <Text color="gray.600">{subtitle}</Text>
                )}
            </VStack>

            {(showRefresh || primaryAction || actions.length > 0 || children) && (
                <HStack gap={3}>
                    {showRefresh && (
                        <IconButton
                            aria-label="Refresh"
                            variant="ghost"
                            onClick={onRefresh}
                            loading={isRefreshing}
                        >
                            <MdRefresh />
                        </IconButton>
                    )}

                    {actions.map((action, index) => (
                        <Button
                            key={index}
                            colorPalette={action.colorPalette || "gray"}
                            variant={action.variant || "outline"}
                            size={action.size || "md"}
                            onClick={action.onClick}
                            loading={action.loading}
                            loadingText={action.loadingText}
                            disabled={action.disabled}
                        >
                            {action.icon && <span style={{ marginRight: "8px" }}>{action.icon}</span>}
                            {action.label}
                        </Button>
                    ))}

                    {primaryAction && (
                        <Button
                            colorPalette={primaryAction.colorPalette || "orange"}
                            variant={primaryAction.variant || "solid"}
                            size={primaryAction.size || "md"}
                            onClick={primaryAction.onClick}
                            loading={primaryAction.loading}
                            loadingText={primaryAction.loadingText}
                            disabled={primaryAction.disabled}
                        >
                            {primaryAction.icon && <span style={{ marginRight: "8px" }}>{primaryAction.icon}</span>}
                            {primaryAction.label}
                        </Button>
                    )}

                    {children}
                </HStack>
            )}
        </HStack>
    );
}
