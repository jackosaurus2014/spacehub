import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/newsletter/email-service';
import { renderVerificationEmail } from '@/lib/newsletter/email-templates';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!subscriber || subscriber.verified || subscriber.unsubscribedAt) {
      return NextResponse.json({
        success: true,
        message: 'If this email is registered, a verification email has been sent.',
      });
    }

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex');

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { verificationToken },
    });

    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;
    const { html, plain, subject } = renderVerificationEmail(verificationUrl, subscriber.name || undefined);

    const emailResult = await sendVerificationEmail(email, html, plain, subject);

    if (!emailResult.success) {
      logger.error('Failed to resend verification email', { error: emailResult.error });
      return NextResponse.json({
        success: false,
        message: 'Unable to send verification email. Please try again later.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'If this email is registered, a verification email has been sent.',
    });
  } catch (error) {
    logger.error('Resend verification error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
