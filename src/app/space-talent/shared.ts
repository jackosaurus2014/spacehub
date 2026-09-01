/**
 * Shared, server-safe types and helpers for /space-talent.
 *
 * This module deliberately carries NO 'use client' directive and no JSX so it
 * can be imported from the server page (`page.tsx`) and the client island
 * (`SpaceTalentClient.tsx`) alike — same pattern as company-profiles/shared.ts.
 */

import type {
  SpaceTalent,
  SpaceJobPosting,
  WorkforceTrend,
  JobCategory,
  SeniorityLevel,
} from '@/types';

/** Page size shared by the server first screen and the client's load-more. */
export const JOBS_PER_PAGE = 15;

/**
 * How many experts the server pre-renders. Must equal the default `limit` of
 * /api/space-jobs/talent (20) or hydration would show a different roster
 * than the crawler saw.
 */
export const TALENT_FIRST_SCREEN_LIMIT = 20;

export interface TalentStats {
  totalExperts: number;
  featuredCount: number;
  availableCount: number;
  avgConsultingRate: number;
}

export interface WorkforceStats {
  totalOpenings: number;
  avgSalary: number;
  topCategory: string;
  topCompany: string;
  totalCompanies: number;
  growthRate: number;
}

export interface SalaryBenchmarkEntry {
  category?: JobCategory;
  seniorityLevel?: SeniorityLevel;
  avgMin: number;
  avgMax: number;
  avgMedian: number;
  count: number;
}

export interface WorkforceBenchmarks {
  byCategory: SalaryBenchmarkEntry[];
  bySeniority: SalaryBenchmarkEntry[];
}

/** Default talent-tab landing, read on the server by page.tsx. */
export interface TalentFirstScreen {
  /** First TALENT_FIRST_SCREEN_LIMIT experts, unfiltered (the default view). */
  talent: SpaceTalent[];
  /** Stats over the FULL roster, matching /api/space-jobs/talent. */
  stats: TalentStats;
  /** Oldest refreshedAt of the dynamic roster rows (ISO), or null for seed data. */
  asOf: string | null;
}

/** Default workforce-tab landing (the /api/workforce default response). */
export interface WorkforceFirstScreen {
  /** First JOBS_PER_PAGE active jobs, postedDate desc, unfiltered. */
  jobs: SpaceJobPosting[];
  totalJobs: number;
  trends: WorkforceTrend[];
  stats: WorkforceStats;
  benchmarks: WorkforceBenchmarks;
}

export interface SpaceTalentClientProps {
  /** Present only when the request landed on the talent tab with no filters. */
  initialTalent?: TalentFirstScreen | null;
  /** Present only when the request landed on the workforce tab with no job filters. */
  initialWorkforce?: WorkforceFirstScreen | null;
}

/**
 * The subset of /api/space-jobs/talent's computeStats that the page renders.
 * Mirrors that route (which cannot be imported from a page tree) — keep the
 * two in sync if the stats tiles ever change.
 */
export function computeTalentStats(talent: SpaceTalent[]): TalentStats {
  const withRates = talent.filter((t) => t.consultingRate);
  const avgRate =
    withRates.length > 0
      ? withRates.reduce((sum, t) => sum + (t.consultingRate || 0), 0) / withRates.length
      : 0;
  return {
    totalExperts: talent.length,
    featuredCount: talent.filter((t) => t.featured).length,
    availableCount: talent.filter((t) => t.availability === 'available').length,
    avgConsultingRate: Math.round(avgRate),
  };
}
