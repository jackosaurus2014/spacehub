import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Skylo vs AST SpaceMobile: Direct-to-Device Satellite Comparison 2026',
  description: 'Compare Skylo and AST SpaceMobile side by side — NTN standards vs custom satellites, carrier partnerships, spectrum, coverage, and direct-to-cell technology approaches.',
  keywords: ['Skylo vs AST SpaceMobile', 'direct to device', 'direct to cell', 'NTN satellite', 'satellite phone', 'ASTS stock'],
  openGraph: {
    title: 'Skylo vs AST SpaceMobile: Direct-to-Device Satellite Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Skylo and AST SpaceMobile covering NTN approaches, carrier partnerships, spectrum, and the race to connect unmodified phones.',
    url: 'https://spacenexus.us/compare/skylo-vs-ast-spacemobile',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/skylo-vs-ast-spacemobile' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2017', b: '2017' },
  { metric: 'Headquarters', a: 'Mountain View, CA', b: 'Midland, TX' },
  { metric: 'CEO', a: 'Parthsarathi Trivedi', b: 'Abel Avellan' },
  { metric: 'Total Funding', a: '~$116M+ (Series D, 2024)', b: '~$800M+ (public: ASTS on NASDAQ)' },
  { metric: 'Public / Private', a: 'Private', b: 'Public (NASDAQ: ASTS, SPAC merger 2022)' },
  { metric: 'Employees', a: '~150+', b: '~300+' },
  { metric: 'Approach', a: 'NTN standards-based (3GPP Rel-17+); works with existing GEO/MEO satellites', b: 'Custom massive LEO satellites with ~64 m2 phased-array antennas' },
  { metric: 'Technology', a: 'Software/chipset layer on existing satellite infrastructure', b: 'Purpose-built BlueBird satellites with record-setting antenna arrays' },
  { metric: 'Satellite Infrastructure', a: 'Partners with existing satellite operators (does not build satellites)', b: 'Own constellation of BlueBird satellites (5 launched Sept 2024)' },
  { metric: 'Activated Devices', a: '~1M+ devices connected via partner networks', b: 'Pre-commercial; test calls completed from unmodified phones (2023)' },
  { metric: 'Coverage Type', a: 'IoT/NB-IoT first, expanding to broadband', b: 'Broadband cellular (voice, data, video) to unmodified smartphones' },
  { metric: 'Carrier Partnerships', a: 'Bharti Airtel, KDDI, Telefonica, DT, Singtel, others', b: 'AT&T, Vodafone, Rakuten, Orange, others (30+ MNO agreements)' },
  { metric: 'Spectrum Strategy', a: 'Uses carrier partner spectrum via NTN standards', b: 'Uses carrier partner spectrum; requires large antenna to close link budget' },
  { metric: 'Data Rates', a: 'NB-IoT to LTE speeds (standards-dependent)', b: '10+ Mbps per user (broadband-class, demonstrated)' },
  { metric: 'Key Test Milestone', a: 'Commercial NB-IoT service live with multiple carriers', b: 'First-ever broadband phone call via satellite from unmodified phone (2023)' },
  { metric: 'Constellation Size', a: 'N/A (uses partner satellite infrastructure)', b: '~168 BlueBird satellites planned for global coverage' },
  { metric: 'Timeline to Global Coverage', a: 'Already operational in partner territories', b: '2026-2028 (phased constellation deployment)' },
  { metric: 'Key Differentiator', a: 'Asset-light model; standards-based; already generating revenue', b: 'Only company demonstrating broadband cellular from space to unmodified phones' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Skylo vs AST SpaceMobile' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Skylo vs AST SpaceMobile</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Skylo vs AST SpaceMobile</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The race to connect unmodified phones directly to satellites represents one of the largest addressable markets in space: the 5+ billion mobile subscribers who lose coverage outside urban areas. Skylo and AST SpaceMobile are pursuing this opportunity with fundamentally different business models &mdash; one asset-light and standards-based, the other building the largest commercial satellites ever deployed.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Skylo</th>
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

      {/* Technology Approach */}
      <h2 className="text-display text-xl mb-3">Standards-Based vs Custom Hardware</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Skylo&apos;s approach is elegantly asset-light: rather than launching its own satellites, Skylo provides a software and chipset layer that enables existing satellite operators to offer NTN (Non-Terrestrial Network) services compliant with 3GPP Release 17 and beyond. This means Skylo can ride on the backs of established GEO and MEO satellite constellations, avoiding the billions in capex required to build and launch a dedicated fleet. Skylo already has over a million devices connected through carrier partnerships across Asia, Europe, and Latin America.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        AST SpaceMobile is attempting something far more ambitious: building the largest commercial communications satellites ever launched, each with a ~64 m2 phased-array antenna that can close the link budget to an unmodified smartphone at broadband speeds. The company&apos;s BlueWalker 3 test satellite (2022) and subsequent BlueBird constellation (first 5 launched September 2024) have demonstrated what no other company has achieved &mdash; a broadband voice and data connection from an ordinary phone to a LEO satellite without any hardware modifications. The technical achievement is extraordinary, but so is the capital requirement: AST needs approximately 168 satellites for global coverage.
      </p>

      {/* Market Position */}
      <h2 className="text-display text-xl mb-3">Market Position &amp; Carrier Strategy</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Both companies are pursuing carrier partnerships as their go-to-market strategy, recognizing that mobile network operators control the customer relationship and spectrum rights. Skylo has signed with major carriers including Bharti Airtel, KDDI, Telefonica, Deutsche Telekom, and Singtel. AST SpaceMobile has agreements with AT&amp;T, Vodafone, Rakuten, and over 30 MNOs representing more than 2 billion subscribers.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The competitive landscape also includes Apple/Globalstar (emergency SOS), T-Mobile/SpaceX (Starlink direct-to-cell), and Qualcomm/Iridium partnerships. Skylo&apos;s advantage is being standards-based and already revenue-generating; AST SpaceMobile&apos;s advantage is offering true broadband speeds that could enable seamless coverage extension for carriers. The question is whether the market will evolve toward narrowband standards-based services (Skylo&apos;s bet) or demand full broadband continuity (AST&apos;s bet).
      </p>

      {/* Investment Thesis */}
      <h2 className="text-display text-xl mb-3">Investment Considerations</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Skylo represents the lower-risk, faster-to-revenue model: asset-light, standards-compliant, and already generating commercial revenue. The risk is commoditization &mdash; as 3GPP NTN standards mature, other companies can offer similar capabilities. AST SpaceMobile (NASDAQ: ASTS) is the higher-risk, higher-reward play: if the full constellation is deployed and the business model works, it could capture a massive share of the global mobile coverage gap. The risk is execution &mdash; building and launching 168 of the largest commercial satellites ever made requires billions in capital and carries significant technical risk. ASTS stock has been volatile, reflecting this binary outcome profile.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track direct-to-device satellite companies on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=skylo&b=ast-spacemobile" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'AST SpaceMobile vs Lynk', href: '/compare/ast-spacemobile-vs-lynk' },
            { title: 'Starlink vs AST SpaceMobile', href: '/compare/starlink-vs-ast-spacemobile' },
            { title: 'Iridium vs Starlink', href: '/compare/iridium-vs-starlink' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/direct-to-device-satellite-race-2026" className="text-sm text-indigo-400 hover:text-indigo-300">The Direct-to-Device Satellite Race: Who Will Win?</Link></li>
          <li><Link href="/blog/ntn-3gpp-standards-explained" className="text-sm text-indigo-400 hover:text-indigo-300">3GPP NTN Standards: How Satellites Are Joining the Cellular Network</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Skylo vs AST SpaceMobile: Direct-to-Device Satellite Comparison 2026',
        description: 'Side-by-side comparison of Skylo and AST SpaceMobile covering NTN standards, carrier partnerships, spectrum strategy, and direct-to-cell technology.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/skylo-vs-ast-spacemobile',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/skylo-vs-ast-spacemobile']} />
    </div>
  );
}
