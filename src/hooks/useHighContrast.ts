'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'spacenexus-high-contrast';

/**
 * Manages a high-contrast mode preference.
 * - Persists the choice in localStorage.
 * - Respects the `prefers-contrast: more` media query as the initial default.
 * - Toggles a `high-contrast` class on `document.documentElement`.
 */
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Initialise from localStorage or media query on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored !== null) {
      // Explicit user preference exists
      const enabled = stored === 'true';
      setIsHighContrast(enabled);
      document.documentElement.classList.toggle('high-contrast', enabled);
    } else {
      // Fall back to system preference
      const mql = window.matchMedia('(prefers-contrast: more)');
      setIsHighContrast(mql.matches);
      document.documentElement.classList.toggle('high-contrast', mql.matches);
    }
  }, []);

  // Keep the DOM class in sync whenever the state changes (after initial mount)
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', isHighContrast);
  }, [isHighContrast]);

  const toggleHighContrast = useCallback(() => {
    setIsHighContrast((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { isHighContrast, toggleHighContrast } as const;
}
