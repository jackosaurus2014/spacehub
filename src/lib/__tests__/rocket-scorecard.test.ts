/**
 * @jest-environment node
 *
 * Rocket scorecard (2026-09-06). The ranking is what three pages show as
 * "which rockets are actually flying", so the order and the activity labels
 * are pinned here without a database.
 */
jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));

import { buildScorecard, rankScorecard, summarizeScorecard, activityOf, fmtPrice, fmtPerKg } from '../rocket-scorecard';
import type { LaunchVehicle } from '../launch-vehicles-data';
import type { RocketIndexRow } from '../rockets';

const spec = (id: string, over: Partial<LaunchVehicle> = {}): LaunchVehicle => ({
  id, name: id, manufacturer: 'M', country: 'US', status: 'Operational',
  heightM: 70, diameterM: 3.7, massKg: 549_000, payloadLeoKg: 22_800, payloadGtoKg: null, payloadSsoKg: null, payloadTliKg: null,
  costMillions: 74, costPerKgLeo: 3246, totalLaunches: 100, successes: 99, failures: 1, partialFailures: 0, successRate: 99,
  consecutiveSuccesses: 50, reusable: true, stages: 2, engines: 'x', propellant: 'y', fairingDiameterM: 5.2,
  firstFlight: '2010-06-04', lastFlight: null,
  ...over,
} as LaunchVehicle);

const row = (slug: string, over: Partial<RocketIndexRow> = {}): RocketIndexRow => ({
  slug, spec: spec(slug), flown: 0, last90Days: 0, nextLaunch: null, thisYear: 0, thisYearFailed: 0, lastFlight: null, ...over,
});

describe('activity', () => {
  it('is driven by the registry status first, then the tracker', () => {
    expect(activityOf(spec('a', { status: 'Retired' }), row('a', { thisYear: 5 }))).toBe('retired');
    expect(activityOf(spec('a', { status: 'In Development' }), row('a', { nextLaunch: new Date() }))).toBe('development');
    expect(activityOf(spec('a'), row('a', { thisYear: 1 }))).toBe('flying');
    expect(activityOf(spec('a'), row('a', { nextLaunch: new Date() }))).toBe('flying');
    expect(activityOf(spec('a'), row('a'))).toBe('quiet');
    expect(activityOf(spec('a'), undefined)).toBe('quiet');
  });
});

describe('ranking', () => {
  it('puts the busiest flying vehicle first and retired last, regardless of input order', () => {
    const vehicles = [spec('retired', { status: 'Retired', totalLaunches: 900 }), spec('quiet'), spec('busy'), spec('dev', { status: 'In Development' }), spec('soon')];
    const index = [row('busy', { thisYear: 40, last90Days: 12 }), row('soon', { nextLaunch: new Date('2026-09-30T00:00:00Z') })];
    expect(buildScorecard(index, vehicles).map((r) => r.slug)).toEqual(['busy', 'soon', 'quiet', 'dev', 'retired']);
  });

  it('breaks a tie on this-year flights by the 90-day count, then the nearer next launch', () => {
    const rows = buildScorecard([
      row('a', { thisYear: 3, last90Days: 1, nextLaunch: new Date('2026-10-01T00:00:00Z') }),
      row('b', { thisYear: 3, last90Days: 2 }),
      row('c', { thisYear: 3, last90Days: 1, nextLaunch: new Date('2026-09-10T00:00:00Z') }),
    ], [spec('a'), spec('b'), spec('c')]);
    expect(rows.map((r) => r.slug)).toEqual(['b', 'c', 'a']);
  });

  it('is stable for a vehicle missing from the tracker entirely', () => {
    const rows = buildScorecard([], [spec('x')]);
    expect(rows[0]).toMatchObject({ slug: 'x', thisYear: 0, last90Days: 0, nextLaunch: null, activity: 'quiet' });
  });

  it('rankScorecard does not mutate its input', () => {
    const rows = buildScorecard([row('b', { thisYear: 2 }), row('a', { thisYear: 9 })], [spec('a'), spec('b')]);
    const copy = rows.slice();
    rankScorecard(rows);
    expect(rows).toEqual(copy);
  });
});

describe('summary', () => {
  it('counts flying vehicles, sums the year, names the busiest and the debutants', () => {
    const rows = buildScorecard([
      row('busy', { thisYear: 40 }),
      row('soon', { nextLaunch: new Date('2026-09-30T00:00:00Z') }),
    ], [spec('busy'), spec('soon'), spec('quiet'), spec('retired', { status: 'Retired' })]);
    const s = summarizeScorecard(rows);
    expect(s.flyingCount).toBe(2);
    expect(s.flownThisYear).toBe(40);
    expect(s.busiest?.slug).toBe('busy');
    expect(s.debutingSoon.map((r) => r.slug)).toEqual(['soon']);
  });
});

describe('formatting', () => {
  it('never prints $0 for a missing price', () => {
    expect(fmtPrice(null)).toBe('—');
    expect(fmtPrice(74)).toBe('~$74M');
    expect(fmtPerKg(null)).toBe('—');
    expect(fmtPerKg(3246)).toBe('~$3,246');
  });
});
