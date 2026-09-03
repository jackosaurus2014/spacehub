/**
 * @jest-environment node
 *
 * Server-authoritative assets, phase 3 slice 1 — the sync-side
 * reconciliation (docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 —
 * buildings"): one-time adoption, the shadow audit, the enforce drop +
 * `assetLedger.rejectedInstanceIds`, and the client's idempotent removal.
 *
 * Prisma is mocked the same way as sync-resource-clamp.test.ts.
 */

import { NextRequest } from 'next/server';

const mockGameProfile = { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() };
const mockGameLedgerEntry = { updateMany: jest.fn(), findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() };
const mockServerAsset = { findMany: jest.fn(), createMany: jest.fn(), updateMany: jest.fn() };
const mockColonyClaim = { findMany: jest.fn() };
const mockMarketAuditLog = { create: jest.fn() };
const mockMarketResource = { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
const mockEconomicSnapshot = { create: jest.fn() };

jest.mock('@/lib/db', () => {
  const reject = () => Promise.reject(new Error('no database in test'));
  const rejectingModel: unknown = new Proxy({}, { get: () => reject });
  const explicit = (): Record<string, unknown> => ({
    gameProfile: mockGameProfile,
    gameLedgerEntry: mockGameLedgerEntry,
    serverAsset: mockServerAsset,
    colonyClaim: mockColonyClaim,
    marketAuditLog: mockMarketAuditLog,
    marketResource: mockMarketResource,
    economicSnapshot: mockEconomicSnapshot,
  });
  const client: unknown = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'then') return undefined;
      if (prop === '$transaction') {
        return (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => Promise<unknown>)(client) : Promise.all(arg as Promise<unknown>[]));
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
jest.mock('@/lib/game/server-ledger', () => ({
  isLedgerAvailable: jest.fn().mockResolvedValue(true),
  recordLedger: jest.fn(),
  recordSyncAuthoredLedger: jest.fn().mockResolvedValue(null),
  recordLedgerStandalone: jest.fn(),
}));
jest.mock('@/lib/game/server-time', () => ({
  ...jest.requireActual('@/lib/game/server-time'),
  getGlobalGameDate: jest.fn(() => ({ totalMonths: 100, year: 2135, month: 4 })),
  formatServerDate: jest.fn(() => 'April 2135'),
}));
jest.mock('@/lib/game/referrals', () => ({ attachReferral: jest.fn(), REFERRAL_COOKIE: 'sn_ref' }));

import { getServerSession } from 'next-auth';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import { ASSET_AUDIT_LOGGED_KEY, ASSET_BASELINE_KEY, ASSET_BASELINE2_KEY, locationInstanceId, researchInstanceId, type ServerAssetRow } from '@/lib/game/server-assets';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import {
  applyAssetReconciliationToState,
  queueAssetReconciliation,
  consumeAssetReconciliation,
  __clearAssetReconciliationQueue,
} from '@/lib/game/asset-reconcile';
import { getNewGameState } from '@/lib/game/save-load';
import type { GameState } from '@/lib/game/types';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const PAST_ISO = '2026-08-01T00:00:00.000Z';
/** Both adoption markers stamped — the diff path. */
const BOTH = { [ASSET_BASELINE_KEY]: PAST_ISO, [ASSET_BASELINE2_KEY]: PAST_ISO };
const ORIGINAL_ASSET_MODE = process.env.ASSET_LEDGER_MODE;
const ORIGINAL_CLAMP_MODE = process.env.RESOURCE_CLAMP_MODE;

function gsBuilding(instanceId: string, overrides: Record<string, unknown> = {}) {
  return {
    instanceId, definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true,
    startedAtMs: Date.now() - 400_000, realDurationSeconds: 300,
    buildStartDate: { year: 2126, month: 1 }, completionDate: { year: 2126, month: 7 },
    ...overrides,
  };
}

function row(instanceId: string, overrides: Partial<ServerAssetRow> = {}): ServerAssetRow {
  const startedAt = new Date(Date.now() - 3600_000);
  return {
    id: `row-${instanceId}`, profileId: 'profile-1', kind: 'building', definitionId: 'launch_pad_small', instanceId,
    locationId: 'earth_surface', status: 'complete', markLevel: 1, startedAt, completesAt: startedAt,
    paidMoney: 50_000_000, paidResources: {}, ledgerSeq: null, ...overrides,
  };
}

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1', userId: 'user-1', companyName: 'Test Aerospace',
    money: 1_000_000, netWorth: 5_000_000, totalEarned: 0,
    lastSyncAt: new Date(Date.now() - 60_000),
    resources: { iron: 1000 }, buildingsData: [], shipsData: [], activeServicesData: [],
    completedResearchList: [], workforceData: null as unknown, serverResources: null, peakNetWorth: 0,
    ...overrides,
  };
}

