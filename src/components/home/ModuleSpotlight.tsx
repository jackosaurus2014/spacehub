'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Founder request (2026-09-01): "a rotating floater on the landing page that
// rotates between our favorite modules — start with the startup & pre-IPO
// intelligence tracker." Implemented as an in-flow Spotlight console rather
// than a floating overlay: the homepage redesign culled overlays for banner
// blindness, and a spotlight only works if it reads as content, not chrome.
// Auto-rotates every 9s, pauses on hover/focus, and under reduced motion
// never auto-advances (dots + arrows only).
interface SpotlightItem {
  href: string;
  kicker: string;
  title: string;
  tagline: string;
  cta: string;
  icon: string;
}

const SPOTLIGHT_ITEMS: SpotlightItem[] = [
  {
    href: '/startups',
    kicker: 'Investor intelligence',
    title: 'Startup & Pre-IPO Tracker',
    tagline: 'The private space company watchlist: 250+ companies, verified rounds, valuations and the IPO pipeline — updated as deals close.',
    cta: 'Open the tracker',
    icon: '🦄',
  },
  {
    href: '/hiring-trends',
    kicker: 'Market signal',
    title: 'Hiring Trends',
    tagline: 'Who is actually growing: 8,000+ live postings snapshotted daily, week-over-week velocity by company.',
    cta: 'See who is hiring',
    icon: '📈',
  },
  {
    href: '/procurement',
    kicker: 'Business development',
    title: 'Contracts & Opportunities',
    tagline: 'Federal solicitations, grants and SBIR topics for space and space-adjacent work — synced from SAM.gov and Grants.gov.',
    cta: 'Find opportunities',
    icon: '📋',
  },
  {
    href: '/company-profiles',
    kicker: 'The terminal',
    title: 'Company Screener',
    tagline: 'Every tracked company with revenue, contracts, hiring and funding side by side — sortable like a terminal, free like a wiki.',
    cta: 'Screen companies',
    icon: '🛰️',
  },
  {
    href: '/regulatory-radar',
    kicker: 'Compliance',
    title: 'Regulatory Radar',
    tagline: 'Live rules, enforcement actions and comment deadlines from FAA, FCC and Commerce — before they bite.',
    cta: 'Scan the radar',
    icon: '📡',
  },
];

const ROTATE_MS = 9_000;

export default function ModuleSpotlight() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SPOTLIGHT_ITEMS.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [reduced, paused]);

  const item = SPOTLIGHT_ITEMS[index];

  return (
    <section
      aria-label="Module spotlight"
      className="rounded-[var(--radius-console,12px)] border border-[var(--line,rgba(255,255,255,0.08))] bg-[rgba(19,17,16,.85)] p-4 sm:p-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3,#8a8580)]">Spotlight · {item.kicker}</span>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Spotlight modules">
          {SPOTLIGHT_ITEMS.map((s, i) => (
            <button
              key={s.href}
              role="tab"
              aria-selected={i === index}
              aria-label={s.title}
              onClick={() => setIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${i === index ? 'bg-[var(--ember,#FF7A18)]' : 'bg-white/15 hover:bg-white/30'}`}
            />
          ))}
        </div>
      </div>
      <Link href={item.href} className="group block">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-3xl leading-none mt-0.5">{item.icon}</span>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-lg group-hover:text-[var(--ember,#FF7A18)] transition-colors">{item.title}</h2>
            <p className="text-white/60 text-sm mt-0.5">{item.tagline}</p>
            <span className="inline-block mt-2 text-sm text-[var(--ember,#FF7A18)] group-hover:underline">{item.cta} →</span>
          </div>
        </div>
      </Link>
    </section>
  );
}
