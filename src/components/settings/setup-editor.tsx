'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { SetupType, ChecklistItemDefinition } from '@/types/database';
import { CHECKLIST_LIBRARY } from '@/types/database';

const SETUP_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#6b7280', label: 'Gray' },
];

function generateId(): string {
  return 'item-' + Math.random().toString(36).substr(2, 9);
}

interface SetupEditorProps {
  setup: SetupType | null;
  onComplete: () => void;
  onCancel: () => void;
}

function ChecklistPicker({
  pickerRef,
  pickerPos,
  filteredCategories,
  checklistItems,
  showAddCustom,
  searchText,
  addItemFromLibrary,
  removeItem,
  addCustomFromSearch,
  deleteCustomItemFromAll,
}: {
  pickerRef: React.RefObject<HTMLDivElement | null>;
  pickerPos: { top: number; left: number; width: number };
  filteredCategories: { category: string; items: ChecklistItemDefinition[] }[];
  checklistItems: ChecklistItemDefinition[];
  showAddCustom: boolean;
  searchText: string;
  addItemFromLibrary: (item: ChecklistItemDefinition) => void;
  removeItem: (id: string) => void;
  addCustomFromSearch: () => void;
  deleteCustomItemFromAll: (label: string) => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const hasHighlighted = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const updateHighlightFromElement = useCallback((btn: Element) => {
    if (!innerRef.current) return;
    const rect = innerRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const inset = 4; // horizontal padding for highlight within full-width container
    setHighlight({
      top: btnRect.top - rect.top + innerRef.current.scrollTop,
      left: btnRect.left - rect.left + innerRef.current.scrollLeft + inset,
      width: btnRect.width - inset * 2,
      height: btnRect.height,
    });
  }, []);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    const btn = (e.target as HTMLElement).closest('button');
    if (btn) updateHighlightFromElement(btn);
  }, [updateHighlightFromElement]);

  const handleMouseLeave = useCallback(() => {
    setHighlight(null);
    hasHighlighted.current = false;
    lastMousePos.current = null;
  }, []);

  const handleScroll = useCallback(() => {
    if (!lastMousePos.current) return;
    const el = document.elementFromPoint(lastMousePos.current.x, lastMousePos.current.y);
    if (!el) return;
    const btn = el.closest('button');
    if (btn && innerRef.current?.contains(btn)) {
      updateHighlightFromElement(btn);
    } else {
      setHighlight(null);
      hasHighlighted.current = false;
    }
  }, [updateHighlightFromElement]);

  useEffect(() => {
    if (highlight) {
      const id = requestAnimationFrame(() => { hasHighlighted.current = true; });
      return () => cancelAnimationFrame(id);
    }
  }, [highlight]);

  return (
    <div
      ref={(node) => {
        innerRef.current = node;
        if (pickerRef && 'current' in pickerRef) (pickerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className="fixed bg-white dark:bg-zinc-900 rounded-xl max-h-64 overflow-y-auto py-1"
      style={{
        top: pickerPos.top,
        left: pickerPos.left,
        width: pickerPos.width,
        zIndex: 100,
        boxShadow: '0 0 0 1px var(--card-border), 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        position: 'fixed',
      }}
      onMouseOver={handleMouseOver}
      onMouseMove={(e) => { lastMousePos.current = { x: e.clientX, y: e.clientY }; }}
      onMouseLeave={handleMouseLeave}
      onScroll={handleScroll}
    >
      {/* Sliding highlight */}
      <div
        className="bg-zinc-100 dark:bg-zinc-700/50 rounded-lg"
        style={{
          position: 'absolute',
          top: highlight?.top ?? 0,
          left: highlight?.left ?? 0,
          width: highlight?.width ?? 0,
          height: highlight?.height ?? 0,
          opacity: highlight ? 1 : 0,
          pointerEvents: 'none',
          transition: hasHighlighted.current
            ? 'top 100ms linear, height 100ms linear, opacity 80ms linear'
            : 'opacity 80ms linear',
        }}
      />
      <div style={{ position: 'relative' }}>
        {filteredCategories.map((category, catIdx) => (
          <div key={category.category}>
            {catIdx > 0 && <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />}
            <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">{category.category}</div>
            {category.items.map((item) => {
              const isCustom = !item.id.startsWith('lib-');
              const isActive = isCustom
                ? checklistItems.some(i => i.label === item.label)
                : checklistItems.some(i => i.id === item.id);
              return (
                <div key={item.id} className="relative group">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => isActive ? removeItem(checklistItems.find(i => isCustom ? i.label === item.label : i.id === item.id)!.id) : addItemFromLibrary(item)}
                    className={`w-full px-3 py-2 text-left text-sm rounded-lg cursor-pointer flex items-center justify-between ${
                      isCustom ? 'pr-8' : ''
                    } ${
                      isActive
                        ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {item.label}
                    {isActive && <span className="w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rounded-full flex-shrink-0 ml-2" />}
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => { e.stopPropagation(); deleteCustomItemFromAll(item.label); }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
                      aria-label={`Remove "${item.label}" from all setups`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {showAddCustom && (
          <>
            {filteredCategories.length > 0 && <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addCustomFromSearch}
              className="w-full px-3 py-2 text-left text-sm rounded-lg text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              + Add &ldquo;<span className="font-medium">{searchText.trim()}</span>&rdquo; as custom
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SetupEditor({ setup, onComplete, onCancel }: SetupEditorProps) {
  const isEditing = setup !== null;

  const [name, setName] = useState(setup?.name || '');
  const [color, setColor] = useState(setup?.color || SETUP_COLORS[0].value);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemDefinition[]>(
    setup?.checklist_items || []
  );
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [sharedCustomItems, setSharedCustomItems] = useState<ChecklistItemDefinition[]>([]);
  const [allSetups, setAllSetups] = useState<SetupType[]>([]);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const openPicker = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setPickerPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setShowPicker(true);
  };

  // Close picker on outside click, escape, or scroll
  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPicker(false);
        searchInputRef.current?.blur();
      }
    };
    const handleScroll = () => setShowPicker(false);
    const scrollEl = scrollContainerRef.current;
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    scrollEl?.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
      scrollEl?.removeEventListener('scroll', handleScroll);
    };
  }, [showPicker]);

  // Fetch custom items from all other setups to show in library picker
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup-types');
        if (!res.ok) return;
        const data = await res.json();
        const fetchedSetups: SetupType[] = data.setupTypes || [];
        setAllSetups(fetchedSetups);
        const seen = new Map<string, ChecklistItemDefinition>();
        for (const s of fetchedSetups) {
          for (const item of s.checklist_items || []) {
            if (!item.id.startsWith('lib-') && !seen.has(item.label)) {
              seen.set(item.label, item);
            }
          }
        }
        setSharedCustomItems(Array.from(seen.values()));
      } catch {
        // Non-critical — library picker still works with built-in items
      }
    })();
  }, []);

  const libraryCategories = useMemo(() => {
    if (sharedCustomItems.length === 0) return CHECKLIST_LIBRARY;
    return [
      ...CHECKLIST_LIBRARY,
      { category: 'Custom', items: sharedCustomItems },
    ];
  }, [sharedCustomItems]);

  const initialName = setup?.name || '';
  const initialColor = setup?.color || SETUP_COLORS[0].value;
  const initialItems = setup?.checklist_items || [];

  const hasChanges = useMemo(() => {
    if (name !== initialName) return true;
    if (color !== initialColor) return true;
    if (checklistItems.length !== initialItems.length) return true;
    return checklistItems.some((item, i) => item.id !== initialItems[i]?.id || item.label !== initialItems[i]?.label);
  }, [name, color, checklistItems, initialName, initialColor, initialItems]);

  // Flatten all library items for filtering
  const allLibraryItems = useMemo(() =>
    libraryCategories.flatMap(cat => cat.items.map(item => ({ ...item, category: cat.category }))),
    [libraryCategories],
  );

  // Filter by search text (keep selected items visible for active indicator)
  const filteredResults = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    return allLibraryItems.filter(item => {
      if (!query) return true;
      return item.label.toLowerCase().includes(query);
    });
  }, [allLibraryItems, searchText]);

  // Group filtered results back into categories
  const filteredCategories = useMemo(() => {
    const groups: { category: string; items: (ChecklistItemDefinition & { category: string })[] }[] = [];
    for (const item of filteredResults) {
      let group = groups.find(g => g.category === item.category);
      if (!group) {
        group = { category: item.category, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [filteredResults]);

  // Show "Add as custom" when search text doesn't exactly match any library item
  const showAddCustom = useMemo(() => {
    if (!searchText.trim()) return false;
    const query = searchText.trim().toLowerCase();
    return !allLibraryItems.some(item => item.label.toLowerCase() === query)
      && !checklistItems.some(i => i.label.toLowerCase() === query);
  }, [searchText, allLibraryItems, checklistItems]);

  const addItemFromLibrary = (item: ChecklistItemDefinition) => {
    const isCustom = !item.id.startsWith('lib-');
    const id = isCustom ? generateId() : item.id;
    if (!checklistItems.find(i => isCustom ? i.label === item.label : i.id === item.id)) {
      setChecklistItems([...checklistItems, { ...item, id, order: checklistItems.length }]);
    }
    setSearchText('');
  };

  const addCustomFromSearch = () => {
    if (!searchText.trim()) return;
    const newItem: ChecklistItemDefinition = {
      id: generateId(),
      label: searchText.trim(),
      order: checklistItems.length,
    };
    setChecklistItems([...checklistItems, newItem]);
    setSearchText('');
  };

  const deleteCustomItemFromAll = async (label: string) => {
    // Snapshot state for undo
    const prevChecklistItems = [...checklistItems];
    const prevSharedCustomItems = [...sharedCustomItems];
    const affectedSetups = allSetups.filter(s =>
      (s.checklist_items || []).some(i => !i.id.startsWith('lib-') && i.label === label)
    );
    const prevSetupItems = new Map(affectedSetups.map(s => [s.id, [...(s.checklist_items || [])]]));

    // Remove locally
    setChecklistItems(prev => prev.filter(i => i.label !== label).map((item, idx) => ({ ...item, order: idx })));
    setSharedCustomItems(prev => prev.filter(i => i.label !== label));

    // Remove from all other setups via API
    for (const s of affectedSetups) {
      if (s.id === setup?.id) continue;
      const updated = (s.checklist_items || []).filter(i => i.label !== label).map((item, idx) => ({ ...item, order: idx }));
      await fetch(`/api/setup-types/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: s.name, checklist_items: updated }),
      }).catch(() => {});
    }

    toast(`Removed "${label}" from all setups`, {
      actionButtonStyle: { background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' },
      action: {
        label: 'Undo',
        onClick: async () => {
          // Restore local state
          setChecklistItems(prevChecklistItems);
          setSharedCustomItems(prevSharedCustomItems);
          // Restore in all affected setups via API
          for (const s of affectedSetups) {
            if (s.id === setup?.id) continue;
            const original = prevSetupItems.get(s.id);
            if (original) {
              await fetch(`/api/setup-types/${s.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: s.name, checklist_items: original }),
              }).catch(() => {});
            }
          }
          toast.success(`Restored "${label}"`);
        },
      },
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showAddCustom) {
        addCustomFromSearch();
      } else if (filteredResults.length === 1) {
        addItemFromLibrary(filteredResults[0]);
      }
    }
  };

  const removeItem = (id: string) => {
    setChecklistItems(checklistItems.filter(i => i.id !== id).map((item, idx) => ({ ...item, order: idx })));
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= checklistItems.length || fromIndex === toIndex) return;
    const items = [...checklistItems];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    setChecklistItems(items.map((item, idx) => ({ ...item, order: idx })));
  };

  // Pointer-based drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragOriginY = useRef(0);
  const dragItemRects = useRef<DOMRect[]>([]);
  const dragIdxRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const checklistItemsRef = useRef(checklistItems);
  checklistItemsRef.current = checklistItems;

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setDragIdx(index);
    dragIdxRef.current = index;
    dragOriginY.current = e.clientY;
    setDragY(0);
    if (listRef.current) {
      dragItemRects.current = Array.from(listRef.current.children).map(c => c.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (dragIdx === null) return;

    const onMove = (e: PointerEvent) => {
      const currentDragIdx = dragIdxRef.current;
      if (currentDragIdx === null) return;
      const dy = e.clientY - dragOriginY.current;
      setDragY(dy);

      const rects = dragItemRects.current;
      if (!rects.length) return;
      const draggedCenter = rects[currentDragIdx].top + rects[currentDragIdx].height / 2 + dy;
      let target = currentDragIdx;
      for (let i = 0; i < rects.length; i++) {
        const mid = rects[i].top + rects[i].height / 2;
        if (i < currentDragIdx && draggedCenter < mid) { target = i; break; }
        if (i > currentDragIdx && draggedCenter > mid) { target = i; }
      }
      if (target !== currentDragIdx) {
        // Reorder items
        const items = [...checklistItemsRef.current];
        const [moved] = items.splice(currentDragIdx, 1);
        items.splice(target, 0, moved);
        setChecklistItems(items.map((item, idx) => ({ ...item, order: idx })));

        dragOriginY.current += (rects[target].top - rects[currentDragIdx].top);
        setDragY(e.clientY - dragOriginY.current);
        setDragIdx(target);
        dragIdxRef.current = target;
        if (listRef.current) {
          dragItemRects.current = Array.from(listRef.current.children).map(c => c.getBoundingClientRect());
        }
      }
    };

    const onUp = () => {
      setDragIdx(null);
      dragIdxRef.current = null;
      setDragY(0);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [dragIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (isEditing) {
        const res = await fetch(`/api/setup-types/${setup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            color,
            checklist_items: setup.is_default ? [] : checklistItems,
          }),
        });

        if (res.ok) {
          toast.success(`Setup "${name.trim()}" updated`);
          onComplete();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || 'Failed to update setup');
        }
      } else {
        const res = await fetch('/api/setup-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            color,
            checklist_items: checklistItems,
          }),
        });

        if (res.ok) {
          toast.success(`Setup "${name.trim()}" created`);
          onComplete();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || 'Failed to create setup');
        }
      }
    } catch (error) {
      console.error('Failed to save setup:', error);
      toast.error(isEditing ? 'Failed to update setup' : 'Failed to create setup');
    } finally {
      setSaving(false);
    }
  };

  const isDefault = setup?.is_default ?? false;

  return (
    <div className="flex flex-col h-[560px]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              aria-label="Back to setups"
            >
              <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {isEditing ? 'Edit Setup' : 'New Setup'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
        <div className="space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Name row */}
          {!isDefault && (
            <div className="grid grid-cols-[1fr_1.5fr] gap-6 py-5 first:pt-0">
              <div>
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Name</label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Identifies this setup type</p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Flag Breakout"
                className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                autoFocus
              />
            </div>
          )}

          {isDefault && setup && (
            <div className="grid grid-cols-[1fr_1.5fr] gap-6 py-5 first:pt-0">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{setup.name}</div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Default setup for uncategorized trades
                </p>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                This setup has no checklist items.
              </p>
            </div>
          )}

          {/* Colour row */}
          {!isDefault && (
            <div className="grid grid-cols-[1fr_1.5fr] gap-6 py-5">
              <div>
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Colour</label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Used in charts and labels</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {SETUP_COLORS.map((c) => {
                  const isActive = color?.toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                        isActive ? 'scale-110' : 'hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: c.value,
                        boxShadow: isActive
                          ? '0 0 0 2px var(--background), 0 0 0 4px var(--foreground)'
                          : undefined,
                      }}
                      title={c.label}
                      aria-label={`${c.label}${isActive ? ' (selected)' : ''}`}
                    >
                      {isActive && (
                        <svg className="w-4 h-4 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Checklist Items row - only for non-default setups */}
          {!isDefault && (
            <div className="grid grid-cols-[1fr_1.5fr] gap-6 py-5">
              <div>
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  A+ Checklist
                </label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Pick from the library or add your own criteria to grade trades against
                  {checklistItems.length > 0 && (
                    <span className="block mt-0.5">{checklistItems.length} item{checklistItems.length !== 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>
              <div className="space-y-3">
                {/* Searchable combobox */}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); if (!showPicker) openPicker(); }}
                  onFocus={openPicker}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search or add custom requirement..."
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                />

                {/* Dropdown — portaled to escape overflow clipping */}
                {showPicker && pickerPos && (filteredCategories.length > 0 || showAddCustom) && createPortal(
                  <ChecklistPicker
                    pickerRef={pickerRef}
                    pickerPos={pickerPos}
                    filteredCategories={filteredCategories}
                    checklistItems={checklistItems}
                    showAddCustom={showAddCustom}
                    searchText={searchText}
                    addItemFromLibrary={addItemFromLibrary}
                    removeItem={removeItem}
                    addCustomFromSearch={addCustomFromSearch}
                    deleteCustomItemFromAll={deleteCustomItemFromAll}
                  />,
                  document.body,
                )}

                {/* Selected items list — drag to reorder */}
                {checklistItems.length > 0 && (
                  <div
                    ref={listRef}
                    className="bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-700/50"
                  >
                    {checklistItems.map((item, index) => (
                      <div
                        key={item.id}
                        onPointerDown={(e) => handlePointerDown(e, index)}
                        className={`flex items-center gap-2 px-3 py-2.5 text-sm select-none ${
                          dragIdx === index
                            ? 'relative z-10 bg-white dark:bg-zinc-800 shadow-lg rounded-lg'
                            : ''
                        }`}
                        style={{
                          cursor: dragIdx === index ? 'grabbing' : 'grab',
                          transform: dragIdx === index ? `translateY(${dragY}px)` : undefined,
                          transition: dragIdx !== null && dragIdx !== index ? 'transform 150ms ease-out' : undefined,
                        }}
                      >
                        {/* Drag handle */}
                        <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="5.5" cy="4" r="1.2" />
                          <circle cx="10.5" cy="4" r="1.2" />
                          <circle cx="5.5" cy="8" r="1.2" />
                          <circle cx="10.5" cy="8" r="1.2" />
                          <circle cx="5.5" cy="12" r="1.2" />
                          <circle cx="10.5" cy="12" r="1.2" />
                        </svg>
                        <span className="flex-1 text-zinc-900 dark:text-zinc-100">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-0.5 text-zinc-400 hover:text-red-500 cursor-pointer flex-shrink-0"
                          aria-label={`Remove "${item.label}"`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
        <div
          className={`grid transition-[grid-template-columns,opacity] duration-200 ease-out ${
            hasChanges ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0'
          }`}
        >
          <button
            onClick={onCancel}
            tabIndex={hasChanges ? 0 : -1}
            className="overflow-hidden whitespace-nowrap px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges || (!isDefault && !name.trim())}
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-press cursor-pointer"
        >
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Setup'}
        </button>
      </div>
    </div>
  );
}
