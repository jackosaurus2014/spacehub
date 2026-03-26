import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_DATA = [
  { metric: 'Founded', a: '1985 (as Societe Europeenne des Satellites)', b: '1964 (as intergovernmental consortium; privatized 2001)' },
  { metric: 'Headquarters', a: 'Betzdorf, Luxembourg', b: 'McLean, VA, USA' },
  { metric: 'Public / Private', a: 'Public (Euronext Paris: SESG)', b: 'Private (emerged from Ch.11 in 2022); acquired by SES July 2025' },
  { metric: 'Revenue (2024)', a: '~$2.1B', b: '~$2.0B' },
  { metric: 'Employees', a: '~2,200', b: '~1,700' },
  { metric: 'GEO Satellites', a: '~50+ in GEO', b: '~50+ in GEO' },
  { metric: 'MEO Constellation', a: 'O3b mPOWER (13 MEO satellites planned, 10 launched, high-throughput)', b: 'None (GEO only)' },
  { metric: 'Total Orbital Slots', a: '~50+ GEO orbital positions', b: '~45+ GEO orbital positions' },
  { metric: 'C-Band Clearing (FCC)', a: '~$3.0B in accelerated relocation payments from FCC', b: '~$3.7B in accelerated relocation payments received from FCC' },
  { metric: 'Key Markets', a: 'Video distribution, government, mobility (aero/maritime), data', b: 'Media, government/military, broadband, mobility' },
  { metric: 'Government Business', a: 'SES GS (U.S. government subsidiary, Reston, VA)', b: 'Intelsat General Corp (defense, intelligence, government)' },
  { metric: 'Video/Media', a: 'Largest European video platform (Astra); ~7,800+ TV channels', b: 'Largest international video distribution network (IntelsatOne)' },
  { metric: 'Next-Gen Fleet', a: 'O3b mPOWER (MEO HTS); SES-17 (GEO HTS, Americas)', b: 'Intelsat 40e (GEO, NASA partnership); Epic NG HTS fleet' },
  { metric: 'Bankruptcy History', a: 'None', b: 'Chapter 11 filing May 2020; emerged Feb 2022 (debt reduced from ~$16B to ~$7B)' },
  { metric: 'Merger Status', a: 'SES acquired Intelsat — announced April 2024, completed July 2025', b: 'Acquired by SES for ~$3.1B cash consideration (closed July 17, 2025)' },
  { metric: 'Combined Revenue (post-merger)', a: '~$4.1B+ combined', b: '(see SES)' },
  { metric: 'Combined Fleet (post-merger)', a: '~90 GEO + ~30 MEO satellites (~120 total)', b: '(see SES)' },
  { metric: 'Coverage', a: 'Global (video strong in Europe, Americas)', b: 'Global (strong in Americas, Africa, Asia-Pacific)' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'SES vs Intelsat' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">SES vs Intelsat</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">SES vs Intelsat</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        A comparison of the two largest traditional satellite communications operators. SES announced its acquisition of Intelsat in April 2024 and completed the deal in July 2025, creating the world&apos;s largest geostationary satellite fleet. This comparison captures each company&apos;s independent profile before and through the combination.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SES</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Intelsat</th>
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

      {/* Analysis: C-Band Windfall */}
      <h2 className="text-display text-xl mb-3">The C-Band Windfall</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Both SES and Intelsat received massive payments from the FCC&apos;s C-band spectrum clearing initiative, which required satellite operators to vacate mid-band spectrum (3.7-4.0 GHz) so wireless carriers could use it for 5G services. Intelsat received approximately $3.7 billion and SES received approximately $3.0 billion in accelerated relocation payments. For Intelsat, this windfall was transformative &mdash; the company had filed for Chapter 11 bankruptcy in May 2020 (driven by ~$15B in debt accumulated through multiple leveraged acquisitions including PanAmSat), and the C-band payments helped enable its emergence from bankruptcy in February 2022 with a restructured balance sheet.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        SES used its C-band proceeds to invest in next-generation infrastructure, including the O3b mPOWER constellation of 13 medium-Earth-orbit (MEO) high-throughput satellites (10 launched as of early 2026, 3 remaining). O3b mPOWER, which began service in 2023-2024, provides low-latency, high-throughput connectivity that GEO satellites cannot match, positioning SES uniquely among traditional operators with a multi-orbit architecture. Intelsat has no equivalent MEO capability, which was one of the strategic rationales for the merger &mdash; the combined company now offers connectivity across both GEO and MEO orbits.
      </p>

      {/* Analysis: The Merger */}
      <h2 className="text-display text-xl mb-3">The SES-Intelsat Merger</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SES announced in April 2024 its intention to acquire Intelsat for $3.1 billion in cash consideration (enterprise value ~$5B). The deal closed on July 17, 2025 after receiving regulatory approval from the DOJ, FCC, European Commission, and other authorities, creating a satellite operator with ~90 GEO satellites, ~30 MEO satellites (including O3b mPOWER), roughly $4B+ in combined annual revenue, and the largest geostationary orbital slot portfolio in the industry. The combined entity has unmatched geographic coverage and spectrum holdings.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both companies serve government and military customers worldwide, and the combination of two of the four major GEO operators (alongside Eutelsat/OneWeb and Viasat/Inmarsat) drew regulatory scrutiny. The U.S. government business was particularly sensitive &mdash; SES GS and Intelsat General both hold significant military communications contracts. With the deal now completed, the merged company is expected to deliver approximately &euro;370M in annual synergies (70% within 3 years). The combined entity now faces the strategic challenge of LEO broadband competition from Starlink and its successors while leveraging its multi-orbit GEO+MEO architecture.
      </p>

      {/* Analysis: LEO Challenge */}
      <h2 className="text-display text-xl mb-3">The LEO Broadband Challenge</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Both SES and Intelsat face the strategic reality that LEO broadband constellations (principally Starlink, with Amazon Kuiper and others following) are capturing an increasing share of the connectivity market that traditionally belonged to GEO operators. GEO satellites offer high throughput but inherent ~600ms round-trip latency, while LEO constellations offer broadband with 20-40ms latency. SES&apos;s O3b mPOWER at MEO (~8,000 km altitude, ~150ms latency) provides a middle ground, but the trend is clear: high-value, latency-sensitive applications are migrating to lower orbits. The merger can be seen partly as a consolidation strategy &mdash; combining scale and spectrum to compete more effectively in a market where GEO revenue growth has stalled and LEO is ascendant.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track satellite operators and spectrum allocations on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=ses&b=intelsat" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Viasat vs SES', href: '/compare/viasat-vs-ses' },
            { title: 'Iridium vs Starlink', href: '/compare/iridium-vs-starlink' },
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/space-industry-mergers-acquisitions-biggest-deals" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry M&amp;A: The Biggest Deals and What They Mean</Link></li>
          <li><Link href="/blog/starlink-oneweb-kuiper-mega-constellation-comparison" className="text-sm text-indigo-400 hover:text-indigo-300">Starlink vs OneWeb vs Kuiper: Mega-Constellation Comparison</Link></li>
          <li><Link href="/blog/space-industry-investment-guide-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry Investment Guide 2026</Link></li>
        </ul>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'SES vs Intelsat: Satellite Communications Comparison 2026',
        description: 'Pre-merger comparison of SES and Intelsat covering fleet size, C-band spectrum, revenue, and the deal creating the largest satellite operator.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-26', dateModified: '2026-03-26',
        url: 'https://spacenexus.us/compare/ses-vs-intelsat',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/ses-vs-intelsat']} />
    </div>
  );
}
