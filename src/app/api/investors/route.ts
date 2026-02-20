import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const sectorFocus = searchParams.get('sectorFocus');
    const sort = searchParams.get('sort') || 'portfolioCount'; // portfolioCount, aum, name
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (type) {
      where.type = { equals: type, mode: 'insensitive' };
    }
    if (sectorFocus) {
      where.sectorFocus = { has: sectorFocus };
    }

    // Determine sort order
    let orderBy: Record<string, string>;
    switch (sort) {
      case 'aum':
        orderBy = { aum: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'portfolioCount':
      default:
        orderBy = { portfolioCount: 'desc' };
        break;
    }

    const investors = await (prisma as any).investor.findMany({
      where: where as any,
      orderBy: orderBy as any,
      take: limit,
    });

    // Compute totalInvested from FundingRound where investor name appears
    const investorsWithTotals = await Promise.all(
      investors.map(async (inv: any) => {
        // Count rounds where this investor is lead or in investors array
        const rounds = await prisma.fundingRound.findMany({
          where: {
            OR: [
              { leadInvestor: { equals: inv.name, mode: 'insensitive' } },
              { investors: { has: inv.name } },
            ],
          },
          select: { amount: true },
        });

        const totalInvested = rounds.reduce((sum: number, r: { amount: number | null }) => sum + (r.amount || 0), 0);
        const dealCount = rounds.length;

        return {
          ...inv,
          totalInvested,
          dealCount,
        };
      })
    );

    // Re-sort by dealCount if that was the intent (portfolioCount as proxy)
    if (sort === 'portfolioCount') {
      investorsWithTotals.sort(
        (a: { dealCount: number; portfolioCount: number | null }, b: { dealCount: number; portfolioCount: number | null }) =>
          (b.dealCount || b.portfolioCount || 0) - (a.dealCount || a.portfolioCount || 0)
      );
    }

    return NextResponse.json({
      investors: investorsWithTotals,
      total: investorsWithTotals.length,
    });
  } catch (error) {
    logger.error('Investors API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch investors' },
      { status: 500 }
    );
  }
}
