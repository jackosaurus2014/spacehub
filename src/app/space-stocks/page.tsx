import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { RECENT_IPOS } from '@/lib/startup-hub-data';
import { SITE_STATS } from '@/lib/site-stats';
import { logger } from '@/lib/logger';
import SpaceStocksTables, { type StockRow, type IpoRow } from './SpaceStocksTables';

// Live roster pulled from CompanyProfile on every request (revalidated hourly) —
// new IPOs and ticker updates show up without a code deploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Space Stocks — Live Prices for Every Public Space Company',
  description:
    'Live stock prices for every publicly traded space company: SpaceX (SPCX), Rocket Lab (RKLB), Firefly Aerospace (FLY), Voyager Technologies (VOYG), HawkEye 360 (HAWK), York Space Systems (YSS), Lockheed Martin, Boeing, and more — organized by IPO class, pure-play, primes & defense, and satellite operators.',
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
  try {
    [roster, ipoClass] = await Promise.all([getRoster(), getIpoClass()]);
  } catch (error) {
    logger.error('space-stocks: failed to load CompanyProfile roster', {
      error: error instanceof Error ? error.message : String(error),
    });
    roster = { pureplay: [], primes: [], satelliteEO: [], allCount: 0 };
    ipoClass = [];
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
                SpaceX (NASDAQ: SPCX) went public in June 2026 at a ~$2T market cap — the largest IPO in history — kicking off a wave of new space listings. This hub tracks every one of them, live.
              </p>
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              <Link href="/startups" className="text-xs text-amber-400 hover:text-amber-300 font-medium">IPO Watch on Startups Hub →</Link>
              <Link href="/market-intel" className="text-xs text-slate-400 hover:text-white font-medium">Full Market Intel →</Link>
            </div>
          </div>
        </div>

        <SpaceStocksTables
          ipoClass={ipoClass}
          pureplay={roster.pureplay}
          primes={roster.primes}
          satelliteEO={roster.satelliteEO}
        />

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
