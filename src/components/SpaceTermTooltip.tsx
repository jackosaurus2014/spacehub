'use client';

interface SpaceTermTooltipProps {
  /** The space industry term to display */
  term: string;
  /** Brief plain-text definition shown on hover */
  definition: string;
}

/**
 * Wraps a space-industry term with a dotted underline and shows a
 * definition tooltip on hover. Designed for inline use inside paragraphs
 * and descriptions.
 *
 * @example
 * <SpaceTermTooltip term="LEO" definition="Low Earth Orbit, typically 200-2000km altitude" />
 */
export default function SpaceTermTooltip({ term, definition }: SpaceTermTooltipProps) {
  return (
    <span className="relative inline-flex group/term cursor-help">
      <span className="border-b border-dotted border-white/40 text-white/90">
        {term}
      </span>
      <span
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-2 text-xs leading-relaxed text-white bg-slate-800 border border-white/10 rounded-lg shadow-xl max-w-[260px] w-max pointer-events-none opacity-0 scale-95 group-hover/term:opacity-100 group-hover/term:scale-100 transition-all duration-150 ease-out"
      >
        <span className="font-semibold text-white">{term}</span>
        <span className="text-white/60"> &mdash; </span>
        <span className="text-white/70">{definition}</span>
      </span>
    </span>
  );
}
