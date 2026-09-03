/**
 * @jest-environment node
 *
 * Diplomacy (2026-09-02) — binding corp-to-corp supply contracts
 * (docs/ECONOMY_PVP_2026-08.md "Diplomacy"). Pure rules in
 * corp-contracts.ts; the route/handler layer with prisma mocked the same
 * way as game-exploit-regressions.test.ts (explicit jest.fn() models, a
 * rejecting proxy for everything else).
 */

import { NextRequest } from 'next/server';

const mockGameProfile = { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() };
const mockCorpContract = { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
const mockCorpPact = { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() };
const mockCorpReputationEvent = { create: jest.fn(), findMany: jest.fn() };
const mockPlayerActivity = { create: jest.fn(), findMany: jest.fn() };
const mockGameLedgerEntry = { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() };
const mockMarketAuditLog = { create: jest.fn() };
const mockMarketResource = { findUnique: jest.fn(), findMany: jest.fn() };
const mockAllianceDiplomacy = { findMany: jest.fn() };

jest.mock('@/lib/db', () => {
  const reject = () => Promise.reject(new Error('no database in test'));
  const rejectingModel: unknown = new Proxy({}, { get: () => reject });
  const explicit = (): Record<string, unknown> => ({
    gameProfile: mockGameProfile,
    corpContract: mockCorpContract,
    corpPact: mockCorpPact,
    corpReputationEvent: mockCorpReputationEvent,
    playerActivity: mockPlayerActivity,
    gameLedgerEntry: mockGameLedgerEntry,
    marketAuditLog: mockMarketAuditLog,
    marketResource: mockMarketResource,
    allianceDiplomacy: mockAllianceDiplomacy,
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
jest.mock('@/lib/game/server-ledger', () => ({
  isLedgerAvailable: jest.fn().mockResolvedValue(true),
  recordLedger: (...args: unknown[]) => mockRecordLedger(...args),
  recordSyncAuthoredLedger: jest.fn().mockResolvedValue(null),
  recordLedgerStandalone: jest.fn(),
}));
jest.mock('@/lib/game/market-share', () => ({
  getResourceShare: jest.fn().mockResolvedValue({ entries: [] }),
}));

import { getServerSession } from 'next-auth';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import {
  applyDelivery,
  arbitrationBureauFor,
  buildMilestoneSchedule,
  computeArbitrationRuling,
  computeCollateral,
  computeDefaultSettlement,
  computeDisputeFee,
  expectedDeliveredByNow,
  isFrontierCollateralWaived,
  sanitizePublicNote,
  validateContractPrice,
  type ContractLedgerView,
} from '@/lib/game/corp-contracts';
import { resolveOverdueCorpContracts, disputeCorpContract } from '@/lib/game/corp-contracts-server';
import { applyDiplomacyRepToState, DIPLOMACY_REP } from '@/lib/game/corp-diplomacy';
import { getNewGameState } from '@/lib/game/save-load';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const ORIGINAL_ENV = process.env;
const DAY = 86_400_000;
const OLD = new Date(Date.now() - 90 * DAY);

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'issuer-1', userId: 'user-1', companyName: 'Issuer Corp', money: 1_000_000_000, netWorth: 5_000_000_000,
    createdAt: OLD, resources: { iron: 10_000 }, serverResources: null as unknown, workforceData: null as unknown, ...overrides,
  };
}

function ledgerCalls(reason: string) {
  return mockRecordLedger.mock.calls.map(c => c[1] as { profileId: string; moneyDelta?: number; resourceDelta?: number; resourceSlug?: string; reason: string }).filter(e => e.reason === reason);
}

function twoMilestones(quantity: number, totalValue: number, overrides: Partial<ContractLedgerView> = {}): ContractLedgerView {
  const now = Date.now();
  return {
    quantity, deliveredQty: 0, totalValue, escrowMoney: totalValue, escrowReleased: 0, escrowRefunded: 0,
    collateralMoney: Math.round(totalValue * 0.1), collateralForfeited: 0, collateralRefunded: 0, penaltyPct: 10,
    milestones: buildMilestoneSchedule(2, now - 2 * DAY, now + 2 * DAY),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetRouteThrottle();
  process.env = { ...ORIGINAL_ENV, RESOURCE_CLAMP_MODE: 'enforce' };
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
  mockPlayerActivity.create.mockResolvedValue({});
  mockCorpReputationEvent.create.mockResolvedValue({});
  mockGameProfile.update.mockResolvedValue({});
  mockGameLedgerEntry.findMany.mockResolvedValue([]);
  mockMarketAuditLog.create.mockResolvedValue({});
  mockCorpPact.updateMany.mockResolvedValue({ count: 0 });
  mockCorpPact.findFirst.mockResolvedValue(null);
});
afterAll(() => { process.env = ORIGINAL_ENV; });

// ═════════════════════════════════════════════════════════════════════════════
// Pure rules
// ═════════════════════════════════════════════════════════════════════════════

describe('corp-contracts — pure rules', () => {
  it('price band is 0.3×–3× spot', () => {
    expect(validateContractPrice(100, 100)).toMatchObject({ valid: true, min: 30, max: 300 });
    expect(validateContractPrice(29, 100).valid).toBe(false);
    expect(validateContractPrice(301, 100).valid).toBe(false);
    expect(validateContractPrice(30, 100).valid).toBe(true);
    expect(validateContractPrice(300, 100).valid).toBe(true);
  });

  it('milestones are evenly spaced cumulative shares and the last one is the deadline at 100%', () => {
    const now = Date.now();
    const ms = buildMilestoneSchedule(4, now, now + 4 * DAY);
    expect(ms.map(m => m.pct)).toEqual([25, 50, 75, 100]);
    expect(new Date(ms[3].dueAt).getTime()).toBe(now + 4 * DAY);
    expect(new Date(ms[1].dueAt).getTime()).toBe(now + 2 * DAY);
    expect(buildMilestoneSchedule(9, now, now + DAY)).toHaveLength(4); // clamped
    expect(buildMilestoneSchedule(0, now, now + DAY)).toHaveLength(1);
  });

  it('delivery releases escrow per milestone, pro-rata, and sweeps the remainder on fulfilment', () => {
    const c = twoMilestones(1_000, 1_000_000);
    const first = applyDelivery(c, 400);
    expect(first.newDeliveredQty).toBe(400);
    expect(first.release).toBe(0); // 50% milestone not yet reached
    expect(first.satisfied).toEqual([]);

    const half = applyDelivery({ ...c, deliveredQty: 400 }, 100);
    expect(half.newDeliveredQty).toBe(500);
    expect(half.release).toBe(500_000);
    expect(half.satisfied).toEqual([0]);
    expect(half.milestones[0].releasedMoney).toBe(500_000);

    const rest = applyDelivery({ ...c, deliveredQty: 500, escrowReleased: 500_000, milestones: half.milestones }, 5_000);
    expect(rest.newDeliveredQty).toBe(1_000); // clamped to remaining
    expect(rest.release).toBe(500_000);
    expect(rest.fulfilled).toBe(true);
  });

  it('default settlement: delivered units paid, collateral forfeited on the undelivered share, the rest refunded', () => {
    const c = twoMilestones(1_000, 1_000_000, { deliveredQty: 250 });
    const s = computeDefaultSettlement(c);
    expect(s.shortfallUnits).toBe(750);
    expect(s.paymentForDelivered).toBe(250_000);
    expect(s.penalty).toBe(75_000); // 100k collateral × 75%
    expect(s.escrowRefund).toBe(750_000);
    expect(s.collateralRefund).toBe(25_000);
    // Money conserved: escrow + collateral all accounted for.
    expect(s.paymentForDelivered + s.escrowRefund).toBe(1_000_000);
    expect(s.penalty + s.collateralRefund).toBe(100_000);
  });

  it('arbitration: the issuer measures the shortfall against the schedule; a withdrawing counterparty owes the whole balance', () => {
    const now = Date.now();
    const c = { ...twoMilestones(1_000, 1_000_000, { deliveredQty: 300 }), resourceSlug: 'iron', issuerName: 'Issuer', counterpartyName: 'Supplier' };
    // First milestone (50% = 500 units) fell due yesterday; second is tomorrow.
    c.milestones = buildMilestoneSchedule(2, now - 3 * DAY, now + DAY);
    expect(expectedDeliveredByNow(1_000, c.milestones, now)).toBe(500);

    const byIssuer = computeArbitrationRuling(c, 'issuer', now);
    expect(byIssuer.settlement.shortfallUnits).toBe(200);
    expect(byIssuer.settlement.penalty).toBe(20_000);
    expect(byIssuer.settlement.paymentForDelivered).toBe(300_000);
    expect(byIssuer.counterpartyRep).toBe(DIPLOMACY_REP.CONTRACT_DEFAULTED);
    expect(byIssuer.fee).toBe(computeDisputeFee(1_000_000));
    expect(byIssuer.fee).toBe(20_000);
    expect(byIssuer.ruling).toContain(byIssuer.bureau.name);
    expect(byIssuer.ruling).toContain('$20,000 arbitration fee');

    const byCounterparty = computeArbitrationRuling(c, 'counterparty', now);
    expect(byCounterparty.settlement.shortfallUnits).toBe(700);
    expect(byCounterparty.settlement.penalty).toBe(70_000);

    // Ahead of schedule + issuer disputes → no shortfall, no penalty, no rep hit.
    const ahead = computeArbitrationRuling({ ...c, deliveredQty: 600 }, 'issuer', now);
    expect(ahead.settlement.penalty).toBe(0);
    expect(ahead.counterpartyRep).toBe(0);
  });

  it('the bureau is the home-region faction of the resource (LORE.md)', () => {
    expect(arbitrationBureauFor('iron').faction).toBe('dominion');
    expect(arbitrationBureauFor('platinum_group').faction).toBe('syndicate');
    expect(arbitrationBureauFor('methane').faction).toBe('void_corsairs');
    expect(arbitrationBureauFor('xenogenic_biomatter').faction).toBe('hive_collective');
    expect(arbitrationBureauFor('exotic_fuel').faction).toBe('nebula_reavers');
    expect(arbitrationBureauFor('fusion_core').faction).toBe('echo_remnants');
    expect(arbitrationBureauFor('not_a_resource').faction).toBe('dominion');
  });

  it('[FRONTIER] a shielded counterparty posts no collateral (mirrors talent-poaching)', () => {
    const fresh = Date.now() - 2 * DAY;
    expect(isFrontierCollateralWaived(fresh, 50_000_000)).toBe(true);
    expect(isFrontierCollateralWaived(OLD.getTime(), 50_000_000)).toBe(false);
    expect(isFrontierCollateralWaived(fresh, 1_000_000_000)).toBe(false); // over the hard cap
    expect(computeCollateral(1_000_000, 10, true)).toBe(0);
    expect(computeCollateral(1_000_000, 10, false)).toBe(100_000);
    expect(computeCollateral(1_000_000, 99, false)).toBe(250_000); // clamped to 25%
  });

  it('public notes are sanitised and capped at 200 chars', () => {
    expect(sanitizePublicNote('<script>alert(1)</script> Deliver   to <b>LEO</b>\u0007')).toBe('alert(1) Deliver to LEO');
    expect(sanitizePublicNote('a'.repeat(300))).toHaveLength(200);
    expect(sanitizePublicNote('   ')).toBeNull();
    expect(sanitizePublicNote(42)).toBeNull();
  });

  it('reputation events apply once per id, clamp, and floor at zero', () => {
    const state = { ...getNewGameState(), reputation: 1 };
    const once = applyDiplomacyRepToState(state, [
      { id: 'e1', delta: -2, reason: 'contract_defaulted', atMs: Date.now() },
      { id: 'e2', delta: 1, reason: 'contract_fulfilled', atMs: Date.now() },
      { id: 'e3', delta: 99, reason: 'bogus', atMs: Date.now() },
    ]);
    expect(once.reputation).toBe(0 + 1 + 3); // 1-2 → 0, +1 → 1, +99 clamped to +3 → 4
    expect(once.diplomacyRepApplied).toEqual(['e1', 'e2', 'e3']);
    const twice = applyDiplomacyRepToState(once, [{ id: 'e1', delta: -2, reason: 'contract_defaulted', atMs: Date.now() }]);
    expect(twice).toBe(once);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Routes
// ═════════════════════════════════════════════════════════════════════════════

describe('corp-contracts — create', () => {
  const body = { resourceSlug: 'iron', quantity: 1_000, pricePerUnit: 100, deadlineDays: 7, milestoneCount: 2, penaltyPct: 10 };

  beforeEach(() => {
    mockGameProfile.findUnique.mockResolvedValue(profileRow());
    mockMarketResource.findUnique.mockResolvedValue({ currentPrice: 100 });
    mockCorpContract.count.mockResolvedValue(0);
    mockCorpContract.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'c-1', ...data }));
  });

  it('escrows the full value from the issuer via the ledger', async () => {
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/route');
    const res = await POST(post('/api/space-tycoon/corp-contracts', body));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.escrowed).toBe(100_000);
    expect(mockGameProfile.update).toHaveBeenCalledWith(expect.objectContaining({ data: { money: { decrement: 100_000 } } }));
    expect(ledgerCalls('contract_escrow')).toEqual([expect.objectContaining({ profileId: 'issuer-1', moneyDelta: -100_000, refId: 'c-1' })]);
    const created = (mockCorpContract.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(created.status).toBe('open');
    expect(created.escrowMoney).toBe(100_000);
    expect(created.collateralMoney).toBe(0);
    expect((created.milestones as unknown[]).length).toBe(2);
  });

  it('refuses a price outside 0.3×–3× spot and never touches money', async () => {
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/route');
    const res = await POST(post('/api/space-tycoon/corp-contracts', { ...body, pricePerUnit: 5 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/between 30 and 300/);
    expect(mockCorpContract.create).not.toHaveBeenCalled();
    expect(mockRecordLedger).not.toHaveBeenCalled();
  });

  it('refuses an issuer who cannot fund the escrow', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profileRow({ money: 50_000 }));
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/route');
    const res = await POST(post('/api/space-tycoon/corp-contracts', body));
    expect(res.status).toBe(400);
    expect(mockCorpContract.create).not.toHaveBeenCalled();
  });

  it('the 11th mutation inside a minute is a 429 (per-profile throttle)', async () => {
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/route');
    for (let i = 0; i < 10; i++) {
      const res = await POST(post('/api/space-tycoon/corp-contracts', body));
      expect(res.status).toBe(200);
    }
    const res = await POST(post('/api/space-tycoon/corp-contracts', body));
    expect(res.status).toBe(429);
    expect((await res.json()).routeKey).toBe('corp-contracts');
  });

  it('is 401 without a session', async () => {
    mockGetServerSession.mockResolvedValue(null as never);
    const { POST, GET } = await import('@/app/api/space-tycoon/corp-contracts/route');
    expect((await POST(post('/api/space-tycoon/corp-contracts', body))).status).toBe(401);
    expect((await GET()).status).toBe(401);
  });
});

describe('corp-contracts — accept', () => {
  const openContract = () => ({
    id: 'c-1', issuerProfileId: 'issuer-1', counterpartyProfileId: null, directed: false, status: 'open',
    resourceSlug: 'iron', quantity: 1_000, deliveredQty: 0, pricePerUnit: 100, totalValue: 100_000,
    escrowMoney: 100_000, escrowReleased: 0, escrowRefunded: 0, penaltyPct: 10, collateralMoney: 0,
    collateralForfeited: 0, collateralRefunded: 0, milestones: [], deadlineAt: new Date(Date.now() + 7 * DAY),
    createdAt: new Date(), acceptedAt: null, resolvedAt: null, publicNote: null, cancelRequestedBy: null,
    disputedByProfileId: null, arbitratedBy: null, ruling: null,
    issuer: { id: 'issuer-1', companyName: 'Issuer Corp' },
  });

  beforeEach(() => {
    mockCorpContract.findUnique.mockResolvedValue(openContract());
    mockCorpContract.count.mockResolvedValue(0);
    mockCorpContract.updateMany.mockResolvedValue({ count: 1 });
  });

  it('the counterparty posts penaltyPct × value as collateral and a public contract_signed row is written', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profileRow({ id: 'supplier-1', companyName: 'Supplier Corp' }));
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/accept/route');
    const res = await POST(post('/api/space-tycoon/corp-contracts/accept', { contractId: 'c-1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.collateralPosted).toBe(10_000);
    expect(json.frontierWaived).toBe(false);
    expect(ledgerCalls('contract_collateral')).toEqual([expect.objectContaining({ profileId: 'supplier-1', moneyDelta: -10_000 })]);
    expect(mockCorpContract.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'c-1', status: 'open' },
      data: expect.objectContaining({ status: 'accepted', counterpartyProfileId: 'supplier-1', collateralMoney: 10_000 }),
    }));
    expect(mockPlayerActivity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'contract_signed' }) }));
  });

  it('[FRONTIER] a shielded corporation may accept but posts no bond', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profileRow({ id: 'newbie-1', companyName: 'Newbie Corp', createdAt: new Date(Date.now() - DAY), netWorth: 20_000_000, money: 5_000 }));
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/accept/route');
    const res = await POST(post('/api/space-tycoon/corp-contracts/accept', { contractId: 'c-1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.collateralPosted).toBe(0);
    expect(json.frontierWaived).toBe(true);
    expect(ledgerCalls('contract_collateral')).toEqual([]);
  });

  it('the issuer cannot accept their own contract; a directed offer only its named corp can', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profileRow());
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/accept/route');
    expect((await POST(post('/api/space-tycoon/corp-contracts/accept', { contractId: 'c-1' }))).status).toBe(400);

    mockCorpContract.findUnique.mockResolvedValue({ ...openContract(), directed: true, counterpartyProfileId: 'someone-else' });
    mockGameProfile.findUnique.mockResolvedValue(profileRow({ id: 'supplier-1' }));
    const res = await POST(post('/api/space-tycoon/corp-contracts/accept', { contractId: 'c-1' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/another corporation/);
  });

  it('is 401 without a session', async () => {
    mockGetServerSession.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/accept/route');
    expect((await POST(post('/api/space-tycoon/corp-contracts/accept', { contractId: 'c-1' }))).status).toBe(401);
  });
});

