// ─── Meaningful Decisions Wave M3 — mining-pricing.ts tests ─────────────────
// docs/MEANINGFUL_2026-08.md §M3, finding F3 ("mining's cash revenue is
// market-blind"). Covers: the revenue-scale derivation reproduces the old
// flat number at neutral conditions, spot-price sensitivity (band-clamped
// snapshot, base-price fallback), determinism, and the grandfather blend.

import {
  getMiningRevenueScale,
  getMiningSpotPrice,
  priceLinkedMiningRevenue,
  getMiningPriceLinkFraction,
  blendMiningBaseRevenue,
  MINING_PRICE_LINK_PHASE_IN_MONTHS,
  MINING_PRICE_LINK_GRANDFATHER_BLEND,
} from '../mining-pricing';
import { MINING_PRODUCTION, RESOURCE_MAP } from '../resources';
import { SERVICE_MAP } from '../services';
import type { MarketSnapshot } from '../spot-price';

const MINING_SERVICE_IDS = Array.from(SERVICE_MAP.entries())
  .filter(([, def]) => def.type === 'mining_output')
  .map(([id]) => id);

describe('getMiningRevenueScale', () => {
  it('is defined and positive for every mining_output service', () => {
    expect(MINING_SERVICE_IDS.length).toBeGreaterThan(0);
    for (const id of MINING_SERVICE_IDS) {
      const scale = getMiningRevenueScale(id);
      expect(scale).toBeGreaterThan(0);
      expect(Number.isFinite(scale)).toBe(true);
    }
  });

  it('reproduces the exact authored revenuePerMonth at neutral units (amountPerMonth × basePrice)', () => {
    for (const id of MINING_SERVICE_IDS) {
      const def = SERVICE_MAP.get(id)!;
      const production = MINING_PRODUCTION[id] || [];
      const unitsPerResource: Record<string, number> = {};
      for (const { resource, amountPerMonth } of production) unitsPerResource[resource] = amountPerMonth;
      const revenue = priceLinkedMiningRevenue(id, unitsPerResource, undefined);
      expect(revenue).toBeCloseTo(def.revenuePerMonth, 0);
    }
  });

  it('returns 1 (neutral) for a non-mining or unknown definitionId', () => {
    expect(getMiningRevenueScale('svc_telecom_leo')).toBe(1);
    expect(getMiningRevenueScale('not_a_real_service')).toBe(1);
  });

  it('is memoized — repeated calls agree (pure, deterministic)', () => {
    const id = MINING_SERVICE_IDS[0];
    expect(getMiningRevenueScale(id)).toBe(getMiningRevenueScale(id));
  });
});

describe('getMiningSpotPrice', () => {
  const snapshot: MarketSnapshot = { prices: { iron: 9_000 }, asOf: 1000 };

  it('reads the snapshot spot when present', () => {
    expect(getMiningSpotPrice(snapshot, 'iron')).toBe(9_000);
  });

  it('falls back to the authored base price when the snapshot lacks the resource', () => {
    const base = RESOURCE_MAP.get('gold')!.baseMarketPrice;
    expect(getMiningSpotPrice(snapshot, 'gold')).toBe(base);
  });

  it('falls back to the authored base price when there is no snapshot at all (solo/offline)', () => {
    const base = RESOURCE_MAP.get('platinum_group')!.baseMarketPrice;
    expect(getMiningSpotPrice(null, 'platinum_group')).toBe(base);
    expect(getMiningSpotPrice(undefined, 'platinum_group')).toBe(base);
  });

  it('returns 0 for a resource with no authored price and no snapshot entry', () => {
    expect(getMiningSpotPrice(undefined, 'not_a_real_resource')).toBe(0);
  });
});

