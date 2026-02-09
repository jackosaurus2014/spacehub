'use client';

import { useCallback, useEffect, useState } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20],
  error: [50, 30, 50, 30, 50],
  warning: [30, 50, 30],
};

export function useHaptics() {
  const [isEnabled, setIsEnabled] = useState(true);
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  useEffect(() => {
    const stored = localStorage.getItem('spacenexus-haptics-enabled');
    if (stored !== null) setIsEnabled(stored === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('spacenexus-haptics-enabled', String(isEnabled));
  }, [isEnabled]);

  const trigger = useCallback((pattern: HapticPattern) => {
    if (!isSupported || !isEnabled) return;
    try { navigator.vibrate(PATTERNS[pattern]); } catch {}
  }, [isSupported, isEnabled]);

  return { trigger, isSupported, isEnabled, setEnabled: setIsEnabled };
}
