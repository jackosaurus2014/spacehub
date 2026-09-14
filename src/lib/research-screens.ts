/**
 * SpaceNexus Research — saved screens with change alerts.
 *
 * A screen is a saved question over the funding-round history crossed with
 * Space Score and sector ("US propulsion companies that raised a Series B or
 * later above $25M in the last 90 days and score over 600"). It is evaluated
 * deterministically from our own rows; no model is called, at save time or at
 * run time.
 *
 * The alert fires on a CHANGE in the result set, not on a schedule — the whole
 * point is that a weekly email nobody can ignore is worth more than a weekly
 * email that repeats itself.
 *
 * Time loop: weekly. Deliberately not daily; the funding data does not move
 * fast enough for a daily screen alert to carry information.
 */

import { z } from 'zod';
import prisma from '@/lib/db';
import { getCompanyScore } from '@/lib/space-score';

export const RESEARCH_SCREEN_ALERT_CADENCES = ['none', 'weekly'] as const;
export type ResearchScreenAlertCadence = (typeof RESEARCH_SCREEN_ALERT_CADENCES)[number];

/** Hard ceiling on a screen's result set, so one screen cannot become an export. */
export const SCREEN_MAX_RESULTS = 250;

export const researchScreenCriteriaSchema = z
  .object({
    /** CompanyProfile.sector values; empty means any. */
    sectors: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
    /** CompanyProfile.country values; empty means any. */
    countries: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
    /** FundingRound.roundType values. */
    roundTypes: z.array(z.string().trim().min(1).max(40)).max(15).optional(),
    /** FundingRound.seriesLabel values. */
    seriesLabels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    minAmountUsd: z.number().min(0).max(1e12).optional(),
    maxAmountUsd: z.number().min(0).max(1e12).optional(),
    /** Only rounds dated within this many days of the run. 1-3650. */
    sinceDays: z.number().int().min(1).max(3650).optional(),
    /** Substring match on the lead investor, case-insensitive. */
    leadInvestorContains: z.string().trim().min(2).max(120).optional(),
    minSpaceScore: z.number().int().min(0).max(1000).optional(),
    maxSpaceScore: z.number().int().min(0).max(1000).optional(),
    /** Exclude rounds with no disclosed amount. */
    requireDisclosedAmount: z.boolean().optional(),
    limit: z.number().int().min(1).max(SCREEN_MAX_RESULTS).optional(),
  })
  .strict()
  .refine(
    (c) => c.minAmountUsd == null || c.maxAmountUsd == null || c.minAmountUsd <= c.maxAmountUsd,
    { message: 'minAmountUsd must not exceed maxAmountUsd', path: ['minAmountUsd'] }
  )
  .refine(
    (c) => c.minSpaceScore == null || c.maxSpaceScore == null || c.minSpaceScore <= c.maxSpaceScore,
    { message: 'minSpaceScore must not exceed maxSpaceScore', path: ['minSpaceScore'] }
  );

export type ResearchScreenCriteria = z.infer<typeof researchScreenCriteriaSchema>;

export interface ScreenMatch {
  roundId: string;
  date: string;
  companySlug: string;
  companyName: string;
  sector: string | null;
  country: string | null;
  seriesLabel: string | null;
  roundType: string | null;
  amountUsd: number | null;
  leadInvestor: string | null;
  investorCount: number;
  spaceScore: number | null;
  sourceUrl: string | null;
}

export interface ScreenRunResult {
  matches: ScreenMatch[];
  /** Ids of every match, in result order — the change-detection fingerprint. */
  resultIds: string[];
  count: number;
  truncated: boolean;
  runAt: string;
}

/**
 * Run a screen. Filters that Postgres can do are pushed into the query; the
 * Space Score filter runs in memory because scores are computed, not stored.
 */
