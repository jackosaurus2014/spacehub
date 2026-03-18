'use client';

import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface Competitor {
  name: string;
  tagline: string;
  pricing: string;
  strengths: string[];
  limitations: string[];
  spaceNexusAdvantage: string;
  color: string;
  textColor: string;
  borderColor: string;
}

// ────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────

const COMPETITORS: Competitor[] = [
  {
    name: 'Quilty Space',
    tagline: 'Enterprise-grade space analytics and advisory',
    pricing: '$10,000+/yr (enterprise contracts)',
    strengths: [
      'Deep proprietary research and analyst reports',
      'High-touch advisory with domain experts',
      'Used by major aerospace primes and investors',
    ],
    limitations: [
      'Pricing starts at $10K+/yr, out of reach for startups and individuals',
      'No self-service platform or real-time dashboards',
      'Limited tooling: no calculators, trackers, or community',
    ],
    spaceNexusAdvantage:
      'SpaceNexus provides comparable market data, company intelligence, and trend analysis at $19.99/mo. You get real-time dashboards, 200+ company profiles, engineering calculators, and community features that Quilty does not offer. For enterprise needs, SpaceNexus Enterprise adds custom reporting at a fraction of the cost.',
    color: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
  },
  {
    name: 'SpaceNews',
    tagline: 'News publication covering the global space industry',
    pricing: '$250/yr (digital subscription)',
    strengths: [
      'Decades of editorial credibility and journalist relationships',
      'Breaking news and policy coverage',
      'Strong Defense & Intelligence community readership',
    ],
    limitations: [
      'News only: no structured data, company profiles, or analytics tools',
      'No satellite tracking, launch databases, or financial data',
      'No engineering calculators, job boards, or marketplace',
    ],
    spaceNexusAdvantage:
      'SpaceNexus includes aggregated news from SpaceNews and 50+ other sources, plus adds structured data, company intelligence, market analytics, engineering tools, and community. It is the difference between reading about the industry and working in it.',
    color: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
  },
  {
    name: 'Payload Space',
    tagline: 'Space industry newsletter and media company',
    pricing: 'Free newsletter + $200/yr premium',
    strengths: [
      'Excellent daily newsletter with concise industry coverage',
      'Growing brand recognition in the new-space community',
      'Clean design and readable format',
    ],
    limitations: [
      'Newsletter-focused: no platform, dashboards, or tooling',
      'No company database, financial data, or satellite tracking',
      'No engineering calculators, regulatory tools, or community features',
    ],
    spaceNexusAdvantage:
      'Payload is great for staying informed via email; SpaceNexus is a full platform for working in the space industry. You get structured data, 200+ company profiles, live satellite tracking, launch databases, calculators, funding trackers, and an intelligence brief that goes deeper than any newsletter.',
    color: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
  },
  {
    name: 'Free Tools (Fragmented)',
    tagline: 'Cobbling together CelesTrak, NASA, SEC, industry reports',
    pricing: 'Free (but time-intensive)',
    strengths: [
      'No cost: open data from NASA, NORAD, SEC, and government sources',
      'Raw data access for technical users',
      'No vendor lock-in',
    ],
    limitations: [
      'Fragmented: dozens of tabs, formats, and update schedules',
      'No unified interface, cross-referencing, or correlation',
      'Hours of manual work to assemble what SpaceNexus provides in one click',
      'No alerts, no AI analysis, no community or collaboration',
    ],
    spaceNexusAdvantage:
      'SpaceNexus aggregates data from 50+ free and licensed sources into a single unified platform. Instead of maintaining spreadsheets across CelesTrak, NASA EONET, SEC EDGAR, and a dozen report PDFs, you get everything in one place with alerts, AI insights, and real-time dashboards. The time savings alone justify the $19.99/mo.',
    color: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/20',
  },
];

