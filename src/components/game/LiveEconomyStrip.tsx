'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Proof the economy is running before you register (SYNTHESIS.md graft A4):
// live spot prices from the shared market and how much player/NPC-built
// hardware is listed right now. Honest empty state, no invented numbers.
interface Price { slug: string; name: string; icon: string; spot: number; base: number; changePct: number | null }

export default function LiveEconomyStrip({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<{ prices: Price[]; hardwareListed: number | null; asOf: string | null } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch('/api/game/spot-prices').then((r) => r.json()).then(setData).catch(() => setFailed(true));
  }, []);
  if (failed || (data && data.prices.length === 0)) return null;
  const rows = data ? data.prices.slice(0, compact ? 4 : 8) : [];
  return (
    <div className="rounded-[var(--radius-console)] border border-[var(--line)] bg-[rgba(19,17,16,.85)] p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)] mb-2">
        <span>Live market · one shared economy</span>
        {data?.asOf && <span className="normal-case tracking-normal font-mono">{new Date(data.asOf).toISOString().slice(11, 16)}Z</span>}
      </div>
      {!data ? (
        <div className="h-16 rounded bg-white/[0.03]" aria-hidden="true" />
      ) : (
        <ul className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-x-4 gap-y-1.5`}>
          {rows.map((p) => (
            <li key={p.slug} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate text-[var(--ink-2)]"><span aria-hidden="true" className="mr-1">{p.icon}</span>{p.name}</span>
              <span className="font-mono tabular-nums text-[var(--ink)]">
                ${p.spot.toLocaleString('en-US')}
                {p.changePct != null && <span className={`ml-1 text-[11px] ${p.changePct > 0 ? 'text-[var(--go)]' : p.changePct < 0 ? 'text-[var(--crit)]' : 'text-[var(--ink-3)]'}`}>{p.changePct > 0 ? '▲' : p.changePct < 0 ? '▼' : '─'}{Math.abs(p.changePct)}%</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data && data.hardwareListed != null && (
        <p className="text-[12px] text-[var(--ink-3)] mt-2">
          <span className="text-[var(--violet)] font-mono">{data.hardwareListed}</span> units of manufactured hardware listed for sale right now — every one built by a player or an NPC corporation. <Link href="/space-tycoon/about" className="text-[var(--violet)] hover:underline">How the economy works &rarr;</Link>
        </p>
      )}
    </div>
  );
}
