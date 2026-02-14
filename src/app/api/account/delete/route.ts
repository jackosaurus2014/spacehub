import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { validateBody } from '@/lib/validations';
import bcrypt from 'bcryptjs';

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await req.json();
    const validation = validateBody(deleteAccountSchema, body);
    if (!validation.success) {
      return validationError('Invalid request', validation.errors);
    }

    const { password } = validation.data!;

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user) return unauthorizedError();

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return validationError('Incorrect password');
    }

    // Delete user and all related data (Prisma onDelete: Cascade handles relations)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    logger.info('Account deleted by user', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: { message: 'Your account has been permanently deleted.' },
    });
  } catch (error) {
    logger.error('Error deleting account', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete account. Please contact support.');
  }
}
