'use client';

import { useState } from 'react';

// Components
import { PlanFilterToggle } from '@/components/plan-filter-toggle';
import { PeriodPills, PeriodDropdown, type Period } from '@/components/period-dropdown';
import { PeriodStats } from '@/components/period-stats';
import { TradeTable } from '@/components/trade-table';
import { SlidePanel } from '@/components/slide-panel';
import { SettingsModal } from '@/components/settings-modal';
import { UserMenu } from '@/components/user-menu';
import { TradeDetail } from '@/components/trade-detail';
import { useTheme } from '@/components/theme-provider';

import type { TradeWithRating, TradeWithDetails, TradeLeg } from '@/types/database';

// Mock data for components
const mockTradesWithRating: TradeWithRating[] = [
  {
    id: 1,
    account_id: 'acc1',
    ticker: 'NVDA',
    direction: 'LONG',
    status: 'CLOSED',
    entry_datetime: '2024-01-15T09:30:00Z',
    exit_datetime: '2024-01-18T15:30:00Z',
    entry_price: 485.50,
    exit_price: 512.25,
    total_shares: 100,
    remaining_shares: 0,
    realized_pnl: 2675,
    total_commission: 2.00,
    created_at: '2024-01-15T09:30:00Z',
    updated_at: '2024-01-18T15:30:00Z',
    setup_rating: 8,
    followed_plan: true,
    setup_type_name: 'Base Breakout',
    setup_type_color: '#22c55e',
    account_pct: 2.67,
    position_size_pct: 15.2,
    market_condition: null,
  },
  {
    id: 2,
    account_id: 'acc1',
    ticker: 'TSLA',
    direction: 'LONG',
    status: 'CLOSED',
    entry_datetime: '2024-01-10T10:15:00Z',
    exit_datetime: '2024-01-12T14:00:00Z',
    entry_price: 245.00,
    exit_price: 238.50,
    total_shares: 50,
    remaining_shares: 0,
    realized_pnl: -325,
    total_commission: 2.00,
    created_at: '2024-01-10T10:15:00Z',
    updated_at: '2024-01-12T14:00:00Z',
    setup_rating: 5,
    followed_plan: false,
    setup_type_name: 'EP Gap',
    setup_type_color: '#f97316',
    account_pct: -0.32,
    position_size_pct: 12.1,
    market_condition: null,
  },
  {
    id: 3,
    account_id: 'acc1',
    ticker: 'META',
    direction: 'LONG',
    status: 'OPEN',
    entry_datetime: '2024-01-20T09:45:00Z',
    exit_datetime: null,
    entry_price: 395.00,
    exit_price: null,
    total_shares: 25,
    remaining_shares: 25,
    realized_pnl: null,
    total_commission: 1.00,
    created_at: '2024-01-20T09:45:00Z',
    updated_at: '2024-01-20T09:45:00Z',
    setup_rating: 7,
    followed_plan: true,
    setup_type_name: 'VCP',
    setup_type_color: '#6366f1',
    account_pct: null,
    position_size_pct: 9.8,
    market_condition: null,
  },
];

const mockLegs: TradeLeg[] = [
  { id: 1, trade_id: 1, execution_id: 'ex1', leg_type: 'ENTRY', shares: 100, price: 485.50, executed_at: '2024-01-15T09:30:00Z' },
  { id: 2, trade_id: 1, execution_id: 'ex2', leg_type: 'EXIT', shares: 100, price: 512.25, executed_at: '2024-01-18T15:30:00Z' },
];

const mockTradeWithDetails: TradeWithDetails = {
  ...mockTradesWithRating[0],
  legs: mockLegs,
  annotation: null,
};

const mockStats = {
  netPnl: 12450,
  winRate: 65,
  totalTrades: 47,
  winners: 31,
  losers: 16,
  avgSetupRating: 7.2,
  planAdherence: 78,
  avgWin: 875,
  avgWinPct: 4.2,
  avgLoss: -425,
  avgLossPct: -2.1,
};

// Component showcase wrapper
function ComponentCard({
  title,
  path,
  children,
  className = '',
  dark = false,
}: {
  title: string;
  path: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={`border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden ${className}`}>
      <div className="px-4 py-3 bg-zinc-50 dark:bg-[#1c1c1e] border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{path}</p>
      </div>
      <div className={`p-4 ${dark ? 'bg-zinc-900' : 'bg-white dark:bg-zinc-900'}`}>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ title, id }: { title: string; id: string }) {
  return (
    <h2 id={id} className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 scroll-mt-20">
      {title}
    </h2>
  );
}

function VariantLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{children}</p>
  );
}

// Inconsistency report data
const inconsistencies = {
  borderRadius: [
    { pattern: 'rounded-full', count: 15, examples: ['PlanFilterToggle', 'AccountSwitcher', 'PeriodPills'] },
    { pattern: 'rounded-xl', count: 8, examples: ['TradeTable card', 'SettingsModal', 'ComponentCard'] },
    { pattern: 'rounded-lg', count: 10, examples: ['SlidePanel header', 'Input fields'] },
    { pattern: 'rounded-md', count: 3, examples: ['SlidePanel buttons'] },
  ],
  heights: [
    { pattern: 'h-5', count: 1, examples: ['PlanFilterToggle'] },
    { pattern: 'h-6', count: 4, examples: ['Theme buttons'] },
    { pattern: 'h-8', count: 10, examples: ['UserMenu', 'PeriodPills', 'SettingsModal buttons'] },
    { pattern: 'h-9', count: 3, examples: ['AccountDropdown loading'] },
    { pattern: 'h-10', count: 2, examples: ['TradeTable rows'] },
  ],
  shadows: [
    { pattern: 'shadow-card', count: 5, examples: ['TradeTable', 'MobileTradeCard'] },
    { pattern: 'shadow-sm', count: 4, examples: ['Active tabs', 'PlanFilterToggle knob'] },
    { pattern: 'shadow-lg', count: 2, examples: ['Modals'] },
    { pattern: 'shadow-xl', count: 1, examples: ['SettingsModal'] },
  ],
  duplicates: [
    {
      name: 'Account Selection',
      components: ['AccountDropdown', 'AccountSwitcher'],
      notes: 'Both components serve the same purpose with different UI styles'
    },
    {
      name: 'Trade Details',
      components: ['TradeDetail', 'TradePanel'],
      notes: 'TradeDetail (dark theme) vs TradePanel (light theme slide-out)'
    },
  ],
};

