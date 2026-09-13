/**
 * @jest-environment node
 *
 * /api/launch-day/[eventId]/live-blog — the admin gate and the append-only
 * guarantee. Prisma and next-auth are mocked; nothing touches a database.
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    launchLiveEntry: { findMany: jest.fn(), create: jest.fn() },
    spaceEvent: { findUnique: jest.fn() },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import * as route from '@/app/api/launch-day/[eventId]/live-blog/route';

const mockPrisma = prisma as unknown as {
  launchLiveEntry: { findMany: jest.Mock; create: jest.Mock };
  spaceEvent: { findUnique: jest.Mock };
};
const mockSession = getServerSession as jest.Mock;

const params = Promise.resolve({ eventId: 'e1' });

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://spacenexus.us/api/launch-day/e1/live-blog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  body: 'Range is green.',
  linkUrl: null,
  linkLabel: null,
  imageUrl: null,
  kind: 'update',
  createdAt: new Date('2026-09-14T17:30:00Z'),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.CRON_SECRET;
  mockPrisma.spaceEvent.findUnique.mockResolvedValue({ id: 'e1' });
});

describe('append-only by construction', () => {
  it('exports only GET and POST — no edit or delete handler exists', () => {
    expect(typeof route.GET).toBe('function');
    expect(typeof route.POST).toBe('function');
    for (const verb of ['PUT', 'PATCH', 'DELETE']) {
      expect((route as Record<string, unknown>)[verb]).toBeUndefined();
    }
  });
});

describe('POST — the admin gate', () => {
  it('401s an anonymous caller', async () => {
    mockSession.mockResolvedValue(null);
    const res = await route.POST(post({ body: 'hello' }), { params });
    expect(res.status).toBe(401);
    expect(mockPrisma.launchLiveEntry.create).not.toHaveBeenCalled();
  });

  it('403s a signed-in non-admin', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1', isAdmin: false } });
    const res = await route.POST(post({ body: 'hello' }), { params });
    expect(res.status).toBe(403);
    expect(mockPrisma.launchLiveEntry.create).not.toHaveBeenCalled();
  });

  it('accepts an admin and records the author', async () => {
    mockSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    mockPrisma.launchLiveEntry.create.mockResolvedValue(row());
    const res = await route.POST(post({ body: '  Range is <b>green</b>.  ' }), { params });
    expect(res.status).toBe(201);
    expect(mockPrisma.launchLiveEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventId: 'e1', body: 'Range is green.', authorId: 'admin-1', kind: 'update' }),
      }),
    );
  });

  it('accepts the cron bearer without a session', async () => {
    process.env.CRON_SECRET = 's3cret';
    mockSession.mockResolvedValue(null);
    mockPrisma.launchLiveEntry.create.mockResolvedValue(row());
    const res = await route.POST(post({ body: 'Auto entry' }, { authorization: 'Bearer s3cret' }), { params });
    expect(res.status).toBe(201);
    expect(mockSession).not.toHaveBeenCalled();
    expect(mockPrisma.launchLiveEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorId: null }) }),
    );
  });

  it('rejects a wrong bearer', async () => {
    process.env.CRON_SECRET = 's3cret';
    mockSession.mockResolvedValue(null);
    const res = await route.POST(post({ body: 'nope' }, { authorization: 'Bearer wrong' }), { params });
    expect(res.status).toBe(401);
  });

  it('400s an empty body', async () => {
    mockSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    const res = await route.POST(post({ body: '   ' }), { params });
    expect(res.status).toBe(400);
  });

  it('400s an unknown launch', async () => {
    mockSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    mockPrisma.spaceEvent.findUnique.mockResolvedValue(null);
    const res = await route.POST(post({ body: 'hello' }), { params });
    expect(res.status).toBe(400);
    expect(mockPrisma.launchLiveEntry.create).not.toHaveBeenCalled();
  });
});

describe('GET', () => {
  it('returns entries newest first', async () => {
    mockPrisma.launchLiveEntry.findMany.mockResolvedValue([
      row({ id: 'a', createdAt: new Date('2026-09-14T17:10:00Z') }),
      row({ id: 'b', createdAt: new Date('2026-09-14T17:40:00Z') }),
    ]);
    const res = await route.GET(new NextRequest('https://spacenexus.us/api/launch-day/e1/live-blog'), { params });
    const json = await res.json();
    expect(json.data.entries.map((e: { id: string }) => e.id)).toEqual(['b', 'a']);
    expect(json.data.latestAt).toBe('2026-09-14T17:40:00.000Z');
  });

  it('never caches — the page polls it', async () => {
    mockPrisma.launchLiveEntry.findMany.mockResolvedValue([]);
    const res = await route.GET(new NextRequest('https://spacenexus.us/api/launch-day/e1/live-blog'), { params });
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('renders an empty blog rather than a 500 when the table is missing', async () => {
    mockPrisma.launchLiveEntry.findMany.mockRejectedValue(new Error('relation does not exist'));
    const res = await route.GET(new NextRequest('https://spacenexus.us/api/launch-day/e1/live-blog'), { params });
    expect(res.status).toBe(200);
    expect((await res.json()).data.entries).toEqual([]);
  });
});
