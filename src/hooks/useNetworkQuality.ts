'use client';

import { useState, useEffect } from 'react';

export type NetworkTier = 'fast' | 'medium' | 'slow';

interface NetworkInfo {
  tier: NetworkTier;
  effectiveType: string;
  saveData: boolean;
}

interface NetworkConnection {
  effectiveType: string;
  downlink: number;
  saveData: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

function classify(): NetworkInfo {
  if (typeof navigator === 'undefined') {
    return { tier: 'fast', effectiveType: '4g', saveData: false };
  }
  const conn = (navigator as Navigator & { connection?: NetworkConnection }).connection;
  if (!conn) {
    return { tier: 'fast', effectiveType: '4g', saveData: false };
  }
  const { effectiveType, downlink, saveData } = conn;
  if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
    return { tier: 'slow', effectiveType, saveData };
  }
  if (effectiveType === '3g' || downlink < 1.5) {
    return { tier: 'medium', effectiveType, saveData };
  }
  return { tier: 'fast', effectiveType, saveData };
}

export default function useNetworkQuality(): NetworkInfo {
  const [info, setInfo] = useState<NetworkInfo>(classify);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: NetworkConnection }).connection;
    if (!conn) return;
    const update = () => setInfo(classify());
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  return info;
}
