import { RADAR_CATEGORY_LABELS, type RadarCategory } from '@/lib/regulatory-categorizer';

/**
 * Presentational Regulatory Radar timeline — pure (no hooks, no fetching),
 * so it renders in both server trees (/regulatory-radar public page) and
 * client trees (/compliance Radar tab). Dates arrive as ISO strings.
 *
 * Accessibility: source/category/status are always conveyed by text labels,
 * never color alone; timeline is a semantic list; links carry meaningful
 * text; dates use <time>.
 */

export interface RadarTimelineEntry {
  id: string;
  source: string;
  category: string;
  title: string;
  summary?: string | null;
  actionDate: string; // ISO
  url: string;
  agency?: string | null;
  documentType?: string | null;
  actionText?: string | null;
  commentUrl?: string | null;
  commentCloseDate?: string | null; // ISO
  significant: boolean;
}

export const SOURCE_LABELS: Record<string, string> = {
  congress: 'Congress',
  'federal-register': 'Federal Register',
  faa: 'FAA',
  fcc: 'FCC',
  itu: 'ITU',
  sec: 'SEC',
};

const SOURCE_BADGE_CLASSES: Record<string, string> = {
  congress: 'text-blue-300 bg-blue-500/10 border-blue-500/25',
  'federal-register': 'text-cyan-300 bg-cyan-500/10 border-cyan-500/25',
  faa: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  fcc: 'text-purple-300 bg-purple-500/10 border-purple-500/25',
  itu: 'text-pink-300 bg-pink-500/10 border-pink-500/25',
  sec: 'text-slate-300 bg-slate-500/10 border-slate-500/25',
};

export function categoryLabel(category: string): string {
  return RADAR_CATEGORY_LABELS[category as RadarCategory] || category;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function daysUntilIso(iso: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span
      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
        SOURCE_BADGE_CLASSES[source] || 'text-slate-300 bg-white/[0.06] border-white/[0.1]'
      }`}
    >
      {SOURCE_LABELS[source] || source}
    </span>
  );
}

/** "Action windows closing soon" callout — the most actionable radar signal. */
export function ClosingSoonCallout({ entries }: { entries: RadarTimelineEntry[] }) {
  const open = entries.filter((e) => e.commentCloseDate);
  if (open.length === 0) return null;

  return (
    <section
      aria-labelledby="radar-closing-soon-heading"
      className="card p-5 mb-6 border border-amber-500/25 bg-amber-500/[0.05]"
    >
      <h3
        id="radar-closing-soon-heading"
        className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-3"
      >
        Action windows closing soon
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Open public comment periods — the most direct way to influence a rule before it is final.
      </p>
      <ul className="space-y-2.5">
        {open.slice(0, 6).map((entry) => {
          const days = daysUntilIso(entry.commentCloseDate as string);
          return (
            <li key={entry.id} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="text-xs font-semibold text-amber-300 whitespace-nowrap sm:w-40 shrink-0">
                Closes {fmtDate(entry.commentCloseDate as string)} ({days} day{days === 1 ? '' : 's'})
              </span>
              <a
                href={entry.commentUrl || entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-200 hover:text-white transition-colors leading-snug"
              >
                {entry.title}
                <span className="sr-only"> — open for public comment (opens in new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Reverse-chron unified timeline list. */
export function RadarTimelineList({ entries, now }: { entries: RadarTimelineEntry[]; now?: Date }) {
  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center">
        <h3 className="text-lg font-semibold text-white/90 mb-2">No regulatory actions yet</h3>
        <p className="text-sm text-slate-400">
          The Regulatory Radar populates automatically as congressional actions and Federal Register
          documents are tracked. Check back soon.
        </p>
      </div>
    );
  }

  const currentNow = now || new Date();

  return (
    <ol className="space-y-3" aria-label="Regulatory action timeline, newest first">
      {entries.map((entry) => {
        const commentOpen =
          entry.commentCloseDate && new Date(entry.commentCloseDate).getTime() > currentNow.getTime();
        return (
          <li
            key={entry.id}
            className={`card p-4 transition-all hover:border-white/15 ${
              entry.significant ? 'border border-amber-500/30 bg-amber-500/[0.03]' : ''
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <SourceBadge source={entry.source} />
              <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08] whitespace-nowrap">
                {categoryLabel(entry.category)}
              </span>
              {entry.significant && (
                <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                  Significant
                </span>
              )}
              <time dateTime={entry.actionDate} className="text-xs text-slate-500 ml-auto whitespace-nowrap">
                {fmtDate(entry.actionDate)}
              </time>
            </div>
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors leading-snug">
                {entry.title}
                <span className="sr-only"> (opens in new tab)</span>
              </h4>
            </a>
            <p className="text-xs text-slate-500 mt-1">
              {[entry.agency, entry.documentType && entry.source !== 'congress' ? entry.documentType : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {entry.source === 'congress' && entry.actionText && (
              <p className="text-xs text-blue-300/90 mt-1.5">Latest action: {entry.actionText}</p>
            )}
            {entry.summary && (
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">{entry.summary}</p>
            )}
            {commentOpen && (
              <p className="text-xs font-semibold text-amber-300 mt-2">
                Open for comment — closes {fmtDate(entry.commentCloseDate as string)} (
                {daysUntilIso(entry.commentCloseDate as string, currentNow)} day
                {daysUntilIso(entry.commentCloseDate as string, currentNow) === 1 ? '' : 's'})
                {entry.commentUrl && (
                  <>
                    {' · '}
                    <a
                      href={entry.commentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-amber-200"
                    >
                      Submit a comment
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  </>
                )}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
