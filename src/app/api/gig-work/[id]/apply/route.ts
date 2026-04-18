import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  notFoundError,
  conflictError,
  internalError,
} from '@/lib/errors';
import { gigApplicationSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const APPLY_EVENT = 'gig_application';
const APPLY_MODULE = 'gig-work';

/**
 * POST /api/gig-work/[id]/apply — Apply to a gig (auth required).
 *
 * No dedicated GigApplication model exists in the schema, so applications
 * are persisted as ActivityLog rows with event="gig_application" and
 * metadata capturing the submission. `applicantCount` on the gig is
 * incremented atomically.
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

    const gig = await prisma.gigOpportunity.findUnique({
      where: { id: params.id },
      include: { employer: { select: { userId: true } } },
    });

    if (!gig) {
      return notFoundError('Gig');
    }

    if (!gig.isActive) {
      return validationError('This gig is no longer accepting applications');
    }

    // Prevent the employer applying to their own gig.
    if (gig.employer.userId === session.user.id) {
      return validationError('You cannot apply to your own gig');
    }

    const body = await req.json();
    const validation = validateBody(gigApplicationSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    // Reject duplicate applications from the same user for the same gig.
    const existing = await prisma.activityLog.findFirst({
      where: {
        userId: session.user.id,
        event: APPLY_EVENT,
        module: APPLY_MODULE,
        metadata: { path: ['gigId'], equals: params.id },
      },
      select: { id: true },
    });

    if (existing) {
      return conflictError('You have already applied to this gig');
    }

    const [log] = await prisma.$transaction([
      prisma.activityLog.create({
        data: {
          userId: session.user.id,
          event: APPLY_EVENT,
          module: APPLY_MODULE,
          metadata: {
            gigId: params.id,
            coverNote: data.coverNote,
            proposedRate: data.proposedRate ?? null,
            availableFrom: data.availableFrom ?? null,
            contactEmail: data.contactEmail ?? null,
            portfolioUrl: data.portfolioUrl ?? null,
          },
          userAgent: req.headers.get('user-agent') || null,
        },
      }),
      prisma.gigOpportunity.update({
        where: { id: params.id },
        data: { applicantCount: { increment: 1 } },
      }),
    ]);

    logger.info('Gig application submitted', {
      applicationId: log.id,
      gigId: params.id,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: { applicationId: log.id } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to submit gig application', {
      gigId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to submit application');
  }
}
