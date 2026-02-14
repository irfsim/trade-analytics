'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { TradeLeg } from '@/types/database';
import type { ChartInterval } from '@/types/chart';

interface TradeChartProps {
  ticker: string;
  entryDatetime: string;
  exitDatetime: string | null;
  entryPrice: number;
  exitPrice: number | null;
  legs: TradeLeg[];
  direction: 'LONG' | 'SHORT';
}

const INTERVALS: { value: ChartInterval; label: string }[] = [
  { value: '1d', label: 'Daily' },
  { value: '1h', label: 'Hourly' },
  { value: '5m', label: '5 Min' },
];

export function TradeChart({
  ticker,
  entryDatetime,
  exitDatetime,
  entryPrice,
  exitPrice,
  legs,
  direction,
}: TradeChartProps) {
  const [interval, setInterval] = useState<ChartInterval>('1d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Build chart image URL
  // In development, use local Python server (localhost:3002)
  // In production (Vercel), use the Python serverless function
  const chartUrl = useMemo(() => {
    const params = new URLSearchParams({
      ticker,
      interval,
      from: entryDatetime,
      entry: entryPrice.toString(),
      direction,
      legs: JSON.stringify(
        legs.map((leg) => ({
          leg_type: leg.leg_type,
          price: leg.price,
          shares: leg.shares,
          executed_at: leg.executed_at,
        }))
      ),
    });

    if (exitDatetime) {
      params.set('to', exitDatetime);
    }
    if (exitPrice !== null) {
      params.set('exit', exitPrice.toString());
    }

    // Local Python server for development, Vercel function for production
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const baseUrl = isDev ? 'http://localhost:3002' : '';

    // Add timestamp to prevent caching during development
    if (isDev) {
      params.set('_t', Date.now().toString());
    }

    return `${baseUrl}/api/chart-image?${params.toString()}`;
  }, [ticker, interval, entryDatetime, exitDatetime, entryPrice, exitPrice, legs, direction]);

  return (
    <div className="space-y-3">
      {/* Timeframe selector */}
      <div className="flex gap-2">
        {INTERVALS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setInterval(value);
              setLoading(true);
              setError(false);
            }}
            className={`px-3 h-7 text-xs font-medium rounded-full transition-colors ${
              interval === value
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart image */}
      <div className="relative w-full h-80 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
            <div className="animate-spin w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
            <p className="text-zinc-400 text-sm">Failed to load chart</p>
          </div>
        )}
        <Image
          src={chartUrl}
          alt={`${ticker} ${interval} chart`}
          fill
          className="object-contain"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          unoptimized // Required for external/dynamic images
        />
      </div>
    </div>
  );
}
