'use client';

import { useState, useEffect } from 'react';
import { Root, Container, Trigger, Content, Item } from '@/lib/bloom-menu';
import type { TradeAnnotation, APlusChecklist, TradeGrade, SetupType as SetupTypeInterface, MarketRegime } from '@/types/database';
import { emptyChecklist } from '@/types/database';

interface BloomSelectProps<T extends string> {
  value: T | null;
  onChange: (value: T | null) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}

function SetupTypeSelect({
  value,
  onChange,
  setupTypes,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  setupTypes: SetupTypeInterface[];
}) {
  const selectedType = setupTypes.find(t => t.id === value);

  return (
    <Root direction="bottom" anchor="start">
      <Container
        className="bg-white border border-zinc-200 shadow-lg"
        buttonSize={{ width: 200, height: 40 }}
        menuWidth={200}
        menuRadius={8}
        buttonRadius={8}
      >
        <Trigger className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors">
          <span className={selectedType ? 'text-zinc-900' : 'text-zinc-400'}>
            {selectedType?.name || 'Select...'}
          </span>
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Trigger>

        <Content className="p-1 max-h-60 overflow-y-auto">
          <Item
            onSelect={() => onChange(null)}
            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 rounded-lg cursor-pointer ${
              value === null ? 'text-zinc-900 font-medium' : 'text-zinc-500'
            }`}
          >
            Select...
          </Item>
          {setupTypes.map(type => (
            <Item
              key={type.id}
              onSelect={() => onChange(type.id)}
              className={`w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 rounded-lg cursor-pointer ${
                value === type.id ? 'text-zinc-900 font-medium' : 'text-zinc-600'
              }`}
            >
              {type.name}
            </Item>
          ))}
        </Content>
      </Container>
    </Root>
  );
}

function BloomSelect<T extends string>({ value, onChange, options, placeholder = 'Select...' }: BloomSelectProps<T>) {
  const selectedOption = options.find(o => o.value === value);

  return (
    <Root direction="bottom" anchor="start">
      <Container
        className="bg-white border border-zinc-200 shadow-lg"
        buttonSize={{ width: 200, height: 40 }}
        menuWidth={200}
        menuRadius={8}
        buttonRadius={8}
      >
        <Trigger className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors">
          <span className={selectedOption ? 'text-zinc-900' : 'text-zinc-400'}>
            {selectedOption?.label || placeholder}
          </span>
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Trigger>

        <Content className="p-1 max-h-60 overflow-y-auto">
          <Item
            onSelect={() => onChange(null)}
            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 rounded-lg cursor-pointer ${
              value === null ? 'text-zinc-900 font-medium' : 'text-zinc-500'
            }`}
          >
            {placeholder}
          </Item>
          {options.map(option => (
            <Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={`w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 rounded-lg cursor-pointer ${
                value === option.value ? 'text-zinc-900 font-medium' : 'text-zinc-600'
              }`}
            >
              {option.label}
            </Item>
          ))}
        </Content>
      </Container>
    </Root>
  );
}

interface AnnotationFormProps {
  tradeId: number;
  existingAnnotation: TradeAnnotation | null;
  entryPrice: number;
}


const MARKET_REGIMES: { value: MarketRegime; label: string }[] = [
  { value: 'STRONG_UPTREND', label: 'Strong Uptrend' },
  { value: 'UPTREND_CHOP', label: 'Uptrend with Chop' },
  { value: 'SIDEWAYS', label: 'Sideways/Range' },
  { value: 'DOWNTREND', label: 'Downtrend' },
  { value: 'CORRECTION', label: 'Correction/Crash' },
];

const GRADES: TradeGrade[] = ['A+', 'A', 'B', 'C', 'F'];

