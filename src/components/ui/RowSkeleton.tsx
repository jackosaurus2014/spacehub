/**
 * RowSkeleton — placeholder rows that occupy the EXACT final row height, so a
 * table or list never reflows when the data lands (SYNTHESIS.md §2.5).
 *
 * Server-safe. The shimmer is CSS-only and is switched off both by
 * prefers-reduced-motion and by the site's own html.reduce-motion toggle; the
 * rows still hold their space when it is off.
 */

export interface RowSkeletonProps {
  /** How many rows to reserve. */
  rows: number;
  /** Final row height in px (or any CSS length) — must match the real row. */
  height: number | string;
  className?: string;
  /** Accessible description of what is loading. */
  label?: string;
}

export default function RowSkeleton({ rows, height, className = '', label = 'Loading rows' }: RowSkeletonProps) {
  const h = typeof height === 'number' ? `${height}px` : height;
  const count = Math.max(0, Math.floor(rows));

  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{ height: h }}
          className="flex items-center border-b border-[var(--line)] px-4 last:border-b-0"
        >
          <span
            className="block w-full max-w-[62%] rounded-[var(--radius-badge)] bg-[var(--elev)] motion-safe:animate-pulse [html.reduce-motion_&]:animate-none"
            style={{ height: '0.75em' }}
          />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
