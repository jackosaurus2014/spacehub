import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
// enrichEvent lives in a lib module so the /mission-control server component
// renders exactly what this route returns (SYNTHESIS.md item 14).
import { enrichEvent, EVENT_SELECT } from '@/lib/space-events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = searchParams.get('hours');
    const type = searchParams.get('type');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const country = searchParams.get('country');

    const now = new Date();

    // Simple query first - get all events
    let events;
    let total;

    const eventSelect = EVENT_SELECT;

    if (startDate && endDate) {
      events = await prisma.spaceEvent.findMany({
        where: {
          launchDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          ...(type ? { type } : {}),
          ...(country ? { country } : {}),
        },
        select: eventSelect,
        orderBy: { launchDate: 'asc' },
        take: limit,
        skip: offset,
      });
      total = await prisma.spaceEvent.count({
        where: {
          launchDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          ...(type ? { type } : {}),
          ...(country ? { country } : {}),
        },
      });
    } else if (hours) {
      const parsedHours = parseInt(hours);
      const futureDate = new Date(now.getTime() + (isNaN(parsedHours) ? 24 : Math.min(parsedHours, 8760)) * 60 * 60 * 1000);
      events = await prisma.spaceEvent.findMany({
        where: {
          launchDate: {
            gte: now,
            lte: futureDate,
          },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
        select: eventSelect,
        orderBy: { launchDate: 'asc' },
        take: limit,
        skip: offset,
      });
      total = await prisma.spaceEvent.count({
        where: {
          launchDate: {
            gte: now,
            lte: futureDate,
          },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
      });
    } else {
      events = await prisma.spaceEvent.findMany({
        where: {
          launchDate: { gte: now },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
        select: eventSelect,
        orderBy: { launchDate: 'asc' },
        take: limit,
        skip: offset,
      });
      total = await prisma.spaceEvent.count({
        where: {
          launchDate: { gte: now },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
      });
    }

    // Enrich DB events with computed live/stream fields
    // Explicit arrow: enrichEvent takes an optional `now`, and Array.map would
    // otherwise hand it the element index.
    const enrichedEvents = events.map((e) => enrichEvent(e, now));

    return NextResponse.json({ events: enrichedEvents, total });
  } catch (error) {
    logger.error('Error fetching events', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch events');
  }
}
