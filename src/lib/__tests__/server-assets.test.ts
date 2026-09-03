/**
 * @jest-environment node
 *
 * Server-authoritative assets, phase 3 slice 1 — buildings
 * (docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings"): the
 * /api/space-tycoon/assets/* routes, the completion cron, and the pure
 * helpers in server-assets.ts.
 *
 * Prisma is mocked the same way as inventory-phase2.test.ts: explicit
 * jest.fn() models, a rejecting proxy for everything else, `$transaction`
 * runs the callback against the same client.
 */

import { NextRequest } from 'next/server';

const mockGameProfile = { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
const mockServerAsset = {
  findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), createMany: jest.fn(),
  update: jest.fn(), updateMany: jest.fn(),
};
const mockGameLedgerEntry = { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() };
const mockColonyClaim = { findUnique: jest.fn() };
const mockOrbitalSlotOccupancy = { findUnique: jest.fn() };
const mockOrbitalSlotLease = { findFirst: jest.fn() };
const mockMarketAuditLog = { create: jest.fn() };

jest.mock('@/lib/db', () => {
  const reject = () => Promise.reject(new Error('no database in test'));
  const rejectingModel: unknown = new Proxy({}, { get: () => reject });
  const explicit = (): Record<string, unknown> => ({
    gameProfile: mockGameProfile,
    serverAsset: mockServerAsset,
    gameLedgerEntry: mockGameLedgerEntry,
    colonyClaim: mockColonyClaim,
    orbitalSlotOccupancy: mockOrbitalSlotOccupancy,
    orbitalSlotLease: mockOrbitalSlotLease,
    marketAuditLog: mockMarketAuditLog,
  });
  const client: unknown = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'then') return undefined;
      if (prop === '$transaction') {
        return (arg: unknown) => (typeof arg === 'function'
          ? (arg as (tx: unknown) => Promise<unknown>)(client)
          : Promise.all(arg as Promise<unknown>[]));
      }
      if (prop === '$queryRaw' || prop === '$executeRaw') return reject;
      const models = explicit();
      if (typeof prop === 'string' && prop in models) return models[prop];
      return rejectingModel;
    },
  });
  return { __esModule: true, default: client, prisma: client };
});

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
const mockRecordLedger = jest.fn();
jest.mock('@/lib/game/server-ledger', () => {
  const actual = jest.requireActual('@/lib/game/server-ledger');
  return {
    ...actual,
    isLedgerAvailable: jest.fn().mockResolvedValue(true),
    recordLedger: (...args: unknown[]) => mockRecordLedger(...args),
  };
});

import { getServerSession } from 'next-auth';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import { BUILDING_MAP, scaledBuildTime } from '@/lib/game/buildings';
import { scaledBuildingCost } from '@/lib/game/formulas';
import { ORBITAL_SLOT_MAP } from '@/lib/game/spatial-strategy';
import { getMarkUpgradeCost, getMarkUpgradeResourceCost, getMarkUpgradeSeconds } from '@/lib/game/mark-upgrades';
import { computeDecommissionRecovery, REACTIVATION_FEE_FRACTION } from '@/lib/game/mothball';
import { calculateRushRepairCost } from '@/lib/game/hazards';
import {
  ASSET_BASELINE_KEY,
  buildAdoptionRows,
  computeServerBuildCost,
  computeServerBuildDuration,
  diffClientAssets,
  mergeServerBuildings,
  rowToBuildingInstance,
  type ServerAssetRow,
} from '@/lib/game/server-assets';
import { ASSET_ROUTE_MAX_PER_MINUTE } from '@/lib/game/asset-route-shared';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const PAST_ISO = '2026-08-01T00:00:00.000Z';
const PAD = BUILDING_MAP.get('launch_pad_small')!;
const PAD_MED = BUILDING_MAP.get('launch_pad_medium')!;
const FAB = BUILDING_MAP.get('fabrication_earth')!;

function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    companyName: 'Test Aerospace',
    money: 1_000_000_000,
    netWorth: 900_000_000, // above the Frontier cap — no slot-gate exemption
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    buildingsData: [],
    workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO },
    resources: { iron: 100, aluminum: 100, titanium: 1000, rare_earth: 100, platinum_group: 100 },
    serverResources: null,
    completedResearchList: [],
    unlockedLocationsList: [],
    ...overrides,
  };
}

