import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  forbiddenError,
  validationError,
  createSuccessResponse,
} from '@/lib/errors';
import {
  validateBody,
  createThesisSchema,
} from '@/lib/validations';
import {
  canAuthorInvestorContent,
  ensureUniqueThesisSlug,
  makeSlug,
} from '@/lib/investor-hub';

export const dynamic = 'force-dynamic';

/**
 * GET /api/investor-hub/theses
 * Query params: sector, stage, geography, author, author=me, publishedOnly (default true), limit, offset
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const stage = searchParams.get('stage');
    const geography = searchParams.get('geography');
    const author = searchParams.get('author');
    const publishedOnlyParam = searchParams.get('publishedOnly');
    const publishedOnly = publishedOnlyParam == null || publishedOnlyParam === 'true';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const where: Record<string, unknown> = {};

    if (publishedOnly) {
      where.publishedAt = { not: null };
    }
    if (sector) {
      where.sectors = { has: sector };
    }
    if (stage) {
      where.stagePreference = stage;
    }
    if (geography) {
      where.geography = { contains: geography, mode: 'insensitive' };
    }
    if (author === 'me') {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return unauthorizedError('You must be logged in to filter by your theses');
      }
      where.authorUserId = session.user.id;
    } else if (author) {
      where.authorUserId = author;
    }

    const [theses, total] = await Promise.all([
      prisma.investorThesis.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.investorThesis.count({ where }),
    ]);

    // Enrich with author info
    const authorIds = Array.from(new Set(theses.map((t) => t.authorUserId)));
    const authors =
      authorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: authorIds } },
            select: { id: true, name: true, email: true, verifiedBadge: true },
          })
        : [];
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    return createSuccessResponse({
      theses: theses.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        sectors: t.sectors,
        stagePreference: t.stagePreference,
        geography: t.geography,
        views: t.views,
        upvotes: t.upvotes,
        publishedAt: t.publishedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        author: authorMap.get(t.authorUserId)
          ? {
              id: t.authorUserId,
              name: authorMap.get(t.authorUserId)?.name ?? null,
              verifiedBadge: authorMap.get(t.authorUserId)?.verifiedBadge ?? null,
            }
          : { id: t.authorUserId, name: null, verifiedBadge: null },
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to list investor theses', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list investor theses');
  }
}

/**
 * POST /api/investor-hub/theses
 * Requires session + investor verified badge or admin.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to create a thesis');
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isAdmin: true, verifiedBadge: true },
    });
    if (!user) return unauthorizedError('User not found');

    if (!canAuthorInvestorContent(user)) {
      return forbiddenError(
        'Only verified investors can publish theses. Request investor verification from your account settings.'
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateBody(createThesisSchema, body);
    if (!validation.success) {
      return validationError('Invalid thesis data', validation.errors);
    }

    const data = validation.data;
    const baseSlug = makeSlug(data.title);
    const slug = await ensureUniqueThesisSlug(baseSlug);

    const thesis = await prisma.investorThesis.create({
      data: {
        slug,
        authorUserId: user.id,
        title: data.title,
        summary: data.summary,
        bodyMd: data.bodyMd,
        sectors: data.sectors,
        stagePreference: data.stagePreference ?? null,
        geography: data.geography ?? null,
        publishedAt: data.publish ? new Date() : null,
      },
    });

    logger.info('Investor thesis created', {
      userId: user.id,
      thesisId: thesis.id,
      slug: thesis.slug,
      published: Boolean(thesis.publishedAt),
    });

    return createSuccessResponse({ thesis }, 201);
  } catch (error) {
    logger.error('Failed to create investor thesis', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create investor thesis');
  }
}
