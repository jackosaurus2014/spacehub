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

// ─── 2026-09-13: timed-event + delivery credits through the route ────────────

import { EVENT_TEMPLATES, calculateEventReward } from '@/lib/game/timed-events';
import { timedEventCreditId, maxTimedEventReward, DELIVERY_CREDIT_MULT } from '@/lib/game/contract-credit';
import { generateContract, DELIVERY_POOL_REFRESH_MS } from '@/lib/game/delivery-contracts';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { GameState } from '@/lib/game/types';

const PMB_TEMPLATE = EVENT_TEMPLATES.find(e => e.id === 'evt_precious_metals')!;
const REH_TEMPLATE = EVENT_TEMPLATES.find(e => e.id === 'evt_rare_earth_hunt')!;
/** A 14-service corporation (the founder's scale): PMB $280M, REH $210M. */
const FOURTEEN_SERVICES = Array.from({ length: 14 }, (_, i) => ({
  definitionId: 'svc_ground_tracking', locationId: 'earth_surface', linkedBuildingIds: [] as string[], _i: i,
}));
const PMB_REWARD = calculateEventReward(PMB_TEMPLATE, { activeServices: FOURTEEN_SERVICES } as unknown as GameState);
const REH_REWARD = calculateEventReward(REH_TEMPLATE, { activeServices: FOURTEEN_SERVICES } as unknown as GameState);

function eventOccurrence(templateId: string, startedAtMs: number, reward: number) {
  return { id: timedEventCreditId(templateId, startedAtMs), templateId, startedAtMs, completedAtMs: startedAtMs + 3600_000, reward };
}

