import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  internalError,
  constrainPagination,
  constrainOffset,
} from '@/lib/errors';
import { employerProfileSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workforce/employer-profiles — List employer profiles
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const industry = searchParams.get('industry');
    const size = searchParams.get('size');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (industry && industry.trim().length > 0) {
      where.industry = industry.trim();
    }

    const VALID_SIZES = ['startup', 'small', 'medium', 'large', 'enterprise'];
    if (size && VALID_SIZES.includes(size)) {
      where.size = size;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { companyName: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { industry: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [employers, total] = await Promise.all([
      prisma.employerProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          companyName: true,
          companySlug: true,
          description: true,
          website: true,
          industry: true,
          size: true,
          location: true,
          logoUrl: true,
          verified: true,
          createdAt: true,
          _count: {
            select: { gigs: { where: { isActive: true } } },
          },
        },
      }),
      prisma.employerProfile.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        employers,
        total,
        hasMore: offset + employers.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch employer profiles', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch employer profiles');
  }
}

/**
 * POST /api/workforce/employer-profiles — Create or update own employer profile
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(employerProfileSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    // Upsert: create if not exists, update if exists
    const profile = await prisma.employerProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        companyName: data.companyName,
        companySlug: data.companySlug ?? null,
        description: data.description ?? null,
        website: data.website ?? null,
        industry: data.industry ?? null,
        size: data.size ?? null,
        location: data.location ?? null,
        logoUrl: data.logoUrl ?? null,
      },
      update: {
        companyName: data.companyName,
        companySlug: data.companySlug ?? null,
        description: data.description ?? null,
        website: data.website ?? null,
        industry: data.industry ?? null,
        size: data.size ?? null,
        location: data.location ?? null,
        logoUrl: data.logoUrl ?? null,
      },
    });

    logger.info('Employer profile upserted', {
      profileId: profile.id,
      userId: session.user.id,
      companyName: profile.companyName,
    });

    return NextResponse.json(
      { success: true, data: { profile } },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to upsert employer profile', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to save employer profile');
  }
}
