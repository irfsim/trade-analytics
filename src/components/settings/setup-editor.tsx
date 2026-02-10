'use client';

import { useState } from 'react';
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

export function SetupEditor({ setup, onComplete, onCancel }: SetupEditorProps) {
  const isEditing = setup !== null;

  const [name, setName] = useState(setup?.name || '');
  const [color, setColor] = useState(setup?.color || SETUP_COLORS[0].value);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemDefinition[]>(
    setup?.checklist_items || []
  );
  const [saving, setSaving] = useState(false);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [customItemText, setCustomItemText] = useState('');

  const addItemFromLibrary = (item: ChecklistItemDefinition) => {
    if (!checklistItems.find(i => i.id === item.id)) {
      setChecklistItems([...checklistItems, { ...item, order: checklistItems.length }]);
    }
    setShowLibraryPicker(false);
  };

  const addCustomItem = () => {
    if (customItemText.trim()) {
      const newItem: ChecklistItemDefinition = {
        id: generateId(),
        label: customItemText.trim(),
        order: checklistItems.length,
      };
      setChecklistItems([...checklistItems, newItem]);
      setCustomItemText('');
    }
  };

  const removeItem = (id: string) => {
    setChecklistItems(checklistItems.filter(i => i.id !== id).map((item, idx) => ({ ...item, order: idx })));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= checklistItems.length) return;
    const items = [...checklistItems];
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    setChecklistItems(items.map((item, idx) => ({ ...item, order: idx })));
  };

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
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-5">
        {/* Name */}
        {!isDefault && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Flag Breakout"
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              autoFocus
            />
          </div>
        )}

        {isDefault && setup && (
          <div>
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{setup.name}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              This is the default setup for uncategorized trades. It has no checklist items.
            </p>
          </div>
        )}

        {/* Colour */}
        {!isDefault && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Colour</label>
            <div className="flex flex-wrap gap-2">
              {SETUP_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    color === c.value
                      ? 'border-zinc-900 dark:border-zinc-100 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Checklist Items - only for non-default setups */}
        {!isDefault && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              A+ Checklist Items
              {checklistItems.length > 0 && (
                <span className="ml-2 text-xs font-normal text-zinc-500">({checklistItems.length} items)</span>
              )}
            </label>

            {/* Add from library button */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setShowLibraryPicker(!showLibraryPicker)}
                className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600"
              >
                + From library
              </button>
            </div>

            {/* Library Picker */}
            {showLibraryPicker && (
              <div className="mb-3 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-lg max-h-64 overflow-y-auto">
                {CHECKLIST_LIBRARY.map((category) => (
                  <div key={category.category} className="mb-3 last:mb-0">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{category.category}</div>
                    <div className="space-y-1">
                      {category.items.map((item) => {
                        const isSelected = checklistItems.some(i => i.id === item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => !isSelected && addItemFromLibrary(item)}
                            disabled={isSelected}
                            className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                              isSelected
                                ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer'
                            }`}
                          >
                            {isSelected && <span className="mr-1">✓</span>}
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom item input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={customItemText}
                onChange={(e) => setCustomItemText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
                placeholder="Add custom item..."
                className="flex-1 px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <button
                type="button"
                onClick={addCustomItem}
                disabled={!customItemText.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* Selected items list */}
            {checklistItems.length > 0 && (
              <div className="space-y-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-lg p-2">
                {checklistItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-700/50 rounded"
                  >
                    <span className="flex-1 text-zinc-700 dark:text-zinc-300">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === checklistItems.length - 1}
                        className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-0.5 text-zinc-400 hover:text-red-500 cursor-pointer"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || (!isDefault && !name.trim())}
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Setup'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
