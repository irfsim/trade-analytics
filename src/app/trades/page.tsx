'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AccountSwitcher } from '@/components/account-switcher';
import { TradeTable } from '@/components/trade-table';
import { TradePanel } from '@/components/trade-panel';
import { PeriodTabs, getDateRange, getPeriodLabel, type Period } from '@/components/period-tabs';
import { PeriodStats } from '@/components/period-stats';
import type { TradeWithRating } from '@/types/database';

const STORAGE_KEY = 'trade-analytics-period';

interface TradeStats {
  netPnl: number;
  winRate: number;
  totalTrades: number;
  winners: number;
  losers: number;
  avgSetupRating: number | null;
}

function TradesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial period from URL or localStorage
  const getInitialPeriod = (): Period => {
    const urlPeriod = searchParams.get('period') as Period | null;
    if (urlPeriod && ['today', 'week', 'month', 'year', 'all'].includes(urlPeriod)) {
      return urlPeriod;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Period | null;
      if (stored && ['today', 'week', 'month', 'year', 'all'].includes(stored)) {
        return stored;
      }
    }
    return 'week'; // Default to this week
  };

  const needsAnnotation = searchParams.get('needsAnnotation') === 'true';

  const [period, setPeriod] = useState<Period>(getInitialPeriod);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeWithRating[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);

  // Update URL and localStorage when period changes
  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod);

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', newPeriod);
    router.replace(`/trades?${params.toString()}`, { scroll: false });

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newPeriod);
    }
  }, [router, searchParams]);

  // Load trades and stats
  useEffect(() => {
    async function loadTrades() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (accountId) params.set('accountId', accountId);

        if (needsAnnotation) {
          params.set('needsAnnotation', 'true');
        } else {
          // Apply date filter based on period
          const dateRange = getDateRange(period);
          if (dateRange.from) params.set('from', dateRange.from);
          if (dateRange.to) params.set('to', dateRange.to);
          params.set('includeStats', 'true');
        }

        const res = await fetch(`/api/trades?${params}`);
        const data = await res.json();
        setTrades(data.trades || []);
        setStats(data.stats || null);
      } catch (error) {
        console.error('Failed to load trades:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTrades();
  }, [accountId, period, needsAnnotation]);

  // Refresh trades when panel closes (in case annotation was updated)
  const handlePanelClose = () => {
    setSelectedTradeId(null);
    // Trigger a refresh
    const refreshTrades = async () => {
      const params = new URLSearchParams();
      if (accountId) params.set('accountId', accountId);
      if (!needsAnnotation) {
        const dateRange = getDateRange(period);
        if (dateRange.from) params.set('from', dateRange.from);
        if (dateRange.to) params.set('to', dateRange.to);
        params.set('includeStats', 'true');
      } else {
        params.set('needsAnnotation', 'true');
      }
      const res = await fetch(`/api/trades?${params}`);
      const data = await res.json();
      setTrades(data.trades || []);
      setStats(data.stats || null);
    };
    refreshTrades();
  };

  const periodLabel = getPeriodLabel(period);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {needsAnnotation ? 'Trades Needing Review' : 'Trades'}
            </h1>
            <p className="text-zinc-500 mt-1">
              {needsAnnotation ? 'These trades need annotation' : periodLabel}
            </p>
          </div>
          <AccountSwitcher value={accountId} onChange={setAccountId} />
        </div>

        {/* Period Tabs (hide if viewing "needs annotation") */}
        {!needsAnnotation && (
          <PeriodTabs value={period} onChange={handlePeriodChange} />
        )}

        {/* Stats Summary */}
        {!needsAnnotation && (
          <PeriodStats stats={stats} loading={loading} />
        )}

        {/* Empty State */}
        {!loading && trades.length === 0 && (
          <div className="p-12 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
            <p className="text-zinc-400 text-lg">
              {needsAnnotation
                ? 'All trades have been reviewed!'
                : `No trades ${period === 'today' ? 'today' : period === 'week' ? 'this week' : period === 'month' ? 'this month' : period === 'year' ? 'this year' : ''}`
              }
            </p>
            {period === 'today' && !needsAnnotation && (
              <p className="text-zinc-500 mt-2">
                Check back after market close, or view a longer period.
              </p>
            )}
          </div>
        )}

        {/* Trade Table */}
        {(loading || trades.length > 0) && (
          <TradeTable
            trades={trades}
            loading={loading}
            onSelectTrade={setSelectedTradeId}
          />
        )}
      </div>

      {/* Trade Detail Panel */}
      <TradePanel
        tradeId={selectedTradeId}
        onClose={handlePanelClose}
      />
    </div>
  );
}

function TradesLoading() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
        <div className="h-12 w-full max-w-xl bg-zinc-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export default function TradesPage() {
  return (
    <Suspense fallback={<TradesLoading />}>
      <TradesContent />
    </Suspense>
  );
}
