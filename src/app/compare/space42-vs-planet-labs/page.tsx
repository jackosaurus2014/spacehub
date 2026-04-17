import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Space42 vs Planet Labs: Earth Observation Comparison 2026',
  description: 'Compare Space42 (UAE, GEO+AI analytics) and Planet Labs (LEO daily imagery) side by side — constellations, orbit types, resolution, revisit rate, AI capabilities, and revenue.',
  keywords: ['Space42 vs Planet Labs', 'earth observation', 'satellite imagery', 'geospatial analytics', 'AI satellite', 'EO comparison'],
  openGraph: {
    title: 'Space42 vs Planet Labs: Earth Observation Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Space42 and Planet Labs covering constellations, imagery resolution, AI analytics, revenue, and market position.',
    url: 'https://spacenexus.us/compare/space42-vs-planet-labs',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/space42-vs-planet-labs' },
};

const COMPARISON_DATA = [
  { metric: 'Formed / Founded', a: '2024 (merger of Yahsat + Bayanat AI)', b: '2010' },
  { metric: 'Heritage Companies', a: 'Al Yah Satellite Communications (2007) + Bayanat (2020, G42 AI subsidiary)', b: 'Planet Labs (founded by ex-NASA Ames engineers)' },
  { metric: 'Headquarters', a: 'Abu Dhabi, UAE', b: 'San Francisco, CA' },
  { metric: 'Public / Private', a: 'Public (ADX: SPACE42)', b: 'Public (NYSE: PL)' },
  { metric: 'Revenue (2025)', a: '~$600M+ (combined Yahsat + Bayanat)', b: '~$220M+' },
  { metric: 'Market Cap', a: '~$4B+ (Abu Dhabi Exchange)', b: '~$2B+ (NYSE)' },
  { metric: 'Employees', a: '~1,000+', b: '~800+' },
  { metric: 'Constellation', a: '5 GEO satellites (Al Yah series) + Thuraya fleet', b: '200+ Dove cubesats + 21 SuperDove + 21 SkySat (Pelican next-gen)' },
  { metric: 'Orbit Type', a: 'Geostationary (GEO) — comms; plans for LEO EO expansion', b: 'Low Earth Orbit (LEO) — Sun-synchronous polar orbits' },
  { metric: 'Primary Service', a: 'Satellite communications + AI-powered geospatial analytics', b: 'Daily global imagery + geospatial data feeds' },
  { metric: 'Imagery Resolution', a: 'Leverages partner EO data; AI analytics layer over third-party imagery', b: '3-5 m (Dove/SuperDove); 50 cm (SkySat); 30 cm (Pelican, upcoming)' },
  { metric: 'Revisit Rate', a: 'N/A for own imagery (continuous GEO comms coverage)', b: 'Daily global coverage (Dove fleet); sub-daily for priority targets' },
  { metric: 'AI Capabilities', a: 'Core strength — Bayanat heritage; change detection, object classification, predictive analytics', b: 'Planet Insights Platform — analytics APIs, change detection, basemaps' },
  { metric: 'Key Markets', a: 'Middle East, Africa, South Asia — government, defense, energy', b: 'Global — agriculture, defense, forestry, insurance, finance' },
  { metric: 'Government Anchor', a: 'UAE government (Mubadala/G42 ownership)', b: 'US NRO (Electro-Optical Commercial Layer contract)' },
  { metric: 'Comms Revenue', a: 'Significant — managed satellite comms services across MEA region', b: 'None — pure EO company' },
  { metric: 'Key Differentiator', a: 'AI-first geospatial intelligence + sovereign GEO comms infrastructure', b: 'Only company imaging the entire Earth every day; largest EO constellation' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Space42 vs Planet Labs' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Space42 vs Planet Labs</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Space42 vs Planet Labs</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The geospatial intelligence market is being transformed by two very different companies: Space42, formed from the UAE&apos;s merger of Yahsat satellite communications with Bayanat AI analytics, and Planet Labs, the San Francisco-based company that images the entire Earth every day with the world&apos;s largest constellation of Earth observation satellites. One leads with AI, the other with data collection.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Space42</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Planet Labs</th>
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

      {/* Data vs Analytics */}
      <h2 className="text-display text-xl mb-3">Data Collection vs AI Analytics</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Planet Labs&apos; moat is data collection at scale. With over 200 Dove and SuperDove cubesats in Sun-synchronous orbits, Planet images the entire landmass of Earth every single day at 3-5 meter resolution. The SkySat fleet adds 50 cm resolution for targeted tasking, and the upcoming Pelican constellation will push that to 30 cm with significantly improved spectral capabilities. This daily, global, consistent dataset is unique in the industry &mdash; no other company images the whole planet every day. Planet&apos;s value proposition is temporal: the ability to detect changes by comparing today&apos;s image to yesterday&apos;s across any location on Earth.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Space42 approaches the market from the analytics layer. Born from the merger of Yahsat (a GEO satellite communications operator) and Bayanat (an AI analytics company from the G42 group), Space42 does not currently operate its own Earth observation satellites. Instead, it applies sophisticated AI and machine learning models to geospatial data from multiple sources &mdash; partner imagery, SAR data, IoT sensors, and its own communications satellites &mdash; to deliver intelligence products for government and commercial customers. This AI-first approach leverages the UAE&apos;s significant investments in artificial intelligence infrastructure and positions Space42 as an analytics company that happens to also own communications satellites, rather than a traditional satellite operator.
      </p>

      {/* Regional vs Global */}
      <h2 className="text-display text-xl mb-3">Regional Champion vs Global Platform</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Planet Labs operates as a global platform, selling data and analytics subscriptions to customers in over 50 countries across agriculture, defense, forestry, insurance, commodities, and climate monitoring. Its contract with the US National Reconnaissance Office (NRO) for the Electro-Optical Commercial Layer provides significant government revenue. Planet&apos;s global dataset makes it equally valuable to a Brazilian farmer monitoring crop health, a Norwegian insurance company assessing flood damage, or a US intelligence analyst tracking military activity.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Space42&apos;s market focus is more concentrated: the Middle East, Africa, and South Asia. With the UAE government as an anchor customer and Mubadala/G42 as major shareholders, Space42 has deep ties to sovereign and defense customers across the Gulf region. The company&apos;s satellite communications business provides recurring revenue from government and enterprise connectivity services, giving it a diversified revenue base that Planet lacks. Space42&apos;s strategy is to become the sovereign geospatial intelligence platform for the MEA region, combining communications infrastructure with AI-powered analytics &mdash; a vertical integration play that no Western EO company is pursuing.
      </p>

      {/* Future Outlook */}
      <h2 className="text-display text-xl mb-3">Convergence Ahead</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both companies are converging toward the same destination: AI-powered geospatial intelligence platforms. Planet is investing heavily in its Insights Platform, adding analytics, change detection, and automated monitoring capabilities on top of its unmatched imagery archive. Space42 is reportedly planning to expand into LEO Earth observation to complement its analytics capabilities with proprietary data. The broader market trend is clear &mdash; raw imagery is becoming commoditized, and value is migrating to the analytics layer. Companies that own both the data and the intelligence will have the strongest competitive positions in the long run.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track Earth observation companies and satellite data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=space42&b=planet-labs" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'BlackSky vs Planet Labs', href: '/compare/blacksky-vs-planet-labs' },
            { title: 'Satellogic vs Planet Labs', href: '/compare/satellogic-vs-planet-labs' },
            { title: 'Planet Labs vs Maxar', href: '/compare/planet-labs-vs-maxar' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/earth-observation-market-2026" className="text-sm text-indigo-400 hover:text-indigo-300">The Earth Observation Market in 2026: From Imagery to Intelligence</Link></li>
          <li><Link href="/blog/ai-geospatial-analytics-revolution" className="text-sm text-indigo-400 hover:text-indigo-300">AI and Geospatial Analytics: How Machine Learning Is Transforming Satellite Data</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Space42 vs Planet Labs: Earth Observation Comparison 2026',
        description: 'Side-by-side comparison of Space42 and Planet Labs covering constellations, AI analytics, imagery resolution, revenue, and market positioning.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/space42-vs-planet-labs',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/space42-vs-planet-labs']} />
    </div>
  );
}