function setup(profile: ReturnType<typeof existingRow>, rows: ServerAssetRow[] = []) {
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
  mockGameProfile.findUnique.mockResolvedValue(profile);
  mockGameProfile.upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({
    id: 'profile-1', companyName: 'Test Aerospace', peakNetWorth: 0, ...update,
  }));
  mockGameProfile.update.mockResolvedValue({});
  mockGameProfile.count.mockResolvedValue(0);
  mockGameProfile.findMany.mockResolvedValue([]);
  mockGameLedgerEntry.updateMany.mockResolvedValue({ count: 0 });
  mockGameLedgerEntry.findMany.mockResolvedValue([]);
  mockServerAsset.findMany.mockResolvedValue(rows);
  mockServerAsset.createMany.mockResolvedValue({ count: 0 });
  mockServerAsset.updateMany.mockResolvedValue({ count: 0 });
  mockColonyClaim.findMany.mockResolvedValue([]);
  mockMarketAuditLog.create.mockResolvedValue({});
  mockMarketResource.findMany.mockResolvedValue([]);
  mockEconomicSnapshot.create.mockResolvedValue({ id: 'snap-1' });
}

async function postSync(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/space-tycoon/sync/route');
  const req = new NextRequest('http://localhost/api/space-tycoon/sync', {
    method: 'POST',
    body: JSON.stringify({ money: 1_000_000, companyName: 'Test Aerospace', ...body }),
  });
  const res = await POST(req as unknown as Request);
  return { res, json: await res.json() };
}

function persisted() {
  return (mockGameProfile.upsert.mock.calls[0][0] as { update: Record<string, unknown> }).update;
}

function assetAudits() {
  return mockMarketAuditLog.create.mock.calls
    .map(c => c[0].data)
    .filter(d => String(d.eventType).includes('asset'));
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetRouteThrottle();
  __clearAssetReconciliationQueue();
  process.env.RESOURCE_CLAMP_MODE = 'off'; // isolate the asset block
});

afterAll(() => {
  if (ORIGINAL_ASSET_MODE === undefined) delete process.env.ASSET_LEDGER_MODE;
  else process.env.ASSET_LEDGER_MODE = ORIGINAL_ASSET_MODE;
  if (ORIGINAL_CLAMP_MODE === undefined) delete process.env.RESOURCE_CLAMP_MODE;
  else process.env.RESOURCE_CLAMP_MODE = ORIGINAL_CLAMP_MODE;
});

