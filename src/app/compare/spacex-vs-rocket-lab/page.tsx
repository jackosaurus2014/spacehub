import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'SpaceX vs Rocket Lab: Complete Comparison 2026',
  description: 'Compare SpaceX and Rocket Lab side by side — launch vehicles, payload capacity, launch cadence, pricing, revenue, government contracts, vertical integration, and strategy. Falcon 9 and Starship vs Electron and Neutron.',
  keywords: ['SpaceX vs Rocket Lab', 'Falcon 9 vs Electron', 'Neutron rocket', 'small launch vs heavy lift', 'launch vehicle comparison', 'RKLB stock', 'SpaceX valuation', 'Rocket Lab Neutron'],
  openGraph: {
    title: 'SpaceX vs Rocket Lab: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SpaceX and Rocket Lab covering launch vehicles, cadence, revenue, government contracts, and market positioning.',
    url: 'https://spacenexus.us/compare/spacex-vs-rocket-lab',
    type: 'article',
    images: [{
      url: '/api/og?title=SpaceX+vs+Rocket+Lab&subtitle=Complete+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'SpaceX vs Rocket Lab Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceX vs Rocket Lab: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SpaceX and Rocket Lab — launch vehicles, revenue, government contracts, and strategy.',
    images: ['/api/og?title=SpaceX+vs+Rocket+Lab&subtitle=Complete+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spacex-vs-rocket-lab' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2002', b: '2006' },
  { metric: 'Founder', a: 'Elon Musk', b: 'Peter Beck' },
  { metric: 'Headquarters', a: 'Hawthorne, CA, USA', b: 'Long Beach, CA, USA (HQ); Mahia, NZ (operations)' },
  { metric: 'Employees', a: '~13,000', b: '~2,100' },
  { metric: 'Publicly Traded', a: 'No (private)', b: 'Yes (RKLB, Nasdaq)' },
  { metric: 'Valuation / Market Cap', a: '~$350B+ (private, 2025)', b: '~$12B+ (market cap, early 2026)' },
  { metric: 'Annual Revenue (est.)', a: '~$15B+ (2025, including Starlink)', b: '~$436M (FY 2025)' },
  { metric: 'Primary Launch Vehicle', a: 'Falcon 9 / Falcon Heavy / Starship', b: 'Electron / Neutron (in development)' },
  { metric: 'Vehicle Class', a: 'Medium, heavy, super-heavy lift', b: 'Small lift (Electron); medium lift (Neutron planned)' },
  { metric: 'LEO Payload — Primary', a: '22,800 kg (Falcon 9) / 63,800 kg (FH)', b: '300 kg (Electron) / ~13,000 kg (Neutron target)' },
  { metric: 'GTO Payload', a: '8,300 kg (F9) / 26,700 kg (FH)', b: 'N/A (Electron) / ~1,500 kg (Neutron target)' },
  { metric: 'Launch Cadence (2024)', a: '130+ launches', b: '~16 Electron launches' },
  { metric: 'Total Orbital Launches (Career)', a: '350+', b: '55+ (Electron)' },
  { metric: 'Launch Success Rate', a: '~99% (Falcon 9)', b: '~93% (Electron)' },
  { metric: 'Launch Price (approx.)', a: '~$67M (Falcon 9 commercial)', b: '~$8M (Electron dedicated)' },
  { metric: 'Cost per kg to LEO', a: '~$2,700/kg (F9) / ~$1,500/kg (FH)', b: '~$26,000/kg (Electron) / ~$600/kg (Neutron target)' },
  { metric: 'First Stage Reusability', a: 'Falcon 9 booster (200+ landings; up to 23x reuse)', b: 'Electron helicopter catch (program ongoing)' },
  { metric: 'Launch Sites', a: 'Cape Canaveral (SLC-40), KSC (LC-39A), Vandenberg (SLC-4E), Boca Chica (Starbase)', b: 'Mahia, NZ (LC-1); Wallops, VA (LC-2)' },
  { metric: 'Satellite Constellation', a: 'Starlink (6,000+ operational sats; 12,000 licensed)', b: 'None — builds satellite buses for customers' },
  { metric: 'Space Systems', a: 'Dragon (crew + cargo), Starlink sats (in-house)', b: 'Photon/Pioneer bus; SolAero solar cells; Sinclair reaction wheels' },
  { metric: 'NASA Contracts', a: 'Crew Dragon, CRS cargo, HLS lunar lander, CLPS', b: 'CAPSTONE (lunar), ESCAPADE (Mars), Venus Life Finder' },
  { metric: 'DoD / NatSec Contracts', a: 'NSSL Phase 2, NSSL Lane 1, Starshield', b: 'NRO missions, SDA Tranche contracts' },
  { metric: 'Revenue Breakdown', a: '~60% Starlink, ~40% launch services', b: '~55% space systems, ~45% launch services' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'SpaceX vs Rocket Lab' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">SpaceX vs Rocket Lab</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceX vs Rocket Lab</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Comparing the world&apos;s most prolific launch provider against the leading small-launch company — heavy lift and mega-constellation versus dedicated rideshare, responsive launch, and growing space systems business.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceX</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Rocket Lab</th>
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

      {/* Key Differences */}
      <h2 className="text-display text-xl mb-3">Key Differences</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX and Rocket Lab largely serve different market segments rather than competing head-to-head. SpaceX dominates medium-to-heavy-lift launches with Falcon 9, running at over 130 missions per year by 2024, and is developing Starship for payloads up to 150,000 kg to LEO. Rocket Lab&apos;s Electron is optimized for dedicated small satellite launches under 300 kg, offering mission control, orbital flexibility, and reliability that rideshare manifests cannot match. Electron is the second-most-launched orbital rocket globally by cadence among western providers.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The comparison becomes more direct as Rocket Lab&apos;s Neutron vehicle targets the 13,000 kg class — competing more directly with a future partially reusable medium-lift market. Rocket Lab has also expanded beyond launch into space systems via its Photon bus and acquisitions, mirroring SpaceX&apos;s vertical integration approach but at a smaller scale.
      </p>

      {/* Revenue & Business Model */}
      <h2 className="text-display text-xl mb-3">Revenue &amp; Business Model</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX&apos;s revenue is estimated at over $15 billion annually (2025), driven primarily by the Starlink broadband constellation which accounts for roughly 60% of total revenue. Launch services — including commercial, NASA, and DoD missions — make up the remainder. SpaceX&apos;s Starlink recurring subscription revenue provides a fundamentally different financial profile than a pure launch company, with higher margins and predictable cash flow.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Rocket Lab generated approximately $436 million in revenue for FY 2025, a significant growth year. Notably, space systems revenue now exceeds launch revenue at roughly a 55/45 split, reflecting the company&apos;s successful expansion beyond launch. The Photon satellite bus, SolAero solar cells (used on Mars Ingenuity helicopter), and Sinclair reaction wheels generate growing component and bus revenue. This diversification is critical: while Electron generates ~$8M per dedicated launch, the space systems backlog provides more predictable revenue.
      </p>

      {/* Vertical Integration */}
      <h2 className="text-display text-xl mb-3">Vertical Integration</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Both companies have pursued vertical integration, but at vastly different scales. SpaceX manufactures the majority of its components in-house, including Merlin and Raptor engines, avionics, Starlink satellites, and Dragon spacecraft. This level of vertical integration has given SpaceX unmatched cost control and rapid iteration capability.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Rocket Lab has built its own vertically integrated stack through a series of strategic acquisitions. Rutherford engines are 3D-printed in-house, SolAero provides space-grade solar cells, Sinclair supplies attitude control systems, and the Photon/Pioneer bus enables turnkey satellite missions. This approach allows Rocket Lab to offer end-to-end mission solutions from a single vendor — launch, satellite bus, subsystems, and mission operations — which is particularly appealing to government customers with rapid-deployment requirements.
      </p>

      {/* Government & Defense */}
      <h2 className="text-display text-xl mb-3">Government &amp; Defense Contracts</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX is a dominant force in U.S. government launch, holding NSSL Phase 2 and Lane 1 contracts with the U.S. Space Force and serving as NASA&apos;s primary crew and cargo transport to the ISS. SpaceX also won the Artemis HLS contract for the Starship-derived lunar lander and operates the classified Starshield program for national security missions.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Rocket Lab has carved out a strong niche in the responsive small-launch segment for national security. The company has flown multiple classified NRO missions on Electron, demonstrating the ability to provide dedicated, rapid-turnaround access to specific orbits that rideshare cannot achieve. Rocket Lab has also won SDA (Space Development Agency) Tranche contracts for satellite delivery and is well-positioned for the growing DoD demand for proliferated LEO constellation deployment.
      </p>

      {/* Future Outlook */}
      <h2 className="text-display text-xl mb-3">Future Outlook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        SpaceX&apos;s near-term trajectory is defined by Starship&apos;s operational maturation and Starlink&apos;s revenue growth toward a potential IPO. If Starship achieves reliable operations, it will fundamentally alter the economics of space access with its target cost per kg below $100 to LEO. Rocket Lab&apos;s inflection point is Neutron: a reusable medium-lift vehicle targeting ~$50M per launch that would directly compete for commercial and government missions in the most active segment of the market. Rocket Lab&apos;s stock (RKLB) surged roughly 700% in 2024 on investor enthusiasm for the Neutron program and growing space systems revenue. Both companies represent the clearest examples of new-space execution, though at very different scales.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=spacex&b=rocket-lab" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs ULA', href: '/compare/spacex-vs-ula' },
            { title: 'Rocket Lab vs Astra Space', href: '/compare/rocket-lab-vs-astra' },
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'SpaceX vs Rocket Lab: Complete Comparison 2026',
        description: 'Side-by-side comparison of SpaceX and Rocket Lab covering launch vehicles, cadence, revenue, government contracts, and market positioning.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-25',
        url: 'https://spacenexus.us/compare/spacex-vs-rocket-lab',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/spacex-vs-rocket-lab']} />
    </div>
  );
}
