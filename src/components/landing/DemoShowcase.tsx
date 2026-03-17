'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  "See SpaceNexus in Action" — Tabbed demo showcase                  */
/* ------------------------------------------------------------------ */

const TABS = [
  {
    id: 'satellites',
    label: 'Satellite Tracking',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    id: 'market',
    label: 'Market Intelligence',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'companies',
    label: 'Company Profiles',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ------------------------------------------------------------------ */
/*  Mock screenshot cards                                               */
/* ------------------------------------------------------------------ */

function SatelliteCard() {
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Satellite Tracker</div>
            <div className="text-xs text-slate-500">Live orbital data</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-xs font-medium text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          Real-time
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <div className="text-xl font-semibold font-mono text-white">10,847</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Active Satellites</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <div className="text-xl font-semibold font-mono text-white">4,291</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">LEO Objects</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <div className="text-xl font-semibold font-mono text-white">563</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">GEO Objects</div>
        </div>
      </div>

      {/* Orbit type breakdown */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">LEO</span>
          <span className="text-slate-500 font-mono">62%</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: '62%' }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">MEO</span>
          <span className="text-slate-500 font-mono">18%</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full" style={{ width: '18%' }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">GEO</span>
          <span className="text-slate-500 font-mono">12%</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: '12%' }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">HEO / Other</span>
          <span className="text-slate-500 font-mono">8%</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '8%' }} />
        </div>
      </div>

      {/* Recent satellites */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Recently Launched</div>
        {[
          { name: 'Starlink-6341', operator: 'SpaceX', orbit: 'LEO', date: '2 hours ago' },
          { name: 'OneWeb-634', operator: 'OneWeb', orbit: 'LEO', date: '1 day ago' },
          { name: 'GOES-19', operator: 'NOAA', orbit: 'GEO', date: '3 days ago' },
        ].map((sat) => (
          <div key={sat.name} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2">
            <div>
              <div className="text-sm text-white font-medium">{sat.name}</div>
              <div className="text-[10px] text-slate-500">{sat.operator}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{sat.orbit}</span>
              <div className="text-[10px] text-slate-600 mt-0.5">{sat.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketCard() {
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Market Intelligence</div>
            <div className="text-xs text-slate-500">Space sector overview</div>
          </div>
        </div>
        <span className="text-xs text-slate-500 font-mono">Mar 17, 2026</span>
      </div>

      {/* Ticker grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { symbol: 'RKLB', name: 'Rocket Lab', price: '$32.47', change: '+4.2%', up: true },
          { symbol: 'ASTS', name: 'AST SpaceMob', price: '$28.91', change: '+2.8%', up: true },
          { symbol: 'LUNR', name: 'Intuitive Mach', price: '$14.63', change: '-1.3%', up: false },
          { symbol: 'PL', name: 'Planet Labs', price: '$5.82', change: '+0.9%', up: true },
        ].map((ticker) => (
          <div key={ticker.symbol} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white font-mono">{ticker.symbol}</span>
              <span className={`text-[10px] font-semibold ${ticker.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {ticker.up ? '\u2191' : '\u2193'} {ticker.change}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mb-1">{ticker.name}</div>
            <div className="text-sm font-semibold text-white font-mono">{ticker.price}</div>
          </div>
        ))}
      </div>

      {/* Sector breakdown */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Sector Breakdown</div>
        <div className="space-y-2.5">
          {[
            { sector: 'Launch Services', pct: 34, color: 'bg-blue-500' },
            { sector: 'Satellite Manufacturing', pct: 26, color: 'bg-violet-500' },
            { sector: 'Ground Systems', pct: 18, color: 'bg-emerald-500' },
            { sector: 'Space Data & Analytics', pct: 14, color: 'bg-amber-500' },
            { sector: 'In-Space Services', pct: 8, color: 'bg-rose-500' },
          ].map((s) => (
            <div key={s.sector}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">{s.sector}</span>
                <span className="text-slate-500 font-mono">{s.pct}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funding highlight */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">Q1 2026 Funding</div>
          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">+18% YoY</span>
        </div>
        <div className="text-xl font-semibold font-mono text-white mt-1">$4.7B</div>
      </div>
    </div>
  );
}

function CompanyCard() {
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Company Profiles</div>
            <div className="text-xs text-slate-500">101+ space companies</div>
          </div>
        </div>
      </div>

      {/* Featured company */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-base font-semibold text-white">Rocket Lab USA</div>
            <div className="text-xs text-slate-500">NASDAQ: RKLB</div>
          </div>
          <span className="text-[10px] font-medium text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/25">Public</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Founded</div>
            <div className="text-sm font-semibold text-white">2006</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Employees</div>
            <div className="text-sm font-semibold text-white">2,000+</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Funding</div>
            <div className="text-sm font-semibold text-white">$788M</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['Launch', 'Spacecraft', 'Components'].map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-400">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Company list */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Trending Companies</div>
        {[
          { name: 'SpaceX', sector: 'Launch / Satellites', employees: '13,000+', score: 98 },
          { name: 'Relativity Space', sector: 'Launch Services', employees: '1,100+', score: 84 },
          { name: 'Astra Space', sector: 'Launch / Space Prod.', employees: '350+', score: 67 },
        ].map((co) => (
          <div key={co.name} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2.5">
            <div>
              <div className="text-sm text-white font-medium">{co.name}</div>
              <div className="text-[10px] text-slate-500">{co.sector}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-slate-500">{co.employees}</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <span className="text-xs font-bold text-white font-mono">{co.score}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA inline */}
      <div className="text-center pt-1">
        <span className="text-xs text-slate-500">Browse all 101+ company profiles</span>
      </div>
    </div>
  );
}

const CARD_MAP: Record<TabId, React.ReactNode> = {
  satellites: <SatelliteCard />,
  market: <MarketCard />,
  companies: <CompanyCard />,
};

export default function DemoShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>('satellites');

  return (
    <section className="py-16 md:py-24 relative z-10">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-display text-3xl md:text-4xl text-white mb-3">
            See SpaceNexus in Action
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Explore how professionals use SpaceNexus to track, analyze, and make decisions
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-smooth ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-lg shadow-white/[0.08]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Screenshot area */}
        <div className="relative">
          {/* Ambient glow behind the card */}
          <div className="absolute inset-0 -inset-x-8 -inset-y-8 bg-gradient-to-b from-blue-500/[0.03] via-transparent to-violet-500/[0.03] rounded-3xl blur-2xl pointer-events-none" />

          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            {/* Mock window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-slate-500 font-mono">
                  <svg className="w-3 h-3 text-emerald-500/70" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  spacenexus.us/{activeTab === 'satellites' ? 'satellites' : activeTab === 'market' ? 'market-intel' : 'company-profiles'}
                </div>
              </div>
            </div>

            {/* Card content */}
            <div className="p-5 md:p-8 min-h-[420px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {CARD_MAP[activeTab]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-medium text-sm py-3 px-8 rounded-lg transition-all duration-200 ease-smooth hover:bg-slate-100 hover:shadow-lg hover:shadow-white/[0.05] active:scale-[0.98]"
          >
            Try it free — no credit card required
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
