export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  internalError,
  validationError,
  notFoundError,
} from '@/lib/errors';
import { isFeedbackStatus } from '@/lib/feedback';

/**
 * PATCH /api/admin/feedback/[id] — update a FeedbackSubmission's triage
 * status (new | reviewed | actioned). Admin-only.
 */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await request.json().catch(() => null);
    const status = body?.status;
    if (!isFeedbackStatus(status)) {
      return validationError('status must be one of: new, reviewed, actioned');
    }

    try {
      const updated = await prisma.feedbackSubmission.update({
        where: { id: params.id },
        data: { status },
      });

      logger.info('Feedback submission status updated', { id: params.id, status });
      return NextResponse.json({ success: true, data: updated });
    } catch {
      // Prisma throws P2025 for a missing row; table-missing also lands here
      return notFoundError('Feedback submission not found');
    }
  } catch (err) {
    logger.error('Admin feedback PATCH failed', {
      id: params.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError('Failed to update feedback submission');
  }
}
