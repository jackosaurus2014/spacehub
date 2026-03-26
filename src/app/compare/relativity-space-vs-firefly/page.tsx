import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Relativity Space vs Firefly Aerospace: Complete Comparison 2026',
  description: 'Compare Relativity Space and Firefly Aerospace — two small-to-medium launch startups with different technical approaches, funding, vehicles, and orbital success records.',
  keywords: ['Relativity Space vs Firefly', 'Terran 1', 'Firefly Alpha', 'small launch comparison', 'medium launch startups 2026'],
  openGraph: {
    title: 'Relativity Space vs Firefly Aerospace: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Relativity Space and Firefly Aerospace small/medium launch vehicles and company strategies.',
    url: 'https://spacenexus.us/compare/relativity-space-vs-firefly',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/relativity-space-vs-firefly' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2015', b: '2014 (re-founded 2017 after bankruptcy)' },
  { metric: 'Headquarters', a: 'Long Beach, CA', b: 'Cedar Park, TX' },
  { metric: 'Primary Vehicle', a: 'Terran R (medium lift, in development)', b: 'Firefly Alpha (small lift, operational)' },
  { metric: 'Previous / Retired Vehicle', a: 'Terran 1 (retired after single flight, 2023)', b: 'N/A (Alpha is primary vehicle)' },
  { metric: 'LEO Payload Capacity', a: 'Terran 1: 1,250 kg (retired); Terran R: ~20,000 kg target', b: 'Alpha: ~1,170 kg to LEO (~1,030 kg to SSO)' },
  { metric: 'First Orbital Success', a: 'None (Terran 1 failed to reach orbit — upper stage anomaly; retired 2023)', b: 'Yes — Alpha Flight 2 (Oct 2022)' },
  { metric: 'Launch Cadence (2024–2025)', a: '0 (Terran 1 retired; Terran R in development)', b: '2–3 missions per year' },
  { metric: 'Manufacturing Innovation', a: '3D-printed rocket (Aeon engines, printed structure)', b: 'Conventional aluminum/carbon fiber; Reaver/Lightning engines' },
  { metric: 'Reusability Plan', a: 'Terran R reusable first stage', b: 'No reusability on Alpha; Medium vehicle TBD' },
  { metric: 'Total Funding Raised', a: '~$1.3B', b: '~$300M+' },
  { metric: 'Key Investors / Backers', a: 'BOND, Tiger Global, Fidelity, K5 Global', b: 'AE Industrial Partners, NASA (VCLS)' },
  { metric: 'Launch Site', a: 'Cape Canaveral SLC-16', b: 'Vandenberg SLC-2W; Cape Canaveral LC-20' },
  { metric: 'Government Contracts', a: 'NASA VCLS (Terran 1, since cancelled)', b: 'NASA VCLS, USSF contracts' },
  { metric: 'Current Strategic Focus', a: 'Pivot to Terran R medium-lift reusable rocket', b: 'Scaling Alpha cadence; Medium vehicle development' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Relativity Space vs Firefly Aerospace</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Relativity Space vs Firefly Aerospace</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two venture-backed small launch startups with contrasting paths — Relativity pivoting from 3D-printed small rockets to a medium reusable vehicle, while Firefly scales its operational Alpha rocket.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Relativity Space</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Firefly Aerospace</th>
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

      {/* Analysis */}
      <h2 className="text-display text-xl mb-3">Key Differences</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Relativity Space made headlines for building the world&apos;s first 3D-printed orbital rocket, Terran 1, which failed to reach orbit on its single flight in March 2023 due to an upper-stage ignition anomaly and was subsequently retired. The company pivoted its entire focus to Terran R — a medium-lift rocket with a reusable first stage, targeting the same market segment as Rocket Lab&apos;s Neutron. This bold pivot required significant restructuring and eliminated Relativity&apos;s near-term revenue pathway from Terran 1 launches.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Firefly Aerospace achieved orbital success on its second Alpha flight in October 2022, making it one of the few new-entrant launch companies to reach orbit. Alpha serves the 1,000 kg class small satellite market and has been building commercial and government launch cadence since. Firefly also won a NASA Commercial Lunar Payload Services (CLPS) task order for a lunar lander mission (Blue Ghost), expanding its business beyond just launch. Firefly&apos;s ownership structure has evolved — it was majority acquired by AE Industrial Partners after earlier Ukrainian investor ties were unwound.
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
            { title: 'SpaceX vs Rocket Lab', href: '/compare/spacex-vs-rocket-lab' },
            { title: 'Astra vs Virgin Orbit', href: '/compare/astra-vs-virgin-orbit' },
            { title: 'Rocket Lab vs Relativity Space', href: '/compare/rocket-lab-vs-relativity-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Relativity Space vs Firefly Aerospace: Complete Comparison 2026',
        description: 'Side-by-side comparison of Relativity Space and Firefly Aerospace small/medium launch vehicles and company strategies.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/relativity-space-vs-firefly',
      }).replace(/</g, '\\u003c') }} />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/relativity-space-vs-firefly']} />
      </div>
  );
}
