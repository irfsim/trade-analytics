'use client';

import { useState } from 'react';
import type { TradeWithDetails, TradeLeg } from '@/types/database';

interface TradeDetailProps {
  trade: TradeWithDetails;
}

export function TradeDetail({ trade }: TradeDetailProps) {
  const pnl = trade.realized_pnl;
  const pnlColor = pnl === null ? 'text-zinc-500' : pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-zinc-400';

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '—';
    return `$${price.toFixed(2)}`;
  };

  const formatPnl = (pnl: number | null) => {
    if (pnl === null) return '—';
    const sign = pnl > 0 ? '+' : '';
    return `${sign}$${pnl.toFixed(2)}`;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{trade.ticker}</h1>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
              trade.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {trade.direction}
            </span>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
              trade.status === 'OPEN' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-400'
            }`}>
              {trade.status}
            </span>
          </div>
          <p className="text-zinc-500 mt-1">{trade.account_id} Account</p>
        </div>

        <div className="text-right">
          <p className={`text-3xl font-bold ${pnlColor}`}>
            {formatPnl(pnl)}
          </p>
          <p className="text-sm text-zinc-500">Realized P&L</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Entry Price" value={formatPrice(trade.entry_price)} />
        <StatCard label="Exit Price" value={formatPrice(trade.exit_price)} />
        <StatCard label="Total Shares" value={trade.total_shares.toLocaleString()} />
        <StatCard label="Commission" value={`$${trade.total_commission.toFixed(2)}`} />
        <StatCard label="Entry Time" value={formatDateTime(trade.entry_datetime)} />
        <StatCard label="Exit Time" value={trade.exit_datetime ? formatDateTime(trade.exit_datetime) : '—'} />
        <StatCard label="Holding Period" value={holdingPeriod()} />
        <StatCard
          label="% Gain"
          value={trade.exit_price && trade.entry_price
            ? `${(((trade.exit_price - trade.entry_price) / trade.entry_price) * 100).toFixed(2)}%`
            : '—'
          }
        />
      </div>

      {/* Trade Legs */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Trade Legs</h2>
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-left">
                <th className="px-4 py-3 font-medium text-zinc-400">Time</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Type</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Shares</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Price</th>
                <th className="px-4 py-3 font-medium text-zinc-400">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {trade.legs.map((leg) => (
                <LegRow key={leg.id} leg={leg} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-lg font-medium text-white mt-1">{value}</p>
    </div>
  );
}

function LegRow({ leg }: { leg: TradeLeg }) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const legTypeColors: Record<string, string> = {
    ENTRY: 'bg-emerald-500/20 text-emerald-400',
    ADD: 'bg-blue-500/20 text-blue-400',
    TRIM: 'bg-amber-500/20 text-amber-400',
    EXIT: 'bg-red-500/20 text-red-400',
  };

  const value = leg.shares * leg.price;

  return (
    <tr className="hover:bg-zinc-800/30 transition-colors">
      <td className="px-4 py-3 text-zinc-300">
        {formatDateTime(leg.executed_at)}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${legTypeColors[leg.leg_type]}`}>
          {leg.leg_type}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-300">
        {leg.shares.toLocaleString()}
      </td>
      <td className="px-4 py-3 font-mono tabular-nums text-zinc-300">
        ${leg.price.toFixed(2)}
      </td>
      <td className="px-4 py-3 font-mono tabular-nums text-zinc-300">
        ${value.toFixed(2)}
      </td>
    </tr>
  );
}
