'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';

const PRESET_AVATARS = [
  'https://avatars.outpace.systems/avatars/previews/avatar-5.webp',
  'https://avatars.outpace.systems/avatars/previews/avatar-6.webp',
  'https://avatars.outpace.systems/avatars/previews/avatar-8.webp',
  'https://avatars.outpace.systems/avatars/previews/avatar-36.webp',
  'https://avatars.outpace.systems/avatars/previews/avatar-45.webp',
  'https://avatars.outpace.systems/avatars/previews/avatar-47.webp',
];

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #5BE1F0 0%, #4A9FF5 30%, #6366F1 60%, #A855F7 100%)';

interface ProfileSectionProps {
  avatar: string | null;
  onAvatarChange: (avatar: string | null) => void;
  displayName: string;
  onDisplayNameChange: (displayName: string) => void;
}

export function ProfileSection({ avatar, onAvatarChange, displayName, onDisplayNameChange }: ProfileSectionProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [localDisplayName, setLocalDisplayName] = useState(displayName);
  const [flexQueryToken, setFlexQueryToken] = useState('');
  const [flexQueryId, setFlexQueryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setLocalDisplayName(profile.display_name || '');
      setSelectedAvatar(profile.avatar_url);
      setFlexQueryToken(profile.flex_query_token || '');
      setFlexQueryId(profile.flex_query_id || '');
    }
  }, [profile]);

  // Sync selected avatar when prop changes (e.g., modal reopens)
  useEffect(() => {
    setSelectedAvatar(avatar);
  }, [avatar]);

  // Sync local display name when prop changes (e.g., modal reopens)
  useEffect(() => {
    setLocalDisplayName(displayName);
  }, [displayName]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setSelectedAvatar(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Save to database
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: localDisplayName || null,
          avatar_url: selectedAvatar,
          flex_query_token: flexQueryToken || null,
          flex_query_id: flexQueryId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      // Update local state via callbacks (for compatibility with parent components)
      if (selectedAvatar !== avatar) {
        onAvatarChange(selectedAvatar);
      }
      if (localDisplayName !== displayName) {
        onDisplayNameChange(localDisplayName);
      }

      // Refresh profile in auth context
      await refreshProfile();

      toast.success('Profile saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">Profile</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage your account details</p>
      </div>

      {/* Avatar */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          Avatar
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {/* Default gradient */}
          <button
            onClick={() => setSelectedAvatar(null)}
            className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${
              selectedAvatar === null
                ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-900'
                : 'hover:scale-105'
            }`}
            style={{ background: DEFAULT_GRADIENT }}
            title="Default"
          />
          {/* Preset avatars */}
          {PRESET_AVATARS.map((url, index) => (
            <button
              key={url}
              onClick={() => setSelectedAvatar(url)}
              className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden transition-all ${
                selectedAvatar === url
                  ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-900'
                  : 'hover:scale-105'
              }`}
              title={`Avatar ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full flex-shrink-0 border border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
            title="Upload custom avatar"
          >
            <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Display Name
        </label>
        <input
          type="text"
          value={localDisplayName}
          onChange={(e) => setLocalDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
        />
      </div>

      {/* Email (read-only from auth) */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Email
        </label>
        <input
          type="email"
          value={user?.email || ''}
          disabled
          className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
        />
        <p className="mt-1 text-xs text-zinc-500">Email cannot be changed</p>
      </div>

      {/* IBKR Integration Section */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">IBKR Integration</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Connect your Interactive Brokers account for auto-sync</p>

        <div className="space-y-4">
          {/* Flex Query Token */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Flex Query Token
            </label>
            <input
              type="password"
              value={flexQueryToken}
              onChange={(e) => setFlexQueryToken(e.target.value)}
              placeholder="Enter your Flex Query token"
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
          </div>

          {/* Flex Query ID */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Flex Query ID
            </label>
            <input
              type="text"
              value={flexQueryId}
              onChange={(e) => setFlexQueryId(e.target.value)}
              placeholder="Enter your Flex Query ID"
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors btn-press"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
