/**
 * @jest-environment node
 */
// Wave E2 "One Price Truth" (docs/ECONOMY_PVP_2026-08.md §2.5) — the spot
// engine and the surfaces that route through it.
import {
  computeSpotPrice,
  clampSpotToBand,
  getSpotPrice,
  spotDeviation,
  buildMarketSnapshot,
} from '../spot-price';
import { computeNpcMakerQuote, computeNpcMakerSpreadHalf } from '../market-engine';
import { calculateMPP } from '../mega-projects';
import { npcSettlePrice } from '../npc-engine';
import { RESOURCE_MAP } from '../resources';

const iron = RESOURCE_MAP.get('iron')!; // base 5,000, min 1,000, max 50,000

describe('spot-price — computeSpotPrice', () => {
  it('is deterministic for the same inputs', () => {
    const args = { currentPrice: 6200, basePrice: 5000, minPrice: 1000, maxPrice: 50000 };
    expect(computeSpotPrice(args)).toBe(computeSpotPrice(args));
  });

  it('uses currentPrice when no fill, last fill when present', () => {
    expect(computeSpotPrice({ currentPrice: 6000, basePrice: 5000, minPrice: 1000, maxPrice: 50000 })).toBe(6000);
    expect(computeSpotPrice({ currentPrice: 6000, basePrice: 5000, minPrice: 1000, maxPrice: 50000, lastFillPrice: 5500 })).toBe(5500);
  });

  it('falls back to base when currentPrice is invalid', () => {
    expect(computeSpotPrice({ currentPrice: 0, basePrice: 5000, minPrice: 1000, maxPrice: 50000 })).toBe(5000);
    expect(computeSpotPrice({ currentPrice: NaN, basePrice: 5000, minPrice: 1000, maxPrice: 50000 })).toBe(5000);
  });

  it('band-clamps to base×0.3 .. base×3.0 (anti-cornering)', () => {
    // Way above 3× base → clamped to 15,000 (base 5000 × 3).
    expect(computeSpotPrice({ currentPrice: 999_999, basePrice: 5000, minPrice: 1000, maxPrice: 50000 })).toBe(15000);
    // Way below 0.3× base → clamped to 1,500 (base 5000 × 0.3).
    expect(computeSpotPrice({ currentPrice: 1, basePrice: 5000, minPrice: 1000, maxPrice: 50000 })).toBe(1500);
  });

  it('band is further intersected with hard min/max', () => {
    // base 5000 × 0.3 = 1500 but hard min 2000 → floor is 2000.
    expect(clampSpotToBand(1, 5000, 2000, 50000)).toBe(2000);
    // base 5000 × 3 = 15000 but hard max 9000 → ceil is 9000.
    expect(clampSpotToBand(999999, 5000, 1000, 9000)).toBe(9000);
  });
});

describe('spot-price — getSpotPrice / snapshot', () => {
  it('reads present slugs and falls back otherwise', () => {
    const snap = { prices: { iron: 6000 }, asOf: 1 };
    expect(getSpotPrice(snap, 'iron')).toBe(6000);
    expect(getSpotPrice(snap, 'gold')).toBeNull();
    expect(getSpotPrice(snap, 'gold', 12345)).toBe(12345);
    expect(getSpotPrice(null, 'iron', 999)).toBe(999);
  });

  it('spotDeviation computes fractional drift from base', () => {
    expect(spotDeviation(6000, 5000)).toBeCloseTo(0.2, 5);
    expect(spotDeviation(4000, 5000)).toBeCloseTo(-0.2, 5);
    expect(spotDeviation(6000, 0)).toBe(0);
  });

  it('buildMarketSnapshot round-trips rows to band-clamped spot + base', () => {
    const snap = buildMarketSnapshot([
      { slug: 'iron', currentPrice: 6000, basePrice: 5000, minPrice: 1000, maxPrice: 50000 },
      { slug: 'gold', currentPrice: 99_999_999, basePrice: 300_000, minPrice: 80_000, maxPrice: 3_000_000 },
    ], 42);
    expect(snap.asOf).toBe(42);
    expect(snap.prices.iron).toBe(6000);
    expect(snap.base!.iron).toBe(5000);
    // Gold clamped to base×3 = 900,000.
    expect(snap.prices.gold).toBe(900_000);
    // What the client reads back is exactly what was built.
    expect(getSpotPrice(snap, 'iron')).toBe(6000);
  });
});

