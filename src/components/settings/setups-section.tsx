'use client';

import { useState, useEffect } from 'react';
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

// Generate UUID for checklist items
function generateId(): string {
  return 'item-' + Math.random().toString(36).substr(2, 9);
}

export function SetupsSection() {
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([]);
  const [archivedSetups, setArchivedSetups] = useState<SetupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(SETUP_COLORS[0].value);
  const [newChecklistItems, setNewChecklistItems] = useState<ChecklistItemDefinition[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editChecklistItems, setEditChecklistItems] = useState<ChecklistItemDefinition[]>([]);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [showEditLibraryPicker, setShowEditLibraryPicker] = useState(false);
  const [customItemText, setCustomItemText] = useState('');
  const [editCustomItemText, setEditCustomItemText] = useState('');

  useEffect(() => {
    loadSetupTypes();
  }, []);

  const loadSetupTypes = async () => {
    try {
      const res = await fetch('/api/setup-types?includeArchived=true');
      if (res.ok) {
        const data = await res.json();
        const all = (data.setupTypes || []).map((s: SetupType) => ({
          ...s,
          checklist_items: s.checklist_items || [],
        }));
        setSetupTypes(all.filter((s: SetupType) => !s.archived && !s.is_default));
        setArchivedSetups(all.filter((s: SetupType) => s.archived));
      }
    } catch (error) {
      console.error('Failed to load setup types:', error);
    } finally {
      setLoading(false);
    }
  };

  // Checklist item management for new setup
  const addItemFromLibrary = (item: ChecklistItemDefinition) => {
    if (!newChecklistItems.find(i => i.id === item.id)) {
      setNewChecklistItems([...newChecklistItems, { ...item, order: newChecklistItems.length }]);
    }
    setShowLibraryPicker(false);
  };

  const addCustomItem = () => {
    if (customItemText.trim()) {
      const newItem: ChecklistItemDefinition = {
        id: generateId(),
        label: customItemText.trim(),
        order: newChecklistItems.length,
      };
      setNewChecklistItems([...newChecklistItems, newItem]);
      setCustomItemText('');
    }
  };

  const removeNewItem = (id: string) => {
    setNewChecklistItems(newChecklistItems.filter(i => i.id !== id).map((item, idx) => ({ ...item, order: idx })));
  };

  const moveNewItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newChecklistItems.length) return;
    const items = [...newChecklistItems];
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    setNewChecklistItems(items.map((item, idx) => ({ ...item, order: idx })));
  };

  // Checklist item management for editing
  const addEditItemFromLibrary = (item: ChecklistItemDefinition) => {
    if (!editChecklistItems.find(i => i.id === item.id)) {
      setEditChecklistItems([...editChecklistItems, { ...item, order: editChecklistItems.length }]);
    }
    setShowEditLibraryPicker(false);
  };

  const addEditCustomItem = () => {
    if (editCustomItemText.trim()) {
      const newItem: ChecklistItemDefinition = {
        id: generateId(),
        label: editCustomItemText.trim(),
        order: editChecklistItems.length,
      };
      setEditChecklistItems([...editChecklistItems, newItem]);
      setEditCustomItemText('');
    }
  };

  const removeEditItem = (id: string) => {
    setEditChecklistItems(editChecklistItems.filter(i => i.id !== id).map((item, idx) => ({ ...item, order: idx })));
  };

  const moveEditItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editChecklistItems.length) return;
    const items = [...editChecklistItems];
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    setEditChecklistItems(items.map((item, idx) => ({ ...item, order: idx })));
  };

  const addSetupType = async () => {
    if (!newName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/setup-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          color: newColor,
          checklist_items: newChecklistItems,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSetupTypes([...setupTypes, { ...data.setupType, checklist_items: data.setupType.checklist_items || [] }]);
        setNewName('');
        setNewColor(SETUP_COLORS[0].value);
        setNewChecklistItems([]);
        setShowAddForm(false);
        toast.success(`Setup "${newName.trim()}" created`);
      }
    } catch (error) {
      console.error('Failed to add setup type:', error);
      toast.error('Failed to create setup');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (setup: SetupType) => {
    setEditingId(setup.id);
    setEditName(setup.name);
    setEditColor(setup.color || SETUP_COLORS[0].value);
    setEditChecklistItems(setup.checklist_items || []);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setEditChecklistItems([]);
    setEditCustomItemText('');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;

    setSaving(true);
    try {
      const setup = setupTypes.find(s => s.id === id);
      const res = await fetch(`/api/setup-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
          checklist_items: setup?.is_default ? [] : editChecklistItems,
        }),
      });

      if (res.ok) {
        setSetupTypes(setupTypes.map(s =>
          s.id === id ? { ...s, name: editName.trim(), color: editColor, checklist_items: setup?.is_default ? [] : editChecklistItems } : s
        ));
        setEditingId(null);
        setEditName('');
        setEditColor('');
        setEditChecklistItems([]);
        toast.success(`Setup "${editName.trim()}" updated`);
      }
    } catch (error) {
      console.error('Failed to update setup type:', error);
      toast.error('Failed to update setup');
    } finally {
      setSaving(false);
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
      {!showAddForm && (
        <div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 h-8 text-sm font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            + Add Setup
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Flag Breakout"
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Colour</label>
            <div className="flex flex-wrap gap-2">
              {SETUP_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setNewColor(color.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    newColor === color.value
                      ? 'border-zinc-900 dark:border-zinc-100 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Checklist Items Section */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              A+ Checklist Items
              {newChecklistItems.length > 0 && (
                <span className="ml-2 text-xs font-normal text-zinc-500">({newChecklistItems.length} items)</span>
              )}
            </label>

            {/* Add buttons */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setShowLibraryPicker(!showLibraryPicker)}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600"
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
                        const isSelected = newChecklistItems.some(i => i.id === item.id);
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
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* Selected items list */}
            {newChecklistItems.length > 0 && (
              <div className="space-y-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-lg p-2">
                {newChecklistItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-700/50 rounded"
                  >
                    <span className="flex-1 text-zinc-700 dark:text-zinc-300">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveNewItem(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveNewItem(index, 'down')}
                        disabled={index === newChecklistItems.length - 1}
                        className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeNewItem(item.id)}
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

          <div className="flex gap-2">
            <button
              onClick={addSetupType}
              disabled={saving || !newName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? 'Adding...' : 'Add Setup'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setNewColor(SETUP_COLORS[0].value);
                setNewChecklistItems([]);
                setShowLibraryPicker(false);
                setCustomItemText('');
              }}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Setup Types List */}
      {setupTypes.length === 0 && !showAddForm ? (
        <div className="text-center py-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No setup types defined yet.</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Add your first setup type to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {setupTypes.map((setup) => (
            <div
              key={setup.id}
              className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            >
              {editingId === setup.id ? (
                <div className="space-y-3">
                  {!setup.is_default && (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      autoFocus
                    />
                  )}
                  {setup.is_default && (
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{setup.name}</div>
                  )}
                  {!setup.is_default && (
                    <div className="flex flex-wrap gap-2">
                      {SETUP_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setEditColor(color.value)}
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            editColor === color.value
                              ? 'border-zinc-900 dark:border-zinc-100 scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  )}

                  {/* Checklist Items Section - only for non-default setups */}
                  {!setup.is_default && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        A+ Checklist Items
                        {editChecklistItems.length > 0 && (
                          <span className="ml-2 font-normal">({editChecklistItems.length} items)</span>
                        )}
                      </label>

                      {/* Add buttons */}
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setShowEditLibraryPicker(!showEditLibraryPicker)}
                          className="px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                        >
                          + From library
                        </button>
                      </div>

                      {/* Library Picker */}
                      {showEditLibraryPicker && (
                        <div className="mb-2 p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded max-h-48 overflow-y-auto">
                          {CHECKLIST_LIBRARY.map((category) => (
                            <div key={category.category} className="mb-2 last:mb-0">
                              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{category.category}</div>
                              <div className="space-y-0.5">
                                {category.items.map((item) => {
                                  const isSelected = editChecklistItems.some(i => i.id === item.id);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => !isSelected && addEditItemFromLibrary(item)}
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
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={editCustomItemText}
                          onChange={(e) => setEditCustomItemText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addEditCustomItem()}
                          placeholder="Add custom item..."
                          className="flex-1 px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                        <button
                          type="button"
                          onClick={addEditCustomItem}
                          disabled={!editCustomItemText.trim()}
                          className="px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>

                      {/* Selected items list */}
                      {editChecklistItems.length > 0 && (
                        <div className="space-y-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded p-1.5">
                          {editChecklistItems.map((item, index) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-1 px-1.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-700/50 rounded"
                            >
                              <span className="flex-1 text-zinc-700 dark:text-zinc-300 truncate">{item.label}</span>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moveEditItem(index, 'up')}
                                  disabled={index === 0}
                                  className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveEditItem(index, 'down')}
                                  disabled={index === editChecklistItems.length - 1}
                                  className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEditItem(item.id)}
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

                  {setup.is_default && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      This is the default setup for uncategorized trades. It has no checklist items.
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(setup.id)}
                      disabled={saving || (!setup.is_default && !editName.trim())}
                      className="px-3 h-7 text-xs font-medium rounded-full transition-colors cursor-pointer bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                    >
                      {saving ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: setup.color || '#6b7280' }}
                    />
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{setup.name}</span>
                      {setup.is_default ? (
                        <span className="ml-2 text-xs text-zinc-400">(default)</span>
                      ) : setup.checklist_items?.length > 0 ? (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {setup.checklist_items.length} checklist items
                        </span>
                      ) : (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                          No checklist items
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(setup)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {!setup.is_default && (
                      <button
                        onClick={() => archiveSetupType(setup.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                        title="Archive"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
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
