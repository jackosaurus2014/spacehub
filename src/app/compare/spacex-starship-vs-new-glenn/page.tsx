import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'SpaceX Starship vs Blue Origin New Glenn: Heavy-Lift Rocket Comparison 2026',
  description: 'Compare SpaceX Starship and Blue Origin New Glenn side by side — payload to LEO/GTO, dimensions, reusability, engines, first flight, cost estimates, and customer manifests.',
  keywords: ['Starship vs New Glenn', 'SpaceX Starship', 'Blue Origin New Glenn', 'heavy lift rocket', 'super heavy launch vehicle', 'rocket comparison'],
  openGraph: {
    title: 'SpaceX Starship vs Blue Origin New Glenn: Heavy-Lift Rocket Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Starship and New Glenn covering payload, dimensions, reusability, engines, and the heavy-lift launch market.',
    url: 'https://spacenexus.us/compare/spacex-starship-vs-new-glenn',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spacex-starship-vs-new-glenn' },
};

const COMPARISON_DATA = [
  { metric: 'Manufacturer', a: 'SpaceX', b: 'Blue Origin' },
  { metric: 'Vehicle Class', a: 'Super heavy-lift (largest rocket ever built)', b: 'Heavy-lift' },
  { metric: 'Total Height', a: '~121 m (397 ft)', b: '~98 m (322 ft)' },
  { metric: 'Diameter', a: '9 m (30 ft)', b: '7 m (23 ft)' },
  { metric: 'Stages', a: '2 (Super Heavy booster + Starship upper stage)', b: '2 (1st stage booster + 2nd stage upper stage)' },
  { metric: 'First Stage Engines', a: '33 Raptor 2 (LOX/CH4)', b: '7 BE-4 (LOX/LNG)' },
  { metric: 'Second Stage Engines', a: '6 Raptor (3 sea-level + 3 vacuum)', b: '2 BE-3U (LOX/LH2)' },
  { metric: 'First Stage Thrust', a: '~74 MN (16.7 Mlbf) — most powerful rocket ever', b: '~17 MN (3.9 Mlbf)' },
  { metric: 'Payload to LEO', a: '~150,000 kg (expendable); ~100,000 kg (reusable)', b: '~45,000 kg' },
  { metric: 'Payload to GTO', a: '~100,000 kg (expendable estimate)', b: '~13,000 kg' },
  { metric: 'Fairing Diameter', a: '8 m (entire upper stage is the payload bay)', b: '7 m' },
  { metric: 'Reusability', a: 'Both stages designed for full reuse (booster caught by tower)', b: 'First stage reusable (landing on drone ship); 2nd stage expendable' },
  { metric: 'Propellant', a: 'LOX / liquid methane (both stages)', b: 'LOX / LNG (1st stage); LOX / LH2 (2nd stage)' },
  { metric: 'First Orbital Flight', a: 'IFT-1 (Apr 2023); IFT-4 partial success (Jun 2024)', b: 'NG-1 (Oct 2025) — booster lost on landing attempt' },
  { metric: 'Estimated Launch Cost', a: '~$10-30M per flight (target, reusable)', b: '~$50-70M per flight (estimated)' },
  { metric: 'Key Customers', a: 'NASA (HLS Artemis), USSF, Starlink, commercial', b: 'NASA (ESCAPADE), Amazon Kuiper, USSF, Telesat' },
  { metric: 'Artemis Role', a: 'Starship HLS — crewed Moon lander for Artemis III+', b: 'None currently (competing for future contracts)' },
  { metric: 'Manufacturing Location', a: 'Starbase, Boca Chica, TX', b: 'Rocket factory, Cape Canaveral, FL' },
  { metric: 'Key Differentiator', a: 'Largest payload capacity ever; full reusability; Mars-class vehicle', b: 'First reusable heavy-lift competitor to Falcon Heavy; 7m fairing' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'SpaceX Starship vs New Glenn' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">SpaceX Starship vs New Glenn</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceX Starship vs Blue Origin New Glenn</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The heavy-lift launch market is being redefined by two next-generation vehicles from the most well-funded private space companies on Earth. SpaceX&apos;s Starship is the largest and most powerful rocket ever built, designed for Mars colonization. Blue Origin&apos;s New Glenn is a more conventionally sized heavy-lifter designed to compete directly with Falcon Heavy while offering a massive 7-meter fairing.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceX Starship</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Blue Origin New Glenn</th>
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

      {/* Scale & Ambition */}
      <h2 className="text-display text-xl mb-3">Different Scale, Different Ambitions</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Starship and New Glenn are often compared, but they are fundamentally different vehicles designed for different primary missions. Starship is a Mars colonization vehicle &mdash; its 150-ton LEO payload capacity, fully reusable design, and in-space refueling capability were architected around the requirements of sending hundreds of tons to Mars. No other vehicle in history has been designed at this scale. The Super Heavy booster generates 74 meganewtons of thrust from 33 Raptor engines, making it roughly twice as powerful as the Saturn V. SpaceX&apos;s tower-catch recovery system, successfully demonstrated in late 2024, eliminates the weight of landing legs and enables rapid turnaround.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        New Glenn is designed for the commercial launch market: a heavy-lift vehicle with a 7-meter fairing that can deliver 45 tons to LEO at costs significantly below current expendable heavy launchers. The first stage is powered by seven BE-4 engines burning liquid natural gas and liquid oxygen, designed for at least 25 reuses with propulsive landing on a drone ship. The second stage uses hydrogen-fueled BE-3U engines for high-energy upper stage performance. New Glenn&apos;s first flight in October 2025 reached orbit successfully, though the booster was lost during the landing attempt &mdash; a familiar pattern for first reuse attempts.
      </p>

      {/* Market Competition */}
      <h2 className="text-display text-xl mb-3">The Heavy-Lift Market</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        New Glenn&apos;s most important customer is Amazon, which has contracted for 27 launches (plus options for 38 more) to deploy the Project Kuiper broadband constellation. This anchor contract gives Blue Origin guaranteed revenue and launch cadence for years. NASA has also booked New Glenn for the twin ESCAPADE Mars orbiters, and the US Space Force certified New Glenn for national security launches. Telesat has contracted New Glenn for its Lightspeed constellation deployment.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Starship&apos;s customer base is dominated by SpaceX itself &mdash; deploying the next generation of Starlink satellites requires Starship&apos;s massive payload capacity. NASA has contracted Starship as the Human Landing System for Artemis III and beyond, a deal worth up to $4 billion. For the commercial market, Starship&apos;s economics could be transformational: SpaceX targets a per-launch cost of $10-30 million for a vehicle with 5-10x the payload of any competitor. If achieved, this would fundamentally reshape what is economically viable in space. The question for customers is not which vehicle is better in the abstract, but whether Starship&apos;s capabilities exceed their needs &mdash; not everyone needs 150 tons to LEO.
      </p>

      {/* Reusability */}
      <h2 className="text-display text-xl mb-3">Reusability: Full vs Partial</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The most significant architectural difference between the two vehicles is reusability scope. Starship is designed for full reuse of both stages &mdash; no hardware is expendable in the baseline configuration. New Glenn reuses only the first stage, with the second stage expended on every flight. Full reusability is exponentially more challenging (re-entering an upper stage from orbital velocity is far harder than a suborbital booster return), but if SpaceX achieves it reliably, the cost advantage over New Glenn could be decisive. Blue Origin may eventually develop a reusable upper stage, but it is not in the current design. For now, the competition is between SpaceX&apos;s revolutionary ambition and Blue Origin&apos;s more conventional but proven approach.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Compare launch vehicles and track upcoming launches on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/launch-vehicles" className="btn-primary text-sm">Launch Vehicle Database</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'SpaceX vs ULA', href: '/compare/spacex-vs-ula' },
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
          <li><Link href="/blog/starship-flight-test-program-status" className="text-sm text-indigo-400 hover:text-indigo-300">Starship Flight Test Program: Status and What Comes Next</Link></li>
          <li><Link href="/blog/new-glenn-first-flight-analysis" className="text-sm text-indigo-400 hover:text-indigo-300">New Glenn First Flight: What Blue Origin Proved and What Remains</Link></li>
          <li><Link href="/guide/launch-vehicle-economics" className="text-sm text-indigo-400 hover:text-indigo-300">Launch Vehicle Economics: The Complete 2026 Guide</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'SpaceX Starship vs Blue Origin New Glenn: Heavy-Lift Rocket Comparison 2026',
        description: 'Side-by-side comparison of Starship and New Glenn covering payload, dimensions, reusability, engines, customers, and the heavy-lift launch market.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/spacex-starship-vs-new-glenn',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/spacex-starship-vs-new-glenn']} />
    </div>
  );
}
