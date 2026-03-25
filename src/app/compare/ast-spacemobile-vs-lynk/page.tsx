import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2017', b: '2019' },
  { metric: 'Founder / CEO', a: 'Abel Avellan', b: 'Charles Miller' },
  { metric: 'Headquarters', a: 'Midland, TX', b: 'Falls Church, VA' },
  { metric: 'Publicly Traded', a: 'Yes (ASTS, Nasdaq)', b: 'No (private)' },
  { metric: 'Market Cap (early 2026)', a: '~$7B+', b: 'Private — est. valuation ~$500M' },
  { metric: 'Total Funding Raised', a: '~$1.2B+ (equity + debt)', b: '~$200M+' },
  { metric: 'Revenue Stage', a: 'Pre-revenue (commercial service expected 2026)', b: 'Pre-revenue (limited pilot services)' },
  { metric: 'Technology Approach', a: 'Very large phased-array satellites (~64 m2 antenna) beaming directly to standard phones', b: 'Small satellites with software-defined radio connecting to standard phones' },
  { metric: 'Satellite Class', a: 'Large (1,500+ kg per satellite)', b: 'Small (cubesat-class, ~25 kg)' },
  { metric: 'Constellation Size (Target)', a: '~168 satellites (full constellation)', b: '~5,000+ satellites (global continuous coverage)' },
  { metric: 'Satellites Launched (early 2026)', a: '5 Block 1 BlueBird satellites', b: '~10 test satellites' },
  { metric: 'Spectrum / Band', a: 'Uses MNO partner spectrum (licensed cellular bands)', b: 'Uses MNO partner spectrum (licensed cellular bands)' },
  { metric: 'Primary MNO Partner', a: 'AT&T (exclusive U.S. partner)', b: 'Multiple MNOs across various countries' },
  { metric: 'Other MNO Partners', a: 'Vodafone (global), Rakuten (Japan), Orange (France), Bell Canada, others — 50+ agreements', b: 'Aliv (Bahamas), Telecel Centrafrique, others — focus on developing markets' },
  { metric: 'Service Type', a: 'Voice + broadband data (5G speeds targeted)', b: 'Text messaging, basic data (2G/LTE equivalent)' },
  { metric: 'Data Throughput Target', a: 'Up to 10+ Mbps per user (broadband)', b: 'Text and low-bandwidth data' },
  { metric: 'First D2D Connection', a: 'September 2023 (BlueWalker 3 test satellite)', b: 'February 2022 (first satellite-to-phone text)' },
  { metric: 'FCC Approval', a: 'FCC license granted November 2024 for commercial service', b: 'FCC experimental licenses; full commercial approval pending' },
  { metric: 'Launch Provider', a: 'SpaceX (Falcon 9, Block 1 satellites)', b: 'Various (SpaceX rideshare, Rocket Lab, others)' },
  { metric: 'Key Technical Challenge', a: 'Manufacturing and deploying very large satellites with massive antenna arrays', b: 'Achieving sufficient link budget from small satellites to reach unmodified phones' },
  { metric: 'Business Model', a: 'Revenue share with MNO partners for satellite-enabled coverage', b: 'Revenue share with MNO partners; targeting coverage gaps in underserved markets' },
  { metric: 'Competitive Moat', a: 'Patented large phased-array antenna technology; 50+ MNO agreements; FCC license', b: 'First company to send satellite-to-phone text; focus on underserved markets' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'AST SpaceMobile vs Lynk Global' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">AST SpaceMobile vs Lynk Global</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">AST SpaceMobile vs Lynk Global</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The two pure-play direct-to-device (D2D) satellite companies — both aiming to connect standard, unmodified smartphones directly from space. They take fundamentally different approaches: AST SpaceMobile builds massive satellites with huge antenna arrays, while Lynk deploys constellations of small satellites.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>AST SpaceMobile</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Lynk Global</th>
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

      {/* Technology Deep Dive */}
      <h2 className="text-display text-xl mb-3">Technology Approach</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        AST SpaceMobile&apos;s approach centers on building some of the largest commercial satellites ever deployed. Each BlueBird satellite features a phased-array antenna spanning approximately 64 square meters — large enough to generate a strong enough signal to reach standard cellular phones on the ground without any hardware modifications. The BlueWalker 3 test satellite, launched in September 2022, successfully demonstrated voice calls, text messaging, and data connections to unmodified smartphones at 4G LTE speeds. AST&apos;s Block 1 BlueBird satellites began launching on SpaceX Falcon 9 in 2024, with five in orbit by early 2026.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Lynk Global takes the opposite approach: many small, inexpensive satellites rather than a few large ones. Lynk&apos;s satellites use software-defined radio to establish connections with standard phones, but the smaller antenna aperture limits throughput to text messaging and low-bandwidth data. Lynk claims to have been the first company to successfully send a text message from a satellite to a standard phone (February 2022), predating AST&apos;s BlueWalker 3 demonstration. Lynk&apos;s full vision requires thousands of small satellites for continuous global coverage, which demands significant capital investment.
      </p>

      {/* Partnerships */}
      <h2 className="text-display text-xl mb-3">MNO Partnerships &amp; Market Access</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        AST SpaceMobile has secured an exclusive U.S. partnership with AT&T and agreements with over 50 mobile network operators worldwide, including Vodafone, Rakuten, Orange, Bell Canada, and Bharti Airtel. These partnerships are critical because D2D service relies on using the MNOs&apos; licensed cellular spectrum — the satellites effectively act as cell towers in space. AT&T&apos;s backing provides access to the largest cellular subscriber base in the United States and significant go-to-market credibility. AST&apos;s MNO agreements collectively represent access to over 2.8 billion subscribers globally.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Lynk Global has focused more on developing markets and smaller MNOs where the need for coverage gap solutions is most acute. Partners include operators in the Bahamas, Central African Republic, and other underserved regions. This strategy avoids direct competition with T-Mobile&apos;s Starlink Direct to Cell partnership and AST SpaceMobile&apos;s AT&T deal in developed markets. However, the smaller MNO partner base limits near-term revenue potential and raises questions about the average revenue per user achievable in these markets.
      </p>

      {/* Regulatory Status */}
      <h2 className="text-display text-xl mb-3">Regulatory Status</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        AST SpaceMobile received FCC authorization in November 2024 to begin commercial D2D service in the United States, a significant regulatory milestone. The license covers the use of AT&T&apos;s licensed spectrum for satellite-to-handset communications. AST has also secured regulatory approvals in multiple international markets through its MNO partners. The FCC license positions AST as one of the first companies authorized for commercial broadband D2D service.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Lynk Global holds FCC experimental licenses and has conducted authorized tests from orbit. Full commercial authorization in the United States remains pending. Lynk has focused its early commercial pilots on markets with less stringent regulatory requirements, which allows faster deployment but limits access to the most lucrative subscriber bases. The regulatory landscape for D2D satellite services is still evolving globally, with spectrum coordination between satellite and terrestrial operators being a key issue for both companies.
      </p>

      {/* Competitive Landscape */}
      <h2 className="text-display text-xl mb-3">The Broader D2D Landscape</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        AST SpaceMobile and Lynk Global are not the only players in D2D. T-Mobile has partnered with SpaceX&apos;s Starlink for a Direct to Cell service, Apple uses Globalstar for Emergency SOS via Satellite, and Qualcomm&apos;s Snapdragon Satellite platform with Iridium targets Android devices. However, AST SpaceMobile and Lynk remain the two pure-play public/near-public companies focused entirely on broadband or messaging D2D satellite service to unmodified phones. AST&apos;s larger satellites offer a fundamentally higher throughput ceiling (broadband data, voice) compared to competitors limited to text messaging, which could be a decisive advantage if the technology scales as planned.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=ast-spacemobile&b=lynk-global" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
            { title: 'Iridium vs Globalstar', href: '/compare/iridium-vs-globalstar' },
            { title: 'Starlink vs Project Kuiper', href: '/compare/starlink-vs-kuiper' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'AST SpaceMobile vs Lynk Global: Direct-to-Device Satellite Comparison 2026',
        description: 'Side-by-side comparison of AST SpaceMobile and Lynk Global covering D2D satellite technology, MNO partnerships, regulatory status, and market outlook.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-25', dateModified: '2026-03-25',
        url: 'https://spacenexus.us/compare/ast-spacemobile-vs-lynk',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/ast-spacemobile-vs-lynk']} />
    </div>
  );
}
