import type { RadarEntry, RadarEffectiveEntry } from '@/lib/regulatory-radar';

/**
 * Live compliance calendar — "Regulatory deadlines, next 90 days" — assembled
 * entirely from RegulatoryAction data we actually track:
 *
 *  - comment windows closing (RegulatoryAction.commentCloseDate)
 *  - rules taking effect (RegulatoryAction.effectiveDate, FR effective_on)
 *
 * The legacy static file src/lib/regulatory-calendar-data.ts is deliberately
 * NOT ingested here: its entries are self-described as "known and realistic"
 * (i.e. partially invented) deadlines with no verifiable provenance, which
 * fails the honest-data bar for this surface. Every date rendered by this
 * calendar traces to a real government document with a real URL.
 *
 * This module is PURE (type-only imports; no prisma) so the presentational
 * DeadlineCalendar component can import its types/labels from client trees.
 * The DB-touching collector lives in regulatory-radar.ts
 * (collectRegulatoryDeadlines).
 */

export type DeadlineKind = 'comments-close' | 'rule-effective';

export const DEADLINE_KIND_LABELS: Record<DeadlineKind, string> = {
  'comments-close': 'Comments close',
  'rule-effective': 'Rule takes effect',
};

export interface RegulatoryDeadlineItem {
  /** Unique within the calendar: `${entryId}:${kind}`. */
  key: string;
  entryId: string;
  date: Date;
  kind: DeadlineKind;
  title: string;
  /** External source URL (comment portal for comment closings when present). */
  url: string;
  agency: string | null;
  category: string;
  significant: boolean;
}

export interface DeadlineWeekGroup {
  /** Monday (UTC) of the group's week. */
  weekStart: Date;
  items: RegulatoryDeadlineItem[];
}

/** Monday 00:00 UTC of the week containing `date`. */
export function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

/**
 * Pure — merge comment-window and effective-date entries into one
 * chronological deadline list, bounded to [now, now + horizonDays]. An entry
 * carrying both a comment close AND an effective date yields two items (they
 * are different obligations on different dates).
 */
export function assembleRegulatoryDeadlines(
  commentWindows: RadarEntry[],
  effectiveEntries: RadarEffectiveEntry[],
  now = new Date(),
  horizonDays = 90
): RegulatoryDeadlineItem[] {
  const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const items: RegulatoryDeadlineItem[] = [];
  const seen = new Set<string>();

  const push = (item: RegulatoryDeadlineItem) => {
    if (seen.has(item.key)) return;
    if (item.date.getTime() < now.getTime() || item.date.getTime() > horizon.getTime()) return;
    seen.add(item.key);
    items.push(item);
  };

  for (const entry of commentWindows) {
    if (!entry.commentCloseDate) continue;
    push({
      key: `${entry.id}:comments-close`,
      entryId: entry.id,
      date: entry.commentCloseDate,
      kind: 'comments-close',
      title: entry.title,
      url: entry.commentUrl || entry.url,
      agency: entry.agency,
      category: entry.category,
      significant: entry.significant,
    });
  }

  for (const entry of effectiveEntries) {
    push({
      key: `${entry.id}:rule-effective`,
      entryId: entry.id,
      date: entry.effectiveDate,
      kind: 'rule-effective',
      title: entry.title,
      url: entry.url,
      agency: entry.agency,
      category: entry.category,
      significant: entry.significant,
    });
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime() || a.title.localeCompare(b.title));
  return items;
}

/** Pure — group a sorted deadline list by UTC week, preserving order. */
export function groupDeadlinesByWeek(items: RegulatoryDeadlineItem[]): DeadlineWeekGroup[] {
  const groups: DeadlineWeekGroup[] = [];
  let current: DeadlineWeekGroup | null = null;
  for (const item of items) {
    const weekStart = startOfWeekUtc(item.date);
    if (!current || current.weekStart.getTime() !== weekStart.getTime()) {
      current = { weekStart, items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}

/** ISO-string shape consumed by components/regulatory/DeadlineCalendar. */
export interface SerializedDeadlineWeek {
  weekStart: string;
  items: Array<{
    key: string;
    entryId: string;
    date: string;
    kind: DeadlineKind;
    title: string;
    url: string;
    agency: string | null;
    significant: boolean;
  }>;
}

/** Group + serialize for rendering (server pages and the JSON API share this). */
export function serializeDeadlineWeeks(items: RegulatoryDeadlineItem[]): SerializedDeadlineWeek[] {
  return groupDeadlinesByWeek(items).map((week) => ({
    weekStart: week.weekStart.toISOString(),
    items: week.items.map((item) => ({
      key: item.key,
      entryId: item.entryId,
      date: item.date.toISOString(),
      kind: item.kind,
      title: item.title,
      url: item.url,
      agency: item.agency,
      significant: item.significant,
    })),
  }));
}

