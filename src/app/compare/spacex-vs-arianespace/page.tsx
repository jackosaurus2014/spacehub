import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2002', b: '1980 (Arianespace SA)' },
  { metric: 'Headquarters', a: 'Hawthorne, CA, USA', b: 'Evry-Courcouronnes, France' },
  { metric: 'Ownership', a: 'Private (Elon Musk majority)', b: 'ArianeGroup (Airbus/Safran JV), CNES, European shareholders' },
  { metric: 'Employees', a: '~13,000', b: '~1,300 (Arianespace) / ~8,000+ (ArianeGroup)' },
  { metric: 'Primary Launch Vehicle', a: 'Falcon 9 Block 5', b: 'Ariane 6 (A62 & A64 variants)' },
  { metric: 'Heavy Lift Vehicle', a: 'Falcon Heavy (63,800 kg to LEO)', b: 'Ariane 6 A64 (~21,650 kg to LEO)' },
  { metric: 'LEO Payload (Primary)', a: '22,800 kg (Falcon 9)', b: '~10,300 kg (A62) / ~21,650 kg (A64)' },
  { metric: 'GTO Payload', a: '8,300 kg (F9 RTLS) / 26,700 kg (FH)', b: '~4,500 kg (A62) / ~11,500 kg (A64)' },
  { metric: 'Reusability', a: 'Booster landing & reuse (200+ landings)', b: 'None (expendable); studying reusable demonstrators' },
  { metric: 'Launch Price (est.)', a: '~$67M (Falcon 9) / ~$97M (Falcon Heavy)', b: '~$77M (A62 est.) / ~$115M (A64 est.)' },
  { metric: 'Launch Site(s)', a: 'Cape Canaveral, Vandenberg, KSC LC-39A', b: 'Guiana Space Centre (Kourou), French Guiana' },
  { metric: 'Career Orbital Launches', a: '300+ (through early 2026)', b: '130+ (Ariane 5 era); Ariane 6 first flight July 2024' },
  { metric: '2024 Launches', a: '~134 (Falcon family)', b: '3 (Ariane 6 maiden + Vega + Vega-C; transition year)' },
  { metric: 'Government Customers', a: 'NASA, DoD, NRO, Space Force', b: 'ESA, EU Commission, French MoD, Galileo program' },
  { metric: 'Commercial Market Share (2024)', a: '~65% of global commercial launches', b: '~10% (rebuilding with Ariane 6 ramp-up)' },
  { metric: 'Constellation Role', a: 'Primary deployer for Starlink (6,000+ sats)', b: 'Selected for Amazon Kuiper; European institutional missions' },
  { metric: 'Upper Stage Restart', a: 'Merlin Vacuum (multiple restarts)', b: 'Vinci engine (A64, multiple restarts in-flight)' },
  { metric: 'Equatorial Advantage', a: 'No (mid-latitude sites)', b: 'Yes — Kourou at 5°N gives significant GTO performance boost' },
  { metric: 'Revenue (2024 est.)', a: '~$13B (launch + Starlink)', b: '~$1.3B (Arianespace launch services est.)' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'SpaceX vs Arianespace' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">SpaceX vs Arianespace</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceX vs Arianespace</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The dominant American commercial launch provider versus Europe&apos;s institutional launcher. SpaceX has reshaped the global launch market with reusability and cadence, while Arianespace is transitioning from the proven Ariane 5 to the new Ariane 6 to restore European autonomous access to space.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceX</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Arianespace</th>
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

      {/* Analysis: Market Dynamics */}
      <h2 className="text-display text-xl mb-3">Market Dynamics: Reusability Gap</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX&apos;s Falcon 9 reusability has fundamentally altered the economics of the launch industry. By reflying boosters dozens of times, SpaceX has driven per-launch costs down to levels that expendable vehicles cannot match. This cost advantage, combined with a launch cadence exceeding 100 flights per year, has allowed SpaceX to capture roughly 65% of the global commercial launch market as of 2024. Arianespace, which operated the highly reliable Ariane 5 for over 25 years (117 launches, 112 successes), retired that vehicle in July 2023 and spent much of 2024 transitioning to the new Ariane 6.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Ariane 6 conducted its maiden flight in July 2024 from the Guiana Space Centre. The A62 variant uses two solid rocket boosters and targets lighter payloads, while the A64 uses four boosters for heavier GTO missions. However, Ariane 6 is fully expendable, and its projected pricing remains higher than Falcon 9 for comparable missions. ESA and ArianeGroup are studying reusable launch concepts through programs like Themis and Prometheus, but an operational reusable European launcher is not expected before the early 2030s at the earliest.
      </p>

      {/* Analysis: Government Customers */}
      <h2 className="text-display text-xl mb-3">Government &amp; Institutional Customers</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Both companies rely heavily on government contracts, but in fundamentally different markets. SpaceX serves NASA (Crew Dragon, Cargo Dragon, HLS Starship), the U.S. Department of Defense (NSSL Phase 2 and 3), and intelligence agencies (NRO). Arianespace serves the European Space Agency (ESA), the European Commission (Galileo and Copernicus programs), and French military and government payloads. Europe&apos;s &ldquo;preference&rdquo; policy guarantees institutional payloads fly on European launchers, providing Arianespace a protected customer base that ensures baseline demand regardless of commercial competition.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The Kourou launch site at 5 degrees North latitude gives Arianespace a meaningful performance advantage for geostationary transfer orbit missions, as equatorial launches require less energy to reach GTO. This has historically made Arianespace the preferred choice for GEO satellite operators worldwide. However, as the satellite market shifts toward LEO mega-constellations and away from large GEO satellites, this geographic advantage matters less, and SpaceX&apos;s lower cost and higher cadence have drawn many former Arianespace customers to Falcon 9.
      </p>

      {/* Analysis: Future Outlook */}
      <h2 className="text-display text-xl mb-3">Future Outlook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        SpaceX continues to push toward Starship full operational capability, which would further widen the payload and cost gap. Meanwhile, Arianespace is ramping Ariane 6 production with a target of 6-9 launches per year by 2026-2027. Arianespace has secured an Amazon Kuiper deployment contract, but the majority of Kuiper satellites are being launched by competitors including Blue Origin and SpaceX. The European launch access crisis of 2023-2024 (the gap between Ariane 5 retirement and Ariane 6 operational flights) highlighted Europe&apos;s vulnerability and led to increased political support for accelerating European launch capabilities, including micro-launcher programs and eventual reusable vehicle development.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=spacex&b=arianespace" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs ULA', href: '/compare/spacex-vs-ula' },
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Rocket Lab vs SpaceX', href: '/compare/rocket-lab-vs-spacex' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/spacex-blue-origin-rocket-lab-comparison-2026" className="text-sm text-indigo-400 hover:text-indigo-300">SpaceX vs Blue Origin vs Rocket Lab: Launch Provider Comparison 2026</Link></li>
          <li><Link href="/guide/space-launch-cost-comparison" className="text-sm text-indigo-400 hover:text-indigo-300">Space Launch Cost Comparison 2026: Prices by Vehicle &amp; Provider</Link></li>
          <li><Link href="/compare/launch-vehicles" className="text-sm text-indigo-400 hover:text-indigo-300">Interactive Launch Vehicle Comparison Tool</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'SpaceX vs Arianespace: Launch Provider Comparison 2026',
        description: 'Side-by-side comparison of SpaceX and Arianespace covering vehicles, pricing, market share, and government customers.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/spacex-vs-arianespace',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/spacex-vs-arianespace']} />
    </div>
  );
}
