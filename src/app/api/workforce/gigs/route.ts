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
import { gigOpportunitySchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'];
const VALID_WORK_TYPES = ['freelance', 'contract', 'part_time', 'consulting', 'side_project'];

/**
 * GET /api/workforce/gigs — List/search gig opportunities
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const workType = searchParams.get('workType');
    const remoteOnly = searchParams.get('remoteOnly');
    const search = searchParams.get('search');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      isActive: true,
    };

    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    if (workType && VALID_WORK_TYPES.includes(workType)) {
      where.workType = workType;
    }

    if (remoteOnly === 'true') {
      where.remoteOk = true;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { skills: { hasSome: [term.toLowerCase()] } },
      ];
    }

    const [gigs, total] = await Promise.all([
      prisma.gigOpportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          employer: {
            select: {
              id: true,
              companyName: true,
              companySlug: true,
              logoUrl: true,
              verified: true,
            },
          },
        },
      }),
      prisma.gigOpportunity.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        gigs,
        total,
        hasMore: offset + gigs.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch gig opportunities', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch gig opportunities');
  }
}

/**
 * POST /api/workforce/gigs — Create a new gig opportunity (requires employer auth)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Verify the user has an employer profile
    const employerProfile = await prisma.employerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!employerProfile) {
      return validationError('You must create an employer profile before posting gigs');
    }

    const body = await req.json();
    const validation = validateBody(gigOpportunitySchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    const gig = await prisma.gigOpportunity.create({
      data: {
        employerId: employerProfile.id,
        title: data.title,
        description: data.description,
        category: data.category,
        skills: data.skills,
        workType: data.workType,
        duration: data.duration ?? null,
        hoursPerWeek: data.hoursPerWeek ?? null,
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        budgetType: data.budgetType,
        location: data.location ?? null,
        remoteOk: data.remoteOk,
        clearanceRequired: data.clearanceRequired,
      },
      include: {
        employer: {
          select: {
            id: true,
            companyName: true,
            companySlug: true,
            logoUrl: true,
            verified: true,
          },
        },
      },
    });

    logger.info('Gig opportunity created', {
      gigId: gig.id,
      title: gig.title,
      employerId: employerProfile.id,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: { gig } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create gig opportunity', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create gig opportunity');
  }
}