describe('spot-price — NPC maker quotes (inventory-aware spread)', () => {
  it('spread widens linearly from 6% to 16% as cap fills', () => {
    expect(computeNpcMakerSpreadHalf(0)).toBeCloseTo(0.06, 5);
    expect(computeNpcMakerSpreadHalf(0.5)).toBeCloseTo(0.11, 5);
    expect(computeNpcMakerSpreadHalf(1)).toBeCloseTo(0.16, 5);
    // Clamped out of range.
    expect(computeNpcMakerSpreadHalf(5)).toBeCloseTo(0.16, 5);
    expect(computeNpcMakerSpreadHalf(-2)).toBeCloseTo(0.06, 5);
  });

  it('quotes around live spot, not base, and band-clamps', () => {
    // Spot 6000 (base 5000), untouched cap → ±6%.
    const q = computeNpcMakerQuote({ spotPrice: 6000, basePrice: 5000, minPrice: 1000, maxPrice: 50000, capUsedFraction: 0 });
    expect(q.bid).toBe(Math.round(6000 * 0.94)); // 5640
    expect(q.ask).toBe(Math.round(6000 * 1.06)); // 6360
    expect(q.bid).toBeLessThan(q.ask);
  });

  it('a filled cap widens the spread (bounds cornering)', () => {
    const tight = computeNpcMakerQuote({ spotPrice: 6000, basePrice: 5000, minPrice: 1000, maxPrice: 50000, capUsedFraction: 0 });
    const wide = computeNpcMakerQuote({ spotPrice: 6000, basePrice: 5000, minPrice: 1000, maxPrice: 50000, capUsedFraction: 1 });
    expect(wide.ask - wide.bid).toBeGreaterThan(tight.ask - tight.bid);
  });

  it('never quotes outside the base band even at extreme spot', () => {
    const q = computeNpcMakerQuote({ spotPrice: 40_000, basePrice: 5000, minPrice: 1000, maxPrice: 50000, capUsedFraction: 1 });
    expect(q.ask).toBeLessThanOrEqual(15000); // base×3
    expect(q.bid).toBeGreaterThanOrEqual(1500); // base×0.3
  });
});

describe('spot-price — mega-project contribution valued at spot', () => {
  it('values resources at base when no override', () => {
    const mpp = calculateMPP(0, { iron: 10 });
    expect(mpp).toBe(10 * iron.baseMarketPrice * 1.5);
  });

  it('values resources at spot override (contribute-during-glut earns less)', () => {
    const glutSpot = Math.round(iron.baseMarketPrice * 0.5);
    const mppGlut = calculateMPP(0, { iron: 10 }, { iron: glutSpot });
    const mppBase = calculateMPP(0, { iron: 10 });
    expect(mppGlut).toBe(10 * glutSpot * 1.5);
    expect(mppGlut).toBeLessThan(mppBase);
  });

  it('cash contribution is unaffected by spot', () => {
    expect(calculateMPP(1_000_000, {}, { iron: 1 })).toBe(1_000_000);
  });
});

describe('spot-price — NPC settlement at spot', () => {
  it('prefers live spot, falls back to base map', () => {
    expect(npcSettlePrice('iron', { iron: 7000 })).toBe(7000);
    expect(npcSettlePrice('iron', {})).toBe(5000); // fallback map
    expect(npcSettlePrice('iron')).toBe(5000);
    expect(npcSettlePrice('unknown_res')).toBe(5000); // default
    expect(npcSettlePrice('iron', { iron: 0 })).toBe(5000); // invalid spot ignored
  });
});
