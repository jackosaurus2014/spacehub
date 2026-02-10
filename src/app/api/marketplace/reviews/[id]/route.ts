import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, reviewResponseSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Single review detail
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const review = await prisma.providerReview.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    logger.error('Get review error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch review');
  }
}

// PUT: Provider response to a review
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const review = await prisma.providerReview.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, claimedByUserId: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Only the company owner can respond
    if (review.company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only the company owner can respond to reviews' }, { status: 403 });
    }

    if (review.providerResponse) {
      return NextResponse.json({ error: 'A response has already been submitted' }, { status: 409 });
    }

    const body = await request.json();
    const validation = validateBody(reviewResponseSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const updated = await prisma.providerReview.update({
      where: { id: params.id },
      data: {
        providerResponse: validation.data.response,
        providerRespondedAt: new Date(),
      },
    });

    logger.info('Provider response added to review', { reviewId: params.id, companyId: review.companyId });
    return NextResponse.json({ review: updated });
  } catch (error) {
    logger.error('Update review error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update review');
  }
}

// DELETE: Admin-only review removal (flag as hidden)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const review = await prisma.providerReview.findUnique({ where: { id: params.id } });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await prisma.providerReview.update({
      where: { id: params.id },
      data: { status: 'hidden' },
    });

    logger.info('Review hidden by admin', { reviewId: params.id, adminId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete review error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to delete review');
  }
}
