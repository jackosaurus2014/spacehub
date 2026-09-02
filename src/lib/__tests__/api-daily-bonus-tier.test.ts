/**
 * @jest-environment node
 *
 * GAME_DESIGN_REVIEW_2026-09 row 9 — the daily-bonus route prices the claim
 * from the PERSISTED profile's tier (tierFromProfileScalars), never from
 * the request. A T5 profile gets the ×10 schedule; a fresh one gets ×0.25.
 */
import { NextRequest } from 'next/server';

const mockGameProfile = { findUnique: jest.fn(), updateMany: jest.fn() };
const mockTransaction = jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn({ gameProfile: mockGameProfile }));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { gameProfile: mockGameProfile, $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn) },
}));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/game/server-ledger', () => ({ isLedgerAvailable: jest.fn().mockResolvedValue(false), recordLedger: jest.fn() }));

import { getServerSession } from 'next-auth';
const mockSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    dailyBonusLastClaim: null,
    dailyBonusStreak: 0,
    totalEarned: 0,
    buildingCount: 0,
    researchCount: 0,
    locationsUnlocked: 0,
    serviceCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue({ user: { id: 'u1' } } as never);
  mockGameProfile.updateMany.mockResolvedValue({ count: 1 });
});

describe('POST /api/space-tycoon/daily-bonus — tier from the persisted profile', () => {
  it('a fresh profile claims the T1 day-1 amount ($2.5M)', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profile());
    const { POST } = await import('@/app/api/space-tycoon/daily-bonus/route');
    const res = await POST();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, amount: 2_500_000, newStreak: 1, tier: 1 });
    expect(mockGameProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ money: { increment: 2_500_000 }, totalEarned: { increment: 2_500_000 } }),
    }));
  });

  it('a T5 profile claims ×10 ($100M day 1) — computed server-side', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profile({ totalEarned: 6e11, buildingCount: 40, researchCount: 25, locationsUnlocked: 9, serviceCount: 15 }));
    const { POST } = await import('@/app/api/space-tycoon/daily-bonus/route');
    const json = await (await POST()).json();
    expect(json).toMatchObject({ success: true, amount: 100_000_000, tier: 5 });
  });

  it('totalEarned alone cannot buy a tier the other persisted counts refuse', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profile({ totalEarned: 6e11, buildingCount: 2, researchCount: 1, locationsUnlocked: 1, serviceCount: 1 }));
    const { POST } = await import('@/app/api/space-tycoon/daily-bonus/route');
    const json = await (await POST()).json();
    expect(json.tier).toBe(1);
    expect(json.amount).toBe(2_500_000);
  });

  it('GET publishes the tier, multiplier and the tier-scaled schedule', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profile({ totalEarned: 5e9, buildingCount: 12, researchCount: 8, locationsUnlocked: 5, serviceCount: 6 }));
    const { GET } = await import('@/app/api/space-tycoon/daily-bonus/route');
    const json = await (await GET()).json();
    expect(json.tier).toBe(3);
    expect(json.multiplier).toBe(1);
    expect(json.schedule[6].amount).toBe(200_000_000);
    expect(json.amount).toBe(10_000_000);
  });

  it('still refuses a second claim on the same UTC day', async () => {
    mockGameProfile.findUnique.mockResolvedValue(profile({ dailyBonusLastClaim: new Date(), dailyBonusStreak: 2 }));
    const { POST } = await import('@/app/api/space-tycoon/daily-bonus/route');
    const res = await POST();
    expect(res.status).toBe(409);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  void NextRequest;
});
