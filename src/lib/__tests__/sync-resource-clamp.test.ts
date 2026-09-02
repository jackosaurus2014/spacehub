/**
 * @jest-environment node
 *
 * Server-authoritative inventory phase 1 — the sync route's per-resource
 * plausibility clamp behind RESOURCE_CLAMP_MODE (off | shadow | enforce).
 * docs/SECURITY_AUDIT_2026-09.md "Server-authoritative inventory — phase 1".
 *
 * Prisma is mocked: the models the clamp touches are explicit jest.fn()s,
 * everything else is a rejecting proxy (the route wraps those reads in
 * try/catch, so they degrade to "no data" exactly as a lagging schema would).
 */

import { NextRequest } from 'next/server';

const mockGameProfile = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  findMany: jest.fn(),
};
const mockGameLedgerEntry = { updateMany: jest.fn(), findMany: jest.fn() };
const mockMarketAuditLog = { create: jest.fn() };
const mockMarketResource = { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() };
const mockEconomicSnapshot = { create: jest.fn() };

jest.mock('@/lib/db', () => {
  const reject = () => Promise.reject(new Error('no database in test'));
  const rejectingModel: unknown = new Proxy({}, { get: () => reject });
  // Resolved lazily: ES imports are hoisted above the `const mock*` lines.
  const explicit = (): Record<string, unknown> => ({
    gameProfile: mockGameProfile,
    gameLedgerEntry: mockGameLedgerEntry,
    marketAuditLog: mockMarketAuditLog,
    marketResource: mockMarketResource,
    economicSnapshot: mockEconomicSnapshot,
  });
  const client = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'then') return undefined;
      if (prop === '$transaction' || prop === '$queryRaw' || prop === '$executeRaw') return reject;
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
}));
jest.mock('@/lib/game/server-time', () => ({
  ...jest.requireActual('@/lib/game/server-time'), // clock constants stay real
  getGlobalGameDate: jest.fn(() => ({ totalMonths: 100, year: 2135, month: 4 })),
  formatServerDate: jest.fn(() => 'April 2135'),
}));
jest.mock('@/lib/game/referrals', () => ({
  attachReferral: jest.fn(),
  REFERRAL_COOKIE: 'sn_ref',
}));

import { getServerSession } from 'next-auth';
import { logger } from '@/lib/logger';
import { RESOURCE_BASELINE_KEY, RESOURCE_CEILINGS_KEY, FLAT_FLOOR_MIN, buildServerFlowState, computeServerMonthlyGross } from '@/lib/game/resource-plausibility';
import { plausibleIncomeHeadroom } from '@/lib/game/ledger-reconcile';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import { STARTING_MONEY } from '@/lib/game/constants';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const PAST_ISO = '2026-08-01T00:00:00.000Z';

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    companyName: 'Test Aerospace',
    money: 1_000_000,
    netWorth: 5_000_000,
    lastSyncAt: new Date(Date.now() - 60_000), // one game month ago at 1×
    resources: { iron: 1000, antimatter_precursors: 0 },
    buildingsData: [],
    shipsData: [],
    activeServicesData: [],
    completedResearchList: [],
    workforceData: null as unknown,
    peakNetWorth: 0,
    ...overrides,
  };
}

function setup(row: ReturnType<typeof existingRow> | null) {
  mockGameProfile.findUnique.mockResolvedValue(row);
  mockGameProfile.upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({
    id: 'profile-1', companyName: 'Test Aerospace', peakNetWorth: 0, ...update,
  }));
  mockGameProfile.update.mockResolvedValue({});
  mockGameProfile.count.mockResolvedValue(0);
  mockGameProfile.findMany.mockResolvedValue([]);
  mockGameLedgerEntry.updateMany.mockResolvedValue({ count: 0 });
  mockGameLedgerEntry.findMany.mockResolvedValue([]);
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
  const call = mockGameProfile.upsert.mock.calls[0][0] as { update: Record<string, unknown> };
  return call.update;
}

const ORIGINAL_MODE = process.env.RESOURCE_CLAMP_MODE;

beforeEach(() => {
  jest.clearAllMocks();
  // C-2b: the per-profile sync cadence is in-memory; every test is its own
  // "first sync in 10 s".
  __resetRouteThrottle();
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
});

afterAll(() => {
  if (ORIGINAL_MODE === undefined) delete process.env.RESOURCE_CLAMP_MODE;
  else process.env.RESOURCE_CLAMP_MODE = ORIGINAL_MODE;
});

