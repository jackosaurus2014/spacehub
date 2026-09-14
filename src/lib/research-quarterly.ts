/**
 * SpaceNexus Research — the quarterly sector report.
 *
 * Analyst-grade means "every figure is traceable to the rows behind it", not
 * "a model wrote some prose". This file computes the quarter deterministically
 * from the funding-round table, the Space Score snapshots and the hiring index.
 * It calls no model — that is a standing product rule, and it is also what
 * makes the report defensible in an investment committee.
 *
 * Time loop: quarterly. It is the slowest loop the site publishes on, and it is
 * the one a strategy team actually plans against.
 */

import prisma from '@/lib/db';
import { getHiringIndex } from '@/lib/hiring-index';
import { getLeaderboard } from '@/lib/space-score';

export interface QuarterKey {
  year: number;
  /** 1-4 */
  quarter: number;
}

export interface SectorFunding {
  sector: string;
  roundCount: number;
  disclosedRoundCount: number;
  totalUsd: number;
  medianUsd: number | null;
  largestUsd: number | null;
  priorTotalUsd: number;
  /** Percent change vs the prior quarter, null when the prior quarter was zero. */
  changePercent: number | null;
}

export interface QuarterlyReport {
  period: string;
  label: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  funding: {
    roundCount: number;
    disclosedRoundCount: number;
    totalUsd: number;
    priorRoundCount: number;
    priorTotalUsd: number;
    changePercent: number | null;
    bySector: SectorFunding[];
    byRoundType: { roundType: string; roundCount: number; totalUsd: number }[];
    largestRounds: {
      companyName: string;
      companySlug: string;
      sector: string | null;
      seriesLabel: string | null;
      amountUsd: number;
      date: string;
      leadInvestor: string | null;
      sourceUrl: string | null;
    }[];
    mostActiveLeadInvestors: { investor: string; roundCount: number; totalUsd: number }[];
  };
  scoreMovers: {
    available: boolean;
    note: string;
    gainers: { companySlug: string; companyName: string; from: number; to: number; delta: number }[];
    decliners: { companySlug: string; companyName: string; from: number; to: number; delta: number }[];
  };
  hiring: {
    available: boolean;
    note: string;
    month: string | null;
    activeAtMonthEnd: number | null;
    momChange: number | null;
    newPostings: number | null;
  };
  /** What the report can and cannot see. Travels with the numbers, always. */
  coverage: string[];
}

export const EARLIEST_QUARTER: QuarterKey = { year: 2015, quarter: 1 };

export function parseQuarterParam(raw: string | null | undefined): QuarterKey | null {
  if (!raw) return null;
  const m = /^(\d{4})-?Q([1-4])$/i.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const quarter = Number(m[2]);
  if (year < EARLIEST_QUARTER.year || year > 2100) return null;
  return { year, quarter };
}

export function quarterKeyOf(date: Date): QuarterKey {
  return { year: date.getUTCFullYear(), quarter: Math.floor(date.getUTCMonth() / 3) + 1 };
}

/** The most recent quarter that has actually ENDED. Never the live one. */
export function latestCompleteQuarter(now: Date = new Date()): QuarterKey {
  const current = quarterKeyOf(now);
  return current.quarter === 1
    ? { year: current.year - 1, quarter: 4 }
    : { year: current.year, quarter: current.quarter - 1 };
}

export function quarterLabel(q: QuarterKey): string {
  return `Q${q.quarter} ${q.year}`;
}

export function quarterId(q: QuarterKey): string {
  return `${q.year}-Q${q.quarter}`;
}

function quarterRange(q: QuarterKey): { start: Date; end: Date } {
  const startMonth = (q.quarter - 1) * 3;
  return {
    start: new Date(Date.UTC(q.year, startMonth, 1)),
    end: new Date(Date.UTC(q.year, startMonth + 3, 1)),
  };
}

