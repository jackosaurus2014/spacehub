import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Parent Company Founded', a: '1939 (Northrop); 1994 merger with Grumman', b: '1916' },
  { metric: 'Headquarters', a: 'Falls Church, VA', b: 'Arlington, VA (Boeing HQ); Houston, TX (space division)' },
  { metric: 'Space Division', a: 'Space Systems sector', b: 'Boeing Space & Launch (within Defense, Space & Security)' },
  { metric: 'Total Company Revenue (2024)', a: '~$41B', b: '~$66B (total Boeing; defense/space ~$25B)' },
  { metric: 'Space Revenue (est.)', a: '~$13B (Space Systems sector)', b: '~$7-8B (space and launch programs est.)' },
  { metric: 'Employees (Space)', a: '~25,000+ (Space Systems sector)', b: '~15,000+ (space and launch est.)' },
  { metric: 'Crew Vehicle', a: 'None (subcontractor on various programs)', b: 'Starliner CST-100 (crewed flight 2024; program troubled)' },
  { metric: 'Cargo Resupply', a: 'Cygnus spacecraft (CRS-2 contract with NASA)', b: 'N/A (not in ISS cargo resupply currently)' },
  { metric: 'Launch Vehicle (Heritage)', a: 'Antares (retired; MLV with Firefly replacing it)', b: 'SLS core stage (NASA Artemis program)' },
  { metric: 'Solid Rocket Boosters', a: 'SLS solid rocket boosters (2 per Artemis launch); GEM-63XL for Vulcan', b: 'N/A (SLS uses Northrop SRBs)' },
  { metric: 'Satellite Manufacturing', a: 'GEOStar bus, ESPAStar bus; SBIRS, GPS III payloads', b: 'WGS, O3b mPOWER (for SES); commercial GEO satellites (702 bus)' },
  { metric: 'Key Defense Programs', a: 'SBIRS/NGG (missile warning), JWST, SDA Proliferated Warfighter Space', b: 'SLS, ISS operations, X-37B, SDA satellites, GPS ground segment' },
  { metric: 'ISS Role', a: 'Cygnus cargo missions', b: 'ISS prime contractor (operations, maintenance)' },
  { metric: 'James Webb Space Telescope', a: 'Prime contractor (built and delivered JWST)', b: 'Not a primary JWST contractor' },
  { metric: 'SDA / Space Development Agency', a: 'Major Tranche 1 & 2 transport layer contractor', b: 'SDA Tranche contracts (tracking and transport layers)' },
  { metric: 'In-Space Servicing', a: 'MEV-1, MEV-2 (Mission Extension Vehicles) — first commercial in-space servicing', b: 'No operational in-space servicing program' },
  { metric: 'Propulsion', a: 'OmegA (cancelled); solid rocket motors (SRBs for SLS, Vulcan)', b: 'SLS core stage integration (RS-25 engines by Aerojet Rocketdyne); Delta IV retired' },
  { metric: 'Autonomous Systems', a: 'Limited in space (more in defense aircraft sector)', b: 'X-37B spaceplane (USSF, autonomous orbital missions)' },
  { metric: 'Key Challenges', a: 'Antares replacement timeline; competition from SpaceX in defense', b: 'Starliner program delays/cost overruns; SLS sustainability debate' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Northrop Grumman vs Boeing Space' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Northrop Grumman vs Boeing Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Northrop Grumman vs Boeing Space</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two legacy defense primes with massive space portfolios facing the same strategic challenge: adapting to a new era dominated by commercial space companies and DoD demands for rapid, affordable satellite architectures. Northrop Grumman is the larger space player by revenue, while Boeing carries the weight of flagship programs like SLS and Starliner that have faced significant cost and schedule challenges.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Northrop Grumman</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Boeing Space</th>
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

      {/* Analysis: Flagship Programs & Struggles */}
      <h2 className="text-display text-xl mb-3">Flagship Programs &amp; Program Execution</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Boeing&apos;s space division has been defined in recent years by the challenges of two flagship programs. The Space Launch System (SLS), for which Boeing builds the core stage, has been the most expensive rocket program in NASA history, with development costs exceeding $23 billion. While SLS successfully flew Artemis I in November 2022, its cost (~$2.2 billion per launch including ground systems) and pace (approximately one launch per two years) have drawn intense criticism, especially compared to SpaceX&apos;s Starship. Starliner, Boeing&apos;s crew capsule, conducted its first crewed flight test in June 2024 after years of delays, but the mission experienced thruster problems and a helium leak, resulting in the crew returning on SpaceX&apos;s Crew Dragon instead. Boeing has taken over $1.5 billion in cumulative charges on the fixed-price Starliner contract.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Northrop Grumman&apos;s highest-profile space achievement is the James Webb Space Telescope (JWST), which launched in December 2021 and is universally regarded as one of the most successful science missions in history. Northrop Grumman also builds the SLS solid rocket boosters (derived from Shuttle heritage), delivers Cygnus cargo to the ISS on a regular cadence, and pioneered commercial in-space servicing with its MEV-1 and MEV-2 (Mission Extension Vehicle) satellites, which have docked with GEO satellites to extend their operational lives. On the defense side, Northrop Grumman is a major SDA (Space Development Agency) contractor for the proliferated LEO defense constellation.
      </p>

      {/* Analysis: Defense Modernization */}
      <h2 className="text-display text-xl mb-3">Adapting to Defense Modernization</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        The U.S. Department of Defense is undergoing a fundamental shift in space architecture: moving from a small number of exquisite, expensive satellites (like SBIRS missile warning satellites or WGS communications satellites) to a proliferated constellation of smaller, cheaper, more resilient satellites under the Space Development Agency&apos;s Proliferated Warfighter Space (PWS) architecture. Both Northrop Grumman and Boeing are competing for SDA transport and tracking layer contracts alongside newer entrants like L3Harris, York Space Systems, and Lockheed Martin.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Northrop Grumman has been more aggressive in embracing this new paradigm, winning major SDA Tranche 1 and Tranche 2 transport layer contracts and investing in its Firefly partnership to secure a medium-class launch vehicle (MLV) that could serve defense constellation deployment needs. Boeing has SDA contracts as well, but its space division has been more focused on sustaining legacy programs (ISS operations, SLS production). The question for both companies is whether their traditional cost-plus government contracting culture can adapt to the faster, cheaper, fixed-price model that SDA and the Space Force demand.
      </p>

      {/* Analysis: In-Space Servicing */}
      <h2 className="text-display text-xl mb-3">Innovation: In-Space Servicing &amp; Autonomous Systems</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Northrop Grumman has carved out a unique niche with its Mission Extension Vehicle program. MEV-1 docked with the Intelsat-901 satellite in 2020, and MEV-2 docked with Intelsat-10-02 in 2021, extending the operational lives of both GEO satellites by providing propulsion and attitude control. This pioneered the commercial in-space servicing market, and Northrop Grumman is developing a next-generation Mission Robotic Vehicle (MRV) that will be able to service multiple satellites. Boeing, meanwhile, operates the X-37B &mdash; a reusable autonomous spaceplane that has conducted multiple classified missions for the U.S. Space Force, spending years at a time in orbit conducting unknown experiments. While the X-37B&apos;s exact missions are classified, it represents an unmatched capability in autonomous orbital operations.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track defense primes and space contracts on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=northrop-grumman&b=boeing" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Boeing vs Lockheed Space', href: '/compare/boeing-vs-lockheed-space' },
            { title: 'Northrop Grumman vs L3Harris', href: '/compare/northrop-grumman-vs-l3harris-space' },
            { title: 'SpaceX vs ULA', href: '/compare/spacex-vs-ula' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/space-industry-mergers-acquisitions-biggest-deals" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry M&amp;A: The Biggest Deals</Link></li>
          <li><Link href="/blog/spacex-blue-origin-rocket-lab-comparison-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Launch Provider Comparison 2026</Link></li>
          <li><Link href="/guide/space-launch-cost-comparison" className="text-sm text-indigo-400 hover:text-indigo-300">Space Launch Cost Comparison 2026</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Northrop Grumman vs Boeing Space: Defense Prime Comparison 2026',
        description: 'Side-by-side comparison of Northrop Grumman and Boeing space divisions covering defense programs, crew vehicles, satellite manufacturing, and strategic direction.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/northrop-grumman-vs-boeing-space',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/northrop-grumman-vs-boeing-space']} />
    </div>
  );
}
