'use client';

import { useEffect, useState } from 'react';

interface JobsWidgetData {
  totalActive: number;
  atPrivateCompanies: number;
  topCompanies: { name: string; count: number }[];
  updatedAt: string;
}

// Round DOWN to the nearest 100 so the widget never overstates the count.
function roundDownPlus(n: number): string {
  const rounded = Math.floor(Math.max(0, n) / 100) * 100;
  return `${rounded.toLocaleString('en-US')}+`;
}

export default function JobsWidget() {
  const [data, setData] = useState<JobsWidgetData | null>(null);

  useEffect(() => {
    fetch('/api/widgets/jobs')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div style={{ padding: '4%', textAlign: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="SpaceNexus live space industry jobs count"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        padding: 'clamp(12px, 6%, 24px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 'clamp(8px, 4%, 16px)',
        background: '#000000',
        color: 'rgba(255,255,255,0.9)',
      }}
    >
      <div
        style={{
          fontSize: 'clamp(9px, 2.5vw, 11px)',
          color: '#06b6d4',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
        }}
      >
        Space Industry Jobs
      </div>

      <div>
        <div
          style={{
            fontSize: 'clamp(22px, 8vw, 34px)',
            fontWeight: 800,
            color: '#f1f5f9',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
          }}
        >
          {roundDownPlus(data.totalActive)}
        </div>
        <div style={{ fontSize: 'clamp(10px, 2.6vw, 13px)', color: '#94a3b8', marginTop: 2 }}>
          open space industry jobs
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 'clamp(16px, 5.5vw, 22px)',
            fontWeight: 700,
            color: '#67e8f9',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
          }}
        >
          {roundDownPlus(data.atPrivateCompanies)}
        </div>
        <div style={{ fontSize: 'clamp(10px, 2.6vw, 13px)', color: '#94a3b8', marginTop: 2 }}>
          at private / pre-IPO companies
        </div>
      </div>

      <a
        href="https://spacenexus.us/space-talent"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 'clamp(9px, 2.2vw, 11px)',
          color: '#64748b',
          textDecoration: 'none',
          marginTop: 'clamp(2px, 1%, 6px)',
        }}
      >
        Powered by SpaceNexus &rarr;
      </a>
    </div>
  );
}
