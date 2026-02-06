import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { validateBody, resetPasswordSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';

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

    // Update password and mark token as used in a transaction
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
    console.error('Reset password error:', error);
    return internalError('Failed to reset password');
  }
}
