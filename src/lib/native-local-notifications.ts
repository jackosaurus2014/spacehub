import { isNativePlatform } from '@/lib/capacitor';

export interface LocalNotificationOptions {
  id: number;
  title: string;
  body: string;
  schedule?: { at: Date };
  extra?: Record<string, string>;
}

/**
 * Schedule a local notification (native only).
 * Useful for launch countdowns, price alert thresholds, etc.
 */
export async function scheduleLocalNotification(
  options: LocalNotificationOptions
): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return false;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: options.id,
          title: options.title,
          body: options.body,
          schedule: options.schedule ? { at: options.schedule.at } : undefined,
          extra: options.extra,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cancel a previously scheduled local notification.
 */
export async function cancelLocalNotification(id: number): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // Notification may not exist
  }
}
