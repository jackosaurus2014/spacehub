import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Quilty Space Analytics — Space Industry Platform Comparison | SpaceNexus',
  description:
    'Comparing SpaceNexus (free-$99/mo) vs Quilty Space Analytics ($5,000-50,000/yr). Self-service real-time platform vs. premium analyst research reports for the space industry.',
  keywords: [
    'quilty analytics alternative',
    'space industry analytics platform',
    'quilty space analytics',
    'space market intelligence',
    'space industry research',
    'space data analytics',
    'quilty space alternative',
    'space industry platform comparison',
  ],
  openGraph: {
    title: 'SpaceNexus vs Quilty Space Analytics',
    description:
      'Quilty Space delivers premium research reports for $5K-50K/year. SpaceNexus offers self-service real-time intelligence starting free. See the full comparison.',
    type: 'article',
    publishedTime: '2026-02-17T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/quilty-analytics',
  },
};

const FEATURE_COMPARISON = [
  { feature: 'Starting Price', spacenexus: 'Free (Pro $29/mo, Enterprise $99/mo)', competitor: '$5,000-50,000/year (report packages)', winner: 'spacenexus' },
  { feature: 'Delivery Model', spacenexus: 'Self-service interactive platform', competitor: 'PDF reports and analyst briefings', winner: 'spacenexus' },
  { feature: 'Data Freshness', spacenexus: 'Real-time feeds, updated continuously', competitor: 'Periodic reports (monthly/quarterly)', winner: 'spacenexus' },
  { feature: 'Satellite Tracking', spacenexus: '19,000+ objects on interactive 3D globe', competitor: 'Satellite market analysis in reports', winner: 'spacenexus' },
  { feature: 'Launch Monitoring', spacenexus: 'Live launch dashboard with countdowns', competitor: 'Launch market forecasts in reports', winner: 'spacenexus' },
  { feature: 'Market Intelligence', spacenexus: 'Interactive dashboards, stock tracking, funding data', competitor: 'Deep analyst-written market reports', winner: 'tie' },
  { feature: 'Custom Research', spacenexus: 'AI copilot for on-demand analysis', competitor: 'Custom analyst engagements available', winner: 'competitor' },
  { feature: 'Analyst Expertise', spacenexus: 'AI-powered insights and automated analysis', competitor: 'Veteran space industry analysts', winner: 'competitor' },
  { feature: 'Company Profiles', spacenexus: '200+ interactive profiles with financials', competitor: 'Select companies covered in depth', winner: 'spacenexus' },
  { feature: 'Procurement Intelligence', spacenexus: 'SAM.gov, SBIR/STTR, contract tracking', competitor: 'Not a focus area', winner: 'spacenexus' },
  { feature: 'Regulatory Tracking', spacenexus: 'FCC, ITU, space law, spectrum auctions', competitor: 'Policy analysis in select reports', winner: 'spacenexus' },
  { feature: 'API Access', spacenexus: 'RESTful API (Enterprise tier)', competitor: 'No API access', winner: 'spacenexus' },
  { feature: 'B2B Marketplace', spacenexus: 'RFQs, proposals, provider matching', competitor: 'Not available', winner: 'spacenexus' },
  { feature: 'Mobile Access', spacenexus: 'PWA + native Android/iOS apps', competitor: 'PDF reports viewable on mobile', winner: 'spacenexus' },
  { feature: 'Institutional Reports', spacenexus: 'Not available (data-driven insights instead)', competitor: 'Comprehensive, citable research reports', winner: 'competitor' },
];

