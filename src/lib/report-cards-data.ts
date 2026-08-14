/**
 * Shared "as of" quarter stamp for the Report Cards module
 * (src/app/report-cards/page.tsx).
 *
 * Extracted into its own server-safe lib file (report-cards/page.tsx is a
 * 'use client' component) so the content-accuracy sentinel
 * (src/lib/content-accuracy.ts) can verify freshness without importing a
 * client component into an API route.
 *
 * Update this whenever REPORT_CARDS in report-cards/page.tsx is refreshed
 * for a new quarter.
 */
export const REPORT_CARDS_QUARTER_ASSESSED = 'Q2 2026';
