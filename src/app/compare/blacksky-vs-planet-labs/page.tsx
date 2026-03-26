import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2014', b: '2010' },
  { metric: 'Founder(s)', a: 'Brian O\'Brien (spun out of Spaceflight Industries)', b: 'Will Marshall, Robbie Schingler, Chris Boshuizen' },
  { metric: 'Headquarters', a: 'Herndon, VA', b: 'San Francisco, CA' },
  { metric: 'Employees', a: '~350', b: '~900' },
  { metric: 'Publicly Traded', a: 'Yes (BKSY, NYSE)', b: 'Yes (PL, NYSE)' },
  { metric: 'Market Cap (early 2026)', a: '~$400M', b: '~$2B' },
  { metric: 'Revenue (FY 2024)', a: '~$100M', b: '~$220M' },
  { metric: 'Total Funding Raised', a: '~$470M (including SPAC)', b: '~$600M+ (including SPAC)' },
  { metric: 'Satellite Constellation', a: '~14 Gen-2 high-res satellites', b: '200+ Dove/SuperDove + 21 SkySat + 2 Tanager (Pelican in dev)' },
  { metric: 'Imaging Resolution', a: '50 cm electro-optical', b: '3 m (SuperDove), 50 cm (SkySat), 30 m (Tanager hyperspectral)' },
  { metric: 'Revisit Rate', a: 'Multiple times per day (tasked)', b: 'Daily global coverage (Dove fleet)' },
  { metric: 'Imaging Approach', a: 'On-demand, high-res tasking — specific targets', b: 'Systematic wide-area monitoring — scan the whole Earth daily' },
  { metric: 'Spectral Bands', a: 'Panchromatic + multispectral', b: '8-band multispectral (SuperDove), hyperspectral (Tanager)' },
  { metric: 'AI / Analytics', a: 'Spectra AI platform — automated object detection, change detection, geospatial analytics', b: 'Planet Insights Platform — analytics, APIs, basemaps, monitoring feeds' },
  { metric: 'Primary Customers', a: 'U.S. defense & intelligence (NGA, NRO, DoD)', b: 'Agriculture, forestry, government, civil, insurance, finance' },
  { metric: 'Government Revenue %', a: '~70%+ (defense/intel dominant)', b: '~50% government, ~50% commercial' },
  { metric: 'Key Contracts', a: 'NRO EOCL study contract, NGA commercial imagery', b: 'NGA commercial imagery, ESA Copernicus, USDA' },
  { metric: 'Launch Partners', a: 'Rocket Lab Electron', b: 'SpaceX rideshare, ISRO PSLV, Rocket Lab' },
  { metric: 'Competitive Moat', a: 'Real-time intelligence: fast tasking + AI analytics for defense customers', b: 'Unmatched daily global coverage at scale; largest EO data archive' },
  { metric: 'Stock Performance (2024-2025)', a: 'BKSY volatile; ~$3-6 range', b: 'PL range ~$3-7; growing revenue trajectory' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'BlackSky vs Planet Labs' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">BlackSky vs Planet Labs</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">BlackSky vs Planet Labs</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two publicly traded Earth observation companies with fundamentally different strategies: BlackSky focuses on high-revisit, on-demand tasking with AI-powered analytics for defense and intelligence customers, while Planet Labs operates the largest commercial EO constellation for systematic daily monitoring across commercial and government markets.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>BlackSky</th>
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

      {/* Imaging Philosophy */}
      <h2 className="text-display text-xl mb-3">Imaging Philosophy: Tasking vs Monitoring</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        BlackSky operates a smaller, agile constellation of high-resolution satellites designed for rapid on-demand tasking. Customers can request an image of a specific location and receive it within hours, often with multiple revisits per day. This &ldquo;tip and cue&rdquo; model is ideally suited to defense and intelligence customers who need to monitor specific facilities, ports, or military sites. BlackSky&apos;s Spectra AI platform layers automated analytics on top of the imagery &mdash; detecting ships, vehicles, aircraft, and construction activity &mdash; delivering actionable intelligence rather than raw pixels.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Planet Labs takes the opposite approach: systematically imaging the entire Earth every day. Its fleet of over 200 SuperDove satellites captures 3-meter resolution imagery across every landmass daily, creating an unmatched time-series archive. The 21 SkySat satellites provide 50 cm resolution for higher-detail needs, and the new Tanager hyperspectral satellites (launched 2024 for the Carbon Mapper Coalition) add atmospheric monitoring capability. Planet&apos;s strength is change detection at global scale &mdash; detecting deforestation, crop health changes, urban growth, and infrastructure development across millions of square kilometers.
      </p>

      {/* Revenue & Customers */}
      <h2 className="text-display text-xl mb-3">Revenue &amp; Customer Base</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        BlackSky&apos;s revenue is heavily concentrated in U.S. defense and intelligence, with over 70% coming from government customers including the NGA, NRO, and Department of Defense. This provides high-value contracts but creates customer concentration risk. BlackSky was selected for the NRO&apos;s Electro-Optical Commercial Layer (EOCL) study contracts, positioning it as a key commercial imagery provider for the intelligence community. Revenue grew to approximately $100 million in 2024.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Planet Labs has a more diversified customer base, with roughly equal revenue from government and commercial sectors. Key customers include the NGA and ESA on the government side, and agriculture, forestry, insurance, and financial companies on the commercial side. Planet&apos;s data is used by organizations like the USDA for crop monitoring and by commodity traders for agricultural supply chain intelligence. Revenue reached approximately $220 million in fiscal year 2024, with the company targeting profitability as the constellation matures and data analytics offerings expand.
      </p>

      {/* Future Outlook */}
      <h2 className="text-display text-xl mb-3">Future Outlook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both companies are investing in next-generation capabilities. BlackSky is expanding its Gen-2 constellation and deepening its AI analytics platform, betting that the value in Earth observation is shifting from imagery to intelligence &mdash; automated, near-real-time answers derived from satellite data. Planet Labs is developing its Pelican next-generation satellite with sub-meter resolution and enhanced spectral capabilities, which would close the resolution gap with competitors while maintaining its daily-coverage advantage. The broader EO market is expected to grow to $8&ndash;10 billion by 2030, driven by defense spending, climate monitoring, and commercial analytics demand. The question for investors is whether these two companies, now generating roughly $320 million combined, can capture meaningful share of that growth while reaching sustained profitability.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=blacksky&b=planet-labs" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Planet Labs vs Maxar', href: '/compare/planet-labs-vs-maxar' },
            { title: 'Maxar vs Airbus Defence & Space', href: '/compare/maxar-vs-airbus-defence-space' },
            { title: 'ICEYE vs Capella Space', href: '/compare/iceye-vs-capella-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'BlackSky vs Planet Labs: Earth Observation Comparison 2026',
        description: 'Side-by-side comparison of BlackSky and Planet Labs covering satellite constellations, imaging resolution, revenue, defense vs commercial focus, and market outlook.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-25', dateModified: '2026-03-25',
        url: 'https://spacenexus.us/compare/blacksky-vs-planet-labs',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/blacksky-vs-planet-labs']} />
    </div>
  );
}
