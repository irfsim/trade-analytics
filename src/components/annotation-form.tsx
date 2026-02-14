'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Root, Container, Trigger, Content, Item } from '@/lib/bloom-menu';
import type { TradeAnnotation, APlusChecklist, TradeGrade, SetupType as SetupTypeInterface, SetupSpecificChecklist, ChecklistItemDefinition } from '@/types/database';
import { emptyChecklist, isSetupSpecificChecklist } from '@/types/database';

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
        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg"
        buttonSize={{ width: 200, height: 40 }}
        menuWidth={200}
        menuRadius={8}
        buttonRadius={8}
      >
        <Trigger className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
          <span className={selectedType ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}>
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
            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg cursor-pointer ${
              value === null ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Select...
          </Item>
          {setupTypes.map(type => (
            <Item
              key={type.id}
              onSelect={() => onChange(type.id)}
              className={`w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg cursor-pointer ${
                value === type.id ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-300'
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
        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg"
        buttonSize={{ width: 200, height: 40 }}
        menuWidth={200}
        menuRadius={8}
        buttonRadius={8}
      >
        <Trigger className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
          <span className={selectedOption ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}>
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
            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg cursor-pointer ${
              value === null ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {placeholder}
          </Item>
          {options.map(option => (
            <Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={`w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg cursor-pointer ${
                value === option.value ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-300'
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
  onSave?: () => void;
}

export function AnnotationForm({ tradeId, existingAnnotation, entryPrice, onSave }: AnnotationFormProps) {
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
          const types = (data.setupTypes || []).map((s: SetupTypeInterface) => ({
            ...s,
            checklist_items: s.checklist_items || [],
          }));
          setSetupTypes(types);
        }
      } catch (error) {
        console.error('Failed to load setup types:', error);
      }
    }
    loadSetupTypes();
  }, []);

  // Form state
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(
    existingAnnotation?.followed_plan ?? null
  );
  const [setupTypeId, setSetupTypeId] = useState<number | null>(existingAnnotation?.setup_type_id || null);
  const [initialRisk, setInitialRisk] = useState(existingAnnotation?.initial_risk_dollars?.toString() || '');
  const [stopPrice, setStopPrice] = useState(existingAnnotation?.initial_stop_price?.toString() || '');
  const [notes, setNotes] = useState(existingAnnotation?.notes || '');

  // Checklist state - supports both legacy (APlusChecklist) and new (SetupSpecificChecklist) formats
  const [legacyChecklist, setLegacyChecklist] = useState<APlusChecklist>(() => {
    const checklist = existingAnnotation?.checklist as unknown;
    if (checklist && !isSetupSpecificChecklist(checklist as SetupSpecificChecklist)) {
      return checklist as APlusChecklist;
    }
    return emptyChecklist;
  });
  const [setupChecklist, setSetupChecklist] = useState<Record<string, boolean>>(() => {
    const checklist = existingAnnotation?.checklist as unknown;
    if (checklist && isSetupSpecificChecklist(checklist as SetupSpecificChecklist)) {
      return (checklist as SetupSpecificChecklist).items;
    }
    return {};
  });

  // Get the selected setup type
  const selectedSetup = setupTypes.find(s => s.id === setupTypeId);
  const setupChecklistItems = selectedSetup?.checklist_items || [];
  const isDefaultSetup = selectedSetup?.is_default || false;
  const hasChecklistItems = setupChecklistItems.length > 0;

  // Initialize setup checklist when setup changes
  useEffect(() => {
    if (setupTypeId && setupChecklistItems.length > 0) {
      // Check if we have existing data for this setup
      const existingData = existingAnnotation?.checklist as unknown;
      if (existingData && isSetupSpecificChecklist(existingData as SetupSpecificChecklist)) {
        const existingSetupChecklist = existingData as SetupSpecificChecklist;
        if (existingSetupChecklist.setupTypeId === setupTypeId) {
          setSetupChecklist(existingSetupChecklist.items);
          return;
        }
      }
      // Initialize empty checklist for this setup's items
      const newChecklist: Record<string, boolean> = {};
      setupChecklistItems.forEach(item => {
        newChecklist[item.id] = setupChecklist[item.id] || false;
      });
      setSetupChecklist(newChecklist);
    }
  }, [setupTypeId, setupChecklistItems.length]);

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
      // Determine which checklist format to save
      let checklistToSave: APlusChecklist | SetupSpecificChecklist;
      if (setupTypeId && hasChecklistItems) {
        checklistToSave = {
          version: 2,
          setupTypeId,
          items: setupChecklist,
        };
      } else {
        checklistToSave = legacyChecklist;
      }

      // Normalize rating to 0-9 scale for backwards compatibility with table display
      const normalizedRating = Math.round((ratingData.percentage / 100) * 9);

      // Auto-compute grade from checklist percentage
      const computedGrade = ratingData.total > 0 ? getLetterGrade(ratingData.percentage) as TradeGrade : null;

      const res = await fetch(`/api/trades/${tradeId}/annotation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: computedGrade,
          setup_rating: normalizedRating,
          followed_plan: followedPlan,
          setup_type_id: setupTypeId,
          initial_risk_dollars: initialRisk ? parseFloat(initialRisk) : null,
          initial_stop_price: stopPrice ? parseFloat(stopPrice) : null,
          notes,
          checklist: checklistToSave,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Annotation saved');
      onSave?.();
    } catch (error) {
      console.error('Failed to save annotation:', error);
      toast.error('Failed to save annotation');
    } finally {
      setSaving(false);
    }
  };

  const updateLegacyChecklist = (
    section: keyof APlusChecklist,
    field: string,
    value: boolean
  ) => {
    setLegacyChecklist((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const updateSetupChecklist = (itemId: string, value: boolean) => {
    setSetupChecklist(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  // Calculate setup rating based on format
  const calculateSetupRating = (): { checked: number; total: number; percentage: number } => {
    if (setupTypeId && hasChecklistItems) {
      // New format: count checked items out of total
      const total = setupChecklistItems.length;
      const checked = Object.values(setupChecklist).filter(Boolean).length;
      return { checked, total, percentage: total > 0 ? Math.round((checked / total) * 100) : 0 };
    } else if (!setupTypeId || isDefaultSetup) {
      // No setup or default setup: no checklist
      return { checked: 0, total: 0, percentage: 0 };
    } else {
      // Legacy format: count completed sections
      const sections = [
        legacyChecklist.marketContext,
        legacyChecklist.stockSelection,
        legacyChecklist.priorUptrend,
        legacyChecklist.consolidation,
        legacyChecklist.maSupport,
        legacyChecklist.volatilityContraction,
        legacyChecklist.volumePattern,
        legacyChecklist.pivotAndRisk,
        legacyChecklist.context,
      ];
      const checked = sections.filter(section => Object.values(section).every(Boolean)).length;
      return { checked, total: 9, percentage: Math.round((checked / 9) * 100) };
    }
  };

  const ratingData = calculateSetupRating();
  const setupRating = ratingData.checked;

  const getRatingColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRatingBg = (percentage: number): string => {
    if (percentage >= 90) return 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
    if (percentage >= 70) return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    if (percentage >= 50) return 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
    return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  };

  // Get letter grade from percentage
  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 65) return 'B';
    if (percentage >= 50) return 'C';
    return 'F';
  };

  return (
    <div className="space-y-8">
      {/* Setup Type - First so user selects before seeing checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-2">Setup Type</label>
          <SetupTypeSelect
            value={setupTypeId}
            onChange={setSetupTypeId}
            setupTypes={setupTypes}
          />
        </div>
      </div>

      {/* Plan Compliance */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Did you follow your plan?
        </label>
        <p className="text-xs text-zinc-900 dark:text-zinc-100 mb-3 text-pretty">Entry, sizing, stop, exit executed correctly?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setFollowedPlan(true)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              followedPlan === true
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => setFollowedPlan(false)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              followedPlan === false
                ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Setup Rating - only after setup selected */}
      {setupTypeId && (ratingData.total > 0 ? (
        <div className={`p-6 rounded-xl border ${getRatingBg(ratingData.percentage)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Setup Quality</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {hasChecklistItems ? `${ratingData.checked}/${ratingData.total} checklist items` : 'Based on checklist sections'}
              </p>
            </div>
            <div className="text-right flex items-center gap-3">
              <p className={`text-5xl font-bold font-mono tabular-nums ${getRatingColor(ratingData.percentage)}`}>
                {ratingData.percentage}<span className="text-2xl text-zinc-400">%</span>
              </p>
              <p className={`text-3xl font-bold ${getRatingColor(ratingData.percentage)}`}>
                {getLetterGrade(ratingData.percentage)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl border bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isDefaultSetup ? 'This setup has no checklist items' :
             'This setup has no checklist items configured. Add them in Settings.'}
          </p>
        </div>
      ))}

      {/* A+ Checklist - Dynamic based on setup */}
      {setupTypeId && hasChecklistItems && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 text-balance">
              A+ Checklist for {selectedSetup?.name}
            </h3>
            <span className={`text-sm font-medium ${getRatingColor(ratingData.percentage)}`}>
              {ratingData.checked}/{ratingData.total} items
            </span>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-3">
            {setupChecklistItems.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={setupChecklist[item.id] || false}
                  onChange={(e) => updateSetupChecklist(item.id, e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 checkbox-pop"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Legacy Checklist - shown when setup has no items but not default */}
      {setupTypeId && !hasChecklistItems && !isDefaultSetup && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This setup has no checklist items configured.{' '}
            <span className="font-medium">Go to Settings &gt; Setups</span> to add checklist items for this setup.
          </p>
        </div>
      )}

      {/* Risk Info - only after setup selected */}
      {setupTypeId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-2">Initial Risk ($)</label>
            <input
              type="number"
              step="0.01"
              value={initialRisk}
              onChange={(e) => setInitialRisk(e.target.value)}
              placeholder="500.00"
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">$ amount you risked on this trade</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-2">Stop Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder={`${(entryPrice * 0.95).toFixed(2)}`}
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Where was your stop?</p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="What did you learn from this trade? What would you do differently?"
          className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 resize-none"
        />
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors btn-press"
        >
          {saving ? 'Saving...' : 'Save Annotation'}
        </button>
        {saved && (
          <span className="text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">Saved!</span>
        )}
      </div>
    </div>
  );
}

