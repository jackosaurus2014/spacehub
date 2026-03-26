import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '1991 (Motorola); restructured 2001 (Ch.11); Iridium NEXT 2017-2019', b: '2015 (SpaceX subsidiary)' },
  { metric: 'Headquarters', a: 'McLean, VA', b: 'Hawthorne, CA (SpaceX)' },
  { metric: 'Public / Private', a: 'Public (NASDAQ: IRDM)', b: 'Private (SpaceX subsidiary; potential IPO)' },
  { metric: 'Revenue (2024)', a: '~$790M', b: '~$6.6B (est.)' },
  { metric: 'Market Cap / Valuation', a: '~$3.5B', b: 'Part of SpaceX (~$350B valuation)' },
  { metric: 'Constellation Size', a: '66 active + 9 on-orbit spares (Iridium NEXT)', b: '~6,000+ (with FCC approval for up to 42,000)' },
  { metric: 'Orbit', a: '780 km LEO, 6 polar planes', b: '~550 km LEO, multiple inclinations (incl. polar)' },
  { metric: 'Frequency Band', a: 'L-band (1616-1626.5 MHz)', b: 'Ka-band & Ku-band (12-75 GHz range)' },
  { metric: 'Data Throughput (User)', a: '~2.4 kbps (voice/SBD) to ~704 kbps (Certus)', b: '~25-220+ Mbps download; 5-25+ Mbps upload' },
  { metric: 'Latency', a: '~100-600+ ms (varies by service; processing + routing adds delay)', b: '~25-60 ms (round trip, typical)' },
  { metric: 'Terminal Size', a: 'Handheld phone / small IoT modem / vehicle-mounted', b: 'Rectangular dish (~19x12 in, Gen 2) or flat high-performance antenna' },
  { metric: 'Coverage', a: '100% global including poles and oceans', b: '~95%+ of populated areas; polar coverage expanding' },
  { metric: 'Primary Use Cases', a: 'Voice, SOS, IoT/M2M, maritime safety, aviation comms', b: 'Consumer broadband, enterprise connectivity, mobility' },
  { metric: 'IoT / M2M', a: 'Core business — 1.9M+ IoT subscribers (Iridium SBD)', b: 'Starlink IoT / Direct-to-Cell in development' },
  { metric: 'Direct-to-Phone', a: 'Yes — Iridium satellite phones (proprietary handsets)', b: 'Direct-to-Cell via T-Mobile partnership (standard smartphones)' },
  { metric: 'Government / Military', a: 'U.S. DoD EMSS contract ($738M, 5-year); NATO, coast guards', b: 'Starshield (classified DoD constellation variant)' },
  { metric: 'Subscriber Base', a: '~2.4M+ (commercial + government)', b: '~4M+ (consumer + enterprise + government)' },
  { metric: 'Consumer Monthly Price', a: '$50-150+/mo (voice plans); IoT per-message', b: '$120-500/mo (residential to priority business)' },
  { metric: 'Cross-Link Architecture', a: 'Yes — Ka-band inter-satellite links (no ground relay needed)', b: 'Yes — laser inter-satellite links on V2 Mini+' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Iridium vs Starlink' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Iridium vs Starlink</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Iridium vs Starlink</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two LEO satellite constellations with fundamentally different design philosophies. Iridium provides low-bandwidth, truly global connectivity (including both poles) for voice, IoT, and safety-of-life applications. Starlink provides high-bandwidth broadband internet to fixed and mobile users. They serve largely complementary markets, but Starlink&apos;s expansion into IoT and direct-to-cell is beginning to encroach on Iridium&apos;s territory.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Iridium</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Starlink</th>
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

      {/* Analysis: Different Connectivity Paradigms */}
      <h2 className="text-display text-xl mb-3">Different Connectivity Paradigms</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Iridium&apos;s architecture was revolutionary when conceived in the 1990s: 66 satellites in 6 polar orbital planes with inter-satellite links providing true pole-to-pole coverage. The L-band frequency penetrates weather, foliage, and light structures, making Iridium the gold standard for maritime distress (GMDSS-certified), aviation communications, and military users who need connectivity anywhere on Earth regardless of conditions. Iridium&apos;s NEXT constellation, completed in 2019, replaced the original satellites with modern hardware supporting the Certus broadband service (up to ~704 kbps) and Iridium Short Burst Data (SBD) for IoT.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Starlink is designed for an entirely different problem: delivering broadband-class internet at scale. With over 6,000 satellites and growing, Starlink provides 25-220+ Mbps download speeds with latency comparable to terrestrial DSL. The user terminal is a flat-panel phased-array antenna that self-aligns to satellites. Starlink has rapidly become the largest commercial satellite constellation in history and generates an estimated $6.6 billion in annual revenue. While Starlink and Iridium currently serve different markets, SpaceX is developing Starlink Direct-to-Cell (in partnership with T-Mobile) that would enable standard smartphones to connect to Starlink satellites for texting and eventually voice &mdash; a potential threat to Iridium&apos;s consumer satellite phone niche.
      </p>

      {/* Analysis: IoT Battleground */}
      <h2 className="text-display text-xl mb-3">The IoT &amp; M2M Battleground</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Iridium&apos;s IoT business is a core revenue driver, with approximately 1.9 million IoT/M2M subscribers using Iridium SBD (Short Burst Data) for asset tracking, environmental monitoring, maritime vessel monitoring, and SCADA systems. These devices transmit tiny data packets (a few hundred bytes) at very low cost, making Iridium the dominant provider for remote asset tracking in areas with no cellular coverage. The L-band modem modules are small enough to embed in virtually any device.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        SpaceX has been developing Starlink IoT capabilities that could eventually compete for some of Iridium&apos;s M2M market, though the economics differ significantly. Starlink&apos;s higher bandwidth is overkill for simple asset tracking, and its terminal hardware is currently much larger and more expensive than an Iridium SBD modem. However, for IoT applications that need more data (video monitoring, rich telemetry), Starlink offers capabilities Iridium cannot match. The two systems are likely to coexist for years, with Iridium dominant in low-bandwidth, low-cost, small-terminal IoT and Starlink serving bandwidth-hungry connectivity applications.
      </p>

      {/* Analysis: Government & Defense */}
      <h2 className="text-display text-xl mb-3">Government &amp; Defense</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both companies have deep government relationships but serve different needs. Iridium holds the Enhanced Mobile Satellite Services (EMSS) contract with the U.S. DoD, a five-year, $738 million agreement providing unlimited airtime to military users worldwide. Iridium&apos;s truly global coverage (including polar regions and open oceans) makes it irreplaceable for military users operating in remote environments. SpaceX has developed Starshield, a classified variant of Starlink designed specifically for DoD and intelligence community use, reportedly with additional encryption and hardening. Starlink has also proven its value in the Ukraine conflict, demonstrating the strategic importance of resilient LEO broadband in contested environments. Both systems are now considered critical U.S. national security infrastructure.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track satellite constellations and operators on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=iridium&b=spacex" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/compare/satellites" className="btn-secondary text-sm">Constellation Comparison Tool</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
            { title: 'Starlink vs Kuiper', href: '/compare/starlink-vs-kuiper' },
            { title: 'Iridium vs Globalstar', href: '/compare/iridium-vs-globalstar' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/starlink-oneweb-kuiper-mega-constellation-comparison" className="text-sm text-indigo-400 hover:text-indigo-300">Starlink vs OneWeb vs Kuiper: Mega-Constellation Comparison</Link></li>
          <li><Link href="/blog/space-industry-investment-guide-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry Investment Guide 2026</Link></li>
          <li><Link href="/compare/satellites" className="text-sm text-indigo-400 hover:text-indigo-300">Satellite Constellation Comparison Tool</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Iridium vs Starlink: Satellite Connectivity Comparison 2026',
        description: 'Side-by-side comparison of Iridium and Starlink covering L-band IoT/voice vs broadband, coverage, latency, government contracts, and IoT competition.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/iridium-vs-starlink',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/iridium-vs-starlink']} />
    </div>
  );
}