export function AnnotationForm({ tradeId, existingAnnotation, entryPrice }: AnnotationFormProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [setupTypes, setSetupTypes] = useState<SetupTypeInterface[]>([]);

  // Fetch setup types
  useEffect(() => {
    async function loadSetupTypes() {
      try {
        const res = await fetch('/api/setup-types');
        if (res.ok) {
          const data = await res.json();
          setSetupTypes(data.setupTypes || []);
        }
      } catch (error) {
        console.error('Failed to load setup types:', error);
      }
    }
    loadSetupTypes();
  }, []);

  // Form state
  const [grade, setGrade] = useState<TradeGrade | null>(existingAnnotation?.grade || null);
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(
    existingAnnotation?.followed_plan ?? null
  );
  const [setupTypeId, setSetupTypeId] = useState<number | null>(existingAnnotation?.setup_type_id || null);
  const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(
    existingAnnotation?.market_regime || null
  );
  const [initialRisk, setInitialRisk] = useState(existingAnnotation?.initial_risk_dollars?.toString() || '');
  const [stopPrice, setStopPrice] = useState(existingAnnotation?.initial_stop_price?.toString() || '');
  const [notes, setNotes] = useState(existingAnnotation?.notes || '');
  const [checklist, setChecklist] = useState<APlusChecklist>(
    (existingAnnotation?.checklist as APlusChecklist) || emptyChecklist
  );

  // Calculate risk from stop price
  useEffect(() => {
    if (stopPrice && entryPrice) {
      const stop = parseFloat(stopPrice);
      if (!isNaN(stop) && stop < entryPrice) {
        // This would need shares to calculate $ risk
        // For now, just show the % risk
      }
    }
  }, [stopPrice, entryPrice]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/trades/${tradeId}/annotation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          setup_rating: setupRating,
          followed_plan: followedPlan,
          setup_type_id: setupTypeId,
          market_regime: marketRegime,
          initial_risk_dollars: initialRisk ? parseFloat(initialRisk) : null,
          initial_stop_price: stopPrice ? parseFloat(stopPrice) : null,
          notes,
          checklist,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save annotation:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateChecklist = (
    section: keyof APlusChecklist,
    field: string,
    value: boolean
  ) => {
    setChecklist((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // Calculate setup rating: count sections where ALL items are checked
  const calculateSetupRating = (cl: APlusChecklist): number => {
    const sections = [
      cl.marketContext,
      cl.stockSelection,
      cl.priorUptrend,
      cl.consolidation,
      cl.maSupport,
      cl.volatilityContraction,
      cl.volumePattern,
      cl.pivotAndRisk,
      cl.context,
    ];
    return sections.filter(section =>
      Object.values(section).every(Boolean)
    ).length;
  };

  const setupRating = calculateSetupRating(checklist);

  const getRatingColor = (rating: number): string => {
    if (rating >= 8) return 'text-emerald-600';
    if (rating >= 6) return 'text-yellow-600';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingBg = (rating: number): string => {
    if (rating >= 8) return 'bg-emerald-50 border-emerald-200';
    if (rating >= 6) return 'bg-yellow-50 border-yellow-200';
    if (rating >= 4) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-8">
      {/* Setup Rating - Prominent Display */}
      <div className={`p-6 rounded-xl border ${getRatingBg(setupRating)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600 uppercase tracking-wide">Setup Rating</p>
            <p className="text-xs text-zinc-500 mt-1">Based on checklist sections completed</p>
          </div>
          <div className="text-right">
            <p className={`text-5xl font-bold font-mono ${getRatingColor(setupRating)}`}>
              {setupRating}<span className="text-2xl text-zinc-400">/9</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Grade */}
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Trade Grade</label>
          <div className="flex gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  grade === g
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Setup Type */}
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Setup Type</label>
          <SetupTypeSelect
            value={setupTypeId}
            onChange={setSetupTypeId}
            setupTypes={setupTypes}
          />
        </div>

        {/* Market Regime */}
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Market Regime</label>
          <BloomSelect
            value={marketRegime}
            onChange={setMarketRegime}
            options={MARKET_REGIMES}
            placeholder="Select..."
          />
        </div>
      </div>

      {/* Risk Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Initial Risk ($)</label>
          <input
            type="number"
            step="0.01"
            value={initialRisk}
            onChange={(e) => setInitialRisk(e.target.value)}
            placeholder="500.00"
            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <p className="text-xs text-zinc-500 mt-1">$ amount you risked on this trade</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-600 mb-2">Stop Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder={`${(entryPrice * 0.95).toFixed(2)}`}
            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <p className="text-xs text-zinc-500 mt-1">Where was your stop?</p>
        </div>
      </div>

      {/* A+ Checklist */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900">A+ Setup Checklist</h3>
          <span className={`text-sm font-medium ${getRatingColor(setupRating)}`}>
            {setupRating}/9 sections complete
          </span>
        </div>

        <div className="space-y-6">
          <ChecklistSection
            title="1. Market Context"
            items={[
              { key: 'bullishConditions', label: 'Market conditions bullish/favorable for longs' },
            ]}
            values={checklist.marketContext}
            onChange={(field, value) => updateChecklist('marketContext', field, value)}
          />

          <ChecklistSection
            title="2. Stock Selection (Leader Criteria)"
            items={[
              { key: 'momentumLeader', label: 'Momentum leader' },
              { key: 'highRS', label: 'High RS (>90)' },
              { key: 'sufficientVolume', label: 'Sufficient $Volume' },
              { key: 'sufficientADR', label: 'Sufficient ADR (>4-5%)' },
            ]}
            values={checklist.stockSelection}
            onChange={(field, value) => updateChecklist('stockSelection', field, value)}
          />

          <ChecklistSection
            title="3. Prior Uptrend (Pole)"
            items={[
              { key: 'clearStrongUptrend', label: 'Clear, strong prior uptrend exists' },
            ]}
            values={checklist.priorUptrend}
            onChange={(field, value) => updateChecklist('priorUptrend', field, value)}
          />

          <ChecklistSection
            title="4. Consolidation Structure (Flag)"
            items={[
              { key: 'orderlyPattern', label: 'Orderly pattern (flag, tight channel)' },
              { key: 'notChoppy', label: 'Not excessively wide or choppy' },
              { key: 'stillInRange', label: 'Stock is still in the range (not extended)' },
            ]}
            values={checklist.consolidation}
            onChange={(field, value) => updateChecklist('consolidation', field, value)}
          />

          <ChecklistSection
            title="5. Moving Average Support"
            items={[
              { key: 'nearRisingMA', label: 'Consolidating near rising 10d or 20d MA' },
              { key: 'masStacked', label: 'MAs (10, 20, 50) stacked bullishly' },
            ]}
            values={checklist.maSupport}
            onChange={(field, value) => updateChecklist('maSupport', field, value)}
          />

          <ChecklistSection
            title="6. Volatility Contraction"
            required
            items={[
              { key: 'visuallyTighter', label: 'Visual: Last few days noticeably tighter' },
              { key: 'quantitativeCheck', label: 'Quantitative: ≥2-3 days with range ≤ 2/3 ADR' },
              { key: 'tightnessNearPivot', label: 'Tightness occurring near MA and pivot' },
            ]}
            values={checklist.volatilityContraction}
            onChange={(field, value) => updateChecklist('volatilityContraction', field, value)}
          />

          <ChecklistSection
            title="7. Volume Pattern"
            items={[
              { key: 'volumeContracted', label: 'Volume contracted during consolidation' },
              { key: 'lowVolumeTightDays', label: 'Volume notably low during tightest days' },
            ]}
            values={checklist.volumePattern}
            onChange={(field, value) => updateChecklist('volumePattern', field, value)}
          />

          <ChecklistSection
            title="8. Pivot & Risk Definition"
            items={[
              { key: 'clearPivot', label: 'Obvious breakout trigger level identified' },
              { key: 'logicalStop', label: 'Logical stop-loss level identified' },
              { key: 'acceptableRisk', label: 'Initial risk acceptable per plan' },
            ]}
            values={checklist.pivotAndRisk}
            onChange={(field, value) => updateChecklist('pivotAndRisk', field, value)}
          />

          <ChecklistSection
            title="9. Context (Bonus)"
            items={[
              { key: 'leadingSector', label: 'In a leading sector/theme' },
              { key: 'recentCatalyst', label: 'Recent positive EP/catalyst' },
            ]}
            values={checklist.context}
            onChange={(field, value) => updateChecklist('context', field, value)}
          />
        </div>
      </div>

      {/* Plan Compliance */}
      <div>
        <label className="block text-sm font-medium text-zinc-600 mb-2">
          Did you follow your plan?
        </label>
        <p className="text-xs text-zinc-500 mb-3">Entry, sizing, stop, exit executed correctly?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setFollowedPlan(true)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              followedPlan === true
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => setFollowedPlan(false)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              followedPlan === false
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-zinc-600 mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="What did you learn from this trade? What would you do differently?"
          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
        />
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-zinc-900 text-white font-medium rounded-full hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Annotation'}
        </button>
        {saved && (
          <span className="text-emerald-600 text-sm">Saved!</span>
        )}
      </div>
    </div>
  );
}

function ChecklistSection({
  title,
  items,
  values,
  onChange,
  required,
}: {
  title: string;
  items: { key: string; label: string }[];
  values: Record<string, boolean>;
  onChange: (field: string, value: boolean) => void;
  required?: boolean;
}) {
  return (
    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
      <h4 className="font-medium text-zinc-900 mb-3">
        {title}
        {required && (
          <span className="ml-2 text-xs text-amber-600">(Required for A+)</span>
        )}
      </h4>
      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={values[item.key] || false}
              onChange={(e) => onChange(item.key, e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 bg-white text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