function priorQuarter(q: QuarterKey): QuarterKey {
  return q.quarter === 1 ? { year: q.year - 1, quarter: 4 } : { year: q.year, quarter: q.quarter - 1 };
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const pctChange = (from: number, to: number): number | null =>
  from === 0 ? null : Math.round(((to - from) / from) * 1000) / 10;

/**
 * Build the quarterly. Every branch that cannot be computed says so in words
 * rather than returning a zero that reads like a finding.
 */
export async function buildQuarterlyReport(q: QuarterKey): Promise<QuarterlyReport> {
  const { start, end } = quarterRange(q);
  const prior = priorQuarter(q);
  const priorRange = quarterRange(prior);

  const [rounds, priorRounds] = await Promise.all([
    prisma.fundingRound.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: [{ amount: 'desc' }, { date: 'desc' }],
      include: { company: { select: { slug: true, name: true, sector: true } } },
    }),
    prisma.fundingRound.findMany({
      where: { date: { gte: priorRange.start, lt: priorRange.end } },
      select: { amount: true, company: { select: { sector: true } } },
    }),
  ]);

  const disclosed = rounds.filter((r) => typeof r.amount === 'number' && r.amount! > 0);
  const totalUsd = disclosed.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const priorDisclosed = priorRounds.filter((r) => typeof r.amount === 'number' && r.amount! > 0);
  const priorTotalUsd = priorDisclosed.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  // --- By sector ---------------------------------------------------------
  const sectorBuckets = new Map<string, { amounts: number[]; roundCount: number }>();
  for (const r of rounds) {
    const sector = r.company?.sector || 'Unclassified';
    const bucket = sectorBuckets.get(sector) ?? { amounts: [], roundCount: 0 };
    bucket.roundCount += 1;
    if (typeof r.amount === 'number' && r.amount > 0) bucket.amounts.push(r.amount);
    sectorBuckets.set(sector, bucket);
  }
  const priorSectorTotals = new Map<string, number>();
  for (const r of priorDisclosed) {
    const sector = r.company?.sector || 'Unclassified';
    priorSectorTotals.set(sector, (priorSectorTotals.get(sector) ?? 0) + (r.amount ?? 0));
  }

  const bySector: SectorFunding[] = Array.from(sectorBuckets.entries())
    .map(([sector, b]) => {
      const total = b.amounts.reduce((s, v) => s + v, 0);
      const priorTotal = priorSectorTotals.get(sector) ?? 0;
      return {
        sector,
        roundCount: b.roundCount,
        disclosedRoundCount: b.amounts.length,
        totalUsd: total,
        medianUsd: median(b.amounts),
        largestUsd: b.amounts.length > 0 ? Math.max(...b.amounts) : null,
        priorTotalUsd: priorTotal,
        changePercent: pctChange(priorTotal, total),
      };
    })
    .sort((a, b) => b.totalUsd - a.totalUsd || a.sector.localeCompare(b.sector));

  // --- By round type -----------------------------------------------------
  const typeBuckets = new Map<string, { roundCount: number; totalUsd: number }>();
  for (const r of rounds) {
    const key = r.roundType || r.seriesLabel || 'Unspecified';
    const bucket = typeBuckets.get(key) ?? { roundCount: 0, totalUsd: 0 };
    bucket.roundCount += 1;
    bucket.totalUsd += r.amount ?? 0;
    typeBuckets.set(key, bucket);
  }
  const byRoundType = Array.from(typeBuckets.entries())
    .map(([roundType, v]) => ({ roundType, ...v }))
    .sort((a, b) => b.totalUsd - a.totalUsd || a.roundType.localeCompare(b.roundType));

  // --- Lead investors ----------------------------------------------------
  const investorBuckets = new Map<string, { roundCount: number; totalUsd: number }>();
  for (const r of rounds) {
    const lead = (r.leadInvestor || '').trim();
    if (!lead) continue;
    const bucket = investorBuckets.get(lead) ?? { roundCount: 0, totalUsd: 0 };
    bucket.roundCount += 1;
    bucket.totalUsd += r.amount ?? 0;
    investorBuckets.set(lead, bucket);
  }
  const mostActiveLeadInvestors = Array.from(investorBuckets.entries())
    .map(([investor, v]) => ({ investor, ...v }))
    .sort((a, b) => b.roundCount - a.roundCount || b.totalUsd - a.totalUsd)
    .slice(0, 10);

  // --- Score movers, from the snapshot table only ------------------------
  const scoreMovers = await buildScoreMovers(start, end);

  // --- Hiring, from the last month of the quarter ------------------------
  const lastMonth = (q.quarter - 1) * 3 + 3; // 1-based month number
  let hiring: QuarterlyReport['hiring'] = {
    available: false,
    note: 'The hiring index starts in August 2026; quarters before that have no reading.',
    month: null,
    activeAtMonthEnd: null,
    momChange: null,
    newPostings: null,
  };
  try {
    const index = await getHiringIndex(q.year, lastMonth);
    if (index) {
      hiring = {
        available: true,
        note: `Hiring index for ${index.monthLabel}, the closing month of the quarter.`,
        month: index.month,
        activeAtMonthEnd: index.activeAtMonthEnd,
        momChange: index.momChange,
        newPostings: index.newPostings?.total ?? null,
      };
    }
  } catch {
    // The index is a best-effort input; a failure here must not take the
    // report down, and silently reporting zero jobs would be worse than
    // saying we could not read it.
    hiring = { ...hiring, note: 'The hiring index could not be read for this quarter.' };
  }

  return {
    period: quarterId(q),
    label: quarterLabel(q),
    startDate: start.toISOString().slice(0, 10),
    endDate: new Date(end.getTime() - 86_400_000).toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    funding: {
      roundCount: rounds.length,
      disclosedRoundCount: disclosed.length,
      totalUsd,
      priorRoundCount: priorRounds.length,
      priorTotalUsd,
      changePercent: pctChange(priorTotalUsd, totalUsd),
      bySector,
      byRoundType,
      largestRounds: disclosed.slice(0, 15).map((r) => ({
        companyName: r.company?.name ?? '',
        companySlug: r.company?.slug ?? '',
        sector: r.company?.sector ?? null,
        seriesLabel: r.seriesLabel ?? null,
        amountUsd: r.amount ?? 0,
        date: r.date ? r.date.toISOString().slice(0, 10) : '',
        leadInvestor: r.leadInvestor ?? null,
        sourceUrl: r.sourceUrl ?? null,
      })),
      mostActiveLeadInvestors,
    },
    scoreMovers,
    hiring,
    coverage: [
      `Funding figures cover ${disclosed.length} disclosed rounds of ${rounds.length} recorded in the quarter. Undisclosed rounds are counted but contribute $0 to totals, so totals are a floor, not an estimate.`,
      'Sector attribution follows the company profile, so a company that changed sector is reported under its current one in both quarters.',
      scoreMovers.note,
      hiring.note,
      'Every figure is computed from our own tables at request time. Nothing on this page is model-generated.',
    ],
  };
}

