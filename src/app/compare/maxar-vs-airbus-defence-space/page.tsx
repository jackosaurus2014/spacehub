import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Maxar vs Airbus Defence & Space: Complete Comparison 2026',
  description: 'Compare Maxar Technologies and Airbus Defence & Space — Earth observation satellites, satellite manufacturing, imagery resolution, government contracts, and market position.',
  keywords: ['Maxar vs Airbus', 'Earth observation comparison', 'satellite imagery comparison', 'Maxar Technologies', 'Airbus Defence Space 2026'],
  openGraph: {
    title: 'Maxar vs Airbus Defence & Space: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Maxar Technologies and Airbus Defence & Space in Earth observation, satellite manufacturing, and defense.',
    url: 'https://spacenexus.us/compare/maxar-vs-airbus-defence-space',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/maxar-vs-airbus-defence-space' },
};

const COMPARISON_DATA = [
  { metric: 'Headquarters', a: 'Westminster, CO, USA', b: 'Leiden, Netherlands (Airbus DS HQ)' },
  { metric: 'Ownership', a: 'Private — acquired by Advent International 2023', b: 'Subsidiary of Airbus Group (listed)' },
  { metric: 'Primary Business Lines', a: 'Earth observation imagery, satellite manufacturing, geospatial services', b: 'Satellites, launchers support, defense electronics, space exploration' },
  { metric: 'Key EO Satellites', a: 'WorldView-1/2/3/4, WorldView Legion, GeoEye-1', b: 'Pléiades, Pléiades Neo, SPOT series' },
  { metric: 'Best Optical Resolution', a: '~15 cm (WorldView-3, commercial)', b: '~30 cm (Pléiades Neo)' },
  { metric: 'Imagery Archive', a: 'Largest commercial high-res archive (~100+ PB)', b: 'Extensive multispectral / optical archive' },
  { metric: 'Satellite Manufacturing', a: '1300-series GEO bus; WorldView spacecraft', b: 'Eurostar Neo GEO bus; Eurostar 3000' },
  { metric: 'GEO Communications Sats Built', a: '80+ (SSL heritage, rebranded Maxar)', b: '100+ (Eurostar family)' },
  { metric: 'Defense / Intelligence Customers', a: 'NRO (primary U.S. commercial imagery provider)', b: 'European defense agencies, NATO members' },
  { metric: 'Annual Revenue (approx.)', a: '~$1.8B (2022, before going private)', b: 'Airbus DS ~$11B+ (full division)' },
  { metric: 'Geospatial / Analytics', a: 'Maxar Intelligence (SecureWatch, ARD products)', b: 'Airbus Intelligence (OneAtlas, SPOT Maps)' },
  { metric: 'On-Orbit Robotics', a: 'MDA heritage; Canadarm2; OSAM-1 support', b: 'ERA robotic arm (ISS)' },
  { metric: 'Lunar / Deep Space', a: 'Power and Propulsion Element (PPE) for Gateway', b: 'Rosetta, Mars Express (historical)' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Maxar vs Airbus Defence &amp; Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Maxar vs Airbus Defence &amp; Space</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The two dominant Western providers of commercial high-resolution Earth observation imagery and GEO satellite manufacturing — comparing resolution, archives, government relationships, and satellite buses.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Maxar Technologies</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Airbus Defence &amp; Space</th>
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
        Maxar is the dominant commercial provider of sub-30 cm resolution satellite imagery to U.S. government intelligence agencies, primarily through its long-standing contracts with the National Reconnaissance Office. Its WorldView-3 satellite provides 31 cm panchromatic and 1.24 m multispectral resolution — among the highest commercially available. The company went private in 2023 after being acquired by Advent International, following financial difficulties partly driven by satellite losses and launch delays. Maxar&apos;s WorldView Legion constellation aims to dramatically increase revisit rates over key locations.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Airbus Defence &amp; Space operates at much larger scale as a division of Airbus Group, combining Earth observation (Pléiades Neo at 30 cm), satellite manufacturing (Eurostar Neo GEO bus), defense electronics, and space exploration programs. Pléiades Neo offers daily revisit capability globally. Airbus DS is the primary satellite bus supplier to many European government and commercial operators. Unlike Maxar, Airbus DS has a diverse revenue base that is less dependent on any single imagery contract, including launch services support through Arianespace relationships.
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
            { title: 'Planet Labs vs Maxar', href: '/compare/planet-labs-vs-maxar' },
            { title: 'Boeing Space vs Lockheed Martin Space', href: '/compare/boeing-vs-lockheed-space' },
            { title: 'Northrop Grumman vs L3Harris Space', href: '/compare/northrop-grumman-vs-l3harris-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Maxar vs Airbus Defence & Space: Complete Comparison 2026',
        description: 'Side-by-side comparison of Maxar Technologies and Airbus Defence & Space in Earth observation, satellite manufacturing, and defense.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/maxar-vs-airbus-defence-space',
      }).replace(/</g, '\\u003c') }} />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/maxar-vs-airbus-defence-space']} />
      </div>
  );
}
