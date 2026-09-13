import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import prisma from '@/lib/db';
import { buildMorningBrief, sendMorningBriefAlert } from '@/lib/morning-brief';
import { isWeekdayUtc, issueDateKey } from '@/lib/morning-brief/select';
import { sendDailyDigest } from '@/lib/newsletter/email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 240;

/**
 * POST /api/cron/morning-brief — SpaceNexus AM (2026-09-12).
 *
 * Weekdays 12:00 UTC (08:00 ET). Flow, cloned from /api/cron/daily-brief:
 * weekday check → ledger fast-exit (MorningBrief.date @unique) → CLAIM the
 * day in status 'sending' before anything else → build (pool → rank → Sonnet
 * draft → gates) → on a gate failure record status 'failed' + reasons, email
 * alertEmail(), send NOTHING → otherwise batch-send to NewsletterSubscriber
 * rows with morningBrief=true → record counts, issue JSON and the rendered
 * HTML (the /brief/am/[date] archive reads them) → DataRefreshLog row.
 *
 * Idempotent per UTC date: a rerun (scheduler catch-up, manual retry) sees
 * the row and exits. A 'failed' day is NOT retried automatically — the
 * founder can eyeball the preview and re-run by deleting the row.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`. CSRF: /api/cron/ prefix.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();
  const now = new Date();
  const date = issueDateKey(now);

  if (!isWeekdayUtc(now)) {
    return NextResponse.json({ skipped: true, date, reason: 'weekend' });
  }

  try {
    const existing = await prisma.morningBrief.findUnique({ where: { date }, select: { status: true, sentCount: true } });
    if (existing) {
      logger.info('morning-brief: already handled today, exiting', { date, status: existing.status });
      return NextResponse.json({ alreadyHandled: true, date, status: existing.status, sentCount: existing.sentCount });
    }

    const claimed = await claimDay(date);
    if (!claimed) {
      logger.info('morning-brief: lost claim race, another run owns today', { date });
      return NextResponse.json({ alreadyHandled: true, date });
    }

    const built = await buildMorningBrief(now);

    if (!built.gate.ok || !built.rendered || !built.issue) {
      const errorLog = built.gate.failures.join('\n');
      await prisma.morningBrief.update({
        where: { date },
        data: {
          status: 'failed',
          errorLog,
          issue: built.issue ? JSON.stringify(built.issue) : null,
          aiModel: built.issue?.model ?? null,
        },
      });
      await sendMorningBriefAlert(date, built.gate.failures);
      await logRun(date, 'failed', 0, built.poolSize, Date.now() - startedAt, errorLog);
      logger.warn('morning-brief: withheld (gates failed)', { date, failures: built.gate.failures });
      return NextResponse.json({ sent: false, date, failures: built.gate.failures, poolSize: built.poolSize }, { status: 200 });
    }

    const { issue, rendered } = built;

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { verified: true, unsubscribedAt: null, morningBrief: true },
      select: { email: true, unsubscribeToken: true },
    });

    // Freeze the issue on the ledger before sending so the archive page can
    // serve it even if the batch send partially fails.
    await prisma.morningBrief.update({
      where: { date },
      data: {
        subject: rendered.subject,
        preheader: rendered.preheader,
        issue: JSON.stringify(issue),
        htmlContent: rendered.html,
        plainContent: rendered.plain,
        aiModel: issue.model,
      },
    });

    if (subscribers.length === 0) {
      await prisma.morningBrief.update({ where: { date }, data: { status: 'sent', sentCount: 0 } });
      await logRun(date, 'success', 0, built.poolSize, Date.now() - startedAt);
      logger.info('morning-brief: composed but no opted-in subscribers yet', { date });
      return NextResponse.json({ sent: true, date, subject: rendered.subject, sentCount: 0, stories: issue.stories.length });
    }

    const result = await sendDailyDigest(subscribers, rendered.html, rendered.plain, rendered.subject);

    await prisma.morningBrief.update({
      where: { date },
      data: {
        status: result.success ? 'sent' : 'failed',
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        errorLog: result.errors.length ? result.errors.join('\n') : null,
      },
    });
    await logRun(date, result.success ? 'success' : 'partial', result.sentCount, built.poolSize, Date.now() - startedAt, result.errors.join('\n') || undefined);

    logger.info('morning-brief cron completed', {
      date, sentCount: result.sentCount, failedCount: result.failedCount, stories: issue.stories.length, durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      sent: true, date, subject: rendered.subject, stories: issue.stories.length,
      sentCount: result.sentCount, failedCount: result.failedCount, durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('morning-brief cron failed', { date, error: msg });
    await prisma.morningBrief.update({ where: { date }, data: { status: 'failed', errorLog: msg } }).catch(() => { /* best effort */ });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

/** Create today's ledger row in 'sending'. False when another run already owns the day (P2002). */
async function claimDay(date: string): Promise<boolean> {
  try {
    await prisma.morningBrief.create({ data: { date, status: 'sending' } });
    return true;
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') return false;
    throw err;
  }
}

async function logRun(date: string, status: 'success' | 'partial' | 'failed', sent: number, pool: number, duration: number, errorMessage?: string): Promise<void> {
  try {
    await prisma.dataRefreshLog.create({
      data: {
        module: 'morning-brief',
        refreshType: 'email-send',
        status,
        itemsChecked: pool,
        itemsUpdated: sent,
        duration,
        errorMessage: errorMessage ?? null,
        details: JSON.stringify({ date }),
      },
    });
  } catch {
    // telemetry only
  }
}
