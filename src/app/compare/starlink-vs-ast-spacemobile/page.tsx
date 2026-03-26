import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Parent Company', a: 'SpaceX', b: 'AST SpaceMobile, Inc.' },
  { metric: 'Founded', a: '2015 (Starlink program)', b: '2017' },
  { metric: 'CEO / Founder', a: 'Elon Musk (SpaceX CEO)', b: 'Abel Avellan' },
  { metric: 'Headquarters', a: 'Hawthorne, CA', b: 'Midland, TX' },
  { metric: 'Publicly Traded', a: 'No (SpaceX private; Starlink IPO discussed)', b: 'Yes (ASTS, Nasdaq)' },
  { metric: 'Market Cap / Valuation', a: 'SpaceX ~$350B+ (Starlink est. $100B+ portion)', b: '~$7B+ (early 2026)' },
  { metric: 'Total Funding', a: 'Part of SpaceX ($10B+ total)', b: '~$1.2B+ (equity + debt)' },
  { metric: 'Technology', a: 'LEO broadband via dish/terminal', b: 'Direct-to-phone via large phased-array satellites' },
  { metric: 'User Equipment Required', a: 'Starlink dish + Wi-Fi router ($599 hardware)', b: 'None — works with standard unmodified smartphones' },
  { metric: 'Satellites in Orbit', a: '6,500+ (as of early 2026)', b: '5 Block 1 BlueBird satellites' },
  { metric: 'Target Constellation', a: '12,000 (Gen1) + 30,000 (Gen2) approved', b: '~168 satellites (full constellation)' },
  { metric: 'Orbit', a: 'LEO, 540-570 km (shell 1)', b: 'LEO, ~725 km' },
  { metric: 'Download Speed', a: '50-250 Mbps typical (up to 400+ Mbps)', b: 'Up to 10+ Mbps per user (broadband target)' },
  { metric: 'Latency', a: '20-40 ms', b: '~30-50 ms (estimated)' },
  { metric: 'Active Subscribers', a: '4+ million (as of late 2025)', b: 'Pre-revenue; commercial service expected 2026' },
  { metric: 'Annual Revenue', a: '~$6.6B (2024 estimated)', b: 'Pre-revenue' },
  { metric: 'Target Market', a: 'Rural broadband, maritime, aviation, RVs, enterprise', b: 'Mobile dead zones — extending MNO coverage via cellular spectrum' },
  { metric: 'Business Model', a: 'Direct consumer subscription ($120/mo residential)', b: 'Revenue share with MNO partners (AT&T, Vodafone, Rakuten, 50+ MNOs)' },
  { metric: 'MNO Partnerships', a: 'T-Mobile (Direct to Cell texting)', b: 'AT&T (exclusive U.S.), Vodafone, Rakuten, Orange, Bell Canada, 50+ total' },
  { metric: 'FCC Authorization', a: 'Licensed for broadband + Direct to Cell', b: 'FCC commercial license granted November 2024' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Starlink vs AST SpaceMobile' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Starlink vs AST SpaceMobile</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Starlink vs AST SpaceMobile</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two fundamentally different approaches to satellite connectivity: Starlink delivers high-speed broadband through dedicated dish terminals, while AST SpaceMobile connects directly to unmodified smartphones from orbit. They target different markets but both aim to close the global connectivity gap.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Starlink</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>AST SpaceMobile</th>
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

      {/* Technology Comparison */}
      <h2 className="text-display text-xl mb-3">Technology: Dish-Based Broadband vs Direct-to-Phone</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Starlink operates the largest satellite constellation in history, with over 6,500 satellites providing broadband internet through a flat-panel phased-array dish (the Starlink terminal). Users purchase a $599 dish and pay a monthly subscription. The system delivers 50&ndash;250 Mbps download speeds with 20&ndash;40 ms latency, comparable to terrestrial broadband in many areas. Starlink has expanded beyond residential service into maritime, aviation, and enterprise markets, with SpaceX launching dedicated &ldquo;Direct to Cell&rdquo; satellites in partnership with T-Mobile for basic texting to smartphones.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        AST SpaceMobile takes a fundamentally different approach: each BlueBird satellite carries a massive phased-array antenna (~64 square meters) powerful enough to communicate directly with standard, unmodified cellular phones. No special hardware, apps, or firmware updates are needed on the user&apos;s device. AST demonstrated voice calls and 4G LTE data on the BlueWalker 3 test satellite in 2023, and the first five commercial Block 1 BlueBird satellites are now in orbit. The trade-off is that each satellite is far larger and more expensive than a Starlink satellite, limiting constellation scale.
      </p>

      {/* Market & Revenue */}
      <h2 className="text-display text-xl mb-3">Market Strategy &amp; Revenue Model</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Starlink has become a commercial juggernaut, generating an estimated $6.6 billion in revenue in 2024 with over 4 million subscribers across 100+ countries. The business model is direct-to-consumer: customers pay SpaceX directly for hardware and monthly service. Starlink has also secured significant government contracts, including providing connectivity to the U.S. military and serving as a critical communications backbone during conflicts and natural disasters.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        AST SpaceMobile&apos;s approach is B2B: the company partners with mobile network operators (MNOs) who pay for satellite-extended coverage using their existing licensed spectrum. AT&T is the exclusive U.S. partner, with Vodafone, Rakuten, Orange, and 50+ other MNOs signed globally, representing access to over 2.8 billion mobile subscribers. AST earns revenue through wholesale agreements and revenue sharing with these operators. This means no direct consumer acquisition cost, but AST depends entirely on MNO partnerships for market access and is still pre-revenue as it works toward commercial service launch.
      </p>

      {/* Investment Outlook */}
      <h2 className="text-display text-xl mb-3">Investment &amp; Stock Outlook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Starlink is not independently publicly traded, but SpaceX&apos;s private valuation exceeds $350 billion, with a potential Starlink IPO widely discussed. Starlink&apos;s profitability inflection is a key driver of SpaceX valuation. AST SpaceMobile (ASTS on Nasdaq) has a market cap of roughly $7 billion as of early 2026, driven by investor enthusiasm around the D2D opportunity. The stock is highly speculative &mdash; AST remains pre-revenue with significant capital needs to deploy its full 168-satellite constellation. Successful commercial service launch with AT&T could be a major catalyst, but execution risk remains substantial given the technical complexity of building and deploying these very large satellites at scale.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=spacex&b=ast-spacemobile" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
            { title: 'AST SpaceMobile vs Lynk Global', href: '/compare/ast-spacemobile-vs-lynk' },
            { title: 'Starlink vs Project Kuiper', href: '/compare/starlink-vs-kuiper' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/direct-to-device-satellites-replace-cell-towers" className="text-sm text-indigo-400 hover:text-indigo-300">Direct-to-Device: How Satellites Will Replace Cell Towers by 2030</Link></li>
          <li><Link href="/blog/starlink-oneweb-kuiper-mega-constellation-comparison" className="text-sm text-indigo-400 hover:text-indigo-300">Starlink, OneWeb &amp; Kuiper: Mega-Constellation Comparison</Link></li>
          <li><Link href="/guide/satellite-tracking-guide" className="text-sm text-indigo-400 hover:text-indigo-300">The Complete Satellite Tracking Guide</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Starlink vs AST SpaceMobile: Satellite Internet Comparison 2026',
        description: 'Side-by-side comparison of Starlink LEO broadband and AST SpaceMobile direct-to-phone satellite technology, covering satellites, speeds, revenue, and market strategy.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-25', dateModified: '2026-03-25',
        url: 'https://spacenexus.us/compare/starlink-vs-ast-spacemobile',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/starlink-vs-ast-spacemobile']} />
    </div>
  );
}
