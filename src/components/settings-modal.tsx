'use client';

import { useState, useEffect } from 'react';
import { ProfileSection } from './settings/profile-section';
import { AccountsSection } from './settings/accounts-section';
import { SetupsSection } from './settings/setups-section';

type SettingsSection = 'profile' | 'accounts' | 'setups';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatar: string | null;
  onAvatarChange: (avatar: string | null) => void;
  displayName: string;
  onDisplayNameChange: (displayName: string) => void;
}

const SECTION_META: Record<SettingsSection, { title: string; description: string }> = {
  profile: { title: 'Profile', description: 'Manage your account details' },
  accounts: { title: 'Accounts', description: 'Manage your broker connections and trading accounts' },
  setups: { title: 'Setup Types', description: 'Define your trading setups to categorise trades when reviewing them' },
};

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: (
      <svg className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'setups',
    label: 'Setups',
    icon: (
      <svg className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

export function SettingsModal({ isOpen, onClose, avatar, onAvatarChange, displayName, onDisplayNameChange }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex animate-modal-in">
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 border-r border-zinc-100 dark:border-zinc-800 px-2 pt-2">
          <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Settings</div>
          <nav>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full h-8 px-3 text-sm flex items-center justify-between rounded-lg transition-colors focus:outline-none cursor-pointer ${
                  activeSection === section.id
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {section.label}
                {section.icon}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col h-[560px]">
          {/* Fixed header */}
          <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                {SECTION_META[activeSection].title}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Close settings"
              >
                <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 text-pretty">
              {SECTION_META[activeSection].description}
            </p>
            {activeSection === 'profile' && <ProfileSection avatar={avatar} onAvatarChange={onAvatarChange} displayName={displayName} onDisplayNameChange={onDisplayNameChange} />}
            {activeSection === 'accounts' && <AccountsSection />}
            {activeSection === 'setups' && <SetupsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
