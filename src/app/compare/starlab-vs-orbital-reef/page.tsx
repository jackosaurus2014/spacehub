import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Starlab vs Orbital Reef: Commercial Space Station Comparison 2026',
  description: 'Compare Starlab (Voyager/Airbus) and Orbital Reef (Blue Origin/Sierra Space) side by side — architecture, crew capacity, NASA CLD contracts, partners, and timelines.',
  keywords: ['Starlab vs Orbital Reef', 'commercial space stations', 'NASA CLD', 'post-ISS', 'Voyager Space', 'Blue Origin Orbital Reef'],
  openGraph: {
    title: 'Starlab vs Orbital Reef: Commercial Space Station Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Starlab and Orbital Reef covering partners, architecture, NASA CLD status, and the race to replace the ISS.',
    url: 'https://spacenexus.us/compare/starlab-vs-orbital-reef',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/starlab-vs-orbital-reef' },
};

const COMPARISON_DATA = [
  { metric: 'Lead Company', a: 'Voyager Space', b: 'Blue Origin' },
  { metric: 'Key Partners', a: 'Airbus Defence & Space, Hilton (habitation design)', b: 'Sierra Space (LIFE module), Boeing, Genesis Engineering' },
  { metric: 'Headquarters', a: 'Denver, CO (Voyager); Leiden, Netherlands (Airbus DS)', b: 'Kent, WA (Blue Origin); Broomfield, CO (Sierra Space)' },
  { metric: 'Architecture', a: 'Single large module (inflatable + metallic hybrid)', b: 'Multi-module station with inflatable LIFE hab + core module' },
  { metric: 'Crew Capacity', a: '4 crew', b: 'Up to 10 crew' },
  { metric: 'Pressurized Volume', a: '~340 m3', b: '~830 m3 (full build-out)' },
  { metric: 'NASA CLD Contract', a: 'Yes — Phase 1 ($160M award, Dec 2021)', b: 'Yes — Phase 1 ($130M award, Dec 2021)' },
  { metric: 'Research Capabilities', a: 'Dedicated science bay, open-rack research platform', b: 'Multiple lab modules, microgravity manufacturing' },
  { metric: 'Launch Vehicle', a: 'SpaceX Starship (single launch to orbit)', b: 'New Glenn (core) + Falcon Heavy / Vulcan (additional modules)' },
  { metric: 'Starship Compatibility', a: 'Designed for single Starship launch deployment', b: 'Not Starship-dependent; uses New Glenn + commercial launchers' },
  { metric: 'Target Launch Date', a: '2028 (announced)', b: 'Late 2020s (first module)' },
  { metric: 'Space Tourism', a: 'Planned — Hilton partnership for hospitality design', b: 'Planned — visitor accommodations and tourism modules' },
  { metric: 'Artificial Gravity', a: 'Not announced', b: 'Not in baseline design' },
  { metric: 'Total Estimated Cost', a: 'Not publicly disclosed', b: 'Estimated $3-4B+ total program' },
  { metric: 'ISS Dependency', a: 'None — fully independent station', b: 'None — fully independent station' },
  { metric: 'Key Differentiator', a: 'Single-launch deployment on Starship; European partnership', b: 'Largest planned station; Sierra Space LIFE inflatable technology' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Starlab vs Orbital Reef' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Starlab vs Orbital Reef</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Starlab vs Orbital Reef</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Both Starlab and Orbital Reef were selected under NASA&apos;s Commercial LEO Destinations (CLD) program to help ensure continuous American presence in low Earth orbit after the ISS retires. Despite sharing the same mandate, these two station concepts take dramatically different architectural approaches to the post-ISS future.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Starlab</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Orbital Reef</th>
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

      {/* Architecture */}
      <h2 className="text-display text-xl mb-3">Architecture: Single Launch vs Multi-Module Assembly</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Starlab&apos;s most distinctive feature is its plan to deploy the entire station in a single SpaceX Starship launch. The 340 m3 pressurized volume would arrive on-orbit as one integrated unit &mdash; no multi-launch assembly, no docking of separate modules, no years of construction. This approach dramatically reduces operational complexity and schedule risk compared to the ISS, which required over 40 assembly flights across 13 years. The partnership with Airbus Defence &amp; Space brings decades of European crewed spaceflight experience, including ISS module manufacturing and the ATV cargo vehicle.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Orbital Reef takes the more traditional multi-module approach, but with a key innovation: Sierra Space&apos;s LIFE (Large Integrated Flexible Environment) inflatable habitat module. At ~830 m3 when fully built out, Orbital Reef would be the largest commercial station by far. The LIFE module passed its NASA-rated ultimate burst pressure test in 2023, demonstrating that inflatable habitats can exceed the structural performance of rigid metallic modules while launching in a far more compact form. Blue Origin&apos;s New Glenn rocket is the planned primary launch vehicle, keeping the station within the Blue Origin ecosystem.
      </p>

      {/* NASA CLD */}
      <h2 className="text-display text-xl mb-3">NASA CLD Program &amp; the ISS Transition</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Both stations were selected for NASA&apos;s CLD Phase 1 in December 2021, alongside Vast (formerly Nanoracks). Phase 1 provided funded Space Act Agreements for design maturation &mdash; $160M for Starlab and $130M for Orbital Reef. NASA&apos;s CLD Phase 2 will award actual services contracts for crew time, research capacity, and station access, with the agency expecting to spend roughly $3-4 billion on commercial station services over the 2028-2035 period.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The critical question is whether either station can be operational before the ISS is decommissioned, currently targeted for 2030-2031. NASA has been explicit that it cannot afford a gap in human presence in LEO &mdash; such a gap would cede the microgravity research environment to China&apos;s Tiangong station, the only other permanently crewed orbital outpost. Both Starlab and Orbital Reef face the same fundamental challenge: building a space station is historically a decade-long undertaking, and the clock is running.
      </p>

      {/* Partnership Model */}
      <h2 className="text-display text-xl mb-3">Partnership Models</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Starlab&apos;s partnership with Airbus gives it access to Europe&apos;s human spaceflight industrial base and potentially ESA as an anchor customer. The Hilton partnership, while often dismissed as marketing, signals serious thinking about the hospitality and tourism revenue streams that commercial stations will need beyond government contracts. Orbital Reef&apos;s partnership structure is deeper: Blue Origin provides the launch vehicle and core module, Sierra Space brings the inflatable habitat and Dream Chaser crew vehicle, and Boeing contributes its ISS operations experience. This vertical integration could be a strength or a vulnerability &mdash; any partner&apos;s delays cascade through the entire program.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track commercial space station programs on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/axiom-vs-vast" className="btn-primary text-sm">Axiom vs Vast Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Axiom Space vs Vast', href: '/compare/axiom-vs-vast' },
            { title: 'Sierra Space vs Axiom Space', href: '/compare/sierra-space-vs-axiom-space' },
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
          <li><Link href="/blog/commercial-space-stations-race-to-replace-iss" className="text-sm text-indigo-400 hover:text-indigo-300">The Race to Replace the ISS: Commercial Space Stations Explained</Link></li>
          <li><Link href="/blog/nasa-cld-program-explained" className="text-sm text-indigo-400 hover:text-indigo-300">NASA CLD Program: Funding the Post-ISS Future</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Starlab vs Orbital Reef: Commercial Space Station Comparison 2026',
        description: 'Side-by-side comparison of Starlab and Orbital Reef covering architecture, NASA CLD contracts, partners, and the race to replace the ISS.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/starlab-vs-orbital-reef',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/starlab-vs-orbital-reef']} />
    </div>
  );
}
