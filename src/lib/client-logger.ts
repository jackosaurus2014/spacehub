/**
 * Client-side structured logger
 * Suppresses verbose logging in production, includes component context.
 * Use this instead of console.log/error/warn in client components.
 *
 * In production, error() and warn() send a beacon to /api/telemetry
 * so they appear in server logs. info() and debug() stay dev-only.
 */

const isDev = process.env.NODE_ENV === 'development';

function sendBeacon(level: string, message: string, context?: Record<string, unknown>) {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  try {
    navigator.sendBeacon(
      '/api/telemetry',
      JSON.stringify({
        level,
        message,
        context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      })
    );
  } catch {
    // fire and forget — beacon failures are not actionable
  }
}

export const clientLogger = {
  error(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      console.error(`[Error] ${message}`, context ?? '');
    } else {
      sendBeacon('error', message, context);
    }
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      console.warn(`[Warn] ${message}`, context ?? '');
    } else {
      sendBeacon('warn', message, context);
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      console.log(`[Info] ${message}`, context ?? '');
    }
  },

  debug(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      console.log(`[Debug] ${message}`, context ?? '');
    }
  },
};
