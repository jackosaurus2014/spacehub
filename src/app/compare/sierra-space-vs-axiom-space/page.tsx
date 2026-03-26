import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded / Spun Out', a: '2021 (spun out of Sierra Nevada Corporation, est. 1963)', b: '2016' },
  { metric: 'Founder / CEO', a: 'Tom Vice (CEO); Fatih & Eren Ozmen (SNC owners since 1994)', b: 'Michael Suffredini (CEO, former ISS program manager)' },
  { metric: 'Headquarters', a: 'Broomfield, CO', b: 'Houston, TX' },
  { metric: 'Public / Private', a: 'Private', b: 'Private' },
  { metric: 'Valuation', a: '~$5.3B (2023 Series A)', b: 'Est. $2-2.5B (2023 Series C)' },
  { metric: 'Total Funding', a: '~$1.5B+ (raised through 2023)', b: '~$505M+' },
  { metric: 'Employees', a: '~1,800 (Sierra Space) + SNC shared resources', b: '~700+' },
  { metric: 'Crew / Cargo Vehicle', a: 'Dream Chaser (winged spaceplane, CRS-2 cargo to ISS)', b: 'Uses SpaceX Crew Dragon (no proprietary vehicle)' },
  { metric: 'Dream Chaser Status', a: 'First flight expected 2025-2026 (NASA CRS-2 cargo mission)', b: 'N/A' },
  { metric: 'Station Program', a: 'Orbital Reef (partnership with Blue Origin, Boeing, others)', b: 'Axiom Station (modules attach to ISS, then detach)' },
  { metric: 'Station Architecture', a: 'Independent freeflying station; LIFE inflatable module technology', b: 'ISS-attached first, then freeflying after ISS decommission' },
  { metric: 'LIFE Module', a: 'Large Integrated Flexible Environment — inflatable hab (300+ m3)', b: 'N/A (rigid modules, traditional construction)' },
  { metric: 'First Station Hardware', a: 'Orbital Reef targeted late 2020s', b: 'AxH1 module targeted for late 2026 (ISS attachment)' },
  { metric: 'NASA CLD (Commercial LEO Destinations)', a: 'Yes — Orbital Reef selected for CLD Phase 1 ($130M award, Dec 2021, via Blue Origin partnership)', b: 'Not selected for CLD Phase 1 (has separate Space Act Agreement for ISS module attachment)' },
  { metric: 'NASA Contracts', a: 'CRS-2 (Dream Chaser cargo); SNC/Sierra legacy defense & space work', b: 'Ax-1/2/3/4 private astronaut missions; AxEMU spacesuit for Artemis III' },
  { metric: 'Private Astronaut Missions', a: 'None (no crewed vehicle yet)', b: 'Ax-1 (2022), Ax-2 (2023), Ax-3 (2024), Ax-4 (planned)' },
  { metric: 'EVA Spacesuit', a: 'No spacesuit program', b: 'AxEMU — next-gen EVA suit for Artemis III (NASA contract)' },
  { metric: 'In-Space Manufacturing', a: 'Sierra Space ISM — fiber optics, pharmaceuticals in microgravity', b: 'Research & manufacturing planned for Axiom Station modules' },
  { metric: 'Key Differentiator', a: 'Dream Chaser spaceplane + inflatable LIFE module technology', b: 'ISS flight heritage + only company flying private crews today' },
  { metric: 'Revenue Model', a: 'NASA CRS cargo delivery, in-space manufacturing, defense contracts', b: 'Private astronaut missions (~$55M/seat), ISS operations, AxEMU suit' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Sierra Space vs Axiom Space' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Sierra Space vs Axiom Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Sierra Space vs Axiom Space</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two very different approaches to commercial space infrastructure. Sierra Space brings the Dream Chaser winged spaceplane and inflatable LIFE module technology from its Sierra Nevada Corporation heritage. Axiom Space leverages ISS operational experience and is already flying private astronaut missions, with hardware destined to physically attach to the ISS before becoming an independent station. Both are among the most well-funded commercial space companies outside of SpaceX and Blue Origin.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Sierra Space</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Axiom Space</th>
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

      {/* Analysis: Dream Chaser vs Private Astronaut Missions */}
      <h2 className="text-display text-xl mb-3">Dream Chaser vs Private Astronaut Missions</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Sierra Space&apos;s Dream Chaser is the only winged orbital vehicle in development for ISS cargo delivery. Unlike capsule-based spacecraft (Dragon, Starliner, Cygnus), Dream Chaser lands on a conventional runway, potentially enabling faster payload retrieval and lower refurbishment costs. The vehicle has been in development in various forms since the 2000s (originally for NASA&apos;s Commercial Crew program, where it lost to SpaceX and Boeing), and is now contracted for at least 6 NASA CRS-2 cargo missions. First flight has been repeatedly delayed, now expected in 2025-2026.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Axiom Space has something no other commercial station company possesses: actual flight experience. Through its Ax-1, Ax-2, and Ax-3 private astronaut missions to the ISS (using SpaceX&apos;s Crew Dragon and Falcon 9), Axiom has demonstrated the ability to train crews, manage mission operations, and generate revenue from human spaceflight. Each mission seat costs approximately $55 million. Axiom has also won the contract to develop NASA&apos;s next-generation EVA spacesuit (AxEMU) for the Artemis III mission, which represents both a significant revenue source and a vote of confidence from NASA in Axiom&apos;s technical capabilities.
      </p>

      {/* Analysis: Station Architectures */}
      <h2 className="text-display text-xl mb-3">Station Architectures: Inflatable vs Rigid</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Sierra Space&apos;s most innovative technology may be its LIFE (Large Integrated Flexible Environment) inflatable habitat module. LIFE is designed to provide over 300 cubic meters of pressurized volume when fully inflated &mdash; roughly one-third the total volume of the entire ISS &mdash; from a single module that launches in a compressed state. Sierra Space has conducted multiple burst-pressure tests demonstrating the softgoods shell can withstand pressures well beyond design requirements. The LIFE module is intended for the Orbital Reef commercial station (a partnership with Blue Origin).
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Axiom Space is using traditional rigid module construction for its station, similar to ISS module design. The first module (AxH1) is being built by Thales Alenia Space in Turin, Italy &mdash; the same company that built several ISS modules. Axiom&apos;s approach trades the volume efficiency of inflatables for the certainty and heritage of proven construction techniques. The modules will initially attach to the ISS (specifically to Node 2&apos;s forward port), allowing Axiom to validate its hardware in an operational environment with ISS life support and crew access before the segment eventually detaches as an independent station after ISS decommissioning.
      </p>

      {/* Analysis: Funding and Sustainability */}
      <h2 className="text-display text-xl mb-3">Funding &amp; Path to Sustainability</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Sierra Space raised over $1.4 billion at a $5.3 billion valuation in its 2023 Series A round, led by Coatue Management and Moore Strategic Ventures. The company benefits from shared resources with parent Sierra Nevada Corporation, a diversified defense and aerospace contractor. However, Sierra Space is pre-revenue from its own programs (Dream Chaser has not yet flown) and depends on the Orbital Reef partnership timeline, which is tied to Blue Origin&apos;s development cadence. Axiom Space has raised approximately $505 million through its Series C, at a lower valuation than Sierra Space, but is already generating revenue from private astronaut missions and the AxEMU spacesuit contract. Axiom&apos;s nearer-term hardware timeline (AxH1 targeted for 2026) and existing revenue streams give it a stronger argument for near-term sustainability, though both companies will need additional capital to complete their station programs.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track commercial space stations and companies on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=sierra-space&b=axiom-space" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/space-stations" className="btn-secondary text-sm">Space Stations Tracker</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Axiom Space vs Vast', href: '/compare/axiom-vs-vast' },
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Virgin Galactic vs Blue Origin', href: '/compare/virgin-galactic-vs-blue-origin' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/commercial-space-stations-race-to-replace-iss" className="text-sm text-indigo-400 hover:text-indigo-300">The Race to Replace the ISS: Commercial Space Stations Explained</Link></li>
          <li><Link href="/blog/sierra-space-vast-billion-dollar-raises-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Sierra Space and Vast Raise Over $1 Billion</Link></li>
          <li><Link href="/blog/space-industry-investment-guide-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry Investment Guide 2026</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Sierra Space vs Axiom Space: Commercial Space Comparison 2026',
        description: 'Side-by-side comparison of Sierra Space and Axiom Space covering Dream Chaser, commercial stations, crew missions, and funding.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/sierra-space-vs-axiom-space',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/sierra-space-vs-axiom-space']} />
    </div>
  );
}
