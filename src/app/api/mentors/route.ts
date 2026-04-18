import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  validationError,
  internalError,
  constrainPagination,
} from '@/lib/errors';
import {
  createMentorProfileSchema,
  validateBody,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentors
 * List mentor profiles with filters.
 * Query: expertise, remoteOnly, minRate, maxRate, acceptingMentees, search, page, limit
 * Sort: featured-first (acceptingMentees + endorsementCount DESC)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const expertise = searchParams.get('expertise') || '';
    const remoteOnly = searchParams.get('remoteOnly');
    const acceptingMentees = searchParams.get('acceptingMentees');
    const minRateRaw = searchParams.get('minRate');
    const maxRateRaw = searchParams.get('maxRate');
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = constrainPagination(
      parseInt(searchParams.get('limit') || '20', 10),
      50
    );
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (expertise) {
      where.expertiseAreas = { has: expertise };
    }

    if (remoteOnly === 'true') {
      where.remoteOnly = true;
    }

    if (acceptingMentees === 'true') {
      where.acceptingMentees = true;
    } else if (acceptingMentees === 'false') {
      where.acceptingMentees = false;
    }

    if (minRateRaw || maxRateRaw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rateFilter: any = {};
      const minRate = minRateRaw ? parseFloat(minRateRaw) : null;
      const maxRate = maxRateRaw ? parseFloat(maxRateRaw) : null;
      if (minRate !== null && Number.isFinite(minRate)) rateFilter.gte = minRate;
      if (maxRate !== null && Number.isFinite(maxRate)) rateFilter.lte = maxRate;
      if (Object.keys(rateFilter).length > 0) {
        where.hourlyRate = rateFilter;
      }
    }

    if (search) {
      where.OR = [
        { headline: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [mentors, total] = await Promise.all([
      prisma.mentorProfile.findMany({
        where,
        orderBy: [
          { acceptingMentees: 'desc' },
          { endorsementCount: 'desc' },
          { rating: 'desc' },
          { updatedAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.mentorProfile.count({ where }),
    ]);

    // Eager-load user info for cards
    const userIds = Array.from(new Set(mentors.map((m) => m.userId)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, verifiedBadge: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = mentors.map((m) => ({
      ...m,
      user: userMap.get(m.userId) || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        mentors: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error listing mentor profiles', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch mentors');
  }
}

/**
 * POST /api/mentors
 * Create or update the current user's mentor profile (upsert on userId).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(createMentorProfileSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;
    const userId = session.user.id;

    const profile = await prisma.mentorProfile.upsert({
      where: { userId },
      create: {
        userId,
        headline: data.headline,
        bio: data.bio,
        expertiseAreas: data.expertiseAreas,
        yearsExperience: data.yearsExperience ?? null,
        hourlyRate: data.hourlyRate ?? null,
        currency: data.currency ?? 'USD',
        availability: data.availability ?? null,
        remoteOnly: data.remoteOnly ?? true,
        acceptingMentees: data.acceptingMentees ?? true,
        pastCompanies: data.pastCompanies ?? [],
        linkedinUrl: data.linkedinUrl ?? null,
      },
      update: {
        headline: data.headline,
        bio: data.bio,
        expertiseAreas: data.expertiseAreas,
        yearsExperience: data.yearsExperience ?? null,
        hourlyRate: data.hourlyRate ?? null,
        currency: data.currency ?? 'USD',
        availability: data.availability ?? null,
        ...(data.remoteOnly !== undefined && { remoteOnly: data.remoteOnly }),
        ...(data.acceptingMentees !== undefined && {
          acceptingMentees: data.acceptingMentees,
        }),
        pastCompanies: data.pastCompanies ?? [],
        linkedinUrl: data.linkedinUrl ?? null,
      },
    });

    logger.info('Mentor profile upserted', {
      userId,
      profileId: profile.id,
    });

    return NextResponse.json(
      { success: true, data: profile },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error upserting mentor profile', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to save mentor profile');
  }
}
