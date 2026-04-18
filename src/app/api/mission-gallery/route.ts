import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, createMissionPhotoSchema, MISSION_PHOTO_CATEGORIES } from '@/lib/validations';
import {
  validationError,
  internalError,
  unauthorizedError,
} from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// GET /api/mission-gallery — public list, only approved photos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const featuredParam = searchParams.get('featured');
    const missionSlug = searchParams.get('missionSlug');
    const missionName = searchParams.get('missionName');
    const tag = searchParams.get('tag');
    const q = searchParams.get('q');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = clampInt(searchParams.get('page'), 1, 1, 10000);
    const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);

    const where: Prisma.MissionPhotoWhereInput = { approved: true };

    if (category && (MISSION_PHOTO_CATEGORIES as readonly string[]).includes(category)) {
      where.category = category;
    }
    if (featuredParam === 'true') {
      where.featured = true;
    } else if (featuredParam === 'false') {
      where.featured = false;
    }
    if (missionSlug) {
      where.missionSlug = missionSlug;
    }
    if (missionName) {
      where.missionName = { contains: missionName, mode: 'insensitive' };
    }
    if (tag) {
      where.tags = { has: tag };
    }
    if (q && q.trim().length > 0) {
      where.OR = [
        { title: { contains: q.trim(), mode: 'insensitive' } },
        { description: { contains: q.trim(), mode: 'insensitive' } },
        { missionName: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) {
        const d = new Date(startDate);
        if (!Number.isNaN(d.getTime())) dateFilter.gte = d;
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!Number.isNaN(d.getTime())) dateFilter.lte = d;
      }
      if (Object.keys(dateFilter).length > 0) {
        where.takenAt = dateFilter;
      }
    }

    const [total, photos] = await Promise.all([
      prisma.missionPhoto.count({ where }),
      prisma.missionPhoto.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { takenAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    logger.error('List mission photos error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch mission photos');
  }
}

// POST /api/mission-gallery — auth required, creates with approved=false
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await request.json();
    const validation = validateBody(createMissionPhotoSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;

    const photo = await prisma.missionPhoto.create({
      data: {
        missionName: data.missionName,
        missionSlug: data.missionSlug || null,
        eventId: data.eventId || null,
        companyId: data.companyId || null,
        title: data.title,
        description: data.description || null,
        photoUrl: data.photoUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        credit: data.credit || null,
        creditUrl: data.creditUrl || null,
        takenAt: data.takenAt ? new Date(data.takenAt) : null,
        tags: data.tags || [],
        category: data.category || null,
        featured: false,
        approved: false,
        uploadedById: session.user.id,
      },
    });

    logger.info('Mission photo submitted', {
      photoId: photo.id,
      userId: session.user.id,
      missionName: photo.missionName,
    });

    return NextResponse.json({ success: true, photo }, { status: 201 });
  } catch (error) {
    logger.error('Create mission photo error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create mission photo');
  }
}
