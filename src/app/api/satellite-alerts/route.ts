import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  internalError,
} from '@/lib/errors';
import { createSatelliteAlertSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Max alerts per user — prevents abuse (keeps cron work bounded). */
const MAX_ALERTS_PER_USER = 25;

// GET /api/satellite-alerts — list current user's alerts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const alerts = await prisma.satellitePassAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: alerts });
  } catch (error) {
    logger.error('Failed to list satellite pass alerts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load satellite alerts');
  }
}

// POST /api/satellite-alerts — create a new alert
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(createSatelliteAlertSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const existingCount = await prisma.satellitePassAlert.count({
      where: { userId: session.user.id },
    });
    if (existingCount >= MAX_ALERTS_PER_USER) {
      return validationError(
        `You have reached the maximum of ${MAX_ALERTS_PER_USER} satellite alerts.`
      );
    }

    const data = validation.data;
    const alert = await prisma.satellitePassAlert.create({
      data: {
        userId: session.user.id,
        satellite: data.satellite,
        latitude: data.latitude,
        longitude: data.longitude,
        locationLabel: data.locationLabel ?? null,
        minElevation: data.minElevation,
        enabled: data.enabled,
      },
    });

    logger.info('Satellite pass alert created', {
      alertId: alert.id,
      userId: session.user.id,
      satellite: alert.satellite,
    });

    return NextResponse.json(
      { success: true, data: alert },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create satellite pass alert', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create satellite alert');
  }
}
