import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Rocket Lab vs Relativity Space: Complete Comparison 2026',
  description: 'Compare Rocket Lab and Relativity Space side by side — launch vehicles, funding, manufacturing approach, payload capacity, and business strategy. Updated data from SpaceNexus intelligence platform.',
  keywords: ['Rocket Lab vs Relativity Space', 'Electron vs Terran R', 'small launch vehicles comparison', 'RKLB comparison', '3D printed rocket'],
  openGraph: {
    title: 'Rocket Lab vs Relativity Space: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Rocket Lab and Relativity Space with real data on launches, funding, manufacturing, and strategy.',
    url: 'https://spacenexus.us/compare/rocket-lab-vs-relativity-space',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/rocket-lab-vs-relativity-space' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', rocketLab: '2006', relativity: '2015' },
  { metric: 'Headquarters', rocketLab: 'Long Beach, CA (NZ origins)', relativity: 'Long Beach, CA' },
  { metric: 'Employees', rocketLab: '~2,000', relativity: '~600 (reduced from peak)' },
  { metric: 'Total Funding', rocketLab: '~$1.3B+ (pre-IPO)', relativity: '~$1.65B' },
  { metric: 'Valuation / Market Cap', rocketLab: '~$10B (RKLB, NASDAQ)', relativity: 'Private (est. $4.2B, 2022 round)' },
  { metric: 'Public Status', rocketLab: 'Public (NASDAQ: RKLB)', relativity: 'Private' },
  { metric: 'Primary Vehicle', rocketLab: 'Electron (operational)', relativity: 'Terran R (in development)' },
  { metric: 'Previous Vehicle', rocketLab: 'N/A', relativity: 'Terran 1 (retired 2023, did not reach orbit)' },
  { metric: 'Orbital Launches', rocketLab: '55+ (Electron)', relativity: '0 orbital (Terran 1 cancelled)' },
  { metric: 'LEO Payload Capacity', rocketLab: '300 kg (Electron)', relativity: '20,000 kg (Terran R, target)' },
  { metric: 'Reuse Strategy', rocketLab: 'Electron booster recovery (helicopter catch, partial)', relativity: 'Terran R fully reusable (planned)' },
  { metric: 'Revenue (Annual)', rocketLab: '~$430M (FY2024)', relativity: 'Not publicly disclosed' },
  { metric: 'Manufacturing Approach', rocketLab: 'Traditional + vertical integration', relativity: '3D printing (Stargate proprietary printers)' },
  { metric: 'Space Systems Division', rocketLab: 'Yes (spacecraft buses, components)', relativity: 'No (launch-only focus)' },
];

export default function RocketLabVsRelativitySpace() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Rocket Lab vs Relativity Space</span>
        </nav>
        <h1 className="text-display text-3xl md:text-4xl mb-3">Rocket Lab vs Relativity Space</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl">
          A comprehensive side-by-side comparison of two prominent small-launch and emerging medium-launch companies, updated with the latest data from SpaceNexus.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="card-terminal mb-8">
        <div className="card-terminal__header">
          <div className="flex items-center gap-2">
            <div className="card-terminal__dots">
              <div className="card-terminal__dot card-terminal__dot--red" />
              <div className="card-terminal__dot card-terminal__dot--amber" />
              <div className="card-terminal__dot card-terminal__dot--green" />
            </div>
            <span className="card-terminal__path">spacenexus:~/compare</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="py-3 px-4 text-left text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-tertiary)' }}>Metric</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Rocket Lab</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Relativity Space</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2.5 px-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2.5 px-4 text-center text-xs" style={{ color: 'var(--text-primary)' }}>{row.rocketLab}</td>
                  <td className="py-2.5 px-4 text-center text-xs" style={{ color: 'var(--text-primary)' }}>{row.relativity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis */}
      <div className="prose prose-invert max-w-none mb-12">
        <h2 className="text-display text-xl mb-3">Key Differences</h2>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          Rocket Lab is the more established and operationally proven company, with over 55 Electron launches and a growing Space Systems division that manufactures spacecraft components and complete satellite buses. Its 2021 SPAC listing on NASDAQ as RKLB gave it access to public capital markets, and its revenues have grown steadily toward $430M annually. The pivot to medium-lift with Neutron represents its next growth phase, targeting a reusable rocket competitive with Falcon 9 for constellation deployment.
        </p>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          Relativity Space took a fundamentally different bet: that additive manufacturing (3D printing) could reduce rocket production time from years to days and drastically cut part counts. Its Terran 1 small launcher was retired in 2023 after failing to reach orbit, and the company pivoted entirely to Terran R, a medium-lift fully reusable vehicle. While Relativity&apos;s manufacturing technology is genuinely innovative — its Stargate printers are among the largest metal 3D printers in the world — the company has yet to demonstrate an orbital mission, putting it significantly behind Rocket Lab in proven flight heritage.
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Track both companies with real-time data on SpaceNexus
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=rocket-lab&b=relativity-space" className="btn-primary text-sm">
            Interactive Comparison Tool
          </Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">
            Browse All 200+ Companies
          </Link>
        </div>
      </div>

      {/* Related Comparisons */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
            { title: 'Planet Labs vs Maxar', href: '/compare/planet-labs-vs-maxar' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">
              {c.title} →
            </Link>
          ))}
        </div>
      </div>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'Rocket Lab vs Relativity Space: Complete Comparison 2026',
            description: 'Side-by-side comparison of Rocket Lab and Relativity Space with data on launches, funding, manufacturing, and strategy.',
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
            datePublished: '2026-03-22',
            dateModified: '2026-03-22',
            url: 'https://spacenexus.us/compare/rocket-lab-vs-relativity-space',
          }).replace(/</g, '\\u003c'),
        }}
      />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/rocket-lab-vs-relativity-space']} />
      </div>
  );
}
