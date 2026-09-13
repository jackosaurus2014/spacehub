// SpaceNexus AM — data layer (2026-09-12). Everything that touches the DB
// or a cached derivation lives here so the ranking, gates, and renderer stay
// pure. Owned data only: NewsArticle rows the 5-minute news cron already
// stored, the launch calendar, the cadence/slip indexes, quotes the stock
// sync already wrote, and the jobs board count. No external fetches at
// compose time.

import prisma from '@/lib/db';
import { isSpaceRelevant, RELEVANCE_GUARD_FEEDS } from '@/lib/news-fetcher';
import { getLaunchCalendar, launchDisplayName } from '@/lib/launch-calendar';
import { getLaunchCadence } from '@/lib/launch-cadence';
import { getSlipData, PROVIDER_STATS_THRESHOLD } from '@/lib/launch-slips';
import { getHiringIndex, latestEditionMonthKey, parseMonthParam } from '@/lib/hiring-index';
import type { PoolArticle } from './select';
import { storyWindowHours } from './select';
import type { MorningBriefNextLaunch, MorningBriefNumber } from './types';
import type { RouteCandidate } from './routes';
import { staticRouteCandidates } from './routes';

const POOL_LIMIT = 80;

/**
 * NewsArticle rows inside the issue window that pass the space-relevance
 * guard. The guard is applied at ingest for the non-dedicated feeds
 * (RELEVANCE_GUARD_FEEDS); re-applying it here to those same feeds is a
 * belt-and-braces check that costs nothing, and space-dedicated feeds are
 * presumed on-topic exactly as at ingest.
 */
export async function collectStoryPool(now: Date, windowHours: number = storyWindowHours(now)): Promise<PoolArticle[]> {
  const since = new Date(now.getTime() - windowHours * 3_600_000);
  const rows = await prisma.newsArticle.findMany({
    where: { publishedAt: { gte: since, lte: now } },
    orderBy: { publishedAt: 'desc' },
    take: POOL_LIMIT,
    select: {
      id: true, title: true, summary: true, url: true, source: true, category: true, publishedAt: true,
      companyTags: { select: { slug: true } },
    },
  });
  return rows
    .filter((r) => !RELEVANCE_GUARD_FEEDS.has(r.source) || isSpaceRelevant(r.title, r.summary ?? '', r.source))
    .map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      url: r.url,
      source: r.source,
      category: r.category,
      publishedAt: r.publishedAt,
      companySlugs: r.companyTags.map((c) => c.slug),
    }));
}

/**
 * Route candidates for this issue: the static registries plus the profile
 * pages of every company tagged on a pool article (verified to exist).
 */
export async function candidateInternalRoutes(pool: PoolArticle[]): Promise<RouteCandidate[]> {
  const candidates = staticRouteCandidates();
  const slugs = Array.from(new Set(pool.flatMap((a) => a.companySlugs ?? [])));
  if (slugs.length === 0) return candidates;
  const companies = await prisma.companyProfile.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, sector: true },
  });
  for (const c of companies) {
    candidates.push({ href: `/company-profiles/${c.slug}`, label: c.name, hint: `company profile${c.sector ? ` (${c.sector})` : ''}` });
  }
  return candidates;
}

/** The next scheduled launch — same universe as the launch calendar page. */
export async function getNextLaunch(now: Date): Promise<MorningBriefNextLaunch | null> {
  // Prefer a direct query so a coarse "NET December" placeholder never beats
  // a dated launch tomorrow: status must still be scheduled (LL2 go/tbc/tbd
  // as well as 'upcoming' — 'upcoming' alone is the empty-section trap).
  const row = await prisma.spaceEvent.findFirst({
    where: {
      rocket: { not: null },
      status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
      launchDate: { gte: now },
    },
    orderBy: { launchDate: 'asc' },
    select: { id: true, name: true, mission: true, rocket: true, location: true, agency: true, launchDate: true, launchDatePrecision: true },
  });
  if (row?.launchDate) {
    return {
      id: row.id,
      name: launchDisplayName(row.name, row.rocket),
      rocket: row.rocket,
      mission: row.mission,
      site: row.location,
      agency: row.agency,
      netUtc: row.launchDate.toISOString(),
      precision: row.launchDatePrecision,
      href: `/launch/${row.id}`,
    };
  }
  // Fallback to the cached calendar (covers a transient query miss).
  const cal = await getLaunchCalendar();
  const nl = cal?.nextLaunch;
  if (!nl) return null;
  return {
    id: nl.id, name: launchDisplayName(nl.name, nl.rocket), rocket: nl.rocket, mission: nl.mission, site: nl.location,
    agency: nl.agency, netUtc: nl.launchDate, precision: null, href: `/launch/${nl.id}`,
  };
}

const ROTATION: MorningBriefNumber['kind'][] = ['cadence', 'stock', 'jobs', 'slips', 'hiring'];

/** Day-of-year based rotation so the same slot does not lead two days running. */
export function rotationStart(now: Date): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86_400_000);
  return dayOfYear % ROTATION.length;
}

async function numberCadence(now: Date): Promise<MorningBriefNumber | null> {
  const c = await getLaunchCadence();
  if (!c || c.thisYearToDate === 0) return null;
  const delta = c.paceDeltaPct == null ? '' : ` (${c.paceDeltaPct >= 0 ? '+' : ''}${c.paceDeltaPct}% vs the same point of ${c.year - 1})`;
  return {
    kind: 'cadence',
    label: 'Launch Cadence Index',
    value: `${c.thisYearToDate} launches`,
    context: `Orbital launch attempts worldwide in ${c.year} to date, against ${c.lastYearToDate} by this day last year${delta}.`,
    source: 'SpaceNexus Launch Cadence Index (LL2-sourced SpaceEvent history)',
    asOf: c.asOf,
    href: '/launch-cadence',
    notInvestmentAdvice: false,
  };
}

