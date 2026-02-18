import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Payload Space — Space Industry Platform Comparison | SpaceNexus',
  description:
    'Comparing SpaceNexus interactive intelligence platform vs Payload Space newsletter and media. Feature comparison, use cases, and why they complement each other.',
  keywords: [
    'payload space alternative',
    'space industry platform',
    'payload space newsletter',
    'space industry news',
    'space data platform',
    'space intelligence platform',
    'payload space comparison',
    'space industry tools',
  ],
  openGraph: {
    title: 'SpaceNexus vs Payload Space',
    description:
      'Payload delivers an excellent curated newsletter. SpaceNexus is an interactive intelligence platform. See how they compare and why they complement each other.',
    type: 'article',
    publishedTime: '2026-02-17T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/payload-space',
  },
};

const FEATURE_COMPARISON = [
  { feature: 'Type', spacenexus: 'Interactive intelligence platform', competitor: 'Newsletter and media brand', winner: 'tie' },
  { feature: 'Price', spacenexus: 'Free (Pro $29/mo, Enterprise $99/mo)', competitor: 'Free newsletter (premium tier available)', winner: 'tie' },
  { feature: 'News Delivery', spacenexus: '50+ RSS feeds, auto-categorized, searchable', competitor: 'Curated daily newsletter by editors', winner: 'tie' },
  { feature: 'Satellite Tracking', spacenexus: 'Interactive 3D globe with 19,000+ objects', competitor: 'Not available', winner: 'spacenexus' },
  { feature: 'Launch Tracking', spacenexus: 'Live dashboard with countdowns and alerts', competitor: 'Launch news coverage in newsletter', winner: 'spacenexus' },
  { feature: 'Company Profiles', spacenexus: '200+ interactive profiles with financials', competitor: 'Company coverage in articles', winner: 'spacenexus' },
  { feature: 'Market Intelligence', spacenexus: 'Interactive dashboards, stocks, ETFs, funding', competitor: 'Market coverage in newsletter', winner: 'spacenexus' },
  { feature: 'Procurement Intel', spacenexus: 'SAM.gov, SBIR/STTR, contract tracking', competitor: 'Not available', winner: 'spacenexus' },
  { feature: 'B2B Marketplace', spacenexus: 'RFQs, proposals, provider matching', competitor: 'Not available', winner: 'spacenexus' },
  { feature: 'AI Copilot', spacenexus: 'Claude-powered procurement and market copilot', competitor: 'Not available', winner: 'spacenexus' },
  { feature: 'API Access', spacenexus: 'RESTful API (Enterprise tier)', competitor: 'Not available', winner: 'spacenexus' },
  { feature: 'Regulatory Tracking', spacenexus: 'FCC, ITU, space law, spectrum management', competitor: 'Policy news coverage', winner: 'spacenexus' },
  { feature: 'Community', spacenexus: 'Growing user base', competitor: 'Large, engaged subscriber community', winner: 'competitor' },
  { feature: 'Brand Recognition', spacenexus: 'Emerging platform', competitor: 'Well-established space media brand', winner: 'competitor' },
  { feature: 'Editorial Curation', spacenexus: 'AI-categorized aggregation', competitor: 'Expert human editorial curation', winner: 'competitor' },
  { feature: 'Mobile App', spacenexus: 'PWA + native Android/iOS', competitor: 'Newsletter delivered to inbox', winner: 'spacenexus' },
];

