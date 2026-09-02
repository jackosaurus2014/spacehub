/**
 * @jest-environment node
 *
 * docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 3 — flow-map.ts pure helpers:
 * aggregation from persisted rows, the chokepoint rule, exporter/importer
 * ranges below the podium, and the null-with-reason posture for flows the
 * server does not persist. '@/lib/db' and 'next/cache' are mocked so the
 * module imports without a PrismaClient; the getFlowMap reader is exercised
 * against a stubbed prisma to check the shape and the `missing[]` contract.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    locationExtraction: { findMany: jest.fn() },
    laneUsage: { findMany: jest.fn() },
    gameLedgerEntry: { findMany: jest.fn() },
    marketFill: { findMany: jest.fn() },
    marketResource: { findMany: jest.fn() },
    gameProfile: { findMany: jest.fn() },
  },
}));
jest.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import {
  percentile,
  quantityRange,
  aggregateProduction,
  aggregateLanes,
  aggregateZoneTolls,
  rankTraders,
  computeNpcShare,
  detectChokepoints,
  clampWindowDays,
  getFlowMap,
  isNpcProfileId,
  FLOW_MAP_EXACT_RANKS,
  FLOW_MAP_TOP_N,
  FLOW_MAP_MISSING,
  type LaneFlowRow,
} from '../flow-map';
import prisma from '@/lib/db';
import { laneKey } from '../trade-lanes';
import { NPC_PROFILE_ID } from '../market-share';

type FindMany = { findMany: jest.Mock };
const prismaMock = prisma as unknown as {
  locationExtraction: FindMany; laneUsage: FindMany; gameLedgerEntry: FindMany;
  marketFill: FindMany; marketResource: FindMany; gameProfile: FindMany;
};

const NOW = 1_760_000_000_000;
const DAY = 86_400_000;

function lane(key: string, dispatches: number): LaneFlowRow {
  const [from, to] = key.split('|');
  return {
    laneKey: key, laneId: null, from, to, fromName: from, toName: to, dispatches,
    lastActivityAt: new Date(NOW).toISOString(), zoneSlugs: [],
    cargoByResource: null, cargoReason: '', tollPaid: null, tollReason: '',
  };
}

describe('percentile / quantityRange', () => {
  it('nearest-rank percentile', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 80)).toBe(8);
    expect(percentile([5], 80)).toBe(5);
    expect(percentile([], 80)).toBe(0);
  });
  it('buckets quantities into coarse ranges', () => {
    expect(quantityRange(0)).toBe('0');
    expect(quantityRange(7)).toBe('<10');
    expect(quantityRange(2_500)).toBe('1k–5k');
    expect(quantityRange(3_000_000)).toBe('>1M');
  });
});

describe('aggregateProduction — LocationExtraction rows', () => {
  it('reads through decay, filters to the window, sorts desc, names locations/resources', () => {
    const rows = [
      { locationId: 'lunar_surface', resourceId: 'iron', accumulated: 100, updatedAtMs: NOW - DAY },
      { locationId: 'asteroid_belt', resourceId: 'iron', accumulated: 300, updatedAtMs: NOW },
      { locationId: 'mars_surface', resourceId: 'water', accumulated: 500, updatedAtMs: NOW - 30 * DAY }, // outside 7d
    ];
    const out = aggregateProduction(rows, NOW, 7 * DAY);
    expect(out.map(r => r.locationId)).toEqual(['asteroid_belt', 'lunar_surface']);
    expect(out[0].units).toBe(300);
    expect(out[1].units).toBeCloseTo(90, 0); // 100 × 0.9 after one day
    expect(out[0].locationName).not.toBe('asteroid_belt'); // resolved to a display name
    expect(out[0].resourceName).toBe('Iron Ore');
  });
  it('filters by resource when asked', () => {
    const rows = [
      { locationId: 'a', resourceId: 'iron', accumulated: 10, updatedAtMs: NOW },
      { locationId: 'a', resourceId: 'water', accumulated: 10, updatedAtMs: NOW },
    ];
    expect(aggregateProduction(rows, NOW, DAY, 'water').map(r => r.resourceSlug)).toEqual(['water']);
  });
});

describe('aggregateLanes — LaneUsage rows', () => {
  it('decays dispatches, matches canonical lanes, attributes zones, and marks cargo/toll as not persisted', () => {
    const key = laneKey('earth_surface', 'leo');
    const out = aggregateLanes([
      { laneKey: key, usage: 10, updatedAtMs: NOW },
      { laneKey: 'bogus', usage: 99, updatedAtMs: NOW },
      { laneKey: laneKey('leo', 'geo'), usage: 5, updatedAtMs: NOW - 60 * DAY },
    ], NOW, 7 * DAY);
    expect(out).toHaveLength(1);
    expect(out[0].laneId).toBe('earth_leo');
    expect(out[0].dispatches).toBe(10);
    expect(out[0].zoneSlugs.length).toBeGreaterThan(0);
    expect(out[0].cargoByResource).toBeNull();
    expect(out[0].cargoReason).toMatch(/not persisted/);
    expect(out[0].tollPaid).toBeNull();
    expect(out[0].tollReason).toMatch(/per zone/);
  });
});

describe('aggregateZoneTolls — lane_toll_income ledger rows', () => {
  it('groups credits by the zone half of refId and counts distinct payers', () => {
    const out = aggregateZoneTolls([
      { refId: 'leo:p1', moneyDelta: 100 },
      { refId: 'leo:p2', moneyDelta: 50 },
      { refId: 'leo:p1', moneyDelta: 25 },
      { refId: 'lunar:p3', moneyDelta: 10 },
      { refId: null, moneyDelta: 999 },
      { refId: 'leo:p9', moneyDelta: -5 },
    ]);
    expect(out[0]).toMatchObject({ zoneSlug: 'leo', tollPaid: 175, payments: 3, payers: 2 });
    expect(out[1]).toMatchObject({ zoneSlug: 'lunar', tollPaid: 10, payers: 1 });
  });
});

describe('rankTraders — exporters/importers from MarketFill', () => {
  const fills = Array.from({ length: 12 }, (_, i) => ({
    resourceSlug: 'iron',
    sellerProfileId: `s${i}`,
    buyerProfileId: 'buyer',
    quantity: (12 - i) * 100,
    totalValue: (12 - i) * 1000,
  }));
  const names = new Map(Array.from({ length: 12 }, (_, i) => [`s${i}`, `Corp ${i}`]));

  it('shows names for the top 10, exact figures for the podium, ranges below it', () => {
    const [table] = rankTraders(fills, names, 'exporters');
    expect(table.resourceSlug).toBe('iron');
    expect(table.rows).toHaveLength(FLOW_MAP_TOP_N);
    expect(table.rows[0]).toMatchObject({ rank: 1, companyName: 'Corp 0', units: 1200, value: 12000, unitsRange: null });
    for (const r of table.rows) {
      if (r.rank <= FLOW_MAP_EXACT_RANKS) {
        expect(r.units).not.toBeNull();
        expect(r.unitsRange).toBeNull();
      } else {
        expect(r.units).toBeNull();
        expect(r.unitsRange).toMatch(/[<>–]/);
        expect(r.companyName).toMatch(/^Corp/);
      }
    }
    expect(table.totalUnits).toBe(fills.reduce((s, f) => s + f.quantity, 0));
  });

  it('importers rank the buy side and label NPC participants', () => {
    const [table] = rankTraders([
      { resourceSlug: 'water', buyerProfileId: NPC_PROFILE_ID, sellerProfileId: 'x', quantity: 10, totalValue: 100 },
      { resourceSlug: 'water', buyerProfileId: '__NPC_CORP_helios_fab', sellerProfileId: 'x', quantity: 5, totalValue: 50 },
      { resourceSlug: 'water', buyerProfileId: 'p', sellerProfileId: 'x', quantity: 1, totalValue: 10 },
    ], new Map([['p', 'Player Co']]), 'importers');
    expect(table.rows.map(r => r.companyName)).toEqual(['NPC Market Maker', 'NPC helios fab', 'Player Co']);
    expect(table.rows.map(r => r.isNpc)).toEqual([true, true, false]);
    expect(isNpcProfileId('__NPC_CORP_x')).toBe(true);
    expect(isNpcProfileId('p')).toBe(false);
  });
});

describe('computeNpcShare', () => {
  it('counts NPC participation per fill side', () => {
    const out = computeNpcShare([
      { resourceSlug: 'iron', buyerProfileId: NPC_PROFILE_ID, sellerProfileId: 'p1', quantity: 100, totalValue: 1 },
      { resourceSlug: 'iron', buyerProfileId: 'p2', sellerProfileId: 'p1', quantity: 100, totalValue: 1 },
    ]);
    expect(out[0]).toMatchObject({ resourceSlug: 'iron', totalUnits: 200, npcUnits: 50, npcSharePct: 25 });
  });
});

describe('detectChokepoints', () => {
  it('flags lanes at or above the P80 of active lanes (volume rule)', () => {
    const lanes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => lane(`a${n}|b${n}`, n));
    const out = detectChokepoints(lanes);
    expect(out.map(c => c.dispatches)).toEqual([10, 9, 8]);
    expect(out.every(c => c.rule === 'volume_p80')).toBe(true);
    expect(out[0].detail).toMatch(/P80/);
  });
  it('ignores zero-traffic lanes and returns nothing when there is no traffic', () => {
    expect(detectChokepoints([lane('a|b', 0)])).toEqual([]);
    expect(detectChokepoints([])).toEqual([]);
  });
  it('applies the ≥50% single-carrier rule only when carrier shares are supplied', () => {
    const lanes = [lane('a|b', 1), lane('c|d', 1)];
    expect(detectChokepoints(lanes)).toHaveLength(2); // both at P80 of [1,1]
    const withCarrier = detectChokepoints(lanes, [
      { laneKey: 'a|b', topCarrierShare: 0.6, topCarrierName: 'Helios' },
      { laneKey: 'c|d', topCarrierShare: 0.4, topCarrierName: 'Nadir' },
    ]);
    const conc = withCarrier.filter(c => c.rule === 'carrier_concentration');
    expect(conc).toHaveLength(1);
    expect(conc[0].laneKey).toBe('a|b');
    expect(conc[0].detail).toMatch(/Helios carries 60%/);
  });
});

describe('clampWindowDays', () => {
  it('defaults and clamps', () => {
    expect(clampWindowDays(undefined)).toBe(7);
    expect(clampWindowDays('abc')).toBe(7);
    expect(clampWindowDays(0)).toBe(1);
    expect(clampWindowDays(400)).toBe(90);
    expect(clampWindowDays('30')).toBe(30);
  });
});

describe('getFlowMap — persisted rows in, null-with-reason where nothing is persisted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.locationExtraction.findMany.mockResolvedValue([
      { locationId: 'asteroid_belt', resourceId: 'iron', accumulated: 120, updatedAt: new Date() },
    ]);
    prismaMock.laneUsage.findMany.mockResolvedValue([
      { laneKey: laneKey('earth_surface', 'leo'), usage: 8, updatedAt: new Date() },
    ]);
    prismaMock.gameLedgerEntry.findMany.mockResolvedValue([{ refId: 'leo:p2', moneyDelta: 300 }]);
    prismaMock.marketFill.findMany.mockResolvedValue([
      { resourceSlug: 'iron', buyerProfileId: 'p2', sellerProfileId: 'p1', quantity: 40, totalValue: 4000 },
    ]);
    prismaMock.marketResource.findMany.mockResolvedValue([{ slug: 'iron', totalDemand: 1234 }]);
    prismaMock.gameProfile.findMany.mockResolvedValue([
      { id: 'p1', companyName: 'Helios Mining' }, { id: 'p2', companyName: 'Nadir Fab' },
    ]);
  });

  it('assembles every section from rows and lists the missing flows', async () => {
    const r = await getFlowMap({ windowDays: 7 });
    expect(typeof r.asOf).toBe('string');
    expect(r.windowDays).toBe(7);
    expect(r.production[0]).toMatchObject({ locationId: 'asteroid_belt', resourceSlug: 'iron', units: 120 });
    expect(r.lanes[0]).toMatchObject({ laneId: 'earth_leo', dispatches: 8, cargoByResource: null, tollPaid: null });
    expect(r.tollsByZone[0]).toMatchObject({ zoneSlug: 'leo', tollPaid: 300 });
    expect(r.exporters[0].rows[0]).toMatchObject({ companyName: 'Helios Mining', units: 40 });
    expect(r.importers[0].rows[0]).toMatchObject({ companyName: 'Nadir Fab', units: 40 });
    expect(r.chokepoints[0]).toMatchObject({ laneId: 'earth_leo', rule: 'volume_p80' });
    expect(r.npcShare[0]).toMatchObject({ resourceSlug: 'iron', npcSharePct: 0 });
    expect(r.consumption.perLocation).toBeNull();
    expect(r.consumption.reason).toMatch(/totalDemand/);
    expect(r.consumption.world[0]).toMatchObject({ resourceSlug: 'iron', cumulativeDemand: 1234 });
    expect(r.concentrationRuleAvailable).toBe(false);
    expect(r.missing).toBe(FLOW_MAP_MISSING);
    expect(r.missing.map(m => m.flow)).toEqual(expect.arrayContaining(['lanes[].cargoByResource', 'lanes[].tollPaid', 'consumption.perLocation']));
    // Serializable (unstable_cache contract): no Dates, Maps or undefined.
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it('ignores an unknown resource filter and passes a known one to the row reads', async () => {
    await getFlowMap({ resource: 'not_a_resource' });
    expect(prismaMock.marketFill.findMany.mock.calls[0][0].where.resourceSlug).toBeUndefined();
    await getFlowMap({ resource: 'iron', windowDays: 30 });
    expect(prismaMock.marketFill.findMany.mock.calls[1][0].where.resourceSlug).toBe('iron');
    expect(prismaMock.locationExtraction.findMany.mock.calls[1][0].where.resourceId).toBe('iron');
  });

  it('a table that lags a deploy yields an empty section, not a failure', async () => {
    prismaMock.laneUsage.findMany.mockRejectedValue(new Error('relation "LaneUsage" does not exist'));
    const r = await getFlowMap({});
    expect(r.lanes).toEqual([]);
    expect(r.chokepoints).toEqual([]);
    expect(r.production.length).toBe(1);
  });
});
