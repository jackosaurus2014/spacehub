import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  internalError,
  notFoundError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  sendSlackWebhook,
  sendDiscordWebhook,
  type WebhookConfig,
} from '@/lib/alerts/webhook-delivery';

export const dynamic = 'force-dynamic';

/** Maximum webhooks per user */
const MAX_WEBHOOKS = 10;

/** Slack webhook URL pattern */
const SLACK_URL_PATTERN = /^https:\/\/hooks\.slack\.com\/services\//;

/** Discord webhook URL pattern */
const DISCORD_URL_PATTERN = /^https:\/\/discord(app)?\.com\/api\/webhooks\//;

// ============================================================
// GET: List configured webhooks
// ============================================================

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const configRecord = await prisma.dynamicContent.findUnique({
      where: { contentKey: `user:${session.user.id}:webhooks` },
    });

    let webhooks: WebhookConfig[] = [];
    if (configRecord) {
      try {
        webhooks = JSON.parse(configRecord.data);
      } catch {
        webhooks = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: { webhooks },
    });
  } catch (error) {
    logger.error('Error fetching webhooks', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch webhooks');
  }
}

// ============================================================
// POST: Add a new webhook or test an existing one
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Check subscription tier (Pro+ only)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        trialTier: true,
        trialEndDate: true,
      },
    });

    if (!user) {
      return unauthorizedError();
    }

    let effectiveTier = user.subscriptionTier;
    if (user.trialTier && user.trialEndDate && new Date() < user.trialEndDate) {
      effectiveTier = user.trialTier;
    }

    if (effectiveTier === 'free') {
      return forbiddenError(
        'Webhook integrations require a Pro or Enterprise subscription.'
      );
    }

    const body = await req.json();
    const { action } = body;

    // ---- Test existing webhook ----
    if (action === 'test') {
      const { webhookId } = body;
      if (!webhookId || typeof webhookId !== 'string') {
        return validationError('webhookId is required for test action');
      }

      const configRecord = await prisma.dynamicContent.findUnique({
        where: { contentKey: `user:${session.user.id}:webhooks` },
      });

      if (!configRecord) {
        return notFoundError('Webhook configuration');
      }

      let webhooks: WebhookConfig[];
      try {
        webhooks = JSON.parse(configRecord.data);
      } catch {
        return notFoundError('Webhook configuration');
      }

      const webhook = webhooks.find(w => w.id === webhookId);
      if (!webhook) {
        return notFoundError('Webhook');
      }

      const testPayload = {
        title: 'SpaceNexus Test Alert',
        description: 'This is a test message from your SpaceNexus alert webhook integration. If you see this, your webhook is working correctly!',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us'}/alerts`,
        color: '#06b6d4',
        fields: [
          { name: 'Status', value: 'Connected', inline: true },
          { name: 'Type', value: webhook.type === 'slack' ? 'Slack' : 'Discord', inline: true },
        ],
        timestamp: new Date().toISOString(),
      };

      let success = false;
      if (webhook.type === 'slack') {
        success = await sendSlackWebhook(webhook.url, testPayload);
      } else if (webhook.type === 'discord') {
        success = await sendDiscordWebhook(webhook.url, testPayload);
      }

      // Update lastDelivery info
      webhook.lastDeliveryAt = new Date().toISOString();
      webhook.lastDeliverySuccess = success;

      await prisma.dynamicContent.update({
        where: { contentKey: `user:${session.user.id}:webhooks` },
        data: {
          data: JSON.stringify(webhooks),
          refreshedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: { tested: true, delivered: success, webhook },
      });
    }

    // ---- Add new webhook ----
    const { type, url, name } = body;

    // Validate type
    if (!type || !['slack', 'discord'].includes(type)) {
      return validationError('type must be "slack" or "discord"');
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return validationError('name is required');
    }
    if (name.trim().length > 100) {
      return validationError('name must be 100 characters or fewer');
    }

    // Validate URL
    if (!url || typeof url !== 'string') {
      return validationError('url is required');
    }

    if (type === 'slack' && !SLACK_URL_PATTERN.test(url)) {
      return validationError(
        'Invalid Slack webhook URL. It should start with https://hooks.slack.com/services/'
      );
    }

    if (type === 'discord' && !DISCORD_URL_PATTERN.test(url)) {
      return validationError(
        'Invalid Discord webhook URL. It should start with https://discord.com/api/webhooks/'
      );
    }

    // Load existing webhooks
    const configRecord = await prisma.dynamicContent.findUnique({
      where: { contentKey: `user:${session.user.id}:webhooks` },
    });

    let webhooks: WebhookConfig[] = [];
    if (configRecord) {
      try {
        webhooks = JSON.parse(configRecord.data);
      } catch {
        webhooks = [];
      }
    }

    // Check limit
    if (webhooks.length >= MAX_WEBHOOKS) {
      return forbiddenError(
        `You can have at most ${MAX_WEBHOOKS} webhook integrations.`
      );
    }

    // Check for duplicate URL
    if (webhooks.some(w => w.url === url)) {
      return validationError('A webhook with this URL already exists');
    }

    // Create new webhook config
    const newWebhook: WebhookConfig = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      url,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    webhooks.push(newWebhook);

    // Upsert into DynamicContent
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    if (configRecord) {
      await prisma.dynamicContent.update({
        where: { contentKey: `user:${session.user.id}:webhooks` },
        data: {
          data: JSON.stringify(webhooks),
          refreshedAt: now,
          expiresAt: oneYearFromNow,
        },
      });
    } else {
      await prisma.dynamicContent.create({
        data: {
          contentKey: `user:${session.user.id}:webhooks`,
          module: 'alerts',
          section: 'webhooks',
          data: JSON.stringify(webhooks),
          sourceType: 'manual',
          lastVerified: now,
          refreshedAt: now,
          expiresAt: oneYearFromNow,
          isActive: true,
        },
      });
    }

    logger.info('Webhook integration added', {
      userId: session.user.id,
      webhookId: newWebhook.id,
      type: newWebhook.type,
    });

    return NextResponse.json(
      { success: true, data: { webhook: newWebhook } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error managing webhooks', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to manage webhooks');
  }
}

// ============================================================
// DELETE: Remove a webhook
// ============================================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return validationError('Webhook id is required');
    }

    const configRecord = await prisma.dynamicContent.findUnique({
      where: { contentKey: `user:${session.user.id}:webhooks` },
    });

    if (!configRecord) {
      return notFoundError('Webhook configuration');
    }

    let webhooks: WebhookConfig[];
    try {
      webhooks = JSON.parse(configRecord.data);
    } catch {
      return notFoundError('Webhook configuration');
    }

    const index = webhooks.findIndex(w => w.id === webhookId);
    if (index === -1) {
      return notFoundError('Webhook');
    }

    const removed = webhooks.splice(index, 1)[0];

    await prisma.dynamicContent.update({
      where: { contentKey: `user:${session.user.id}:webhooks` },
      data: {
        data: JSON.stringify(webhooks),
        refreshedAt: new Date(),
      },
    });

    logger.info('Webhook integration removed', {
      userId: session.user.id,
      webhookId: removed.id,
      type: removed.type,
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    logger.error('Error deleting webhook', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete webhook');
  }
}
