/**
 * @jest-environment node
 *
 * Diplomacy (2026-09-02) — corp-to-corp pacts (docs/ECONOMY_PVP_2026-08.md
 * "Diplomacy"): pure rules, the propose/accept/break lifecycle, expiry, and
 * the enforcement points (no_poach refuses a poach offer; the campaign and
 * espionage guards refuse the same way). Prisma mocked as in
 * game-exploit-regressions.test.ts.
 */

import { NextRequest } from 'next/server';

const mockGameProfile = { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() };
const mockCorpPact = { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() };
const mockCorpReputationEvent = { create: jest.fn(), findMany: jest.fn() };
const mockPlayerActivity = { create: jest.fn(), findMany: jest.fn() };
const mockAllianceMember = { findUnique: jest.fn() };
const mockPoachOffer = { findFirst: jest.fn(), create: jest.fn() };
const mockLaborIndex = { findUnique: jest.fn() };
const mockEspionageProfile = { findUnique: jest.fn() };

jest.mock('@/lib/db', () => {
  const reject = () => Promise.reject(new Error('no database in test'));
  const rejectingModel: unknown = new Proxy({}, { get: () => reject });
  const explicit = (): Record<string, unknown> => ({
    gameProfile: mockGameProfile,
    corpPact: mockCorpPact,
    corpReputationEvent: mockCorpReputationEvent,
    playerActivity: mockPlayerActivity,
    allianceMember: mockAllianceMember,
    poachOffer: mockPoachOffer,
    laborIndex: mockLaborIndex,
    espionageProfile: mockEspionageProfile,
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
jest.mock('@/lib/game/server-ledger', () => ({
  isLedgerAvailable: jest.fn().mockResolvedValue(true),
  recordLedger: jest.fn(),
  recordSyncAuthoredLedger: jest.fn().mockResolvedValue(null),
  recordLedgerStandalone: jest.fn(),
}));
jest.mock('@/lib/game/offense-server', () => ({
  resolveExpiredPoachOffers: jest.fn().mockResolvedValue(0),
  freeRetentionUsed: jest.fn().mockResolvedValue(false),
  getCampaignMarketTelemetry: jest.fn().mockResolvedValue({ windowTurnover: 0, windowProductionUnits: 0 }),
}));
jest.mock('@/lib/game/fee-index-server', () => ({ getServerFeeIndexFactor: jest.fn().mockResolvedValue(1) }));
const mockGetResourceShare = jest.fn();
jest.mock('@/lib/game/market-share', () => ({
  getResourceShare: (...args: unknown[]) => mockGetResourceShare(...args),
}));

import { getServerSession } from 'next-auth';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import {
  CORP_PACT_BREAK_REP, CORP_PACT_DEFS, CORP_PACT_KINDS, clampPactDurationDays, isPactActive, pactBlocksAction, pactKindsBlocking, pactRefusal,
} from '@/lib/game/corp-pacts';
import { expireCorpPacts, findBlockingPact, findNonAggressionCampaignBlock, proposeCorpPact, respondCorpPact, breakCorpPact } from '@/lib/game/corp-pacts-server';
import { deriveSituationLog } from '@/lib/game/situation-log';
import { getNewGameState } from '@/lib/game/save-load';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const DAY = 86_400_000;
const OLD = new Date(Date.now() - 90 * DAY);

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const me = { id: 'me-1', companyName: 'Me Corp' };
const them = { id: 'them-1', companyName: 'Them Corp' };

function activePact(kind = 'no_poach', overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-1', kind, status: 'active', proposerProfileId: me.id, counterpartyProfileId: them.id,
    durationDays: 30, startsAt: new Date(), endsAt: new Date(Date.now() + 10 * DAY), brokenByProfileId: null, brokenAt: null,
    createdAt: new Date(), resolvedAt: null,
    proposer: { id: me.id, companyName: me.companyName }, counterparty: { id: them.id, companyName: them.companyName },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetRouteThrottle();
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
  mockPlayerActivity.create.mockResolvedValue({});
  mockCorpReputationEvent.create.mockResolvedValue({});
  mockCorpPact.updateMany.mockResolvedValue({ count: 0 });
  mockCorpPact.findFirst.mockResolvedValue(null);
  mockCorpPact.findMany.mockResolvedValue([]);
  mockCorpPact.count.mockResolvedValue(0);
});

describe('corp-pacts — pure rules', () => {
  it('four kinds; three enforced; trade_preference is registered only', () => {
    expect(CORP_PACT_KINDS).toEqual(['non_aggression', 'no_poach', 'territory_share', 'trade_preference']);
    expect(CORP_PACT_DEFS.trade_preference.enforced).toBe(false);
    expect(CORP_PACT_DEFS.trade_preference.blocks).toEqual([]);
    expect(pactKindsBlocking('poach')).toEqual(['no_poach']);
    expect(pactKindsBlocking('espionage')).toEqual(['non_aggression']);
    expect(pactKindsBlocking('price_campaign')).toEqual(['non_aggression']);
    expect(pactKindsBlocking('zone_challenge')).toEqual(['territory_share']);
    expect(pactBlocksAction('no_poach', 'espionage')).toBe(false);
  });

  it('durations clamp to 7–90 days and active pacts expire on endsAt', () => {
    expect(clampPactDurationDays(1)).toBe(7);
    expect(clampPactDurationDays(400)).toBe(90);
    expect(clampPactDurationDays(undefined)).toBe(30);
    const now = Date.now();
    expect(isPactActive({ id: 'x', kind: 'no_poach', status: 'active', endsAt: new Date(now + 1000) }, now)).toBe(true);
    expect(isPactActive({ id: 'x', kind: 'no_poach', status: 'active', endsAt: new Date(now - 1000) }, now)).toBe(false);
    expect(isPactActive({ id: 'x', kind: 'no_poach', status: 'broken', endsAt: new Date(now + 1000) }, now)).toBe(false);
  });

  it('the refusal body is machine-readable and names the cost of breaking the pact', () => {
    const body = pactRefusal({ id: 'p-1', kind: 'no_poach' }, 'Them Corp', 'poach');
    expect(body.error).toBe('pact');
    expect(body.pactId).toBe('p-1');
    expect(body.message).toContain('No-Poach Agreement');
    expect(body.message).toContain(`${CORP_PACT_BREAK_REP} reputation`);
  });
});

describe('corp-pacts — lifecycle', () => {
  it('propose → proposed; accept → active with a 7–90 day term and a public pact_signed row', async () => {
    mockGameProfile.findUnique.mockResolvedValue(them);
    mockCorpPact.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'p-1', ...data }));
    const proposed = await proposeCorpPact(me, { counterpartyProfileId: them.id, kind: 'no_poach', durationDays: 14 });
    expect(proposed.status).toBe(200);
    expect(proposed.body).toMatchObject({ pactId: 'p-1', status: 'proposed', durationDays: 14, counterparty: 'Them Corp' });

    mockCorpPact.findUnique.mockResolvedValue(activePact('no_poach', { status: 'proposed', durationDays: 14, startsAt: null, endsAt: null }));
    mockCorpPact.updateMany.mockResolvedValue({ count: 1 });
    const accepted = await respondCorpPact(them, 'p-1', true);
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe('active');
    const endsAt = new Date(String(accepted.body.endsAt)).getTime();
    expect(endsAt).toBeGreaterThan(Date.now() + 13 * DAY);
    expect(endsAt).toBeLessThan(Date.now() + 15 * DAY);
    expect(mockPlayerActivity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'pact_signed' }) }));
  });

  it('a second pact of the same kind between the same pair is refused; only the counterparty can answer', async () => {
    mockGameProfile.findUnique.mockResolvedValue(them);
    mockCorpPact.findFirst.mockResolvedValue({ id: 'p-0', status: 'active' });
    const dup = await proposeCorpPact(me, { counterpartyProfileId: them.id, kind: 'no_poach' });
    expect(dup.status).toBe(400);
    expect(dup.body.pactId).toBe('p-0');

    mockCorpPact.findUnique.mockResolvedValue(activePact('no_poach', { status: 'proposed' }));
    const wrongSide = await respondCorpPact(me, 'p-1', true); // I proposed it — I cannot accept it
    expect(wrongSide.status).toBe(404);
  });

  it('breaking an active pact costs −3 reputation and lands on the public feed as pact_broken', async () => {
    mockCorpPact.findUnique.mockResolvedValue(activePact('no_poach'));
    mockCorpPact.updateMany.mockResolvedValue({ count: 1 });
    const broken = await breakCorpPact(me, 'p-1');
    expect(broken.status).toBe(200);
    expect(broken.body.reputation).toBe(-3);
    expect(mockCorpPact.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p-1', status: 'active' },
      data: expect.objectContaining({ status: 'broken', brokenByProfileId: me.id }),
    }));
    expect(mockCorpReputationEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ profileId: me.id, delta: -3, reason: 'pact_broken', refId: 'p-1' }) }));
    expect(mockPlayerActivity.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'pact_broken', title: expect.stringContaining('broke a No-Poach Agreement with Them Corp') }),
    }));
  });

  it('expiry flips active pacts past endsAt to expired', async () => {
    mockCorpPact.updateMany.mockResolvedValue({ count: 2 });
    const now = Date.now();
    expect(await expireCorpPacts(now)).toBe(2);
    expect(mockCorpPact.updateMany).toHaveBeenCalledWith({
      where: { status: 'active', endsAt: { lt: new Date(now) } },
      data: { status: 'expired', resolvedAt: new Date(now) },
    });
  });

  it('the route is 401 without a session and validates the body', async () => {
    const { POST } = await import('@/app/api/space-tycoon/corp-pacts/route');
    mockGameProfile.findUnique.mockResolvedValue({ ...me, money: 0, netWorth: 0, createdAt: OLD, resources: {} });
    const bad = await POST(post('/api/space-tycoon/corp-pacts', { action: 'propose', kind: 'mutual_defence' }));
    expect(bad.status).toBe(400);
    mockGetServerSession.mockResolvedValue(null as never);
    expect((await POST(post('/api/space-tycoon/corp-pacts', { action: 'break', pactId: 'p-1' }))).status).toBe(401);
  });
});

