import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { TOTAL_SENTINEL, PRIVATE_TOTAL_SENTINEL } from '@/lib/hiring-snapshots';

// G2 (growth plan): the SpaceNexus Monthly Hiring Index — a citable monthly
// data release built from the same daily CompanyJobSnapshot history that
// powers /hiring-trends, plus the live SpaceJobPosting table. First edition:
// August 2026 (snapshots began 2026-08-13, so that edition's within-month
// movers cover Aug 13–31 — the methodology block on the page says so).

const SENTINELS = [TOTAL_SENTINEL, PRIVATE_TOTAL_SENTINEL];

/** First calendar month with any snapshot history. Months before this return null. */
export const EARLIEST_INDEX_MONTH = '2026-08';

export interface HiringIndexCount {
  key: string; // raw category / seniority value, e.g. 'engineering', 'c_suite'
  count: number;
}

export interface HiringIndexCompanyRow {
  companyName: string;
  slug: string | null;
  activeJobs: number;
  snapshotDate: string; // YYYY-MM-DD of the last snapshot in the month
}

export interface HiringIndexMover {
  companyName: string;
  slug: string | null;
  first: number;
  last: number;
  change: number;
  percentChange: number | null; // null when first === 0 (guards div-by-zero)
  firstDate: string; // YYYY-MM-DD
  lastDate: string; // YYYY-MM-DD
}

export interface HiringIndex {
  month: string; // 'YYYY-MM'
  monthLabel: string; // 'August 2026'
  /** Site-wide active postings per the last _TOTAL snapshot on/before month end; null if none in range. */
  activeAtMonthEnd: number | null;
  activeAtMonthEndDate: string | null; // date of that snapshot
  /** Live count of active postings right now — fallback when no snapshot exists yet. */
  activeNow: number | null;
  /** Prior month's month-end total (null when the prior month predates history). */
  priorActiveAtMonthEnd: number | null;
  /** Month-over-month change in month-end totals; null when no prior edition exists. */
  momChange: number | null;
  newPostings: {
    total: number;
    byCategory: HiringIndexCount[]; // sorted by count desc
    bySeniority: HiringIndexCount[]; // sorted by count desc
  };
  /** Top 10 companies by active jobs at their last snapshot within the month. */
  topCompanies: HiringIndexCompanyRow[];
  /** First-vs-last snapshot within the month, companies with >= 5 current jobs. */
  movers: {
    gainers: HiringIndexMover[];
    decliners: HiringIndexMover[];
  };
  remoteShare: {
    remote: number;
    total: number;
    percent: number | null; // null when total is 0
  };
  topLocations: { location: string; count: number }[]; // top 8, remote excluded
  generatedAt: string; // ISO timestamp
}

/** 'YYYY-MM' for a (year, 1-12 month) pair. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Current UTC month as 'YYYY-MM'. */
export function currentMonthKey(now: Date = new Date()): string {
  return monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

/**
 * The month the /hiring-index root should redirect to: the most recently
 * completed UTC month, clamped so it is never earlier than the first edition.
 * (During August 2026 itself, this is August 2026.)
 */
export function latestEditionMonthKey(now: Date = new Date()): string {
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prev = monthKey(prevMonthStart.getUTCFullYear(), prevMonthStart.getUTCMonth() + 1);
  return prev < EARLIEST_INDEX_MONTH ? EARLIEST_INDEX_MONTH : prev;
}

/**
 * Strictly parse a 'YYYY-MM' route param. Returns null on anything malformed
 * (bad shape, month outside 01-12, absurd year).
 */
export function parseMonthParam(param: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(param);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  if (year < 2000 || year > 2100) return null;
  return { year, month };
}

export function monthLabelOf(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Collapse a raw posting location string to a displayable "City, Region" key.
 * Returns null for empty or remote-only strings (remote share is reported
 * separately — mixing it into the location table would double-count it).
 */
export function normalizeLocation(raw: string | null | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower.includes('remote') || lower === 'anywhere' || lower === 'various' || lower === 'multiple locations') {
    return null;
  }
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0] : `${parts[0]}, ${parts[1]}`;
}

