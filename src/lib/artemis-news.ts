/**
 * Shared Artemis-program news matching + fetch helper.
 *
 * Backs two consumers that must never drift apart:
 *   1. The live news rail on /artemis (src/app/artemis/page.tsx)
 *   2. The 'artemis-tracker-freshness' sentinel check
 *      (src/lib/content-accuracy.ts)
 *
 * Both need the exact same definition of "this NewsArticle is about the
 * Artemis program" — hence a single exported `matchesArtemisNews` predicate
 * and a single `getArtemisNewsArticles` fetcher that both call into.
 *
 * Filter design
 * -------------
 * A NewsArticle (title + summary) counts as Artemis-program news if it:
 *   - mentions "artemis" (the program name is unambiguous on its own), OR
 *   - mentions "orion" AND a spacecraft/program context term (guards
 *     against false positives like "Orion Nebula" / "Orion's Belt"
 *     astronomy coverage, which never pairs "orion" with these terms), OR
 *   - mentions the "starship hls" (Human Landing System) program, OR
 *   - mentions "blue moon" (Blue Origin's lander) AND a landing-system /
 *     program context term (guards against "blue moon" used in its
 *     unrelated calendar-astronomy sense — a second full moon in one
 *     month — which never pairs with these terms either).
 *
 * The DB query below is a broad, cheap pre-filter (OR of simple `contains`
 * checks) so we don't scan the whole table; `matchesArtemisNews` is then
 * the precise, testable predicate applied in-process to those candidates.
 */

import prisma from '@/lib/db';
import type { NewsArticle } from '@/types';

export interface ArtemisMatchable {
  title: string;
  summary?: string | null;
}

// Matches the shape of the shared NewsArticle type (minus the companyTags
// relation, which this fetcher doesn't join) so results can be passed
// straight into the existing <NewsCard /> component used elsewhere on the
// site — no bespoke card needed for the /artemis live news rail.
export type ArtemisNewsArticle = Omit<NewsArticle, 'companyTags'>;

const ARTEMIS_TERM = /\bartemis\b/i;
const ORION_TERM = /\borion\b/i;
const ORION_CONTEXT_TERMS =
  /\b(sls|nasa|lunar|moon|spacecraft|capsule|crew module|human landing system|hls|crewed|astronaut)\b/i;
const STARSHIP_HLS_TERM = /starship\s+hls|starship\s+human landing system/i;
const BLUE_MOON_TERM = /\bblue moon\b/i;
const BLUE_MOON_CONTEXT_TERMS = /\b(blue origin|lander|hls|nasa|artemis|moon landing)\b/i;

/**
 * Precise predicate: does this article belong on the Artemis program tracker?
 * Exported so the page and the freshness sentinel share one implementation.
 */
export function matchesArtemisNews(article: ArtemisMatchable): boolean {
  const text = `${article.title} ${article.summary ?? ''}`;

  if (ARTEMIS_TERM.test(text)) return true;
  if (ORION_TERM.test(text) && ORION_CONTEXT_TERMS.test(text)) return true;
  if (STARSHIP_HLS_TERM.test(text)) return true;
  if (BLUE_MOON_TERM.test(text) && BLUE_MOON_CONTEXT_TERMS.test(text)) return true;

  return false;
}

const CANDIDATE_TERMS = ['artemis', 'orion', 'starship hls', 'blue moon'];

/**
 * Fetches the newest Artemis-program-matching NewsArticle rows.
 *
 * `candidatePoolSize` controls how many of the most recent broadly-matching
 * rows (cheap DB-side `contains` OR) get pulled before the precise
 * `matchesArtemisNews` predicate is applied in-process — kept generous so a
 * quiet news day for Artemis specifically doesn't get starved out by an
 * unrelated news volume spike.
 */
export async function getArtemisNewsArticles(
  limit = 12,
  candidatePoolSize = 150
): Promise<ArtemisNewsArticle[]> {
  const candidates = await prisma.newsArticle.findMany({
    where: {
      OR: CANDIDATE_TERMS.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' as const } },
        { summary: { contains: term, mode: 'insensitive' as const } },
      ]),
    },
    orderBy: { publishedAt: 'desc' },
    take: candidatePoolSize,
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      url: true,
      source: true,
      category: true,
      imageUrl: true,
      publishedAt: true,
      fetchedAt: true,
    },
  });

  return candidates.filter(matchesArtemisNews).slice(0, limit);
}
