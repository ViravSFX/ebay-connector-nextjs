"use client";

import { useState, useEffect } from "react";
import { Box, VStack, Alert } from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import PageHeader from "@/app/components/common/PageHeader";
import EbayAccountsListView from "../components/ebay/EbayAccountsListView";
import AddEbayAccountModal from "../components/ebay/AddEbayAccountModal";
import { useEbayAccounts, type EbayAccount } from "../hooks/useEbayAccounts";

export default function EbayConnectionsPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [urlMessage, setUrlMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const {
        accounts,
        loading,
        error,
        isReconnecting,
        isDeleting,
        isTogglingStatus,
        fetchAccounts,
        deleteAccount,
        toggleAccountStatus,
        reconnectAccount,
        createAccount,
    } = useEbayAccounts();

    // Handle URL parameters for success/error messages
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');

        if (success === 'connected') {
            setUrlMessage({ type: 'success', message: 'eBay account connected successfully!' });
            fetchAccounts(); // Refresh accounts after successful connection
        } else if (error) {
            const errorMessages: Record<string, string> = {
                oauth_failed: 'OAuth authorization failed',
                missing_params: 'Missing authorization parameters',
                invalid_state: 'Invalid security state',
                invalid_account: 'Invalid account ID',
                token_exchange_failed: 'Failed to exchange authorization code',
                callback_failed: 'OAuth callback failed'
            };
            setUrlMessage({
                type: 'error',
                message: errorMessages[error] || 'OAuth connection failed'
            });
        }

        // Clear URL parameters
        if (success || error) {
            window.history.replaceState({}, '', window.location.pathname);
        }

        // Auto-hide message after 5 seconds
        if (success || error) {
            setTimeout(() => setUrlMessage(null), 5000);
        }
    }, [fetchAccounts]);

    const handleRefresh = () => {
        fetchAccounts();
    };

    const handleConnect = () => {
        setIsAddModalOpen(true);
    };

    const handleAddAccountSubmit = async (data: any) => {
        try {
            setIsSubmitting(true);
            await createAccount(data);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error('Error creating account:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReconnect = (accountId: string) => {
        reconnectAccount(accountId);
    };

    const handleToggleStatus = (accountId: string, isActive: boolean) => {
        toggleAccountStatus(accountId, isActive);
    };

    const handleDelete = (accountId: string) => {
        deleteAccount(accountId);
    };

    const handleView = (account: EbayAccount) => {
        console.log("Viewing account:", account);
    };

    return (
        <Box p={8}>
            <VStack gap={6} align="stretch">
                {/* Page Header */}
                <PageHeader
                    title="eBay Accounts"
                    subtitle="Manage your connected eBay accounts"
                    showRefresh={true}
                    onRefresh={handleRefresh}
                    isRefreshing={loading}
                    primaryAction={{
                        label: "Connect eBay Account",
                        icon: <MdAdd />,
                        onClick: handleConnect,
                        colorPalette: "orange",
                    }}
                />

                {/* Error Alert */}
                {error && (
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Content>
                            <Alert.Description>{error}</Alert.Description>
                        </Alert.Content>
                    </Alert.Root>
                )}

                {/* URL Message Alert */}
                {urlMessage && (
                    <Alert.Root status={urlMessage.type === 'success' ? 'success' : 'error'} borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Content>
                            <Alert.Description>{urlMessage.message}</Alert.Description>
                        </Alert.Content>
                    </Alert.Root>
                )}

                {/* eBay Accounts List with Filtering and Pagination */}
                <EbayAccountsListView
                    accounts={accounts}
                    loading={loading}
                    onView={handleView}
                    onReconnect={handleReconnect}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                    isReconnecting={isReconnecting}
                    isDeleting={isDeleting}
                />

                {/* Add eBay Account Modal */}
                <AddEbayAccountModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSubmit={handleAddAccountSubmit}
                    isSubmitting={isSubmitting}
                />
            </VStack>
        </Box>
    );
}
