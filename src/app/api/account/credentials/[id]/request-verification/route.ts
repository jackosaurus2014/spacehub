import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
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
 * POST /api/account/credentials/[id]/request-verification
 * Owner submits a credential for admin review. Sets status='pending'.
 *
 * The credential must already include enough evidence (verificationUrl or
 * supportingDocUrl) for an admin to make a decision.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const credential = await prisma.userCredential.findUnique({
      where: { id: params.id },
    });
    if (!credential) {
      return notFoundError('Credential');
    }
    if (credential.userId !== session.user.id) {
      return forbiddenError('You can only submit your own credentials');
    }

    if (credential.status === 'pending') {
      return conflictError('This credential is already pending review');
    }
    if (credential.status === 'verified') {
      return conflictError('This credential is already verified');
    }

    if (!credential.verificationUrl && !credential.supportingDocUrl) {
      return validationError(
        'Add a verification URL or supporting document before requesting review'
      );
    }

    const updated = await prisma.userCredential.update({
      where: { id: credential.id },
      data: {
        status: 'pending',
        rejectionReason: null,
      },
    });

    // Best-effort: notify admins so the queue does not go stale.
    try {
      const admins = await prisma.user.findMany({
        where: { isAdmin: true },
        select: { id: true },
      });
      const submitter = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });
      const submitterLabel =
        submitter?.name || submitter?.email || 'A user';

      if (admins.length > 0) {
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                userId: admin.id,
                type: 'system',
                title: 'New credential verification request',
                message: `${submitterLabel} requested verification for "${credential.title}" (${credential.credentialType}).`,
                linkUrl: '/admin/credentials',
                relatedUserId: session.user.id,
                relatedContentType: 'credential_verification',
                relatedContentId: credential.id,
              },
            })
          )
        );
      }
    } catch (notifyErr) {
      logger.error('Failed to notify admins of credential review request', {
        userId: session.user.id,
        credentialId: credential.id,
        error:
          notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
    }

    logger.info('Credential submitted for verification', {
      userId: session.user.id,
      credentialId: credential.id,
    });

    return NextResponse.json({ success: true, data: { credential: updated } });
  } catch (error) {
    logger.error(
      'POST /api/account/credentials/[id]/request-verification failed',
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
    return internalError('Failed to submit verification request');
  }
}
