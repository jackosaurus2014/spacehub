import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { WELCOME_DRIP_SEQUENCE, getNextDripEmail } from '@/lib/newsletter/welcome-drip-templates';

const BATCH_SIZE = 50;

/**
 * POST /api/drip/process
 *
 * Processes the welcome drip sequence for all users.
 * Should be called by a cron job (e.g., daily at 10 AM).
 *
 * For each user, checks how many days since registration,
 * looks up which drip emails have been sent, and sends the next one.
 */
export async function POST(request: Request) {
  try {
    // Simple auth check — require API key or admin
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get users who registered within the last 14 days (drip window)
    const eligibleUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: fourteenDaysAgo },
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        nurtureEmails: {
          select: { emailType: true },
        },
      },
      take: BATCH_SIZE,
    });

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const user of eligibleUsers) {
      const daysSinceRegistration = Math.floor(
        (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const sentTemplateIds = user.nurtureEmails.map((e) => e.emailType);
      const nextEmail = getNextDripEmail(daysSinceRegistration, sentTemplateIds);

      if (!nextEmail) {
        skipped++;
        continue;
      }

      try {
        const { html, plain, subject } = nextEmail.generate();

        // Send via Resend (if configured)
        if (process.env.RESEND_API_KEY) {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'SpaceNexus <noreply@spacenexus.us>',
            to: user.email,
            subject,
            html,
            text: plain,
          });
        } else {
          logger.warn(`Drip: RESEND_API_KEY not configured, skipping ${nextEmail.templateId}`);
        }

        // Record that this email was sent
        await prisma.nurtureEmailLog.create({
          data: {
            userId: user.id,
            emailType: nextEmail.templateId,
          },
        });

        sent++;
        logger.info(`Drip: sent "${nextEmail.templateId}" to user ${user.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`User ${user.id}: ${message}`);
        logger.error(`Drip: failed to send to user ${user.id}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: eligibleUsers.length,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Drip: failed to process sequence', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
