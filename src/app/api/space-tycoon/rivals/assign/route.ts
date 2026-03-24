import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  calculateCompositeScore,
  findRivalCandidates,
  RIVAL_CONSTANTS,
} from '@/lib/game/rival-system';
import { getCurrentWeekId } from '@/lib/game/weekly-events';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/rivals/assign
 * Assign 3-5 new rivals to the current player.
 * Called weekly on rotation or on first load if no active rivals exist.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        netWorth: true,
        peakNetWorth: true,
        buildingCount: true,
        researchCount: true,
        serviceCount: true,
        locationsUnlocked: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'No game profile found' },
        { status: 404 },
      );
    }

    const weekId = getCurrentWeekId();

    // Check if player already has active rivals for this week
    const existingAssignments = await prisma.rivalAssignment.findMany({
      where: {
        playerId: profile.id,
        weekId,
        isActive: true,
      },
      select: { id: true, rivalId: true },
    });

    if (existingAssignments.length >= RIVAL_CONSTANTS.RIVALS_PER_PLAYER) {
      return NextResponse.json({
        message: 'Rivals already assigned for this week',
        assignmentCount: existingAssignments.length,
      });
    }

    // Calculate the player's CPS
    const playerCPS = calculateCompositeScore({
      netWorth: profile.netWorth,
      peakNetWorth: profile.peakNetWorth,
      buildingCount: profile.buildingCount,
      researchCount: profile.researchCount,
      serviceCount: profile.serviceCount,
      locationsUnlocked: profile.locationsUnlocked,
      createdAt: profile.createdAt,
    });

    // Get IDs of already-assigned rivals to exclude them
    const existingRivalIds = existingAssignments.map((a) => a.rivalId);

    // Find candidate rivals
    const candidates = await findRivalCandidates(
      profile.id,
      playerCPS,
      existingRivalIds,
    );

    // Take top N candidates (fill remaining slots up to RIVALS_PER_PLAYER)
    const slotsToFill =
      RIVAL_CONSTANTS.RIVALS_PER_PLAYER - existingAssignments.length;
    const selectedCandidates = candidates.slice(0, slotsToFill);

    if (selectedCandidates.length === 0) {
      return NextResponse.json({
        message: 'No eligible rival candidates found',
        assignmentCount: existingAssignments.length,
      });
    }

    // Create rival assignments
    const newAssignments = [];
    for (const candidate of selectedCandidates) {
      try {
        const assignment = await prisma.rivalAssignment.create({
          data: {
            playerId: profile.id,
            rivalId: candidate.id,
            weekId,
            isActive: true,
            rivalryScore: RIVAL_CONSTANTS.INITIAL_SCORE,
          },
          include: {
            rival: {
              select: {
                companyName: true,
                netWorth: true,
                buildingCount: true,
                researchCount: true,
                serviceCount: true,
                locationsUnlocked: true,
              },
            },
          },
        });

        // Create initial snapshot
        await prisma.rivalSnapshot.create({
          data: {
            assignmentId: assignment.id,
            playerNetWorth: profile.netWorth,
            rivalNetWorth: assignment.rival.netWorth,
            playerBuildings: profile.buildingCount,
            rivalBuildings: assignment.rival.buildingCount,
            playerResearch: profile.researchCount,
            rivalResearch: assignment.rival.researchCount,
            playerServices: profile.serviceCount,
            rivalServices: assignment.rival.serviceCount,
            scoreDelta: 0,
          },
        });

        // Create "new rival" event
        await prisma.rivalEvent.create({
          data: {
            assignmentId: assignment.id,
            type: 'rival_assigned',
            title: 'New rival assigned!',
            description: `New rival: ${assignment.rival.companyName}. The race begins!`,
            metadata: {
              rivalCompanyName: assignment.rival.companyName,
              rivalNetWorth: assignment.rival.netWorth,
            },
          },
        });

        newAssignments.push({
          id: assignment.id,
          rivalCompanyName: assignment.rival.companyName,
          rivalNetWorth: assignment.rival.netWorth,
          weekId,
          score: RIVAL_CONSTANTS.INITIAL_SCORE,
        });
      } catch (err) {
        // Unique constraint violation — rival already assigned this week, skip
        console.warn('Rival assignment skipped (likely duplicate):', err);
      }
    }

    return NextResponse.json({
      message: `Assigned ${newAssignments.length} new rival(s)`,
      assignmentCount: existingAssignments.length + newAssignments.length,
      newAssignments,
    });
  } catch (error) {
    console.error('Rivals assign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
