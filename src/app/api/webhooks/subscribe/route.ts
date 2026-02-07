import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/db';
import {
  validationError,
  internalError,
  notFoundError,
} from '@/lib/errors';
import {
  webhookSubscribeSchema,
  webhookUnsubscribeSchema,
  validateBody,
} from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/subscribe
 * Create a new webhook subscription.
 * Returns the subscription ID and HMAC secret (shown only once).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateBody(webhookSubscribeSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { url, events } = validation.data;

    // Generate a random HMAC secret for signing payloads
    const secret = randomUUID();

    const subscription = await prisma.webhookSubscription.create({
      data: {
        url,
        events,
        secret,
        isActive: true,
        failureCount: 0,
      },
    });

    logger.info('Webhook subscription created', {
      id: subscription.id,
      url: subscription.url,
      events: subscription.events,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: subscription.id,
          url: subscription.url,
          events: subscription.events,
          secret, // Only returned once at creation time
          isActive: subscription.isActive,
          createdAt: subscription.createdAt,
          message: 'Webhook subscription created. Save the secret -- it will not be shown again.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating webhook subscription', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create webhook subscription. Please try again later.');
  }
}

/**
 * GET /api/webhooks/subscribe
 * List all active webhook subscriptions (secrets are excluded).
 */
export async function GET() {
  try {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { isActive: true },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastDeliveryAt: true,
        failureCount: true,
        // secret is intentionally excluded
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        total: subscriptions.length,
      },
    });
  } catch (error) {
    logger.error('Error listing webhook subscriptions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list webhook subscriptions.');
  }
}

/**
 * DELETE /api/webhooks/subscribe
 * Soft-delete a webhook subscription by marking it as inactive.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateBody(webhookUnsubscribeSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { id } = validation.data;

    // Check if the subscription exists and is active
    const existing = await prisma.webhookSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      return notFoundError('Webhook subscription');
    }

    if (!existing.isActive) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Webhook subscription is already inactive.',
          id: existing.id,
        },
      });
    }

    // Soft delete: mark as inactive
    await prisma.webhookSubscription.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Webhook subscription deactivated', {
      id,
      url: existing.url,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Webhook subscription has been deactivated.',
        id,
      },
    });
  } catch (error) {
    logger.error('Error deleting webhook subscription', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete webhook subscription. Please try again later.');
  }
}
