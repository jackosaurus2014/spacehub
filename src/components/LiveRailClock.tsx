'use client';

import { useEffect, useState } from 'react';

// T−HH:MM:SS for the LiveRail. Server renders the value once (so the HTML is
// never blank); the client keeps it ticking. aria-live is deliberately off —
// a per-second live region is a screen-reader denial of service; the label
// carries the time in words.
function fmt(ms: number): string {
  if (ms <= 0) return 'LIVE';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const hh = String(h).padStart(2, '0'), mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return d > 0 ? `T−${d}d ${hh}:${mm}` : `T−${hh}:${mm}:${ss}`;
}

export default function LiveRailClock({ iso }: { iso: string }) {
  const target = new Date(iso).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = target - (now ?? Date.now());
  const label = ms <= 0 ? 'Launching now' : `Launch in ${Math.max(0, Math.round(ms / 60000))} minutes`;
  return (
    <span className="font-mono tabular-nums text-[#4FD8E8] font-semibold" aria-label={label} aria-live="off">
      {fmt(ms)}
    </span>
  );
}
