import { isNativePlatform } from '@/lib/capacitor';

export interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Share content using the best available method:
 * 1. Native: Capacitor Share → iOS/Android share sheet
 * 2. Web: navigator.share() → Web Share API
 * 3. Fallback: navigator.clipboard → copy to clipboard
 *
 * Returns true if shared/copied successfully.
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  // Capacitor native share
  if (isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Share via SpaceNexus',
      });
      return true;
    } catch {
      // User cancelled or error — fall through to web
    }
  }

  // Web Share API
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch {
      // User cancelled
    }
  }

  // Clipboard fallback
  if (options.url && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(options.url);
      return true; // Caller should show "Link copied" toast
    } catch {
      return false;
    }
  }

  return false;
}
