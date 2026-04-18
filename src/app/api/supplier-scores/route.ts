import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  forbiddenError,
  internalError,
  unauthorizedError,
  validationError,
  constrainPagination,
  constrainOffset,
} from '@/lib/errors';
import {
  createSupplierScoreSchema,
  validateBody,
  SUPPLIER_SCORE_CATEGORIES,
  type SupplierScoreCategory,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scoredFor = searchParams.get('scoredFor') || '';
    const companyId = searchParams.get('companyId') || '';
    const sortBy = searchParams.get('sortBy') || 'overallScore';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const where: Record<string, unknown> = {};

    if (scoredFor && (SUPPLIER_SCORE_CATEGORIES as readonly string[]).includes(scoredFor)) {
      where.scoredFor = scoredFor as SupplierScoreCategory;
    }
    if (companyId) where.companyId = companyId;

    const validSortFields = new Set([
      'overallScore',
      'onTimePct',
      'qualityScore',
      'costPredictabilityScore',
      'asOfDate',
      'sampleSize',
    ]);
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (validSortFields.has(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.overallScore = 'desc';
    }

    const [scores, total] = await Promise.all([
      prisma.supplierReliabilityScore.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.supplierReliabilityScore.count({ where }),
    ]);

    // Enrich with company profile info (name, slug, logoUrl)
    const companyIds = Array.from(new Set(scores.map((s) => s.companyId)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let companiesById: Record<string, { slug: string; name: string; logoUrl: string | null; sector: string | null }> = {};
    if (companyIds.length > 0) {
      try {
        const companies = await prisma.companyProfile.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, slug: true, name: true, logoUrl: true, sector: true },
        });
        companiesById = Object.fromEntries(
          companies.map((c) => [c.id, { slug: c.slug, name: c.name, logoUrl: c.logoUrl, sector: c.sector }])
        );
      } catch (err) {
        logger.warn('Failed to enrich supplier scores with company info', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const enriched = scores.map((s) => ({
      ...s,
      company: companiesById[s.companyId] || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        scores: enriched,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch supplier reliability scores', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch supplier reliability scores');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await req.json();
    const validation = validateBody(createSupplierScoreSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const {
      companyId,
      scoredFor,
      onTimePct,
      qualityScore,
      costPredictabilityScore,
      overallScore,
      sampleSize,
      asOfDate,
      methodology,
    } = validation.data;

    // Verify company exists
    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: { id: true, slug: true, name: true },
    });
    if (!company) {
      return validationError('companyId does not match an existing company', {
        companyId: 'Company not found',
      });
    }

    const asOf = new Date(asOfDate);

    // Upsert on unique (companyId, scoredFor, asOfDate)
    const created = await prisma.supplierReliabilityScore.upsert({
      where: {
        companyId_scoredFor_asOfDate: {
          companyId,
          scoredFor,
          asOfDate: asOf,
        },
      },
      create: {
        companyId,
        scoredFor,
        onTimePct: onTimePct ?? null,
        qualityScore: qualityScore ?? null,
        costPredictabilityScore: costPredictabilityScore ?? null,
        overallScore: overallScore ?? null,
        sampleSize: sampleSize ?? 0,
        asOfDate: asOf,
        methodology: methodology || null,
      },
      update: {
        onTimePct: onTimePct ?? null,
        qualityScore: qualityScore ?? null,
        costPredictabilityScore: costPredictabilityScore ?? null,
        overallScore: overallScore ?? null,
        sampleSize: sampleSize ?? 0,
        methodology: methodology || null,
      },
    });

    logger.info('Supplier reliability score upserted', {
      id: created.id,
      companyId,
      scoredFor,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: created },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create supplier reliability score', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create supplier reliability score');
  }
}
