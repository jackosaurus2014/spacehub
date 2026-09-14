import { deltaLabel, type RankDelta } from '@/lib/rankings';

/**
 * The movement cell. Colour is never the only signal (accessibility) — the
 * arrow glyph and the text label carry the meaning too — and a row with no
 * previous edition renders an em dash with a screen-reader explanation
 * rather than a zero that would read as "held its position".
 */
export default function RankMovement({ delta, className = '' }: { delta: RankDelta; className?: string }) {
  const label = deltaLabel(delta);

  if (delta.delta == null) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-slate-500 ${className}`}>
        <span aria-hidden="true">&mdash;</span>
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  if (delta.delta === 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-slate-400 ${className}`}>
        <span aria-hidden="true">=</span>
        <span className="sr-only">Unchanged from the previous edition</span>
      </span>
    );
  }

  const up = delta.delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${up ? 'text-emerald-300' : 'text-orange-300'} ${className}`}
    >
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      <span aria-hidden="true">{Math.abs(delta.delta)}</span>
      <span className="sr-only">{label} since the previous edition</span>
    </span>
  );
}
