'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Headline {
  title: string;
  category: string;
  date: string;
}

const FALLBACK_HEADLINES: Headline[] = [
  { title: 'SpaceX Starship completes successful orbital test flight', category: 'Launch', date: '2026-02-25' },
  { title: 'NASA selects Blue Origin for Artemis V lunar lander', category: 'Contracts', date: '2026-02-24' },
  { title: 'Rocket Lab announces Neutron first flight target for Q3 2026', category: 'Launch Vehicles', date: '2026-02-24' },
  { title: 'ESA approves funding for Space Rider reusable spacecraft', category: 'Policy', date: '2026-02-23' },
  { title: 'Axiom Space completes Station Module 2 integration', category: 'Stations', date: '2026-02-23' },
  { title: 'India\'s ISRO successfully tests reusable launch vehicle', category: 'Launch', date: '2026-02-22' },
  { title: 'Sierra Space Dream Chaser cleared for ISS cargo mission', category: 'Missions', date: '2026-02-22' },
  { title: 'Relativity Space unveils Terran R with 3D-printed upper stage', category: 'Technology', date: '2026-02-21' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Launch: 'bg-orange-500/20 text-orange-300',
  Contracts: 'bg-emerald-500/20 text-emerald-300',
  'Launch Vehicles': 'bg-blue-500/20 text-blue-300',
  Policy: 'bg-rose-500/20 text-rose-300',
  Stations: 'bg-purple-500/20 text-purple-300',
  Missions: 'bg-white/10 text-slate-200',
  Technology: 'bg-amber-500/20 text-amber-300',
};

export default function NewsTicker() {
  const [headlines, setHeadlines] = useState<Headline[]>(FALLBACK_HEADLINES);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetch('/api/news?limit=10')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.articles?.length) {
          setHeadlines(
            data.articles.slice(0, 10).map((a: { title: string; category: string; publishedAt: string }) => ({
              title: a.title,
              category: a.category || 'Space',
              date: a.publishedAt?.slice(0, 10) || '',
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const items = [...headlines, ...headlines];

  return (
    <div
      className="relative z-10 bg-slate-900/80 border-y border-slate-700/40 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />

      <div
        className="flex whitespace-nowrap py-2.5"
        style={{
          animation: `ticker ${headlines.length * 5}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {items.map((h, i) => (
          <Link key={i} href="/news" className="inline-flex items-center gap-2 px-5 shrink-0 group">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${CATEGORY_COLORS[h.category] || 'bg-slate-700/50 text-slate-400'}`}>
              {h.category}
            </span>
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{h.title}</span>
            <span className="text-slate-600 mx-2">|</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
