import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Astra vs Virgin Orbit: Complete Comparison 2026',
  description: 'Compare Astra Space and Virgin Orbit — two small launch companies that both faced major operational and financial challenges, with histories, vehicles, and outcomes compared.',
  keywords: ['Astra vs Virgin Orbit', 'small launch failures', 'Virgin Orbit bankruptcy', 'Astra Space history', 'small launch company comparison'],
  openGraph: {
    title: 'Astra vs Virgin Orbit: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Astra Space and Virgin Orbit — small launch companies that both encountered severe operational and financial difficulties.',
    url: 'https://spacenexus.us/compare/astra-vs-virgin-orbit',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/astra-vs-virgin-orbit' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2016 (as Ventions, renamed Astra 2018)', b: '2017' },
  { metric: 'Headquarters', a: 'Alameda, CA', b: 'Long Beach, CA' },
  { metric: 'Founder(s)', a: 'Chris Kemp, Adam London', b: 'Richard Branson (Virgin Group spin-off)' },
  { metric: 'Launch Vehicle', a: 'Rocket 3 series (retired); Rocket 4 (development halted)', b: 'LauncherOne (air-launched from 747 "Cosmic Girl")' },
  { metric: 'Launch Method', a: 'Vertical ground launch', b: 'Air launch from modified Boeing 747' },
  { metric: 'LEO Payload Capacity', a: 'Rocket 3.3: ~150 kg to SSO', b: 'LauncherOne: ~300 kg to LEO' },
  { metric: 'Orbital Successes', a: '2 successful orbital missions (Rocket 3.3)', b: '4 successful orbital missions (LauncherOne)' },
  { metric: 'Notable Failures', a: 'Multiple Rocket 3 failures; 2022 mission lost TROPICS sats (engine nozzle failure)', b: 'Jan 2023 mission failure (UK launch); filed for bankruptcy Apr 2023' },
  { metric: 'Publicly Traded', a: 'Yes — ASTR (Nasdaq, via SPAC 2021); delisted 2023', b: 'No (private)' },
  { metric: 'Operational Status (2026)', a: 'Launch operations ceased; pivoted to spacecraft propulsion (Astra Spacecraft Engine)', b: 'Ceased operations Apr 2023 (bankrupt); assets sold' },
  { metric: 'Total Funding', a: '~$500M+', b: '~$1B+ (including Virgin Group support)' },
  { metric: 'Key Customers', a: 'NASA (TROPICS), government smallsats', b: 'NASA (CAPSTONE, TROPICS backup), OneWeb, SatixFy' },
  { metric: 'Bankruptcy / Shutdown', a: 'No formal bankruptcy; operational pivot', b: 'Chapter 11 filed April 2023; assets auctioned' },
  { metric: 'Post-Shutdown Legacy', a: 'Spacecraft propulsion products still sold', b: 'LauncherOne technology / assets acquired by various parties' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Astra vs Virgin Orbit</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Astra vs Virgin Orbit</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two small launch companies that reached orbit but ultimately could not sustain commercial operations — a case study in the challenges of the new space launch market.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Astra Space</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Virgin Orbit</th>
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
        Both Astra and Virgin Orbit demonstrated that reaching orbit is only the first milestone — building a reliable, repeatable, and commercially viable launch service is far harder. Astra pursued an aggressive &quot;fail fast&quot; iteration strategy, going public via SPAC in 2021 at a valuation of around $2.1 billion before operational failures and a high-profile mission loss (NASA&apos;s TROPICS constellation satellites in 2022) eroded investor confidence. Astra halted launch operations and pivoted to selling spacecraft propulsion components. Virgin Orbit filed for Chapter 11 bankruptcy in April 2023, just months after a failed launch attempt from Cornwall, UK — its 747 carrier aircraft and LauncherOne assets were subsequently auctioned.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The two companies illustrate different failure modes. Astra&apos;s challenge was reliability — its Rocket 3 vehicles suffered repeated failures before achieving orbit, and its Rocket 4 development was abandoned before first flight. Virgin Orbit achieved a more consistent 4-for-5 orbital success rate but burned through capital without securing sufficient launch cadence to cover its fixed costs, including a dedicated 747 aircraft and large Long Beach facility. Both cases underscore the extreme difficulty of competing against incumbent rideshare options (Falcon 9 rideshare, PSLV) on price and reliability.
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
            { title: 'Relativity Space vs Firefly', href: '/compare/relativity-space-vs-firefly' },
            { title: 'SpaceX vs Rocket Lab', href: '/compare/spacex-vs-rocket-lab' },
            { title: 'SpaceX vs ULA', href: '/compare/spacex-vs-ula' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Astra vs Virgin Orbit: Complete Comparison 2026',
        description: 'Side-by-side comparison of Astra Space and Virgin Orbit — small launch companies that both encountered severe operational and financial difficulties.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/astra-vs-virgin-orbit',
      }).replace(/</g, '\\u003c') }} />
    </div>
  );
}