describe('POST /api/space-tycoon/sync — resource plausibility clamp', () => {
  it('first sync after deploy: sets the baseline marker, never clamps, persists client values', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'enforce';
    setup(existingRow({ workforceData: null }));

    const { res, json } = await postSync({ resources: { iron: 1_000_000 } });

    expect(res.status).toBe(200);
    const data = persisted();
    expect((data.resources as Record<string, number>).iron).toBe(1_000_000);
    const wd = data.workforceData as Record<string, unknown>;
    expect(typeof wd[RESOURCE_BASELINE_KEY]).toBe('string');
    expect(Number.isNaN(Date.parse(wd[RESOURCE_BASELINE_KEY] as string))).toBe(false);
    expect(wd[RESOURCE_CEILINGS_KEY]).toEqual(expect.objectContaining({ iron: expect.any(Number) }));
    expect(json.resourceClamp).toEqual({ mode: 'enforce', baselined: false, rejected: [], enforced: false });
    expect(mockMarketAuditLog.create).not.toHaveBeenCalled();
    expect(mockEconomicSnapshot.create).not.toHaveBeenCalled();
  });

  it('shadow mode (default): persists the client values but writes a warning audit row', async () => {
    delete process.env.RESOURCE_CLAMP_MODE;
    setup(existingRow({ workforceData: { engineers: 2, [RESOURCE_BASELINE_KEY]: PAST_ISO } }));

    const { res, json } = await postSync({ resources: { iron: 1_000_000 }, workforce: { engineers: 2 } });

    expect(res.status).toBe(200);
    const data = persisted();
    expect((data.resources as Record<string, number>).iron).toBe(1_000_000);
    expect(mockMarketAuditLog.create).toHaveBeenCalledTimes(1);
    const audit = mockMarketAuditLog.create.mock.calls[0][0].data;
    expect(audit.eventType).toBe('client_resources_implausible_shadow');
    expect(audit.severity).toBe('warning');
    expect(audit.profileId).toBe('profile-1');
    expect(audit.details.rejected[0]).toEqual(expect.objectContaining({ resource: 'iron', client: 1_000_000 }));
    expect(audit.details.rejected[0].ceiling).toBeLessThan(1_000_000);
    expect(mockEconomicSnapshot.create).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('shadow'), expect.objectContaining({ profileId: 'profile-1' }));
    expect(json.resourceClamp.mode).toBe('shadow');
    expect(json.resourceClamp.enforced).toBe(false);
    expect(json.resourceClamp.rejected).toHaveLength(1);
    // The baseline marker is carried forward unchanged and the client's own
    // workforce fields survive.
    const wd = data.workforceData as Record<string, unknown>;
    expect(wd[RESOURCE_BASELINE_KEY]).toBe(PAST_ISO);
    expect(wd.engineers).toBe(2);
  });

  it('enforce mode: persists the clamped map, takes a pre-clamp snapshot, audits critical', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'enforce';
    const row = existingRow({ workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO } });
    setup(row);

    const { res, json } = await postSync({ resources: { iron: 1_000_000, antimatter_precursors: 10_000 } });

    expect(res.status).toBe(200);
    const data = persisted();
    const persistedRes = data.resources as Record<string, number>;
    expect(persistedRes.iron).toBeLessThan(1_000_000);
    expect(persistedRes.iron).toBeGreaterThanOrEqual(1000); // never below prev
    expect(persistedRes.antimatter_precursors).toBe(FLAT_FLOOR_MIN); // prev 0, nothing produces it
    // Reversibility: the pre-clamp snapshot is written from the row as it stood.
    expect(mockEconomicSnapshot.create).toHaveBeenCalledTimes(1);
    const snap = mockEconomicSnapshot.create.mock.calls[0][0].data;
    expect(snap.reason).toBe('pre-clamp');
    expect(snap.profileId).toBe('profile-1');
    expect(snap.resources).toEqual(row.resources);
    // ...and the snapshot is taken BEFORE the upsert.
    const snapOrder = mockEconomicSnapshot.create.mock.invocationCallOrder[0];
    const upsertOrder = mockGameProfile.upsert.mock.invocationCallOrder[0];
    expect(snapOrder).toBeLessThan(upsertOrder);
    const audit = mockMarketAuditLog.create.mock.calls[0][0].data;
    expect(audit.eventType).toBe('client_resources_implausible_rejected');
    expect(audit.severity).toBe('critical');
    expect(json.resourceClamp.enforced).toBe(true);
    expect(json.resourceClamp.rejected.map((r: { resource: string }) => r.resource).sort()).toEqual(['antimatter_precursors', 'iron']);
    // Net worth is computed over the clamped holdings.
    expect(data.netWorth as number).toBeLessThan(1_000_000 + 1_000_000 * 50_000);
  });

  it('enforce mode: an honest claim (prev + plausible growth) passes untouched, no audit, no snapshot', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'enforce';
    setup(existingRow({ workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO } }));

    const { json } = await postSync({ resources: { iron: 1100, helium3: 3 } });

    const persistedRes = persisted().resources as Record<string, number>;
    expect(persistedRes).toEqual({ iron: 1100, helium3: 3 });
    expect(mockMarketAuditLog.create).not.toHaveBeenCalled();
    expect(mockEconomicSnapshot.create).not.toHaveBeenCalled();
    expect(json.resourceClamp).toEqual({ mode: 'enforce', baselined: true, rejected: [], enforced: false });
  });

  it('enforce mode: decreases are never clamped (spending is unrestricted)', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'enforce';
    setup(existingRow({ workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO } }));

    await postSync({ resources: { iron: 1 } });

    expect((persisted().resources as Record<string, number>).iron).toBe(1);
    expect(mockMarketAuditLog.create).not.toHaveBeenCalled();
  });

  it('RESOURCE_CLAMP_MODE=off: nothing computed, nothing stashed, nothing audited', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'off';
    setup(existingRow({ workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO } }));

    const { json } = await postSync({ resources: { iron: 1_000_000 } });

    const data = persisted();
    expect((data.resources as Record<string, number>).iron).toBe(1_000_000);
    // The client sent no workforce object and no commanders, so nothing is stashed at all.
    expect(data.workforceData).toBeNull();
    expect(mockMarketAuditLog.create).not.toHaveBeenCalled();
    expect(mockEconomicSnapshot.create).not.toHaveBeenCalled();
    expect(json.resourceClamp).toBeNull();
  });

  it('C-1: a brand-new profile (no existing row) is CREATED from the server kit, never from the body', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'enforce';
    setup(null);
    mockGameProfile.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'profile-new', companyName: 'Test Aerospace', peakNetWorth: 0, ...data,
    }));

    const { res, json } = await postSync({ resources: { iron: 1_000_000 } });

    expect(res.status).toBe(200);
    expect(mockGameProfile.upsert).not.toHaveBeenCalled();
    const data = (mockGameProfile.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.resources).toEqual({});
    expect(data.money).toBe(STARTING_MONEY);
    expect(data.serverResources).toEqual({});
    const wd = data.workforceData as Record<string, unknown>;
    expect(typeof wd[RESOURCE_BASELINE_KEY]).toBe('string');
    expect(json.firstSync).toBe(true);
    expect(json.resourceClamp).toEqual({ mode: 'enforce', baselined: true, rejected: [], enforced: false });
    // The discarded body figure is audited (info) when it differs by > 1 %.
    expect(mockMarketAuditLog.create).toHaveBeenCalledTimes(1);
    expect(mockMarketAuditLog.create.mock.calls[0][0].data.eventType).toBe('first_sync_body_ignored');
  });

  it('the money plausibility path is untouched by the resource clamp', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'enforce';
    setup(existingRow({ workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO } }));

    await postSync({ money: 999_999_999_999_999, resources: { iron: 1000 } });

    const data = persisted();
    // Clock unification (2026-09-02): the E1 money ceiling is now derived
    // from the row's own monthly gross (an empty row carries only the tier-1
    // subsidiary allowance) over the ~60 s window. (elapsed is measured at
    // request time, so allow a few seconds of test wall-clock on top.)
    const gross = computeServerMonthlyGross(buildServerFlowState({
      prevResources: {}, prevBuildingsData: [], prevShipsData: [], prevActiveServices: [], prevResearch: [],
    }));
    expect(data.money as number).toBeLessThanOrEqual(1_000_000 + plausibleIncomeHeadroom(65_000, gross));
    expect(data.money as number).toBeGreaterThanOrEqual(1_000_000 + plausibleIncomeHeadroom(60_000, gross));
    expect(data.money as number).toBeLessThan(1_000_000 + 2_000 * 60_000); // far below the old flat $2M/s
    expect(mockMarketAuditLog.create).toHaveBeenCalledTimes(1);
    expect(mockMarketAuditLog.create.mock.calls[0][0].data.eventType).toBe('client_money_implausible_rejected');
  });
});
