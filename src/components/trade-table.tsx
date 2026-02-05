'use client';

import { useState } from 'react';
import type { TradeWithRating, MarketRegime } from '@/types/database';

type TradeTab = 'open' | 'closed';

interface TradeTableProps {
  trades: TradeWithRating[];
  loading?: boolean;
  onSelectTrade?: (tradeId: number) => void;
  highlightedTradeId?: number | null;
}

export function TradeTable({ trades, loading, onSelectTrade, highlightedTradeId }: TradeTableProps) {
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
    let aVal: number | null = null;
    let bVal: number | null = null;

    // Handle special computed fields
    if (sortField === 'entry_datetime') {
      aVal = new Date(a.entry_datetime).getTime();
      bVal = new Date(b.entry_datetime).getTime();
    } else if (sortField === 'total_shares') {
      // Sort by position value (shares * entry price)
      aVal = a.entry_price !== null ? a.total_shares * a.entry_price : null;
      bVal = b.entry_price !== null ? b.total_shares * b.entry_price : null;
    } else if (sortField === 'exit_price') {
      // Sort by PnL % (percentage change)
      aVal = a.exit_price && a.entry_price ? ((a.exit_price - a.entry_price) / a.entry_price) * 100 : null;
      bVal = b.exit_price && b.entry_price ? ((b.exit_price - b.entry_price) / b.entry_price) * 100 : null;
    } else if (sortField === 'realized_pnl' || sortField === 'account_pct' || sortField === 'position_size_pct') {
      aVal = a[sortField];
      bVal = b[sortField];
    } else {
      const rawA = a[sortField];
      const rawB = b[sortField];
      aVal = typeof rawA === 'number' ? rawA : null;
      bVal = typeof rawB === 'number' ? rawB : null;
    }

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">Trades</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-400">Open</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Closed</span>
          </div>
        </div>
        <div className="bg-[#FAFAFA] dark:bg-zinc-800 shadow-card rounded-2xl overflow-hidden">
          <div className="animate-pulse">
            <div className="h-10 bg-[#FAFAFA] dark:bg-zinc-800" />
            <div className="bg-white dark:bg-zinc-900">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 border-t border-zinc-100 dark:border-zinc-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">Trades</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-400">Open</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Closed</span>
          </div>
        </div>
        <div className="bg-[#FAFAFA] dark:bg-zinc-800 shadow-card rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">No trades found</p>
          <p className="text-zinc-500 text-sm">
            Import your IBKR Flex report to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row - outside the table card */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">Trades</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('open')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'open' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'closed' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Empty state for filtered view */}
      {sortedTrades.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">
            {activeTab === 'open' ? 'No open positions' : 'No closed trades'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {sortedTrades.map((trade) => (
              <MobileTradeCard key={trade.id} trade={trade} onSelect={onSelectTrade} isHighlighted={trade.id === highlightedTradeId} />
            ))}
          </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-[#FAFAFA] dark:bg-zinc-800 rounded-2xl p-1">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="trade-thead">
              <tr>
                <th className="pl-5 pr-3 py-[13px] text-sm font-normal text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap">
                  Symbol
                </th>
                <SortableHeader
                  label="Date"
                  field="entry_datetime"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-3 py-[13px] text-sm font-normal text-zinc-500 dark:text-zinc-400 text-center whitespace-nowrap w-12">
                  Mkt
                </th>
                <SortableHeader
                  label="Value"
                  field="total_shares"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Size"
                  field="position_size_pct"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="PnL %"
                  field="exit_price"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="PnL $"
                  field="realized_pnl"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Impact"
                  field="account_pct"
                  currentField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <th className="px-1 py-[13px] text-sm font-normal text-zinc-500 dark:text-zinc-400 text-center whitespace-nowrap">
                  Days
                </th>
                <th className="px-3 py-[13px] text-sm font-normal text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap">
                  Setup
                </th>
                <th className="pl-3 pr-1 py-[13px] text-sm font-normal text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap">
                  Quality
                </th>
                <th className="pl-3 pr-5 py-[13px] text-sm font-normal text-zinc-500 dark:text-zinc-400 text-center whitespace-nowrap">
                  Plan
                </th>
              </tr>
            </thead>
            <tbody className="trade-tbody bg-white dark:bg-zinc-900 [&>tr:last-child]:border-b-0">
              {sortedTrades.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  onSelect={onSelectTrade}
                  isHighlighted={trade.id === highlightedTradeId}
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

function MobileTradeCard({ trade, onSelect, isHighlighted }: { trade: TradeWithRating; onSelect?: (tradeId: number) => void; isHighlighted?: boolean }) {
  const pnl = trade.realized_pnl;
  const isWinner = pnl !== null && pnl > 0;
  const isLoser = pnl !== null && pnl < 0;

  const pctChange = trade.exit_price && trade.entry_price
    ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
    : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
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
      className={`bg-white shadow-card-interactive rounded-xl p-4 cursor-pointer hover:bg-zinc-50 transition-colors ${isHighlighted ? 'animate-highlight-fade' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-zinc-900">{trade.ticker}</span>
          <MarketConditionDot condition={trade.market_condition} />
        </div>
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
      className={`px-3 py-[13px] text-sm font-normal cursor-pointer select-none whitespace-nowrap group ${
        isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
      } transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : ''}`}>
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-opacity ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isActive && sortDir === 'asc' ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          )}
        </svg>
        {label}
      </div>
    </th>
  );
}

function RatingBars({ rating, max = 9 }: { rating: number | null; max?: number }) {
  if (rating === null) {
    return (
      <div className="flex items-center justify-start">
        <span className="text-sm text-zinc-400">—</span>
      </div>
    );
  }

  // Calculate percentage (assuming max is the total items/sections)
  const percentage = max > 0 ? Math.round((rating / max) * 100) : 0;

  // Get letter grade from percentage
  const getLetterGrade = (pct: number): string => {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 65) return 'B';
    if (pct >= 50) return 'C';
    return 'F';
  };

  const letterGrade = getLetterGrade(percentage);
  const numBars = 6;
  const filledBars = Math.round((percentage / 100) * numBars);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: numBars }, (_, i) => (
          <div
            key={i}
            className={`w-[3px] h-3 rounded-sm ${i < filledBars ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-600'}`}
          />
        ))}
      </div>
      <span className="text-xs font-normal min-w-[20px] text-zinc-900 dark:text-zinc-100">
        {letterGrade}
      </span>
    </div>
  );
}

function PlanIndicator({ followedPlan }: { followedPlan: boolean | null }) {
  if (followedPlan === null) {
    return <span className="text-xs text-zinc-400">—</span>;
  }
  if (followedPlan) {
    return <span className="text-zinc-900 dark:text-zinc-100 text-sm">✓</span>;
  }
  return <span className="text-zinc-900 dark:text-zinc-100 text-sm">✗</span>;
}

function MarketConditionDot({ condition }: { condition: MarketRegime | null }) {
  if (!condition) {
    return <span className="text-zinc-400">—</span>;
  }

  const colors: Record<MarketRegime, string> = {
    STRONG_UPTREND: 'bg-emerald-500',
    UPTREND_CHOP: 'bg-yellow-500',
    SIDEWAYS: 'bg-yellow-500',
    DOWNTREND: 'bg-red-500',
    CORRECTION: 'bg-red-500',
  };

  const labels: Record<MarketRegime, string> = {
    STRONG_UPTREND: 'Strong Uptrend',
    UPTREND_CHOP: 'Uptrend + Chop',
    SIDEWAYS: 'Sideways',
    DOWNTREND: 'Downtrend',
    CORRECTION: 'Correction',
  };

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${colors[condition]} cursor-default`}
      title={labels[condition]}
    />
  );
}

function SetupTypePill({ name, color }: { name: string; color: string | null }) {
  // Default color if none specified
  const baseColor = color || '#6366f1';

  // Convert hex to RGB for creating a light background
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 99, g: 102, b: 241 };
  };

  // Smart abbreviation: multi-word → initials, single word → truncate
  const getDisplayName = (fullName: string): string => {
    // Special case for default setup
    if (fullName === 'No setup / Other') {
      return 'None';
    }
    const words = fullName.trim().split(/\s+/);
    if (words.length > 1) {
      // Multi-word: use initials (e.g., "Base Breakout" → "BB")
      return words.map(w => w[0].toUpperCase()).join('');
    }
    // Single word: truncate if > 6 chars
    if (fullName.length > 6) {
      return fullName.slice(0, 5) + '…';
    }
    return fullName;
  };

  const rgb = hexToRgb(baseColor);
  const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
  // Darken the text color for better readability
  const textColor = `rgb(${Math.round(rgb.r * 0.65)}, ${Math.round(rgb.g * 0.65)}, ${Math.round(rgb.b * 0.65)})`;
  const displayName = getDisplayName(name);
  const needsTooltip = displayName !== name;

  return (
    <span
      className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap cursor-default"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      title={needsTooltip ? name : undefined}
    >
      {displayName}
    </span>
  );
}

function TradeRow({ trade, onSelect, isHighlighted }: { trade: TradeWithRating; onSelect?: (tradeId: number) => void; isHighlighted?: boolean }) {
  const pnl = trade.realized_pnl;
  const isWinner = pnl !== null && pnl > 0;
  const isLoser = pnl !== null && pnl < 0;

  // Calculate % change
  const pctChange = trade.exit_price && trade.entry_price
    ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
    : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
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
      className={`border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer h-10 ${isHighlighted ? 'animate-highlight-fade' : ''}`}
    >
      {/* Symbol */}
      <td className="pl-5 pr-3 py-2">
        <span className="text-zinc-900 dark:text-zinc-100 font-medium text-sm">
          {trade.ticker}
        </span>
      </td>

      {/* Date */}
      <td className="px-3 py-2 whitespace-nowrap">
        <span className="text-zinc-900 dark:text-zinc-100 text-sm">
          {formatDate(trade.entry_datetime)}
        </span>
      </td>

      {/* Market */}
      <td className="px-3 py-2 text-center w-12">
        <MarketConditionDot condition={trade.market_condition} />
      </td>

      {/* Value */}
      <td className="px-4 py-2 text-sm font-mono whitespace-nowrap text-zinc-900 dark:text-zinc-100 text-right">
        {trade.entry_price !== null
          ? `$${(trade.total_shares * trade.entry_price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : '—'}
      </td>

      {/* Size % */}
      <td className="px-4 py-2 text-sm font-mono whitespace-nowrap text-zinc-900 dark:text-zinc-100 text-right">
        {trade.position_size_pct !== null
          ? `${trade.position_size_pct.toFixed(1)}%`
          : '—'}
      </td>

      {/* % Change */}
      <td className="px-4 py-2 text-sm font-mono whitespace-nowrap text-zinc-900 dark:text-zinc-100 text-right">
        {formatPct(pctChange)}
      </td>

      {/* P&L */}
      <td className="px-4 py-2 text-sm font-mono whitespace-nowrap text-zinc-900 dark:text-zinc-100 text-right">
        {formatPnl(pnl)}
      </td>

      {/* Impact */}
      <td className="px-4 py-2 text-sm font-mono whitespace-nowrap text-zinc-900 dark:text-zinc-100 text-right">
        {trade.account_pct !== null
          ? `${trade.account_pct >= 0 ? '+' : ''}${trade.account_pct.toFixed(1)}%`
          : '—'}
      </td>

      {/* Days */}
      <td className="px-1 py-2 text-center text-sm text-zinc-900 dark:text-zinc-100">
        {(() => {
          const entry = new Date(trade.entry_datetime);
          const exit = trade.exit_datetime ? new Date(trade.exit_datetime) : new Date();
          const days = Math.ceil((exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
          return days;
        })()}
      </td>

      {/* Setup Type */}
      <td className="px-3 py-2">
        {trade.setup_type_name ? (
          <SetupTypePill name={trade.setup_type_name} color={trade.setup_type_color} />
        ) : (
          <span className="text-sm text-zinc-400">—</span>
        )}
      </td>

      {/* Quality */}
      <td className="pl-3 pr-1 py-2 align-middle">
        <RatingBars rating={trade.setup_rating} />
      </td>

      {/* Plan */}
      <td className="pl-3 pr-5 py-2 text-center">
        <PlanIndicator followedPlan={trade.followed_plan} />
      </td>
    </tr>
  );
}
