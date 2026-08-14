import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Starship vs New Glenn: Heavy-Lift Rocket Status Comparison (Aug 2026)',
  description: 'Starship vs New Glenn as of August 2026 — operational status, payload class, reuse approach, and flight cadence. Starship flying operational Starlink V3 missions; New Glenn rebuilding LC-36 after its May 2026 static-fire explosion.',
  keywords: ['Starship vs New Glenn', 'SpaceX Starship status', 'Blue Origin New Glenn status', 'New Glenn LC-36 explosion', 'Starship Starlink V3', 'heavy lift rocket comparison 2026'],
  openGraph: {
    title: 'Starship vs New Glenn: Heavy-Lift Rocket Status Comparison (Aug 2026) | SpaceNexus',
    description: 'Operational status, payload class, reuse approach, and cadence — Starship and New Glenn compared as of August 2026.',
    url: 'https://spacenexus.us/compare/starship-vs-new-glenn',
    type: 'article',
    images: [{
      url: '/api/og?title=Starship+vs+New+Glenn&subtitle=Status+as+of+Aug+2026&type=market',
      width: 1200,
      height: 630,
      alt: 'Starship vs New Glenn Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starship vs New Glenn: Heavy-Lift Rocket Status Comparison (Aug 2026) | SpaceNexus',
    description: 'Operational status, payload class, reuse approach, and cadence — Starship and New Glenn compared as of August 2026.',
    images: ['/api/og?title=Starship+vs+New+Glenn&subtitle=Status+as+of+Aug+2026&type=market'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/starship-vs-new-glenn' },
};

const COMPARISON_DATA = [
  { metric: 'Manufacturer', a: 'SpaceX', b: 'Blue Origin' },
  { metric: 'Vehicle Class', a: 'Super heavy-lift (largest rocket ever built)', b: 'Heavy-lift' },
  { metric: 'First Orbital Flight', a: 'IFT-1, Apr 2023 (test campaign)', b: 'NG-1, Jan 2025 — reached orbit; booster lost on landing attempt' },
  { metric: 'Operational Status (Aug 2026)', a: 'Operational — flying revenue payload missions (Starlink V3)', b: 'Grounded — LC-36, its only orbital pad, is being rebuilt after a static-fire explosion' },
  { metric: 'Most Recent Flight', a: 'Flight 13 (Jul 24, 2026) — first operational Starlink V3 deployment', b: 'NG-3 (Apr 19, 2026) — last flight before the pad was lost' },
  { metric: 'Booster Recovery Track Record', a: 'Multiple prior tower-catches in test campaign; Flight 13 booster completed a controlled ocean splashdown rather than a catch', b: 'First-ever New Glenn booster reuse achieved on NG-3 — landed a previously-flown booster for the second time' },
  { metric: 'Upper-Stage Recovery', a: 'Not yet caught — Flight 13 upper stage splashed down intact ("softest splashdown" to date); first tower-catch attempt targeted for Flight 14 (NET late Aug 2026)', b: 'Expendable second stage (no reuse in current design)' },
  { metric: 'Payload to LEO', a: '~150,000 kg (expendable); ~100,000 kg (reusable config, target)', b: '~45,000 kg' },
  { metric: 'Payload to GTO', a: '~100,000 kg (expendable estimate)', b: '~13,000 kg' },
  { metric: 'Diameter / Fairing', a: '9 m (entire upper stage is the payload bay)', b: '7 m fairing' },
  { metric: 'Propellant', a: 'LOX / liquid methane (both stages)', b: 'LOX / LNG (1st stage); LOX / LH2 (2nd stage)' },
  { metric: 'First Stage Engines', a: '33 Raptor 2 (LOX/CH4)', b: '7 BE-4 (LOX/LNG)' },
  { metric: 'Launch Site(s)', a: 'Starbase, Boca Chica, TX', b: 'LC-36, Cape Canaveral SFS, FL (sole pad — currently under repair)' },
  { metric: 'Current Blocker', a: 'Tower-catch reliability for the upper stage; ship recovery from ocean splashdown', b: 'LC-36 rebuild after May 28, 2026 static-fire explosion; return to flight targeted before end of 2026' },
  { metric: 'Manifest Impact', a: 'Starlink V3 cadence still ramping as catch reliability improves', b: '~24-mission Amazon Kuiper manifest and Blue Moon MK1 lunar lander frozen until LC-36 reopens' },
  { metric: 'Key Customers', a: 'SpaceX (Starlink V3), NASA (Artemis HLS)', b: 'Amazon Kuiper, NASA (ESCAPADE — already delivered Nov 2025), USSF, Telesat' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Starship vs New Glenn' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Starship vs New Glenn</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Starship vs New Glenn: Status as of August 2026</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Both vehicles have now reached orbit and demonstrated first-stage booster recovery &mdash; but as of August 2026 they&apos;re in very different operational states. Starship is flying revenue payloads. New Glenn&apos;s only launch pad is out of service after a ground-test explosion.
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
            <span className="card-terminal__path">spacenexus:~/compare/vehicles</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-left text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-tertiary)' }}>Metric</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Starship</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>New Glenn</th>
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

      {/* Starship status */}
      <h2 className="text-display text-xl mb-3">Starship: Operational, With Catch Reliability Still the Open Question</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Starship crossed into revenue service on Flight 13 (July 24, 2026), deploying its first operational payload &mdash; a batch of next-generation Starlink V3 satellites too large to fit inside a Falcon 9 fairing. Both the Super Heavy booster and the Starship upper stage completed controlled ocean splashdowns rather than tower catches on that flight; SpaceX called the ship&apos;s landing the program&apos;s &quot;softest splashdown&quot; to date, though recovering the floating stage from the Indian Ocean afterward proved difficult and, as of mid-August 2026, had not been confirmed.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Flight 14 is targeted for as early as late August 2026 and aims for the program&apos;s first attempt at catching the Starship upper stage with the launch tower&apos;s chopstick arms, alongside a continued Super Heavy booster catch &mdash; the remaining step toward full, rapid reusability of both stages. Starlink V3 deployment cadence is still ramping as that catch reliability improves. See the{' '}
        <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">full Starship flight tracker</Link>{' '}for live updates.
      </p>

      {/* New Glenn status */}
      <h2 className="text-display text-xl mb-3">New Glenn: A Real Reuse Milestone, Then a Grounding</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        New Glenn has been flying since January 2025, when NG-1 reached orbit on its debut but lost its booster during the landing attempt. Blue Origin then landed a booster successfully on NG-2, which delivered NASA&apos;s twin ESCAPADE Mars orbiters in November 2025, and reused that milestone in April 2026: NG-3 landed a previously-flown booster for a second time &mdash; the first-ever reuse of a New Glenn first stage, and arguably ahead of where SpaceX was at the equivalent stage of Falcon 9&apos;s program. NG-3&apos;s upper stage did suffer a thrust anomaly that left AST SpaceMobile&apos;s BlueBird-7 satellite in a lower-than-planned orbit.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The progress stalled hard on May 28, 2026, when a static-fire test exploded, destroying a booster and fueled second stage and heavily damaging LC-36 &mdash; New Glenn&apos;s only orbital launch pad. Blue Origin is rebuilding the pad and has targeted a return to flight before the end of 2026, but every month LC-36 stays down, the roughly 24-mission Amazon Kuiper manifest and the Blue Moon MK1 lunar lander slip further behind schedule.
      </p>

      {/* The comparison that matters */}
      <h2 className="text-display text-xl mb-3">The Comparison That Actually Matters Right Now</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        On paper, Starship and New Glenn still look like a payload-class mismatch &mdash; Starship&apos;s ~150-ton expendable LEO capacity dwarfs New Glenn&apos;s ~45 tons, and its 9-meter payload volume has no real competitor. But the more urgent comparison in August 2026 isn&apos;t payload class, it&apos;s flight cadence: Starship is launching and generating revenue, however imperfectly, while New Glenn cannot fly at all until LC-36 is rebuilt. Blue Origin&apos;s underlying engineering trajectory looks strong &mdash; a reused booster is a genuine first for the vehicle &mdash; but a single-pad heavy-lift program is one ground anomaly away from exactly this outcome. Until LC-36 reopens, New Glenn&apos;s technical merits are on hold.
      </p>

      {/* Disclaimer */}
      <div className="rounded-lg p-4 mb-8 text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        Flight status changes quickly. Figures above reflect public reporting as of August 2026 — check the{' '}
        <Link href="/starship" className="text-cyan-400 hover:text-cyan-300">Starship tracker</Link>{' '}and{' '}
        <Link href="/launch" className="text-cyan-400 hover:text-cyan-300">Launch Day</Link>{' '}for the latest before relying on any specific date.
      </div>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center mb-8" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track SPCX and Blue Origin&apos;s public peers alongside every space stock</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/space-stocks" className="btn-primary text-sm">Open Space Stocks Hub</Link>
          <Link href="/compare/launch-vehicles" className="btn-secondary text-sm">Launch Vehicle Database</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Rocket Lab (Stock)', href: '/compare/spcx-vs-rklb-stock' },
            { title: 'SpaceX Starship vs Blue Origin New Glenn (Specs)', href: '/compare/spacex-starship-vs-new-glenn' },
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Starship vs New Glenn: Heavy-Lift Rocket Status Comparison (Aug 2026)',
        description: 'Starship vs New Glenn as of August 2026 — operational status, payload class, reuse approach, and flight cadence.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-08-14', dateModified: '2026-08-14',
        url: 'https://spacenexus.us/compare/starship-vs-new-glenn',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/starship-vs-new-glenn']} />
    </div>
  );
}
