import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2013', b: '2007' },
  { metric: 'Founder / CEO', a: 'Steve Altemus (CEO), Tim Crain, Kam Ghaffarian', b: 'John Thornton (CEO); spun out from Carnegie Mellon (Red Whittaker lab)' },
  { metric: 'Headquarters', a: 'Houston, TX', b: 'Pittsburgh, PA' },
  { metric: 'Public / Private', a: 'Public (NASDAQ: LUNR, via SPAC 2023)', b: 'Private' },
  { metric: 'Market Cap / Valuation', a: '~$3B+ (as of early 2026, volatile)', b: 'Private (est. $500M-1B+ range)' },
  { metric: 'Total Funding', a: '~$250M+ (SPAC + follow-on raises)', b: '~$380M+ (including government contracts and private investment)' },
  { metric: 'Employees', a: '~400+', b: '~350+' },
  { metric: 'Primary Lander', a: 'Nova-C (small lander, ~100 kg payload to surface)', b: 'Peregrine (small lander, ~90 kg payload to surface)' },
  { metric: 'Large Lander', a: 'Nova-D (in development, larger payload capacity)', b: 'Griffin (larger lander; carries VIPER rover — ~430 kg payload)' },
  { metric: 'First Mission', a: 'IM-1 (Odysseus) — Feb 2024: reached lunar surface, tipped on side', b: 'Peregrine Mission One — Jan 2024: propulsion anomaly, never reached Moon' },
  { metric: 'First Mission Outcome', a: 'Partial success — landed but tipped over; operated ~7 days', b: 'Failure — propellant leak after separation; re-entered Earth atmosphere' },
  { metric: 'Second Mission', a: 'IM-2 — launched early 2025 targeting lunar south pole', b: 'Griffin Mission One (VIPER rover) — timeline uncertain after Peregrine failure' },
  { metric: 'CLPS Contract Value (cumulative)', a: '~$300M+ across IM-1, IM-2, IM-3 task orders', b: '~$320M+ across Peregrine and Griffin/VIPER task orders' },
  { metric: 'NASA CLPS Role', a: 'Delivery of NASA payloads to lunar surface (instruments, tech demos)', b: 'Delivery of NASA payloads + VIPER rover to lunar south pole' },
  { metric: 'Propulsion', a: 'LOX/methane (VR900 engine, developed in-house)', b: 'Bipropellant (hydrazine/MON-3 heritage-based systems)' },
  { metric: 'Lunar Terrain Vehicle', a: 'No (focused on landers)', b: 'MoonRanger micro-rover (Carnegie Mellon partnership)' },
  { metric: 'Communications Network', a: 'Developing lunar relay/comms capability', b: 'LunaNet relay services via Griffin missions' },
  { metric: 'Lunar Data Service', a: 'Lunar Data Network (comms + nav as a service)', b: 'Lunar delivery-as-a-service for commercial/government payloads' },
  { metric: 'Key Differentiator', a: 'First U.S. company to soft-land on Moon (albeit imperfectly); public company', b: 'VIPER rover delivery contract; deep CMU robotics heritage' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Intuitive Machines vs Astrobotic' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Intuitive Machines vs Astrobotic</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Intuitive Machines vs Astrobotic</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The two leading commercial lunar lander companies, both selected as primary vendors under NASA&apos;s Commercial Lunar Payload Services (CLPS) program. Both attempted their first Moon missions in early 2024 with mixed results: Intuitive Machines&apos; Odysseus became the first U.S. vehicle to reach the lunar surface in over 50 years (though it tipped on landing), while Astrobotic&apos;s Peregrine suffered a propulsion failure and never reached the Moon.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Intuitive Machines</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Astrobotic</th>
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

      {/* Analysis: First Missions */}
      <h2 className="text-display text-xl mb-3">First Missions: Hard Lessons on the Moon</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Astrobotic&apos;s Peregrine Mission One launched on January 8, 2024 aboard a ULA Vulcan Centaur (that rocket&apos;s maiden flight). Shortly after separation from the upper stage, Peregrine experienced a propulsion system anomaly that caused a propellant leak, preventing orbit adjustments needed for lunar transit. The lander was unable to reach the Moon and eventually re-entered Earth&apos;s atmosphere over the South Pacific. An investigation pointed to a valve failure in the propulsion system. Despite the mission failure, the launch itself was a success for ULA&apos;s Vulcan, and several NASA payloads collected some data during the short operational period.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Intuitive Machines&apos; IM-1 mission (Odysseus lander) launched on February 15, 2024 aboard a SpaceX Falcon 9 and successfully entered lunar orbit. During descent, a laser rangefinder that was supposed to be the primary navigation sensor was found to have a safety switch left in the wrong position, disabling it. Engineers improvised by patching a NASA experimental lidar payload into the navigation system in real-time. Odysseus landed near Malapert A crater in the lunar south pole region on February 22, 2024, but one of its landing legs caught on the surface, causing it to tip over on its side. Despite the orientation, the lander operated for approximately 7 days and returned data from several payloads. It was the first U.S. lunar landing since Apollo 17 in 1972 and the first commercial lunar landing in history.
      </p>

      {/* Analysis: CLPS Program */}
      <h2 className="text-display text-xl mb-3">The CLPS Model: NASA&apos;s Commercial Lunar Bet</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        NASA&apos;s CLPS program is an experiment in commercial procurement: instead of building its own landers, NASA buys delivery services from commercial companies under fixed-price contracts. The philosophy intentionally accepts a higher risk of mission failure in exchange for lower costs and faster timelines compared to traditional NASA-built missions. Both Intuitive Machines and Astrobotic are among a dozen CLPS-selected vendors, but they have received the largest and most numerous task orders.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The early CLPS results vindicated both the approach and the risk tolerance. Neither company&apos;s first mission was a complete success, but neither was a total loss either. Intuitive Machines demonstrated the fundamental capability to reach the lunar surface, and Astrobotic gained valuable data on its propulsion system failure. NASA has continued to award both companies additional CLPS task orders, signaling confidence that iterative improvement will eventually produce reliable commercial lunar delivery. Astrobotic&apos;s Griffin lander (designed to carry NASA&apos;s VIPER rover to the lunar south pole to prospect for water ice) is the highest-profile upcoming CLPS mission, though its timeline has been affected by the Peregrine experience.
      </p>

      {/* Analysis: Beyond Delivery */}
      <h2 className="text-display text-xl mb-3">Beyond Delivery: Lunar Services Economy</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both companies envision themselves as more than delivery trucks for NASA payloads. Intuitive Machines is developing a Lunar Data Network to provide communications and navigation services on and around the Moon, essentially building lunar infrastructure that future missions (government and commercial) would pay to use. Astrobotic, drawing on its Carnegie Mellon robotics heritage, has developed the MoonRanger micro-rover and is positioning itself for surface mobility services alongside payload delivery. The commercial lunar economy is still nascent &mdash; virtually all revenue comes from NASA CLPS contracts &mdash; but both companies are betting that as Artemis program activity increases and international interest in the lunar surface grows, there will be demand for commercial services beyond one-way cargo delivery.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track lunar companies and Artemis program on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=intuitive-machines&b=astrobotic" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/cislunar" className="btn-secondary text-sm">Cislunar Economy Tracker</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Sierra Space vs Axiom Space', href: '/compare/sierra-space-vs-axiom-space' },
            { title: 'Axiom Space vs Vast', href: '/compare/axiom-vs-vast' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/commercial-space-stations-race-to-replace-iss" className="text-sm text-indigo-400 hover:text-indigo-300">Commercial Space Stations: The Race to Replace the ISS</Link></li>
          <li><Link href="/blog/space-industry-investment-guide-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry Investment Guide 2026</Link></li>
          <li><Link href="/cislunar" className="text-sm text-indigo-400 hover:text-indigo-300">Cislunar Economy Dashboard</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Intuitive Machines vs Astrobotic: Lunar Lander Comparison 2026',
        description: 'Side-by-side comparison of Intuitive Machines and Astrobotic covering CLPS contracts, lunar lander designs, mission results, and commercial lunar strategy.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/intuitive-machines-vs-astrobotic',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/intuitive-machines-vs-astrobotic']} />
    </div>
  );
}
