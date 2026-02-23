import { isNativePlatform, isIOS } from '@/lib/capacitor';
import { clientLogger } from '@/lib/client-logger';

/**
 * Initialize native push notifications (APNs on iOS, FCM on Android).
 * No-op on web — web uses its own service worker push flow.
 */
export async function initNativePush(): Promise<string | null> {
  if (!isNativePlatform()) return null;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    clientLogger.warn('Push permission denied');
    return null;
  }

  await PushNotifications.register();

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      clientLogger.info('Push token received');
      sendTokenToServer(token.value).catch((err) => clientLogger.error('Push token server sync failed', { error: err instanceof Error ? err.message : String(err) }));
      resolve(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      clientLogger.error('Push registration error', { error: error instanceof Error ? error.message : String(error) });
      resolve(null);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      clientLogger.info('Push notification received', { title: notification.title });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url;
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    });
  });
}

async function sendTokenToServer(token: string): Promise<void> {
  try {
    await fetch('/api/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: isIOS() ? 'ios' : 'android' }),
    });
  } catch (error) {
    clientLogger.error('Failed to send push token to server', { error: error instanceof Error ? error.message : String(error) });
  }
}
