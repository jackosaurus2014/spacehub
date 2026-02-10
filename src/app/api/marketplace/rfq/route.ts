import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, rfqCreateSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { generateSlug } from '@/lib/marketplace-types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'open';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const where: Record<string, unknown> = { isPublic: true };
    if (status) where.status = status;
    if (category) where.category = category;

    const [rfqs, total] = await Promise.all([
      prisma.rFQ.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          subcategory: true,
          budgetMin: true,
          budgetMax: true,
          budgetCurrency: true,
          deadline: true,
          complianceReqs: true,
          status: true,
          createdAt: true,
          _count: { select: { proposals: true } },
        },
      }),
      prisma.rFQ.count({ where: where as any }),
    ]);

    return NextResponse.json({ rfqs, total, limit, offset });
  } catch (error) {
    logger.error('List RFQs error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch RFQs');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(rfqCreateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;
    const slug = `rfq-${generateSlug(data.title)}-${Date.now().toString(36)}`;

    const rfq = await prisma.rFQ.create({
      data: {
        slug,
        buyerUserId: session.user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory || null,
        requirements: (data.requirements || undefined) as any,
        budgetMin: data.budgetMin || null,
        budgetMax: data.budgetMax || null,
        budgetCurrency: data.budgetCurrency,
        deadline: data.deadline ? new Date(data.deadline) : null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        complianceReqs: data.complianceReqs,
        isPublic: data.isPublic,
        status: 'open',
      },
    });

    // Run matching algorithm
    try {
      const matchingListings = await prisma.serviceListing.findMany({
        where: {
          category: data.category,
          status: 'active',
        },
        include: {
          company: {
            select: { id: true, name: true, verificationLevel: true, contactEmail: true },
          },
        },
      });

      // Score each matching listing
      const matches = matchingListings.map((listing) => {
        let score = 0;
        const reasons: Record<string, number> = {};

        // Category match (30 points)
        if (listing.category === data.category) {
          score += 30;
          reasons.category = 30;
        }
        if (data.subcategory && listing.subcategory === data.subcategory) {
          score += 10;
          reasons.subcategory = 10;
        }

        // Price compatibility (20 points)
        if (data.budgetMax && listing.priceMin) {
          if (listing.priceMin <= data.budgetMax) {
            score += 20;
            reasons.price = 20;
          } else {
            score += 5;
            reasons.price = 5;
          }
        } else {
          score += 10; // Unknown price = partial match
          reasons.price = 10;
        }

        // Certification match (20 points)
        if (data.complianceReqs.length > 0 && listing.certifications.length > 0) {
          const matching = data.complianceReqs.filter((req) =>
            listing.certifications.some((cert) => cert.toLowerCase().includes(req.toLowerCase()))
          );
          const certScore = Math.round((matching.length / data.complianceReqs.length) * 20);
          score += certScore;
          reasons.certifications = certScore;
        } else {
          score += 10;
          reasons.certifications = 10;
        }

        // Verification level (5 points)
        if (listing.company.verificationLevel === 'performance') {
          score += 5;
          reasons.verification = 5;
        } else if (listing.company.verificationLevel === 'capability') {
          score += 3;
          reasons.verification = 3;
        } else if (listing.company.verificationLevel === 'identity') {
          score += 1;
          reasons.verification = 1;
        }

        return {
          rfqId: rfq.id,
          listingId: listing.id,
          companyId: listing.companyId,
          matchScore: score,
          matchReasons: reasons,
          notified: false,
        };
      });

      // Save top matches (score > 20)
      const topMatches = matches.filter((m) => m.matchScore > 20).sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);

      if (topMatches.length > 0) {
        await prisma.rFQProviderMatch.createMany({
          data: topMatches as any,
          skipDuplicates: true,
        });
      }

      logger.info('RFQ created with matches', { rfqId: rfq.id, matches: topMatches.length });
    } catch (matchError) {
      logger.error('RFQ matching failed', { error: matchError instanceof Error ? matchError.message : String(matchError) });
      // Don't fail the RFQ creation if matching fails
    }

    return NextResponse.json({ rfq }, { status: 201 });
  } catch (error) {
    logger.error('Create RFQ error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create RFQ');
  }
}
