import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'SpaceX vs ULA: Complete Comparison 2026',
  description: 'Compare SpaceX and United Launch Alliance (ULA) — launch vehicles, pricing, launch cadence, reliability records, government contracts, and the shift from traditional to commercial launch.',
  keywords: ['SpaceX vs ULA', 'Falcon 9 vs Vulcan', 'United Launch Alliance', 'commercial launch comparison', 'NSSL launch contracts 2026'],
  openGraph: {
    title: 'SpaceX vs ULA: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SpaceX and United Launch Alliance covering reliability, pricing, vehicles, and government launch dominance.',
    url: 'https://spacenexus.us/compare/spacex-vs-ula',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spacex-vs-ula' },
};

const COMPARISON_DATA = [
  { metric: 'Type', a: 'Private company (SpaceX)', b: 'Acquired by Cerberus Capital and Blue Origin interests (2024); formerly Boeing 50% + Lockheed Martin 50% JV' },
  { metric: 'Founded', a: '2002', b: '2006' },
  { metric: 'Headquarters', a: 'Hawthorne, CA', b: 'Centennial, CO' },
  { metric: 'Primary Launch Vehicles', a: 'Falcon 9, Falcon Heavy, Starship', b: 'Vulcan Centaur, Atlas V (phasing out), Delta IV Heavy (retired)' },
  { metric: 'Launches Per Year (2024)', a: '130+', b: '~5–10' },
  { metric: 'Total Career Orbital Launches', a: '350+', b: '155+ (Atlas V: 100+; Delta IV: 45+; Vulcan: 2+)' },
  { metric: 'Launch Price (approx.)', a: '~$67M (Falcon 9); ~$150M (Falcon Heavy)', b: '~$100–150M (Vulcan Centaur est.); ~$80–160M (Atlas V, varied)' },
  { metric: 'Reusability', a: 'Yes — Falcon 9 first stage (200+ booster landings)', b: 'No — Vulcan Centaur is expendable; BE-4 engine partial recovery planned' },
  { metric: 'LEO Payload Capacity', a: '22,800 kg (F9); 63,800 kg (FH)', b: '27,200 kg (Vulcan Centaur VC6); ~8,900 kg (Atlas V 401)' },
  { metric: 'GTO Payload Capacity', a: '8,300 kg (F9); 26,700 kg (FH expendable)', b: '7,000–8,900 kg (Vulcan; varies by config)' },
  { metric: 'NSSL Phase 2 Launch Lanes', a: 'Yes (Lane 1)', b: 'Yes (Lane 2 — initially held ~60% NSSL share pre-SpaceX certification)' },
  { metric: 'National Security Launch Record', a: 'GPS, NRO, USSF missions (since 2015)', b: 'Primary NSSL provider pre-2015; shared since' },
  { metric: 'Mission Success Rate', a: '~99%+ (Falcon 9)', b: '~100% (Atlas V, 100 consecutive successes)' },
  { metric: 'Engine Supplier', a: 'SpaceX Merlin / Raptor (in-house)', b: 'BE-4 (Blue Origin) for Vulcan; RD-180 (Russia) for Atlas V (legacy)' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">SpaceX vs ULA</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceX vs ULA</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The disruptive commercial challenger versus the established government launch provider — comparing launch vehicles, pricing, cadence, reusability, and the competition for U.S. national security space contracts.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceX</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>ULA</th>
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

      {/* Analysis */}
      <h2 className="text-display text-xl mb-3">Key Differences</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX transformed the U.S. launch market by driving down prices through reusability and vertical integration. Falcon 9&apos;s first stage routinely lands and relaunches within weeks, enabling a launch cadence that no other Western provider approaches — over 130 missions in 2024 alone. When SpaceX gained FAA certification for national security launches in 2015, it began winning NSSL (formerly EELV) contracts that had previously been ULA&apos;s exclusive domain. SpaceX now holds the majority share (Lane 1) of NSSL Phase 2 contracts through the early 2030s.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        ULA&apos;s Atlas V achieved 100 consecutive successes before retirement — an unmatched record in U.S. commercial launch history. Its Vulcan Centaur vehicle, which completed its first successful launch in January 2024 (Peregrine lunar lander mission), is designed to replace both Atlas V and Delta IV Heavy. However, Vulcan is expendable and will struggle to match SpaceX on price without reusability. ULA was acquired by Cerberus Capital Management and Blue Origin interests in 2024, ending the Boeing/Lockheed Martin joint venture. This may change its strategic direction given Blue Origin&apos;s relationship and Amazon&apos;s Project Kuiper launch needs. The NSSL Phase 3 competition (starting mid-2020s) will determine the next era of U.S. government launch.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'SpaceX vs Rocket Lab', href: '/compare/spacex-vs-rocket-lab' },
            { title: 'Boeing Space vs Lockheed Martin Space', href: '/compare/boeing-vs-lockheed-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'SpaceX vs ULA: Complete Comparison 2026',
        description: 'Side-by-side comparison of SpaceX and United Launch Alliance covering reliability, pricing, vehicles, and government launch dominance.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/spacex-vs-ula',
      }).replace(/</g, '\\u003c') }} />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/spacex-vs-ula']} />
      </div>
  );
}
