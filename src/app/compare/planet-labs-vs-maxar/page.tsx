import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Planet Labs vs Maxar Technologies: Complete Comparison 2026',
  description: 'Compare Planet Labs (PL) and Maxar Technologies side by side — constellation size, resolution, revenue, customers, data products, and business model. Updated data from SpaceNexus.',
  keywords: ['Planet Labs vs Maxar', 'earth observation comparison', 'PlanetScope vs WorldView', 'satellite imagery companies', 'geospatial data comparison'],
  openGraph: {
    title: 'Planet Labs vs Maxar Technologies: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Planet Labs and Maxar Technologies with real data on constellation size, resolution, revenue, and customers.',
    url: 'https://spacenexus.us/compare/planet-labs-vs-maxar',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/planet-labs-vs-maxar' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', planet: '2010', maxar: '2017 (via merger; SSL/DigitalGlobe histories to 1990s)' },
  { metric: 'Headquarters', planet: 'San Francisco, CA', maxar: 'Westminster, CO' },
  { metric: 'Public Status', planet: 'Public (NYSE: PL, SPAC 2021)', maxar: 'Taken private by Advent International (2023)' },
  { metric: 'Revenue (Annual)', planet: '~$220M (FY2025 est.)', maxar: '~$1.8B (before go-private)' },
  { metric: 'Primary Customers', planet: 'Government, agriculture, NGOs, finance, defense', maxar: 'U.S. government (NRO, NGA), defense, commercial' },
  { metric: 'Constellation Size', planet: '200+ active satellites (PlanetScope, SkySat)', maxar: '~10 high-resolution satellites (WorldView, GeoEye, Legion)' },
  { metric: 'Best Resolution', planet: '~50 cm (SkySat)', maxar: '~30 cm (WorldView-3, Legion)' },
  { metric: 'Revisit Rate', planet: 'Daily global (PlanetScope)', maxar: 'Less frequent per target (~1–4 days typical)' },
  { metric: 'Satellite Type', planet: 'CubeSat / small sats (mass-produced)', maxar: 'Large LEO satellites (custom, high-value)' },
  { metric: 'Acquisition History', planet: 'Acquired Terra Bella (from Google) 2017; BlackBridge 2015', maxar: 'Formed from DigitalGlobe + SSL + MDA + Radiant Solutions merger' },
  { metric: 'Data Products', planet: 'PlanetScope, SkySat, Planet Basemaps, Planetary Variables', maxar: 'WorldView imagery, Maxar ARD, SecureWatch, 3D surface data' },
  { metric: 'AI / Analytics Platform', planet: 'Planet Platform (APIs + analytics)', maxar: 'Maxar Intelligence (SecureWatch, GBDX successor)' },
];

export default function PlanetLabsVsMaxar() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Planet Labs vs Maxar</span>
        </nav>
        <h1 className="text-display text-3xl md:text-4xl mb-3">Planet Labs vs Maxar Technologies</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl">
          A comprehensive side-by-side comparison of two leading Earth observation companies, representing contrasting approaches to satellite imagery: high-frequency small-sat coverage vs. ultra-high-resolution large-format imaging.
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
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-left text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-tertiary)' }}>Metric</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Planet Labs</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Maxar Technologies</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.planet}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.maxar}</td>
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
          Planet Labs and Maxar represent two distinct philosophies in Earth observation. Planet operates the world&apos;s largest commercial Earth-imaging constellation by satellite count, with 200+ small satellites providing daily global coverage at 3–5 m resolution (PlanetScope) and 50 cm resolution on-demand (SkySat). Its model prioritizes temporal frequency — the ability to detect change anywhere on Earth every day — over raw resolution. This approach serves agriculture monitoring, deforestation tracking, financial intelligence, and broad-area change detection at scale.
        </p>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          Maxar (formerly DigitalGlobe) occupies the opposite end of the spectrum: a small fleet of large, expensive satellites delivering sub-30 cm native resolution imagery that is unmatched commercially. Maxar is the primary supplier of high-resolution satellite imagery to the U.S. government under EnhancedView and follow-on contracts with the NGA and NRO, giving it a reliable and large government revenue base. Taken private by Advent International in 2023, Maxar is now focused on building its Legion constellation of next-generation high-resolution satellites while continuing to operate its WorldView and GeoEye assets.
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Track both companies with real-time data on SpaceNexus
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=planet-labs&b=maxar" className="btn-primary text-sm">
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
            { title: 'Rocket Lab vs Relativity Space', href: '/compare/rocket-lab-vs-relativity-space' },
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
            headline: 'Planet Labs vs Maxar Technologies: Complete Comparison 2026',
            description: 'Side-by-side comparison of Planet Labs and Maxar Technologies with data on constellation size, resolution, revenue, and customers.',
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
            datePublished: '2026-03-22',
            dateModified: '2026-03-22',
            url: 'https://spacenexus.us/compare/planet-labs-vs-maxar',
          }).replace(/</g, '\\u003c'),
        }}
      />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/planet-labs-vs-maxar']} />
      </div>
  );
}
