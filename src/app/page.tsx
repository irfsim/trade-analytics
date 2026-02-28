'use client';

import { useState, useEffect, useCallback } from 'react';
import { TradeTable } from '@/components/trade-table';
import { TradePanel } from '@/components/trade-panel';
import { PeriodPills, getDateRange, getTradeLimit, type Period } from '@/components/period-dropdown';
import { PeriodStats } from '@/components/period-stats';
import { UserMenu } from '@/components/user-menu';
import { SettingsModal } from '@/components/settings-modal';
import type { TradeWithRating } from '@/types/database';

const STORAGE_KEY = 'trade-analytics-period';
const AVATAR_STORAGE_KEY = 'trade-analytics-avatar';
const DISPLAY_NAME_STORAGE_KEY = 'trade-analytics-display-name';
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
  const [showSettings, setShowSettings] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [hasCheckedSeed, setHasCheckedSeed] = useState(false);
  const [highlightedTradeId, setHighlightedTradeId] = useState<number | null>(null);

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
      const storedDisplayName = localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
      if (storedDisplayName) {
        setDisplayName(storedDisplayName);
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

  const handleDisplayNameChange = useCallback((newDisplayName: string) => {
    setDisplayName(newDisplayName);
    if (typeof window !== 'undefined') {
      if (newDisplayName) {
        localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, newDisplayName);
      } else {
        localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY);
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

  // Auto-seed if database is empty (runs once on mount)
  useEffect(() => {
    if (hasCheckedSeed) return;

    const checkAndSeed = async () => {
      try {
        // Check if any trades exist at all (no date filter)
        const res = await fetch('/api/trades?limit=1');
        const data = await res.json();

        if (!data.trades || data.trades.length === 0) {
          // Database is empty, seed demo data
          console.log('No trades found, seeding demo data...');
          await fetch('/api/seed', { method: 'POST' });
          console.log('Demo data seeded successfully');
        }
      } catch (error) {
        console.error('Failed to check/seed:', error);
      } finally {
        setHasCheckedSeed(true);
      }
    };

    checkAndSeed();
  }, [hasCheckedSeed]);

  // Load trades and stats
  const loadTrades = useCallback(async (options?: { silent?: boolean }) => {
    if (!hasCheckedSeed) return; // Wait for seed check to complete

    if (!options?.silent) {
      setLoading(true);
    }
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
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [accountId, period, hasCheckedSeed]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const handlePanelClose = () => {
    setSelectedTradeId(null);
  };

  const handleAnnotationSave = useCallback(() => {
    // Store the trade ID before closing
    const savedTradeId = selectedTradeId;

    // Close the panel
    setSelectedTradeId(null);

    // Highlight the saved trade
    if (savedTradeId) {
      setHighlightedTradeId(savedTradeId);
    }

    // Reload trades silently to get updated data (no loading flash)
    loadTrades({ silent: true });
  }, [selectedTradeId, loadTrades]);

  // Clear highlight after animation completes (with proper cleanup)
  useEffect(() => {
    if (highlightedTradeId === null) return;

    const timer = setTimeout(() => {
      setHighlightedTradeId(null);
    }, 1500);

    return () => clearTimeout(timer);
  }, [highlightedTradeId]);

  return (
    <div className="pt-6 pb-24 max-w-[816px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap select-none">OpenTrade</span>
        <UserMenu
          initial="I"
          avatar={avatar}
          onOpenSettings={() => setShowSettings(true)}
          accountId={accountId}
          onAccountChange={setAccountId}
        />
      </div>
      <div className="w-fit">
        <PeriodPills value={period} onChange={handlePeriodChange} />
      </div>

      {/* Stats - Above trades */}
      <div className="mt-6 mb-12">
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
          <p className="text-zinc-900 dark:text-zinc-100 font-medium">
            No trades for this period
          </p>
        </div>
      ) : (
        <TradeTable
          trades={trades}
          loading={loading}
          onSelectTrade={setSelectedTradeId}
          highlightedTradeId={highlightedTradeId}
        />
      )}

      {/* Trade Panel */}
      <TradePanel
        tradeId={selectedTradeId}
        tradeIds={trades.map(t => t.id)}
        onClose={handlePanelClose}
        onNavigate={setSelectedTradeId}
        onAnnotationSave={handleAnnotationSave}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        avatar={avatar}
        onAvatarChange={handleAvatarChange}
        displayName={displayName}
        onDisplayNameChange={handleDisplayNameChange}
      />
    </div>
  );
}
