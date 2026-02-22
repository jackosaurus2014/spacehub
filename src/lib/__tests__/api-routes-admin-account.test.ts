/**
 * @jest-environment node
 */

/**
 * API route handler tests for admin moderation and account management endpoints:
 *
 * Admin Moderation:
 *   - GET  /api/admin/moderation/reports            (list reports with pagination)
 *   - PATCH /api/admin/moderation/reports/[id]       (review a content report)
 *   - POST /api/admin/moderation/users/[userId]/action (execute moderation action)
 *   - GET  /api/admin/moderation/users/[userId]/action (get moderation history)
 *
 * Account Management:
 *   - POST /api/account/delete   (delete user account with password confirmation)
 *   - GET  /api/account/export   (export all user data, GDPR compliant)
 *
 * Validates admin authorization, action validation, cascading deletes, and data export.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contentReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    moderationAction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    forumThread: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    forumPost: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    directMessage: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    conversationParticipant: {
      findMany: jest.fn(),
    },
    userFollow: {
      findMany: jest.fn(),
    },
    companyFollow: {
      findMany: jest.fn(),
    },
    alertRule: {
      findMany: jest.fn(),
    },
    savedSearch: {
      findMany: jest.fn(),
    },
    companyWatchlistItem: {
      findMany: jest.fn(),
    },
    professionalProfile: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock bcryptjs for account deletion password verification
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
  },
}));

// Mock validations – we let the real module run for schema validation
// but need it importable
jest.mock('@/lib/validations', () => {
  const actual = jest.requireActual('@/lib/validations');
  return actual;
});

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';

// Admin moderation routes
import { GET as reportsListGET } from '@/app/api/admin/moderation/reports/route';
import { PATCH as reportPATCH } from '@/app/api/admin/moderation/reports/[id]/route';
import {
  POST as userActionPOST,
  GET as userActionHistoryGET,
} from '@/app/api/admin/moderation/users/[userId]/action/route';

// Account management routes
import { POST as accountDeletePOST } from '@/app/api/account/delete/route';
import { GET as accountExportGET } from '@/app/api/account/export/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.Mock;

function adminSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@spacenexus.com',
      isAdmin: true,
      ...overrides,
    },
  };
}

function regularSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-1',
      name: 'Regular User',
      email: 'user@example.com',
      isAdmin: false,
      ...overrides,
    },
  };
}

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    contentType: 'post',
    contentId: 'post-123',
    reason: 'spam',
    description: 'This is spam content',
    status: 'pending',
    reporterId: 'user-2',
    reviewedBy: null,
    reviewNote: null,
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
    reporter: { id: 'user-2', name: 'Reporter', email: 'reporter@example.com' },
    ...overrides,
  };
}

function makeModerationAction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'action-1',
    moderatorId: 'admin-1',
    targetUserId: 'user-1',
    action: 'warn',
    reason: 'Violating community guidelines',
    createdAt: new Date('2026-02-15'),
    ...overrides,
  };
}

function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

function makePostRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeIdParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeUserIdParams(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/admin/moderation/reports
// =============================================================================

describe('GET /api/admin/moderation/reports', () => {
  it('requires authentication (returns 401 if no session)', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports');
    const res = await reportsListGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects non-admin users with 403', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports');
    const res = await reportsListGET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('Admin access required');
  });

  it('lists reports with default pagination', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const reports = [makeReport(), makeReport({ id: 'report-2' })];

    (mockPrisma as any).contentReport.findMany.mockResolvedValue(reports);
    (mockPrisma as any).contentReport.count.mockResolvedValue(2);

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports');
    const res = await reportsListGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reports).toHaveLength(2);
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('supports pagination via page and limit query params', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findMany.mockResolvedValue([]);
    (mockPrisma as any).contentReport.count.mockResolvedValue(50);

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports?page=3&limit=10');
    const res = await reportsListGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.pagination.page).toBe(3);
    expect(body.data.pagination.limit).toBe(10);
    expect(body.data.pagination.totalPages).toBe(5);

    // Verify skip = (page - 1) * limit = 20
    expect((mockPrisma as any).contentReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it('filters reports by status', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findMany.mockResolvedValue([]);
    (mockPrisma as any).contentReport.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports?status=pending');
    await reportsListGET(req);

    expect((mockPrisma as any).contentReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'pending' }),
      })
    );
  });

  it('filters reports by contentType', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findMany.mockResolvedValue([]);
    (mockPrisma as any).contentReport.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports?contentType=thread');
    await reportsListGET(req);

    expect((mockPrisma as any).contentReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contentType: 'thread' }),
      })
    );
  });

  it('ignores invalid status filter values', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findMany.mockResolvedValue([]);
    (mockPrisma as any).contentReport.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports?status=invalid_value');
    await reportsListGET(req);

    // The where clause should NOT include status
    expect((mockPrisma as any).contentReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it('clamps limit to maximum of 100', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findMany.mockResolvedValue([]);
    (mockPrisma as any).contentReport.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports?limit=500');
    const res = await reportsListGET(req);
    const body = await res.json();

    expect(body.data.pagination.limit).toBe(100);
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findMany.mockRejectedValue(new Error('DB connection failed'));

    const req = makeGetRequest('http://localhost/api/admin/moderation/reports');
    const res = await reportsListGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Failed to fetch reports');
  });
});

// =============================================================================
// PATCH /api/admin/moderation/reports/[id]
// =============================================================================

describe('PATCH /api/admin/moderation/reports/[id]', () => {
  it('requires authentication (returns 401 if no session)', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'reviewed',
    });
    const res = await reportPATCH(req, makeIdParams('report-1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('rejects non-admin users with 403', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'reviewed',
    });
    const res = await reportPATCH(req, makeIdParams('report-1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('Admin access required');
  });

  it('updates a report status to reviewed', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const existingReport = makeReport();
    const updatedReport = makeReport({ status: 'reviewed', reviewedBy: 'admin-1' });

    (mockPrisma as any).contentReport.findUnique.mockResolvedValue(existingReport);
    (mockPrisma as any).contentReport.update.mockResolvedValue(updatedReport);

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'reviewed',
      reviewNote: 'Looks fine, no action needed',
    });
    const res = await reportPATCH(req, makeIdParams('report-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('reviewed');
    expect((mockPrisma as any).contentReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'report-1' },
        data: expect.objectContaining({
          status: 'reviewed',
          reviewedBy: 'admin-1',
          reviewNote: 'Looks fine, no action needed',
        }),
      })
    );
  });

  it('updates a report status to dismissed', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findUnique.mockResolvedValue(makeReport());
    (mockPrisma as any).contentReport.update.mockResolvedValue(
      makeReport({ status: 'dismissed' })
    );

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'dismissed',
    });
    const res = await reportPATCH(req, makeIdParams('report-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('creates a ModerationAction record when status is actioned', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    const report = makeReport({ id: 'report-1', reporterId: 'user-2' });
    (mockPrisma as any).contentReport.findUnique.mockResolvedValue(report);
    (mockPrisma as any).contentReport.update.mockResolvedValue(
      makeReport({ status: 'actioned' })
    );
    (mockPrisma as any).moderationAction.create.mockResolvedValue(makeModerationAction());

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'actioned',
      reviewNote: 'Content removed for violating rules',
    });
    const res = await reportPATCH(req, makeIdParams('report-1'));

    expect(res.status).toBe(200);
    expect((mockPrisma as any).moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moderatorId: 'admin-1',
          targetUserId: 'user-2',
          action: 'delete_content',
          contentType: 'post',
          contentId: 'post-123',
        }),
      })
    );
  });

  it('does not create ModerationAction for non-actioned statuses', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findUnique.mockResolvedValue(makeReport());
    (mockPrisma as any).contentReport.update.mockResolvedValue(
      makeReport({ status: 'reviewed' })
    );

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'reviewed',
    });
    await reportPATCH(req, makeIdParams('report-1'));

    expect((mockPrisma as any).moderationAction.create).not.toHaveBeenCalled();
  });

  it('rejects invalid status values with 400', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'approved',
    });
    const res = await reportPATCH(req, makeIdParams('report-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Status must be one of');
  });

  it('rejects missing status with 400', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      reviewNote: 'Note without status',
    });
    const res = await reportPATCH(req, makeIdParams('report-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 404 if report does not exist', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findUnique.mockResolvedValue(null);

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/nonexistent', {
      status: 'reviewed',
    });
    const res = await reportPATCH(req, makeIdParams('nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('not found');
  });

  it('trims reviewNote whitespace and stores null for empty notes', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findUnique.mockResolvedValue(makeReport());
    (mockPrisma as any).contentReport.update.mockResolvedValue(makeReport({ status: 'reviewed' }));

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'reviewed',
      reviewNote: '   ',
    });
    await reportPATCH(req, makeIdParams('report-1'));

    expect((mockPrisma as any).contentReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewNote: null,
        }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma as any).contentReport.findUnique.mockRejectedValue(new Error('DB error'));

    const req = makePatchRequest('http://localhost/api/admin/moderation/reports/report-1', {
      status: 'reviewed',
    });
    const res = await reportPATCH(req, makeIdParams('report-1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toContain('Failed to review report');
  });
});

// =============================================================================
// POST /api/admin/moderation/users/[userId]/action
// =============================================================================

describe('POST /api/admin/moderation/users/[userId]/action', () => {
  const warnBody = {
    action: 'warn',
    reason: 'Violating community guidelines',
  };

  it('requires authentication (returns 401 if no session)', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest(
      'http://localhost/api/admin/moderation/users/user-1/action',
      warnBody
    );
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('rejects non-admin users with 403', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const req = makePostRequest(
      'http://localhost/api/admin/moderation/users/user-1/action',
      warnBody
    );
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('Admin access required');
  });

  it('prevents admin from moderating themselves', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@spacenexus.com',
    });

    const req = makePostRequest(
      'http://localhost/api/admin/moderation/users/admin-1/action',
      warnBody
    );
    const res = await userActionPOST(req, makeUserIdParams('admin-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Cannot moderate your own account');
  });

  it('returns 404 if target user does not exist', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest(
      'http://localhost/api/admin/moderation/users/nonexistent/action',
      warnBody
    );
    const res = await userActionPOST(req, makeUserIdParams('nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.message).toContain('not found');
  });

  it('warns a user successfully', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'warn' })
    );

    const req = makePostRequest(
      'http://localhost/api/admin/moderation/users/user-1/action',
      warnBody
    );
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.action).toBeDefined();
    expect((mockPrisma as any).moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moderatorId: 'admin-1',
          targetUserId: 'user-1',
          action: 'warn',
          reason: 'Violating community guidelines',
        }),
      })
    );
  });

  it('mutes a user with duration', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'mute' })
    );

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'mute',
      reason: 'Repeated spam posting',
      duration: 60, // 60 minutes
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          isMuted: true,
        }),
      })
    );
  });

  it('rejects mute action without duration', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'mute',
      reason: 'Spam posting',
      // duration intentionally missing
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Duration is required');
  });

  it('unmutes a user', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'unmute' })
    );

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'unmute',
      reason: 'User appealed, mute lifted',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          isMuted: false,
          mutedUntil: null,
        }),
      })
    );
  });

  it('bans a user permanently (no duration)', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'ban' })
    );

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'ban',
      reason: 'Severe violation of terms of service',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          isBanned: true,
          banReason: 'Severe violation of terms of service',
        }),
      })
    );
  });

  it('bans a user with a temporary duration', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'ban' })
    );

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'ban',
      reason: 'Temporary ban for repeated warnings',
      duration: 1440, // 1 day in minutes
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isBanned: true,
          bannedUntil: expect.any(Date),
        }),
      })
    );
  });

  it('unbans a user', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'unban' })
    );

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'unban',
      reason: 'Ban appeal accepted',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          isBanned: false,
          bannedAt: null,
          bannedUntil: null,
          banReason: null,
        }),
      })
    );
  });

  it('deletes content (thread) via delete_content action', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma as any).forumThread.delete.mockResolvedValue({});
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'delete_content' })
    );

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'delete_content',
      reason: 'Content violates community guidelines',
      contentType: 'thread',
      contentId: 'thread-123',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect((mockPrisma as any).forumThread.delete).toHaveBeenCalledWith({
      where: { id: 'thread-123' },
    });
  });

  it('deletes content (post) via delete_content action', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma as any).forumPost.delete.mockResolvedValue({});
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'delete_content' })
    );

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'delete_content',
      reason: 'Spam post removed',
      contentType: 'post',
      contentId: 'post-456',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));

    expect(res.status).toBe(200);
    expect((mockPrisma as any).forumPost.delete).toHaveBeenCalledWith({
      where: { id: 'post-456' },
    });
  });

  it('deletes content (message) via delete_content action', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });
    (mockPrisma as any).directMessage.delete.mockResolvedValue({});
    (mockPrisma as any).moderationAction.create.mockResolvedValue(
      makeModerationAction({ action: 'delete_content' })
    );

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'delete_content',
      reason: 'Inappropriate message',
      contentType: 'message',
      contentId: 'msg-789',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));

    expect(res.status).toBe(200);
    expect((mockPrisma as any).directMessage.delete).toHaveBeenCalledWith({
      where: { id: 'msg-789' },
    });
  });

  it('rejects delete_content without contentType and contentId', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Target User',
      email: 'target@example.com',
    });

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'delete_content',
      reason: 'Delete content without specifying what',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('contentType and contentId are required');
  });

  it('rejects invalid action type via Zod validation', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'kick',
      reason: 'Invalid action type',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects reason shorter than 5 characters', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());

    const req = makePostRequest('http://localhost/api/admin/moderation/users/user-1/action', {
      action: 'warn',
      reason: 'bad',
    });
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB crashed'));

    const req = makePostRequest(
      'http://localhost/api/admin/moderation/users/user-1/action',
      warnBody
    );
    const res = await userActionPOST(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toContain('Failed to execute moderation action');
  });
});

// =============================================================================
// GET /api/admin/moderation/users/[userId]/action  (moderation history)
// =============================================================================

describe('GET /api/admin/moderation/users/[userId]/action', () => {
  it('requires authentication (returns 401 if no session)', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/admin/moderation/users/user-1/action');
    const res = await userActionHistoryGET(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('rejects non-admin users with 403', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const req = makeGetRequest('http://localhost/api/admin/moderation/users/user-1/action');
    const res = await userActionHistoryGET(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('Admin access required');
  });

  it('returns moderation history for a user', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
    });
    const actions = [
      makeModerationAction({ id: 'action-1', action: 'warn' }),
      makeModerationAction({ id: 'action-2', action: 'mute' }),
    ];
    (mockPrisma as any).moderationAction.findMany.mockResolvedValue(actions);

    const req = makeGetRequest('http://localhost/api/admin/moderation/users/user-1/action');
    const res = await userActionHistoryGET(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.actions).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('returns 404 if target user does not exist', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/admin/moderation/users/nonexistent/action');
    const res = await userActionHistoryGET(req, makeUserIdParams('nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.message).toContain('not found');
  });

  it('returns empty array for user with no moderation history', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (mockPrisma as any).moderationAction.findMany.mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/admin/moderation/users/user-1/action');
    const res = await userActionHistoryGET(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.actions).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(adminSession());
    (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = makeGetRequest('http://localhost/api/admin/moderation/users/user-1/action');
    const res = await userActionHistoryGET(req, makeUserIdParams('user-1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toContain('Failed to fetch moderation history');
  });
});

// =============================================================================
// POST /api/account/delete
// =============================================================================

describe('POST /api/account/delete', () => {
  const validDeleteBody = {
    password: 'MySecurePass1',
    confirmation: 'DELETE MY ACCOUNT',
  };

  it('requires authentication (returns 401 if no session)', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/account/delete', validDeleteBody);
    const res = await accountDeletePOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('deletes user account when password is correct', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: '$2a$12$hashedpassword',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockPrisma.user.delete as jest.Mock).mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/account/delete', validDeleteBody);
    const res = await accountDeletePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('permanently deleted');
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('verifies password with bcrypt.compare', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: '$2a$12$hashedpassword',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockPrisma.user.delete as jest.Mock).mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/account/delete', validDeleteBody);
    await accountDeletePOST(req);

    expect(bcrypt.compare).toHaveBeenCalledWith('MySecurePass1', '$2a$12$hashedpassword');
  });

  it('rejects with 400 if password is incorrect', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: '$2a$12$hashedpassword',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const req = makePostRequest('http://localhost/api/account/delete', validDeleteBody);
    const res = await accountDeletePOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Incorrect password');
    // Should NOT have attempted to delete
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
  });

  it('rejects with 400 if confirmation text is wrong', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const req = makePostRequest('http://localhost/api/account/delete', {
      password: 'MySecurePass1',
      confirmation: 'delete my account', // lowercase, should be exact match
    });
    const res = await accountDeletePOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects with 400 if password is missing', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const req = makePostRequest('http://localhost/api/account/delete', {
      confirmation: 'DELETE MY ACCOUNT',
    });
    const res = await accountDeletePOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects with 400 if confirmation is missing', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const req = makePostRequest('http://localhost/api/account/delete', {
      password: 'MySecurePass1',
    });
    const res = await accountDeletePOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 401 if user not found in database', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/account/delete', validDeleteBody);
    const res = await accountDeletePOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 500 on database error during deletion', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: '$2a$12$hashedpassword',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockPrisma.user.delete as jest.Mock).mockRejectedValue(new Error('Cascade failed'));

    const req = makePostRequest('http://localhost/api/account/delete', validDeleteBody);
    const res = await accountDeletePOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toContain('Failed to delete account');
  });
});

// =============================================================================
// GET /api/account/export
// =============================================================================

describe('GET /api/account/export', () => {
  it('requires authentication (returns 401 if no session)', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/account/export');
    const res = await accountExportGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 401 if user not found in database', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/account/export');
    const res = await accountExportGET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('exports user data in expected format', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const userData = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Regular User',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-15'),
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      isAdmin: false,
      emailVerified: true,
    };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userData);

    // Mock all the related data queries (they return null/empty by default in the route)
    (mockPrisma as any).professionalProfile.findUnique.mockResolvedValue(null);
    (mockPrisma as any).forumThread.findMany.mockResolvedValue([]);
    (mockPrisma as any).forumPost.findMany.mockResolvedValue([]);
    (mockPrisma as any).directMessage.findMany.mockResolvedValue([]);
    (mockPrisma as any).conversationParticipant.findMany.mockResolvedValue([]);
    (mockPrisma as any).userFollow.findMany.mockResolvedValue([]);
    (mockPrisma as any).companyFollow.findMany.mockResolvedValue([]);
    (mockPrisma as any).alertRule.findMany.mockResolvedValue([]);
    (mockPrisma as any).savedSearch.findMany.mockResolvedValue([]);
    (mockPrisma as any).companyWatchlistItem.findMany.mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/account/export');
    const res = await accountExportGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.exportVersion).toBe('1.0');
    expect(body.exportedAt).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('user@example.com');
    expect(body.user.name).toBe('Regular User');
    expect(body.user.isAdmin).toBe(false);
  });

  it('includes Content-Disposition header for file download', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Regular User',
      createdAt: new Date(),
      updatedAt: new Date(),
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      isAdmin: false,
      emailVerified: true,
    });

    // Mock related data queries
    (mockPrisma as any).professionalProfile.findUnique.mockResolvedValue(null);
    (mockPrisma as any).forumThread.findMany.mockResolvedValue([]);
    (mockPrisma as any).forumPost.findMany.mockResolvedValue([]);
    (mockPrisma as any).directMessage.findMany.mockResolvedValue([]);
    (mockPrisma as any).conversationParticipant.findMany.mockResolvedValue([]);
    (mockPrisma as any).userFollow.findMany.mockResolvedValue([]);
    (mockPrisma as any).companyFollow.findMany.mockResolvedValue([]);
    (mockPrisma as any).alertRule.findMany.mockResolvedValue([]);
    (mockPrisma as any).savedSearch.findMany.mockResolvedValue([]);
    (mockPrisma as any).companyWatchlistItem.findMany.mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/account/export');
    const res = await accountExportGET(req);

    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')).toMatch(
      /attachment; filename="spacenexus-data-export-\d{4}-\d{2}-\d{2}\.json"/
    );
  });

  it('includes all GDPR-required personal data fields', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());

    const userData = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Regular User',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-15'),
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      isAdmin: false,
      emailVerified: true,
    };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userData);

    // Provide some actual related data
    const profile = { id: 'prof-1', userId: 'user-1', bio: 'Space enthusiast', skills: ['engineering'] };
    const threads = [{ id: 'thread-1', title: 'Hello', posts: [] }];
    const posts = [{ id: 'post-1', threadId: 'thread-1', content: 'A reply' }];
    const messages = [{ id: 'msg-1', conversationId: 'conv-1', content: 'Hi' }];
    const conversations = [{ conversationId: 'conv-1', lastReadAt: null }];
    const followingList = [{ following: { id: 'user-2', name: 'Followed User' } }];
    const followersList = [{ follower: { id: 'user-3', name: 'Follower' } }];
    const companyFollowsList = [{ companyId: 'comp-1' }];
    const alertRulesList = [{ id: 'alert-1', type: 'launch' }];
    const savedSearchesList = [{ id: 'search-1', query: 'rockets' }];
    const watchlistItems = [{ id: 'watch-1', companyId: 'comp-2' }];

    (mockPrisma as any).professionalProfile.findUnique.mockResolvedValue(profile);
    (mockPrisma as any).forumThread.findMany.mockResolvedValue(threads);
    (mockPrisma as any).forumPost.findMany.mockResolvedValue(posts);
    (mockPrisma as any).directMessage.findMany.mockResolvedValue(messages);
    (mockPrisma as any).conversationParticipant.findMany.mockResolvedValue(conversations);
    // userFollow is called twice: once for following, once for followers
    (mockPrisma as any).userFollow.findMany
      .mockResolvedValueOnce(followingList)
      .mockResolvedValueOnce(followersList);
    (mockPrisma as any).companyFollow.findMany.mockResolvedValue(companyFollowsList);
    (mockPrisma as any).alertRule.findMany.mockResolvedValue(alertRulesList);
    (mockPrisma as any).savedSearch.findMany.mockResolvedValue(savedSearchesList);
    (mockPrisma as any).companyWatchlistItem.findMany.mockResolvedValue(watchlistItems);

    const req = makeGetRequest('http://localhost/api/account/export');
    const res = await accountExportGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);

    // Verify all GDPR data categories are present in export
    expect(body).toHaveProperty('user');
    expect(body).toHaveProperty('professionalProfile');
    expect(body).toHaveProperty('forumThreads');
    expect(body).toHaveProperty('forumPosts');
    expect(body).toHaveProperty('directMessages');
    expect(body).toHaveProperty('conversations');
    expect(body).toHaveProperty('following');
    expect(body).toHaveProperty('followers');
    expect(body).toHaveProperty('companyFollows');
    expect(body).toHaveProperty('alertRules');
    expect(body).toHaveProperty('savedSearches');
    expect(body).toHaveProperty('companyWatchlistItems');
    expect(body).toHaveProperty('exportedAt');
    expect(body).toHaveProperty('exportVersion');

    // Verify actual data came through
    expect(body.professionalProfile.bio).toBe('Space enthusiast');
    expect(body.forumThreads).toHaveLength(1);
    expect(body.forumPosts).toHaveLength(1);
    expect(body.directMessages).toHaveLength(1);
    expect(body.following).toHaveLength(1);
    expect(body.followers).toHaveLength(1);
  });

  it('does not include password hash in export', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Regular User',
      createdAt: new Date(),
      updatedAt: new Date(),
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      isAdmin: false,
      emailVerified: true,
    });

    // Mock related data queries
    (mockPrisma as any).professionalProfile.findUnique.mockResolvedValue(null);
    (mockPrisma as any).forumThread.findMany.mockResolvedValue([]);
    (mockPrisma as any).forumPost.findMany.mockResolvedValue([]);
    (mockPrisma as any).directMessage.findMany.mockResolvedValue([]);
    (mockPrisma as any).conversationParticipant.findMany.mockResolvedValue([]);
    (mockPrisma as any).userFollow.findMany.mockResolvedValue([]);
    (mockPrisma as any).companyFollow.findMany.mockResolvedValue([]);
    (mockPrisma as any).alertRule.findMany.mockResolvedValue([]);
    (mockPrisma as any).savedSearch.findMany.mockResolvedValue([]);
    (mockPrisma as any).companyWatchlistItem.findMany.mockResolvedValue([]);

    const req = makeGetRequest('http://localhost/api/account/export');
    const res = await accountExportGET(req);
    const body = await res.json();

    // Verify the user data does not contain password
    expect(body.user).not.toHaveProperty('password');

    // Verify the select query only requests safe fields (no password)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: expect.not.objectContaining({ password: true }),
    });
  });

  it('handles missing optional data models gracefully', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Regular User',
      createdAt: new Date(),
      updatedAt: new Date(),
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      isAdmin: false,
      emailVerified: true,
    });

    // Simulate models that don't exist yet (throw errors)
    (mockPrisma as any).professionalProfile.findUnique.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).forumThread.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).forumPost.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).directMessage.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).conversationParticipant.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).userFollow.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).companyFollow.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).alertRule.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).savedSearch.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );
    (mockPrisma as any).companyWatchlistItem.findMany.mockRejectedValue(
      new Error('Model does not exist')
    );

    const req = makeGetRequest('http://localhost/api/account/export');
    const res = await accountExportGET(req);
    const body = await res.json();

    // Should still succeed with null values for missing models
    expect(res.status).toBe(200);
    expect(body.user).toBeDefined();
    expect(body.professionalProfile).toBeNull();
    expect(body.forumThreads).toBeNull();
    expect(body.forumPosts).toBeNull();
    expect(body.directMessages).toBeNull();
    expect(body.conversations).toBeNull();
    expect(body.following).toBeNull();
    expect(body.followers).toBeNull();
  });

  it('returns 500 on fatal database error (user query fails)', async () => {
    mockGetServerSession.mockResolvedValue(regularSession());
    (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error('Connection refused')
    );

    const req = makeGetRequest('http://localhost/api/account/export');
    const res = await accountExportGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toContain('Failed to export user data');
  });
});