describe('sync — asset registry adoption', () => {
  it('first sync after deploy adopts every complete / pending client building exactly once and stamps the marker', async () => {
    delete process.env.ASSET_LEDGER_MODE; // shadow
    setup(existingRow({ workforceData: { engineers: 2 } }));
    const pendingStart = Date.now() - 10_000;
    const { res, json } = await postSync({
      buildings: [gsBuilding('b1'), gsBuilding('b2', { isComplete: false, startedAtMs: pendingStart, realDurationSeconds: 600 })],
      workforce: { engineers: 2 },
    });
    expect(res.status).toBe(200);
    expect(json.assetLedger).toEqual(expect.objectContaining({ mode: 'shadow', adopted: true, adoptedCount: 2, rejectedInstanceIds: [] }));
    // Slice 1 buildings + slices 2-5 (nothing to adopt here) — both markers stamped.
    expect(mockServerAsset.createMany).toHaveBeenCalledTimes(2);
    expect(mockServerAsset.createMany.mock.calls[1][0].data).toEqual([]);
    const rows = mockServerAsset.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({ instanceId: 'b1', status: 'complete', paidMoney: 0, ledgerSeq: null }));
    expect(rows[1]).toEqual(expect.objectContaining({ instanceId: 'b2', status: 'pending' }));
    expect((rows[1].completesAt as Date).getTime()).toBe(pendingStart + 600_000);
    const wd = persisted().workforceData as Record<string, unknown>;
    expect(typeof wd[ASSET_BASELINE_KEY]).toBe('string');
    expect(typeof wd[ASSET_BASELINE2_KEY]).toBe('string');
    expect(wd.engineers).toBe(2);
    expect((persisted().buildingsData as unknown[]).length).toBe(2);
    expect(assetAudits()).toHaveLength(0);
  });

  it('never re-adopts once the marker exists (the marker is carried forward)', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: { ...BOTH } }), [row('b1')]);
    const { json } = await postSync({ buildings: [gsBuilding('b1')] });
    expect(mockServerAsset.createMany).not.toHaveBeenCalled();
    expect(json.assetLedger.adopted).toBe(false);
    expect((persisted().workforceData as Record<string, unknown>)[ASSET_BASELINE_KEY]).toBe(PAST_ISO);
    // A clean diff writes no audit rows.
    expect(assetAudits()).toHaveLength(0);
  });

  it('does not stamp the marker when the registry table is unavailable', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: null }));
    mockServerAsset.createMany.mockRejectedValue(new Error('relation "ServerAsset" does not exist'));
    const { res, json } = await postSync({ buildings: [gsBuilding('b1')] });
    expect(res.status).toBe(200);
    expect(json.assetLedger).toBeNull();
    expect(persisted().workforceData).toBeNull();
  });
});

