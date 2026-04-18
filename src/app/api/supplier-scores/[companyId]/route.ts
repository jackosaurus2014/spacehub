import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/supplier-scores/[companyId]
 *
 * Returns ALL reliability scores for a company across all categories,
 * plus the company profile summary. `companyId` can be a CompanyProfile
 * ID or slug — we try both.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;

    if (!companyId) {
      return notFoundError('Company');
    }

    // Resolve slug or id to a CompanyProfile
    const company = await prisma.companyProfile.findFirst({
      where: {
        OR: [{ id: companyId }, { slug: companyId }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        sector: true,
        subsector: true,
        description: true,
        country: true,
        headquarters: true,
      },
    });

    if (!company) {
      return notFoundError('Company');
    }

    const scores = await prisma.supplierReliabilityScore.findMany({
      where: { companyId: company.id },
      orderBy: [{ asOfDate: 'desc' }, { scoredFor: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: {
        company,
        scores,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch supplier reliability detail', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch supplier reliability detail');
  }
}
