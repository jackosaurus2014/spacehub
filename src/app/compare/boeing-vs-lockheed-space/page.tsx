import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Boeing Space vs Lockheed Martin Space: Complete Comparison 2026',
  description: 'Compare Boeing Space and Lockheed Martin Space divisions — defense contracts, revenue, programs, satellites, human spaceflight, and strategic direction.',
  keywords: ['Boeing Space vs Lockheed Martin', 'Boeing defense space', 'Lockheed Martin space', 'defense prime comparison', 'ULA Boeing Lockheed'],
  openGraph: {
    title: 'Boeing Space vs Lockheed Martin Space: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Boeing and Lockheed Martin space divisions covering programs, contracts, revenue, and strategy.',
    url: 'https://spacenexus.us/compare/boeing-vs-lockheed-space',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/boeing-vs-lockheed-space' },
};

const COMPARISON_DATA = [
  { metric: 'Parent Company', a: 'The Boeing Company (BA)', b: 'Lockheed Martin Corporation (LMT)' },
  { metric: 'Space Division', a: 'Boeing Defense, Space & Security (BDS)', b: 'Lockheed Martin Space' },
  { metric: 'Space Revenue (approx.)', a: '~$6–7B/yr (BDS segment incl. defense)', b: '~$11–12B/yr (Space segment)' },
  { metric: 'Launch Joint Venture (Former)', a: 'ULA (sold 2024 — acquired by Cerberus Capital / Blue Origin interests)', b: 'ULA (sold 2024 — acquired by Cerberus Capital / Blue Origin interests)' },
  { metric: 'Human Spaceflight', a: 'CST-100 Starliner (commercial crew)', b: 'Orion Multi-Purpose Crew Vehicle (Artemis)' },
  { metric: 'Key Satellite Programs', a: 'GPS III, X-37B (OTV), WGS', b: 'GPS III (prime), SBIRS, Next Gen OPIR' },
  { metric: 'Missile Defense', a: 'Ground-Based Midcourse Defense (GMD)', b: 'THAAD, Aegis (in part)' },
  { metric: 'ISS Role', a: 'Prime contractor for ISS structure', b: 'Key systems / modules contractor' },
  { metric: 'NASA Artemis Role', a: 'SLS core stage prime contractor', b: 'Orion spacecraft prime contractor' },
  { metric: 'Commercial Satellite Bus', a: 'Boeing 702 / 601 GEO bus', b: 'A2100 GEO bus; LM 2100' },
  { metric: 'Space Exploration Programs', a: 'SLS core stage; Starliner', b: 'Orion; Mars missions heritage (Viking, etc.)' },
  { metric: 'Headquarters (Space Ops)', a: 'Huntington Beach, CA; Tukwila, WA', b: 'Littleton, CO' },
  { metric: 'Notable Recent Challenge', a: 'Starliner crewed test delays and anomalies', b: 'Orion heat shield anomaly on Artemis I' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Boeing Space vs Lockheed Martin Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Boeing Space vs Lockheed Martin Space</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two of the largest defense and space primes in the world — comparing their space divisions across human spaceflight, satellite programs, NASA contracts, and strategic priorities.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Boeing Space</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Lockheed Martin Space</th>
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
        Both Boeing and Lockheed Martin are legacy defense primes with deep roots in government space programs. They formerly shared 50/50 ownership of United Launch Alliance (ULA), which was acquired by Cerberus Capital Management and Blue Origin interests in 2024. Lockheed Martin Space tends to generate higher space-specific revenue thanks to the Orion spacecraft, GPS III constellation, and missile warning satellite programs (SBIRS, Next Gen OPIR). Its Space segment is also more clearly delineated as a standalone business unit, while Boeing&apos;s space work is embedded within the broader Defense, Space &amp; Security segment.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Boeing&apos;s CST-100 Starliner program has faced persistent delays and technical challenges, including a 2024 crewed test flight where helium leaks and thruster anomalies led NASA to return the crew on SpaceX Crew Dragon instead. Lockheed&apos;s Orion capsule flew successfully on Artemis I (uncrewed, 2022) and Artemis II (crewed, 2025) but encountered a heat shield ablation issue on Artemis I that required investigation. Both primes face increasing pressure from new entrants like SpaceX in areas where traditional cost-plus contracting models are being challenged.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies on SpaceNexus</p>
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
            { title: 'SpaceX vs ULA', href: '/compare/spacex-vs-ula' },
            { title: 'Northrop Grumman vs L3Harris Space', href: '/compare/northrop-grumman-vs-l3harris-space' },
            { title: 'Maxar vs Airbus Defence Space', href: '/compare/maxar-vs-airbus-defence-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Boeing Space vs Lockheed Martin Space: Complete Comparison 2026',
        description: 'Side-by-side comparison of Boeing and Lockheed Martin space divisions covering programs, contracts, revenue, and strategy.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/boeing-vs-lockheed-space',
      }).replace(/</g, '\\u003c') }} />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/boeing-vs-lockheed-space']} />
      </div>
  );
}
