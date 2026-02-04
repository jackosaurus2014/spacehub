import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/newsletter/email-service';
import { renderVerificationEmail } from '@/lib/newsletter/email-templates';

export const dynamic = 'force-dynamic';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, source = 'website' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if subscriber already exists
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.verified && !existing.unsubscribedAt) {
        return NextResponse.json(
          { error: 'Email already subscribed', code: 'ALREADY_SUBSCRIBED' },
          { status: 409 }
        );
      }

      // If unsubscribed, allow re-subscription
      if (existing.unsubscribedAt) {
        const verificationToken = generateToken();

        await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: {
            name: name || existing.name,
            verified: false,
            verificationToken,
            verifiedAt: null,
            unsubscribedAt: null,
            source,
          },
        });

        // Send verification email
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;
        const { html, plain, subject } = renderVerificationEmail(verificationUrl, name);

        await sendVerificationEmail(normalizedEmail, html, plain, subject);

        return NextResponse.json({
          success: true,
          message: 'Verification email sent. Please check your inbox.',
        });
      }

      // If not verified, resend verification
      if (!existing.verified) {
        const verificationToken = generateToken();

        await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: {
            verificationToken,
            name: name || existing.name,
          },
        });

        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;
        const { html, plain, subject } = renderVerificationEmail(verificationUrl, name);

        await sendVerificationEmail(normalizedEmail, html, plain, subject);

        return NextResponse.json({
          success: true,
          message: 'Verification email sent. Please check your inbox.',
        });
      }
    }

    // Create new subscriber
    const verificationToken = generateToken();
    const unsubscribeToken = generateToken();

    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        verificationToken,
        unsubscribeToken,
        source,
      },
    });

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;
    const { html, plain, subject } = renderVerificationEmail(verificationUrl, name);

    const emailResult = await sendVerificationEmail(normalizedEmail, html, plain, subject);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Still return success - subscriber is created, they can request resend
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox to confirm your subscription.',
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}
