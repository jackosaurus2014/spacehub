import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import IndustryTicker from '@/components/ui/IndustryTicker';
import { getPriceHistoriesCached } from '@/lib/stock-quote';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import DataAsOf from '@/components/ui/DataAsOf';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { RECENT_IPOS } from '@/lib/startup-hub-data';
import { SITE_STATS } from '@/lib/site-stats';
import { logger } from '@/lib/logger';
import SpaceStocksTables, { type StockRow, type IpoRow } from './SpaceStocksTables';

// Curated industry cost/spend benchmarks — salvaged from the retired /market-intel
// and /industry-trends pages during the 2026-08 market-intel merge. Hand-maintained,
// not DB-driven; refresh alongside quarterly editorial passes.
const INDUSTRY_BENCHMARKS: { label: string; value: string; note: string }[] = [
  { label: 'Falcon 9 cost/kg (2025)', value: '~$2,700', note: 'Reuse-driven launch economics, current baseline' },
  { label: 'Starship target cost/kg', value: '<$100', note: 'SpaceX long-term target for full reusability' },
  { label: 'US Space Force budget (FY26)', value: '$30B+', note: 'FY2026 budget request, national security space' },
  { label: 'NASA CLD program funding', value: '$415M', note: 'Commercial LEO Destinations, across 4 providers' },
  { label: 'ADR market forecast (2030)', value: '$3.5B', note: 'Active debris removal & sustainability services' },
];

// Live roster pulled from CompanyProfile on every request (revalidated hourly) —
// new IPOs and ticker updates show up without a code deploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Space Stocks — Live Prices for Every Public Space Company',
  description:
    'Live quotes and fundamentals for every public space company — pure-play launch and satellite names, primes and defense, satellite operators — plus the post-IPO watchlist.',
  keywords: [
    'space stocks',
    'SPCX stock',
    'space companies to invest in',
    'SpaceX stock price',
    'RKLB stock',
    'space stock market',
    'satellite stocks',
    'aerospace stocks',
    'space IPO 2026',
    'how to invest in space companies',
  ],
  openGraph: {
    title: 'Space Stocks — Live Prices for Every Public Space Company | SpaceNexus',
    description:
      'Live prices for every publicly traded space company, organized by IPO class, pure-play launch/satellite names, primes & defense, and satellite operators.',
    url: 'https://spacenexus.us/space-stocks',
    type: 'website',
    images: [{
      url: '/api/og?title=Space+Stocks&subtitle=Live+prices+for+every+public+space+company&type=market',
      width: 1200,
      height: 630,
      alt: 'Space Stocks — SpaceNexus',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Stocks — Live Prices for Every Public Space Company | SpaceNexus',
    description: 'Live prices for every publicly traded space company — SPCX, RKLB, FLY, VOYG, HAWK, YSS, and the primes.',
    images: ['/api/og?title=Space+Stocks&subtitle=Live+prices+for+every+public+space+company&type=market'],
  },
  alternates: { canonical: 'https://spacenexus.us/space-stocks' },
};

// ─────────────────────────────────────────────────────────────────────────
// Sector classification — bucket the DB-driven roster into the page's four
// display sections. Additive heuristic (sector first, then tags); no
// per-company hardcoding, so newly-added CompanyProfile rows fall into the
// right bucket automatically.
// ─────────────────────────────────────────────────────────────────────────

const EO_SECTORS = new Set(['earth-observation', 'satellite-operator', 'ground-segment', 'data-analytics']);
const EO_TAGS = new Set([
  'earth-observation', 'satellite-operator', 'geospatial', 'geoint', 'rf-geolocation',
  'remote-sensing', 'multispectral', 'hyperspectral', 'sar', 'vsat', 'broadband',
  'satcom', 'satellite-communications', 'mobile-satellite-services', 'iot',
]);

type Bucket = 'primes' | 'eo' | 'pureplay';

function classifySection(sector: string | null, tags: string[]): Bucket {
  const s = (sector || '').toLowerCase();
  if (s.startsWith('defense')) return 'primes';
  if (EO_SECTORS.has(s)) return 'eo';
  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.some((t) => EO_TAGS.has(t))) return 'eo';
  return 'pureplay';
}

