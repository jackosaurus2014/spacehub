import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2014', b: '2016' },
  { metric: 'Founder(s)', a: 'Rafal Modrzewski, Pekka Laurila', b: 'Payam Banazadeh, Timon Ruban' },
  { metric: 'Headquarters', a: 'Espoo, Finland (with U.S. offices)', b: 'San Francisco, CA' },
  { metric: 'Employees', a: '~800+', b: '~300+' },
  { metric: 'Total Funding', a: '~$600M+', b: '~$370M+' },
  { metric: 'Valuation', a: 'Private (est. $1B+)', b: 'Private (est. $800M+)' },
  { metric: 'Technology', a: 'X-band SAR (synthetic aperture radar)', b: 'X-band SAR (synthetic aperture radar)' },
  { metric: 'Satellites in Orbit', a: '30+ SAR microsatellites', b: '10+ SAR satellites (Acadia generation)' },
  { metric: 'Satellite Mass', a: '~85-100 kg (microsatellite class)', b: '~112 kg (Acadia generation)' },
  { metric: 'Best Resolution (Spotlight)', a: '25 cm', b: '25 cm (Acadia)' },
  { metric: 'Strip Map Resolution', a: '3 m', b: '0.8 m (Acadia sliding spotlight)' },
  { metric: 'Imaging Modes', a: 'Spotlight, Strip, Scan, SLEA (wide-area)', b: 'Spotlight, Sliding Spotlight, Strip Map' },
  { metric: 'Revisit Rate', a: 'Multiple times per day (30+ sat constellation)', b: 'Sub-daily (growing constellation)' },
  { metric: 'Key Advantage: SAR', a: 'Largest commercial SAR constellation — faster revisit', b: 'High-resolution imagery with smaller constellation; rapid tasking' },
  { metric: 'Day/Night/Weather', a: 'Yes — SAR operates in all conditions', b: 'Yes — SAR operates in all conditions' },
  { metric: 'Defense Customers', a: 'Ukrainian MoD, NATO countries, U.S. DoD, UK MoD', b: 'U.S. DoD, NRO, NGA, U.S. Air Force' },
  { metric: 'Commercial Verticals', a: 'Insurance, maritime, natural catastrophe monitoring', b: 'Energy, mining, maritime, infrastructure monitoring' },
  { metric: 'Insurance Market', a: 'Major focus — flood, windstorm, wildfire damage assessment for insurers', b: 'Growing presence in infrastructure monitoring' },
  { metric: 'Government Contracts', a: 'Multiple NATO country defense contracts; Ukrainian defense intelligence', b: 'NRO SaaS study contracts; U.S. defense and intelligence agencies' },
  { metric: 'Manufacturing', a: 'In-house satellite manufacturing (Finland, Poland)', b: 'In-house manufacturing (San Francisco Bay Area)' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'ICEYE vs Capella Space' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">ICEYE vs Capella Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">ICEYE vs Capella Space</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The two leading commercial SAR (synthetic aperture radar) satellite operators. Both build and operate constellations of small SAR satellites that can image the Earth day or night, through clouds and weather. ICEYE leads in constellation size from its Finnish base, while Capella Space pushes resolution boundaries from San Francisco.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>ICEYE</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Capella Space</th>
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

      {/* SAR Technology */}
      <h2 className="text-display text-xl mb-3">SAR Technology: Why Radar Matters</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Unlike optical satellites (Planet, Maxar, BlackSky), SAR satellites transmit their own microwave signals and capture the reflections, creating imagery regardless of daylight, cloud cover, or weather conditions. This makes SAR uniquely valuable for applications where persistent monitoring is critical: maritime surveillance (detecting ships in all weather), disaster response (imaging through smoke and clouds), ground deformation monitoring (subsidence, earthquakes), and defense intelligence (detecting changes at military installations regardless of conditions).
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both ICEYE and Capella operate X-band SAR satellites and have achieved 25 cm spotlight resolution, matching or exceeding many larger government SAR systems. The key differentiator between them is constellation scale versus imagery sophistication: ICEYE&apos;s 30+ satellite constellation provides the best revisit rates in commercial SAR, while Capella&apos;s newer Acadia-generation satellites push the boundaries of image quality with advanced modes and sub-meter strip map resolution.
      </p>

      {/* Market Segments */}
      <h2 className="text-display text-xl mb-3">Market Segments &amp; Customers</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        ICEYE has carved out a distinctive position in the insurance industry, providing near-real-time flood extent mapping, windstorm damage assessment, and wildfire perimeter monitoring. Major reinsurers and insurers use ICEYE data to accelerate claims processing and catastrophe modeling. On the defense side, ICEYE gained significant visibility through its partnership with the Ukrainian Ministry of Defence, providing SAR intelligence for battlefield awareness &mdash; a high-profile demonstration of commercial SAR&apos;s defense utility. ICEYE also serves NATO countries, the UK MoD, and other allied defense agencies.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Capella Space has focused heavily on U.S. defense and intelligence customers, securing contracts with the NRO, NGA, and U.S. Air Force. Capella was selected for the NRO&apos;s commercial SAR satellite-as-a-service study contracts, positioning it as a key radar data provider for the U.S. intelligence community. On the commercial side, Capella serves energy companies (pipeline and infrastructure monitoring), mining operations, and maritime tracking customers. Capella&apos;s U.S. headquarters and security clearances give it an advantage for classified U.S. government work compared to ICEYE&apos;s Finnish base.
      </p>

      {/* Future Outlook */}
      <h2 className="text-display text-xl mb-3">Future Outlook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The commercial SAR market is expected to grow significantly as governments and enterprises increasingly recognize the value of all-weather, day-night imaging. ICEYE&apos;s advantage is its constellation scale &mdash; more satellites mean faster revisit, which is critical for time-sensitive applications like disaster response and military intelligence. Capella&apos;s advantage is its technology edge and U.S. defense positioning &mdash; the Acadia generation represents some of the most capable commercial SAR satellites ever built. Both companies face competition from national SAR programs (Germany&apos;s TerraSAR-X, Italy&apos;s COSMO-SkyMed, Japan&apos;s ALOS-2) and emerging competitors like Umbra and Synspective. The winners in commercial SAR will be those who combine high-quality radar data with analytics platforms that deliver actionable insights, not just raw imagery.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=iceye&b=capella-space" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'BlackSky vs Planet Labs', href: '/compare/blacksky-vs-planet-labs' },
            { title: 'Planet Labs vs Maxar', href: '/compare/planet-labs-vs-maxar' },
            { title: 'Maxar vs Airbus Defence & Space', href: '/compare/maxar-vs-airbus-defence-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'ICEYE vs Capella Space: SAR Satellite Comparison 2026',
        description: 'Side-by-side comparison of ICEYE and Capella Space covering SAR satellite technology, resolution, constellation size, defense contracts, and market outlook.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-25', dateModified: '2026-03-25',
        url: 'https://spacenexus.us/compare/iceye-vs-capella-space',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/iceye-vs-capella-space']} />
    </div>
  );
}
