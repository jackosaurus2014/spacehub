import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { notFoundError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { generateTelemetryPoint } from '@/lib/launch/telemetry-simulator';
import { getCurrentPhase, formatMissionTime } from '@/lib/launch/mission-phases';

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
        padLatitude: true,
        padLongitude: true,
        orbitType: true,
        missionPatchUrl: true,
        rocketImageUrl: true,
        crewCount: true,
        providerType: true,
      },
    });

    if (!event) {
      return notFoundError('Launch event');
    }

    // Calculate mission time if launch has a date
    let missionTimeSeconds: number | null = null;
    let currentPhase = null;
    let telemetry = null;
    let formattedMissionTime: string | null = null;

    if (event.launchDate) {
      const now = new Date();
      missionTimeSeconds = (now.getTime() - event.launchDate.getTime()) / 1000;
      formattedMissionTime = formatMissionTime(missionTimeSeconds);

      // Only generate phase/telemetry if within reasonable range
      if (missionTimeSeconds >= -3600 && missionTimeSeconds <= 7200) {
        currentPhase = getCurrentPhase(missionTimeSeconds);

        // Generate simulated telemetry if launch is live or in progress
        if (missionTimeSeconds >= -10) {
          telemetry = generateTelemetryPoint(missionTimeSeconds, event.rocket || 'falcon9');
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        event: {
          ...event,
          streamUrl: event.streamUrl || event.videoUrl,
        },
        missionTime: missionTimeSeconds,
        formattedMissionTime,
        currentPhase,
        telemetry,
        isSimulated: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching launch day data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch launch day data');
  }
}
