/**
 * @jest-environment node
 */

/**
 * Published NPC demand forecast — parity guard.
 *
 * The forecast (npc-forecast.ts) must equal what runNpcIndustryTick actually
 * does, not estimate it. Both call the same exported per-tick helpers in
 * npc-industry.ts; this suite runs the REAL tick against an in-memory Prisma
 * and asserts the forecast's quantities and prices match the orders the tick
 * rests and the raw supply it draws. Plus: drive items carry the cap, pool
 * items aggregate, and the resource filter narrows.
 */

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Pass-through cache so every call recomputes from the store.
jest.mock('@/lib/api-cache', () => ({
  withCache: (_key: string, fetcher: () => Promise<unknown>) => fetcher(),
}));

// The matcher needs a real transaction; the parity under test is the quantity
// path, so no fills happen (every rested order simply stays open).
jest.mock('@/lib/game/market-orderbook', () => {
  const actual = jest.requireActual('@/lib/game/market-orderbook');
  return { ...actual, matchOrders: jest.fn().mockResolvedValue([]) };
});

// In-memory Prisma covering exactly the calls the tick and the forecast make.
jest.mock('@/lib/db', () => {
  const { RESOURCE_MAP } = jest.requireActual('@/lib/game/resources');
  type Order = { id: string; profileId: string; resourceSlug: string; side: string; quantity: number; filledQty: number; pricePerUnit: number; status: string };
  const store = {
    activeProfiles: 5,
    corps: new Map<string, Record<string, unknown>>(),
    orders: [] as Order[],
    supplyDelta: {} as Record<string, number>,
    drives: [] as unknown[],
    nextId: 1,
    reset() {
      this.activeProfiles = 5;
      this.corps = new Map();
      this.orders = [];
      this.supplyDelta = {};
      this.drives = [];
      this.nextId = 1;
    },
  };
  const resourceRow = (slug: string) => {
    const def = RESOURCE_MAP.get(slug);
    if (!def) return null;
    return {
      id: `res_${slug}`, slug, currentPrice: def.baseMarketPrice, basePrice: def.baseMarketPrice,
      totalSupply: 1_000_000_000, totalDemand: 0, volatility: 0.1, minPrice: def.minPrice ?? 1, maxPrice: def.maxPrice ?? Number.MAX_SAFE_INTEGER,
    };
  };
  const matchWhere = (o: Order, where: Record<string, unknown>): boolean => {
    for (const [k, v] of Object.entries(where)) {
      if (k === 'NOT') {
        const not = v as { profileId?: { startsWith: string }; buyerProfileId?: unknown };
        if (not.profileId && o.profileId.startsWith(not.profileId.startsWith)) return false;
        continue;
      }
      if (k === 'status') {
        const st = v as { in?: string[] } | string;
        if (typeof st === 'string' ? o.status !== st : !st.in?.includes(o.status)) return false;
        continue;
      }
      if (k === 'profileId' && typeof v === 'object' && v && 'startsWith' in (v as object)) {
        if (!o.profileId.startsWith((v as { startsWith: string }).startsWith)) return false;
        continue;
      }
      if ((o as unknown as Record<string, unknown>)[k] !== v) return false;
    }
    return true;
  };
  const prisma = {
    gameProfile: { count: jest.fn(async () => store.activeProfiles) },
    npcIndustrialCorp: {
      upsert: jest.fn(async ({ where, create }: { where: { id: string }; create: Record<string, unknown> }) => {
        if (!store.corps.has(where.id)) store.corps.set(where.id, { ...create, unitsBuilt: 0, lastTickAt: null });
        return { ...store.corps.get(where.id)! };
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        const row = store.corps.get(where.id);
        return row ? JSON.parse(JSON.stringify(row)) : null;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = store.corps.get(where.id)!;
        for (const [k, v] of Object.entries(data)) {
          if (k === 'unitsBuilt') continue;
          row[k] = v;
        }
        return { ...row };
      }),
    },
    marketFill: {
      findFirst: jest.fn(async () => null),
      aggregate: jest.fn(async () => ({ _sum: { quantity: 0 } })),
    },
    marketLimitOrder: {
      aggregate: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const rows = store.orders.filter(o => matchWhere(o, where));
        return { _sum: { quantity: rows.reduce((a, o) => a + o.quantity, 0), filledQty: rows.reduce((a, o) => a + o.filledQty, 0) } };
      }),
      updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: { status: string } }) => {
        let count = 0;
        for (const o of store.orders) if (matchWhere(o, where)) { o.status = data.status; count++; }
        return { count };
      }),
      create: jest.fn(async ({ data }: { data: Omit<Order, 'id' | 'filledQty'> }) => {
        const row: Order = { id: `ord_${store.nextId++}`, filledQty: 0, ...data };
        store.orders.push(row);
        return row;
      }),
      findMany: jest.fn(async () => []),
    },
    marketResource: {
      findUnique: jest.fn(async ({ where }: { where: { slug: string } }) => resourceRow(where.slug)),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { totalSupply: number } }) => {
        const slug = where.id.replace(/^res_/, '');
        const before = resourceRow(slug)!.totalSupply;
        store.supplyDelta[slug] = (store.supplyDelta[slug] || 0) + (before - data.totalSupply);
        return { ...resourceRow(slug)!, ...data };
      }),
    },
    biddingContract: { findMany: jest.fn(async () => store.drives) },
  };
  return { __esModule: true, default: prisma, __store: store };
});

