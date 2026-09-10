import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { sendListingExpiryEmail } from '@/lib/employer-email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/job-posting-expiry (2026-09-10, daily) — emails employers
 * whose direct listing expires within 3 days (once) and whose listing expired
 * in the last day (once). Idempotent through expiryNoticeAt / expiredNoticeAt
 * on the posting, so a rerun sends nothing twice.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;
  const now = new Date();
  const in3d = new Date(now.getTime() + 3 * 86_400_000);
  const dayAgo = new Date(now.getTime() - 86_400_000);
  let expiring = 0; let expired = 0;
  try {
    const soon = await prisma.spaceJobPosting.findMany({
      where: { source: 'direct', paidAt: { not: null }, isActive: true, expiryNoticeAt: null, expiresAt: { gt: now, lte: in3d }, contactEmail: { not: null } },
      select: { id: true, title: true, expiresAt: true, contactEmail: true, viewCount: true, applyClicks: true, _count: { select: { applications: true } } },
      take: 200,
    });
    for (const r of soon) {
      await sendListingExpiryEmail({ to: r.contactEmail!, jobId: r.id, jobTitle: r.title, expiresAt: r.expiresAt!, expired: false, views: r.viewCount, applyClicks: r.applyClicks, applicants: r._count.applications });
      await prisma.spaceJobPosting.update({ where: { id: r.id }, data: { expiryNoticeAt: now } });
      expiring++;
    }
    const gone = await prisma.spaceJobPosting.findMany({
      where: { source: 'direct', paidAt: { not: null }, expiredNoticeAt: null, expiresAt: { gt: dayAgo, lte: now }, contactEmail: { not: null } },
      select: { id: true, title: true, expiresAt: true, contactEmail: true, viewCount: true, applyClicks: true, _count: { select: { applications: true } } },
      take: 200,
    });
    for (const r of gone) {
      await sendListingExpiryEmail({ to: r.contactEmail!, jobId: r.id, jobTitle: r.title, expiresAt: r.expiresAt!, expired: true, views: r.viewCount, applyClicks: r.applyClicks, applicants: r._count.applications });
      await prisma.spaceJobPosting.update({ where: { id: r.id }, data: { expiredNoticeAt: now } });
      expired++;
    }
    logger.info('Job posting expiry cron', { expiring, expired });
    return NextResponse.json({ success: true, expiring, expired });
  } catch (error) {
    logger.error('Job posting expiry cron failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, expiring, expired }, { status: 500 });
  }
}
