/**
 * @jest-environment node
 *
 * GET /api/space-tycoon/traffic — 401 for anonymous callers, 403 with no
 * game profile, 429 past the per-profile throttle; QA profiles excluded at
 * the query, the reveal query scoped to succeeded + unexpired
 * FLEET_REVEAL_ACTIONS missions, own ships out, identity only with intel.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    gameProfile: { findUnique: jest.fn(), findMany: jest.fn() },
    espionageMission: { findMany: jest.fn() },
  },
}));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { __resetRouteThrottle } from '@/lib/game/route-throttle';
import { __resetTrafficPoolCache } from '@/lib/game/ship-traffic-server';
import { QA_EMAIL_DOMAIN } from '@/lib/qa-accounts';
import { GET } from '@/app/api/space-tycoon/traffic/route';

const mockSession = getServerSession as jest.Mock;
const db = prisma as unknown as {
  gameProfile: { findUnique: jest.Mock; findMany: jest.Mock };
  espionageMission: { findMany: jest.Mock };
};

const NOW = Date.now();
const transitShip = (instanceId: string) => ({
  instanceId, definitionId: 'freighter', name: 'x', status: 'in_transit', currentLocation: 'leo', isBuilt: true,
  route: { from: 'leo', to: 'lunar_orbit', departedAtMs: NOW - 10_000, arrivalAtMs: NOW + 50_000, cargo: { metal: 10 } },
});

beforeEach(() => {
  jest.clearAllMocks();
  __resetRouteThrottle();
  __resetTrafficPoolCache();
  db.gameProfile.findMany.mockResolvedValue([
    { id: 'me', companyName: 'My Corp', shipsData: [transitShip('mine-1')] },
    { id: 'p1', companyName: 'Acme Haulage', shipsData: [transitShip('acme-1')] },
  ]);
  db.espionageMission.findMany.mockResolvedValue([]);
});

const signedIn = () => {
  mockSession.mockResolvedValue({ user: { id: 'u1' } });
  db.gameProfile.findUnique.mockResolvedValue({ id: 'me', unlockedLocationsList: ['earth_surface', 'leo'], hqLocationId: 'earth_surface' });
};

describe('GET /api/space-tycoon/traffic', () => {
  it('401 for anonymous callers', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(db.gameProfile.findMany).not.toHaveBeenCalled();
  });

  it('403 when the user has no game profile', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    db.gameProfile.findUnique.mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
  });

  it('returns anonymised contacts, excludes QA profiles at the query and the requester\'s own ships', async () => {
    signedIn();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    const where = db.gameProfile.findMany.mock.calls[0][0].where;
    expect(where.user.email.not.endsWith).toBe(QA_EMAIL_DOMAIN);
    expect(where.lastSyncAt.gte).toBeInstanceOf(Date);
    const players = body.contacts.filter((c: { npc?: boolean }) => !c.npc);
    expect(players).toHaveLength(1);
    expect(players[0]).toMatchObject({ hullClass: 'freighter', status: 'transit', laneA: 'leo', laneB: 'lunar_orbit' });
    const json = JSON.stringify(body);
    expect(json).not.toContain('Acme');
    expect(json).not.toContain('My Corp');
    expect(json).not.toContain('acme-1');
    expect(json).not.toContain('mine-1');
    expect(body.revealed).toBe(0);
    expect(body.contacts.some((c: { npc?: boolean }) => c.npc)).toBe(true);
  });

  it('scopes the reveal query to succeeded, unexpired fleet-reveal missions and attaches identity', async () => {
    signedIn();
    db.espionageMission.findMany.mockResolvedValue([{ targetId: 'p1' }]);
    const res = await GET();
    const body = await res.json();
    const where = db.espionageMission.findMany.mock.calls[0][0].where;
    expect(where.attackerId).toBe('me');
    expect(where.succeeded).toBe(true);
    expect(where.actionType.in).toEqual(expect.arrayContaining(['fleet_tracking', 'trade_route_intel']));
    expect(where.intelExpiresAt.gt).toBeInstanceOf(Date);
    expect(where.intelExpiresAt.gt.getTime()).toBeGreaterThanOrEqual(NOW - 1000);
    const revealed = body.contacts.filter((c: { intel?: unknown }) => c.intel);
    expect(revealed).toHaveLength(1);
    expect(revealed[0].intel).toMatchObject({ corpId: 'p1', corpName: 'Acme Haulage', destinationId: 'lunar_orbit' });
    expect(body.revealed).toBe(1);
  });

  it('429 past 30 requests a minute for one profile', async () => {
    signedIn();
    for (let i = 0; i < 30; i++) expect((await GET()).status).toBe(200);
    const res = await GET();
    expect(res.status).toBe(429);
  });
});
