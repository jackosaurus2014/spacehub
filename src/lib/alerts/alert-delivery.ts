import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { dispatchWebhook } from '@/lib/webhook-dispatcher';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

/** Maximum push notifications per user per day */
const DAILY_PUSH_LIMIT = 5;

// ============================================================
// Push Notification Rate Limiting
// ============================================================

/**
 * Check if a user can receive another push notification today.
 */
export async function canSendPush(
  userId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const pushCount = await prisma.alertDelivery.count({
    where: {
      userId,
      channel: 'push',
      status: { in: ['sent', 'delivered'] },
      sentAt: { gte: startOfDay },
    },
  });

  return pushCount < DAILY_PUSH_LIMIT;
}

// ============================================================
// Deliver Pending Alerts
// ============================================================

/**
 * Deliver all pending alert deliveries through their configured channels.
 */
export async function deliverAlerts(prisma: PrismaClient): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const stats = { processed: 0, succeeded: 0, failed: 0 };

  try {
    // Get all pending deliveries, grouped by channel
    const pendingDeliveries = await prisma.alertDelivery.findMany({
      where: { status: 'pending' },
      include: {
        alertRule: {
          select: {
            emailFrequency: true,
            priority: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200, // Process in batches to avoid overwhelming resources
    });

    if (pendingDeliveries.length === 0) {
      logger.debug('No pending alert deliveries to process');
      return stats;
    }

    logger.info('Processing pending alert deliveries', {
      count: pendingDeliveries.length,
    });

    for (const delivery of pendingDeliveries) {
      stats.processed++;

      try {
        switch (delivery.channel) {
          case 'in_app': {
            // In-app notifications are already stored in DB;
            // mark as "delivered" so the client can fetch them
            await prisma.alertDelivery.update({
              where: { id: delivery.id },
              data: {
                status: 'delivered',
                sentAt: new Date(),
              },
            });
            stats.succeeded++;
            break;
          }

          case 'email': {
            // Check if this should be immediate or digest
            const dataFreq = (delivery.data as any)?.emailFrequency;
            const frequency = delivery.alertRule?.emailFrequency || dataFreq || 'immediate';

            if (frequency === 'immediate') {
              // Send email via Resend
              const sent = await sendAlertEmail(
                delivery.userId,
                delivery.title,
                delivery.message,
                delivery.data as Record<string, unknown> | null,
                prisma
              );

              await prisma.alertDelivery.update({
                where: { id: delivery.id },
                data: {
                  status: sent ? 'sent' : 'failed',
                  sentAt: sent ? new Date() : undefined,
                  failReason: sent ? undefined : 'Email delivery failed',
                },
              });

              if (sent) stats.succeeded++;
              else stats.failed++;
            } else {
              // Keep as pending for digest processing
              // The digest functions will handle these
              stats.processed--; // Don't count as processed yet
            }
            break;
          }

          case 'push': {
            // Check daily push limit
            const canPush = await canSendPush(delivery.userId, prisma);

            if (!canPush) {
              await prisma.alertDelivery.update({
                where: { id: delivery.id },
                data: {
                  status: 'failed',
                  failReason: 'Daily push notification limit reached',
                },
              });
              stats.failed++;
              break;
            }

            // Web push is a placeholder - mark as sent for now
            // In production, integrate with web-push library
            await prisma.alertDelivery.update({
              where: { id: delivery.id },
              data: {
                status: 'sent',
                sentAt: new Date(),
              },
            });
            stats.succeeded++;
            break;
          }

          case 'webhook': {
            // Use existing webhook dispatcher pattern
            const webhookData = {
              alertId: delivery.id,
              ruleId: delivery.alertRuleId,
              title: delivery.title,
              message: delivery.message,
              priority: delivery.alertRule?.priority || 'normal',
              data: delivery.data,
              timestamp: new Date().toISOString(),
            };

            dispatchWebhook('alert.triggered', webhookData);

            await prisma.alertDelivery.update({
              where: { id: delivery.id },
              data: {
                status: 'sent',
                sentAt: new Date(),
              },
            });
            stats.succeeded++;
            break;
          }

          default: {
            logger.warn('Unknown delivery channel', {
              deliveryId: delivery.id,
              channel: delivery.channel,
            });
            await prisma.alertDelivery.update({
              where: { id: delivery.id },
              data: {
                status: 'failed',
                failReason: `Unknown channel: ${delivery.channel}`,
              },
            });
            stats.failed++;
          }
        }
      } catch (deliveryError) {
        logger.error('Error delivering alert', {
          deliveryId: delivery.id,
          channel: delivery.channel,
          error: deliveryError instanceof Error ? deliveryError.message : String(deliveryError),
        });

        await prisma.alertDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'failed',
            failReason: deliveryError instanceof Error ? deliveryError.message : 'Delivery error',
          },
        });
        stats.failed++;
      }
    }

    logger.info('Alert delivery processing complete', stats);
  } catch (error) {
    logger.error('Error in deliverAlerts', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return stats;
}

// ============================================================
// Send Alert Email (via Resend)
// ============================================================

async function sendAlertEmail(
  userId: string,
  title: string,
  message: string,
  data: Record<string, unknown> | null,
  prisma: PrismaClient
): Promise<boolean> {
  try {
    // Look up user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      logger.warn('User not found for alert email', { userId });
      return false;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      logger.warn('RESEND_API_KEY not configured, skipping email delivery');
      return false;
    }

    const { generateAlertEmail } = await import('@/lib/alerts/alert-templates');
    const { html, text } = generateAlertEmail(title, message, data, user.name || undefined);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'SpaceNexus Alerts <alerts@spacenexus.us>',
        to: user.email,
        subject: title,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Resend API error for alert email', {
        status: response.status,
        body: errorBody,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error sending alert email', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ============================================================
// Daily Digest
// ============================================================

/**
 * Send daily digest emails to users who have configured daily_digest frequency.
 */
export async function sendDailyDigest(prisma: PrismaClient): Promise<{
  usersProcessed: number;
  emailsSent: number;
  errors: number;
}> {
  const stats = { usersProcessed: 0, emailsSent: 0, errors: 0 };

  try {
    // Find users with pending daily digest email deliveries
    // Include both alert-rule-based digests AND watchlist-sourced digests
    const pendingDigestDeliveries = await prisma.alertDelivery.findMany({
      where: {
        channel: 'email',
        status: 'pending',
        OR: [
          { alertRule: { emailFrequency: 'daily_digest' } },
          { source: 'watchlist' },
        ],
      },
      include: {
        alertRule: {
          select: { emailFrequency: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (pendingDigestDeliveries.length === 0) {
      logger.debug('No pending daily digest deliveries');
      return stats;
    }

    // Group by userId
    const byUser = new Map<string, typeof pendingDigestDeliveries>();
    for (const delivery of pendingDigestDeliveries) {
      const existing = byUser.get(delivery.userId) || [];
      existing.push(delivery);
      byUser.set(delivery.userId, existing);
    }

    const userIds = Array.from(byUser.keys());
    for (const userId of userIds) {
      const deliveries = byUser.get(userId)!;
      stats.usersProcessed++;

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (!user) {
          logger.warn('User not found for digest', { userId });
          continue;
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          logger.warn('RESEND_API_KEY not configured, skipping digest');
          continue;
        }

        const { generateDigestEmail } = await import('@/lib/alerts/alert-templates');
        const alertSummaries = deliveries.map((d: { title: string; message: string; createdAt: Date }) => ({
          title: d.title,
          message: d.message,
          createdAt: d.createdAt,
        }));

        const { html, text } = generateDigestEmail(alertSummaries, user.name || undefined);

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'SpaceNexus Alerts <alerts@spacenexus.us>',
            to: user.email,
            subject: `SpaceNexus Alert Digest - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
            html,
            text,
          }),
        });

        if (response.ok) {
          // Mark all deliveries as sent
          await prisma.alertDelivery.updateMany({
            where: {
              id: { in: deliveries.map((d: { id: string }) => d.id) },
            },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          });
          stats.emailsSent++;
        } else {
          const errorBody = await response.text();
          logger.error('Failed to send daily digest', { userId, status: response.status, body: errorBody });
          stats.errors++;
        }
      } catch (error) {
        logger.error('Error processing digest for user', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        stats.errors++;
      }
    }

    logger.info('Daily digest processing complete', stats);
  } catch (error) {
    logger.error('Error in sendDailyDigest', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return stats;
}

// ============================================================
// Weekly Digest
// ============================================================

/**
 * Send weekly digest emails to users who have configured weekly_digest frequency.
 */
export async function sendWeeklyDigest(prisma: PrismaClient): Promise<{
  usersProcessed: number;
  emailsSent: number;
  errors: number;
}> {
  const stats = { usersProcessed: 0, emailsSent: 0, errors: 0 };

  try {
    const pendingWeeklyDeliveries = await prisma.alertDelivery.findMany({
      where: {
        channel: 'email',
        status: 'pending',
        alertRule: {
          emailFrequency: 'weekly_digest',
        },
      },
      include: {
        alertRule: {
          select: { emailFrequency: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (pendingWeeklyDeliveries.length === 0) {
      logger.debug('No pending weekly digest deliveries');
      return stats;
    }

    // Group by userId
    const byUser = new Map<string, typeof pendingWeeklyDeliveries>();
    for (const delivery of pendingWeeklyDeliveries) {
      const existing = byUser.get(delivery.userId) || [];
      existing.push(delivery);
      byUser.set(delivery.userId, existing);
    }

    const userIds = Array.from(byUser.keys());
    for (const userId of userIds) {
      const deliveries = byUser.get(userId)!;
      stats.usersProcessed++;

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (!user) {
          logger.warn('User not found for weekly digest', { userId });
          continue;
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          logger.warn('RESEND_API_KEY not configured, skipping weekly digest');
          continue;
        }

        const { generateDigestEmail } = await import('@/lib/alerts/alert-templates');
        const alertSummaries = deliveries.map((d: { title: string; message: string; createdAt: Date }) => ({
          title: d.title,
          message: d.message,
          createdAt: d.createdAt,
        }));

        const { html, text } = generateDigestEmail(alertSummaries, user.name || undefined, 'weekly');

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'SpaceNexus Alerts <alerts@spacenexus.us>',
            to: user.email,
            subject: `SpaceNexus Weekly Alert Digest - Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
            html,
            text,
          }),
        });

        if (response.ok) {
          await prisma.alertDelivery.updateMany({
            where: {
              id: { in: deliveries.map((d: { id: string }) => d.id) },
            },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          });
          stats.emailsSent++;
        } else {
          const errorBody = await response.text();
          logger.error('Failed to send weekly digest', { userId, status: response.status, body: errorBody });
          stats.errors++;
        }
      } catch (error) {
        logger.error('Error processing weekly digest for user', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        stats.errors++;
      }
    }

    logger.info('Weekly digest processing complete', stats);
  } catch (error) {
    logger.error('Error in sendWeeklyDigest', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return stats;
}
