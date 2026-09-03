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
import { ASSET_AUDIT_LOGGED_KEY, ASSET_BASELINE_KEY, type ServerAssetRow } from '@/lib/game/server-assets';
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
    expect(mockServerAsset.createMany).toHaveBeenCalledTimes(1);
    const rows = mockServerAsset.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({ instanceId: 'b1', status: 'complete', paidMoney: 0, ledgerSeq: null }));
    expect(rows[1]).toEqual(expect.objectContaining({ instanceId: 'b2', status: 'pending' }));
    expect((rows[1].completesAt as Date).getTime()).toBe(pendingStart + 600_000);
    const wd = persisted().workforceData as Record<string, unknown>;
    expect(typeof wd[ASSET_BASELINE_KEY]).toBe('string');
    expect(wd.engineers).toBe(2);
    expect((persisted().buildingsData as unknown[]).length).toBe(2);
    expect(assetAudits()).toHaveLength(0);
  });

  it('never re-adopts once the marker exists (the marker is carried forward)', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO } }), [row('b1')]);
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
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO } }), [row('b1')]);
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
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO, [ASSET_AUDIT_LOGGED_KEY]: recent } }), [row('b1')]);
    const { json } = await postSync({ buildings: [gsBuilding('b1'), gsBuilding('b2')] });
    expect(json.assetLedger.notInLedger).toBe(1);
    expect(assetAudits()).toHaveLength(0);
    expect((persisted().workforceData as Record<string, unknown>)[ASSET_AUDIT_LOGGED_KEY]).toBe(recent);
  });

  it('shadow: a server row the client no longer lists is logged (info), never removed', async () => {
    delete process.env.ASSET_LEDGER_MODE;
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO } }), [row('b1'), row('b3')]);
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
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO } }), [row('b1')]);
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
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO }, resources: {} }), [row('b1')]);
    const forged = await postSync({ money: 0, resources: {}, buildings: [gsBuilding('b1'), gsBuilding('b2'), gsBuilding('b3')] });
    expect(forged.json.netWorth).toBe(Math.round(50_000_000 * 0.6));

    delete process.env.ASSET_LEDGER_MODE; // shadow keeps the pre-registry figure
    __resetRouteThrottle(); // C-2b sync cadence is in-memory
    setup(existingRow({ workforceData: { [ASSET_BASELINE_KEY]: PAST_ISO }, resources: {} }), [row('b1')]);
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
    expect(consumeAssetReconciliation()).toEqual({ mode: 'enforce', rejectedInstanceIds: ['a', 'b', 'c'] });
    expect(consumeAssetReconciliation()).toBeNull();
  });
});
