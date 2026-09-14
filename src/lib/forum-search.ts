/**
 * Forum search.
 *
 * Postgres full-text search would be the right answer at scale, but it needs
 * a tsvector column and a migration, and the forum has a few dozen threads on
 * day one. This is the honest intermediate: case-insensitive matching over
 * titles, bodies and tags via Prisma, ranked in application code, with the
 * shape of the query builder kept separate from the Prisma call so swapping
 * in a tsvector later touches one function.
 *
 * Search is also a spam surface in its own right — an unbounded term list
 * turns into an expensive query — so terms are capped and normalised here
 * rather than trusted from the URL.
 */

export const MAX_SEARCH_TERMS = 6;
export const MIN_TERM_LENGTH = 2;
export const MAX_QUERY_LENGTH = 120;

/**
 * Words too common in a space-industry forum to narrow anything. Dropping
 * them stops "the launch" from scanning every thread on the site.
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for',
  'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that',
  'with', 'as', 'by', 'from', 'about', 'into', 'i', 'we', 'you',
]);

/**
 * Turn a raw query string into the terms actually searched. Strips
 * punctuation that would otherwise reach a LIKE pattern, drops stop words,
 * de-duplicates, and caps the count.
 *
 * Keeps single-character terms out (MIN_TERM_LENGTH) but never returns empty
 * when the user typed something real: if every token was a stop word, the
 * longest original token is used, so searching "the" finds threads about
 * "the" rather than silently returning everything.
 */
export function parseSearchQuery(raw: string): string[] {
  const cleaned = raw.slice(0, MAX_QUERY_LENGTH).toLowerCase();
  const tokens = cleaned
    .split(/[^a-z0-9+\-.]+/i)
    .map((t) => t.replace(/^[.\-+]+|[.\-+]+$/g, ''))
    .filter((t) => t.length >= MIN_TERM_LENGTH);

  const kept: string[] = [];
  for (const t of tokens) {
    if (STOP_WORDS.has(t)) continue;
    if (!kept.includes(t)) kept.push(t);
    if (kept.length >= MAX_SEARCH_TERMS) break;
  }

  if (kept.length === 0 && tokens.length > 0) {
    return [tokens.slice().sort((a, b) => b.length - a.length)[0]];
  }
  return kept;
}

export interface SearchableThread {
  id: string;
  title: string;
  content: string;
  tags: string[];
  postCount: number;
  upvoteCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Score a thread against the terms.
 *
 * Deliberate weighting: a term in the TITLE is worth far more than one buried
 * in the body, because forum titles are written to say what the thread is
 * about. Threads that match every term beat threads that match one. Activity
 * (replies, votes) is a small tie-breaker, never the main signal — otherwise
 * search returns the loudest thread rather than the relevant one. Recency is
 * the last tie-break, applied in the sort rather than the score so an old but
 * exactly-matching thread still wins.
 */
export function scoreThread(t: SearchableThread, terms: string[]): number {
  if (terms.length === 0) return 0;

  const title = t.title.toLowerCase();
  const body = t.content.toLowerCase();
  const tags = t.tags.map((x) => x.toLowerCase());

  let score = 0;
  let matched = 0;

  for (const term of terms) {
    let hit = false;

    if (title.includes(term)) {
      // A whole-word title hit is the strongest signal available.
      score += new RegExp(`\\b${escapeRegExp(term)}\\b`).test(title) ? 12 : 7;
      hit = true;
    }
    if (tags.some((tag) => tag.includes(term))) {
      score += 5;
      hit = true;
    }
    if (body.includes(term)) {
      // Body frequency counts, but with a hard ceiling — otherwise a post
      // that repeats a word 200 times outranks the thread actually about it.
      const occurrences = Math.min(countOccurrences(body, term), 5);
      score += occurrences;
      hit = true;
    }

    if (hit) matched++;
  }

  // Matching every term is worth more than matching one term very well.
  if (matched === terms.length && terms.length > 1) score *= 1.6;
  // A thread matching none of the terms scores nothing, whatever its activity.
  if (matched === 0) return 0;

  score += Math.min(t.postCount, 10) * 0.4;
  score += Math.min(Math.max(t.upvoteCount, 0), 10) * 0.2;

  return score;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface RankedThread<T extends SearchableThread> {
  thread: T;
  score: number;
}

/** Rank and cut. Ties break on most recent activity. */
export function rankThreads<T extends SearchableThread>(
  threads: T[],
  terms: string[],
  limit: number
): RankedThread<T>[] {
  return threads
    .map((thread) => ({ thread, score: scoreThread(thread, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.thread.updatedAt).getTime() - new Date(a.thread.updatedAt).getTime();
    })
    .slice(0, limit);
}

/**
 * A short excerpt around the first match, for the results list. Falls back to
 * the head of the post when the match is only in the title.
 */
export function searchExcerpt(content: string, terms: string[], length = 180): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = plain.toLowerCase();
  let at = -1;
  for (const term of terms) {
    const i = lower.indexOf(term);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }

  if (at === -1 || at < length / 2) {
    return plain.length > length ? `${plain.slice(0, length).trimEnd()}…` : plain;
  }

  const start = Math.max(0, at - Math.floor(length / 3));
  const slice = plain.slice(start, start + length);
  return `…${slice.trimEnd()}${start + length < plain.length ? '…' : ''}`;
}

/**
 * The Prisma `where` for the candidate set. Kept narrow on purpose: this is
 * the cheap pre-filter that pulls rows the scorer then ranks properly. An OR
 * of contains-matches uses the index poorly at millions of rows, which is the
 * point at which this whole module should become a tsvector column.
 */
export function buildSearchWhere(terms: string[], categoryId?: string): Record<string, unknown> {
  const or = terms.flatMap((term) => [
    { title: { contains: term, mode: 'insensitive' } },
    { content: { contains: term, mode: 'insensitive' } },
    { tags: { has: term } },
  ]);

  return {
    ...(categoryId ? { categoryId } : {}),
    ...(or.length > 0 ? { OR: or } : {}),
  };
}
