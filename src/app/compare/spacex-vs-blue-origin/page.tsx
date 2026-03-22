import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SpaceX vs Blue Origin: Complete Comparison 2026',
  description: 'Compare SpaceX and Blue Origin side by side — launch vehicles, funding, missions, employees, satellites, and strategy. Updated data from SpaceNexus intelligence platform.',
  keywords: ['SpaceX vs Blue Origin', 'SpaceX comparison', 'Blue Origin comparison', 'space company comparison', 'rocket companies compared'],
  openGraph: {
    title: 'SpaceX vs Blue Origin: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SpaceX and Blue Origin with real data on launches, funding, employees, and strategy.',
    url: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spacex-vs-blue-origin' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', spacex: '2002', blueOrigin: '2000' },
  { metric: 'Founder', spacex: 'Elon Musk', blueOrigin: 'Jeff Bezos' },
  { metric: 'Headquarters', spacex: 'Hawthorne, CA', blueOrigin: 'Kent, WA' },
  { metric: 'Employees', spacex: '~13,000', blueOrigin: '~10,000' },
  { metric: 'Total Funding', spacex: '~$10B+', blueOrigin: '~$13B+ (mostly Bezos)' },
  { metric: 'Valuation', spacex: '~$180B (2024)', blueOrigin: 'Private (est. $30B+)' },
  { metric: 'Primary Vehicle', spacex: 'Falcon 9 / Starship', blueOrigin: 'New Glenn / New Shepard' },
  { metric: 'Orbital Launches (Career)', spacex: '300+', blueOrigin: '1 (New Glenn, 2025)' },
  { metric: 'Reusability', spacex: 'Falcon 9 booster (200+ landings)', blueOrigin: 'New Shepard suborbital' },
  { metric: 'LEO Payload Capacity', spacex: '22,800 kg (F9) / 150,000 kg (Starship)', blueOrigin: '45,000 kg (New Glenn)' },
  { metric: 'Constellation', spacex: 'Starlink (6,000+ sats)', blueOrigin: 'Project Kuiper (planned 3,236)' },
  { metric: 'Crewed Missions', spacex: 'Crew Dragon (12+ missions)', blueOrigin: 'New Shepard (6 crewed flights)' },
  { metric: 'NASA Contracts', spacex: 'HLS, CRS, Crew, Mars', blueOrigin: 'Artemis sustaining lander' },
  { metric: 'Revenue Model', spacex: 'Launch services + Starlink', blueOrigin: 'Launch services + Kuiper' },
  { metric: 'Public/Private', spacex: 'Private (IPO of Starlink possible)', blueOrigin: 'Private' },
];

export default function SpaceXVsBlueOrigin() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">SpaceX vs Blue Origin</span>
        </nav>
        <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceX vs Blue Origin</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl">
          A comprehensive side-by-side comparison of the two most prominent private space companies, updated with the latest data from SpaceNexus.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceX</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Blue Origin</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2.5 px-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2.5 px-4 text-center text-xs" style={{ color: 'var(--text-primary)' }}>{row.spacex}</td>
                  <td className="py-2.5 px-4 text-center text-xs" style={{ color: 'var(--text-primary)' }}>{row.blueOrigin}</td>
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
          SpaceX leads in operational scale with 300+ orbital launches and the operational Starlink constellation generating billions in annual revenue. Blue Origin, despite being founded two years earlier, achieved its first orbital launch (New Glenn) in 2025 and is focused on building the foundation for a long-term space economy.
        </p>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          SpaceX&apos;s Starship represents the largest launch vehicle ever built, while Blue Origin&apos;s New Glenn targets the commercial and government launch market as a heavy-lift competitor to Falcon 9 and Falcon Heavy. Both companies are building LEO broadband constellations (Starlink vs. Project Kuiper).
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Track both companies with real-time data on SpaceNexus
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=spacex&b=blue-origin" className="btn-primary text-sm">
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
            { title: 'Rocket Lab vs Relativity Space', href: '/compare/rocket-lab-vs-relativity-space' },
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
            headline: 'SpaceX vs Blue Origin: Complete Comparison 2026',
            description: 'Side-by-side comparison of SpaceX and Blue Origin with data on launches, funding, employees, and strategy.',
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
            datePublished: '2026-03-22',
            dateModified: '2026-03-22',
            url: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
          }).replace(/</g, '\\u003c'),
        }}
      />
    </div>
  );
}
