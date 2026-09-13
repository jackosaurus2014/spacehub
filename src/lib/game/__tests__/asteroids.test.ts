// ─── Asteroid layer + ship roster guards (mining Phase A) ──────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §3, §5; founder rulings 2026-09-12.

import {
  ASTEROID_FIELDS,
  CLAIM_EXPIRY_GAME_MONTHS,
  ORE_RESOURCE_BY_CLASS,
  ORE_RESOURCE_IDS,
  ORE_LOAD_WEIGHT,
  ROCKS_PER_FIELD,
  SURVEY_PROBE_COST,
  UNSURVEYED_YIELD_MULT,
  generateAsteroidCatalog,
  generateFieldRocks,
  getFieldsAtLocation,
  getFieldsForShipTier,
  rockIdFor,
  rollAsteroidIntel,
} from '../asteroids';
import { LOCATION_MAP } from '../solar-system';
import { RESOURCE_MAP, RESOURCES } from '../resources';
import { RESEARCH_MAP } from '../research-tree';
import { SHIPS, SHIP_MAP, getShipDerivedStats } from '../ships';
import { getCargoLoadUnits } from '../cargo-logistics';
import { HUB_CATALOG } from '../hubs';
import { getTabUnlockTier } from '../corporation-tiers';

describe('asteroid fields', () => {
  it('five fields, each a child of an existing location, with a class mix that sums to 1', () => {
    expect(ASTEROID_FIELDS).toHaveLength(5);
    for (const f of ASTEROID_FIELDS) {
      expect(LOCATION_MAP.has(f.parentLocationId)).toBe(true);
      const sum = Object.values(f.classMix).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
      expect(f.reserveRange[0]).toBeLessThan(f.reserveRange[1]);
      expect(getFieldsAtLocation(f.parentLocationId)).toContain(f);
    }
    expect(ASTEROID_FIELDS.map(f => f.parentLocationId)).toEqual(['lunar_orbit', 'asteroid_belt', 'ceres_surface', 'jupiter_system', 'outer_system']);
    expect(ASTEROID_FIELDS.filter(f => f.frontier).map(f => f.id)).toEqual(['field_near_earth']);
  });
  it('the hull-tier ladder opens fields progressively', () => {
    expect(getFieldsForShipTier(1).map(f => f.id)).toEqual(['field_near_earth']);
    expect(getFieldsForShipTier(2).map(f => f.id)).toEqual(['field_near_earth', 'field_inner_belt', 'field_ceres']);
    expect(getFieldsForShipTier(4)).toHaveLength(5);
  });
});

describe('catalogue', () => {
  it('is deterministic per epoch, ~40 rocks per field, stable ids, catalogue-style names', () => {
    const a = generateAsteroidCatalog(2);
    const b = generateAsteroidCatalog(2);
    expect(a).toEqual(b);
    expect(a).toHaveLength(ASTEROID_FIELDS.length * ROCKS_PER_FIELD);
    expect(ROCKS_PER_FIELD).toBe(40);
    expect(new Set(a.map(r => r.id)).size).toBe(a.length);
    expect(a[0].id).toBe(rockIdFor(2, 'field_near_earth', 1));
    for (const r of a) {
      expect(r.name).toMatch(/^\d{4} [A-Z]{2}-\d{1,2}$/);
      expect(['C', 'S', 'M', 'X']).toContain(r.class);
      expect(r.positionSeed).toBeGreaterThanOrEqual(0);
      expect(r.positionSeed).toBeLessThan(1);
    }
    expect(generateAsteroidCatalog(3)).not.toEqual(a);
  });
  it('a rock\'s delta-v surcharge varies ±40% around the field base', () => {
    for (const f of ASTEROID_FIELDS) {
      for (const r of generateFieldRocks(f, 2)) {
        expect(r.deltaVExtra).toBeGreaterThanOrEqual(Math.floor(f.baseDeltaV * 0.6));
        expect(r.deltaVExtra).toBeLessThanOrEqual(Math.ceil(f.baseDeltaV * 1.4));
      }
    }
  });
  it('the Frontier field has no exotic rocks and the class mix roughly follows the weights', () => {
    const ne = generateFieldRocks(ASTEROID_FIELDS[0], 2);
    expect(ne.filter(r => r.class === 'X')).toHaveLength(0);
    expect(ne.filter(r => r.class === 'C').length).toBeGreaterThan(ROCKS_PER_FIELD * 0.4);
  });
  it('hidden intel is salted, in the doc\'s bands, and Frontier risk is capped', () => {
    const rock = generateFieldRocks(ASTEROID_FIELDS[0], 2)[0];
    const a = rollAsteroidIntel(rock, 'salt-a');
    const b = rollAsteroidIntel(rock, 'salt-b');
    expect(a).toEqual(rollAsteroidIntel(rock, 'salt-a'));
    expect(a).not.toEqual(b);
    for (const f of ASTEROID_FIELDS) {
      for (const r of generateFieldRocks(f, 2)) {
        const i = rollAsteroidIntel(r, 'x');
        expect(i.grade).toBeGreaterThanOrEqual(0.3);
        expect(i.grade).toBeLessThanOrEqual(1.5);
        expect(i.reserve).toBeGreaterThanOrEqual(f.reserveRange[0]);
        expect(i.reserve).toBeLessThanOrEqual(f.reserveRange[1]);
        expect(i.risk).toBeLessThanOrEqual(f.frontier ? 0.2 : 0.65);
      }
    }
  });
});

