import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params;
    if (!slug) return notFoundError('History event');

    const event = await prisma.spaceHistoryEvent.findUnique({
      where: { slug },
    });
    if (!event) return notFoundError('History event');

    // Related events: same monthDay (other years) + same category (other events)
    const [sameDay, sameCategory] = await Promise.all([
      prisma.spaceHistoryEvent.findMany({
        where: {
          monthDay: event.monthDay,
          NOT: { id: event.id },
        },
        orderBy: { year: 'asc' },
        take: 6,
      }),
      prisma.spaceHistoryEvent.findMany({
        where: {
          category: event.category,
          NOT: { id: event.id },
        },
        orderBy: { eventDate: 'desc' },
        take: 6,
      }),
    ]);

    // Resolve related companies (best-effort — profiles may not exist)
    let relatedCompanies: Array<{
      id: string;
      slug: string;
      name: string;
      logoUrl: string | null;
    }> = [];
    if (event.relatedCompanyIds.length > 0) {
      try {
        relatedCompanies = await prisma.companyProfile.findMany({
          where: { id: { in: event.relatedCompanyIds } },
          select: { id: true, slug: true, name: true, logoUrl: true },
        });
      } catch (err) {
        logger.warn('Related company lookup failed', {
          slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        event,
        related: {
          sameDay,
          sameCategory,
        },
        relatedCompanies,
      },
    });
  } catch (error) {
    logger.error('Failed to load history event', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load history event');
  }
}
