import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { processLaunchWeekEmail } from '@/lib/launch-week-email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/launch-week-email
 *
 * Weekly cron (Mondays 12:30 UTC) that sends "This Week in Launches" — the
 * retention email for SpaceNexus's #1 content theme. Composes from SpaceEvent
 * (type='launch') for the next 7 days and sends to verified newsletter
 * subscribers via the existing 'news' NotificationPreference bucket. See
 * src/lib/launch-week-email.ts for the full compose/targeting/idempotency
 * design and its documented limitation (no dedicated per-topic opt-in column
 * on NewsletterSubscriber).
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (or localhost when
 * CRON_SECRET is unset) — same pattern as the rest of the /api/cron/* family.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();

  try {
    const result = await processLaunchWeekEmail();
    const durationMs = Date.now() - startedAt;

    logger.info('launch-week-email cron completed', { ...result, durationMs });

    return NextResponse.json({ ...result, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('launch-week-email cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