describe('corp-contracts — deliver', () => {
  const accepted = () => {
    const now = Date.now();
    return {
      id: 'c-1', issuerProfileId: 'issuer-1', counterpartyProfileId: 'supplier-1', directed: false, status: 'accepted',
      resourceSlug: 'iron', quantity: 1_000, deliveredQty: 0, pricePerUnit: 100, totalValue: 100_000,
      escrowMoney: 100_000, escrowReleased: 0, escrowRefunded: 0, penaltyPct: 10, collateralMoney: 10_000,
      collateralForfeited: 0, collateralRefunded: 0, milestones: buildMilestoneSchedule(2, now, now + 7 * DAY),
      deadlineAt: new Date(now + 7 * DAY), createdAt: new Date(now), acceptedAt: new Date(now), resolvedAt: null,
      publicNote: null, cancelRequestedBy: null, disputedByProfileId: null, arbitratedBy: null, ruling: null,
      issuer: { id: 'issuer-1', companyName: 'Issuer Corp', resources: { iron: 5 } },
    };
  };

  beforeEach(() => {
    mockCorpContract.findUnique.mockResolvedValue(accepted());
    mockCorpContract.updateMany.mockResolvedValue({ count: 1 });
    mockCorpContract.update.mockResolvedValue({});
  });

  it('debits the AUTHORITATIVE inventory (server map, not the client figure) and pays pro-rata at the milestone', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profileRow({
      id: 'supplier-1', companyName: 'Supplier Corp', resources: { iron: 10_000 }, serverResources: { iron: 600 },
    }));
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/deliver/route');
    const res = await POST(post('/api/space-tycoon/corp-contracts/deliver', { contractId: 'c-1', quantity: 500 }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.delivered).toBe(500);
    expect(json.released).toBe(50_000);
    expect(json.milestonesSatisfied).toEqual([0]);
    expect(json.fulfilled).toBe(false);
    expect(ledgerCalls('contract_resources_delivered')).toEqual([expect.objectContaining({ profileId: 'supplier-1', resourceSlug: 'iron', resourceDelta: -500 })]);
    expect(ledgerCalls('contract_resources_received')).toEqual([expect.objectContaining({ profileId: 'issuer-1', resourceSlug: 'iron', resourceDelta: 500 })]);
    expect(ledgerCalls('contract_payment')).toEqual([expect.objectContaining({ profileId: 'supplier-1', moneyDelta: 50_000 })]);
    // Issuer's client view credited with the goods.
    expect(mockGameProfile.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'issuer-1' }, data: { resources: { iron: 505 } } }));
  });

  it('EXPLOIT: a client map claiming 10,000 iron cannot deliver more than the server holds', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profileRow({
      id: 'supplier-1', companyName: 'Supplier Corp', resources: { iron: 10_000 }, serverResources: { iron: 100 },
    }));
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/deliver/route');
    const res = await POST(post('/api/space-tycoon/corp-contracts/deliver', { contractId: 'c-1', quantity: 500 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/you hold 100/);
    expect(mockRecordLedger).not.toHaveBeenCalled();
    expect(mockMarketAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'sell_gated_by_server_inventory' }) }));
  });

  it('fulfilment returns the bond and hands both sides +1 reputation', async () => {
    mockCorpContract.findUnique.mockResolvedValue({ ...accepted(), deliveredQty: 500, escrowReleased: 50_000, status: 'delivering' });
    mockGameProfile.findUnique.mockResolvedValue(profileRow({
      id: 'supplier-1', companyName: 'Supplier Corp', resources: { iron: 10_000 }, serverResources: { iron: 600 },
    }));
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/deliver/route');
    const res = await POST(post('/api/space-tycoon/corp-contracts/deliver', { contractId: 'c-1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.fulfilled).toBe(true);
    expect(json.released).toBe(50_000);
    expect(ledgerCalls('contract_collateral_refund')).toEqual([expect.objectContaining({ profileId: 'supplier-1', moneyDelta: 10_000 })]);
    const reps = mockCorpReputationEvent.create.mock.calls.map(c => (c[0] as { data: Record<string, unknown> }).data);
    expect(reps).toEqual(expect.arrayContaining([
      expect.objectContaining({ profileId: 'supplier-1', delta: 1, reason: 'contract_fulfilled' }),
      expect.objectContaining({ profileId: 'issuer-1', delta: 1, reason: 'contract_fulfilled' }),
    ]));
    expect(mockPlayerActivity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'contract_fulfilled' }) }));
  });

  it('only the counterparty may deliver; 401 without a session', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profileRow());
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/deliver/route');
    expect((await POST(post('/api/space-tycoon/corp-contracts/deliver', { contractId: 'c-1' }))).status).toBe(400);
    mockGetServerSession.mockResolvedValue(null as never);
    expect((await POST(post('/api/space-tycoon/corp-contracts/deliver', { contractId: 'c-1' }))).status).toBe(401);
  });
});

