'use client';

import { useState, useEffect } from 'react';
import type { SetupType } from '@/types/database';

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

export function SetupsSection() {
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([]);
  const [archivedSetups, setArchivedSetups] = useState<SetupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(SETUP_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    loadSetupTypes();
  }, []);

  const loadSetupTypes = async () => {
    try {
      const res = await fetch('/api/setup-types?includeArchived=true');
      if (res.ok) {
        const data = await res.json();
        const all = data.setupTypes || [];
        setSetupTypes(all.filter((s: SetupType) => !s.archived));
        setArchivedSetups(all.filter((s: SetupType) => s.archived));
      }
    } catch (error) {
      console.error('Failed to load setup types:', error);
    } finally {
      setLoading(false);
    }
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSetupTypes([...setupTypes, data.setupType]);
        setNewName('');
        setNewColor(SETUP_COLORS[0].value);
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to add setup type:', error);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (setup: SetupType) => {
    setEditingId(setup.id);
    setEditName(setup.name);
    setEditColor(setup.color || SETUP_COLORS[0].value);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/setup-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
        }),
      });

      if (res.ok) {
        setSetupTypes(setupTypes.map(s =>
          s.id === id ? { ...s, name: editName.trim(), color: editColor } : s
        ));
        setEditingId(null);
        setEditName('');
        setEditColor('');
      }
    } catch (error) {
      console.error('Failed to update setup type:', error);
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
        }
      }
    } catch (error) {
      console.error('Failed to archive setup type:', error);
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
        }
      }
    } catch (error) {
      console.error('Failed to restore setup type:', error);
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
      <div>
        <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">Setup Types</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Define your trading setups to categorise trades when reviewing them</p>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-3 h-8 text-sm font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            + Add Setup
          </button>
        )}
      </div>

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
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    autoFocus
                  />
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(setup.id)}
                      disabled={saving || !editName.trim()}
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
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{setup.name}</span>
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
                    <button
                      onClick={() => archiveSetupType(setup.id)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Archive"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
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
