import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = searchParams.get('hours');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const country = searchParams.get('country');

    const now = new Date();

    // Simple query first - get all events
    let events;
    let total;

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
      const futureDate = new Date(now.getTime() + parseInt(hours) * 60 * 60 * 1000);
      events = await prisma.spaceEvent.findMany({
        where: {
          launchDate: {
            gte: now,
            lte: futureDate,
          },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
          ...(type ? { type } : {}),
        },
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

    return NextResponse.json({ events, total });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
