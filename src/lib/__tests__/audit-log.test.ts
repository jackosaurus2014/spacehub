/**
 * @jest-environment node
 */

/**
 * Unit tests for src/lib/audit-log.ts
 *
 * Tests the logAuditAction function:
 *   - Creates audit log entry with correct fields
 *   - Handles missing optional fields
 *   - Handles Prisma errors gracefully (logs but does not throw)
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { logAuditAction } from '@/lib/audit-log';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockAuditLogCreate = prisma.auditLog.create as jest.Mock;
const mockLoggerError = logger.error as jest.Mock;

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('logAuditAction', () => {
  it('creates audit log entry with all fields provided', async () => {
    mockAuditLogCreate.mockResolvedValue({ id: 'log-1' });

    await logAuditAction({
      adminId: 'admin-1',
      action: 'grant_admin',
      resource: 'user',
      resourceId: 'user-42',
      details: { targetEmail: 'test@example.com', previousRole: null },
      ipAddress: '192.168.1.1',
    });

    expect(mockAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        action: 'grant_admin',
        resource: 'user',
        resourceId: 'user-42',
        details: { targetEmail: 'test@example.com', previousRole: null },
        ipAddress: '192.168.1.1',
      },
    });
  });

  it('creates audit log with null for missing optional resourceId', async () => {
    mockAuditLogCreate.mockResolvedValue({ id: 'log-2' });

    await logAuditAction({
      adminId: 'admin-1',
      action: 'ban_user',
      resource: 'user',
    });

    expect(mockAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(mockAuditLogCreate).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        action: 'ban_user',
        resource: 'user',
        resourceId: null,
        details: null,
        ipAddress: null,
      },
    });
  });

  it('creates audit log with null for missing optional details', async () => {
    mockAuditLogCreate.mockResolvedValue({ id: 'log-3' });

    await logAuditAction({
      adminId: 'admin-2',
      action: 'update_role',
      resource: 'user',
      resourceId: 'user-10',
      ipAddress: '10.0.0.1',
    });

    const createCall = mockAuditLogCreate.mock.calls[0][0];
    expect(createCall.data.details).toBeNull();
    expect(createCall.data.resourceId).toBe('user-10');
    expect(createCall.data.ipAddress).toBe('10.0.0.1');
  });

  it('creates audit log with null for missing optional ipAddress', async () => {
    mockAuditLogCreate.mockResolvedValue({ id: 'log-4' });

    await logAuditAction({
      adminId: 'admin-1',
      action: 'revoke_admin',
      resource: 'user',
      resourceId: 'user-5',
      details: { reason: 'test' },
    });

    const createCall = mockAuditLogCreate.mock.calls[0][0];
    expect(createCall.data.ipAddress).toBeNull();
    expect(createCall.data.details).toEqual({ reason: 'test' });
  });

  it('handles Prisma errors gracefully without throwing', async () => {
    mockAuditLogCreate.mockRejectedValue(new Error('DB connection lost'));

    // Should NOT throw
    await expect(
      logAuditAction({
        adminId: 'admin-1',
        action: 'ban_user',
        resource: 'user',
        resourceId: 'user-99',
      })
    ).resolves.toBeUndefined();

    // Should log the error
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to write audit log', {
      error: 'DB connection lost',
      params: {
        adminId: 'admin-1',
        action: 'ban_user',
        resource: 'user',
        resourceId: 'user-99',
      },
    });
  });

  it('handles non-Error thrown values gracefully', async () => {
    mockAuditLogCreate.mockRejectedValue('string error');

    await expect(
      logAuditAction({
        adminId: 'admin-1',
        action: 'test',
        resource: 'test',
      })
    ).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to write audit log', {
      error: 'string error',
      params: {
        adminId: 'admin-1',
        action: 'test',
        resource: 'test',
        resourceId: undefined,
      },
    });
  });

  it('returns void on success', async () => {
    mockAuditLogCreate.mockResolvedValue({ id: 'log-5' });

    const result = await logAuditAction({
      adminId: 'admin-1',
      action: 'update_role',
      resource: 'user',
    });

    expect(result).toBeUndefined();
  });
});
