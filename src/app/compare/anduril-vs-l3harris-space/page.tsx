import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Anduril vs L3Harris Space: Defense Space Comparison 2026',
  description: 'Compare Anduril and L3Harris Space side by side — AI-first vs traditional defense, Golden Dome role, SDA contracts, space portfolio, and approach to space defense.',
  keywords: ['Anduril vs L3Harris Space', 'space defense', 'Golden Dome', 'SDA satellites', 'defense technology', 'space security'],
  openGraph: {
    title: 'Anduril vs L3Harris Space: Defense Space Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Anduril and L3Harris covering AI-first vs traditional defense approaches, SDA contracts, and space defense strategy.',
    url: 'https://spacenexus.us/compare/anduril-vs-l3harris-space',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/anduril-vs-l3harris-space' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2017', b: '2019 (merger of L3 Technologies + Harris Corporation)' },
  { metric: 'Heritage', a: 'Silicon Valley defense startup (Palmer Luckey, Oculus founder)', b: 'Legacy defense prime with roots dating to 1895 (Harris Corp)' },
  { metric: 'Headquarters', a: 'Costa Mesa, CA', b: 'Melbourne, FL' },
  { metric: 'Employees', a: '~4,000+', b: '~47,000+' },
  { metric: 'Revenue (2025)', a: '~$1B+ (estimated, private)', b: '~$21B+' },
  { metric: 'Valuation', a: '~$28B (2025 Series G)', b: '~$45B market cap (NYSE: LHX)' },
  { metric: 'Public / Private', a: 'Private', b: 'Public (NYSE: LHX)' },
  { metric: 'Core Approach', a: 'Software-defined, AI-first autonomous systems', b: 'Hardware-centric, full-spectrum space & sensor systems' },
  { metric: 'Space Portfolio', a: 'Lattice AI mesh network, counter-UAS, space C2 software', b: 'ISR satellites, weather satellites, EO/IR sensors, ground systems' },
  { metric: 'Golden Dome Role', a: 'Selected for Golden Dome missile defense architecture (software/AI layer)', b: 'Legacy missile warning satellite provider (SBIRS heritage)' },
  { metric: 'SDA Contracts', a: 'Pursuing SDA Tracking and Transport Layer contracts', b: 'SDA Tracking Layer Tranche 1 & 2 (missile tracking satellites)' },
  { metric: 'Key Technology', a: 'Lattice OS — AI-powered C2 platform connecting sensors to shooters', b: 'Space-based infrared sensors, precision EO/IR payloads, resilient comms' },
  { metric: 'Manufacturing', a: 'Arsenal-1 mega-factory in Ohio (2025)', b: 'Established facilities in FL, NY, UT, CO' },
  { metric: 'Software vs Hardware', a: 'Software-first; hardware serves the software platform', b: 'Hardware-first; software enables hardware capabilities' },
  { metric: 'Acquisition Strategy', a: 'Area-I (drones), Dive Technologies (undersea), Copious Imaging', b: 'Aerojet Rocketjets (failed 2022), numerous sensor/payload acquisitions' },
  { metric: 'Key Differentiator', a: 'Speed of deployment; AI autonomy; startup culture disrupting primes', b: 'Decades of flight heritage; trusted by DoD; full production scale' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Anduril vs L3Harris Space' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Anduril vs L3Harris Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Anduril vs L3Harris Space</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The space defense sector is being reshaped by a collision between Silicon Valley disruption and traditional defense industrial base expertise. Anduril, the AI-first defense startup founded by Palmer Luckey, is challenging established primes like L3Harris for the next generation of space defense contracts &mdash; from missile warning to space domain awareness.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Anduril</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>L3Harris Space</th>
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

      {/* Software vs Hardware */}
      <h2 className="text-display text-xl mb-3">Software-Defined vs Hardware-Heritage</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Anduril&apos;s core product is Lattice, an AI-powered operating system designed to connect sensors, platforms, and effectors across all domains &mdash; air, ground, sea, space, and cyber. In space, Lattice could serve as the command-and-control backbone linking SDA satellites, ground-based sensors, and missile defense interceptors into a unified kill chain. Anduril&apos;s thesis is that the bottleneck in modern defense isn&apos;t sensors or shooters but the software that connects them. This software-first philosophy allows Anduril to move faster than traditional primes, deploying updates in weeks rather than years.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        L3Harris brings decades of space hardware heritage that cannot be replicated quickly. The company built the infrared sensors for the SBIRS (Space Based Infrared System) missile warning satellites, arguably the most critical space defense asset in the US arsenal. L3Harris is now delivering Tracking Layer satellites for the Space Development Agency&apos;s Proliferated Warfighter Space Architecture (PWSA), which distributes missile tracking across dozens of small satellites in LEO rather than relying on a few exquisite GEO platforms. This hardware pedigree &mdash; building sensors that work reliably in the radiation environment of space &mdash; represents institutional knowledge built over decades.
      </p>

      {/* Golden Dome */}
      <h2 className="text-display text-xl mb-3">Golden Dome &amp; Next-Gen Missile Defense</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        The Golden Dome program, announced in 2025, aims to create a comprehensive missile defense shield for the US homeland. Anduril was selected as a key participant, reflecting the Pentagon&apos;s recognition that the AI/software integration layer is as important as the physical interceptors and sensors. Anduril&apos;s role focuses on the command-and-control architecture &mdash; the &quot;brain&quot; that decides which sensor tracks which threat and which interceptor engages it.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        L3Harris&apos;s role in missile defense is more traditional but equally essential: building the space-based infrared sensors that detect missile launches in the first place. Without these sensors, there is nothing for Anduril&apos;s AI to process. The two companies are more complementary than directly competitive in this context &mdash; L3Harris builds the eyes, Anduril builds the brain. The real competition is over budget share and prime contractor status: will the defense establishment continue to trust traditional primes with program leadership, or will software-defined companies like Anduril increasingly win prime contracts?
      </p>

      {/* Industry Impact */}
      <h2 className="text-display text-xl mb-3">Implications for the Defense Industrial Base</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Anduril&apos;s rise represents a broader shift in how the Pentagon acquires space and defense technology. The company&apos;s $28B valuation on $1B+ in revenue signals investor confidence that software-first defense companies can capture significant market share from traditional primes. L3Harris, for its part, is not standing still &mdash; the company has been investing in AI, autonomous systems, and software-defined architectures. The likely outcome is convergence: Anduril will need to build more hardware expertise (its Arsenal-1 factory is a step), while L3Harris will need to become more software-capable. The space domain, where both companies are investing heavily, will be a primary battleground for this competition.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track defense space companies and procurement data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=anduril&b=l3harris" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Northrop Grumman vs L3Harris', href: '/compare/northrop-grumman-vs-l3harris-space' },
            { title: 'Boeing vs Lockheed Space', href: '/compare/boeing-vs-lockheed-space' },
            { title: 'Northrop Grumman vs Boeing Space', href: '/compare/northrop-grumman-vs-boeing-space' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/golden-dome-missile-defense-explained" className="text-sm text-indigo-400 hover:text-indigo-300">Golden Dome: Inside the Next-Gen Missile Defense Architecture</Link></li>
          <li><Link href="/blog/space-defense-market-2026" className="text-sm text-indigo-400 hover:text-indigo-300">The Space Defense Market: Who Is Building America&apos;s Orbital Shield?</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Anduril vs L3Harris Space: Defense Space Comparison 2026',
        description: 'Side-by-side comparison of Anduril and L3Harris covering AI-first vs traditional defense, Golden Dome, SDA contracts, and space defense strategy.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/anduril-vs-l3harris-space',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/anduril-vs-l3harris-space']} />
    </div>
  );
}
