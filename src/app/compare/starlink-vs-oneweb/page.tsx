import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Starlink vs OneWeb: Complete Comparison 2026',
  description: 'Compare Starlink (SpaceX) and OneWeb (Eutelsat) LEO broadband constellations side by side — satellites deployed, coverage, latency, pricing, and subscribers. Updated data from SpaceNexus.',
  keywords: ['Starlink vs OneWeb', 'LEO broadband comparison', 'satellite internet comparison', 'Starlink vs Eutelsat OneWeb', 'low earth orbit internet'],
  openGraph: {
    title: 'Starlink vs OneWeb: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Starlink and OneWeb satellite internet constellations with real data on coverage, latency, pricing, and subscribers.',
    url: 'https://spacenexus.us/compare/starlink-vs-oneweb',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/starlink-vs-oneweb' },
};

const COMPARISON_DATA = [
  { metric: 'Operator', starlink: 'SpaceX (Starlink)', oneWeb: 'Eutelsat OneWeb (merged 2023)' },
  { metric: 'Parent Company', starlink: 'SpaceX', oneWeb: 'Eutelsat Group' },
  { metric: 'Service Launch', starlink: 'Public beta Oct 2020', oneWeb: 'Commercial service 2023' },
  { metric: 'Satellites Deployed', starlink: '6,000+ (as of early 2026)', oneWeb: '648 (Gen 1 complete)' },
  { metric: 'Total Constellation Planned', starlink: '~42,000 (FCC authorized)', oneWeb: '648 Gen 1 + Gen 2 TBD' },
  { metric: 'Orbital Altitude', starlink: '~340–570 km (Shell 1–5)', oneWeb: '~1,200 km' },
  { metric: 'Inter-Satellite Links (ISLs)', starlink: 'Yes (Gen 2 / V2 Mini+)', oneWeb: 'No (ground relay dependent)' },
  { metric: 'Subscribers', starlink: '4M+ (as of 2025)', oneWeb: 'Not publicly disclosed (B2B focus)' },
  { metric: 'Latency', starlink: '20–60 ms (typical)', oneWeb: '30–70 ms (typical)' },
  { metric: 'Download Speed', starlink: '50–250 Mbps (consumer)', oneWeb: '50–200 Mbps (enterprise)' },
  { metric: 'Pricing (Consumer)', starlink: '$120/mo (Residential, US)', oneWeb: 'Not offered direct-to-consumer' },
  { metric: 'Target Market', starlink: 'Consumer, enterprise, maritime, aviation, government', oneWeb: 'B2B enterprise, government, telecoms' },
  { metric: 'User Terminal Technology', starlink: 'Phased array (Starlink Dish)', oneWeb: 'Flat panel terminal (partner hardware)' },
  { metric: 'Polar / Arctic Coverage', starlink: 'Yes (polar shells)', oneWeb: 'Yes (inclination 87.9°)' },
];

export default function StarlinkVsOneWeb() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Starlink vs OneWeb</span>
        </nav>
        <h1 className="text-display text-3xl md:text-4xl mb-3">Starlink vs OneWeb</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl">
          A comprehensive side-by-side comparison of the two largest LEO broadband constellations, updated with the latest data from SpaceNexus.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Starlink</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>OneWeb</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2.5 px-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2.5 px-4 text-center text-xs" style={{ color: 'var(--text-primary)' }}>{row.starlink}</td>
                  <td className="py-2.5 px-4 text-center text-xs" style={{ color: 'var(--text-primary)' }}>{row.oneWeb}</td>
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
          Starlink is the dominant LEO broadband constellation by virtually every measure: satellite count (6,000+ vs. 648), subscriber base (4M+ vs. undisclosed B2B contracts), and consumer market reach. Its vertically integrated model — SpaceX builds both the rockets and the satellites — allows rapid, low-cost deployment. Starlink&apos;s Gen 2 satellites include inter-satellite laser links that enable routing data across the constellation without ground relays, reducing latency on long-distance routes. This capability is absent from OneWeb&apos;s Gen 1 design.
        </p>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          OneWeb, now operating under Eutelsat following a 2023 merger, targets the enterprise and government connectivity market rather than direct-to-consumer broadband. Its higher orbital altitude (~1,200 km vs. Starlink&apos;s ~550 km) provides broader coverage per satellite but adds latency. OneWeb benefits from Eutelsat&apos;s established relationships with telecom operators, governments, and maritime customers. The key competitive question for OneWeb is whether its Gen 2 constellation — whose design and timeline have not been formally announced — will be able to close the gap with Starlink&apos;s continued expansion.
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Track both constellations with real-time data on SpaceNexus
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/satellites?a=starlink&b=oneweb" className="btn-primary text-sm">
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
            { title: 'Rocket Lab vs Relativity Space', href: '/compare/rocket-lab-vs-relativity-space' },
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
            headline: 'Starlink vs OneWeb: Complete Comparison 2026',
            description: 'Side-by-side comparison of Starlink and OneWeb satellite internet constellations with data on coverage, latency, pricing, and subscribers.',
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
            datePublished: '2026-03-22',
            dateModified: '2026-03-22',
            url: 'https://spacenexus.us/compare/starlink-vs-oneweb',
          }).replace(/</g, '\\u003c'),
        }}
      />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/starlink-vs-oneweb']} />
      </div>
  );
}
