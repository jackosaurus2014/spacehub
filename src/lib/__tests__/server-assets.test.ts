/**
 * @jest-environment node
 *
 * Server-authoritative assets, phase 3 slice 1 — buildings
 * (docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings") and slices
 * 2-5 — research / ships / services / locations ("Phase 3 slices 2-5"): the
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
const mockColonyClaim = { findUnique: jest.fn(), findMany: jest.fn() };
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
  ASSET_BASELINE2_KEY,
  SHIP_SCRAP_RECOVERY_FRACTION,
  buildAdoptionRows,
  buildAdoptionRows2,
  checkResearchStart,
  computeServerBuildCost,
  computeServerBuildDuration,
  computeServerResearchQuote,
  computeServerShipCost,
  deriveServicesFromAssets,
  diffClientAssets,
  diffClientAssets2,
  locationInstanceId,
  mergeServerBuildings,
  mergeServerLocations,
  mergeServerResearch,
  mergeServerServices,
  mergeServerShips,
  researchInstanceId,
  rowToBuildingInstance,
  rowToShipInstance,
  shipsAdoptable,
  type ServerAssetRow,
} from '@/lib/game/server-assets';
import { RESEARCH_MAP } from '@/lib/game/research-tree';
import { SHIP_MAP } from '@/lib/game/ships';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { SERVICE_MAP } from '@/lib/game/services';
import { DEV_FAST_MULTIPLIER } from '@/lib/game/constants';
import { processTick } from '@/lib/game/game-engine';
import { getNewGameState } from '@/lib/game/save-load';
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
    shipsData: [],
    activeServicesData: [],
    workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO, [ASSET_BASELINE2_KEY]: PAST_ISO },
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

type RouteName = 'build' | 'refit' | 'sell' | 'mothball' | 'reactivate' | 'repair' | 'research' | 'ship' | 'scrap' | 'unlock';
async function post(route: RouteName, body: unknown) {
  const mod = route === 'build' ? await import('@/app/api/space-tycoon/assets/build/route')
    : route === 'refit' ? await import('@/app/api/space-tycoon/assets/refit/route')
    : route === 'sell' ? await import('@/app/api/space-tycoon/assets/sell/route')
    : route === 'mothball' ? await import('@/app/api/space-tycoon/assets/mothball/route')
    : route === 'reactivate' ? await import('@/app/api/space-tycoon/assets/reactivate/route')
    : route === 'research' ? await import('@/app/api/space-tycoon/assets/research/route')
    : route === 'ship' ? await import('@/app/api/space-tycoon/assets/ship/route')
    : route === 'scrap' ? await import('@/app/api/space-tycoon/assets/scrap/route')
    : route === 'unlock' ? await import('@/app/api/space-tycoon/assets/unlock/route')
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
  mockColonyClaim.findMany.mockResolvedValue([]);
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
    // ...but a ColonyClaim there unlocks it (slice 5: the location projection).
    mockColonyClaim.findMany.mockResolvedValue([{ locationId: 'lunar_surface' }]);
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
    // Slice 1 adoption (buildings) + slices 2-5 adoption (research / ships / locations — nothing here).
    expect(mockServerAsset.createMany).toHaveBeenCalledTimes(2);
    expect(mockServerAsset.createMany.mock.calls[0][0].data[0]).toEqual(expect.objectContaining({ instanceId: 'old-1', status: 'complete', paidMoney: 0 }));
    expect(mockServerAsset.createMany.mock.calls[1][0].data).toEqual([]);
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
    mockServerAsset.findMany.mockResolvedValue([]);
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
    expect(call.where).toEqual(expect.objectContaining({ kind: { in: ['building', 'research', 'ship', 'location'] }, status: 'pending', completesAt: { lte: expect.any(Date) } }));
    expect(call.data).toEqual({ status: 'complete' });
  });

  it('appends a completed research row to the persisted completedResearchList exactly once (repeatables excluded)', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const { POST } = await import('@/app/api/cron/assets-complete/route');
    const repeatable = Array.from(RESEARCH_MAP.values()).find(r => !!r.repeatable)!;
    mockServerAsset.findMany.mockResolvedValue([
      { profileId: 'profile-1', definitionId: 'reusable_boosters' },
      { profileId: 'profile-1', definitionId: 'launch_abort_systems' },
      { profileId: 'profile-1', definitionId: repeatable.id },
    ]);
    mockServerAsset.updateMany.mockResolvedValue({ count: 3 });
    mockGameProfile.findUnique.mockResolvedValue({ completedResearchList: ['launch_abort_systems'] });
    mockGameProfile.update.mockResolvedValue({});
    const res = await POST(new NextRequest('http://localhost/api/cron/assets-complete', {
      method: 'POST', headers: { authorization: 'Bearer test-secret' },
    }));
    expect(res.status).toBe(200);
    expect(mockGameProfile.update).toHaveBeenCalledTimes(1);
    expect(mockGameProfile.update.mock.calls[0][0]).toEqual({
      where: { id: 'profile-1' },
      data: { completedResearchList: ['launch_abort_systems', 'reusable_boosters'], researchCount: 2 },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3 slices 2-5 — research / ships / services / locations
// ═══════════════════════════════════════════════════════════════════════════

const BOOSTERS = RESEARCH_MAP.get('reusable_boosters')!;          // tier 1, no prerequisites
const CADENCE = RESEARCH_MAP.get('rapid_launch_cadence')!;         // requires reusable_boosters
const T3_RESEARCH = Array.from(RESEARCH_MAP.values()).find(r => r.tier === 3 && r.prerequisites.length === 0 && !r.repeatable && !r.rare)
  ?? Array.from(RESEARCH_MAP.values()).find(r => r.tier === 3 && !r.repeatable && !r.rare)!;
const REPEATABLE = Array.from(RESEARCH_MAP.values()).find(r => !!r.repeatable)!;
const SHIP_DEF = Array.from(SHIP_MAP.values()).find(s => s.requiredResearch.length === 0)!;
const GATED_SHIP = Array.from(SHIP_MAP.values()).find(s => s.requiredResearch.length > 0)!;
const GEO = LOCATION_MAP.get('geo')!;                              // $50M, no research
const LUNAR_ORBIT = LOCATION_MAP.get('lunar_orbit')!;              // requires reusable_boosters

function researchRow(definitionId: string, overrides: Partial<ServerAssetRow> = {}): ServerAssetRow {
  const startedAt = new Date(Date.now() - 3600_000);
  return {
    id: `row-r-${definitionId}`, profileId: 'profile-1', kind: 'research', definitionId, instanceId: researchInstanceId(definitionId),
    locationId: null, status: 'complete', markLevel: 1, startedAt, completesAt: startedAt, paidMoney: 0, paidResources: {}, ledgerSeq: null,
    ...overrides,
  };
}
function shipRow(instanceId: string, overrides: Partial<ServerAssetRow> = {}): ServerAssetRow {
  const startedAt = new Date(Date.now() - 3600_000);
  return {
    id: `row-s-${instanceId}`, profileId: 'profile-1', kind: 'ship', definitionId: SHIP_DEF.id, instanceId,
    locationId: 'earth_surface', status: 'complete', markLevel: 1, startedAt, completesAt: startedAt, paidMoney: SHIP_DEF.baseCost, paidResources: {}, ledgerSeq: 7,
    ...overrides,
  };
}
function locationRow(locationId: string): ServerAssetRow {
  const at = new Date(Date.now() - 3600_000);
  return {
    id: `row-l-${locationId}`, profileId: 'profile-1', kind: 'location', definitionId: locationId, instanceId: locationInstanceId(locationId),
    locationId, status: 'complete', markLevel: 1, startedAt: at, completesAt: at, paidMoney: 0, paidResources: {}, ledgerSeq: null,
  };
}

describe('server-assets.ts — slice 2 research helpers', () => {
  it('quotes the client price (base / doctrine override / repeatable escalation) and a conservative duration', () => {
    const q = computeServerResearchQuote(BOOSTERS, []);
    expect(q.cost).toBe(BOOSTERS.baseCostMoney);
    expect(q.effectiveSeconds).toBe(BOOSTERS.realResearchSeconds);
    expect(q.serverSeconds).toBe(Math.ceil(BOOSTERS.realResearchSeconds / DEV_FAST_MULTIPLIER));
    expect(q.doctrineLocked).toBe(false);
    // Doctrine override: the sibling is complete → 2x price + retool time.
    const ntr = RESEARCH_MAP.get('nuclear_thermal')!;
    const locked = computeServerResearchQuote(ntr, ['nuclear_electric']);
    expect(locked.doctrineLocked).toBe(true);
    expect(locked.cost).toBe(ntr.baseCostMoney * 2);
    expect(locked.effectiveSeconds).toBeGreaterThan(ntr.realResearchSeconds);
    // Repeatable: level N costs baseCost × mult^N.
    const rep = computeServerResearchQuote(REPEATABLE, [], 2);
    expect(rep.cost).toBe(Math.round(REPEATABLE.baseCostMoney * Math.pow(REPEATABLE.repeatable!.costMultiplierPerLevel, 2)));
    expect(rep.repeatableLevel).toBe(2);
    // Research speed bonus shortens the server horizon, capped at 1.5x.
    const fast = computeServerResearchQuote(BOOSTERS, ['launch_site_optimization', 'high_res_optical']);
    expect(fast.researchSpeedMult).toBeGreaterThanOrEqual(1);
    expect(fast.researchSpeedMult).toBeLessThanOrEqual(1.5);
    expect(fast.serverSeconds).toBeLessThanOrEqual(q.serverSeconds);
  });

  it('start rule: prerequisites, already complete / in progress, repeatable cap, two-queue slot rule', () => {
    expect(checkResearchStart(undefined, [], []).code).toBe('unknown_definition');
    expect(checkResearchStart(CADENCE, [], []).code).toBe('prereq_missing');
    expect(checkResearchStart(CADENCE, [], []).missing).toEqual(['reusable_boosters']);
    expect(checkResearchStart(BOOSTERS, ['reusable_boosters'], []).code).toBe('already_completed');
    expect(checkResearchStart(BOOSTERS, [], ['reusable_boosters']).code).toBe('already_in_progress');
    expect(checkResearchStart(REPEATABLE, [], [], REPEATABLE.repeatable!.maxLevel).code).toBe('repeatable_maxed');
    // One queue without parallel_research, two with it.
    expect(checkResearchStart(BOOSTERS, [], ['launch_abort_systems']).code).toBe('queue_full');
    expect(checkResearchStart(BOOSTERS, ['parallel_research'], ['launch_abort_systems']).ok).toBe(true);
    expect(checkResearchStart(BOOSTERS, ['parallel_research'], ['launch_abort_systems', 'high_res_optical']).code).toBe('queue_full');
    expect(checkResearchStart(BOOSTERS, [], []).ok).toBe(true);
  });

  it('mergeServerResearch: off = client, shadow = union, enforce = complete rows the client still lists; repeatable levels from rows', () => {
    const rows = [
      researchRow('reusable_boosters'),
      researchRow('launch_abort_systems', { status: 'pending', completesAt: new Date(Date.now() + 60_000) }),
      researchRow(REPEATABLE.id, { instanceId: researchInstanceId(REPEATABLE.id, 1) }),
      researchRow(REPEATABLE.id, { id: 'r2', instanceId: researchInstanceId(REPEATABLE.id, 2) }),
    ];
    const client = ['high_res_optical', 'reusable_boosters'];
    expect(mergeServerResearch(rows, client, 'off').completed).toEqual(client);
    const shadow = mergeServerResearch(rows, client, 'shadow');
    expect(shadow.completed).toEqual(['high_res_optical', 'reusable_boosters']);
    expect(shadow.pending.map(p => p.definitionId)).toEqual(['launch_abort_systems']);
    expect(shadow.repeatableLevels[REPEATABLE.id]).toBe(2);
    expect(shadow.source).toBe('union');
    const enforce = mergeServerResearch(rows, client, 'enforce');
    expect(enforce.completed).toEqual(['reusable_boosters']);
    expect(enforce.source).toBe('server');
    // A server-complete id the client does not list yet joins the union in shadow.
    expect(mergeServerResearch(rows, [], 'shadow').completed).toEqual(['reusable_boosters']);
  });
});

describe('server-assets.ts — slice 3 ship helpers', () => {
  it('prices the hull with the world launch-cost discount; build time is the definition\'s', () => {
    expect(computeServerShipCost(SHIP_DEF, null).cost).toBe(SHIP_DEF.baseCost);
    expect(computeServerShipCost(SHIP_DEF, { launchCostReduction: 0.15 }).cost).toBe(Math.round(SHIP_DEF.baseCost * 0.85));
  });

  it('rowToShipInstance: identity + isBuilt + build timing are server-owned; name / status / location / route come from the client', () => {
    const pending = shipRow('s1', { status: 'pending', startedAt: new Date(Date.now() - 10_000), completesAt: new Date(Date.now() + 50_000) });
    const view = rowToShipInstance(pending, { name: 'Kestrel', status: 'in_transit', currentLocation: 'leo' } as never);
    expect(view).toEqual(expect.objectContaining({ instanceId: 's1', definitionId: SHIP_DEF.id, name: 'Kestrel', isBuilt: false, status: 'building', currentLocation: 'leo', source: 'server' }));
    expect(view.buildDurationSeconds).toBe(60);
    const built = rowToShipInstance(shipRow('s2'), { status: 'mining', currentLocation: 'asteroid_belt', route: { from: 'leo', to: 'asteroid_belt', departedAtMs: 1, arrivalAtMs: 2, cargo: {} } } as never);
    expect(built.isBuilt).toBe(true);
    expect(built.status).toBe('mining');
    expect(built.currentLocation).toBe('asteroid_belt');
    expect(built.route?.to).toBe('asteroid_belt');
    // No client entry → idle at its build location, definition name.
    const orphan = rowToShipInstance(shipRow('s3', { locationId: 'lunar_orbit' }), undefined);
    expect(orphan).toEqual(expect.objectContaining({ status: 'idle', currentLocation: 'lunar_orbit', name: SHIP_DEF.name }));
  });

  it('mergeServerShips: off = client, shadow = union, enforce = rows the client still lists; scrapped rows never count', () => {
    const rows = [shipRow('s1'), shipRow('s2', { status: 'scrapped' }), shipRow('s3')];
    const client = [{ instanceId: 's1', definitionId: SHIP_DEF.id, status: 'idle', currentLocation: 'leo', isBuilt: true }, { instanceId: 'forged', definitionId: SHIP_DEF.id, status: 'idle', currentLocation: 'leo', isBuilt: true }];
    expect(mergeServerShips(rows, client, 'off').ships.map(s => s.instanceId)).toEqual(['s1', 'forged']);
    expect(mergeServerShips(rows, client, 'shadow').ships.map(s => `${s.instanceId}:${s.source}`)).toEqual(['s1:server', 's3:server', 'forged:client']);
    expect(mergeServerShips(rows, client, 'enforce').ships.map(s => s.instanceId)).toEqual(['s1']);
  });
});

describe('server-assets.ts — slice 5 location projection', () => {
  it('STARTING ∪ ColonyClaim ∪ rows (∪ client in shadow, rows ∩ client in enforce)', () => {
    const rows = [locationRow('geo'), locationRow('lunar_orbit')];
    expect(mergeServerLocations([], [], ['geo', 'mars_surface'], 'off').unlocked).toEqual(['earth_surface', 'leo', 'geo', 'mars_surface']);
    expect(mergeServerLocations(rows, ['pluto_surface'], ['geo', 'mars_surface'], 'shadow').unlocked).toEqual(['earth_surface', 'leo', 'pluto_surface', 'geo', 'lunar_orbit', 'mars_surface']);
    expect(mergeServerLocations(rows, ['pluto_surface'], ['geo', 'mars_surface'], 'enforce').unlocked).toEqual(['earth_surface', 'leo', 'pluto_surface', 'geo']);
  });
});

describe('server-assets.ts — slice 4 derived services', () => {
  it('derives exactly the services game-engine.ts §5 activates for the same buildings + research', () => {
    // A building whose service needs no research, and one whose service is research-gated.
    const free = Array.from(BUILDING_MAP.values()).find(b => b.enabledServices.some(s => SERVICE_MAP.get(s)?.requiredResearch.length === 0))!;
    const gated = Array.from(BUILDING_MAP.values()).find(b => b.enabledServices.some(s => (SERVICE_MAP.get(s)?.requiredResearch.length ?? 0) > 0))!;
    const gatedSvc = SERVICE_MAP.get(gated.enabledServices.find(s => (SERVICE_MAP.get(s)?.requiredResearch.length ?? 0) > 0)!)!;
    const buildings = [
      { instanceId: 'f1', definitionId: free.id, locationId: free.requiredLocation, isComplete: true, buildStartDate: { year: 2126, month: 1 }, completionDate: { year: 2126, month: 2 } },
      { instanceId: 'f2', definitionId: free.id, locationId: free.requiredLocation, isComplete: true, buildStartDate: { year: 2126, month: 1 }, completionDate: { year: 2126, month: 2 } },
      { instanceId: 'g1', definitionId: gated.id, locationId: gated.requiredLocation, isComplete: true, buildStartDate: { year: 2126, month: 1 }, completionDate: { year: 2126, month: 2 } },
      { instanceId: 'p1', definitionId: free.id, locationId: free.requiredLocation, isComplete: false, startedAtMs: Date.now(), realDurationSeconds: 1e6, buildStartDate: { year: 2126, month: 1 }, completionDate: { year: 2126, month: 2 } },
    ];
    const key = (s: { definitionId: string; linkedBuildingIds: string[] }) => `${s.definitionId}|${s.linkedBuildingIds[0]}`;
    // Without the gating research: only the free building's services.
    const noResearch = deriveServicesFromAssets(buildings, []);
    expect(noResearch.map(key)).not.toContain(`${gatedSvc.id}|g1`);
    // Parity with the engine on the same fixture (research satisfied).
    const research = [...gatedSvc.requiredResearch, 'launch_abort_systems'];
    const derived = deriveServicesFromAssets(buildings, research);
    const state = { ...getNewGameState(), buildings, completedResearch: research, activeServices: [], money: 1e12 };
    const engine = processTick(state as never);
    expect(derived.map(key).sort()).toEqual(engine.activeServices.map(key).sort());
    expect(derived.map(key)).toContain(`${gatedSvc.id}|g1`);
    // Same revenue multiplier as the engine (min(researchCount, 10)).
    expect(derived[0].revenueMultiplier).toBe(engine.activeServices[0].revenueMultiplier);
  });

  it('mergeServerServices matches by (definition, building) or (definition, location); off / shadow / enforce', () => {
    const d = (bld: string, def = 'svc_launch_small', loc = 'earth_surface') => ({ definitionId: def, locationId: loc, linkedBuildingIds: [bld], startDate: { year: 2126, month: 1 }, revenueMultiplier: 1 });
    const derived = [d('b1'), d('b2')];
    const client = [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: ['b1'] }, { definitionId: 'svc_launch_small', locationId: 'earth_surface' }, { definitionId: 'svc_launch_small', locationId: 'leo' }];
    const off = mergeServerServices(derived, client, 'off');
    expect(off.services).toHaveLength(3);
    const shadow = mergeServerServices(derived, client, 'shadow');
    expect(shadow.missingFromClient).toBe(0);   // b1 by building, b2 by location
    expect(shadow.extraInClient).toBe(1);       // the leo entry derives from nothing
    expect(shadow.services).toHaveLength(3);    // client entries kept; nothing derived is unmatched
    const enforce = mergeServerServices(derived, client, 'enforce');
    expect(enforce.services).toEqual(derived);
    // A derived service the client lacks is appended in shadow.
    expect(mergeServerServices(derived, [client[0]], 'shadow').services.map(s => s.linkedBuildingIds[0])).toEqual(['b1', 'b2']);
  });
});

describe('server-assets.ts — slice 2-5 adoption + diff', () => {
  it('buildAdoptionRows2: research (non-repeatable) → complete, ships keep their timing, non-starting locations → complete', () => {
    const now = Date.now();
    const rows = buildAdoptionRows2('profile-1', {
      completedResearch: ['reusable_boosters', REPEATABLE.id, 'nope', 'reusable_boosters'],
      ships: [
        { instanceId: 's1', definitionId: SHIP_DEF.id, currentLocation: 'leo', isBuilt: true },
        { instanceId: 's2', definitionId: SHIP_DEF.id, currentLocation: 'leo', isBuilt: false, buildStartedAtMs: now - 5_000, buildDurationSeconds: 60 },
        { definitionId: SHIP_DEF.id, currentLocation: 'leo', isBuilt: true },
        { instanceId: 's4', definitionId: 'nope', currentLocation: 'leo', isBuilt: true },
      ],
      unlockedLocations: ['earth_surface', 'leo', 'geo', 'not_a_place'],
    }, now);
    expect(rows.map(r => `${r.kind}:${r.instanceId}:${r.status}`)).toEqual([
      `research:${researchInstanceId('reusable_boosters')}:complete`,
      'ship:s1:complete',
      'ship:s2:pending',
      `location:${locationInstanceId('geo')}:complete`,
    ]);
    expect((rows[2].completesAt as Date).getTime()).toBe(now - 5_000 + 60_000);
    expect(rows.every(r => r.paidMoney === 0 && r.ledgerSeq === null)).toBe(true);
    expect(shipsAdoptable([{ instanceId: 's1' }])).toBe(true);
    expect(shipsAdoptable([{ instanceId: 's1' }, { definitionId: SHIP_DEF.id }])).toBe(false);
  });

  it('diffClientAssets2 reports every direction for research, ships and locations (claims count as unlocked)', () => {
    const rows = [researchRow('reusable_boosters'), researchRow(REPEATABLE.id), shipRow('s1'), shipRow('s9'), locationRow('geo')];
    const diff = diffClientAssets2(
      { completedResearch: ['reusable_boosters', 'high_res_optical'], ships: [{ instanceId: 's1' }, { instanceId: 's2' }, { definitionId: 'x' }], unlockedLocations: ['geo', 'mars_surface', 'pluto_surface'] },
      rows, ['pluto_surface'],
    );
    expect(diff.researchNotInLedger).toEqual(['high_res_optical']);
    expect(diff.serverResearchNotInClient).toEqual([]); // the repeatable never appears in the client list
    expect(diff.shipsNotInLedger).toEqual(['s2', '?']);
    expect(diff.serverShipsNotInClient).toEqual(['s9']);
    expect(diff.locationsNotInLedger).toEqual(['mars_surface']);
    expect(diff.serverLocationsNotInClient).toEqual([]);
  });
});

describe('POST /api/space-tycoon/assets/research', () => {
  const body = { definitionId: 'reusable_boosters', instanceId: 'r-1' };

  it('validates the definition, prerequisites, completion, queue and materials', async () => {
    setup();
    expect((await post('research', { ...body, definitionId: 'nope' })).json.code).toBe('unknown_definition');
    expect((await post('research', { ...body, instanceId: '' })).json.code).toBe('invalid_instance_id');
    expect((await post('research', { ...body, definitionId: 'rapid_launch_cadence' })).json.code).toBe('prereq_missing');
    // Complete via the registry row (the persisted list is empty — union semantics).
    setup(profileRow(), [researchRow('reusable_boosters')]);
    expect((await post('research', body)).json.code).toBe('already_completed');
    // Queue full: one pending row, no parallel_research.
    setup(profileRow(), [researchRow('launch_abort_systems', { status: 'pending', completesAt: new Date(Date.now() + 60_000) })]);
    expect((await post('research', body)).json.code).toBe('queue_full');
    // Second queue with parallel_research in the persisted list.
    setup(profileRow({ completedResearchList: ['parallel_research'] }), [researchRow('launch_abort_systems', { status: 'pending', completesAt: new Date(Date.now() + 60_000) })]);
    expect((await post('research', body)).res.status).toBe(200);
    mockServerAsset.create.mockClear();
    // Materials (tier 3) verified against the inventory.
    setup(profileRow({ resources: { iron: 1 }, completedResearchList: T3_RESEARCH.prerequisites, money: 1e13 }));
    expect((await post('research', { definitionId: T3_RESEARCH.id, instanceId: 'r-3' })).json.code).toBe('insufficient_resources');
    expect(mockServerAsset.create).not.toHaveBeenCalled();
  });

  it('success: charges the server quote, ledgers money + materials, inserts a pending row with the conservative completesAt', async () => {
    setup(profileRow({ money: 1e13, completedResearchList: T3_RESEARCH.prerequisites }));
    const { res, json } = await post('research', { definitionId: T3_RESEARCH.id, instanceId: 'r-3' });
    expect(res.status).toBe(200);
    const quote = computeServerResearchQuote(T3_RESEARCH, T3_RESEARCH.prerequisites);
    expect(json.cost).toBe(quote.cost);
    expect(json.realDurationSeconds).toBe(quote.effectiveSeconds);
    expect(Date.parse(json.completesAt) - json.startedAtMs).toBe(quote.serverSeconds * 1000);
    expect(mockServerAsset.create.mock.calls[0][0].data).toEqual(expect.objectContaining({
      kind: 'research', definitionId: T3_RESEARCH.id, instanceId: 'r-3', status: 'pending', paidMoney: quote.cost, paidResources: T3_RESEARCH.resourceCost,
    }));
    const debit = mockGameProfile.updateMany.mock.calls[0][0];
    expect(debit.where).toEqual({ id: 'profile-1', money: { gte: quote.cost } });
    const reasons = mockRecordLedger.mock.calls.map(c => c[1]);
    expect(reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ moneyDelta: -quote.cost, reason: 'research_start', refId: 'row-new' }),
      expect.objectContaining({ resourceSlug: 'titanium', resourceDelta: -(T3_RESEARCH.resourceCost!.titanium), reason: 'research_start_resources' }),
    ]));
  });

  it('is retry-safe by instanceId', async () => {
    setup(profileRow(), [researchRow('reusable_boosters', { instanceId: 'r-1', status: 'pending', completesAt: new Date(Date.now() + 60_000) })]);
    const { json } = await post('research', body);
    expect(json.idempotent).toBe(true);
    expect(mockRecordLedger).not.toHaveBeenCalled();
  });
});

describe('POST /api/space-tycoon/assets/ship', () => {
  const body = { definitionId: SHIP_DEF.id, locationId: 'earth_surface', instanceId: 's-1' };

  it('validates the definition, research gate, location unlock and the shipyard cap', async () => {
    setup(profileRow({ money: 1e13 }));
    expect((await post('ship', { ...body, definitionId: 'nope' })).json.code).toBe('unknown_definition');
    expect((await post('ship', { ...body, definitionId: GATED_SHIP.id })).json.code).toBe('research_required');
    expect((await post('ship', { ...body, locationId: 'mars_surface' })).json.code).toBe('location_locked');
    setup(profileRow({ money: 1e13 }), Array.from({ length: 8 }, (_, i) => shipRow(`p${i}`, { status: 'pending', completesAt: new Date(Date.now() + 60_000) })));
    expect((await post('ship', body)).json.code).toBe('shipyard_full');
    expect(mockServerAsset.create).not.toHaveBeenCalled();
  });

  it('success: charges the hull, ledgers money + materials, inserts a pending row with buildTimeSeconds', async () => {
    setup(profileRow({ money: 1e13, resources: { iron: 1e6, aluminum: 1e6, titanium: 1e6, rare_earth: 1e6, platinum_group: 1e6, electronics: 1e6, steel: 1e6, composites: 1e6, fuel: 1e6 } }));
    const { res, json } = await post('ship', body);
    expect(res.status).toBe(200);
    expect(json.cost).toBe(SHIP_DEF.baseCost);
    expect(json.buildDurationSeconds).toBe(SHIP_DEF.buildTimeSeconds);
    expect(Date.parse(json.completesAt) - json.startedAtMs).toBe(SHIP_DEF.buildTimeSeconds * 1000);
    expect(mockServerAsset.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ kind: 'ship', definitionId: SHIP_DEF.id, instanceId: 's-1', locationId: 'earth_surface', status: 'pending', paidMoney: SHIP_DEF.baseCost }));
    const reasons = mockRecordLedger.mock.calls.map(c => c[1]);
    expect(reasons).toEqual(expect.arrayContaining([expect.objectContaining({ moneyDelta: -SHIP_DEF.baseCost, reason: 'ship_build', refId: 'row-new' })]));
  });
});

describe('POST /api/space-tycoon/assets/scrap', () => {
  const ORIGINAL = process.env.ASSET_LEDGER_MODE;
  afterEach(() => { if (ORIGINAL === undefined) delete process.env.ASSET_LEDGER_MODE; else process.env.ASSET_LEDGER_MODE = ORIGINAL; });

  it('refuses a ship whose persisted status is not idle; shadow accepts an unregistered ship without a credit', async () => {
    setup(profileRow({ shipsData: [{ instanceId: 's-1', status: 'in_transit', isBuilt: true }] }), [shipRow('s-1')]);
    expect((await post('scrap', { instanceId: 's-1' })).json.code).toBe('not_idle');
    delete process.env.ASSET_LEDGER_MODE; // shadow
    setup(profileRow({ shipsData: [{ instanceId: 'ghost', status: 'idle', isBuilt: true }] }));
    const { res, json } = await post('scrap', { instanceId: 'ghost' });
    expect(res.status).toBe(200);
    expect(json.ledgered).toBe(false);
    expect(mockRecordLedger).not.toHaveBeenCalled();
    process.env.ASSET_LEDGER_MODE = 'enforce';
    setup(profileRow({ shipsData: [{ instanceId: 'ghost', status: 'idle', isBuilt: true }] }));
    expect((await post('scrap', { instanceId: 'ghost' })).res.status).toBe(404);
  });

  it('flips the row to scrapped and credits 30 % of baseCost through the ledger; a pending hull is refused', async () => {
    setup(profileRow({ shipsData: [{ instanceId: 's-1', status: 'idle', isBuilt: true }] }), [shipRow('s-1')]);
    const { res, json } = await post('scrap', { instanceId: 's-1' });
    expect(res.status).toBe(200);
    const recovery = Math.round(SHIP_DEF.baseCost * SHIP_SCRAP_RECOVERY_FRACTION);
    expect(json).toEqual(expect.objectContaining({ ledgered: true, recovery }));
    expect(mockServerAsset.updateMany.mock.calls[0][0]).toEqual({ where: { id: 'row-s-s-1', status: { in: ['pending', 'complete'] } }, data: { status: 'scrapped' } });
    expect(mockGameProfile.update.mock.calls[0][0].data.money).toEqual({ increment: recovery });
    expect(mockRecordLedger.mock.calls.map(c => c[1])).toEqual([expect.objectContaining({ moneyDelta: recovery, reason: 'ship_scrap_recovery' })]);

    setup(profileRow(), [shipRow('s-2', { status: 'pending', completesAt: new Date(Date.now() + 60_000) })]);
    expect((await post('scrap', { instanceId: 's-2' })).json.code).toBe('not_complete');
  });
});

describe('POST /api/space-tycoon/assets/unlock', () => {
  it('validates the location + research gate + funds; starting locations and claimed bodies are free and idempotent', async () => {
    setup(profileRow({ money: 1e12 }));
    expect((await post('unlock', { locationId: 'nope' })).json.code).toBe('unknown_location');
    expect((await post('unlock', { locationId: 'leo' })).json.idempotent).toBe(true);
    expect((await post('unlock', { locationId: 'lunar_orbit' })).json.code).toBe('research_required');
    setup(profileRow({ money: 1 }));
    expect((await post('unlock', { locationId: 'geo' })).json.code).toBe('insufficient_funds');
    // A ColonyClaim on the body → already unlocked, nothing charged.
    setup(profileRow({ money: 1e12 }));
    mockColonyClaim.findMany.mockResolvedValue([{ locationId: 'geo' }]);
    expect((await post('unlock', { locationId: 'geo' })).json.idempotent).toBe(true);
    // An existing row → idempotent too.
    setup(profileRow({ money: 1e12 }), [locationRow('geo')]);
    expect((await post('unlock', { locationId: 'geo' })).json.idempotent).toBe(true);
    expect(mockServerAsset.create).not.toHaveBeenCalled();
    expect(mockRecordLedger).not.toHaveBeenCalled();
  });

  it('success: charges unlockCost (burned) and inserts a complete location row; research from the registry view', async () => {
    setup(profileRow({ money: 1e12 }), [researchRow('reusable_boosters')]);
    const { res, json } = await post('unlock', { locationId: 'lunar_orbit' });
    expect(res.status).toBe(200);
    expect(json.cost).toBe(LUNAR_ORBIT.unlockCost);
    expect(mockServerAsset.create.mock.calls[0][0].data).toEqual(expect.objectContaining({
      kind: 'location', definitionId: 'lunar_orbit', instanceId: locationInstanceId('lunar_orbit'), locationId: 'lunar_orbit', status: 'complete', paidMoney: LUNAR_ORBIT.unlockCost,
    }));
    expect(mockGameProfile.updateMany.mock.calls[0][0].where).toEqual({ id: 'profile-1', money: { gte: LUNAR_ORBIT.unlockCost } });
    expect(mockRecordLedger.mock.calls.map(c => c[1])).toEqual([expect.objectContaining({ moneyDelta: -LUNAR_ORBIT.unlockCost, reason: 'location_unlock', refId: 'row-new' })]);
    expect(GEO.unlockCost).toBeGreaterThan(0);
  });
});
