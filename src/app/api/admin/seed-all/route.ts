export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — seeding takes time

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface SeedResult {
  endpoint: string;
  status: 'success' | 'error';
  message?: string;
  durationMs: number;
}

async function callInitEndpoint(
  baseUrl: string,
  path: string,
  secret: string
): Promise<SeedResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
    });

    const durationMs = Date.now() - start;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        endpoint: path,
        status: 'error',
        message: `HTTP ${res.status}: ${body.slice(0, 200)}`,
        durationMs,
      };
    }

    return { endpoint: path, status: 'success', durationMs };
  } catch (error) {
    return {
      endpoint: path,
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * POST /api/admin/seed-all
 *
 * Calls all init endpoints to populate DynamicContent tables.
 * Requires CRON_SECRET authorization.
 * Runs in 3 phases: master init, then 2 parallel batches.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const startTime = Date.now();

  // Determine base URL from request
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const secret = process.env.CRON_SECRET || '';

  const results: SeedResult[] = [];

  logger.info('Seed-all: starting data pipeline seeding');

  // Phase 1: Master init (sequential — seeds core data)
  const masterResult = await callInitEndpoint(baseUrl, '/api/init', secret);
  results.push(masterResult);
  logger.info('Seed-all: master init complete', { status: masterResult.status });

  // Phase 2: Module inits — batch A (parallel)
  const batchA = [
    '/api/blueprints/init',
    '/api/orbital-services/init',
    '/api/space-mining/init',
    '/api/orbital-slots/init',
    '/api/spectrum/init',
    '/api/companies/init',
    '/api/opportunities/init',
  ];

  const batchAResults = await Promise.all(
    batchA.map((path) => callInitEndpoint(baseUrl, path, secret))
  );
  results.push(...batchAResults);
  logger.info('Seed-all: batch A complete', {
    success: batchAResults.filter((r) => r.status === 'success').length,
    errors: batchAResults.filter((r) => r.status === 'error').length,
  });

  // Phase 3: Module inits — batch B (parallel)
  const batchB = [
    '/api/workforce/init',
    '/api/space-insurance/init',
    '/api/solar-exploration/init',
    '/api/solar-flares/init',
    '/api/debris-monitor/init',
    '/api/resources/init',
  ];

  const batchBResults = await Promise.all(
    batchB.map((path) => callInitEndpoint(baseUrl, path, secret))
  );
  results.push(...batchBResults);
  logger.info('Seed-all: batch B complete', {
    success: batchBResults.filter((r) => r.status === 'success').length,
    errors: batchBResults.filter((r) => r.status === 'error').length,
  });

  // Phase 4: Module inits — batch C (parallel)
  const batchC = [
    '/api/government-contracts/init',
    '/api/launch-windows/init',
    '/api/operational-awareness/init',
    '/api/regulatory-agencies/init',
    '/api/compliance/init',
  ];

  const batchCResults = await Promise.all(
    batchC.map((path) => callInitEndpoint(baseUrl, path, secret))
  );
  results.push(...batchCResults);
  logger.info('Seed-all: batch C complete', {
    success: batchCResults.filter((r) => r.status === 'success').length,
    errors: batchCResults.filter((r) => r.status === 'error').length,
  });

  const totalDuration = Date.now() - startTime;
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  logger.info('Seed-all: complete', {
    total: results.length,
    success: successCount,
    errors: errorCount,
    durationMs: totalDuration,
  });

  return NextResponse.json({
    success: errorCount === 0,
    summary: {
      total: results.length,
      success: successCount,
      errors: errorCount,
      durationMs: totalDuration,
    },
    results,
  });
}
