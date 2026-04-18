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
import {
  createSpeakingOpportunitySchema,
  validateBody,
  SPEAKING_OPPORTUNITY_STATUSES,
} from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/speaking
 *
 * Public listing. By default returns only approved opportunities whose
 * eventDate is today or later, sorted by upcoming deadline first (deadlines
 * come up faster than the event itself), then by event date.
 *
 * Query params:
 *  - remote=true|false        filter by isRemote
 *  - upcomingDeadline=true    only rows whose submissionDeadline is >= today
 *  - tag=policy               filter by a single tag (repeatable)
 *  - featured=true            only featured opportunities
 *  - q=string                 search title / topic / description
 *  - status=pending|...       (admin only) override default status filter
 *  - includePast=true         (admin only) include past events
 *  - limit, offset            pagination
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = Boolean(session?.user?.isAdmin);
    const { searchParams } = new URL(req.url);

    const remote = searchParams.get('remote');
    const upcomingDeadline = searchParams.get('upcomingDeadline') === 'true';
    const tags = searchParams.getAll('tag').filter(Boolean);
    const featured = searchParams.get('featured') === 'true';
    const q = (searchParams.get('q') || '').trim();
    const statusParam = searchParams.get('status');
    const includePast = searchParams.get('includePast') === 'true';

    const limit = constrainPagination(parseInt(searchParams.get('limit') || '24', 10));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0', 10));

    const where: Record<string, unknown> = {};

    // Status filter: admins may pass anything; public is forced to approved
    if (isAdmin && statusParam && SPEAKING_OPPORTUNITY_STATUSES.includes(statusParam as typeof SPEAKING_OPPORTUNITY_STATUSES[number])) {
      where.status = statusParam;
    } else {
      where.status = 'approved';
    }

    // Event date: hide past events unless admin opts in
    if (!(isAdmin && includePast)) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      where.eventDate = { gte: todayStart };
    }

    if (remote === 'true') where.isRemote = true;
    if (remote === 'false') where.isRemote = false;

    if (upcomingDeadline) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      where.submissionDeadline = { gte: todayStart };
    }

    if (featured) where.featured = true;

    if (tags.length > 0) {
      where.tags = { hasSome: tags.map((t) => t.trim().toLowerCase()) };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { topic: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
        { conferenceName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [rawOpportunities, total] = await Promise.all([
      prisma.speakingOpportunity.findMany({
        where,
        orderBy: [
          { featured: 'desc' },
          // NULLs last in Postgres for deadline so those without a deadline
          // don't jump to the top.
          { submissionDeadline: { sort: 'asc', nulls: 'last' } },
          { eventDate: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.speakingOpportunity.count({ where }),
    ]);

    // Scrub contact info for non-authenticated users
    const isAuthed = Boolean(session?.user?.id);
    const opportunities = rawOpportunities.map((op) => {
      if (isAuthed) return op;
      const { contactEmail: _ce, contactName: _cn, ...rest } = op;
      void _ce;
      void _cn;
      return { ...rest, contactEmail: null, contactName: null };
    });

    return NextResponse.json({
      success: true,
      data: {
        opportunities,
        total,
        limit,
        offset,
        hasMore: offset + opportunities.length < total,
      },
    });
  } catch (error) {
    logger.error('Error listing speaking opportunities', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load speaking opportunities');
  }
}

/**
 * POST /api/speaking
 *
 * Authenticated users submit an opportunity. Starts in status=pending and
 * must be approved by an admin before appearing in the public list.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to submit a speaking opportunity');
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return validationError('Invalid request body');
    }

    const validation = validateBody(createSpeakingOpportunitySchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const d = validation.data;

    const created = await prisma.speakingOpportunity.create({
      data: {
        title: d.title,
        organization: d.organization,
        conferenceName: d.conferenceName ?? null,
        topic: d.topic,
        description: d.description,
        eventDate: d.eventDate,
        submissionDeadline: d.submissionDeadline ?? null,
        location: d.location ?? null,
        isRemote: d.isRemote ?? false,
        compensation: d.compensation ?? null,
        audienceSize: d.audienceSize ?? null,
        cfpUrl: d.cfpUrl ?? null,
        contactEmail: d.contactEmail ?? null,
        contactName: d.contactName ?? null,
        tags: d.tags ?? [],
        status: 'pending',
        featured: false,
        submittedById: session.user.id,
      },
    });

    logger.info('Speaking opportunity submitted', {
      id: created.id,
      submittedById: session.user.id,
      organization: created.organization,
    });

    return NextResponse.json(
      { success: true, data: { opportunity: created } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating speaking opportunity', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to submit speaking opportunity');
  }
}
