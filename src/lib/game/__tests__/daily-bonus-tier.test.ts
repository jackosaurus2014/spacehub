/**
 * GAME_DESIGN_REVIEW_2026-09 §2 row 9 — the daily bonus is indexed to
 * corporation tier: T1 ×0.25, T2 ×0.5, T3 ×1 (authored schedule), T4+ ≈1% of
 * the tier's totalEarned gate per 7-day cycle.
 */
import {
  computeDailyBonusClaim,
  dailyBonusTierTable,
  getBonusSchedule,
  getDailyBonusAmount,
  getDailyBonusTierMultiplier,
  DAILY_BONUS_CYCLE_TOTAL,
  DAILY_BONUS_T4_GATE_FRACTION,
} from '../daily-bonus';
import { tierFromProfileScalars, getTierTotalEarnedThreshold } from '../corporation-tiers';

describe('daily bonus tier table (row 9)', () => {
  it('base cycle is the authored $508M', () => {
    expect(DAILY_BONUS_CYCLE_TOTAL).toBe(508_000_000);
  });

  it('T1-T3 multipliers are 0.25 / 0.5 / 1.0', () => {
    expect(getDailyBonusTierMultiplier(1)).toBe(0.25);
    expect(getDailyBonusTierMultiplier(2)).toBe(0.5);
    expect(getDailyBonusTierMultiplier(3)).toBe(1);
  });

  it('T1 first-week bonus is $2.5M → $50M ($127M/cycle) — meaningful, not dominant at a $100M start', () => {
    const t1 = getBonusSchedule(1);
    expect(t1[0].amount).toBe(2_500_000);
    expect(t1[6].amount).toBe(50_000_000);
    expect(t1.reduce((a, d) => a + d.amount, 0)).toBe(127_000_000);
    // Less than 1.3× the $100M start over a whole week (was 5×).
    expect(127_000_000 / 100_000_000).toBeLessThan(1.5);
  });

  it('T4+ multipliers track ~1% of the tier totalEarned gate per 7-day cycle (within rounding to the decade)', () => {
    for (const tier of [4, 5, 6, 7]) {
      const gate = getTierTotalEarnedThreshold(tier);
      const exact = (gate * DAILY_BONUS_T4_GATE_FRACTION) / DAILY_BONUS_CYCLE_TOTAL;
      const chosen = getDailyBonusTierMultiplier(tier);
      // chosen is the exact value rounded to its decade: 0.98→1, 9.84→10, 98.4→100, 984→1000
      expect(chosen / exact).toBeGreaterThan(0.95);
      expect(chosen / exact).toBeLessThan(1.05);
      // and the cycle really is ≈1% of the gate
      const cycle = DAILY_BONUS_CYCLE_TOTAL * chosen;
      expect(cycle / gate).toBeGreaterThan(0.0095);
      expect(cycle / gate).toBeLessThan(0.0105);
    }
  });

  it('the table is monotonic and matches the documented rows', () => {
    const table = dailyBonusTierTable();
    expect(table.map(r => r.multiplier)).toEqual([0.25, 0.5, 1, 1, 10, 100, 1000]);
    expect(table.map(r => r.day1)).toEqual([2_500_000, 5_000_000, 10_000_000, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000]);
    expect(table.map(r => r.day7)).toEqual([50_000_000, 100_000_000, 200_000_000, 200_000_000, 2_000_000_000, 20_000_000_000, 200_000_000_000]);
    for (let i = 1; i < table.length; i++) expect(table[i].cycleTotal).toBeGreaterThanOrEqual(table[i - 1].cycleTotal);
  });

  it('clamps garbage tiers into 1..7', () => {
    expect(getDailyBonusTierMultiplier(0)).toBe(0.25);
    expect(getDailyBonusTierMultiplier(99)).toBe(1000);
    expect(getDailyBonusTierMultiplier(undefined)).toBe(0.25);
    expect(getDailyBonusAmount(8, 3)).toBe(10_000_000); // day 8 wraps to day 1
  });
});

describe('computeDailyBonusClaim with tier', () => {
  it('defaults to the authored (T3) schedule so existing callers are unchanged', () => {
    expect(computeDailyBonusClaim(null, 0, '2026-09-02', '2026-09-01').amount).toBe(10_000_000);
    expect(computeDailyBonusClaim('2026-09-01', 6, '2026-09-02', '2026-09-01').amount).toBe(200_000_000);
  });

  it('scales by tier and keeps streak semantics', () => {
    expect(computeDailyBonusClaim(null, 0, '2026-09-02', '2026-09-01', 1).amount).toBe(2_500_000);
    expect(computeDailyBonusClaim('2026-09-01', 6, '2026-09-02', '2026-09-01', 5)).toEqual({ claimable: true, amount: 2_000_000_000, newStreak: 7 });
    expect(computeDailyBonusClaim('2026-09-02', 3, '2026-09-02', '2026-09-01', 7).claimable).toBe(false);
  });
});

describe('tierFromProfileScalars (server-side tier, never from the client)', () => {
  it('is bounded by totalEarned', () => {
    expect(tierFromProfileScalars({ totalEarned: 0 })).toBe(1);
    expect(tierFromProfileScalars({ totalEarned: 499_999_999, buildingCount: 99, researchCount: 99, locationsUnlocked: 99, serviceCount: 99 })).toBe(1);
    expect(tierFromProfileScalars({ totalEarned: 5e9, buildingCount: 12, researchCount: 8, locationsUnlocked: 5, serviceCount: 6 })).toBe(3);
    expect(tierFromProfileScalars({ totalEarned: 5e9, buildingCount: 4, researchCount: 8, locationsUnlocked: 5, serviceCount: 6 })).toBe(1);
  });

  it('checks the persisted scalar requirements it has and skips the ones it does not', () => {
    // T5 needs 40 buildings / 25 research / 9 locations / 15 services + ships/contracts (not persisted → skipped)
    expect(tierFromProfileScalars({ totalEarned: 6e11, buildingCount: 40, researchCount: 25, locationsUnlocked: 9, serviceCount: 15 })).toBe(5);
    expect(tierFromProfileScalars({ totalEarned: 6e11, buildingCount: 39, researchCount: 25, locationsUnlocked: 9, serviceCount: 15 })).toBe(4);
    expect(tierFromProfileScalars({ totalEarned: 6e11 })).toBe(5);
    expect(tierFromProfileScalars({ totalEarned: Number.NaN })).toBe(1);
  });
});
