import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  validateBody,
  credentialVerificationDecisionSchema,
} from '@/lib/validations';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/credentials/[id]/reject
 * Admin-only. Rejects a pending credential and stores the optional reason.
 * Notifies the credential owner.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await req.json().catch(() => ({}));
    // Body shape: { decision: 'reject', rejectionReason?: string } — but we
    // accept either { rejectionReason } directly or the full schema.
    const normalised =
      body && typeof body === 'object' && 'decision' in body
        ? body
        : { ...body, decision: 'reject' };

    const validation = validateBody(
      credentialVerificationDecisionSchema,
      normalised
    );
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    if (validation.data.decision !== 'reject') {
      return validationError('decision must be "reject" on this endpoint');
    }

    const credential = await prisma.userCredential.findUnique({
      where: { id: params.id },
    });
    if (!credential) {
      return notFoundError('Credential');
    }
    if (credential.status === 'rejected') {
      return conflictError('Credential is already rejected');
    }

    const updated = await prisma.userCredential.update({
      where: { id: credential.id },
      data: {
        status: 'rejected',
        rejectionReason: validation.data.rejectionReason ?? null,
        verifiedAt: null,
        verifierId: null,
      },
    });

    // Best-effort: notify the credential owner.
    try {
      const reason = validation.data.rejectionReason;
      await prisma.notification.create({
        data: {
          userId: credential.userId,
          type: 'system',
          title: 'Credential verification rejected',
          message: reason
            ? `Your credential "${credential.title}" was rejected. Reason: ${reason}`
            : `Your credential "${credential.title}" was rejected. You can edit it and resubmit with stronger evidence.`,
          linkUrl: '/account/credentials',
          relatedContentType: 'credential_verification',
          relatedContentId: credential.id,
        },
      });
    } catch (notifyErr) {
      logger.error('Failed to notify user of credential rejection', {
        userId: credential.userId,
        credentialId: credential.id,
        error:
          notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
    }

    logger.info('Credential rejected', {
      adminId: session.user.id,
      userId: credential.userId,
      credentialId: credential.id,
      reason: validation.data.rejectionReason ?? null,
    });

    return NextResponse.json({ success: true, data: { credential: updated } });
  } catch (error) {
    logger.error('POST /api/admin/credentials/[id]/reject failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to reject credential');
  }
}
