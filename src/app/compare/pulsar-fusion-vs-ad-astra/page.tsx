import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Pulsar Fusion vs Ad Astra: Advanced Propulsion Comparison 2026',
  description: 'Compare Pulsar Fusion and Ad Astra Rocket Company side by side — fusion propulsion vs VASIMR plasma, ISP, thrust, TRL levels, Mars transit times, and funding.',
  keywords: ['Pulsar Fusion vs Ad Astra', 'fusion propulsion', 'VASIMR', 'plasma rocket', 'advanced propulsion', 'Mars transit time'],
  openGraph: {
    title: 'Pulsar Fusion vs Ad Astra: Advanced Propulsion Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Pulsar Fusion and Ad Astra covering fusion vs plasma propulsion, performance specs, and deep space mission potential.',
    url: 'https://spacenexus.us/compare/pulsar-fusion-vs-ad-astra',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/pulsar-fusion-vs-ad-astra' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2011', b: '2005' },
  { metric: 'Founder / CEO', a: 'Richard Dinan', b: 'Dr. Franklin Chang Diaz (former NASA astronaut, 7 shuttle missions)' },
  { metric: 'Headquarters', a: 'Bletchley, United Kingdom', b: 'Webster, TX (near JSC); Liberia, Costa Rica' },
  { metric: 'Total Funding', a: '~$10M+ (private, grants)', b: '~$40M+ (private, NASA contracts)' },
  { metric: 'Employees', a: '~30+', b: '~50+' },
  { metric: 'Propulsion Type', a: 'Direct Fusion Drive (DFD) — nuclear fusion', b: 'VASIMR (Variable Specific Impulse Magnetoplasma Rocket) — plasma' },
  { metric: 'Propellant', a: 'Deuterium-helium-3 (fusion fuel)', b: 'Argon gas (ionized into plasma)' },
  { metric: 'Specific Impulse (ISP)', a: '~10,000-100,000 s (theoretical, fusion regime)', b: '~3,000-30,000 s (variable, demonstrated in lab)' },
  { metric: 'Thrust', a: '~5-50 N (theoretical)', b: '~5-6 N (at ISP ~5,000 s); higher thrust at lower ISP' },
  { metric: 'Power Source', a: 'Self-powered (fusion reactor generates its own energy)', b: 'External power required (solar panels or nuclear reactor)' },
  { metric: 'TRL (Technology Readiness)', a: 'TRL 2-3 (experimental plasma confinement in lab)', b: 'TRL 4-5 (200 kW lab prototype tested, flight hardware in development)' },
  { metric: 'Key Milestone', a: 'AI-modeled plasma exhaust confinement (2023); ground firing tests planned', b: 'VX-200SS prototype: 100+ hours continuous operation (lab, 2024)' },
  { metric: 'Mars Transit Time', a: '~30 days (theoretical with full DFD)', b: '~39 days (at 200 MW power level, theoretical)' },
  { metric: 'ISS Application', a: 'None (too early stage)', b: 'Proposed for ISS reboost (VASIMR could replace chemical reboosts)' },
  { metric: 'NASA Relationship', a: 'Limited; primarily UK Space Agency + ESA engagement', b: 'Multiple NASA SBIR/STTR contracts; ISS reboost proposal' },
  { metric: 'Near-Term Products', a: 'Chemical-hybrid rocket engines (revenue bridge), Hall-effect thrusters', b: 'VASIMR VF-200 flight unit (targeting late 2020s)' },
  { metric: 'Key Differentiator', a: 'Only commercial company pursuing fusion-class propulsion for space', b: 'Most mature high-power plasma propulsion; founded by spaceflight veteran' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Pulsar Fusion vs Ad Astra' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Pulsar Fusion vs Ad Astra</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Pulsar Fusion vs Ad Astra</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Chemical propulsion got us to the Moon, but reaching Mars efficiently &mdash; or exploring the outer solar system in human-relevant timescales &mdash; requires something fundamentally more powerful. Pulsar Fusion and Ad Astra Rocket Company represent two of the most ambitious advanced propulsion programs in the private sector: fusion propulsion and high-power plasma propulsion, respectively.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Pulsar Fusion</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Ad Astra</th>
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

      {/* Fusion vs Plasma */}
      <h2 className="text-display text-xl mb-3">Fusion vs Plasma: Different Physics, Different Timelines</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Pulsar Fusion is pursuing the ultimate prize in propulsion: a Direct Fusion Drive that generates thrust by expelling fusion plasma products at enormous velocities. If achieved, DFD would deliver both high thrust and high specific impulse simultaneously &mdash; something chemical and electric propulsion systems must trade off against each other. The theoretical performance is extraordinary: ISP values of 10,000 to 100,000 seconds (vs ~450 s for the best chemical engines), enabling Mars transits measured in weeks rather than months. The challenge is equally extraordinary: no one has achieved sustained, net-positive fusion energy on Earth, let alone in a compact spacecraft engine. Pulsar is using AI to model plasma confinement behavior, a novel approach to the notoriously difficult problem of controlling superheated plasma.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Ad Astra&apos;s VASIMR engine operates on well-understood plasma physics: argon gas is ionized and accelerated by electromagnetic fields to produce thrust. The &quot;variable specific impulse&quot; name reflects VASIMR&apos;s unique ability to trade between high thrust (at lower ISP) and high efficiency (at higher ISP) during a mission. This flexibility allows a single engine to optimize for different phases of flight. Founder Franklin Chang Diaz, a former NASA astronaut with seven Space Shuttle missions, has been developing VASIMR for over two decades. The VX-200SS prototype has achieved over 100 hours of continuous operation in the lab at 200 kW, making it the most mature high-power electric propulsion system in development.
      </p>

      {/* Path to Mars */}
      <h2 className="text-display text-xl mb-3">Path to Mars &amp; Deep Space</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Both companies frame Mars as their ultimate destination. Ad Astra projects that a 200 MW VASIMR system could transit to Mars in approximately 39 days, compared to 7-9 months with chemical propulsion. This would dramatically reduce crew radiation exposure and consumables requirements. However, VASIMR requires an external power source &mdash; at 200 MW, this likely means a nuclear reactor, which introduces its own development challenges.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Pulsar Fusion&apos;s DFD would theoretically reach Mars in as little as 30 days, with the critical advantage that the fusion reaction generates its own power &mdash; no external reactor needed. However, DFD is at a much earlier stage of development (TRL 2-3 vs VASIMR&apos;s TRL 4-5). The practical path to market differs significantly: Ad Astra is targeting a near-term application reboosting the ISS or future space stations, providing revenue while the high-power version matures. Pulsar is generating revenue through its chemical-hybrid rocket engines and Hall-effect thrusters while the fusion program advances. Both companies understand that advanced propulsion must find stepping-stone applications before the Mars mission materializes.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Explore propulsion technologies and mission planning on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=pulsar-fusion&b=ad-astra" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/propulsion-database" className="btn-secondary text-sm">Propulsion Database</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX Starship vs New Glenn', href: '/compare/spacex-starship-vs-new-glenn' },
            { title: 'Relativity Space vs Firefly', href: '/compare/relativity-space-vs-firefly' },
            { title: 'Rocket Lab vs Relativity Space', href: '/compare/rocket-lab-vs-relativity-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/advanced-propulsion-technologies-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Advanced Propulsion: From Ion Drives to Fusion Rockets</Link></li>
          <li><Link href="/blog/mars-transit-propulsion-options" className="text-sm text-indigo-400 hover:text-indigo-300">Getting to Mars Faster: Propulsion Technologies That Could Cut Transit Time</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Pulsar Fusion vs Ad Astra: Advanced Propulsion Comparison 2026',
        description: 'Side-by-side comparison of Pulsar Fusion and Ad Astra covering fusion vs plasma propulsion, ISP, thrust, TRL levels, and Mars transit potential.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/pulsar-fusion-vs-ad-astra',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/pulsar-fusion-vs-ad-astra']} />
    </div>
  );
}
