/**
 * @jest-environment node
 */

/**
 * Space Tycoon authorization / client-trust regressions —
 * docs/SECURITY_AUDIT_2026-08.md items P4, P6, P10, M6 plus the free colony
 * claim behind cc_pluto_expedition (2026-09-01 hardening).
 *
 *  P4  seasons/progress no longer trusts body.progress; speed-runs/check no
 *      longer trusts body.gameState.
 *  P6  alliance-treasury activate_perk requires leader/officer.
 *  P10 chat / colonies / milestones write the session profile's companyName,
 *      never the body's; milestones derives `reward` from the definition.
 *  --  colonies POST charges a claim fee and requires presence.
 *  M6  market/orders clamps quantity and price to sane bands.
 *
 * All DB access is mocked; these fail the moment any fix is reverted.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGameProfile = { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
const mockSeasonalEvent = { findMany: jest.fn() };
const mockSeasonParticipation = { findUnique: jest.fn(), update: jest.fn() };
const mockSeasonChallenge = { findFirst: jest.fn() };
const mockMarketFill = { aggregate: jest.fn(), count: jest.fn() };
const mockAllianceMember = { findUnique: jest.fn() };
const mockGameChatMessage = { count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() };
const mockColonyClaim = { findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), findMany: jest.fn() };
const mockPlayerActivity = { create: jest.fn() };
const mockMarketResource = { findUnique: jest.fn() };
const mockSpeedRunAttempt = { findFirst: jest.fn(), update: jest.fn(), count: jest.fn() };
const mockGlobalMilestone = { findUnique: jest.fn(), create: jest.fn() };
const mockGameLedgerEntry = { create: jest.fn() };
const mockTransaction = jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
  fn({
    gameProfile: mockGameProfile,
    colonyClaim: mockColonyClaim,
    gameLedgerEntry: mockGameLedgerEntry,
    playerActivity: mockPlayerActivity,
  }),
);

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    gameProfile: mockGameProfile,
    seasonalEvent: mockSeasonalEvent,
    seasonParticipation: mockSeasonParticipation,
    seasonChallenge: mockSeasonChallenge,
    marketFill: mockMarketFill,
    allianceMember: mockAllianceMember,
    gameChatMessage: mockGameChatMessage,
    colonyClaim: mockColonyClaim,
    playerActivity: mockPlayerActivity,
    marketResource: mockMarketResource,
    speedRunAttempt: mockSpeedRunAttempt,
    globalMilestone: mockGlobalMilestone,
    gameLedgerEntry: mockGameLedgerEntry,
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/game/server-ledger', () => ({
  isLedgerAvailable: jest.fn().mockResolvedValue(false),
  recordLedger: jest.fn(),
}));

const mockActivatePerk = jest.fn();
const mockDepositToTreasury = jest.fn();
jest.mock('@/lib/game/alliance-treasury', () => ({
  ALLIANCE_PERK_DEFINITIONS: [],
  depositToTreasury: (...args: unknown[]) => mockDepositToTreasury(...args),
  activatePerk: (...args: unknown[]) => mockActivatePerk(...args),
  getActivePerks: jest.fn().mockResolvedValue([]),
  getPerkBonuses: jest.fn(() => ({})),
}));
jest.mock('@/lib/game/alliance-xp', () => ({ awardAllianceXP: jest.fn() }));

const mockPlaceLimitOrder = jest.fn();
jest.mock('@/lib/game/market-orderbook', () => ({
  placeLimitOrder: (...args: unknown[]) => mockPlaceLimitOrder(...args),
  cancelOrder: jest.fn(),
  getOrderBook: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    companyName: 'Honest Aerospace',
    money: 0,
    totalEarned: 0,
    totalSpent: 0,
    netWorth: 0,
    eventTokens: 0,
    totalBidsWon: 0,
    gameYear: 2026,
    resources: {},
    buildingsData: [],
    activeServicesData: [],
    unlockedLocationsList: [],
    completedResearchList: [],
    shipsData: [],
    workforceData: null,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // The per-profile route throttle is module-level in-memory state shared by
  // every suite that lands in the same jest worker. Without this reset, a
  // suite that exhausts a bucket for 'profile-1' makes these routes answer
  // 429 here — a real cross-suite flake seen 2026-09-03.
  __resetRouteThrottle();
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
});

// ═══════════════════════════════════════════════════════════════════════════
// P4 — seasons/progress derives progress server-side
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/seasons/progress (P4)', () => {
  const DAY = 24 * 60 * 60 * 1000;

  function seedEvent(eventState: Record<string, unknown>) {
    mockSeasonalEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        seasonType: 'asteroid_rush',
        status: 'active',
        startsAt: new Date(Date.now() - 10 * DAY),
        endsAt: new Date(Date.now() + 10 * DAY),
      },
    ]);
    mockSeasonParticipation.findUnique.mockResolvedValue({
      id: 'part-1',
      bracket: 1,
      seasonPoints: 0,
      currentTier: 0,
      totalScore: 0,
      eventState: { eventScore: 0, challengeProgress: {}, ...eventState },
    });
    mockSeasonParticipation.update.mockResolvedValue({});
    mockMarketFill.aggregate.mockResolvedValue({ _sum: { totalValue: 0, quantity: 0 } });
    mockMarketFill.count.mockResolvedValue(0);
  }

  it('SECURITY: ignores body.progress=999999999 — no SP, no tokens when the server metric is 0', async () => {
    const { POST } = await import('@/app/api/space-tycoon/seasons/progress/route');

    mockGameProfile.findUnique.mockResolvedValue(makeProfile());
    seedEvent({});
    // A stored (DB) challenge with a server-derivable metric. The profile has
    // zero completed buildings, so the honest answer is 0.
    mockSeasonChallenge.findFirst.mockResolvedValue({
      id: 'db-challenge-1',
      metric: 'buildings_completed',
      target: 1,
      spReward: 30,
    });

    const res = await POST(post('/api/space-tycoon/seasons/progress', {
      challengeId: 'db-challenge-1',
      progress: 999_999_999,
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.challengeCompleted).toBe(false);
    expect(body.spAwarded).toBe(0);
    expect(body.tokensAwarded).toBe(0);
    expect(body.progress).toBe(0);
    expect(body.progressSource).toBe('server');
    // No eventTokens credit, no season-point write.
    expect(mockGameProfile.update).not.toHaveBeenCalled();
    const updateArg = mockSeasonParticipation.update.mock.calls[0][0];
    expect(updateArg.data.seasonPoints).toBeUndefined();
  });

  it('SECURITY: a client-capped metric with no server signal cannot be farmed either', async () => {
    const { POST } = await import('@/app/api/space-tycoon/seasons/progress/route');

    mockGameProfile.findUnique.mockResolvedValue(makeProfile());
    seedEvent({});
    mockSeasonChallenge.findFirst.mockResolvedValue({
      id: 'db-challenge-2',
      metric: 'cargo_transported', // not observable; ceiling = fleet capacity × 20 = 0 with no ships
      target: 100,
      spReward: 50,
    });

    const res = await POST(post('/api/space-tycoon/seasons/progress', {
      challengeId: 'db-challenge-2',
      progress: 999_999_999,
    }));
    const body = await res.json();

    expect(body.challengeCompleted).toBe(false);
    expect(body.progress).toBe(0);
    expect(body.progressSource).toBe('client_capped');
    expect(mockGameProfile.update).not.toHaveBeenCalled();
  });

  it('awards SP from the server-observed delta once the profile actually shows the work', async () => {
    const { POST } = await import('@/app/api/space-tycoon/seasons/progress/route');

    mockGameProfile.findUnique.mockResolvedValue(makeProfile({
      buildingsData: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true }],
    }));
    // Baseline was captured earlier at 0 completed buildings.
    seedEvent({ challengeBaselines: { 'db-challenge-1': 0 } });
    mockSeasonChallenge.findFirst.mockResolvedValue({
      id: 'db-challenge-1',
      metric: 'buildings_completed',
      target: 1,
      spReward: 30,
    });

    const res = await POST(post('/api/space-tycoon/seasons/progress', { challengeId: 'db-challenge-1' }));
    const body = await res.json();

    expect(body.challengeCompleted).toBe(true);
    expect(body.spAwarded).toBe(30);
    expect(body.progress).toBe(1);
    const updateArg = mockSeasonParticipation.update.mock.calls[0][0];
    expect(updateArg.data.seasonPoints).toBe(30);
  });

  it('still requires challengeId', async () => {
    const { POST } = await import('@/app/api/space-tycoon/seasons/progress/route');
    const res = await POST(post('/api/space-tycoon/seasons/progress', { progress: 5 }));
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P4 — speed-runs/check builds the milestone state from the profile
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/speed-runs/check (P4)', () => {
  it('SECURITY: body.gameState.money=1e12 does not complete sr_1b_cash when the profile has $0', async () => {
    const { POST } = await import('@/app/api/space-tycoon/speed-runs/check/route');

    mockGameProfile.findUnique.mockResolvedValue(makeProfile({ money: 0 }));
    mockSpeedRunAttempt.findFirst.mockResolvedValue({
      id: 'attempt-1',
      challengeId: 'challenge-1',
      bracket: 'rookie',
      startedAtMs: Date.now() - 60_000,
      challenge: { milestoneId: 'sr_1b_cash', milestoneName: 'Billionaire', weekId: 1 },
    });

    const res = await POST(post('/api/space-tycoon/speed-runs/check', {
      gameState: { money: 1_000_000_000_000, buildings: [], completedResearch: [], activeServices: [], unlockedLocations: [] },
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isComplete).toBe(false);
    expect(mockSpeedRunAttempt.update).not.toHaveBeenCalled();
    expect(mockGameProfile.update).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P6 — alliance-treasury activate_perk requires leader/officer
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/alliance-treasury activate_perk (P6)', () => {
  beforeEach(() => {
    mockGameProfile.findUnique.mockResolvedValue({ id: 'profile-1', companyName: 'Honest Aerospace' });
    mockActivatePerk.mockResolvedValue({
      success: true,
      perk: { perkId: 'perk_1', expiresAt: new Date(Date.now() + 3600_000) },
    });
  });

  it('SECURITY: a recruit cannot activate a perk', async () => {
    const { POST } = await import('@/app/api/space-tycoon/alliance-treasury/route');
    mockAllianceMember.findUnique.mockResolvedValue({ allianceId: 'alliance-1', role: 'recruit' });

    const res = await POST(post('/api/space-tycoon/alliance-treasury', { action: 'activate_perk', perkId: 'perk_1' }));

    expect(res.status).toBe(403);
    expect(mockActivatePerk).not.toHaveBeenCalled();
  });

  it('SECURITY: a plain member cannot activate a perk', async () => {
    const { POST } = await import('@/app/api/space-tycoon/alliance-treasury/route');
    mockAllianceMember.findUnique.mockResolvedValue({ allianceId: 'alliance-1', role: 'member' });

    const res = await POST(post('/api/space-tycoon/alliance-treasury', { action: 'activate_perk', perkId: 'perk_1' }));

    expect(res.status).toBe(403);
    expect(mockActivatePerk).not.toHaveBeenCalled();
  });

  it('an officer can activate a perk', async () => {
    const { POST } = await import('@/app/api/space-tycoon/alliance-treasury/route');
    mockAllianceMember.findUnique.mockResolvedValue({ allianceId: 'alliance-1', role: 'officer' });

    const res = await POST(post('/api/space-tycoon/alliance-treasury', { action: 'activate_perk', perkId: 'perk_1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockActivatePerk).toHaveBeenCalledWith(expect.anything(), 'alliance-1', 'perk_1', 'profile-1');
  });

  it('rejects a malformed body with 400 (L5 zod schema)', async () => {
    const { POST } = await import('@/app/api/space-tycoon/alliance-treasury/route');
    mockAllianceMember.findUnique.mockResolvedValue({ allianceId: 'alliance-1', role: 'leader' });

    const res = await POST(post('/api/space-tycoon/alliance-treasury', { action: 'deposit', amount: 'lots' }));

    expect(res.status).toBe(400);
    expect(mockDepositToTreasury).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P10 — chat writes the profile's own companyName
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/chat (P10)', () => {
  it('SECURITY: writes profile.companyName, not body.companyName', async () => {
    const { POST } = await import('@/app/api/space-tycoon/chat/route');

    mockGameChatMessage.count.mockResolvedValue(0); // table available
    mockGameChatMessage.findFirst.mockResolvedValue(null); // not rate-limited
    mockGameChatMessage.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'msg-1',
      createdAt: new Date(),
      ...data,
    }));
    mockGameProfile.findUnique.mockResolvedValue({ companyName: 'Honest Aerospace' });

    const res = await POST(post('/api/space-tycoon/chat', { message: 'hello', companyName: 'Rival Dynamics' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockGameChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ companyName: 'Honest Aerospace' }) }),
    );
    expect(body.message.companyName).toBe('Honest Aerospace');
    expect(JSON.stringify(body)).not.toContain('Rival Dynamics');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Colonies — claim fee + presence prerequisite + P10 name
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/colonies (claim fee)', () => {
  const plutoBuilding = { instanceId: 'b1', definitionId: 'colony_pluto', locationId: 'pluto_surface', isComplete: true };

  beforeEach(() => {
    mockColonyClaim.findUnique.mockResolvedValue(null);
    mockColonyClaim.count.mockResolvedValue(0);
  });

  it('SECURITY: insufficient money -> 400 and no ColonyClaim is created', async () => {
    const { POST } = await import('@/app/api/space-tycoon/colonies/route');
    mockGameProfile.findUnique.mockResolvedValue(makeProfile({ money: 1_000, buildingsData: [plutoBuilding] }));

    const res = await POST(post('/api/space-tycoon/colonies', { locationId: 'pluto_surface', companyName: 'Rival Dynamics' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.claimCost).toBe(5_000_000_000);
    expect(mockColonyClaim.create).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockPlayerActivity.create).not.toHaveBeenCalled();
  });

  it('SECURITY: no building or ship at the location -> 400 and no ColonyClaim', async () => {
    const { POST } = await import('@/app/api/space-tycoon/colonies/route');
    mockGameProfile.findUnique.mockResolvedValue(makeProfile({ money: 1e12, buildingsData: [] }));

    const res = await POST(post('/api/space-tycoon/colonies', { locationId: 'pluto_surface' }));

    expect(res.status).toBe(400);
    expect(mockColonyClaim.create).not.toHaveBeenCalled();
  });

  it('charges the fee atomically and writes the claim under profile.companyName', async () => {
    const { POST } = await import('@/app/api/space-tycoon/colonies/route');
    mockGameProfile.findUnique.mockResolvedValue(makeProfile({ money: 1e12, buildingsData: [plutoBuilding] }));
    mockGameProfile.updateMany.mockResolvedValue({ count: 1 });
    mockColonyClaim.create.mockResolvedValue({ id: 'claim-1', claimedAt: new Date() });
    mockPlayerActivity.create.mockResolvedValue({});

    const res = await POST(post('/api/space-tycoon/colonies', { locationId: 'pluto_surface', companyName: 'Rival Dynamics' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.claimCost).toBe(5_000_000_000);
    expect(mockGameProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'profile-1', money: { gte: 5_000_000_000 } },
        data: expect.objectContaining({ money: { decrement: 5_000_000_000 } }),
      }),
    );
    expect(mockColonyClaim.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ companyName: 'Honest Aerospace', locationId: 'pluto_surface' }) }),
    );
    expect(JSON.stringify(body)).not.toContain('Rival Dynamics');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P10 — milestones: name and reward come from the server
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/milestones (P10)', () => {
  it('SECURITY: stores profile.companyName and the definition reward, ignoring body values', async () => {
    const { POST } = await import('@/app/api/space-tycoon/milestones/route');
    mockGlobalMilestone.findUnique.mockResolvedValue(null);
    // H-3 (2026-09-02): the condition is verified server-side now — use a
    // SERVER-VERIFIED milestone (money after the clamp) so the claim goes
    // through without an aged EconomicSnapshot.
    mockGameProfile.findUnique.mockResolvedValue({
      id: 'profile-1', companyName: 'Honest Aerospace', createdAt: new Date(), money: 2_000_000_000,
      buildingsData: [], activeServicesData: [], completedResearchList: [], unlockedLocationsList: [],
    });
    mockColonyClaim.findMany.mockResolvedValue([]);
    mockGlobalMilestone.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      claimedAt: new Date(),
      ...data,
    }));
    mockPlayerActivity.create.mockResolvedValue({});

    const res = await POST(post('/api/space-tycoon/milestones', {
      milestoneId: 'milestone_first_billion',
      companyName: 'Rival Dynamics',
      reward: 999_999_999_999,
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockGlobalMilestone.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyName: 'Honest Aerospace', reward: 200_000_000 }),
      }),
    );
    expect(JSON.stringify(body)).not.toContain('Rival Dynamics');
  });

  it('rejects an unknown milestone id', async () => {
    const { POST } = await import('@/app/api/space-tycoon/milestones/route');
    const res = await POST(post('/api/space-tycoon/milestones', { milestoneId: 'milestone_made_up' }));
    expect(res.status).toBe(404);
    expect(mockGlobalMilestone.create).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M6 — market/orders quantity and price bands
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/market/orders (M6)', () => {
  beforeEach(() => {
    mockGameProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    mockMarketResource.findUnique.mockResolvedValue({ currentPrice: 100 });
  });

  it('SECURITY: quantity 1e9 -> 400 and no order is placed', async () => {
    const { POST } = await import('@/app/api/space-tycoon/market/orders/route');

    const res = await POST(post('/api/space-tycoon/market/orders', {
      resourceSlug: 'iron', side: 'buy', price: 100, quantity: 1_000_000_000,
    }));

    expect(res.status).toBe(400);
    expect(mockPlaceLimitOrder).not.toHaveBeenCalled();
  });

  it('SECURITY: price outside [0.1x, 10x] of currentPrice -> 400', async () => {
    const { POST } = await import('@/app/api/space-tycoon/market/orders/route');

    const tooLow = await POST(post('/api/space-tycoon/market/orders', {
      resourceSlug: 'iron', side: 'sell', price: 1, quantity: 10,
    }));
    const tooHigh = await POST(post('/api/space-tycoon/market/orders', {
      resourceSlug: 'iron', side: 'buy', price: 5_000, quantity: 10,
    }));

    expect(tooLow.status).toBe(400);
    expect(tooHigh.status).toBe(400);
    expect(mockPlaceLimitOrder).not.toHaveBeenCalled();
  });

  it('accepts an in-band order', async () => {
    const { POST } = await import('@/app/api/space-tycoon/market/orders/route');
    mockPlaceLimitOrder.mockResolvedValue({ success: true, order: { id: 'o1' }, fills: [], escrowDeducted: 0 });

    const res = await POST(post('/api/space-tycoon/market/orders', {
      resourceSlug: 'iron', side: 'buy', price: 120, quantity: 100,
    }));

    expect(res.status).toBe(200);
    expect(mockPlaceLimitOrder).toHaveBeenCalledWith('profile-1', 'iron', 'buy', 100, 120, 24);
  });
});
