// SpaceNexus AM — story pool selection (2026-09-12, competitor review Tier 1
// #3 "a daily email with a voice"). Everything in this file is pure so the
// ranking is tested without a database: the cron hands it the NewsArticle
// rows from the window and gets back the five the model will write about.
//
// Ranking = source quality + recency + category diversity, with hard rules:
//   - max two stories per source;
//   - at least one business/policy story and one launch/mission story when
//     the pool has them (a morning brief that is five Starlink launches is
//     not a brief);
//   - nothing older than the window (24h, 36h on Mondays so the weekend is
//     covered) — enforced again by the gates after drafting.

export interface PoolArticle {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: string;
  publishedAt: Date;
  /** CompanyProfile slugs tagged on the row — candidate /company-profiles links. */
  companySlugs?: string[];
}

export const STORY_COUNT = 5;
export const MAX_PER_SOURCE = 2;

/** NewsArticle.category values that count as business/policy vs launch/mission. */
export const BUSINESS_POLICY_CATEGORIES = new Set(['companies', 'earnings', 'mergers', 'policy', 'defense']);
export const LAUNCH_MISSION_CATEGORIES = new Set(['launches', 'missions']);

/**
 * Editorial weight per source name (news-fetcher RSS_FEEDS names). Tier 1 is
 * original reporting on the industry; tier 2 is agency/press-office and
 * strong secondary coverage; anything unlisted is tier 3 (aggregators,
 * general-interest verticals, blogs). Weights are deliberately coarse — the
 * point is to let SpaceNews beat a SpaceDaily rewrite of the same story, not
 * to rank outlets against each other.
 */
const SOURCE_TIER_1 = new Set([
  'SpaceNews', 'Ars Technica Space', 'NASASpaceFlight', 'Payload Space', 'Spaceflight Now',
  'Breaking Defense', 'Defense News Space', 'Via Satellite', 'Space Intel Report', 'European Spaceflight',
  'SpaceQ', 'The Space Review', 'CSIS Aerospace', 'Aviation Week', 'Reuters',
]);
const SOURCE_TIER_2 = new Set([
  'NASA Breaking News', 'ESA Top News', 'NASA Science', 'NASA Watch', 'U.S. Space Force', 'Space.com',
  'The Verge Space', 'Space Explored', 'ESA Human Spaceflight', 'ESA Science', 'UK Space Agency', 'DefenseScoop',
  'Defense One', 'TechCrunch Space', 'GeekWire Space', 'New Space Economy', 'SatNews', 'SpaceWatch.Global',
  'NASA Artemis Blog', 'NASA Space Station Blog', 'ESA Launchers', 'Universe Today', 'The Planetary Society',
  'Space in Africa', 'AmericaSpace', 'Teslarati SpaceX', 'Moon Monday',
]);

export function sourceWeight(source: string): number {
  if (SOURCE_TIER_1.has(source)) return 3;
  if (SOURCE_TIER_2.has(source)) return 2;
  return 1;
}

/** Monday issues cover the weekend: 36h. Every other weekday: 24h. */
export function storyWindowHours(now: Date): number {
  return now.getUTCDay() === 1 ? 36 : 24;
}

export function isWeekdayUtc(now: Date): boolean {
  const d = now.getUTCDay();
  return d >= 1 && d <= 5;
}

/** YYYY-MM-DD of the issue (UTC send day). */
export function issueDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Feed noise that should never lead a morning brief. */
const LOW_VALUE_TITLE = /\b(image of the day|photo of the day|picture of the day|podcast|livestream|watch live|weekly recap|this week in|newsletter)\b/i;

/**
 * Score a single article. Recency is a linear decay across the window
 * (fresh = 1, window edge = 0); source tier dominates ties between stories
 * of similar age. Titles that look like feed filler are pushed down.
 */
