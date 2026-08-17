import Link from 'next/link';
import { matchRegulatoryCategories, RADAR_CATEGORY_LABELS, type RadarCategory } from '@/lib/regulatory-categorizer';
import { getRecentActionsByCategories } from '@/lib/regulatory-radar';

/**
 * Server-rendered "Related regulatory actions" strip for article pages.
 *
 * Given the article's text, matches it against the regulatory-categorizer
 * keyword sets (matchRegulatoryCategories — strict thresholds, so ordinary
 * launch/science articles match nothing) and renders up to 3 recent
 * RegulatoryAction entries in the matched categories.
 *
 * Fail-soft by construction: returns null (renders nothing, zero layout
 * shift) when the text has no regulatory hook, the table is missing, or the
 * query errors. Never throws into the page tree.
 */
export default async function RelatedRegulatoryActions({
  text,
  wrapperClassName,
}: {
  text: string;
  /** Optional outer wrapper (e.g. page container classes) — rendered ONLY when the strip has content, so a null render stays truly zero-footprint. */
  wrapperClassName?: string;
}) {
  try {
    const categories = matchRegulatoryCategories(text);
    if (categories.length === 0) return null;

    const actions = await getRecentActionsByCategories(categories, 3);
    if (actions.length === 0) return null;

    const strip = (
      <aside
        aria-labelledby="related-regulatory-heading"
        className="mt-8 card p-4 border border-white/[0.08]"
      >
        <h2
          id="related-regulatory-heading"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3"
        >
          Related regulatory actions
        </h2>
        <ul className="space-y-2.5">
          {actions.map((action) => (
            <li key={action.id} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap sm:w-36 shrink-0">
                {RADAR_CATEGORY_LABELS[action.category as RadarCategory] || action.category}
                {' · '}
                <time dateTime={action.actionDate.toISOString()}>
                  {action.actionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                </time>
              </span>
              <Link
                href={`/regulatory-radar/action/${action.id}`}
                className="text-sm text-slate-300 hover:text-white transition-colors leading-snug line-clamp-2"
              >
                {action.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/regulatory-radar"
          className="inline-block mt-3 text-xs text-violet-300 hover:text-violet-200 transition-colors"
        >
          Full Regulatory Radar &rarr;
        </Link>
      </aside>
    );

    return wrapperClassName ? <div className={wrapperClassName}>{strip}</div> : strip;
  } catch {
    return null;
  }
}
