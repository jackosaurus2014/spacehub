import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalListings,
      activeListings,
      totalRFQs,
      openRFQs,
      totalProposals,
      activeProviderCount,
      totalReviews,
    ] = await Promise.all([
      prisma.serviceListing.count(),
      prisma.serviceListing.count({ where: { status: 'active' } }),
      prisma.rFQ.count(),
      prisma.rFQ.count({ where: { status: 'open' } }),
      prisma.proposal.count(),
      prisma.serviceListing.groupBy({
        by: ['companyId'],
        where: { status: 'active' },
      }).then((groups: any[]) => groups.length),
      prisma.providerReview.count({ where: { status: 'published' } }),
    ]);

    // Get listing counts by category
    const categoryBreakdown = await prisma.serviceListing.groupBy({
      by: ['category'],
      where: { status: 'active' },
      _count: { id: true },
    });

    const categories = categoryBreakdown.map((c) => ({
      category: c.category,
      count: c._count.id,
    }));

    return NextResponse.json({
      totalListings,
      activeListings,
      totalRFQs,
      openRFQs,
      totalProposals,
      activeProviders: activeProviderCount,
      totalReviews,
      categories,
    });
  } catch (error) {
    logger.error('Marketplace stats error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch marketplace stats' }, { status: 500 });
  }
}
