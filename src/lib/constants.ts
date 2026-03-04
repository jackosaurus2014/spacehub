/**
 * Shared application constants.
 * Centralises values that were previously duplicated across many files.
 */

/** Canonical application URL (production fallback). */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';

/** Base URL for server-side cron / internal fetch (supports localhost fallback). */
export const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  `http://localhost:${process.env.PORT || 3000}`;
