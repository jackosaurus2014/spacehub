import { formatAsOfDate, type CompareFigure } from '@/lib/compare-figures';

/**
 * Standard "as of" footnote for /compare pages that pull market cap /
 * valuation / funding figures from CompanyProfile. Drop directly under any
 * table or section that uses DB-driven figures.
 *
 * Uses the oldest `lastVerified` among the supplied figures so the footnote
 * never overstates freshness.
 */
export function CompareFiguresFootnote({ figures }: { figures: (CompareFigure | undefined | null)[] }) {
  const verified = figures.filter((f): f is CompareFigure => !!f && !!f.lastVerified);
  if (verified.length === 0) return null;

  const oldest = verified.reduce((min, f) =>
    f.lastVerified! < min.lastVerified! ? f : min
  );

  return (
    <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
      Figures as of {formatAsOfDate(oldest.lastVerified)} (auto-updated daily from company profiles).
    </p>
  );
}

/**
 * Inline figure span for prose: renders a DB-driven value when available,
 * otherwise falls back to a labeled hardcoded value so pages never regress
 * to an unlabeled stale number when a profile lacks data.
 */
export function CompanyFigure({
  value,
  fallback,
}: {
  value: string | null | undefined;
  fallback: string;
}) {
  if (value) return <>{value}</>;
  return <>{fallback} <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(unverified)</span></>;
}
