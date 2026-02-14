'use client';

import { useState, useEffect } from 'react';
import { isNativePlatform, getPlatform } from '@/lib/capacitor';

/**
 * React hook for components that need to render differently on native vs. web.
 */
export function useNativePlatform() {
  const [platform, setPlatform] = useState<'web' | 'ios' | 'android'>('web');
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isNativePlatform());
    setPlatform(getPlatform());
  }, []);

  return {
    isNative,
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
  };
}
