import { NextResponse } from 'next/server';
import { internalError } from '@/lib/errors';
import { apiCache } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function formatMemoryMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2);
}

export async function GET() {
  try {
    const memUsage = process.memoryUsage();

    const status: Record<string, unknown> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime()),
      },
      memory: {
        rss: `${formatMemoryMB(memUsage.rss)} MB`,
        heapTotal: `${formatMemoryMB(memUsage.heapTotal)} MB`,
        heapUsed: `${formatMemoryMB(memUsage.heapUsed)} MB`,
        external: `${formatMemoryMB(memUsage.external)} MB`,
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    // Try to include circuit breaker statuses if available
    try {
      const circuitBreaker = await import('@/lib/circuit-breaker');
      if (circuitBreaker && typeof circuitBreaker.getCircuitBreakerStatus === 'function') {
        status.circuitBreakers = circuitBreaker.getCircuitBreakerStatus();
      }
    } catch {
      // circuit-breaker module not available yet, skip
    }

    // Include API cache statistics
    status.apiCache = apiCache.getStats();

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Cache status endpoint error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to retrieve system status');
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}
