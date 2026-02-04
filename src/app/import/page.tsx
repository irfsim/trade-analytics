'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function ImportPage() {
  const [lastImport, setLastImport] = useState<{
    timestamp: Date;
    executions: number;
    trades: number;
  } | null>(null);

  const [syncStatus, setSyncStatus] = useState<{
    configured: boolean;
    loading: boolean;
    error: string | null;
    lastSync: string | null;
  }>({ configured: false, loading: false, error: null, lastSync: null });

  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Check if sync is configured
    fetch('/api/sync')
      .then(res => res.json())
      .then(data => setSyncStatus(s => ({ ...s, configured: data.configured })))
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(s => ({ ...s, error: null }));

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Sync failed');
      }

      setSyncStatus(s => ({ ...s, lastSync: data.synced_at }));
      setLastImport({
        timestamp: new Date(data.synced_at),
        executions: data.executions.inserted,
        trades: data.trades.matched,
      });
      toast.success(`Synced ${data.executions.inserted} executions, matched ${data.trades.matched} trades`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setSyncStatus(s => ({ ...s, error: message }));
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Sync Trades</h1>
          <p className="text-zinc-500 mt-1">Sync your trades from IBKR Flex Web Service</p>
        </div>

        {/* Auto-Sync Section */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-white">Auto-Sync from IBKR</h2>
              <p className="text-sm text-zinc-500 mt-1">
                {syncStatus.configured
                  ? 'Flex Web Service configured - click to sync'
                  : 'Configure Flex Web Service for automatic imports'}
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={!syncStatus.configured || syncing}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                syncStatus.configured
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {syncStatus.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
              <p className="text-red-400 text-sm">{syncStatus.error}</p>
            </div>
          )}

          {!syncStatus.configured && (
            <div className="text-sm text-zinc-400 space-y-2">
              <p>To enable auto-sync, add these to your <code className="text-zinc-300 bg-zinc-800 px-1 rounded">.env.local</code>:</p>
              <pre className="p-3 bg-zinc-950 rounded-lg text-xs overflow-x-auto">
{`IBKR_FLEX_TOKEN=your_token_here
IBKR_FLEX_QUERY_ID=your_query_id`}
              </pre>
              <p className="text-zinc-500">
                Get these from IBKR Portal → Reports → Flex Queries → Flex Web Service
              </p>
            </div>
          )}
        </div>

        {/* Last Sync */}
        {lastImport && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-emerald-400 text-sm">
              Last sync: {lastImport.timestamp.toLocaleString()} —{' '}
              {lastImport.executions} executions, {lastImport.trades} trades
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
