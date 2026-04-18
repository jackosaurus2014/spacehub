import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  validationError,
  internalError,
  alreadyExistsError,
  constrainPagination,
} from '@/lib/errors';
import {
  createStudyGroupSchema,
  validateBody,
  STUDY_GROUP_TOPICS,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'study-group';
  let candidate = base;
  let i = 2;
  while (await prisma.studyGroup.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${i}`;
    i += 1;
  }
  return candidate;
}

/**
 * GET /api/study-groups
 * Public list with optional ?topic= filter, search, pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic') || '';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = constrainPagination(
      parseInt(searchParams.get('limit') || '20', 10),
      50
    );
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isPrivate: false };
    if (topic && (STUDY_GROUP_TOPICS as readonly string[]).includes(topic)) {
      where.topic = topic;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [groups, total] = await Promise.all([
      prisma.studyGroup.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          _count: { select: { memberships: true, meetings: true } },
        },
      }),
      prisma.studyGroup.count({ where }),
    ]);

    const hostIds = Array.from(new Set(groups.map((g) => g.hostUserId)));
    const hosts = hostIds.length
      ? await prisma.user.findMany({
          where: { id: { in: hostIds } },
          select: { id: true, name: true },
        })
      : [];
    const hostMap = new Map(hosts.map((h) => [h.id, h]));

    const data = groups.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      description: g.description,
      topic: g.topic,
      meetingCadence: g.meetingCadence,
      memberLimit: g.memberLimit,
      isPrivate: g.isPrivate,
      readingListCount: Array.isArray(g.readingList) ? g.readingList.length : 0,
      host: hostMap.get(g.hostUserId) || null,
      memberCount: g._count.memberships,
      meetingCount: g._count.meetings,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        groups: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error listing study groups', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch study groups');
  }
}

/**
 * POST /api/study-groups
 * Create a new study group (auth required). Creator becomes host + member.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(createStudyGroupSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;
    const slug = await generateUniqueSlug(data.name);

    try {
      const group = await prisma.studyGroup.create({
        data: {
          slug,
          name: data.name,
          description: data.description,
          topic: data.topic,
          hostUserId: session.user.id,
          meetingCadence: data.meetingCadence ?? null,
          memberLimit: data.memberLimit ?? null,
          isPrivate: data.isPrivate ?? false,
          readingList: (data.readingList ?? []) as object,
        },
      });

      // Auto-join the host as a member with role "host"
      await prisma.groupMembership.create({
        data: {
          groupId: group.id,
          userId: session.user.id,
          role: 'host',
        },
      });

      logger.info('Study group created', {
        groupId: group.id,
        slug: group.slug,
        hostUserId: session.user.id,
      });

      return NextResponse.json(
        { success: true, data: group },
        { status: 201 }
      );
    } catch (err) {
      // Handle unique slug collision race
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        return alreadyExistsError('Study group');
      }
      throw err;
    }
  } catch (error) {
    logger.error('Error creating study group', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create study group');
  }
}
