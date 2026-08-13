export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unauthorizedError, forbiddenError, internalError } from '@/lib/errors';
import { getGrowthSnapshot } from '@/lib/growth-metrics';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/growth-metrics
 * Returns GA4 MAU/WAU + Search Console clicks/impressions against the
 * 10k-MAU-by-2026-11-12 growth goal curve. Admin-only, never cached.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const data = await getGrowthSnapshot();

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error('Admin growth-metrics GET failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError(err instanceof Error ? err.message : 'Failed to load growth metrics');
  }
}
