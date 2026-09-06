// Rocket scorecard (2026-09-06). One derivation behind three surfaces: the
// live vehicle table on the launch-cost guide, the "vehicles active this
// year" block on the launch-schedule guide, and the /guide/rockets-flying-
// in-2026 scorecard page. Registry facts (payload, list price, lifetime
// record) come from launch-vehicles-data.ts; everything with a date comes
// from the tracker via getRocketIndex, so a row can never say "recently"
// about something that happened last year.
//
// Pure: the ranking and the labels are functions of the index rows and a
// `now`, so they are tested without a database.

import { LAUNCH_VEHICLES, type LaunchVehicle } from './launch-vehicles-data';
import { getRocketIndex, type RocketIndexRow } from './rockets';

export interface ScorecardRow {
  slug: string;
  name: string;
  manufacturer: string;
  country: string;
  status: LaunchVehicle['status'];
  payloadLeoKg: number;
  costMillions: number | null;
  costPerKgLeo: number | null;
  reusable: boolean;
  /** Lifetime, from the registry (hand-verified, dated by `asOf`). */
  lifetimeLaunches: number;
  lifetimeSuccessRate: number;
  /** From the tracker, this UTC year. */
  thisYear: number;
  thisYearFailed: number;
  last90Days: number;
  lastFlight: Date | null;
  nextLaunch: Date | null;
  /** 'flying' = flew this year or has a next launch; 'quiet' = operational but
   *  nothing tracked either way; 'development' / 'retired' from the registry. */
  activity: 'flying' | 'quiet' | 'development' | 'retired';
}

export function activityOf(spec: LaunchVehicle, row: RocketIndexRow | undefined): ScorecardRow['activity'] {
  if (spec.status === 'Retired') return 'retired';
  if (spec.status === 'In Development') return 'development';
  if (row && (row.thisYear > 0 || row.nextLaunch)) return 'flying';
  return 'quiet';
}

/** Order that reads as a leaderboard: most flights this year first, then
 *  the ones with a flight on the manifest, then the quiet, then in-development,
 *  then retired. Ties break on the 90-day count, then lifetime record. */
export function rankScorecard(rows: ScorecardRow[]): ScorecardRow[] {
  const order: Record<ScorecardRow['activity'], number> = { flying: 0, quiet: 1, development: 2, retired: 3 };
  return rows.slice().sort((a, b) =>
    order[a.activity] - order[b.activity]
    || b.thisYear - a.thisYear
    || b.last90Days - a.last90Days
    || (a.nextLaunch?.getTime() ?? Infinity) - (b.nextLaunch?.getTime() ?? Infinity)
    || b.lifetimeLaunches - a.lifetimeLaunches
    || a.name.localeCompare(b.name));
}

export function buildScorecard(index: RocketIndexRow[], vehicles: LaunchVehicle[] = LAUNCH_VEHICLES): ScorecardRow[] {
  const bySlug = new Map(index.map((r) => [r.slug, r]));
  const rows = vehicles.map((v): ScorecardRow => {
    const r = bySlug.get(v.id);
    return {
      slug: v.id,
      name: v.name,
      manufacturer: v.manufacturer,
      country: v.country,
      status: v.status,
      payloadLeoKg: v.payloadLeoKg,
      costMillions: v.costMillions,
      costPerKgLeo: v.costPerKgLeo,
      reusable: v.reusable,
      lifetimeLaunches: v.totalLaunches,
      lifetimeSuccessRate: v.successRate,
      thisYear: r?.thisYear ?? 0,
      thisYearFailed: r?.thisYearFailed ?? 0,
      last90Days: r?.last90Days ?? 0,
      lastFlight: r?.lastFlight ?? null,
      nextLaunch: r?.nextLaunch ?? null,
      activity: activityOf(v, r),
    };
  });
  return rankScorecard(rows);
}

export interface ScorecardSummary {
  flyingCount: number;
  flownThisYear: number;
  busiest: ScorecardRow | null;
  /** Vehicles whose next tracked flight is their first of the year. */
  debutingSoon: ScorecardRow[];
}

export function summarizeScorecard(rows: ScorecardRow[]): ScorecardSummary {
  const flying = rows.filter((r) => r.activity === 'flying');
  return {
    flyingCount: flying.length,
    flownThisYear: rows.reduce((s, r) => s + r.thisYear, 0),
    busiest: flying[0] ?? null,
    debutingSoon: rows.filter((r) => r.thisYear === 0 && r.nextLaunch && r.status !== 'Retired'),
  };
}

/** Live scorecard for the current year. */
export async function getRocketScorecard(now: Date = new Date()): Promise<ScorecardRow[]> {
  return buildScorecard(await getRocketIndex(now));
}

/** Used in tables: "—" rather than "$0" for a vehicle with no list price. */
export function fmtPrice(costMillions: number | null): string {
  return costMillions == null ? '—' : `~$${costMillions}M`;
}
export function fmtPerKg(costPerKg: number | null): string {
  return costPerKg == null ? '—' : `~$${costPerKg.toLocaleString('en-US')}`;
}
