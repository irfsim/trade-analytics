'use client';

import { useState, useEffect } from 'react';
import { SlidePanel } from './slide-panel';
import { AnnotationForm } from './annotation-form';
import { TradeChart } from './trade-chart';
import type { TradeWithDetails, TradeLeg } from '@/types/database';

type PanelTab = 'review' | 'details';

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
  const [activeTab, setActiveTab] = useState<PanelTab>('review');

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
      title={trade ? trade.ticker : 'Trade Details'}
      positionLabel={positionLabel}
    >
      {loading && (
        <div className="p-6 space-y-4 animate-pulse">
          <div className="h-8 w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
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
        <div className="p-6 space-y-5">
          {/* Trade Header */}
          <TradeHeader trade={trade} />

          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 h-8 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                activeTab === 'review'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 h-8 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              Execution Details
            </button>
          </div>

          {/* Review Tab */}
          {activeTab === 'review' && (
            <>
              {/* Price Chart */}
              <div>
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

              {/* Annotation Form */}
              {trade.status === 'CLOSED' && (
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-5">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4 text-balance">Trade Review</h3>
                  <AnnotationForm
                    tradeId={trade.id}
                    existingAnnotation={trade.annotation}
                    entryPrice={trade.entry_price}
                    onSave={onAnnotationSave}
                  />
                </div>
              )}
            </>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              <TradeStats trade={trade} />
              <TradeLegsList legs={trade.legs} />
            </>
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
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-balance">{trade.ticker}</h2>
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
        <p className={`text-2xl font-bold font-mono tabular-nums ${pnlColor}`}>
          {formatPnl(pnl)}
        </p>
        {pctChange !== null && (
          <p className={`text-sm font-mono tabular-nums ${pctChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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

  const pctMove = trade.exit_price && trade.entry_price
    ? `${(((trade.exit_price - trade.entry_price) / trade.entry_price) * 100).toFixed(2)}%`
    : '—';

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
        Execution Details
      </h3>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <PropertyRow label="Entry" value={formatPrice(trade.entry_price)} sublabel={formatDateTime(trade.entry_datetime)} />
        <PropertyRow label="Exit" value={formatPrice(trade.exit_price)} sublabel={trade.exit_datetime ? formatDateTime(trade.exit_datetime) : '—'} />
        <PropertyRow label="Shares" value={trade.total_shares.toLocaleString()} />
        <PropertyRow label="Holding" value={holdingPeriod()} />
        <PropertyRow label="Commission" value={`$${trade.total_commission.toFixed(2)}`} />
        <PropertyRow label="% Move" value={pctMove} />
      </div>
    </div>
  );
}

function PropertyRow({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center py-2">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">
        {value}
        {sublabel && <span className="ml-2 font-normal text-zinc-400 dark:text-zinc-500 font-sans">{sublabel}</span>}
      </span>
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
    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-5">
      <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
        Executions
      </h3>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {legs.map((leg) => (
          <div
            key={leg.id}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${legTypeColors[leg.leg_type]}`}>
                {leg.leg_type}
              </span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300 font-mono tabular-nums">
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
