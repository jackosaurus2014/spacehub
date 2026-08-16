/**
 * @jest-environment node
 */
// Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 7 "Realignment
// postures bite"): tariffStanceMultiplier application bounds, and the
// resource -> governing-faction resolution the trade route's
// STANDING_BROKER_MODIFIER wiring depends on.

import { getGoverningFactionForResource, computeTariffFeeRate, TARIFF_FEE_RATE_BOUND, FACTION_FLAVOR } from '../delivery-contracts';
import { getFactionStandingBrokerModifier, STANDING_BROKER_MODIFIER, FACTIONS } from '../factions';
import { getEffectiveBrokerFeeRate, MARKET_BROKER_FEE_RATE } from '../market-engine';
import { POSTURE_BAND_MIN, POSTURE_BAND_MAX } from '../realignment';

describe('getGoverningFactionForResource', () => {
  it('resolves a resource to the faction that prefers it', () => {
    expect(getGoverningFactionForResource('iron')).toBe('the-dominion');
  });

  it('every FACTION_FLAVOR.preferredResources entry resolves back to that faction', () => {
    for (const faction of FACTIONS) {
      for (const resourceId of FACTION_FLAVOR[faction.id].preferredResources) {
        // First-match order: only assert consistency for resources not
        // claimed earlier in FACTIONS order (some overlap is expected/fine —
        // this checks the function never returns something that DOESN'T
        // prefer the resource).
        const resolved = getGoverningFactionForResource(resourceId);
        expect(resolved).not.toBeNull();
        expect(FACTION_FLAVOR[resolved!].preferredResources).toContain(resourceId);
      }
    }
  });

  it('returns null for a resource no faction prefers', () => {
    expect(getGoverningFactionForResource('not_a_real_resource')).toBeNull();
  });
});

describe('computeTariffFeeRate — bounds', () => {
  it('rate is always within [-TARIFF_FEE_RATE_BOUND, TARIFF_FEE_RATE_BOUND]', () => {
    // Sweep several epochs / resources — every faction-governed resource,
    // at any epoch, must stay inside the band.
    for (const faction of FACTIONS) {
      const resource = FACTION_FLAVOR[faction.id].preferredResources[0];
      if (!resource) continue;
      for (let epochProbe = 0; epochProbe < 20; epochProbe++) {
        // Different epochs come from different nowMs — step by a large
        // interval well beyond one realignment epoch's length.
        const nowMs = epochProbe * 1000 * 60 * 60 * 24 * 90;
        const { rate } = computeTariffFeeRate(resource, nowMs);
        expect(rate).toBeGreaterThanOrEqual(-TARIFF_FEE_RATE_BOUND);
        expect(rate).toBeLessThanOrEqual(TARIFF_FEE_RATE_BOUND);
      }
    }
  });

  it('TARIFF_FEE_RATE_BOUND matches realignment.ts POSTURE_BAND width around 1.0', () => {
    expect(TARIFF_FEE_RATE_BOUND).toBeCloseTo(POSTURE_BAND_MAX - 1, 5);
    expect(TARIFF_FEE_RATE_BOUND).toBeCloseTo(1 - POSTURE_BAND_MIN, 5);
  });

  it('a resource with no governing faction has zero tariff and a null factionId', () => {
    const { rate, factionId } = computeTariffFeeRate('not_a_real_resource');
    expect(rate).toBe(0);
    expect(factionId).toBeNull();
  });

  it('is deterministic for a fixed (resource, nowMs) pair', () => {
    const a = computeTariffFeeRate('iron', 12345);
    const b = computeTariffFeeRate('iron', 12345);
    expect(a).toEqual(b);
  });
});

describe('STANDING_BROKER_MODIFIER wiring (getFactionStandingBrokerModifier)', () => {
  it('every standing tier modifier matches the documented table', () => {
    expect(STANDING_BROKER_MODIFIER.allied).toBe(0.15);
    expect(STANDING_BROKER_MODIFIER.friendly).toBe(0.07);
    expect(STANDING_BROKER_MODIFIER.neutral).toBe(0);
    expect(STANDING_BROKER_MODIFIER.unfriendly).toBe(-0.10);
    expect(STANDING_BROKER_MODIFIER.hostile).toBe(-0.25);
  });

  it('rep resolves to the correct modifier at tier boundaries', () => {
    expect(getFactionStandingBrokerModifier(100)).toBe(0.15); // allied
    expect(getFactionStandingBrokerModifier(0)).toBe(0);      // neutral
    expect(getFactionStandingBrokerModifier(-100)).toBe(-0.25); // hostile
  });
});

describe('getEffectiveBrokerFeeRate — factionStandingModifier finally reaches the fee rate', () => {
  it('an allied standing discounts the base fee', () => {
    const rate = getEffectiveBrokerFeeRate({ factionStandingModifier: 0.15 });
    expect(rate).toBeLessThan(MARKET_BROKER_FEE_RATE);
    expect(rate).toBeCloseTo(MARKET_BROKER_FEE_RATE * (1 - 0.15), 6);
  });

  it('a hostile standing surcharges the base fee (rate can exceed base)', () => {
    const rate = getEffectiveBrokerFeeRate({ factionStandingModifier: -0.25 });
    expect(rate).toBeGreaterThan(MARKET_BROKER_FEE_RATE);
    expect(rate).toBeCloseTo(MARKET_BROKER_FEE_RATE * 1.25, 6);
  });

  it('omitting factionStandingModifier is byte-for-byte identical to pre-E7 behavior', () => {
    const withoutArg = getEffectiveBrokerFeeRate({});
    const withZero = getEffectiveBrokerFeeRate({ factionStandingModifier: 0 });
    expect(withoutArg).toBe(withZero);
    expect(withoutArg).toBe(MARKET_BROKER_FEE_RATE);
  });

  it('a bad/out-of-band input can never zero out or invert the fee', () => {
    const rate = getEffectiveBrokerFeeRate({ factionStandingModifier: 99 });
    expect(rate).toBeGreaterThan(0);
    // Clamped to the documented +15% ceiling, not the raw 99.
    expect(rate).toBeCloseTo(MARKET_BROKER_FEE_RATE * (1 - 0.15), 6);
  });
});
