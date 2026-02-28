'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './theme-provider';
import { useAuth } from '@/lib/auth/context';
import { HoverList } from './hover-list';

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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    setOpen(false);
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

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-0 bg-transparent appearance-none"
      >
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
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg p-1 z-50"
          >
            <HoverList>
              {/* Account selector */}
              <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Account</div>
              <button
                onClick={() => { onAccountChange(null); setOpen(false); }}
                className={`relative w-full px-3 h-8 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer border-0 bg-transparent appearance-none ${
                  accountId === null ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                All accounts
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  accountId === null ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-700'
                }`}>
                  {accountId === null && <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />}
                </span>
              </button>
              {accounts.map((account) => (
                <button
                  key={account.account_id}
                  onClick={() => { onAccountChange(account.account_id); setOpen(false); }}
                  className={`relative w-full px-3 h-8 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer border-0 bg-transparent appearance-none ${
                    accountId === account.account_id ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {account.alias}
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    accountId === account.account_id ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {accountId === account.account_id && <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />}
                  </span>
                </button>
              ))}

              <div className="border-t border-zinc-100 dark:border-zinc-800 my-2" />

              {/* Theme selector - single row with icon buttons */}
              <div className="px-3 h-8 flex items-center justify-between">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Theme</span>
                <div className="flex items-center border border-zinc-300 dark:border-zinc-600 rounded-full h-6">
                  <button
                    onClick={() => setTheme('system')}
                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer focus:outline-none border-0 appearance-none bg-transparent ${
                      theme === 'system' ? 'bg-white dark:bg-zinc-700 !border !border-zinc-300 dark:!border-zinc-600' : ''
                    }`}
                    aria-label="System theme"
                  >
                    <svg className={`w-4 h-4 transition-colors ${theme === 'system' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer focus:outline-none border-0 appearance-none bg-transparent ${
                      theme === 'light' ? 'bg-white dark:bg-zinc-700 !border !border-zinc-300 dark:!border-zinc-600' : ''
                    }`}
                    aria-label="Light theme"
                  >
                    <svg className={`w-4 h-4 transition-colors ${theme === 'light' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer focus:outline-none border-0 appearance-none bg-transparent ${
                      theme === 'dark' ? 'bg-white dark:bg-zinc-700 !border !border-zinc-300 dark:!border-zinc-600' : ''
                    }`}
                    aria-label="Dark theme"
                  >
                    <svg className={`w-4 h-4 transition-colors ${theme === 'dark' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                onClick={() => { onOpenSettings?.(); setOpen(false); }}
                className="relative w-full px-3 h-8 text-left text-sm text-zinc-700 dark:text-zinc-300 rounded-lg flex items-center justify-between cursor-pointer border-0 bg-transparent appearance-none"
              >
                Settings
                <svg className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <button
                onClick={handleSignOut}
                className="relative w-full px-3 h-8 text-left text-sm text-zinc-700 dark:text-zinc-300 rounded-lg flex items-center justify-between cursor-pointer border-0 bg-transparent appearance-none"
              >
                Sign out
                <svg className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </HoverList>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