const FEATURE_COMPARISON = [
  { feature: 'Market Intelligence & Data', spaceNexus: true, quilty: true, spaceNews: false, payload: false, free: false },
  { feature: 'Company Profiles (200+)', spaceNexus: true, quilty: true, spaceNews: false, payload: false, free: false },
  { feature: 'Real-Time News Aggregation', spaceNexus: true, quilty: false, spaceNews: true, payload: true, free: false },
  { feature: 'Satellite Tracking', spaceNexus: true, quilty: false, spaceNews: false, payload: false, free: true },
  { feature: 'Launch Database & Manifest', spaceNexus: true, quilty: false, spaceNews: false, payload: false, free: true },
  { feature: 'Engineering Calculators', spaceNexus: true, quilty: false, spaceNews: false, payload: false, free: false },
  { feature: 'Funding & Deal Tracking', spaceNexus: true, quilty: true, spaceNews: false, payload: false, free: false },
  { feature: 'AI-Powered Insights', spaceNexus: true, quilty: false, spaceNews: false, payload: false, free: false },
  { feature: 'Regulatory Compliance Tools', spaceNexus: true, quilty: false, spaceNews: false, payload: false, free: false },
  { feature: 'Space Jobs Board', spaceNexus: true, quilty: false, spaceNews: true, payload: true, free: false },
  { feature: 'Community & Forums', spaceNexus: true, quilty: false, spaceNews: false, payload: false, free: false },
  { feature: 'API Access', spaceNexus: true, quilty: true, spaceNews: false, payload: false, free: true },
  { feature: 'Price (Annual)', spaceNexus: '$240/yr', quilty: '$10,000+', spaceNews: '$250', payload: '$200', free: 'Free' },
];