describe('sync — shadow vs enforce', () => {
  it('shadow: a client building with no row is audited (warning) and persisted unchanged', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: { ...BOTH } }), [row('b1')]);
    const { json } = await postSync({ buildings: [gsBuilding('b1'), gsBuilding('b2')] });
    expect(json.assetLedger).toEqual(expect.objectContaining({ mode: 'shadow', rejectedInstanceIds: [], notInLedger: 1 }));
    expect((persisted().buildingsData as { instanceId: string }[]).map(b => b.instanceId)).toEqual(['b1', 'b2']);
    const audits = assetAudits();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toEqual(expect.objectContaining({ eventType: 'client_asset_not_in_ledger', severity: 'warning', profileId: 'profile-1' }));
    expect(audits[0].details.instanceIds).toEqual(['b2']);
    // The audit throttle marker is stamped alongside the baseline.
    const wd = persisted().workforceData as Record<string, unknown>;
    expect(typeof wd[ASSET_AUDIT_LOGGED_KEY]).toBe('string');
    expect(wd[ASSET_BASELINE_KEY]).toBe(PAST_ISO);
  });

  it('shadow: the audit is throttled to once an hour per profile', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    const recent = new Date(Date.now() - 10 * 60_000).toISOString();
    setup(existingRow({ workforceData: { ...BOTH, [ASSET_AUDIT_LOGGED_KEY]: recent } }), [row('b1')]);
    const { json } = await postSync({ buildings: [gsBuilding('b1'), gsBuilding('b2')] });
    expect(json.assetLedger.notInLedger).toBe(1);
    expect(assetAudits()).toHaveLength(0);
    expect((persisted().workforceData as Record<string, unknown>)[ASSET_AUDIT_LOGGED_KEY]).toBe(recent);
  });

  it('shadow: a server row the client no longer lists is logged (info), never removed', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: { ...BOTH } }), [row('b1'), row('b3')]);
    const { json } = await postSync({ buildings: [gsBuilding('b1')] });
    expect(json.assetLedger.unlistedServerRows).toBe(1);
    const audits = assetAudits();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toEqual(expect.objectContaining({ eventType: 'server_asset_not_in_client', severity: 'info' }));
    expect(mockServerAsset.updateMany).toHaveBeenCalledTimes(1); // only the lazy pending → complete pass
    expect(mockServerAsset.updateMany.mock.calls[0][0].where.status).toBe('pending');
  });

  it('enforce: drops unpaid client buildings from the persisted list, audits critical, returns their ids', async () => {
    process.env.ASSET_LEDGER_MODE = 'enforce';
    setup(existingRow({ workforceData: { ...BOTH } }), [row('b1')]);
    const { res, json } = await postSync({
      buildings: [gsBuilding('b1'), gsBuilding('b2'), { ...gsBuilding('x'), instanceId: undefined }],
    });
    expect(res.status).toBe(200);
    expect(json.assetLedger).toEqual(expect.objectContaining({ mode: 'enforce', rejectedInstanceIds: ['b2'], notInLedger: 2 }));
    expect((persisted().buildingsData as { instanceId?: string }[]).map(b => b.instanceId)).toEqual(['b1']);
    const audits = assetAudits();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toEqual(expect.objectContaining({ eventType: 'client_asset_rejected', severity: 'critical' }));
    expect(audits[0].details.instanceIds).toEqual(['b2', '?']);
  });

  it('enforce: book net worth counts only registry rows the client still lists', async () => {
    process.env.ASSET_LEDGER_MODE = 'enforce';
    // Two forged buildings, one registry row → book value of exactly one pad.
    setup(existingRow({ workforceData: { ...BOTH }, resources: {} }), [row('b1')]);
    const forged = await postSync({ money: 0, resources: {}, buildings: [gsBuilding('b1'), gsBuilding('b2'), gsBuilding('b3')] });
    expect(forged.json.netWorth).toBe(Math.round(50_000_000 * 0.6));

    delete process.env.ASSET_LEDGER_MODE; // shadow keeps the pre-registry figure
    __resetRouteThrottle(); // C-2b sync cadence is in-memory
    setup(existingRow({ workforceData: { ...BOTH }, resources: {} }), [row('b1')]);
    const shadow = await postSync({ money: 0, resources: {}, buildings: [gsBuilding('b1'), gsBuilding('b2'), gsBuilding('b3')] });
    expect(shadow.json.netWorth).toBe(Math.round(3 * 50_000_000 * 0.6));
  });

  it('off: nothing is diffed, nothing is stashed, nothing is audited', async () => {
    process.env.ASSET_LEDGER_MODE = 'off';
    setup(existingRow({ workforceData: null }), [row('b1')]);
    const { json } = await postSync({ buildings: [gsBuilding('b1'), gsBuilding('b2')] });
    expect(json.assetLedger).toBeNull();
    expect(mockServerAsset.findMany).not.toHaveBeenCalled();
    expect(mockServerAsset.createMany).not.toHaveBeenCalled();
    expect(persisted().workforceData).toBeNull();
    expect(assetAudits()).toHaveLength(0);
  });
});

