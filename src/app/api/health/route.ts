import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Fallback cron initialization — if instrumentation.ts didn't start the
// scheduler (e.g. Railway doesn't call register()), start it on first
// health check hit. This is safe to call multiple times since it's guarded.
let cronInitAttempted = false;
async function ensureCronStarted() {
  if (cronInitAttempted) return;
  cronInitAttempted = true;
  try {
    const { getCronJobStatus, startCronJobs } = await import('@/lib/cron-scheduler');
    const status = getCronJobStatus();
    if (!status.schedulerUpSince) {
      logger.info('Cron scheduler not running — starting via health endpoint fallback');
      startCronJobs();
    }
  } catch (e) {
    logger.error('Failed to start cron scheduler fallback', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  // Ensure cron scheduler is running (fallback for Railway)
  await ensureCronStarted();

  const response: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  if (detailed) {
    // Dynamic import to avoid pulling cron-scheduler into Edge runtime
    try {
      const { getCronJobStatus } = await import('@/lib/cron-scheduler');
      response.cron = getCronJobStatus();
    } catch {
      response.cron = { error: 'Cron scheduler not available' };
    }

    try {
      const { getCircuitBreakerStatus } = await import('@/lib/circuit-breaker');
      response.circuitBreakers = getCircuitBreakerStatus();
    } catch {
      response.circuitBreakers = { error: 'Not available' };
    }

    // Set degraded status if any cron jobs are stale
    const cronData = response.cron as { summary?: { stale?: number } } | undefined;
    if (cronData?.summary && cronData.summary.stale && cronData.summary.stale > 0) {
      response.status = 'degraded';
    }
  }

  return NextResponse.json(response);
}
