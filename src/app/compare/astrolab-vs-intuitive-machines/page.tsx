import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Astrolab vs Intuitive Machines: Lunar Vehicle Comparison 2026',
  description: 'Compare Astrolab FLEX rover and Intuitive Machines Nova-C lander side by side — vehicle types, payload capacity, NASA contracts, Starship compatibility, and lunar mission approaches.',
  keywords: ['Astrolab vs Intuitive Machines', 'lunar rover', 'FLEX rover', 'Nova-C lander', 'Artemis', 'Moon exploration', 'CLPS'],
  openGraph: {
    title: 'Astrolab vs Intuitive Machines: Lunar Vehicle Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Astrolab and Intuitive Machines covering lunar vehicles, mission approaches, NASA CLPS contracts, and Starship compatibility.',
    url: 'https://spacenexus.us/compare/astrolab-vs-intuitive-machines',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/astrolab-vs-intuitive-machines' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2019', b: '2013' },
  { metric: 'Headquarters', a: 'Hawthorne, CA', b: 'Houston, TX' },
  { metric: 'CEO / Founder', a: 'Jaret Matthews (ex-JPL, Mars rover engineer)', b: 'Steve Altemus (ex-NASA JSC Deputy Director)' },
  { metric: 'Total Funding', a: '~$30M+ (Series A, 2024)', b: '~$300M+ (Public: NASDAQ: LUNR, 2023 IPO)' },
  { metric: 'Public / Private', a: 'Private', b: 'Public (NASDAQ: LUNR)' },
  { metric: 'Primary Vehicle', a: 'FLEX (Flexible Logistics and Exploration) rover', b: 'Nova-C lander + Micro Nova hopper (rover under development)' },
  { metric: 'Vehicle Type', a: 'Rover — surface mobility platform', b: 'Lander (Nova-C) + rover/hopper secondary vehicles' },
  { metric: 'Payload Capacity', a: '~1,500 kg (FLEX rover payload bed)', b: '~130 kg (Nova-C, delivered to surface)' },
  { metric: 'Mission Approach', a: 'Rover delivered to surface by Starship or other lander', b: 'End-to-end delivery: launch to landing (CLPS provider)' },
  { metric: 'NASA CLPS Contract', a: 'No CLPS contract (not a lander provider)', b: 'Yes — multiple CLPS task orders (IM-1, IM-2, IM-3)' },
  { metric: 'NASA LTV Contract', a: 'Finalist for NASA Lunar Terrain Vehicle (LTV) services contract', b: 'Not competing for LTV directly' },
  { metric: 'Starship Compatibility', a: 'Designed specifically to deploy from SpaceX Starship cargo bay', b: 'Not Starship-dependent; uses own Nova-C lander' },
  { metric: 'IM-1 Mission (2024)', a: 'N/A', b: 'Odysseus lander: first commercial lunar landing (Feb 2024, tipped on side)' },
  { metric: 'IM-2 Mission', a: 'N/A', b: 'South pole mission with NASA PRIME-1 drill (planned 2025-2026)' },
  { metric: 'Surface Operations', a: 'Designed for years of surface operation; reusable logistics vehicle', b: 'Lander missions: ~14 Earth days (one lunar day) baseline' },
  { metric: 'Power System', a: 'Solar arrays + potential nuclear (RTG) for polar operations', b: 'Solar-powered (Nova-C); surviving lunar night is a goal' },
  { metric: 'Key Differentiator', a: 'Only large-payload lunar rover designed for Starship; JPL heritage team', b: 'Only company to achieve commercial lunar landing; proven CLPS provider' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Astrolab vs Intuitive Machines' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Astrolab vs Intuitive Machines</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Astrolab vs Intuitive Machines</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The Artemis program is creating a commercial lunar economy, and these two companies are building the vehicles to operate on and deliver payloads to the Moon. Astrolab is building the FLEX rover &mdash; a large surface mobility platform designed for Starship deployment &mdash; while Intuitive Machines is the first company to achieve a commercial lunar landing and is expanding from landers to a comprehensive lunar services portfolio.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Astrolab</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Intuitive Machines</th>
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

      {/* Vehicle Architecture */}
      <h2 className="text-display text-xl mb-3">Lander vs Rover: Complementary Roles</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Intuitive Machines and Astrolab are not strictly competitors &mdash; they serve different segments of the lunar logistics chain. Intuitive Machines is a delivery company: its Nova-C lander carries payloads from Earth orbit to the lunar surface, functioning as a &quot;FedEx to the Moon.&quot; The IM-1 mission in February 2024 made Intuitive Machines the first commercial company to land on the Moon (and only the first American landing since Apollo 17 in 1972), despite the Odysseus lander tipping on its side after touchdown. The company has three CLPS task orders from NASA and is developing larger landers for heavier payloads.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Astrolab builds what happens after landing: surface mobility. The FLEX rover is designed as a multi-purpose logistics vehicle that can carry 1,500 kg of payload across the lunar surface &mdash; roughly 10x the payload of Intuitive Machines&apos; entire Nova-C lander. FLEX is explicitly designed to deploy from SpaceX&apos;s Starship cargo bay, anticipating that Starship will be the primary heavy-lift vehicle for lunar surface operations. Founder Jaret Matthews spent years at JPL working on Mars rover missions, and that heritage shows in FLEX&apos;s design philosophy: a platform built for long-duration, multi-mission surface operations rather than single-use delivery.
      </p>

      {/* NASA Strategy */}
      <h2 className="text-display text-xl mb-3">NASA Contracts &amp; the Lunar Economy</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Intuitive Machines has been the most successful commercial company in NASA&apos;s CLPS (Commercial Lunar Payload Services) program. The IM-1 mission, despite its imperfect landing, delivered NASA instruments to the lunar surface and demonstrated the viability of the commercial delivery model. IM-2 will carry NASA&apos;s PRIME-1 drill to the lunar south pole to search for water ice &mdash; arguably the most important resource prospecting mission since Apollo. IM-3 is planned to deliver NASA&apos;s PRIME-2 drill and a Micro Nova hopper to explore terrain inaccessible to the lander.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Astrolab is competing for NASA&apos;s Lunar Terrain Vehicle (LTV) services contract, which would provide a rover for Artemis astronauts to explore the lunar south pole. The LTV competition is separate from CLPS and represents a different tier of NASA investment. If selected, Astrolab would provide the primary crew mobility vehicle for Artemis surface operations &mdash; the modern equivalent of the Apollo Lunar Roving Vehicle, but capable of operating autonomously between crewed missions. Both companies are betting on a future where the Moon has persistent infrastructure rather than one-off missions.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track lunar companies and Artemis missions on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=astrolab&b=intuitive-machines" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/cislunar" className="btn-secondary text-sm">Cislunar Economy Hub</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Intuitive Machines vs Astrobotic', href: '/compare/intuitive-machines-vs-astrobotic' },
            { title: 'SpaceX Starship vs New Glenn', href: '/compare/spacex-starship-vs-new-glenn' },
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/lunar-rovers-artemis-era" className="text-sm text-indigo-400 hover:text-indigo-300">Lunar Rovers in the Artemis Era: From Apollo Buggies to Autonomous Trucks</Link></li>
          <li><Link href="/blog/clps-program-results-2026" className="text-sm text-indigo-400 hover:text-indigo-300">NASA CLPS Program: Scorecard After the First Commercial Lunar Landings</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Astrolab vs Intuitive Machines: Lunar Vehicle Comparison 2026',
        description: 'Side-by-side comparison of Astrolab FLEX rover and Intuitive Machines Nova-C lander covering vehicle types, payload, NASA contracts, and lunar mission approaches.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/astrolab-vs-intuitive-machines',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/astrolab-vs-intuitive-machines']} />
    </div>
  );
}
