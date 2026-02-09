import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find launches that are:
    // 1. Currently live (isLive = true)
    // 2. Within 6 hours of T-0 (upcoming imminent)
    // 3. Recently completed (within last 24 hours) for the listing page
    const [liveLaunches, imminentLaunches, recentLaunches, upcomingLaunches] = await Promise.all([
      // Currently live
      prisma.spaceEvent.findMany({
        where: {
          isLive: true,
        },
        orderBy: { launchDate: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          launchDate: true,
          windowStart: true,
          windowEnd: true,
          location: true,
          country: true,
          agency: true,
          rocket: true,
          mission: true,
          imageUrl: true,
          infoUrl: true,
          videoUrl: true,
          streamUrl: true,
          missionPhase: true,
          isLive: true,
          webcastLive: true,
        },
      }),

      // Imminent (within 6 hours)
      prisma.spaceEvent.findMany({
        where: {
          isLive: false,
          launchDate: {
            gte: now,
            lte: sixHoursFromNow,
          },
          status: { in: ['upcoming', 'go', 'tbc'] },
        },
        orderBy: { launchDate: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          launchDate: true,
          windowStart: true,
          windowEnd: true,
          location: true,
          country: true,
          agency: true,
          rocket: true,
          mission: true,
          imageUrl: true,
          infoUrl: true,
          videoUrl: true,
          streamUrl: true,
          missionPhase: true,
          isLive: true,
          webcastLive: true,
        },
      }),

      // Recently completed (past 24 hours)
      prisma.spaceEvent.findMany({
        where: {
          isLive: false,
          launchDate: {
            gte: twentyFourHoursAgo,
            lt: now,
          },
          status: { in: ['completed', 'in_progress'] },
        },
        orderBy: { launchDate: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          launchDate: true,
          location: true,
          country: true,
          agency: true,
          rocket: true,
          mission: true,
          imageUrl: true,
          infoUrl: true,
          videoUrl: true,
          streamUrl: true,
          isLive: true,
        },
      }),

      // Upcoming within 24 hours
      prisma.spaceEvent.findMany({
        where: {
          isLive: false,
          launchDate: {
            gt: sixHoursFromNow,
            lte: twentyFourHoursFromNow,
          },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
        },
        orderBy: { launchDate: 'asc' },
        take: 20,
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          launchDate: true,
          location: true,
          country: true,
          agency: true,
          rocket: true,
          mission: true,
          imageUrl: true,
          infoUrl: true,
          videoUrl: true,
          streamUrl: true,
          isLive: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        live: liveLaunches,
        imminent: imminentLaunches,
        recent: recentLaunches,
        upcoming: upcomingLaunches,
      },
    });
  } catch (error) {
    logger.error('Error fetching active launches', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch active launches');
  }
}
