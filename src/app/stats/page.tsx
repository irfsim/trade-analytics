'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserMenu } from '@/components/user-menu';
import { NavTabs } from '@/components/nav-tabs';
import { MonthlyBreakdown } from '@/components/monthly-breakdown';
import { PlanFilterToggle } from '@/components/plan-filter-toggle';
import { AccountDropdown } from '@/components/account-dropdown';
import { PeriodDropdown, getDateRange, type Period } from '@/components/period-dropdown';
import type { PerformanceMetrics } from '@/types/database';

const PLAN_FILTER_KEY = 'trade-analytics-plan-filter';
const PERIOD_KEY = 'trade-analytics-period';
const VALID_PERIODS = ['today', 'yesterday', 'week', 'lastweek', 'month', 'lastmonth', 'year', 'lastyear', 'all'];

interface StatsData {
  metrics: PerformanceMetrics;
  equityCurve: { date: string; equity: number }[];
  segmentedMetrics: Record<string, PerformanceMetrics> | null;
  ruleAdherence: {
    followed: PerformanceMetrics;
    broken: PerformanceMetrics;
  };
  pnlDistribution: { bucket: string; count: number; totalPnl: number }[];
  tradeCount: number;
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [segmentBy, setSegmentBy] = useState<'setup_type' | 'market_regime' | 'grade'>('setup_type');
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [planOnly, setPlanOnly] = useState(false);
  const [tradeCount, setTradeCount] = useState<{ filtered: number; total: number }>({ filtered: 0, total: 0 });

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPlan = localStorage.getItem(PLAN_FILTER_KEY);
      if (storedPlan === 'true') {
        setPlanOnly(true);
      }
      const storedPeriod = localStorage.getItem(PERIOD_KEY) as Period | null;
      if (storedPeriod && VALID_PERIODS.includes(storedPeriod)) {
        setPeriod(storedPeriod);
      }
    }
  }, []);

  const handlePlanOnlyChange = useCallback((enabled: boolean) => {
    setPlanOnly(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PLAN_FILTER_KEY, enabled.toString());
    }
  }, []);

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PERIOD_KEY, newPeriod);
    }
  }, []);

  const handleTradeCountChange = useCallback((filtered: number, total: number) => {
    setTradeCount({ filtered, total });
  }, []);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (accountId) params.set('accountId', accountId);
        params.set('segmentBy', segmentBy);
        if (planOnly) params.set('planOnly', 'true');

        const dateRange = getDateRange(period);
        if (dateRange.from) params.set('from', dateRange.from);
        if (dateRange.to) params.set('to', dateRange.to);

        const res = await fetch(`/api/stats?${params}`);
        const statsData = await res.json();
        setData(statsData);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [accountId, segmentBy, planOnly, period]);

  const formatPnl = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  return (
    <div className="pt-6 pb-24 max-w-[730px] mx-auto">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AccountDropdown value={accountId} onChange={setAccountId} />
            <PeriodDropdown value={period} onChange={handlePeriodChange} />
          </div>
          <div className="flex items-center gap-4">
            <PlanFilterToggle
              enabled={planOnly}
              onChange={handlePlanOnlyChange}
              filteredCount={tradeCount.filtered}
              totalCount={tradeCount.total}
            />
            <UserMenu initial="I" />
          </div>
        </div>

        {/* Monthly Performance */}
        <MonthlyBreakdown
          accountId={accountId}
          planOnly={planOnly}
          period={period}
          onTradeCountChange={handleTradeCountChange}
        />

        {loading ? (
          <LoadingSkeleton />
        ) : data ? (
          <>
            {/* Overview Metrics */}
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-zinc-500 mb-1">Trades</p>
                <p className="text-sm font-semibold text-zinc-900">{data.metrics.totalTrades}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm text-zinc-500">Win Rate</p>
                  <span className={`w-2 h-2 rounded-full ${data.metrics.winRate >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-sm font-semibold text-zinc-900">{data.metrics.winRate}%</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm text-zinc-500">Net P&L</p>
                  <span className={`w-2 h-2 rounded-full ${data.metrics.netPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-sm font-semibold text-zinc-900">{formatPnl(data.metrics.netPnl)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm text-zinc-500">Profit Factor</p>
                  <span className={`w-2 h-2 rounded-full ${data.metrics.profitFactor >= 1 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  {data.metrics.profitFactor === Infinity ? '∞' : data.metrics.profitFactor.toFixed(2)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm text-zinc-500">Expectancy</p>
                  <span className={`w-2 h-2 rounded-full ${data.metrics.expectancy >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-sm font-semibold text-zinc-900">{formatPnl(data.metrics.expectancy)}</p>
              </div>
            </div>

            {/* Detailed Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Win/Loss Stats */}
              <div className="p-6 bg-white border border-zinc-200 rounded-lg">
                <h2 className="font-semibold text-zinc-900 mb-4">Win/Loss Breakdown</h2>
                <div className="space-y-3">
                  <StatRow label="Winners" value={data.metrics.winners.toString()} color="emerald" />
                  <StatRow label="Losers" value={data.metrics.losers.toString()} color="red" />
                  <StatRow label="Breakeven" value={data.metrics.breakeven.toString()} />
                  <div className="border-t border-zinc-200 pt-3 mt-3">
                    <StatRow label="Average Win" value={formatPnl(data.metrics.averageWin)} color="emerald" />
                    <StatRow label="Average Loss" value={formatPnl(-data.metrics.averageLoss)} color="red" />
                  </div>
                </div>
              </div>

              {/* Risk Metrics */}
              <div className="p-6 bg-white border border-zinc-200 rounded-lg">
                <h2 className="font-semibold text-zinc-900 mb-4">Risk Metrics</h2>
                <div className="space-y-3">
                  <StatRow
                    label="Max Drawdown"
                    value={formatPnl(-data.metrics.maxDrawdown)}
                    color="red"
                  />
                  <StatRow
                    label="Max DD %"
                    value={`${data.metrics.maxDrawdownPercent.toFixed(1)}%`}
                    color="red"
                  />
                  {data.metrics.averageR !== null && (
                    <StatRow label="Average R" value={`${data.metrics.averageR}R`} />
                  )}
                  {data.metrics.expectancyR !== null && (
                    <StatRow
                      label="Expectancy (R)"
                      value={`${data.metrics.expectancyR}R`}
                      color={data.metrics.expectancyR >= 0 ? 'emerald' : 'red'}
                    />
                  )}
                  <StatRow
                    label="Total Commission"
                    value={`$${data.metrics.totalCommission.toFixed(2)}`}
                  />
                </div>
              </div>
            </div>

            {/* Rule Adherence */}
            <div className="p-6 bg-white border border-zinc-200 rounded-lg">
              <h2 className="font-semibold text-zinc-900 mb-4">Rule Adherence Impact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm text-emerald-600 font-medium mb-3">Valid Setups (Followed Rules)</h3>
                  <div className="space-y-2">
                    <StatRow label="Trades" value={data.ruleAdherence.followed.totalTrades.toString()} />
                    <StatRow
                      label="Win Rate"
                      value={`${data.ruleAdherence.followed.winRate}%`}
                      color={data.ruleAdherence.followed.winRate >= 50 ? 'emerald' : 'red'}
                    />
                    <StatRow
                      label="Net P&L"
                      value={formatPnl(data.ruleAdherence.followed.netPnl)}
                      color={data.ruleAdherence.followed.netPnl >= 0 ? 'emerald' : 'red'}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm text-red-600 font-medium mb-3">Invalid Setups (Broke Rules)</h3>
                  <div className="space-y-2">
                    <StatRow label="Trades" value={data.ruleAdherence.broken.totalTrades.toString()} />
                    <StatRow
                      label="Win Rate"
                      value={`${data.ruleAdherence.broken.winRate}%`}
                      color={data.ruleAdherence.broken.winRate >= 50 ? 'emerald' : 'red'}
                    />
                    <StatRow
                      label="Net P&L"
                      value={formatPnl(data.ruleAdherence.broken.netPnl)}
                      color={data.ruleAdherence.broken.netPnl >= 0 ? 'emerald' : 'red'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Segmented Analysis */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900">Performance by Segment</h2>
                <select
                  value={segmentBy}
                  onChange={(e) => setSegmentBy(e.target.value as typeof segmentBy)}
                  className="bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                >
                  <option value="setup_type">Setup Type</option>
                  <option value="market_regime">Market Regime</option>
                  <option value="grade">Grade</option>
                </select>
              </div>

              {data.segmentedMetrics && Object.keys(data.segmentedMetrics).length > 0 ? (
                <div className="overflow-x-auto px-4 pb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left h-9">
                        <th className="pb-2 text-xs font-medium text-zinc-500">Segment</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500">Trades</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500">Win Rate</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500">Net P&L</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500">Avg Win</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500">Avg Loss</th>
                        <th className="pb-2 text-xs font-medium text-zinc-500">Expectancy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {Object.entries(data.segmentedMetrics).map(([segment, metrics]) => (
                        <tr key={segment} className="h-9">
                          <td className="py-2 text-zinc-900 font-medium">{formatSegment(segment)}</td>
                          <td className="py-2 text-zinc-900">{metrics.totalTrades}</td>
                          <td className="py-2 text-zinc-900">
                            {metrics.winRate}%
                          </td>
                          <td className="py-2 text-zinc-900">
                            {formatPnl(metrics.netPnl)}
                          </td>
                          <td className="py-2 text-zinc-900">{formatPnl(metrics.averageWin)}</td>
                          <td className="py-2 text-zinc-900">{formatPnl(-metrics.averageLoss)}</td>
                          <td className="py-2 text-zinc-900">
                            {formatPnl(metrics.expectancy)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-zinc-500 text-center px-4 py-8">
                  No segmented data available. Annotate your trades to see breakdown by {segmentBy.replace('_', ' ')}.
                </p>
              )}
            </div>

            {/* Equity Curve Placeholder */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3">
                <h2 className="text-base font-semibold text-zinc-900">Equity Curve</h2>
              </div>
              {data.equityCurve.length > 0 ? (
                <div className="h-64 flex items-end gap-1 px-4 pb-4">
                  {data.equityCurve.map((point, i) => {
                    const max = Math.max(...data.equityCurve.map(p => Math.abs(p.equity)));
                    const height = max > 0 ? (Math.abs(point.equity) / max) * 100 : 0;
                    const isPositive = point.equity >= 0;

                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col justify-end"
                        title={`${new Date(point.date).toLocaleDateString()}: ${formatPnl(point.equity)}`}
                      >
                        <div
                          className={`w-full rounded-t ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-zinc-500 text-center py-8">
                  No equity data available yet.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-zinc-500">
            Failed to load statistics
          </div>
        )}
      </div>
      <NavTabs active="stats" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'emerald' | 'red';
}) {
  const colorClasses = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
  };

  return (
    <div className="p-4 bg-white border border-zinc-200 rounded-lg">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color ? colorClasses[color] : 'text-zinc-900'}`}>
        {value}
      </p>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'emerald' | 'red';
}) {
  const colorClasses = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
  };

  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-medium ${color ? colorClasses[color] : 'text-zinc-900'}`}>
        {value}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-zinc-100 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 bg-zinc-100 rounded-lg" />
        <div className="h-48 bg-zinc-100 rounded-lg" />
      </div>
    </div>
  );
}

function formatSegment(segment: string): string {
  const map: Record<string, string> = {
    EP: 'Episodic Pivot',
    FLAG: 'Bull Flag',
    BASE_BREAKOUT: 'Base Breakout',
    OTHER: 'Other',
    STRONG_UPTREND: 'Strong Uptrend',
    UPTREND_CHOP: 'Uptrend + Chop',
    SIDEWAYS: 'Sideways',
    DOWNTREND: 'Downtrend',
    CORRECTION: 'Correction',
    'A+': 'A+',
    A: 'A',
    B: 'B',
    C: 'C',
    F: 'F',
    Unknown: 'Not Annotated',
  };
  return map[segment] || segment;
}
