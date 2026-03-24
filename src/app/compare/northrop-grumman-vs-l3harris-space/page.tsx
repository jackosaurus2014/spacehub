import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Northrop Grumman vs L3Harris Space: Complete Comparison 2026',
  description: 'Compare Northrop Grumman and L3Harris Technologies space divisions — defense satellites, ISR systems, space vehicles, revenue, and government contract portfolios.',
  keywords: ['Northrop Grumman vs L3Harris', 'defense space comparison', 'space ISR', 'military satellite companies', 'space prime contractors 2026'],
  openGraph: {
    title: 'Northrop Grumman vs L3Harris Space: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Northrop Grumman and L3Harris space and defense satellite divisions.',
    url: 'https://spacenexus.us/compare/northrop-grumman-vs-l3harris-space',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/northrop-grumman-vs-l3harris-space' },
};

const COMPARISON_DATA = [
  { metric: 'Parent Company', a: 'Northrop Grumman Corporation (NOC)', b: 'L3Harris Technologies, Inc. (LHX)' },
  { metric: 'Space / Relevant Division', a: 'Space Systems (within Northrop Grumman)', b: 'Space & Airborne Systems (SAS)' },
  { metric: 'Total Company Revenue (2024 est.)', a: '~$41B', b: '~$21B' },
  { metric: 'Space-Related Revenue (approx.)', a: '~$7–8B (Space Systems segment)', b: '~$5–6B (SAS segment)' },
  { metric: 'Key Satellite Programs', a: 'James Webb Space Telescope (primary); NROL missions; AEHF', b: 'Space Fence radar; missile warning payloads; EO/IR sensors' },
  { metric: 'Cislunar / Exploration', a: 'Gateway HALO module; Antares/Cygnus (ISS resupply)', b: 'Limited — focus on defense systems' },
  { metric: 'Launch Vehicle', a: 'OmegA (cancelled); supported Minotaur (NGIS heritage)', b: 'No proprietary launch vehicle' },
  { metric: 'ISS Cargo', a: 'Cygnus cargo spacecraft (CRS-2 contract)', b: 'N/A' },
  { metric: 'Classified / NROL Programs', a: 'Major NRO prime contractor (classified satellites)', b: 'Sensor / payload subcontractor on NRO programs' },
  { metric: 'Missile Defense / Warning', a: 'GBSD (Sentinel ICBM) — ground-based, adjacent', b: 'SBIRS / Next Gen OPIR sensor payloads' },
  { metric: 'EO / Imaging Sensors', a: 'Classified imaging systems (NROL)', b: 'Advanced EO/IR sensors for satellites and aircraft' },
  { metric: 'Space Domain Awareness', a: 'Various USSF programs', b: 'Space Fence (Kwajalein) — prime contractor' },
  { metric: 'Employees (total company)', a: '~100,000', b: '~50,000' },
  { metric: 'Headquarters', a: 'Falls Church, VA', b: 'Melbourne, FL' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Northrop Grumman vs L3Harris Space</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Northrop Grumman vs L3Harris Space</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Two major U.S. defense and intelligence space contractors — comparing satellite programs, ISR capabilities, government contract portfolios, and strategic positioning in national security space.
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
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Northrop Grumman</th>
                <th className="py-3 px-4 text-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>L3Harris Technologies</th>
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
        Northrop Grumman operates at a significantly larger scale with around $41B in annual revenue versus L3Harris&apos;s ~$21B. Northrop&apos;s Space Systems division is a major prime contractor for classified NRO satellite programs, the James Webb Space Telescope (which it built as prime contractor), the Cygnus cargo spacecraft for ISS resupply, and the Gateway HALO module for the Artemis lunar program. Its breadth spans scientific, civil, and national security space programs.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        L3Harris (formed from the 2019 merger of L3 Technologies and Harris Corporation) is more focused on sensors, payloads, and electronics than on full spacecraft integration. Its most prominent space infrastructure win is the Space Fence — a ground-based S-band radar system on Kwajalein Atoll that tracks objects in LEO and MEO for the U.S. Space Force. L3Harris is a leading supplier of EO/IR sensor payloads for missile warning satellites (SBIRS, Next Gen OPIR) and competes as a subcontractor on many programs where Northrop Grumman acts as prime. The two companies frequently appear in the same programs at different tiers.
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
            { title: 'Boeing Space vs Lockheed Martin Space', href: '/compare/boeing-vs-lockheed-space' },
            { title: 'Maxar vs Airbus Defence Space', href: '/compare/maxar-vs-airbus-defence-space' },
            { title: 'SpaceX vs ULA', href: '/compare/spacex-vs-ula' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Northrop Grumman vs L3Harris Space: Complete Comparison 2026',
        description: 'Side-by-side comparison of Northrop Grumman and L3Harris space and defense satellite divisions.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/northrop-grumman-vs-l3harris-space',
      }).replace(/</g, '\\u003c') }} />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/northrop-grumman-vs-l3harris-space']} />
      </div>
  );
}
