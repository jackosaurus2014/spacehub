/**
 * Timezone-safe date formatting utilities.
 *
 * All functions use timeZone: 'UTC' to prevent the browser's local timezone
 * from shifting midnight-UTC dates to the previous day (e.g., Feb 17 00:00 UTC
 * becoming Feb 16 19:00 EST).
 */

/** Format as "February 17, 2026" */
export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Format as "Feb 17, 2026" */
export function formatDateMedium(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Format as "Feb 17" */
export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Format as "Mon, Feb 17" */
export function formatDateWithDay(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Format as "Monday, February 17, 2026" */
export function formatDateFull(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Format as "Feb 2026" (month + year only) */
export function formatDateMonthYear(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Format as "2:30 PM" */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Format as "02:30 PM" (padded hour) */
export function formatTimePadded(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Format as "Feb 17, 2:30 PM" */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Format as "February 17, 2026, 2:30 PM" */
export function formatDateTimeFull(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
