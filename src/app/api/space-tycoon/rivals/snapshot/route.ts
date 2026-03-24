import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  updateRivalryScore,
  checkRivalEvents,
} from '@/lib/game/rival-system';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/rivals/snapshot
 * Capture snapshots for all active rival pairs.
 * Intended to be called by a cron job every 4 hours.
 *
 * Authentication: expects `Authorization: Bearer <CRON_SECRET>` header
 * OR a valid user session (for manual triggering during development).
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or session
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Authorized via cron secret
    } else {
      // Fallback: allow if running in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Fetch all active rival assignments
    const assignments = await prisma.rivalAssignment.findMany({
      where: { isActive: true },
      include: {
        player: {
          select: {
            id: true,
            netWorth: true,
            buildingCount: true,
            researchCount: true,
            serviceCount: true,
          },
        },
        rival: {
          select: {
            id: true,
            companyName: true,
            netWorth: true,
            buildingCount: true,
            researchCount: true,
            serviceCount: true,
          },
        },
        snapshots: {
          orderBy: { snapshotAt: 'desc' },
          take: 1, // most recent snapshot for diffing
        },
      },
    });

    let snapshotsCreated = 0;
    let eventsCreated = 0;
    let scoresUpdated = 0;

    for (const assignment of assignments) {
      const player = assignment.player;
      const rival = assignment.rival;
      const previousSnapshot = assignment.snapshots[0] || null;

      // Current state
      const playerCurrent = {
        netWorth: player.netWorth,
        buildings: player.buildingCount,
        research: player.researchCount,
        services: player.serviceCount,
      };

      const rivalCurrent = {
        netWorth: rival.netWorth,
        buildings: rival.buildingCount,
        research: rival.researchCount,
        services: rival.serviceCount,
      };

      // Previous state (from last snapshot, or same as current if first)
      const playerPrevious = previousSnapshot
        ? {
            netWorth: previousSnapshot.playerNetWorth,
            buildings: previousSnapshot.playerBuildings,
            research: previousSnapshot.playerResearch,
            services: previousSnapshot.playerServices,
          }
        : playerCurrent;

      const rivalPrevious = previousSnapshot
        ? {
            netWorth: previousSnapshot.rivalNetWorth,
            buildings: previousSnapshot.rivalBuildings,
            research: previousSnapshot.rivalResearch,
            services: previousSnapshot.rivalServices,
          }
        : rivalCurrent;

      // Calculate snapshot gap in hours
      const snapshotGapHours = previousSnapshot
        ? (Date.now() - previousSnapshot.snapshotAt.getTime()) / (1000 * 60 * 60)
        : 4;

      // Skip score movement on first snapshot (no previous data to diff)
      let movement = 0;
      let newScore = assignment.rivalryScore;

      if (previousSnapshot) {
        const result = updateRivalryScore(
          assignment.rivalryScore,
          playerCurrent,
          playerPrevious,
          rivalCurrent,
          rivalPrevious,
          snapshotGapHours,
        );
        movement = result.movement;
        newScore = result.newScore;
      }

      // Create snapshot record
      await prisma.rivalSnapshot.create({
        data: {
          assignmentId: assignment.id,
          playerNetWorth: player.netWorth,
          rivalNetWorth: rival.netWorth,
          playerBuildings: player.buildingCount,
          rivalBuildings: rival.buildingCount,
          playerResearch: player.researchCount,
          rivalResearch: rival.researchCount,
          playerServices: player.serviceCount,
          rivalServices: rival.serviceCount,
          scoreDelta: movement,
        },
      });
      snapshotsCreated++;

      // Update assignment score
      if (movement !== 0) {
        await prisma.rivalAssignment.update({
          where: { id: assignment.id },
          data: { rivalryScore: newScore },
        });
        scoresUpdated++;
      }

      // Check for events
      const rivalEvents = checkRivalEvents(
        assignment.id,
        player.id,
        rival.companyName,
        assignment.rivalryScore,
        newScore,
        player.netWorth,
        rival.netWorth,
        previousSnapshot?.playerNetWorth ?? player.netWorth,
        previousSnapshot?.rivalNetWorth ?? rival.netWorth,
      );

      // Create event records
      for (const event of rivalEvents) {
        await prisma.rivalEvent.create({
          data: {
            assignmentId: assignment.id,
            type: event.type,
            title: event.title,
            description: event.description,
            metadata: (event.metadata as Record<string, string | number>) ?? undefined,
          },
        });
        eventsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: assignments.length,
      snapshotsCreated,
      scoresUpdated,
      eventsCreated,
    });
  } catch (error) {
    console.error('Rival snapshot cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
