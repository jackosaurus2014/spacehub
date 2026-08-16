/**
 * Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O4) — talent poaching math:
 * signing-bonus formula (6mo salary × wage index × 1.5), the 10% raid cap,
 * the 75% counteroffer, detection, the self-limiting wage bump, and the
 * server-side Frontier immunity proxy.
 */
import {
  maxPoachableCount, computeSigningBonus, computeRetentionCost,
  computePoachDetectionChance, applyPoachWageBump, isServerFrontierProtected,
  POACH_SIGNING_BONUS_MONTHS, POACH_BONUS_PREMIUM, POACH_MAX_FRACTION,
  POACH_MIN_TARGET_HEADCOUNT, POACH_MAX_CREW_PER_OFFER,
  POACH_COUNTEROFFER_WINDOW_MS, POACH_COUNTEROFFER_MATCH_FRACTION,
  POACH_TARGET_COOLDOWN_MS, POACH_WAGE_BUMP_PER_CREW, POACH_ACTION_FEE,
} from '../talent-poaching';
import { WORKER_MAP } from '../workforce';
import { WAGE_INDEX_MAX, WAGE_INDEX_MIN } from '../labor-market';
import { FRONTIER_DURATION_MS, FRONTIER_HARD_CAP_NET_WORTH } from '../frontier';

describe('M5 O4 — raid size cap (10% of the target roster)', () => {
  it('small teams cannot be poached at all', () => {
    expect(maxPoachableCount(0)).toBe(0);
    expect(maxPoachableCount(POACH_MIN_TARGET_HEADCOUNT - 1)).toBe(0);
  });

  it('small-but-eligible teams cap at 1', () => {
    expect(maxPoachableCount(POACH_MIN_TARGET_HEADCOUNT)).toBe(1);
    expect(maxPoachableCount(9)).toBe(1);
  });

  it('caps at 10% for large rosters and at the absolute per-offer ceiling', () => {
    expect(maxPoachableCount(50)).toBe(Math.floor(50 * POACH_MAX_FRACTION));
    expect(maxPoachableCount(100)).toBe(10);
    expect(maxPoachableCount(10_000)).toBe(POACH_MAX_CREW_PER_OFFER);
  });
});

describe('M5 O4 — signing bonus & counteroffer math', () => {
  it('bonus = n × salary × 6 months × wageIndex × 1.5 (spec verbatim)', () => {
    const engineer = WORKER_MAP.get('engineer')!;
    const bonus = computeSigningBonus('engineer', 3, 1.2);
    expect(bonus).toBe(Math.round(3 * engineer.salary * POACH_SIGNING_BONUS_MONTHS * 1.2 * POACH_BONUS_PREMIUM));
  });

  it('wage index is clamped into the labor-market band before pricing', () => {
    const atMax = computeSigningBonus('miner', 2, 99);
    const atCap = computeSigningBonus('miner', 2, WAGE_INDEX_MAX);
    expect(atMax).toBe(atCap);
    const atMin = computeSigningBonus('miner', 2, 0.01);
    expect(atMin).toBe(computeSigningBonus('miner', 2, WAGE_INDEX_MIN));
  });

  it('degenerate inputs price to zero (route rejects them upstream)', () => {
    expect(computeSigningBonus('engineer', 0, 1)).toBe(0);
    expect(computeSigningBonus('engineer', -3, 1)).toBe(0);
  });

  it('retention costs exactly 75% of the bonus', () => {
    expect(POACH_COUNTEROFFER_MATCH_FRACTION).toBe(0.75);
    expect(computeRetentionCost(1_000_000)).toBe(750_000);
    expect(computeRetentionCost(0)).toBe(0);
    expect(computeRetentionCost(-5)).toBe(0);
  });

  it('a defended raid still cost the attacker something (fee never refunded)', () => {
    expect(POACH_ACTION_FEE).toBeGreaterThan(0);
  });

  it('the spec\'s loop timings hold: 48h counter window, 30d target cooldown', () => {
    expect(POACH_COUNTEROFFER_WINDOW_MS).toBe(48 * 60 * 60 * 1000);
    expect(POACH_TARGET_COOLDOWN_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('M5 O4 — detection (a reason to hire security)', () => {
  it('target security raises attribution; attacker security crew lower it', () => {
    const base = computePoachDetectionChance(0, 0);
    expect(computePoachDetectionChance(0, 10)).toBeGreaterThan(base);
    expect(computePoachDetectionChance(20, 0)).toBeLessThan(base);
  });

  it('is clamped to [0.15, 0.95] — never certain, never impossible', () => {
    // Security-crew laundering itself clamps at 30 heads (0.5 − 0.3 = 0.2),
    // so even an absurd security payroll can't reach the 0.15 hard floor.
    expect(computePoachDetectionChance(1000, 0)).toBe(0.2);
    expect(computePoachDetectionChance(0, 1000)).toBeLessThanOrEqual(0.95);
    for (const [a, t] of [[0, 0], [30, 10], [5, 3]] as const) {
      const p = computePoachDetectionChance(a, t);
      expect(p).toBeGreaterThanOrEqual(0.15);
      expect(p).toBeLessThanOrEqual(0.95);
    }
  });
});

describe('M5 O4 — self-limiting wage bump', () => {
  it('each poached head adds +0.02 to the type\'s global index', () => {
    expect(applyPoachWageBump(1.0, 5)).toBeCloseTo(1.0 + 5 * POACH_WAGE_BUMP_PER_CREW, 10);
  });

  it('never exceeds the wage-index cap (poaching wars saturate, not explode)', () => {
    expect(applyPoachWageBump(1.55, 25)).toBe(WAGE_INDEX_MAX);
    expect(applyPoachWageBump(WAGE_INDEX_MAX, 1)).toBe(WAGE_INDEX_MAX);
  });

  it('handles bad inputs without dropping below the floor', () => {
    expect(applyPoachWageBump(NaN, 0)).toBeGreaterThanOrEqual(WAGE_INDEX_MIN);
    expect(applyPoachWageBump(0, 0)).toBe(WAGE_INDEX_MIN);
  });
});

describe('M5 [FRONTIER] — server-side immunity proxy (both directions)', () => {
  const now = Date.now();

  it('young + small = protected', () => {
    expect(isServerFrontierProtected(now - 1000, 10_000_000, now)).toBe(true);
  });

  it('past the 30-day window = not protected regardless of size', () => {
    expect(isServerFrontierProtected(now - FRONTIER_DURATION_MS - 1, 10_000_000, now)).toBe(false);
  });

  it('over the hard net-worth cap = not protected regardless of age', () => {
    expect(isServerFrontierProtected(now - 1000, FRONTIER_HARD_CAP_NET_WORTH, now)).toBe(false);
  });

  it('garbage createdAt fails open to unprotected only for NaN (never throws)', () => {
    expect(isServerFrontierProtected(NaN, 0, now)).toBe(false);
  });
});