describe('client — applyAssetReconciliationToState', () => {
  function stateWith(): GameState {
    const base = getNewGameState();
    return {
      ...base,
      buildings: [
        gsBuilding('b1') as unknown as GameState['buildings'][number],
        gsBuilding('b2') as unknown as GameState['buildings'][number],
      ],
      activeServices: [
        { definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: ['b2'], startDate: { year: 2126, month: 1 }, revenueMultiplier: 1 },
        { definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: ['b1', 'b2'], startDate: { year: 2126, month: 1 }, revenueMultiplier: 1 },
      ],
      money: 123,
      resources: { iron: 5 },
    };
  }

  it('removes the rejected buildings and services linked SOLELY to them; refunds nothing; idempotent', () => {
    const state = stateWith();
    const next = applyAssetReconciliationToState(state, { mode: 'enforce', rejectedInstanceIds: ['b2', 'ghost'] });
    expect(next).not.toBe(state);
    expect(next.buildings.map(b => b.instanceId)).toEqual(['b1']);
    expect(next.activeServices).toHaveLength(1);
    expect(next.activeServices[0].linkedBuildingIds).toEqual(['b1', 'b2']); // still has a surviving link
    expect(next.money).toBe(123);
    expect(next.resources).toEqual({ iron: 5 });
    expect(next.eventLog[0].title).toContain('Registry correction');
    // Second application finds nothing to remove → same reference.
    expect(applyAssetReconciliationToState(next, { mode: 'enforce', rejectedInstanceIds: ['b2'] })).toBe(next);
    expect(applyAssetReconciliationToState(next, { mode: 'enforce', rejectedInstanceIds: [] })).toBe(next);
    expect(applyAssetReconciliationToState(next, null)).toBe(next);
  });

  it('queue merges rejections by instanceId and drains once', () => {
    queueAssetReconciliation({ mode: 'enforce', rejectedInstanceIds: ['a', 'b'] });
    queueAssetReconciliation({ mode: 'enforce', rejectedInstanceIds: ['b', 'c'] });
    queueAssetReconciliation({ mode: 'enforce', rejectedInstanceIds: [] }); // ignored
    expect(consumeAssetReconciliation()).toEqual({
      mode: 'enforce', rejectedInstanceIds: ['a', 'b', 'c'], rejectedResearchIds: [], rejectedShipIds: [], rejectedLocationIds: [],
    });
    expect(consumeAssetReconciliation()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3 slices 2-5 — research / ships / services / locations
// ═══════════════════════════════════════════════════════════════════════════

function researchRow(definitionId: string, overrides: Partial<ServerAssetRow> = {}): ServerAssetRow {
  const at = new Date(Date.now() - 3600_000);
  return {
    id: `row-r-${definitionId}`, profileId: 'profile-1', kind: 'research', definitionId, instanceId: researchInstanceId(definitionId),
    locationId: null, status: 'complete', markLevel: 1, startedAt: at, completesAt: at, paidMoney: 0, paidResources: {}, ledgerSeq: null, ...overrides,
  };
}
function shipRow(instanceId: string, definitionId: string, overrides: Partial<ServerAssetRow> = {}): ServerAssetRow {
  const at = new Date(Date.now() - 3600_000);
  return {
    id: `row-s-${instanceId}`, profileId: 'profile-1', kind: 'ship', definitionId, instanceId,
    locationId: 'earth_surface', status: 'complete', markLevel: 1, startedAt: at, completesAt: at, paidMoney: 0, paidResources: {}, ledgerSeq: null, ...overrides,
  };
}
function locationRow(locationId: string): ServerAssetRow {
  const at = new Date(Date.now() - 3600_000);
  return {
    id: `row-l-${locationId}`, profileId: 'profile-1', kind: 'location', definitionId: locationId, instanceId: locationInstanceId(locationId),
    locationId, status: 'complete', markLevel: 1, startedAt: at, completesAt: at, paidMoney: 0, paidResources: {}, ledgerSeq: null,
  };
}
function gsShip(instanceId: string, overrides: Record<string, unknown> = {}) {
  const def = Array.from(require('@/lib/game/ships').SHIP_MAP.keys())[0] as string;
  return { instanceId, definitionId: def, name: 'Hull', status: 'idle', currentLocation: 'earth_surface', isBuilt: true, ...overrides };
}
const shipDefId = (): string => Array.from(require('@/lib/game/ships').SHIP_MAP.keys())[0] as string;

describe('sync — slice 2-5 adoption (second marker)', () => {
  it('a profile slice 1 already stamped adopts its research / ships / locations exactly once under _assetBaselineAt2', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO, engineers: 1 } }), [row('b1')]);
    const { json } = await postSync({
      buildings: [gsBuilding('b1')],
      completedResearch: ['reusable_boosters'],
      ships: [gsShip('s1'), gsShip('s2', { isBuilt: false, buildStartedAtMs: Date.now() - 5_000, buildDurationSeconds: 60 })],
      unlockedLocations: ['earth_surface', 'leo', 'geo'],
      workforce: { engineers: 1 },
    });
    expect(json.assetLedger).toEqual(expect.objectContaining({ adopted: true, adoptedCount: 4 }));
    expect(mockServerAsset.createMany).toHaveBeenCalledTimes(1);
    const rows = mockServerAsset.createMany.mock.calls[0][0].data;
    expect(rows.map((r: { kind: string; instanceId: string; status: string }) => `${r.kind}:${r.instanceId}:${r.status}`)).toEqual([
      `research:${researchInstanceId('reusable_boosters')}:complete`, 'ship:s1:complete', 'ship:s2:pending', `location:${locationInstanceId('geo')}:complete`,
    ]);
    expect((rows[2].completesAt as Date).getTime()).toBeGreaterThan(Date.now() + 50_000); // keeps its build timing
    const wd = persisted().workforceData as Record<string, unknown>;
    expect(wd[ASSET_BASELINE_KEY]).toBe(PAST_ISO);
    expect(typeof wd[ASSET_BASELINE2_KEY]).toBe('string');
    expect(wd.engineers).toBe(1);
    expect(assetAudits()).toHaveLength(0);
  });

  it('defers ship adoption (marker 2 not stamped) while a client ship lacks an instanceId', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO } }), [row('b1')]);
    const { json } = await postSync({
      buildings: [gsBuilding('b1')],
      completedResearch: ['reusable_boosters'],
      ships: [{ definitionId: shipDefId(), status: 'idle', currentLocation: 'earth_surface' }],
    });
    expect(json.assetLedger.adopted).toBe(true);
    const rows = mockServerAsset.createMany.mock.calls[0][0].data;
    expect(rows.map((r: { kind: string }) => r.kind)).toEqual(['research']); // research adopted, the id-less ship is not
    const wd = persisted().workforceData as Record<string, unknown>;
    expect(wd[ASSET_BASELINE2_KEY]).toBeUndefined();
  });
});