describe('POST /api/space-tycoon/sync — timed-event credit', () => {
  it('the founder case: Precious Metals Bonanza + Rare Earth Hunt ($490M) pass the clamp in full and are persisted once', async () => {
    expect(PMB_REWARD).toBe(280_000_000);
    expect(REH_REWARD).toBe(210_000_000);
    // The persisted row carries the 14 services the reward was scaled from.
    setup(existingRow({ activeServicesData: FOURTEEN_SERVICES }));
    const now = Date.now();
    const pmb = eventOccurrence('evt_precious_metals', now - 5 * 3600_000, PMB_REWARD);
    const reh = eventOccurrence('evt_rare_earth_hunt', now - 4 * 3600_000, REH_REWARD);
    const claim = PREV_MONEY + PMB_REWARD + REH_REWARD;

    const { res, json } = await postSync({ money: claim, completedTimedEvents: [pmb, reh] });

    expect(res.status).toBe(200);
    expect(persisted().money).toBe(claim);
    expect(json.reconciledMoney).toBe(claim);
    expect(json.timedEventCredit).toEqual({ creditedNow: [pmb.id, reh.id], headroomCredit: 490_000_000, rejected: [], deferred: 0 });
    expect(persisted().creditedContractIds).toEqual([pmb.id, reh.id]);
    expect(auditEvents()).not.toContain('client_money_implausible_rejected');
    expect(typeof json.syncedAtMs).toBe('number');
    expect(json.moneyClamp).toMatchObject({ wasClamped: false, rejectedExcess: 0 });

    // Second sync with the same occurrences: nothing new is credited.
    jest.clearAllMocks();
    __resetRouteThrottle();
    setup(existingRow({ activeServicesData: FOURTEEN_SERVICES, money: claim, creditedContractIds: [pmb.id, reh.id] }));
    const again = await postSync({ money: claim + PMB_REWARD, completedTimedEvents: [pmb, reh] });
    expect(again.json.timedEventCredit.creditedNow).toEqual([]);
    expect(again.json.timedEventCredit.headroomCredit).toBe(0);
    expect(persisted().creditedContractIds).toEqual([pmb.id, reh.id]);

    // 2026-09-13 scaling fix: what stops a replay is the CREDIT SET, asserted
    // above — not the ceiling. This 14-service row's server-derived gross is
    // ~$76.7B/game-month (the theoretical-max multiplier stack), so a second
    // $280M inside 65 s is now inside its own time-proportional headroom; the
    // flat $500/ms rail that used to reject it is exactly what broke large
    // corporations (ledger-reconcile.ts header). A claim beyond what the
    // persisted state can gross is still clamped:
    jest.clearAllMocks();
    __resetRouteThrottle();
    setup(existingRow({ activeServicesData: FOURTEEN_SERVICES, money: claim, creditedContractIds: [pmb.id, reh.id] }));
    const forged = await postSync({ money: claim + 1e14, completedTimedEvents: [pmb, reh] });
    expect(forged.json.moneyClamp.wasClamped).toBe(true);
    expect(persisted().money as number).toBeLessThan(claim + 1e14);
    expect(auditEvents()).toContain('client_money_implausible_rejected');
  });

  it('the bound is the server-recomputed reward: a forged $5B reward on an empty row is credited at the bound', async () => {
    setup(existingRow());
    const now = Date.now();
    const evt = eventOccurrence('evt_precious_metals', now - 3600_000, 5_000_000_000);
    const { json } = await postSync({ money: PREV_MONEY + 5_000_000_000, completedTimedEvents: [evt] });
    expect(json.timedEventCredit.headroomCredit).toBe(maxTimedEventReward('evt_precious_metals', 0));
    expect(persisted().money as number).toBeLessThanOrEqual(PREV_MONEY + plausibleIncomeHeadroom(65_000, EMPTY_GROSS) + json.timedEventCredit.headroomCredit);
    expect(auditEvents()).toContain('client_money_implausible_rejected');
  });

  it('this sync\'s validated service list also counts toward the bound (the reward was fixed at spawn)', async () => {
    setup(existingRow());
    const now = Date.now();
    const evt = eventOccurrence('evt_rare_earth_hunt', now - 3600_000, REH_REWARD);
    const { json } = await postSync({
      money: PREV_MONEY + REH_REWARD,
      activeServices: FOURTEEN_SERVICES.map(({ _i: _unused, ...s }) => s),
      completedTimedEvents: [evt],
    });
    expect(json.timedEventCredit.headroomCredit).toBe(REH_REWARD);
    expect(persisted().money).toBe(PREV_MONEY + REH_REWARD);
  });

  it('an occurrence outside its template window is rejected, audited, and named in unverifiedIncome', async () => {
    setup(existingRow());
    const now = Date.now();
    const start = now - 30 * 3600_000; // PMB lasts 8 h
    const evt = { ...eventOccurrence('evt_precious_metals', start, 40_000_000), completedAtMs: start + 20 * 3600_000 };
    const { json } = await postSync({ money: PREV_MONEY + 40_000_000, completedTimedEvents: [evt] });
    expect(json.timedEventCredit).toEqual({ creditedNow: [], headroomCredit: 0, rejected: [{ id: evt.id, reason: 'outside_window' }], deferred: 0 });
    expect(json.unverifiedIncome.timedEvents).toEqual([evt.id]);
    expect(auditEvents()).toContain('income_credit_rejected');
    expect(persisted().creditedContractIds).toEqual([]);
  });

  it('a malformed completedTimedEvents body is a 400', async () => {
    setup(existingRow());
    const { res, json } = await postSync({ money: PREV_MONEY, completedTimedEvents: [{ id: 'evt:x:1' }] });
    expect(res.status).toBe(400);
    expect(json.field).toBe('completedTimedEvents[0].templateId');
  });
});

