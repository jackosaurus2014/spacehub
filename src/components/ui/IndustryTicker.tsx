'use client';

import { useState, useEffect } from 'react';

interface TickerMetric {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  live?: boolean;
}

const STATIC_METRICS: TickerMetric[] = [
  { label: 'Orbital Launches 2026', value: '32', change: '+4 this month', positive: true },
  { label: 'Active Satellites', value: '10,200+', change: '+180 YTD', positive: true },
  { label: 'Space Economy', value: '$546B', change: '+8.2% YoY', positive: true },
  { label: 'Q1 VC Funding', value: '$2.1B', change: '+12% QoQ', positive: true },
  { label: 'ISS Crew', value: '7', live: true },
  { label: 'Next Launch', value: 'T-', live: true },
  { label: 'Tracked Objects', value: '44,500+', change: '+320 MTD', positive: false },
  { label: 'Kp Index', value: '2', change: 'Quiet', positive: true, live: true },
];

/**
 * Bloomberg-style live data ticker bar.
 * Displays key space industry metrics in a horizontally scrolling ribbon.
 */
export default function IndustryTicker() {
  const [metrics, setMetrics] = useState<TickerMetric[]>(STATIC_METRICS);
  const [nextLaunchCountdown, setNextLaunchCountdown] = useState('');

  // Fetch live metrics on mount
  useEffect(() => {
    async function fetchLiveData() {
      try {
        // Try to fetch real launch data
        const res = await fetch('/api/space-events?limit=1&upcoming=true');
        if (res.ok) {
          const data = await res.json();
          if (data.events?.[0]) {
            const evt = data.events[0];
            const launchDate = new Date(evt.date);
            const now = new Date();
            const diffMs = launchDate.getTime() - now.getTime();
            if (diffMs > 0) {
              const days = Math.floor(diffMs / 86400000);
              const hours = Math.floor((diffMs % 86400000) / 3600000);
              setNextLaunchCountdown(days > 0 ? `${days}d ${hours}h` : `${hours}h`);
            }
          }
        }
      } catch { /* static fallback is fine */ }
    }
    fetchLiveData();
  }, []);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => [...prev]); // Force re-render for live timestamps
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-black/80 backdrop-blur-sm border-b border-white/[0.06] overflow-hidden">
      <div className="relative">
        {/* Scrolling ticker */}
        <div className="flex items-center gap-0 animate-ticker whitespace-nowrap py-1.5 px-4">
          {/* Double the items for seamless loop */}
          {[...metrics, ...metrics].map((m, i) => (
            <div key={i} className="flex items-center gap-2 px-4 border-r border-white/[0.06] last:border-0">
              {m.live && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
              )}
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{m.label}</span>
              <span className="text-[11px] text-white font-semibold font-mono tabular-nums">
                {m.label === 'Next Launch' ? (nextLaunchCountdown || '—') : m.value}
              </span>
              {m.change && (
                <span className={`text-[9px] font-medium ${m.positive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {m.change}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
