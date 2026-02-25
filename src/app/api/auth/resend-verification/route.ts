import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/db';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validateBody, emailSchema } from '@/lib/validations';
import { generateVerificationEmail } from '@/lib/newsletter/email-templates';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const resendVerificationSchema = z.object({
  email: emailSchema,
});

// Rate limiting: 3 requests per hour per email
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;

// Periodic cleanup to prevent memory leaks
function cleanupRateLimits() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  rateLimitMap.forEach((timestamps, key) => {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      keysToDelete.push(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  });
  keysToDelete.forEach((key) => rateLimitMap.delete(key));
}

// Clean up every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 10 * 60 * 1000);
}

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(email) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recentTimestamps.push(now);
  rateLimitMap.set(email, recentTimestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(resendVerificationSchema, body);
    if (!validation.success) {
      return validationError('Invalid email address', validation.errors);
    }

    const { email } = validation.data;

    // Anti-enumeration: always return the same response
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account exists with that email and is not yet verified, a verification email has been sent.',
    });

    // Rate limit check
    if (isRateLimited(email)) {
      // Still return generic success to prevent enumeration
      logger.warn('Resend verification rate limited', { email });
      return successResponse;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        emailVerified: true,
      },
    });

    // If user doesn't exist or is already verified, return success silently
    if (!user || user.emailVerified) {
      return successResponse;
    }

    // Generate new verification token
    const verificationToken = randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    // Send verification email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;
    const { html, text } = generateVerificationEmail(verifyUrl, user.name || undefined);

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.us>',
        to: email,
        subject: 'Verify Your SpaceNexus Account',
        html,
        text,
      });

      logger.info('Resent verification email', { userId: user.id });
    } catch (emailError) {
      logger.error('Failed to resend verification email', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
      // Swallow email errors to prevent leaking account existence
    }

    return successResponse;
  } catch (error) {
    logger.error('Resend verification error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to process verification request');
  }
}
