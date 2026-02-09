import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret } from '@/lib/errors';
import { deliverAlerts, sendDailyDigest, sendWeeklyDigest } from '@/lib/alerts/alert-delivery';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/alerts/process
 * Protected by CRON_SECRET. Called by a cron job to:
 * 1. Process pending alert deliveries
 * 2. Run daily/weekly digest email checks
 *
 * Query params:
 * - type: "deliver" | "daily_digest" | "weekly_digest" | undefined (all)
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  const results: Record<string, unknown> = {};

  try {
    // Process pending deliveries
    if (!type || type === 'deliver') {
      const deliveryStats = await deliverAlerts(prisma);
      results.deliveries = deliveryStats;
    }

    // Run daily digest
    if (!type || type === 'daily_digest') {
      const digestStats = await sendDailyDigest(prisma);
      results.dailyDigest = digestStats;
    }

    // Run weekly digest
    if (type === 'weekly_digest') {
      const weeklyStats = await sendWeeklyDigest(prisma);
      results.weeklyDigest = weeklyStats;
    }

    logger.info('Alert processing cron completed', {
      type: type || 'all',
      results,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Alert processing complete',
        type: type || 'all',
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Alert processing cron error', {
      type: type || 'all',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Alert processing failed',
        results,
      },
      { status: 500 }
    );
  }
}
