/**
 * @jest-environment node
 */

/**
 * API route handler tests for workforce endpoints:
 *   - GET/POST /api/workforce/worker-profiles
 *   - GET/POST /api/workforce/gigs
 *   - GET/POST /api/workforce/employer-profiles
 *
 * Validates filtering, pagination, auth, validation (including empty-URL edge cases),
 * and correct response shapes.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    workerProfile: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    gigOpportunity: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    employerProfile: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';

import {
  GET as workerProfilesGET,
  POST as workerProfilesPOST,
} from '@/app/api/workforce/worker-profiles/route';

import {
  GET as gigsGET,
  POST as gigsPOST,
} from '@/app/api/workforce/gigs/route';

import {
  GET as employerProfilesGET,
  POST as employerProfilesPOST,
} from '@/app/api/workforce/employer-profiles/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function makeWorkerProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wp-1',
    displayName: 'Jane Doe',
    headline: 'Orbital Mechanics Engineer',
    skills: ['python', 'stk', 'matlab'],
    experienceYears: 8,
    hourlyRate: 150,
    availability: 'available',
    workType: ['freelance', 'consulting'],
    location: 'Houston, TX',
    remoteOk: true,
    clearanceLevel: null,
    createdAt: new Date('2025-06-01'),
    ...overrides,
  };
}

function makeGig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gig-1',
    title: 'Mission Planning Consultant',
    description: 'We need an experienced mission planner for a LEO sat deployment.',
    category: 'engineering',
    skills: ['mission-planning', 'stk'],
    workType: 'contract',
    duration: '3 months',
    hoursPerWeek: 20,
    budgetMin: 5000,
    budgetMax: 10000,
    budgetType: 'monthly',
    location: null,
    remoteOk: true,
    clearanceRequired: false,
    isActive: true,
    createdAt: new Date('2025-07-01'),
    employer: {
      id: 'emp-1',
      companyName: 'Orbital Dynamics LLC',
      companySlug: 'orbital-dynamics',
      logoUrl: null,
      verified: true,
    },
    ...overrides,
  };
}

function makeEmployerProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'emp-1',
    companyName: 'Orbital Dynamics LLC',
    companySlug: 'orbital-dynamics',
    description: 'Satellite constellation operator',
    website: 'https://orbitaldyn.com',
    industry: 'Space Operations',
    size: 'small',
    location: 'Boulder, CO',
    logoUrl: null,
    verified: true,
    createdAt: new Date('2025-05-01'),
    _count: { gigs: 3 },
    ...overrides,
  };
}

function makeValidWorkerBody(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Jane Doe',
    headline: 'Orbital Mechanics Engineer',
    skills: ['python', 'stk'],
    workType: ['freelance'],
    availability: 'available',
    remoteOk: true,
    visible: true,
    ...overrides,
  };
}

function makeValidGigBody(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Mission Planning Consultant',
    description: 'We need an experienced mission planner for our upcoming LEO sat deployment program.',
    category: 'engineering',
    skills: ['mission-planning'],
    workType: 'contract',
    budgetType: 'hourly',
    remoteOk: true,
    clearanceRequired: false,
    ...overrides,
  };
}

function makeValidEmployerBody(overrides: Record<string, unknown> = {}) {
  return {
    companyName: 'Orbital Dynamics LLC',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/workforce/worker-profiles
// =============================================================================

describe('GET /api/workforce/worker-profiles', () => {
  it('returns empty array when no profiles exist', async () => {
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles');
    const res = await workerProfilesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.profiles).toHaveLength(0);
    expect(body.data.total).toBe(0);
    expect(body.data.hasMore).toBe(false);
  });

  it('returns profiles with correct shape', async () => {
    const profiles = [makeWorkerProfile(), makeWorkerProfile({ id: 'wp-2', displayName: 'John Smith' })];
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue(profiles);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(2);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles');
    const res = await workerProfilesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.profiles).toHaveLength(2);
    expect(body.data.profiles[0]).toHaveProperty('id');
    expect(body.data.profiles[0]).toHaveProperty('displayName');
    expect(body.data.profiles[0]).toHaveProperty('headline');
    expect(body.data.profiles[0]).toHaveProperty('skills');
    expect(body.data.profiles[0]).toHaveProperty('availability');
    expect(body.data.profiles[0]).toHaveProperty('workType');
    expect(body.data.profiles[0]).toHaveProperty('remoteOk');
    expect(body.data.total).toBe(2);
  });

  it('returns { success: true, data: { profiles, total, hasMore } } shape', async () => {
    const profiles = Array.from({ length: 20 }, (_, i) =>
      makeWorkerProfile({ id: `wp-${i}` })
    );
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue(profiles);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(25);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles');
    const res = await workerProfilesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('profiles');
    expect(body.data).toHaveProperty('total', 25);
    expect(body.data).toHaveProperty('hasMore', true);
    expect(Array.isArray(body.data.profiles)).toBe(true);
    expect(body.data.profiles).toHaveLength(20);
  });

  it('filters by availability', async () => {
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles?availability=part_time');
    await workerProfilesGET(req);

    const findManyCall = (mockPrisma.workerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.availability).toBe('part_time');
  });

  it('ignores invalid availability values', async () => {
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles?availability=hacker');
    await workerProfilesGET(req);

    const findManyCall = (mockPrisma.workerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.availability).toBeUndefined();
  });

  it('filters by skills (hasSome)', async () => {
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles?skills=python,matlab');
    await workerProfilesGET(req);

    const findManyCall = (mockPrisma.workerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.skills).toEqual({ hasSome: ['python', 'matlab'] });
  });

  it('filters by remoteOnly', async () => {
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles?remoteOnly=true');
    await workerProfilesGET(req);

    const findManyCall = (mockPrisma.workerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.remoteOk).toBe(true);
  });

  it('filters by search term across displayName, headline, bio, and skills', async () => {
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles?search=orbital');
    await workerProfilesGET(req);

    const findManyCall = (mockPrisma.workerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { displayName: { contains: 'orbital', mode: 'insensitive' } },
      { headline: { contains: 'orbital', mode: 'insensitive' } },
      { bio: { contains: 'orbital', mode: 'insensitive' } },
      { skills: { hasSome: ['orbital'] } },
    ]);
  });

  it('handles pagination (limit, offset)', async () => {
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles?limit=5&offset=10');
    await workerProfilesGET(req);

    expect(mockPrisma.workerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 })
    );
  });

  it('filters by workType (hasSome)', async () => {
    (mockPrisma.workerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.workerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles?workType=consulting');
    await workerProfilesGET(req);

    const findManyCall = (mockPrisma.workerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.workType).toEqual({ hasSome: ['consulting'] });
  });
});

// =============================================================================
// POST /api/workforce/worker-profiles
// =============================================================================

describe('POST /api/workforce/worker-profiles', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(makeValidWorkerBody()),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('creates profile with valid data (all fields)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const fullBody = makeValidWorkerBody({
      bio: 'Experienced engineer',
      experienceYears: 10,
      hourlyRate: 200,
      linkedInUrl: 'https://linkedin.com/in/janedoe',
      portfolioUrl: 'https://janedoe.dev',
      location: 'Houston, TX',
      clearanceLevel: 'secret',
    });
    const createdProfile = makeWorkerProfile({ userId: 'user-1' });
    (mockPrisma.workerProfile.upsert as jest.Mock).mockResolvedValue(createdProfile);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(fullBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.profile).toBeDefined();
    expect(body.data.profile.id).toBe('wp-1');
  });

  it('creates profile with minimal data (required fields only)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const minimalBody = makeValidWorkerBody();
    const createdProfile = makeWorkerProfile({ userId: 'user-1' });
    (mockPrisma.workerProfile.upsert as jest.Mock).mockResolvedValue(createdProfile);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(minimalBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.profile).toBeDefined();
  });

  it('handles empty linkedInUrl gracefully (should not fail with "Invalid URL")', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyWithEmptyUrl = makeValidWorkerBody({ linkedInUrl: '' });
    const createdProfile = makeWorkerProfile({ userId: 'user-1', linkedInUrl: null });
    (mockPrisma.workerProfile.upsert as jest.Mock).mockResolvedValue(createdProfile);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyWithEmptyUrl),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    // The z.preprocess coerces '' → null, so validation should pass
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('handles empty portfolioUrl gracefully', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyWithEmptyUrl = makeValidWorkerBody({ portfolioUrl: '' });
    const createdProfile = makeWorkerProfile({ userId: 'user-1', portfolioUrl: null });
    (mockPrisma.workerProfile.upsert as jest.Mock).mockResolvedValue(createdProfile);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyWithEmptyUrl),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('handles both linkedInUrl and portfolioUrl being empty strings simultaneously', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyWithEmptyUrls = makeValidWorkerBody({ linkedInUrl: '', portfolioUrl: '' });
    const createdProfile = makeWorkerProfile({ userId: 'user-1', linkedInUrl: null, portfolioUrl: null });
    (mockPrisma.workerProfile.upsert as jest.Mock).mockResolvedValue(createdProfile);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyWithEmptyUrls),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('requires displayName (validation error if missing)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyNoName = makeValidWorkerBody();
    delete (bodyNoName as Record<string, unknown>).displayName;

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyNoName),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires headline (validation error if missing)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyNoHeadline = makeValidWorkerBody();
    delete (bodyNoHeadline as Record<string, unknown>).headline;

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyNoHeadline),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires at least one skill', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyNoSkills = makeValidWorkerBody({ skills: [] });

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyNoSkills),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires at least one workType', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyNoWorkType = makeValidWorkerBody({ workType: [] });

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyNoWorkType),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts hourlyRate of 0 (negotiable)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyZeroRate = makeValidWorkerBody({ hourlyRate: 0 });
    const createdProfile = makeWorkerProfile({ userId: 'user-1', hourlyRate: 0 });
    (mockPrisma.workerProfile.upsert as jest.Mock).mockResolvedValue(createdProfile);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyZeroRate),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('accepts null hourlyRate', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyNullRate = makeValidWorkerBody({ hourlyRate: null });
    const createdProfile = makeWorkerProfile({ userId: 'user-1', hourlyRate: null });
    (mockPrisma.workerProfile.upsert as jest.Mock).mockResolvedValue(createdProfile);

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyNullRate),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns proper error shape on validation failure (error.message is a string, not [object Object])', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    // Send completely invalid body
    const invalidBody = { foo: 'bar' };

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(invalidBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    expect(typeof body.error.message).toBe('string');
    expect(body.error.message).not.toBe('[object Object]');
    expect(body.error.message.length).toBeGreaterThan(0);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid linkedInUrl that is not empty', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyBadUrl = makeValidWorkerBody({ linkedInUrl: 'not-a-url' });

    const req = new NextRequest('http://localhost/api/workforce/worker-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyBadUrl),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await workerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

// =============================================================================
// GET /api/workforce/gigs
// =============================================================================

describe('GET /api/workforce/gigs', () => {
  it('returns empty array when no gigs exist', async () => {
    (mockPrisma.gigOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.gigOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/gigs');
    const res = await gigsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.gigs).toHaveLength(0);
    expect(body.data.total).toBe(0);
    expect(body.data.hasMore).toBe(false);
  });

  it('returns gigs with correct shape including employer', async () => {
    const gigs = [makeGig()];
    (mockPrisma.gigOpportunity.findMany as jest.Mock).mockResolvedValue(gigs);
    (mockPrisma.gigOpportunity.count as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/workforce/gigs');
    const res = await gigsGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.gigs).toHaveLength(1);
    expect(body.data.gigs[0]).toHaveProperty('id');
    expect(body.data.gigs[0]).toHaveProperty('title');
    expect(body.data.gigs[0]).toHaveProperty('description');
    expect(body.data.gigs[0]).toHaveProperty('employer');
    expect(body.data.gigs[0].employer).toHaveProperty('companyName');
    expect(body.data.gigs[0].employer).toHaveProperty('verified');
  });

  it('filters by category', async () => {
    (mockPrisma.gigOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.gigOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/gigs?category=engineering');
    await gigsGET(req);

    const findManyCall = (mockPrisma.gigOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.category).toBe('engineering');
  });

  it('filters by workType', async () => {
    (mockPrisma.gigOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.gigOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/gigs?workType=contract');
    await gigsGET(req);

    const findManyCall = (mockPrisma.gigOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.workType).toBe('contract');
  });

  it('filters by remoteOnly', async () => {
    (mockPrisma.gigOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.gigOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/gigs?remoteOnly=true');
    await gigsGET(req);

    const findManyCall = (mockPrisma.gigOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.remoteOk).toBe(true);
  });

  it('filters by search term', async () => {
    (mockPrisma.gigOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.gigOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/gigs?search=satellite');
    await gigsGET(req);

    const findManyCall = (mockPrisma.gigOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { title: { contains: 'satellite', mode: 'insensitive' } },
      { description: { contains: 'satellite', mode: 'insensitive' } },
      { skills: { hasSome: ['satellite'] } },
    ]);
  });

  it('handles pagination', async () => {
    (mockPrisma.gigOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.gigOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/gigs?limit=10&offset=20');
    await gigsGET(req);

    expect(mockPrisma.gigOpportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });

  it('only returns active gigs by default', async () => {
    (mockPrisma.gigOpportunity.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.gigOpportunity.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/gigs');
    await gigsGET(req);

    const findManyCall = (mockPrisma.gigOpportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.isActive).toBe(true);
  });
});

// =============================================================================
// POST /api/workforce/gigs
// =============================================================================

describe('POST /api/workforce/gigs', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/workforce/gigs', {
      method: 'POST',
      body: JSON.stringify(makeValidGigBody()),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await gigsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('requires an employer profile before posting gigs', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    (mockPrisma.employerProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/workforce/gigs', {
      method: 'POST',
      body: JSON.stringify(makeValidGigBody()),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await gigsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('employer profile');
  });

  it('creates gig with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    (mockPrisma.employerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1', userId: 'user-1' });
    const createdGig = makeGig();
    (mockPrisma.gigOpportunity.create as jest.Mock).mockResolvedValue(createdGig);

    const req = new NextRequest('http://localhost/api/workforce/gigs', {
      method: 'POST',
      body: JSON.stringify(makeValidGigBody()),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await gigsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.gig).toBeDefined();
    expect(body.data.gig.id).toBe('gig-1');
    expect(body.data.gig.title).toBe('Mission Planning Consultant');
  });

  it('requires title and description', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    (mockPrisma.employerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1', userId: 'user-1' });

    const bodyNoTitle = makeValidGigBody();
    delete (bodyNoTitle as Record<string, unknown>).title;

    const req = new NextRequest('http://localhost/api/workforce/gigs', {
      method: 'POST',
      body: JSON.stringify(bodyNoTitle),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await gigsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects description shorter than 10 characters', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    (mockPrisma.employerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1', userId: 'user-1' });

    const bodyShortDesc = makeValidGigBody({ description: 'Short' });

    const req = new NextRequest('http://localhost/api/workforce/gigs', {
      method: 'POST',
      body: JSON.stringify(bodyShortDesc),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await gigsPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

// =============================================================================
// GET /api/workforce/employer-profiles
// =============================================================================

describe('GET /api/workforce/employer-profiles', () => {
  it('returns empty array when no employer profiles exist', async () => {
    (mockPrisma.employerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.employerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles');
    const res = await employerProfilesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.employers).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });

  it('returns employer profiles with correct shape', async () => {
    const employers = [makeEmployerProfile()];
    (mockPrisma.employerProfile.findMany as jest.Mock).mockResolvedValue(employers);
    (mockPrisma.employerProfile.count as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles');
    const res = await employerProfilesGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.employers[0]).toHaveProperty('companyName');
    expect(body.data.employers[0]).toHaveProperty('industry');
    expect(body.data.employers[0]).toHaveProperty('verified');
    expect(body.data.employers[0]).toHaveProperty('_count');
  });

  it('filters by industry', async () => {
    (mockPrisma.employerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.employerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles?industry=Space%20Operations');
    await employerProfilesGET(req);

    const findManyCall = (mockPrisma.employerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.industry).toBe('Space Operations');
  });

  it('filters by size', async () => {
    (mockPrisma.employerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.employerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles?size=startup');
    await employerProfilesGET(req);

    const findManyCall = (mockPrisma.employerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.size).toBe('startup');
  });

  it('filters by search term', async () => {
    (mockPrisma.employerProfile.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.employerProfile.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles?search=orbital');
    await employerProfilesGET(req);

    const findManyCall = (mockPrisma.employerProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { companyName: { contains: 'orbital', mode: 'insensitive' } },
      { description: { contains: 'orbital', mode: 'insensitive' } },
      { industry: { contains: 'orbital', mode: 'insensitive' } },
    ]);
  });
});

// =============================================================================
// POST /api/workforce/employer-profiles
// =============================================================================

describe('POST /api/workforce/employer-profiles', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles', {
      method: 'POST',
      body: JSON.stringify(makeValidEmployerBody()),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await employerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('creates employer profile with valid data', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const fullBody = makeValidEmployerBody({
      description: 'Leading satellite operator',
      website: 'https://orbital.com',
      industry: 'Space Operations',
      size: 'medium',
      location: 'Boulder, CO',
    });
    const created = makeEmployerProfile({ userId: 'user-1' });
    (mockPrisma.employerProfile.upsert as jest.Mock).mockResolvedValue(created);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles', {
      method: 'POST',
      body: JSON.stringify(fullBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await employerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.profile).toBeDefined();
    expect(body.data.profile.companyName).toBe('Orbital Dynamics LLC');
  });

  it('requires companyName', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const bodyNoName = {};

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles', {
      method: 'POST',
      body: JSON.stringify(bodyNoName),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await employerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates employer profile with minimal data (companyName only)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);
    const created = makeEmployerProfile({ userId: 'user-1' });
    (mockPrisma.employerProfile.upsert as jest.Mock).mockResolvedValue(created);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'Test Corp' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await employerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns proper error shape on validation failure', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } } as never);

    const req = new NextRequest('http://localhost/api/workforce/employer-profiles', {
      method: 'POST',
      body: JSON.stringify({ companyName: '', website: 'not-a-url' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await employerProfilesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(typeof body.error.message).toBe('string');
    expect(body.error.message).not.toBe('[object Object]');
  });
});
