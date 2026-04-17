import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Loft Orbital vs York Space Systems: Satellite Platform Comparison 2026',
  description: 'Compare Loft Orbital and York Space Systems side by side — satellite-as-a-service vs tactical satellite buses, business models, customers, missions flown, and funding.',
  keywords: ['Loft Orbital vs York Space', 'satellite as a service', 'satellite bus', 'tactical satellite', 'space infrastructure', 'hosted payloads'],
  openGraph: {
    title: 'Loft Orbital vs York Space Systems: Satellite Platform Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Loft Orbital and York Space covering satellite hosting vs bus manufacturing, missions, customers, and business models.',
    url: 'https://spacenexus.us/compare/loft-orbital-vs-york-space',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/loft-orbital-vs-york-space' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2017', b: '2012' },
  { metric: 'Headquarters', a: 'San Francisco, CA (offices in Toulouse, France)', b: 'Denver, CO' },
  { metric: 'CEO', a: 'Pierre-Damien Vaujour', b: 'Dirk Wallinger' },
  { metric: 'Total Funding', a: '~$137M+ (Series B, 2023)', b: '~$60M+ (acquired by Northrop Grumman via SpaceLogistics, now independent again)' },
  { metric: 'Employees', a: '~120+', b: '~200+' },
  { metric: 'Business Model', a: 'Satellite-as-a-service: hosts customer payloads on Loft-owned satellites', b: 'Manufactures and sells tactical satellite buses to government/commercial customers' },
  { metric: 'Core Product', a: 'Payload Hub — multi-payload hosting on shared spacecraft', b: 'S-CLASS satellite bus — standardized, rapidly producible spacecraft platform' },
  { metric: 'Customer Ownership', a: 'Loft owns and operates the satellite; customers buy data/capacity', b: 'Customer owns the satellite; York builds and delivers' },
  { metric: 'Bus Type', a: 'Proprietary multi-mission bus (YAM series)', b: 'S-CLASS: standardized ESPA-class tactical bus' },
  { metric: 'Payload Flexibility', a: 'Multiple payloads per satellite (EO, RF, AIS, etc.)', b: 'Single mission per bus (EO, ISR, comms, etc.)' },
  { metric: 'Missions Flown', a: '3+ missions launched (YAM-2, YAM-3, YAM-5)', b: '10+ buses delivered/launched for DoD and commercial' },
  { metric: 'Government Customers', a: 'US DoD, French MoD, intelligence community', b: 'SDA (Space Development Agency), US Army, USSF, NRO' },
  { metric: 'Commercial Customers', a: 'Earth observation startups, RF analytics companies', b: 'Commercial EO operators, comms providers' },
  { metric: 'Manufacturing Approach', a: 'Small-batch, customized integration per mission', b: 'Assembly-line production — designed for high-rate manufacturing' },
  { metric: 'SDA/PWSA Role', a: 'Not a direct SDA bus provider', b: 'SDA Tranche 0/1 Transport Layer bus provider' },
  { metric: 'Key Differentiator', a: 'Fastest path to orbit for payloads; no satellite development needed', b: 'Lowest-cost tactical bus with proven production scalability' },
  { metric: 'Revenue Model', a: 'Recurring data/capacity subscription fees', b: 'Hardware sales + satellite integration services' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Loft Orbital vs York Space Systems' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Loft Orbital vs York Space Systems</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Loft Orbital vs York Space Systems</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The satellite industry is bifurcating into two models: owning your own spacecraft or buying capacity on someone else&apos;s. Loft Orbital pioneered the satellite-as-a-service model where customers fly payloads without building satellites, while York Space Systems manufactures low-cost, standardized tactical satellite buses that customers own and operate.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Loft Orbital</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>York Space Systems</th>
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

      {/* Business Model */}
      <h2 className="text-display text-xl mb-3">Own vs Rent: The Satellite Business Model Divide</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Loft Orbital&apos;s satellite-as-a-service model is analogous to cloud computing: customers don&apos;t need to build, launch, or operate their own satellites. Instead, they deliver their payload (a sensor, antenna, or processing unit) to Loft, which integrates it onto a shared spacecraft, launches it, and provides data downlink and operations. This dramatically lowers the barrier to orbit &mdash; a startup with a novel sensor can go from payload delivery to on-orbit data in as little as 12-18 months, compared to 3-5 years for a traditional satellite program. Loft&apos;s YAM (Yet Another Mission) satellites have hosted payloads for Earth observation, RF signal intelligence, AIS tracking, and experimental technology demonstrations.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        York Space Systems takes the opposite approach: building the most affordable, standardized satellite bus possible so that customers who want to own their satellites can do so at a fraction of traditional costs. York&apos;s S-CLASS bus was designed from the ground up for assembly-line production &mdash; a radical departure from the bespoke, one-at-a-time satellite manufacturing that defined the industry for decades. The result is a bus that can be produced in weeks rather than years, at price points that make government programs like the SDA&apos;s Proliferated Warfighter Space Architecture economically viable. York has delivered buses for the SDA&apos;s Transport Layer, demonstrating production scalability that few competitors can match.
      </p>

      {/* Defense Market */}
      <h2 className="text-display text-xl mb-3">The Defense Satellite Market</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Both companies serve the defense market, but in different ways. York Space is a hardware supplier to programs like the SDA&apos;s Proliferated Warfighter Space Architecture, which is deploying hundreds of small satellites across multiple tranches for missile tracking and data transport. This production-volume approach plays directly to York&apos;s assembly-line manufacturing strength. Loft Orbital&apos;s defense value proposition is speed and flexibility: the DoD can fly experimental payloads or gap-filling capabilities on Loft satellites without the timeline and cost of a dedicated satellite program.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        The defense market is large enough for both models to coexist. Programs of record with predictable requirements (like SDA tranches) favor York&apos;s build-and-deliver approach. Rapid capability insertion, technology demonstration, and intelligence community missions favor Loft&apos;s hosted payload model. As the DoD accelerates its shift toward proliferated architectures with shorter refresh cycles, both companies are well-positioned to benefit from the increasing volume of government satellite demand.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Compare satellite platforms and track missions on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=loft-orbital&b=york-space" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/compare/satellite-buses" className="btn-secondary text-sm">Satellite Bus Comparison</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Maxar vs Airbus Defence & Space', href: '/compare/maxar-vs-airbus-defence-space' },
            { title: 'Northrop Grumman vs L3Harris', href: '/compare/northrop-grumman-vs-l3harris-space' },
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
          <li><Link href="/blog/satellite-as-a-service-model-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Satellite-as-a-Service: How Hosted Payloads Are Changing the Industry</Link></li>
          <li><Link href="/blog/sda-proliferated-architecture-explained" className="text-sm text-indigo-400 hover:text-indigo-300">SDA Proliferated Warfighter Space Architecture: A Complete Guide</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Loft Orbital vs York Space Systems: Satellite Platform Comparison 2026',
        description: 'Side-by-side comparison of Loft Orbital and York Space covering satellite-as-a-service vs tactical bus manufacturing, customers, missions, and business models.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/loft-orbital-vs-york-space',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/loft-orbital-vs-york-space']} />
    </div>
  );
}
