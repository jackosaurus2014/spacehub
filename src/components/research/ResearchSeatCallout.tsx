import Link from 'next/link';
import { getResearchAvailability } from '@/lib/research';

/**
 * The one-block route from a public release page to the thing that is for sale.
 *
 * Individual editions already carry this thought under each gated table (see
 * ReleaseEditionView) and it reads well there. What was missing until
 * 2026-09-16 is the same signpost one level up: /releases and all seven series
 * archives had zero links to /research, so a reader who arrived on the calendar
 * rather than on a specific edition had no way to reach the product.
 *
 * Every number comes from getResearchAvailability(), which is the server's
 * answer and the only legal source of advertised terms. It renders NOTHING
 * unless the tier is genuinely for sale — flag on and a Stripe price configured
 * — so with RESEARCH_TIER_ENABLED off these pages go back to not mentioning it
 * at all, which is exactly what they did before.
 *
 * Server component: it reads the flag directly, so there is no client fetch and
 * no flash of an offer that then disappears.
 */
export default function ResearchSeatCallout({ className }: { className?: string }) {
  const { available, plan } = getResearchAvailability();
  if (!available) return null;

  return (
    <aside
      aria-labelledby="research-seat-callout"
      className={`rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-5 ${className ?? ''}`}
    >
      <h2 id="research-seat-callout" className="text-white font-semibold mb-2">
        The rows behind these releases
      </h2>
      <p className="text-sm text-slate-300 leading-relaxed">
        Everything on this page stays public: the headline figures, the methodology, the coverage
        limits and the top of every table, so a release is citable by people who will never pay us.
        The complete row set behind each edition, with every column, and its CSV and JSON exports are
        part of a <span className="text-white font-medium">{plan.name}</span> seat &mdash; $
        {plan.priceYearly.toLocaleString()} a year for {plan.totalSeats} named seats on one invoice.
        The page and the export are computed from the same rows, so the free summary and the paid
        file can never disagree.
      </p>
      <Link
        href="/research"
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-500 px-5 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        See what a Research seat covers
      </Link>
    </aside>
  );
}
