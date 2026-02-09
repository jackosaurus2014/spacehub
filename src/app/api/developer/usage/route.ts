import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, internalError, validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/developer/usage
 * Usage analytics for the current user's API keys.
 *
 * Query params:
 *   keyId    - Filter to a specific key (optional)
 *   period   - 'day' | 'week' | 'month' (default: 'month')
 *   startDate - ISO datetime (optional)
 *   endDate  - ISO datetime (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('keyId') || undefined;
    const period = searchParams.get('period') || 'month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!['day', 'week', 'month'].includes(period)) {
      return validationError('Period must be "day", "week", or "month"');
    }

    // Calculate date range
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return validationError('Invalid date format');
      }
    } else {
      endDate = new Date();
      startDate = new Date();
      if (period === 'day') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }
    }

    // Get user's API keys
    const userKeys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const userKeyIds = userKeys.map((k) => k.id);

    if (userKeyIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalCalls: 0,
          byEndpoint: [],
          byStatusCode: [],
          avgResponseTimeMs: 0,
          dailyBreakdown: [],
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    }

    // Build where clause
    const where: Record<string, unknown> = {
      apiKeyId: keyId && userKeyIds.includes(keyId) ? keyId : { in: userKeyIds },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Total calls
    const totalCalls = await prisma.apiUsageLog.count({ where });

    // By endpoint
    const byEndpoint = await prisma.apiUsageLog.groupBy({
      by: ['endpoint'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    // By status code
    const byStatusCode = await prisma.apiUsageLog.groupBy({
      by: ['statusCode'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Average response time
    const avgResult = await prisma.apiUsageLog.aggregate({
      where: {
        ...where,
        responseTimeMs: { not: null },
      },
      _avg: { responseTimeMs: true },
    });

    // Daily breakdown (raw query would be better, but using a grouped approach)
    // We'll get all logs and group client-side for simplicity
    const logs = await prisma.apiUsageLog.findMany({
      where,
      select: {
        createdAt: true,
        statusCode: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyMap = new Map<string, { calls: number; errors: number }>();
    for (const log of logs) {
      const day = log.createdAt.toISOString().split('T')[0];
      const entry = dailyMap.get(day) || { calls: 0, errors: 0 };
      entry.calls++;
      if (log.statusCode >= 400) {
        entry.errors++;
      }
      dailyMap.set(day, entry);
    }

    const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      calls: stats.calls,
      errors: stats.errors,
      errorRate: stats.calls > 0 ? Number((stats.errors / stats.calls * 100).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalCalls,
        byEndpoint: byEndpoint.map((e) => ({
          endpoint: e.endpoint,
          count: e._count.id,
        })),
        byStatusCode: byStatusCode.map((s) => ({
          statusCode: s.statusCode,
          count: s._count.id,
        })),
        avgResponseTimeMs: Math.round(avgResult._avg.responseTimeMs || 0),
        dailyBreakdown,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching API usage', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch usage data');
  }
}
