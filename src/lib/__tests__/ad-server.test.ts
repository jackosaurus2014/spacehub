/**
 * @jest-environment node
 */

// Mock Prisma before importing ad-server
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    adPlacement: { findMany: jest.fn() },
    adImpression: { aggregate: jest.fn() },
    adCampaign: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Mock the logger to silence output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import prisma from '@/lib/db';
import { selectAd } from '@/lib/ads/ad-server';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper to create a mock placement with campaign and advertiser data
function createMockPlacement(overrides: Record<string, unknown> = {}) {
  const { campaign: campaignOverride, ...rest } = overrides;
  return {
    id: 'placement-1',
    campaignId: 'campaign-1',
    position: 'sidebar',
    format: 'banner',
    title: 'Test Ad',
    description: 'A test ad',
    imageUrl: 'https://example.com/ad.png',
    linkUrl: 'https://example.com',
    ctaText: 'Click here',
    isActive: true,
    campaign: {
      id: 'campaign-1',
      name: 'Test Campaign',
      status: 'active',
      priority: 10,
      budget: 1000,
      spent: 100,
      dailyBudget: null,
      cpmRate: 5,
      cpcRate: null,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2030-12-31'),
      targetModules: [],
      advertiser: {
        companyName: 'Acme Corp',
        logoUrl: 'https://example.com/logo.png',
      },
      ...((campaignOverride as Record<string, unknown>) || {}),
    },
    ...rest,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// selectAd — ad-free tier users
// ---------------------------------------------------------------------------
describe('selectAd — ad-free tier users', () => {
  it('returns null for pro tier users (ad-free)', async () => {
    const result = await selectAd({
      position: 'sidebar',
      userTier: 'pro',
    });
    expect(result).toBeNull();
  });

  it('returns null for enterprise tier users (ad-free)', async () => {
    const result = await selectAd({
      position: 'sidebar',
      userTier: 'enterprise',
    });
    expect(result).toBeNull();
  });

  it('does not return null for free tier users', async () => {
    (mockPrisma.adPlacement.findMany as jest.Mock).mockResolvedValue([
      createMockPlacement(),
    ]);

    const result = await selectAd({
      position: 'sidebar',
      userTier: 'free',
    });
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectAd — userId lookup when no tier provided
// ---------------------------------------------------------------------------
describe('selectAd — userId tier lookup', () => {
  it('returns null when userId maps to an ad-free tier', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'pro',
    });

    const result = await selectAd({
      position: 'sidebar',
      userId: 'user-1',
    });
    expect(result).toBeNull();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { subscriptionTier: true },
    });
  });
});

// ---------------------------------------------------------------------------
// selectAd — no placements
// ---------------------------------------------------------------------------
describe('selectAd — no placements', () => {
  it('returns null when no active placements match', async () => {
    (mockPrisma.adPlacement.findMany as jest.Mock).mockResolvedValue([]);

    const result = await selectAd({
      position: 'sidebar',
      userTier: 'free',
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectAd — budget filtering
// ---------------------------------------------------------------------------
describe('selectAd — budget filtering', () => {
  it('filters out campaigns that have spent their total budget', async () => {
    const overBudgetPlacement = createMockPlacement({
      campaign: { budget: 500, spent: 500 },
    });
    (mockPrisma.adPlacement.findMany as jest.Mock).mockResolvedValue([
      overBudgetPlacement,
    ]);

    const result = await selectAd({
      position: 'sidebar',
      userTier: 'free',
    });
    expect(result).toBeNull();
  });

  it('filters out campaigns that have spent their daily budget', async () => {
    const dailyLimitedPlacement = createMockPlacement({
      campaign: { budget: 1000, spent: 100, dailyBudget: 50 },
    });
    (mockPrisma.adPlacement.findMany as jest.Mock).mockResolvedValue([
      dailyLimitedPlacement,
    ]);
    (mockPrisma.adImpression.aggregate as jest.Mock).mockResolvedValue({
      _sum: { revenue: 50 },
    });

    const result = await selectAd({
      position: 'sidebar',
      userTier: 'free',
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectAd — priority sorting
// ---------------------------------------------------------------------------
describe('selectAd — priority sorting', () => {
  it('selects the higher-priority campaign', async () => {
    const lowPriority = createMockPlacement({
      id: 'placement-low',
      campaignId: 'campaign-low',
      campaign: { id: 'campaign-low', priority: 1, budget: 1000, spent: 0 },
    });
    const highPriority = createMockPlacement({
      id: 'placement-high',
      campaignId: 'campaign-high',
      campaign: { id: 'campaign-high', priority: 100, budget: 1000, spent: 0 },
    });
    (mockPrisma.adPlacement.findMany as jest.Mock).mockResolvedValue([
      lowPriority,
      highPriority,
    ]);

    const result = await selectAd({
      position: 'sidebar',
      userTier: 'free',
    });
    expect(result).not.toBeNull();
    expect(result!.placementId).toBe('placement-high');
  });

  it('prefers the less-spent campaign when priorities are equal', async () => {
    const moreSpent = createMockPlacement({
      id: 'placement-more',
      campaignId: 'campaign-more',
      campaign: { id: 'campaign-more', priority: 5, budget: 1000, spent: 800 },
    });
    const lessSpent = createMockPlacement({
      id: 'placement-less',
      campaignId: 'campaign-less',
      campaign: { id: 'campaign-less', priority: 5, budget: 1000, spent: 100 },
    });
    (mockPrisma.adPlacement.findMany as jest.Mock).mockResolvedValue([
      moreSpent,
      lessSpent,
    ]);

    const result = await selectAd({
      position: 'sidebar',
      userTier: 'free',
    });
    expect(result).not.toBeNull();
    expect(result!.placementId).toBe('placement-less');
  });
});

// ---------------------------------------------------------------------------
// selectAd — returned shape
// ---------------------------------------------------------------------------
describe('selectAd — returned shape', () => {
  it('returns a ServedAd object with the correct fields', async () => {
    const placement = createMockPlacement();
    (mockPrisma.adPlacement.findMany as jest.Mock).mockResolvedValue([placement]);

    const result = await selectAd({
      position: 'sidebar',
      userTier: 'free',
    });

    expect(result).toEqual({
      placementId: 'placement-1',
      campaignId: 'campaign-1',
      position: 'sidebar',
      format: 'banner',
      title: 'Test Ad',
      description: 'A test ad',
      imageUrl: 'https://example.com/ad.png',
      linkUrl: 'https://example.com',
      ctaText: 'Click here',
      advertiserName: 'Acme Corp',
      advertiserLogo: 'https://example.com/logo.png',
    });
  });
});

// ---------------------------------------------------------------------------
// selectAd — error handling
// ---------------------------------------------------------------------------
describe('selectAd — error handling', () => {
  it('returns null and logs an error when the database throws', async () => {
    (mockPrisma.adPlacement.findMany as jest.Mock).mockRejectedValue(
      new Error('DB connection failed')
    );

    const result = await selectAd({
      position: 'sidebar',
      userTier: 'free',
    });
    expect(result).toBeNull();
  });
});
