'use client';

import Link from 'next/link';

// The two "how is this company doing" surfaces used to be separate pages
// (/report-cards and /space-score). They now share one URL with a view
// switch: analyst report cards (curated, quarterly) and the Space Score
// leaderboard (computed, 0-1000). Roadmap 2026-09 consolidation.
export default function GradeViewSwitch({ active }: { active: 'cards' | 'score' }) {
  const base = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors';
  const on = 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30';
  const off = 'text-slate-400 hover:text-white border border-transparent';
  return (
    <nav aria-label="Grade view" className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
      <Link href="/report-cards" className={`${base} ${active === 'cards' ? on : off}`} aria-current={active === 'cards' ? 'page' : undefined}>Report cards</Link>
      <Link href="/report-cards?view=score" className={`${base} ${active === 'score' ? on : off}`} aria-current={active === 'score' ? 'page' : undefined}>Space Score</Link>
    </nav>
  );
}
