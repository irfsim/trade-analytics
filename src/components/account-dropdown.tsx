'use client';

import { useState, useEffect } from 'react';
import { Root, Container, Trigger, Content, Item } from '@/lib/bloom-menu';

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

  const selectedAccount = accounts.find(a => a.account_id === value);
  const displayLabel = value === null ? 'All accounts' : selectedAccount?.alias || 'All accounts';

  if (loading) {
    return (
      <div className="h-9 w-32 bg-zinc-100 rounded-full animate-pulse" />
    );
  }

  return (
    <Root direction="bottom" anchor="start">
      <Container
        className="bloom-no-shadow bg-white"
        buttonSize={{ width: 145, height: 36 }}
        menuWidth={180}
        menuRadius={12}
        buttonRadius={18}
      >
        <Trigger className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors whitespace-nowrap">
          {displayLabel}
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Trigger>

        <Content className="p-1">
          <Item
            onSelect={() => onChange(null)}
            className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 rounded-lg cursor-pointer ${
              value === null ? 'text-zinc-900 font-medium' : 'text-zinc-600'
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              value === null ? 'border-zinc-900' : 'border-zinc-300'
            }`}>
              {value === null && <span className="w-2 h-2 bg-zinc-900 rounded-full" />}
            </span>
            All accounts
          </Item>

          {accounts.map((account) => (
            <Item
              key={account.account_id}
              onSelect={() => onChange(account.account_id)}
              className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 rounded-lg cursor-pointer ${
                value === account.account_id ? 'text-zinc-900 font-medium' : 'text-zinc-600'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                value === account.account_id ? 'border-zinc-900' : 'border-zinc-300'
              }`}>
                {value === account.account_id && <span className="w-2 h-2 bg-zinc-900 rounded-full" />}
              </span>
              {account.alias}
            </Item>
          ))}
        </Content>
      </Container>
    </Root>
  );
}
