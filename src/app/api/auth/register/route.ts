import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { serverRegisterSchema, validateBody } from '@/lib/validations';
import { generateVerificationEmail } from '@/lib/newsletter/email-templates';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(serverRegisterSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { email, password, name } = validation.data;

    // Anti-enumeration: return the same success response shape whether the
    // email is new or already registered, so attackers can't probe for valid accounts
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Return a generic success response that looks identical to a new registration
      return NextResponse.json({
        message: 'Registration successful. Please check your email to verify your account.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

    // Store a verification token on the user record; the account remains
    // unverified until the user clicks the emailed link, which clears this token
    const verificationToken = randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;
    const { html, text } = generateVerificationEmail(verifyUrl, name || undefined);

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.com>',
        to: email,
        subject: 'Verify Your SpaceNexus Account',
        html,
        text,
      });
    } catch (emailError) {
      // Email failure is non-fatal: the user can still request a new
      // verification email later, so we don't block registration
      logger.error('Failed to send verification email', { error: emailError instanceof Error ? emailError.message : String(emailError) });
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    logger.error('Registration error', { error: error instanceof Error ? error.message : String(error) });
    return internalError();
  }
}
