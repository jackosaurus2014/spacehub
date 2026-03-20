// ─── Web Push Notification Sender ────────────────────────────────────────────
// Sends push notifications to browser subscriptions using the Web Push Protocol.
// High-priority notifications only: launch scrubs, solar storms, major events.

import webpush from 'web-push';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = 'mailto:support@spacenexus.us';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export type NotificationPriority = 'critical' | 'high' | 'normal';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string; // Deduplication — same tag replaces previous notification
  priority: NotificationPriority;
}

/**
 * Send a push notification to ALL web push subscribers.
 * Use sparingly — only for high-priority events.
 */
export async function sendPushToAll(payload: PushNotificationPayload): Promise<{
  sent: number;
  failed: number;
  cleaned: number;
}> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn('Web push not configured — VAPID keys missing');
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const subscriptions = await prisma.webPushSubscription.findMany();
  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-96x96.png',
    data: {
      url: payload.url || '/',
    },
    tag: payload.tag,
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        notificationPayload,
        { TTL: 3600 } // 1 hour expiry
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired or invalid — clean up
        try {
          await prisma.webPushSubscription.delete({ where: { id: sub.id } });
          cleaned++;
        } catch { /* ignore */ }
      } else {
        failed++;
        logger.error('Push send failed', { endpoint: sub.endpoint.slice(0, 50), error: String(err) });
      }
    }
  }

  logger.info(`Push notification sent: ${sent} ok, ${failed} failed, ${cleaned} cleaned`, {
    title: payload.title,
    priority: payload.priority,
  });

  return { sent, failed, cleaned };
}

/**
 * Send a push notification to a specific user's subscriptions.
 */
export async function sendPushToUser(userId: string, payload: PushNotificationPayload): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-96x96.png',
    data: { url: payload.url || '/' },
    tag: payload.tag,
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notificationPayload,
        { TTL: 3600 }
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        try { await prisma.webPushSubscription.delete({ where: { id: sub.id } }); } catch {}
      }
    }
  }

  return sent;
}
