'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ContextMenuDropdown } from '@/components/context-menu-dropdown';
import type { SetupType } from '@/types/database';

interface SetupWithCount extends SetupType {
  trade_count?: number;
}

interface SetupsSectionProps {
  onEditSetup: (setup: SetupType | null) => void;
  refreshKey?: number;
}

export function SetupsSection({ onEditSetup, refreshKey }: SetupsSectionProps) {
  const [setupTypes, setSetupTypes] = useState<SetupWithCount[]>([]);
  const [archivedSetups, setArchivedSetups] = useState<SetupWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSetupTypes();
  }, [refreshKey]);

  useEffect(() => {
    if (!menuOpenId) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  const loadSetupTypes = async () => {
    try {
      const res = await fetch('/api/setup-types?includeArchived=true');
      if (res.ok) {
        const data = await res.json();
        const all = (data.setupTypes || []).map((s: SetupWithCount) => ({
          ...s,
          checklist_items: s.checklist_items || [],
        }));
        setSetupTypes(all.filter((s: SetupWithCount) => !s.archived && !s.is_default));
        setArchivedSetups(all.filter((s: SetupWithCount) => s.archived));
      }
    } catch (error) {
      console.error('Failed to load setup types:', error);
    } finally {
      setLoading(false);
    }
  };

  const archiveSetupType = async (id: number) => {
    try {
      const res = await fetch(`/api/setup-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });

      if (res.ok) {
        const setup = setupTypes.find(s => s.id === id);
        if (setup) {
          setSetupTypes(setupTypes.filter(s => s.id !== id));
          setArchivedSetups([...archivedSetups, { ...setup, archived: true }]);
          toast.success(`Setup "${setup.name}" archived`);
        }
      }
    } catch (error) {
      console.error('Failed to archive setup type:', error);
      toast.error('Failed to archive setup');
    }
  };

  const restoreSetupType = async (id: number) => {
    try {
      const res = await fetch(`/api/setup-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });

      if (res.ok) {
        const setup = archivedSetups.find(s => s.id === id);
        if (setup) {
          setArchivedSetups(archivedSetups.filter(s => s.id !== id));
          setSetupTypes([...setupTypes, { ...setup, archived: false }]);
          toast.success(`Setup "${setup.name}" restored`);
        }
      }
    } catch (error) {
      console.error('Failed to restore setup type:', error);
      toast.error('Failed to restore setup');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Types List */}
      {setupTypes.length === 0 ? (
        <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-zinc-600 dark:text-zinc-400 mb-3">
            No setup types defined yet
          </p>
          <button
            onClick={() => onEditSetup(null)}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Create your first setup →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {setupTypes.map((setup) => {
            const hasItems = setup.checklist_items?.length > 0;
            const isExpanded = expandedId === setup.id;
            const tradeCount = setup.trade_count ?? 0;

            return (
              <div
                key={setup.id}
                className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <div
                  className={`flex items-center justify-between p-3 ${hasItems ? 'cursor-pointer' : ''}`}
                  onClick={() => hasItems ? setExpandedId(isExpanded ? null : setup.id) : undefined}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Plus/minus icon — only for setups with checklist items */}
                    {hasItems && (
                      <div className="relative w-3.5 h-3.5 flex-shrink-0">
                        {/* Horizontal bar (always visible) */}
                        <motion.span
                          className="absolute top-1/2 left-0 w-full h-[1.5px] bg-zinc-400 -translate-y-1/2 rounded-full"
                        />
                        {/* Vertical bar (animates out when expanded) */}
                        <motion.span
                          animate={{ scaleY: isExpanded ? 0 : 1 }}
                          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                          className="absolute left-1/2 top-0 w-[1.5px] h-full bg-zinc-400 -translate-x-1/2 rounded-full origin-center"
                        />
                      </div>
                    )}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: setup.color || '#6b7280' }}
                    />
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{setup.name}</span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 flex-shrink-0 tabular-nums">
                        {hasItems && <>{setup.checklist_items.length} requirement{setup.checklist_items.length !== 1 ? 's' : ''}</>}
                        {hasItems && <span className="mx-1">·</span>}
                        {tradeCount} trade{tradeCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()} ref={menuOpenId === setup.id ? menuRef : undefined}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === setup.id ? null : setup.id)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                      aria-label="Setup options"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                    {menuOpenId === setup.id && (
                      <ContextMenuDropdown>
                        <button
                          onClick={() => { setMenuOpenId(null); onEditSetup(setup); }}
                          className="w-full px-3 h-8 text-left text-sm text-zinc-700 dark:text-zinc-300 rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                        {!setup.is_default && (
                          <button
                            onClick={() => { setMenuOpenId(null); archiveSetupType(setup.id); }}
                            className="w-full px-3 h-8 text-left text-sm text-red-600 dark:text-red-400 rounded-lg cursor-pointer"
                          >
                            Archive
                          </button>
                        )}
                      </ContextMenuDropdown>
                    )}
                  </div>
                </div>

                {/* Expandable checklist items */}
                <AnimatePresence initial={false}>
                  {isExpanded && hasItems && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-3 pb-3 space-y-1" style={{ paddingLeft: 'calc(0.75rem + 0.875rem + 0.75rem + 1rem + 0.75rem)' }}>
                        {setup.checklist_items.map((item) => (
                          <div key={item.id} className="flex items-baseline gap-2 text-sm text-zinc-900 dark:text-zinc-100">
                            <span className="flex-shrink-0 text-zinc-400">·</span>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived Setups */}
      {archivedSetups.length > 0 && (
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
            Archived ({archivedSetups.length})
          </button>

          {showArchived && (
            <div className="mt-3 space-y-2">
              {archivedSetups.map((setup) => (
                <div
                  key={setup.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: setup.color || '#6b7280' }}
                      />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{setup.name}</span>
                    </div>
                    <button
                      onClick={() => restoreSetupType(setup.id)}
                      className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
