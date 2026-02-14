'use client';

import { useCallback, useEffect, useState } from 'react';
import { isNativePlatform } from '@/lib/capacitor';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

// Web fallback vibration patterns (milliseconds)
const WEB_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20],
  error: [50, 30, 50, 30, 50],
  warning: [30, 50, 30],
};

async function triggerNativeHaptic(pattern: HapticPattern): Promise<void> {
  const { Haptics, ImpactStyle, NotificationType } = await import(
    '@capacitor/haptics'
  );

  switch (pattern) {
    case 'light':
      await Haptics.impact({ style: ImpactStyle.Light });
      break;
    case 'medium':
      await Haptics.impact({ style: ImpactStyle.Medium });
      break;
    case 'heavy':
      await Haptics.impact({ style: ImpactStyle.Heavy });
      break;
    case 'success':
      await Haptics.notification({ type: NotificationType.Success });
      break;
    case 'error':
      await Haptics.notification({ type: NotificationType.Error });
      break;
    case 'warning':
      await Haptics.notification({ type: NotificationType.Warning });
      break;
  }
}

export function useHaptics() {
  const [isEnabled, setIsEnabled] = useState(true);
  const native = isNativePlatform();
  const isSupported =
    native || (typeof navigator !== 'undefined' && 'vibrate' in navigator);

  useEffect(() => {
    const stored = localStorage.getItem('spacenexus-haptics-enabled');
    if (stored !== null) setIsEnabled(stored === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('spacenexus-haptics-enabled', String(isEnabled));
  }, [isEnabled]);

  const trigger = useCallback(
    (pattern: HapticPattern) => {
      if (!isSupported || !isEnabled) return;

      if (native) {
        triggerNativeHaptic(pattern).catch(() => {});
      } else {
        try {
          navigator.vibrate(WEB_PATTERNS[pattern]);
        } catch {
          // Vibration API not available
        }
      }
    },
    [isSupported, isEnabled, native]
  );

  return { trigger, isSupported, isEnabled, setEnabled: setIsEnabled };
}
