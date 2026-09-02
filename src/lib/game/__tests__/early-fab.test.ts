import { BUILDINGS, BUILDING_MAP, checkBuildingCap } from '../buildings';
import { PRODUCTION_CHAINS, CHAIN_MAP, canFabricate } from '../production-chains';
import { ORBITAL_SLOT_POOLS, ORBITAL_SLOT_MAP, getCongestionMaintenanceMultiplier } from '../spatial-strategy';
import { computeMinBid } from '../orbital-slot-auctions';
import { SERVICE_MAP } from '../services';
import type { GameState } from '../types';

// Early-fab wave (2026-08-31): Jay's ruling — satellite buses and rocket
// fuel must be makeable early (Earth fab capped at 1/corp) and LEO/GEO must
// congest. docs/BALANCE.md "Early-fab wave".
describe('early-fab wave', () => {
  const earthFab = BUILDING_MAP.get('fabrication_earth')!;

  describe('per-corporation building cap', () => {
    it('fabrication_earth is capped at one per corporation', () => {
      expect(earthFab.maxPerPlayer).toBe(1);
    });
    it('blocks a second copy — under-construction counts too', () => {
      expect(checkBuildingCap([], earthFab).allowed).toBe(true);
      expect(checkBuildingCap([{ definitionId: 'fabrication_earth' }], earthFab).allowed).toBe(false);
      expect(checkBuildingCap([{ definitionId: 'fabrication_earth' }], earthFab).reason).toMatch(/one .* per corporation/i);
      // a different building never trips the cap
      expect(checkBuildingCap([{ definitionId: 'ground_station' }], earthFab).allowed).toBe(true);
    });
    it('uncapped definitions are unaffected', () => {
      const gs = BUILDING_MAP.get('ground_station')!;
      expect(checkBuildingCap(Array(50).fill({ definitionId: 'ground_station' }), gs).allowed).toBe(true);
    });
  });

  describe('day-one recipes at the Terrestrial Fabrication Works', () => {
    const earthOnly = [{ definitionId: 'fabrication_earth', isComplete: true }];
    it('synthesize_rp1 needs no research and runs at the Earth fab', () => {
      const r = CHAIN_MAP.get('synthesize_rp1')!;
      expect(r.requiredResearch).toEqual([]);
      expect(r.outputId).toBe('rocket_fuel');
      expect(canFabricate(r, earthOnly, BUILDING_MAP)).toBe(true);
      // worse yield than the lunar-water route — no dominant strategy
      const water = CHAIN_MAP.get('crack_water_fuel')!;
      expect(r.outputQuantity).toBeLessThan(water.outputQuantity);
    });
    it('terrestrial satellite bus runs at the Earth fab behind one tier-1 research', () => {
      const r = CHAIN_MAP.get('assemble_satellite_bus_terrestrial')!;
      expect(r.outputId).toBe('satellite_bus');
      expect(r.tier).toBe(2); // facilityTierFor(2) = 1 → Earth fab qualifies
      expect(r.requiredResearch).toEqual(['electric_propulsion_sat']);
      expect(canFabricate(r, earthOnly, BUILDING_MAP)).toBe(true);
      // pricier and slower than the efficient T3 component chain
      const efficient = CHAIN_MAP.get('make_satellite_bus')!;
      expect(r.timeSeconds).toBeGreaterThan(efficient.timeSeconds);
    });
  });

  describe('LEO congestion', () => {
    it('LEO is a slot pool with a real auction floor', () => {
      expect(ORBITAL_SLOT_MAP.has('leo')).toBe(true);
      expect(ORBITAL_SLOT_MAP.get('leo')!.totalSlots).toBeGreaterThan(ORBITAL_SLOT_MAP.get('geo')!.totalSlots);
      expect(computeMinBid('leo')).toBeGreaterThanOrEqual(10_000_000);
      // every pool id is unique (resolve cron iterates this array)
      expect(new Set(ORBITAL_SLOT_POOLS.map(p => p.locationId)).size).toBe(ORBITAL_SLOT_POOLS.length);
    });
    it('congestion maintenance multiplier follows PHYSICAL server occupancy (count), not the lease-gate label', () => {
      // LEO has 240 slots: 25% = 60, 60% = 144, 85% = 204.
      const mk = (occupiedCount?: number, bucket = 'low') => ({
        orbitalSlotOccupancy: occupiedCount !== undefined ? { leo: { occupiedCount, bucket } } : null,
      } as unknown as GameState);
      expect(getCongestionMaintenanceMultiplier(mk(), 'earth_surface')).toBe(1); // not a pool
      expect(getCongestionMaintenanceMultiplier(mk(), 'leo')).toBe(1);            // never synced
      expect(getCongestionMaintenanceMultiplier(mk(0), 'leo')).toBe(1);
      expect(getCongestionMaintenanceMultiplier(mk(60), 'leo')).toBe(1.1);
      expect(getCongestionMaintenanceMultiplier(mk(144), 'leo')).toBe(1.25);
      expect(getCongestionMaintenanceMultiplier(mk(204), 'leo')).toBe(1.5);
      // D6: a pool the resolve cron marked 'saturated' on RELATIVE grounds
      // (lease-gated at 40%) pays its physical congestion rate, not 1.5×.
      expect(getCongestionMaintenanceMultiplier(mk(96, 'saturated'), 'leo')).toBe(1.1);
      // Pre-D6 snapshot shape (no count) still honours the stored bucket.
      const legacy = { orbitalSlotOccupancy: { leo: { bucket: 'saturated' } } } as unknown as GameState;
      expect(getCongestionMaintenanceMultiplier(legacy, 'leo')).toBe(1.5);
    });
  });

  describe('GEO datacenter', () => {
    it('exists in the contested GEO pool with a wired service', () => {
      const dc = BUILDING_MAP.get('datacenter_geo')!;
      expect(dc.requiredLocation).toBe('geo');
      expect(dc.consumesPerMonth?.satellite_bus).toBeGreaterThan(0);
      const svc = SERVICE_MAP.get('svc_ai_datacenter_geo')!;
      expect(svc).toBeTruthy();
      expect(svc.requiredBuildings).toContain('datacenter_geo');
      expect(svc.revenuePerMonth).toBeGreaterThan(svc.operatingCostPerMonth);
    });
  });

  it('exactly one extra recipe per early good (bus x2 routes, fuel x3)', () => {
    expect(PRODUCTION_CHAINS.filter(r => r.outputId === 'satellite_bus').length).toBe(2);
    expect(PRODUCTION_CHAINS.filter(r => r.outputId === 'rocket_fuel').length).toBe(3);
  });
});
