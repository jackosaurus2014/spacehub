import { logger } from '@/lib/logger';

interface WebhookPayload {
  title: string;
  description: string;
  url?: string;
  color?: string; // hex color
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
}

/**
 * Send alert to Slack webhook
 */
export async function sendSlackWebhook(webhookUrl: string, payload: WebhookPayload): Promise<boolean> {
  try {
    const slackPayload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `\u{1F680} ${payload.title}`, emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: payload.description },
        },
        ...(payload.fields?.map(f => ({
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*${f.name}*\n${f.value}` },
          ],
        })) || []),
        ...(payload.url ? [{
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'View on SpaceNexus' },
            url: payload.url,
          }],
        }] : []),
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      logger.warn('Slack webhook returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
      });
    }

    return response.ok;
  } catch (error) {
    logger.error('Slack webhook failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send alert to Discord webhook
 */
export async function sendDiscordWebhook(webhookUrl: string, payload: WebhookPayload): Promise<boolean> {
  try {
    const discordPayload = {
      embeds: [{
        title: payload.title,
        description: payload.description,
        color: payload.color ? parseInt(payload.color.replace('#', ''), 16) : 0x06b6d4, // cyan default
        fields: payload.fields?.map(f => ({
          name: f.name,
          value: f.value,
          inline: f.inline ?? true,
        })),
        url: payload.url,
        timestamp: payload.timestamp || new Date().toISOString(),
        footer: { text: 'SpaceNexus Alert System' },
      }],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      logger.warn('Discord webhook returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
      });
    }

    return response.ok;
  } catch (error) {
    logger.error('Discord webhook failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send alert to all configured webhooks for a user.
 * Returns the number of successful deliveries.
 */
export async function sendToUserWebhooks(
  userId: string,
  payload: WebhookPayload,
  prisma: import('@prisma/client').PrismaClient
): Promise<{ sent: number; failed: number }> {
  const stats = { sent: 0, failed: 0 };

  try {
    // Fetch user's configured webhooks from DynamicContent
    const configRecord = await prisma.dynamicContent.findUnique({
      where: { contentKey: `user:${userId}:webhooks` },
    });

    if (!configRecord) {
      return stats;
    }

    let webhooks: WebhookConfig[];
    try {
      webhooks = JSON.parse(configRecord.data);
    } catch {
      logger.warn('Invalid webhook config JSON for user', { userId });
      return stats;
    }

    if (!Array.isArray(webhooks) || webhooks.length === 0) {
      return stats;
    }

    // Filter to only enabled webhooks
    const activeWebhooks = webhooks.filter(w => w.enabled !== false);

    const results = await Promise.allSettled(
      activeWebhooks.map(async (webhook) => {
        let success = false;
        if (webhook.type === 'slack') {
          success = await sendSlackWebhook(webhook.url, payload);
        } else if (webhook.type === 'discord') {
          success = await sendDiscordWebhook(webhook.url, payload);
        } else {
          logger.warn('Unknown webhook type', { type: webhook.type, userId });
          return false;
        }

        // Update lastDelivery status in-place
        webhook.lastDeliveryAt = new Date().toISOString();
        webhook.lastDeliverySuccess = success;

        return success;
      })
    );

    // Count results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        stats.sent++;
      } else {
        stats.failed++;
      }
    }

    // Persist updated lastDelivery info back to DynamicContent
    // Merge with full config (including disabled webhooks)
    const allWebhooks = webhooks.map(w => {
      const updated = activeWebhooks.find(aw => aw.id === w.id);
      return updated || w;
    });

    await prisma.dynamicContent.update({
      where: { contentKey: `user:${userId}:webhooks` },
      data: {
        data: JSON.stringify(allWebhooks),
        refreshedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error sending to user webhooks', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return stats;
}

/** Shape of a stored webhook configuration */
export interface WebhookConfig {
  id: string;
  name: string;
  type: 'slack' | 'discord';
  url: string;
  enabled: boolean;
  createdAt: string;
  lastDeliveryAt?: string;
  lastDeliverySuccess?: boolean;
}
