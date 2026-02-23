/**
 * Client-side structured logger
 * Suppresses verbose logging in production, includes component context.
 * Use this instead of console.log/error/warn in client components.
 */

const isDev = process.env.NODE_ENV === 'development';

export const clientLogger = {
  error(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      console.error(`[Error] ${message}`, context ?? '');
    }
    // In production, errors are silently swallowed on the client.
    // For real error tracking, integrate Sentry/LogRocket here.
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      console.warn(`[Warn] ${message}`, context ?? '');
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
