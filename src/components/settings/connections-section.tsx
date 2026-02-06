'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { BrokerConnectionWithAccounts } from '@/types/database';
import { BROKER_INFO } from '@/lib/brokers/types';

export function ConnectionsSection() {
  const router = useRouter();
  const [connections, setConnections] = useState<BrokerConnectionWithAccounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingConnection, setSyncingConnection] = useState<number | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync(connectionId: number) {
    setSyncingConnection(connectionId);
    try {
      await fetch(`/api/connections/${connectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_type: 'manual' }),
      });
      await fetchConnections();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncingConnection(null);
    }
  }

  async function handleToggleAutoSync(connectionId: number, enabled: boolean) {
    try {
      await fetch(`/api/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_sync_enabled: enabled }),
      });
      await fetchConnections();
    } catch (error) {
      console.error('Failed to update auto-sync:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Broker Connections
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your connected brokerage accounts
          </p>
        </div>
        <button
          onClick={() => router.push('/connect')}
          className="px-3 py-1.5 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          {connections.length > 0 ? 'Manage' : 'Connect'}
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <p className="text-zinc-600 dark:text-zinc-400 mb-3">
            No broker accounts connected
          </p>
          <button
            onClick={() => router.push('/connect')}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Connect your first account →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(connection => (
            <div
              key={connection.id}
              className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connection.status === 'active'
                        ? 'bg-emerald-500'
                        : connection.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-zinc-400'
                    }`}
                  />
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                      {connection.label}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {BROKER_INFO[connection.broker_type]?.name}
                      {connection.last_sync_at && (
                        <> · Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={connection.auto_sync_enabled}
                      onChange={e => handleToggleAutoSync(connection.id, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    Auto
                  </label>
                  <button
                    onClick={() => handleSync(connection.id)}
                    disabled={syncingConnection === connection.id}
                    className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded disabled:opacity-50"
                  >
                    {syncingConnection === connection.id ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              </div>
              {connection.status === 'error' && connection.last_error && (
                <p className="mt-2 text-xs text-red-500">{connection.last_error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
