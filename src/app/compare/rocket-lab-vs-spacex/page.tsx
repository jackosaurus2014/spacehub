import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2006', b: '2002' },
  { metric: 'Founder / CEO', a: 'Peter Beck (CEO)', b: 'Elon Musk (CEO)' },
  { metric: 'Headquarters', a: 'Long Beach, CA (US HQ); Auckland, NZ (operations)', b: 'Hawthorne, CA' },
  { metric: 'Public / Private', a: 'Public (NASDAQ: RKLB)', b: 'Private' },
  { metric: 'Market Cap / Valuation', a: '~$12B (early 2026)', b: '~$350B+ (2025 secondary market)' },
  { metric: 'Revenue (2024)', a: '~$436M', b: '~$9-10B (est., launch + Starlink)' },
  { metric: 'Employees', a: '~2,000', b: '~13,000' },
  { metric: 'Small Launch Vehicle', a: 'Electron (310 kg to LEO)', b: 'N/A (no small launcher)' },
  { metric: 'Medium Launch Vehicle', a: 'Neutron (in development; ~13,000 kg to LEO)', b: 'Falcon 9 (22,800 kg to LEO)' },
  { metric: 'Heavy / Super Heavy', a: 'None planned', b: 'Falcon Heavy (63,800 kg LEO); Starship (150,000+ kg LEO)' },
  { metric: 'Electron Launches (career)', a: '55+ (through early 2026)', b: 'N/A' },
  { metric: 'Falcon 9 Launches (career)', a: 'N/A', b: '300+ (through early 2026)' },
  { metric: 'Engine Technology', a: 'Rutherford (electric pump-fed, 3D-printed); Archimedes (Neutron, ox-rich staged combustion, LOX/CH4)', b: 'Merlin (gas gen, LOX/RP-1); Raptor (full-flow staged combustion, LOX/CH4)' },
  { metric: 'Reusability (Current)', a: 'Electron — mid-air helicopter catch (demonstrated)', b: 'Falcon 9 — propulsive booster landing (routine, 200+ landings)' },
  { metric: 'Spacecraft Division', a: 'Photon spacecraft bus (8 missions+); Pioneer spacecraft platform', b: 'Crew Dragon, Cargo Dragon, Starship' },
  { metric: 'Solar / Power Systems', a: 'SolAero (acquired 2022) — leading space solar cell manufacturer', b: 'In-house solar panel production for Starlink' },
  { metric: 'Reaction Control', a: 'In-house reaction wheels, star trackers, flight software', b: 'In-house avionics and GNC systems' },
  { metric: 'Satellite Separation Systems', a: 'Planetary Systems Corp (acquired 2021) — industry-standard dispensers', b: 'In-house satellite deployment systems' },
  { metric: 'Key Government Customer', a: 'NRO, NASA (ESCAPADE Mars mission), DARPA', b: 'NASA (Crew, Cargo, HLS), DoD (NSSL), NRO' },
  { metric: 'Constellation Ownership', a: 'None (but builds components used by constellation operators)', b: 'Starlink (6,000+ sats, $6.6B+ revenue)' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Rocket Lab vs SpaceX' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Rocket Lab vs SpaceX</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Rocket Lab vs SpaceX</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The only two companies that have successfully built end-to-end space businesses encompassing launch vehicles, spacecraft platforms, and component manufacturing. SpaceX operates at vastly larger scale with Falcon 9, Starship, and Starlink, while Rocket Lab has built a remarkably diverse space systems company from Electron launches, Photon spacecraft, and strategic acquisitions in solar cells, reaction wheels, and separation systems.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Rocket Lab</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceX</th>
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

      {/* Analysis: The Vertical Integration Playbook */}
      <h2 className="text-display text-xl mb-3">The Vertical Integration Playbook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX pioneered the vertically integrated space company model: designing and manufacturing its own engines, structures, avionics, launch vehicles, spacecraft, and even its primary customer (Starlink). By controlling the entire stack, SpaceX achieves cost efficiencies and iteration speeds that traditional aerospace supply chains cannot match. Rocket Lab has been deliberately following a similar playbook at smaller scale. Through a series of acquisitions &mdash; Planetary Systems Corp (separation systems, 2021), Advanced Solutions Inc (flight software, 2021), SolAero (space solar cells, 2022), and others &mdash; Rocket Lab has assembled the components to be a one-stop shop for satellite missions.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The difference in scale is enormous. SpaceX&apos;s revenue is roughly 20x Rocket Lab&apos;s, and its valuation is roughly 30x larger. But Rocket Lab&apos;s space systems division (which includes spacecraft, solar panels, reaction wheels, star trackers, and separation systems) now generates more revenue than its launch division, making it the rare space company that has diversified beyond launch. Notably, Rocket Lab&apos;s components end up on competitors&apos; satellites: SolAero solar cells have been used on Mars rovers and on satellites that launched on SpaceX rockets.
      </p>

      {/* Analysis: Neutron vs Falcon 9 */}
      <h2 className="text-display text-xl mb-3">Neutron: Challenging Falcon 9</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Rocket Lab&apos;s Neutron rocket is the company&apos;s bid to move from the small-launch market into medium-lift, directly competing with Falcon 9 for constellation deployment, government payloads, and eventually crewed missions. Neutron is designed to lift ~13,000 kg to LEO (expendable) with a reusable first stage powered by the new Archimedes engine (LOX/methane, gas generator cycle). The vehicle features a unique design with a fairing that remains attached to the first stage, opening like a set of jaws to deploy the payload.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Neutron faces the challenge of competing with a Falcon 9 that has been flying since 2010 and has been refined over hundreds of missions. SpaceX&apos;s per-launch cost advantages from booster reuse (Falcon 9 boosters have flown 20+ times each) set a benchmark that a new vehicle must meet from its first flights. However, Neutron&apos;s modern design (methane fuel, carbon composite structure, integrated fairing) could offer advantages in manufacturing cost and refurbishment simplicity. First launch is targeted for 2025-2026, a timeline that has slipped but remains Rocket Lab&apos;s highest strategic priority.
      </p>

      {/* Analysis: Different Scale, Same Ambition */}
      <h2 className="text-display text-xl mb-3">Different Scale, Same Ambition</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Peter Beck has explicitly modeled Rocket Lab on SpaceX&apos;s trajectory: start with launch, add spacecraft, build components, and eventually become an end-to-end space infrastructure company. The key difference is that Rocket Lab does not (yet) operate its own constellation. Starlink generates the majority of SpaceX&apos;s revenue and is the economic engine that funds Starship development. Rocket Lab&apos;s equivalent growth driver is the space systems business, which supplies components and spacecraft to other constellation operators. If Neutron succeeds and Rocket Lab&apos;s space systems revenue continues growing, it could become the second company (after SpaceX) to offer customers a complete solution: build your satellite with our components, put it on our spacecraft bus, and launch it on our rocket.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=rocket-lab&b=spacex" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Rocket Lab vs Astra', href: '/compare/rocket-lab-vs-astra' },
            { title: 'SpaceX vs Arianespace', href: '/compare/spacex-vs-arianespace' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/rocket-lab-spacex-competitor-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Rocket Lab: The SpaceX Competitor to Watch in 2026</Link></li>
          <li><Link href="/blog/spacex-blue-origin-rocket-lab-comparison-2026" className="text-sm text-indigo-400 hover:text-indigo-300">SpaceX vs Blue Origin vs Rocket Lab: Launch Provider Comparison</Link></li>
          <li><Link href="/guide/space-launch-cost-comparison" className="text-sm text-indigo-400 hover:text-indigo-300">Space Launch Cost Comparison 2026</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Rocket Lab vs SpaceX: Full Vertical Comparison 2026',
        description: 'Side-by-side comparison of Rocket Lab and SpaceX covering launch vehicles, spacecraft, components, and the vertical integration strategy.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/rocket-lab-vs-spacex',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/rocket-lab-vs-spacex']} />
    </div>
  );
}