export default function PayloadComparisonPage() {
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
            <li className="text-cyan-400">Payload Space</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              SpaceNexus vs Payload Space
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              Payload Space is one of the most recognized media brands in the space industry, delivering
              a widely-read daily newsletter with curated news and analysis. SpaceNexus is an interactive
              intelligence platform with satellite tracking, company profiles, procurement data, and more.
              They serve different needs &mdash; and work well together.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated: February 2026</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <span>6 min read</span>
            </div>
          </header>

          {/* TL;DR */}
          <div className="card p-6 mb-10 border-l-4 border-cyan-500">
            <h2 className="text-lg font-bold text-slate-900 mb-2">TL;DR</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              <strong className="text-slate-700">Payload Space</strong> is an excellent curated newsletter
              for staying current on space industry news. <strong className="text-slate-700">SpaceNexus</strong> is
              an interactive intelligence platform for doing work &mdash; tracking satellites, researching companies,
              finding procurement opportunities, and analyzing markets. They are complementary, not competitive:
              read Payload for your daily briefing, then use SpaceNexus to dig deeper and take action.
            </p>
          </div>

          {/* Different Categories */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Newsletter vs. Platform: Different Tools for Different Jobs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6 ring-2 ring-cyan-500">
                <div className="text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-3">SpaceNexus</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Interactive Intelligence Platform</h3>
                <p className="text-slate-400 text-sm mb-4">
                  A full-featured platform where you explore data, track assets, research companies,
                  find opportunities, and make decisions.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Satellite Tracking', 'Launch Dashboard', 'Company Profiles', 'Market Intel', 'Procurement', 'AI Copilot', 'Marketplace', 'Regulatory'].map((feature) => (
                    <div key={feature} className="bg-cyan-50 text-cyan-700 text-xs px-2 py-1 rounded text-center font-medium">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
              <div className="card p-6">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payload Space</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Curated Newsletter &amp; Media</h3>
                <p className="text-slate-400 text-sm mb-4">
                  A daily newsletter that curates the most important space industry news, with
                  expert commentary and analysis delivered to your inbox.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Daily Newsletter', 'Editorial Analysis', 'Industry News', 'Community', 'Podcast', 'Events', 'Job Board', 'Brand'].map((feature) => (
                    <div key={feature} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded text-center font-medium">
                      {feature}
                    </div>
                  ))}
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
                    <th className="py-4 px-4 text-left text-slate-700 font-semibold">Payload Space</th>
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

          {/* SpaceNexus Advantages */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              What SpaceNexus Offers Beyond a Newsletter
            </h2>
            <div className="card p-8 space-y-4">
              <p className="text-slate-400 leading-relaxed">
                A newsletter tells you what happened. A platform lets you explore, analyze, and act.
                Here is what SpaceNexus provides that a newsletter cannot:
              </p>
              <ul className="space-y-3">
                {[
                  { title: 'Interactive satellite tracking', desc: 'Monitor 19,000+ objects on a 3D globe in real time. Search by operator, orbit type, or constellation. No newsletter can provide this.' },
                  { title: 'Live launch dashboard', desc: 'Real-time countdown timers, mission details, and launch vehicle specs for every global launch — not just a summary of what already happened.' },
                  { title: '200+ company profiles', desc: 'Interactive profiles with financial data, satellite assets, competitive positioning, and auto-tagged news. Research any company on demand.' },
                  { title: 'Procurement intelligence', desc: 'Search SAM.gov contracts, track SBIR/STTR opportunities, and use the AI copilot to match your capabilities to open solicitations.' },
                  { title: 'B2B marketplace', desc: 'Post RFQs, receive proposals, and connect with space industry vendors. Turn intelligence into business opportunities.' },
                  { title: 'API access', desc: 'Build space industry data into your own applications, dashboards, and workflows with the SpaceNexus REST API.' },
                  { title: 'Regulatory tracking', desc: 'Monitor FCC filings, ITU spectrum allocations, space law developments, and export control changes in real time.' },
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

          {/* Payload Strengths */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              What Payload Does Well
            </h2>
            <div className="card p-8">
              <p className="text-slate-400 leading-relaxed mb-4">
                Payload has earned its reputation as one of the best space industry newsletters. Credit where
                it is due:
              </p>
              <ul className="space-y-3">
                {[
                  { title: 'Expert curation', desc: 'Payload editors sift through dozens of sources and distill the most important stories into a digestible format. The editorial voice is sharp and informed.' },
                  { title: 'Strong community', desc: 'A large, engaged subscriber base that includes many of the most influential people in the space industry. Reading Payload connects you to the conversation.' },
                  { title: 'Brand recognition', desc: 'Payload is a well-known and trusted name in space media. Being mentioned in Payload carries weight in the industry.' },
                  { title: 'Effortless consumption', desc: 'A newsletter requires zero effort — it arrives in your inbox every morning. No need to log in, navigate a platform, or set up anything.' },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="text-slate-500 mt-1 flex-shrink-0 font-bold">&#10003;</span>
                    <div>
                      <strong className="text-slate-700">{item.title}:</strong>{' '}
                      <span className="text-slate-400 text-sm">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Better Together */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Better Together: Use Payload + SpaceNexus
            </h2>
            <div className="card p-8">
              <p className="text-slate-400 leading-relaxed mb-6">
                Payload and SpaceNexus are not competing for the same use case. The most informed space
                industry professionals will use both:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">&#9728;&#65039;</div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Morning</h4>
                  <p className="text-slate-400 text-xs">
                    Read Payload newsletter for a curated overview of what happened yesterday and what
                    matters today.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">&#9881;&#65039;</div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Workday</h4>
                  <p className="text-slate-400 text-xs">
                    Use SpaceNexus to track launches, research companies, find procurement opportunities,
                    and monitor your satellite constellation.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">&#128202;</div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Strategic</h4>
                  <p className="text-slate-400 text-xs">
                    Use SpaceNexus market intelligence and company profiles for deep research, competitive
                    analysis, and decision-making.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Why SpaceNexus */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Why Choose SpaceNexus
            </h2>
            <div className="card p-8 space-y-4">
              <p className="text-slate-400 leading-relaxed">
                If you are looking for a platform to work in &mdash; not just read &mdash; SpaceNexus is the choice:
              </p>
              <ul className="space-y-3">
                {[
                  { title: 'From information to action', desc: 'SpaceNexus does not just inform you — it gives you tools to act. Find a procurement opportunity, connect with a vendor, track a competitor, and monitor a satellite fleet, all in one platform.' },
                  { title: 'Real-time, always current', desc: 'No waiting for tomorrow morning\'s newsletter. SpaceNexus data updates continuously from NASA, NOAA, SAM.gov, and 50+ feeds.' },
                  { title: '10 modules, one platform', desc: 'Mission Control, satellite tracking, market intelligence, procurement, company profiles, marketplace, regulatory tracking — integrated and cross-referenced.' },
                  { title: 'AI-powered analysis', desc: 'The Claude-powered copilot answers your questions, matches your capabilities to opportunities, and surfaces insights you would miss manually.' },
                  { title: 'Free to start', desc: 'Like Payload, SpaceNexus has a free tier. Unlike Payload, that free tier includes satellite tracking, launch monitoring, and company research tools.' },
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

          {/* CTA */}
          <section className="mb-10">
            <div className="card p-10 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Go beyond the newsletter with interactive space intelligence
              </h2>
              <p className="text-slate-400 mb-6 max-w-xl mx-auto">
                Keep reading your favorite space newsletters. Then use SpaceNexus to dig deeper,
                track satellites, research companies, find contracts, and build your space business.
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
            headline: 'SpaceNexus vs Payload Space',
            description:
              'Comparing SpaceNexus interactive intelligence platform vs Payload Space newsletter. How they compare and why they complement each other.',
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
              '@id': 'https://spacenexus.us/compare/payload-space',
            },
          }),
        }}
      />
    </div>
  );
}
