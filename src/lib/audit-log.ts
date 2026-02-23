import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Log an admin action to the AuditLog table.
 * Errors are caught and logged rather than thrown so that audit
 * logging never breaks the calling operation.
 */
export async function logAuditAction(params: {
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await (prisma as any).auditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        details: params.details ? (params.details as any) : null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (error) {
    logger.error('Failed to write audit log', {
      error: error instanceof Error ? error.message : String(error),
      params: {
        adminId: params.adminId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
      },
    });
  }
}
