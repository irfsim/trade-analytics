'use client';

import { useState, useEffect, useCallback } from 'react';
import { TradeTable } from '@/components/trade-table';
import { TradePanel } from '@/components/trade-panel';
import { PeriodPills, getDateRange, getTradeLimit, type Period } from '@/components/period-dropdown';
import { PeriodStats } from '@/components/period-stats';
import { ImportDropzone } from '@/components/import-dropzone';
import { UserMenu } from '@/components/user-menu';
import { SettingsModal } from '@/components/settings-modal';
import type { TradeWithRating } from '@/types/database';

const STORAGE_KEY = 'trade-analytics-period';
const AVATAR_STORAGE_KEY = 'trade-analytics-avatar';
const VALID_PERIODS = ['today', 'yesterday', 'week', 'lastweek', 'month', 'lastmonth', 'year', 'lastyear', 'all', 'last10', 'last20', 'last50'];

interface TradeStats {
  netPnl: number;
  winRate: number;
  totalTrades: number;
  winners: number;
  losers: number;
  avgSetupRating: number | null;
  planAdherence: number | null;
  avgWin: number | null;
  avgWinPct: number | null;
  avgLoss: number | null;
  avgLossPct: number | null;
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeWithRating[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPeriod = localStorage.getItem(STORAGE_KEY) as Period | null;
      if (storedPeriod && VALID_PERIODS.includes(storedPeriod)) {
        setPeriod(storedPeriod);
      }
      const storedAvatar = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (storedAvatar) {
        setAvatar(storedAvatar);
      }
    }
  }, []);

  const handleAvatarChange = useCallback((newAvatar: string | null) => {
    setAvatar(newAvatar);
    if (typeof window !== 'undefined') {
      if (newAvatar) {
        localStorage.setItem(AVATAR_STORAGE_KEY, newAvatar);
      } else {
        localStorage.removeItem(AVATAR_STORAGE_KEY);
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

      const tradeLimit = getTradeLimit(period);
      if (tradeLimit) params.set('limit', tradeLimit.toString());

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
    <div className="pt-6 pb-24 max-w-[816px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <PeriodPills value={period} onChange={handlePeriodChange} />
        <UserMenu
          initial="I"
          avatar={avatar}
          onOpenSettings={() => setShowSettings(true)}
          accountId={accountId}
          onAccountChange={setAccountId}
        />
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
      <div className="mt-12 mb-12">
        <div className="bg-[#FAFAFA] dark:bg-zinc-800 rounded-2xl p-4">
          <PeriodStats stats={stats} loading={loading} />
        </div>
      </div>

      {/* Trades */}
      {!loading && trades.length === 0 ? (
        <div className="p-12 bg-white dark:bg-zinc-900 shadow-card rounded-xl text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">
            No trades for this period
          </p>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
            Import your IBKR Flex report to get started
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
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
        onAnnotationSave={loadTrades}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        avatar={avatar}
        onAvatarChange={handleAvatarChange}
      />
    </div>
  );
}
