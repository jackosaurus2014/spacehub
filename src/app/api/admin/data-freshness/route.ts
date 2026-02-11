import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCircuitBreakerStatus } from '@/lib/circuit-breaker';
import { getAllModuleFreshness } from '@/lib/dynamic-content';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unauthorizedError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Check if the request is authorized via Bearer token (CRON_SECRET) or admin session.
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  if (!authHeader) {
    const session = await getServerSession(authOptions);
    if (session?.user?.isAdmin) return true;
  }

  return false;
}

/**
 * GET /api/admin/data-freshness
 *
 * Aggregates data freshness information across all data sources:
 * - DynamicContent freshness per module
 * - Circuit breaker status for external APIs
 * - Recent DataRefreshLog entries
 * - Latest timestamps from key data tables (news, events, blogs)
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return unauthorizedError('Admin access required');
    }

    const now = new Date();

    const [
      dynamicContent,
      circuitBreakers,
      recentRefreshLogs,
      latestNews,
      latestEvent,
      latestBlog,
    ] = await Promise.all([
      getAllModuleFreshness().catch(() => ({})),
      Promise.resolve(getCircuitBreakerStatus()),
      prisma.dataRefreshLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.newsArticle.findFirst({
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true },
      }),
      prisma.spaceEvent.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.blogPost.findFirst({
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true },
      }),
    ]);

    const newsAgeMinutes = latestNews
      ? Math.floor((now.getTime() - latestNews.fetchedAt.getTime()) / 1000 / 60)
      : null;
    const eventsAgeMinutes = latestEvent
      ? Math.floor((now.getTime() - latestEvent.updatedAt.getTime()) / 1000 / 60)
      : null;
    const blogsAgeMinutes = latestBlog
      ? Math.floor((now.getTime() - latestBlog.fetchedAt.getTime()) / 1000 / 60)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        dynamicContent,
        circuitBreakers,
        recentRefreshLogs,
        tableTimestamps: {
          news: {
            lastFetchedAt: latestNews?.fetchedAt ?? null,
            ageMinutes: newsAgeMinutes,
          },
          events: {
            lastUpdatedAt: latestEvent?.updatedAt ?? null,
            ageMinutes: eventsAgeMinutes,
          },
          blogs: {
            lastFetchedAt: latestBlog?.fetchedAt ?? null,
            ageMinutes: blogsAgeMinutes,
          },
        },
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Admin data-freshness GET failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to aggregate data freshness');
  }
}

/**
 * POST /api/admin/data-freshness
 *
 * Trigger a manual refresh for a specific module.
 * Accepts: { module: string } where module is a valid refresh type
 * (e.g. "news", "events", "blogs", "daily", "external-apis", "ai-research", etc.)
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return unauthorizedError('Admin access required');
    }

    const body = await request.json();
    const { module } = body as { module?: string };

    if (!module || typeof module !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "module" field in request body' },
        { status: 400 }
      );
    }

    logger.info('Admin manual refresh triggered', { module });

    // Build the internal refresh URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const refreshUrl = `${baseUrl}/api/refresh?type=${encodeURIComponent(module)}`;

    const cronSecret = process.env.CRON_SECRET;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cronSecret) {
      headers['Authorization'] = `Bearer ${cronSecret}`;
    }

    const refreshResponse = await fetch(refreshUrl, {
      method: 'POST',
      headers,
    });

    const refreshResult = await refreshResponse.json();

    return NextResponse.json({
      success: refreshResponse.ok,
      data: {
        module,
        refreshResult,
        triggeredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Admin data-freshness POST failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to trigger manual refresh');
  }
}
