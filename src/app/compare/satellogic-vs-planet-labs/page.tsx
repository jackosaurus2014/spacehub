import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2010', b: '2010' },
  { metric: 'Headquarters', a: 'Buenos Aires, Argentina / Charlotte, NC (US HQ)', b: 'San Francisco, CA' },
  { metric: 'CEO', a: 'Emiliano Kargieman (co-founder)', b: 'Will Marshall (co-founder)' },
  { metric: 'Public / Private', a: 'Public (NASDAQ: SATL, via SPAC 2022)', b: 'Public (NYSE: PL, via SPAC 2021)' },
  { metric: 'Employees', a: '~300', b: '~900' },
  { metric: 'Market Cap (early 2026)', a: '~$200M (volatile)', b: '~$1.5B' },
  { metric: 'Revenue (FY2024)', a: '~$19M', b: '~$244M' },
  { metric: 'Constellation Size', a: '~30+ satellites (NewSat Mark V)', b: '~200+ satellites (Dove, SuperDove, SkySat, Pelican)' },
  { metric: 'Primary Imaging Mode', a: 'Multispectral + Hyperspectral (29 bands)', b: 'Multispectral (8 bands, SuperDove)' },
  { metric: 'Optical Resolution', a: '~70 cm (multispectral), ~1 m (hyperspectral)', b: '~3 m (SuperDove), ~50 cm (SkySat), ~30 cm (Pelican, planned)' },
  { metric: 'Hyperspectral', a: 'Yes — 29 spectral bands, a key differentiator', b: 'No native hyperspectral (acquired Sinergise for analytics)' },
  { metric: 'Daily Coverage', a: 'Not daily global; targeted tasking model', b: 'Near-daily global coverage (Dove fleet)' },
  { metric: 'Satellite Manufacturing', a: 'In-house (Argentina); claimed $1M per satellite cost', b: 'In-house (San Francisco factory)' },
  { metric: 'Data Delivery Model', a: 'Constellation-as-a-Service: sell capacity, not just images', b: 'Subscription platform (Planet Explorer, APIs)' },
  { metric: 'Video Capability', a: 'Yes — full-motion video from orbit', b: 'No (SkySat has video but limited)' },
  { metric: 'Government Customers', a: 'U.S. DoD (EOCL program), NGA; foreign defense ministries', b: 'NASA, USDA, NGA, NRO, ESA, European agencies' },
  { metric: 'Key Commercial Markets', a: 'Agriculture, mining, energy, environmental monitoring', b: 'Agriculture, forestry, mapping, climate, insurance' },
  { metric: 'Analytics Platform', a: 'Platform with spectral analytics; partnerships for AI', b: 'Planetary Variables, Sentinel Hub (via Sinergise acquisition)' },
  { metric: 'Key Differentiator', a: 'Hyperspectral imaging + low-cost per satellite + video', b: 'Largest commercial EO constellation; daily global monitoring' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Satellogic vs Planet Labs' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Satellogic vs Planet Labs</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Satellogic vs Planet Labs</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Both founded in 2010, these Earth observation companies have taken markedly different approaches: Planet Labs built the world&apos;s largest commercial imaging constellation for daily global coverage, while Satellogic focuses on hyperspectral imaging and video from smaller but more capable satellites, marketed through a &ldquo;Constellation-as-a-Service&rdquo; model.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Satellogic</th>
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

      {/* Analysis: Hyperspectral vs Multispectral */}
      <h2 className="text-display text-xl mb-3">Hyperspectral vs Multispectral: Why It Matters</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Planet Labs&apos; SuperDove satellites capture imagery in 8 spectral bands, which is excellent for broad land-use classification, vegetation health (NDVI), and change detection across enormous areas. Their Dove constellation photographs the entire Earth&apos;s landmass every day, creating an unmatched dataset for monitoring change over time. The newer Pelican satellites will add high-resolution capability (~30 cm) to complement the daily global scan.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Satellogic&apos;s hyperspectral capability (29 spectral bands) enables detection of phenomena invisible to standard multispectral sensors. Hyperspectral data can identify specific mineral compositions, detect crop stress before it becomes visible, analyze water quality, and even identify materials on the ground. This makes Satellogic&apos;s data uniquely valuable for mining exploration, environmental monitoring, and defense applications. However, hyperspectral sensors generate enormous data volumes and require specialized analytics, which has historically limited the commercial market.
      </p>

      {/* Analysis: Scale vs Specialization */}
      <h2 className="text-display text-xl mb-3">Scale vs Specialization</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Planet Labs is the clear leader in constellation scale, with over 200 operational satellites generating the most comprehensive daily record of change on Earth&apos;s surface. This volume and consistency has made Planet the default provider for applications requiring frequent, global coverage &mdash; agriculture monitoring, deforestation tracking, disaster response, and climate science. Planet&apos;s revenue (~$244M in FY2024) reflects the breadth of its customer base across government and commercial sectors.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Satellogic has taken a different path, positioning its constellation as a capacity product rather than a data subscription. Under its &ldquo;Constellation-as-a-Service&rdquo; model, customers (including national governments) can essentially lease dedicated satellite capacity for their region. Satellogic has claimed manufacturing costs as low as $1M per satellite, which &mdash; if sustainable at scale &mdash; would give it a significant cost advantage. However, Satellogic&apos;s revenue remains an order of magnitude smaller than Planet&apos;s, and the company faces the ongoing challenge of converting a technically differentiated product into a large, recurring revenue stream.
      </p>

      {/* Analysis: Defense Market */}
      <h2 className="text-display text-xl mb-3">Defense &amp; Government Markets</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both companies are pursuing the lucrative defense and intelligence market. Planet Labs has long-standing contracts with NASA, USDA, and the National Geospatial-Intelligence Agency (NGA), and was selected for the NRO&apos;s Electro-Optical Commercial Layer (EOCL) program alongside BlackSky and Maxar. Satellogic was also selected for the EOCL program, gaining crucial U.S. defense validation for its platform. Satellogic&apos;s hyperspectral and full-motion video capabilities are particularly appealing to military and intelligence users who need more than just optical imagery. The defense market is increasingly important for both companies, as government contracts provide stable, long-term revenue in a segment where commercial demand has grown slower than early projections suggested.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track Earth observation companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=satellogic&b=planet-labs" className="btn-primary text-sm">Interactive Comparison</Link>
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
            { title: 'ICEYE vs Capella Space', href: '/compare/iceye-vs-capella-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/compare/satellites" className="text-sm text-indigo-400 hover:text-indigo-300">Satellite Constellation Comparison Tool</Link></li>
          <li><Link href="/blog/space-industry-investment-guide-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry Investment Guide 2026</Link></li>
          <li><Link href="/blog/space-industry-mergers-acquisitions-biggest-deals" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry M&amp;A: The Biggest Deals</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Satellogic vs Planet Labs: Earth Observation Comparison 2026',
        description: 'Side-by-side comparison of Satellogic and Planet Labs covering hyperspectral vs multispectral imaging, constellation approach, and market positioning.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/satellogic-vs-planet-labs',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/satellogic-vs-planet-labs']} />
    </div>
  );
}
