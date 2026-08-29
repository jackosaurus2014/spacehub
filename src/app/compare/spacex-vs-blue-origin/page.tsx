import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { SITE_STATS } from '@/lib/site-stats';
import { getCompareFigures, formatMarketCap, formatFundingTotal, formatValuation } from '@/lib/compare-figures';
import { CompareFiguresFootnote } from '@/components/compare/CompareFigureFootnote';

// Railway's build container has no DB access — figures are fetched at request time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blue Origin vs SpaceX: Who Is Winning in 2026?',
  description: 'New Glenn has flown three times (two successes, one failure) while Falcon 9 launches almost every other day. Rockets, reusability, Starlink vs Amazon Leo, NASA contracts, valuation and roadmaps — the full 2026 comparison.',
  keywords: ['Blue Origin vs SpaceX', 'SpaceX vs Blue Origin', 'SpaceX comparison', 'Blue Origin comparison', 'space company comparison', 'rocket companies compared'],
  openGraph: {
    title: 'Blue Origin vs SpaceX: Who Is Winning in 2026?',
    description: 'New Glenn has flown three times (two successes, one failure) while Falcon 9 launches almost every other day. Rockets, reusability, Starlink vs Amazon Leo, NASA contracts, valuation and roadmaps — the full 2026 comparison.',
    url: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spacex-vs-blue-origin' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', spacex: '2002', blueOrigin: '2000' },
  { metric: 'Founder', spacex: 'Elon Musk', blueOrigin: 'Jeff Bezos' },
  { metric: 'Headquarters', spacex: 'Hawthorne, CA', blueOrigin: 'Kent, WA' },
  { metric: 'Employees', spacex: '~13,000', blueOrigin: '~10,000' },
  { metric: 'Total Funding', spacex: '~$10B+', blueOrigin: '~$13B+ (mostly Bezos)' },
  { metric: 'Valuation', spacex: '~$2T market cap (NASDAQ: SPCX)', blueOrigin: 'Private (est. $30B+)' },
  { metric: 'Primary Vehicle', spacex: 'Falcon 9 / Starship', blueOrigin: 'New Glenn / New Shepard' },
  { metric: 'Orbital Launches (Career)', spacex: '500+ (Falcon 9 & Falcon Heavy)', blueOrigin: '3 New Glenn flights: 2 successes (Jan & Nov 2025), 1 failure (Apr 2026)' },
  { metric: 'Reusability', spacex: 'Falcon 9 booster (400+ landings, 20+ flights on a single booster)', blueOrigin: 'New Glenn booster landed once (Nov 2025); New Shepard routinely reused' },
  { metric: 'LEO Payload Capacity', spacex: '22,800 kg (F9) / 150,000 kg (Starship)', blueOrigin: '45,000 kg (New Glenn)' },
  { metric: 'Constellation', spacex: 'Starlink (9,000+ sats in orbit)', blueOrigin: 'Amazon Leo (formerly Kuiper): 3,236 planned, deployment under way — launching on Atlas V, Vulcan, Falcon 9 and New Glenn' },
  { metric: 'Crewed Missions', spacex: 'Crew Dragon (12+ missions)', blueOrigin: 'New Shepard (6 crewed flights)' },
  { metric: 'NASA Contracts', spacex: 'HLS, CRS, Crew, Mars', blueOrigin: 'Artemis sustaining lander' },
  { metric: 'Revenue Model', spacex: 'Launch services + Starlink (the majority of revenue)', blueOrigin: 'Launch services, BE-4 engines (sold to ULA for Vulcan), Amazon Leo launches, Blue Moon lander' },
  { metric: 'Public/Private', spacex: 'Public (NASDAQ: SPCX, IPO June 2026)', blueOrigin: 'Private' },
];

