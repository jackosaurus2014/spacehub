import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { notFoundError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { generateTelemetryBatch } from '@/lib/launch/telemetry-simulator';
import { validateSearchParams, telemetryQuerySchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        launchDate: true,
        rocket: true,
        isLive: true,
      },
    });

    if (!event) {
      return notFoundError('Launch event');
    }

    const { searchParams } = new URL(req.url);
    const validation = validateSearchParams(telemetryQuerySchema, searchParams);

    const limit = validation.success ? validation.data.limit : 50;
    const since = validation.success ? validation.data.since : undefined;

    if (!event.launchDate) {
      return NextResponse.json({
        success: true,
        data: { telemetry: [], isSimulated: true },
      });
    }

    const now = new Date();
    const missionTimeSeconds = (now.getTime() - event.launchDate.getTime()) / 1000;

    // Only provide telemetry data if within reasonable range
    if (missionTimeSeconds < -60 || missionTimeSeconds > 7200) {
      return NextResponse.json({
        success: true,
        data: { telemetry: [], isSimulated: true },
      });
    }

    // Generate simulated telemetry for the requested range
    let startTime: number;
    if (since) {
      startTime = (since.getTime() - event.launchDate.getTime()) / 1000;
    } else {
      // Default: last 30 seconds of data
      startTime = Math.max(-10, missionTimeSeconds - 30);
    }

    const endTime = missionTimeSeconds;
    const telemetry = generateTelemetryBatch(
      Math.floor(startTime),
      Math.floor(endTime),
      1,
      event.rocket || 'falcon9'
    ).slice(-limit);

    return NextResponse.json({
      success: true,
      data: {
        telemetry,
        missionTime: missionTimeSeconds,
        isSimulated: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching telemetry data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch telemetry data');
  }
}
