import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { validateBody, resetPasswordSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(resetPasswordSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      return validationError(
        typeof firstError === 'string' ? firstError : 'Invalid input',
        validation.errors
      );
    }

    const { token, password } = validation.data;

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return validationError('Invalid or expired reset link. Please request a new one.');
    }

    if (resetToken.used) {
      return validationError('This reset link has already been used. Please request a new one.');
    }

    if (resetToken.expiresAt < new Date()) {
      return validationError('This reset link has expired. Please request a new one.');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Atomic transaction: password update and token invalidation must both
    // succeed or both rollback, otherwise a crash between the two steps
    // could leave the token reusable or the password partially updated
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    logger.error('Reset password error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to reset password');
  }
}
