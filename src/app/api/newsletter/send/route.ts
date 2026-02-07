import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendDailyDigest } from '@/lib/newsletter/email-service';
import { getLatestDigest } from '@/lib/newsletter/digest-generator';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Verify CRON_SECRET for protected access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the latest draft digest
    const digest = await getLatestDigest();

    if (!digest) {
      return NextResponse.json(
        { success: false, error: 'No draft digest found to send' },
        { status: 404 }
      );
    }

    // Get all verified subscribers who haven't unsubscribed
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
      return NextResponse.json(
        { success: false, error: 'No verified subscribers to send to' },
        { status: 404 }
      );
    }

    logger.info(`Starting digest send to ${subscribers.length} subscribers`);

    // Update digest status to sending
    await prisma.dailyDigest.update({
      where: { id: digest.id },
      data: {
        status: 'sending',
        sendStartedAt: new Date(),
        recipientCount: subscribers.length,
      },
    });

    // Send the digest
    const result = await sendDailyDigest(
      subscribers,
      digest.htmlContent,
      digest.plainContent,
      digest.subject
    );

    // Update digest with final status
    await prisma.dailyDigest.update({
      where: { id: digest.id },
      data: {
        status: result.success ? 'sent' : 'failed',
        sendCompletedAt: new Date(),
        recipientCount: result.sentCount,
        failureCount: result.failedCount,
        errorLog: result.errors.length > 0 ? result.errors.join('\n') : null,
      },
    });

    logger.info('Digest send complete', { sentCount: result.sentCount, failedCount: result.failedCount });

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Digest sent successfully' : 'Digest send completed with errors',
      digestId: digest.id,
      recipientCount: subscribers.length,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Digest send error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
