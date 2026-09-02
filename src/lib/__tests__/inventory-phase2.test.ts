/**
 * @jest-environment node
 *
 * Server-authoritative inventory — phase 2 (docs/SECURITY_AUDIT_2026-09.md
 * "Server-authoritative inventory — phase 2"): the server-owned
 * `GameProfile.serverResources` map, the escrow-backed gates that read it,
 * the client-side corrections, and the craft / build attestations.
 *
 * Prisma is mocked the same way as sync-resource-clamp.test.ts: explicit
 * jest.fn() models, a rejecting proxy for everything else (the routes wrap
 * those reads in try/catch, so they degrade to "no data").
 */

import { NextRequest } from 'next/server';

const mockGameProfile = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  findMany: jest.fn(),
};
const mockGameLedgerEntry = {
  updateMany: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  findFirst: jest.fn(),
};
const mockMarketAuditLog = { create: jest.fn() };
const mockMarketResource = { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
const mockEconomicSnapshot = { create: jest.fn() };
const mockMarketLimitOrder = {
  count: jest.fn(),
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
};
const mockResourceBounty = { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() };
const mockPlayerActivity = { create: jest.fn() };

jest.mock('@/lib/db', () => {
  const reject = () => Promise.reject(new Error('no database in test'));
  const rejectingModel: unknown = new Proxy({}, { get: () => reject });
  const explicit = (): Record<string, unknown> => ({
    gameProfile: mockGameProfile,
    gameLedgerEntry: mockGameLedgerEntry,
    marketAuditLog: mockMarketAuditLog,
    marketResource: mockMarketResource,
    economicSnapshot: mockEconomicSnapshot,
    marketLimitOrder: mockMarketLimitOrder,
    resourceBounty: mockResourceBounty,
    playerActivity: mockPlayerActivity,
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
const mockRecordLedger = jest.fn();
jest.mock('@/lib/game/server-ledger', () => {
  const actual = jest.requireActual('@/lib/game/server-ledger');
  return {
    ...actual,
    isLedgerAvailable: jest.fn().mockResolvedValue(true),
    recordLedger: (...args: unknown[]) => mockRecordLedger(...args),
  };
});
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
import {
  advanceServerResources,
  computeClientCorrections,
  computeResourceDivergence,
  serverSellableQuantity,
  readServerResources,
  computeCraftAttestationCaps,
  capCraftAttestation,
  capBuildAttestation,
  buildSpendCap,
  MAX_DEFINITION_RESOURCE_COST,
  BUILD_ATTEST_MAX_ORDERS_PER_SYNC,
  RESOURCE_BASELINE_KEY,
  RESOURCE_DIVERGENCE_LOGGED_KEY,
  FLAT_FLOOR_MIN,
  MEGASTRUCTURE_PASSIVE_CEILING,
} from '@/lib/game/resource-plausibility';
import { CLIENT_ATTESTED_LEDGER_REASONS, PENDING_EXCLUDED_LEDGER_REASONS, SERVER_RESOURCE_CORRECTION_REASON } from '@/lib/game/ledger-reconcile';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import { BUILDING_MAP, getCraftingSpeedMultiplier } from '@/lib/game/buildings';
import { CHAIN_MAP } from '@/lib/game/production-chains';
import { RESOURCE_MAP } from '@/lib/game/resources';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const PAST_ISO = '2026-08-01T00:00:00.000Z';
const ORIGINAL_MODE = process.env.RESOURCE_CLAMP_MODE;
// A resource nothing in the fixture produces (no buildings, and no personal
// megastructure passive output), so the growth allowance is exactly the flat
// floor and the expected figures below are timing-independent.
const R = 'antimatter_precursors';

beforeEach(() => {
  jest.clearAllMocks();
  // C-2b: the per-profile sync cadence is in-memory; reset between tests.
  __resetRouteThrottle();
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
});
afterAll(() => {
  if (ORIGINAL_MODE === undefined) delete process.env.RESOURCE_CLAMP_MODE;
  else process.env.RESOURCE_CLAMP_MODE = ORIGINAL_MODE;
});

// ─── Pure rules ──────────────────────────────────────────────────────────────

describe('advanceServerResources (pure)', () => {
  const base = { prodPerMonth: {}, elapsedMonths: 1 };

  it('folds unfolded ledger rows and accepts client growth only up to the allowance', () => {
    const r = advanceServerResources({
      ...base,
      prevServer: { iron: 1000 },
      prevClientRow: { iron: 1000 },
      clientView: { iron: 1_000_000 },
      folded: { iron: -300 },
    });
    // growth allowance with no production = flat floor = max(100, 25% of 1000) = 250
    expect(r.next.iron).toBe(1000 - 300 + 250);
    expect(r.capped).toEqual([{ resource: 'iron', claimed: 1_000_000 - 1000 + 300, allowed: 250 }]);
    expect(r.acceptedGrowth.iron).toBe(250);
  });

  it('accepts an unexplained decrease as-is (spending is never an exploit)', () => {
    const r = advanceServerResources({
      ...base,
      prevServer: { iron: 1000 },
      prevClientRow: { iron: 1000 },
      clientView: { iron: 400 },
      folded: {},
    });
    expect(r.next.iron).toBe(400);
    expect(r.acceptedDecrease.iron).toBe(600);
    expect(r.capped).toHaveLength(0);
  });

  it('removes server-side moves from the client delta so a fill credit is not double-counted', () => {
    // Buy fill credited +200 server-side (row unfolded); client applied it too.
    const r = advanceServerResources({
      ...base,
      prevServer: { iron: 1000 },
      prevClientRow: { iron: 1000 },
      clientView: { iron: 1200 },
      folded: { iron: 200 },
    });
    expect(r.next.iron).toBe(1200);
    expect(r.acceptedGrowth).toEqual({});
  });

  it('never exceeds the client view and never goes negative', () => {
    const r = advanceServerResources({
      ...base,
      prevServer: { iron: 1000 },
      prevClientRow: { iron: 1000 },
      clientView: { iron: 0 },
      folded: { iron: -5000 },
    });
    expect(r.next.iron).toBeUndefined(); // zero entries dropped
    const r2 = advanceServerResources({
      ...base,
      prevServer: { iron: 100 },
      prevClientRow: { iron: 100 },
      clientView: { iron: 50 },
      folded: { iron: 500 }, // a credit the client has not applied cannot lift truth above its view
    });
    expect(r2.next.iron).toBe(50);
  });

  it('craft attestations widen the accepted growth', () => {
    const r = advanceServerResources({
      ...base,
      prevServer: {},
      prevClientRow: {},
      clientView: { steel_ingots: 500 },
      folded: {},
      craftAccepted: { steel_ingots: 300 },
    });
    expect(r.next.steel_ingots).toBe(FLAT_FLOOR_MIN + 300);
  });
});

describe('divergence + corrections (pure)', () => {
  it('flags only > 5% divergence and corrects downward only', () => {
    const client = { iron: 1_000_000, water: 104, gold: 10 };
    const server = { iron: 950, water: 100, gold: 50 };
    const div = computeResourceDivergence(client, server);
    expect(div.map(d => d.resource).sort()).toEqual(['gold', 'iron']);
    const corr = computeClientCorrections(client, server);
    expect(corr).toEqual({ iron: -(1_000_000 - 950) });
    expect(Object.values(corr).every(v => v < 0)).toBe(true);
  });
});

describe('serverSellableQuantity — phase 2 source', () => {
  const phantom = {
    resources: { iron: 1_000_000_000 },
    serverResources: { iron: 0 },
    workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO, _resourceCeilings: { iron: 5_000_000_000 } },
  };

  it('answers with server truth when a server map exists, ignoring the client view and the ceiling', () => {
    const r = serverSellableQuantity(phantom, 'iron', 'shadow');
    expect(r).toEqual({ held: 0, raw: 1_000_000_000, cappedByCeiling: false, ceiling: null, source: 'server' });
  });

  it('adds the unfolded ledger tail (escrow written since the last sync)', () => {
    const r = serverSellableQuantity({ ...phantom, serverResources: { iron: 500 } }, 'iron', 'enforce', { iron: -200 });
    expect(r.held).toBe(300);
    expect(r.source).toBe('server');
  });

  it("mode 'off' returns the raw figure (kill switch = pre-phase-1)", () => {
    expect(serverSellableQuantity(phantom, 'iron', 'off').held).toBe(1_000_000_000);
  });

  it('falls back to the phase-1 ceiling rule without a server map', () => {
    const r = serverSellableQuantity({ ...phantom, serverResources: null }, 'iron', 'shadow');
    expect(r.source).toBe('ceiling');
    expect(r.held).toBe(1_000_000_000); // ceiling 5e9 > raw
  });

  it('readServerResources: null / non-object = not baselined', () => {
    expect(readServerResources(null)).toBeNull();
    expect(readServerResources([])).toBeNull();
    expect(readServerResources({ iron: 3, junk: 'x', neg: -1 })).toEqual({ iron: 3 });
  });
});

describe('attestation caps (pure)', () => {
  const gd = { year: 2126, month: 1 };
  const fab = (id: string, def: string) => ({
    instanceId: id, definitionId: def, locationId: 'earth_orbit',
    buildStartDate: gd, completionDate: gd, isComplete: true, startedAtMs: 0, realDurationSeconds: 0,
  });
  const steel = CHAIN_MAP.get('steel_ingots') || Array.from(CHAIN_MAP.values()).find(c => c.outputId === 'steel_ingots')!;

  it('craft cap = outputQuantity x (floor(window x speed / time) + 1) for recipes the profile can run', () => {
    expect(BUILDING_MAP.get('fabrication_orbital')?.category).toBe('fabrication_facility');
    const buildings = [fab('f1', 'fabrication_orbital')];
    const caps = computeCraftAttestationCaps({
      prevBuildingsData: buildings,
      prevResearch: [...steel.requiredResearch],
      elapsedMs: 60_000,
    });
    const speed = getCraftingSpeedMultiplier(buildings);
    const expected = steel.outputQuantity * (Math.floor((60 * speed) / steel.timeSeconds) + 1);
    expect(caps.steel_ingots).toBe(expected);
  });

  it('a recipe without its research or facility contributes nothing', () => {
    const noResearch = computeCraftAttestationCaps({ prevBuildingsData: [fab('f1', 'fabrication_orbital')], prevResearch: [], elapsedMs: 60_000 });
    expect(noResearch.steel_ingots).toBeUndefined();
    const noFab = computeCraftAttestationCaps({ prevBuildingsData: [], prevResearch: [...steel.requiredResearch], elapsedMs: 60_000 });
    expect(noFab.steel_ingots).toBeUndefined();
    const { accepted, rejected } = capCraftAttestation({ steel_ingots: 10_000 }, noFab);
    expect(accepted).toEqual({});
    expect(rejected).toEqual([{ resource: 'steel_ingots', claimed: 10_000, cap: 0 }]);
  });

  it('more fabs raise the throughput cap (speed multiplier evaluated for real)', () => {
    const one = computeCraftAttestationCaps({ prevBuildingsData: [fab('f1', 'fabrication_orbital')], prevResearch: [...steel.requiredResearch], elapsedMs: 3_600_000 });
    const five = computeCraftAttestationCaps({
      prevBuildingsData: [1, 2, 3, 4, 5].map(i => fab(`f${i}`, 'fabrication_orbital')),
      prevResearch: [...steel.requiredResearch], elapsedMs: 3_600_000,
    });
    expect(five.steel_ingots).toBeGreaterThan(one.steel_ingots);
  });

  it('build cap = largest definition cost x 25, zero for resources nothing costs', () => {
    expect(MAX_DEFINITION_RESOURCE_COST.iron).toBeGreaterThan(0);
    expect(buildSpendCap('iron')).toBe(Math.floor(MAX_DEFINITION_RESOURCE_COST.iron * BUILD_ATTEST_MAX_ORDERS_PER_SYNC));
    expect(buildSpendCap('__nothing__')).toBe(0);
    const { accepted, rejected } = capBuildAttestation({ iron: 5_000_000, __nothing__: 5, bogus: -3 });
    expect(accepted).toEqual({ iron: buildSpendCap('iron') });
    expect(rejected).toEqual([
      { resource: 'iron', claimed: 5_000_000, cap: buildSpendCap('iron') },
      { resource: '__nothing__', claimed: 5, cap: 0 },
    ]);
  });
});

// ─── Sync route ──────────────────────────────────────────────────────────────

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    companyName: 'Test Aerospace',
    money: 1_000_000,
    netWorth: 5_000_000,
    lastSyncAt: new Date(Date.now() - 60_000),
    resources: { [R]: 1000 },
    serverResources: null as unknown,
    buildingsData: [],
    shipsData: [],
    activeServicesData: [],
    completedResearchList: [] as string[],
    workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO } as unknown,
    peakNetWorth: 0,
    ...overrides,
  };
}

function setupSync(row: ReturnType<typeof existingRow> | null, unfolded: { id: string; resourceSlug: string; resourceDelta: number }[] = []) {
  mockGameProfile.findUnique.mockResolvedValue(row);
  mockGameProfile.upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({
    id: 'profile-1', companyName: 'Test Aerospace', peakNetWorth: 0, ...update,
  }));
  mockGameProfile.update.mockResolvedValue({});
  mockGameProfile.count.mockResolvedValue(0);
  mockGameProfile.findMany.mockResolvedValue([]);
  mockGameLedgerEntry.updateMany.mockResolvedValue({ count: 0 });
  // Two findMany shapes: the client pending query (seq > ack) and the
  // phase-2 unfolded query (foldedAt: null).
  mockGameLedgerEntry.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    (where && 'foldedAt' in where ? unfolded : []));
  let seq = 100;
  mockGameLedgerEntry.create.mockImplementation(async () => ({ seq: ++seq }));
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
const auditRows = () => mockMarketAuditLog.create.mock.calls.map(c => c[0].data as { eventType: string; details: Record<string, unknown> });
const ledgerCreates = () => mockGameLedgerEntry.create.mock.calls.map(c => c[0].data as Record<string, unknown>);

