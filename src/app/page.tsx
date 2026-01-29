'use client';

import { useState, useEffect, useCallback } from 'react';
import { TradeTable } from '@/components/trade-table';
import { TradePanel } from '@/components/trade-panel';
import { AccountDropdown } from '@/components/account-dropdown';
import { PeriodDropdown, getDateRange, type Period } from '@/components/period-dropdown';
import { PeriodStats } from '@/components/period-stats';
import { ImportDropzone } from '@/components/import-dropzone';
import { NavTabs } from '@/components/nav-tabs';
import { UserMenu } from '@/components/user-menu';
import type { TradeWithRating } from '@/types/database';

const STORAGE_KEY = 'trade-analytics-period';
const VALID_PERIODS = ['today', 'yesterday', 'week', 'lastweek', 'month', 'lastmonth', 'year', 'lastyear', 'all'];

interface TradeStats {
  netPnl: number;
  winRate: number;
  totalTrades: number;
  winners: number;
  losers: number;
  avgSetupRating: number | null;
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeWithRating[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Load period preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Period | null;
      if (stored && VALID_PERIODS.includes(stored)) {
        setPeriod(stored);
      }
    }
  }, []);

  // Save period preference
  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newPeriod);
    }
  }, []);

  // Load trades and stats
  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (accountId) params.set('accountId', accountId);

      const dateRange = getDateRange(period);
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      params.set('includeStats', 'true');

      const res = await fetch(`/api/trades?${params}`);
      const data = await res.json();
      setTrades(data.trades || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to load trades:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, period]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const handlePanelClose = () => {
    setSelectedTradeId(null);
  };

  return (
    <div className="pt-6 pb-24 max-w-[730px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <AccountDropdown value={accountId} onChange={setAccountId} />
          <PeriodDropdown value={period} onChange={handlePeriodChange} />
        </div>
        <UserMenu initial="I" />
      </div>

      {/* Import Section (collapsible) */}
      {showImport && (
        <div className="mb-8">
          <ImportDropzone
            onImportComplete={(result) => {
              if (result.success) {
                loadTrades();
                setShowImport(false);
              }
            }}
          />
        </div>
      )}

      {/* Stats - Above trades */}
      <div className="mt-8 mb-8">
        <PeriodStats stats={stats} loading={loading} />
      </div>

      {/* Trades */}
      {!loading && trades.length === 0 ? (
        <div className="p-12 bg-white border border-zinc-200 rounded-xl text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-zinc-900 font-medium mb-1">
            No trades for this period
          </p>
          <p className="text-zinc-500 text-sm mb-4">
            Import your IBKR Flex report to get started
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-zinc-800 transition-colors"
          >
            Import Trades
          </button>
        </div>
      ) : (
        <TradeTable
          trades={trades}
          loading={loading}
          onSelectTrade={setSelectedTradeId}
        />
      )}

      {/* Trade Panel */}
      <TradePanel
        tradeId={selectedTradeId}
        tradeIds={trades.map(t => t.id)}
        onClose={handlePanelClose}
        onNavigate={setSelectedTradeId}
      />

      <NavTabs active="trades" />
    </div>
  );
}
