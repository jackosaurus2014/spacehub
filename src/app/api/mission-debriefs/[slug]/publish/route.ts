import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
} from '@/lib/errors';
import { createNotification } from '@/lib/notifications/create';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mission-debriefs/[slug]/publish
 *
 * Admin only. Sets publishedAt = now and notifies followers of any companies
 * referenced in companyIds. Idempotent: re-publishing refreshes publishedAt.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (!session.user.isAdmin) return forbiddenError('Admin access required');

    const existing = await prisma.missionDebrief.findUnique({
      where: { slug: params.slug },
    });
    if (!existing) return notFoundError('Mission debrief');

    const debrief = await prisma.missionDebrief.update({
      where: { slug: params.slug },
      data: { publishedAt: new Date() },
    });

    // Notify followers of involved companies (best-effort).
    const companyIds = (debrief.companyIds as string[]) || [];
    let notified = 0;
    if (companyIds.length > 0) {
      try {
        const watchers = await prisma.companyWatchlistItem.findMany({
          where: { companyProfileId: { in: companyIds } },
          select: { userId: true, companyProfileId: true },
        });
        // Dedup per-user (a user watching multiple involved companies gets one alert)
        const seen = new Set<string>();
        for (const w of watchers) {
          if (seen.has(w.userId)) continue;
          seen.add(w.userId);
          await createNotification({
            userId: w.userId,
            type: 'watchlist_alert',
            title: `Mission debrief published: ${debrief.missionName}`,
            body: debrief.executiveSummary.slice(0, 240),
            link: `/mission-debriefs/${debrief.slug}`,
            relatedContentType: 'mission_debrief',
            relatedContentId: debrief.id,
          });
          notified++;
        }
      } catch (notifyErr) {
        // Notification failures should not block publishing
        logger.warn('Failed to notify watchers of mission debrief publish', {
          slug: debrief.slug,
          error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        });
      }
    }

    logger.info('Mission debrief published', {
      slug: debrief.slug,
      notifiedUsers: notified,
      userId: session.user.id,
    });

    return NextResponse.json({ debrief, notifiedUsers: notified });
  } catch (error) {
    logger.error('Failed to publish mission debrief', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to publish mission debrief');
  }
}
