'use client';

import { useState, useEffect } from 'react';
import { ImportDropzone } from '@/components/import-dropzone';

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
    } catch (err) {
      setSyncStatus(s => ({ ...s, error: err instanceof Error ? err.message : 'Sync failed' }));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Import Trades</h1>
          <p className="text-zinc-500 mt-1">Upload your IBKR Flex XML report</p>
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

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-sm text-zinc-500">or upload manually</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Import Dropzone */}
        <ImportDropzone
          onImportComplete={(result) => {
            if (result.success) {
              setLastImport({
                timestamp: new Date(),
                executions: result.executions.inserted,
                trades: result.trades.matched,
              });
            }
          }}
        />

        {/* Instructions */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="font-semibold text-white mb-4">How to export from IBKR</h2>
          <ol className="space-y-3 text-sm text-zinc-400">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center">1</span>
              <span>Log in to IBKR Account Management (Client Portal)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center">2</span>
              <span>Go to <strong className="text-zinc-300">Reports → Flex Queries</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center">3</span>
              <span>Create a new Activity Flex Query or use an existing one</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center">4</span>
              <span>Include <strong className="text-zinc-300">Trades</strong> section with all fields</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center">5</span>
              <span>Set output format to <strong className="text-zinc-300">XML</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center">6</span>
              <span>Run the query and download the XML file</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center">7</span>
              <span>Drop the file above to import</span>
            </li>
          </ol>
        </div>

        {/* Required Fields */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="font-semibold text-white mb-4">Required Flex Query Fields</h2>
          <p className="text-sm text-zinc-500 mb-3">
            Make sure your Flex Query includes these fields in the Trades section:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-zinc-400">• Symbol</div>
            <div className="text-zinc-400">• Date/Time</div>
            <div className="text-zinc-400">• Buy/Sell</div>
            <div className="text-zinc-400">• Quantity</div>
            <div className="text-zinc-400">• Trade Price</div>
            <div className="text-zinc-400">• IB Commission</div>
            <div className="text-zinc-400">• Net Cash</div>
            <div className="text-zinc-400">• IB Exec ID</div>
            <div className="text-zinc-400">• IB Order ID</div>
            <div className="text-zinc-400">• Exchange</div>
          </div>
        </div>

        {/* Last Import */}
        {lastImport && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-emerald-400 text-sm">
              Last import: {lastImport.timestamp.toLocaleString()} —{' '}
              {lastImport.executions} executions, {lastImport.trades} trades
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
