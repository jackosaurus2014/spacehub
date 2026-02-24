'use client';

let initialized = false;
const recentErrors = new Set<string>();

function dedupKey(msg: string): string {
  return msg.slice(0, 100);
}

function beacon(level: string, message: string, context?: Record<string, unknown>) {
  const key = dedupKey(message);
  if (recentErrors.has(key)) return;
  recentErrors.add(key);
  // Clear dedup cache every 60s
  setTimeout(() => recentErrors.delete(key), 60_000);

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon('/api/telemetry', JSON.stringify({
        level,
        message,
        context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }));
    } catch { /* fire and forget */ }
  }
}

export function initErrorReporter() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    beacon('error', event.message || 'Unknown error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason instanceof Error
      ? event.reason.message
      : String(event.reason);
    beacon('error', `Unhandled rejection: ${message}`, {
      stack: event.reason instanceof Error ? event.reason.stack?.slice(0, 500) : undefined,
    });
  });
}
