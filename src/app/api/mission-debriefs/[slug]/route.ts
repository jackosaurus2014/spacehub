import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import { validateBody, updateMissionDebriefSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mission-debriefs/[slug]
 *
 * Public — returns the published debrief by slug. Drafts are returned only to
 * authenticated admins.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const debrief = await prisma.missionDebrief.findUnique({
      where: { slug },
    });

    if (!debrief) return notFoundError('Mission debrief');

    if (!debrief.publishedAt) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.isAdmin) {
        return notFoundError('Mission debrief');
      }
    }

    const ids = (debrief.companyIds as string[]) || [];
    const companies = ids.length
      ? await prisma.companyProfile.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            slug: true,
            name: true,
            logoUrl: true,
            sector: true,
            tier: true,
          },
        })
      : [];

    let event:
      | {
          id: string;
          name: string;
          launchDate: Date | null;
          status: string;
          rocket: string | null;
          location: string | null;
          agency: string | null;
          missionPatchUrl: string | null;
          imageUrl: string | null;
        }
      | null = null;
    if (debrief.eventId) {
      event = await prisma.spaceEvent.findUnique({
        where: { id: debrief.eventId },
        select: {
          id: true,
          name: true,
          launchDate: true,
          status: true,
          rocket: true,
          location: true,
          agency: true,
          missionPatchUrl: true,
          imageUrl: true,
        },
      });
    }

    return NextResponse.json({ debrief, companies, event });
  } catch (error) {
    logger.error('Failed to fetch mission debrief', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch mission debrief');
  }
}

/**
 * PATCH /api/mission-debriefs/[slug]
 *
 * Admin only. Update fields on an existing debrief.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (!session.user.isAdmin) return forbiddenError('Admin access required');

    const existing = await prisma.missionDebrief.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!existing) return notFoundError('Mission debrief');

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(updateMissionDebriefSchema, body);
    if (!validation.success) {
      return validationError('Invalid update payload', validation.errors);
    }
    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.missionName !== undefined) updateData.missionName = data.missionName;
    if (data.missionDate !== undefined) updateData.missionDate = new Date(data.missionDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.executiveSummary !== undefined) updateData.executiveSummary = data.executiveSummary;
    if (data.timeline !== undefined) updateData.timeline = data.timeline;
    if (data.costsEstimate !== undefined) updateData.costsEstimate = data.costsEstimate;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.companyIds !== undefined) updateData.companyIds = data.companyIds;
    if (data.keyTakeaways !== undefined) updateData.keyTakeaways = data.keyTakeaways;
    if (data.sources !== undefined) updateData.sources = data.sources;
    if (data.fullAnalysis !== undefined) updateData.fullAnalysis = data.fullAnalysis;
    if (data.generatedBy !== undefined) updateData.generatedBy = data.generatedBy;
    if (data.publishedAt !== undefined) {
      updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    }

    const debrief = await prisma.missionDebrief.update({
      where: { slug: params.slug },
      data: updateData,
    });

    logger.info('Mission debrief updated', {
      slug: params.slug,
      userId: session.user.id,
      fieldsUpdated: Object.keys(updateData),
    });

    return NextResponse.json({ debrief });
  } catch (error) {
    logger.error('Failed to update mission debrief', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update mission debrief');
  }
}

/**
 * DELETE /api/mission-debriefs/[slug]
 *
 * Admin only. Permanently deletes a debrief.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (!session.user.isAdmin) return forbiddenError('Admin access required');

    const existing = await prisma.missionDebrief.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!existing) return notFoundError('Mission debrief');

    await prisma.missionDebrief.delete({ where: { slug: params.slug } });

    logger.info('Mission debrief deleted', {
      slug: params.slug,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete mission debrief', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete mission debrief');
  }
}
