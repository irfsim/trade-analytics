'use client';

import { Root, Container, Trigger, Content, Item } from '@/lib/bloom-menu';

export type Period = 'today' | 'yesterday' | 'week' | 'lastweek' | 'month' | 'lastmonth' | 'year' | 'lastyear' | 'all' | 'last10' | 'last20' | 'last50';

interface PeriodOption {
  value: Period;
  label: string;
  group?: 'calendar' | 'rolling' | 'count';
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'today', label: 'Today', group: 'calendar' },
  { value: 'yesterday', label: 'Yesterday', group: 'calendar' },
  { value: 'week', label: 'This week', group: 'calendar' },
  { value: 'lastweek', label: 'Last week', group: 'calendar' },
  { value: 'month', label: 'This month', group: 'calendar' },
  { value: 'lastmonth', label: 'Last month', group: 'calendar' },
  { value: 'year', label: 'YTD', group: 'calendar' },
  { value: 'lastyear', label: 'Last year', group: 'calendar' },
  { value: 'all', label: 'All time' },
  { value: 'last10', label: 'Last 10 trades', group: 'count' },
  { value: 'last20', label: 'Last 20 trades', group: 'count' },
  { value: 'last50', label: 'Last 50 trades', group: 'count' },
];

interface PeriodDropdownProps {
  value: Period;
  onChange: (period: Period) => void;
}

// Primary periods shown as pills
const PRIMARY_PERIODS: Period[] = ['week', 'lastweek', 'month', 'lastmonth', 'year'];

// Secondary periods in the "More" dropdown - time-based
const MORE_TIME_PERIODS: Period[] = ['today', 'yesterday', 'lastyear', 'all'];

// Secondary periods in the "More" dropdown - trade count based
const MORE_COUNT_PERIODS: Period[] = ['last10', 'last20', 'last50'];

// All "More" periods combined
const MORE_PERIODS: Period[] = [...MORE_TIME_PERIODS, ...MORE_COUNT_PERIODS];

export function PeriodPills({ value, onChange }: PeriodDropdownProps) {
  const isMoreSelected = MORE_PERIODS.includes(value);
  const selectedMoreOption = PERIOD_OPTIONS.find(o => o.value === value && MORE_PERIODS.includes(o.value));

  // Calculate button width based on selected label
  const moreButtonWidth = isMoreSelected
    ? Math.max(80, (selectedMoreOption?.label.length || 4) * 7 + 45)
    : 80;

  return (
    <div className="flex items-center gap-2">
      {PRIMARY_PERIODS.map(period => {
        const option = PERIOD_OPTIONS.find(o => o.value === period);
        if (!option) return null;

        const isSelected = value === period;
        return (
          <button
            key={period}
            onClick={() => onChange(period)}
            className={`px-3 h-8 text-sm font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
              isSelected
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            {option.label}
          </button>
        );
      })}

      {/* More dropdown for additional periods */}
      <Root direction="bottom" anchor="end">
        <Container
          className="bloom-no-shadow bg-white dark:bg-zinc-900"
          buttonSize={{ width: moreButtonWidth, height: 32 }}
          menuWidth={160}
          menuRadius={12}
          buttonRadius={16}
        >
          <Trigger className={`inline-flex items-center gap-1.5 px-3 h-8 text-sm font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
            isMoreSelected
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
          }`}>
            {isMoreSelected ? selectedMoreOption?.label : 'More'}
            <svg
              className={`w-4 h-4 ${isMoreSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Trigger>

          <Content className="p-1">
            {/* Time range section */}
            <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Time range</div>
            {MORE_TIME_PERIODS.map(period => {
              const option = PERIOD_OPTIONS.find(o => o.value === period);
              if (!option) return null;

              return (
                <Item
                  key={period}
                  onSelect={() => onChange(period)}
                  className={`w-full px-3 h-8 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer ${
                    value === period ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {option.label}
                  {value === period && (
                    <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
                  )}
                </Item>
              );
            })}

            {/* Divider */}
            <div className="-mx-1 border-t border-zinc-100 dark:border-zinc-800 my-2" />

            {/* Trade samples section */}
            <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Trade samples</div>
            {MORE_COUNT_PERIODS.map(period => {
              const option = PERIOD_OPTIONS.find(o => o.value === period);
              if (!option) return null;

              return (
                <Item
                  key={period}
                  onSelect={() => onChange(period)}
                  className={`w-full px-3 h-8 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer ${
                    value === period ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {option.label}
                  {value === period && (
                    <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
                  )}
                </Item>
              );
            })}
          </Content>
        </Container>
      </Root>
    </div>
  );
}

export function PeriodDropdown({ value, onChange }: PeriodDropdownProps) {
  const selectedOption = PERIOD_OPTIONS.find(o => o.value === value);
  const calendarOptions = PERIOD_OPTIONS.filter(o => o.group === 'calendar');
  const otherOptions = PERIOD_OPTIONS.filter(o => !o.group);

  return (
    <Root direction="bottom" anchor="start">
      <Container
        className="bloom-no-shadow bg-white"
        buttonSize={{ width: 120, height: 36 }}
        menuWidth={176}
        menuRadius={12}
        buttonRadius={18}
      >
        <Trigger className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors">
          {selectedOption?.label}
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Trigger>

        <Content className="p-1">
          <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Period</div>

          {calendarOptions.map(option => (
            <Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer ${
                value === option.value ? 'text-zinc-900 font-medium' : 'text-zinc-600'
              }`}
            >
              {option.label}
              {value === option.value && (
                <span className="w-2 h-2 bg-zinc-900 rounded-full" />
              )}
            </Item>
          ))}

          <div className="-mx-1 border-t border-zinc-100 my-2" />

          {otherOptions.map(option => (
            <Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer ${
                value === option.value ? 'text-zinc-900 font-medium' : 'text-zinc-600'
              }`}
            >
              {option.label}
              {value === option.value && (
                <span className="w-2 h-2 bg-zinc-900 rounded-full" />
              )}
            </Item>
          ))}
        </Content>
      </Container>
    </Root>
  );
}

export function getTradeLimit(period: Period): number | null {
  switch (period) {
    case 'last10':
      return 10;
    case 'last20':
      return 20;
    case 'last50':
      return 50;
    default:
      return null;
  }
}

export function getDateRange(period: Period): { from: string | null; to: string | null } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (period) {
    case 'today':
      return { from: formatDate(today), to: formatDate(today) };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: formatDate(yesterday), to: formatDate(yesterday) };
    }

    case 'week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      return { from: formatDate(startOfWeek), to: formatDate(today) };
    }

    case 'lastweek': {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 6); // Last Monday
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6); // Last Sunday
      return { from: formatDate(startOfLastWeek), to: formatDate(endOfLastWeek) };
    }

    case 'month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: formatDate(startOfMonth), to: formatDate(today) };
    }

    case 'lastmonth': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: formatDate(startOfLastMonth), to: formatDate(endOfLastMonth) };
    }

    case 'year': {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { from: formatDate(startOfYear), to: formatDate(today) };
    }

    case 'lastyear': {
      const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
      return { from: formatDate(startOfLastYear), to: formatDate(endOfLastYear) };
    }

    case 'last10':
    case 'last20':
    case 'last50':
    case 'all':
    default:
      return { from: null, to: null };
  }
}
