import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import v8 from 'v8';

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

  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {};

  // 1. Database connection
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart, error: err instanceof Error ? err.message : 'Unknown' };
  }

  // 2. Memory usage — measured against V8's heap LIMIT, not heapTotal.
  // heapTotal is the lazily-grown committed heap, so used/total sits near
  // 100% during normal operation; on Next 15 that tripped this check at
  // startup, the endpoint answered 503 "degraded", and Railway's health
  // check failed the whole deploy (2026-09-02, d09a3bb0).
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapLimitMB = Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024);
  checks.memory = {
    status: heapLimitMB > 0 && heapUsedMB >= heapLimitMB * 0.9 ? 'error' : 'ok',
    latencyMs: heapUsedMB,
  };

  // 3. Uptime
  checks.uptime = { status: 'ok', latencyMs: Math.round(process.uptime()) };

  // Overall status
  const allOk = Object.values(checks).every(c => c.status === 'ok');

  const response: Record<string, unknown> = {
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    checks,
  };

  if (detailed) {
    // Dynamic import to avoid pulling cron-scheduler into Edge runtime
    try {
      const { getCronJobStatus } = await import('@/lib/cron-scheduler');
      response.cron = getCronJobStatus();
    } catch (error) {
      logger.warn('Cron scheduler not available for health check', { error: error instanceof Error ? error.message : String(error) });
      response.cron = { error: 'Cron scheduler not available' };
    }

    try {
      const { getCircuitBreakerStatus } = await import('@/lib/circuit-breaker');
      response.circuitBreakers = getCircuitBreakerStatus();
    } catch (error) {
      logger.warn('Circuit breaker status not available for health check', { error: error instanceof Error ? error.message : String(error) });
      response.circuitBreakers = { error: 'Not available' };
    }

    // Set degraded status if any cron jobs are stale
    const cronData = response.cron as { summary?: { stale?: number } } | undefined;
    if (cronData?.summary && cronData.summary.stale && cronData.summary.stale > 0) {
      response.status = 'degraded';
    }
  }

  return NextResponse.json(response, { status: allOk ? 200 : 503 });
}
