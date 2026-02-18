import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Competitors — Space Industry Platform Comparisons | SpaceNexus',
  description:
    'See how SpaceNexus compares to Bloomberg Terminal, Quilty Space Analytics, Payload Space, and other space industry tools. Feature comparisons, pricing, and use cases.',
  keywords: [
    'SpaceNexus alternatives',
    'space industry platform comparison',
    'bloomberg terminal space industry',
    'quilty analytics alternative',
    'payload space alternative',
    'space industry tools',
    'space data platform',
  ],
  openGraph: {
    title: 'SpaceNexus vs Competitors — Space Industry Platform Comparisons',
    description:
      'Compare SpaceNexus to Bloomberg Terminal, Quilty Space Analytics, and Payload Space. See which space industry tool is right for you.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare',
  },
};

const COMPARISONS = [
  {
    slug: 'bloomberg-terminal',
    title: 'SpaceNexus vs Bloomberg Terminal',
    subtitle: 'Purpose-built space intelligence vs. general finance terminal',
    description:
      'Bloomberg Terminal costs $25,000/year and covers all financial markets. SpaceNexus starts free and is purpose-built for the space industry with satellite tracking, launch data, procurement intelligence, and 200+ company profiles.',
    tags: ['Finance', 'Market Data', 'Enterprise'],
    priceComparison: '$0-99/mo vs $25,000/yr',
  },
  {
    slug: 'quilty-analytics',
    title: 'SpaceNexus vs Quilty Space Analytics',
    subtitle: 'Self-service platform vs. premium research reports',
    description:
      'Quilty Space delivers institutional-grade analyst reports for $5,000-50,000/year. SpaceNexus provides a self-service platform with real-time data, AI copilot, and interactive tools starting at free.',
    tags: ['Analytics', 'Research', 'Reports'],
    priceComparison: '$0-99/mo vs $5K-50K/yr',
  },
  {
    slug: 'payload-space',
    title: 'SpaceNexus vs Payload Space',
    subtitle: 'Interactive intelligence platform vs. curated newsletter',
    description:
      'Payload is a well-known space industry newsletter and media brand. SpaceNexus is an interactive platform with satellite tracking, company profiles, marketplace, and API access. They complement each other.',
    tags: ['News', 'Media', 'Community'],
    priceComparison: 'Both have free tiers',
  },
];

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <PageHeader
          title="SpaceNexus vs Competitors"
          subtitle="See how SpaceNexus compares to other space industry tools and platforms"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Compare' }]}
        />

        <div className="max-w-5xl mx-auto">
          {/* Intro */}
          <div className="card p-8 mb-10">
            <p className="text-slate-400 leading-relaxed">
              The space industry has long relied on expensive, fragmented data sources. SpaceNexus
              consolidates real-time launches, satellite tracking, market intelligence, procurement
              data, and 200+ company profiles into one accessible platform. Below, we compare
              SpaceNexus to the tools most commonly used by space industry professionals so you
              can decide which is right for your needs.
            </p>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 gap-6 mb-12">
            {COMPARISONS.map((comp) => (
              <Link
                key={comp.slug}
                href={`/compare/${comp.slug}`}
                className="card p-8 hover:ring-2 hover:ring-cyan-500/50 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-cyan-600 transition-colors mb-1">
                      {comp.title}
                    </h2>
                    <p className="text-sm text-cyan-600 font-medium mb-3">{comp.subtitle}</p>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{comp.description}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {comp.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full font-medium">
                        {comp.priceComparison}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <span className="text-cyan-500 group-hover:translate-x-1 transition-transform inline-block text-2xl">
                      &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Summary Table */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Quick Comparison
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-4 px-4 text-left text-slate-700 font-semibold">Feature</th>
                    <th className="py-4 px-4 text-center text-cyan-600 font-semibold">SpaceNexus</th>
                    <th className="py-4 px-4 text-center text-slate-700 font-semibold">Bloomberg</th>
                    <th className="py-4 px-4 text-center text-slate-700 font-semibold">Quilty Space</th>
                    <th className="py-4 px-4 text-center text-slate-700 font-semibold">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Starting Price', sn: 'Free', bb: '$25,000/yr', qu: '$5,000/yr', pl: 'Free' },
                    { feature: 'Real-time Data', sn: true, bb: true, qu: false, pl: false },
                    { feature: 'Satellite Tracking', sn: true, bb: false, qu: false, pl: false },
                    { feature: 'Company Profiles', sn: true, bb: true, qu: true, pl: false },
                    { feature: 'Launch Tracking', sn: true, bb: false, qu: false, pl: false },
                    { feature: 'Market Intelligence', sn: true, bb: true, qu: true, pl: false },
                    { feature: 'AI Copilot', sn: true, bb: false, qu: false, pl: false },
                    { feature: 'Procurement Intel', sn: true, bb: false, qu: false, pl: false },
                    { feature: 'API Access', sn: true, bb: true, qu: false, pl: false },
                    { feature: 'Mobile App', sn: true, bb: true, qu: false, pl: true },
                    { feature: 'Space-Specific', sn: true, bb: false, qu: true, pl: true },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-700 font-medium">{row.feature}</td>
                      {[row.sn, row.bb, row.qu, row.pl].map((val, i) => (
                        <td key={i} className="py-3 px-4 text-center">
                          {typeof val === 'string' ? (
                            <span className={i === 0 ? 'text-cyan-600 font-semibold' : 'text-slate-600'}>{val}</span>
                          ) : val ? (
                            <span className="text-emerald-500 font-bold text-lg" aria-label="Yes">&#10003;</span>
                          ) : (
                            <span className="text-red-400 font-bold text-lg" aria-label="No">&#10005;</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <div className="card p-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Ready to try SpaceNexus?</h2>
              <p className="text-slate-400 mb-6 max-w-xl mx-auto">
                Join thousands of aerospace professionals using SpaceNexus to track launches,
                monitor satellites, discover opportunities, and make smarter decisions in the
                space economy.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/register" className="btn-primary text-sm py-3 px-6">
                  Try SpaceNexus Free
                </Link>
                <Link href="/pricing" className="btn-secondary text-sm py-3 px-6">
                  View Pricing
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'SpaceNexus vs Competitors — Space Industry Platform Comparisons',
            description:
              'Compare SpaceNexus to Bloomberg Terminal, Quilty Space Analytics, and Payload Space for space industry intelligence.',
            url: 'https://spacenexus.us/compare',
            publisher: {
              '@type': 'Organization',
              name: 'SpaceNexus',
              logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
            },
          }),
        }}
      />
    </div>
  );
}
