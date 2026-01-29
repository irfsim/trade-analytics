'use client';

import { useState } from 'react';
import type { TradeWithRating } from '@/types/database';

type TradeTab = 'open' | 'closed';

interface TradeTableProps {
  trades: TradeWithRating[];
  loading?: boolean;
  onSelectTrade?: (tradeId: number) => void;
}

export function TradeTable({ trades, loading, onSelectTrade }: TradeTableProps) {
  const [activeTab, setActiveTab] = useState<TradeTab>('closed');
  const [sortField, setSortField] = useState<keyof TradeWithRating>('entry_datetime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const openTrades = trades.filter(t => t.status === 'OPEN');
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const filteredTrades = activeTab === 'open' ? openTrades : closedTrades;

  const handleSort = (field: keyof TradeWithRating) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  if (loading) {
    return (
      <div className="bg-white shadow-card rounded-xl overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-zinc-50" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-t border-zinc-100 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="bg-white shadow-card rounded-xl p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-zinc-900 font-medium mb-1">No trades found</p>
        <p className="text-zinc-500 text-sm">
          Import your IBKR Flex report to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Empty state for filtered view */}
      {sortedTrades.length === 0 ? (
        <div className="bg-white shadow-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-900">Trades</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('closed')}
                className={`text-sm font-medium transition-colors ${
                  activeTab === 'closed' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Closed
              </button>
              <button
                onClick={() => setActiveTab('open')}
                className={`text-sm font-medium transition-colors ${
                  activeTab === 'open' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Open
              </button>
            </div>
          </div>
          <div className="p-12 text-center">
            <p className="text-zinc-500 text-sm">
              {activeTab === 'open' ? 'No open positions' : 'No closed trades'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {sortedTrades.map((trade) => (
              <MobileTradeCard key={trade.id} trade={trade} onSelect={onSelectTrade} />
            ))}
          </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white shadow-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Trades</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('closed')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'closed' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              Closed
            </button>
            <button
              onClick={() => setActiveTab('open')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'open' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              Open
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="h-9">
                <SortableHeader
                  label="Date"
                  field="entry_datetime"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="pl-4"
                />
                <th className="px-2 py-2 text-xs font-medium text-zinc-500 text-left whitespace-nowrap">
                  Symbol
                </th>
                <SortableHeader
                  label="Value"
                  field="total_shares"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <th className="px-2 py-2 text-xs font-medium text-zinc-500 text-right whitespace-nowrap">
                  Size %
                </th>
                <SortableHeader
                  label="%Chg"
                  field="realized_pnl"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="P&L"
                  field="realized_pnl"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <th className="px-2 py-2 text-xs font-medium text-zinc-500 text-right whitespace-nowrap">
                  Acct %
                </th>
                <th className="px-2 py-2 text-xs font-medium text-zinc-500 text-left whitespace-nowrap">
                  Setup
                </th>
                <th className="pl-2 pr-4 py-2 text-xs font-medium text-zinc-500 text-left whitespace-nowrap">
                  Plan
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.map((trade, index) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  onSelect={onSelectTrade}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function MobileTradeCard({ trade, onSelect }: { trade: TradeWithRating; onSelect?: (tradeId: number) => void }) {
  const pnl = trade.realized_pnl;
  const isWinner = pnl !== null && pnl > 0;
  const isLoser = pnl !== null && pnl < 0;

  const pctChange = trade.exit_price && trade.entry_price
    ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
    : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatPnl = (pnl: number | null) => {
    if (pnl === null) return '—';
    const formatted = Math.abs(pnl).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    return pnl >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  return (
    <div
      onClick={() => onSelect?.(trade.id)}
      className="bg-white shadow-card-interactive rounded-xl p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-lg font-semibold text-zinc-900">{trade.ticker}</span>
        <span className="text-sm text-zinc-500">{formatDate(trade.entry_datetime)}</span>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Value: </span>
            <span className="text-zinc-700 font-medium">
              {trade.entry_price !== null
                ? `$${(trade.total_shares * trade.entry_price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : '—'}
            </span>
          </div>
          <RatingBars rating={trade.setup_rating} />
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold font-mono ${
            pnl === null ? 'text-zinc-400' : isWinner ? 'text-emerald-600' : isLoser ? 'text-red-600' : 'text-zinc-600'
          }`}>
            {formatPnl(pnl)}
          </p>
          {pctChange !== null && (
            <p className={`text-xs font-mono ${pctChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  currentField,
  sortDir,
  onSort,
  className = '',
}: {
  label: string;
  field: keyof TradeWithRating;
  currentField: keyof TradeWithRating;
  sortDir: 'asc' | 'desc';
  onSort: (field: keyof TradeWithRating) => void;
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <th
      className={`px-2 py-2 text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-900 transition-colors select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : ''}`}>
        {label}
        <span className={`text-xs ${isActive ? 'text-zinc-700' : 'text-zinc-300'}`}>
          {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
        </span>
      </div>
    </th>
  );
}

function RatingBars({ rating, max = 9 }: { rating: number | null; max?: number }) {
  if (rating === null) {
    return <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />;
  }

  const getBarColor = (rating: number): string => {
    if (rating >= 8) return 'bg-emerald-500';
    if (rating >= 6) return 'bg-amber-500';
    if (rating >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const filledColor = getBarColor(rating);

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`w-1 h-3 rounded-sm ${i < rating ? filledColor : 'bg-zinc-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

function PlanIndicator({ followedPlan }: { followedPlan: boolean | null }) {
  if (followedPlan === null) {
    return <span className="text-xs text-zinc-400">—</span>;
  }
  if (followedPlan) {
    return <span className="text-emerald-600 text-sm">✓</span>;
  }
  return <span className="text-red-600 text-sm">✗</span>;
}

function TradeRow({ trade, onSelect }: { trade: TradeWithRating; onSelect?: (tradeId: number) => void }) {
  const pnl = trade.realized_pnl;
  const isWinner = pnl !== null && pnl > 0;
  const isLoser = pnl !== null && pnl < 0;

  // Calculate % change
  const pctChange = trade.exit_price && trade.entry_price
    ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
    : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatPnl = (pnl: number | null) => {
    if (pnl === null) return '—';
    const rounded = Math.round(Math.abs(pnl));
    const formatted = rounded.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return pnl >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatPct = (pct: number | null) => {
    if (pct === null) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  return (
    <tr
      onClick={() => onSelect?.(trade.id)}
      className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer h-9 bg-white"
    >
      {/* Date */}
      <td className="pl-4 pr-2 py-2 whitespace-nowrap">
        <span className="text-zinc-900 text-sm">
          {formatDate(trade.entry_datetime)}
        </span>
      </td>

      {/* Symbol */}
      <td className="px-2 py-2">
        <span className="text-zinc-900 font-medium text-sm">
          {trade.ticker}
        </span>
      </td>

      {/* Value */}
      <td className="px-2 py-2 text-right text-sm text-zinc-900">
        {trade.entry_price !== null
          ? `$${(trade.total_shares * trade.entry_price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : '—'}
      </td>

      {/* Size % */}
      <td className="px-2 py-2 text-right text-sm text-zinc-900">
        {trade.position_size_pct !== null
          ? `${trade.position_size_pct.toFixed(1)}%`
          : '—'}
      </td>

      {/* % Change */}
      <td className="px-2 py-2 text-right text-sm text-zinc-900">
        {formatPct(pctChange)}
      </td>

      {/* P&L */}
      <td className="px-2 py-2 text-right text-sm text-zinc-900">
        {formatPnl(pnl)}
      </td>

      {/* Acct % */}
      <td className={`px-2 py-2 text-right text-sm ${
        trade.account_pct === null ? 'text-zinc-400' :
        trade.account_pct > 0 ? 'text-emerald-600' :
        trade.account_pct < 0 ? 'text-red-600' : 'text-zinc-900'
      }`}>
        {trade.account_pct !== null
          ? `${trade.account_pct >= 0 ? '+' : ''}${trade.account_pct.toFixed(1)}%`
          : '—'}
      </td>

      {/* Setup */}
      <td className="px-2 py-2">
        <RatingBars rating={trade.setup_rating} />
      </td>

      {/* Plan */}
      <td className="pl-2 pr-4 py-2">
        <PlanIndicator followedPlan={trade.followed_plan} />
      </td>
    </tr>
  );
}