describe('corp-contracts — default resolution (cron)', () => {
  it('past the deadline: collateral pays the issuer on the undelivered share, delivered units are paid, the rest refunded, −2 rep', async () => {
    const now = Date.now();
    mockCorpContract.findMany
      .mockResolvedValueOnce([{
        id: 'c-1', issuerProfileId: 'issuer-1', counterpartyProfileId: 'supplier-1', status: 'delivering',
        resourceSlug: 'iron', quantity: 1_000, deliveredQty: 250, totalValue: 1_000_000,
        escrowMoney: 1_000_000, escrowReleased: 0, escrowRefunded: 0, penaltyPct: 10, collateralMoney: 100_000,
        collateralForfeited: 0, collateralRefunded: 0, milestones: buildMilestoneSchedule(2, now - 8 * DAY, now - DAY),
        deadlineAt: new Date(now - DAY),
        issuer: { companyName: 'Issuer Corp' }, counterparty: { companyName: 'Supplier Corp' },
      }])
      .mockResolvedValueOnce([]); // no expired open contracts
    mockCorpContract.updateMany.mockResolvedValue({ count: 1 });
    mockCorpPact.updateMany.mockResolvedValue({ count: 0 });

    const result = await resolveOverdueCorpContracts(now);
    expect(result.defaulted).toBe(1);
    expect(mockCorpContract.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'defaulted', escrowReleased: { increment: 250_000 }, escrowRefunded: { increment: 750_000 },
        collateralForfeited: { increment: 75_000 }, collateralRefunded: { increment: 25_000 },
      }),
    }));
    expect(ledgerCalls('contract_payment')).toEqual([expect.objectContaining({ profileId: 'supplier-1', moneyDelta: 250_000 })]);
    expect(ledgerCalls('contract_collateral_refund')).toEqual([expect.objectContaining({ profileId: 'supplier-1', moneyDelta: 25_000 })]);
    expect(ledgerCalls('contract_escrow_refund')).toEqual([expect.objectContaining({ profileId: 'issuer-1', moneyDelta: 750_000 })]);
    expect(ledgerCalls('contract_penalty_received')).toEqual([expect.objectContaining({ profileId: 'issuer-1', moneyDelta: 75_000 })]);
    // Wallet increments: counterparty 275k, issuer 825k.
    expect(mockGameProfile.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'supplier-1' }, data: { money: { increment: 275_000 } } }));
    expect(mockGameProfile.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'issuer-1' }, data: { money: { increment: 825_000 } } }));
    expect(mockCorpReputationEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ profileId: 'supplier-1', delta: -2, reason: 'contract_defaulted' }) }));
    expect(mockPlayerActivity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'contract_defaulted' }) }));
  });

  it('a never-accepted contract past its deadline is withdrawn and its escrow refunded', async () => {
    mockCorpContract.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c-9', issuerProfileId: 'issuer-1', status: 'open', escrowMoney: 40_000, escrowReleased: 0, escrowRefunded: 0 }]);
    mockCorpContract.updateMany.mockResolvedValue({ count: 1 });
    const result = await resolveOverdueCorpContracts();
    expect(result.expiredOpen).toBe(1);
    expect(ledgerCalls('contract_escrow_refund')).toEqual([expect.objectContaining({ profileId: 'issuer-1', moneyDelta: 40_000 })]);
  });

  it('the cron route requires CRON_SECRET', async () => {
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'correct-horse-battery-staple', NODE_ENV: 'test' };
    const { POST } = await import('@/app/api/cron/corp-contracts-resolve/route');
    const anon = await POST(new NextRequest('http://localhost:3000/api/cron/corp-contracts-resolve', { method: 'POST' }));
    expect(anon.status).toBe(401);
    mockCorpContract.findMany.mockResolvedValue([]);
    const ok = await POST(new NextRequest('http://localhost:3000/api/cron/corp-contracts-resolve', { method: 'POST', headers: { authorization: 'Bearer correct-horse-battery-staple' } }));
    expect(ok.status).toBe(200);
  });
});

