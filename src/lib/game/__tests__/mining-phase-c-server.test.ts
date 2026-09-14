/**
 * @jest-environment node
 */
// ─── Mining Phase C — the server completion pass ────────────────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §8 row C. The assets-complete cron
// (and the lazy pass on every mining request) is the ONLY place a refine run
// turns into refined product for a synced profile. This drives
// completeDueMiningOrders against an in-memory fake DB and asserts what it
// ledgers: product rows (refining_output), never ore; refined sale proceeds
// under their own reason; a held refine parcel that credits nothing.

import { MOBILE_REFINERY_RECOVERY, refineOutputs, refinedUnitTotal } from '../ore-refining';

const recordLedger = jest.fn();

jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));
jest.mock('../server-ledger', () => ({
  __esModule: true,
  isLedgerAvailable: jest.fn(async () => true),
  recordLedger: (...args: unknown[]) => recordLedger(...args),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { completeDueMiningOrders, MINING_ORDER_COMPLETE, MINING_ORDER_HELD } = require('../server-mining');

const NOW = new Date(1_800_000_000_000);
const ORE = 'ore_metallic';
const ASTEROID_ID = 'ast_2_ib_01';

interface FakeOrder {
  id: string; profileId: string; instanceId: string; shipInstanceId: string; mode: string;
  asteroidId: string | null; fieldId: string; oreId: string; fillUnits: number; thenAction: string;
  originId: string; destinationId: string; startedAt: Date; arrivesAt: Date; miningEndsAt: Date; completesAt: Date;
  fuelPaid: number; ratePerHour: number; surveyed: boolean; status: string; unitsCredited: number; saleProceeds: number;
  escortInstanceId: string | null; shakedownUnits: number; shakedownRepelled: boolean; pressureShare: number; claimId: string | null;
  refined: boolean; refineEndsAt: Date | null; refineOpexPaid: number; depotId: string | null; depotUnitsDrawn: number;
}

function order(over: Partial<FakeOrder> = {}): FakeOrder {
  return {
    id: 'ord-1', profileId: 'prof-1', instanceId: 'inst-1', shipInstanceId: 'ship-1', mode: 'refine',
    asteroidId: ASTEROID_ID, fieldId: 'field_inner_belt', oreId: ORE, fillUnits: 1_000, thenAction: 'return_store',
    originId: 'ceres_surface', destinationId: 'ceres_surface',
    startedAt: new Date(NOW.getTime() - 60_000), arrivesAt: new Date(NOW.getTime() - 50_000),
    miningEndsAt: new Date(NOW.getTime() - 20_000), completesAt: new Date(NOW.getTime() - 1_000),
    fuelPaid: 1_000_000, ratePerHour: 140, surveyed: true, status: 'pending', unitsCredited: 0, saleProceeds: 0,
    escortInstanceId: null, shakedownUnits: 0, shakedownRepelled: false, pressureShare: 1, claimId: null,
    refined: true, refineEndsAt: new Date(NOW.getTime() - 10_000), refineOpexPaid: 600_000, depotId: null, depotUnitsDrawn: 0,
    ...over,
  };
}

/** A minimal fake of the slice of Prisma the completion pass touches. */
function fakeDb(orders: FakeOrder[]) {
  const asteroid = { id: ASTEROID_ID, fieldId: 'field_inner_belt', class: 'M', deltaVExtra: 800, grade: 1, reserve: 50_000, risk: 0.2, exhaustedAt: null, rubbleUntil: null, spinUpUntil: null, generation: 0 };
  const profileUpdates: Array<Record<string, unknown>> = [];
  const orderUpdates: Array<Record<string, unknown>> = [];
  const asteroidUpdates: Array<Record<string, unknown>> = [];
  const db = {
    miningOrder: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        // the due query (status pending) vs the concurrent-miner query
        if (where && (where as { mode?: string }).mode === 'mine') return [];
        return orders.filter(o => o.status === 'pending');
      }),
      updateMany: jest.fn(async ({ where, data }: { where: { id: string; status: string }; data: Record<string, unknown> }) => {
        const row = orders.find(o => o.id === where.id && o.status === where.status);
        if (!row) return { count: 0 };
        Object.assign(row, data);
        orderUpdates.push(data);
        return { count: 1 };
      }),
    },
    asteroid: {
      findUnique: jest.fn(async () => asteroid),
      updateMany: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { asteroidUpdates.push(data); return { count: 1 }; }),
    },
    asteroidClaim: { findFirst: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    gameProfile: {
      findUnique: jest.fn(async () => ({ createdAt: new Date(0), companyName: 'Test Corp', shipsData: [] })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { profileUpdates.push(data); return {}; }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    marketResource: { findUnique: jest.fn(async () => null) },
    serverAsset: { findMany: jest.fn(async () => []) },
  };
  return { db, profileUpdates, orderUpdates, asteroidUpdates };
}

beforeEach(() => recordLedger.mockClear());

describe('completeDueMiningOrders — refining', () => {
  it('ledgers PRODUCT, never ore, and decrements the rock by the ore worked', async () => {
    const rows = [order()];
    const { db, asteroidUpdates } = fakeDb(rows);
    const settled = await completeDueMiningOrders(db as never, 'prof-1', NOW);
    expect(settled).toBe(1);
    expect(rows[0].status).toBe(MINING_ORDER_COMPLETE);

    const expected = refineOutputs(ORE, 1_000, MOBILE_REFINERY_RECOVERY);
    const resourceRows = recordLedger.mock.calls.map(c => c[1] as { resourceSlug?: string; resourceDelta?: number; reason: string });
    const productRows = resourceRows.filter(r => r.reason === 'refining_output');
    expect(productRows.length).toBe(Object.keys(expected).length);
    for (const r of productRows) {
      expect(expected[r.resourceSlug!]).toBeGreaterThan(0);
      expect(r.resourceDelta).toBeLessThanOrEqual(expected[r.resourceSlug!]);
    }
    // No ore row anywhere — refining is the only thing that happened.
    expect(resourceRows.some(r => r.reason === 'mining_order_ore')).toBe(false);
    expect(resourceRows.some(r => r.resourceSlug === ORE)).toBe(false);
    // The rock lost the ORE that was worked, not the product that came out.
    expect(asteroidUpdates.some(u => JSON.stringify(u).includes('decrement'))).toBe(true);
    // unitsCredited is the product that landed.
    expect(rows[0].unitsCredited).toBeLessThanOrEqual(refinedUnitTotal(expected));
    expect(rows[0].unitsCredited).toBeGreaterThan(0);
  });

  it('books a refined sale under its own reason, priced on the product', async () => {
    const rows = [order({ thenAction: 'return_sell' })];
    const { db, profileUpdates } = fakeDb(rows);
    await completeDueMiningOrders(db as never, 'prof-1', NOW);
    const moneyRows = recordLedger.mock.calls.map(c => c[1] as { moneyDelta?: number; reason: string });
    expect(moneyRows.some(r => r.reason === 'refining_sale' && (r.moneyDelta ?? 0) > 0)).toBe(true);
    expect(moneyRows.some(r => r.reason === 'mining_order_sale')).toBe(false);
    expect(profileUpdates.length).toBe(1);
    expect(rows[0].saleProceeds).toBeGreaterThan(0);
  });

  it('holds a refine run at the field and credits nothing until it is brought home', async () => {
    const rows = [order({ thenAction: 'hold' })];
    const { db } = fakeDb(rows);
    await completeDueMiningOrders(db as never, 'prof-1', NOW);
    expect(rows[0].status).toBe(MINING_ORDER_HELD);
    expect(recordLedger).not.toHaveBeenCalled();
    expect(rows[0].unitsCredited).toBe(0);
  });

  it('is idempotent — a second pass over a settled order credits nothing more', async () => {
    const rows = [order()];
    const { db } = fakeDb(rows);
    await completeDueMiningOrders(db as never, 'prof-1', NOW);
    const first = recordLedger.mock.calls.length;
    await completeDueMiningOrders(db as never, 'prof-1', NOW);
    expect(recordLedger.mock.calls.length).toBe(first);
  });

  it('still credits raw ore for a plain mine order', async () => {
    const rows = [order({ mode: 'mine', refined: false, refineEndsAt: null, refineOpexPaid: 0 })];
    const { db } = fakeDb(rows);
    await completeDueMiningOrders(db as never, 'prof-1', NOW);
    const resourceRows = recordLedger.mock.calls.map(c => c[1] as { resourceSlug?: string; reason: string });
    expect(resourceRows.some(r => r.reason === 'mining_order_ore' && r.resourceSlug === ORE)).toBe(true);
    expect(resourceRows.some(r => r.reason === 'refining_output')).toBe(false);
  });
});
