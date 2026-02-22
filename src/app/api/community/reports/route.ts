export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, contentReportSchema } from '@/lib/validations';
import {
  unauthorizedError,
  validationError,
  notFoundError,
  conflictError,
  internalError,
} from '@/lib/errors';

/**
 * POST /api/community/reports
 * Submit a content report
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(contentReportSchema, body);

    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const { contentType, contentId, reason, description } = validation.data;
    const reporterId = session.user.id;

    // Prevent duplicate reports (same user, same content, non-dismissed)
    const existingReport = await (prisma as any).contentReport.findFirst({
      where: {
        reporterId,
        contentType,
        contentId,
        status: { not: 'dismissed' },
      },
    });

    if (existingReport) {
      return conflictError('You have already reported this content');
    }

    // Verify the content exists
    let contentExists = false;

    switch (contentType) {
      case 'thread': {
        const thread = await (prisma as any).forumThread.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!thread;
        break;
      }
      case 'post': {
        const post = await (prisma as any).forumPost.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!post;
        break;
      }
      case 'message': {
        const message = await (prisma as any).directMessage.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!message;
        break;
      }
      case 'profile': {
        const profile = await (prisma as any).professionalProfile.findUnique({
          where: { id: contentId },
          select: { id: true },
        });
        contentExists = !!profile;
        break;
      }
      default:
        return validationError('Invalid content type');
    }

    if (!contentExists) {
      return notFoundError('Reported content');
    }

    // Create the report
    const report = await (prisma as any).contentReport.create({
      data: {
        reporterId,
        contentType,
        contentId,
        reason,
        description: description || null,
        status: 'pending',
      },
    });

    logger.info('Content report submitted', {
      reportId: report.id,
      reporterId,
      contentType,
      contentId,
      reason,
    });

    return NextResponse.json(
      { success: true, reportId: report.id },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error submitting content report', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to submit report');
  }
}
