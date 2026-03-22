'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const RECENT_UPDATES = [
  {
    version: 'v2.8',
    date: 'Mar 22, 2026',
    title: 'Space Tycoon: Dynamic Market Pricing & Speed Boosts',
    description: 'Multiplayer service pricing based on global supply. Speed boosts earned from contracts. Research bonuses now impact gameplay.',
    href: '/space-tycoon',
    type: 'feature' as const,
    icon: '🎮',
  },
  {
    version: 'v2.7',
    date: 'Mar 21, 2026',
    title: 'Bloomberg-Style Data Ticker & Live Badges',
    description: 'Industry metrics ticker bar, LIVE/PRO badges on all modules, sparkline charts on market overview, terminal-style data cards.',
    href: '/features',
    type: 'feature' as const,
    icon: '📊',
  },
  {
    version: 'v2.6',
    date: 'Mar 2026',
    title: '50 New Blog Articles + AI-Powered Copilot',
    description: 'Deep-dive analysis on orbital servicing, electric propulsion, space debris removal, nuclear propulsion, ITAR compliance, and more.',
    href: '/blog',
    type: 'content' as const,
    icon: '📝',
  },
  {
    version: 'v2.5',
    date: 'Feb 2026',
    title: '200+ Company Intelligence Profiles',
    description: 'Deep-dive profiles covering financials, satellite assets, facility locations, and competitive scoring for top space companies.',
    href: '/company-profiles',
    type: 'expansion' as const,
    icon: '🏢',
  },
  {
    version: 'v2.4',
    date: 'Feb 2026',
    title: 'Space Marketplace with 80+ Listings',
    description: 'Browse verified service providers, submit RFQs, and discover teaming opportunities across the space supply chain.',
    href: '/marketplace',
    type: 'feature' as const,
    icon: '🛒',
  },
];

const TYPE_STYLES = {
  feature: { label: 'Feature', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  content: { label: 'Content', class: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  expansion: { label: 'Expanded', class: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  fix: { label: 'Fix', class: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export default function RecentUpdates() {
  return (
    <section className="py-16 md:py-24 relative z-10">
      <div className="container mx-auto px-4">
        {/* Terminal-style header */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-violet-400 to-violet-600" />
              <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                Changelog
              </h2>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600 font-medium">
              Latest releases
            </span>
          </div>
          <p className="text-sm text-slate-500 ml-4">
            Recent platform updates, features, and content additions
          </p>
        </div>

        {/* Changelog timeline */}
        <div className="max-w-3xl mx-auto relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-transparent hidden md:block" />

          <div className="space-y-3">
            {RECENT_UPDATES.map((update, i) => {
              const typeStyle = TYPE_STYLES[update.type];
              return (
                <motion.div
                  key={update.title}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  custom={i}
                >
                  <Link
                    href={update.href}
                    className="group card-glass p-4 flex items-start gap-4 relative"
                  >
                    {/* Timeline dot */}
                    <div className="hidden md:flex w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] items-center justify-center flex-shrink-0 group-hover:border-white/[0.12] transition-colors">
                      <span className="text-lg">{update.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold font-mono text-slate-500">{update.version}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeStyle.class}`}>
                          {typeStyle.label}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">{update.date}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors mb-0.5">
                        {update.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {update.description}
                      </p>
                    </div>

                    <svg
                      className="w-4 h-4 text-slate-700 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 mt-2"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* View full changelog link */}
          <div className="text-center mt-6">
            <Link
              href="/changelog"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
            >
              View full changelog
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
