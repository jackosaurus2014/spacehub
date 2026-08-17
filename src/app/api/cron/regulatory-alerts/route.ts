import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { processRegulatoryAlerts } from '@/lib/alerts/regulatory-alert-processor';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/regulatory-alerts
 *
 * Hourly cron (:20, see src/lib/cron-scheduler.ts) that sends batched
 * regulatory alert emails to Pro users on the 'immediate' frequency
 * ("within the hour"). Daily-frequency users are handled by the 08:00 UTC
 * watchlist-alerts refresh branch (/api/refresh?type=watchlist-alerts).
 *
 * Cheap when idle: two availability probes + one indexed prefs query when
 * nobody is on the immediate frequency. Fail-soft before `prisma db push`.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`. The /api/cron/ prefix is
 * covered by the middleware CSRF cron allowlist.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const stats = await processRegulatoryAlerts('immediate');
    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    logger.error('Regulatory alerts cron failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Regulatory alert processing failed' },
      { status: 500 }
    );
  }
}
