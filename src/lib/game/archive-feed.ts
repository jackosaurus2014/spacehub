// ─── Space Tycoon: "Sol Historical Archive" feed shaping ─────────────────────
// Pure, testable shaping of the site's real /api/news headlines into the
// in-universe ticker copy consumed by HistoricalArchiveTicker.tsx. Kept
// separate from the component so the copy-building logic can be unit tested
// without a DOM/fetch environment.

import { LORE_YEAR_OFFSET } from './lore-year';

/** Minimal shape this module needs from a /api/news article — deliberately
 *  loose (only title/url/publishedAt are required) so it tolerates the full
 *  NewsArticle response shape without importing it. */
export interface RawNewsArticle {
  id?: string;
  title?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  source?: string | null;
}

export interface ArchiveHeadline {
  id: string;
  title: string;
  href: string;
  publishedAt: string | null;
  /** "{N} years ago today: {headline}" — ready to render. */
  archiveLine: string;
}

/** Builds the "{N} years ago today: {headline}" line for a single headline.
 *  N is rounded and floored at 0 so a misconfigured offset never reads as
 *  negative ("-124 years ago"). */
export function buildArchiveLine(headline: string, yearsAgo: number): string {
  const n = Math.max(0, Math.round(yearsAgo));
  return `${n} years ago today: ${headline}`;
}

/** Shapes a raw /api/news articles array into ticker-ready entries. Drops
 *  any entry missing a usable title or link (never renders a blank/dead
 *  ticker item). Pure — no fetch, no DOM. */
export function shapeArchiveHeadlines(
  articles: RawNewsArticle[] | null | undefined,
  opts?: { limit?: number; yearsAgo?: number }
): ArchiveHeadline[] {
  if (!Array.isArray(articles)) return [];
  const limit = opts?.limit ?? 10;
  const yearsAgo = opts?.yearsAgo ?? LORE_YEAR_OFFSET;

  const shaped: ArchiveHeadline[] = [];
  for (const a of articles) {
    const title = typeof a?.title === 'string' ? a.title.trim() : '';
    const href = typeof a?.url === 'string' ? a.url.trim() : '';
    if (!title || !href) continue;
    shaped.push({
      id: a?.id || href,
      title,
      href,
      publishedAt: typeof a?.publishedAt === 'string' ? a.publishedAt : null,
      archiveLine: buildArchiveLine(title, yearsAgo),
    });
    if (shaped.length >= limit) break;
  }
  return shaped;
}
