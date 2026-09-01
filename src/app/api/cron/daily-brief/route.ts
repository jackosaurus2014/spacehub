import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import prisma from '@/lib/db';
import { composeDailyBrief } from '@/lib/daily-brief';
import { sendDailyDigest } from '@/lib/newsletter/email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 240;

/**
 * POST /api/cron/daily-brief
 *
 * Sends the opt-in Daily Brief (G7) at ~07:00 UTC every day: composed ONCE
 * from owned data (src/lib/daily-brief.ts), then batch-sent via the existing
 * Resend batch sender to NewsletterSubscriber rows with dailyBrief=true,
 * verified, and not unsubscribed.
 *
 * Idempotency: a DailyBriefSend row (date @unique, YYYY-MM-DD UTC) is created
 * to CLAIM the day before any email goes out — a rerun the same day (scheduler
 * catch-up, manual retry) sees the row (or hits the unique constraint) and
 * exits without sending. Days where every section is empty are recorded with
 * skipped=true and no email.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — standard /api/cron/* pattern.
 * CSRF: covered by the middleware's '/api/cron/' allow-list prefix.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);

  try {
    // Fast path: day already handled (sent or skipped).
    const existing = await prisma.dailyBriefSend.findUnique({ where: { date: dateKey } });
    if (existing) {
      logger.info('daily-brief: already handled today, exiting', {
        date: dateKey,
        sentCount: existing.sentCount,
        skipped: existing.skipped,
      });
      return NextResponse.json({ alreadySent: true, date: dateKey, sentCount: existing.sentCount, skipped: existing.skipped });
    }

    // Compose once, shared by all recipients.
    const brief = await composeDailyBrief(now);

    if (!brief) {
      // Nothing happened in the last 24h anywhere we track — skip the day.
      await claimDay(dateKey, { skipped: true });
      logger.info('daily-brief: every section empty, skipping the send day', { date: dateKey });
      return NextResponse.json({ skipped: true, date: dateKey, reason: 'all sections empty' });
    }

    // Recipients: verified, active, explicitly opted into the Daily Brief.
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { verified: true, unsubscribedAt: null, dailyBrief: true },
      select: { email: true, unsubscribeToken: true },
    });

    // Claim the day BEFORE sending — the @unique(date) constraint makes a
    // concurrent/duplicate invocation lose the race instead of double-sending.
    const claimed = await claimDay(dateKey, { subject: brief.subject });
    if (!claimed) {
      logger.info('daily-brief: lost claim race, another run owns today', { date: dateKey });
      return NextResponse.json({ alreadySent: true, date: dateKey });
    }

    if (subscribers.length === 0) {
      await prisma.dailyBriefSend.update({ where: { date: dateKey }, data: { sentCount: 0 } });
      logger.info('daily-brief: composed but no opted-in subscribers yet', { date: dateKey, sections: brief.sectionCount });
      return NextResponse.json({ date: dateKey, sentCount: 0, sections: brief.sectionCount });
    }

    const result = await sendDailyDigest(subscribers, brief.html, brief.plain, brief.subject);

    await prisma.dailyBriefSend.update({
      where: { date: dateKey },
      data: { sentCount: result.sentCount, failedCount: result.failedCount },
    });

    const durationMs = Date.now() - startedAt;
    logger.info('daily-brief cron completed', {
      date: dateKey,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      sections: brief.sectionCount,
      durationMs,
    });

    return NextResponse.json({
      date: dateKey,
      subject: brief.subject,
      sections: brief.sectionCount,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      durationMs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('daily-brief cron failed', { date: dateKey, error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

/**
 * Create today's ledger row. Returns false when another run already claimed
 * the day (unique-constraint violation P2002).
 */
async function claimDay(
  dateKey: string,
  data: { subject?: string; skipped?: boolean }
): Promise<boolean> {
  try {
    await prisma.dailyBriefSend.create({
      data: { date: dateKey, subject: data.subject ?? null, skipped: data.skipped ?? false },
    });
    return true;
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
      return false;
    }
    throw err;
  }
}