export default function QuiltyComparisonPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        {/* Breadcrumbs */}
        <nav className="pt-6 mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-slate-400">
            <li><Link href="/" className="hover:text-cyan-400 transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link href="/compare" className="hover:text-cyan-400 transition-colors">Compare</Link></li>
            <li>/</li>
            <li className="text-cyan-400">Quilty Space Analytics</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              SpaceNexus vs Quilty Space Analytics
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              Quilty Space (formerly Quilty Analytics) is a respected space industry research firm
              delivering premium analyst reports and custom research. SpaceNexus is a self-service
              intelligence platform with real-time data, interactive tools, and AI-powered insights.
              Two different approaches to space industry intelligence &mdash; here is how they compare.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated: February 2026</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <span>7 min read</span>
            </div>
          </header>

          {/* TL;DR */}
          <div className="card p-6 mb-10 border-l-4 border-cyan-500">
            <h2 className="text-lg font-bold text-slate-900 mb-2">TL;DR</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              <strong className="text-slate-700">Quilty Space</strong> excels at deep, analyst-driven
              research reports for institutional clients who need citable, boardroom-ready analysis.
              <strong className="text-slate-700"> SpaceNexus</strong> is a self-service platform with
              real-time data, interactive dashboards, AI copilot, and broader coverage across launches,
              satellites, procurement, and company profiles &mdash; at a fraction of the cost. If you need
              a polished research report for investors, Quilty delivers. If you need an always-on
              intelligence platform, SpaceNexus is the better fit.
            </p>
          </div>

          {/* Key Difference */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              The Key Difference: Reports vs. Platform
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6 ring-2 ring-cyan-500">
                <div className="text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-3">SpaceNexus</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Self-Service Platform</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>Access data 24/7, explore interactively</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>Real-time updates (not periodic reports)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>AI copilot for on-demand analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>10 integrated modules, 200+ company profiles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>Free tier, no sales process required</span>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-2xl font-bold text-cyan-600">Free &ndash; $99<span className="text-sm text-slate-400 font-normal">/mo</span></div>
                </div>
              </div>
              <div className="card p-6">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quilty Space</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Premium Research Reports</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>Analyst-written, institution-grade reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>Deep dives on specific market segments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>Custom research engagements available</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>Veteran analyst team with industry relationships</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5 flex-shrink-0">&#9656;</span>
                    <span>Boardroom-ready, citable research</span>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-2xl font-bold text-slate-900">$5,000 &ndash; $50,000<span className="text-sm text-slate-400 font-normal">/yr</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Comparison Table */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Feature-by-Feature Comparison
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-4 px-4 text-left text-slate-700 font-semibold">Feature</th>
                    <th className="py-4 px-4 text-left text-cyan-600 font-semibold">SpaceNexus</th>
                    <th className="py-4 px-4 text-left text-slate-700 font-semibold">Quilty Space</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((row) => (
                    <tr key={row.feature} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-700 font-medium">{row.feature}</td>
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-start gap-2">
                          {row.winner === 'spacenexus' && (
                            <span className="text-emerald-500 font-bold flex-shrink-0" aria-label="Advantage">&#10003;</span>
                          )}
                          <span>{row.spacenexus}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-start gap-2">
                          {row.winner === 'competitor' && (
                            <span className="text-emerald-500 font-bold flex-shrink-0" aria-label="Advantage">&#10003;</span>
                          )}
                          <span>{row.competitor}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Who Should Choose Each */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Who Should Choose Each Platform
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-cyan-600 mb-4">Choose SpaceNexus if you:</h3>
                <ul className="space-y-3">
                  {[
                    'Want to explore space industry data on your own terms, 24/7',
                    'Need real-time data, not periodic reports from months ago',
                    'Are a startup or small team with a limited budget',
                    'Need satellite tracking, launch monitoring, or orbital data',
                    'Want procurement intelligence to find government contracts',
                    'Need a B2B marketplace to connect with space vendors',
                    'Prefer an AI copilot for on-demand questions and analysis',
                    'Want API access to build space data into your own tools',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-cyan-500 mt-0.5 flex-shrink-0">&#9656;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">Choose Quilty Space if you:</h3>
                <ul className="space-y-3">
                  {[
                    'Need polished, citable research for board presentations or investors',
                    'Want deep custom analysis on a specific market segment',
                    'Prefer working directly with experienced industry analysts',
                    'Are an institutional investor conducting space industry due diligence',
                    'Need bespoke competitive intelligence on a specific company',
                    'Value analyst relationships and ongoing advisory',
                    'Have budget for premium research ($5K-50K/year)',
                    'Need M&A or investment-grade research documents',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-slate-500 mt-0.5 flex-shrink-0">&#9656;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Why SpaceNexus */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Why Choose SpaceNexus for Space Industry Intelligence
            </h2>
            <div className="card p-8 space-y-4">
              <p className="text-slate-400 leading-relaxed">
                Research reports are valuable, but the space industry moves fast. By the time a quarterly
                report lands on your desk, the data may already be stale. SpaceNexus provides a fundamentally
                different approach:
              </p>
              <ul className="space-y-3">
                {[
                  { title: 'Always-on intelligence', desc: 'Real-time launch tracking, satellite monitoring, and market data that updates continuously. No waiting for the next report cycle.' },
                  { title: 'Broader coverage', desc: '10 integrated modules covering launches, satellites, market intelligence, procurement, companies, regulatory, and more. Research firms typically cover only market analysis.' },
                  { title: 'Self-service exploration', desc: 'Ask your own questions, explore data interactively, and discover insights that a pre-written report might not cover. The AI copilot is available anytime.' },
                  { title: '200+ company profiles', desc: 'Interactive profiles with financial data, competitive positioning, satellite assets, and news tagging. Updated automatically, not annually.' },
                  { title: 'Accessible pricing', desc: 'Start free, upgrade to Pro at $29/mo. A single Quilty report package can cost more than years of SpaceNexus Enterprise access.' },
                  { title: 'Procurement advantage', desc: 'SAM.gov integration and SBIR/STTR tracking give you a direct path from intelligence to revenue — something research reports cannot provide.' },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="text-cyan-500 mt-1 flex-shrink-0 font-bold">&#10003;</span>
                    <div>
                      <strong className="text-slate-700">{item.title}:</strong>{' '}
                      <span className="text-slate-400 text-sm">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Complementary Use */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Using Both Together
            </h2>
            <div className="card p-8">
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus and Quilty Space serve different purposes and can complement each other well.
                Organizations with larger budgets often use both:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">SpaceNexus for daily operations</h4>
                  <p className="text-slate-400 text-xs">
                    Track launches, monitor satellites, discover procurement opportunities, research companies,
                    and stay current with real-time data every day.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">Quilty for strategic decisions</h4>
                  <p className="text-slate-400 text-xs">
                    Commission deep research reports for board presentations, investment decisions,
                    M&amp;A due diligence, and market entry strategies.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10">
            <div className="card p-10 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Get real-time space intelligence without waiting for the next report
              </h2>
              <p className="text-slate-400 mb-6 max-w-xl mx-auto">
                SpaceNexus delivers always-on space industry intelligence with interactive dashboards,
                AI-powered analysis, and data from NASA, NOAA, SAM.gov, and 50+ feeds &mdash; starting at free.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/register" className="btn-primary text-sm py-3 px-6">
                  Try SpaceNexus Free
                </Link>
                <Link href="/pricing" className="btn-secondary text-sm py-3 px-6">
                  View Pricing Plans
                </Link>
              </div>
            </div>
          </section>

          {/* Back Link */}
          <div className="text-center">
            <Link href="/compare" className="text-cyan-500 hover:text-cyan-400 text-sm transition-colors">
              &larr; Back to all comparisons
            </Link>
          </div>
        </div>
      </div>

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'SpaceNexus vs Quilty Space Analytics',
            description:
              'Comparing SpaceNexus (free-$99/mo) vs Quilty Space Analytics ($5,000-50,000/yr). Self-service real-time platform vs. premium analyst research reports.',
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: {
              '@type': 'Organization',
              name: 'SpaceNexus',
              logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
            },
            datePublished: '2026-02-17T00:00:00Z',
            dateModified: new Date().toISOString(),
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': 'https://spacenexus.us/compare/quilty-analytics',
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
    </div>
  );
}
