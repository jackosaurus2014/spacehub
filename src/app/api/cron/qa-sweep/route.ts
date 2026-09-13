/**
 * POST /api/cron/qa-sweep (2026-09-12) — deletes QA accounts (email ending in
 * QA_EMAIL_DOMAIN) older than QA_SWEEP_MAX_AGE_HOURS. Probes delete their own
 * account on a clean finish; this catches the ones a crashed run left behind
 * so no stray QA corporation lingers in the Space Tycoon world. Deleting the
 * User cascades to GameProfile and everything under it, exactly like the
 * site's own /api/account/delete. Admin accounts are never touched.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { QA_EMAIL_DOMAIN, QA_SWEEP_MAX_AGE_HOURS } from '@/lib/qa-accounts';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rejection = requireCronSecret(request);
  if (rejection) return rejection;
  try {
    const cutoff = new Date(Date.now() - QA_SWEEP_MAX_AGE_HOURS * 3600_000);
    const stale = await prisma.user.findMany({
      where: { email: { endsWith: QA_EMAIL_DOMAIN }, isAdmin: false, createdAt: { lt: cutoff } },
      select: { id: true, email: true, createdAt: true },
      take: 50,
    });
    const deleted: string[] = [];
    for (const u of stale) {
      try {
        await prisma.user.delete({ where: { id: u.id } });
        deleted.push(u.email);
      } catch (err) {
        logger.warn('qa-sweep: could not delete QA account', { email: u.email, error: err instanceof Error ? err.message : String(err) });
      }
    }
    if (deleted.length) logger.info('qa-sweep: removed stale QA accounts', { count: deleted.length });
    return NextResponse.json({ ok: true, found: stale.length, deleted: deleted.length, emails: deleted });
  } catch (err) {
    logger.error('qa-sweep failed', { error: err instanceof Error ? err.message : String(err) });
    return internalError('QA sweep failed');
  }
}