describe('corp-contracts — dispute → arbitration', () => {
  it('burns the 2% fee, rules pro-rata against the schedule, and records the bureau', async () => {
    const now = Date.now();
    mockCorpContract.findUnique.mockResolvedValue({
      id: 'c-1', issuerProfileId: 'issuer-1', counterpartyProfileId: 'supplier-1', status: 'accepted',
      resourceSlug: 'platinum_group', quantity: 1_000, deliveredQty: 0, totalValue: 1_000_000,
      escrowMoney: 1_000_000, escrowReleased: 0, escrowRefunded: 0, penaltyPct: 10, collateralMoney: 100_000,
      collateralForfeited: 0, collateralRefunded: 0, milestones: buildMilestoneSchedule(2, now - 3 * DAY, now + DAY),
      disputedByProfileId: null,
      issuer: { companyName: 'Issuer Corp' }, counterparty: { companyName: 'Supplier Corp' },
    });
    mockCorpContract.updateMany.mockResolvedValue({ count: 1 });

    const result = await disputeCorpContract(profileRow() as never, 'c-1', now);
    expect(result.status).toBe(200);
    expect(result.body.feeBurned).toBe(20_000);
    expect(result.body.arbitratedBy).toBe('Pallas-4 Mercantile Board');
    expect(result.body.expectedByNow).toBe(500);
    expect((result.body.settlement as { penalty: number }).penalty).toBe(50_000);
    expect(ledgerCalls('arbitration_fee')).toEqual([expect.objectContaining({ profileId: 'issuer-1', moneyDelta: -20_000 })]);
    // Burned: the fee debit has no matching credit anywhere.
    expect(mockRecordLedger.mock.calls.some(c => (c[1] as { moneyDelta?: number }).moneyDelta === 20_000)).toBe(false);
    expect(ledgerCalls('contract_penalty_received')).toEqual([expect.objectContaining({ profileId: 'issuer-1', moneyDelta: 50_000 })]);
    expect(mockCorpContract.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ disputedByProfileId: null }),
      data: expect.objectContaining({ status: 'arbitrated', arbitratedBy: 'Pallas-4 Mercantile Board', disputeFeeBurned: 20_000 }),
    }));
    expect(mockCorpReputationEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ profileId: 'supplier-1', delta: -2, reason: 'contract_arbitrated' }) }));
    expect(mockPlayerActivity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'contract_arbitrated' }) }));
  });

  it('a contract can be disputed only once; the route is 401 without a session', async () => {
    mockCorpContract.findUnique.mockResolvedValue({
      id: 'c-1', issuerProfileId: 'issuer-1', counterpartyProfileId: 'supplier-1', status: 'accepted', disputedByProfileId: 'supplier-1',
      resourceSlug: 'iron', quantity: 1, deliveredQty: 0, totalValue: 1, escrowMoney: 1, escrowReleased: 0, escrowRefunded: 0,
      penaltyPct: 10, collateralMoney: 0, collateralForfeited: 0, collateralRefunded: 0, milestones: [],
      issuer: { companyName: 'I' }, counterparty: { companyName: 'S' },
    });
    const twice = await disputeCorpContract(profileRow() as never, 'c-1');
    expect(twice.status).toBe(400);
    mockGetServerSession.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/space-tycoon/corp-contracts/dispute/route');
    expect((await POST(post('/api/space-tycoon/corp-contracts/dispute', { contractId: 'c-1' }))).status).toBe(401);
    const cancel = await import('@/app/api/space-tycoon/corp-contracts/cancel/route');
    expect((await cancel.POST(post('/api/space-tycoon/corp-contracts/cancel', { contractId: 'c-1' }))).status).toBe(401);
  });
});
