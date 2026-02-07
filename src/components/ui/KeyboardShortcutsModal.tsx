'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Tab'], description: 'Move focus to next element' },
      { keys: ['Shift', 'Tab'], description: 'Move focus to previous element' },
      { keys: ['Skip to content'], description: 'Jump past navigation (visible on focus)' },
    ],
  },
  {
    title: 'Dropdown Menus',
    shortcuts: [
      { keys: ['\u2191'], description: 'Move to previous menu item' },
      { keys: ['\u2193'], description: 'Move to next menu item' },
      { keys: ['Enter'], description: 'Select focused item' },
      { keys: ['Escape'], description: 'Close dropdown menu' },
      { keys: ['Home'], description: 'Jump to first item' },
      { keys: ['End'], description: 'Jump to last item' },
    ],
  },
  {
    title: 'Modals & Dialogs',
    shortcuts: [
      { keys: ['Escape'], description: 'Close the current modal' },
      { keys: ['Tab'], description: 'Cycle focus within modal' },
    ],
  },
  {
    title: 'Search',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open search command palette' },
      { keys: ['\u2318', 'K'], description: 'Open search command palette (Mac)' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Open this keyboard shortcuts help' },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 bg-slate-700 border border-slate-600 rounded px-2 py-0.5 font-mono text-sm text-slate-200 shadow-sm">
      {children}
    </kbd>
  );
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutEntry }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-slate-400 text-sm">{shortcut.description}</span>
      <div className="flex items-center gap-1 ml-4 shrink-0">
        {shortcut.keys.map((key, index) => (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <span className="text-slate-400 text-xs">+</span>}
            <Kbd>{key}</Kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Global listener for '?' key to open the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in input fields
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable
      ) {
        return;
      }

      // '?' requires Shift to be pressed (Shift + /)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Expose open function globally so the footer button can trigger it
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__openKeyboardShortcuts = handleOpen;
    return () => {
      delete (window as unknown as Record<string, unknown>).__openKeyboardShortcuts;
    };
  }, [handleOpen]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Keyboard Shortcuts">
        <div className="space-y-6">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-medium mb-2">
                {section.title}
              </h3>
              <div className="divide-y divide-slate-700/50">
                {section.shortcuts.map((shortcut, index) => (
                  <ShortcutRow key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <p className="text-slate-400 text-xs text-center">
            Press <Kbd>?</Kbd> anywhere to toggle this dialog
          </p>
        </div>
      </Modal>
    </>
  );
}
