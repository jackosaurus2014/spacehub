import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'SpaceNexus vs BryceTech: Complete Comparison 2026',
  description: 'Compare SpaceNexus and BryceTech side by side — data coverage, API access, pricing, update frequency, self-service tools, and target users. See how the two space intelligence platforms differ.',
  keywords: ['SpaceNexus vs BryceTech', 'space intelligence platform comparison', 'space data tools', 'BryceTech SpaceNexus', 'space industry data comparison'],
  openGraph: {
    title: 'SpaceNexus vs BryceTech: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SpaceNexus and BryceTech space intelligence platforms — data coverage, pricing, API access, and more.',
    url: 'https://spacenexus.us/compare/spacenexus-vs-bryce-tech',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spacenexus-vs-bryce-tech' },
};

const COMPARISON_DATA = [
  { metric: 'Type', spaceNexus: 'Self-service intelligence platform (SaaS)', bryceTech: 'Consulting firm + published research reports' },
  { metric: 'Free Tier', spaceNexus: 'Yes (public data, basic profiles)', bryceTech: 'No (some free reports, consulting is paid)' },
  { metric: 'Pricing Model', spaceNexus: 'Subscription tiers (individual to enterprise)', bryceTech: 'Project-based consulting; report licensing fees' },
  { metric: 'Data Sources', spaceNexus: 'Aggregated public filings, launch databases, news, regulatory records', bryceTech: 'Primary research, government contracts, proprietary methodology' },
  { metric: 'Update Frequency', spaceNexus: 'Near-real-time (news, launches); regular data refreshes', bryceTech: 'Annual or periodic reports (e.g., State of the Satellite Industry)' },
  { metric: 'API Access', spaceNexus: 'Yes (developer API available)', bryceTech: 'No self-service API' },
  { metric: 'Company Profiles', spaceNexus: '200+ space companies with financials, metrics, news', bryceTech: 'Covered in reports; no interactive company database' },
  { metric: 'Satellite Tracking', spaceNexus: 'Yes (constellation data, launch manifests)', bryceTech: 'Covered in reports (e.g., annual satellite industry survey)' },
  { metric: 'Real-Time Data', spaceNexus: 'Yes (launch tracker, news aggregation)', bryceTech: 'No (reports are point-in-time)' },
  { metric: 'Self-Service Access', spaceNexus: 'Yes (web app, dashboards, search)', bryceTech: 'No (outputs are reports and consulting deliverables)' },
  { metric: 'Custom Analysis', spaceNexus: 'Limited (via enterprise plan)', bryceTech: 'Yes (core consulting offering)' },
  { metric: 'Primary Users', spaceNexus: 'Investors, analysts, founders, researchers, space enthusiasts', bryceTech: 'Government agencies, investors, established industry players' },
];

export default function SpaceNexusVsBryceTech() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">SpaceNexus vs BryceTech</span>
        </nav>
        <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceNexus vs BryceTech</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl">
          A transparent comparison of SpaceNexus and BryceTech — two different approaches to space industry intelligence. SpaceNexus is a self-service data platform; BryceTech is a consulting firm with published research.
        </p>
      </div>

      {/* Comparison Table */}
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceNexus</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>BryceTech</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.spaceNexus}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.bryceTech}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis */}
      <div className="prose prose-invert max-w-none mb-12">
        <h2 className="text-display text-xl mb-3">Key Differences</h2>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          SpaceNexus and BryceTech serve overlapping but distinct needs in the space intelligence market. BryceTech is an established consulting and research firm, best known for producing the annual &quot;State of the Satellite Industry Report&quot; (for the Satellite Industry Association) and a range of government-commissioned analyses. Its value lies in deep, methodologically rigorous primary research, often produced under contract for U.S. government clients such as NASA, the Department of Defense, and the FAA. Reports are periodic — typically annual or per-project — rather than continuously updated.
        </p>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          SpaceNexus is built for users who need on-demand, self-service access to space industry data without commissioning a consulting engagement. The platform aggregates company profiles, launch records, funding data, news, and satellite information into a searchable, filterable interface with a developer API. It is suited for analysts, investors, and researchers who need to answer questions quickly — and who want data that is updated continuously rather than once a year. The two are less competitors than complements: BryceTech for bespoke, high-stakes government and investment research; SpaceNexus for everyday intelligence work at scale.
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          See what SpaceNexus offers — explore the platform for free
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies" className="btn-primary text-sm">
            Interactive Comparison Tool
          </Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">
            Browse All 200+ Companies
          </Link>
        </div>
      </div>

      {/* Related Comparisons */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Planet Labs vs Maxar', href: '/compare/planet-labs-vs-maxar' },
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">
              {c.title} →
            </Link>
          ))}
        </div>
      </div>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'SpaceNexus vs BryceTech: Complete Comparison 2026',
            description: 'Side-by-side comparison of SpaceNexus and BryceTech space intelligence platforms — data coverage, pricing, API access, and more.',
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
            datePublished: '2026-03-22',
            dateModified: '2026-03-22',
            url: 'https://spacenexus.us/compare/spacenexus-vs-bryce-tech',
          }).replace(/</g, '\\u003c'),
        }}
      />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/spacenexus-vs-bryce-tech']} />
      </div>
  );
}
