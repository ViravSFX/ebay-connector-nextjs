import { useState, useEffect, useCallback } from 'react';

export interface EbayAccount {
  id: string;
  ebayUserId: string;
  ebayUsername: string | null;
  expiresAt: string;
  tokenType: string;
  scopes: string[];
  status: string;
  friendlyName?: string;
  tags?: string[];
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseEbayAccountsReturn {
  accounts: EbayAccount[];
  loading: boolean;
  error: string | null;
  isReconnecting: Record<string, boolean>;
  isDeleting: Record<string, boolean>;
  isTogglingStatus: Record<string, boolean>;
  fetchAccounts: () => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  toggleAccountStatus: (accountId: string, isActive: boolean) => Promise<void>;
  reconnectAccount: (accountId: string) => Promise<void>;
  updateAccount: (accountId: string, data: Partial<EbayAccount>) => Promise<void>;
  createAccount: (data: { friendlyName: string; description?: string; tags: string[]; ebayUsername?: string; }) => Promise<void>;
}

export function useEbayAccounts(): UseEbayAccountsReturn {
  const [accounts, setAccounts] = useState<EbayAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isTogglingStatus, setIsTogglingStatus] = useState<Record<string, boolean>>({});

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ebay-accounts', {
        method: 'GET',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch accounts');
      }

      if (result.success) {
        setAccounts(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch accounts');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching eBay accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async (accountId: string) => {
    setIsDeleting(prev => ({ ...prev, [accountId]: true }));
    try {
      const response = await fetch(`/api/ebay-accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete account');
      }

      if (result.success) {
        setAccounts(prev => prev.filter(account => account.id !== accountId));
      } else {
        throw new Error(result.message || 'Failed to delete account');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error deleting eBay account:', err);
    } finally {
      setIsDeleting(prev => ({ ...prev, [accountId]: false }));
    }
  }, []);

  const toggleAccountStatus = useCallback(async (accountId: string, isActive: boolean) => {
    setIsTogglingStatus(prev => ({ ...prev, [accountId]: true }));
    try {
      const response = await fetch(`/api/ebay-accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: isActive ? 'active' : 'inactive' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update account status');
      }

      if (result.success) {
        setAccounts(prev =>
          prev.map(account =>
            account.id === accountId
              ? { ...account, status: isActive ? 'active' : 'inactive' }
              : account
          )
        );
      } else {
        throw new Error(result.message || 'Failed to update account status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error toggling account status:', err);
    } finally {
      setIsTogglingStatus(prev => ({ ...prev, [accountId]: false }));
    }
  }, []);

  const reconnectAccount = useCallback(async (accountId: string) => {
    setIsReconnecting(prev => ({ ...prev, [accountId]: true }));
    try {
      console.log('Redirecting to OAuth for account:', accountId);
      // Redirect to OAuth on the same page
      window.location.href = `/api/ebay/oauth/authorize?accountId=${accountId}`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error initiating eBay OAuth:', err);
      setIsReconnecting(prev => ({ ...prev, [accountId]: false }));
    }
  }, []);

  const updateAccount = useCallback(async (accountId: string, data: Partial<EbayAccount>) => {
    try {
      const response = await fetch(`/api/ebay-accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update account');
      }

      if (result.success) {
        setAccounts(prev =>
          prev.map(account =>
            account.id === accountId
              ? { ...account, ...result.data }
              : account
          )
        );
      } else {
        throw new Error(result.message || 'Failed to update account');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error updating eBay account:', err);
    }
  }, []);

  const createAccount = useCallback(async (data: { friendlyName: string; description?: string; tags: string[]; ebayUsername?: string; }) => {
    try {
      setLoading(true);
      const response = await fetch('/api/ebay-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create account');
      }

      if (result.success) {
        setAccounts(prev => [...prev, result.data]);
      } else {
        throw new Error(result.message || 'Failed to create account');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error creating eBay account:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    isReconnecting,
    isDeleting,
    isTogglingStatus,
    fetchAccounts,
    createAccount,
    deleteAccount,
    toggleAccountStatus,
    reconnectAccount,
    updateAccount,
  };
}