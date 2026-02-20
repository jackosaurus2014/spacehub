import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, reviewCreateSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const [reviews, total] = await Promise.all([
      prisma.providerReview.findMany({
        where: { companyId, status: 'published' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          companyId: true,
          reviewerUserId: true,
          overallRating: true,
          qualityRating: true,
          timelineRating: true,
          commRating: true,
          valueRating: true,
          title: true,
          content: true,
          isVerified: true,
          status: true,
          providerResponse: true,
          providerRespondedAt: true,
          createdAt: true,
        },
      }),
      prisma.providerReview.count({ where: { companyId, status: 'published' } }),
    ]);

    // Calculate averages
    const avgRatings = reviews.length > 0 ? {
      overall: reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length,
      quality: reviews.filter((r) => r.qualityRating).reduce((s, r) => s + (r.qualityRating || 0), 0) / (reviews.filter((r) => r.qualityRating).length || 1),
      timeline: reviews.filter((r) => r.timelineRating).reduce((s, r) => s + (r.timelineRating || 0), 0) / (reviews.filter((r) => r.timelineRating).length || 1),
      communication: reviews.filter((r) => r.commRating).reduce((s, r) => s + (r.commRating || 0), 0) / (reviews.filter((r) => r.commRating).length || 1),
      value: reviews.filter((r) => r.valueRating).reduce((s, r) => s + (r.valueRating || 0), 0) / (reviews.filter((r) => r.valueRating).length || 1),
    } : null;

    return NextResponse.json({ reviews, total, avgRatings });
  } catch (error) {
    logger.error('Get reviews error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch reviews');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(reviewCreateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;

    // Verify company exists
    const company = await prisma.companyProfile.findUnique({ where: { id: data.companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check for duplicate review (one review per user per company)
    const existingReview = await prisma.providerReview.findFirst({
      where: { companyId: data.companyId, reviewerUserId: session.user.id },
    });
    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this company' }, { status: 409 });
    }

    // Check if user has an awarded RFQ with this company (verified review)
    const isVerified = data.rfqId ? await prisma.rFQ.findFirst({
      where: { id: data.rfqId, buyerUserId: session.user.id, awardedToCompanyId: data.companyId, status: 'awarded' },
    }) : null;

    const review = await prisma.providerReview.create({
      data: {
        companyId: data.companyId,
        reviewerUserId: session.user.id,
        rfqId: data.rfqId || null,
        overallRating: data.overallRating,
        qualityRating: data.qualityRating || null,
        timelineRating: data.timelineRating || null,
        commRating: data.commRating || null,
        valueRating: data.valueRating || null,
        title: data.title || null,
        content: data.content || null,
        isVerified: !!isVerified,
        status: 'published',
      },
    });

    logger.info('Review created', { id: review.id, companyId: data.companyId, isVerified: !!isVerified });
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    logger.error('Create review error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create review');
  }
}
