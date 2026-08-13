// ─── Audit A6 / hotlist #2: futures strike-price band enforcement ────────────
// Before this fix a short at a fantasy strike (e.g. $50M vs iron's $5K spot)
// paid quantity × (strike − spot) at settlement — an infinite money printer,
// entirely client-side. openFutures now refuses strikes outside the same
// price band the server order book enforces.

import { validatePriceBand, validateFuturesStrike, PRICE_BAND_LOW, PRICE_BAND_HIGH } from '../price-band';
import { openFutures, checkFuturesStrike, computeMargin, settleFutures } from '../market-depth';
import { computeDailyBonusClaim } from '../daily-bonus';
import type { GameState } from '../types';

// Iron: baseMarketPrice 5_000, minPrice 1_000, maxPrice 50_000
const IRON_BASE = 5_000;

function minimalState(money = 10_000_000_000): GameState {
  return {
    money,
    totalEarned: 0,
    totalSpent: 0,
    resources: {},
    futuresContracts: [],
  } as unknown as GameState;
}

describe('validatePriceBand', () => {
  it('accepts prices inside [ref×0.3, ref×3.0]', () => {
    expect(validatePriceBand(IRON_BASE, IRON_BASE, 1_000, 50_000).valid).toBe(true);
    expect(validatePriceBand(Math.round(IRON_BASE * PRICE_BAND_LOW), IRON_BASE, 1_000, 50_000).valid).toBe(true);
    expect(validatePriceBand(IRON_BASE * PRICE_BAND_HIGH, IRON_BASE, 1_000, 50_000).valid).toBe(true);
  });

  it('rejects prices outside the band', () => {
    expect(validatePriceBand(1_400, IRON_BASE, 1_000, 50_000).valid).toBe(false); // < 30%
    expect(validatePriceBand(15_001, IRON_BASE, 1_000, 50_000).valid).toBe(false); // > 300%
  });

  it('clamps the band to hard min/max prices', () => {
    // With minPrice above 30% of base, the min wins
    const band = validatePriceBand(2_000, IRON_BASE, 2_500, 50_000);
    expect(band.min).toBe(2_500);
    expect(band.valid).toBe(false);
  });
});

describe('validateFuturesStrike', () => {
  const iron = { baseMarketPrice: IRON_BASE, minPrice: 1_000, maxPrice: 50_000 };

  it('uses the base price when no spot is known', () => {
    expect(validateFuturesStrike(5_000, iron).valid).toBe(true);
    expect(validateFuturesStrike(50_000_000, iron).valid).toBe(false);
  });

  it('uses the live spot price as reference when provided', () => {
    // Spot has risen to 12_000 → band [3_600, 36_000]
    expect(validateFuturesStrike(30_000, { ...iron, spotPrice: 12_000 }).valid).toBe(true);
    expect(validateFuturesStrike(2_000, { ...iron, spotPrice: 12_000 }).valid).toBe(false);
  });

  it('rejects non-finite and non-positive strikes', () => {
    expect(validateFuturesStrike(0, iron).valid).toBe(false);
    expect(validateFuturesStrike(-100, iron).valid).toBe(false);
    expect(validateFuturesStrike(Number.NaN, iron).valid).toBe(false);
    expect(validateFuturesStrike(Number.POSITIVE_INFINITY, iron).valid).toBe(false);
  });

  it('falls back to base price when the provided spot is garbage', () => {
    expect(validateFuturesStrike(5_000, { ...iron, spotPrice: Number.NaN }).valid).toBe(true);
    expect(validateFuturesStrike(5_000, { ...iron, spotPrice: 0 }).valid).toBe(true);
  });
});

