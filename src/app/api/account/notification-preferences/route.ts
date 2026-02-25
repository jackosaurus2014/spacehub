import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateBody, notificationPreferencesSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFERENCES = {
  emailDigest: true,
  emailAlerts: true,
  pushEnabled: true,
  forumReplies: true,
  directMessages: true,
  marketplaceUpdates: true,
  watchlistAlerts: true,
  newsDigest: true,
  digestFrequency: 'daily',
  alertDigestMode: 'instant',
  quietHoursStart: null,
  quietHoursEnd: null,
  quietHoursTimezone: 'UTC',
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    // Use `as any` for new schema fields until prisma generate picks them up (EPERM on Windows)
    const preferences = await (prisma.notificationPreference as any).findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      data: preferences || DEFAULT_PREFERENCES,
    });
  } catch (error) {
    logger.error('Error fetching notification preferences', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch notification preferences.');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await req.json();
    const validation = validateBody(notificationPreferencesSchema, body);
    if (!validation.success) {
      return validationError('Invalid request', validation.errors);
    }

    const data = validation.data!;

    // Use `as any` for new schema fields until prisma generate picks them up (EPERM on Windows)
    const preferences = await (prisma.notificationPreference as any).upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...data,
      },
      update: data,
    });

    logger.info('Notification preferences updated', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Error updating notification preferences', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update notification preferences.');
  }
}
