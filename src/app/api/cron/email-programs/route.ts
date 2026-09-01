import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import prisma from '@/lib/db';
import { EMAIL_PROGRAMS } from '@/lib/email-programs';
import { sendDailyDigest } from '@/lib/newsletter/email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 240;

/**
 * POST /api/cron/email-programs?program=<id>
 *
 * One route, three independently scheduled opt-in email programs, all on the
 * shared EmailProgramSend ledger (@@unique([program, periodKey])):
 *
 *   markets-daily  weekdays 21:50 UTC  periodKey YYYY-MM-DD  flag marketsDaily
 *   hiring-index   3rd, 14:00 UTC      periodKey YYYY-MM (latest completed
 *                                      edition)              flag monthlyReports
 *   slip-report    3rd, 15:00 UTC      periodKey YYYY-MM     flag monthlyReports
 *
 * Flow (clone of /api/cron/daily-brief): requireCronSecret → ledger fast-exit
 * → compose ONCE → claim the period BEFORE any email goes out (a rerun or a
 * concurrent invocation hits the unique constraint and exits) → batch send →
 * record counts. A compose that returns null (feed down, nothing to report)
 * records skipped=true and sends nothing.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`. CSRF: /api/cron/ prefix.
 */

export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const program = request.nextUrl.searchParams.get('program') ?? '';
  const def = EMAIL_PROGRAMS[program];
  if (!def) {
    return NextResponse.json(
      { error: 'Unknown program', known: Object.keys(EMAIL_PROGRAMS) },
      { status: 400 }
    );
  }

  const startedAt = Date.now();
  const now = new Date();
  const periodKey = def.periodKey(now);
  const where = { program_periodKey: { program, periodKey } };

  try {
    // Fast path: period already handled (sent or skipped).
    const existing = await prisma.emailProgramSend.findUnique({ where });
    if (existing) {
      logger.info('email-programs: period already handled, exiting', {
        program,
        periodKey,
        sentCount: existing.sentCount,
        skipped: existing.skipped,
      });
      return NextResponse.json({
        alreadySent: true,
        program,
        periodKey,
        sentCount: existing.sentCount,
        skipped: existing.skipped,
      });
    }

    // Compose once, shared by all recipients.
    const email = await def.compose(now);

    if (!email) {
      await claimPeriod(program, periodKey, { skipped: true });
      logger.info('email-programs: nothing to send, period skipped', { program, periodKey });
      return NextResponse.json({ skipped: true, program, periodKey, reason: 'nothing to report' });
    }

    // Recipients: verified, active, explicitly opted into this program.
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { verified: true, unsubscribedAt: null, [def.flag]: true },
      select: { email: true, unsubscribeToken: true },
    });

    // Claim BEFORE sending — the unique constraint makes a concurrent or
    // duplicate invocation lose the race instead of double-sending.
    const claimed = await claimPeriod(program, periodKey, { subject: email.subject });
    if (!claimed) {
      logger.info('email-programs: lost claim race, another run owns this period', { program, periodKey });
      return NextResponse.json({ alreadySent: true, program, periodKey });
    }

    if (subscribers.length === 0) {
      await prisma.emailProgramSend.update({ where, data: { sentCount: 0 } });
      logger.info('email-programs: composed but no opted-in subscribers yet', { program, periodKey });
      return NextResponse.json({ program, periodKey, subject: email.subject, sentCount: 0 });
    }

    const result = await sendDailyDigest(subscribers, email.html, email.plain, email.subject);

    await prisma.emailProgramSend.update({
      where,
      data: { sentCount: result.sentCount, failedCount: result.failedCount },
    });

    const durationMs = Date.now() - startedAt;
    logger.info('email-programs cron completed', {
      program,
      periodKey,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      durationMs,
    });

    return NextResponse.json({
      program,
      periodKey,
      subject: email.subject,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      durationMs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('email-programs cron failed', { program, periodKey, error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

/**
 * Create the ledger row for (program, periodKey). Returns false when another
 * run already claimed it (unique-constraint violation P2002).
 */
async function claimPeriod(
  program: string,
  periodKey: string,
  data: { subject?: string; skipped?: boolean }
): Promise<boolean> {
  try {
    await prisma.emailProgramSend.create({
      data: { program, periodKey, subject: data.subject ?? null, skipped: data.skipped ?? false },
    });
    return true;
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
      return false;
    }
    throw err;
  }
}
