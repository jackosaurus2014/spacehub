/**
 * Structured logging utility for SpaceNexus
 *
 * - In production (NODE_ENV=production): outputs JSON for log aggregation
 * - In development: outputs human-readable colored format
 * - debug() only outputs when NODE_ENV=development
 * - No external dependencies
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
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
