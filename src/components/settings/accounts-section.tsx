'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ContextMenuDropdown } from '@/components/context-menu-dropdown';
import type { Account } from '@/types/database';

interface AccountsSectionProps {
  onStartWizard?: () => void;
}

export function AccountsSection({ onStartWizard }: AccountsSectionProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!menuOpenId) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

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

  const startEditing = (account: Account) => {
    setMenuOpenId(null);
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

  const promptDelete = (account: Account) => {
    setMenuOpenId(null);
    setConfirmDeleteId(account.account_id);
  };

  const confirmDelete = async (accountId: string) => {
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setAccounts(accounts.filter(a => a.account_id !== accountId));
        toast.success('Account deleted');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    }
  };

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 bg-zinc-50 dark:bg-[#1c1c1e]/50 rounded-lg">
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
          No accounts connected yet
        </p>
        <button
          onClick={() => onStartWizard?.()}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          Connect your first account →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <div
          key={account.account_id}
          className="p-4 bg-zinc-50 dark:bg-[#1c1c1e]/50 border border-zinc-200 dark:border-zinc-700 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {editingId === account.account_id ? (
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={editAlias}
                    onChange={(e) => setEditAlias(e.target.value)}
                    className="max-w-[232px] px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveAlias(account.account_id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => saveAlias(account.account_id)}
                      disabled={aliasSaving}
                      className="px-2 py-1 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
                    >
                      {aliasSaving ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-1">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{account.alias}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded uppercase">
                    {account.account_type}
                  </span>
                </div>
              )}
            </div>
            {editingId !== account.account_id && (
              <div className="relative" ref={menuOpenId === account.account_id ? menuRef : undefined}>
                <button
                  onClick={() => setMenuOpenId(menuOpenId === account.account_id ? null : account.account_id)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  aria-label="Account options"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="19" cy="12" r="1.5" />
                  </svg>
                </button>
                {menuOpenId === account.account_id && (
                  <ContextMenuDropdown>
                    <button
                      onClick={() => startEditing(account)}
                      className="w-full px-3 h-8 text-left text-sm text-zinc-700 dark:text-zinc-300 rounded-lg cursor-pointer"
                    >
                      Edit name
                    </button>
                    <button
                      onClick={() => promptDelete(account)}
                      className="w-full px-3 h-8 text-left text-sm text-red-600 dark:text-red-400 rounded-lg cursor-pointer"
                    >
                      Delete account
                    </button>
                  </ContextMenuDropdown>
                )}
              </div>
            )}
          </div>
          <AnimatePresence>
            {confirmDeleteId === account.account_id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Delete this account and all its trades?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmDelete(account.account_id)}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-full hover:bg-red-700 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
