export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';
import { sendDailyDigest } from '@/lib/newsletter/email-service';
import { generateForumDigestEmail } from '@/lib/newsletter/forum-digest';

/**
 * POST /api/newsletter/forum-digest
 *
 * Generate and send the weekly forum digest to all verified newsletter subscribers.
 * Auth: CRON_SECRET header required.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    // 1. Generate the forum digest email
    const { html, plain, subject } = await generateForumDigestEmail();

    // 2. Get verified, active newsletter subscribers
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: {
        verified: true,
        unsubscribedAt: null,
      },
      select: {
        email: true,
        unsubscribeToken: true,
      },
    });

    if (subscribers.length === 0) {
      logger.info('Forum digest: no subscribers to send to');
      return NextResponse.json({
        success: true,
        message: 'No subscribers to send to',
        subscriberCount: 0,
      });
    }

    // 3. Send via the batch email service
    const sendResult = await sendDailyDigest(subscribers, html, plain, subject);

    logger.info('Forum digest sent', {
      sentTo: sendResult.sentCount,
      failed: sendResult.failedCount,
      subject,
    });

    return NextResponse.json({
      success: sendResult.success,
      subject,
      sentTo: sendResult.sentCount,
      failed: sendResult.failedCount,
      errors: sendResult.errors.length > 0 ? sendResult.errors : undefined,
    });
  } catch (error) {
    logger.error('Forum digest send failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to send forum digest');
  }
}