function formatUSD(n: number | null | undefined): string | null {
  if (n === null || n === undefined || !isFinite(n) || n <= 0) return null;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

async function getRoster() {
  // Companies with a ticker are treated as the tradeable roster. Note: several
  // CompanyProfile rows for well-known primes (Lockheed Martin/LMT, Boeing/BA,
  // Northrop Grumman/NOC, L3Harris/LHX, Planet Labs/PL, Spire/SPIR, Iridium/IRDM)
  // carry isPublic:false despite having a live ticker + market cap populated —
  // an apparent data-entry gap from the CompanyProfile merge/seed pipeline.
  // Filtering on ticker presence (rather than the isPublic flag) is what keeps
  // those names on this page; flagged for a follow-up data fix.
  const rows = await prisma.companyProfile.findMany({
    where: {
      ticker: { not: null },
      NOT: { status: 'defunct' },
    },
    select: {
      slug: true, name: true, ticker: true, exchange: true,
      marketCap: true, sector: true, tags: true,
    },
    orderBy: [{ marketCap: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
  });

  const pureplay: StockRow[] = [];
  const primes: StockRow[] = [];
  const satelliteEO: StockRow[] = [];

  for (const r of rows) {
    const row: StockRow = {
      slug: r.slug,
      name: r.name,
      ticker: r.ticker as string,
      exchange: r.exchange,
      dbMarketCap: r.marketCap,
      sector: r.sector,
    };
    const bucket = classifySection(r.sector, r.tags || []);
    if (bucket === 'primes') primes.push(row);
    else if (bucket === 'eo') satelliteEO.push(row);
    else pureplay.push(row);
  }

  return { pureplay, primes, satelliteEO, allCount: rows.length };
}

async function getIpoClass(): Promise<IpoRow[]> {
  // "IPO Class" = CompanyProfile rows whose last funding round is explicitly
  // recorded as an IPO within roughly the last 20 months. This is what makes
  // the section self-updating: the next space IPO shows up here as soon as
  // it's logged in the DB, no hardcoded ticker list required.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 20);

  const rows = await prisma.companyProfile.findMany({
    where: {
      lastFundingRound: 'IPO',
      ticker: { not: null },
      lastFundingDate: { gte: cutoff },
    },
    select: {
      slug: true, name: true, ticker: true, exchange: true,
      marketCap: true, sector: true, lastFundingDate: true, totalFunding: true,
    },
    orderBy: { lastFundingDate: 'desc' },
  });

  const byTicker = new Map(RECENT_IPOS.map((ipo) => [ipo.ticker, ipo]));

  return rows.map((r) => {
    const curated = byTicker.get(r.ticker as string);
    return {
      slug: r.slug,
      name: r.name,
      ticker: r.ticker as string,
      exchange: curated?.exchange ?? r.exchange,
      dbMarketCap: r.marketCap,
      sector: r.sector,
      ipoDate: curated?.ipoDate ?? r.lastFundingDate?.toISOString() ?? null,
      raised: curated?.raised ?? formatUSD(r.totalFunding),
      notes: curated?.notes ?? null,
      sourceUrl: curated?.sourceUrl ?? null,
    };
  });
}

export default async function SpaceStocksPage() {
  let roster: Awaited<ReturnType<typeof getRoster>>;
  let ipoClass: IpoRow[];
  let rosterFailed = false;
  try {
    // One retry: a cold pool or a transient timeout must not blank the flagship
    // markets page (seen once on 2026-08-30 right after a deploy).
    try {
      [roster, ipoClass] = await Promise.all([getRoster(), getIpoClass()]);
    } catch (firstError) {
      logger.warn('space-stocks: roster load failed once, retrying', { error: firstError instanceof Error ? firstError.message : String(firstError) });
      await new Promise((r) => setTimeout(r, 400));
      [roster, ipoClass] = await Promise.all([getRoster(), getIpoClass()]);
    }
  } catch (error) {
    logger.error('space-stocks: failed to load CompanyProfile roster', {
      error: error instanceof Error ? error.message : String(error),
    });
    roster = { pureplay: [], primes: [], satelliteEO: [], allCount: 0 };
    ipoClass = [];
    rosterFailed = true;
  }
  // Stale beats blank; blank beats invented — but never blank *silently*.
  if (!rosterFailed && roster.allCount === 0) {
    rosterFailed = true;
    logger.error('space-stocks: roster query returned zero public companies', {});
  }

  // 90-day sparklines (SYNTHESIS.md item 31): one cached chart call per ticker.
  try {
    const tickers = Array.from(new Set([...roster.pureplay, ...roster.primes, ...roster.satelliteEO, ...ipoClass].map((r) => r.ticker.toUpperCase())));
    const histories = await getPriceHistoriesCached(tickers);
    const attach = <T extends { ticker: string; history?: number[] | null }>(rows: T[]) => rows.forEach((r) => { r.history = histories[r.ticker.toUpperCase()]?.closes ?? null; });
    attach(roster.pureplay); attach(roster.primes); attach(roster.satelliteEO); attach(ipoClass);
  } catch (error) {
    logger.warn('space-stocks: price histories unavailable', { error: error instanceof Error ? error.message : String(error) });
  }

  const totalPublic = roster.allCount;

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Publicly Traded Space Companies',
    description: 'Every publicly traded space, satellite, launch, and aerospace-defense company tracked by SpaceNexus.',
    numberOfItems: totalPublic,
    itemListElement: [...ipoClass, ...roster.pureplay, ...roster.primes, ...roster.satelliteEO]
      .filter((row, idx, arr) => arr.findIndex((r) => r.slug === row.slug) === idx)
      .slice(0, 100)
      .map((row, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${row.name} (${row.ticker})`,
        url: `https://spacenexus.us/company-profiles/${row.slug}`,
      })),
  };

  return (
    <div className="min-h-screen">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Space Stocks' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/</g, '\\u003c') }}
      />

      <div className="container mx-auto px-4 pt-6">
        {/* The ticker left global chrome (worst reduced-motion offender on every
            page) and lives on the markets surfaces where it earns its pixels. */}
        <IndustryTicker />
        <AnimatedPageHeader
          title="Space Stocks"
          subtitle="Live prices for every publicly traded space company — from the newest IPOs to the legacy primes."
          accentColor="amber"
          breadcrumb="Dashboard → Space Stocks"
        />
      </div>

      <div className="container mx-auto px-4">
        {/* SpaceX-scale framing banner */}
        <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 p-5 sm:p-6 mb-8">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-lg font-bold">$</span>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">Post-IPO Wave</span>
                <h2 className="text-lg font-bold font-display text-white">{totalPublic} public space companies, live</h2>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300">
                SpaceX (NASDAQ: SPCX) went public in June 2026 at a market capitalization near $1.8–1.9T (see its profile for the live figure) — the largest IPO in history — kicking off a wave of new space listings. This hub tracks every one of them, live.
              </p>
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              <Link href="/startups" className="text-xs text-amber-400 hover:text-amber-300 font-medium">IPO Watch on Startups Hub →</Link>
              <Link href="/industry-trends" className="text-xs text-slate-400 hover:text-white font-medium">Full Industry Trends →</Link>
            </div>
          </div>
        </div>

        {rosterFailed && (
          <div role="status" className="card p-5 mb-6 border border-amber-500/30 bg-amber-500/5">
            <div className="text-sm font-semibold text-amber-300">Company roster temporarily unavailable</div>
            <p className="text-xs text-slate-400 mt-1">The public-company database did not answer. This is a data outage on our side, not an empty market — the tables below are blank until it recovers (usually minutes). Live quotes still work on <Link href="/company-profiles" className="text-cyan-400 hover:text-cyan-300">company profiles</Link>.</p>
          </div>
        )}
        <SpaceStocksTables
          ipoClass={ipoClass}
          pureplay={roster.pureplay}
          primes={roster.primes}
          satelliteEO={roster.satelliteEO}
        />

        {/* Industry Benchmarks — curated cost/spend reference points, salvaged from /market-intel merge */}
        <div className="card p-6 mb-10">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h3 className="text-white font-semibold">Industry Benchmarks</h3>
            <Link href="/industry-trends" className="text-xs text-cyan-400 hover:text-cyan-300">
              Full Industry Trends →
            </Link>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Reference cost, budget, and market-size figures cited across SpaceNexus coverage. Curated by the editorial team, not live-market data.
          </p>
          <DataAsOf date="Q3 2026" note="curated editorial benchmarks; refreshed quarterly" className="mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {INDUSTRY_BENCHMARKS.map((b) => (
              <div key={b.label} className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                <div className="text-lg font-bold text-amber-400">{b.value}</div>
                <div className="text-xs text-white mt-1">{b.label}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{b.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compare tools */}
        <div className="card p-6 mb-10">
          <h3 className="text-white font-semibold mb-3">Head-to-Head Comparisons</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/compare/spcx-vs-rklb-stock" className="card-content p-4 hover:border-amber-500/30 transition-colors">
              <div className="text-white font-medium text-sm mb-1">SpaceX vs Rocket Lab — as investments</div>
              <div className="text-xs text-slate-400">Scale, revenue mix, valuation, growth profile</div>
            </Link>
            <Link href="/compare/starship-vs-new-glenn" className="card-content p-4 hover:border-amber-500/30 transition-colors">
              <div className="text-white font-medium text-sm mb-1">Starship vs New Glenn</div>
              <div className="text-xs text-slate-400">Payload class, reuse approach, flight cadence</div>
            </Link>
          </div>
        </div>

        {/* Data notes / disclaimer */}
        <div className="card p-6 mb-10 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">About This Data</h3>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Quotes are sourced from Yahoo Finance and may be delayed up to 15-20 minutes; prices and market caps are approximate
            and provided for informational purposes only. This is not investment advice — verify prices with your broker before
            trading. The publicly-traded company roster and classifications are pulled live from SpaceNexus&apos;s{' '}
            <Link href="/company-profiles" className="text-cyan-400 hover:text-cyan-300">Company Intelligence database</Link>{' '}
            ({SITE_STATS.companies} companies tracked) and updates automatically as new companies go public.
          </p>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['space-stocks']} />
      </div>
    </div>
  );
}