describe('sync — slices 2-5 shadow vs enforce', () => {
  const clientPayload = () => ({
    buildings: [gsBuilding('b1')],
    completedResearch: ['reusable_boosters', 'high_res_optical'],
    researchCount: 2,
    ships: [gsShip('s1'), gsShip('s2')],
    unlockedLocations: ['earth_surface', 'leo', 'geo', 'mars_surface'],
    activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: ['b1'] }],
  });
  const serverRows = () => [row('b1'), researchRow('reusable_boosters'), researchRow('launch_abort_systems'), shipRow('s1', shipDefId()), locationRow('geo')];

  it('shadow: gaps in every kind are audited once (throttled together); lists persist as sent, research as the union with complete rows', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: { ...BOTH } }), serverRows());
    const { res, json } = await postSync(clientPayload());
    expect(res.status).toBe(200);
    expect(json.assetLedger).toEqual(expect.objectContaining({
      mode: 'shadow', rejectedInstanceIds: [], rejectedResearchIds: [], rejectedShipIds: [], rejectedLocationIds: [],
      notInLedger: 3, // high_res_optical, s2, mars_surface
    }));
    expect(json.assetLedger.unlistedServerRows).toBe(1); // launch_abort_systems
    expect(json.assetLedger.services).toEqual(expect.objectContaining({ derived: expect.any(Number), client: 1 }));
    const p = persisted();
    expect(p.completedResearchList).toEqual(['reusable_boosters', 'high_res_optical', 'launch_abort_systems']); // union
    expect((p.shipsData as { instanceId: string }[]).map(s => s.instanceId)).toEqual(['s1', 's2']);
    expect(p.unlockedLocationsList).toEqual(['earth_surface', 'leo', 'geo', 'mars_surface']);
    expect(p.researchCount).toBe(2);   // shadow keeps the client's counter as sent
    const audits = assetAudits();
    const kinds = audits.filter(a => a.eventType === 'client_asset_not_in_ledger').map(a => a.details.kind);
    expect(kinds).toEqual(['research', 'ship', 'location']);
    expect(audits.some(a => a.eventType === 'server_asset_not_in_client' && a.details.research?.[0] === 'launch_abort_systems')).toBe(true);
  });

  it('enforce: drops unledgered research / ships / locations, returns their ids, persists the DERIVED services and registry counts', async () => {
    process.env.ASSET_LEDGER_MODE = 'enforce';
    setup(existingRow({ workforceData: { ...BOTH } }), serverRows());
    const { res, json } = await postSync(clientPayload());
    expect(res.status).toBe(200);
    expect(json.assetLedger).toEqual(expect.objectContaining({
      mode: 'enforce', rejectedInstanceIds: [], rejectedResearchIds: ['high_res_optical'], rejectedShipIds: ['s2'], rejectedLocationIds: ['mars_surface'],
    }));
    const p = persisted();
    expect(p.completedResearchList).toEqual(['reusable_boosters']);
    expect((p.shipsData as { instanceId: string }[]).map(s => s.instanceId)).toEqual(['s1']);
    expect(p.unlockedLocationsList).toEqual(['earth_surface', 'leo', 'geo']);
    // Services: derived from the registry's complete buildings (b1 = launch_pad_small) + research.
    const padServices = BUILDING_MAP.get('launch_pad_small')!.enabledServices.filter(s => SERVICE_MAP.get(s)?.requiredResearch.every(r => r === 'reusable_boosters'));
    expect((p.activeServicesData as { definitionId: string; linkedBuildingIds: string[] }[]).map(s => `${s.definitionId}|${s.linkedBuildingIds[0]}`))
      .toEqual(padServices.map(s => `${s}|b1`));
    expect(p.serviceCount).toBe(padServices.length);
    expect(p.researchCount).toBe(1);
    expect(p.locationsUnlocked).toBe(3);
    const audits = assetAudits();
    expect(audits.filter(a => a.eventType === 'client_asset_rejected' && a.severity === 'critical').map(a => a.details.kind)).toEqual(['research', 'ship', 'location']);
  });

  it('enforce: book net worth counts only registry ships the client still lists', async () => {
    process.env.ASSET_LEDGER_MODE = 'enforce';
    const def = require('@/lib/game/ships').SHIP_MAP.get(shipDefId());
    setup(existingRow({ workforceData: { ...BOTH }, resources: {} }), [shipRow('s1', shipDefId())]);
    const { json } = await postSync({ money: 0, resources: {}, ships: [gsShip('s1'), gsShip('s2'), gsShip('s3')] });
    expect(json.netWorth).toBe(Math.round(def.baseCost * 0.6));
  });
});

