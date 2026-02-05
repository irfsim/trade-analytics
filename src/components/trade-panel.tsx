'use client';

import { useState, useEffect } from 'react';
import { SlidePanel } from './slide-panel';
import { AnnotationForm } from './annotation-form';
import { TradeChart } from './trade-chart';
import type { TradeWithDetails, TradeLeg } from '@/types/database';

interface TradePanelProps {
  tradeId: number | null;
  tradeIds?: number[];
  onClose: () => void;
  onNavigate?: (tradeId: number) => void;
  onAnnotationSave?: () => void;
}

export function TradePanel({ tradeId, tradeIds = [], onClose, onNavigate, onAnnotationSave }: TradePanelProps) {
  const [trade, setTrade] = useState<TradeWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = tradeId ? tradeIds.indexOf(tradeId) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < tradeIds.length - 1;

  const handlePrev = () => {
    if (hasPrev && onNavigate) {
      onNavigate(tradeIds[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(tradeIds[currentIndex + 1]);
    }
  };

  useEffect(() => {
    if (!tradeId) {
      setTrade(null);
      return;
    }

    async function loadTrade() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trades/${tradeId}`);
        if (!res.ok) throw new Error('Trade not found');
        const data = await res.json();
        setTrade(data.trade);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trade');
      } finally {
        setLoading(false);
      }
    }

    loadTrade();
  }, [tradeId]);

  const isOpen = tradeId !== null;
  const positionLabel = currentIndex >= 0 ? `${currentIndex + 1} of ${tradeIds.length}` : '';

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      onPrev={handlePrev}
      onNext={handleNext}
      hasPrev={hasPrev}
      hasNext={hasNext}
      title={trade ? `${trade.ticker} Trade${positionLabel ? ` · ${positionLabel}` : ''}` : 'Trade Details'}
    >
      {loading && (
        <div className="p-6 space-y-4 animate-pulse">
          <div className="h-8 w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {trade && !loading && (
        <div className="p-6 space-y-6">
          {/* Trade Header */}
          <TradeHeader trade={trade} />

          {/* Price Chart */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
              Price Chart
            </h3>
            <TradeChart
              ticker={trade.ticker}
              entryDatetime={trade.entry_datetime}
              exitDatetime={trade.exit_datetime}
              entryPrice={trade.entry_price}
              exitPrice={trade.exit_price}
              legs={trade.legs}
              direction={trade.direction}
            />
          </div>

          {/* Stats Grid */}
          <TradeStats trade={trade} />

          {/* Trade Legs */}
          <TradeLegsList legs={trade.legs} />

          {/* Annotation Form */}
          {trade.status === 'CLOSED' && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Trade Review</h3>
              <AnnotationForm
                tradeId={trade.id}
                existingAnnotation={trade.annotation}
                entryPrice={trade.entry_price}
                onSave={onAnnotationSave}
              />
            </div>
          )}
        </div>
      )}
    </SlidePanel>
  );
}

function TradeHeader({ trade }: { trade: TradeWithDetails }) {
  const pnl = trade.realized_pnl;
  const pnlColor = pnl === null ? 'text-zinc-500' : pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : pnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500';

  const formatPnl = (pnl: number | null) => {
    if (pnl === null) return '—';
    const formatted = Math.abs(pnl).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    return pnl >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const pctChange = trade.exit_price && trade.entry_price
    ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
    : null;

  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{trade.ticker}</h2>
          <span className={`
            inline-flex px-2.5 py-1 text-xs font-bold rounded-md uppercase
            ${trade.direction === 'LONG'
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
            }
          `}>
            {trade.direction}
          </span>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">{trade.account_id} Account</p>
      </div>

      <div className="text-right">
        <p className={`text-2xl font-bold font-mono ${pnlColor}`}>
          {formatPnl(pnl)}
        </p>
        {pctChange !== null && (
          <p className={`text-sm font-mono ${pctChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
          </p>
        )}
      </div>
    </div>
  );
}

function TradeStats({ trade }: { trade: TradeWithDetails }) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '—';
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const holdingPeriod = () => {
    if (!trade.exit_datetime) return 'Open';
    const entry = new Date(trade.entry_datetime);
    const exit = new Date(trade.exit_datetime);
    const diff = exit.getTime() - entry.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Entry" value={formatPrice(trade.entry_price)} sublabel={formatDateTime(trade.entry_datetime)} />
      <StatCard label="Exit" value={formatPrice(trade.exit_price)} sublabel={trade.exit_datetime ? formatDateTime(trade.exit_datetime) : '—'} />
      <StatCard label="Shares" value={trade.total_shares.toLocaleString()} />
      <StatCard label="Holding" value={holdingPeriod()} />
      <StatCard label="Commission" value={`$${trade.total_commission.toFixed(2)}`} />
      <StatCard
        label="% Move"
        value={trade.exit_price && trade.entry_price
          ? `${(((trade.exit_price - trade.entry_price) / trade.entry_price) * 100).toFixed(2)}%`
          : '—'
        }
      />
    </div>
  );
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{value}</p>
      {sublabel && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

function TradeLegsList({ legs }: { legs: TradeLeg[] }) {
  if (legs.length === 0) return null;

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const legTypeColors: Record<string, string> = {
    ENTRY: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50',
    ADD: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50',
    TRIM: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50',
    EXIT: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50',
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
        Executions
      </h3>
      <div className="space-y-2">
        {legs.map((leg) => (
          <div
            key={leg.id}
            className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${legTypeColors[leg.leg_type]}`}>
                {leg.leg_type}
              </span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {leg.shares.toLocaleString()} @ ${leg.price.toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatDateTime(leg.executed_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
