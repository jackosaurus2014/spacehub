/**
 * Shared Starship-program news matching + fetch helper.
 *
 * Backs two consumers that must never drift apart:
 *   1. The live news rail on /starship (src/app/starship/page.tsx)
 *   2. The 'starship-tracker-freshness' sentinel check
 *      (src/lib/content-accuracy.ts)
 *
 * Both need the exact same definition of "this NewsArticle is about the
 * SpaceX Starship program" — hence a single exported `matchesStarshipNews`
 * predicate and a single `getStarshipNewsArticles` fetcher that both call
 * into. Modeled directly on src/lib/artemis-news.ts.
 *
 * Filter design
 * -------------
 * A NewsArticle (title + summary) counts as Starship-program news if it:
 *   - mentions "starship" AND a SpaceX-program context term (guards against
 *     false positives from the generic English word "starship" — sci-fi
 *     coverage of Star Trek, Starship Troopers, video games, etc. — which
 *     never pairs "starship" with these terms), OR
 *   - mentions "super heavy" (the booster stage) AND a rocket/SpaceX
 *     context term (guards against unrelated "super heavy" usage — e.g.
 *     oversized trucking loads — which never pairs with these terms), OR
 *   - mentions the exact phrase "raptor engine" (SpaceX's Starship engine;
 *     unambiguous on its own — bare "raptor" is excluded since it collides
 *     with the Ford Raptor, F-22 Raptor, Toronto Raptors, etc.), OR
 *   - mentions "starbase" (SpaceX's Texas launch site) AND a
 *     location/program context term (guards against "Starbase" used in its
 *     Star Trek sense).
 *
 * The DB query below is a broad, cheap pre-filter (OR of simple `contains`
 * checks) so we don't scan the whole table; `matchesStarshipNews` is then
 * the precise, testable predicate applied in-process to those candidates.
 */

import prisma from '@/lib/db';
import type { NewsArticle } from '@/types';

export interface StarshipMatchable {
  title: string;
  summary?: string | null;
}

// Matches the shape of the shared NewsArticle type (minus the companyTags
// relation, which this fetcher doesn't join) so results can be passed
// straight into the existing <NewsCard /> component used elsewhere on the
// site — no bespoke card needed for the /starship live news rail.
export type StarshipNewsArticle = Omit<NewsArticle, 'companyTags'>;

const STARSHIP_TERM = /\bstarship\b/i;
const SPACEX_CONTEXT_TERMS =
  /\b(spacex|super heavy|starbase|boca chica|elon musk|raptor|hls|human landing system|flight test|static fire|booster catch|chopstick|orbital flight|starlink|propellant transfer|artemis)\b/i;
const SUPER_HEAVY_TERM = /\bsuper heavy\b/i;
const SUPER_HEAVY_CONTEXT_TERMS = /\b(spacex|starship|booster|raptor|starbase|launch|rocket)\b/i;
const RAPTOR_ENGINE_TERM = /\braptor engine\b/i;
const STARBASE_TERM = /\bstarbase\b/i;
const STARBASE_CONTEXT_TERMS = /\b(spacex|texas|starship|rocket|launch|boca chica)\b/i;

/**
 * Precise predicate: does this article belong on the Starship program tracker?
 * Exported so the page and the freshness sentinel share one implementation.
 */
export function matchesStarshipNews(article: StarshipMatchable): boolean {
  const text = `${article.title} ${article.summary ?? ''}`;

  if (STARSHIP_TERM.test(text) && SPACEX_CONTEXT_TERMS.test(text)) return true;
  if (SUPER_HEAVY_TERM.test(text) && SUPER_HEAVY_CONTEXT_TERMS.test(text)) return true;
  if (RAPTOR_ENGINE_TERM.test(text)) return true;
  if (STARBASE_TERM.test(text) && STARBASE_CONTEXT_TERMS.test(text)) return true;

  return false;
}

const CANDIDATE_TERMS = ['starship', 'super heavy', 'raptor engine', 'starbase'];

/**
 * Fetches the newest Starship-program-matching NewsArticle rows.
 *
 * `candidatePoolSize` controls how many of the most recent broadly-matching
 * rows (cheap DB-side `contains` OR) get pulled before the precise
 * `matchesStarshipNews` predicate is applied in-process — kept generous so a
 * quiet news day for Starship specifically doesn't get starved out by an
 * unrelated news volume spike.
 */
export async function getStarshipNewsArticles(
  limit = 12,
  candidatePoolSize = 150
): Promise<StarshipNewsArticle[]> {
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

  return candidates.filter(matchesStarshipNews).slice(0, limit);
}
