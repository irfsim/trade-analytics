'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileSection } from './settings/profile-section';
import { AccountsSection } from './settings/accounts-section';
import { SetupsSection } from './settings/setups-section';
import { SetupEditor } from './settings/setup-editor';
import { IbkrOnboardingWizard } from './onboarding';
import type { SetupType } from '@/types/database';

type SettingsSection = 'profile' | 'accounts' | 'setups';
type ModalMode = 'settings' | 'wizard' | 'setup-editor';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatar: string | null;
  onAvatarChange: (avatar: string | null) => void;
  displayName: string;
  onDisplayNameChange: (displayName: string) => void;
}

const SECTION_META: Record<SettingsSection, { title: string; description: string }> = {
  profile: { title: 'Profile', description: '' },
  accounts: { title: 'Accounts', description: 'Manage your trading accounts' },
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

const contentVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 24 : -24,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
  }),
};

function SettingsSidebar({ activeSection, onSectionChange }: { activeSection: SettingsSection; onSectionChange: (s: SettingsSection) => void }) {
  const navRef = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<{ top: number; height: number } | null>(null);
  const hasHovered = useRef(false);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setHover({ top: btnRect.top - navRect.top, height: btnRect.height });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHover(null);
    hasHovered.current = false;
  }, []);

  useEffect(() => {
    if (hover) {
      const id = requestAnimationFrame(() => { hasHovered.current = true; });
      return () => cancelAnimationFrame(id);
    }
  }, [hover]);

  return (
    <div className="w-44 flex-shrink-0 border-r border-zinc-100 dark:border-zinc-800 px-2 pt-2">
      <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">Settings</div>
      <nav
        ref={navRef}
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative' }}
      >
        {/* Hover highlight */}
        <div
          className="bg-zinc-100 dark:bg-zinc-800 rounded-lg"
          style={{
            position: 'absolute',
            top: hover?.top ?? 0,
            left: 0,
            width: '100%',
            height: hover?.height ?? 0,
            opacity: hover ? 1 : 0,
            pointerEvents: 'none',
            transition: hasHovered.current
              ? 'top 100ms linear, height 100ms linear, opacity 80ms linear'
              : 'opacity 80ms linear',
          }}
        />
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`relative w-full h-8 px-3 text-sm flex items-center justify-between rounded-lg focus:outline-none cursor-pointer ${
              activeSection === section.id
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {section.label}
            {section.icon}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose, avatar, onAvatarChange, displayName, onDisplayNameChange }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [mode, setMode] = useState<ModalMode>('settings');
  const [editingSetup, setEditingSetup] = useState<SetupType | null>(null);
  const [setupsRefreshKey, setSetupsRefreshKey] = useState(0);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Reset mode when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMode('settings');
      setEditingSetup(null);
      setActiveSection('profile');
    }
  }, [isOpen]);

  function handleStartWizard() {
    setMode('wizard');
  }

  function handleWizardComplete() {
    setMode('settings');
    setActiveSection('accounts');
  }

  function handleWizardCancel() {
    setMode('settings');
  }

  function handleStartSetupEditor(setup: SetupType | null) {
    setEditingSetup(setup);
    setMode('setup-editor');
  }

  function handleSetupEditorComplete() {
    setMode('settings');
    setActiveSection('setups');
    setEditingSetup(null);
    setSetupsRefreshKey(k => k + 1);
  }

  function handleSetupEditorCancel() {
    setMode('settings');
    setEditingSetup(null);
  }

  if (!isOpen) return null;

  // Direction: 1 = forward (settings→wizard/editor), -1 = backward (wizard/editor→settings)
  const direction = mode !== 'settings' ? 1 : -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — persistent across transitions */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 animate-fade-in"
        onClick={mode === 'settings' ? onClose : undefined}
      />

      {/* Animated modal container — morphs width between settings and wizard */}
      <motion.div
        layout
        transition={{ layout: { type: 'spring', bounce: 0.12, duration: 0.55 } }}
        style={{ borderRadius: 12 }}
        className={`relative bg-white dark:bg-zinc-900 shadow-xl w-full mx-4 max-h-[85vh] overflow-hidden ${
          mode === 'settings' ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {mode === 'settings' ? (
            <motion.div
              key="settings"
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
              className="flex"
            >
              {/* Sidebar */}
              <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

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
                  {SECTION_META[activeSection].description && (
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 text-pretty">
                        {SECTION_META[activeSection].description}
                      </p>
                      {activeSection === 'accounts' && (
                        <button
                          onClick={handleStartWizard}
                          className="flex-shrink-0 px-3 py-1.5 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                        >
                          Connect Account
                        </button>
                      )}
                      {activeSection === 'setups' && (
                        <button
                          onClick={() => handleStartSetupEditor(null)}
                          className="flex-shrink-0 px-3 py-1.5 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                        >
                          Add Setup
                        </button>
                      )}
                    </div>
                  )}
                  {activeSection === 'profile' && <ProfileSection avatar={avatar} onAvatarChange={onAvatarChange} displayName={displayName} onDisplayNameChange={onDisplayNameChange} />}
                  {activeSection === 'accounts' && <AccountsSection onStartWizard={handleStartWizard} />}
                  {activeSection === 'setups' && <SetupsSection onEditSetup={handleStartSetupEditor} refreshKey={setupsRefreshKey} />}
                </div>
              </div>
            </motion.div>
          ) : mode === 'wizard' ? (
            <motion.div
              key="wizard"
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            >
              <IbkrOnboardingWizard
                inline
                onComplete={handleWizardComplete}
                onCancel={handleWizardCancel}
              />
            </motion.div>
          ) : (
            <motion.div
              key="setup-editor"
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            >
              <SetupEditor
                setup={editingSetup}
                onComplete={handleSetupEditorComplete}
                onCancel={handleSetupEditorCancel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
