/**
 * @jest-environment node
 */

/**
 * API route handler tests for notification endpoints:
 *   - GET   /api/notifications          (list notifications for current user)
 *   - PATCH /api/notifications          (mark multiple notifications as read)
 *   - PATCH /api/notifications/[id]     (mark single notification as read)
 *   - POST  /api/notifications/read-all (mark all unread notifications as read)
 *
 * Validates authentication checks, pagination, filtering, ownership enforcement,
 * and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';

import { GET, PATCH as listPATCH } from '@/app/api/notifications/route';
import { PATCH as singlePATCH } from '@/app/api/notifications/[id]/route';
import { POST as readAllPOST } from '@/app/api/notifications/read-all/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockGetServerSession = getServerSession as jest.Mock;
const mockPrisma = prisma as unknown as {
  notification: {
    findMany: jest.Mock;
    count: jest.Mock;
    updateMany: jest.Mock;
  };
};

function authenticatedSession(userId = 'user-1') {
  return { user: { id: userId, email: 'test@example.com', name: 'Test User' } };
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'THREAD_REPLY',
    title: 'New reply to your thread',
    message: 'Someone replied to your thread',
    read: false,
    linkUrl: '/community/forums/general/thread-1',
    createdAt: new Date('2026-02-20T10:00:00Z'),
    updatedAt: new Date('2026-02-20T10:00:00Z'),
    ...overrides,
  };
}

function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

function makePatchRequest(url: string, body?: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function makePostRequest(url: string) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/notifications
// =============================================================================

describe('GET /api/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/notifications');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns notifications ordered by createdAt desc with unread count', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    const notifications = [
      makeNotification({ id: 'notif-2', createdAt: new Date('2026-02-21T10:00:00Z') }),
      makeNotification({ id: 'notif-1', createdAt: new Date('2026-02-20T10:00:00Z') }),
    ];

    mockPrisma.notification.findMany.mockResolvedValue(notifications);
    mockPrisma.notification.count.mockResolvedValue(5);

    const req = makeGetRequest('http://localhost/api/notifications');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notifications).toHaveLength(2);
    expect(body.unreadCount).toBe(5);

    // Verify findMany was called with correct ordering and user filter
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 20, // default limit
    });

    // Verify count was called for unread notifications
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', read: false },
    });
  });

  it('applies unread filter when ?unread=true is set', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/notifications?unread=true');
    const res = await GET(req);

    expect(res.status).toBe(200);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', read: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  });

  it('does not apply unread filter when ?unread is not "true"', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/notifications?unread=false');
    const res = await GET(req);

    expect(res.status).toBe(200);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  });

  it('respects custom limit parameter', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/notifications?limit=10');
    const res = await GET(req);

    expect(res.status).toBe(200);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it('caps limit at 50', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/notifications?limit=200');
    const res = await GET(req);

    expect(res.status).toBe(200);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });

  it('defaults limit to 20 for non-numeric values', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/notifications?limit=abc');
    const res = await GET(req);

    expect(res.status).toBe(200);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 })
    );
  });

  it('enforces minimum limit of 1', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/notifications?limit=-5');
    const res = await GET(req);

    expect(res.status).toBe(200);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.findMany.mockRejectedValue(new Error('DB connection failed'));

    const req = makeGetRequest('http://localhost/api/notifications');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// =============================================================================
// PATCH /api/notifications (mark multiple as read)
// =============================================================================

describe('PATCH /api/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePatchRequest('http://localhost/api/notifications', {
      ids: ['notif-1'],
    });
    const res = await listPATCH(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('marks multiple notifications as read', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

    const req = makePatchRequest('http://localhost/api/notifications', {
      ids: ['notif-1', 'notif-2'],
    });
    const res = await listPATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.updatedCount).toBe(2);

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['notif-1', 'notif-2'] },
        userId: 'user-1',
      },
      data: {
        read: true,
      },
    });
  });

  it('returns validation error when ids is not an array', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    const req = makePatchRequest('http://localhost/api/notifications', {
      ids: 'notif-1',
    });
    const res = await listPATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('non-empty array');
  });

  it('returns validation error when ids is an empty array', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    const req = makePatchRequest('http://localhost/api/notifications', {
      ids: [],
    });
    const res = await listPATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation error when ids contains non-string values', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    const req = makePatchRequest('http://localhost/api/notifications', {
      ids: [123, null],
    });
    const res = await listPATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('non-empty string');
  });

  it('returns validation error when ids contains empty strings', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    const req = makePatchRequest('http://localhost/api/notifications', {
      ids: ['notif-1', ''],
    });
    const res = await listPATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('only updates notifications belonging to the current user', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession('user-2'));

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const req = makePatchRequest('http://localhost/api/notifications', {
      ids: ['notif-1'],
    });
    const res = await listPATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updatedCount).toBe(0);

    // Verify it passed userId in the where clause
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-2' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.updateMany.mockRejectedValue(new Error('DB error'));

    const req = makePatchRequest('http://localhost/api/notifications', {
      ids: ['notif-1'],
    });
    const res = await listPATCH(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// =============================================================================
// PATCH /api/notifications/[id]
// =============================================================================

describe('PATCH /api/notifications/[id]', () => {
  function callSinglePatch(id: string) {
    const req = makePatchRequest(`http://localhost/api/notifications/${id}`);
    return singlePATCH(req, { params: Promise.resolve({ id }) });
  }

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await callSinglePatch('notif-1');
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('marks a single notification as read', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const res = await callSinglePatch('notif-1');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'notif-1',
        userId: 'user-1',
      },
      data: {
        read: true,
      },
    });
  });

  it('returns 404 when notification does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const res = await callSinglePatch('nonexistent-id');
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('Notification');
  });

  it('returns 404 when notification belongs to another user (ownership check)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession('user-2'));

    // updateMany returns 0 because the notification belongs to user-1, not user-2
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const res = await callSinglePatch('notif-1');
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');

    // Verify it passed the current user's ID, not the notification owner's
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-2' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.updateMany.mockRejectedValue(new Error('DB error'));

    const res = await callSinglePatch('notif-1');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

// =============================================================================
// POST /api/notifications/read-all
// =============================================================================

describe('POST /api/notifications/read-all', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/notifications/read-all');
    const res = await readAllPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('marks all unread notifications as read for the current user', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 7 });

    const req = makePostRequest('http://localhost/api/notifications/read-all');
    const res = await readAllPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.updatedCount).toBe(7);

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        read: false,
      },
      data: {
        read: true,
      },
    });
  });

  it('returns 0 updatedCount when no unread notifications exist', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const req = makePostRequest('http://localhost/api/notifications/read-all');
    const res = await readAllPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.updatedCount).toBe(0);
  });

  it('only updates notifications for the authenticated user', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession('user-42'));

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

    const req = makePostRequest('http://localhost/api/notifications/read-all');
    const res = await readAllPOST(req);

    expect(res.status).toBe(200);

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-42' }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession());

    mockPrisma.notification.updateMany.mockRejectedValue(new Error('Connection lost'));

    const req = makePostRequest('http://localhost/api/notifications/read-all');
    const res = await readAllPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
