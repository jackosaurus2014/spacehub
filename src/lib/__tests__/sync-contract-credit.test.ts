/**
 * @jest-environment node
 *
 * Money desync fix (2026-09-12) — the sync route credits verifiable one-shot
 * contract income into the money clamp's headroom, once per CONTRACT_POOL id
 * per profile (GameProfile.creditedContractIds), BEFORE the ledger
 * reconciliation (so server-verified ledger deltas are never clamped).
 *
 * Prisma mock: same posture as sync-resource-clamp.test.ts — explicit models
 * the route touches, rejecting proxy for everything else.
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
  recordSyncAuthoredLedger: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/game/server-time', () => ({
  ...jest.requireActual('@/lib/game/server-time'),
  getGlobalGameDate: jest.fn(() => ({ totalMonths: 100, year: 2135, month: 4 })),
  formatServerDate: jest.fn(() => 'April 2135'),
}));
jest.mock('@/lib/game/referrals', () => ({
  attachReferral: jest.fn(),
  REFERRAL_COOKIE: 'sn_ref',
}));

import { getServerSession } from 'next-auth';
import { buildServerFlowState, computeServerMonthlyGross } from '@/lib/game/resource-plausibility';
import { plausibleIncomeHeadroom } from '@/lib/game/ledger-reconcile';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import { maxStaticContractPayout, tierMultForProfile, CONTRACT_DEFINITION_MAP } from '@/lib/game/contract-credit';
import { CONTRACT_POOL } from '@/lib/game/contracts';
import { STARTING_MONEY } from '@/lib/game/constants';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const PREV_MONEY = 80_200_000;
const FIRST = CONTRACT_POOL[0].id;
// The mocked profile has totalEarned 0 -> tier 1, so the credit uses the tier-1 factor (never the ladder top).
const FIRST_MAX = maxStaticContractPayout(CONTRACT_DEFINITION_MAP.get(FIRST)!, tierMultForProfile(1));
/** An empty row's monthly gross (only the tier-1 allowances). */
const EMPTY_GROSS = computeServerMonthlyGross(buildServerFlowState({
  prevResources: {}, prevBuildingsData: [], prevShipsData: [], prevActiveServices: [], prevResearch: [],
}));

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    companyName: 'Cape Heritage',
    money: PREV_MONEY,
    netWorth: PREV_MONEY,
    totalEarned: 0,
    lastSyncAt: new Date(Date.now() - 60_000),
    resources: {},
    buildingsData: [],
    shipsData: [],
    activeServicesData: [],
    completedResearchList: [],
    workforceData: null as unknown,
    serverResources: null as unknown,
    creditedContractIds: [] as string[],
    peakNetWorth: 0,
    ...overrides,
  };
}

function setup(row: ReturnType<typeof existingRow> | null) {
  mockGameProfile.findUnique.mockResolvedValue(row);
  mockGameProfile.upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({
    id: 'profile-1', companyName: 'Cape Heritage', peakNetWorth: 0, ...update,
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
    body: JSON.stringify({ companyName: 'Cape Heritage', ...body }),
  });
  const res = await POST(req as unknown as Request);
  return { res, json: await res.json() };
}

function persisted() {
  const call = mockGameProfile.upsert.mock.calls[0][0] as { update: Record<string, unknown> };
  return call.update;
}

const auditEvents = () => mockMarketAuditLog.create.mock.calls.map(c => c[0].data.eventType as string);

beforeEach(() => {
  jest.clearAllMocks();
  __resetRouteThrottle();
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
  delete process.env.RESOURCE_CLAMP_MODE;
});

