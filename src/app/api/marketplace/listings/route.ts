import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, serviceListingCreateSchema, marketplaceSearchSchema, validateSearchParams } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { generateSlug } from '@/lib/marketplace-types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(marketplaceSearchSchema, searchParams);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const { q, category, subcategory, priceMin, priceMax, certifications, verificationLevel, sort, limit, offset } = validation.data;

    // Build where clause
    const where: Record<string, unknown> = { status: 'active' };
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (priceMin !== undefined || priceMax !== undefined) {
      if (priceMin !== undefined) where.priceMin = { gte: priceMin };
      if (priceMax !== undefined) where.priceMax = { lte: priceMax };
    }
    if (certifications && certifications.length > 0) {
      where.certifications = { hasSome: certifications };
    }
    if (verificationLevel) {
      where.company = { ...(where.company as Record<string, unknown> || {}), verificationLevel };
    }

    // Build orderBy
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { priceMin: 'asc' };
    else if (sort === 'price_desc') orderBy = { priceMax: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const [listings, total] = await Promise.all([
      prisma.serviceListing.findMany({
        where: where as any,
        orderBy: orderBy as any,
        take: limit,
        skip: offset,
        include: {
          company: {
            select: {
              id: true,
              slug: true,
              name: true,
              logoUrl: true,
              country: true,
              verificationLevel: true,
              tier: true,
            },
          },
        },
      }),
      prisma.serviceListing.count({ where: where as any }),
    ]);

    return NextResponse.json({ listings, total, limit, offset });
  } catch (error) {
    logger.error('Marketplace listings search error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to search listings');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user has claimed a company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true },
    });

    if (!user?.claimedCompanyId) {
      return NextResponse.json(
        { error: 'You must claim a company profile before creating listings. Visit a company profile page and click "Claim This Profile".' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(serviceListingCreateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;
    const baseSlug = generateSlug(`${data.name}-${data.category}`);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const listing = await prisma.serviceListing.create({
      data: {
        companyId: user.claimedCompanyId,
        slug,
        name: data.name,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory || null,
        pricingType: data.pricingType,
        priceMin: data.priceMin || null,
        priceMax: data.priceMax || null,
        priceUnit: data.priceUnit || null,
        pricingNotes: data.pricingNotes || null,
        specifications: (data.specifications || undefined) as any,
        certifications: data.certifications,
        pastPerformance: (data.pastPerformance || undefined) as any,
        leadTime: data.leadTime || null,
        capacity: data.capacity || null,
        coverageArea: data.coverageArea || null,
        status: 'active',
      },
      include: {
        company: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    logger.info('Service listing created', { id: listing.id, name: data.name, company: listing.company.name });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    logger.error('Create listing error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create listing');
  }
}
