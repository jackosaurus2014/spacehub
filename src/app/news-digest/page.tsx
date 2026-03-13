'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import SocialShare from '@/components/ui/SocialShare';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

interface DigestItem {
  headline: string;
  source: string;
  category: 'Launch' | 'Funding' | 'Regulatory' | 'Technology' | 'Defense' | 'Commercial' | 'Science';
  timestamp: string;
  url: string;
  significance: 'high' | 'medium' | 'low';
}

interface DailyDigest {
  date: string;
  label: string;
  items: DigestItem[];
}

const CATEGORY_ICONS: Record<string, string> = {
  Launch: '\uD83D\uDE80',
  Funding: '\uD83D\uDCB0',
  Regulatory: '\u2696\uFE0F',
  Technology: '\uD83D\uDD2C',
  Defense: '\uD83D\uDEE1\uFE0F',
  Commercial: '\uD83C\uDFE2',
  Science: '\uD83C\uDF0C',
};

const CATEGORY_COLORS: Record<string, string> = {
  Launch: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  Funding: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  Regulatory: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  Technology: 'text-slate-300 bg-white/5 border-white/10',
  Defense: 'text-red-400 bg-red-400/10 border-red-400/30',
  Commercial: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  Science: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30',
};

const SIGNIFICANCE_STYLES: Record<string, { badge: string; label: string }> = {
  high: { badge: 'bg-red-500/20 text-red-400 border border-red-500/40', label: 'High' },
  medium: { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/40', label: 'Medium' },
  low: { badge: 'bg-green-500/20 text-green-400 border border-green-500/40', label: 'Low' },
};

const ALL_CATEGORIES = ['Launch', 'Funding', 'Regulatory', 'Technology', 'Defense', 'Commercial', 'Science'] as const;

const DIGESTS: DailyDigest[] = [
  {
    date: '2026-02-25',
    label: 'Today',
    items: [
      {
        headline: 'SpaceX Launches 60 Starlink V3 Satellites on Record 15th Booster Reuse',
        source: 'SpaceNews',
        category: 'Launch',
        timestamp: '08:42 AM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'Astroscale Secures $200M Series F to Scale On-Orbit Servicing Fleet',
        source: 'TechCrunch',
        category: 'Funding',
        timestamp: '09:15 AM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'European Commission Proposes New Framework for Mega-Constellation Licensing',
        source: 'Reuters',
        category: 'Regulatory',
        timestamp: '10:30 AM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'NASA JPL Demonstrates Laser Communication at 400 Gbps from Lunar Orbit',
        source: 'NASA',
        category: 'Technology',
        timestamp: '11:05 AM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'Lockheed Martin Wins $1.2B Contract for Next-Gen Missile Warning Satellites',
        source: 'Defense One',
        category: 'Defense',
        timestamp: '12:20 PM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'Amazon Kuiper Begins Beta Service with 500 Enterprise Customers',
        source: 'Ars Technica',
        category: 'Commercial',
        timestamp: '01:45 PM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'James Webb Space Telescope Detects New Biosignature on K2-18b Exoplanet',
        source: 'NASA',
        category: 'Science',
        timestamp: '02:30 PM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'Rocket Lab Electron Flight 55 Deploys Climate Monitoring Constellation',
        source: 'SpaceNews',
        category: 'Launch',
        timestamp: '03:10 PM',
        url: '#',
        significance: 'low',
      },
      {
        headline: 'Virgin Orbit Successor Stoke Space Completes Nova Full-Flow Engine Test',
        source: 'Ars Technica',
        category: 'Technology',
        timestamp: '04:00 PM',
        url: '#',
        significance: 'medium',
      },
    ],
  },
  {
    date: '2026-02-24',
    label: 'Yesterday',
    items: [
      {
        headline: 'Blue Origin New Glenn Completes Second Orbital Flight with Payload Delivery',
        source: 'SpaceNews',
        category: 'Launch',
        timestamp: '07:30 AM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'Relativity Space Raises $350M for Terran R Fully Reusable Rocket Development',
        source: 'CNBC',
        category: 'Funding',
        timestamp: '08:50 AM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'FCC Opens Public Comment Period on 28 GHz Band Sharing Rules',
        source: 'Reuters',
        category: 'Regulatory',
        timestamp: '09:40 AM',
        url: '#',
        significance: 'low',
      },
      {
        headline: 'MIT Lincoln Lab Demonstrates AI-Driven Autonomous Collision Avoidance System',
        source: 'SpaceNews',
        category: 'Technology',
        timestamp: '10:15 AM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'Space Force Awards $800M Contract for Responsive Launch Capability',
        source: 'Defense One',
        category: 'Defense',
        timestamp: '11:30 AM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'Viasat and Inmarsat Integration Complete, Forming Largest GEO Broadband Fleet',
        source: 'Reuters',
        category: 'Commercial',
        timestamp: '12:45 PM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'ESA Selects Two Missions for Cosmic Vision L-Class: Ice Giant Orbiter and Gravitational Wave Observatory',
        source: 'ESA',
        category: 'Science',
        timestamp: '01:20 PM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'India ISRO GSLV Mk III Launches GSAT-25 Communications Satellite',
        source: 'SpaceNews',
        category: 'Launch',
        timestamp: '02:55 PM',
        url: '#',
        significance: 'low',
      },
      {
        headline: 'Planet Labs Wins Contract to Provide Daily Monitoring of Arctic Shipping Routes',
        source: 'TechCrunch',
        category: 'Commercial',
        timestamp: '03:40 PM',
        url: '#',
        significance: 'low',
      },
      {
        headline: 'Northrop Grumman MEV-3 Successfully Docks with Aging Intelsat Satellite',
        source: 'Ars Technica',
        category: 'Technology',
        timestamp: '04:25 PM',
        url: '#',
        significance: 'medium',
      },
    ],
  },
  {
    date: '2026-02-23',
    label: '2 Days Ago',
    items: [
      {
        headline: 'China Long March 9 Heavy-Lift Rocket Completes Critical Design Review',
        source: 'SpaceNews',
        category: 'Launch',
        timestamp: '06:15 AM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'Starfish Space Raises $75M Series B for Satellite Life Extension Services',
        source: 'TechCrunch',
        category: 'Funding',
        timestamp: '08:00 AM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'U.S. Senate Committee Advances Space Sustainability Act with Bipartisan Support',
        source: 'Reuters',
        category: 'Regulatory',
        timestamp: '09:30 AM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'Sierra Space Dream Chaser Completes Third ISS Cargo Resupply Mission',
        source: 'NASA',
        category: 'Commercial',
        timestamp: '10:45 AM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'DARPA Awards Phase 2 Contracts for On-Orbit Manufacturing Program',
        source: 'Defense One',
        category: 'Defense',
        timestamp: '11:20 AM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'JAXA Hayabusa3 Mission Selected: Sample Return from Comet 107P/Wilson-Harrington',
        source: 'Ars Technica',
        category: 'Science',
        timestamp: '12:00 PM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'SpaceX Files FCC Application for Starlink Direct-to-Cell 5G Service',
        source: 'SpaceNews',
        category: 'Technology',
        timestamp: '01:30 PM',
        url: '#',
        significance: 'medium',
      },
      {
        headline: 'Axiom Space Closes $500M in Revenue-Backed Financing for Station Module 2',
        source: 'CNBC',
        category: 'Funding',
        timestamp: '02:15 PM',
        url: '#',
        significance: 'high',
      },
      {
        headline: 'ClearSpace Partners with ESA on Active Debris Removal Demonstration Mission',
        source: 'ESA',
        category: 'Science',
        timestamp: '03:45 PM',
        url: '#',
        significance: 'low',
      },
    ],
  },
];

export default function NewsDigestPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSignificance, setSelectedSignificance] = useState<string>('All');

  const filterItems = (items: DigestItem[]): DigestItem[] => {
    return items.filter((item) => {
      const catMatch = selectedCategory === 'All' || item.category === selectedCategory;
      const sigMatch = selectedSignificance === 'All' || item.significance === selectedSignificance;
      return catMatch && sigMatch;
    });
  };

  const totalItems = DIGESTS.reduce((sum, d) => sum + d.items.length, 0);
  const filteredTotal = DIGESTS.reduce((sum, d) => sum + filterItems(d.items).length, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <AnimatedPageHeader
              title="Daily Space Digest"
              subtitle="Curated headlines from across the space industry, grouped by category and rated by significance."
              icon={<span className="text-3xl">{'\uD83D\uDCD1'}</span>}
              accentColor="cyan"
            />
          </div>
          <div className="mt-2 flex-shrink-0">
            <SocialShare
              title="Daily Space Digest - SpaceNexus"
              description="Curated headlines from across the space industry, grouped by category and rated by significance."
            />
          </div>
        </div>

        {/* Filters */}
        <ScrollReveal delay={0.1}>
          <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Category Filter */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedCategory === 'All'
                        ? 'bg-white/10 text-slate-300 border-white/15'
                        : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    All
                  </button>
                  {ALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedCategory === cat
                          ? CATEGORY_COLORS[cat]
                          : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {CATEGORY_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Significance Filter */}
              <div className="sm:w-56">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Significance
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSignificance('All')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedSignificance === 'All'
                        ? 'bg-white/10 text-slate-300 border-white/15'
                        : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    All
                  </button>
                  {(['high', 'medium', 'low'] as const).map((sig) => (
                    <button
                      key={sig}
                      onClick={() => setSelectedSignificance(sig)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedSignificance === sig
                          ? SIGNIFICANCE_STYLES[sig].badge
                          : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {SIGNIFICANCE_STYLES[sig].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Result count */}
            <div className="mt-3 text-xs text-slate-500">
              Showing {filteredTotal} of {totalItems} items
              {selectedCategory !== 'All' && (
                <span className="ml-1">in {selectedCategory}</span>
              )}
              {selectedSignificance !== 'All' && (
                <span className="ml-1">({selectedSignificance} significance)</span>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Daily Digest Sections */}
        {DIGESTS.map((digest, dayIndex) => {
          const filtered = filterItems(digest.items);
          if (filtered.length === 0) return null;

          return (
            <ScrollReveal key={digest.date} delay={0.15 * (dayIndex + 1)}>
              <section className="mt-8">
                {/* Day Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{digest.label}</span>
                    <span className="text-sm text-slate-500">{digest.date}</span>
                  </div>
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded-full border border-slate-800">
                    {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Headlines List */}
                <div className="space-y-2">
                  {filtered.map((item, idx) => (
                    <a
                      key={`${digest.date}-${idx}`}
                      href={item.url}
                      className="group flex items-start gap-3 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 hover:border-slate-700 rounded-lg px-4 py-3 transition-all duration-200"
                    >
                      {/* Category Icon */}
                      <span className="text-base mt-0.5 flex-shrink-0" title={item.category}>
                        {CATEGORY_ICONS[item.category]}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors leading-snug">
                            {item.headline}
                          </h3>
                          <span
                            className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${SIGNIFICANCE_STYLES[item.significance].badge}`}
                          >
                            {SIGNIFICANCE_STYLES[item.significance].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_COLORS[item.category]}`}>
                            {item.category}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.source}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.timestamp}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg
                        className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors mt-1 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))}
                </div>
              </section>
            </ScrollReveal>
          );
        })}

        {/* Empty State */}
        {filteredTotal === 0 && (
          <div className="mt-12 text-center py-16">
            <div className="text-4xl mb-3">{'\uD83D\uDD0D'}</div>
            <p className="text-slate-400 text-lg">No headlines match your filters.</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting the category or significance filter.</p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedSignificance('All');
              }}
              className="mt-4 px-4 py-2 text-sm bg-white/5 text-slate-300 border border-white/10 rounded-lg hover:bg-slate-100/20 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Summary Stats */}
        <ScrollReveal delay={0.3}>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Headlines',
                value: totalItems,
                color: 'text-slate-300',
              },
              {
                label: 'High Significance',
                value: DIGESTS.reduce(
                  (sum, d) => sum + d.items.filter((i) => i.significance === 'high').length,
                  0
                ),
                color: 'text-red-400',
              },
              {
                label: 'Categories Covered',
                value: new Set(DIGESTS.flatMap((d) => d.items.map((i) => i.category))).size,
                color: 'text-purple-400',
              },
              {
                label: 'Sources',
                value: new Set(DIGESTS.flatMap((d) => d.items.map((i) => i.source))).size,
                color: 'text-emerald-400',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center"
              >
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Related Links */}
        <ScrollReveal delay={0.35}>
          <div className="mt-10 bg-slate-900/40 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Related Resources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  href: '/news',
                  title: 'Full News Feed',
                  desc: 'Browse all space industry articles',
                  icon: '\uD83D\uDCF0',
                },
                {
                  href: '/intelligence-brief',
                  title: 'Intelligence Brief',
                  desc: 'Weekly editorial analysis and insights',
                  icon: '\uD83D\uDCCB',
                },
                {
                  href: '/ai-insights',
                  title: 'AI Insights',
                  desc: 'Machine-generated trend analysis',
                  icon: '\uD83E\uDD16',
                },
                {
                  href: '/blogs',
                  title: 'Blogs & Articles',
                  desc: 'In-depth commentary and opinion',
                  icon: '\u270D\uFE0F',
                },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-start gap-3 p-3 rounded-lg border border-slate-800/60 hover:border-white/10 hover:bg-slate-100/5 transition-all duration-200"
                >
                  <span className="text-xl">{link.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                      {link.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{link.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer Note */}
        <ScrollReveal delay={0.4}>
          <div className="mt-8 mb-12 text-center">
            <p className="text-xs text-slate-500">
              Digest updated daily. Headlines sourced from SpaceNews, Ars Technica, Reuters, NASA, ESA, Defense One, CNBC, and TechCrunch.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Significance ratings reflect potential industry impact as assessed by SpaceNexus analysts.
            </p>
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['news-digest']} />
      </div>
    </div>
  );
}