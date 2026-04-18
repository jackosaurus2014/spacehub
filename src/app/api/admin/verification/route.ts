import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, reviewVerificationSchema } from '@/lib/validations';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/verification
 * Admin-only. Returns pending verification requests.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const requests = await prisma.user.findMany({
      where: {
        verificationRequested: true,
        verifiedBadge: { in: ['unverified', 'email', 'domain'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        verifiedBadge: true,
        verificationNote: true,
        emailVerified: true,
        createdAt: true,
        claimedCompanyId: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    // Join claimed-company in a second query (User.claimedCompanyId is a
    // scalar — no Prisma relation is defined for it).
    const claimedIds = Array.from(
      new Set(requests.map((u) => u.claimedCompanyId).filter((id): id is string => !!id))
    );
    const companies = claimedIds.length
      ? await prisma.companyProfile.findMany({
          where: { id: { in: claimedIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    const parsed = requests.map((u) => {
      let note: Record<string, unknown> | null = null;
      if (u.verificationNote) {
        try {
          note = JSON.parse(u.verificationNote);
        } catch {
          note = { justification: u.verificationNote };
        }
      }
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        verifiedBadge: u.verifiedBadge,
        emailVerified: u.emailVerified,
        claimedCompany: u.claimedCompanyId ? companyMap.get(u.claimedCompanyId) ?? null : null,
        createdAt: u.createdAt,
        note,
      };
    });

    return NextResponse.json({ success: true, data: { requests: parsed } });
  } catch (error) {
    logger.error('GET /api/admin/verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load verification requests');
  }
}

/**
 * POST /api/admin/verification
 * Admin-only. Approve or deny a pending verification request.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await req.json();
    const validation = validateBody(reviewVerificationSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { userId, decision, badge, reason } = validation.data;

    if (decision === 'approve' && !badge) {
      return validationError('badge is required when approving');
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        verificationRequested: true,
        verifiedBadge: true,
      },
    });

    if (!target) {
      return notFoundError('User');
    }
    if (!target.verificationRequested) {
      return validationError('This user has no pending verification request');
    }

    if (decision === 'approve' && badge) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verifiedBadge: badge,
          verificationRequested: false,
        },
      });

      try {
        await prisma.notification.create({
          data: {
            userId: target.id,
            type: 'system',
            title: 'Verification approved',
            message: `Your ${badge} badge has been approved. It will now appear next to your name across SpaceNexus.`,
            linkUrl: '/account/verification',
            relatedContentType: 'verification_request',
            relatedContentId: target.id,
          },
        });
      } catch (notifyErr) {
        logger.error('Failed to notify user of approval', {
          userId: target.id,
          error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        });
      }

      logger.info('Verification approved', {
        adminId: session.user.id,
        userId: target.id,
        badge,
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationRequested: false,
        },
      });

      try {
        await prisma.notification.create({
          data: {
            userId: target.id,
            type: 'system',
            title: 'Verification request declined',
            message: reason
              ? `Your verification request was declined. Reason: ${reason}`
              : 'Your verification request was declined. You can submit a new request with more details.',
            linkUrl: '/account/verification',
            relatedContentType: 'verification_request',
            relatedContentId: target.id,
          },
        });
      } catch (notifyErr) {
        logger.error('Failed to notify user of denial', {
          userId: target.id,
          error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        });
      }

      logger.info('Verification denied', {
        adminId: session.user.id,
        userId: target.id,
        reason: reason ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: decision === 'approve' ? 'Request approved' : 'Request denied' },
    });
  } catch (error) {
    logger.error('POST /api/admin/verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to process verification decision');
  }
}
