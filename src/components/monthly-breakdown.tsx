'use client';

import { useState, useEffect } from 'react';
import type { Period } from './period-dropdown';

interface MonthlyStats {
  month: number;
  year: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  bestTradePct: number;
  worstTradePct: number;
  maxConsecWins: number;
  maxConsecLosses: number;
}

interface YearSummary {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  bestTrade: number;
  worstTrade: number;
}

interface MonthlyBreakdownProps {
  accountId?: string | null;
  planOnly?: boolean;
  period?: Period;
  onTradeCountChange?: (filtered: number, total: number) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_COLORS = [
  'bg-yellow-100 text-yellow-700',  // January
  'bg-orange-100 text-orange-700',  // February
  'bg-green-100 text-green-700',    // March
  'bg-emerald-100 text-emerald-700',// April
  'bg-teal-100 text-teal-700',      // May
  'bg-cyan-100 text-cyan-700',      // June
  'bg-blue-100 text-blue-700',      // July
  'bg-indigo-100 text-indigo-700',  // August
  'bg-violet-100 text-violet-700',  // September
  'bg-purple-100 text-purple-700',  // October
  'bg-pink-100 text-pink-700',      // November
  'bg-rose-100 text-rose-700',      // December
];

const STARTING_CAPITAL = 100000;

function getYearFromPeriod(period?: Period): number {
  const currentYear = new Date().getFullYear();
  if (period === 'lastyear') return currentYear - 1;
  return currentYear;
}

export function MonthlyBreakdown({ accountId, planOnly = false, period, onTradeCountChange }: MonthlyBreakdownProps) {
  const year = getYearFromPeriod(period);
  const [months, setMonths] = useState<MonthlyStats[]>([]);
  const [summary, setSummary] = useState<YearSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ year: year.toString() });
        if (accountId) params.set('accountId', accountId);
        if (planOnly) params.set('planOnly', 'true');

        const res = await fetch(`/api/stats/monthly?${params}`);
        const data = await res.json();

        setMonths(data.months || []);
        setSummary(data.summary || null);

        // Report trade counts back to parent
        if (onTradeCountChange) {
          onTradeCountChange(data.filteredTradeCount || 0, data.totalTradeCount || 0);
        }
      } catch (error) {
        console.error('Failed to load monthly stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [year, accountId, planOnly, onTradeCountChange]);

  const formatCurrency = (value: number): string => {
    const formatted = Math.abs(value).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    return value < 0 ? `-${formatted}` : formatted;
  };

  const formatPnl = (value: number): string => {
    const formatted = Math.abs(value).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    return value >= 0 ? `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `-$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // Filter to only show months with trades
  const activeMonths = months.filter(m => m.trades > 0);

  if (loading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-zinc-100 rounded mb-6" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-50 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year Summary */}
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-zinc-500 mb-1">Trades</p>
          <p className="text-sm font-semibold text-zinc-900">{summary?.totalTrades ?? 0}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-zinc-500">Win Rate</p>
            <span className={`w-2 h-2 rounded-full ${(summary?.winRate ?? 0) >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
          <p className="text-sm font-semibold text-zinc-900">{summary?.winRate ?? 0}%</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-zinc-500">Total P&L</p>
            <span className={`w-2 h-2 rounded-full ${(summary?.totalPnl ?? 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
          <p className="text-sm font-semibold text-zinc-900">{formatPnl(summary?.totalPnl ?? 0)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-zinc-500">Best Trade</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-zinc-900">{formatPnl(summary?.bestTrade ?? 0)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-zinc-500">Worst Trade</p>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <p className="text-sm font-semibold text-zinc-900">{formatPnl(summary?.worstTrade ?? 0)}</p>
        </div>
      </div>

      {/* Cumulative Returns & Consecutive Wins/Losses - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cumulative Returns Table */}
        <div>
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3">
              <h3 className="text-base font-semibold text-zinc-900">Cumulative Returns</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-zinc-500 text-left">Month</th>
                  <th className="px-4 py-2 text-xs font-medium text-zinc-500 text-right">Return</th>
                  <th className="px-4 py-2 text-xs font-medium text-zinc-500 text-right">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {activeMonths.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 text-sm">
                      No trades recorded
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let cumulativePnl = 0;
                    return activeMonths.map((m, index) => {
                      const monthlyReturn = STARTING_CAPITAL > 0 ? (m.totalPnl / STARTING_CAPITAL) * 100 : 0;
                      cumulativePnl += m.totalPnl;
                      const cumulativeReturn = STARTING_CAPITAL > 0 ? (cumulativePnl / STARTING_CAPITAL) * 100 : 0;
                      return (
                        <tr
                          key={m.month}
                          className={`border-b border-zinc-100 bg-white`}
                        >
                          <td className="px-4 py-2">
                            <span className="text-sm font-medium text-zinc-900">
                              {MONTH_NAMES[m.month - 1].slice(0, 3)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="font-mono tabular-nums text-sm font-medium text-zinc-900">
                              {monthlyReturn >= 0 ? '+' : ''}{monthlyReturn.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="font-mono tabular-nums text-sm font-semibold text-zinc-900">
                              {cumulativeReturn >= 0 ? '+' : ''}{cumulativeReturn.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Consecutive Wins/Losses Table */}
        <div>
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3">
              <h3 className="text-base font-semibold text-zinc-900">Max Consecutive</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-zinc-500 text-left">Month</th>
                  <th className="px-4 py-2 text-xs font-medium text-zinc-500 text-center">Winners</th>
                  <th className="px-4 py-2 text-xs font-medium text-zinc-500 text-center">Losers</th>
                </tr>
              </thead>
              <tbody>
                {activeMonths.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 text-sm">
                      No trades recorded
                    </td>
                  </tr>
                ) : (
                  activeMonths.map((m, index) => (
                    <tr
                      key={m.month}
                      className={`border-b border-zinc-100 bg-white`}
                    >
                      <td className="px-4 py-2">
                        <span className="text-sm font-medium text-zinc-900">
                          {MONTH_NAMES[m.month - 1].slice(0, 3)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-7 bg-zinc-100 text-zinc-900 font-semibold text-sm rounded">
                          {m.maxConsecWins}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-7 bg-zinc-100 text-zinc-900 font-semibold text-sm rounded">
                          {m.maxConsecLosses}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Month-by-Month Breakdown */}
      <div>
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {activeMonths.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
              <p className="text-zinc-500 text-sm">No trades recorded in {year}</p>
            </div>
          ) : (
            activeMonths.map((m) => (
              <div key={m.month} className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${MONTH_COLORS[m.month - 1]}`}>
                    {MONTH_NAMES[m.month - 1]}
                  </span>
                  <span className={`font-mono tabular-nums text-lg font-bold ${m.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatPnl(m.totalPnl)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-zinc-500">Win %</span>
                    <p className={`font-mono tabular-nums font-medium ${m.winRate >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.winRate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500">W/L</span>
                    <p className="font-medium">
                      <span className="text-emerald-600">{m.wins}</span>
                      <span className="text-zinc-400">/</span>
                      <span className="text-red-600">{m.losses}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Trades</span>
                    <p className="font-medium text-zinc-900">{m.trades}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3">
            <h3 className="text-base font-semibold text-zinc-900">Monthly Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="h-9">
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-left">Month</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-right">Avg Gain</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-right">Avg Loss</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-center">Win %</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-center">Wins</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-center">Losses</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-center">Trades</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-right">Best</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-right">Worst</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 text-right">Total P&L</th>
                </tr>
              </thead>
              <tbody>
                {activeMonths.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-zinc-500 text-sm">
                      No trades recorded in {year}
                    </td>
                  </tr>
                ) : (
                  activeMonths.map((m, index) => (
                    <tr
                      key={m.month}
                      className={`border-b border-zinc-100 h-9 bg-white`}
                    >
                      {/* Month */}
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${MONTH_COLORS[m.month - 1]}`}>
                          {MONTH_NAMES[m.month - 1]}
                        </span>
                      </td>

                      {/* Avg Gain % */}
                      <td className="px-3 py-2 text-right">
                        <span className="font-mono tabular-nums text-sm text-zinc-900">
                          {m.avgWinPct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Avg Loss % */}
                      <td className="px-3 py-2 text-right">
                        <span className="font-mono tabular-nums text-sm text-zinc-900">
                          {m.avgLossPct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Win Rate */}
                      <td className="px-3 py-2 text-center">
                        <span className="font-mono tabular-nums text-sm font-medium text-zinc-900">
                          {m.winRate}%
                        </span>
                      </td>

                      {/* Wins */}
                      <td className="px-3 py-2 text-center">
                        <span className="text-zinc-900 font-medium text-sm">{m.wins}</span>
                      </td>

                      {/* Losses */}
                      <td className="px-3 py-2 text-center">
                        <span className="text-zinc-900 font-medium text-sm">{m.losses}</span>
                      </td>

                      {/* Trades */}
                      <td className="px-3 py-2 text-center">
                        <span className="text-zinc-900 font-medium text-sm">{m.trades}</span>
                      </td>

                      {/* Best Trade % */}
                      <td className="px-3 py-2 text-right">
                        <span className="font-mono tabular-nums text-sm text-zinc-900">
                          {m.bestTradePct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Worst Trade % */}
                      <td className="px-3 py-2 text-right">
                        <span className="font-mono tabular-nums text-sm text-zinc-900">
                          {m.worstTradePct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Total P&L */}
                      <td className="px-3 py-2 text-right">
                        <span className="font-mono tabular-nums text-sm font-semibold text-zinc-900">
                          {formatPnl(m.totalPnl)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
