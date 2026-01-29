'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { TradeDetail } from '@/components/trade-detail';
import { AnnotationForm } from '@/components/annotation-form';
import type { TradeWithDetails } from '@/types/database';

export default function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [trade, setTrade] = useState<TradeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrade() {
      try {
        const res = await fetch(`/api/trades/${id}`);
        if (!res.ok) {
          throw new Error('Trade not found');
        }
        const data = await res.json();
        setTrade(data.trade);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trade');
      } finally {
        setLoading(false);
      }
    }
    loadTrade();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-zinc-800 rounded" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-20 bg-zinc-800 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-400">{error || 'Trade not found'}</p>
            <Link href="/trades" className="text-zinc-400 hover:text-white mt-4 inline-block">
              ← Back to trades
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back Link */}
        <Link href="/trades" className="text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to trades
        </Link>

        {/* Trade Details */}
        <TradeDetail trade={trade} />

        {/* Annotation Form */}
        {trade.status === 'CLOSED' && (
          <div className="border-t border-zinc-800 pt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Trade Annotation</h2>
            <AnnotationForm
              tradeId={trade.id}
              existingAnnotation={trade.annotation}
              entryPrice={trade.entry_price}
            />
          </div>
        )}
      </div>
    </div>
  );
}