export function scoreArticle(a: PoolArticle, now: Date, windowHours: number): number {
  const ageH = Math.max(0, (now.getTime() - a.publishedAt.getTime()) / 3_600_000);
  const recency = Math.max(0, 1 - ageH / windowHours);
  const base = sourceWeight(a.source) * 2 + recency * 3;
  return LOW_VALUE_TITLE.test(a.title) ? base - 4 : base;
}

/** Normalised title key for near-duplicate detection (same story, two feeds). */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8)
    .sort()
    .join(' ');
}

function overlapRatio(a: string, b: string): number {
  const wa = new Set(a.split(' ').filter(Boolean));
  const wb = new Set(b.split(' ').filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size);
}

export interface RankOptions {
  now: Date;
  windowHours?: number;
  count?: number;
  maxPerSource?: number;
}

/**
 * Pick the stories for an issue. Deterministic given the pool and `now`.
 *
 * 1. Drop anything outside the window or with a non-http(s) URL.
 * 2. Score, sort, and collapse near-duplicate headlines (keep the higher).
 * 3. Greedy fill honouring max-per-source, reserving one slot each for a
 *    business/policy story and a launch/mission story while the pool has
 *    them, then filling the rest by score with a category-diversity bonus.
 */
export function rankStories(pool: PoolArticle[], opts: RankOptions): PoolArticle[] {
  const now = opts.now;
  const windowHours = opts.windowHours ?? storyWindowHours(now);
  const count = opts.count ?? STORY_COUNT;
  const maxPerSource = opts.maxPerSource ?? MAX_PER_SOURCE;
  const cutoff = now.getTime() - windowHours * 3_600_000;

  const eligible = pool.filter(
    (a) => a.publishedAt.getTime() >= cutoff && a.publishedAt.getTime() <= now.getTime() + 60_000 && /^https?:\/\//i.test(a.url),
  );

  const scored = eligible
    .map((a) => ({ a, score: scoreArticle(a, now, windowHours), key: titleKey(a.title) }))
    .sort((x, y) => y.score - x.score || y.a.publishedAt.getTime() - x.a.publishedAt.getTime());

  // Near-duplicate collapse: two feeds carrying the same story keep only the
  // better-scored one.
  const deduped: typeof scored = [];
  for (const s of scored) {
    if (deduped.some((d) => d.key === s.key || overlapRatio(d.key, s.key) >= 0.75)) continue;
    deduped.push(s);
  }

  const picked: PoolArticle[] = [];
  const perSource = new Map<string, number>();
  const perCategory = new Map<string, number>();
  const take = (s: (typeof deduped)[number]) => {
    picked.push(s.a);
    perSource.set(s.a.source, (perSource.get(s.a.source) ?? 0) + 1);
    perCategory.set(s.a.category, (perCategory.get(s.a.category) ?? 0) + 1);
  };
  const allowed = (s: (typeof deduped)[number]) =>
    !picked.includes(s.a) && (perSource.get(s.a.source) ?? 0) < maxPerSource;

  // Reserved slots, best-scored candidate of each group.
  const firstBusiness = deduped.find((s) => BUSINESS_POLICY_CATEGORIES.has(s.a.category) && allowed(s));
  if (firstBusiness) take(firstBusiness);
  const firstLaunch = deduped.find((s) => LAUNCH_MISSION_CATEGORIES.has(s.a.category) && allowed(s));
  if (firstLaunch) take(firstLaunch);

  // Fill the rest: score minus a small penalty for categories already covered.
  while (picked.length < count) {
    let best: (typeof deduped)[number] | null = null;
    let bestAdj = -Infinity;
    for (const s of deduped) {
      if (!allowed(s)) continue;
      const adj = s.score - 0.75 * (perCategory.get(s.a.category) ?? 0);
      if (adj > bestAdj) { best = s; bestAdj = adj; }
    }
    if (!best) break;
    take(best);
  }

  // Lead story first, then by score; the reserved picks may not be the lead.
  const scoreOf = new Map(deduped.map((s) => [s.a.id, s.score]));
  return picked.sort((x, y) => (scoreOf.get(y.id) ?? 0) - (scoreOf.get(x.id) ?? 0));
}
