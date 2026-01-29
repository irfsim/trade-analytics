'use client';

import { Root, Container, Trigger, Content, Item } from 'bloom-menu';

export type Period = 'today' | 'yesterday' | 'week' | 'lastweek' | 'month' | 'lastmonth' | 'year' | 'lastyear' | 'all';

interface PeriodOption {
  value: Period;
  label: string;
  group?: 'calendar' | 'rolling';
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'today', label: 'Today', group: 'calendar' },
  { value: 'yesterday', label: 'Yesterday', group: 'calendar' },
  { value: 'week', label: 'This week', group: 'calendar' },
  { value: 'lastweek', label: 'Last week', group: 'calendar' },
  { value: 'month', label: 'This month', group: 'calendar' },
  { value: 'lastmonth', label: 'Last month', group: 'calendar' },
  { value: 'year', label: 'This year', group: 'calendar' },
  { value: 'lastyear', label: 'Last year', group: 'calendar' },
  { value: 'all', label: 'All time' },
];

interface PeriodDropdownProps {
  value: Period;
  onChange: (period: Period) => void;
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

        <Content className="p-1" style={{ marginBottom: '-8px' }}>
          <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Period</div>

          {calendarOptions.map(option => (
            <Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-zinc-100 rounded-lg cursor-pointer ${
                value === option.value ? 'text-zinc-900 font-medium' : 'text-zinc-600'
              }`}
            >
              {option.label}
              {value === option.value && (
                <span className="w-2 h-2 bg-zinc-900 rounded-full" />
              )}
            </Item>
          ))}

          <div className="border-t border-zinc-100 my-2 mx-1" />

          {otherOptions.map(option => (
            <Item
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-zinc-100 rounded-lg cursor-pointer ${
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

    case 'all':
    default:
      return { from: null, to: null };
  }
}
