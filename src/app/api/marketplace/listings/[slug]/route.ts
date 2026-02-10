import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, serviceListingUpdateSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const listing = await prisma.serviceListing.findUnique({
      where: { slug: params.slug },
      include: {
        company: {
          select: {
            id: true, slug: true, name: true, logoUrl: true, country: true,
            headquarters: true, description: true, website: true,
            verificationLevel: true, verifiedAt: true, tier: true,
            employeeRange: true, contactEmail: true, marketplaceActive: true,
            cageCode: true, samUei: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Increment view count
    await prisma.serviceListing.update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    });

    // Get reviews for the company
    const reviews = await prisma.providerReview.findMany({
      where: { companyId: listing.companyId, status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
      : null;

    // Get similar listings
    const similarListings = await prisma.serviceListing.findMany({
      where: {
        category: listing.category,
        status: 'active',
        id: { not: listing.id },
      },
      take: 4,
      include: {
        company: {
          select: { id: true, slug: true, name: true, logoUrl: true, verificationLevel: true },
        },
      },
    });

    return NextResponse.json({
      listing,
      reviews,
      avgRating,
      reviewCount: reviews.length,
      similarListings,
    });
  } catch (error) {
    logger.error('Get listing error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch listing');
  }
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const listing = await prisma.serviceListing.findUnique({
      where: { slug: params.slug },
      include: { company: { select: { claimedByUserId: true } } },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this listing' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateBody(serviceListingUpdateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const updated = await prisma.serviceListing.update({
      where: { id: listing.id },
      data: validation.data as any,
    });

    logger.info('Service listing updated', { id: updated.id, slug: params.slug });
    return NextResponse.json({ listing: updated });
  } catch (error) {
    logger.error('Update listing error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update listing');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const listing = await prisma.serviceListing.findUnique({
      where: { slug: params.slug },
      include: { company: { select: { claimedByUserId: true } } },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this listing' }, { status: 403 });
    }

    await prisma.serviceListing.update({
      where: { id: listing.id },
      data: { status: 'archived' },
    });

    logger.info('Service listing archived', { id: listing.id, slug: params.slug });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete listing error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to delete listing');
  }
}
