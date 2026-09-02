/**
 * @jest-environment node
 *
 * GET /api/space-tycoon/market/flows — 401 for anonymous callers, 403 with
 * no game profile, 429 past the per-profile throttle, and the report shape
 * for a signed-in player.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { gameProfile: { findUnique: jest.fn() } },
}));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/game/flow-map', () => {
  const actual = jest.requireActual('@/lib/game/flow-map');
  return { ...actual, getFlowMap: jest.fn() };
});

import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { getFlowMap } from '@/lib/game/flow-map';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import { GET } from '@/app/api/space-tycoon/market/flows/route';

const mockSession = getServerSession as jest.Mock;
const mockFindUnique = (prisma as unknown as { gameProfile: { findUnique: jest.Mock } }).gameProfile.findUnique;
const mockGetFlowMap = getFlowMap as jest.Mock;

const req = (qs = '') => new NextRequest(`http://localhost/api/space-tycoon/market/flows${qs}`);

const REPORT = {
  asOf: new Date().toISOString(), windowDays: 7, resource: null,
  production: [], productionNote: '', consumption: { perLocation: null, reason: 'r', world: [], note: '' },
  lanes: [], lanesNote: '', tollsByZone: [], exporters: [], importers: [],
  chokepoints: [], chokepointNote: '', concentrationRuleAvailable: false, npcShare: [], missing: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetRouteThrottle();
  mockGetFlowMap.mockResolvedValue(REPORT);
});

describe('GET /api/space-tycoon/market/flows', () => {
  it('401 for anonymous callers', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mockGetFlowMap).not.toHaveBeenCalled();
  });

  it('403 when the user has no game profile', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it('200 with the report shape, passing resource/days through', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    mockFindUnique.mockResolvedValue({ id: 'p1' });
    const res = await GET(req('?resource=iron&days=30'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toMatch(/private/);
    const body = await res.json();
    expect(body).toMatchObject({ windowDays: 7, concentrationRuleAvailable: false });
    expect(Array.isArray(body.lanes)).toBe(true);
    expect(Array.isArray(body.exporters)).toBe(true);
    expect(body.consumption.perLocation).toBeNull();
    expect(mockGetFlowMap).toHaveBeenCalledWith({ windowDays: 30, resource: 'iron' });
  });

  it('429 past 20 requests per minute per profile', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    mockFindUnique.mockResolvedValue({ id: 'p1' });
    for (let i = 0; i < 20; i++) expect((await GET(req())).status).toBe(200);
    const res = await GET(req());
    expect(res.status).toBe(429);
    expect((await res.json()).routeKey).toBe('market-flows');
  });
});
