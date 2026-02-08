import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { expireStaleContent, pruneRefreshLogs, logRefresh } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { requireCronSecret } = await import('@/lib/errors');
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const start = Date.now();

  try {
    // 1. Expire stale content (past expiresAt but still active)
    const expiredCount = await expireStaleContent();

    // 2. Prune old refresh logs (older than 30 days)
    const prunedLogs = await pruneRefreshLogs(30);

    // 3. Get summary stats
    const totalContent = await prisma.dynamicContent.count();
    const activeContent = await prisma.dynamicContent.count({ where: { isActive: true } });
    const inactiveContent = totalContent - activeContent;

    // 4. Get per-module freshness
    const modules = await prisma.dynamicContent.groupBy({
      by: ['module'],
      _count: true,
      where: { isActive: true },
    });

    const moduleStats = modules.map((m) => ({
      module: m.module,
      activeItems: m._count,
    }));

    await logRefresh('_system', 'cleanup', 'success', {
      itemsExpired: expiredCount,
      duration: Date.now() - start,
      details: { prunedLogs, totalContent, activeContent, inactiveContent },
    });

    logger.info('Staleness cleanup complete', {
      expired: expiredCount,
      prunedLogs,
      totalContent,
      activeContent,
    });

    return NextResponse.json({
      success: true,
      cleanup: {
        expiredItems: expiredCount,
        prunedLogEntries: prunedLogs,
        totalContent,
        activeContent,
        inactiveContent,
        moduleStats,
      },
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Cleanup operation failed' },
      { status: 500 }
    );
  }
}
