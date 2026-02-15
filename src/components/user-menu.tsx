'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Root, Container, Trigger, Content, Item } from '@/lib/bloom-menu';
import { useTheme } from './theme-provider';
import { useAuth } from '@/lib/auth/context';

interface Account {
  account_id: string;
  alias: string;
  account_type: string;
}

interface UserMenuProps {
  initial?: string;
  avatar?: string | null;
  onOpenSettings?: () => void;
  accountId: string | null;
  onAccountChange: (accountId: string | null) => void;
}

export function UserMenu({ initial = 'U', avatar, onOpenSettings, accountId, onAccountChange }: UserMenuProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        setAccounts(data.accounts || []);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    }
    loadAccounts();
  }, []);

  const selectedAccount = accounts.find(a => a.account_id === accountId);
  const accountLabel = accountId === null ? 'All accounts' : selectedAccount?.alias || 'All accounts';

  return (
    <Root direction="bottom" anchor="end">
      <Container
        className="bloom-no-shadow bg-white dark:bg-zinc-900"
        buttonSize={32}
        menuWidth={200}
        menuRadius={12}
        buttonRadius={16}
      >
        <Trigger className="w-8 h-8 rounded-full overflow-hidden">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: 'linear-gradient(135deg, #5BE1F0 0%, #4A9FF5 30%, #6366F1 60%, #A855F7 100%)'
              }}
            />
          )}
        </Trigger>

        <Content className="p-1">
          {/* Account selector */}
          <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Account</div>
          <Item
            onSelect={() => onAccountChange(null)}
            className={`w-full px-3 h-8 text-left text-sm flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer ${
              accountId === null ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            All accounts
            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
              accountId === null ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-700'
            }`}>
              {accountId === null && <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />}
            </span>
          </Item>
          {accounts.map((account) => (
            <Item
              key={account.account_id}
              onSelect={() => onAccountChange(account.account_id)}
              className={`w-full px-3 h-8 text-left text-sm flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer ${
                accountId === account.account_id ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {account.alias}
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                accountId === account.account_id ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-700'
              }`}>
                {accountId === account.account_id && <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />}
              </span>
            </Item>
          ))}

          <div className="-mx-1 border-t border-zinc-100 dark:border-zinc-800 my-2" />

          {/* Theme selector - single row with icon buttons */}
          <div className="px-3 h-8 flex items-center justify-between">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Theme</span>
            <div className="flex items-center border border-zinc-300 dark:border-zinc-600 rounded-full h-6">
              <button
                onClick={() => setTheme('system')}
                className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                  theme === 'system' ? 'bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600' : ''
                }`}
                aria-label="System theme"
              >
                <svg className={`w-4 h-4 transition-colors ${theme === 'system' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                  theme === 'light' ? 'bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600' : ''
                }`}
                aria-label="Light theme"
              >
                <svg className={`w-4 h-4 transition-colors ${theme === 'light' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                  theme === 'dark' ? 'bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600' : ''
                }`}
                aria-label="Dark theme"
              >
                <svg className={`w-4 h-4 transition-colors ${theme === 'dark' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
            </div>
          </div>

          <Item
            onSelect={() => onOpenSettings?.()}
            className="w-full px-3 h-8 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-between cursor-pointer"
          >
            Settings
            <svg className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Item>

          <Item
            onSelect={handleSignOut}
            className="w-full px-3 h-8 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-between cursor-pointer"
          >
            Sign out
            <svg className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </Item>
        </Content>
      </Container>
    </Root>
  );
}
