'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IbkrOnboardingWizard } from '@/components/onboarding';
import type { BrokerConnectionWithAccounts } from '@/types/database';
import { BROKER_INFO } from '@/lib/brokers/types';

export default function ConnectPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<BrokerConnectionWithAccounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
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

  async function handleDisconnect(connectionId: number) {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      await fetch(`/api/connections/${connectionId}`, { method: 'DELETE' });
      await fetchConnections();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }

  function handleWizardComplete() {
    setShowWizard(false);
    fetchConnections();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full" />
      </div>
    );
  }

  // No connections - show empty state with wizard trigger
  if (connections.length === 0 && !showWizard) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-zinc-100 dark:bg-[#1c1c1e] flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Connect Your Broker
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Link your brokerage account to automatically import your trades and track your performance.
          </p>

          <div className="space-y-3">
            {Object.values(BROKER_INFO).map(broker => (
              <button
                key={broker.type}
                onClick={() => broker.comingSoon ? null : setShowWizard(true)}
                disabled={broker.comingSoon}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  broker.comingSoon
                    ? 'border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{broker.name}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{broker.description}</p>
                  </div>
                  {broker.comingSoon ? (
                    <span className="text-xs font-medium bg-zinc-100 dark:bg-[#1c1c1e] text-zinc-500 dark:text-zinc-400 px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  ) : (
                    <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push('/')}
            className="mt-6 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Back to Dashboard
          </button>
        </div>

        {showWizard && (
          <IbkrOnboardingWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}
      </div>
    );
  }

  // Has connections - show management UI
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Broker Connections
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Manage your connected brokerage accounts
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Add Connection
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {connections.map(connection => (
            <div
              key={connection.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    connection.status === 'active'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : connection.status === 'error'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-zinc-100 dark:bg-[#1c1c1e]'
                  }`}>
                    {connection.status === 'active' ? (
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : connection.status === 'error' ? (
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {connection.label}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {BROKER_INFO[connection.broker_type]?.name || connection.broker_type}
                    </p>
                    {connection.last_sync_at && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                      </p>
                    )}
                    {connection.last_error && connection.status === 'error' && (
                      <p className="text-xs text-red-500 mt-1">
                        Error: {connection.last_error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(connection.id)}
                    disabled={syncingConnection === connection.id}
                    className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full disabled:opacity-50"
                  >
                    {syncingConnection === connection.id ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Syncing...
                      </span>
                    ) : (
                      'Sync Now'
                    )}
                  </button>
                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Linked Accounts */}
              {connection.account_links && connection.account_links.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Linked Accounts
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {connection.account_links.map(link => (
                      <div
                        key={link.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-[#1c1c1e] rounded-lg text-sm"
                      >
                        <span className="font-mono text-xs text-zinc-500">
                          {link.external_account_id}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-600">→</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {link.account_name || link.internal_account_id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sync Stats */}
              {connection.last_sync && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Last Sync Results
                  </h4>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-zinc-500">Fetched:</span>{' '}
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                        {connection.last_sync.executions_fetched}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Inserted:</span>{' '}
                      <span className="text-emerald-600 font-medium">
                        {connection.last_sync.executions_inserted}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Skipped:</span>{' '}
                      <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                        {connection.last_sync.executions_skipped}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Trades:</span>{' '}
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                        {connection.last_sync.trades_matched}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showWizard && (
        <IbkrOnboardingWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