describe('founder rulings (2026-09-12)', () => {
  it('ore is a real resource per spectral class, in RESOURCES and on the market roster', () => {
    for (const cls of ['C', 'S', 'M', 'X'] as const) {
      const id = ORE_RESOURCE_BY_CLASS[cls];
      expect(ORE_RESOURCE_IDS).toContain(id);
      const def = RESOURCE_MAP.get(id);
      expect(def).toBeDefined();
      expect(def!.category).toBe('ore');
      expect(RESOURCES.some(r => r.id === id)).toBe(true);
    }
    expect(RESOURCE_MAP.get('ore_silicate')!.baseMarketPrice).toBeLessThan(RESOURCE_MAP.get('ore_carbonaceous')!.baseMarketPrice);
    expect(RESOURCE_MAP.get('ore_metallic')!.baseMarketPrice).toBeLessThan(RESOURCE_MAP.get('ore_exotic')!.baseMarketPrice);
  });
  it('ore is bulk: ORE_LOAD_WEIGHT against any hold', () => {
    expect(getCargoLoadUnits('transport', { ore_silicate: 800 })).toBe(800 * ORE_LOAD_WEIGHT);
    expect(getCargoLoadUnits('transport', { iron: 800 })).toBe(800);
  });
  it('the named constants', () => {
    expect(UNSURVEYED_YIELD_MULT).toBe(0.15);
    expect(CLAIM_EXPIRY_GAME_MONTHS).toBe(3);
    expect(SURVEY_PROBE_COST).toBeGreaterThan(0);
  });
});

describe('ship roster (Phase A)', () => {
  it('enumerates the roster: the fourteen originals plus the Prospector Barge and the Hauler', () => {
    expect(SHIPS.map(s => s.id).sort()).toEqual([
      'asteroid_miner', 'cargo_shuttle', 'colony_ark', 'deep_space_miner', 'fleet_tender', 'freighter', 'fuel_tanker',
      'hauler', 'heavy_transport', 'mining_drone', 'ore_harvester', 'prospector_barge', 'prospector_drone',
      'servicer_tug', 'starfarer_explorer', 'survey_probe',
    ]);
    expect(SHIP_MAP.size).toBe(SHIPS.length);
  });
  it('every hull has a real research gate, positive cost, a tier, and derived stats', () => {
    for (const s of SHIPS) {
      for (const r of s.requiredResearch) expect(RESEARCH_MAP.has(r)).toBe(true);
      expect(s.baseCost).toBeGreaterThan(0);
      expect(s.tier).toBeGreaterThanOrEqual(1);
      expect(s.buildTimeSeconds).toBeGreaterThan(0);
      expect(getShipDerivedStats(s).deltaVBudget).toBeGreaterThan(0);
      for (const res of Object.keys(s.resourceCost)) expect(RESOURCE_MAP.has(res as never)).toBe(true);
    }
  });
  it('Prospector Barge: T2 mining + survey hull gated on resource_prospecting', () => {
    const b = SHIP_MAP.get('prospector_barge')!;
    expect(b).toMatchObject({ role: 'mining', tier: 2, survey: true, cargoCapacity: 200, requiredResearch: ['resource_prospecting'] });
    expect(b.oreExtractionPerHour).toBe(50);
  });
  it('Hauler: T2 transport, 800-unit hold, no extraction gear', () => {
    const h = SHIP_MAP.get('hauler')!;
    expect(h).toMatchObject({ role: 'transport', tier: 2, cargoCapacity: 800 });
    expect(h.oreExtractionPerHour).toBeUndefined();
    expect(h.survey).toBeUndefined();
    expect(getShipDerivedStats(h).deltaVBudget).toBeLessThan(getShipDerivedStats(SHIP_MAP.get('freighter')!).deltaVBudget);
  });
  it('every existing miner can take a Mining Order (extraction rate authored)', () => {
    for (const id of ['prospector_drone', 'mining_drone', 'ore_harvester', 'asteroid_miner', 'deep_space_miner']) {
      expect(SHIP_MAP.get(id)!.oreExtractionPerHour).toBeGreaterThan(0);
    }
  });
});

describe('Mining tab registration', () => {
  it('lives under Build & Fleet, after Fleet, at the Fleet tier', () => {
    const build = HUB_CATALOG.find(h => h.id === 'build')!;
    const ids = build.subViews.map(v => v.id);
    expect(ids.indexOf('mining')).toBe(ids.indexOf('fleet') + 1);
    const entry = build.subViews.find(v => v.id === 'mining')!;
    expect(entry).toMatchObject({ tab: 'mining', icon: 'mining' });
    expect(getTabUnlockTier('mining')).toBe(getTabUnlockTier('fleet'));
  });
});
