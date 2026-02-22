import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, requireCronSecret, notFoundError, createSuccessResponse } from '@/lib/errors';
import {
  calculateCompleteness,
  calculateCompletenessBreakdown,
  COMPLETENESS_COUNT_SELECT,
  COMPLETENESS_SCALAR_SELECT,
} from '@/lib/company-completeness';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company-profiles/recalculate?slug=xxx
 *
 * Recalculate completeness for a single company (no auth required).
 * Returns the updated score and per-category breakdown.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'slug query parameter is required' } },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma.companyProfile as any;

    const company = await db.findUnique({
      where: { slug },
      select: {
        ...COMPLETENESS_SCALAR_SELECT,
        _count: { select: COMPLETENESS_COUNT_SELECT },
      },
    });

    if (!company) {
      return notFoundError('Company profile');
    }

    const oldScore = company.dataCompleteness ?? 0;
    const breakdown = calculateCompletenessBreakdown(company);

    await db.update({
      where: { slug },
      data: { dataCompleteness: breakdown.total },
    });

    logger.info('Recalculated company completeness', {
      slug,
      oldScore,
      newScore: breakdown.total,
    });

    return createSuccessResponse({
      slug,
      name: company.name,
      oldScore,
      newScore: breakdown.total,
      breakdown,
    });
  } catch (error) {
    logger.error('Failed to recalculate company completeness', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to recalculate company completeness');
  }
}

/**
 * POST /api/company-profiles/recalculate
 *
 * Bulk-recalculate completeness for ALL company profiles.
 * Requires CRON_SECRET Bearer token for authorization.
 * Returns stats: { updated, avgBefore, avgAfter }.
 */
export async function POST(request: NextRequest) {
  // Authenticate
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma.companyProfile as any;

    const companies = await db.findMany({
      select: {
        ...COMPLETENESS_SCALAR_SELECT,
        _count: { select: COMPLETENESS_COUNT_SELECT },
      },
    });

    if (companies.length === 0) {
      return createSuccessResponse({ updated: 0, avgBefore: 0, avgAfter: 0 });
    }

    let totalBefore = 0;
    let totalAfter = 0;
    let updated = 0;

    // Process in batches of 50 to avoid overwhelming the DB
    const BATCH_SIZE = 50;
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE);
      const updates = batch.map((company: any) => {
        const oldScore = company.dataCompleteness ?? 0;
        const newScore = calculateCompleteness(company);
        totalBefore += oldScore;
        totalAfter += newScore;
        updated++;
        return db.update({
          where: { slug: company.slug },
          data: { dataCompleteness: newScore },
        });
      });
      await Promise.all(updates);
    }

    const avgBefore = Math.round(totalBefore / updated);
    const avgAfter = Math.round(totalAfter / updated);

    logger.info('Bulk recalculated company completeness', {
      updated,
      avgBefore,
      avgAfter,
    });

    return createSuccessResponse({
      updated,
      avgBefore,
      avgAfter,
    });
  } catch (error) {
    logger.error('Failed to bulk recalculate company completeness', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to bulk recalculate company completeness');
  }
}