describe('corp-pacts — enforcement', () => {
  it('findBlockingPact: an active no_poach pact between the pair (either direction) refuses a poach', async () => {
    mockCorpPact.findFirst.mockResolvedValue({ id: 'p-1', kind: 'no_poach', proposerProfileId: them.id, counterpartyProfileId: me.id, endsAt: new Date(Date.now() + DAY) });
    const block = await findBlockingPact(me.id, them.id, 'poach', 'Them Corp');
    expect(block).toMatchObject({ error: 'pact', pactId: 'p-1', kind: 'no_poach', partner: 'Them Corp' });
    expect(mockCorpPact.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'active', kind: { in: ['no_poach'] } }),
    }));
    // A no_poach pact does not block espionage.
    mockCorpPact.findFirst.mockResolvedValue(null);
    expect(await findBlockingPact(me.id, them.id, 'espionage')).toBeNull();
    expect(mockCorpPact.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ kind: { in: ['non_aggression'] } }),
    }));
  });

  it('ENFORCED: POST /api/space-tycoon/poach offer → 400 pact while a no_poach pact is active; the escrow is never taken', async () => {
    const profile = {
      id: me.id, userId: 'user-1', companyName: me.companyName, money: 10_000_000_000, netWorth: 5_000_000_000,
      createdAt: OLD, completedResearchList: [], workforceData: { securitys: 0 }, resources: {},
    };
    const target = {
      id: them.id, companyName: them.companyName, netWorth: 5_000_000_000, createdAt: OLD,
      workforceData: { engineers: 100 }, allianceMembership: null,
    };
    mockGameProfile.findUnique.mockResolvedValueOnce(profile).mockResolvedValueOnce(target);
    mockAllianceMember.findUnique.mockResolvedValue(null);
    mockCorpPact.findFirst.mockResolvedValue({ id: 'p-1', kind: 'no_poach', proposerProfileId: me.id, counterpartyProfileId: them.id, endsAt: new Date(Date.now() + DAY) });

    const { POST } = await import('@/app/api/space-tycoon/poach/route');
    const res = await POST(post('/api/space-tycoon/poach', { action: 'offer', targetProfileId: them.id, crewType: 'engineer', count: 5 }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe('pact');
    expect(json.pactId).toBe('p-1');
    expect(json.message).toContain('Break the pact first');
    expect(mockPoachOffer.create).not.toHaveBeenCalled();
    expect(mockGameProfile.update).not.toHaveBeenCalled();
  });

  it('after the pact is broken the same offer proceeds to the ordinary gates', async () => {
    const profile = {
      id: me.id, userId: 'user-1', companyName: me.companyName, money: 10_000_000_000, netWorth: 5_000_000_000,
      createdAt: OLD, completedResearchList: [], workforceData: { securitys: 0 }, resources: {},
    };
    const target = {
      id: them.id, companyName: them.companyName, netWorth: 5_000_000_000, createdAt: OLD,
      workforceData: { engineers: 100 }, allianceMembership: null,
    };
    mockGameProfile.findUnique.mockResolvedValueOnce(profile).mockResolvedValueOnce(target);
    mockAllianceMember.findUnique.mockResolvedValue(null);
    mockCorpPact.findFirst.mockResolvedValue(null); // broken → no active pact
    mockPoachOffer.findFirst.mockResolvedValue({ id: 'recent' }); // the 30-day cooldown gate, next in line

    const { POST } = await import('@/app/api/space-tycoon/poach/route');
    const res = await POST(post('/api/space-tycoon/poach', { action: 'offer', targetProfileId: them.id, crewType: 'engineer', count: 5 }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/Cooldown/);
  });

  it('non_aggression: a price campaign is refused only when the partner holds ≥ 40% of the market', async () => {
    mockCorpPact.findMany.mockResolvedValue([{ id: 'p-2', kind: 'non_aggression', proposerProfileId: me.id, counterpartyProfileId: them.id, endsAt: new Date(Date.now() + DAY) }]);
    // findNonAggressionCampaignBlock reads `sideValuePct` (share of traded
    // value), not the headline `sharePct` (share of trade-side credit,
    // fixed 2026-09-03 to sum to 100% across participants) — see the
    // function's doc comment in corp-pacts-server.ts.
    mockGetResourceShare.mockResolvedValue({ entries: [{ profileId: them.id, companyName: 'Them Corp', sharePct: 27, sideValuePct: 55 }] });
    const blocked = await findNonAggressionCampaignBlock(me.id, 'iron');
    expect(blocked).toMatchObject({ error: 'pact', pactId: 'p-2', kind: 'non_aggression', partner: 'Them Corp' });
    expect(mockGetResourceShare).toHaveBeenCalledWith('iron', { full: true });

    mockGetResourceShare.mockResolvedValue({ entries: [{ profileId: them.id, companyName: 'Them Corp', sharePct: 6, sideValuePct: 12 }] });
    expect(await findNonAggressionCampaignBlock(me.id, 'iron')).toBeNull();

    // No pact at all → the share read is skipped entirely.
    mockGetResourceShare.mockClear();
    mockCorpPact.findMany.mockResolvedValue([]);
    expect(await findNonAggressionCampaignBlock(me.id, 'iron')).toBeNull();
    expect(mockGetResourceShare).not.toHaveBeenCalled();
  });
});

describe('corp-pacts — situation log surfaces proposals, offers and milestones', () => {
  it('a proposed pact, a directed offer, and a milestone inside 24h become log items pointing at contracts:corp', () => {
    const now = Date.now();
    const state = {
      ...getNewGameState(),
      diplomacy: {
        asOf: now,
        incomingOffers: [{ id: 'c-7', issuerName: 'Them Corp', resourceSlug: 'iron', quantity: 500, totalValue: 50_000, deadlineAt: now + 3 * DAY }],
        milestonesDue: [
          { contractId: 'c-1', role: 'counterparty' as const, otherName: 'Buyer Corp', resourceSlug: 'iron', pct: 50, dueAt: now + 5 * 3_600_000, remainingQty: 120, isDeadline: false },
          { contractId: 'c-2', role: 'issuer' as const, otherName: 'Supplier Corp', resourceSlug: 'gold', pct: 100, dueAt: now + 5 * DAY, remainingQty: 10, isDeadline: true },
        ],
        pactProposals: [{ id: 'p-1', proposerName: 'Them Corp', kind: 'no_poach', durationDays: 30, createdAt: now }],
        activeContracts: 2,
        activePacts: 0,
      },
    };
    const items = deriveSituationLog(state, { nowMs: now });
    const byId = Object.fromEntries(items.map(i => [i.id, i]));
    expect(byId['sit-pact-proposal-p-1'].category).toBe('pact_proposal');
    expect(byId['sit-pact-proposal-p-1'].label).toContain('No-Poach Agreement');
    expect(byId['sit-contract-offer-c-7'].category).toBe('contract_offer');
    expect(byId['sit-contract-milestone-c-1-50'].severity).toBe('critical'); // 5h out, I must deliver
    expect(byId['sit-contract-milestone-c-1-50'].subView).toBe('contracts:corp');
    expect(byId['sit-contract-milestone-c-2-100']).toBeUndefined(); // 5 days out — outside the 24h window
  });
});
