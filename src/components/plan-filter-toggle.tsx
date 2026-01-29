'use client';

interface PlanFilterToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  filteredCount?: number;
  totalCount?: number;
}

export function PlanFilterToggle({
  enabled,
  onChange,
  filteredCount,
  totalCount,
}: PlanFilterToggleProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Trade count indicator */}
      {enabled && filteredCount !== undefined && totalCount !== undefined && (
        <span className="text-xs text-zinc-500">
          {filteredCount} of {totalCount} trades
        </span>
      )}

      {/* Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="text-sm text-zinc-600">Plan only</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          className={`
            relative inline-flex h-5 w-9 items-center rounded-full transition-colors
            ${enabled ? 'bg-emerald-500' : 'bg-zinc-300'}
          `}
        >
          <span
            className={`
              inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform
              ${enabled ? 'translate-x-5' : 'translate-x-1'}
            `}
          />
        </button>
      </label>
    </div>
  );
}
