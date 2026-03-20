'use client';

import Link from 'next/link';

/**
 * Dashboard widget showing recent high-signal events:
 * executive moves, contract awards, and funding rounds.
 * Cross-pollinates data from multiple modules into the dashboard.
 */

// Sample signals (in production, fetched from API)
const RECENT_SIGNALS = [
  { type: 'exec', icon: '👔', title: 'New CEO at Rocket Lab', detail: 'Peter Beck transitions to Executive Chairman', href: '/executive-moves', time: '2h ago' },
  { type: 'contract', icon: '📋', title: 'SpaceX wins $1.8B NRO contract', detail: 'National Reconnaissance Office satellite launch services', href: '/contract-awards', time: '5h ago' },
  { type: 'funding', icon: '💰', title: 'Vast raises $300M Series C', detail: 'Led by Koch Disruptive Technologies for Haven-2 station', href: '/funding-rounds', time: '1d ago' },
  { type: 'exec', icon: '👔', title: 'Axiom Space hires new CTO', detail: 'Former NASA ISS program manager joins as CTO', href: '/executive-moves', time: '1d ago' },
  { type: 'contract', icon: '📋', title: 'L3Harris $500M Space Force deal', detail: 'Next-gen missile warning satellite sensors', href: '/contract-awards', time: '2d ago' },
];

export default function RecentSignals() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider">Industry Signals</h3>
        <div className="flex gap-2">
          <Link href="/executive-moves" className="text-[9px] text-cyan-400 hover:text-cyan-300">Exec Moves</Link>
          <Link href="/contract-awards" className="text-[9px] text-cyan-400 hover:text-cyan-300">Contracts</Link>
          <Link href="/funding-rounds" className="text-[9px] text-cyan-400 hover:text-cyan-300">Funding</Link>
        </div>
      </div>
      <div className="space-y-2">
        {RECENT_SIGNALS.slice(0, 4).map((signal, i) => (
          <Link
            key={i}
            href={signal.href}
            className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
          >
            <span className="text-sm shrink-0 mt-0.5">{signal.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium group-hover:text-cyan-300 transition-colors truncate">
                {signal.title}
              </p>
              <p className="text-slate-500 text-[10px] truncate">{signal.detail}</p>
            </div>
            <span className="text-slate-600 text-[9px] shrink-0">{signal.time}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
