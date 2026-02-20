import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { notFoundError, forbiddenError, internalError, validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getCurrentPhase, STANDARD_PHASES, formatMissionTime } from '@/lib/launch/mission-phases';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        launchDate: true,
        missionPhase: true,
        isLive: true,
      },
    });

    if (!event) {
      return notFoundError('Launch event');
    }

    let missionTimeSeconds: number | null = null;
    let currentPhase = null;
    let formattedMissionTime: string | null = null;

    if (event.launchDate) {
      const now = new Date();
      missionTimeSeconds = (now.getTime() - event.launchDate.getTime()) / 1000;
      formattedMissionTime = formatMissionTime(missionTimeSeconds);
      currentPhase = getCurrentPhase(missionTimeSeconds);
    }

    // Use manual override if set
    if (event.missionPhase) {
      const overridePhase = STANDARD_PHASES.find(p => p.id === event.missionPhase);
      if (overridePhase) {
        currentPhase = overridePhase;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        phase: currentPhase,
        missionTime: missionTimeSeconds,
        formattedMissionTime,
        allPhases: STANDARD_PHASES,
        isLive: event.isLive,
      },
    });
  } catch (error) {
    logger.error('Error fetching mission phase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch mission phase');
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return forbiddenError();
    }

    const body = await req.json();
    const { phase, isLive } = body;

    // Validate phase if provided
    if (phase !== undefined && phase !== null) {
      const validPhase = STANDARD_PHASES.find(p => p.id === phase);
      if (!validPhase) {
        return validationError('Invalid mission phase', {
          phase: `Valid phases: ${STANDARD_PHASES.map(p => p.id).join(', ')}`,
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (phase !== undefined) {
      updateData.missionPhase = phase;
    }
    if (typeof isLive === 'boolean') {
      updateData.isLive = isLive;
    }

    const event = await prisma.spaceEvent.update({
      where: { id: eventId },
      data: updateData,
      select: {
        id: true,
        missionPhase: true,
        isLive: true,
      },
    });

    // Create a system chat message for phase changes
    if (phase) {
      const phaseInfo = STANDARD_PHASES.find(p => p.id === phase);
      if (phaseInfo) {
        await prisma.launchChatMessage.create({
          data: {
            eventId,
            userName: 'Mission Control',
            message: `${phaseInfo.icon} ${phaseInfo.name}: ${phaseInfo.description}`,
            type: 'milestone',
          },
        });
      }
    }

    logger.info('Mission phase updated', {
      eventId,
      phase: event.missionPhase,
      isLive: event.isLive,
      updatedBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    logger.error('Error updating mission phase', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update mission phase');
  }
}
