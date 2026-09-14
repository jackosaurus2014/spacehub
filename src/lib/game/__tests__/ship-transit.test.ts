/**
 * @jest-environment node
 *
 * Ship traffic Phase 2 (2026-09-14) — server-authoritative ship movement.
 *
 * The gap this closes: ships were not server rows, so every position in the
 * traffic feed was the client's word for it. These tests pin the two halves
 * of the fix — the SERVER stamps the clock (createTransitRow /
 * reconcileShipTransits / advanceDueTransits) and the CLIENT adopts it
 * (adoptServerTransits) — and, specifically, that a forged client position
 * gains nothing in either direction.
 */
jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));

import {
  MIN_TRAVEL_FRACTION,
  TRANSIT_ARRIVED,
  TRANSIT_CANCELLED,
  TRANSIT_IN_FLIGHT,
  adoptServerTransits,
  clampTravelMs,
  type ServerTransitBlock,
} from '../ship-transit';
import {
  advanceDueTransits,
  createTransitRow,
  miningOrderTransits,
  reconcileShipTransits,
  transitActiveKey,
  transitBlock,
} from '../server-ship-transit';
import { getTravelTime } from '../ships';
import type { GameState } from '../types';

const NOW = Date.UTC(2026, 8, 14, 12, 0, 0);
const LEO_LUNAR_MS = getTravelTime('leo', 'lunar_orbit') * 1000; // 150 s

// ─── A minimal in-memory stand-in for the two delegates used here ───────────

interface FakeRow {
  id: string; profileId: string; activeKey: string | null;
  shipInstanceId: string; shipDefinitionId: string;
  originId: string; destinationId: string; laneKey: string;
  departedAt: Date; arrivesAt: Date; arrivedAt: Date | null;
  cargo: unknown; cargoUnits: number; status: string; source: string;
}

function matches(row: FakeRow, where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (k === 'OR') {
      if (!(v as Record<string, unknown>[]).some(clause => matches(row, clause))) return false;
      continue;
    }
    const actual = (row as unknown as Record<string, unknown>)[k];
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const cond = v as Record<string, unknown>;
      if ('in' in cond && !(cond.in as unknown[]).includes(actual)) return false;
      if ('lte' in cond && !(actual instanceof Date && actual.getTime() <= (cond.lte as Date).getTime())) return false;
      if ('gte' in cond && !(actual instanceof Date && actual.getTime() >= (cond.gte as Date).getTime())) return false;
      continue;
    }
    if (actual !== v) return false;
  }
  return true;
}

