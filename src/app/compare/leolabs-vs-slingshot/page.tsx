import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'LeoLabs vs Slingshot Aerospace: Space Domain Awareness Comparison 2026',
  description: 'Compare LeoLabs and Slingshot Aerospace side by side — radar networks, software platforms, SSA catalogs, government contracts, and TraCSS roles. Updated for 2026.',
  keywords: ['LeoLabs vs Slingshot Aerospace', 'space domain awareness', 'space situational awareness', 'SSA', 'SDA', 'orbital tracking'],
  openGraph: {
    title: 'LeoLabs vs Slingshot Aerospace: Space Domain Awareness Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of LeoLabs and Slingshot Aerospace covering sensor networks, catalog size, government contracts, and SDA strategy.',
    url: 'https://spacenexus.us/compare/leolabs-vs-slingshot',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/leolabs-vs-slingshot' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2016', b: '2017' },
  { metric: 'Headquarters', a: 'Menlo Park, CA', b: 'Austin, TX' },
  { metric: 'CEO', a: 'Dan Ceperley', b: 'Melanie Stricklan' },
  { metric: 'Total Funding', a: '~$82M+ (Series B, 2022)', b: '~$80M+ (Series B, 2023)' },
  { metric: 'Employees', a: '~80+', b: '~200+' },
  { metric: 'Core Approach', a: 'Proprietary phased-array radar network (hardware + data)', b: 'Software platform aggregating multiple sensor sources (software-first)' },
  { metric: 'Sensor Type', a: 'S-band phased-array radars (own & operate)', b: 'Multi-source fusion (government, commercial, optical, radar data)', },
  { metric: 'Radar Sites', a: '6 global sites (Alaska, Texas, Costa Rica, New Zealand, Australia, Azores)', b: 'No proprietary sensors — software layer over existing data' },
  { metric: 'Catalog Size', a: '~250,000+ tracked objects (down to ~2 cm in LEO)', b: 'Aggregates 18th SDS + commercial catalogs; focus on analytics over raw tracking' },
  { metric: 'Minimum Trackable Size', a: '~2 cm in LEO (phased-array advantage)', b: 'Dependent on upstream sensor capabilities' },
  { metric: 'Key Product', a: 'LeoTrack platform — real-time conjunction alerts, orbit data, mapping', b: 'Seradata, Slingshot Beacon — digital twin of space environment' },
  { metric: 'Government Contracts', a: 'USSF, DoD, allied nation partnerships', b: 'USSF TraCSS contract (2024), DoD, allied military' },
  { metric: 'TraCSS Role', a: 'Data provider to TraCSS ecosystem', b: 'Selected as prime contractor for USSF Traffic Coordination System for Space' },
  { metric: 'Commercial Customers', a: 'Satellite operators (conjunction screening, launch support)', b: 'Satellite operators, insurers, government agencies' },
  { metric: 'AI / ML Capabilities', a: 'ML-based orbit determination and collision probability', b: 'AI-powered anomaly detection, maneuver characterization, predictive analytics' },
  { metric: 'Key Differentiator', a: 'Only commercial company with global proprietary radar network for LEO', b: 'Software-first platform + TraCSS prime contractor; digital twin approach' },
  { metric: 'Business Model', a: 'Data-as-a-service from proprietary sensors', b: 'SaaS platform + government program prime contractor' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'LeoLabs vs Slingshot Aerospace' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">LeoLabs vs Slingshot Aerospace</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">LeoLabs vs Slingshot Aerospace</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        Space Domain Awareness (SDA) has become a critical infrastructure need as orbital congestion intensifies. LeoLabs and Slingshot Aerospace represent two fundamentally different approaches: LeoLabs operates its own global radar network for raw tracking data, while Slingshot builds a software platform that fuses data from multiple sources into an actionable intelligence layer.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>LeoLabs</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Slingshot Aerospace</th>
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

      {/* Hardware vs Software */}
      <h2 className="text-display text-xl mb-3">Hardware-First vs Software-First</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        LeoLabs has invested heavily in building a proprietary global network of S-band phased-array radars. With six sites spanning both hemispheres, LeoLabs can track objects as small as 2 cm in low Earth orbit &mdash; significantly smaller than the ~10 cm threshold of the US Space Force&apos;s Space Surveillance Network. This raw sensing capability is LeoLabs&apos; core moat: no other commercial company operates a comparable global radar network dedicated to space tracking. The data feeds their LeoTrack platform, which provides real-time conjunction alerts, orbit determination, and risk assessment.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Slingshot Aerospace takes a fundamentally different approach: rather than building sensors, Slingshot builds the software intelligence layer that sits on top of existing data sources. Their platform ingests tracking data from government catalogs, commercial radar and optical networks, and proprietary algorithms to create a &quot;digital twin&quot; of the space environment. This approach lets Slingshot focus on analytics, AI-driven anomaly detection, and decision support rather than the capital-intensive business of deploying hardware. Slingshot&apos;s acquisition of Seradata in 2023 added a comprehensive satellite database to their platform.
      </p>

      {/* TraCSS */}
      <h2 className="text-display text-xl mb-3">TraCSS and the Future of Space Traffic Management</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Slingshot&apos;s selection as prime contractor for the US Space Force&apos;s Traffic Coordination System for Space (TraCSS) in 2024 was a landmark moment for commercial SDA. TraCSS is the DoD&apos;s initiative to transition basic space safety services &mdash; conjunction warnings, launch screening &mdash; from the military to a civil/commercial framework. As prime contractor, Slingshot is positioned to become the central node in the US space traffic management ecosystem, a role that could define the company for decades.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        LeoLabs participates in the TraCSS ecosystem as a data provider, feeding its high-resolution radar tracking data into the broader system. Both companies benefit from the growing recognition that space traffic management requires commercial capabilities beyond what the military alone can provide. With over 10,000 active satellites and growing, the demand for precise, timely tracking data and collision avoidance services is accelerating faster than government infrastructure can scale.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track SDA companies and orbital data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=leolabs&b=slingshot-aerospace" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'ClearSpace vs Astroscale', href: '/compare/clearspace-vs-astroscale' },
            { title: 'Spire vs HawkEye 360', href: '/compare/spire-vs-hawkeye-360' },
            { title: 'BlackSky vs Planet Labs', href: '/compare/blacksky-vs-planet-labs' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/space-domain-awareness-market-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Space Domain Awareness: The Emerging Market for Orbital Intelligence</Link></li>
          <li><Link href="/blog/tracss-space-traffic-management" className="text-sm text-indigo-400 hover:text-indigo-300">TraCSS Explained: How Space Traffic Management Is Going Commercial</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'LeoLabs vs Slingshot Aerospace: Space Domain Awareness Comparison 2026',
        description: 'Side-by-side comparison of LeoLabs and Slingshot Aerospace covering radar networks, software platforms, government contracts, and SDA strategy.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/leolabs-vs-slingshot',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/leolabs-vs-slingshot']} />
    </div>
  );
}
