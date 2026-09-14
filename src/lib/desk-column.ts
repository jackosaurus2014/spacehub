/**
 * The SpaceNexus weekly column — the one surface on this site that a machine
 * must not fill (competitor review 2026-09-10, Tier 2 #7).
 *
 * The desk byline (src/lib/ai-insights-desk.ts) covers machine-drafted
 * analysis. A column is the opposite claim: a named person arguing a
 * position they will be held to. So this registry is hand-edited, and the
 * route renders exactly what is in it — including nothing.
 *
 * TO PUBLISH A COLUMN A HUMAN MUST SUPPLY, per entry:
 *   slug         kebab-case, stable forever (it is the URL)
 *   title        the argument, not the topic
 *   dek          one sentence saying what the column claims
 *   author       a real person's name — never "SpaceNexus Desk", never a
 *                team, never a pseudonym
 *   authorRole   that person's actual role
 *   publishedAt  ISO date, a Friday
 *   body         markdown, first person, 600-1200 words
 *
 * Nothing here is generated, and nothing here is fact-check-gated: a column
 * is an opinion signed by its author, and the author owns it. The
 * columnIsHumanWritten() guard below is asserted in tests so a future
 * generator cannot quietly start filling this list.
 */

export interface DeskColumn {
  slug: string;
  title: string;
  dek: string;
  author: string;
  authorRole: string;
  /** ISO 8601 date (YYYY-MM-DD). */
  publishedAt: string;
  /** Markdown body. */
  body: string;
}

/**
 * Published columns, newest first. EMPTY ON PURPOSE — see the header. Adding
 * a row is an editorial commitment, not a code change, so the empty state on
 * /editorial/column names what is missing rather than faking a placeholder.
 */
export const DESK_COLUMNS: readonly DeskColumn[] = [];

/** Reserved bylines that may never appear on a column. */
export const NON_HUMAN_BYLINES: readonly string[] = [
  'SpaceNexus Desk',
  'SpaceNexus AI',
  'SpaceNexus Team',
  'SpaceNexus Intelligence Team',
  'Claude',
];

/** A column is valid only when a real person's name is on it. */
export function columnIsHumanWritten(column: DeskColumn): boolean {
  const author = column.author.trim();
  if (!author) return false;
  return !NON_HUMAN_BYLINES.some((b) => b.toLowerCase() === author.toLowerCase());
}

export function listColumns(): DeskColumn[] {
  return [...DESK_COLUMNS]
    .filter(columnIsHumanWritten)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));
}

export function getColumn(slug: string): DeskColumn | null {
  return listColumns().find((c) => c.slug === slug) ?? null;
}

/** Exactly what a human still has to hand over before this surface has content. */
export const COLUMN_REQUIREMENTS: readonly string[] = [
  'A named author who is a real person and is willing to be quoted and argued with.',
  'A weekly slot they will actually keep — the column is worthless if it appears twice and stops.',
  '600-1200 words of first-person argument per issue, with a headline that states the claim.',
  'A correction commitment: the author answers replies about their own column.',
];
