'use client';

import { useEffect, useRef } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared accessibility hook for game modals/dialogs (game-modal-card pattern).
 *
 * - Traps Tab/Shift+Tab focus inside the modal while it's open.
 * - Moves initial focus into the modal on mount, restores focus to whatever
 *   was focused before the modal opened, on unmount/close.
 * - Closes on Escape (via the shared `useEscapeKey` hook).
 *
 * Usage: attach the returned ref to the outer `role="dialog"` element.
 *
 *   const modalRef = useModalA11y<HTMLDivElement>(onClose);
 *   <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1} ...>
 */
export function useModalA11y<T extends HTMLElement>(onClose: () => void, enabled: boolean = true) {
  const ref = useRef<T>(null);
  useEscapeKey(onClose, enabled);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null
      );

    // Move initial focus into the modal so keyboard/SR users land inside it.
    const focusables = getFocusable();
    (focusables[0] ?? node).focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [enabled]);

  return ref;
}
