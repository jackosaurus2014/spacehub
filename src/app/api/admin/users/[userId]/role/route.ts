export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { logAuditAction } from '@/lib/audit-log';
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
  internalError,
} from '@/lib/errors';

const VALID_ADMIN_ROLES = ['super_admin', 'moderator', 'data_analyst'];

/**
 * PATCH /api/admin/users/[userId]/role
 * Update a user's admin status and role.
 * Only super_admin or the original admin (no adminRole set) can change roles.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { userId } = await params;

    // Fetch the requesting admin's role
    const requestingAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { adminRole: true, isAdmin: true } as any,
    });

    const adminRole = (requestingAdmin as any)?.adminRole as string | null;

    // Only super_admin or original admin (adminRole is null) can change roles
    if (adminRole !== null && adminRole !== 'super_admin') {
      return forbiddenError('Only super admins can change user roles');
    }

    const body = await req.json();
    const { isAdmin, adminRole: newRole } = body as {
      isAdmin?: boolean;
      adminRole?: string | null;
    };

    if (typeof isAdmin !== 'boolean') {
      return validationError('isAdmin must be a boolean');
    }

    if (newRole !== undefined && newRole !== null && !VALID_ADMIN_ROLES.includes(newRole)) {
      return validationError(
        `Invalid admin role. Valid roles: ${VALID_ADMIN_ROLES.join(', ')}`
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isAdmin: true, adminRole: true } as any,
    });

    if (!targetUser) {
      return notFoundError('User');
    }

    // Prevent self-demotion of super_admin
    if (userId === session.user.id && !isAdmin) {
      return validationError('Cannot revoke your own admin status');
    }

    // Determine the action for the audit log
    const previousIsAdmin = (targetUser as any).isAdmin;
    const previousRole = (targetUser as any).adminRole;
    let action = 'update_role';
    if (!previousIsAdmin && isAdmin) {
      action = 'grant_admin';
    } else if (previousIsAdmin && !isAdmin) {
      action = 'revoke_admin';
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin,
        adminRole: isAdmin ? (newRole ?? null) : null,
      } as any,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        adminRole: true,
      } as any,
    });

    // Log to audit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || undefined;

    await logAuditAction({
      adminId: session.user.id,
      action,
      resource: 'user',
      resourceId: userId,
      details: {
        targetEmail: (targetUser as any).email,
        targetName: (targetUser as any).name,
        previousIsAdmin,
        previousRole,
        newIsAdmin: isAdmin,
        newRole: isAdmin ? (newRole ?? null) : null,
      },
      ipAddress: ip,
    });

    logger.info('User role updated', {
      adminId: session.user.id,
      targetUserId: userId,
      action,
      newIsAdmin: isAdmin,
      newRole: isAdmin ? (newRole ?? null) : null,
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    logger.error('Error updating user role', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update user role');
  }
}
