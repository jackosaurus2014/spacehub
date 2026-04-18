import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  internalError,
} from '@/lib/errors';
import { updateSatelliteAlertSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// PATCH /api/satellite-alerts/[id] — update an alert
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const existing = await prisma.satellitePassAlert.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!existing) return notFoundError('Satellite alert');
    if (existing.userId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You do not have access to this alert');
    }

    const body = await req.json();
    const validation = validateBody(updateSatelliteAlertSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const update: Record<string, unknown> = {};
    const d = validation.data;
    if (d.satellite !== undefined) update.satellite = d.satellite;
    if (d.latitude !== undefined) update.latitude = d.latitude;
    if (d.longitude !== undefined) update.longitude = d.longitude;
    if (d.locationLabel !== undefined) update.locationLabel = d.locationLabel ?? null;
    if (d.minElevation !== undefined) update.minElevation = d.minElevation;
    if (d.enabled !== undefined) update.enabled = d.enabled;

    const updated = await prisma.satellitePassAlert.update({
      where: { id: params.id },
      data: update,
    });

    logger.info('Satellite pass alert updated', {
      alertId: params.id,
      userId: session.user.id,
      fields: Object.keys(update),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update satellite alert', {
      alertId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update satellite alert');
  }
}

// DELETE /api/satellite-alerts/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const existing = await prisma.satellitePassAlert.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!existing) return notFoundError('Satellite alert');
    if (existing.userId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You do not have access to this alert');
    }

    await prisma.satellitePassAlert.delete({ where: { id: params.id } });

    logger.info('Satellite pass alert deleted', {
      alertId: params.id,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Deleted' },
    });
  } catch (error) {
    logger.error('Failed to delete satellite alert', {
      alertId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete satellite alert');
  }
}