describe('client — applyAssetReconciliationToState (slices 2-5)', () => {
  it('removes rejected research, ships and location unlocks (never a starting location); refunds nothing; idempotent', () => {
    const base = getNewGameState();
    const state: GameState = {
      ...base,
      completedResearch: ['reusable_boosters', 'high_res_optical'],
      ships: [gsShip('s1') as unknown as NonNullable<GameState['ships']>[number], gsShip('s2') as unknown as NonNullable<GameState['ships']>[number]],
      unlockedLocations: ['earth_surface', 'leo', 'geo', 'mars_surface'],
      money: 5,
    };
    const next = applyAssetReconciliationToState(state, {
      mode: 'enforce', rejectedInstanceIds: [], rejectedResearchIds: ['high_res_optical', 'ghost'], rejectedShipIds: ['s2'], rejectedLocationIds: ['mars_surface', 'leo'],
    });
    expect(next).not.toBe(state);
    expect(next.completedResearch).toEqual(['reusable_boosters']);
    expect((next.ships || []).map(s => s.instanceId)).toEqual(['s1']);
    expect(next.unlockedLocations).toEqual(['earth_surface', 'leo', 'geo']);
    expect(next.money).toBe(5);
    expect(next.eventLog[0].title).toContain('1 research project, 1 ship, 1 location unlock');
    expect(applyAssetReconciliationToState(next, { mode: 'enforce', rejectedInstanceIds: [], rejectedResearchIds: ['high_res_optical'], rejectedShipIds: ['s2'], rejectedLocationIds: ['mars_surface'] })).toBe(next);
    expect(applyAssetReconciliationToState(next, { mode: 'enforce', rejectedInstanceIds: [], rejectedLocationIds: ['leo'] })).toBe(next);
  });

  it('queue merges every kind and drains once', () => {
    queueAssetReconciliation({ mode: 'enforce', rejectedInstanceIds: [], rejectedResearchIds: ['r1'], rejectedShipIds: ['s1'] });
    queueAssetReconciliation({ mode: 'enforce', rejectedInstanceIds: ['b1'], rejectedResearchIds: ['r1', 'r2'], rejectedLocationIds: ['geo'] });
    expect(consumeAssetReconciliation()).toEqual({
      mode: 'enforce', rejectedInstanceIds: ['b1'], rejectedResearchIds: ['r1', 'r2'], rejectedShipIds: ['s1'], rejectedLocationIds: ['geo'],
    });
    expect(consumeAssetReconciliation()).toBeNull();
  });
});