import * as dbModule from '@/lib/db';
import {
  NPC_INDUSTRY_SEEDS, runNpcIndustryTick, populationScale,
  npcConsumptionWantPerTick, npcBuyOrderQty, npcBuyPrice, npcListPrice, npcListCap, recipeTierOf,
} from '@/lib/game/npc-industry';
import {
  buildNpcForecast, simulateNpcCorp, forecastListingQty, driveItemsFromRows, poolItems, filterNpcForecast, summarizeByResource,
  type NpcForecast, type NpcForecastItem,
} from '@/lib/game/npc-forecast';
import { NPC_DEMAND_FLOOR, getNpcFloorDemand, getDemandPoolSeasonModifier, type ServiceCategory } from '@/lib/game/demand-pools';
import { NPC_DRIVE_PRICE_CAP_MULTIPLIER } from '@/lib/game/npc-procurement-drives';
import { RESOURCE_MAP } from '@/lib/game/resources';

type Store = {
  activeProfiles: number;
  corps: Map<string, Record<string, unknown>>;
  orders: { id: string; profileId: string; resourceSlug: string; side: string; quantity: number; filledQty: number; pricePerUnit: number; status: string }[];
  supplyDelta: Record<string, number>;
  drives: unknown[];
  reset(): void;
};
const store = (dbModule as unknown as { __store: Store }).__store;

const stellar = NPC_INDUSTRY_SEEDS.find(s => s.id.endsWith('stellar'))!;
const T0 = Date.UTC(2126, 0, 1, 12, 0, 0);
const HOUR = 3_600_000;

let nowSpy: jest.SpyInstance<number, []>;
beforeEach(() => {
  store.reset();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(T0);
});
afterEach(() => { nowSpy.mockRestore(); });

function corpMeta(id: string): { wanted: Record<string, number>; unitCost: Record<string, number>; listedAt: Record<string, string> } {
  const inv = (store.corps.get(id)!.inventory as Record<string, unknown>) || {};
  return (inv.__meta as never) || { wanted: {}, unitCost: {}, listedAt: {} };
}

