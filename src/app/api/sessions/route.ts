import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications-server';
import {
  validateBody,
  createSessionSchema,
  SESSION_TYPES,
  SESSION_STATUSES,
} from '@/lib/validations';
import {
  forbiddenError,
  internalError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ELIGIBLE_BADGES = new Set(['founder', 'investor', 'media', 'admin']);

/**
 * GET /api/sessions
 * List expert sessions (AMAs, office hours, workshops, panels)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionType = searchParams.get('type');
    const status = searchParams.get('status');
    const hostUserId = searchParams.get('hostUserId');
    const when = searchParams.get('when'); // upcoming | past
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '24', 10) || 24,
      100
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10) || 0,
      0
    );

    const where: Record<string, unknown> = {};
    if (sessionType && (SESSION_TYPES as readonly string[]).includes(sessionType)) {
      where.sessionType = sessionType;
    }
    if (status && (SESSION_STATUSES as readonly string[]).includes(status)) {
      where.status = status;
    }
    if (hostUserId) {
      where.hostUserId = hostUserId;
    }
    if (when === 'upcoming') {
      where.scheduledAt = { gte: new Date() };
    } else if (when === 'past') {
      where.scheduledAt = { lt: new Date() };
    }

    const orderBy =
      when === 'past'
        ? { scheduledAt: 'desc' as const }
        : { scheduledAt: 'asc' as const };

    const [sessions, total] = await Promise.all([
      prisma.expertSession.findMany({
        where: where as never,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.expertSession.count({ where: where as never }),
    ]);

    const hostIds = Array.from(new Set(sessions.map((s) => s.hostUserId)));
    const hosts = hostIds.length
      ? await prisma.user.findMany({
          where: { id: { in: hostIds } },
          select: {
            id: true,
            name: true,
            
            verifiedBadge: true,
          },
        })
      : [];
    const hostMap = new Map(hosts.map((h) => [h.id, h]));

    const payload = sessions.map((s) => ({
      ...s,
      host: hostMap.get(s.hostUserId) || null,
    }));

    return NextResponse.json({
      success: true,
      data: { sessions: payload, total, limit, offset },
    });
  } catch (error) {
    logger.error('List sessions error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch sessions');
  }
}

/**
 * POST /api/sessions
 * Create a new session. Host must either have a MentorProfile OR
 * a verifiedBadge in (founder, investor, media, admin).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, verifiedBadge: true, isAdmin: true },
    });
    if (!user) {
      return unauthorizedError();
    }

    const mentor = await prisma.mentorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const hasEligibleBadge =
      user.isAdmin ||
      (user.verifiedBadge !== null &&
        user.verifiedBadge !== undefined &&
        ELIGIBLE_BADGES.has(user.verifiedBadge));

    if (!mentor && !hasEligibleBadge) {
      return forbiddenError(
        'Only verified founders, investors, media, admins, or mentors can host sessions.'
      );
    }

    const body = await request.json();
    const validation = validateBody(createSessionSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const scheduledAt = new Date(data.scheduledAt);
    if (scheduledAt.getTime() < Date.now() - 60 * 1000) {
      return validationError('scheduledAt must be in the future');
    }

    const created = await prisma.expertSession.create({
      data: {
        hostUserId: user.id,
        sessionType: data.sessionType,
        title: data.title,
        description: data.description,
        scheduledAt,
        durationMin: data.durationMin ?? 60,
        maxAttendees: data.maxAttendees ?? null,
        streamUrl: data.streamUrl ?? null,
        tags: data.tags ?? [],
        status: 'scheduled',
      },
    });

    logger.info('Expert session created', {
      sessionId: created.id,
      hostUserId: user.id,
      sessionType: created.sessionType,
    });

    // Notify followers of the host (fire-and-forget)
    (async () => {
      try {
        const followers = await prisma.userFollow.findMany({
          where: { followingId: user.id },
          select: { followerId: true },
        });
        await Promise.all(
          followers.map((f) =>
            createNotification({
              userId: f.followerId,
              type: 'system',
              title: 'New session scheduled',
              message: `${user.name || 'A host you follow'} scheduled "${created.title}"`,
              relatedUserId: user.id,
              relatedContentType: 'expert_session',
              relatedContentId: created.id,
              linkUrl: `/amas/${created.id}`,
            })
          )
        );
      } catch (err) {
        logger.error('Failed to notify followers of new session', {
          error: err instanceof Error ? err.message : String(err),
          sessionId: created.id,
        });
      }
    })();

    return NextResponse.json(
      { success: true, data: { session: created } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create session error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create session');
  }
}
