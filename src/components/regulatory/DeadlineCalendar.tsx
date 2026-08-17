import { DEADLINE_KIND_LABELS, type DeadlineKind } from '@/lib/regulatory-deadlines';

/**
 * Presentational "Regulatory deadlines — next 90 days" calendar — pure (no
 * hooks, no fetching), same contract as RadarTimeline: renders in the server
 * tree (/regulatory-radar) and the client tree (/compliance Radar tab).
 * Dates arrive as ISO strings, pre-grouped by week.
 *
 * Accessibility: deadline kind is a text label (never color alone); dates
 * use <time>; the calendar is a semantic list of weekly lists.
 */

export interface DeadlineCalendarItem {
  key: string;
  entryId: string;
  date: string; // ISO
  kind: DeadlineKind | string;
  title: string;
  url: string;
  agency?: string | null;
  significant: boolean;
}

export interface DeadlineCalendarWeek {
  weekStart: string; // ISO (Monday UTC)
  items: DeadlineCalendarItem[];
}

const KIND_BADGE_CLASSES: Record<string, string> = {
  'comments-close': 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  'rule-effective': 'text-cyan-300 bg-cyan-500/10 border-cyan-500/25',
};

function fmtDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function fmtWeek(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function kindLabel(kind: string): string {
  return DEADLINE_KIND_LABELS[kind as DeadlineKind] || kind;
}

/**
 * Chronological next-90-days deadline list grouped by week. Renders an
 * honest empty state when nothing is tracked (never fabricated filler).
 */
export default function DeadlineCalendar({ weeks }: { weeks: DeadlineCalendarWeek[] }) {
  return (
    <section aria-labelledby="regulatory-deadlines-heading">
      <h2
        id="regulatory-deadlines-heading"
        className="text-lg font-semibold text-white mb-1"
      >
        Regulatory deadlines — next 90 days
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Comment windows closing and rules taking effect, assembled from tracked government
        documents. Every date links to its source.
      </p>

      {weeks.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-slate-400">
            No tracked deadlines in the next 90 days. The calendar fills automatically as
            Federal Register documents with comment windows or effective dates are tracked.
          </p>
        </div>
      ) : (
        <ol className="space-y-5" aria-label="Regulatory deadlines grouped by week, soonest first">
          {weeks.map((week) => (
            <li key={week.weekStart}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Week of <time dateTime={week.weekStart}>{fmtWeek(week.weekStart)}</time>
              </h3>
              <ul className="space-y-2">
                {week.items.map((item) => (
                  <li key={item.key} className="card p-3 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
                    <time
                      dateTime={item.date}
                      className="text-xs font-semibold text-slate-300 whitespace-nowrap sm:w-24 shrink-0"
                    >
                      {fmtDay(item.date)}
                    </time>
                    <span
                      className={`inline-block self-start text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                        KIND_BADGE_CLASSES[item.kind] || 'text-slate-300 bg-white/[0.06] border-white/[0.1]'
                      }`}
                    >
                      {kindLabel(item.kind)}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-200 hover:text-white transition-colors leading-snug"
                    >
                      {item.title}
                      <span className="sr-only"> — {kindLabel(item.kind)} (opens in new tab)</span>
                    </a>
                    {item.agency && (
                      <span className="text-xs text-slate-500 whitespace-nowrap sm:ml-auto shrink-0">{item.agency}</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
