'use client';

import { useState, useCallback } from 'react';
import type { DiscoveredAccount } from '@/lib/brokers/types';

type WizardStep = 'welcome' | 'create-query' | 'credentials' | 'test-connection' | 'initial-sync';

interface AccountSetup {
  externalId: string;
  label: string;
  accountType: 'margin' | 'isa' | 'other';
}

interface IbkrOnboardingWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS: { id: WizardStep; title: string }[] = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'create-query', title: 'Create Flex Query' },
  { id: 'credentials', title: 'Enter Credentials' },
  { id: 'test-connection', title: 'Connect Accounts' },
  { id: 'initial-sync', title: 'Sync Trades' },
];

export function IbkrOnboardingWizard({ onComplete, onCancel }: IbkrOnboardingWizardProps) {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [connectionId, setConnectionId] = useState<number | null>(null);
  const [flexToken, setFlexToken] = useState('');
  const [flexQueryId, setFlexQueryId] = useState('');
  const [connectionLabel, setConnectionLabel] = useState('IBKR Account');
  const [showToken, setShowToken] = useState(false);

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<DiscoveredAccount[]>([]);
  const [accountSetups, setAccountSetups] = useState<AccountSetup[]>([]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    inserted?: number;
    skipped?: number;
    trades?: number;
    error?: string;
  } | null>(null);
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '1y' | 'custom'>('1y');
  const [customFromDate, setCustomFromDate] = useState('');

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex].id);
    }
  };

  const handleCreateConnection = async () => {
    try {
      setIsTesting(true);
      setTestError(null);

      // Create the connection
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_type: 'ibkr_flex',
          label: connectionLabel,
          flex_token: flexToken,
          flex_query_id: flexQueryId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create connection');
      }

      const { connection } = await res.json();
      setConnectionId(connection.id);

      // Test the connection
      const testRes = await fetch(`/api/connections/${connection.id}/test`, {
        method: 'POST',
      });

      const testData = await testRes.json();

      if (!testData.success) {
        throw new Error(testData.error || 'Connection test failed');
      }

      // Discover accounts
      const discoverRes = await fetch(`/api/connections/${connection.id}/discover`, {
        method: 'POST',
      });

      const discoverData = await discoverRes.json();
      setDiscoveredAccounts(discoverData.accounts || []);

      // Initialize account setups with defaults
      setAccountSetups(
        (discoverData.accounts || []).map((acc: DiscoveredAccount, i: number) => ({
          externalId: acc.externalId,
          label: acc.name || `Account ${i + 1}`,
          accountType: 'margin' as const,
        }))
      );

      handleNext();
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleLinkAccounts = async () => {
    if (!connectionId) return;

    try {
      setIsTesting(true);
      setTestError(null);

      // Link each account
      for (const setup of accountSetups) {
        await fetch(`/api/connections/${connectionId}/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            external_account_id: setup.externalId,
            internal_account_id: setup.label.toUpperCase().replace(/\s+/g, '_'),
            account_name: setup.label,
            account_type: setup.accountType,
          }),
        });
      }

      handleNext();
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Failed to link accounts');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    if (!connectionId) return;

    try {
      setIsSyncing(true);
      setSyncProgress('Fetching trades from IBKR...');

      // Calculate date range
      let fromDate: Date | undefined;
      const toDate = new Date();

      switch (dateRange) {
        case '30d':
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 30);
          break;
        case '90d':
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 90);
          break;
        case '1y':
          fromDate = new Date();
          fromDate.setFullYear(fromDate.getFullYear() - 1);
          break;
        case 'custom':
          fromDate = customFromDate ? new Date(customFromDate) : undefined;
          break;
      }

      const res = await fetch(`/api/connections/${connectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_type: 'onboarding',
          from_date: fromDate?.toISOString(),
          to_date: toDate.toISOString(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSyncResult({
          success: true,
          inserted: data.executions?.inserted || 0,
          skipped: data.executions?.skipped || 0,
          trades: data.trades?.matched || 0,
        });
      } else {
        setSyncResult({
          success: false,
          error: data.error || 'Sync failed',
        });
      }
    } catch (error) {
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress('');
    }
  };

  const updateAccountSetup = useCallback((externalId: string, field: keyof AccountSetup, value: string) => {
    setAccountSetups(prev =>
      prev.map(acc =>
        acc.externalId === externalId ? { ...acc, [field]: value } : acc
      )
    );
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header with stepper */}
        <div className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Connect Interactive Brokers
            </h2>
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    i < currentStepIndex
                      ? 'bg-emerald-500 text-white'
                      : i === currentStepIndex
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {i < currentStepIndex ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${i < currentStepIndex ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 'welcome' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Welcome to IBKR Integration
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Connect your Interactive Brokers account to automatically sync your trades. This integration uses IBKR&apos;s Flex Web Service to securely fetch your trade history.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">What you&apos;ll need:</h4>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>An active IBKR account with access to Account Management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>About 5 minutes to complete the setup</span>
                  </li>
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Security Note:</strong> Your Flex credentials are stored securely and only used to fetch trade data. We never have access to execute trades or transfer funds.
                </p>
              </div>
            </div>
          )}

          {step === 'create-query' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Create a Flex Query in IBKR
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Follow these steps to create a Flex Query that will allow us to fetch your trade data.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Open IBKR Account Management</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      Log into your IBKR account and go to{' '}
                      <a href="https://www.interactivebrokers.com/sso/Login" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                        Account Management
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Navigate to Flex Queries</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      Go to <strong>Reports → Flex Queries</strong> in the menu
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Create Activity Flex Query</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      Click <strong>Create</strong> next to &quot;Activity Flex Query&quot;
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Configure the Query</h4>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 space-y-2">
                      <p>Set the following options on the query configuration page:</p>
                      <ul className="space-y-1.5 ml-1">
                        <li className="flex items-start gap-2">
                          <span className="text-zinc-400 dark:text-zinc-500 select-none">&#8226;</span>
                          <span><strong>Query Name</strong> &mdash; enter anything, e.g. &quot;Trade Journal Sync&quot;</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-zinc-400 dark:text-zinc-500 select-none">&#8226;</span>
                          <span><strong>Format</strong> &mdash; select <strong>XML</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-zinc-400 dark:text-zinc-500 select-none">&#8226;</span>
                          <span><strong>Period</strong> &mdash; select <strong>Last 365 Calendar Days</strong> (you can change this later)</span>
                        </li>
                      </ul>
                      <p className="pt-1">
                        In the <strong>Sections</strong> list, click on <strong>Trades</strong> to expand it, then click <strong>Select All</strong> to include all fields. You can ignore every other section.
                      </p>
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-2.5 mt-2">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          <strong>Important:</strong> Make sure you select the <strong>Trades</strong> section, not &quot;Trade Confirmations&quot; or &quot;Orders&quot; &mdash; these are different things in IBKR.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-medium">
                    5
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Enable Flex Web Service</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      After saving, click <strong>Flex Web Service</strong> button to generate a token. Note both the <strong>Query ID</strong> and <strong>Token</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'credentials' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Enter Your Credentials
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Enter the Flex Token and Query ID you obtained from IBKR.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Connection Label
                  </label>
                  <input
                    type="text"
                    value={connectionLabel}
                    onChange={e => setConnectionLabel(e.target.value)}
                    placeholder="e.g., Main IBKR Account"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Flex Query ID
                  </label>
                  <input
                    type="text"
                    value={flexQueryId}
                    onChange={e => setFlexQueryId(e.target.value)}
                    placeholder="e.g., 123456"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Flex Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={flexToken}
                      onChange={e => setFlexToken(e.target.value)}
                      placeholder="Your Flex Web Service token"
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showToken ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {testError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{testError}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'test-connection' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Configure Your Accounts
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We found {discoveredAccounts.length} account(s). Set a label for each one.
              </p>
              <div className="space-y-4">
                {accountSetups.map(account => (
                  <div key={account.externalId} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-mono bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                        {account.externalId}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={account.label}
                          onChange={e => updateAccountSetup(account.externalId, 'label', e.target.value)}
                          placeholder="e.g., Personal Margin"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Account Type
                        </label>
                        <select
                          value={account.accountType}
                          onChange={e => updateAccountSetup(account.externalId, 'accountType', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="margin">Margin</option>
                          <option value="isa">ISA</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {testError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{testError}</p>
                </div>
              )}
            </div>
          )}

          {step === 'initial-sync' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Sync Your Trades
              </h3>
              {!syncResult ? (
                <>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Choose how much trade history to import.
                  </p>
                  <div className="space-y-2">
                    {[
                      { value: '30d', label: 'Last 30 days' },
                      { value: '90d', label: 'Last 90 days' },
                      { value: '1y', label: 'Last year' },
                      { value: 'custom', label: 'Custom date range' },
                    ].map(option => (
                      <label key={option.value} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                        <input
                          type="radio"
                          name="dateRange"
                          value={option.value}
                          checked={dateRange === option.value}
                          onChange={e => setDateRange(e.target.value as typeof dateRange)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-zinc-900 dark:text-zinc-100">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {dateRange === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customFromDate}
                        onChange={e => setCustomFromDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  {isSyncing && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-blue-800 dark:text-blue-200">{syncProgress || 'Syncing...'}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className={`p-4 rounded-lg ${syncResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  {syncResult.success ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-emerald-800 dark:text-emerald-200">Sync Complete!</span>
                      </div>
                      <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                        <li>{syncResult.inserted} new executions imported</li>
                        <li>{syncResult.skipped} duplicates skipped</li>
                        <li>{syncResult.trades} trades matched</li>
                      </ul>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-800 dark:text-red-200">{syncResult.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-4 flex justify-between">
          <button
            onClick={currentStepIndex === 0 ? onCancel : handleBack}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {currentStepIndex === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {step === 'welcome' && (
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                Get Started
              </button>
            )}
            {step === 'create-query' && (
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                I&apos;ve Created the Query
              </button>
            )}
            {step === 'credentials' && (
              <button
                onClick={handleCreateConnection}
                disabled={!flexToken || !flexQueryId || isTesting}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isTesting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            )}
            {step === 'test-connection' && (
              <button
                onClick={handleLinkAccounts}
                disabled={isTesting || accountSetups.some(a => !a.label)}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isTesting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            )}
            {step === 'initial-sync' && !syncResult && (
              <button
                onClick={handleSync}
                disabled={isSyncing || (dateRange === 'custom' && !customFromDate)}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  'Start Sync'
                )}
              </button>
            )}
            {step === 'initial-sync' && syncResult && (
              <button
                onClick={onComplete}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
