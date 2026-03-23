import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SpaceX vs Rocket Lab: Complete Comparison 2026',
  description: 'Compare SpaceX and Rocket Lab side by side — launch vehicles, payload capacity, launch cadence, pricing, and strategy. From Falcon 9 and Starship to Electron and Neutron.',
  keywords: ['SpaceX vs Rocket Lab', 'Falcon 9 vs Electron', 'Neutron rocket', 'small launch vs heavy lift', 'launch vehicle comparison'],
  openGraph: {
    title: 'SpaceX vs Rocket Lab: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SpaceX and Rocket Lab covering launch vehicles, cadence, payload capacity, and market positioning.',
    url: 'https://spacenexus.us/compare/spacex-vs-rocket-lab',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spacex-vs-rocket-lab' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2002', b: '2006' },
  { metric: 'Headquarters', a: 'Hawthorne, CA, USA', b: 'Long Beach, CA, USA (HQ); NZ operations' },
  { metric: 'Employees', a: '~13,000', b: '~2,100' },
  { metric: 'Publicly Traded', a: 'No (private)', b: 'Yes (RKLB, Nasdaq)' },
  { metric: 'Primary Launch Vehicle', a: 'Falcon 9 / Falcon Heavy / Starship', b: 'Electron / Neutron (in development)' },
  { metric: 'Vehicle Class', a: 'Small, medium, super-heavy lift', b: 'Small lift (Electron); medium lift (Neutron planned)' },
  { metric: 'LEO Payload — Primary Vehicle', a: '22,800 kg (Falcon 9) / 63,800 kg (Falcon Heavy)', b: '300 kg (Electron) / ~13,000 kg (Neutron target)' },
  { metric: 'Launch Cadence (2024)', a: '130+ launches', b: '~16 Electron launches' },
  { metric: 'Total Orbital Launches (Career)', a: '350+', b: '55+ (Electron)' },
  { metric: 'Launch Price (approx.)', a: '~$67M (Falcon 9 commercial)', b: '~$8M (Electron dedicated)' },
  { metric: 'First Stage Reusability', a: 'Yes — Falcon 9 booster (200+ landings)', b: 'Yes — Electron helicopter catch (partial program)' },
  { metric: 'Launch Sites', a: 'Cape Canaveral, Vandenberg, Boca Chica (TX)', b: 'Mahia, NZ; Wallops, VA, USA' },
  { metric: 'Space Systems / Satellites', a: 'Starlink constellation (6,000+ sats)', b: 'Photon spacecraft bus; acquired SolAero, Sinclair' },
  { metric: 'Primary Market', a: 'Commercial, government (NASA, DoD), Starlink', b: 'Small sat commercial, government (NRO, NASA)' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">SpaceX vs Rocket Lab</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceX vs Rocket Lab</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Comparing the world&apos;s most prolific launch provider against the leading small-launch company — heavy lift and mega-constellation versus dedicated rideshare and responsive launch.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Rocket Lab</th>
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
        SpaceX and Rocket Lab largely serve different market segments rather than competing head-to-head. SpaceX dominates medium-to-heavy-lift launches with Falcon 9, running at over 130 missions per year by 2024, and is developing Starship for payloads up to 150,000 kg to LEO. Rocket Lab&apos;s Electron is optimized for dedicated small satellite launches under 300 kg, offering mission control, orbital flexibility, and reliability that rideshare manifests cannot match. Electron is the second-most-launched orbital rocket globally by cadence among western providers.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The comparison becomes more direct as Rocket Lab&apos;s Neutron vehicle targets the 13,000 kg class — competing more directly with a future partially reusable medium-lift market. Rocket Lab has also expanded beyond launch into space systems via its Photon bus and acquisitions, mirroring SpaceX&apos;s vertical integration approach but at a smaller scale. SpaceX&apos;s Starlink constellation provides billions in annual recurring revenue that Rocket Lab does not currently match.
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
            { title: 'SpaceX vs ULA', href: '/compare/spacex-vs-ula' },
            { title: 'Relativity Space vs Firefly', href: '/compare/relativity-space-vs-firefly' },
            { title: 'Astra vs Virgin Orbit', href: '/compare/astra-vs-virgin-orbit' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'SpaceX vs Rocket Lab: Complete Comparison 2026',
        description: 'Side-by-side comparison of SpaceX and Rocket Lab covering launch vehicles, cadence, payload capacity, and market positioning.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/spacex-vs-rocket-lab',
      }).replace(/</g, '\\u003c') }} />
    </div>
  );
}
