'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import type { Account, BrokerConnectionWithAccounts } from '@/types/database';
import { BROKER_INFO } from '@/lib/brokers/types';

interface AccountsSectionProps {
  onStartWizard?: () => void;
}

export function AccountsSection({ onStartWizard }: AccountsSectionProps) {
  const { profile, refreshProfile } = useAuth();

  // Connections state
  const [connections, setConnections] = useState<BrokerConnectionWithAccounts[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [syncingConnection, setSyncingConnection] = useState<number | null>(null);

  // Trading accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [aliasSaving, setAliasSaving] = useState(false);

  // IBKR config state
  const [flexQueryToken, setFlexQueryToken] = useState('');
  const [flexQueryId, setFlexQueryId] = useState('');
  const [ibkrSaving, setIbkrSaving] = useState(false);

  useEffect(() => {
    fetchConnections();
    loadAccounts();
  }, []);

  useEffect(() => {
    if (profile) {
      setFlexQueryToken(profile.flex_query_token || '');
      setFlexQueryId(profile.flex_query_id || '');
    }
  }, [profile]);

  async function fetchConnections() {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setConnectionsLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  }

  async function handleSync(connectionId: number) {
    setSyncingConnection(connectionId);
    try {
      await fetch(`/api/connections/${connectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_type: 'manual' }),
      });
      await fetchConnections();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncingConnection(null);
    }
  }

  async function handleToggleAutoSync(connectionId: number, enabled: boolean) {
    try {
      await fetch(`/api/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_sync_enabled: enabled }),
      });
      await fetchConnections();
    } catch (error) {
      console.error('Failed to update auto-sync:', error);
    }
  }

  const startEditing = (account: Account) => {
    setEditingId(account.account_id);
    setEditAlias(account.alias);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditAlias('');
  };

  const saveAlias = async (accountId: string) => {
    if (!editAlias.trim()) return;

    setAliasSaving(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: editAlias.trim() }),
      });

      if (res.ok) {
        setAccounts(accounts.map(a =>
          a.account_id === accountId ? { ...a, alias: editAlias.trim() } : a
        ));
        setEditingId(null);
        setEditAlias('');
        toast.success('Account alias updated');
      }
    } catch (error) {
      console.error('Failed to save alias:', error);
      toast.error('Failed to update alias');
    } finally {
      setAliasSaving(false);
    }
  };

  const handleSaveIbkr = async () => {
    setIbkrSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flex_query_token: flexQueryToken || null,
          flex_query_id: flexQueryId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      await refreshProfile();
      toast.success('IBKR settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save IBKR settings');
    } finally {
      setIbkrSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const loading = connectionsLoading || accountsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Broker Connections */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Broker Connections</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your connected brokerage accounts</p>
          </div>
          <button
            onClick={() => onStartWizard?.()}
            className="px-3 py-1.5 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
          >
            Connect
          </button>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <svg
              className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <p className="text-zinc-600 dark:text-zinc-400 mb-3">
              No broker accounts connected
            </p>
            <button
              onClick={() => onStartWizard?.()}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Connect your first account →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map(connection => (
              <div
                key={connection.id}
                className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        connection.status === 'active'
                          ? 'bg-emerald-500'
                          : connection.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-zinc-400'
                      }`}
                    />
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                        {connection.label}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {BROKER_INFO[connection.broker_type]?.name}
                        {connection.last_sync_at && (
                          <> · Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-zinc-500">
                      <input
                        type="checkbox"
                        checked={connection.auto_sync_enabled}
                        onChange={e => handleToggleAutoSync(connection.id, e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      Auto
                    </label>
                    <button
                      onClick={() => handleSync(connection.id)}
                      disabled={syncingConnection === connection.id}
                      className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded disabled:opacity-50 cursor-pointer"
                    >
                      {syncingConnection === connection.id ? 'Syncing...' : 'Sync'}
                    </button>
                  </div>
                </div>
                {connection.status === 'error' && connection.last_error && (
                  <p className="mt-2 text-xs text-red-500">{connection.last_error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-700" />

      {/* Trading Accounts */}
      <div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">Trading Accounts</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Linked ISA and Margin accounts</p>

        {accounts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No accounts linked yet.</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Import a Flex report to add accounts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.account_id}
                className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingId === account.account_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editAlias}
                          onChange={(e) => setEditAlias(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveAlias(account.account_id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <button
                          onClick={() => saveAlias(account.account_id)}
                          disabled={aliasSaving}
                          className="px-2 py-1 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                        >
                          {aliasSaving ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{account.alias}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded uppercase">
                            {account.account_type}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {account.account_id} · Starting: {formatCurrency(account.starting_balance)}
                        </p>
                      </div>
                    )}
                  </div>
                  {editingId !== account.account_id && (
                    <button
                      onClick={() => startEditing(account)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                      aria-label="Edit alias"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-700" />

      {/* IBKR Integration */}
      <div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">IBKR Integration</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Connect your Interactive Brokers account for auto-sync</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Flex Query Token
            </label>
            <input
              type="password"
              value={flexQueryToken}
              onChange={(e) => setFlexQueryToken(e.target.value)}
              placeholder="Enter your Flex Query token"
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Flex Query ID
            </label>
            <input
              type="text"
              value={flexQueryId}
              onChange={(e) => setFlexQueryId(e.target.value)}
              placeholder="Enter your Flex Query ID"
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSaveIbkr}
            disabled={ibkrSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors btn-press cursor-pointer"
          >
            {ibkrSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
