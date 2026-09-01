import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/newsletter/email-service';
import { renderVerificationEmail } from '@/lib/newsletter/email-templates';
import { validationError, internalError } from '@/lib/errors';
import { newsletterSubscribeSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source = 'website' } = body;

    const validation = validateBody(newsletterSubscribeSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { email, name, dailyBrief, marketsDaily, monthlyReports } = validation.data;
    // Daily Brief / Space Markets Daily / monthly reports are separate,
    // explicit opt-in flags. Each is only ever SET when the caller asked for
    // it — never cleared here, so subscribing to the M/Th digest from another
    // form leaves an existing opt-in intact.
    const wantsDailyBrief = dailyBrief === true;
    const wantsMarkets = marketsDaily === true;
    const wantsMonthly = monthlyReports === true;
    const requestedFlags = {
      ...(wantsDailyBrief ? { dailyBrief: true } : {}),
      ...(wantsMarkets ? { marketsDaily: true } : {}),
      ...(wantsMonthly ? { monthlyReports: true } : {}),
    };

    // Check if subscriber already exists
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.verified && !existing.unsubscribedAt) {
        // Already a verified subscriber. If they're asking to add a program
        // they don't have yet, flip those flags — no re-verification needed
        // for a verified address. Otherwise keep the historical 409.
        const additions = {
          ...(wantsDailyBrief && !existing.dailyBrief ? { dailyBrief: true } : {}),
          ...(wantsMarkets && !existing.marketsDaily ? { marketsDaily: true } : {}),
          ...(wantsMonthly && !existing.monthlyReports ? { monthlyReports: true } : {}),
        };
        if (Object.keys(additions).length > 0) {
          await prisma.newsletterSubscriber.update({
            where: { id: existing.id },
            data: additions,
          });
          const added = [
            'dailyBrief' in additions ? 'Daily Brief (7am UTC)' : null,
            'marketsDaily' in additions ? 'Space Markets Daily (weekdays after the close)' : null,
            'monthlyReports' in additions ? 'monthly reports (3rd of the month)' : null,
          ].filter(Boolean);
          return NextResponse.json({
            success: true,
            message: `Added to your subscription: ${added.join(', ')}.`,
          });
        }
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
            ...requestedFlags,
          },
        });

        // Send verification email
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;
        const { html, plain, subject } = renderVerificationEmail(verificationUrl, name);

        await sendVerificationEmail(email, html, plain, subject);

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
            ...requestedFlags,
          },
        });

        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;
        const { html, plain, subject } = renderVerificationEmail(verificationUrl, name);

        await sendVerificationEmail(email, html, plain, subject);

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
        email,
        name: name || null,
        verificationToken,
        unsubscribeToken,
        source,
        dailyBrief: wantsDailyBrief,
        marketsDaily: wantsMarkets,
        monthlyReports: wantsMonthly,
      },
    });

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/verify?token=${verificationToken}`;
    const { html, plain, subject } = renderVerificationEmail(verificationUrl, name);

    const emailResult = await sendVerificationEmail(email, html, plain, subject);

    if (!emailResult.success) {
      const errVal = emailResult.error as unknown;
      logger.error('Failed to send verification email', { error: errVal instanceof Error ? errVal.message : String(errVal) });
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: 'You\'re signed up! However, we couldn\'t send the verification email. Please try requesting a new one or check back later.',
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: 'Verification email sent. Please check your inbox to confirm your subscription.',
    });
  } catch (error) {
    logger.error('Newsletter subscribe error', { error: error instanceof Error ? error.message : String(error) });
    return internalError();
  }
}
