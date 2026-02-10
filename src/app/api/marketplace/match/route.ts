import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { rfqId } = body;

    if (!rfqId) {
      return NextResponse.json({ error: 'rfqId is required' }, { status: 400 });
    }

    const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }
    if (rfq.buyerUserId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Find matching service listings
    const listings = await prisma.serviceListing.findMany({
      where: { status: 'active' },
      include: {
        company: {
          select: {
            id: true, slug: true, name: true, logoUrl: true,
            verificationLevel: true, tier: true, contactEmail: true,
            cageCode: true, samUei: true,
          },
        },
      },
    });

    // Score each listing using weighted algorithm
    const scored = listings.map((listing) => {
      let score = 0;
      const reasons: Record<string, number> = {};

      // Category match (30%)
      if (listing.category === rfq.category) {
        score += 30;
        reasons.category = 30;
        if (rfq.subcategory && listing.subcategory === rfq.subcategory) {
          score += 10; // Bonus for subcategory match
          reasons.subcategory = 10;
        }
      } else {
        return null; // Skip non-category matches
      }

      // Price compatibility (20%)
      if (rfq.budgetMax && listing.priceMin) {
        const overlap = listing.priceMin <= rfq.budgetMax;
        if (overlap) {
          score += 20;
          reasons.price = 20;
        } else if (rfq.budgetMax * 1.2 >= listing.priceMin) {
          score += 10; // Close to budget
          reasons.price = 10;
        }
      } else {
        score += 10; // Unknown = partial
        reasons.price = 10;
      }

      // Certification match (20%)
      if (rfq.complianceReqs.length > 0) {
        const matched = rfq.complianceReqs.filter((req) =>
          listing.certifications.some((c) => c.toLowerCase().includes(req.toLowerCase()))
        );
        const certScore = Math.round((matched.length / rfq.complianceReqs.length) * 20);
        score += certScore;
        reasons.certifications = certScore;
      } else {
        score += 15;
        reasons.certifications = 15;
      }

      // Past performance (15%) - based on review count and rating
      score += 10; // Base score, would be enhanced with actual review data
      reasons.performance = 10;

      // Response time (10%) - based on historical response data
      score += 5;
      reasons.responsiveness = 5;

      // Verification level (5%)
      const verLevel = listing.company.verificationLevel;
      if (verLevel === 'performance') { score += 5; reasons.verification = 5; }
      else if (verLevel === 'capability') { score += 3; reasons.verification = 3; }
      else if (verLevel === 'identity') { score += 1; reasons.verification = 1; }

      return {
        listing,
        score,
        reasons,
      };
    }).filter(Boolean).sort((a, b) => (b?.score || 0) - (a?.score || 0));

    // Save matches to database
    const matchData = scored.slice(0, 20).map((m) => ({
      rfqId,
      listingId: m!.listing.id,
      companyId: m!.listing.companyId,
      matchScore: m!.score,
      matchReasons: m!.reasons,
      notified: false,
    }));

    if (matchData.length > 0) {
      // Delete old matches first
      await prisma.rFQProviderMatch.deleteMany({ where: { rfqId } });
      await prisma.rFQProviderMatch.createMany({ data: matchData as any });
    }

    logger.info('Matching completed', { rfqId, matchCount: scored.length });
    return NextResponse.json({
      matches: scored.slice(0, 20),
      totalMatches: scored.length,
    });
  } catch (error) {
    logger.error('Matching error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to run matching');
  }
}
