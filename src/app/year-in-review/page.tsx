'use client';

import Link from 'next/link';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface Milestone {
  date: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface GrowthStat {
  label: string;
  value: string;
  subtext: string;
  color: string;
}

interface FutureItem {
  title: string;
  description: string;
  icon: string;
  eta: string;
}

// ────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────

const MILESTONES: Milestone[] = [
  {
    date: 'February 2026',
    title: 'Platform Launch',
    description:
      'SpaceNexus launched as the first free, comprehensive space intelligence platform. Company profiles, satellite tracking, launch manifests, market intelligence, and news aggregation went live from day one.',
    icon: '\u{1F680}',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    date: 'March 2026',
    title: '133+ Blog Articles Published',
    description:
      'Original long-form content covering every corner of the space industry: from CubeSats and mega-constellations to space ETFs, ITAR compliance, and career guides. The largest free space content library on the internet.',
    icon: '\u{1F4DD}',
    color: 'from-purple-500 to-pink-500',
  },
  {
    date: 'March 2026',
    title: 'SpaceX API, Podcast Feeds & EONET Integration',
    description:
      'Real-time SpaceX launch and vehicle data, 8 curated podcast feeds from top space industry shows, and NASA Earth Observatory Natural Event Tracker integration for monitoring wildfires, storms, and volcanic activity from orbit.',
    icon: '\u{1F4E1}',
    color: 'from-amber-500 to-orange-500',
  },
  {
    date: 'March 2026',
    title: 'Livestream Detection System',
    description:
      'Automated detection and embedding of live launch coverage from YouTube and X (Twitter). When a rocket is on the pad, SpaceNexus finds the stream and brings it to you in real time.',
    icon: '\u{1F4FA}',
    color: 'from-red-500 to-rose-500',
  },
  {
    date: 'March 2026',
    title: '50+ New Pages & Features',
    description:
      'Community forums, B2B marketplace with RFQ system, developer API portal, engineering calculators (link budget, power budget, radiation, thermal), deal rooms, investment tools, procurement intelligence, and more.',
    icon: '\u{2728}',
    color: 'from-emerald-500 to-teal-500',
  },
];

const GROWTH_STATS: GrowthStat[] = [
  {
    label: 'Blog Articles',
    value: '133+',
    subtext: 'Original long-form content',
    color: 'border-blue-500/30 bg-blue-500/5',
  },
  {
    label: 'Platform Routes',
    value: '600+',
    subtext: 'Pages, APIs & endpoints',
    color: 'border-purple-500/30 bg-purple-500/5',
  },
  {
    label: 'Company Profiles',
    value: '200+',
    subtext: 'With financials & SpaceNexus Score',
    color: 'border-amber-500/30 bg-amber-500/5',
  },
  {
    label: 'Development Waves',
    value: '70+',
    subtext: 'Recursive build iterations',
    color: 'border-emerald-500/30 bg-emerald-500/5',
  },
  {
    label: 'Data Sources',
    value: '26+',
    subtext: 'RSS, APIs & content feeds',
    color: 'border-red-500/30 bg-red-500/5',
  },
  {
    label: 'Glossary Terms',
    value: '69',
    subtext: 'Across 12 categories',
    color: 'border-cyan-500/30 bg-cyan-500/5',
  },
  {
    label: 'Changelog Releases',
    value: '15+',
    subtext: 'Shipped since February',
    color: 'border-pink-500/30 bg-pink-500/5',
  },
  {
    label: 'Podcast Feeds',
    value: '8',
    subtext: 'Curated space industry shows',
    color: 'border-indigo-500/30 bg-indigo-500/5',
  },
];

const WHATS_NEXT: FutureItem[] = [
  {
    title: 'AI-Powered Insights',
    description:
      'Machine-learning models analyzing launch cadence, funding patterns, and regulatory shifts to deliver predictive intelligence you cannot get anywhere else.',
    icon: '\u{1F9E0}',
    eta: 'Q2 2026',
  },
  {
    title: 'Mobile Apps',
    description:
      'Native iOS and Android apps with push notifications for launches, breaking news, and portfolio alerts. Take SpaceNexus everywhere.',
    icon: '\u{1F4F1}',
    eta: 'Q3 2026',
  },
  {
    title: 'API Marketplace',
    description:
      'A commercial API marketplace where developers can access structured space industry data, build integrations, and power their own products with SpaceNexus data.',
    icon: '\u{1F310}',
    eta: 'Q3 2026',
  },
  {
    title: 'Real-Time Collaboration',
    description:
      'Shared workspaces, team dashboards, and collaborative deal rooms for analysts, investors, and engineering teams working together on space projects.',
    icon: '\u{1F91D}',
    eta: 'Q4 2026',
  },
];

// ────────────────────────────────────────────────────────────────
// Page Component
// ────────────────────────────────────────────────────────────────

export default function YearInReviewPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/30 via-black to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-4 pt-24 pb-16 text-center">
          <p className="text-sm uppercase tracking-widest text-indigo-400 mb-4">
            A Look Back at Everything We Built
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            SpaceNexus 2026: Year in Review
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            From a blank repository to the most comprehensive free space intelligence platform
            on the internet. 70+ waves of recursive development, 133 original articles,
            600+ routes, and a community of space professionals.
          </p>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Platform Milestones
        </h2>
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/60 via-purple-500/40 to-transparent" />

          {MILESTONES.map((m, i) => {
            const isLeft = i % 2 === 0;
            return (
              <div
                key={m.title}
                className={`relative flex flex-col sm:flex-row items-start sm:items-center mb-12 ${
                  isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'
                }`}
              >
                {/* dot */}
                <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-black z-10" />

                {/* card */}
                <div
                  className={`ml-14 sm:ml-0 sm:w-[45%] ${
                    isLeft ? 'sm:pr-12 sm:text-right' : 'sm:pl-12 sm:text-left'
                  }`}
                >
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                    {m.date}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-2">
                    <span className="mr-2">{m.icon}</span>
                    {m.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Growth Stats ─────────────────────────────────────── */}
      <section className="bg-slate-950 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">
            Platform Growth
          </h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-12">
            Every number below represents real, shipped product built from scratch
            across 70+ development waves since February 2026.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GROWTH_STATS.map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border p-6 text-center ${s.color}`}
              >
                <p className="text-3xl sm:text-4xl font-black text-white mb-1">
                  {s.value}
                </p>
                <p className="text-sm font-semibold text-white/90 mb-1">
                  {s.label}
                </p>
                <p className="text-xs text-slate-400">{s.subtext}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What&apos;s Next ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">
          What&apos;s Next
        </h2>
        <p className="text-slate-400 text-center max-w-2xl mx-auto mb-12">
          The foundation is built. Now we push into intelligence, mobile, and ecosystem.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {WHATS_NEXT.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-indigo-500/40 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {item.title}
                  </h3>
                  <span className="text-xs text-indigo-400 font-medium">
                    {item.eta}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/40 border-y border-indigo-500/20">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Join the Space Intelligence Revolution
          </h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            SpaceNexus is free to use and built for space professionals. Create your
            account and get access to 600+ pages of data, tools, and content today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
            >
              Create Free Account
            </Link>
            <Link
              href="/changelog"
              className="px-8 py-3 border border-slate-600 hover:border-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              View Full Changelog
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer note ──────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-xs text-slate-500">
          SpaceNexus is independently built and operated. All platform statistics
          reflect production data as of March 2026.
        </p>
      </div>
    </div>
  );
}
