import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, requestVerificationSchema } from '@/lib/validations';
import {
  validationError,
  unauthorizedError,
  internalError,
  conflictError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/account/verification
 * Returns the current user's verification state for pre-populating the form.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        verifiedBadge: true,
        verificationRequested: true,
        verificationNote: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return unauthorizedError();
    }

    return NextResponse.json({
      success: true,
      data: {
        verifiedBadge: user.verifiedBadge ?? 'unverified',
        verificationRequested: user.verificationRequested,
        verificationNote: user.verificationNote,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    logger.error('GET /api/account/verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load verification state');
  }
}

/**
 * POST /api/account/verification
 * Submit a request for manual verification (founder/investor/media).
 * Sets `verificationRequested=true` and stores the justification in
 * `verificationNote` for admin review.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(requestVerificationSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { badge, justification, website, linkedinUrl, supportingUrl } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        verifiedBadge: true,
        verificationRequested: true,
      },
    });

    if (!user) {
      return unauthorizedError();
    }

    // Don't let a user request a manual badge they already hold.
    if (user.verifiedBadge === badge) {
      return conflictError(`You already hold the ${badge} badge`);
    }

    if (user.verificationRequested) {
      return conflictError('You already have a pending verification request');
    }

    // Serialise justification + links as a structured note so the admin
    // review UI can surface everything.
    const note = JSON.stringify({
      requestedBadge: badge,
      justification,
      links: {
        ...(website ? { website } : {}),
        ...(linkedinUrl ? { linkedinUrl } : {}),
        ...(supportingUrl ? { supportingUrl } : {}),
      },
      submittedAt: new Date().toISOString(),
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationRequested: true,
        verificationNote: note,
      },
    });

    // Notify admins. We look up admin users and create in-app notifications
    // for each — best-effort, never blocks the response.
    try {
      const admins = await prisma.user.findMany({
        where: { isAdmin: true },
        select: { id: true },
      });

      if (admins.length > 0) {
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                userId: admin.id,
                type: 'system',
                title: 'New verification request',
                message: `${user.name || user.email} requested the "${badge}" badge.`,
                linkUrl: '/admin/verification',
                relatedUserId: user.id,
                relatedContentType: 'verification_request',
                relatedContentId: user.id,
              },
            })
          )
        );
      }

      logger.info('Verification request submitted', {
        userId: user.id,
        badge,
        adminsNotified: admins.length,
      });
    } catch (notifyErr) {
      logger.error('Failed to notify admins of verification request', {
        userId: user.id,
        error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      });
      // Non-fatal — the request itself is recorded.
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Verification request submitted. An admin will review it shortly.',
      },
    });
  } catch (error) {
    logger.error('POST /api/account/verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to submit verification request');
  }
}
