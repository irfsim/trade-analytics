'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Account } from '@/types/database';

export function AccountsSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

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

    setSaving(true);
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
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">Trading Accounts</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage your linked IBKR accounts</p>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8">
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
                        disabled={saving}
                        className="px-2 py-1 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                      >
                        {saving ? '...' : 'Save'}
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
                        {account.account_id} • Starting: {formatCurrency(account.starting_balance)}
                      </p>
                    </div>
                  )}
                </div>
                {editingId !== account.account_id && (
                  <button
                    onClick={() => startEditing(account)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    title="Edit alias"
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
  );
}
