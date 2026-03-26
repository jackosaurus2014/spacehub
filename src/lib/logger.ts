/**
 * Structured logging utility for SpaceNexus
 *
 * - In production (NODE_ENV=production): outputs JSON for log aggregation
 * - In development: outputs human-readable colored format
 * - debug() only outputs when NODE_ENV=development
 * - No external dependencies
 * - Maintains an in-memory ring buffer of recent errors for the admin dashboard
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

// --------------- Server Error Ring Buffer ---------------
// Stores the last 200 server-side errors/warnings in memory for the admin dashboard.
// This resets on server restart, which is acceptable for a lightweight monitoring solution.

export interface StoredError {
  id: string;
  timestamp: string;
  level: 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  source: 'server' | 'client';
}

const MAX_STORED_ERRORS = 200;
const errorBuffer: StoredError[] = [];
let errorIdCounter = 0;

function storeError(level: 'warn' | 'error', message: string, context?: Record<string, unknown>, source: 'server' | 'client' = 'server') {
  const entry: StoredError = {
    id: `err_${Date.now()}_${++errorIdCounter}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    source,
  };
  errorBuffer.push(entry);
  // Trim to max size
  if (errorBuffer.length > MAX_STORED_ERRORS) {
    errorBuffer.splice(0, errorBuffer.length - MAX_STORED_ERRORS);
  }
}

/**
 * Get recent errors from the in-memory ring buffer.
 * Returns newest first.
 * @param limit Max number of errors to return (default 100)
 * @param levelFilter Optional filter: 'error' | 'warn' | 'all' (default 'all')
 * @param sourceFilter Optional filter: 'server' | 'client' | 'all' (default 'all')
 */
export function getRecentErrors(
  limit = 100,
  levelFilter: 'error' | 'warn' | 'all' = 'all',
  sourceFilter: 'server' | 'client' | 'all' = 'all'
): StoredError[] {
  let filtered = errorBuffer;
  if (levelFilter !== 'all') {
    filtered = filtered.filter(e => e.level === levelFilter);
  }
  if (sourceFilter !== 'all') {
    filtered = filtered.filter(e => e.source === sourceFilter);
  }
  return filtered.slice(-limit).reverse();
}

/**
 * Get error statistics from the ring buffer.
 */
export function getErrorStats() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const recentHour = errorBuffer.filter(e => new Date(e.timestamp).getTime() > oneHourAgo);
  const recentDay = errorBuffer.filter(e => new Date(e.timestamp).getTime() > oneDayAgo);

  // Top error messages (aggregate by first 80 chars of message)
  const messageCounts = new Map<string, number>();
  for (const err of errorBuffer) {
    const key = err.message.slice(0, 80);
    messageCounts.set(key, (messageCounts.get(key) || 0) + 1);
  }
  const topMessages = Array.from(messageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([message, count]) => ({ message, count }));

  // Hourly distribution (last 24 hours)
  const hourlyDistribution: { hour: string; errors: number; warnings: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = new Date(now - i * 60 * 60 * 1000);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    const hourErrors = errorBuffer.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return t >= hourStart.getTime() && t < hourEnd.getTime();
    });
    hourlyDistribution.push({
      hour: hourStart.toISOString(),
      errors: hourErrors.filter(e => e.level === 'error').length,
      warnings: hourErrors.filter(e => e.level === 'warn').length,
    });
  }

  return {
    total: errorBuffer.length,
    errors: errorBuffer.filter(e => e.level === 'error').length,
    warnings: errorBuffer.filter(e => e.level === 'warn').length,
    lastHour: recentHour.length,
    lastDay: recentDay.length,
    clientErrors: errorBuffer.filter(e => e.source === 'client').length,
    serverErrors: errorBuffer.filter(e => e.source === 'server').length,
    topMessages,
    hourlyDistribution,
    oldestEntry: errorBuffer.length > 0 ? errorBuffer[0].timestamp : null,
    newestEntry: errorBuffer.length > 0 ? errorBuffer[errorBuffer.length - 1].timestamp : null,
  };
}

/**
 * Store a client-side error in the ring buffer.
 * Called from the telemetry endpoint.
 */
export function storeClientError(level: 'warn' | 'error', message: string, context?: Record<string, unknown>) {
  storeError(level, message, context, 'client');
}

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// ANSI color codes for terminal output
const colors: Record<LogLevel, string> = {
  debug: '\x1b[36m',  // cyan
  info: '\x1b[32m',   // green
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
};
const reset = '\x1b[0m';
const dim = '\x1b[2m';

function formatForDev(entry: LogEntry): string {
  const color = colors[entry.level];
  const levelTag = `${color}[${entry.level.toUpperCase()}]${reset}`;
  const timestamp = `${dim}${entry.timestamp}${reset}`;
  const contextStr = entry.context
    ? `\n  ${dim}context:${reset} ${JSON.stringify(entry.context, null, 2)}`
    : '';
  return `${timestamp} ${levelTag} ${entry.message}${contextStr}`;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (level === 'debug' && !isDevelopment) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context !== undefined && { context }),
  };

  // Store errors and warnings in the ring buffer for admin dashboard.
  // Detect client-telemetry source to tag correctly.
  if (level === 'error' || level === 'warn') {
    const source: 'client' | 'server' = context?.source === 'client-telemetry' ? 'client' : 'server';
    storeError(level, message, context, source);
  }

  if (isProduction) {
    // JSON output for log aggregation tools
    const output = JSON.stringify(entry);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    // Human-readable colored output for development
    const formatted = formatForDev(entry);
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    log('debug', message, context);
  },

  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context);
  },

  error(message: string, context?: Record<string, unknown>): void {
    log('error', message, context);
  },
};
