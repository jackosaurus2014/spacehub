import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'ClearSpace vs Astroscale: Debris Removal Comparison 2026',
  description: 'Compare ClearSpace and Astroscale side by side — debris removal approaches, funding, ESA and JAXA contracts, capture technology, and mission timelines. Updated for 2026.',
  keywords: ['ClearSpace vs Astroscale', 'space debris removal', 'orbital debris cleanup', 'ELSA-d', 'ClearSpace-1', 'active debris removal'],
  openGraph: {
    title: 'ClearSpace vs Astroscale: Debris Removal Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of ClearSpace and Astroscale covering capture technology, missions, contracts, and the orbital debris removal market.',
    url: 'https://spacenexus.us/compare/clearspace-vs-astroscale',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/clearspace-vs-astroscale' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2018', b: '2013' },
  { metric: 'Headquarters', a: 'Renens, Switzerland', b: 'Tokyo, Japan (offices in UK, US, Israel)' },
  { metric: 'CEO', a: 'Luc Piguet', b: 'Nobu Okada' },
  { metric: 'Total Funding', a: '~$120M+ (Series B, 2024)', b: '~$380M+ (IPO on TSE, 2023)' },
  { metric: 'Public / Private', a: 'Private', b: 'Public (Tokyo Stock Exchange, 2023 IPO)' },
  { metric: 'Employees', a: '~150+', b: '~350+' },
  { metric: 'Capture Approach', a: 'Four-arm claw (grapple and embrace)', b: 'Magnetic capture plate (ELSA-d) + robotic arm' },
  { metric: 'Key Technology', a: 'Proprietary claw gripper for tumbling objects', b: 'Magnetic docking plate + RPO (rendezvous & proximity operations)' },
  { metric: 'First Mission', a: 'ClearSpace-1 — ESA contract, targeting Vespa upper stage (~112 kg)', b: 'ELSA-d (2021) — in-orbit docking demo (servicer + client)' },
  { metric: 'ClearSpace-1 Status', a: 'Launch targeted 2026; Vespa target found to have been hit by debris', b: 'N/A' },
  { metric: 'ELSA-d Results', a: 'N/A', b: 'Successful magnetic capture and release demo (2021-2023)' },
  { metric: 'ADRAS-J Mission', a: 'N/A', b: 'Launched Feb 2024 — RPO inspection of spent H-IIA upper stage' },
  { metric: 'Primary Agency Partner', a: 'ESA (European Space Agency)', b: 'JAXA (Japan Aerospace Exploration Agency)' },
  { metric: 'ESA Contract Value', a: '~$104M (ClearSpace-1 service contract)', b: 'Subcontractor on ESA projects' },
  { metric: 'JAXA Contract', a: 'None', b: 'CRD2 Phase I — commercial debris removal demonstration' },
  { metric: 'Target Objects', a: 'Large debris (rocket stages, defunct satellites)', b: 'Rocket upper stages + end-of-life satellite servicing' },
  { metric: 'Business Model', a: 'Debris removal-as-a-service for agencies', b: 'End-of-life services, debris removal, life extension' },
  { metric: 'Key Differentiator', a: 'ESA-backed first mover in European debris removal', b: 'Most flight heritage in ADR; diversified across removal + servicing' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'ClearSpace vs Astroscale' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">ClearSpace vs Astroscale</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">ClearSpace vs Astroscale</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        With over 36,000 tracked objects in orbit and growing, active debris removal (ADR) is no longer theoretical. ClearSpace and Astroscale are the two most prominent companies racing to commercialize orbital cleanup, each backed by their respective space agencies and pursuing fundamentally different capture technologies.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>ClearSpace</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Astroscale</th>
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

      {/* Capture Technology */}
      <h2 className="text-display text-xl mb-3">Capture Technology: Claw vs Magnetic Docking</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        ClearSpace&apos;s approach centers on a four-armed claw mechanism designed to grapple non-cooperative tumbling objects. This is critical because most debris &mdash; spent rocket stages, defunct satellites &mdash; was never designed for servicing and has no docking interface. The claw wraps around the target and secures it for controlled deorbit. ClearSpace-1&apos;s target, the Vespa payload adapter from a 2013 Vega launch, was chosen specifically because its conical shape is representative of the challenging geometries found in real debris.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Astroscale pioneered the magnetic capture plate concept with ELSA-d, launched in 2021. A small magnetic docking plate is pre-installed on client satellites, allowing Astroscale&apos;s servicer to attach magnetically for end-of-life deorbit. While elegant, this requires cooperation from satellite operators at the design stage. For non-cooperative debris, Astroscale is developing robotic arm capture capabilities, demonstrated through its ADRAS-J mission which successfully performed close-proximity inspection of a 10-meter H-IIA upper stage in 2024 &mdash; the most advanced RPO demonstration against real debris to date.
      </p>

      {/* Market & Regulation */}
      <h2 className="text-display text-xl mb-3">Market Dynamics &amp; Regulatory Pressure</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        The debris removal market is being driven by both regulatory momentum and catastrophic risk. The FCC&apos;s 2022 rule requiring deorbit within 5 years of mission end (down from 25 years) and ESA&apos;s Zero Debris Charter are creating demand for end-of-life services. Astroscale has positioned itself broadly across this ecosystem: removal, life extension, and inspection services. ClearSpace remains more focused on the hardest problem &mdash; removing large, uncooperative legacy debris that poses the greatest Kessler syndrome risk.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both companies face the same fundamental business challenge: their primary customers today are government agencies. The commercial market for debris removal is nascent, though satellite operators are increasingly including end-of-life provisions in their constellation designs. Astroscale&apos;s 2023 IPO on the Tokyo Stock Exchange gave it access to public capital markets and greater visibility, while ClearSpace continues to rely on venture funding and ESA contracts. The next 2-3 years will determine whether debris removal becomes a sustainable commercial market or remains agency-funded.
      </p>

      {/* Outlook */}
      <h2 className="text-display text-xl mb-3">2026 Outlook</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        ClearSpace-1&apos;s launch, now targeted for 2026, will be the first-ever funded mission to remove an actual piece of debris from orbit. The mission faced a setback when the Vespa target was struck by a separate piece of debris in 2023, fragmenting it &mdash; ironically proving the urgency of the mission. Astroscale is preparing ADRAS-J2, which will attempt to physically capture and deorbit a spent rocket stage, building on the inspection-only ADRAS-J mission. Both missions represent inflection points: if successful, they will validate the technical and commercial viability of active debris removal for the first time.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track debris removal companies and orbital environment data on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=clearspace&b=astroscale" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Northrop Grumman vs L3Harris', href: '/compare/northrop-grumman-vs-l3harris-space' },
            { title: 'LeoLabs vs Slingshot Aerospace', href: '/compare/leolabs-vs-slingshot' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/space-debris-removal-market-2026" className="text-sm text-indigo-400 hover:text-indigo-300">The Space Debris Removal Market: Technologies, Players, and Timelines</Link></li>
          <li><Link href="/blog/kessler-syndrome-risk-assessment" className="text-sm text-indigo-400 hover:text-indigo-300">Kessler Syndrome: How Close Are We to a Cascading Debris Crisis?</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'ClearSpace vs Astroscale: Debris Removal Comparison 2026',
        description: 'Side-by-side comparison of ClearSpace and Astroscale covering capture technology, funding, ESA/JAXA contracts, and mission timelines.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-04-15', dateModified: '2026-04-15',
        url: 'https://spacenexus.us/compare/clearspace-vs-astroscale',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/clearspace-vs-astroscale']} />
    </div>
  );
}
