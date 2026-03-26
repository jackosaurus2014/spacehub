import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '1986', b: '1985 (as SES Astra)' },
  { metric: 'Headquarters', a: 'Carlsbad, CA, USA', b: 'Betzdorf, Luxembourg' },
  { metric: 'Publicly Traded', a: 'Yes (VSAT, Nasdaq)', b: 'Yes (SES, Euronext Paris)' },
  { metric: 'Revenue (FY 2024)', a: '~$4.4B (post-Inmarsat integration)', b: '~$2.1B (pre-Intelsat consolidation)' },
  { metric: 'Employees', a: '~7,000+', b: '~2,300 (pre-Intelsat); ~5,000+ combined' },
  { metric: 'Market Cap (early 2026)', a: '~$3B', b: '~$5B (EUR)' },
  { metric: 'Major Acquisition', a: 'Inmarsat (completed May 2023, ~$7.3B)', b: 'Intelsat (completed March 2025, ~$3.1B)' },
  { metric: 'GEO Satellites', a: '~19 GEO satellites (Viasat + Inmarsat fleet)', b: '50+ GEO satellites (SES + Intelsat combined)' },
  { metric: 'MEO Constellation', a: 'None', b: 'O3b mPOWER (11 satellites, MEO, high throughput)' },
  { metric: 'Next-Gen Fleet', a: 'ViaSat-3 constellation (3 ultra-high-capacity GEO satellites)', b: 'O3b mPOWER (MEO) + SES-17, SES-22, SES-26 (GEO HTS)' },
  { metric: 'Total Capacity', a: '~1 Tbps+ (ViaSat-3 Americas launched 2023)', b: '~1+ Tbps across GEO + MEO fleet' },
  { metric: 'Orbit Strategy', a: 'GEO ultra-high-capacity + L-band (Inmarsat)', b: 'Multi-orbit: GEO wide-beam + MEO high-throughput (O3b)' },
  { metric: 'Aviation IFC', a: 'Major provider — United, JetBlue, Delta (via Inmarsat GX)', b: 'Growing presence; SES-17 supports aviation HTS' },
  { metric: 'Maritime', a: 'Strong — Inmarsat Fleet Xpress is leading maritime broadband', b: 'Growing via O3b mPOWER and GEO cruise ship connectivity' },
  { metric: 'Government / Defense', a: 'Large defense segment; Inmarsat Global Xpress for military SATCOM', b: 'Significant U.S. DoD and NATO contracts; SES GS (government solutions)' },
  { metric: 'Consumer Broadband', a: 'Viasat residential internet (U.S., primarily rural)', b: 'Not a primary focus (enterprise/government oriented)' },
  { metric: 'L-band Services', a: 'Yes — Inmarsat L-band for safety, GMDSS, cockpit safety', b: 'No — Ku/Ka/C-band focus' },
  { metric: 'Video/Broadcast', a: 'Minimal (connectivity-focused)', b: 'Major video distribution business; 8,000+ TV channels globally' },
  { metric: 'C-band Spectrum (U.S.)', a: 'Not applicable', b: '$3.8B in accelerated C-band clearing payments from FCC (for 5G)' },
  { metric: 'Integration Challenge', a: 'Merging Inmarsat heritage systems, dual HQ (Carlsbad + London)', b: 'Merging Intelsat fleet, workforce, and customer contracts' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Viasat vs SES' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Viasat vs SES</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Viasat vs SES</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two satellite communications giants, both transformed by major acquisitions. Viasat acquired Inmarsat for $7.3 billion (2023), gaining the world&apos;s leading maritime and aviation L-band/Ka-band network. SES acquired Intelsat for $3.1 billion (2025), creating the largest GEO satellite operator with a unique multi-orbit strategy. Both are navigating complex integrations while competing for aviation, maritime, and government connectivity markets.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Viasat</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SES</th>
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

      {/* Merger Impact */}
      <h2 className="text-display text-xl mb-3">Transformative Acquisitions</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Viasat&apos;s $7.3 billion acquisition of Inmarsat, completed in May 2023, was one of the largest satellite industry deals in history. Inmarsat brought decades of maritime and aviation connectivity leadership, its Global Xpress Ka-band network, and the irreplaceable L-band spectrum used for global safety services (GMDSS) and cockpit communications. The combined company operates approximately 19 GEO satellites and has the most extensive aviation and maritime connectivity customer base in the industry. However, integration has been complex &mdash; Viasat took on significant debt and has been working to realize synergies between its U.S.-based broadband operations and Inmarsat&apos;s London-headquartered global mobility business.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        SES completed its acquisition of Intelsat in March 2025 for approximately $3.1 billion, creating the world&apos;s largest GEO satellite fleet with over 50 satellites. The deal also combined two of the most established names in satellite communications &mdash; SES (founded 1985) and Intelsat (founded 1964, the original international satellite consortium). SES&apos;s unique advantage is its multi-orbit strategy: the O3b mPOWER MEO constellation delivers fiber-like latency and high throughput, complementing the wide-area coverage of GEO satellites. SES also received $3.8 billion in FCC payments for clearing C-band spectrum for terrestrial 5G, providing significant cash flow during the integration period.
      </p>

      {/* Market Segments */}
      <h2 className="text-display text-xl mb-3">Key Markets: Aviation, Maritime, Government</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Aviation in-flight connectivity (IFC) is a critical battleground. Viasat (via Inmarsat&apos;s GX Aviation) provides connectivity to airlines including Qatar Airways, Lufthansa, and Singapore Airlines. Viasat&apos;s own IFC terminals serve United Airlines, JetBlue, and others. The combined fleet gives Viasat the largest aviation SATCOM footprint globally. SES is a growing challenger, with SES-17 and its O3b mPOWER constellation offering high-throughput connectivity for airline IFC, though its installed base is smaller than Viasat/Inmarsat&apos;s.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        In maritime, Inmarsat&apos;s Fleet Xpress has long been the industry standard for commercial shipping broadband and safety communications. Viasat&apos;s ownership of this franchise gives it a dominant position in maritime SATCOM. SES competes through O3b mPOWER for cruise lines and high-bandwidth maritime users. Government and defense is significant for both: Viasat&apos;s defense segment provides secure military SATCOM (leveraging Inmarsat Global Xpress), while SES Government Solutions (SES GS) has deep relationships with the U.S. DoD and NATO for both GEO and MEO capacity. SES&apos;s unique video distribution business &mdash; delivering over 8,000 TV channels globally &mdash; provides a revenue base that Viasat lacks.
      </p>

      {/* Technology Roadmap */}
      <h2 className="text-display text-xl mb-3">Technology &amp; Fleet Evolution</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Viasat&apos;s ViaSat-3 program represents its next-generation technology bet: three ultra-high-capacity GEO satellites, each delivering over 1 Tbps of capacity. The first ViaSat-3 (Americas) launched in April 2023 but experienced a reflector deployment anomaly that reduced its capacity. ViaSat-3 EMEA and APAC satellites are expected to follow. If fully deployed, the ViaSat-3 constellation would give Viasat some of the highest per-satellite capacity in orbit. SES&apos;s technology advantage is its multi-orbit architecture: O3b mPOWER&apos;s 11 MEO satellites provide low-latency (~150 ms round-trip vs ~600 ms for GEO), high-throughput connectivity that GEO alone cannot match. This is particularly valuable for enterprise, government, and mobility applications where latency matters. SES is the only major satellite operator with a production MEO constellation, giving it a structural advantage as customers increasingly demand lower latency alongside broad coverage.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=viasat&b=ses" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Iridium vs Globalstar', href: '/compare/iridium-vs-globalstar' },
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
            { title: 'Starlink vs AST SpaceMobile', href: '/compare/starlink-vs-ast-spacemobile' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Viasat vs SES: Satellite Communications Comparison 2026',
        description: 'Side-by-side comparison of Viasat and SES covering satellite fleets, revenue, post-merger integrations (Inmarsat and Intelsat), aviation, maritime, and government markets.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-25', dateModified: '2026-03-25',
        url: 'https://spacenexus.us/compare/viasat-vs-ses',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/viasat-vs-ses']} />
    </div>
  );
}
