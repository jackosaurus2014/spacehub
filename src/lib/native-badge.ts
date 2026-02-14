import { isNativePlatform } from '@/lib/capacitor';

/**
 * Set the app icon badge count (iOS home screen badge number).
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { Badge } = await import('@capawesome/capacitor-badge');
    if (count > 0) {
      await Badge.set({ count });
    } else {
      await Badge.clear();
    }
  } catch {
    // Badge plugin not available
  }
}

/**
 * Clear the app icon badge.
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}