export async function runResearchScreen(
  criteria: ResearchScreenCriteria,
  now: Date = new Date()
): Promise<ScreenRunResult> {
  const limit = criteria.limit ?? SCREEN_MAX_RESULTS;

  const where: Record<string, unknown> = {};
  const companyWhere: Record<string, unknown> = {};

  if (criteria.sectors?.length) companyWhere.sector = { in: criteria.sectors };
  if (criteria.countries?.length) companyWhere.country = { in: criteria.countries };
  if (Object.keys(companyWhere).length > 0) where.company = companyWhere;

  if (criteria.roundTypes?.length) where.roundType = { in: criteria.roundTypes };
  if (criteria.seriesLabels?.length) where.seriesLabel = { in: criteria.seriesLabels };

  const amount: Record<string, number> = {};
  if (criteria.minAmountUsd != null) amount.gte = criteria.minAmountUsd;
  if (criteria.maxAmountUsd != null) amount.lte = criteria.maxAmountUsd;
  if (Object.keys(amount).length > 0) where.amount = amount;
  else if (criteria.requireDisclosedAmount) where.amount = { not: null };

  if (criteria.sinceDays != null) {
    where.date = { gte: new Date(now.getTime() - criteria.sinceDays * 86_400_000) };
  }
  if (criteria.leadInvestorContains) {
    where.leadInvestor = { contains: criteria.leadInvestorContains, mode: 'insensitive' };
  }

  // Over-fetch by one so "truncated" is honest rather than guessed, and cap the
  // in-memory score pass at a bounded multiple of the limit.
  const scoreFiltered = criteria.minSpaceScore != null || criteria.maxSpaceScore != null;
  const take = scoreFiltered ? Math.min(SCREEN_MAX_RESULTS * 8, limit * 8 + 1) : limit + 1;

  const rounds = await prisma.fundingRound.findMany({
    where,
    orderBy: [{ date: 'desc' }, { id: 'asc' }],
    take,
    include: {
      company: { select: { slug: true, name: true, sector: true, country: true } },
    },
  });

  const matches: ScreenMatch[] = [];
  for (const r of rounds) {
    const slug = r.company?.slug ?? '';
    const entry = slug ? getCompanyScore(slug) : null;
    const score = entry ? Math.round(entry.score.total) : null;

    if (criteria.minSpaceScore != null && (score == null || score < criteria.minSpaceScore)) continue;
    if (criteria.maxSpaceScore != null && (score == null || score > criteria.maxSpaceScore)) continue;

    matches.push({
      roundId: r.id,
      date: r.date ? r.date.toISOString().slice(0, 10) : '',
      companySlug: slug,
      companyName: r.company?.name ?? '',
      sector: r.company?.sector ?? null,
      country: r.company?.country ?? null,
      seriesLabel: r.seriesLabel ?? null,
      roundType: r.roundType ?? null,
      amountUsd: r.amount ?? null,
      leadInvestor: r.leadInvestor ?? null,
      investorCount: (r.investors ?? []).length,
      spaceScore: score,
      sourceUrl: r.sourceUrl ?? null,
    });
    if (matches.length > limit) break;
  }

  const truncated = matches.length > limit;
  const page = truncated ? matches.slice(0, limit) : matches;

  return {
    matches: page,
    resultIds: page.map((m) => m.roundId),
    count: page.length,
    truncated,
    runAt: now.toISOString(),
  };
}

/** Ids that are in `next` but were not in `previous`. The alert's whole payload. */
export function newResultIds(previous: unknown, next: string[]): string[] {
  const before = new Set(
    Array.isArray(previous) ? previous.filter((v): v is string => typeof v === 'string') : []
  );
  return next.filter((id) => !before.has(id));
}

/** Human summary of a screen, for the alert email subject and the UI. */
export function describeScreenCriteria(criteria: ResearchScreenCriteria): string {
  const parts: string[] = [];
  if (criteria.sectors?.length) parts.push(criteria.sectors.join(' / '));
  if (criteria.countries?.length) parts.push(`in ${criteria.countries.join(' / ')}`);
  if (criteria.seriesLabels?.length) parts.push(criteria.seriesLabels.join(' / '));
  if (criteria.roundTypes?.length) parts.push(criteria.roundTypes.join(' / '));
  if (criteria.minAmountUsd != null) {
    parts.push(`over $${Math.round(criteria.minAmountUsd / 1_000_000)}M`);
  }
  if (criteria.minSpaceScore != null) parts.push(`Space Score ${criteria.minSpaceScore}+`);
  if (criteria.sinceDays != null) parts.push(`last ${criteria.sinceDays} days`);
  return parts.length > 0 ? parts.join(', ') : 'all funding rounds';
}
