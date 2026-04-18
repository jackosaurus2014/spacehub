import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/credentials/[id]/approve
 * Admin-only. Marks a pending credential as verified, records the verifier
 * + timestamp, and notifies the user.
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
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const credential = await prisma.userCredential.findUnique({
      where: { id: params.id },
    });
    if (!credential) {
      return notFoundError('Credential');
    }
    if (credential.status === 'verified') {
      return conflictError('Credential is already verified');
    }

    const updated = await prisma.userCredential.update({
      where: { id: credential.id },
      data: {
        status: 'verified',
        verifiedAt: new Date(),
        verifierId: session.user.id,
        rejectionReason: null,
      },
    });

    // Best-effort: notify the credential owner.
    try {
      await prisma.notification.create({
        data: {
          userId: credential.userId,
          type: 'system',
          title: 'Credential verified',
          message: `Your ${credential.credentialType} "${credential.title}" from ${credential.issuingOrg} has been verified.`,
          linkUrl: '/account/credentials',
          relatedContentType: 'credential_verification',
          relatedContentId: credential.id,
        },
      });
    } catch (notifyErr) {
      logger.error('Failed to notify user of credential approval', {
        userId: credential.userId,
        credentialId: credential.id,
        error:
          notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
    }

    logger.info('Credential approved', {
      adminId: session.user.id,
      userId: credential.userId,
      credentialId: credential.id,
    });

    return NextResponse.json({ success: true, data: { credential: updated } });
  } catch (error) {
    logger.error('POST /api/admin/credentials/[id]/approve failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to approve credential');
  }
}
