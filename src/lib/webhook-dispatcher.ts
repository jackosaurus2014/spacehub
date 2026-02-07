import { createHmac } from 'crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/** Maximum consecutive failures before a subscription is automatically deactivated. */
const MAX_FAILURE_COUNT = 10;

/** Timeout for each webhook delivery attempt in milliseconds. */
const DELIVERY_TIMEOUT_MS = 10_000;

/**
 * Build the HMAC-SHA256 signature for a webhook payload.
 */
function signPayload(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Deliver a webhook event to a single subscription.
 * Returns `true` on success, `false` on failure.
 */
async function deliverWebhook(
  subscriptionId: string,
  url: string,
  secret: string,
  eventType: string,
  payload: object
): Promise<boolean> {
  // Include timestamp in the signed payload so recipients can reject replays
  const timestamp = Date.now().toString();
  const body = JSON.stringify({
    event: eventType,
    timestamp,
    data: payload,
  });

  // HMAC-SHA256 lets the recipient verify the payload came from us
  // and wasn't tampered with, using their shared secret
  const signature = signPayload(body, secret);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': eventType,
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      // Success: reset failure count and update last delivery time
      await prisma.webhookSubscription.update({
        where: { id: subscriptionId },
        data: {
          failureCount: 0,
          lastDeliveryAt: new Date(),
        },
      });

      logger.info('Webhook delivered successfully', {
        subscriptionId,
        url,
        eventType,
        status: response.status,
      });

      return true;
    }

    // Non-2xx response: count as failure
    logger.warn('Webhook delivery returned non-2xx status', {
      subscriptionId,
      url,
      eventType,
      status: response.status,
    });

    await handleFailure(subscriptionId, url, eventType);
    return false;
  } catch (error) {
    logger.error('Webhook delivery failed', {
      subscriptionId,
      url,
      eventType,
      error: error instanceof Error ? error.message : String(error),
    });

    await handleFailure(subscriptionId, url, eventType);
    return false;
  }
}

/**
 * Increment the failure count on a subscription.
 * If the count exceeds MAX_FAILURE_COUNT, deactivate the subscription.
 */
async function handleFailure(
  subscriptionId: string,
  url: string,
  eventType: string
): Promise<void> {
  try {
    const updated = await prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: {
        failureCount: { increment: 1 },
      },
    });

    // Auto-deactivate persistently failing subscriptions to stop wasting
    // resources on dead endpoints (subscribers must re-activate manually)
    if (updated.failureCount > MAX_FAILURE_COUNT) {
      await prisma.webhookSubscription.update({
        where: { id: subscriptionId },
        data: { isActive: false },
      });

      logger.warn('Webhook subscription deactivated due to repeated failures', {
        subscriptionId,
        url,
        eventType,
        failureCount: updated.failureCount,
      });
    }
  } catch (dbError) {
    logger.error('Failed to update webhook failure count', {
      subscriptionId,
      error: dbError instanceof Error ? dbError.message : String(dbError),
    });
  }
}

/**
 * Dispatch a webhook event to all active subscriptions that are listening
 * for the given event type.
 *
 * This is intentionally fire-and-forget: it logs errors but does not throw,
 * so calling code is never blocked by webhook delivery.
 *
 * @param eventType - The event identifier, e.g. "launch.upcoming"
 * @param payload   - The event payload object to deliver
 */
export function dispatchWebhook(eventType: string, payload: object): void {
  // Fire-and-forget: void swallows the promise so callers aren't blocked
  // by webhook delivery latency or failures
  void (async () => {
    try {
      const subscriptions = await prisma.webhookSubscription.findMany({
        where: {
          isActive: true,
          events: { has: eventType },
        },
        select: {
          id: true,
          url: true,
          secret: true,
        },
      });

      if (subscriptions.length === 0) {
        logger.debug('No active webhook subscriptions for event', { eventType });
        return;
      }

      logger.info('Dispatching webhook event', {
        eventType,
        subscriberCount: subscriptions.length,
      });

      // Deliver to all subscribers concurrently
      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          deliverWebhook(sub.id, sub.url, sub.secret, eventType, payload)
        )
      );

      const succeeded = results.filter(
        (r) => r.status === 'fulfilled' && r.value === true
      ).length;
      const failed = results.length - succeeded;

      logger.info('Webhook dispatch complete', {
        eventType,
        total: results.length,
        succeeded,
        failed,
      });
    } catch (error) {
      logger.error('Webhook dispatch encountered an unexpected error', {
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}