describe('NPC forecast — parity with the real tick', () => {
  it('standing consumption: forecast quantity and bid price equal the order the tick rests after the horizon', async () => {
    store.activeProfiles = 60; // scale 0.8 — the forecast must use the tick's own scaler
    const scale = populationScale(60);
    expect(scale).toBeCloseTo(0.8);
    // A carried backlog so the 72h accrual crosses a whole unit.
    store.corps.set(stellar.id, {
      id: stellar.id, name: stellar.name, factionId: stellar.factionId, capacityTier: stellar.capacityTier,
      marginPct: stellar.marginPct, treasury: stellar.seedTreasury,
      inventory: { __meta: { wanted: { propulsion_unit: 3.5 }, unitCost: {}, listedAt: {} } },
    });

    const forecast = await buildNpcForecast(new Date(T0), 72);
    const item = forecast.items.find(i => i.npcId === stellar.id && i.resourceSlug === 'propulsion_unit' && i.side === 'buy')!;
    expect(item).toBeDefined();
    expect(item.confidence).toBe('scheduled');
    const expectedWant = 3.5 + 72 * npcConsumptionWantPerTick(stellar.consumes.propulsion_unit, scale);
    expect(item.quantity).toBe(Math.floor(expectedWant));
    expect(item.quantity).toBe(4);

    for (let t = 0; t < 72; t++) {
      nowSpy.mockReturnValue(T0 + t * HOUR);
      await runNpcIndustryTick(new Date(T0 + t * HOUR));
    }
    const wanted = corpMeta(stellar.id).wanted.propulsion_unit;
    expect(wanted).toBeCloseTo(expectedWant, 6);
    expect(Math.floor(wanted)).toBe(item.quantity);

    const rested = store.orders.filter(o => o.profileId === stellar.id && o.resourceSlug === 'propulsion_unit' && o.side === 'buy' && o.status === 'open');
    expect(rested).toHaveLength(1);
    expect(rested[0].quantity).toBe(npcBuyOrderQty(item.quantity));
    expect(rested[0].pricePerUnit).toBe(item.priceCap);
    expect(item.priceCap).toBe(npcBuyPrice('propulsion_unit', RESOURCE_MAP.get('propulsion_unit')!.baseMarketPrice));
  });

  it('recipe shortfalls accrue the same capped want the tick records', async () => {
    store.corps.set(stellar.id, {
      id: stellar.id, name: stellar.name, factionId: stellar.factionId, capacityTier: stellar.capacityTier,
      marginPct: stellar.marginPct, treasury: stellar.seedTreasury, inventory: {},
    });
    const forecast = await buildNpcForecast(new Date(T0), 24);
    const short = forecast.items.find(i => i.npcId === stellar.id && i.resourceSlug === 'refined_rare_earth' && i.side === 'buy')!;
    expect(short).toBeDefined();
    expect(short.confidence).toBe('projected');

    for (let t = 0; t < 24; t++) {
      nowSpy.mockReturnValue(T0 + t * HOUR);
      await runNpcIndustryTick(new Date(T0 + t * HOUR));
    }
    expect(Math.floor(corpMeta(stellar.id).wanted.refined_rare_earth)).toBe(short.quantity);
    const rested = store.orders.filter(o => o.profileId === stellar.id && o.resourceSlug === 'refined_rare_earth' && o.side === 'buy' && o.status === 'open');
    expect(rested).toHaveLength(1);
    expect(rested[0].quantity).toBe(npcBuyOrderQty(short.quantity));
  });

  it('production: one-tick simulation draws the same raw supply and rests the same listings as the first real tick', async () => {
    const sim = simulateNpcCorp(stellar, { inv: {}, wanted: {}, demandBySlug: {}, openAskBySlug: {}, scale: 1, ticks: 1 });
    // The tick runs every corp against the same curve, so raw parity is
    // checked on the sum of all five simulations.
    const rawAll: Record<string, number> = {};
    for (const seed of NPC_INDUSTRY_SEEDS) {
      const r = simulateNpcCorp(seed, { inv: {}, wanted: {}, demandBySlug: {}, openAskBySlug: {}, scale: 1, ticks: 1 });
      for (const [slug, q] of Object.entries(r.rawBuys)) rawAll[slug] = (rawAll[slug] || 0) + q;
    }
    await runNpcIndustryTick(new Date(T0));

    // Raw inputs off the curve.
    const rawSlugs = Object.keys(rawAll);
    expect(rawSlugs.length).toBeGreaterThan(0);
    for (const slug of rawSlugs) expect(store.supplyDelta[slug]).toBe(rawAll[slug]);
    for (const slug of Object.keys(store.supplyDelta)) expect(rawAll[slug]).toBe(store.supplyDelta[slug]);

    // Listings from what was built.
    const asks = store.orders.filter(o => o.profileId === stellar.id && o.side === 'sell' && o.status === 'open');
    expect(asks.length).toBeGreaterThan(0);
    for (const ask of asks) expect(ask.quantity).toBe(forecastListingQty(ask.resourceSlug, sim.inv[ask.resourceSlug] || 0));
    for (const slug of stellar.focus) {
      const q = forecastListingQty(slug, sim.inv[slug] || 0);
      const ask = asks.find(a => a.resourceSlug === slug);
      expect(ask ? ask.quantity : 0).toBe(q);
      if (q > 0) expect(q).toBeLessThanOrEqual(npcListCap(recipeTierOf(slug) ?? 2));
    }
  });

  it('listings: after a tick has priced its stock, the forecast ask equals the next tick’s relist price', async () => {
    await runNpcIndustryTick(new Date(T0));
    const T1 = T0 + HOUR;
    nowSpy.mockReturnValue(T1);
    const forecast = await buildNpcForecast(new Date(T1), 24);
    await runNpcIndustryTick(new Date(T1));

    const asks = store.orders.filter(o => o.profileId === stellar.id && o.side === 'sell' && o.status === 'open');
    expect(asks.length).toBeGreaterThan(0);
    for (const ask of asks) {
      const item = forecast.items.find(i => i.npcId === stellar.id && i.resourceSlug === ask.resourceSlug && i.side === 'sell')!;
      expect(item).toBeDefined();
      expect(item.quantity).toBe(ask.quantity);
      expect(item.priceCap).toBe(ask.pricePerUnit);
      const meta = corpMeta(stellar.id);
      expect(ask.pricePerUnit).toBe(npcListPrice(stellar.marginPct, ask.resourceSlug, meta.unitCost[ask.resourceSlug], 1 / 24));
    }
  });
});

