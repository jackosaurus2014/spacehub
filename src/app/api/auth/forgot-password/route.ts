import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/db';
import { validateBody } from '@/lib/validations';
import { forgotPasswordSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { validationError, internalError } from '@/lib/errors';
import { generatePasswordResetEmail } from '@/lib/newsletter/email-templates';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(forgotPasswordSchema, body);
    if (!validation.success) {
      return validationError('Invalid email address', validation.errors);
    }

    const { email } = validation.data;

    // Anti-enumeration: always return the same response regardless of whether
    // the email exists, so attackers can't probe for valid accounts
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return successResponse;

    // Invalidate prior tokens so only the latest reset link works,
    // preventing confusion from multiple outstanding emails
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Create new reset token (expires in 1 hour)
    const token = randomUUID();
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Send reset email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const { html, text } = generatePasswordResetEmail(resetUrl);

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.com>',
        to: email,
        subject: 'Reset Your SpaceNexus Password',
        html,
        text,
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email', { error: emailError instanceof Error ? emailError.message : String(emailError) });
      // Swallow email errors: exposing them would leak whether the account exists
    }

    return successResponse;
  } catch (error) {
    logger.error('Forgot password error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to process password reset request');
  }
}
