'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts.
 * Supports platform-specific modifiers (Cmd on Mac, Ctrl on Windows/Linux).
 *
 * @param options - Configuration for the keyboard shortcut
 * @param callback - Function to call when the shortcut is triggered
 * @param enabled - Whether the shortcut is currently active (default: true)
 */
export function useKeyboardShortcut(
  options: KeyboardShortcutOptions | KeyboardShortcutOptions[],
  callback: () => void,
  enabled: boolean = true
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const shortcuts = Array.isArray(options) ? options : [options];

      for (const shortcut of shortcuts) {
        const {
          key,
          ctrlKey = false,
          metaKey = false,
          shiftKey = false,
          altKey = false,
          preventDefault = true,
        } = shortcut;

        const keyMatch = event.key.toLowerCase() === key.toLowerCase();
        const ctrlMatch = ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = metaKey ? event.metaKey : !event.metaKey;
        const shiftMatch = shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = altKey ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          callback();
          return;
        }
      }
    },
    [options, callback, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Returns shortcuts for Cmd+K (Mac) or Ctrl+K (Windows/Linux).
 * Useful for command palette-style shortcuts.
 */
export function usePlatformModifier(): 'meta' | 'ctrl' {
  if (typeof window === 'undefined') return 'ctrl';

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? 'meta' : 'ctrl';
}

/**
 * Hook for command palette style shortcuts (Cmd+K / Ctrl+K).
 * Automatically handles platform detection.
 */
export function useCommandPaletteShortcut(
  callback: () => void,
  enabled: boolean = true
): void {
  useKeyboardShortcut(
    [
      { key: 'k', metaKey: true },  // Mac: Cmd+K
      { key: 'k', ctrlKey: true },  // Windows/Linux: Ctrl+K
    ],
    callback,
    enabled
  );
}