describe('NPC forecast — drives, pools, filter', () => {
  it('drive items carry the per-unit cap, issuer and faction', () => {
    const spot = 1_000;
    const quantity = 500;
    const maxBid = Math.round(spot * NPC_DRIVE_PRICE_CAP_MULTIPLIER * quantity);
    const items = driveItemsFromRows([
      {
        id: 'c1', issuerNpcId: 'npc_titan_mining', requirements: { type: 'resources_delivered', target: quantity, resourceId: 'iron' },
        maxBid, createdAt: new Date(T0), biddingEndsAt: new Date(T0 + 3 * 24 * HOUR),
      },
      { id: 'c2', issuerNpcId: null, requirements: { target: 10, resourceId: 'iron' }, maxBid: 1, createdAt: new Date(T0), biddingEndsAt: new Date(T0 + HOUR) },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      npcId: 'npc_titan_mining', npcName: 'Titan Mining Collective', factionId: 'hive-collective',
      resourceSlug: 'iron', side: 'buy', quantity, source: 'drive', confidence: 'scheduled', unit: 'units',
      priceCap: Math.round(maxBid / quantity),
    });
    expect(items[0].priceCap).toBeLessThanOrEqual(Math.round(spot * NPC_DRIVE_PRICE_CAP_MULTIPLIER));
    expect(items[0].windowEndIso).toBe(new Date(T0 + 3 * 24 * HOUR).toISOString());
  });

  it('pool items aggregate every authored market at the scaled floor × season modifier for 24h', () => {
    const items = poolItems(0, 1, new Date(T0));
    const authored = Object.entries(NPC_DEMAND_FLOOR).reduce((n, [, cats]) => n + Object.keys(cats).length, 0);
    expect(items).toHaveLength(authored);
    for (const it of items) {
      expect(it.unit).toBe('usd');
      expect(it.source).toBe('pool');
      expect(it.confidence).toBe('scheduled');
      const expected = Math.round(getNpcFloorDemand(it.locationId!, it.category as ServiceCategory, 0) * getDemandPoolSeasonModifier(it.category as ServiceCategory, 1) * (24 / 730));
      expect(it.quantity).toBe(expected);
    }
    // Recedes with population, never to zero.
    const busy = poolItems(5000, 1, new Date(T0));
    expect(busy[0].quantity).toBeLessThan(items[0].quantity);
    expect(busy[0].quantity).toBeGreaterThan(0);
    // Dollars never leak into the unit totals.
    expect(summarizeByResource(items)).toEqual({});
  });

  it('filters by resource and narrows byResource', () => {
    const base: Omit<NpcForecastItem, 'resourceSlug' | 'side' | 'quantity'> = {
      npcId: 'x', npcName: 'X', windowStartIso: new Date(T0).toISOString(), windowEndIso: new Date(T0 + HOUR).toISOString(),
      confidence: 'scheduled', source: 'industry', unit: 'units',
    };
    const items: NpcForecastItem[] = [
      { ...base, resourceSlug: 'iron', side: 'buy', quantity: 10 },
      { ...base, resourceSlug: 'iron', side: 'sell', quantity: 4 },
      { ...base, resourceSlug: 'gold', side: 'buy', quantity: 7 },
    ];
    const forecast: NpcForecast = {
      generatedAt: new Date(T0).toISOString(), horizonHours: 72, scale: 1, active30d: 0,
      npcGovernor: { activePlayers30d: 0, activeNpcCorps: 10, activeIndustryCorps: 5, floorNpcCorps: 3, floorIndustryCorps: 2, maxNpcCorps: 10, maxIndustryCorps: 5, dormantIndustryCorpIds: [] },
      items, byResource: summarizeByResource(items),
    };
    expect(forecast.byResource).toEqual({ iron: { buy: 10, sell: 4 }, gold: { buy: 7, sell: 0 } });
    const iron = filterNpcForecast(forecast, 'iron');
    expect(iron.items).toHaveLength(2);
    expect(iron.byResource).toEqual({ iron: { buy: 10, sell: 4 } });
    expect(filterNpcForecast(forecast, 'water').items).toHaveLength(0);
    expect(filterNpcForecast(forecast, null)).toBe(forecast);
  });

  it('end-to-end build mixes all three sources and totals units only', async () => {
    store.drives = [{
      id: 'c1', issuerNpcId: 'npc_nova', requirements: { target: 120, resourceId: 'titanium' },
      maxBid: 120 * 5_000, createdAt: new Date(T0), biddingEndsAt: new Date(T0 + 2 * 24 * HOUR),
    }];
    const forecast = await buildNpcForecast(new Date(T0), 72);
    expect(forecast.horizonHours).toBe(72);
    expect(forecast.items.some(i => i.source === 'drive')).toBe(true);
    expect(forecast.items.some(i => i.source === 'industry')).toBe(true);
    expect(forecast.items.some(i => i.source === 'pool')).toBe(true);
    expect(forecast.byResource.titanium.buy).toBeGreaterThanOrEqual(120);
    for (const key of Object.keys(forecast.byResource)) expect(RESOURCE_MAP.has(key as never)).toBe(true);
  });
});
