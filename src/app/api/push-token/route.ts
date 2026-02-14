import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { validateBody } from '@/lib/validations';

const pushTokenSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(['ios', 'android']),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await req.json();
    const validation = validateBody(pushTokenSchema, body);
    if (!validation.success) {
      return validationError('Invalid push token data', validation.errors);
    }

    const { token, platform } = validation.data!;

    await (prisma as any).pushToken.upsert({
      where: { token },
      update: { userId: session.user.id, platform, updatedAt: new Date() },
      create: { token, userId: session.user.id, platform },
    });

    logger.info('Push token registered', {
      userId: session.user.id,
      platform,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error registering push token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError();
  }
}
