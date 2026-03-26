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
        context: {
          ...context,
          // Include browser/environment info for debugging
          viewportWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
          viewportHeight: typeof window !== 'undefined' ? window.innerHeight : undefined,
          language: typeof navigator !== 'undefined' ? navigator.language : undefined,
          online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
        },
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
      // Include stack trace from the error object if available
      stack: event.error instanceof Error ? event.error.stack?.slice(0, 500) : undefined,
      type: 'window.onerror',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason instanceof Error
      ? event.reason.message
      : String(event.reason);
    beacon('error', `Unhandled rejection: ${message}`, {
      stack: event.reason instanceof Error ? event.reason.stack?.slice(0, 500) : undefined,
      type: 'unhandledrejection',
    });
  });
}

/**
 * Manually report an error from a React error boundary or catch block.
 * Provides richer context than the automatic window error listener.
 *
 * @param error The error object
 * @param componentName Optional component/module name for context
 * @param extra Optional extra context
 */
export function reportError(
  error: Error,
  componentName?: string,
  extra?: Record<string, unknown>
) {
  beacon('error', error.message, {
    stack: error.stack?.slice(0, 500),
    componentName,
    type: 'manual-report',
    ...extra,
  });
}
