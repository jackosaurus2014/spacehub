import { isNativePlatform, isIOS } from '@/lib/capacitor';

/**
 * Initialize native push notifications (APNs on iOS, FCM on Android).
 * No-op on web — web uses its own service worker push flow.
 */
export async function initNativePush(): Promise<string | null> {
  if (!isNativePlatform()) return null;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    console.log('[NativePush] Permission denied');
    return null;
  }

  await PushNotifications.register();

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      console.log('[NativePush] Token received');
      sendTokenToServer(token.value).catch(console.error);
      resolve(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NativePush] Registration error:', error);
      resolve(null);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[NativePush] Received:', notification.title);
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
    console.error('[NativePush] Failed to send token to server:', error);
  }
}
