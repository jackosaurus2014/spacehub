import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const timeRange = searchParams.get('timeRange'); // 30, 90, 365 days
    const roundType = searchParams.get('roundType'); // seed, series_a, equity, spac, etc.
    const sector = searchParams.get('sector');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const investor = searchParams.get('investor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    // Time range filter
    if (timeRange) {
      const days = parseInt(timeRange, 10);
      if (!isNaN(days) && days > 0) {
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        where.date = { gte: dateFrom };
      }
    }

    // Round type filter (matches seriesLabel or roundType)
    if (roundType) {
      where.OR = [
        { seriesLabel: { contains: roundType, mode: 'insensitive' } },
        { roundType: { equals: roundType, mode: 'insensitive' } },
      ];
    }

    // Amount range filters
    if (minAmount || maxAmount) {
      const amountFilter: Record<string, number> = {};
      if (minAmount) amountFilter.gte = parseFloat(minAmount);
      if (maxAmount) amountFilter.lte = parseFloat(maxAmount);
      where.amount = amountFilter;
    }

    // Investor filter (check leadInvestor or investors array)
    if (investor) {
      where.OR = [
        ...(where.OR ? (where.OR as Array<Record<string, unknown>>) : []),
        { leadInvestor: { contains: investor, mode: 'insensitive' } },
        { investors: { has: investor } },
      ];
      // If we added to existing OR, we need AND logic
      if (roundType) {
        const roundFilter = {
          OR: [
            { seriesLabel: { contains: roundType, mode: 'insensitive' } },
            { roundType: { equals: roundType, mode: 'insensitive' } },
          ],
        };
        const investorFilter = {
          OR: [
            { leadInvestor: { contains: investor, mode: 'insensitive' } },
            { investors: { has: investor } },
          ],
        };
        delete where.OR;
        where.AND = [roundFilter, investorFilter];
      }
    }

    // Sector filter (through company relation)
    if (sector) {
      where.company = {
        sector: { equals: sector, mode: 'insensitive' },
      };
    }

    const [rounds, total] = await Promise.all([
      prisma.fundingRound.findMany({
        where: where as any,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              sector: true,
              tier: true,
              logoUrl: true,
              headquarters: true,
              isPublic: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.fundingRound.count({ where: where as any }),
    ]);

    return NextResponse.json({
      rounds,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    logger.error('Funding tracker error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch funding data' },
      { status: 500 }
    );
  }
}
