import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  unauthorizedError,
  notFoundError,
  internalError,
  conflictError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_REASONS = new Set([
  'spam',
  'harassment',
  'itar_violation',
  'copyright',
  'inappropriate',
  'hate_speech',
  'other',
]);

/**
 * POST /api/live-chat/[id]/flag
 * Body: { reason?, description? }
 *
 * Flags a chat message for moderator review.
 * Creates a ContentReport with contentType='message'.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('Sign in to flag messages');
    }
    const reporterId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const reasonRaw = typeof body.reason === 'string' ? body.reason : 'inappropriate';
    const reason = VALID_REASONS.has(reasonRaw) ? reasonRaw : 'inappropriate';
    const description =
      typeof body.description === 'string'
        ? body.description.slice(0, 500).trim() || null
        : null;

    const message = await prisma.launchChatMessage.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!message) {
      return notFoundError('Chat message');
    }

    // Avoid duplicate pending reports from the same reporter for same content
    const existing = await prisma.contentReport.findFirst({
      where: {
        reporterId,
        contentType: 'message',
        contentId: message.id,
        status: 'pending',
      },
      select: { id: true },
    });

    if (existing) {
      return conflictError('You have already flagged this message');
    }

    const report = await prisma.contentReport.create({
      data: {
        reporterId,
        contentType: 'message',
        contentId: message.id,
        reason,
        description,
        status: 'pending',
      },
      select: { id: true, createdAt: true },
    });

    logger.info('live-chat message flagged', {
      messageId: message.id,
      reportId: report.id,
      reason,
      reporterId,
    });

    return NextResponse.json(
      { success: true, data: { reportId: report.id } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('live-chat flag failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to flag message');
  }
}
