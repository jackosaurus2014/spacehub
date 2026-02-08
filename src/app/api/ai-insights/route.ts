export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { constrainPagination } from '@/lib/errors';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '10', 10));
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }

    const skip = (page - 1) * limit;

    const [insights, total] = await Promise.all([
      prisma.aIInsight.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          category: true,
          generatedAt: true,
        },
      }),
      prisma.aIInsight.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      insights,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    logger.error('Error fetching AI insights', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch AI insights');
  }
}
