import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

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
