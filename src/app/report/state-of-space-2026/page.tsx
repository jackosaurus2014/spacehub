import { Metadata } from 'next';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ReportGateForm from '@/components/marketing/ReportGateForm';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'State of the Space Industry 2026 | Free Report | SpaceNexus',
  description: 'Download our comprehensive analysis of the $1.8 trillion space economy. Market sizing, funding trends, launch data, satellite deployments, and forecasts across every segment.',
  openGraph: {
    title: 'State of the Space Industry 2026 | Free Report',
    description: 'Comprehensive analysis of the $1.8 trillion space economy with market sizing, funding trends, and segment forecasts.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'State of the Space Industry 2026 | Free Report',
    description: 'Comprehensive analysis of the $1.8 trillion space economy with market sizing, funding trends, and segment forecasts.',
  },
};

const TABLE_OF_CONTENTS = [
  { chapter: 1, title: 'Executive Summary & Key Findings', pages: '1-6', unlocked: true },
  { chapter: 2, title: 'Global Space Economy Overview: Market Size & Growth', pages: '7-14', unlocked: true },
  { chapter: 3, title: 'Launch Services: Vehicles, Cadence & Cost Trends', pages: '15-22', unlocked: false },
  { chapter: 4, title: 'Satellite Communications & Mega-Constellations', pages: '23-30', unlocked: false },
  { chapter: 5, title: 'Earth Observation & Geospatial Intelligence', pages: '31-36', unlocked: false },
  { chapter: 6, title: 'Space Defense & National Security Spending', pages: '37-42', unlocked: false },
  { chapter: 7, title: 'Venture Capital & Private Investment Analysis', pages: '43-50', unlocked: false },
  { chapter: 8, title: '2026-2030 Forecasts & Strategic Outlook', pages: '51-58', unlocked: false },
];

const KEY_STATS = [
  { value: '$630B', label: 'Global Space Economy (2025)', trend: '+9% YoY' },
  { value: '238', label: 'Orbital Launches (2025)', trend: '+18% YoY' },
  { value: '$14.2B', label: 'Venture Funding (2024-2025)', trend: 'Across 340+ deals' },
  { value: '10,000+', label: 'Active Satellites in Orbit', trend: '3x since 2020' },
  { value: '$55B', label: 'U.S. Government Space Budget', trend: 'FY2026 estimate' },
  { value: '1,200+', label: 'Space Companies Tracked', trend: 'Across 45 countries' },
];

export default function StateOfSpace2026Page() {
  return (
    <main className="min-h-screen bg-slate-950">

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 rounded-full blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <ScrollReveal>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/10 rounded-full text-white/70 text-sm font-medium mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Free Industry Report
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                State of the Space
                <br />
                <span className="bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent">
                  Industry 2026
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                A comprehensive, data-driven analysis of the $1.8 trillion space economy.
                Market sizing, funding trends, launch data, and strategic forecasts across
                every major segment.
              </p>

              <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  58 Pages
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  30+ Charts &amp; Tables
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  February 2026
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Key Stats Preview */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <ScrollReveal delay={0.1}>
          <h2 className="text-xl font-semibold text-white text-center mb-8">
            Key Findings at a Glance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {KEY_STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-black/60 border border-white/[0.06] rounded-xl p-5 text-center hover:border-white/10 transition-colors"
              >
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400 mb-2">{stat.label}</div>
                <div className="text-xs text-white/70/80 font-medium">{stat.trend}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Table of Contents + Gate */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Table of Contents */}
          <ScrollReveal delay={0.1}>
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Table of Contents
              </h2>
              <div className="space-y-2">
                {TABLE_OF_CONTENTS.map((item) => (
                  <div
                    key={item.chapter}
                    className={`flex items-center gap-4 p-3.5 rounded-xl border transition-colors ${
                      item.unlocked
                        ? 'bg-black/40 border-white/[0.06] hover:border-white/10'
                        : 'bg-black/20 border-white/[0.06]'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        item.unlocked
                          ? 'bg-white/[0.05] text-white/70'
                          : 'bg-white/[0.05] text-slate-600'
                      }`}
                    >
                      {item.chapter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${
                          item.unlocked ? 'text-white/90' : 'text-slate-500'
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-600">pp. {item.pages}</div>
                    </div>
                    <div className="flex-shrink-0">
                      {item.unlocked ? (
                        <span className="text-xs text-emerald-500 font-medium px-2 py-0.5 bg-emerald-900/20 rounded-full">
                          Preview
                        </span>
                      ) : (
                        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Blurred preview teaser */}
              <div className="mt-6 relative">
                <div className="bg-black/40 border border-white/[0.06] rounded-xl p-6 select-none" style={{ filter: 'blur(4px)' }}>
                  <div className="h-3 bg-white/[0.06] rounded w-3/4 mb-3" />
                  <div className="h-2 bg-white/[0.04] rounded w-full mb-2" />
                  <div className="h-2 bg-white/[0.04] rounded w-5/6 mb-2" />
                  <div className="h-2 bg-white/[0.04] rounded w-4/6 mb-4" />
                  <div className="h-3 bg-white/[0.06] rounded w-2/3 mb-3" />
                  <div className="h-2 bg-white/[0.04] rounded w-full mb-2" />
                  <div className="h-2 bg-white/[0.04] rounded w-3/4" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/90 border border-white/[0.08] rounded-lg px-5 py-2.5 flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span className="text-sm text-white/70 font-medium">
                      Unlock full report below
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Email Gate Form */}
          <ScrollReveal delay={0.2}>
            <ReportGateForm />
          </ScrollReveal>
        </div>
      </section>

      {/* What You'll Learn Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <ScrollReveal delay={0.1}>
          <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              What&apos;s Inside the Report
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  ),
                  title: 'Market Sizing & Segmentation',
                  description: 'Revenue breakdown across satellite services, launch, ground systems, and emerging segments with 5-year projections.',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ),
                  title: 'Investment & Funding Analysis',
                  description: 'VC funding trends, SPAC performance, public market analysis, and the most active space investors of 2025-2026.',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  ),
                  title: 'Launch Industry Deep Dive',
                  description: 'Launch vehicle comparison, cost-per-kg trends, cadence analysis, and the impact of Starship on launch economics.',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ),
                  title: 'Constellation & Satellite Trends',
                  description: 'Mega-constellation economics, EO market dynamics, spectrum competition, and the multi-orbit connectivity future.',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  ),
                  title: 'Defense & National Security',
                  description: 'U.S. Space Force budget analysis, allied spending trends, commercial-military convergence, and procurement shifts.',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  ),
                  title: '5-Year Forecasts',
                  description: 'Segment-by-segment growth projections through 2030, M&A predictions, and strategic themes to watch.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/[0.04] border border-white/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Related Modules */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <RelatedModules modules={getRelatedModules('report/state-of-space-2026')} title="Explore Related Intelligence" />
      </section>

      {/* Bottom CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <ScrollReveal delay={0.1}>
          <div className="text-center">
            <p className="text-slate-500 text-sm mb-4">
              Published by the SpaceNexus Intelligence Team using data from NASA, NOAA, SEC, CelesTrak, SAM.gov, and 50+ additional sources.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
              <a href="/blog" className="hover:text-white transition-colors">
                Read our blog
              </a>
              <span>|</span>
              <a href="/company-profiles" className="hover:text-white transition-colors">
                Company Profiles
              </a>
              <span>|</span>
              <a href="/market-intel" className="hover:text-white transition-colors">
                Market Intelligence
              </a>
              <span>|</span>
              <a href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
