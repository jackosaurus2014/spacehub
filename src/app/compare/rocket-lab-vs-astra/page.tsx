import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2006', b: '2016' },
  { metric: 'Founder(s)', a: 'Peter Beck', b: 'Chris Kemp, Adam London' },
  { metric: 'Headquarters', a: 'Long Beach, CA (HQ); Mahia, NZ (operations)', b: 'Alameda, CA' },
  { metric: 'Employees', a: '~2,100', b: '~80 (post-restructuring)' },
  { metric: 'Publicly Traded', a: 'Yes (RKLB, Nasdaq)', b: 'Yes (ASTR, Nasdaq) — at risk of delisting' },
  { metric: 'Market Cap (early 2026)', a: '~$12B+', b: '<$50M' },
  { metric: 'Revenue (TTM)', a: '~$436M (FY 2025)', b: 'Near zero — launch services discontinued' },
  { metric: 'Total Funding Raised', a: '~$800M+ (public + private)', b: '~$370M (including SPAC)' },
  { metric: 'Primary Launch Vehicle', a: 'Electron (operational)', b: 'Rocket 3 / LV0009 (retired)' },
  { metric: 'Vehicle Payload (LEO)', a: '300 kg (Electron)', b: '~150 kg to SSO (Rocket 3.3 stated capacity)' },
  { metric: 'Total Orbital Launch Attempts', a: '55+ (Electron)', b: '7 (Rocket 3 series)' },
  { metric: 'Successful Orbital Launches', a: '50+', b: '1 (LV0007 Nov 2021; only confirmed orbital success)' },
  { metric: 'Launch Success Rate', a: '~93%', b: '~14% (1 success out of 7 attempts)' },
  { metric: 'Reusability', a: 'Electron booster recovery (helicopter catch program)', b: 'None — program ended' },
  { metric: 'Launch Sites', a: 'Mahia, NZ (LC-1); Wallops, VA (LC-2)', b: 'Kodiak, AK (Pacific Spaceport); Cape Canaveral' },
  { metric: 'Next-Gen Vehicle', a: 'Neutron (medium-lift, ~13,000 kg LEO, in development)', b: 'None — launch development halted' },
  { metric: 'Space Systems Division', a: 'Photon satellite bus; Pioneer deep-space bus; SolAero solar cells; Sinclair reaction wheels; satellite components', b: 'Pivoted to spacecraft electric propulsion systems' },
  { metric: 'Key Customers', a: 'NASA, NRO, commercial smallsat operators, Synspective, Kineis', b: 'Formerly DARPA, DoD (pre-pivot)' },
  { metric: 'Business Model (2026)', a: 'Launch services + vertically integrated space systems', b: 'Spacecraft propulsion (electric propulsion modules)' },
  { metric: 'Stock Performance (2024–2025)', a: 'RKLB up ~700% in 2024; strong institutional interest', b: 'ASTR down ~95% from SPAC debut; reverse splits to maintain listing' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Rocket Lab vs Astra Space' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Rocket Lab vs Astra Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Rocket Lab vs Astra Space</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Both companies entered the small-launch market with ambitious goals. Their trajectories since going public via SPAC have diverged dramatically — Rocket Lab has become a space industry powerhouse, while Astra pivoted away from launch entirely.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Rocket Lab</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Astra Space</th>
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

      {/* Launch History */}
      <h2 className="text-display text-xl mb-3">Launch History</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Rocket Lab&apos;s Electron has become the second-most-frequently-launched U.S. orbital rocket, with 55+ missions since its first orbital attempt in 2017. Its success rate of approximately 93% places it among the most reliable small launch vehicles ever built. Electron has launched payloads for NASA, the NRO, the U.S. Space Force, and dozens of commercial customers. The vehicle&apos;s Rutherford engines use an innovative electric turbopump design, and Rocket Lab has demonstrated first-stage recovery via mid-air helicopter catch.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Astra&apos;s launch history was far shorter and more troubled. The company attempted seven orbital launches of its Rocket 3 / LV0009 vehicle between 2020 and 2023. Only one mission (LV0007, November 2021) successfully reached orbit and deployed its payload. Notably, the June 2022 launch carrying NASA TROPICS payloads failed due to an upper-stage anomaly. After a string of failures and growing cash burn, Astra halted launch vehicle development in 2023 and pivoted its business entirely toward spacecraft electric propulsion systems, leveraging technology from its acquired subsidiary Apollo Fusion.
      </p>

      {/* Business Model Comparison */}
      <h2 className="text-display text-xl mb-3">Business Model Comparison</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Rocket Lab has pursued aggressive vertical integration, acquiring space-grade solar cell manufacturer SolAero Technologies, reaction wheel maker Sinclair Interplanetary, and software firm Advanced Solutions. This gives Rocket Lab the ability to offer end-to-end mission services: launch on Electron, satellite bus via Photon, and key subsystems manufactured in-house. The company has won deep-space missions including NASA&apos;s CAPSTONE lunar mission and the upcoming Venus Life Finder mission using its Photon/Pioneer spacecraft bus.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Astra&apos;s original thesis was that software-defined, mass-produced rockets could dramatically lower launch costs. The vision was compelling but execution proved extremely difficult. After going public via SPAC in 2021 at an implied valuation of ~$2.1B, repeated launch failures and cash constraints forced a strategic pivot. Astra now focuses on spacecraft electric propulsion, selling thruster modules to satellite manufacturers. While the propulsion market is real, it is a far smaller TAM than launch services, and Astra faces competition from established players like Busek, Enpulsion, and Phase Four.
      </p>

      {/* Stock Performance */}
      <h2 className="text-display text-xl mb-3">Stock Performance &amp; Investor Outlook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Rocket Lab (RKLB) has been one of the best-performing space stocks. After going public via SPAC in August 2021, the stock initially traded in the $5&ndash;$12 range before surging roughly 700% in 2024 as the company demonstrated consistent Electron launch cadence, growing backlog, and progress on Neutron. By early 2026, RKLB trades above $25 with a market cap exceeding $12 billion. Analysts view Neutron&apos;s entry into the medium-lift market as a significant catalyst.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Astra (ASTR) has lost over 95% of its value since the SPAC merger. The stock has undergone multiple reverse splits to maintain Nasdaq listing requirements and trades at a market cap below $50 million. Institutional ownership has largely evaporated, and the company faces questions about long-term viability as a standalone public company. The pivot to propulsion may provide a path to modest revenue, but the scale is incomparable to the original launch vision.
      </p>

      {/* Future Outlook */}
      <h2 className="text-display text-xl mb-3">Future Outlook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Rocket Lab&apos;s trajectory is strongly upward. Neutron, a 13,000 kg-class reusable medium-lift rocket, is expected to conduct its first launch in 2025&ndash;2026, directly competing for DoD and commercial payloads in the most valuable segment of the launch market. The company&apos;s growing space systems revenue and diversified customer base provide resilience beyond pure launch services. Astra&apos;s future depends on whether its propulsion business can generate sufficient revenue and margins to sustain a public company. The electric propulsion market is growing but competitive, and Astra&apos;s brand has been significantly damaged by its launch program failures.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies with real-time data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=rocket-lab&b=astra" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Rocket Lab', href: '/compare/spacex-vs-rocket-lab' },
            { title: 'Relativity Space vs Firefly', href: '/compare/relativity-space-vs-firefly' },
            { title: 'Astra vs Virgin Orbit', href: '/compare/astra-vs-virgin-orbit' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Rocket Lab vs Astra Space: Small Launch Comparison 2026',
        description: 'Side-by-side comparison of Rocket Lab and Astra Space covering launch history, business models, stock performance, and future outlook.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-25', dateModified: '2026-03-25',
        url: 'https://spacenexus.us/compare/rocket-lab-vs-astra',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/rocket-lab-vs-astra']} />
    </div>
  );
}