describe('openFutures strike clamp (the $55B exploit)', () => {
  it('refuses the audit exploit: short iron at a $50M strike', () => {
    const state = minimalState();
    const next = openFutures(state, {
      resourceSlug: 'iron',
      quantity: 1_000,
      strikePrice: 50_000_000,
      direction: 'short',
      expiresAtMs: Date.now() + 6 * 3600_000,
    });
    expect(next).toBe(state); // state unchanged — contract refused
    expect(next.futuresContracts).toHaveLength(0);
  });

  it('accepts an in-band strike and locks margin', () => {
    const state = minimalState();
    const next = openFutures(state, {
      resourceSlug: 'iron',
      quantity: 100,
      strikePrice: 6_000,
      direction: 'long',
      expiresAtMs: Date.now() + 6 * 3600_000,
    });
    expect(next.futuresContracts).toHaveLength(1);
    expect(next.money).toBe(state.money - computeMargin(100, 6_000));
  });

  it('refuses zero/negative/non-finite quantities', () => {
    const state = minimalState();
    for (const quantity of [0, -5, Number.NaN]) {
      const next = openFutures(state, {
        resourceSlug: 'iron', quantity, strikePrice: 5_000,
        direction: 'long', expiresAtMs: Date.now() + 1000,
      });
      expect(next).toBe(state);
    }
  });

  it('tightens the band around the live spot when supplied', () => {
    const state = minimalState();
    // Spot crashed to 1_667 → band max = min(50_000, 1_667×3) ≈ 5_001; a
    // 14_999 strike (fine vs base) is now out of band vs spot.
    const next = openFutures(state, {
      resourceSlug: 'iron', quantity: 100, strikePrice: 14_999,
      direction: 'short', expiresAtMs: Date.now() + 1000, spotPrice: 1_667,
    });
    expect(next).toBe(state);
  });

  it('checkFuturesStrike rejects unknown resources', () => {
    expect(checkFuturesStrike('unobtainium' as never, 5_000).valid).toBe(false);
  });

  it('worst-case in-band settlement is bounded (no infinite printer)', () => {
    const state = minimalState();
    const opened = openFutures(state, {
      resourceSlug: 'iron', quantity: 1_000, strikePrice: 15_000, // band max
      direction: 'short', expiresAtMs: Date.now() + 1000,
    });
    const contract = opened.futuresContracts![0];
    // Settle at the band floor — the best possible short outcome
    const settled = settleFutures(opened, contract.id, 1_500);
    const pnl = settled.futuresContracts!.find(c => c.id === contract.id)!.settlementPnL!;
    // Max profit = qty × (strike − spot) = 1000 × 13_500 = $13.5M — real
    // money, but 3 orders of magnitude below the $55B exploit.
    expect(pnl).toBe(13_500_000);
  });
});

describe('computeDailyBonusClaim (server-side claim tracking, audit A6)', () => {
  const TODAY = '2026-08-13';
  const YESTERDAY = '2026-08-12';

  it('denies a second claim on the same day', () => {
    const r = computeDailyBonusClaim(TODAY, 4, TODAY, YESTERDAY);
    expect(r.claimable).toBe(false);
    expect(r.amount).toBe(0);
    expect(r.newStreak).toBe(4);
  });

  it('continues the streak when last claim was yesterday', () => {
    const r = computeDailyBonusClaim(YESTERDAY, 3, TODAY, YESTERDAY);
    expect(r.claimable).toBe(true);
    expect(r.newStreak).toBe(4);
    expect(r.amount).toBe(50_000_000); // day 4 of the schedule
  });

  it('resets the streak after a missed day', () => {
    const r = computeDailyBonusClaim('2026-08-10', 6, TODAY, YESTERDAY);
    expect(r.claimable).toBe(true);
    expect(r.newStreak).toBe(1);
    expect(r.amount).toBe(10_000_000); // back to day 1
  });

  it('treats a never-claimed profile as day 1', () => {
    const r = computeDailyBonusClaim(null, 0, TODAY, YESTERDAY);
    expect(r.claimable).toBe(true);
    expect(r.newStreak).toBe(1);
    expect(r.amount).toBe(10_000_000);
  });

  it('cycles the schedule after day 7', () => {
    const r = computeDailyBonusClaim(YESTERDAY, 7, TODAY, YESTERDAY);
    expect(r.newStreak).toBe(8);
    expect(r.amount).toBe(10_000_000); // wraps to day 1 amount
  });
});
