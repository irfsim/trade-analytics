'use client';

export type Period = 'today' | 'week' | 'month' | 'year' | 'all';

interface PeriodTabsProps {
  value: Period;
  onChange: (period: Period) => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-full border border-zinc-200">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`
            px-4 py-2 text-sm font-medium rounded-full transition-all
            ${value === period.value
              ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }
          `}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Get date range for a period
 * Returns ISO strings for from/to dates
 */
export function getDateRange(period: Period): { from: string | undefined; to: string | undefined } {
  const now = new Date();

  // Get start of today in local timezone
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return {
        from: startOfToday.toISOString(),
        to: undefined, // No upper bound needed
      };

    case 'week': {
      // Get Monday of current week
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0
      const monday = new Date(startOfToday);
      monday.setDate(monday.getDate() - daysToMonday);
      return {
        from: monday.toISOString(),
        to: undefined,
      };
    }

    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: startOfMonth.toISOString(),
        to: undefined,
      };
    }

    case 'year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        from: startOfYear.toISOString(),
        to: undefined,
      };
    }

    case 'all':
    default:
      return {
        from: undefined,
        to: undefined,
      };
  }
}

/**
 * Get a human-readable label for the period
 */
export function getPeriodLabel(period: Period): string {
  const now = new Date();

  switch (period) {
    case 'today':
      return now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    case 'week':
      return `Week of ${getDateRange('week').from ? new Date(getDateRange('week').from!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`;
    case 'month':
      return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    case 'year':
      return now.getFullYear().toString();
    case 'all':
      return 'All Time';
  }
}
