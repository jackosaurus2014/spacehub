import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Iridium vs Globalstar: Complete Comparison 2026',
  description: 'Compare Iridium and Globalstar satellite communication constellations — coverage, voice/data services, subscribers, satellite count, and use cases including emergency messaging and IoT.',
  keywords: ['Iridium vs Globalstar', 'satellite phone comparison', 'satellite communication constellation', 'Iridium NEXT', 'Globalstar satellite network 2026'],
  openGraph: {
    title: 'Iridium vs Globalstar: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Iridium and Globalstar satellite communication constellations.',
    url: 'https://spacenexus.us/compare/iridium-vs-globalstar',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/iridium-vs-globalstar' },
};

const COMPARISON_DATA = [
  { metric: 'Headquarters', a: 'McLean, VA', b: 'Covington, LA' },
  { metric: 'Publicly Traded', a: 'Yes (IRDM, Nasdaq)', b: 'Yes (GSAT, Nasdaq)' },
  { metric: 'Constellation Generation', a: 'Iridium NEXT (2nd gen, 2017–2019)', b: 'Second-generation (launched 2010–2013)' },
  { metric: 'Satellites in Constellation', a: '66 operational + 9 spares (LEO)', b: '24 operational + spares (LEO)' },
  { metric: 'Orbital Altitude', a: '~780 km (LEO)', b: '~1,414 km (LEO)' },
  { metric: 'Coverage', a: 'True global (pole to pole)', b: 'Global except polar regions (~70° lat)' },
  { metric: 'Inter-Satellite Links', a: 'Yes — full ISL mesh network', b: 'No — ground station dependent' },
  { metric: 'Voice / Data Service', a: 'Satellite phone, PTT, data (2.4 kbps SBD; Iridium Certus up to 704 kbps)', b: 'Satellite phone, simplex data, Duplex service (up to 256 kbps)' },
  { metric: 'Primary Consumer Device Partner', a: 'None (own hardware ecosystem)', b: 'Apple — iPhone Emergency SOS via Globalstar (since 2022)' },
  { metric: 'Apple Emergency SOS', a: 'No — Apple uses Globalstar', b: 'Yes — primary network for Apple Emergency SOS' },
  { metric: 'IoT / M2M Services', a: 'Iridium SBD, Certus IoT', b: 'SPOT, SmartOne, satellite IoT' },
  { metric: 'Revenue (approx. 2024)', a: '~$800M', b: '~$230M' },
  { metric: 'Bankruptcy History', a: 'Filed 1999; emerged 2001; re-launched', b: 'Filed 2011; emerged 2012; restructured' },
  { metric: 'Next-Gen Constellation Plans', a: 'No announced replacement (Iridium NEXT sufficient)', b: 'Exploring Gen 3 / capacity expansion' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Iridium vs Globalstar</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Iridium vs Globalstar</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The two pioneer satellite phone and messaging constellations — comparing coverage, network architecture, data speeds, subscriber base, and modern use cases including Apple Emergency SOS.
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
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-left text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-tertiary)' }}>Metric</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Iridium</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Globalstar</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.a}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis */}
      <h2 className="text-display text-xl mb-3">Key Differences</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Iridium&apos;s defining technical advantage is its 66-satellite mesh network with full inter-satellite links, enabling true pole-to-pole global coverage without reliance on ground stations. A call routed over Iridium can traverse the entire globe via satellite links alone. This makes Iridium the preferred choice for polar operations, maritime, aviation, and military users who need reliable coverage anywhere on Earth. The Iridium NEXT constellation, completed in 2019, added the Certus service offering data speeds up to 704 kbps — a dramatic improvement over first-generation Iridium&apos;s 2.4 kbps.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Globalstar gained significant commercial visibility when Apple selected it as the network backbone for iPhone Emergency SOS via Satellite starting with iPhone 14 (2022). This partnership provided a major revenue boost and consumer awareness for a company that had historically served a more niche market. However, Globalstar&apos;s bent-pipe architecture (no ISLs) limits it to areas covered by ground stations, creating coverage gaps at high latitudes. Globalstar&apos;s SPOT satellite messenger products serve a large recreational and outdoor safety market, while IoT/M2M services represent a growing segment for both companies.
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
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
            { title: 'Starlink vs Project Kuiper', href: '/compare/starlink-vs-kuiper' },
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Iridium vs Globalstar: Complete Comparison 2026',
        description: 'Side-by-side comparison of Iridium and Globalstar satellite communication constellations.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/iridium-vs-globalstar',
      }).replace(/</g, '\\u003c') }} />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/iridium-vs-globalstar']} />
      </div>
  );
}
