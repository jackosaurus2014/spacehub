/**
 * @jest-environment node
 *
 * Wave E1 (docs/ECONOMY_PVP_2026-08.md §E1) — regression tests proving the
 * two route-level exploits are closed, with mocked prisma/session:
 *
 *   1. competitive-contracts POST used to pay out ($50B+ in the worst case)
 *      on timing/duplication/slot checks ONLY — no verification that the
 *      claiming profile actually meets the contract's requirement.
 *   2. market/mining-pressure POST was completely unauthenticated and could
 *      move the shared MarketResource price/supply for every player.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPlayerActivity = {
  findFirst: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  findMany: jest.fn(),
};
const mockGameProfile = {
  findUnique: jest.fn(),
  update: jest.fn(),
};
const mockColonyClaim = {
  findMany: jest.fn(),
};
const mockMarketAuditLog = {
  create: jest.fn(),
};
const mockMarketResource = {
  findUnique: jest.fn(),
  update: jest.fn(),
};
const mockTransaction = jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
  fn({
    playerActivity: mockPlayerActivity,
    gameProfile: mockGameProfile,
  }),
);

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    playerActivity: mockPlayerActivity,
    gameProfile: mockGameProfile,
    colonyClaim: mockColonyClaim,
    marketAuditLog: mockMarketAuditLog,
    marketResource: mockMarketResource,
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/game/server-ledger', () => ({
  isLedgerAvailable: jest.fn().mockResolvedValue(false),
  recordLedger: jest.fn(),
}));
jest.mock('@/lib/game/server-time', () => ({
  getGlobalGameDate: jest.fn(() => ({ totalMonths: 100, year: 2135, month: 4 })),
}));

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { logger } from '@/lib/logger';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    companyName: 'Test Aerospace',
    money: 1_000_000,
    netWorth: 0,
    serviceCount: 0,
    buildingsData: [],
    resources: {},
    completedResearchList: [],
    shipsData: [],
    unlockedLocationsList: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. competitive-contracts POST — exploit #1
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/competitive-contracts — E1 exploit #1 regression', () => {
  it('rejects a claim for cc_pluto_expedition when the profile has no colony at pluto_surface (the $50B curl exploit)', async () => {
    const { POST } = await import('@/app/api/space-tycoon/competitive-contracts/route');

    mockGameProfile.findUnique.mockResolvedValue(makeProfile()); // no colony anywhere
    mockPlayerActivity.findFirst.mockResolvedValue(null); // not already claimed
    mockPlayerActivity.count.mockResolvedValue(0); // slots open
    mockColonyClaim.findMany.mockResolvedValue([]); // no ColonyClaim rows at all

    const req = new NextRequest('http://localhost/api/space-tycoon/competitive-contracts', {
      method: 'POST',
      body: JSON.stringify({ contractId: 'cc_pluto_expedition', companyName: 'Test Aerospace' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    // The core assertion: no payout happened.
    expect(mockGameProfile.update).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    // Logged rejection — the abuse path is audited, not silently dropped.
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('rejected'),
      expect.objectContaining({ contractId: 'cc_pluto_expedition' }),
    );
    expect(mockMarketAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'competitive_contract_unverified_claim',
          profileId: 'profile-1',
        }),
      }),
    );
  });

  it('pays out cc_pluto_expedition only when the profile has a server-recorded ColonyClaim at pluto_surface', async () => {
    const { POST } = await import('@/app/api/space-tycoon/competitive-contracts/route');

    mockGameProfile.findUnique.mockResolvedValue(makeProfile());
    mockPlayerActivity.findFirst.mockResolvedValue(null);
    mockPlayerActivity.count.mockResolvedValue(0);
    // The player genuinely holds the colony this time.
    mockColonyClaim.findMany.mockResolvedValue([{ locationId: 'pluto_surface' }]);
    mockPlayerActivity.create.mockResolvedValue({});
    mockGameProfile.update.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/space-tycoon/competitive-contracts', {
      method: 'POST',
      body: JSON.stringify({ contractId: 'cc_pluto_expedition', companyName: 'Test Aerospace' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGameProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          money: { increment: 50_000_000_000 },
        }),
      }),
    );
  });

  it('rejects a satellites_at_location claim when buildingsData has no matching satellites', async () => {
    const { POST } = await import('@/app/api/space-tycoon/competitive-contracts/route');

    mockGameProfile.findUnique.mockResolvedValue(makeProfile({
      buildingsData: [{ definitionId: 'mining_lunar_ice', locationId: 'leo', isComplete: true }],
    }));
    mockPlayerActivity.findFirst.mockResolvedValue(null);
    mockPlayerActivity.count.mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/space-tycoon/competitive-contracts', {
      method: 'POST',
      body: JSON.stringify({ contractId: 'cc_nasa_leo_constellation', companyName: 'Test Aerospace' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockGameProfile.update).not.toHaveBeenCalled();
  });

  it('requires a valid session (401 without one)', async () => {
    const { POST } = await import('@/app/api/space-tycoon/competitive-contracts/route');
    mockGetServerSession.mockResolvedValue(null as never);

    const req = new NextRequest('http://localhost/api/space-tycoon/competitive-contracts', {
      method: 'POST',
      body: JSON.stringify({ contractId: 'cc_pluto_expedition', companyName: 'Test Aerospace' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockGameProfile.update).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. market/mining-pressure POST — exploit #2
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/space-tycoon/market/mining-pressure — E1 exploit #2 regression', () => {
  it('rejects an unauthenticated request before touching the shared market', async () => {
    const { POST } = await import('@/app/api/space-tycoon/market/mining-pressure/route');
    mockGetServerSession.mockResolvedValue(null as never);

    const req = new NextRequest('http://localhost/api/space-tycoon/market/mining-pressure', {
      method: 'POST',
      body: JSON.stringify({ resources: { iron: 200 } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    // The core assertion: no shared-market row was ever read or written.
    expect(mockMarketResource.findUnique).not.toHaveBeenCalled();
    expect(mockMarketResource.update).not.toHaveBeenCalled();
  });

  it('rejects a session with no game profile', async () => {
    const { POST } = await import('@/app/api/space-tycoon/market/mining-pressure/route');
    mockGameProfile.findUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/space-tycoon/market/mining-pressure', {
      method: 'POST',
      body: JSON.stringify({ resources: { iron: 200 } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    expect(mockMarketResource.update).not.toHaveBeenCalled();
  });

  it('moves the shared price for an authenticated session, but clamps the per-call quantity', async () => {
    const { POST } = await import('@/app/api/space-tycoon/market/mining-pressure/route');
    mockGameProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    mockMarketResource.findUnique.mockResolvedValue({
      id: 'res-iron', slug: 'iron', currentPrice: 5000, basePrice: 5000,
      totalSupply: 1000, volatility: 0.02, minPrice: 1000, maxPrice: 50000,
    });
    mockMarketResource.update.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/space-tycoon/market/mining-pressure', {
      method: 'POST',
      // A hostile/forged qty far above any real mining tick.
      body: JSON.stringify({ resources: { iron: 50_000_000 } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockMarketResource.update).toHaveBeenCalledTimes(1);
    const updateArgs = mockMarketResource.update.mock.calls[0][0];
    // totalSupply increment must be clamped to the per-call cap (2,000), not
    // the raw 50,000,000 the request claimed.
    expect(updateArgs.data.totalSupply).toBe(1000 + 2000);
  });
});
