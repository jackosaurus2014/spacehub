import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireCronSecret, unauthorizedError, internalError } from '@/lib/errors';
import { checkAndAlertStaleness } from '@/lib/freshness-alerts';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Check if the request is authorized via CRON_SECRET or admin session.
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Timing-safe Bearer token check for cron/automated calls
  if (requireCronSecret(request) === null) return true;

  // Fall back to admin session (only when no Bearer token was attempted)
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    const session = await getServerSession(authOptions);
    if (session?.user?.isAdmin) return true;
  }

  return false;
}

/**
 * POST /api/admin/freshness-check
 *
 * Runs a staleness check across all data modules and creates
 * admin notifications for any stale or expired modules.
 *
 * Auth: CRON_SECRET bearer token or admin session.
 * Can be triggered by a cron job or manually from the admin dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return unauthorizedError('Admin access required');
    }

    logger.info('Freshness check triggered');

    const result = await checkAndAlertStaleness();

    logger.info('Freshness check complete', {
      staleCount: result.staleModules.length,
      expiredCount: result.expiredModules.length,
      alertsSent: result.alertsSent,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Freshness check API failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to run freshness check');
  }
}
