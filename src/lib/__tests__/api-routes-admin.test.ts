/**
 * @jest-environment node
 */

/**
 * API route handler tests for admin endpoints:
 *   - GET   /api/admin/users            (list users, admin only)
 *   - PATCH /api/admin/users/[userId]/role (update role, super_admin only)
 *   - GET   /api/admin/audit-log        (list audit logs, admin only)
 *
 * Validates authentication, authorization, pagination, filtering,
 * validation, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/audit-log', () => ({
  logAuditAction: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth/next';

import { GET as usersGET } from '@/app/api/admin/users/route';
import { PATCH as rolesPATCH } from '@/app/api/admin/users/[userId]/role/route';
import { GET as auditLogGET } from '@/app/api/admin/audit-log/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  user: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
  auditLog: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const mockGetServerSession = getServerSession as jest.Mock;

function makeAdminSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'admin-1',
      name: 'Admin User',
      isAdmin: true,
      ...overrides,
    },
  };
}

function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

function makePatchRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeUserParams(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/admin/users
// =============================================================================

describe('GET /api/admin/users', () => {
  it('returns paginated user list for admin', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());

    const users = [
      { id: 'user-1', email: 'a@test.com', name: 'Alice', isAdmin: false, createdAt: new Date() },
      { id: 'user-2', email: 'b@test.com', name: 'Bob', isAdmin: true, createdAt: new Date() },
    ];
    mockPrisma.user.findMany.mockResolvedValue(users);
    mockPrisma.user.count.mockResolvedValue(2);

    const req = makeGetRequest('http://localhost/api/admin/users');
    const res = await usersGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.users).toHaveLength(2);
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('returns 401 for unauthenticated user', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/admin/users');
    const res = await usersGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-admin user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Regular User', isAdmin: false },
    });

    const req = makeGetRequest('http://localhost/api/admin/users');
    const res = await usersGET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('respects pagination parameters', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(100);

    const req = makeGetRequest('http://localhost/api/admin/users?page=3&limit=10');
    const res = await usersGET(req);
    const body = await res.json();

    expect(body.data.pagination.page).toBe(3);
    expect(body.data.pagination.limit).toBe(10);
    expect(body.data.pagination.totalPages).toBe(10);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it('caps limit at 100', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/users?limit=999');
    await usersGET(req);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('applies search filter across name and email', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/users?search=alice');
    await usersGET(req);

    const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { name: { contains: 'alice', mode: 'insensitive' } },
      { email: { contains: 'alice', mode: 'insensitive' } },
    ]);
  });

  it('applies admins filter', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/users?filter=admins');
    await usersGET(req);

    const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
    expect(findManyCall.where.isAdmin).toBe(true);
  });

  it('applies banned filter', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/users?filter=banned');
    await usersGET(req);

    const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
    expect(findManyCall.where.isBanned).toBe(true);
  });

  it('applies muted filter', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/users?filter=muted');
    await usersGET(req);

    const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
    expect(findManyCall.where.isMuted).toBe(true);
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findMany.mockRejectedValue(new Error('DB error'));
    mockPrisma.user.count.mockRejectedValue(new Error('DB error'));

    const req = makeGetRequest('http://localhost/api/admin/users');
    const res = await usersGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to list users');
  });
});

// =============================================================================
// PATCH /api/admin/users/[userId]/role
// =============================================================================

describe('PATCH /api/admin/users/[userId]/role', () => {
  it('updates user role successfully as super_admin', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    // Requesting admin is super_admin
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ adminRole: 'super_admin', isAdmin: true }) // requestingAdmin
      .mockResolvedValueOnce({ id: 'user-2', name: 'Bob', email: 'bob@test.com', isAdmin: false, adminRole: null }); // targetUser
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-2', email: 'bob@test.com', name: 'Bob', isAdmin: true, adminRole: 'moderator',
    });

    const req = makePatchRequest('http://localhost/api/admin/users/user-2/role', {
      isAdmin: true,
      adminRole: 'moderator',
    });
    const res = await rolesPATCH(req, makeUserParams('user-2'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.isAdmin).toBe(true);
    expect(body.data.adminRole).toBe('moderator');
  });

  it('allows original admin (null adminRole) to change roles', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ adminRole: null, isAdmin: true }) // original admin
      .mockResolvedValueOnce({ id: 'user-3', name: 'Carl', email: 'carl@test.com', isAdmin: false, adminRole: null });
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-3', email: 'carl@test.com', name: 'Carl', isAdmin: true, adminRole: 'data_analyst',
    });

    const req = makePatchRequest('http://localhost/api/admin/users/user-3/role', {
      isAdmin: true,
      adminRole: 'data_analyst',
    });
    const res = await rolesPATCH(req, makeUserParams('user-3'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 401 for unauthenticated request', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePatchRequest('http://localhost/api/admin/users/user-2/role', {
      isAdmin: true,
    });
    const res = await rolesPATCH(req, makeUserParams('user-2'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 403 for non-admin user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', isAdmin: false },
    });

    const req = makePatchRequest('http://localhost/api/admin/users/user-2/role', {
      isAdmin: true,
    });
    const res = await rolesPATCH(req, makeUserParams('user-2'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
  });

  it('returns 403 for moderator trying to change roles (requires super_admin)', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      adminRole: 'moderator',
      isAdmin: true,
    });

    const req = makePatchRequest('http://localhost/api/admin/users/user-2/role', {
      isAdmin: true,
    });
    const res = await rolesPATCH(req, makeUserParams('user-2'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('super admin');
  });

  it('returns 400 when isAdmin is not a boolean', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findUnique.mockResolvedValueOnce({ adminRole: 'super_admin', isAdmin: true });

    const req = makePatchRequest('http://localhost/api/admin/users/user-2/role', {
      isAdmin: 'yes',
    });
    const res = await rolesPATCH(req, makeUserParams('user-2'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('isAdmin must be a boolean');
  });

  it('returns 400 for invalid admin role', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findUnique.mockResolvedValueOnce({ adminRole: 'super_admin', isAdmin: true });

    const req = makePatchRequest('http://localhost/api/admin/users/user-2/role', {
      isAdmin: true,
      adminRole: 'invalid_role',
    });
    const res = await rolesPATCH(req, makeUserParams('user-2'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('Invalid admin role');
  });

  it('returns 404 when target user does not exist', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ adminRole: 'super_admin', isAdmin: true })
      .mockResolvedValueOnce(null);

    const req = makePatchRequest('http://localhost/api/admin/users/nonexistent/role', {
      isAdmin: true,
    });
    const res = await rolesPATCH(req, makeUserParams('nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('prevents admin from revoking their own admin status', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession({ id: 'admin-1' }));
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ adminRole: 'super_admin', isAdmin: true })
      .mockResolvedValueOnce({ id: 'admin-1', name: 'Admin', email: 'admin@test.com', isAdmin: true });

    const req = makePatchRequest('http://localhost/api/admin/users/admin-1/role', {
      isAdmin: false,
    });
    const res = await rolesPATCH(req, makeUserParams('admin-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('Cannot revoke your own admin status');
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

    const req = makePatchRequest('http://localhost/api/admin/users/user-2/role', {
      isAdmin: true,
    });
    const res = await rolesPATCH(req, makeUserParams('user-2'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to update user role');
  });
});

// =============================================================================
// GET /api/admin/audit-log
// =============================================================================

describe('GET /api/admin/audit-log', () => {
  it('returns paginated audit logs for admin', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());

    const logs = [
      { id: 'log-1', action: 'grant_admin', resource: 'user', createdAt: new Date(), admin: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' } },
      { id: 'log-2', action: 'ban_user', resource: 'user', createdAt: new Date(), admin: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' } },
    ];
    mockPrisma.auditLog.findMany.mockResolvedValue(logs);
    mockPrisma.auditLog.count.mockResolvedValue(2);

    const req = makeGetRequest('http://localhost/api/admin/audit-log');
    const res = await auditLogGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.logs).toHaveLength(2);
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('returns 401 for unauthenticated user', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/admin/audit-log');
    const res = await auditLogGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-admin user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', isAdmin: false },
    });

    const req = makeGetRequest('http://localhost/api/admin/audit-log');
    const res = await auditLogGET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('respects pagination parameters', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(50);

    const req = makeGetRequest('http://localhost/api/admin/audit-log?page=2&limit=10');
    const res = await auditLogGET(req);
    const body = await res.json();

    expect(body.data.pagination.page).toBe(2);
    expect(body.data.pagination.limit).toBe(10);
    expect(body.data.pagination.totalPages).toBe(5);
  });

  it('filters by action', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/audit-log?action=ban_user');
    await auditLogGET(req);

    const findManyCall = mockPrisma.auditLog.findMany.mock.calls[0][0];
    expect(findManyCall.where.action).toBe('ban_user');
  });

  it('filters by adminId', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/audit-log?adminId=admin-42');
    await auditLogGET(req);

    const findManyCall = mockPrisma.auditLog.findMany.mock.calls[0][0];
    expect(findManyCall.where.adminId).toBe('admin-42');
  });

  it('includes admin data in audit log entries', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/audit-log');
    await auditLogGET(req);

    const findManyCall = mockPrisma.auditLog.findMany.mock.calls[0][0];
    expect(findManyCall.include.admin.select).toEqual({
      id: true,
      name: true,
      email: true,
    });
  });

  it('orders logs by createdAt desc', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/audit-log');
    await auditLogGET(req);

    const findManyCall = mockPrisma.auditLog.findMany.mock.calls[0][0];
    expect(findManyCall.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(makeAdminSession());
    mockPrisma.auditLog.findMany.mockRejectedValue(new Error('DB error'));
    mockPrisma.auditLog.count.mockRejectedValue(new Error('DB error'));

    const req = makeGetRequest('http://localhost/api/admin/audit-log');
    const res = await auditLogGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to list audit logs');
  });
});