describe('POST /api/space-tycoon/sync — phase 2 server-owned inventory', () => {
  it('fixture sanity: the tested resource has no modelled inflow (growth = flat floor only)', () => {
    expect(MEGASTRUCTURE_PASSIVE_CEILING[R]).toBeUndefined();
    expect(MEGASTRUCTURE_PASSIVE_CEILING.steel_ingots).toBeUndefined();
  });

  it('adopts serverResources from the reconciled client view once the phase-1 marker predates the sync, and stamps history folded', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'shadow';
    setupSync(existingRow({ serverResources: null }));

    const { res, json } = await postSync({ resources: { iron: 1100, helium3: 3 }, ledgerAck: 7 });

    expect(res.status).toBe(200);
    expect(persisted().serverResources).toEqual({ iron: 1100, helium3: 3 });
    expect(json.serverInventory).toEqual(expect.objectContaining({ adopted: true, mode: 'shadow' }));
    const fold = mockGameLedgerEntry.updateMany.mock.calls.find(c => c[0].data?.foldedAt);
    expect(fold).toBeDefined();
    expect(fold![0].where).toEqual({ profileId: 'profile-1', foldedAt: null, seq: { lte: 7 } });
    expect(mockGameLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('does not adopt on the very first phase-1 sync (marker set this sync) nor without the marker', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'shadow';
    setupSync(existingRow({ serverResources: null, workforceData: null }));
    await postSync({ resources: { iron: 1100 } });
    expect(persisted().serverResources).toBeUndefined();
    __resetRouteThrottle(); // C-2b cadence: the second sync is a separate window
    expect((await postSync({ resources: { iron: 1100 } })).json.serverInventory).toBeNull();
  });

  it('shadow: advances by folded rows + capped growth, logs divergence with the would-be corrections, sends nothing', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'shadow';
    setupSync(existingRow({ serverResources: { [R]: 1000 } }), [{ id: 'row-1', resourceSlug: R, resourceDelta: -300 }]);

    const { json } = await postSync({ resources: { [R]: 1_000_000 } });

    const data = persisted();
    // prev 1000 − 300 folded + 250 growth (flat floor, no production) = 950
    expect(data.serverResources).toEqual({ [R]: 950 });
    // Client view untouched in shadow (phase 1 also shadows).
    expect((data.resources as Record<string, number>)[R]).toBe(1_000_000);
    // The unfolded row is stamped folded by id.
    const fold = mockGameLedgerEntry.updateMany.mock.calls.find(c => c[0].where?.id);
    expect(fold![0]).toEqual({ where: { id: { in: ['row-1'] } }, data: { foldedAt: expect.any(Date) } });
    // No correction row in shadow.
    expect(ledgerCreates().filter(r => r.reason === SERVER_RESOURCE_CORRECTION_REASON)).toHaveLength(0);
    const div = auditRows().find(r => r.eventType === 'client_server_resource_divergence');
    expect(div).toBeDefined();
    expect(div!.details.corrections).toEqual({ [R]: -(1_000_000 - 950) });
    expect(div!.details.corrected).toBe(false);
    expect((div!.details.capped as { resource: string }[])[0].resource).toBe(R);
    // Throttle marker stashed.
    expect(typeof (data.workforceData as Record<string, unknown>)[RESOURCE_DIVERGENCE_LOGGED_KEY]).toBe('string');
    expect(json.serverInventory.corrected).toBe(false);
    expect(json.serverInventory.corrections).toEqual({ [R]: -(1_000_000 - 950) });
    expect(json.ledger.resourceDeltas).toEqual({});
  });

  it('enforce: writes a server_resource_correction row, applies it to the client view, and returns it as a pending delta', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'enforce';
    setupSync(existingRow({ serverResources: { [R]: 1000 } }), [{ id: 'row-1', resourceSlug: R, resourceDelta: -300 }]);

    const { json } = await postSync({ resources: { [R]: 1_000_000 } });

    const data = persisted();
    // Phase-1 clamp first: 1e6 → ceiling 1000 + 250 = 1250. Then server:
    // 1000 − 300 + min(1250 − 1000 + 300, 250) = 950. Correction 1250 → 950.
    expect(data.serverResources).toEqual({ [R]: 950 });
    expect((data.resources as Record<string, number>)[R]).toBe(950);
    const corr = ledgerCreates().filter(r => r.reason === SERVER_RESOURCE_CORRECTION_REASON);
    expect(corr).toHaveLength(1);
    expect(corr[0]).toEqual(expect.objectContaining({
      profileId: 'profile-1', resourceSlug: R, resourceDelta: -300, foldedAt: expect.any(Date), appliedAt: null,
    }));
    expect(json.ledger.resourceDeltas).toEqual({ [R]: -300 });
    expect(json.ledger.maxSeq).toBe(101);
    expect(json.ledger.entries.at(-1)).toEqual(expect.objectContaining({ seq: 101, resourceDelta: -300 }));
    expect(json.serverInventory.corrected).toBe(true);
    const div = auditRows().find(r => r.eventType === 'client_server_resource_divergence');
    expect(div!.details.corrected).toBe(true);
  });

  it('never corrects upward: a client view below server truth is accepted as a decrease', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'enforce';
    setupSync(existingRow({ serverResources: { [R]: 1000 } }));

    const { json } = await postSync({ resources: { [R]: 400 } });

    expect(persisted().serverResources).toEqual({ [R]: 400 });
    expect((persisted().resources as Record<string, number>)[R]).toBe(400);
    expect(ledgerCreates()).toHaveLength(0);
    expect(auditRows().find(r => r.eventType === 'client_server_resource_divergence')).toBeUndefined();
    expect(json.serverInventory.corrections).toEqual({});
  });

  it('divergence audit is throttled to one row per profile per hour and the marker is carried forward', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'shadow';
    const recent = new Date(Date.now() - 10 * 60_000).toISOString();
    setupSync(existingRow({
      serverResources: { [R]: 1000 },
      workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO, [RESOURCE_DIVERGENCE_LOGGED_KEY]: recent },
    }));

    await postSync({ resources: { [R]: 1_000_000 } });

    expect(auditRows().find(r => r.eventType === 'client_server_resource_divergence')).toBeUndefined();
    expect((persisted().workforceData as Record<string, unknown>)[RESOURCE_DIVERGENCE_LOGGED_KEY]).toBe(recent);
  });

  it('craft attestation: capped by recipe throughput, ledgered as client_craft_output, widens accepted growth', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'shadow';
    const steel = Array.from(CHAIN_MAP.values()).find(c => c.outputId === 'steel_ingots')!;
    const gd = { year: 2126, month: 1 };
    setupSync(existingRow({
      serverResources: { [R]: 1000 },
      buildingsData: [{ instanceId: 'f1', definitionId: 'fabrication_orbital', locationId: 'earth_orbit', buildStartDate: gd, completionDate: gd, isComplete: true, startedAtMs: 0, realDurationSeconds: 0 }],
      completedResearchList: [...steel.requiredResearch],
    }));
    const cap = steel.outputQuantity * (Math.floor(60 / steel.timeSeconds) + 1);

    const { json } = await postSync({
      resources: { [R]: 1000, steel_ingots: 10_000 },
      craftedThisTick: { steel_ingots: 10_000 },
    });

    const craftRows = ledgerCreates().filter(r => r.reason === 'client_craft_output');
    expect(craftRows).toHaveLength(1);
    expect(craftRows[0]).toEqual(expect.objectContaining({
      resourceSlug: 'steel_ingots', resourceDelta: cap, foldedAt: expect.any(Date), appliedAt: expect.any(Date),
    }));
    expect((persisted().serverResources as Record<string, number>).steel_ingots).toBe(FLAT_FLOOR_MIN + cap);
    expect(json.serverInventory.craft.rejected).toEqual([{ resource: 'steel_ingots', claimed: 10_000, cap }]);
    // The attestation must never come back to the client as a pending delta.
    expect(json.ledger.resourceDeltas).toEqual({});
    const pendingQuery = mockGameLedgerEntry.findMany.mock.calls.find(c => c[0].where?.seq)![0].where;
    // H-5 (2026-09-02): the client-applied market/trade rows are excluded too.
    expect(pendingQuery.reason).toEqual({ notIn: [...PENDING_EXCLUDED_LEDGER_REASONS] });
    expect(PENDING_EXCLUDED_LEDGER_REASONS).toEqual(expect.arrayContaining([...CLIENT_ATTESTED_LEDGER_REASONS]));
  });

  it('build attestation: capped by definition costs x 25, ledgered as client_build_spend', async () => {
    process.env.RESOURCE_CLAMP_MODE = 'shadow';
    setupSync(existingRow({ serverResources: { [R]: 1000 } }));

    const { json } = await postSync({ resources: { [R]: 900 }, builtThisTick: { iron: 5_000_000, __nothing__: 4 } });

    const rows = ledgerCreates().filter(r => r.reason === 'client_build_spend');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({ resourceSlug: 'iron', resourceDelta: -buildSpendCap('iron') }));
    expect(json.serverInventory.build.rejected).toEqual(expect.arrayContaining([
      { resource: 'iron', claimed: 5_000_000, cap: buildSpendCap('iron') },
    ]));
    // The decrease itself is accepted from the client view, not from the attestation.
    expect(persisted().serverResources).toEqual({ [R]: 900 });
  });

  it("RESOURCE_CLAMP_MODE=off leaves the server map untouched", async () => {
    process.env.RESOURCE_CLAMP_MODE = 'off';
    setupSync(existingRow({ serverResources: { [R]: 1000 } }));
    const { json } = await postSync({ resources: { [R]: 1_000_000 } });
    expect(persisted().serverResources).toBeUndefined();
    expect(json.serverInventory).toBeNull();
  });
});

