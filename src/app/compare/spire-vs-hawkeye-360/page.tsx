import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2012', b: '2015' },
  { metric: 'Headquarters', a: 'Vienna, VA (moved from San Francisco)', b: 'Herndon, VA' },
  { metric: 'CEO', a: 'Theresa Condor (since Jan 2025; founder Peter Platzer now Exec Chairman)', b: 'John Serafini' },
  { metric: 'Public / Private', a: 'Public (NYSE: SPIR, via SPAC 2021)', b: 'Private' },
  { metric: 'Employees', a: '~750', b: '~300 (est.)' },
  { metric: 'Total Funding / Market Cap', a: '~$276M raised; market cap ~$200M (volatile)', b: '~$585M raised (through Series E, 2026)' },
  { metric: 'Revenue (2024)', a: '~$100M (est.)', b: 'Not disclosed (est. $60-80M)' },
  { metric: 'Constellation Size', a: '~100+ satellites (LEMUR, later gen)', b: '~36 satellites (12 clusters of 3)' },
  { metric: 'Satellite Type', a: '3U/6U CubeSats with multi-payload capability', b: 'Custom 6U-class sats in 3-satellite clusters' },
  { metric: 'Primary RF Capability', a: 'AIS (vessel tracking), ADS-B (aircraft), GNSS-RO (weather)', b: 'RF geolocation & characterization (SIGINT-lite)' },
  { metric: 'Key Data Products', a: 'Maritime tracking, weather/climate data, aviation surveillance', b: 'RF survey, geolocation of emitters, spectrum monitoring' },
  { metric: 'Geolocation Approach', a: 'Not primary focus; receives known signals (AIS/ADS-B)', b: 'Passive TDOA/FDOA geolocation of unknown RF emitters' },
  { metric: 'Defense / IC Customers', a: 'Yes — NATO, NGA, NOAA, European defense agencies', b: 'Yes — NRO, NGA, DoD, Five Eyes intelligence community' },
  { metric: 'Commercial Customers', a: 'Shipping, insurance, weather services, agriculture', b: 'Telecoms, spectrum regulators, maritime (illegal fishing, smuggling)' },
  { metric: 'Weather Data Role', a: 'Major GNSS radio occultation provider (NOAA contracts)', b: 'Not a weather data provider' },
  { metric: 'Space-as-a-Service', a: 'Yes — offers hosted payload slots on constellation', b: 'No — focused on proprietary RF data products' },
  { metric: 'Data Delivery', a: 'API-based data feeds, subscription model', b: 'Analytics platform (RFGEO), custom reports, API' },
  { metric: 'Key Differentiator', a: 'Multi-mission constellation (weather + maritime + aviation)', b: 'Only commercial provider of precision RF geolocation from space' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Spire vs HawkEye 360' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Spire Global vs HawkEye 360</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Spire Global vs HawkEye 360</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two Virginia-based companies operating satellite constellations that collect radio frequency data from space, but with fundamentally different missions. Spire is a multi-purpose data platform (weather, maritime, aviation), while HawkEye 360 specializes in RF geolocation and signal intelligence for defense and intelligence customers.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Spire Global</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>HawkEye 360</th>
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

      {/* Analysis: Different RF Missions */}
      <h2 className="text-display text-xl mb-3">Different Approaches to Space-Based RF</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Spire Global operates a multi-mission constellation of over 100 CubeSats that collect data across three primary domains: maritime (AIS vessel tracking), aviation (ADS-B aircraft tracking), and weather (GNSS radio occultation for atmospheric profiling). Spire&apos;s satellites receive known, cooperative signals &mdash; ships and aircraft broadcasting their positions. The weather data comes from measuring how GPS signals bend as they pass through the atmosphere, providing temperature and humidity profiles used by meteorological agencies worldwide. Spire also offers a &ldquo;Space-as-a-Service&rdquo; model, hosting third-party payloads on its satellites.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        HawkEye 360 takes a fundamentally different approach: its satellites passively detect, geolocate, and characterize RF emissions from the Earth&apos;s surface, including emitters that are not broadcasting cooperatively. Using clusters of three satellites flying in formation, HawkEye 360 employs time-difference-of-arrival (TDOA) and frequency-difference-of-arrival (FDOA) techniques to pinpoint the location of radar systems, communication devices, maritime radars, and other RF sources. This capability is essentially commercial SIGINT (signals intelligence) &mdash; a category that previously only existed within classified government programs.
      </p>

      {/* Analysis: Defense & Intelligence */}
      <h2 className="text-display text-xl mb-3">Defense &amp; Intelligence Community</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Both companies serve defense customers, but HawkEye 360&apos;s relationship with the intelligence community is deeper and more central to its business model. HawkEye 360 was incubated within Allied Minds and has received contracts from the NRO (National Reconnaissance Office), NGA (National Geospatial-Intelligence Agency), and multiple DoD agencies. Its RF geolocation data is used for maritime domain awareness, sanctions enforcement, spectrum interference detection, and battlefield situational awareness. The company&apos;s data is considered a unique commercial capability that supplements classified SIGINT assets.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Spire&apos;s defense business is meaningful but represents one segment alongside its commercial weather and maritime customers. Spire has contracts with NATO, NOAA (for weather data), and various European defense agencies. Its AIS data is used for maritime surveillance and illegal fishing detection. However, Spire&apos;s defense value proposition is more about persistent global monitoring of cooperative signals, while HawkEye 360&apos;s is about detecting and locating non-cooperative or even deliberately hidden emitters &mdash; a much higher-value intelligence product.
      </p>

      {/* Analysis: Business Models */}
      <h2 className="text-display text-xl mb-3">Business Models &amp; Market Position</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Spire went public via SPAC in 2021 and has faced the typical post-SPAC challenges: its stock has traded well below the initial valuation, and the company has been working toward profitability while growing revenue toward $100M annually. Spire&apos;s diversified data streams (weather, maritime, aviation) provide resilience but also complexity. HawkEye 360 has remained private, raising over $585M through its Series E in 2026. The company&apos;s focused mission (RF geolocation) and strong defense customer base give it a clearer path to premium pricing, though the total addressable market is smaller than Spire&apos;s broader data business. Both companies benefit from the growing trend of defense and intelligence agencies supplementing classified satellites with commercial data purchases.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track Earth observation and RF analytics companies on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=spire-global&b=hawkeye-360" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'BlackSky vs Planet Labs', href: '/compare/blacksky-vs-planet-labs' },
            { title: 'ICEYE vs Capella Space', href: '/compare/iceye-vs-capella-space' },
            { title: 'Satellogic vs Planet Labs', href: '/compare/satellogic-vs-planet-labs' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/space-industry-mergers-acquisitions-biggest-deals" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry M&amp;A: The Biggest Deals and What They Mean</Link></li>
          <li><Link href="/compare/satellites" className="text-sm text-indigo-400 hover:text-indigo-300">Satellite Constellation Comparison Tool</Link></li>
          <li><Link href="/blog/space-industry-investment-guide-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry Investment Guide 2026</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Spire Global vs HawkEye 360: RF Analytics Comparison 2026',
        description: 'Side-by-side comparison of Spire Global and HawkEye 360 covering RF data capabilities, constellation architecture, and defense customers.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/spire-vs-hawkeye-360',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/spire-vs-hawkeye-360']} />
    </div>
  );
}
