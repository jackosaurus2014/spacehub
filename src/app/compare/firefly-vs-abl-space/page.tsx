import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2017 (reincorporated after 2016 bankruptcy)', b: '2017' },
  { metric: 'Founder / CEO', a: 'Tom Markusic (CEO until 2023); now led by Jason Kim', b: 'Harry O\'Brien & Dan Piemont' },
  { metric: 'Headquarters', a: 'Cedar Park, TX', b: 'El Segundo, CA' },
  { metric: 'Employees', a: '~900+', b: '~200 (est., significantly reduced)' },
  { metric: 'Total Funding', a: '~$275M+ (including Northrop Grumman investment)', b: '~$200M+ (Lockheed Martin anchor contract)' },
  { metric: 'Key Investor / Partner', a: 'Northrop Grumman (minority stake, ~15%)', b: 'Lockheed Martin (major customer, not equity investor)' },
  { metric: 'Primary Vehicle', a: 'Alpha (LEO small launcher)', b: 'RS1 (LEO small launcher)' },
  { metric: 'LEO Payload Capacity', a: '~1,170 kg to LEO (est. 200 km SSO)', b: '~1,350 kg to LEO (designed capacity)' },
  { metric: 'First Stage Engines', a: '4x Reaver (LOX/RP-1, tap-off)', b: '9x E2 (LOX/RP-1, gas generator)' },
  { metric: 'Upper Stage Engine', a: '1x Lightning (LOX/RP-1, electric pump-fed)', b: '1x E2 (vacuum variant)' },
  { metric: 'First Orbital Attempt', a: 'Sept 2021 (failed — terminated in flight)', b: 'Jan 2023 (failed — first stage shutdown after liftoff)' },
  { metric: 'First Successful Orbit', a: 'Oct 2022 (FLTA002 — "To The Black")', b: 'None as of early 2026' },
  { metric: 'Total Orbital Launches', a: '5+ (through early 2026)', b: '1 (failed)' },
  { metric: 'Launch Price (est.)', a: '~$15M per launch', b: '~$12M per launch (projected)' },
  { metric: 'Launch Site(s)', a: 'Vandenberg SFB (SLC-2W); developing Wallops Island', b: 'Pacific Spaceport Complex, Kodiak, AK (mobile launch)' },
  { metric: 'Vehicle Status (2026)', a: 'Operational; ramping cadence', b: 'Stalled — no launches since 2023 failure; company future uncertain' },
  { metric: 'Next Vehicle', a: 'MLV (Medium Launch Vehicle, ~10,000 kg to LEO, with Northrop Grumman)', b: 'No announced successor' },
  { metric: 'Government Contracts', a: 'USSF OSP-4 task orders; NASA VADR; Northrop Grumman Antares replacement', b: 'Lockheed Martin contract for rideshare deployment (paused/uncertain)' },
  { metric: 'Unique Approach', a: 'Also developing Elytra orbital transfer vehicle (OTV)', b: 'Containerized mobile launch system (GS0) for rapid deployment anywhere' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Firefly vs ABL Space' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Firefly vs ABL Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Firefly Aerospace vs ABL Space Systems</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two small launch startups founded in 2017 with similar ambitions but sharply divergent outcomes. Firefly has reached orbit and is expanding into medium-lift with Northrop Grumman, while ABL Space has struggled to recover from its single failed launch attempt and faces an uncertain future.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Firefly Aerospace</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>ABL Space Systems</th>
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

      {/* Analysis: Divergent Paths */}
      <h2 className="text-display text-xl mb-3">Divergent Paths in Small Launch</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Firefly Aerospace had its own near-death experience &mdash; the original company went bankrupt in 2016 before being reconstituted in 2017 under new ownership. After a failed first orbital attempt in September 2021 (the vehicle was terminated after a first-stage engine failed at liftoff), Firefly successfully reached orbit on its second attempt in October 2022. Since then, Alpha has continued flying, building a track record that has attracted U.S. Space Force task orders under the OSP-4 program and NASA VADR contracts. Firefly also developed the Elytra orbital transfer vehicle (OTV) to provide last-mile delivery for smallsats.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        ABL Space Systems attracted significant early attention with its innovative containerized launch system (GS0), which promised to deploy a complete launch pad from shipping containers at virtually any location. The company secured a major contract from Lockheed Martin to launch satellites on RS1. However, ABL&apos;s sole orbital attempt in January 2023 from Kodiak, Alaska ended in failure when the first stage shut down shortly after liftoff. As of early 2026, ABL has not attempted a second launch, and the company has reportedly downsized significantly. The Lockheed Martin contract status remains uncertain, and ABL&apos;s future as an operational launch provider is in serious doubt.
      </p>

      {/* Analysis: Strategic Partnerships */}
      <h2 className="text-display text-xl mb-3">Strategic Partnerships &amp; Future Vehicles</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Firefly&apos;s most significant strategic move has been its partnership with Northrop Grumman. In 2023, Northrop Grumman acquired a ~15% stake in Firefly and the two companies announced a joint development of the Medium Launch Vehicle (MLV), designed to replace the aging Antares rocket (whose RD-181 engines were Russian-supplied). MLV targets ~10,000 kg to LEO, putting it in the medium-lift class and giving Firefly a path well beyond small-launch economics. This partnership effectively ensures Firefly has a deep-pocketed industrial partner and a guaranteed customer for its next vehicle.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        ABL&apos;s key partnership was with Lockheed Martin, which committed to using RS1 for deploying satellites under a contract reportedly worth up to $200M. However, after the failed launch and extended development delays, Lockheed Martin&apos;s commitment to the RS1 program appears to have cooled. Without a successful flight, additional investment, or a new anchor customer, ABL faces the challenge that has ended many small launch ventures: the gap between promising technology and a sustainable business is enormous.
      </p>

      {/* Analysis: Small Launch Economics */}
      <h2 className="text-display text-xl mb-3">The Small Launch Market Reality</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both companies illustrate the brutal economics of the small launch market. SpaceX&apos;s Transporter rideshare missions offer smallsat launches at $5,000-$6,000 per kg, far below the $10,000-$15,000/kg typical of dedicated small launchers. Rocket Lab&apos;s Electron is the only small launcher to achieve consistent commercial cadence, with 50+ launches. Of the dozens of small launch startups that emerged in the 2015-2020 era, most have failed or pivoted (Astra, Virgin Orbit). Firefly&apos;s pivot toward medium-lift via the Northrop Grumman partnership acknowledges this reality. ABL&apos;s stall is, in part, a reflection of investors and customers losing patience with a market segment where margins are thin and SpaceX rideshares offer a cheaper alternative for many payloads.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track launch vehicles and emerging companies on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/launch-vehicles" className="btn-primary text-sm">Compare Launch Vehicles</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Rocket Lab vs Astra', href: '/compare/rocket-lab-vs-astra' },
            { title: 'Relativity Space vs Firefly', href: '/compare/relativity-space-vs-firefly' },
            { title: 'SpaceX vs Rocket Lab', href: '/compare/spacex-vs-rocket-lab' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/spacex-blue-origin-rocket-lab-comparison-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Launch Provider Comparison 2026</Link></li>
          <li><Link href="/guide/space-launch-cost-comparison" className="text-sm text-indigo-400 hover:text-indigo-300">Space Launch Cost Comparison 2026</Link></li>
          <li><Link href="/blog/rocket-lab-spacex-competitor-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Rocket Lab: The SpaceX Competitor to Watch in 2026</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Firefly Aerospace vs ABL Space Systems: Small Launch Comparison 2026',
        description: 'Side-by-side comparison of Firefly Alpha and ABL RS1 — development progress, government contracts, and the harsh economics of small launch.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/firefly-vs-abl-space',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/firefly-vs-abl-space']} />
    </div>
  );
}
