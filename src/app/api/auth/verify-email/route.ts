import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateBody, verifyEmailSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(verifyEmailSchema, body);
    if (!validation.success) {
      return validationError('Invalid verification token', validation.errors);
    }

    const { token } = validation.data;

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return validationError('Invalid or expired verification link.');
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified.',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
    });
  } catch (error) {
    logger.error('Verify email error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to verify email');
  }
}
