import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyProfileId = searchParams.get('companyProfileId') || '';
    const sector = searchParams.get('sector') || '';
    const sectorOnly = searchParams.get('sectorOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const where: any = {};
    if (companyProfileId) {
      where.companyProfileId = companyProfileId;
    } else if (sectorOnly) {
      where.companyProfileId = null;
      if (sector) where.sector = sector;
    } else if (sector) {
      where.sector = sector;
    }

    const [digests, total] = await Promise.all([
      (prisma as any).companyDigest.findMany({
        where,
        orderBy: { periodEnd: 'desc' },
        take: limit,
        skip: offset,
        include: {
          companyProfile: {
            select: {
              id: true,
              slug: true,
              name: true,
              logoUrl: true,
              sector: true,
              tier: true,
            },
          },
        },
      }),
      (prisma as any).companyDigest.count({ where }),
    ]);

    // Parse JSON fields
    const formatted = digests.map((d: any) => ({
      ...d,
      highlights: (() => {
        try { return JSON.parse(d.highlights || '[]'); } catch { return []; }
      })(),
    }));

    return NextResponse.json({
      digests: formatted,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch company digests', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch company digests');
  }
}
