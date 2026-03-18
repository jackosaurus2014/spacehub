'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

interface ResourceItem { name: string; href: string; description: string }
interface ResourceCategory { name: string; icon: string; description: string; items: ResourceItem[] }

const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    name: 'Intelligence & Analysis',
    icon: '\uD83D\uDD0D',
    description: 'Market data, company intelligence, and AI-powered insights',
    items: [
      { name: 'Company Profiles', href: '/company-profiles', description: '200+ space company profiles with financials' },
      { name: 'Market Intelligence', href: '/market-intel', description: 'Real-time space market data and trends' },
      { name: 'Industry Trends', href: '/industry-trends', description: 'Emerging trends and analysis' },
      { name: 'Market Sizing', href: '/market-sizing', description: 'TAM/SAM/SOM analysis for space sectors' },
      { name: 'AI Research Assistant', href: '/company-research', description: 'AI-powered company analysis' },
      { name: 'Intelligence Briefs', href: '/intelligence-brief', description: 'Weekly intelligence summaries' },
    ],
  },
  {
    name: 'Mission Planning Tools',
    icon: '\uD83D\uDE80',
    description: 'Calculators, simulators, and planning utilities',
    items: [
      { name: 'Launch Cost Calculator', href: '/launch-cost-calculator', description: 'Estimate launch costs by vehicle' },
      { name: 'Orbital Calculator', href: '/orbital-calculator', description: 'Delta-V and transfer orbit calculations' },
      { name: 'Link Budget Calculator', href: '/link-budget-calculator', description: 'Satellite communications link analysis' },
      { name: 'Power Budget Calculator', href: '/power-budget-calculator', description: 'Spacecraft power system sizing' },
      { name: 'Constellation Designer', href: '/constellation-designer', description: 'Design satellite constellations' },
      { name: 'Insurance Calculator', href: '/space-insurance', description: 'Estimate space insurance premiums' },
    ],
  },
  {
    name: 'Space Operations',
    icon: '\uD83D\uDCE1',
    description: 'Real-time tracking and monitoring',
    items: [
      { name: 'Satellite Tracker', href: '/satellites', description: '19,000+ tracked objects' },
      { name: 'Space Weather', href: '/space-weather', description: 'Solar activity and geomagnetic conditions' },
      { name: 'Debris Tracker', href: '/debris-tracker', description: 'Orbital debris monitoring' },
      { name: 'Launch Schedule', href: '/launch', description: 'Upcoming launches worldwide' },
      { name: 'Ground Stations', href: '/ground-stations', description: 'Global ground station network' },
      { name: 'Space Stations', href: '/space-stations', description: 'ISS and commercial stations' },
    ],
  },
  {
    name: 'Business & Investment',
    icon: '\uD83D\uDCBC',
    description: 'Deals, procurement, and marketplace',
    items: [
      { name: 'Marketplace', href: '/marketplace', description: 'Space industry B2B marketplace' },
      { name: 'Deal Flow', href: '/deal-flow', description: 'Investment and acquisition database' },
      { name: 'Contract Awards', href: '/contract-awards', description: 'Government contract feed' },
      { name: 'Procurement', href: '/procurement', description: 'Government opportunities' },
      { name: 'Funding Tracker', href: '/funding-tracker', description: 'Space venture capital tracking' },
      { name: 'Unit Economics', href: '/unit-economics', description: 'Revenue modeling calculator' },
    ],
  },
  {
    name: 'Learning & Reference',
    icon: '\uD83D\uDCDA',
    description: 'Educational content and references',
    items: [
      { name: 'Glossary', href: '/glossary', description: 'Space industry terminology' },
      { name: 'Timeline', href: '/timeline', description: 'Space exploration history' },
      { name: 'Space Law', href: '/space-law', description: 'Treaties and legal framework' },
      { name: 'Podcasts', href: '/podcasts', description: 'Space industry podcast directory' },
      { name: 'Blog', href: '/blog', description: 'Analysis and commentary' },
      { name: 'Guides', href: '/guide', description: 'In-depth industry guides' },
      { name: 'Help Center', href: '/help', description: 'FAQs and support resources' },
    ],
  },
  {
    name: 'Community',
    icon: '\uD83E\uDD1D',
    description: 'Connect with space professionals',
    items: [
      { name: 'Forums', href: '/community/forums', description: 'Discussion boards' },
      { name: 'Space Talent', href: '/space-talent', description: 'Jobs and workforce data' },
      { name: 'Salary Benchmarks', href: '/salary-benchmarks', description: 'Industry compensation data' },
      { name: 'Executive Moves', href: '/executive-moves', description: 'C-suite changes tracker' },
    ],
  },
];

const ALL_ITEMS = RESOURCE_CATEGORIES.flatMap((c) =>
  c.items.map((item) => ({ ...item, category: c.name }))
);

export default function ResourcesPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return null;
    return ALL_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AnimatedPageHeader
          title="Platform Resources"
          subtitle="Every tool, tracker, calculator, and dataset on SpaceNexus in one place."
          breadcrumb="Resources"
          accentColor="cyan"
        />

        {/* Search */}
        <div className="relative max-w-xl mb-10">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search all resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white/[0.05] border border-white/[0.08] rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search results mode */}
        {filtered !== null ? (
          <div>
            <p className="text-sm text-slate-400 mb-6">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;</p>
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-center py-16">No matching resources found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((item) => (
                  <Link key={item.href} href={item.href} className="group block bg-black/60 border border-white/[0.06] rounded-xl p-5 hover:border-white/15 hover:bg-black/80 transition-all hover:shadow-lg hover:shadow-black/20">
                    <h3 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors">{item.name}</h3>
                    <p className="text-xs text-slate-300/70 mt-0.5">{item.category}</p>
                    <p className="text-sm text-slate-400 mt-2 line-clamp-2">{item.description}</p>
                  </Link>
                ))}
              

        <RelatedModules modules={PAGE_RELATIONS['resources']} />
      </div>
            )}
          </div>
        ) : (
          /* Category sections */
          <div className="space-y-14">
            {RESOURCE_CATEGORIES.map((category, ci) => (
              <ScrollReveal key={category.name} delay={ci * 0.05}>
                <section>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{category.icon}</span>
                    <h2 className="text-xl font-bold text-slate-100">{category.name}</h2>
                    <span className="ml-auto text-xs text-slate-500">{category.items.length} tools</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-5 ml-10">{category.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <Link key={item.href} href={item.href} className="group block bg-black/60 border border-white/[0.06] rounded-xl p-5 hover:border-white/15 hover:bg-black/80 transition-all hover:shadow-lg hover:shadow-black/20">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors">{item.name}</h3>
                          <svg className="w-4 h-4 text-slate-600 group-hover:text-white transition-all group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