async function buildScoreMovers(start: Date, end: Date): Promise<QuarterlyReport['scoreMovers']> {
  const empty = {
    available: false,
    note: 'Space Score history begins when daily snapshots started in September 2026; movers are reported only for quarters fully covered by snapshots.',
    gainers: [] as QuarterlyReport['scoreMovers']['gainers'],
    decliners: [] as QuarterlyReport['scoreMovers']['decliners'],
  };

  const [first, last] = await Promise.all([
    prisma.spaceScoreSnapshot.findFirst({
      where: { day: { gte: start, lt: end } },
      orderBy: { day: 'asc' },
      select: { day: true },
    }),
    prisma.spaceScoreSnapshot.findFirst({
      where: { day: { gte: start, lt: end } },
      orderBy: { day: 'desc' },
      select: { day: true },
    }),
  ]);
  if (!first || !last || first.day.getTime() === last.day.getTime()) return empty;

  const [opening, closing] = await Promise.all([
    prisma.spaceScoreSnapshot.findMany({
      where: { day: first.day },
      select: { companySlug: true, companyName: true, score: true },
    }),
    prisma.spaceScoreSnapshot.findMany({
      where: { day: last.day },
      select: { companySlug: true, companyName: true, score: true },
    }),
  ]);

  const openBySlug = new Map(opening.map((s) => [s.companySlug, s.score]));
  const deltas = closing
    .filter((s) => openBySlug.has(s.companySlug))
    .map((s) => ({
      companySlug: s.companySlug,
      companyName: s.companyName,
      from: openBySlug.get(s.companySlug)!,
      to: s.score,
      delta: s.score - openBySlug.get(s.companySlug)!,
    }))
    .filter((d) => d.delta !== 0);

  if (deltas.length === 0) return { ...empty, available: true, note: `Space Score was unchanged for every covered company between ${first.day.toISOString().slice(0, 10)} and ${last.day.toISOString().slice(0, 10)}.` };

  return {
    available: true,
    note: `Space Score movers measured from ${first.day.toISOString().slice(0, 10)} to ${last.day.toISOString().slice(0, 10)}, the first and last snapshot days inside the quarter.`,
    gainers: deltas.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 10),
    decliners: deltas.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 10),
  };
}

/** Scored companies today, for the report's "universe" line. */
export function scoredCompanyCount(): number {
  return getLeaderboard().length;
}
