import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { computeInvestorActivity, type InvestorActivityResult } from '@/lib/investor-sentiment';

export const dynamic = 'force-dynamic';

/**
 * GET /api/investors/sentiment
 *
 * Returns activity trend data for investors by comparing their deal counts
 * in the last 6 months vs the previous 6 months.
 *
 * Query params:
 *  - names: comma-separated list of investor names (optional; if omitted, returns all)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const namesParam = searchParams.get('names');

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Fetch all funding rounds in the last 12 months
    const rounds = await prisma.fundingRound.findMany({
      where: {
        date: { gte: twelveMonthsAgo },
      },
      select: {
        date: true,
        leadInvestor: true,
        investors: true,
      },
    });

    // Build a map: investor name -> { recent: count, previous: count }
    const activityMap = new Map<string, { recent: number; previous: number }>();

    for (const round of rounds) {
      const isRecent = round.date >= sixMonthsAgo;
      const allInvestors = new Set<string>();
      if (round.leadInvestor) allInvestors.add(round.leadInvestor);
      for (const inv of round.investors || []) {
        allInvestors.add(inv);
      }

      for (const name of Array.from(allInvestors)) {
        if (!activityMap.has(name)) {
          activityMap.set(name, { recent: 0, previous: 0 });
        }
        const entry = activityMap.get(name)!;
        if (isRecent) {
          entry.recent++;
        } else {
          entry.previous++;
        }
      }
    }

    // Filter to requested names if provided
    let entries: [string, { recent: number; previous: number }][];
    if (namesParam) {
      const requestedNames = namesParam.split(',').map((n) => n.trim());
      entries = requestedNames.map((name) => [
        name,
        activityMap.get(name) || { recent: 0, previous: 0 },
      ]);
    } else {
      entries = Array.from(activityMap.entries());
    }

    // Compute sentiment for each investor
    const sentiment: Record<string, InvestorActivityResult & { recentDeals: number; previousDeals: number }> = {};
    for (const [name, counts] of entries) {
      const result = computeInvestorActivity(counts.recent, counts.previous);
      sentiment[name] = {
        ...result,
        recentDeals: counts.recent,
        previousDeals: counts.previous,
      };
    }

    return NextResponse.json({ sentiment });
  } catch (error) {
    logger.error('Investor sentiment API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to compute investor sentiment' },
      { status: 500 }
    );
  }
}
