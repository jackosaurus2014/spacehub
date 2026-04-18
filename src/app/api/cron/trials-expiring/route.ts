import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { TRIAL_DRIP_SEQUENCE } from '@/lib/newsletter/trial-drip-templates';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/trials-expiring
 *
 * Daily cron that sends trial drip emails based on remaining trial time:
 *  - Mid-trial email (stage 2): trial ends in 24–48 hours, stage currently 1
 *  - Final-day email (stage 3): trial ends within the next 24 hours, stage 1 or 2
 *
 * Auth: expects `Authorization: Bearer ${CRON_SECRET}` header (matches
 * existing cron routes like /api/drip/process and the cron-scheduler).
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: Bearer token check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      logger.warn('trials-expiring cron: RESEND_API_KEY not configured, aborting');
      return NextResponse.json({
        midTrialEmailsSent: 0,
        finalDayEmailsSent: 0,
        errors: ['RESEND_API_KEY not configured'],
      });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const fromAddress =
      process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <noreply@spacenexus.us>';

    const midTemplate = TRIAL_DRIP_SEQUENCE.find((e) => e.templateId === 'trial-engagement');
    const finalTemplate = TRIAL_DRIP_SEQUENCE.find((e) => e.templateId === 'trial-week-one');

    let midTrialEmailsSent = 0;
    let finalDayEmailsSent = 0;
    const errors: string[] = [];

    // Shared "not yet on a paid plan" filter — subscriptionTier defaults to
    // 'free' and is non-nullable, so only 'free' users qualify
    const notPaidFilter = {
      subscriptionTier: 'free',
    };

    // ------------------------------------------------------------------
    // Mid-trial: trial ends between 24h and 48h from now, stage === 1
    // ------------------------------------------------------------------
    if (midTemplate) {
      const midUsers = await prisma.user.findMany({
        where: {
          trialTier: { not: null },
          trialEndDate: { gte: in24h, lte: in48h },
          trialEmailsSent: 1,
          ...notPaidFilter,
        },
        select: { id: true, email: true, name: true },
      });

      for (const user of midUsers) {
        try {
          const { html, plain, subject } = midTemplate.generate({
            userName: user.name || user.email.split('@')[0],
          });
          await resend.emails.send({
            from: fromAddress,
            to: user.email,
            subject,
            html,
            text: plain,
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { trialEmailsSent: 2 },
          });
          midTrialEmailsSent++;
          logger.info('Trial drip: sent mid-trial email', { userId: user.id });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`mid user ${user.id}: ${msg}`);
          logger.error('Trial drip: mid-trial send failed', { userId: user.id, error: msg });
        }
      }
    }

    // ------------------------------------------------------------------
    // Final-day: trial ends within the next 24 hours, stage is 1 or 2
    // (also catches users still on stage 1 if mid was missed)
    // ------------------------------------------------------------------
    if (finalTemplate) {
      const finalUsers = await prisma.user.findMany({
        where: {
          trialTier: { not: null },
          trialEndDate: { gte: now, lte: in24h },
          trialEmailsSent: { in: [1, 2] },
          ...notPaidFilter,
        },
        select: { id: true, email: true, name: true },
      });

      for (const user of finalUsers) {
        try {
          const { html, plain, subject } = finalTemplate.generate({
            userName: user.name || user.email.split('@')[0],
          });
          await resend.emails.send({
            from: fromAddress,
            to: user.email,
            subject,
            html,
            text: plain,
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { trialEmailsSent: 3 },
          });
          finalDayEmailsSent++;
          logger.info('Trial drip: sent final-day email', { userId: user.id });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`final user ${user.id}: ${msg}`);
          logger.error('Trial drip: final-day send failed', { userId: user.id, error: msg });
        }
      }
    }

    logger.info('trials-expiring cron completed', {
      midTrialEmailsSent,
      finalDayEmailsSent,
      errorCount: errors.length,
    });

    return NextResponse.json({
      midTrialEmailsSent,
      finalDayEmailsSent,
      errors,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('trials-expiring cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
