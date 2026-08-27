import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { getCompareFigures, formatMarketCap } from '@/lib/compare-figures';
import { CompareFiguresFootnote } from '@/components/compare/CompareFigureFootnote';

// Railway's build container has no DB access — figures are fetched at request time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SpaceX vs Rocket Lab Stock: SPCX vs RKLB as Investments 2026',
  description: 'SpaceX (SPCX) vs Rocket Lab (RKLB) as investments — market cap, revenue growth, backlog, the pending Iridium acquisition, Neutron\'s path to first flight, and how the two stocks fit different risk profiles.',
  keywords: ['SPCX vs RKLB', 'SpaceX stock vs Rocket Lab stock', 'SPCX stock', 'RKLB stock', 'space stocks to invest in', 'SpaceX IPO', 'Rocket Lab Iridium acquisition', 'Neutron rocket stock'],
  openGraph: {
    title: 'SpaceX vs Rocket Lab Stock: SPCX vs RKLB as Investments 2026 | SpaceNexus',
    description: 'Market cap, revenue growth, backlog, and catalysts — SpaceX and Rocket Lab compared purely as investments.',
    url: 'https://spacenexus.us/compare/spcx-vs-rklb-stock',
    type: 'article',
    images: [{
      url: '/api/og?title=SPCX+vs+RKLB&subtitle=As+Investments+2026&type=market',
      width: 1200,
      height: 630,
      alt: 'SpaceX vs Rocket Lab Stock Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceX vs Rocket Lab Stock: SPCX vs RKLB as Investments 2026 | SpaceNexus',
    description: 'Market cap, revenue growth, backlog, and catalysts — SpaceX and Rocket Lab compared purely as investments.',
    images: ['/api/og?title=SPCX+vs+RKLB&subtitle=As+Investments+2026&type=market'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spcx-vs-rklb-stock' },
};

const COMPARISON_DATA = [
  { metric: 'Ticker / Exchange', a: 'SPCX · Nasdaq', b: 'RKLB · Nasdaq' },
  { metric: 'Listed Since', a: 'June 12, 2026 (IPO)', b: 'August 2021 (SPAC merger)' },
  { metric: 'IPO / Debut Pricing', a: '$135/share, priced at ~$1.78T; debut-day market cap ~$2.1T — largest IPO in history', b: 'N/A (SPAC, Vector Acquisition Corp)' },
  { metric: 'Market Cap (Aug 2026)', a: '~$2T', b: '~$17B' },
  { metric: 'Most Recent Quarterly Revenue', a: '~$15.5B (FY2025 run-rate, incl. Starlink)', b: '$234M (Q2 2026, +62% YoY)' },
  { metric: 'Revenue Mix', a: '~60% Starlink, ~40% launch services', b: 'Launch + space systems, moving toward global satcom post-Iridium' },
  { metric: 'Backlog', a: '$30B+', b: '$2.36B across 90+ contracted missions' },
  { metric: 'Public Float / Liquidity', a: 'Limited — recently listed, still building trading history and analyst coverage', b: 'Established — 4+ years of public trading history, broad institutional ownership' },
  { metric: 'Primary Growth Vehicle', a: 'Starship — first operational Starlink V3 mission flew Jul 24, 2026; cadence still ramping', b: 'Neutron — pad delivery targeted Q4 2026; first flight NET late 2026 (slipped from mid-2026)' },
  { metric: 'Pending Corporate Action', a: 'None disclosed', b: 'Definitive agreement to acquire Iridium (IRDM) for ~$8B ($54/share cash-and-stock); expected to close mid-2027' },
  { metric: 'Profitability', a: 'Not disclosed publicly at per-segment level; overall business reported profitable pre-IPO', b: 'Approaching breakeven; Neutron development spend still pressures near-term margins' },
  { metric: 'Key Bull Case', a: 'Starlink recurring revenue + Starship cost curve could make SpaceX the default heavy-lift and broadband provider for a generation', b: 'Neutron success + Iridium integration would transform RKLB from a launch company into a diversified space-systems and satcom operator' },
  { metric: 'Key Bear Case', a: 'Priced for perfection at ~$2T; any Starship setback or Starlink competitive pressure (Kuiper) hits the thesis hard', b: 'Neutron has already slipped once; Iridium deal adds financing and integration risk ahead of a mid-2027 close' },
];

export default async function Page() {
  const figures = await getCompareFigures(['spacex', 'rocket-lab']);
  const spacex = figures['spacex'];
  const rocketLab = figures['rocket-lab'];
  const spacexMarketCap = formatMarketCap(spacex?.marketCapUSD);
  const rocketLabMarketCap = formatMarketCap(rocketLab?.marketCapUSD);

  const comparisonData = COMPARISON_DATA.map((row) => {
    if (row.metric === 'Market Cap (Aug 2026)') {
      return {
        ...row,
        a: spacexMarketCap ? `~${spacexMarketCap}` : row.a,
        b: rocketLabMarketCap ? `~${rocketLabMarketCap}` : row.b,
      };
    }
    return row;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'SPCX vs RKLB Stock' }]} />
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">SPCX vs RKLB Stock</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">SpaceX vs Rocket Lab: As Investments</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        SpaceX (Nasdaq: SPCX) and Rocket Lab (Nasdaq: RKLB) are both publicly traded space companies, but they sit at opposite ends of the risk-and-scale spectrum &mdash; a freshly listed ~$2 trillion giant versus an established, still-scaling small-cap with a transformational acquisition in progress. This is a financial comparison, not a technical one; see our{' '}
        <Link href="/compare/rocket-lab-vs-spacex" className="text-cyan-400 hover:text-cyan-300">vehicle-and-operations comparison</Link>{' '}
        for the launch-vehicle side of the story.
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
            <span className="card-terminal__path">spacenexus:~/compare/stocks</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-left text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-tertiary)' }}>Metric</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>SpaceX (SPCX)</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Rocket Lab (RKLB)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.a}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-2 sm:px-4 pb-3">
          <CompareFiguresFootnote figures={[spacex, rocketLab]} />
        </div>
      </div>

      {/* Scale */}
      <h2 className="text-display text-xl mb-3">Scale: A ~$2 Trillion Giant vs a Scaling Small-Cap</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX went public on Nasdaq on June 12, 2026, pricing at $135/share for a ~$1.78 trillion valuation and closing its debut day around ~$2.1 trillion &mdash; the largest IPO in history. It has held roughly that level since, making it the single largest space-industry equity by an enormous margin. Rocket Lab, by contrast, has traded publicly since its 2021 SPAC merger and sits around a {rocketLabMarketCap ?? '~$17 billion'} market cap as of August 2026 &mdash; still a small-cap next to SpaceX, but up substantially on record quarterly revenue and the Iridium deal announcement.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        That scale gap shapes everything else about the comparison. SpaceX is a mega-cap with a trading history measured in weeks; Rocket Lab is a small-cap with more than four years of quarterly reports, analyst coverage, and price history for investors to underwrite.
      </p>

      {/* Revenue & Growth */}
      <h2 className="text-display text-xl mb-3">Revenue Mix and Growth</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX&apos;s revenue run-rate is estimated above $15 billion annually, split roughly 60% Starlink subscription revenue and 40% launch services. That mix is what separates SpaceX from a pure launch company &mdash; Starlink is recurring, high-margin, and growing independent of launch cadence. The company also carries a launch and Starlink backlog north of $30 billion.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Rocket Lab posted record Q2 2026 revenue of $234 million, up 62% year-over-year, against a launch-and-space-systems backlog of $2.36 billion across more than 90 contracted missions. Growth is real and accelerating, but the company is still investing heavily in Neutron and is not yet consistently profitable &mdash; the opposite financial profile of SpaceX&apos;s reported pre-IPO profitability.
      </p>

      {/* Catalysts */}
      <h2 className="text-display text-xl mb-3">The Next 12 Months: Starship, Neutron, and Iridium</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        SpaceX&apos;s near-term catalyst is Starship&apos;s transition to routine operations &mdash; the vehicle flew its first operational payload mission, deploying Starlink V3 satellites, on Flight 13 (July 24, 2026), with cadence still ramping as tower-catch reliability improves. If Starship&apos;s launch cadence and reuse economics keep improving, it reinforces the bull case behind the ~$2T valuation. The risk is the flip side: any high-profile Starship setback, or faster-than-expected Kuiper/OneWeb competitive inroads against Starlink, would hit a stock priced for continued dominance.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Rocket Lab has two major catalysts running in parallel. Neutron &mdash; its medium-lift, partially reusable rocket &mdash; is targeting pad delivery in Q4 2026 with more than 400 Archimedes engine hot-fires completed, but first flight has already slipped from a mid-2026 target to no earlier than late 2026. Separately, Rocket Lab has a definitive agreement to acquire satellite operator Iridium Communications (Nasdaq: IRDM) for roughly $8 billion in cash and stock ($54/share), expected to close mid-2027. If both land, Rocket Lab becomes a fundamentally different company &mdash; launch provider, space-systems manufacturer, and global satcom operator in one. If either slips further or falls through, the stock likely gives back some of its 2026 re-rating.
      </p>

      {/* How to think about it */}
      <h2 className="text-display text-xl mb-3">How the Two Stocks Fit Different Portfolios</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        SPCX and RKLB aren&apos;t really substitutes for each other. SpaceX is a mega-cap bet on the entire space economy consolidating around one vertically integrated operator, priced accordingly. Rocket Lab is a smaller, higher-beta bet on execution risk paying off twice over &mdash; Neutron reaching orbit and the Iridium acquisition closing on schedule. Investors weighing space-sector exposure should treat this as a barbell, not a coin flip: SPCX for scale and Starlink&apos;s recurring-revenue moat, RKLB for a more leveraged, binary-catalyst play on the next 12-18 months.
      </p>

      {/* Disclaimer */}
      <div className="rounded-lg p-4 mb-8 text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        This page is for informational purposes only and is not investment advice. Prices, market caps, and deal terms are approximate and change frequently &mdash; verify current figures on the{' '}
        <Link href="/space-stocks" className="text-cyan-400 hover:text-cyan-300">Space Stocks hub</Link>{' '}before making any decisions.
      </div>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center mb-8" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track live SPCX and RKLB prices alongside every other public space stock</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/space-stocks" className="btn-primary text-sm">Open Space Stocks Hub</Link>
          <Link href="/startups" className="btn-secondary text-sm">IPO Watch on Startups Hub</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Rocket Lab vs SpaceX (Vehicles & Ops)', href: '/compare/rocket-lab-vs-spacex' },
            { title: 'Starship vs New Glenn', href: '/compare/starship-vs-new-glenn' },
            { title: 'Rocket Lab vs Astra Space', href: '/compare/rocket-lab-vs-astra' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4 hover:border-indigo-500/20">{c.title} &rarr;</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'SpaceX vs Rocket Lab Stock: SPCX vs RKLB as Investments 2026',
        description: 'SpaceX (SPCX) vs Rocket Lab (RKLB) as investments — market cap, revenue growth, backlog, the pending Iridium acquisition, and Neutron\'s path to first flight.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-08-14', dateModified: '2026-08-14',
        url: 'https://spacenexus.us/compare/spcx-vs-rklb-stock',
      }).replace(/</g, '\\u003c') }} />

      <RelatedModules modules={PAGE_RELATIONS['compare/spcx-vs-rklb-stock']} />
    </div>
  );
}