// ────────────────────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────────────────────

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  return (
    <div className={`${competitor.color} border ${competitor.borderColor} rounded-2xl p-6 transition-all duration-300 hover:border-opacity-60`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-lg font-bold ${competitor.textColor}`}>{competitor.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{competitor.tagline}</p>
        </div>
        <span className="text-xs font-medium text-slate-400 bg-white/[0.06] px-2.5 py-1 rounded-full shrink-0">
          {competitor.pricing}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Strengths</h4>
          <ul className="space-y-1.5">
            {competitor.strengths.map((s, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-emerald-400 shrink-0 mt-0.5">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Limitations</h4>
          <ul className="space-y-1.5">
            {competitor.limitations.map((l, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-red-400 shrink-0 mt-0.5">-</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
        <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
          SpaceNexus Advantage
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">{competitor.spaceNexusAdvantage}</p>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

export default function AlternativesPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Hero */}
        <section className="relative overflow-hidden mb-12">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent" />
          <div className="absolute inset-0">
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            <div className="absolute top-40 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 text-center py-12">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="text-blue-400 text-xs font-medium uppercase tracking-wider">Honest Comparison</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
              SpaceNexus Alternatives{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">&amp; Competitors</span>
            </h1>
            <p className="text-slate-400 text-lg sm:text-xl max-w-3xl mx-auto mb-6">
              Looking for space industry intelligence tools? Here is an honest look at how SpaceNexus
              compares to Quilty Space, SpaceNews, Payload Space, and free tools.
            </p>
            <p className="text-slate-500 text-sm max-w-2xl mx-auto">
              We believe in transparency. Every platform has strengths. We will tell you exactly where
              SpaceNexus excels and where others might be a better fit for your specific needs.
            </p>
          </div>
        </section>

        {/* Quick comparison summary */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">The Bottom Line</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">$19.99</div>
                <div className="text-slate-400 text-xs mt-1">SpaceNexus Pro /mo</div>
                <div className="text-slate-500 text-[10px] mt-0.5">Full platform access</div>
              </div>
              <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">$10K+</div>
                <div className="text-slate-400 text-xs mt-1">Quilty Space /yr</div>
                <div className="text-slate-500 text-[10px] mt-0.5">Enterprise advisory</div>
              </div>
              <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">200+</div>
                <div className="text-slate-400 text-xs mt-1">Company Profiles</div>
                <div className="text-slate-500 text-[10px] mt-0.5">SpaceNexus exclusive</div>
              </div>
              <div className="bg-white/[0.04] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">50+</div>
                <div className="text-slate-400 text-xs mt-1">Data Sources</div>
                <div className="text-slate-500 text-[10px] mt-0.5">Unified in one platform</div>
              </div>
            </div>
          </div>
        </section>

        {/* Competitor Cards */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Detailed Comparisons</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {COMPETITORS.map((competitor) => (
              <CompetitorCard key={competitor.name} competitor={competitor} />
            ))}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Feature-by-Feature Comparison</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left text-xs text-slate-500 uppercase tracking-wider py-4 px-4">Feature</th>
                    <th className="text-center text-xs text-blue-400 uppercase tracking-wider py-4 px-3 font-bold bg-blue-500/5">SpaceNexus</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider py-4 px-3">Quilty</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider py-4 px-3">SpaceNews</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider py-4 px-3">Payload</th>
                    <th className="text-center text-xs text-slate-500 uppercase tracking-wider py-4 px-3">Free Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                      <td className="py-3 px-4 text-slate-300 text-xs font-medium">{row.feature}</td>
                      {['spaceNexus', 'quilty', 'spaceNews', 'payload', 'free'].map((key) => {
                        const val = row[key as keyof typeof row];
                        return (
                          <td key={key} className={`py-3 px-3 text-center ${key === 'spaceNexus' ? 'bg-blue-500/5' : ''}`}>
                            {typeof val === 'boolean' ? (
                              val ? <span className="inline-flex justify-center"><CheckIcon /></span> : <span className="inline-flex justify-center"><XIcon /></span>
                            ) : (
                              <span className={`text-xs font-medium ${key === 'spaceNexus' ? 'text-blue-400' : 'text-slate-400'}`}>
                                {val}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Who should use what */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Which Tool Is Right for You?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
              <h3 className="text-blue-400 font-semibold mb-2">Choose SpaceNexus if...</h3>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">&#x2713;</span>You need a unified platform with data, tools, and community</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">&#x2713;</span>You want enterprise-grade intelligence at startup-friendly pricing</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">&#x2713;</span>You are an analyst, investor, engineer, or executive in the space industry</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 shrink-0">&#x2713;</span>You want real-time dashboards, calculators, and AI insights in one place</li>
              </ul>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-slate-300 font-semibold mb-2">Consider alternatives if...</h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li className="flex items-start gap-2"><span className="text-slate-500 shrink-0">&#x2022;</span>You only need news (SpaceNews or Payload may suffice)</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 shrink-0">&#x2022;</span>You need bespoke advisory with analyst calls (Quilty is excellent)</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 shrink-0">&#x2022;</span>You are a researcher with deep technical needs and prefer raw data APIs</li>
                <li className="flex items-start gap-2"><span className="text-slate-500 shrink-0">&#x2022;</span>Your organization already has a $100K+ intelligence budget (enterprise options exist)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Try SpaceNexus Free</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xl mx-auto">
              No credit card required. Get instant access to market intelligence, company profiles,
              satellite tracking, engineering calculators, and more. Upgrade to Pro for $19.99/mo when you are ready.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold rounded-lg transition-colors"
              >
                Start Free Today
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm font-medium rounded-lg transition-colors"
              >
                View Pricing
              </Link>
              <Link
                href="/book-demo"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Individual comparison page links */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-white mb-4">In-Depth Comparisons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/compare/quilty-analytics"
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-all group"
            >
              <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">SpaceNexus vs Quilty Analytics</h3>
              <p className="text-slate-400 text-xs mt-1">Enterprise analytics comparison</p>
            </Link>
            <Link
              href="/compare/bloomberg-terminal"
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-all group"
            >
              <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">SpaceNexus vs Bloomberg Terminal</h3>
              <p className="text-slate-400 text-xs mt-1">Financial data comparison</p>
            </Link>
            <Link
              href="/compare/payload-space"
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-all group"
            >
              <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">SpaceNexus vs Payload Space</h3>
              <p className="text-slate-400 text-xs mt-1">Newsletter vs platform comparison</p>
            </Link>
          </div>
        </section>

        {/* Related Modules */}
        <RelatedModules modules={PAGE_RELATIONS['alternatives'] || []} />

        {/* Schema.org Structured Data */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'SpaceNexus Alternatives & Competitors',
              description:
                'Compare SpaceNexus to Quilty Space, SpaceNews, Payload Space, and free tools. Find the right space intelligence platform.',
              url: 'https://spacenexus.us/alternatives',
              publisher: {
                '@type': 'Organization',
                name: 'SpaceNexus',
                url: 'https://spacenexus.us',
              },
              mainEntity: {
                '@type': 'ItemList',
                name: 'Space Industry Intelligence Tools',
                itemListElement: COMPETITORS.map((c, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  name: c.name,
                  description: c.tagline,
                })),
              },
            }),
          }}
        />
      </div>
    </div>
  );
}
