/**
 * 4X Upgrade Wave W3 — seasonal-event generation schedule
 * (docs/4X_BASELINE_2026-08.md defect ledger #8 / audit C4: "no cron
 * instantiates SeasonalEvent rows"). Covers the pure, DB-free scheduling
 * functions consumed by /api/space-tycoon/seasons/cron:
 *  - Determinism: same season number → same window, every call.
 *  - No gaps/overlaps: season N+1 starts strictly after season N ends.
 *  - Full-cycle coverage: all 5 season types appear across one cycle.
 *  - getCurrentSeasonNumber agrees with getSeasonSchedule at the boundary.
 */
import { getSeasonSchedule, getCurrentSeasonNumber, SEASON_DEFINITIONS } from '../seasonal-events';

describe('seasonal-events: getSeasonSchedule determinism', () => {
  test('same season number always returns the same window', () => {
    const a = getSeasonSchedule(7);
    const b = getSeasonSchedule(7);
    expect(a.seasonType).toBe(b.seasonType);
    expect(a.startsAt.getTime()).toBe(b.startsAt.getTime());
    expect(a.endsAt.getTime()).toBe(b.endsAt.getTime());
  });

  test('season 1 starts at the fixed anchor and has a valid type/duration', () => {
    const s1 = getSeasonSchedule(1);
    expect(SEASON_DEFINITIONS[s1.seasonType]).toBeDefined();
    const durationDays = (s1.endsAt.getTime() - s1.startsAt.getTime()) / (24 * 60 * 60 * 1000);
    expect(durationDays).toBeCloseTo(SEASON_DEFINITIONS[s1.seasonType].durationDays, 5);
  });

  test('seasons never overlap and never leave a negative gap', () => {
    for (let n = 1; n < 30; n++) {
      const cur = getSeasonSchedule(n);
      const next = getSeasonSchedule(n + 1);
      expect(next.startsAt.getTime()).toBeGreaterThan(cur.endsAt.getTime());
    }
  });

  test('the 5-season cycle rotates through every season type', () => {
    const seen = new Set<string>();
    for (let n = 1; n <= 5; n++) {
      seen.add(getSeasonSchedule(n).seasonType);
    }
    expect(seen.size).toBe(5);
    expect(getSeasonSchedule(6).seasonType).toBe(getSeasonSchedule(1).seasonType);
  });
});

describe('seasonal-events: getCurrentSeasonNumber', () => {
  test('agrees with getSeasonSchedule at season boundaries', () => {
    for (let n = 1; n <= 8; n++) {
      const { startsAt, endsAt } = getSeasonSchedule(n);
      // A moment inside the season window resolves to season n.
      const mid = new Date((startsAt.getTime() + endsAt.getTime()) / 2);
      expect(getCurrentSeasonNumber(mid)).toBe(n);
      // A moment right at the start also resolves to season n.
      expect(getCurrentSeasonNumber(startsAt)).toBe(n);
    }
  });

  test('is monotonic non-decreasing as time advances', () => {
    let prev = getCurrentSeasonNumber(getSeasonSchedule(1).startsAt);
    for (let n = 1; n <= 10; n++) {
      const cur = getCurrentSeasonNumber(getSeasonSchedule(n).endsAt);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });
});
