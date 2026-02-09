'use client';

import { useEffect, useState } from 'react';

interface MarketData {
  top_movers: { symbol: string; change_pct: number }[];
  trend: 'up' | 'down' | 'neutral';
  updated_at: string;
}

export default function MarketSnapshotWidget() {
  const [data, setData] = useState<MarketData | null>(null);

  useEffect(() => {
    fetch('/api/widgets/market-snapshot')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return <div style={{ padding: 16, color: '#94a3b8', fontSize: 12 }}>Loading...</div>;
  }

  const trendIcon = data.trend === 'up' ? '\u{1F4C8}' : data.trend === 'down' ? '\u{1F4C9}' : '\u{27A1}\u{FE0F}';

  return (
    <div style={{ padding: 16, maxWidth: 300 }}>
      <div style={{ fontSize: 10, color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Market Snapshot {trendIcon}
      </div>
      {data.top_movers.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.top_movers.map(m => (
            <div key={m.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{m.symbol}</span>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: m.change_pct >= 0 ? '#34d399' : '#f87171',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {m.change_pct >= 0 ? '+' : ''}{m.change_pct}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>No market data</div>
      )}
    </div>
  );
}