export default function SystemPage() {
  // State for interactive demos
  const [planFilterEnabled, setPlanFilterEnabled] = useState(false);
  const [periodPills, setPeriodPills] = useState<Period>('week');
  const [periodDropdown, setPeriodDropdown] = useState<Period>('month');
  const [slidePanelOpen, setSlidePanelOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [mockAvatar, setMockAvatar] = useState<string | null>(null);
  const [mockDisplayName, setMockDisplayName] = useState('Test User');
  const [mockAccountId, setMockAccountId] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const categories = [
    { id: 'toggles', label: 'Toggles & Buttons' },
    { id: 'selectors', label: 'Dropdowns & Selectors' },
    { id: 'data', label: 'Data Display' },
    { id: 'layout', label: 'Layout & Panels' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'trade', label: 'Trade Components' },
    { id: 'inconsistencies', label: 'Inconsistencies' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="flex">
        {/* Sticky navigation sidebar */}
        <nav className="hidden lg:block w-56 flex-shrink-0 sticky top-0 h-screen border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-y-auto">
          <div className="p-4">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">Component System</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">UI Audit & Inventory</p>

            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`#${cat.id}`}
                    className="block px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    {cat.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Theme</p>
              <div className="flex gap-1">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                      theme === t
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-[#1c1c1e] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Component Inventory</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Complete inventory of all UI components for audit and standardization purposes.
            </p>
            <div className="mt-4 flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
              <span><strong className="text-zinc-900 dark:text-zinc-100">20</strong> components</span>
              <span><strong className="text-zinc-900 dark:text-zinc-100">7</strong> categories</span>
              <span><strong className="text-red-600 dark:text-red-400">2</strong> duplicate groups</span>
            </div>
          </div>

          {/* Section 1: Toggles & Buttons */}
          <section className="mb-16">
            <SectionHeader title="1. Toggles & Buttons" id="toggles" />

            <div className="space-y-4">
              <ComponentCard title="PlanFilterToggle" path="src/components/plan-filter-toggle.tsx">
                <div className="space-y-6">
                  <div>
                    <VariantLabel>Default (disabled state)</VariantLabel>
                    <PlanFilterToggle enabled={false} onChange={() => {}} />
                  </div>
                  <div>
                    <VariantLabel>Enabled state</VariantLabel>
                    <PlanFilterToggle enabled={true} onChange={() => {}} />
                  </div>
                  <div>
                    <VariantLabel>With counts</VariantLabel>
                    <PlanFilterToggle
                      enabled={true}
                      onChange={() => {}}
                      filteredCount={23}
                      totalCount={47}
                    />
                  </div>
                  <div>
                    <VariantLabel>Interactive</VariantLabel>
                    <PlanFilterToggle
                      enabled={planFilterEnabled}
                      onChange={setPlanFilterEnabled}
                      filteredCount={23}
                      totalCount={47}
                    />
                  </div>
                </div>
              </ComponentCard>
            </div>
          </section>

          {/* Section 2: Dropdowns & Selectors */}
          <section className="mb-16">
            <SectionHeader title="2. Dropdowns & Selectors" id="selectors" />

            <div className="grid gap-4 md:grid-cols-2">
              <ComponentCard title="PeriodPills" path="src/components/period-dropdown.tsx">
                <div className="space-y-4">
                  <VariantLabel>Interactive (primary periods as pills, more in dropdown)</VariantLabel>
                  <PeriodPills value={periodPills} onChange={setPeriodPills} />
                </div>
              </ComponentCard>

              <ComponentCard title="PeriodDropdown" path="src/components/period-dropdown.tsx">
                <div className="space-y-4">
                  <VariantLabel>Traditional dropdown style</VariantLabel>
                  <PeriodDropdown value={periodDropdown} onChange={setPeriodDropdown} />
                </div>
              </ComponentCard>
            </div>
          </section>

          {/* Section 3: Data Display */}
          <section className="mb-16">
            <SectionHeader title="3. Data Display" id="data" />

            <div className="space-y-4">
              <ComponentCard title="PeriodStats" path="src/components/period-stats.tsx">
                <div className="space-y-8">
                  <div>
                    <VariantLabel>With data</VariantLabel>
                    <PeriodStats stats={mockStats} />
                  </div>
                  <div>
                    <VariantLabel>Loading state</VariantLabel>
                    <PeriodStats stats={null} loading={true} />
                  </div>
                  <div>
                    <VariantLabel>Null stats (empty)</VariantLabel>
                    <PeriodStats stats={null} />
                  </div>
                  <div>
                    <VariantLabel>No plan adherence data</VariantLabel>
                    <PeriodStats stats={{ ...mockStats, planAdherence: null }} />
                  </div>
                </div>
              </ComponentCard>

              <ComponentCard title="TradeTable" path="src/components/trade-table.tsx">
                <div className="space-y-8">
                  <div>
                    <VariantLabel>With trades</VariantLabel>
                    <TradeTable trades={mockTradesWithRating} />
                  </div>
                  <div>
                    <VariantLabel>Loading state</VariantLabel>
                    <TradeTable trades={[]} loading={true} />
                  </div>
                  <div>
                    <VariantLabel>Empty state</VariantLabel>
                    <TradeTable trades={[]} />
                  </div>
                </div>
              </ComponentCard>
            </div>
          </section>

          {/* Section 4: Layout & Panels */}
          <section className="mb-16">
            <SectionHeader title="4. Layout & Panels" id="layout" />

            <div className="space-y-4">
              <ComponentCard title="SlidePanel" path="src/components/slide-panel.tsx">
                <div className="space-y-4">
                  <VariantLabel>Click button to open slide panel</VariantLabel>
                  <button
                    onClick={() => setSlidePanelOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Open SlidePanel
                  </button>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Props: isOpen, onClose, onPrev, onNext, hasPrev, hasNext, title, children
                  </p>
                </div>
              </ComponentCard>

              <ComponentCard title="SettingsModal" path="src/components/settings-modal.tsx">
                <div className="space-y-4">
                  <VariantLabel>Click button to open settings modal</VariantLabel>
                  <button
                    onClick={() => setSettingsModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Open SettingsModal
                  </button>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sections: Profile, Accounts, Setups
                  </p>
                </div>
              </ComponentCard>
            </div>
          </section>

          {/* Section 5: Navigation */}
          <section className="mb-16">
            <SectionHeader title="5. Navigation" id="navigation" />

            <div className="space-y-4">
              <ComponentCard title="UserMenu" path="src/components/user-menu.tsx">
                <div className="space-y-4">
                  <VariantLabel>Default (gradient avatar)</VariantLabel>
                  <div className="flex items-center gap-4">
                    <UserMenu
                      accountId={mockAccountId}
                      onAccountChange={setMockAccountId}
                      onOpenSettings={() => setSettingsModalOpen(true)}
                    />
                  </div>
                  <VariantLabel>With custom avatar</VariantLabel>
                  <div className="flex items-center gap-4">
                    <UserMenu
                      avatar="https://avatars.outpace.systems/avatars/previews/avatar-5.webp"
                      accountId={mockAccountId}
                      onAccountChange={setMockAccountId}
                    />
                  </div>
                </div>
              </ComponentCard>
            </div>
          </section>

          {/* Section 6: Trade Components */}
          <section className="mb-16">
            <SectionHeader title="6. Trade Components" id="trade" />

            <div className="space-y-4">
              <ComponentCard title="TradeDetail" path="src/components/trade-detail.tsx" dark>
                <TradeDetail trade={mockTradeWithDetails} />
              </ComponentCard>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Duplicate Alert:</strong> TradeDetail (dark theme, standalone) vs TradePanel (light theme, slide-out with navigation).
                  Both display trade details but with different styling and context.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Inconsistencies Report */}
          <section className="mb-16">
            <SectionHeader title="7. Inconsistencies Report" id="inconsistencies" />

            <div className="space-y-6">
              {/* Border Radius */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-zinc-50 dark:bg-[#1c1c1e] border-b border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Border Radius Variations</h3>
                </div>
                <div className="p-4">
                  <div className="grid gap-3">
                    {inconsistencies.borderRadius.map((item) => (
                      <div key={item.pattern} className="flex items-start gap-3">
                        <code className="px-2 py-1 text-xs bg-zinc-100 dark:bg-[#1c1c1e] text-zinc-700 dark:text-zinc-300 rounded font-mono min-w-[120px]">
                          {item.pattern}
                        </code>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {item.examples.join(', ')}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
                          {item.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Heights */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-zinc-50 dark:bg-[#1c1c1e] border-b border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Height Variations</h3>
                </div>
                <div className="p-4">
                  <div className="grid gap-3">
                    {inconsistencies.heights.map((item) => (
                      <div key={item.pattern} className="flex items-start gap-3">
                        <code className="px-2 py-1 text-xs bg-zinc-100 dark:bg-[#1c1c1e] text-zinc-700 dark:text-zinc-300 rounded font-mono min-w-[120px]">
                          {item.pattern}
                        </code>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {item.examples.join(', ')}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
                          {item.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shadows */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-zinc-50 dark:bg-[#1c1c1e] border-b border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Shadow Variations</h3>
                </div>
                <div className="p-4">
                  <div className="grid gap-3">
                    {inconsistencies.shadows.map((item) => (
                      <div key={item.pattern} className="flex items-start gap-3">
                        <code className="px-2 py-1 text-xs bg-zinc-100 dark:bg-[#1c1c1e] text-zinc-700 dark:text-zinc-300 rounded font-mono min-w-[120px]">
                          {item.pattern}
                        </code>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {item.examples.join(', ')}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
                          {item.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duplicates */}
              <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Duplicate Components</h3>
                </div>
                <div className="p-4 space-y-4">
                  {inconsistencies.duplicates.map((item) => (
                    <div key={item.name} className="pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">{item.name}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.components.map((comp) => (
                          <code key={comp} className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded font-mono">
                            {comp}
                          </code>
                        ))}
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Modals and panels rendered outside main flow */}
      <SlidePanel
        isOpen={slidePanelOpen}
        onClose={() => setSlidePanelOpen(false)}
        title="Example Slide Panel"
        hasPrev={true}
        hasNext={true}
        onPrev={() => {}}
        onNext={() => {}}
      >
        <div className="p-6">
          <p className="text-zinc-600 dark:text-zinc-400">
            This is the SlidePanel component. It supports:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>- Prev/Next navigation buttons</li>
            <li>- Keyboard shortcuts (Esc, Arrow keys)</li>
            <li>- Backdrop blur</li>
            <li>- Smooth slide animation</li>
          </ul>
        </div>
      </SlidePanel>

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        avatar={mockAvatar}
        onAvatarChange={setMockAvatar}
        displayName={mockDisplayName}
        onDisplayNameChange={setMockDisplayName}
      />
    </div>
  );
}
