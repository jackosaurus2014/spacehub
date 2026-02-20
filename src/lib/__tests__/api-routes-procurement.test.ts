/**
 * @jest-environment node
 */

/**
 * API route handler tests for procurement endpoints:
 *   - GET  /api/procurement/opportunities  (paginated list, filters, search)
 *   - POST /api/procurement/opportunities  (SAM.gov sync, cron-protected)
 *   - GET  /api/procurement/sbir           (SBIR solicitations, filters)
 *   - GET  /api/procurement/budget         (budget data with aggregates)
 *   - GET  /api/procurement/stats          (aggregate statistics, cached)
 *   - GET  /api/procurement/congressional  (congressional activities, filters)
 *   - GET  /api/procurement/saved-searches (auth-gated, subscription-gated)
 *   - POST /api/procurement/saved-searches (create saved search)
 *   - PUT  /api/procurement/saved-searches/[id] (update saved search)
 *   - DELETE /api/procurement/saved-searches/[id] (delete saved search)
 *
 * Validates pagination, filtering, authorization, caching, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: {
    procurementOpportunity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    sBIRSolicitation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    spaceBudgetItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    congressionalActivity: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    savedProcurementSearch: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
  default: {
    procurementOpportunity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    sBIRSolicitation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    spaceBudgetItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    congressionalActivity: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    savedProcurementSearch: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/api-cache', () => ({
  apiCache: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
  CacheTTL: { DEFAULT: 300_000, NEWS: 60_000, SLOW: 900_000 },
}));
jest.mock('@/lib/procurement/sam-gov', () => ({
  fetchSAMOpportunities: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { apiCache } from '@/lib/api-cache';
import { fetchSAMOpportunities } from '@/lib/procurement/sam-gov';

import { GET as opportunitiesGET, POST as opportunitiesPOST } from '@/app/api/procurement/opportunities/route';
import { GET as sbirGET } from '@/app/api/procurement/sbir/route';
import { GET as budgetGET } from '@/app/api/procurement/budget/route';
import { GET as statsGET } from '@/app/api/procurement/stats/route';
import { GET as congressionalGET } from '@/app/api/procurement/congressional/route';
import { GET as savedSearchesGET, POST as savedSearchesPOST } from '@/app/api/procurement/saved-searches/route';
import { PUT as savedSearchPUT, DELETE as savedSearchDELETE } from '@/app/api/procurement/saved-searches/[id]/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFetchSAM = fetchSAMOpportunities as jest.MockedFunction<typeof fetchSAMOpportunities>;

function makeOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    samNoticeId: 'SAM-001',
    title: 'Satellite Ground Station Maintenance',
    description: 'Contract for ground station upkeep and maintenance.',
    agency: 'NASA',
    subAgency: 'Goddard Space Flight Center',
    office: 'Procurement Office',
    type: 'Solicitation',
    naicsCode: '334511',
    naicsDescription: 'Search, Detection, and Navigation Instruments',
    setAside: 'Small Business',
    classificationCode: 'J099',
    estimatedValue: 500000,
    awardAmount: null,
    postedDate: new Date('2026-01-10'),
    responseDeadline: new Date('2026-03-10'),
    awardDate: null,
    placeOfPerformance: 'Greenbelt, MD',
    pointOfContact: 'John Smith',
    contactEmail: 'jsmith@nasa.gov',
    solicitationNumber: 'NNG26-001',
    awardee: null,
    samUrl: 'https://sam.gov/opp/001',
    isActive: true,
    tags: ['space', 'ground-station'],
    ...overrides,
  };
}

function makeSolicitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sbir-1',
    program: 'SBIR',
    agency: 'NASA',
    topicNumber: 'T1.01',
    topicTitle: 'Advanced Propulsion Systems',
    description: 'Research into next-gen propulsion for deep space missions.',
    phase: 'Phase I',
    awardAmount: 150000,
    openDate: new Date('2026-01-01'),
    closeDate: new Date('2026-04-01'),
    url: 'https://sbir.nasa.gov/topic/T1.01',
    keywords: ['propulsion', 'deep-space'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeBudgetItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'budget-1',
    agency: 'NASA',
    fiscalYear: 2026,
    category: 'Science',
    subcategory: 'Planetary Science',
    program: 'Mars Exploration',
    requestAmount: 3000000000,
    enactedAmount: 2800000000,
    previousYear: 2600000000,
    changePercent: 7.7,
    notes: 'Increase for Mars Sample Return',
    source: 'Congressional Budget Office',
    ...overrides,
  };
}

function makeCongressionalActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cong-1',
    type: 'hearing',
    committee: 'Senate Commerce Committee',
    subcommittee: 'Space and Science',
    title: 'NASA Authorization Act Hearing',
    description: 'Hearing on the proposed NASA Authorization Act of 2026.',
    date: new Date('2026-02-15'),
    status: 'completed',
    billNumber: 'S.1234',
    witnesses: ['NASA Administrator', 'SpaceX VP'],
    relevance: 'high',
    sourceUrl: 'https://congress.gov/hearing/1234',
    createdAt: new Date('2026-02-10'),
    ...overrides,
  };
}

function makeSavedSearch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'search-1',
    userId: 'user-1',
    name: 'NASA Small Business Opportunities',
    filters: { agencies: ['NASA'], setAsides: ['Small Business'] },
    alertEnabled: true,
    lastCheckedAt: new Date('2026-02-18'),
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-18'),
    matches: [{ id: 'match-1' }, { id: 'match-2' }],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiCache.get as jest.Mock).mockReturnValue(null);
});

// =============================================================================
// GET /api/procurement/opportunities
// =============================================================================

describe('GET /api/procurement/opportunities', () => {
  it('returns paginated opportunities with defaults', async () => {
    const opportunities = [makeOpportunity(), makeOpportunity({ id: 'opp-2', title: 'Rocket Engine Contract' })];
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/procurement/opportunities');
    const res = await opportunitiesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.opportunities).toHaveLength(2);
    expect(body.data.total).toBe(2);
    expect(body.data.limit).toBe(25);
    expect(body.data.offset).toBe(0);
  });

  it('respects custom limit and offset params', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(100);

    const req = new NextRequest('http://localhost/api/procurement/opportunities?limit=10&offset=20');
    const res = await opportunitiesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.procurementOpportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
    expect(body.data.limit).toBe(10);
    expect(body.data.offset).toBe(20);
  });

  it('filters by agency', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities?agency=NASA');
    await opportunitiesGET(req);

    const findManyCall = (prisma.procurementOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.agency).toEqual({ contains: 'NASA', mode: 'insensitive' });
  });

  it('filters by type', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities?type=Solicitation');
    await opportunitiesGET(req);

    const findManyCall = (prisma.procurementOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.type).toBe('Solicitation');
  });

  it('filters by setAside', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities?setAside=Small%20Business');
    await opportunitiesGET(req);

    const findManyCall = (prisma.procurementOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.setAside).toEqual({ contains: 'Small Business', mode: 'insensitive' });
  });

  it('filters by value range (minValue and maxValue)', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities?minValue=100000&maxValue=500000');
    await opportunitiesGET(req);

    const findManyCall = (prisma.procurementOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.estimatedValue).toEqual({ gte: 100000, lte: 500000 });
  });

  it('supports search query across title, description, awardee, solicitationNumber', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities?search=satellite');
    await opportunitiesGET(req);

    const findManyCall = (prisma.procurementOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { title: { contains: 'satellite', mode: 'insensitive' } },
      { description: { contains: 'satellite', mode: 'insensitive' } },
      { awardee: { contains: 'satellite', mode: 'insensitive' } },
      { solicitationNumber: { contains: 'satellite', mode: 'insensitive' } },
    ]);
  });

  it('always includes isActive: true in the where clause', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities');
    await opportunitiesGET(req);

    const findManyCall = (prisma.procurementOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.isActive).toBe(true);
  });

  it('returns empty results gracefully', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities?agency=NonExistentAgency');
    const res = await opportunitiesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.opportunities).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it('orders by postedDate descending', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities');
    await opportunitiesGET(req);

    const findManyCall = (prisma.procurementOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ postedDate: 'desc' });
  });

  it('caps limit at 100', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.procurementOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/opportunities?limit=500');
    await opportunitiesGET(req);

    const findManyCall = (prisma.procurementOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBeLessThanOrEqual(100);
  });

  it('returns 500 when prisma throws', async () => {
    (prisma.procurementOpportunity.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    (prisma.procurementOpportunity.count as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = new NextRequest('http://localhost/api/procurement/opportunities');
    const res = await opportunitiesGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch procurement opportunities');
  });
});

// =============================================================================
// POST /api/procurement/opportunities (SAM.gov sync)
// =============================================================================

describe('POST /api/procurement/opportunities', () => {
  it('rejects requests without CRON_SECRET', async () => {
    // No CRON_SECRET set, and request is not from localhost
    const originalEnv = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test-secret';

    const req = new NextRequest('http://example.com/api/procurement/opportunities', {
      method: 'POST',
    });
    const res = await opportunitiesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.message).toBe('Unauthorized');

    process.env.CRON_SECRET = originalEnv;
  });

  it('syncs SAM.gov data with valid cron secret', async () => {
    const originalEnv = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test-secret';

    const mockOpp = makeOpportunity();
    mockFetchSAM.mockResolvedValue({
      opportunities: [mockOpp as any],
      totalRecords: 1,
    });
    (prisma.procurementOpportunity.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.procurementOpportunity.create as jest.Mock).mockResolvedValue(mockOpp);

    const req = new NextRequest('http://example.com/api/procurement/opportunities', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await opportunitiesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.created).toBe(1);
    expect(body.data.updated).toBe(0);

    process.env.CRON_SECRET = originalEnv;
  });

  it('updates existing opportunities during sync', async () => {
    const originalEnv = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test-secret';

    const mockOpp = makeOpportunity();
    mockFetchSAM.mockResolvedValue({
      opportunities: [mockOpp as any],
      totalRecords: 1,
    });
    (prisma.procurementOpportunity.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-id' });
    (prisma.procurementOpportunity.update as jest.Mock).mockResolvedValue(mockOpp);

    const req = new NextRequest('http://example.com/api/procurement/opportunities', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await opportunitiesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.created).toBe(0);
    expect(body.data.updated).toBe(1);

    process.env.CRON_SECRET = originalEnv;
  });
});

// =============================================================================
// GET /api/procurement/sbir
// =============================================================================

describe('GET /api/procurement/sbir', () => {
  it('returns paginated SBIR solicitations with defaults', async () => {
    const solicitations = [makeSolicitation(), makeSolicitation({ id: 'sbir-2', topicTitle: 'Life Support Systems' })];
    (prisma.sBIRSolicitation.findMany as jest.Mock).mockResolvedValue(solicitations);
    (prisma.sBIRSolicitation.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/procurement/sbir');
    const res = await sbirGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.solicitations).toHaveLength(2);
    expect(body.data.total).toBe(2);
    expect(body.data.limit).toBe(25);
    expect(body.data.offset).toBe(0);
  });

  it('filters by agency', async () => {
    (prisma.sBIRSolicitation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sBIRSolicitation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/sbir?agency=DOD');
    await sbirGET(req);

    const findManyCall = (prisma.sBIRSolicitation.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.agency).toEqual({ contains: 'DOD', mode: 'insensitive' });
  });

  it('filters by program (uppercased)', async () => {
    (prisma.sBIRSolicitation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sBIRSolicitation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/sbir?program=sbir');
    await sbirGET(req);

    const findManyCall = (prisma.sBIRSolicitation.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.program).toBe('SBIR');
  });

  it('filters by isActive boolean', async () => {
    (prisma.sBIRSolicitation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sBIRSolicitation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/sbir?isActive=true');
    await sbirGET(req);

    const findManyCall = (prisma.sBIRSolicitation.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.isActive).toBe(true);
  });

  it('supports search across topicTitle, description, topicNumber', async () => {
    (prisma.sBIRSolicitation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sBIRSolicitation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/sbir?search=propulsion');
    await sbirGET(req);

    const findManyCall = (prisma.sBIRSolicitation.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { topicTitle: { contains: 'propulsion', mode: 'insensitive' } },
      { description: { contains: 'propulsion', mode: 'insensitive' } },
      { topicNumber: { contains: 'propulsion', mode: 'insensitive' } },
    ]);
  });

  it('returns empty results gracefully', async () => {
    (prisma.sBIRSolicitation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sBIRSolicitation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/sbir?agency=NonExistent');
    const res = await sbirGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.solicitations).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it('orders by closeDate descending', async () => {
    (prisma.sBIRSolicitation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sBIRSolicitation.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/sbir');
    await sbirGET(req);

    const findManyCall = (prisma.sBIRSolicitation.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ closeDate: 'desc' });
  });

  it('returns 500 when prisma throws', async () => {
    (prisma.sBIRSolicitation.findMany as jest.Mock).mockRejectedValue(new Error('Connection timeout'));
    (prisma.sBIRSolicitation.count as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

    const req = new NextRequest('http://localhost/api/procurement/sbir');
    const res = await sbirGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch SBIR solicitations');
  });
});

// =============================================================================
// GET /api/procurement/budget
// =============================================================================

describe('GET /api/procurement/budget', () => {
  it('returns budget items with aggregates', async () => {
    const items = [makeBudgetItem(), makeBudgetItem({ id: 'budget-2', category: 'Human Spaceflight' })];
    (prisma.spaceBudgetItem.findMany as jest.Mock).mockResolvedValue(items);
    (prisma.spaceBudgetItem.groupBy as jest.Mock).mockResolvedValue([
      {
        agency: 'NASA',
        fiscalYear: 2026,
        _sum: { requestAmount: 6000000000, enactedAmount: 5600000000, previousYear: 5200000000 },
      },
    ]);

    const req = new NextRequest('http://localhost/api/procurement/budget');
    const res = await budgetGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.budgetItems).toHaveLength(2);
    expect(body.data.aggregates).toHaveLength(1);
    expect(body.data.aggregates[0].totalRequest).toBe(6000000000);
    expect(body.data.total).toBe(2);
  });

  it('filters by agency', async () => {
    (prisma.spaceBudgetItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.spaceBudgetItem.groupBy as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/procurement/budget?agency=NASA');
    await budgetGET(req);

    const findManyCall = (prisma.spaceBudgetItem.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.agency).toEqual({ contains: 'NASA', mode: 'insensitive' });
  });

  it('filters by fiscalYear', async () => {
    (prisma.spaceBudgetItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.spaceBudgetItem.groupBy as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/procurement/budget?fiscalYear=2026');
    await budgetGET(req);

    const findManyCall = (prisma.spaceBudgetItem.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.fiscalYear).toBe(2026);
  });

  it('filters by category', async () => {
    (prisma.spaceBudgetItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.spaceBudgetItem.groupBy as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/procurement/budget?category=Science');
    await budgetGET(req);

    const findManyCall = (prisma.spaceBudgetItem.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.category).toEqual({ contains: 'Science', mode: 'insensitive' });
  });

  it('returns empty results gracefully', async () => {
    (prisma.spaceBudgetItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.spaceBudgetItem.groupBy as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/procurement/budget?agency=NonExistent');
    const res = await budgetGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.budgetItems).toEqual([]);
    expect(body.data.aggregates).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it('returns 500 when prisma throws', async () => {
    (prisma.spaceBudgetItem.findMany as jest.Mock).mockRejectedValue(new Error('DB timeout'));
    (prisma.spaceBudgetItem.groupBy as jest.Mock).mockRejectedValue(new Error('DB timeout'));

    const req = new NextRequest('http://localhost/api/procurement/budget');
    const res = await budgetGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch budget data');
  });
});

// =============================================================================
// GET /api/procurement/stats
// =============================================================================

describe('GET /api/procurement/stats', () => {
  function setupStatsMocks() {
    (prisma.procurementOpportunity.count as jest.Mock)
      .mockResolvedValueOnce(150)  // totalOpportunities
      .mockResolvedValueOnce(80)   // activeOpportunities
      .mockResolvedValueOnce(12);  // upcomingDeadlines
    (prisma.procurementOpportunity.groupBy as jest.Mock)
      .mockResolvedValueOnce([     // byAgency
        { agency: 'NASA', _count: { id: 50 } },
        { agency: 'DOD', _count: { id: 30 } },
      ])
      .mockResolvedValueOnce([     // byType
        { type: 'Solicitation', _count: { id: 60 } },
        { type: 'Award', _count: { id: 40 } },
      ]);
    (prisma.procurementOpportunity.aggregate as jest.Mock).mockResolvedValue({
      _avg: { estimatedValue: 750000, awardAmount: 600000 },
      _sum: { awardAmount: 48000000 },
      _count: { id: 80 },
    });
    (prisma.sBIRSolicitation.count as jest.Mock)
      .mockResolvedValueOnce(45)   // totalSBIR
      .mockResolvedValueOnce(20);  // activeSBIR
    (prisma.spaceBudgetItem.count as jest.Mock).mockResolvedValue(200);
    (prisma.congressionalActivity.count as jest.Mock).mockResolvedValue(35);
    (prisma.procurementOpportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpportunity(),
    ]);
  }

  it('returns aggregate statistics', async () => {
    setupStatsMocks();

    const res = await statsGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.overview.totalOpportunities).toBe(150);
    expect(body.data.overview.activeOpportunities).toBe(80);
    expect(body.data.overview.avgEstimatedValue).toBe(750000);
    expect(body.data.overview.totalAwardValue).toBe(48000000);
    expect(body.data.sbir.total).toBe(45);
    expect(body.data.sbir.active).toBe(20);
    expect(body.data.budget.totalItems).toBe(200);
    expect(body.data.congressional.totalActivities).toBe(35);
  });

  it('includes byAgency and byType breakdowns', async () => {
    setupStatsMocks();

    const res = await statsGET();
    const body = await res.json();

    expect(body.data.byAgency).toEqual([
      { agency: 'NASA', count: 50 },
      { agency: 'DOD', count: 30 },
    ]);
    expect(body.data.byType).toEqual([
      { type: 'Solicitation', count: 60 },
      { type: 'Award', count: 40 },
    ]);
  });

  it('includes recent opportunities', async () => {
    setupStatsMocks();

    const res = await statsGET();
    const body = await res.json();

    expect(body.data.recentOpportunities).toHaveLength(1);
  });

  it('returns cached data when available', async () => {
    const cachedStats = { overview: { totalOpportunities: 100 } };
    (apiCache.get as jest.Mock).mockReturnValue(cachedStats);

    const res = await statsGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(cachedStats);
    // Prisma should not be called when cache is hit
    expect(prisma.procurementOpportunity.count).not.toHaveBeenCalled();
  });

  it('sets cache after successful fetch', async () => {
    setupStatsMocks();

    await statsGET();

    expect(apiCache.set).toHaveBeenCalledWith(
      'procurement:stats',
      expect.objectContaining({ overview: expect.any(Object) }),
      expect.any(Number)
    );
  });

  it('returns 500 when prisma throws', async () => {
    (prisma.procurementOpportunity.count as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await statsGET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch procurement stats');
  });
});

// =============================================================================
// GET /api/procurement/congressional
// =============================================================================

describe('GET /api/procurement/congressional', () => {
  it('returns paginated congressional activities with defaults', async () => {
    const activities = [makeCongressionalActivity()];
    (prisma.congressionalActivity.findMany as jest.Mock).mockResolvedValue(activities);
    (prisma.congressionalActivity.count as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/procurement/congressional');
    const res = await congressionalGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.activities).toHaveLength(1);
    expect(body.data.total).toBe(1);
    expect(body.data.limit).toBe(25);
    expect(body.data.offset).toBe(0);
  });

  it('filters by type', async () => {
    (prisma.congressionalActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.congressionalActivity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/congressional?type=hearing');
    await congressionalGET(req);

    const findManyCall = (prisma.congressionalActivity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.type).toBe('hearing');
  });

  it('filters by committee', async () => {
    (prisma.congressionalActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.congressionalActivity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/congressional?committee=Senate%20Commerce');
    await congressionalGET(req);

    const findManyCall = (prisma.congressionalActivity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.committee).toEqual({ contains: 'Senate Commerce', mode: 'insensitive' });
  });

  it('filters by date range', async () => {
    (prisma.congressionalActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.congressionalActivity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest(
      'http://localhost/api/procurement/congressional?dateAfter=2026-01-01&dateBefore=2026-12-31'
    );
    await congressionalGET(req);

    const findManyCall = (prisma.congressionalActivity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.date).toBeDefined();
    expect(findManyCall.where.date.gte).toEqual(new Date('2026-01-01'));
    expect(findManyCall.where.date.lte).toEqual(new Date('2026-12-31'));
  });

  it('returns empty results gracefully', async () => {
    (prisma.congressionalActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.congressionalActivity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/congressional?type=nonexistent');
    const res = await congressionalGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.activities).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it('orders by date descending', async () => {
    (prisma.congressionalActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.congressionalActivity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/congressional');
    await congressionalGET(req);

    const findManyCall = (prisma.congressionalActivity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ date: 'desc' });
  });

  it('returns 500 when prisma throws', async () => {
    (prisma.congressionalActivity.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
    (prisma.congressionalActivity.count as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/procurement/congressional');
    const res = await congressionalGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch congressional activities');
  });
});

// =============================================================================
// GET /api/procurement/saved-searches (Auth-gated)
// =============================================================================

describe('GET /api/procurement/saved-searches', () => {
  it('returns 401 when not logged in', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches');
    const res = await savedSearchesGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 403 when user lacks subscription', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      trialTier: null,
      trialEndDate: null,
    });

    const req = new NextRequest('http://localhost/api/procurement/saved-searches');
    const res = await savedSearchesGET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('Pro or Enterprise');
  });

  it('allows access for Pro subscribers', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      trialTier: null,
      trialEndDate: null,
    });
    const searches = [makeSavedSearch()];
    (prisma.savedProcurementSearch.findMany as jest.Mock).mockResolvedValue(searches);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches');
    const res = await savedSearchesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.savedSearches).toHaveLength(1);
    expect(body.data.savedSearches[0].newMatchCount).toBe(2);
  });

  it('allows access for Enterprise subscribers', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      trialTier: null,
      trialEndDate: null,
    });
    (prisma.savedProcurementSearch.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches');
    const res = await savedSearchesGET(req);

    expect(res.status).toBe(200);
  });

  it('allows access during active trial', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'free',
      subscriptionStatus: null,
      trialTier: 'pro',
      trialEndDate: futureDate,
    });
    (prisma.savedProcurementSearch.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches');
    const res = await savedSearchesGET(req);

    expect(res.status).toBe(200);
  });

  it('returns 500 when prisma throws', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      trialTier: null,
      trialEndDate: null,
    });
    (prisma.savedProcurementSearch.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/procurement/saved-searches');
    const res = await savedSearchesGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe('Failed to fetch saved searches');
  });
});

// =============================================================================
// POST /api/procurement/saved-searches (Create)
// =============================================================================

describe('POST /api/procurement/saved-searches', () => {
  function setupProSession() {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      trialTier: null,
      trialEndDate: null,
    });
  }

  it('returns 401 when not logged in', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', filters: {}, alertEnabled: true }),
    });
    const res = await savedSearchesPOST(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks subscription', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'free',
      subscriptionStatus: null,
      trialTier: null,
      trialEndDate: null,
    });

    const req = new NextRequest('http://localhost/api/procurement/saved-searches', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', filters: {}, alertEnabled: true }),
    });
    const res = await savedSearchesPOST(req);

    expect(res.status).toBe(403);
  });

  it('creates a saved search successfully', async () => {
    setupProSession();
    (prisma.savedProcurementSearch.count as jest.Mock).mockResolvedValue(3);
    (prisma.savedProcurementSearch.create as jest.Mock).mockResolvedValue({
      id: 'new-search-1',
      userId: 'user-1',
      name: 'NASA Contracts',
      filters: { agencies: ['NASA'] },
      alertEnabled: true,
    });

    const req = new NextRequest('http://localhost/api/procurement/saved-searches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'NASA Contracts',
        filters: { agencies: ['NASA'] },
        alertEnabled: true,
      }),
    });
    const res = await savedSearchesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('NASA Contracts');
  });

  it('rejects when at maximum of 10 saved searches', async () => {
    setupProSession();
    (prisma.savedProcurementSearch.count as jest.Mock).mockResolvedValue(10);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Eleventh Search',
        filters: { agencies: [] },
        alertEnabled: true,
      }),
    });
    const res = await savedSearchesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('Maximum of 10');
  });

  it('rejects invalid body data', async () => {
    setupProSession();
    (prisma.savedProcurementSearch.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // missing name
        filters: {},
        alertEnabled: true,
      }),
    });
    const res = await savedSearchesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// PUT /api/procurement/saved-searches/[id] (Update)
// =============================================================================

describe('PUT /api/procurement/saved-searches/[id]', () => {
  it('returns 401 when not logged in', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/search-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const res = await savedSearchPUT(req, { params: { id: 'search-1' } });

    expect(res.status).toBe(401);
  });

  it('returns 404 when saved search does not exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.savedProcurementSearch.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/nonexistent', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const res = await savedSearchPUT(req, { params: { id: 'nonexistent' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.message).toContain('not found');
  });

  it('returns 401 when user does not own the saved search', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.savedProcurementSearch.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-2', // different user
    });

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/search-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const res = await savedSearchPUT(req, { params: { id: 'search-1' } });

    expect(res.status).toBe(401);
  });

  it('updates saved search successfully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.savedProcurementSearch.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
    });
    (prisma.savedProcurementSearch.update as jest.Mock).mockResolvedValue({
      id: 'search-1',
      name: 'Updated Name',
      filters: { agencies: ['NASA'] },
      alertEnabled: false,
    });

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/search-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name', alertEnabled: false }),
    });
    const res = await savedSearchPUT(req, { params: { id: 'search-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated Name');
  });
});

// =============================================================================
// DELETE /api/procurement/saved-searches/[id] (Delete)
// =============================================================================

describe('DELETE /api/procurement/saved-searches/[id]', () => {
  it('returns 401 when not logged in', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/search-1', {
      method: 'DELETE',
    });
    const res = await savedSearchDELETE(req, { params: { id: 'search-1' } });

    expect(res.status).toBe(401);
  });

  it('returns 404 when saved search does not exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.savedProcurementSearch.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/nonexistent', {
      method: 'DELETE',
    });
    const res = await savedSearchDELETE(req, { params: { id: 'nonexistent' } });

    expect(res.status).toBe(404);
  });

  it('returns 401 when user does not own the saved search', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.savedProcurementSearch.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-2',
    });

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/search-1', {
      method: 'DELETE',
    });
    const res = await savedSearchDELETE(req, { params: { id: 'search-1' } });

    expect(res.status).toBe(401);
  });

  it('deletes saved search successfully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.savedProcurementSearch.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
    });
    (prisma.savedProcurementSearch.delete as jest.Mock).mockResolvedValue({ id: 'search-1' });

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/search-1', {
      method: 'DELETE',
    });
    const res = await savedSearchDELETE(req, { params: { id: 'search-1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });

  it('returns 500 when prisma throws during delete', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    (prisma.savedProcurementSearch.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
    });
    (prisma.savedProcurementSearch.delete as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/procurement/saved-searches/search-1', {
      method: 'DELETE',
    });
    const res = await savedSearchDELETE(req, { params: { id: 'search-1' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe('Failed to delete saved search');
  });
});
