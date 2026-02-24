import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateBody, updateProfileSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subscriptionTier: true,
      },
    });

    if (!user) return unauthorizedError();

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error fetching profile', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch profile.');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await req.json();
    const validation = validateBody(updateProfileSchema, body);
    if (!validation.success) {
      return validationError('Invalid request', validation.errors);
    }

    const { name } = validation.data!;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subscriptionTier: true,
      },
    });

    logger.info('Profile updated by user', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    logger.error('Error updating profile', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update profile.');
  }
}
