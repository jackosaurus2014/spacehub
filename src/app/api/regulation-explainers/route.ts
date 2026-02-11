import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agency = searchParams.get('agency') || '';
    const category = searchParams.get('category') || '';
    const impactLevel = searchParams.get('impactLevel') || '';
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const where: any = {};
    if (agency) where.agency = agency;
    if (category) where.category = category;
    if (impactLevel) where.impactLevel = impactLevel;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { agency: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [explainers, total] = await Promise.all([
      (prisma as any).regulationExplainer.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          agency: true,
          category: true,
          impactLevel: true,
          affectedCompanyTypes: true,
          regulationDocketNumber: true,
          viewCount: true,
          generatedAt: true,
          createdAt: true,
        },
      }),
      (prisma as any).regulationExplainer.count({ where }),
    ]);

    // Parse JSON strings for response
    const formatted = explainers.map((e: any) => ({
      ...e,
      affectedCompanyTypes: (() => {
        try { return JSON.parse(e.affectedCompanyTypes || '[]'); } catch { return []; }
      })(),
    }));

    return NextResponse.json({
      explainers: formatted,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch regulation explainers', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch regulation explainers');
  }
}
