/**
 * Balance Pass 9 (docs/BALANCE.md "Pass 9", Pass 8 prescription #4) — the
 * quarterly offense-fee-index: poach action fees, freight-toll caps, and
 * cornering/espionage intel-product fees multiply by
 * clamp(worldMedianMonthlyNet / $30M, 1, 50). Factor 1 at relaunch by
 * design — these tests guard the MECHANISM (formula, clamps, fail-soft
 * reads, and each consumer's wiring), not a day-one price change.
 */
// '@/lib/db' is mocked purely so importing fee-index-server.ts (which has a
// top-level `import prisma from '@/lib/db'`) doesn't construct a real
// PrismaClient — this suite only exercises the pure core (same pattern as
// market-share.test.ts).
jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));

import {
  computeFeeIndexFactor, clampFeeIndexFactor, getFeeIndexFactor, applyFeeIndex,
  FEE_INDEX_MEDIAN_REF, FEE_INDEX_FACTOR_MIN, FEE_INDEX_FACTOR_MAX, FEE_INDEX_STALE_MS,
} from '../fee-index';
import { computePoachActionFee, POACH_ACTION_FEE } from '../talent-poaching';
import { getActionCost, FEE_INDEXED_ESPIONAGE_PRODUCTS, ESPIONAGE_ACTIONS } from '../espionage-system';
import type { EspionageActionType } from '../espionage-system';
import { computeMedianMonthlyNet, feeIndexQuarterKey } from '../fee-index-server';

const NOW = 1_755_000_000_000;

describe('computeFeeIndexFactor — clamp(median / $30M, 1, 50)', () => {
  it('ships the exact Pass-8 prescription constants', () => {
    expect(FEE_INDEX_MEDIAN_REF).toBe(30_000_000);
    expect(FEE_INDEX_FACTOR_MIN).toBe(1);
    expect(FEE_INDEX_FACTOR_MAX).toBe(50);
  });

  it('factor 1 at (and below) the relaunch-scale median — never a discount', () => {
    expect(computeFeeIndexFactor(0)).toBe(1);
    expect(computeFeeIndexFactor(5_000_000)).toBe(1);
    expect(computeFeeIndexFactor(30_000_000)).toBe(1);
    expect(computeFeeIndexFactor(-10_000_000)).toBe(1);
    expect(computeFeeIndexFactor(NaN)).toBe(1);
  });

  it('scales linearly past the anchor and caps at 50', () => {
    expect(computeFeeIndexFactor(111_500_000)).toBeCloseTo(111.5 / 30, 6); // Pass-8 era-B median ≈ ×3.7
    expect(computeFeeIndexFactor(60_000_000)).toBe(2);
    expect(computeFeeIndexFactor(1e12)).toBe(50);
  });
});

describe('getFeeIndexFactor — the deterministic client read', () => {
  it('fail-soft 1: absent / null / pre-Pass-9 saves', () => {
    expect(getFeeIndexFactor(null, NOW)).toBe(1);
    expect(getFeeIndexFactor(undefined, NOW)).toBe(1);
    expect(getFeeIndexFactor({ feeIndex: null }, NOW)).toBe(1);
    expect(getFeeIndexFactor({ feeIndex: undefined }, NOW)).toBe(1);
  });

  it('reads a fresh snapshot factor, clamped to [1, 50]', () => {
    expect(getFeeIndexFactor({ feeIndex: { factor: 3.7, medianMonthlyNet: 111_500_000, asOf: NOW } }, NOW)).toBe(3.7);
    expect(getFeeIndexFactor({ feeIndex: { factor: 0.5, medianMonthlyNet: 0, asOf: NOW } }, NOW)).toBe(1);
    expect(getFeeIndexFactor({ feeIndex: { factor: 900, medianMonthlyNet: 0, asOf: NOW } }, NOW)).toBe(50);
  });

  it('a stale snapshot degrades to factor 1 — never overcharges an offline player', () => {
    const snap = { feeIndex: { factor: 3.7, medianMonthlyNet: 111_500_000, asOf: NOW - FEE_INDEX_STALE_MS - 1 } };
    expect(getFeeIndexFactor(snap, NOW)).toBe(1);
  });
});

