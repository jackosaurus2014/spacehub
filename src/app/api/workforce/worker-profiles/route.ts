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
import { workerProfileSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_AVAILABILITY = ['available', 'part_time', 'contract_only', 'unavailable'];
const VALID_WORK_TYPES = ['freelance', 'contract', 'part_time', 'consulting', 'side_project'];

/**
 * GET /api/workforce/worker-profiles — List/search worker profiles
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const skills = searchParams.get('skills'); // comma-separated
    const availability = searchParams.get('availability');
    const workType = searchParams.get('workType');
    const remoteOnly = searchParams.get('remoteOnly');
    const search = searchParams.get('search');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      visible: true,
    };

    if (availability && VALID_AVAILABILITY.includes(availability)) {
      where.availability = availability;
    }

    if (workType && VALID_WORK_TYPES.includes(workType)) {
      where.workType = { hasSome: [workType] };
    }

    if (remoteOnly === 'true') {
      where.remoteOk = true;
    }

    if (skills) {
      const skillList = skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (skillList.length > 0) {
        where.skills = { hasSome: skillList };
      }
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { displayName: { contains: term, mode: 'insensitive' } },
        { headline: { contains: term, mode: 'insensitive' } },
        { bio: { contains: term, mode: 'insensitive' } },
        { skills: { hasSome: [term.toLowerCase()] } },
      ];
    }

    const [profiles, total] = await Promise.all([
      prisma.workerProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          userId: true,
          displayName: true,
          headline: true,
          skills: true,
          experienceYears: true,
          hourlyRate: true,
          availability: true,
          workType: true,
          location: true,
          remoteOk: true,
          clearanceLevel: true,
          linkedInUrl: true,
          portfolioUrl: true,
          createdAt: true,
        },
      }),
      prisma.workerProfile.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profiles,
        total,
        hasMore: offset + profiles.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch worker profiles', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch worker profiles');
  }
}

/**
 * POST /api/workforce/worker-profiles — Create or update own worker profile
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(workerProfileSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    // Upsert: create if not exists, update if exists
    const profile = await prisma.workerProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        displayName: data.displayName,
        headline: data.headline,
        bio: data.bio ?? null,
        skills: data.skills,
        experienceYears: data.experienceYears ?? null,
        hourlyRate: data.hourlyRate ?? null,
        availability: data.availability,
        workType: data.workType,
        linkedInUrl: data.linkedInUrl ?? null,
        portfolioUrl: data.portfolioUrl ?? null,
        location: data.location ?? null,
        remoteOk: data.remoteOk,
        clearanceLevel: data.clearanceLevel ?? null,
        visible: data.visible,
      },
      update: {
        displayName: data.displayName,
        headline: data.headline,
        bio: data.bio ?? null,
        skills: data.skills,
        experienceYears: data.experienceYears ?? null,
        hourlyRate: data.hourlyRate ?? null,
        availability: data.availability,
        workType: data.workType,
        linkedInUrl: data.linkedInUrl ?? null,
        portfolioUrl: data.portfolioUrl ?? null,
        location: data.location ?? null,
        remoteOk: data.remoteOk,
        clearanceLevel: data.clearanceLevel ?? null,
        visible: data.visible,
      },
    });

    logger.info('Worker profile upserted', {
      profileId: profile.id,
      userId: session.user.id,
      displayName: profile.displayName,
    });

    return NextResponse.json(
      { success: true, data: { profile } },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to upsert worker profile', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to save worker profile');
  }
}
