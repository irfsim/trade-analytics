'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HoverList } from './hover-list';

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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isMoreSelected = MORE_PERIODS.includes(value);
  const selectedMoreOption = PERIOD_OPTIONS.find(o => o.value === value && MORE_PERIODS.includes(o.value));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [moreOpen]);

  return (
    <div className="flex items-center rounded-full bg-[#FAFAFA] dark:bg-[#1c1c1e] p-1">
      {PRIMARY_PERIODS.map(period => {
        const option = PERIOD_OPTIONS.find(o => o.value === period);
        if (!option) return null;

        const isSelected = value === period;
        return (
          <button
            key={period}
            onClick={() => onChange(period)}
            className="relative px-3 h-7 text-sm font-medium rounded-full whitespace-nowrap cursor-pointer border-0 bg-transparent appearance-none"
          >
            {isSelected && (
              <motion.div
                layoutId="period-pill-highlight"
                className="absolute inset-0 bg-zinc-900 dark:bg-zinc-100"
                style={{ borderRadius: 9999 }}
                transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
              />
            )}
            <span className={`relative z-10 transition-colors duration-100 ${
              isSelected
                ? 'text-white dark:text-zinc-900'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}>
              {option.label}
            </span>
          </button>
        );
      })}

      {/* More dropdown */}
      <div className="relative" ref={moreRef}>
        <button
          onClick={() => setMoreOpen(prev => !prev)}
          className="relative inline-flex items-center gap-1 px-3 h-7 text-sm font-medium rounded-full whitespace-nowrap cursor-pointer border-0 bg-transparent appearance-none"
        >
          {isMoreSelected && (
            <motion.div
              layoutId="period-pill-highlight"
              className="absolute inset-0 bg-zinc-900 dark:bg-zinc-100"
              style={{ borderRadius: 9999 }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
            />
          )}
          <span className={`relative z-10 transition-colors duration-100 ${
            isMoreSelected
              ? 'text-white dark:text-zinc-900'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}>
            {isMoreSelected ? selectedMoreOption?.label : 'More'}
          </span>
          <svg
            className={`relative z-10 w-3.5 h-3.5 transition-colors duration-100 ${
              isMoreSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-400'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {moreOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg p-1 z-50"
            >
              <HoverList>
                <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Time range</div>
                {MORE_TIME_PERIODS.map(period => {
                  const option = PERIOD_OPTIONS.find(o => o.value === period);
                  if (!option) return null;
                  return (
                    <button
                      key={period}
                      onClick={() => { onChange(period); setMoreOpen(false); }}
                      className={`relative w-full px-3 h-8 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer border-0 bg-transparent appearance-none ${
                        value === period ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {option.label}
                      {value === period && (
                        <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
                      )}
                    </button>
                  );
                })}

                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1 -mx-1" />

                <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Trade samples</div>
                {MORE_COUNT_PERIODS.map(period => {
                  const option = PERIOD_OPTIONS.find(o => o.value === period);
                  if (!option) return null;
                  return (
                    <button
                      key={period}
                      onClick={() => { onChange(period); setMoreOpen(false); }}
                      className={`relative w-full px-3 h-8 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer border-0 bg-transparent appearance-none ${
                        value === period ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {option.label}
                      {value === period && (
                        <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </HoverList>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function PeriodDropdown({ value, onChange }: PeriodDropdownProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption = PERIOD_OPTIONS.find(o => o.value === value);
  const calendarOptions = PERIOD_OPTIONS.filter(o => o.group === 'calendar');
  const otherOptions = PERIOD_OPTIONS.filter(o => !o.group);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 cursor-pointer appearance-none border-0"
      >
        {selectedOption?.label}
        <svg
          className="w-4 h-4 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg p-1 z-50"
          >
            <HoverList>
              <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Period</div>

              {calendarOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={`relative w-full px-3 py-2.5 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer border-0 bg-transparent appearance-none ${
                    value === option.value ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {option.label}
                  {value === option.value && (
                    <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
                  )}
                </button>
              ))}

              <div className="border-t border-zinc-100 dark:border-zinc-800 my-2 -mx-1" />

              {otherOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={`relative w-full px-3 py-2.5 text-left text-sm flex items-center justify-between rounded-lg cursor-pointer border-0 bg-transparent appearance-none ${
                    value === option.value ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {option.label}
                  {value === option.value && (
                    <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
                  )}
                </button>
              ))}
            </HoverList>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
