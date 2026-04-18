/**
 * Lightweight client-side helper for recording usage analytics events.
 * Uses navigator.sendBeacon when available (fire-and-forget, survives page
 * unload) and falls back to fetch with keepalive. Analytics MUST NEVER break
 * the user experience, so every error path is swallowed.
 */
export function trackActivity(
  event: string,
  module?: string,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ event, module, metadata });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(
        '/api/analytics/track',
        new Blob([body], { type: 'application/json' })
      );
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {
        // swallow — analytics must never break UX
      });
    }
  } catch {
    // swallow — analytics must never break UX
  }
}