// ─── Escrow-backed paths ─────────────────────────────────────────────────────

function sellerProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    companyName: 'Phantom Corp',
    money: 0,
    resources: { iron: 1_000_000_000 },
    serverResources: { iron: 0 },
    workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO, _resourceCeilings: { iron: 5_000_000_000 } },
    ...overrides,
  };
}

describe('market-orderbook placeLimitOrder — sell gating on server truth', () => {
  const iron = RESOURCE_MAP.get('iron' as never)!;

  beforeEach(() => {
    process.env.RESOURCE_CLAMP_MODE = 'shadow';
    mockMarketLimitOrder.count.mockResolvedValue(0);
    mockMarketLimitOrder.findMany.mockResolvedValue([]);
    mockMarketLimitOrder.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'order-1', status: 'open', filledQty: 0, ...data }));
    mockMarketLimitOrder.findUnique.mockImplementation(async () => ({ id: 'order-1', status: 'open', filledQty: 0, quantity: 1 }));
    mockGameLedgerEntry.findMany.mockResolvedValue([]);
    mockMarketAuditLog.create.mockResolvedValue({});
    mockGameProfile.update.mockResolvedValue({});
  });

  it('rejects a phantom sell: client map says 1e9, serverResources says 0', async () => {
    mockGameProfile.findUnique.mockResolvedValue(sellerProfile());
    const { placeLimitOrder } = await import('@/lib/game/market-orderbook');

    const r = await placeLimitOrder('profile-1', 'iron', 'sell', 1, iron.baseMarketPrice);

    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Insufficient/);
    expect(r.error).toMatch(/You have 0/);
    expect(mockMarketLimitOrder.create).not.toHaveBeenCalled();
    expect(mockGameProfile.update).not.toHaveBeenCalled();
    const gate = auditRows().find(a => a.eventType === 'sell_gated_by_server_inventory');
    expect(gate).toBeDefined();
    expect(gate!.details).toEqual(expect.objectContaining({ path: 'order_book', quantity: 1, raw: 1_000_000_000, serverHeld: 0 }));
  });

  it('honours the unfolded ledger tail: a sell escrowed since the last sync is already debited', async () => {
    mockGameProfile.findUnique.mockResolvedValue(sellerProfile({ serverResources: { iron: 500 } }));
    mockGameLedgerEntry.findMany.mockResolvedValue([{ resourceSlug: 'iron', resourceDelta: -400 }]);
    const { placeLimitOrder } = await import('@/lib/game/market-orderbook');

    const r = await placeLimitOrder('profile-1', 'iron', 'sell', 200, iron.baseMarketPrice);

    expect(r.success).toBe(false);
    expect(r.error).toMatch(/You have 100/);
  });

  it('accepts a real sell, debits the CLIENT view, and ledgers the escrow (server truth follows via the fold)', async () => {
    mockGameProfile.findUnique.mockResolvedValue(sellerProfile({ resources: { iron: 1_000_000_000 }, serverResources: { iron: 500 } }));
    const { placeLimitOrder } = await import('@/lib/game/market-orderbook');

    const r = await placeLimitOrder('profile-1', 'iron', 'sell', 200, iron.baseMarketPrice);

    expect(r.success).toBe(true);
    const upd = mockGameProfile.update.mock.calls[0][0];
    expect(upd.data.resources).toEqual({ iron: 1_000_000_000 - 200 });
    expect(upd.data.serverResources).toBeUndefined();
    expect(mockRecordLedger).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      profileId: 'profile-1', resourceSlug: 'iron', resourceDelta: -200, reason: 'order_resource_escrow',
    }));
    expect(auditRows().find(a => a.eventType === 'sell_gated_by_server_inventory')).toBeUndefined();
  });

  it('falls back to the phase-1 ceiling rule for a profile without a server map', async () => {
    mockGameProfile.findUnique.mockResolvedValue(sellerProfile({ serverResources: null, workforceData: { [RESOURCE_BASELINE_KEY]: PAST_ISO, _resourceCeilings: { iron: 50 } } }));
    const { placeLimitOrder } = await import('@/lib/game/market-orderbook');

    const r = await placeLimitOrder('profile-1', 'iron', 'sell', 100, iron.baseMarketPrice);

    expect(r.success).toBe(false);
    expect(auditRows().find(a => a.eventType === 'sell_gated_by_resource_ceiling')).toBeDefined();
  });
});

