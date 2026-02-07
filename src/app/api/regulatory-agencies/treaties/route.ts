import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const treatySlug = searchParams.get('treaty');

    // If specific treaty requested
    if (treatySlug) {
      const treaty = await prisma.internationalSpaceTreaty.findUnique({
        where: { slug: treatySlug },
      });

      if (!treaty) {
        return NextResponse.json(
          { error: 'Treaty not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        treaty: {
          ...treaty,
          keyProvisions: JSON.parse(treaty.keyProvisions || '[]'),
          commercialImplications: JSON.parse(treaty.commercialImplications || '[]'),
        },
      });
    }

    // Get all treaties
    const treaties = await prisma.internationalSpaceTreaty.findMany({
      orderBy: { adoptedDate: 'asc' },
    });

    // Format response
    const formattedTreaties = treaties.map((t) => ({
      ...t,
      keyProvisions: JSON.parse(t.keyProvisions || '[]'),
      commercialImplications: JSON.parse(t.commercialImplications || '[]'),
    }));

    // Calculate stats
    const stats = {
      total: treaties.length,
      totalParties: treaties.reduce((sum, t) => Math.max(sum, t.numberOfParties), 0),
      oldestTreaty: treaties.length > 0 ? treaties[0].name : null,
      newestTreaty: treaties.length > 0 ? treaties[treaties.length - 1].name : null,
    };

    return NextResponse.json({
      treaties: formattedTreaties,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching treaties', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch treaties' },
      { status: 500 }
    );
  }
}
