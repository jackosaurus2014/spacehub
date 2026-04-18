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
import { createGigSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'];
const VALID_WORK_TYPES = ['freelance', 'contract', 'part_time', 'consulting', 'side_project'];

const EMPLOYER_INCLUDE = {
  select: {
    id: true,
    companyName: true,
    companySlug: true,
    logoUrl: true,
    verified: true,
  },
} as const;

/**
 * GET /api/gig-work
 * Supports: ?category, ?workType, ?isRemote, ?minBudget, ?maxBudget, ?q, ?page, ?limit
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const workType = searchParams.get('workType');
    const isRemote = searchParams.get('isRemote');
    const minBudgetRaw = searchParams.get('minBudget');
    const maxBudgetRaw = searchParams.get('maxBudget');
    const q = searchParams.get('q');

    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20', 10) || 20);
    const pageParam = parseInt(searchParams.get('page') || '1', 10) || 1;
    const page = Math.max(1, pageParam);
    const offsetFromPage = (page - 1) * limit;
    const offset = constrainOffset(
      searchParams.has('offset')
        ? parseInt(searchParams.get('offset') || '0', 10) || 0
        : offsetFromPage
    );

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

    if (isRemote === 'true') {
      where.remoteOk = true;
    }

    const minBudget = minBudgetRaw ? parseInt(minBudgetRaw, 10) : NaN;
    if (!Number.isNaN(minBudget) && minBudget >= 0) {
      // A gig matches if its maximum budget is at least the requested minimum,
      // or if the gig has no max set (open budget).
      where.OR = [
        ...(where.OR || []),
        { budgetMax: { gte: minBudget } },
        { budgetMax: null },
      ];
    }

    const maxBudget = maxBudgetRaw ? parseInt(maxBudgetRaw, 10) : NaN;
    if (!Number.isNaN(maxBudget) && maxBudget >= 0) {
      // A gig matches if its minimum budget is at most the requested maximum,
      // or if the gig has no min set.
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { budgetMin: { lte: maxBudget } },
            { budgetMin: null },
          ],
        },
      ];
    }

    if (q && q.trim().length > 0) {
      const term = q.trim();
      const textFilter = {
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { skills: { hasSome: [term.toLowerCase()] } },
        ],
      };
      where.AND = [...(where.AND || []), textFilter];
    }

    const [gigs, total] = await Promise.all([
      prisma.gigOpportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { employer: EMPLOYER_INCLUDE },
      }),
      prisma.gigOpportunity.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        gigs,
        total,
        page,
        limit,
        hasMore: offset + gigs.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch gigs', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch gigs');
  }
}

/**
 * POST /api/gig-work — Create a new gig (auth required).
 * Auto-creates an EmployerProfile for the user if one does not exist.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(createGigSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    // Ensure an employer profile exists — auto-create with provided or default name.
    let employerProfile = await prisma.employerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!employerProfile) {
      const fallbackName =
        (data.companyName && data.companyName.trim()) ||
        session.user.name ||
        session.user.email ||
        'Independent Employer';
      employerProfile = await prisma.employerProfile.create({
        data: {
          userId: session.user.id,
          companyName: fallbackName,
        },
      });
      logger.info('Auto-created employer profile for gig posting', {
        userId: session.user.id,
        employerId: employerProfile.id,
      });
    }

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
      include: { employer: EMPLOYER_INCLUDE },
    });

    logger.info('Gig created', {
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
    logger.error('Failed to create gig', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create gig');
  }
}
