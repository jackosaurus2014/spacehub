import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Starlink vs Project Kuiper: Complete Comparison 2026',
  description: 'Compare Starlink (SpaceX) and Project Kuiper (Amazon) LEO broadband constellations — satellites deployed, coverage, latency, pricing, launch strategy, and market approach.',
  keywords: ['Starlink vs Kuiper', 'Project Kuiper vs Starlink', 'Amazon satellite internet', 'LEO broadband comparison', 'satellite internet 2026'],
  openGraph: {
    title: 'Starlink vs Project Kuiper: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Starlink and Amazon Project Kuiper satellite internet constellations.',
    url: 'https://spacenexus.us/compare/starlink-vs-kuiper',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/starlink-vs-kuiper' },
};

const COMPARISON_DATA = [
  { metric: 'Operator', a: 'SpaceX (Starlink)', b: 'Amazon (Project Kuiper)' },
  { metric: 'Service Start', a: 'Public beta Oct 2020; full service 2021', b: 'Prototype tests 2023; commercial 2025' },
  { metric: 'Satellites in Orbit (early 2026)', a: '6,000+', b: '~30 (prototype KuiperSat + initial batch)' },
  { metric: 'Total Constellation Authorized', a: '~42,000 (FCC Gen 1 + Gen 2)', b: '3,236 (FCC licensed)' },
  { metric: 'Orbital Altitude', a: '~340–570 km', b: '~590–630 km' },
  { metric: 'Inter-Satellite Links', a: 'Yes (laser ISLs on V2 satellites)', b: 'Yes (planned on production satellites)' },
  { metric: 'Launch Provider', a: 'SpaceX (Falcon 9 / Starship)', b: 'ULA Vulcan, Blue Origin New Glenn, Arianespace' },
  { metric: 'Subscribers', a: '4M+ (as of 2025)', b: 'Not yet commercially available at scale' },
  { metric: 'Typical Latency', a: '20–60 ms', b: 'Target <30 ms (per Amazon specs)' },
  { metric: 'Download Speed (target)', a: '50–250 Mbps (consumer)', b: 'Up to 400 Mbps (per Amazon claims)' },
  { metric: 'User Terminal', a: 'Starlink dish (phased array)', b: 'Amazon-designed phased array terminal' },
  { metric: 'Consumer Pricing (US)', a: '$120/mo (Residential)', b: 'Not yet announced' },
  { metric: 'Parent Company Market Cap', a: 'SpaceX private (~$350B+ est. 2026)', b: 'Amazon ~$2T+ (AMZN)' },
  { metric: 'FCC Deployment Deadline', a: 'N/A (ongoing expansion)', b: '50% deployed by 2026; 100% by 2029' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Starlink vs Project Kuiper</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Starlink vs Project Kuiper</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The dominant incumbent LEO broadband network versus Amazon&apos;s well-funded challenger — comparing constellation scale, technical approach, pricing, and commercial readiness.
      </p>

      {/* Terminal table */}
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Starlink</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Project Kuiper</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2.5 px-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2.5 px-4 text-center text-xs" style={{ color: 'var(--text-primary)' }}>{row.a}</td>
                  <td className="py-2.5 px-4 text-center text-xs" style={{ color: 'var(--text-primary)' }}>{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis */}
      <h2 className="text-display text-xl mb-3">Key Differences</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Starlink holds a commanding first-mover advantage with over 6,000 satellites in orbit and 4 million subscribers generating significant recurring revenue. SpaceX&apos;s vertical integration — building both rockets and satellites — gives it a structural cost advantage that no other operator can easily replicate. Starlink has demonstrated real-world performance across consumer, enterprise, maritime, aviation, and government segments.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Project Kuiper is backed by Amazon&apos;s balance sheet and benefits from integration with AWS cloud infrastructure, which may give it an advantage in enterprise and government cloud-connectivity use cases. Amazon has secured launch capacity across multiple providers (ULA Vulcan, Blue Origin New Glenn, Arianespace) to diversify risk. Kuiper faces an FCC-mandated deployment schedule requiring 50% of its 3,236-satellite constellation to be operational by mid-2026, creating significant near-term execution pressure.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both constellations on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
            { title: 'Iridium vs Globalstar', href: '/compare/iridium-vs-globalstar' },
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Starlink vs Project Kuiper: Complete Comparison 2026',
        description: 'Side-by-side comparison of Starlink and Amazon Project Kuiper satellite internet constellations.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/starlink-vs-kuiper',
      }).replace(/</g, '\\u003c') }} />
    </div>
  );
}