function row(overrides: Partial<ServerAssetRow> = {}): ServerAssetRow {
  const startedAt = new Date(Date.now() - 3600_000);
  return {
    id: 'row-1', profileId: 'profile-1', kind: 'building', definitionId: 'launch_pad_small', instanceId: 'b1',
    locationId: 'earth_surface', status: 'complete', markLevel: 1, startedAt,
    completesAt: new Date(startedAt.getTime() + 300_000), paidMoney: 50_000_000, paidResources: {}, ledgerSeq: 1,
    ...overrides,
  };
}

type RouteName = 'build' | 'refit' | 'sell' | 'mothball' | 'reactivate' | 'repair';
async function post(route: RouteName, body: unknown) {
  const mod = route === 'build' ? await import('@/app/api/space-tycoon/assets/build/route')
    : route === 'refit' ? await import('@/app/api/space-tycoon/assets/refit/route')
    : route === 'sell' ? await import('@/app/api/space-tycoon/assets/sell/route')
    : route === 'mothball' ? await import('@/app/api/space-tycoon/assets/mothball/route')
    : route === 'reactivate' ? await import('@/app/api/space-tycoon/assets/reactivate/route')
    : await import('@/app/api/space-tycoon/assets/repair/route');
  const req = new NextRequest(`http://localhost/api/space-tycoon/assets/${route}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const res = await mod.POST(req);
  return { res, json: await res.json() };
}

function setup(profile = profileRow(), rows: ServerAssetRow[] = []) {
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
  mockGameProfile.findUnique.mockResolvedValue(profile);
  mockGameProfile.update.mockResolvedValue({});
  mockGameProfile.updateMany.mockResolvedValue({ count: 1 });
  mockServerAsset.findMany.mockResolvedValue(rows);
  mockServerAsset.findUnique.mockImplementation(async ({ where }: { where: { profileId_instanceId: { instanceId: string } } }) =>
    rows.find(r => r.instanceId === where.profileId_instanceId.instanceId) ?? null);
  mockServerAsset.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'row-new', ...data }));
  mockServerAsset.createMany.mockResolvedValue({ count: 0 });
  mockServerAsset.update.mockResolvedValue({});
  mockServerAsset.updateMany.mockResolvedValue({ count: 1 });
  mockGameLedgerEntry.findFirst.mockResolvedValue({ seq: 42 });
  mockGameLedgerEntry.findMany.mockResolvedValue([]);
  mockColonyClaim.findUnique.mockResolvedValue(null);
  mockOrbitalSlotOccupancy.findUnique.mockResolvedValue(null);
  mockOrbitalSlotLease.findFirst.mockResolvedValue(null);
  mockMarketAuditLog.create.mockResolvedValue({});
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetRouteThrottle();
});

// ─── Pure helpers ────────────────────────────────────────────────────────────

describe('server-assets.ts — pure helpers', () => {
  it('prices the build with the client formula on the server count and persisted research', () => {
    const priced = computeServerBuildCost(PAD, 2, []);
    expect(priced.cost).toBe(Math.round(scaledBuildingCost(PAD.baseCost, 2)));
    expect(priced.buildCostReduction).toBe(0);
    expect(priced.countAtLocation).toBe(2);
  });

  it('build duration: base is the client scaled time; server time ignores every client-only multiplier', () => {
    const t = computeServerBuildDuration(PAD, 2, []);
    expect(t.baseSeconds).toBe(scaledBuildTime(PAD.realBuildSeconds, 2));
    expect(t.researchBuildSpeedMult).toBe(1);
    // No research → the server horizon IS the base time (DEV_FAST is 1 in tests).
    expect(t.serverSeconds).toBe(t.baseSeconds);
    // A conservative value can never be faster than base / the Wave-B cap.
    expect(t.serverSeconds).toBeGreaterThanOrEqual(Math.ceil(t.baseSeconds / 2));
  });

  it('rowToBuildingInstance: a complete row with a future completesAt is a refit in progress at markLevel - 1', () => {
    const now = Date.now();
    const refit = row({ status: 'complete', markLevel: 2, startedAt: new Date(now - 1000), completesAt: new Date(now + 60_000) });
    const inst = rowToBuildingInstance(refit, { damagePct: 0.2, supplyPolicy: 'market' }, now);
    expect(inst.isComplete).toBe(true);
    expect(inst.markLevel).toBeUndefined(); // effective Mark I
    expect(inst.markUpgradeTarget).toBe(2);
    expect(inst.markUpgradeStartedAtMs).toBe(now - 1000);
    expect(inst.damagePct).toBe(0.2);      // client-owned, merged
    expect(inst.supplyPolicy).toBe('market');
    expect(inst.source).toBe('server');
    // ...and once the clock passes completesAt it reads Mark II.
    const done = rowToBuildingInstance(refit, undefined, now + 61_000);
    expect(done.markLevel).toBe(2);
    expect(done.markUpgradeTarget).toBeUndefined();
  });

  it('rowToBuildingInstance: pending rows complete lazily once completesAt passes; mothballed rows keep their status', () => {
    const now = Date.now();
    const pending = row({ status: 'pending', startedAt: new Date(now - 10_000), completesAt: new Date(now + 10_000) });
    expect(rowToBuildingInstance(pending, undefined, now).isComplete).toBe(false);
    expect(rowToBuildingInstance(pending, undefined, now + 11_000).isComplete).toBe(true);
    const moth = rowToBuildingInstance(row({ status: 'mothballed' }), { status: 'mothballed', mothballedAtMonth: 7 }, now);
    expect(moth.isComplete).toBe(true);
    expect(moth.status).toBe('mothballed');
    expect(moth.mothballedAtMonth).toBe(7);
  });

  it('mergeServerBuildings: off = client rows, shadow = union, enforce = server rows the client still lists', () => {
    const rows = [row({ instanceId: 'b1' }), row({ id: 'row-2', instanceId: 'b3' }), row({ id: 'row-3', instanceId: 'sold', status: 'sold' })];
    const client = [
      { instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true },
      { instanceId: 'b2', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true },
    ];
    const off = mergeServerBuildings(rows, client, 'off');
    expect(off.source).toBe('client');
    expect(off.buildings.map(b => b.instanceId)).toEqual(['b1', 'b2']);

    const shadow = mergeServerBuildings(rows, client, 'shadow');
    expect(shadow.source).toBe('union');
    expect(shadow.buildings.map(b => `${b.instanceId}:${b.source}`).sort()).toEqual(['b1:server', 'b2:client', 'b3:server']);

    const enforce = mergeServerBuildings(rows, client, 'enforce');
    expect(enforce.source).toBe('server');
    expect(enforce.buildings.map(b => b.instanceId)).toEqual(['b1']); // b2 never paid; b3 hidden by the client; sold never counts
  });

  it('diffClientAssets reports both directions and flags id-less client entries', () => {
    const rows = [row({ instanceId: 'b1' }), row({ id: 'row-2', instanceId: 'b3' })];
    const diff = diffClientAssets([{ instanceId: 'b1' }, { instanceId: 'b2' }, { definitionId: 'launch_pad_small' }], rows);
    expect(diff.clientNotInLedger).toEqual(['b2', '?']);
    expect(diff.serverNotInClient).toEqual(['b3']);
  });

  it('buildAdoptionRows: complete → complete, pending keeps its timing, decommissioning and unknown definitions are skipped', () => {
    const now = Date.now();
    const rows = buildAdoptionRows('profile-1', [
      { instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true, markLevel: 2 },
      { instanceId: 'b2', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: false, startedAtMs: now - 100_000, realDurationSeconds: 300 },
      { instanceId: 'b3', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true, status: 'decommissioning' },
      { instanceId: 'b4', definitionId: 'not_a_building', locationId: 'earth_surface', isComplete: true },
      { definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true }, // no id
    ], now);
    expect(rows.map(r => r.instanceId)).toEqual(['b1', 'b2']);
    expect(rows[0]).toEqual(expect.objectContaining({ status: 'complete', markLevel: 2, paidMoney: 0, ledgerSeq: null }));
    expect(rows[1].status).toBe('pending');
    expect((rows[1].completesAt as Date).getTime()).toBe(now - 100_000 + 300_000);
  });
});

// ─── POST /assets/build ──────────────────────────────────────────────────────

describe('POST /api/space-tycoon/assets/build', () => {
  const body = { definitionId: 'launch_pad_small', locationId: 'earth_surface', instanceId: 'new-1' };

  it('401 without a session', async () => {
    setup();
    mockGetServerSession.mockResolvedValue(null as never);
    const { res } = await post('build', body);
    expect(res.status).toBe(401);
  });

  it('429 after the per-profile budget (30/min) is spent', async () => {
    setup();
    for (let i = 0; i < ASSET_ROUTE_MAX_PER_MINUTE; i++) {
      const { res } = await post('build', { ...body, definitionId: 'nope' });
      expect(res.status).toBe(400);
    }
    const { res, json } = await post('build', body);
    expect(res.status).toBe(429);
    expect(json.error).toBe('rate_limited');
    expect(mockServerAsset.create).not.toHaveBeenCalled();
  });

  it('validates definition, location, research gate, unlock and cap', async () => {
    setup();
    expect((await post('build', { ...body, definitionId: 'nope' })).json.code).toBe('unknown_definition');
    expect((await post('build', { ...body, locationId: 'leo' })).json.code).toBe('wrong_location');
    expect((await post('build', { ...body, definitionId: 'launch_pad_medium' })).json.code).toBe('research_required');
    expect((await post('build', { ...body, instanceId: 'bad id!' })).json.code).toBe('invalid_instance_id');

    // A non-starting location the profile never unlocked (and never claimed).
    const lunar = Array.from(BUILDING_MAP.values()).find(d => d.requiredLocation === 'lunar_surface' && d.requiredResearch.length === 0)
      ?? Array.from(BUILDING_MAP.values()).find(d => d.requiredLocation === 'lunar_surface')!;
    setup(profileRow({ completedResearchList: lunar.requiredResearch }));
    expect((await post('build', { definitionId: lunar.id, locationId: 'lunar_surface', instanceId: 'new-2' })).json.code).toBe('location_locked');
    // ...but a ColonyClaim there unlocks it.
    mockColonyClaim.findUnique.mockResolvedValue({ id: 'claim-1' });
    const claimed = await post('build', { definitionId: lunar.id, locationId: 'lunar_surface', instanceId: 'new-2' });
    expect(claimed.json.code).not.toBe('location_locked');
    mockServerAsset.create.mockClear();

    // maxPerPlayer cap counts live rows.
    setup(profileRow({ completedResearchList: FAB.requiredResearch }), [row({ definitionId: 'fabrication_earth', instanceId: 'fab-1', locationId: FAB.requiredLocation })]);
    const capped = await post('build', { definitionId: 'fabrication_earth', locationId: FAB.requiredLocation, instanceId: 'fab-2' });
    expect(capped.res.status).toBe(400);
    expect(capped.json.code).toBe('cap_reached');
    expect(mockServerAsset.create).not.toHaveBeenCalled();
  });

  it('refuses when money or materials are short — nothing is written', async () => {
    setup(profileRow({ money: 1 }));
    const poor = await post('build', body);
    expect(poor.res.status).toBe(400);
    expect(poor.json.code).toBe('insufficient_funds');

    setup(profileRow({ completedResearchList: PAD_MED.requiredResearch, resources: { iron: 10 } }));
    const short = await post('build', { ...body, definitionId: 'launch_pad_medium' });
    expect(short.res.status).toBe(400);
    expect(short.json.code).toBe('insufficient_resources');
    expect(mockServerAsset.create).not.toHaveBeenCalled();
    expect(mockRecordLedger).not.toHaveBeenCalled();
  });

  it('enforces the orbital-slot gate on a saturated pool without a lease (no Frontier exemption for an old, rich profile)', async () => {
    const orbital = Array.from(BUILDING_MAP.values()).find(d => ORBITAL_SLOT_MAP.has(d.requiredLocation) && d.requiredResearch.length === 0);
    if (!orbital) return; // no such definition in the catalogue — nothing to gate
    setup(profileRow({ unlockedLocationsList: [orbital.requiredLocation] }));
    mockOrbitalSlotOccupancy.findUnique.mockResolvedValue({ bucket: 'saturated' });
    const gated = await post('build', { definitionId: orbital.id, locationId: orbital.requiredLocation, instanceId: 'orb-1' });
    expect(gated.res.status).toBe(400);
    expect(gated.json.code).toBe('slot_gate');
    // With an active lease the build proceeds.
    mockOrbitalSlotLease.findFirst.mockResolvedValue({ id: 'lease-1' });
    const leased = await post('build', { definitionId: orbital.id, locationId: orbital.requiredLocation, instanceId: 'orb-1' });
    expect(leased.res.status).toBe(200);
  });

  it('success: prices server-side, debits atomically, ledgers money + materials, inserts a pending row with the conservative completesAt', async () => {
    setup(profileRow({ completedResearchList: PAD_MED.requiredResearch }), [row({ definitionId: 'launch_pad_medium', instanceId: 'm-0' })]);
    const before = Date.now();
    const { res, json } = await post('build', { ...body, definitionId: 'launch_pad_medium' });
    expect(res.status).toBe(200);

    // Count = the ONE live row of this definition at this location → Nth-copy price.
    const expected = computeServerBuildCost(PAD_MED, 1, PAD_MED.requiredResearch);
    expect(json.cost).toBe(expected.cost);
    expect(json.countAtLocation).toBe(1);
    expect(json.instanceId).toBe('new-1');
    expect(json.resourceCost).toEqual(PAD_MED.resourceCost);

    const timing = computeServerBuildDuration(PAD_MED, 1, PAD_MED.requiredResearch);
    expect(json.realDurationSeconds).toBe(timing.baseSeconds);
    const completesAt = Date.parse(json.completesAt);
    expect(completesAt - json.startedAtMs).toBe(timing.serverSeconds * 1000);
    expect(json.startedAtMs).toBeGreaterThanOrEqual(before);

    // Row: pending, paid figures recorded.
    const created = mockServerAsset.create.mock.calls[0][0].data;
    expect(created).toEqual(expect.objectContaining({
      profileId: 'profile-1', kind: 'building', definitionId: 'launch_pad_medium', instanceId: 'new-1',
      locationId: 'earth_surface', status: 'pending', markLevel: 1, paidMoney: expected.cost, paidResources: PAD_MED.resourceCost,
    }));
    expect(mockServerAsset.update).toHaveBeenCalledWith({ where: { id: 'row-new' }, data: { ledgerSeq: 42 } });

    // Atomic debit guard + ledger rows.
    const debit = mockGameProfile.updateMany.mock.calls[0][0];
    expect(debit.where).toEqual({ id: 'profile-1', money: { gte: expected.cost } });
    expect(debit.data.money).toEqual({ decrement: expected.cost });
    const reasons = mockRecordLedger.mock.calls.map(c => c[1]);
    expect(reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ profileId: 'profile-1', moneyDelta: -expected.cost, reason: 'building_build', refId: 'row-new' }),
      expect.objectContaining({ resourceSlug: 'iron', resourceDelta: -50, reason: 'building_build_resources' }),
      expect.objectContaining({ resourceSlug: 'aluminum', resourceDelta: -30, reason: 'building_build_resources' }),
    ]));
  });

  it('is retry-safe: the same instanceId returns the existing row and charges nothing', async () => {
    setup(profileRow(), [row({ instanceId: 'new-1', status: 'pending' })]);
    const { res, json } = await post('build', body);
    expect(res.status).toBe(200);
    expect(json.idempotent).toBe(true);
    expect(mockServerAsset.create).not.toHaveBeenCalled();
    expect(mockGameProfile.updateMany).not.toHaveBeenCalled();
    expect(mockRecordLedger).not.toHaveBeenCalled();
  });

  it('adopts a pre-registry save exactly once before pricing (marker stamped)', async () => {
    setup(profileRow({
      workforceData: { engineers: 3 },
      buildingsData: [{ instanceId: 'old-1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true }],
    }));
    // After adoption the registry lists the adopted row → Nth-copy price.
    mockServerAsset.findMany.mockResolvedValue([row({ instanceId: 'old-1', paidMoney: 0, ledgerSeq: null })]);
    const { res, json } = await post('build', body);
    expect(res.status).toBe(200);
    expect(mockServerAsset.createMany).toHaveBeenCalledTimes(1);
    expect(mockServerAsset.createMany.mock.calls[0][0].data[0]).toEqual(expect.objectContaining({ instanceId: 'old-1', status: 'complete', paidMoney: 0 }));
    const marker = mockGameProfile.update.mock.calls[0][0].data.workforceData;
    expect(marker.engineers).toBe(3);
    expect(typeof marker[ASSET_BASELINE_KEY]).toBe('string');
    expect(json.countAtLocation).toBe(1);
    expect(json.cost).toBe(computeServerBuildCost(PAD, 1, []).cost);
  });

  it('503 when the registry table is unavailable (nothing charged)', async () => {
    setup(profileRow({ workforceData: null }));
    mockServerAsset.createMany.mockRejectedValue(new Error('relation "ServerAsset" does not exist'));
    const { res, json } = await post('build', body);
    expect(res.status).toBe(503);
    expect(json.code).toBe('registry_unavailable');
    expect(mockRecordLedger).not.toHaveBeenCalled();
  });
});

// ─── refit / sell / mothball / reactivate / repair ───────────────────────────

describe('POST /api/space-tycoon/assets/refit', () => {
  it('charges the Mark cost + materials and writes the target mark with a future completesAt', async () => {
    setup(profileRow(), [row()]);
    const { res, json } = await post('refit', { instanceId: 'b1' });
    expect(res.status).toBe(200);
    const cost = getMarkUpgradeCost(PAD, 2);
    const materials = getMarkUpgradeResourceCost(PAD, 2);
    expect(json.target).toBe(2);
    expect(json.cost).toBe(cost);
    expect(json.durationSeconds).toBe(getMarkUpgradeSeconds(PAD, 2));
    const flip = mockServerAsset.updateMany.mock.calls[0][0];
    expect(flip.where).toEqual(expect.objectContaining({ id: 'row-1', status: 'complete', markLevel: 1 }));
    expect(flip.data).toEqual(expect.objectContaining({ markLevel: 2, paidMoney: { increment: cost } }));
    expect((flip.data.completesAt as Date).getTime() - (flip.data.startedAt as Date).getTime()).toBe(getMarkUpgradeSeconds(PAD, 2) * 1000);
    const reasons = mockRecordLedger.mock.calls.map(c => c[1]);
    expect(reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ moneyDelta: -cost, reason: 'building_refit', refId: 'row-1' }),
      ...Object.entries(materials).map(([slug, qty]) => expect.objectContaining({ resourceSlug: slug, resourceDelta: -qty, reason: 'building_refit_resources' })),
    ]));
  });

  it('refuses a refit already in progress, a pending build, and a damaged building', async () => {
    const now = Date.now();
    setup(profileRow(), [row({ markLevel: 2, startedAt: new Date(now - 1000), completesAt: new Date(now + 60_000) })]);
    expect((await post('refit', { instanceId: 'b1' })).json.code).toBe('refit_blocked');
    setup(profileRow(), [row({ status: 'pending', completesAt: new Date(now + 60_000) })]);
    expect((await post('refit', { instanceId: 'b1' })).json.code).toBe('refit_blocked');
    setup(profileRow({ buildingsData: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true, damagePct: 0.5 }] }), [row()]);
    expect((await post('refit', { instanceId: 'b1' })).json.code).toBe('refit_blocked');
    expect(mockRecordLedger).not.toHaveBeenCalled();
    expect((await post('refit', { instanceId: 'ghost' })).res.status).toBe(404);
  });
});

describe('POST /api/space-tycoon/assets/sell', () => {
  it('flips the row to sold and credits the below-book recovery (money + materials) through the ledger', async () => {
    setup(profileRow({ completedResearchList: PAD_MED.requiredResearch }), [row({ definitionId: 'launch_pad_medium' })]);
    const { res, json } = await post('sell', { instanceId: 'b1' });
    expect(res.status).toBe(200);
    const recovery = computeDecommissionRecovery(PAD_MED);
    expect(json.recovery).toEqual(recovery);
    const flip = mockServerAsset.updateMany.mock.calls[0][0];
    expect(flip.where).toEqual({ id: 'row-1', status: { in: ['complete', 'mothballed'] } });
    expect(flip.data).toEqual({ status: 'sold' });
    expect(mockGameProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { money: { increment: recovery.money }, totalEarned: { increment: recovery.money } },
    });
    const reasons = mockRecordLedger.mock.calls.map(c => c[1]);
    expect(reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ moneyDelta: recovery.money, reason: 'building_decommission_recovery' }),
      ...Object.entries(recovery.resources).map(([slug, qty]) => expect.objectContaining({ resourceSlug: slug, resourceDelta: qty, reason: 'building_decommission_recovery' })),
    ]));
  });

  it('refuses a pending build and a double sale', async () => {
    setup(profileRow(), [row({ status: 'pending', completesAt: new Date(Date.now() + 60_000) })]);
    expect((await post('sell', { instanceId: 'b1' })).json.code).toBe('not_complete');
    setup(profileRow(), [row()]);
    mockServerAsset.updateMany.mockResolvedValue({ count: 0 });
    const dup = await post('sell', { instanceId: 'b1' });
    expect(dup.res.status).toBe(409);
    expect(mockGameProfile.update).not.toHaveBeenCalled();
  });
});

describe('POST /api/space-tycoon/assets/mothball + reactivate', () => {
  it('mothball flips complete → mothballed with no money movement', async () => {
    setup(profileRow(), [row()]);
    const { res } = await post('mothball', { instanceId: 'b1' });
    expect(res.status).toBe(200);
    expect(mockServerAsset.updateMany).toHaveBeenCalledWith({ where: { id: 'row-1', status: 'complete' }, data: { status: 'mothballed' } });
    expect(mockRecordLedger).not.toHaveBeenCalled();
    expect(mockGameProfile.updateMany).not.toHaveBeenCalled();
  });

  it('reactivate charges the spin-up fee and flips mothballed → complete', async () => {
    setup(profileRow(), [row({ status: 'mothballed' })]);
    const { res, json } = await post('reactivate', { instanceId: 'b1' });
    expect(res.status).toBe(200);
    const fee = Math.round(PAD.baseCost * REACTIVATION_FEE_FRACTION);
    expect(json.fee).toBe(fee);
    expect(mockServerAsset.updateMany).toHaveBeenCalledWith({ where: { id: 'row-1', status: 'mothballed' }, data: { status: 'complete' } });
    expect(mockGameProfile.updateMany.mock.calls[0][0].where).toEqual({ id: 'profile-1', money: { gte: fee } });
    expect(mockRecordLedger).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ moneyDelta: -fee, reason: 'building_reactivation_fee' }));
    // Not mothballed → refused.
    setup(profileRow(), [row()]);
    expect((await post('reactivate', { instanceId: 'b1' })).json.code).toBe('not_mothballed');
  });
});

describe('POST /api/space-tycoon/assets/repair', () => {
  it('charges the rush-repair fee for the client-owned damage figure (capped) and leaves the row alone', async () => {
    setup(profileRow(), [row()]);
    const { res, json } = await post('repair', { instanceId: 'b1', damagePct: 0.5 });
    expect(res.status).toBe(200);
    const cost = calculateRushRepairCost(0.5, PAD.baseCost);
    expect(json.cost).toBe(cost);
    expect(mockRecordLedger).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ moneyDelta: -cost, reason: 'building_rush_repair', refId: 'row-1' }));
    expect(mockServerAsset.updateMany).not.toHaveBeenCalled();
    // Damage above the hazard cap is priced at the cap, never higher.
    setup(profileRow(), [row()]);
    const capped = await post('repair', { instanceId: 'b1', damagePct: 5 });
    expect(capped.json.cost).toBe(calculateRushRepairCost(0.85, PAD.baseCost));
    // Nothing to repair → 400, nothing charged.
    setup(profileRow(), [row()]);
    expect((await post('repair', { instanceId: 'b1', damagePct: 0 })).json.code).toBe('no_damage');
  });
});

// ─── Cron ────────────────────────────────────────────────────────────────────

describe('POST /api/cron/assets-complete', () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET;
  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIGINAL_SECRET;
  });

  it('flips pending rows whose completesAt has passed; fails closed without the secret', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const { POST } = await import('@/app/api/cron/assets-complete/route');
    mockServerAsset.updateMany.mockResolvedValue({ count: 3 });

    const unauth = await POST(new NextRequest('http://localhost/api/cron/assets-complete', { method: 'POST' }));
    expect(unauth.status).toBe(401);
    expect(mockServerAsset.updateMany).not.toHaveBeenCalled();

    const res = await POST(new NextRequest('http://localhost/api/cron/assets-complete', {
      method: 'POST', headers: { authorization: 'Bearer test-secret' },
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).completed).toBe(3);
    const call = mockServerAsset.updateMany.mock.calls[0][0];
    expect(call.where).toEqual(expect.objectContaining({ kind: 'building', status: 'pending', completesAt: { lte: expect.any(Date) } }));
    expect(call.data).toEqual({ status: 'complete' });
  });
});
