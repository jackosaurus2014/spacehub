import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  generateNurtureWelcomeEmail,
  generateNurtureDidYouKnowEmail,
  generateNurtureSocialProofEmail,
  generateNurtureAISpotlightEmail,
  generateNurtureCaseStudyEmail,
  generateNurtureTrialOfferEmail,
  generateNurtureFinalNudgeEmail,
} from '@/lib/newsletter/email-templates';

export const dynamic = 'force-dynamic';

/**
 * Nurture email sequence configuration.
 * Each entry maps a number of days since registration to an email type
 * and the corresponding template generator function.
 */
const NURTURE_SEQUENCE = [
  { day: 1, emailType: 'welcome', generator: generateNurtureWelcomeEmail },
  { day: 3, emailType: 'did_you_know', generator: generateNurtureDidYouKnowEmail },
  { day: 5, emailType: 'social_proof', generator: generateNurtureSocialProofEmail },
  { day: 7, emailType: 'ai_spotlight', generator: generateNurtureAISpotlightEmail },
  { day: 10, emailType: 'case_study', generator: generateNurtureCaseStudyEmail },
  { day: 14, emailType: 'trial_offer', generator: generateNurtureTrialOfferEmail },
  { day: 21, emailType: 'final_nudge', generator: generateNurtureFinalNudgeEmail },
] as const;

/**
 * POST /api/nurture/process
 *
 * Cron-triggered endpoint that processes the nurture email sequence.
 * For each step in the sequence, finds users who registered X days ago,
 * haven't already received that email, are still on the free tier,
 * and haven't unsubscribed from marketing emails.
 *
 * Protected by CRON_SECRET Bearer token.
 */
export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const now = new Date();
    let totalSent = 0;
    let totalFailed = 0;
    const results: Array<{ emailType: string; sent: number; failed: number; errors: string[] }> = [];

    for (const step of NURTURE_SEQUENCE) {
      const stepResult = await processNurtureStep(step, now);
      totalSent += stepResult.sent;
      totalFailed += stepResult.failed;
      results.push({ emailType: step.emailType, ...stepResult });
    }

    logger.info('Nurture sequence processing complete', {
      totalSent,
      totalFailed,
      breakdown: results.filter(r => r.sent > 0 || r.failed > 0),
    });

    return NextResponse.json({
      success: true,
      totalSent,
      totalFailed,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error('Nurture sequence processing error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Nurture sequence processing failed');
  }
}

async function processNurtureStep(
  step: (typeof NURTURE_SEQUENCE)[number],
  now: Date
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { day, emailType, generator } = step;

  // Calculate the date range: users who registered exactly `day` days ago
  // Use a 24-hour window to avoid missing users due to timing
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() - day);
  const windowStart = new Date(targetDate);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(targetDate);
  windowEnd.setHours(23, 59, 59, 999);

  // Find eligible users:
  // 1. Registered within the target day window
  // 2. Haven't received this specific nurture email yet
  // 3. Still on the free tier (no active paid subscription or trial)
  // 4. Haven't unsubscribed from marketing (checked via newsletter subscriber)
  const eligibleUsers = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: windowStart,
        lte: windowEnd,
      },
      // Still on free tier
      subscriptionTier: 'free',
      // No active trial
      trialTier: null,
      // Haven't received this nurture email yet
      nurtureEmails: {
        none: {
          emailType,
        },
      },
      // Check newsletter subscription is not unsubscribed (if exists)
      OR: [
        { newsletterSubscription: null },
        {
          newsletterSubscription: {
            unsubscribedAt: null,
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (eligibleUsers.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  logger.info(`Processing nurture step: ${emailType}`, {
    day,
    eligibleCount: eligibleUsers.length,
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Lazy-import Resend to avoid issues when API key is not configured
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.com>';

  for (const user of eligibleUsers) {
    try {
      const emailContent = generator(user.name || 'Explorer');

      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      // Log the sent email
      await prisma.nurtureEmailLog.create({
        data: {
          userId: user.id,
          emailType,
        },
      });

      sent++;
    } catch (error) {
      failed++;
      const errorMsg = `Failed to send ${emailType} to ${user.email}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      logger.error('Nurture email send failed', {
        emailType,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { sent, failed, errors };
}
