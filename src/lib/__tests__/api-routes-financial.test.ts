/**
 * @jest-environment node
 */

/**
 * API route handler tests for financial endpoints:
 *   - GET /api/funding-opportunities  (filtering, pagination, search)
 *   - POST /api/funding-opportunities (cron refresh with auth)
 *   - GET /api/investors              (filtering by type/sector, sorting)
 *
 * Validates pagination, filtering, search, auth, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    fundingOpportunity: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    investor: {
      findMany: jest.fn(),
    },
    fundingRound: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/funding/opportunity-fetcher', () => ({
  aggregateAllOpportunities: jest.fn(),
  STATE_INCENTIVES: [],
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { aggregateAllOpportunities, STATE_INCENTIVES } from '@/lib/funding/opportunity-fetcher';

import { GET as fundingGET, POST as fundingPOST } from '@/app/api/funding-opportunities/route';
import { GET as investorsGET } from '@/app/api/investors/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAggregate = aggregateAllOpportunities as jest.MockedFunction<typeof aggregateAllOpportunities>;

function makeOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    externalId: 'ext-opp-1',
    title: 'NASA SBIR Phase I',
    description: 'Small Business Innovation Research grant for space technology',
    agency: 'NASA',
    program: 'SBIR',
    fundingType: 'grant',
    amountMin: 50000,
    amountMax: 150000,
    totalBudget: null,
    deadline: new Date('2026-06-01'),
    openDate: new Date('2026-01-01'),
    status: 'open',
    eligibility: 'Small businesses',
    setAside: 'Small Business',
    categories: ['propulsion', 'materials'],
    applicationUrl: 'https://nasa.gov/apply',
    sourceUrl: 'https://nasa.gov/sbir',
    source: 'grants.gov',
    contactName: 'John Doe',
    contactEmail: 'john@nasa.gov',
    naicsCode: '541715',
    solicitationNumber: 'SOL-2026-001',
    stateIncentive: false,
    state: null,
    recurring: false,
    createdAt: new Date('2026-01-15'),
    lastUpdated: new Date('2026-01-15'),
    ...overrides,
  };
}

function makeInvestor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    name: 'Space Ventures Capital',
    type: 'vc',
    description: 'Leading VC firm focused on space technology',
    website: 'https://spaceventures.com',
    logoUrl: null,
    sectorFocus: ['launch', 'satellites', 'space-infrastructure'],
    stagePreference: ['seed', 'series_a'],
    aum: 500000000,
    portfolioCount: 25,
    headquarters: 'San Francisco, CA',
    contactEmail: 'info@spaceventures.com',
    createdAt: new Date('2025-06-01'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset env
  delete process.env.CRON_SECRET;
});

// =============================================================================
// GET /api/funding-opportunities
// =============================================================================

describe('GET /api/funding-opportunities', () => {
  it('returns paginated results with defaults', async () => {
    const opportunities = [makeOpportunity(), makeOpportunity({ id: 'opp-2', title: 'DOD SBIR' })];
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/funding-opportunities');
    const res = await fundingGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.opportunities).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.limit).toBe(50); // default limit
    expect(body.pagination.offset).toBe(0); // default offset
    expect(body.pagination.hasMore).toBe(false);
  });

  it('defaults status filter to open', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.status).toBe('open');
  });

  it('filters by status param', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?status=closed');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.status).toBe('closed');
  });

  it('passes status=all without setting a status where clause', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?status=all');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.status).toBeUndefined();
  });

  it('filters by agency (case-insensitive contains)', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?agency=NASA');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.agency).toEqual({ contains: 'NASA', mode: 'insensitive' });
  });

  it('filters by category using array has', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?category=propulsion');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.categories).toEqual({ has: 'propulsion' });
  });

  it('filters by funding type', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?type=grant');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.fundingType).toBe('grant');
  });

  it('filters by stateIncentive=true', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?stateIncentive=true');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.stateIncentive).toBe(true);
  });

  it('handles search query with OR across title, description, agency, program', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?q=propulsion');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { title: { contains: 'propulsion', mode: 'insensitive' } },
      { description: { contains: 'propulsion', mode: 'insensitive' } },
      { agency: { contains: 'propulsion', mode: 'insensitive' } },
      { program: { contains: 'propulsion', mode: 'insensitive' } },
    ]);
  });

  it('respects custom limit and offset', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?limit=10&offset=20');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBe(10);
    expect(findManyCall.skip).toBe(20);
  });

  it('caps limit at 100', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?limit=500');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBeLessThanOrEqual(100);
  });

  it('orders by deadline ascending then createdAt descending', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities');
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual([{ deadline: 'asc' }, { createdAt: 'desc' }]);
  });

  it('calculates hasMore correctly when more results exist', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([makeOpportunity()]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(100);

    const req = new NextRequest('http://localhost/api/funding-opportunities?limit=10&offset=0');
    const res = await fundingGET(req);
    const body = await res.json();

    expect(body.pagination.hasMore).toBe(true);
    expect(body.pagination.total).toBe(100);
  });

  it('returns empty results gracefully', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/funding-opportunities?q=nonexistent');
    const res = await fundingGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.opportunities).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.hasMore).toBe(false);
  });

  it('combines multiple filters simultaneously', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest(
      'http://localhost/api/funding-opportunities?status=open&agency=NASA&category=propulsion&type=grant'
    );
    await fundingGET(req);

    const findManyCall = (mockPrisma.fundingOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.status).toBe('open');
    expect(findManyCall.where.agency).toEqual({ contains: 'NASA', mode: 'insensitive' });
    expect(findManyCall.where.categories).toEqual({ has: 'propulsion' });
    expect(findManyCall.where.fundingType).toBe('grant');
  });

  it('returns 500 when database throws', async () => {
    (mockPrisma.fundingOpportunity.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    (mockPrisma.fundingOpportunity.count as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = new NextRequest('http://localhost/api/funding-opportunities');
    const res = await fundingGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch opportunities');
  });
});

// =============================================================================
// POST /api/funding-opportunities (cron refresh)
// =============================================================================

describe('POST /api/funding-opportunities', () => {
  it('returns 401 when CRON_SECRET is set and auth header is missing', async () => {
    process.env.CRON_SECRET = 'my-secret';

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: { host: 'spacenexus.app' },
    });
    const res = await fundingPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when CRON_SECRET is set and auth header is wrong', async () => {
    process.env.CRON_SECRET = 'my-secret';

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: {
        authorization: 'Bearer wrong-secret',
        host: 'spacenexus.app',
      },
    });
    const res = await fundingPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('allows access from localhost even without correct auth', async () => {
    process.env.CRON_SECRET = 'my-secret';
    (mockAggregate as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: { host: 'localhost:3000' },
    });
    const res = await fundingPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('allows access when CRON_SECRET matches', async () => {
    process.env.CRON_SECRET = 'my-secret';
    (mockAggregate as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: {
        authorization: 'Bearer my-secret',
        host: 'spacenexus.app',
      },
    });
    const res = await fundingPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('allows access when no CRON_SECRET is set', async () => {
    // No CRON_SECRET means auth check is skipped
    (mockAggregate as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: { host: 'spacenexus.app' },
    });
    const res = await fundingPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('upserts fetched opportunities and returns count', async () => {
    const fetchedOpps = [
      {
        externalId: 'ext-1',
        title: 'NASA SBIR',
        description: 'Research grant',
        agency: 'NASA',
        program: 'SBIR',
        fundingType: 'grant',
        amountMin: 50000,
        amountMax: 150000,
        totalBudget: null,
        deadline: new Date('2026-06-01'),
        openDate: new Date('2026-01-01'),
        status: 'open',
        eligibility: 'Small business',
        setAside: null,
        categories: ['propulsion'],
        applicationUrl: 'https://nasa.gov',
        sourceUrl: 'https://nasa.gov',
        source: 'grants.gov',
        contactName: null,
        contactEmail: null,
        naicsCode: null,
        solicitationNumber: null,
        stateIncentive: false,
        state: null,
        recurring: false,
      },
    ];
    (mockAggregate as jest.Mock).mockResolvedValue(fetchedOpps);
    (mockPrisma.fundingOpportunity.upsert as jest.Mock).mockResolvedValue({});
    (mockPrisma.fundingOpportunity.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: { host: 'localhost:3000' },
    });
    const res = await fundingPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.upserted).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.expiredClosed).toBe(3);
  });

  it('counts individual upsert failures without failing the entire request', async () => {
    const fetchedOpps = [
      { externalId: 'ext-ok', title: 'Good', description: '', agency: '', program: '', fundingType: '', amountMin: 0, amountMax: 0, totalBudget: null, deadline: null, openDate: null, status: 'open', eligibility: '', setAside: '', categories: [], applicationUrl: '', sourceUrl: '', source: '', contactName: '', contactEmail: '', naicsCode: '', solicitationNumber: '' },
      { externalId: 'ext-fail', title: 'Bad', description: '', agency: '', program: '', fundingType: '', amountMin: 0, amountMax: 0, totalBudget: null, deadline: null, openDate: null, status: 'open', eligibility: '', setAside: '', categories: [], applicationUrl: '', sourceUrl: '', source: '', contactName: '', contactEmail: '', naicsCode: '', solicitationNumber: '' },
    ];
    (mockAggregate as jest.Mock).mockResolvedValue(fetchedOpps);
    (mockPrisma.fundingOpportunity.upsert as jest.Mock)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Unique constraint'));
    (mockPrisma.fundingOpportunity.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: { host: 'localhost:3000' },
    });
    const res = await fundingPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.upserted).toBe(1);
    expect(body.errors).toBe(1);
  });

  it('closes expired non-recurring opportunities', async () => {
    (mockAggregate as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingOpportunity.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: { host: 'localhost:3000' },
    });
    await fundingPOST(req);

    expect(mockPrisma.fundingOpportunity.updateMany).toHaveBeenCalledWith({
      where: {
        deadline: { lt: expect.any(Date) },
        status: 'open',
        recurring: false,
      },
      data: { status: 'closed' },
    });
  });

  it('returns 500 when aggregation throws', async () => {
    (mockAggregate as jest.Mock).mockRejectedValue(new Error('Network error'));

    const req = new NextRequest('http://localhost/api/funding-opportunities', {
      method: 'POST',
      headers: { host: 'localhost:3000' },
    });
    const res = await fundingPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Refresh failed');
  });
});

// =============================================================================
// GET /api/investors
// =============================================================================

describe('GET /api/investors', () => {
  it('returns investor list with computed totals', async () => {
    const investors = [makeInvestor(), makeInvestor({ id: 'inv-2', name: 'Orbit Partners' })];
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue(investors);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors');
    const res = await investorsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.investors).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('computes totalInvested and dealCount from funding rounds', async () => {
    const investor = makeInvestor({ name: 'Space Ventures Capital' });
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([investor]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([
      { amount: 5000000 },
      { amount: 10000000 },
      { amount: 3000000 },
    ]);

    const req = new NextRequest('http://localhost/api/investors');
    const res = await investorsGET(req);
    const body = await res.json();

    expect(body.investors[0].totalInvested).toBe(18000000);
    expect(body.investors[0].dealCount).toBe(3);
  });

  it('handles funding rounds with null amounts', async () => {
    const investor = makeInvestor();
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([investor]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([
      { amount: 5000000 },
      { amount: null },
      { amount: 2000000 },
    ]);

    const req = new NextRequest('http://localhost/api/investors');
    const res = await investorsGET(req);
    const body = await res.json();

    expect(body.investors[0].totalInvested).toBe(7000000);
    expect(body.investors[0].dealCount).toBe(3);
  });

  it('filters by type (case-insensitive)', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors?type=vc');
    await investorsGET(req);

    const findManyCall = ((mockPrisma as any).investor.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.type).toEqual({ equals: 'vc', mode: 'insensitive' });
  });

  it('filters by sector focus using array has', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors?sectorFocus=satellites');
    await investorsGET(req);

    const findManyCall = ((mockPrisma as any).investor.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.sectorFocus).toEqual({ has: 'satellites' });
  });

  it('defaults sort to portfolioCount descending', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors');
    await investorsGET(req);

    const findManyCall = ((mockPrisma as any).investor.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ portfolioCount: 'desc' });
  });

  it('sorts by aum descending when sort=aum', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors?sort=aum');
    await investorsGET(req);

    const findManyCall = ((mockPrisma as any).investor.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ aum: 'desc' });
  });

  it('sorts by name ascending when sort=name', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors?sort=name');
    await investorsGET(req);

    const findManyCall = ((mockPrisma as any).investor.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ name: 'asc' });
  });

  it('re-sorts by dealCount when sort=portfolioCount', async () => {
    const investors = [
      makeInvestor({ id: 'inv-1', name: 'Few Deals Fund', portfolioCount: 5 }),
      makeInvestor({ id: 'inv-2', name: 'Many Deals Fund', portfolioCount: 3 }),
    ];
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue(investors);
    // First investor: 1 round, second investor: 5 rounds
    (mockPrisma.fundingRound.findMany as jest.Mock)
      .mockResolvedValueOnce([{ amount: 1000000 }]) // Few Deals Fund
      .mockResolvedValueOnce([{ amount: 500000 }, { amount: 700000 }, { amount: 600000 }, { amount: 800000 }, { amount: 900000 }]); // Many Deals Fund

    const req = new NextRequest('http://localhost/api/investors?sort=portfolioCount');
    const res = await investorsGET(req);
    const body = await res.json();

    // Many Deals Fund has more deals (5) so should come first after re-sort
    expect(body.investors[0].name).toBe('Many Deals Fund');
    expect(body.investors[0].dealCount).toBe(5);
    expect(body.investors[1].name).toBe('Few Deals Fund');
    expect(body.investors[1].dealCount).toBe(1);
  });

  it('defaults limit to 100 and caps at 200', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors');
    await investorsGET(req);

    const findManyCall = ((mockPrisma as any).investor.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBe(100);
  });

  it('caps limit at 200', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors?limit=999');
    await investorsGET(req);

    const findManyCall = ((mockPrisma as any).investor.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBeLessThanOrEqual(200);
  });

  it('queries funding rounds with OR for leadInvestor and investors array', async () => {
    const investor = makeInvestor({ name: 'Test Fund' });
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([investor]);
    (mockPrisma.fundingRound.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors');
    await investorsGET(req);

    expect(mockPrisma.fundingRound.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { leadInvestor: { equals: 'Test Fund', mode: 'insensitive' } },
          { investors: { has: 'Test Fund' } },
        ],
      },
      select: { amount: true },
    });
  });

  it('returns empty results gracefully', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/investors?type=government');
    const res = await investorsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.investors).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns 500 when database throws', async () => {
    ((mockPrisma as any).investor.findMany as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    const req = new NextRequest('http://localhost/api/investors');
    const res = await investorsGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch investors');
  });
});