describe('POST /api/space-tycoon/sync — contract credit in the money clamp', () => {
  it('a starter contract completed since the last sync passes the clamp in full and is persisted as credited', async () => {
    setup(existingRow());
    const claim = PREV_MONEY + FIRST_MAX; // the most the client could have paid itself

    const { res, json } = await postSync({ money: claim, completedContracts: [FIRST] });

    expect(res.status).toBe(200);
    const data = persisted();
    expect(data.money).toBe(claim);
    expect(data.creditedContractIds).toEqual([FIRST]);
    expect(json.reconciledMoney).toBe(claim);
    expect(json.contractCredit).toEqual({ creditedNow: [FIRST], headroomCredit: FIRST_MAX, deferred: 0, unknown: 0 });
    expect(auditEvents()).not.toContain('client_money_implausible_rejected');
  });

  it('the same id is never credited twice: the second sync is clamped to the tick headroom', async () => {
    setup(existingRow({ creditedContractIds: [FIRST] }));
    const claim = PREV_MONEY + FIRST_MAX;

    const { json } = await postSync({ money: claim, completedContracts: [FIRST] });

    const data = persisted();
    expect(data.money as number).toBeLessThanOrEqual(PREV_MONEY + plausibleIncomeHeadroom(65_000, EMPTY_GROSS));
    expect(data.money as number).toBeLessThan(claim);
    expect(data.creditedContractIds).toEqual([FIRST]);
    expect(json.contractCredit.creditedNow).toEqual([]);
    expect(json.contractCredit.headroomCredit).toBe(0);
    expect(auditEvents()).toContain('client_money_implausible_rejected');
    const rejected = mockMarketAuditLog.create.mock.calls.find(c => c[0].data.eventType === 'client_money_implausible_rejected')![0].data;
    expect(rejected.details.contractCredit).toBe(0);
    expect(rejected.details.contractsCredited).toEqual([]);
  });

  it('an id that is not a CONTRACT_POOL definition lifts nothing and is not persisted', async () => {
    setup(existingRow());

    const { json } = await postSync({ money: PREV_MONEY + 60_000_000, completedContracts: ['c_forged_payday'] });

    const data = persisted();
    expect(data.money as number).toBeLessThan(PREV_MONEY + 60_000_000);
    expect(data.creditedContractIds).toEqual([]);
    expect(json.contractCredit).toEqual({ creditedNow: [], headroomCredit: 0, deferred: 0, unknown: 1 });
  });

  it('the credit only widens the ceiling — a claim below it is persisted verbatim', async () => {
    setup(existingRow());
    const claim = PREV_MONEY + 60_000_000; // the actual T1 payout, well under the maximum

    await postSync({ money: claim, completedContracts: [FIRST] });

    expect(persisted().money).toBe(claim);
  });

  it('ordering: server ledger deltas are added AFTER the clamp and are never clamped themselves', async () => {
    setup(existingRow({ creditedContractIds: [FIRST] }));
    mockGameLedgerEntry.findMany.mockResolvedValue([
      { seq: 3, moneyDelta: 25_000_000, resourceSlug: null, resourceDelta: 0, reason: 'bounty_payout', refId: null },
    ]);
    const claim = PREV_MONEY + FIRST_MAX;

    const { json } = await postSync({ money: claim, completedContracts: [FIRST], ledgerAck: 0 });

    const data = persisted();
    const ceilingMax = PREV_MONEY + plausibleIncomeHeadroom(65_000, EMPTY_GROSS);
    // clamped claim (<= ceiling) + the full 25M ledger credit
    expect(data.money as number).toBeLessThanOrEqual(ceilingMax + 25_000_000);
    expect(data.money as number).toBeGreaterThanOrEqual(PREV_MONEY + 25_000_000);
    expect(json.ledger.moneyDelta).toBe(25_000_000);
    expect(json.reconciledMoney).toBe(data.money);
  });

  it('a previously credited set is carried forward and extended, never replaced', async () => {
    const second = CONTRACT_POOL[1].id;
    setup(existingRow({ creditedContractIds: [FIRST] }));

    await postSync({ money: PREV_MONEY, completedContracts: [FIRST, second] });

    expect(persisted().creditedContractIds).toEqual([FIRST, second]);
  });

  it('a first sync (C-1) credits nothing: the row is created at the kit money with an empty credited set', async () => {
    setup(null);
    mockGameProfile.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'profile-new', companyName: 'Cape Heritage', peakNetWorth: 0, ...data,
    }));

    const { res, json } = await postSync({ money: 500_000_000, completedContracts: [FIRST] });

    expect(res.status).toBe(200);
    expect(mockGameProfile.upsert).not.toHaveBeenCalled();
    const data = (mockGameProfile.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.money).toBe(STARTING_MONEY);
    expect(data.creditedContractIds).toEqual([]);
    expect(json.firstSync).toBe(true);
    expect(json.contractCredit).toBeNull();
  });

  it('a malformed completedContracts body is a 400', async () => {
    setup(existingRow());
    const { res, json } = await postSync({ money: PREV_MONEY, completedContracts: 'c_first_launch' });
    expect(res.status).toBe(400);
    expect(json.field).toBe('completedContracts');
    expect(mockGameProfile.upsert).not.toHaveBeenCalled();
  });
});
