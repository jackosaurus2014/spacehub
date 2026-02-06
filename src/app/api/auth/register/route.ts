import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { validationError, alreadyExistsError, internalError } from '@/lib/errors';
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

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return alreadyExistsError('User');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

    // Generate verification token and send email
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
      console.error('Failed to send verification email:', emailError);
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return internalError();
  }
}
