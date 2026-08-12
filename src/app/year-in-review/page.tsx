'use client';

import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { SITE_STATS } from '@/lib/site-stats';

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
  {
    date: 'April 2026',
    title: 'Artemis II Live Coverage',
    description:
      'Wall-to-wall coverage of the first crewed lunar flyby since Apollo: livestream embeds at the top of the site, a running live blog through launch and splashdown, and a permanent mission archive after the crew returned home on April 10.',
    icon: '\u{1F315}',
    color: 'from-slate-400 to-indigo-500',
  },
  {
    date: 'August 2026',
    title: 'One Simple Pro Plan',
    description:
      'The Enterprise tier was retired and every paywalled module — AI reports, compliance suite, patents, procurement, API access, custom dashboards, webhooks — now unlocks with a single Professional plan. Recruitment pages became fully public.',
    icon: '\u{1F511}',
    color: 'from-emerald-500 to-cyan-500',
  },
  {
    date: 'August 2026',
    title: 'Navigation Overhaul & Live Satellite Tracker',
    description:
      'A full information-architecture audit collapsed ~50 duplicate pages into dense survivors with 72 verified redirects, rebuilt the navigation from 174 links to 42 curated ones, and promoted the live CelesTrak-powered satellite tracker (10,000+ objects, 30-second refresh) to the main /satellites page.',
    icon: '\u{1F6F0}',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    date: 'August 2026',
    title: 'Real Jobs Board: 6,300+ ATS-Synced Listings',
    description:
      'The jobs board switched to live hiring data: daily syncs from 16 verified company ATS boards (SpaceX, Anduril, Rocket Lab, Planet, Vast, Stoke, and more) via Greenhouse, Lever, and Ashby APIs — 6,300+ real listings on the first production sync, with expired postings automatically retired.',
    icon: '\u{1F4BC}',
    color: 'from-amber-500 to-orange-500',
  },
  {
    date: 'August 2026',
    title: 'Weekly Data Brief, Real Status Monitoring & OAuth',
    description:
      'The State of the Space Economy brief now auto-publishes every Monday from our own tracked data. The /status page became genuine live monitoring of database and cron-fleet health, and Google and Microsoft OAuth sign-in shipped alongside major page-weight reductions.',
    icon: '\u{1F4C8}',
    color: 'from-purple-500 to-pink-500',
  },
];

const GROWTH_STATS: GrowthStat[] = [
  {
    label: 'Original Articles',
    value: SITE_STATS.articles,
    subtext: 'Blog posts & published insights',
    color: 'border-blue-500/30 bg-blue-500/5',
  },
  {
    label: 'Pages & Tools',
    value: SITE_STATS.pagesAndTools,
    subtext: 'Distinct platform routes',
    color: 'border-purple-500/30 bg-purple-500/5',
  },
  {
    label: 'Company Profiles',
    value: SITE_STATS.companies,
    subtext: 'With financials & SpaceNexus Score',
    color: 'border-amber-500/30 bg-amber-500/5',
  },
  {
    label: 'ATS-Synced Jobs',
    value: '6,300+',
    subtext: 'Live listings from 16 company boards',
    color: 'border-emerald-500/30 bg-emerald-500/5',
  },
  {
    label: 'Data Sources',
    value: SITE_STATS.dataSources,
    subtext: 'RSS, APIs & content feeds',
    color: 'border-red-500/30 bg-red-500/5',
  },
  {
    label: 'Satellites Tracked',
    value: SITE_STATS.satellites,
    subtext: 'Live CelesTrak TLE data',
    color: 'border-cyan-500/30 bg-cyan-500/5',
  },
  {
    label: 'Automated Feeds',
    value: SITE_STATS.automatedFeeds,
    subtext: 'Scheduled data-refresh jobs',
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
    title: 'AI Insights & Weekly Data Brief',
    description:
      'Shipped: the AI Insights hub publishes editorial analysis grounded in our tracked news, and the State of the Space Economy data brief — built entirely from platform data — now goes out every Monday.',
    icon: '\u{1F9E0}',
    eta: 'Shipped \u{2014} 2026',
  },
  {
    title: 'Developer API',
    description:
      'Shipped: structured space-industry data via authenticated v1 API endpoints with API keys and a developer portal — now included with the single Professional plan.',
    icon: '\u{1F310}',
    eta: 'Shipped \u{2014} 2026',
  },
  {
    title: 'Mobile Apps',
    description:
      'The installable PWA with offline support is live today. Native iOS and Android apps with push notifications for launches and breaking news remain on the roadmap.',
    icon: '\u{1F4F1}',
    eta: '2027',
  },
  {
    title: 'Real-Time Collaboration',
    description:
      'Shared workspaces, team dashboards, and collaborative deal rooms for analysts, investors, and engineering teams working together on space projects.',
    icon: '\u{1F91D}',
    eta: '2027',
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
            From a blank repository in February to a comprehensive space intelligence platform
            by August: {SITE_STATS.articles} original articles, {SITE_STATS.pagesAndTools} pages
            and tools, a live satellite tracker, a real jobs board with 6,300+ listings, and a
            weekly data brief — built in public, one wave at a time.
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

        <RelatedModules modules={PAGE_RELATIONS['year-in-review']} />
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
            since February 2026 — audited August 2026 and rounded down to what we can defend.
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
          A roadmap check-in: what we promised in the spring, what has shipped since,
          and what comes next.
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
            account and get access to {SITE_STATS.pagesAndTools} pages of data, tools,
            and content today.
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
          reflect production data as of August 2026.
        </p>
      </div>
    </div>
  );
}
