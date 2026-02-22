export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
  internalError,
} from '@/lib/errors';

const VALID_REVIEW_STATUSES = ['reviewed', 'actioned', 'dismissed'];

/**
 * PATCH /api/admin/moderation/reports/[id]
 * Review a content report (admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session?.user?.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { id } = await params;

    const body = await req.json();
    const { status, reviewNote } = body;

    if (!status || !VALID_REVIEW_STATUSES.includes(status)) {
      return validationError('Status must be one of: reviewed, actioned, dismissed');
    }

    // Verify report exists
    const existingReport = await (prisma as any).contentReport.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return notFoundError('Content report');
    }

    // Update the report
    const updatedReport = await (prisma as any).contentReport.update({
      where: { id },
      data: {
        status,
        reviewedBy: session.user.id,
        reviewNote: reviewNote?.trim() || null,
      },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // If actioned, create a ModerationAction record
    if (status === 'actioned') {
      await (prisma as any).moderationAction.create({
        data: {
          moderatorId: session.user.id,
          targetUserId: existingReport.reporterId,
          action: 'delete_content',
          reason: reviewNote?.trim() || `Report ${id} actioned`,
          contentType: existingReport.contentType,
          contentId: existingReport.contentId,
          metadata: { reportId: id } as any,
        },
      });
    }

    logger.info('Content report reviewed', {
      reportId: id,
      status,
      reviewedBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: updatedReport,
    });
  } catch (error) {
    logger.error('Error reviewing content report', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to review report');
  }
}
