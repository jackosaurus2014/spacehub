import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  forbiddenError,
  internalError,
  unauthorizedError,
  validationError,
  alreadyExistsError,
} from '@/lib/errors';
import { validateBody } from '@/lib/validations';
import { createMissionDebriefSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * Slugify a mission name into a URL-safe slug.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 180);
}

async function uniqueSlug(base: string): Promise<string> {
  const safeBase = base || 'mission-debrief';
  let candidate = safeBase;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.missionDebrief.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${safeBase}-${suffix++}`;
    if (suffix > 200) {
      candidate = `${safeBase}-${Date.now()}`;
      return candidate;
    }
  }
}

/**
 * GET /api/mission-debriefs
 *
 * List published mission debriefs. Public — no auth required.
 *
 * Query params:
 *   - status: filter by status (success | partial | failure | scrubbed)
 *   - companyId: filter by involved company id
 *   - limit / offset: pagination (defaults 20 / 0, max 100)
 *   - includeDrafts=true: ADMIN ONLY — include drafts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const companyId = searchParams.get('companyId') || '';
    const includeDrafts = searchParams.get('includeDrafts') === 'true';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const where: Record<string, unknown> = {};

    // Drafts only for admins
    if (includeDrafts) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.isAdmin) {
        return forbiddenError('Admin access required to include drafts');
      }
      // no publishedAt filter
    } else {
      where.publishedAt = { not: null };
    }

    if (status && ['success', 'partial', 'failure', 'scrubbed'].includes(status)) {
      where.status = status;
    }
    if (companyId) {
      where.companyIds = { has: companyId };
    }

    const [debriefs, total] = await Promise.all([
      prisma.missionDebrief.findMany({
        where,
        orderBy: { missionDate: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          slug: true,
          eventId: true,
          missionName: true,
          missionDate: true,
          status: true,
          executiveSummary: true,
          costsEstimate: true,
          currency: true,
          companyIds: true,
          keyTakeaways: true,
          generatedBy: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.missionDebrief.count({ where }),
    ]);

    // Hydrate involved companies (name + slug + logo) for the listing
    const allCompanyIds = Array.from(
      new Set(debriefs.flatMap((d) => (d.companyIds as string[]) || []))
    );
    const companies = allCompanyIds.length
      ? await prisma.companyProfile.findMany({
          where: { id: { in: allCompanyIds } },
          select: { id: true, slug: true, name: true, logoUrl: true },
        })
      : [];
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    const enriched = debriefs.map((d) => ({
      ...d,
      companies: ((d.companyIds as string[]) || [])
        .map((id) => companyMap.get(id))
        .filter(Boolean),
    }));

    return NextResponse.json({
      debriefs: enriched,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to list mission debriefs', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list mission debriefs');
  }
}

/**
 * POST /api/mission-debriefs
 *
 * Admin only. Create a new debrief from a manual payload (or AI-generated draft
 * already returned by /generate-ai). The body matches createMissionDebriefSchema.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (!session.user.isAdmin) return forbiddenError('Admin access required');

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(createMissionDebriefSchema, body);
    if (!validation.success) {
      return validationError('Invalid mission debrief payload', validation.errors);
    }
    const data = validation.data;

    // Validate event existence if provided
    if (data.eventId) {
      const event = await prisma.spaceEvent.findUnique({
        where: { id: data.eventId },
        select: { id: true },
      });
      if (!event) {
        return validationError('Invalid eventId — SpaceEvent not found', {
          eventId: ['SpaceEvent not found'],
        });
      }
    }

    // Slug handling
    let slug = data.slug;
    if (slug) {
      const existing = await prisma.missionDebrief.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing) {
        return alreadyExistsError(`Debrief with slug "${slug}"`);
      }
    } else {
      slug = await uniqueSlug(slugify(data.missionName));
    }

    const debrief = await prisma.missionDebrief.create({
      data: {
        slug,
        eventId: data.eventId ?? null,
        missionName: data.missionName,
        missionDate: new Date(data.missionDate),
        status: data.status,
        executiveSummary: data.executiveSummary,
        timeline: data.timeline ?? [],
        costsEstimate: data.costsEstimate ?? null,
        currency: data.currency ?? 'USD',
        companyIds: data.companyIds ?? [],
        keyTakeaways: data.keyTakeaways ?? [],
        sources: data.sources ?? [],
        fullAnalysis: data.fullAnalysis,
        generatedBy: data.generatedBy ?? 'manual',
        publishedAt: data.publishImmediately ? new Date() : null,
      },
    });

    logger.info('Mission debrief created', {
      debriefId: debrief.id,
      slug: debrief.slug,
      published: !!debrief.publishedAt,
      userId: session.user.id,
    });

    return NextResponse.json({ debrief }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create mission debrief', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create mission debrief');
  }
}