describe('POST /api/space-tycoon/bounties fill — delivery gated on server truth', () => {
  function bountyRow() {
    return {
      id: 'bounty-1', posterId: 'poster-9', resourceSlug: 'iron', quantity: 100, filledQty: 0,
      pricePerUnit: 100, totalBudget: 10_000, status: 'open', expiresAt: new Date(Date.now() + 3600_000),
    };
  }
  async function fill(profile: Record<string, unknown>, quantity: number) {
    process.env.RESOURCE_CLAMP_MODE = 'shadow';
    mockGameProfile.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) =>
      (where.userId ? profile : { id: where.id, resources: {} }));
    mockResourceBounty.findMany.mockResolvedValue([]);
    mockResourceBounty.findUnique.mockResolvedValue(bountyRow());
    mockResourceBounty.updateMany.mockResolvedValue({ count: 1 });
    mockGameLedgerEntry.findFirst.mockResolvedValue({ id: 'escrow-row' });
    mockGameLedgerEntry.findMany.mockResolvedValue([]);
    mockMarketAuditLog.create.mockResolvedValue({});
    mockGameProfile.update.mockResolvedValue({});
    const { POST } = await import('@/app/api/space-tycoon/bounties/route');
    const req = new NextRequest('http://localhost/api/space-tycoon/bounties', {
      method: 'POST', body: JSON.stringify({ action: 'fill', bountyId: 'bounty-1', quantity }),
    });
    const res = await POST(req);
    return { res, json: await res.json() };
  }

  it('rejects a phantom delivery (client map 1e9, server 0) with a 400 and audits the gate', async () => {
    const { res, json } = await fill(sellerProfile(), 50);
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/you have 0, need 50/);
    expect(mockResourceBounty.updateMany).not.toHaveBeenCalled();
    const gate = auditRows().find(a => a.eventType === 'sell_gated_by_server_inventory');
    expect(gate!.details).toEqual(expect.objectContaining({ path: 'bounty_fill', quantity: 50, serverHeld: 0, refId: 'bounty-1' }));
  });

  it('delivers when server truth covers it, debiting the client view and ledgering both legs', async () => {
    const { res, json } = await fill(sellerProfile({ resources: { iron: 1_000 }, serverResources: { iron: 80 } }), 50);
    expect(res.status).toBe(200);
    expect(json.settled).toBe(true);
    const fillerUpdate = mockGameProfile.update.mock.calls.find(c => c[0].where.id === 'profile-1')![0];
    expect(fillerUpdate.data.resources).toEqual({ iron: 950 });
    expect(fillerUpdate.data.serverResources).toBeUndefined();
    expect(mockRecordLedger).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      profileId: 'profile-1', resourceSlug: 'iron', resourceDelta: -50, reason: 'bounty_resources_delivered',
    }));
    expect(mockRecordLedger).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      profileId: 'poster-9', resourceSlug: 'iron', resourceDelta: 50, reason: 'bounty_resources_received',
    }));
  });
});