describe('applyFeeIndex / consumer wiring', () => {
  it('applyFeeIndex rounds fee × factor; factor 1 is identity', () => {
    expect(applyFeeIndex(10_000_000, 1)).toBe(10_000_000);
    expect(applyFeeIndex(10_000_000, 3.7)).toBe(37_000_000);
    expect(applyFeeIndex(10_000_000, NaN as unknown as number)).toBe(10_000_000);
  });

  it('clampFeeIndexFactor bounds garbage to [1, 50]', () => {
    expect(clampFeeIndexFactor('x')).toBe(1);
    expect(clampFeeIndexFactor(-5)).toBe(1);
    expect(clampFeeIndexFactor(51)).toBe(50);
    expect(clampFeeIndexFactor(2.5)).toBe(2.5);
  });

  it('computePoachActionFee: base × factor, factor 1 = the pre-Pass-9 fee exactly', () => {
    expect(computePoachActionFee()).toBe(POACH_ACTION_FEE);
    expect(computePoachActionFee(1)).toBe(POACH_ACTION_FEE);
    expect(computePoachActionFee(3.7)).toBe(Math.round(POACH_ACTION_FEE * 3.7));
    expect(computePoachActionFee(1000)).toBe(POACH_ACTION_FEE * 50); // cap
  });

  it('espionage: ONLY the three M5 intel products carry the factor', () => {
    expect(Array.from(FEE_INDEXED_ESPIONAGE_PRODUCTS).sort()).toEqual(
      ['input_dependency_report', 'labor_roster_report', 'pool_share_trend'],
    );
    const nw = 500_000_000;
    for (const id of Object.keys(ESPIONAGE_ACTIONS) as EspionageActionType[]) {
      const base = getActionCost(id, nw);
      const indexed = getActionCost(id, nw, 2);
      if (FEE_INDEXED_ESPIONAGE_PRODUCTS.has(id)) {
        expect(indexed).toBe(Math.round(base * 2));
      } else {
        expect(indexed).toBe(base); // classic actions untouched
      }
      expect(getActionCost(id, nw, 1)).toBe(base); // factor 1 = identity everywhere
    }
  });
});

describe('fee-index-server pure core', () => {
  const GAME_MONTH_MS = 6 * 60 * 60 * 1000;

  it('computeMedianMonthlyNet: per-profile lifetime net ÷ elapsed game-months, median across profiles', () => {
    const profiles = [
      // 10 game-months old, net $300M → $30M/mo
      { totalEarned: 400_000_000, totalSpent: 100_000_000, createdAtMs: NOW - 10 * GAME_MONTH_MS },
      // 10 game-months old, net $100M → $10M/mo
      { totalEarned: 150_000_000, totalSpent: 50_000_000, createdAtMs: NOW - 10 * GAME_MONTH_MS },
      // 10 game-months old, net $600M → $60M/mo
      { totalEarned: 700_000_000, totalSpent: 100_000_000, createdAtMs: NOW - 10 * GAME_MONTH_MS },
    ];
    expect(computeMedianMonthlyNet(profiles, NOW)).toBeCloseTo(30_000_000, 0);
  });

  it('empty population → 0 → factor 1 (relaunch day one)', () => {
    expect(computeMedianMonthlyNet([], NOW)).toBe(0);
    expect(computeFeeIndexFactor(computeMedianMonthlyNet([], NOW))).toBe(1);
  });

  it('quarter key follows the UTC calendar quarter (the LS9 Realignment boundary)', () => {
    expect(feeIndexQuarterKey(Date.UTC(2026, 7, 17))).toBe('2026Q3'); // Aug
    expect(feeIndexQuarterKey(Date.UTC(2026, 9, 1))).toBe('2026Q4');  // Oct
    expect(feeIndexQuarterKey(Date.UTC(2027, 0, 1))).toBe('2027Q1');  // Jan
  });
});