async function computeHiringIndex(year: number, month: number): Promise<HiringIndex> {
  // UTC month window: [monthStart, nextMonthStart)
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));

  const [
    lastTotalSnapshot,
    activeNow,
    newPostingsTotal,
    categoryGroups,
    seniorityGroups,
    monthSnapshots,
    remoteCount,
    activeTotal,
    locationGroups,
  ] = await Promise.all([
    prisma.companyJobSnapshot.findFirst({
      where: { companyName: TOTAL_SENTINEL, date: { lt: nextMonthStart } },
      orderBy: { date: 'desc' },
      select: { date: true, activeJobs: true },
    }),
    prisma.spaceJobPosting.count({ where: { isActive: true } }),
    prisma.spaceJobPosting.count({
      where: { postedDate: { gte: monthStart, lt: nextMonthStart } },
    }),
    prisma.spaceJobPosting.groupBy({
      by: ['category'],
      where: { postedDate: { gte: monthStart, lt: nextMonthStart } },
      _count: { _all: true },
    }),
    prisma.spaceJobPosting.groupBy({
      by: ['seniorityLevel'],
      where: { postedDate: { gte: monthStart, lt: nextMonthStart } },
      _count: { _all: true },
    }),
    prisma.companyJobSnapshot.findMany({
      where: {
        date: { gte: monthStart, lt: nextMonthStart },
        companyName: { notIn: SENTINELS },
      },
      orderBy: { date: 'asc' },
      select: { companyName: true, companyProfileId: true, activeJobs: true, date: true },
    }),
    prisma.spaceJobPosting.count({ where: { isActive: true, remoteOk: true } }),
    prisma.spaceJobPosting.count({ where: { isActive: true } }),
    prisma.spaceJobPosting.groupBy({
      by: ['location'],
      where: { isActive: true },
      _count: { _all: true },
    }),
  ]);

  // Prior month's month-end total — only when the prior month is within history,
  // so the first edition honestly reports "no prior edition" instead of a
  // delta against nothing.
  const priorMonthStart = new Date(Date.UTC(year, month - 2, 1));
  const priorKey = monthKey(priorMonthStart.getUTCFullYear(), priorMonthStart.getUTCMonth() + 1);
  let priorActiveAtMonthEnd: number | null = null;
  if (priorKey >= EARLIEST_INDEX_MONTH) {
    const priorSnapshot = await prisma.companyJobSnapshot.findFirst({
      where: { companyName: TOTAL_SENTINEL, date: { lt: monthStart } },
      orderBy: { date: 'desc' },
      select: { activeJobs: true },
    });
    priorActiveAtMonthEnd = priorSnapshot?.activeJobs ?? null;
  }

  // First and last snapshot per company within the month (rows arrive date asc).
  interface Span {
    companyProfileId: string | null;
    first: number;
    firstDate: Date;
    last: number;
    lastDate: Date;
  }
  const spans = new Map<string, Span>();
  for (const row of monthSnapshots) {
    const span = spans.get(row.companyName);
    if (!span) {
      spans.set(row.companyName, {
        companyProfileId: row.companyProfileId,
        first: row.activeJobs,
        firstDate: row.date,
        last: row.activeJobs,
        lastDate: row.date,
      });
    } else {
      span.last = row.activeJobs;
      span.lastDate = row.date;
      if (!span.companyProfileId && row.companyProfileId) span.companyProfileId = row.companyProfileId;
    }
  }

  // Resolve slugs once for every company that can appear on the page.
  const profileIds = Array.from(spans.values())
    .map((s) => s.companyProfileId)
    .filter((id): id is string => !!id);
  const slugRows = profileIds.length
    ? await prisma.companyProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, slug: true },
      })
    : [];
  const slugOf = new Map(slugRows.map((r) => [r.id, r.slug]));
  const slugFor = (companyProfileId: string | null): string | null =>
    companyProfileId ? slugOf.get(companyProfileId) ?? null : null;

  const topCompanies: HiringIndexCompanyRow[] = Array.from(spans.entries())
    .map(([companyName, s]) => ({
      companyName,
      slug: slugFor(s.companyProfileId),
      activeJobs: s.last,
      snapshotDate: toDateKey(s.lastDate),
    }))
    .sort((a, b) => b.activeJobs - a.activeJobs)
    .slice(0, 10);

  const moverEntries: HiringIndexMover[] = Array.from(spans.entries())
    .filter(([, s]) => s.last >= 5 && toDateKey(s.firstDate) !== toDateKey(s.lastDate))
    .map(([companyName, s]) => ({
      companyName,
      slug: slugFor(s.companyProfileId),
      first: s.first,
      last: s.last,
      change: s.last - s.first,
      percentChange: s.first > 0 ? ((s.last - s.first) / s.first) * 100 : null,
      firstDate: toDateKey(s.firstDate),
      lastDate: toDateKey(s.lastDate),
    }));

  const gainers = moverEntries
    .filter((m) => m.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 8);
  const decliners = moverEntries
    .filter((m) => m.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 5);

  // Locations: normalize free-text strings, aggregate, keep the top 8.
  const locationCounts = new Map<string, number>();
  for (const g of locationGroups) {
    const key = normalizeLocation(g.location);
    if (!key) continue;
    locationCounts.set(key, (locationCounts.get(key) ?? 0) + g._count._all);
  }
  const topLocations = Array.from(locationCounts.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const activeAtMonthEnd = lastTotalSnapshot?.activeJobs ?? null;

  return {
    month: monthKey(year, month),
    monthLabel: monthLabelOf(year, month),
    activeAtMonthEnd,
    activeAtMonthEndDate: lastTotalSnapshot ? toDateKey(lastTotalSnapshot.date) : null,
    activeNow,
    priorActiveAtMonthEnd,
    momChange:
      activeAtMonthEnd != null && priorActiveAtMonthEnd != null
        ? activeAtMonthEnd - priorActiveAtMonthEnd
        : null,
    newPostings: {
      total: newPostingsTotal,
      byCategory: categoryGroups
        .map((g) => ({ key: g.category, count: g._count._all }))
        .sort((a, b) => b.count - a.count),
      bySeniority: seniorityGroups
        .map((g) => ({ key: g.seniorityLevel, count: g._count._all }))
        .sort((a, b) => b.count - a.count),
    },
    topCompanies,
    movers: { gainers, decliners },
    remoteShare: {
      remote: remoteCount,
      total: activeTotal,
      percent: activeTotal > 0 ? (remoteCount / activeTotal) * 100 : null,
    },
    topLocations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * The Monthly Hiring Index for a calendar month (UTC). Returns null when the
 * month predates snapshot history (before 2026-08) or the inputs are invalid.
 * Cached 6h per month key.
 */
export async function getHiringIndex(year: number, month: number): Promise<HiringIndex | null> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  const key = monthKey(year, month);
  if (key < EARLIEST_INDEX_MONTH) return null;

  const cached = unstable_cache(
    () => computeHiringIndex(year, month),
    ['hiring-index', key],
    { revalidate: 21600 } // 6h
  );
  return cached();
}
