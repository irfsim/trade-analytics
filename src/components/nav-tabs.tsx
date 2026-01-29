'use client';

import Link from 'next/link';

interface NavTabsProps {
  active: 'trades' | 'stats';
}

export function NavTabs({ active }: NavTabsProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 p-1 h-10 bg-zinc-100 rounded-full shadow-lg border border-zinc-200">
        <Link
          href="/"
          className={`px-4 h-8 flex items-center text-sm font-medium rounded-full transition-colors ${
            active === 'trades'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Trades
        </Link>
        <Link
          href="/stats"
          className={`px-4 h-8 flex items-center text-sm font-medium rounded-full transition-colors ${
            active === 'stats'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Stats
        </Link>
      </div>
    </div>
  );
}