function fakeDb() {
  const rows: FakeRow[] = [];
  let seq = 0;
  const delegate = {
    rows,
    async findMany({ where = {}, take = 1000, orderBy }: { where?: Record<string, unknown>; take?: number; orderBy?: { departedAt?: string } }) {
      let out = rows.filter(r => matches(r, where));
      if (orderBy?.departedAt === 'desc') out = [...out].sort((a, b) => b.departedAt.getTime() - a.departedAt.getTime());
      return out.slice(0, take).map(r => ({ ...r }));
    },
    async findFirst({ where = {} }: { where?: Record<string, unknown> }) {
      const hit = rows.find(r => matches(r, where));
      return hit ? { ...hit } : null;
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const d = data as Partial<FakeRow>;
      const row: FakeRow = {
        ...(d as FakeRow),
        id: `t${++seq}`,
        activeKey: d.activeKey ?? null,
        arrivedAt: d.arrivedAt ?? null,
        cargo: d.cargo ?? null,
        cargoUnits: d.cargoUnits ?? 0,
        status: d.status ?? TRANSIT_IN_FLIGHT,
        source: d.source ?? 'dispatch',
        laneKey: d.laneKey ?? '',
      };
      rows.push(row);
      return { ...row };
    },
    async updateMany({ where = {}, data }: { where?: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const r of rows) {
        if (!matches(r, where)) continue;
        Object.assign(r, data);
        count++;
      }
      return { count };
    },
  };
  return { shipTransit: delegate, miningOrder: { async findMany() { return []; } }, _rows: rows };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (f: ReturnType<typeof fakeDb>) => f as any;

// ─── clampTravelMs ──────────────────────────────────────────────────────────

describe('clampTravelMs', () => {
  it('refuses a forged instant crossing and an absurdly long loiter', () => {
    expect(clampTravelMs(1, 600)).toBe(Math.round(600_000 * MIN_TRAVEL_FRACTION));
    expect(clampTravelMs(600_000 * 50, 600)).toBe(600_000 * 4);
  });
  it('passes a plausible journey through untouched and defaults a missing one', () => {
    expect(clampTravelMs(500_000, 600)).toBe(500_000);
    expect(clampTravelMs(0, 600)).toBe(600_000);
    expect(clampTravelMs(Number.NaN, 600)).toBe(600_000);
  });
});

// ─── createTransitRow ───────────────────────────────────────────────────────

describe('createTransitRow', () => {
  it('stamps the arrival itself — a one-second claim gets the floor', async () => {
    const f = fakeDb();
    const row = await createTransitRow(db(f), {
      profileId: 'p1', shipInstanceId: 's1', shipDefinitionId: 'freighter',
      originId: 'leo', destinationId: 'lunar_orbit',
      claimedTravelMs: 1000, now: new Date(NOW),
    });
    expect(row.arrivesAt.getTime() - row.departedAt.getTime()).toBe(Math.round(LEO_LUNAR_MS * MIN_TRAVEL_FRACTION));
    expect(row.laneKey).toBe('leo|lunar_orbit');
    expect(f._rows[0].activeKey).toBe(transitActiveKey('p1', 's1'));
  });

  it('a hull flies one leg at a time: a new dispatch cancels the open one', async () => {
    const f = fakeDb();
    const base = {
      profileId: 'p1', shipInstanceId: 's1', shipDefinitionId: 'freighter',
      claimedTravelMs: LEO_LUNAR_MS, now: new Date(NOW),
    };
    await createTransitRow(db(f), { ...base, originId: 'leo', destinationId: 'lunar_orbit' });
    await createTransitRow(db(f), { ...base, originId: 'leo', destinationId: 'geo' });
    expect(f._rows).toHaveLength(2);
    expect(f._rows.filter(r => r.status === TRANSIT_IN_FLIGHT)).toHaveLength(1);
    expect(f._rows.filter(r => r.activeKey !== null)).toHaveLength(1);
    expect(f._rows[0].status).toBe(TRANSIT_CANCELLED);
  });

  it('records the manifest for the feed\'s earned-identity block', async () => {
    const f = fakeDb();
    const row = await createTransitRow(db(f), {
      profileId: 'p1', shipInstanceId: 's1', shipDefinitionId: 'freighter',
      originId: 'leo', destinationId: 'lunar_orbit', now: new Date(NOW),
      cargo: { metal: 120, water: 40, junk: -5 },
    });
    expect(transitBlock(row).cargo).toEqual({ metal: 120, water: 40 });
    expect(row.cargoUnits).toBe(160);
  });
});

// ─── advanceDueTransits ─────────────────────────────────────────────────────

describe('advanceDueTransits', () => {
  it('lands only what is due, frees the hull, and is idempotent', async () => {
    const f = fakeDb();
    await createTransitRow(db(f), {
      profileId: 'p1', shipInstanceId: 'landed', shipDefinitionId: 'freighter',
      originId: 'leo', destinationId: 'lunar_orbit', now: new Date(NOW - 10 * LEO_LUNAR_MS),
    });
    await createTransitRow(db(f), {
      profileId: 'p1', shipInstanceId: 'flying', shipDefinitionId: 'freighter',
      originId: 'leo', destinationId: 'geo', now: new Date(NOW),
    });
    expect(await advanceDueTransits(db(f), undefined, new Date(NOW))).toBe(1);
    expect(await advanceDueTransits(db(f), undefined, new Date(NOW))).toBe(0);
    const landed = f._rows.find(r => r.shipInstanceId === 'landed')!;
    expect(landed.status).toBe(TRANSIT_ARRIVED);
    expect(landed.arrivedAt).toBeInstanceOf(Date);
    expect(landed.activeKey).toBeNull();
    expect(f._rows.find(r => r.shipInstanceId === 'flying')!.status).toBe(TRANSIT_IN_FLIGHT);
  });
});

// ─── reconcileShipTransits (the migration path) ─────────────────────────────

const blobShip = (over: Record<string, unknown> = {}) => ({
  instanceId: 's1', definitionId: 'freighter', status: 'in_transit', isBuilt: true,
  route: { from: 'leo', to: 'lunar_orbit', departedAtMs: NOW - 10_000, arrivalAtMs: NOW + LEO_LUNAR_MS, cargo: { metal: 10 } },
  ...over,
});

describe('reconcileShipTransits', () => {
  it('back-fills a hull that was already in flight, once', async () => {
    const f = fakeDb();
    expect(await reconcileShipTransits(db(f), 'p1', [blobShip()], new Date(NOW))).toEqual({ created: 1, cancelled: 0 });
    expect(await reconcileShipTransits(db(f), 'p1', [blobShip()], new Date(NOW))).toEqual({ created: 0, cancelled: 0 });
    expect(f._rows).toHaveLength(1);
    expect(f._rows[0].source).toBe('adopted');
    expect(f._rows[0].destinationId).toBe('lunar_orbit');
  });

  it('a save cannot buy itself a faster ship by re-syncing a shorter arrival', async () => {
    const f = fakeDb();
    await reconcileShipTransits(db(f), 'p1', [blobShip()], new Date(NOW));
    const stamped = f._rows[0].arrivesAt.getTime();
    // Same leg, now claiming it lands in one second.
    await reconcileShipTransits(db(f), 'p1', [blobShip({
      route: { from: 'leo', to: 'lunar_orbit', departedAtMs: NOW - 10_000, arrivalAtMs: NOW + 1000, cargo: {} },
    })], new Date(NOW + 1000));
    expect(f._rows).toHaveLength(1);
    expect(f._rows[0].arrivesAt.getTime()).toBe(stamped);
  });

  it('a back-filled leg is clamped against the catalogue time, so a forged one gains nothing', async () => {
    const f = fakeDb();
    await reconcileShipTransits(db(f), 'p1', [blobShip({
      route: { from: 'leo', to: 'mars_orbit', departedAtMs: NOW, arrivalAtMs: NOW + 1000, cargo: {} },
    })], new Date(NOW));
    const leg = f._rows[0];
    expect(leg.arrivesAt.getTime() - leg.departedAt.getTime())
      .toBe(Math.round(getTravelTime('leo', 'mars_orbit') * 1000 * MIN_TRAVEL_FRACTION));
  });

  it('ignores a fleet that claims nothing in flight, and closes a leg it abandoned', async () => {
    const f = fakeDb();
    await reconcileShipTransits(db(f), 'p1', [blobShip()], new Date(NOW));
    const out = await reconcileShipTransits(db(f), 'p1', [blobShip({ status: 'idle', route: undefined })], new Date(NOW));
    expect(out).toEqual({ created: 0, cancelled: 1 });
    expect(f._rows[0].status).toBe(TRANSIT_CANCELLED);
  });

  it('leaves a leg alone when its hull is simply absent from the payload', async () => {
    const f = fakeDb();
    await reconcileShipTransits(db(f), 'p1', [blobShip()], new Date(NOW));
    const out = await reconcileShipTransits(db(f), 'p1', [], new Date(NOW));
    expect(out).toEqual({ created: 0, cancelled: 0 });
    expect(f._rows[0].status).toBe(TRANSIT_IN_FLIGHT);
  });

  it('never back-fills a leg that already landed, or a malformed one', async () => {
    const f = fakeDb();
    const out = await reconcileShipTransits(db(f), 'p1', [
      blobShip({ instanceId: 'a', route: { from: 'leo', to: 'lunar_orbit', departedAtMs: NOW - 1e6, arrivalAtMs: NOW - 1 } }),
      blobShip({ instanceId: 'b', route: { from: 'leo', to: 'leo', departedAtMs: NOW, arrivalAtMs: NOW + 1000 } }),
      blobShip({ instanceId: 'c', route: undefined }),
      blobShip({ instanceId: 'd', isBuilt: false }),
      blobShip({ instanceId: 'e', status: 'mining' }),
      { garbage: true },
    ], new Date(NOW));
    expect(out.created).toBe(0);
    expect(f._rows).toHaveLength(0);
  });
});

// ─── miningOrderTransits ────────────────────────────────────────────────────

describe('miningOrderTransits', () => {
  const order = {
    profileId: 'p1', shipInstanceId: 'm1', fieldId: 'field_near_earth',
    originId: 'leo', destinationId: 'leo', status: 'pending',
    startedAt: new Date(NOW - 1000), arrivesAt: new Date(NOW + 1000),
    miningEndsAt: new Date(NOW + 5000), completesAt: new Date(NOW + 9000),
    oreId: 'metal', fillUnits: 50,
  };

  it('projects the OUTBOUND leg while the hull is still on its way to the rock', () => {
    const [leg] = miningOrderTransits([order], NOW);
    expect(leg).toMatchObject({ originId: 'leo', destinationId: 'lunar_orbit', cargo: null });
    expect(leg.arrivesAtMs).toBe(NOW + 1000);
  });

  it('projects the INBOUND leg, ore aboard, once extraction is done', () => {
    const [leg] = miningOrderTransits([order], NOW + 6000);
    expect(leg).toMatchObject({ originId: 'lunar_orbit', destinationId: 'leo', cargo: { metal: 50 } });
    expect(leg.departedAtMs).toBe(NOW + 5000);
  });

  it('drops an order whose field has no parent body', () => {
    expect(miningOrderTransits([{ ...order, fieldId: 'field_nowhere' }], NOW)).toHaveLength(0);
  });
});

// ─── adoptServerTransits (the client half) ──────────────────────────────────

type Ship = NonNullable<GameState['ships']>[number];

const clientShip = (over: Partial<Ship> = {}): Ship => ({
  instanceId: 's1', definitionId: 'freighter', name: 'SN Endeavour',
  status: 'in_transit', currentLocation: 'leo', isBuilt: true,
  route: { from: 'leo', to: 'lunar_orbit', departedAtMs: NOW - 10_000, arrivalAtMs: NOW + 1000, cargo: { metal: 10 } },
  ...over,
}) as Ship;

const stateWith = (ships: Ship[]): GameState => ({ ships } as unknown as GameState);

const block = (over: Partial<ServerTransitBlock> = {}): ServerTransitBlock => ({
  id: 't1', shipInstanceId: 's1', shipDefinitionId: 'freighter',
  originId: 'leo', destinationId: 'lunar_orbit',
  departedAtMs: NOW - 10_000, arrivesAtMs: NOW + LEO_LUNAR_MS,
  arrivedAtMs: null, status: TRANSIT_IN_FLIGHT, cargo: { metal: 10 }, ...over,
});

describe('adoptServerTransits', () => {
  it('the server\'s clock wins: a forged early arrival is replaced by the row\'s', () => {
    const next = adoptServerTransits(stateWith([clientShip()]), [block()], NOW);
    expect(next.ships![0].route!.arrivalAtMs).toBe(NOW + LEO_LUNAR_MS);
    expect(next.ships![0].route!.departedAtMs).toBe(NOW - 10_000);
    // The manifest is untouched — it is the client's to credit on arrival.
    expect(next.ships![0].route!.cargo).toEqual({ metal: 10 });
  });

  it('restores a leg the save lost entirely, manifest and all', () => {
    const idle = clientShip({ status: 'idle', route: undefined, currentLocation: 'ceres_surface' });
    const next = adoptServerTransits(stateWith([idle]), [block()], NOW);
    expect(next.ships![0]).toMatchObject({ status: 'in_transit', currentLocation: 'leo' });
    expect(next.ships![0].route).toMatchObject({ from: 'leo', to: 'lunar_orbit', cargo: { metal: 10 } });
  });

  it('pulls a landed leg\'s arrival DOWN, never up, and never clears the route', () => {
    const held = clientShip({ route: { from: 'leo', to: 'lunar_orbit', departedAtMs: NOW - 10_000, arrivalAtMs: NOW + 9_000_000, cargo: { metal: 10 } } });
    const landed = block({ status: TRANSIT_ARRIVED, arrivesAtMs: NOW - 1, arrivedAtMs: NOW - 1 });
    const next = adoptServerTransits(stateWith([held]), [landed], NOW);
    expect(next.ships![0].route!.arrivalAtMs).toBe(NOW - 1);
    expect(next.ships![0].route!.cargo).toEqual({ metal: 10 });
    // Already at or before the server's instant: nothing moves.
    const early = clientShip({ route: { from: 'leo', to: 'lunar_orbit', departedAtMs: NOW - 10_000, arrivalAtMs: NOW - 5000, cargo: {} } });
    const s0 = stateWith([early]);
    expect(adoptServerTransits(s0, [landed], NOW)).toBe(s0);
  });

  it('ignores cancelled rows, unknown hulls and empty input (same reference back)', () => {
    const s0 = stateWith([clientShip()]);
    expect(adoptServerTransits(s0, null, NOW)).toBe(s0);
    expect(adoptServerTransits(s0, [], NOW)).toBe(s0);
    expect(adoptServerTransits(s0, [block({ shipInstanceId: 'other' })], NOW)).toBe(s0);
    expect(adoptServerTransits(s0, [block({ status: TRANSIT_CANCELLED, arrivesAtMs: NOW - 1 })], NOW)).toBe(s0);
  });

  it('takes the newest leg when several rows name the same hull', () => {
    const rows = [
      block({ id: 'old', destinationId: 'geo', departedAtMs: NOW - 90_000 }),
      block({ id: 'new', destinationId: 'lunar_orbit', departedAtMs: NOW - 10_000 }),
    ];
    const next = adoptServerTransits(stateWith([clientShip({ route: undefined, status: 'idle' })]), rows, NOW);
    expect(next.ships![0].route!.to).toBe('lunar_orbit');
  });
});