export default async function SpaceXVsBlueOrigin() {
  const figures = await getCompareFigures(['spacex', 'blue-origin']);
  const spacex = figures['spacex'];
  const blueOrigin = figures['blue-origin'];
  const spacexFunding = formatFundingTotal(spacex?.totalFundingUSD);
  const blueOriginFunding = formatFundingTotal(blueOrigin?.totalFundingUSD);
  const spacexMarketCap = formatMarketCap(spacex?.marketCapUSD);
  const blueOriginValuation = formatValuation(blueOrigin?.valuationUSD);

  const comparisonData = COMPARISON_DATA.map((row) => {
    if (row.metric === 'Total Funding') {
      return {
        ...row,
        spacex: spacexFunding ? `~${spacexFunding}` : row.spacex,
        blueOrigin: blueOriginFunding ? `~${blueOriginFunding} (mostly Bezos)` : row.blueOrigin,
      };
    }
    if (row.metric === 'Valuation') {
      return {
        ...row,
        spacex: spacexMarketCap ? `~${spacexMarketCap} market cap (NASDAQ: SPCX)` : row.spacex,
        blueOrigin: blueOriginValuation ? `Private (est. ${blueOriginValuation})` : row.blueOrigin,
      };
    }
    return row;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'SpaceX vs Blue Origin' }]} />
      <div className="mb-8">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-white">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">SpaceX vs Blue Origin</span>
        </nav>
        <HeroArt src="/art/hero-rivalry-launch.webp" className="mb-6" />
        <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceX vs Blue Origin</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl">
          A comprehensive side-by-side comparison of the two most prominent space launch companies, updated with the latest data from SpaceNexus.
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
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceX</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Blue Origin</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.spacex}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.blueOrigin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-2 sm:px-4 pb-3">
          <CompareFiguresFootnote figures={[spacex, blueOrigin]} />
        </div>
      </div>

      {/* Analysis */}
      <div className="prose prose-invert max-w-none mb-12">
        <h2 className="text-display text-xl mb-3">Key Differences</h2>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          SpaceX leads in operational scale with 500+ orbital launches and a Starlink constellation generating well over $10 billion a year. Blue Origin, despite being founded two years earlier, reached orbit for the first time with New Glenn in January 2025, landed a booster on its second flight that November, and lost its third vehicle in April 2026 — a normal early-programme record, but one that leaves it years behind on cadence. Its bet is long-horizon: BE-4 engines power ULA&apos;s Vulcan as well as New Glenn, and the Blue Moon lander anchors its NASA Artemis role.
        </p>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
          SpaceX&apos;s Starship represents the largest launch vehicle ever built, while Blue Origin&apos;s New Glenn targets the commercial and government launch market as a heavy-lift competitor to Falcon 9 and Falcon Heavy. Both are tied to LEO broadband constellations — SpaceX owns Starlink outright, while Blue Origin is one of several launchers for Amazon&apos;s Leo constellation (formerly Project Kuiper), a sister company rather than a subsidiary.
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Track both companies with real-time data on SpaceNexus
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies?a=spacex&b=blue-origin" className="btn-primary text-sm">
            Interactive Comparison Tool
          </Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">
            Browse All {SITE_STATS.companies} Companies
          </Link>
        </div>
      </div>

      {/* Related Comparisons */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'The long-form guide: Blue Origin vs SpaceX in 2026', href: '/guide/blue-origin-vs-spacex' },
            { title: 'Rocket Lab vs Relativity Space', href: '/compare/rocket-lab-vs-relativity-space' },
            { title: 'Starlink vs OneWeb', href: '/compare/starlink-vs-oneweb' },
            { title: 'Planet Labs vs Maxar', href: '/compare/planet-labs-vs-maxar' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">
              {c.title} →
            </Link>
          ))}
        </div>
      </div>

      {/* Related Reading */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-3">Related Reading</h3>
        <ul className="space-y-2">
          <li><Link href="/blog/spacex-ipo-what-it-means-for-space-investors" className="text-sm text-indigo-400 hover:text-indigo-300">The SpaceX IPO: What a $1.75 Trillion Valuation Means for Space Investors</Link></li>
          <li><Link href="/blog/space-industry-investment-guide-2026" className="text-sm text-indigo-400 hover:text-indigo-300">Space Industry Investment Guide: Where Smart Money Is Going in 2026</Link></li>
          <li><Link href="/guide/space-launch-cost-comparison" className="text-sm text-indigo-400 hover:text-indigo-300">Space Launch Cost Comparison 2026: Prices by Vehicle &amp; Provider</Link></li>
        </ul>
      </div>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'SpaceX vs Blue Origin: Complete Comparison 2026',
            description: 'Side-by-side comparison of SpaceX and Blue Origin with data on launches, funding, employees, and strategy.',
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
            datePublished: '2026-03-22',
            dateModified: '2026-08-13',
            url: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
          }).replace(/</g, '\\u003c'),
        }}
      />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/spacex-vs-blue-origin']} />
      </div>
  );
}
