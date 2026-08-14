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

export default function DataAsOf({ date, note, className }: DataAsOfProps) {
  return (
    <p className={`text-xs text-slate-500 ${className || ''}`}>
      Reference data as of {date} — periodically reviewed{note ? ` · ${note}` : ''}
    </p>
  );
}
