'use client';

import { useEffect, useState } from 'react';

interface LaunchData {
  name: string;
  countdown_seconds: number | null;
  agency: string;
  rocket: string;
  location: string;
  date?: string;
}

export default function NextLaunchWidget() {
  const [data, setData] = useState<LaunchData | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/widgets/next-launch')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setCountdown(d.countdown_seconds);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const formatCountdown = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  if (!data) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 300 }}>
      <div style={{ fontSize: 10, color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Next Launch
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
        {data.name}
      </div>
      {countdown !== null && countdown > 0 && (
        <div style={{ fontSize: 24, fontWeight: 800, color: '#06b6d4', fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
          T-{formatCountdown(countdown)}
        </div>
      )}
      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
        <div>{'\u{1F680}'} {data.rocket}</div>
        <div>{'\u{1F3E2}'} {data.agency}</div>
        <div>{'\u{1F4CD}'} {data.location}</div>
      </div>
    </div>
  );
}
