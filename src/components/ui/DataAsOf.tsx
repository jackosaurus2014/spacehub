/**
 * DataAsOf — honest vintage caption for reference/seed data modules.
 *
 * Use on pages that serve curated static datasets (not live-fetched) so
 * readers know what they're looking at without us mislabeling seed data
 * as real-time. Keep `date` to the real vintage of the underlying data
 * where determinable (e.g. "April 2026"); fall back to a quarter/year if
 * that's the best precision available.
 */
interface DataAsOfProps {
  /** Vintage of the underlying data, e.g. "April 2026" or "Q2 2026" */
  date: string;
  /** Optional extra context, e.g. "Sourced from FCC filings" */
  note?: string;
  className?: string;
}

/**
 * Formats a Date/ISO-string into the "Month Day, Year" vintage string
 * DataAsOf expects for its `date` prop. Returns null for a missing/
 * unparseable input so callers can fall back to a static label instead of
 * rendering "Invalid Date".
 */
export function formatAsOfDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Given a list of Date/ISO-string/null refreshedAt values (e.g. one per
 * fetched section), returns the OLDEST one formatted for display — the
 * honest "as of" date for content assembled from multiple sections, since
 * the oldest section is the stalest thing actually on the page. Returns
 * null if none of the inputs parse.
 */
export function oldestAsOfDate(values: Array<Date | string | null | undefined>): string | null {
  let oldest: Date | null = null;
  for (const v of values) {
    if (!v) continue;
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) continue;
    if (!oldest || d < oldest) oldest = d;
  }
  return oldest ? formatAsOfDate(oldest) : null;
}

export default function DataAsOf({ date, note, className }: DataAsOfProps) {
  return (
    <p className={`text-xs text-slate-500 ${className || ''}`}>
      Reference data as of {date} — periodically reviewed{note ? ` · ${note}` : ''}
    </p>
  );
}