describe('priceLinkedMiningRevenue', () => {
  it('is proportional to spot: a price crash on the dominant resource cuts mining revenue', () => {
    const svcId = 'svc_mining_asteroid'; // iron/platinum_group/gold/rare_earth/titanium
    const production = MINING_PRODUCTION[svcId];
    const unitsPerResource: Record<string, number> = {};
    for (const { resource, amountPerMonth } of production) unitsPerResource[resource] = amountPerMonth;

    const neutral = priceLinkedMiningRevenue(svcId, unitsPerResource, undefined);
    const crashed: MarketSnapshot = {
      asOf: 1,
      prices: {
        platinum_group: RESOURCE_MAP.get('platinum_group')!.baseMarketPrice * 0.3, // anti-cornering band floor
        gold: RESOURCE_MAP.get('gold')!.baseMarketPrice * 0.3,
      },
    };
    const afterCrash = priceLinkedMiningRevenue(svcId, unitsPerResource, crashed);
    expect(afterCrash).toBeLessThan(neutral);
  });

  it('a shortage-driven price spike raises mining revenue symmetrically', () => {
    const svcId = 'svc_mining_titan'; // methane/ethane
    const production = MINING_PRODUCTION[svcId];
    const unitsPerResource: Record<string, number> = {};
    for (const { resource, amountPerMonth } of production) unitsPerResource[resource] = amountPerMonth;

    const neutral = priceLinkedMiningRevenue(svcId, unitsPerResource, undefined);
    const spiked: MarketSnapshot = {
      asOf: 1,
      prices: {
        methane: RESOURCE_MAP.get('methane')!.baseMarketPrice * 2,
        ethane: RESOURCE_MAP.get('ethane')!.baseMarketPrice * 2,
      },
    };
    const afterSpike = priceLinkedMiningRevenue(svcId, unitsPerResource, spiked);
    expect(afterSpike).toBeGreaterThan(neutral);
  });

  it('extraction-pressure-reduced units (caller-supplied) proportionally reduce revenue', () => {
    const svcId = 'svc_mining_mars';
    const production = MINING_PRODUCTION[svcId];
    const fullUnits: Record<string, number> = {};
    const halfUnits: Record<string, number> = {};
    for (const { resource, amountPerMonth } of production) {
      fullUnits[resource] = amountPerMonth;
      halfUnits[resource] = amountPerMonth * 0.5;
    }
    const full = priceLinkedMiningRevenue(svcId, fullUnits, undefined);
    const half = priceLinkedMiningRevenue(svcId, halfUnits, undefined);
    expect(half).toBeCloseTo(full * 0.5, 0);
  });

  it('is pure — same inputs produce identical output', () => {
    const svcId = 'svc_mining_europa';
    const units = { exotic_materials: 5, lunar_water: 200 };
    const snapshot: MarketSnapshot = { prices: { exotic_materials: 2_100_000 }, asOf: 1 };
    expect(priceLinkedMiningRevenue(svcId, units, snapshot)).toBe(priceLinkedMiningRevenue(svcId, units, snapshot));
  });

  it('ignores zero/undefined unit entries without throwing', () => {
    const svcId = 'svc_mining_lunar';
    expect(() => priceLinkedMiningRevenue(svcId, { lunar_water: 0, helium3: undefined }, undefined)).not.toThrow();
    expect(priceLinkedMiningRevenue(svcId, { lunar_water: 0 }, undefined)).toBe(0);
  });
});

describe('getMiningPriceLinkFraction (§M3 [SAVE] V37 grandfather)', () => {
  it('is full weight (1) for a null/undefined anchor — fresh games', () => {
    expect(getMiningPriceLinkFraction(null, 5)).toBe(1);
    expect(getMiningPriceLinkFraction(undefined, 5)).toBe(1);
  });

  it('is the flat grandfather blend for the first 3 game-months from the anchor', () => {
    expect(getMiningPriceLinkFraction(10, 10)).toBe(MINING_PRICE_LINK_GRANDFATHER_BLEND);
    expect(getMiningPriceLinkFraction(10, 12)).toBe(MINING_PRICE_LINK_GRANDFATHER_BLEND);
  });

  it('switches fully to the new formula once the phase-in window elapses', () => {
    expect(getMiningPriceLinkFraction(10, 10 + MINING_PRICE_LINK_PHASE_IN_MONTHS)).toBe(1);
    expect(getMiningPriceLinkFraction(10, 100)).toBe(1);
  });
});

describe('blendMiningBaseRevenue', () => {
  it('blends 50/50 during the grandfather window', () => {
    const blended = blendMiningBaseRevenue(100, 200, 0, 1);
    expect(blended).toBeCloseTo(150, 6);
  });

  it('is fully the new formula after the window (or for fresh games)', () => {
    expect(blendMiningBaseRevenue(100, 200, 0, 10)).toBeCloseTo(200, 6);
    expect(blendMiningBaseRevenue(100, 200, null, 0)).toBeCloseTo(200, 6);
  });
});
