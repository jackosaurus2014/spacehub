import Link from 'next/link';

/**
 * The byline for a COMPUTED release edition.
 *
 * WHY THIS EXISTS INSTEAD OF DeskByline
 * -------------------------------------
 * Release editions used to carry the AI-insights desk byline: "By the
 * SpaceNexus Desk - AI-drafted analysis, fact-checked before it publishes".
 * That is true of /ai-insights, where a model drafts the prose. It is false
 * here, and /releases says so in its own words: "No model is called anywhere
 * in this pipeline" - a claim enforced by a test that greps these modules for
 * AI imports (see research-releases.ts, research-report-build.ts).
 *
 * A page that says "no model is involved" above a footer that says
 * "AI-drafted" is a page a buyer stops trusting, and the footer was the half
 * that was wrong. So release editions get their own byline that describes what
 * actually produced them: arithmetic over our own rows, with the method
 * printed beside the figures and the same builder feeding the page and the
 * export.
 *
 * DeskByline is untouched and still correct everywhere a model really does
 * draft the words.
 */

/** Who the release is by. An organisation and a method, never a person. */
export const COMPUTED_BYLINE = 'SpaceNexus Research';

/** The one-line description of how an edition is produced. */
export const COMPUTED_ROLE =
  'Computed from SpaceNexus data - no model is involved in producing a release';

export default function ComputedByline({
  /** Anchor for the edition's own methodology block, when the page has one. */
  methodologyHref = '#methodology',
  className = '',
}: {
  methodologyHref?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-[11px] font-bold tracking-wide text-cyan-300"
      >
        SN
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          By <span className="text-cyan-300">{COMPUTED_BYLINE}</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{COMPUTED_ROLE}</p>
        <p className="text-xs text-slate-400 mt-1">
          Every figure here is arithmetic over our own rows &mdash; counts, sums, deltas and
          rankings &mdash; and the page and its export are built by the same code, so they
          cannot disagree.{' '}
          <Link
            href={methodologyHref}
            className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
          >
            How this edition is computed
          </Link>
        </p>
      </div>
    </div>
  );
}
