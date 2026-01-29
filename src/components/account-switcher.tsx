'use client';

import { useState, useEffect } from 'react';

interface Account {
  account_id: string;
  alias: string;
  account_type: string;
}

interface AccountSwitcherProps {
  value: string | null;
  onChange: (accountId: string | null) => void;
}

export function AccountSwitcher({ value, onChange }: AccountSwitcherProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="h-9 w-40 bg-zinc-100 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-full">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
          value === null
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-900'
        }`}
      >
        All
      </button>
      {accounts.map((account) => (
        <button
          key={account.account_id}
          onClick={() => onChange(account.account_id)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
            value === account.account_id
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          {account.alias}
        </button>
      ))}
    </div>
  );
}