describe('POST /api/space-tycoon/sync — delivery credit', () => {
  const gen = generateContract('the-dominion', Math.floor(Date.now() / DELIVERY_POOL_REFRESH_MS) * 1000 + 37, Date.now(), 1.0);
  const delivery = { id: gen.id, resourceId: gen.resourceId, quantity: gen.quantity, paymentMoney: gen.paymentMoney };

  it('a delivery whose resources left the inventory passes the clamp and is persisted once', async () => {
    setup(existingRow({ resources: { [gen.resourceId]: 2_000 } }));
    const claim = PREV_MONEY + gen.paymentMoney;

    const { json } = await postSync({ money: claim, resources: { [gen.resourceId]: 2_000 - gen.quantity }, completedDeliveries: [delivery] });

    expect(persisted().money).toBe(claim);
    expect(json.deliveryCredit).toEqual({ creditedNow: [gen.id], headroomCredit: gen.paymentMoney, rejected: [], deferred: 0 });
    expect(persisted().creditedContractIds).toEqual([gen.id]);
    expect(auditEvents()).not.toContain('client_money_implausible_rejected');
  });

  it('the resource gate: an unchanged inventory credits nothing, audits, and the id is not persisted', async () => {
    setup(existingRow({ resources: { [gen.resourceId]: 2_000 } }));
    const claim = PREV_MONEY + gen.paymentMoney;

    const { json } = await postSync({ money: claim, resources: { [gen.resourceId]: 2_000 }, completedDeliveries: [delivery] });

    expect(json.deliveryCredit).toEqual({ creditedNow: [], headroomCredit: 0, rejected: [{ id: gen.id, reason: 'resource_gate' }], deferred: 0 });
    expect(json.unverifiedIncome.deliveries).toEqual([gen.id]);
    expect(persisted().creditedContractIds).toEqual([]);

    // The delivery must contribute NOTHING. Asserting `money < claim` here
    // used to stand in for that, but it was really asserting that the
    // plausibility ceiling happened to bite — and the ceiling is an ALLOWANCE
    // over elapsed time, not a per-transaction check. `gen` is generated from
    // a time-bucketed seed, so its payout changes with the delivery pool; on a
    // day when the payout sat under the allowance the money was legitimately
    // kept and the assertion failed for no good reason (it did, on
    // 2026-09-14, once Mining Phase D widened the ceiling). Compare against
    // the SAME sync with no delivery attached instead: identical persisted
    // money proves the rejected delivery paid nothing, whatever the day's
    // payout. The ceiling itself is covered deterministically by the
    // inflated-payment case below, which claims $1e12.
    const withDelivery = persisted().money as number;
    setup(existingRow({ resources: { [gen.resourceId]: 2_000 } }));
    await postSync({ money: claim, resources: { [gen.resourceId]: 2_000 } });
    expect(withDelivery).toBe(persisted().money as number);
    setup(existingRow({ resources: { [gen.resourceId]: 2_000 } }));
    await postSync({ money: claim, resources: { [gen.resourceId]: 2_000 }, completedDeliveries: [delivery] });
    expect(auditEvents()).toContain('income_credit_rejected');
    const audit = mockMarketAuditLog.create.mock.calls.find(c => c[0].data.eventType === 'income_credit_rejected')![0].data;
    expect(audit.details.deliveries.resourceGate[gen.resourceId]).toEqual({ claimed: gen.quantity, decrease: 0, passed: false });
  });

  it('an inflated payment is credited at the bound, never the claim', async () => {
    setup(existingRow({ resources: { [gen.resourceId]: 2_000 } }));
    const base = RESOURCE_MAP.get(gen.resourceId as never)!.baseMarketPrice;
    const { json } = await postSync({
      money: PREV_MONEY + 1e12,
      resources: { [gen.resourceId]: 2_000 - gen.quantity },
      completedDeliveries: [{ ...delivery, paymentMoney: 1e12 }],
    });
    expect(json.deliveryCredit.headroomCredit).toBeLessThanOrEqual(Math.round(gen.quantity * base * DELIVERY_CREDIT_MULT));
    expect(json.deliveryCredit.headroomCredit).toBeLessThan(1e12);
    expect(auditEvents()).toContain('client_money_implausible_rejected');
  });

  it('the three credits share the persisted set', async () => {
    setup(existingRow({ creditedContractIds: [FIRST], resources: { [gen.resourceId]: 2_000 } }));
    const now = Date.now();
    const evt = eventOccurrence('evt_rare_earth_hunt', now - 3600_000, 30_000_000);
    const second = CONTRACT_POOL[1].id;
    await postSync({
      money: PREV_MONEY,
      resources: { [gen.resourceId]: 2_000 - gen.quantity },
      completedContracts: [FIRST, second],
      completedTimedEvents: [evt],
      completedDeliveries: [delivery],
    });
    expect(persisted().creditedContractIds).toEqual([FIRST, second, evt.id, gen.id]);
  });
});
