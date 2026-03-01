'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HoverList } from './hover-list';

interface Account {
  account_id: string;
  alias: string;
  account_type: string;
}

interface AccountDropdownProps {
  value: string | null;
  onChange: (accountId: string | null) => void;
}

export function AccountDropdown({ value, onChange }: AccountDropdownProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        setAccounts(data.accounts || []);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectedAccount = accounts.find(a => a.account_id === value);
  const displayLabel = value === null ? 'All accounts' : selectedAccount?.alias || 'All accounts';

  if (loading) {
    return (
      <div className="h-9 w-32 bg-zinc-100 rounded-full animate-pulse" />
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap rounded-full border border-zinc-200 dark:border-zinc-700 cursor-pointer bg-white dark:bg-zinc-900 appearance-none"
      >
        {displayLabel}
        <svg
          className="w-4 h-4 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg p-1 z-50"
          >
            <HoverList>
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                className={`relative w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 rounded-lg cursor-pointer border-0 bg-transparent appearance-none ${
                  value === null ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  value === null ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-300 dark:border-zinc-600'
                }`}>
                  {value === null && <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />}
                </span>
                All accounts
              </button>

              {accounts.map((account) => (
                <button
                  key={account.account_id}
                  onClick={() => { onChange(account.account_id); setOpen(false); }}
                  className={`relative w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 rounded-lg cursor-pointer border-0 bg-transparent appearance-none ${
                    value === account.account_id ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    value === account.account_id ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {value === account.account_id && <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />}
                  </span>
                  {account.alias}
                </button>
              ))}
            </HoverList>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
