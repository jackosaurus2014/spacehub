/**
 * Colony-slot claim UI fix (2026-09-03) — pure-function coverage for the
 * two helpers the claim route (colonies/route.ts) and the new "Claim Colony
 * Slot" affordance (MapContextPanel.tsx's ClaimColonyBlock) both read:
 * getColonyClaimCost and getColonyMaxSlots. See docs/BALANCE.md "the five
 * money sinks" for why every claimable location must return a non-null,
 * non-zero cost.
 */
import {
  getColonyClaimCost,
  getColonyMaxSlots,
  BASE_LOCATION_CLAIM_COSTS,
  EXPANDED_LOCATIONS,
} from '@/lib/game/colonies';

describe('getColonyClaimCost', () => {
  it('returns the base-location fee for a base solar-system location (LEO)', () => {
    expect(getColonyClaimCost('leo')).toBe(100_000_000);
  });

  it('returns the expanded-body claimCost for Pluto — the top of the scale', () => {
    expect(getColonyClaimCost('pluto_surface')).toBe(5_000_000_000);
  });

  it('scales up with distance/tier: LEO is cheaper than Pluto', () => {
    const leo = getColonyClaimCost('leo')!;
    const pluto = getColonyClaimCost('pluto_surface')!;
    expect(leo).toBeGreaterThan(0);
    expect(pluto).toBeGreaterThan(leo);
  });

  it('returns null for earth_surface (never claimable — the home base)', () => {
    expect(getColonyClaimCost('earth_surface')).toBeNull();
  });

  it('returns null for an unknown/made-up location id', () => {
    expect(getColonyClaimCost('nonexistent_body')).toBeNull();
  });

  it('every base-location claim cost is a positive, non-zero burn', () => {
    for (const [id, cost] of Object.entries(BASE_LOCATION_CLAIM_COSTS)) {
      expect(cost).toBeGreaterThan(0);
      expect(getColonyClaimCost(id)).toBe(cost);
    }
  });

  it('every expanded colony body has a positive claimCost matching getColonyClaimCost', () => {
    for (const loc of EXPANDED_LOCATIONS) {
      expect(loc.claimCost).toBeGreaterThan(0);
      expect(getColonyClaimCost(loc.id)).toBe(loc.claimCost);
    }
  });
});

describe('getColonyMaxSlots', () => {
  it('returns the finite cap for an expanded colony body (Pluto: 5 — the tightest slot cap in the game)', () => {
    expect(getColonyMaxSlots('pluto_surface')).toBe(5);
  });

  it('returns the finite cap for Ceres (a major hub: 100)', () => {
    expect(getColonyMaxSlots('ceres_surface')).toBe(100);
  });

  it('returns 999 (uncapped) for a base solar-system location', () => {
    expect(getColonyMaxSlots('leo')).toBe(999);
    expect(getColonyMaxSlots('mars_surface')).toBe(999);
  });

  it('returns 999 (uncapped) for an unknown id, same as "not scarce"', () => {
    expect(getColonyMaxSlots('nonexistent_body')).toBe(999);
  });

  it('every expanded colony body has a maxColonySlots below the 999 "unlimited" sentinel', () => {
    for (const loc of EXPANDED_LOCATIONS) {
      expect(loc.maxColonySlots).toBeGreaterThan(0);
      expect(loc.maxColonySlots).toBeLessThan(999);
      expect(getColonyMaxSlots(loc.id)).toBe(loc.maxColonySlots);
    }
  });
});
