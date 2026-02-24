import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateBody, changePasswordSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await req.json();
    const validation = validateBody(changePasswordSchema, body);
    if (!validation.success) {
      return validationError('Invalid request', validation.errors);
    }

    const { currentPassword, newPassword } = validation.data!;

    // Find user and verify current password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user) return unauthorizedError();

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return validationError('Current password is incorrect');
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    logger.info('Password changed by user', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: { message: 'Password changed successfully.' },
    });
  } catch (error) {
    logger.error('Error changing password', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to change password. Please try again.');
  }
}
