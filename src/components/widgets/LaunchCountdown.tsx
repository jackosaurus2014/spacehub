'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const UPCOMING_LAUNCHES = [
  {
    mission: 'Starship Flight 8',
    provider: 'SpaceX',
    vehicle: 'Starship',
    date: '2026-03-15T14:00:00Z',
    site: 'Boca Chica, TX',
    type: 'Test Flight',
    status: 'Go' as const,
  },
  {
    mission: 'Artemis II',
    provider: 'NASA',
    vehicle: 'SLS Block 1',
    date: '2026-04-01T12:00:00Z',
    site: 'Kennedy Space Center',
    type: 'Crewed Lunar',
    status: 'Go' as const,
  },
  {
    mission: 'Falcon 9 - Starlink Group 12-1',
    provider: 'SpaceX',
    vehicle: 'Falcon 9',
    date: '2026-03-05T08:30:00Z',
    site: 'Cape Canaveral SLC-40',
    type: 'Satellite Deployment',
    status: 'Go' as const,
  },
  {
    mission: 'New Glenn - Escapade',
    provider: 'Blue Origin',
    vehicle: 'New Glenn',
    date: '2026-03-20T10:00:00Z',
    site: 'Cape Canaveral LC-36',
    type: 'Mars Mission',
    status: 'TBD' as const,
  },
];

type LaunchStatus = 'Go' | 'TBD' | 'Hold';

const STATUS_STYLES: Record<LaunchStatus, string> = {
  Go: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  TBD: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Hold: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function getCountdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, passed: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs, passed: false };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function StatusBadge({ status }: { status: LaunchStatus }) {
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export default function LaunchCountdown() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...UPCOMING_LAUNCHES]
    .filter((l) => new Date(l.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const next = sorted[0];
  const upcoming = sorted.slice(1, 4);

  if (!next) return null;

  const cd = getCountdown(next.date);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <span className="text-lg">🚀</span> Launch Countdown
        </h2>
        <Link href="/launch" className="text-xs text-slate-300 hover:text-white transition-colors">
          Full Schedule &rarr;
        </Link>
      </div>

      {/* Primary countdown */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-semibold text-base truncate">{next.mission}</span>
          <StatusBadge status={next.status} />
        </div>
        <div className="flex gap-3 mb-2" aria-label={`${cd.days} days ${cd.hours} hours ${cd.mins} minutes ${cd.secs} seconds`}>
          {[
            { val: cd.days, label: 'DAYS' },
            { val: cd.hours, label: 'HRS' },
            { val: cd.mins, label: 'MIN' },
            { val: cd.secs, label: 'SEC' },
          ].map((u) => (
            <div key={u.label} className="text-center">
              <span className="block text-2xl font-bold font-mono bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
                {pad(u.val)}
              </span>
              <span className="text-[10px] text-slate-500 tracking-wider">{u.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          {next.provider} &middot; {next.vehicle} &middot; {next.site}
        </p>
      </div>

      {/* Upcoming list */}
      {upcoming.length > 0 && (
        <div className="border-t border-slate-700/50 pt-3 space-y-2.5">
          {upcoming.map((l) => {
            const t = getCountdown(l.date);
            return (
              <div key={l.mission} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200 truncate">{l.mission}</p>
                  <p className="text-[11px] text-slate-500">{l.provider}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-slate-300">
                    {t.days}d {pad(t.hours)}h
                  </span>
                  <StatusBadge status={l.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
