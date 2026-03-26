import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2016', b: '2021' },
  { metric: 'Founder / CEO', a: 'Michael Suffredini (former ISS program manager)', b: 'Jed McCaleb (co-founder of Ripple, Stellar)' },
  { metric: 'Headquarters', a: 'Houston, TX', b: 'Long Beach, CA' },
  { metric: 'Employees', a: '~700+', b: '~400+' },
  { metric: 'Total Funding', a: '~$505M+ (Series C, 2023)', b: '~$400M+ (including $100M Launcher acquisition)' },
  { metric: 'Valuation', a: 'Private (est. $3B+)', b: 'Private (est. $1.4B+, per last round)' },
  { metric: 'Station Architecture', a: 'Modules attach to ISS first, then detach as freeflying station', b: 'Independent freeflying station from the start (Haven-1)' },
  { metric: 'First Module', a: 'Axiom Hab 1 (AxH1) — attach to ISS forward Node 2 port', b: 'Haven-1 — single-module station launched independently' },
  { metric: 'Target Launch (First Module)', a: 'Late 2026 (AxH1 to ISS)', b: '2025-2026 (Haven-1 on Falcon 9)' },
  { metric: 'Full Station Completion', a: '~2028-2030 (4 modules, then ISS detach)', b: 'Multi-module expansion after Haven-1 proven' },
  { metric: 'Crew Capacity', a: '4-8 crew (expandable)', b: 'Up to 4 crew (Haven-1 initial config)' },
  { metric: 'Pressurized Volume', a: '~200+ m3 (full station planned)', b: '~18 m3 (Haven-1, single module)' },
  { metric: 'NASA CLD Contract', a: 'No — Axiom has a separate Space Act Agreement for ISS attachment', b: 'Yes — selected for NASA Commercial LEO Destinations program' },
  { metric: 'ISS Dependency', a: 'Initial modules attach to ISS; mitigates early risk', b: 'No ISS dependency; fully independent station' },
  { metric: 'Private Astronaut Missions', a: 'Ax-1 (2022), Ax-2 (2023), Ax-3 (2024), Ax-4 (planned) — all to ISS', b: 'No missions flown yet' },
  { metric: 'Spacesuit Program', a: 'AxEMU next-gen EVA suit for Artemis III (NASA contract)', b: 'None' },
  { metric: 'Launch Vehicle', a: 'SpaceX Falcon 9 / Dragon (crew), Falcon Heavy (modules)', b: 'SpaceX Falcon 9 (Haven-1 + Crew Dragon)' },
  { metric: 'Revenue Streams', a: 'Private astronaut missions, NASA research, ISS operations, spacesuit development', b: 'Space station services, in-orbit research, Launcher rocket engines' },
  { metric: 'Key Differentiator', a: 'ISS heritage + proven crewed mission operations', b: 'Speed to market via single-module approach + artificial gravity R&D' },
  { metric: 'Artificial Gravity', a: 'Not announced', b: 'Long-term vision includes spin gravity modules' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Axiom Space vs Vast' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Axiom Space vs Vast</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Axiom Space vs Vast</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The International Space Station is approaching end of life, and these two companies are leading the race to build its commercial successors. Axiom Space leverages ISS heritage with modules that initially attach to the station, while Vast is building an independent station from scratch with ambitions for artificial gravity.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Axiom Space</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Vast</th>
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

      {/* Architecture Comparison */}
      <h2 className="text-display text-xl mb-3">Station Architecture: ISS Attachment vs Independent</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Axiom Space&apos;s strategy is to attach its first modules directly to the International Space Station, leveraging the ISS as a proving ground. The first Axiom module (AxH1) will dock to the ISS forward Node 2 port, followed by additional modules including a lab, a panoramic observatory, and a power/thermal module. Once the ISS is decommissioned (currently planned for ~2030), the Axiom segment will detach and operate as a free-flying commercial station. This incremental approach significantly de-risks the program &mdash; Axiom modules benefit from the ISS&apos;s existing life support, power, and crew support systems during the initial validation phase.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Vast is taking a bolder, potentially faster path: launching Haven-1 as a fully independent, single-module station on a SpaceX Falcon 9. Haven-1 is designed as an 18 cubic meter pressurized module that can host up to 4 crew, delivered via Crew Dragon. While smaller than Axiom&apos;s eventual multi-module station, Vast&apos;s approach avoids the complexities and timeline dependencies of ISS integration. Vast acquired Launcher (now Vast Access) in 2023 for its rocket engine technology and manufacturing capabilities, and has expressed long-term ambitions for a larger station incorporating artificial gravity through spin modules &mdash; a capability no commercial station has attempted.
      </p>

      {/* Business Model */}
      <h2 className="text-display text-xl mb-3">Business Model &amp; Revenue</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Axiom Space is already generating revenue through its private astronaut missions to the ISS. The Ax-1 mission (April 2022) was the first fully private crew to visit the ISS, followed by Ax-2 (2023) and Ax-3 (2024, which included ESA-sponsored astronauts). Each mission costs approximately $55 million per seat. Axiom also holds the NASA contract to develop the Artemis III next-generation EVA spacesuit (AxEMU), providing an additional revenue stream and government relationship. These operational programs give Axiom something few space station startups have: actual flight heritage and current cash flow.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Vast is pre-revenue but well-funded, backed primarily by founder Jed McCaleb&apos;s personal fortune from co-founding Ripple and Stellar. The company has raised over $400 million and was selected as one of NASA&apos;s Commercial LEO Destinations (CLD) partners, providing a government anchor customer. Vast&apos;s revenue model centers on selling research time, microgravity manufacturing access, and crew accommodation aboard its station. The Launcher acquisition adds a potential propulsion and access services revenue stream, though Vast is years away from generating meaningful revenue from station operations.
      </p>

      {/* Post-ISS Era */}
      <h2 className="text-display text-xl mb-3">The Post-ISS Landscape</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        NASA&apos;s plan to deorbit the ISS around 2030 creates both urgency and opportunity. The agency has committed to purchasing services from commercial stations rather than building an ISS successor, and has awarded CLD contracts to Vast, Blue Origin (Orbital Reef), and Nanoracks (Starlab). Axiom holds a unique position as the only company with an approved plan to physically attach to the ISS. The transition period is critical &mdash; NASA needs at least one commercial station operational before the ISS retires to avoid a gap in U.S. human spaceflight capabilities in LEO. Both Axiom and Vast are targeting launch timelines of 2025-2026 for their first hardware, making them the most likely candidates to have operational habitats before the ISS departs.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=axiom-space&b=vast" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Virgin Galactic vs Blue Origin', href: '/compare/virgin-galactic-vs-blue-origin' },
            { title: 'Boeing vs Lockheed Space', href: '/compare/boeing-vs-lockheed-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Axiom Space vs Vast: Commercial Space Station Comparison 2026',
        description: 'Side-by-side comparison of Axiom Space and Vast covering station architectures, NASA CLD contracts, funding, timelines, and business models for the post-ISS era.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-25', dateModified: '2026-03-25',
        url: 'https://spacenexus.us/compare/axiom-vs-vast',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/axiom-vs-vast']} />
    </div>
  );
}