async function numberSlips(now: Date): Promise<MorningBriefNumber | null> {
  const s = await getSlipData();
  if (!s || s.totalChanges < PROVIDER_STATS_THRESHOLD || s.biggestRecentSlipDays == null) return null;
  const top = s.providers[0];
  const provider = top ? ` ${top.provider} leads the ledger with ${top.changes} moves averaging ${top.avgSlipDays} days.` : '';
  return {
    kind: 'slips',
    label: 'Slip Explorer',
    value: `${s.totalChanges} date moves`,
    context: `Manifest date changes recorded across ${s.launchesTracked} launches since ${new Date(s.asOf).getUTCFullYear()} recording began; the biggest recent slip was ${s.biggestRecentSlipDays} days.${provider}`,
    source: 'SpaceNexus Slip Explorer (LaunchDateChange ledger)',
    asOf: s.asOf,
    href: '/launch-slips',
    notInvestmentAdvice: false,
  };
}

async function numberStock(now: Date): Promise<MorningBriefNumber | null> {
  // Quotes are refreshed by the stock-sync cron; a stale quote (older than
  // ~3 days, e.g. after a long weekend) is not "fresh data" for this slot.
  const companies = await prisma.companyProfile.findMany({
    where: { ticker: { not: null }, NOT: { status: 'defunct' }, priceChange24h: { not: null }, updatedAt: { gte: new Date(now.getTime() - 3 * 86_400_000) } },
    select: { name: true, ticker: true, slug: true, stockPrice: true, priceChange24h: true, updatedAt: true },
  });
  const movers = companies.filter((c): c is typeof c & { priceChange24h: number } => typeof c.priceChange24h === 'number' && Number.isFinite(c.priceChange24h) && c.priceChange24h !== 0);
  if (movers.length === 0) return null;
  const m = movers.reduce((best, c) => (Math.abs(c.priceChange24h) > Math.abs(best.priceChange24h) ? c : best));
  const pct = `${m.priceChange24h > 0 ? '+' : ''}${m.priceChange24h.toFixed(1)}%`;
  return {
    kind: 'stock',
    label: `${m.name} (${m.ticker})`,
    value: `${m.ticker} ${pct}`,
    context: `${m.name} was the biggest mover among tracked space stocks in the last session${typeof m.stockPrice === 'number' ? `, closing near $${m.stockPrice.toFixed(2)}` : ''}.`,
    source: 'SpaceNexus space-stocks quote sync',
    asOf: m.updatedAt.toISOString(),
    href: `/company-profiles/${m.slug}`,
    notInvestmentAdvice: true,
  };
}

async function numberJobs(now: Date): Promise<MorningBriefNumber | null> {
  const [active, newWeek] = await Promise.all([
    prisma.spaceJobPosting.count({ where: { isActive: true } }),
    prisma.spaceJobPosting.count({ where: { isActive: true, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
  ]);
  if (active === 0) return null;
  return {
    kind: 'jobs',
    label: 'Jobs board',
    value: `${active.toLocaleString('en-US')} open roles`,
    context: `Live listings on the SpaceNexus jobs board this morning, ${newWeek.toLocaleString('en-US')} of them posted in the last seven days.`,
    source: 'SpaceNexus jobs board (ATS sync)',
    asOf: now.toISOString(),
    href: '/jobs',
    notInvestmentAdvice: false,
  };
}

async function numberHiring(now: Date): Promise<MorningBriefNumber | null> {
  const key = latestEditionMonthKey(now);
  const parsed = parseMonthParam(key);
  if (!parsed) return null;
  const idx = await getHiringIndex(parsed.year, parsed.month);
  if (!idx || idx.newPostings.total === 0) return null;
  const mom = idx.momChange == null ? '' : ` Active postings at month end moved ${idx.momChange >= 0 ? '+' : ''}${idx.momChange.toLocaleString('en-US')} month over month.`;
  return {
    kind: 'hiring',
    label: `Hiring Index, ${idx.monthLabel}`,
    value: `${idx.newPostings.total.toLocaleString('en-US')} new postings`,
    context: `New space-industry job postings counted in the ${idx.monthLabel} Hiring Index edition.${mom}`,
    source: 'SpaceNexus Hiring Index',
    asOf: idx.activeAtMonthEndDate ?? idx.generatedAt,
    href: `/hiring-index/${key}`,
    notInvestmentAdvice: false,
  };
}

/**
 * "One number": rotate daily through the five slots, taking the first with
 * fresh data. Each producer fails soft to null (a stale or missing feed
 * simply yields to the next slot).
 */
export async function pickOneNumber(now: Date): Promise<MorningBriefNumber | null> {
  const producers: Record<MorningBriefNumber['kind'], (n: Date) => Promise<MorningBriefNumber | null>> = {
    cadence: numberCadence, slips: numberSlips, stock: numberStock, jobs: numberJobs, hiring: numberHiring,
  };
  const start = rotationStart(now);
  for (let i = 0; i < ROTATION.length; i++) {
    const kind = ROTATION[(start + i) % ROTATION.length];
    try {
      const n = await producers[kind](now);
      if (n) return n;
    } catch {
      // fail soft — next slot
    }
  }
  return null;
}
