import prisma from './db';
import RSSParser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import { createCircuitBreaker } from './circuit-breaker';
import { logger } from './logger';

const snapiBreaker = createCircuitBreaker('snapi', {
  failureThreshold: 3,
  resetTimeout: 120_000, // 2 minutes
});

const rssBreaker = createCircuitBreaker('rss-news', {
  failureThreshold: 5,
  resetTimeout: 60_000, // 1 minute
});

interface SpaceflightNewsArticle {
  id: number;
  title: string;
  url: string;
  image_url: string;
  news_site: string;
  summary: string;
  published_at: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  launches: ['launch', 'liftoff', 'rocket', 'falcon', 'starship', 'atlas', 'delta', 'ariane', 'soyuz', 'vulcan', 'new glenn', 'electron', 'terran', 'h3 rocket', 'long march'],
  missions: ['mission', 'mars', 'moon', 'lunar', 'asteroid', 'probe', 'rover', 'artemis', 'apollo', 'voyager', 'gateway', 'orion', 'deep space', 'interplanetary', 'exploration'],
  companies: ['spacex', 'blue origin', 'boeing', 'lockheed', 'northrop', 'rocket lab', 'virgin', 'relativity', 'astra', 'firefly', 'axiom', 'sierra space', 'vast', 'varda'],
  satellites: ['satellite', 'starlink', 'kuiper', 'constellation', 'oneweb', 'telesat', 'ses ', 'intelsat', 'viasat', 'eutelsat', 'geo orbit', 'leo constellation', 'comms satellite', 'earth observation', 'remote sensing', 'sar satellite'],
  defense: ['space force', 'space command', 'dod ', 'department of defense', 'military space', 'national security', 'missile defense', 'space domain', 'counterspace', 'nssl', 'space development agency', 'sda ', 'spy satellite', 'reconnaissance', 'norad'],
  earnings: ['earnings', 'revenue', 'profit', 'financial', 'stock', 'investor', 'quarterly', 'ipo ', 'spac ', 'valuation', 'funding round', 'series a', 'series b', 'series c', 'series d', 'venture capital'],
  mergers: ['acquisition', 'acquire', 'merger', 'merge', 'deal ', 'buyout', 'takeover', 'joint venture', 'partnership', 'consolidat'],
  development: ['develop', 'test', 'prototype', 'engine', 'technology', 'innovation', 'research', 'manufacturing', 'in-space', '3d print', 'propulsion', 'solar electric', 'ion thruster'],
  policy: ['faa', 'congress', 'regulation', 'law', 'policy', 'government', 'budget', 'administration', 'fcc ', 'itu ', 'spectrum', 'license', 'authorization', 'space act', 'outer space treaty', 'liability', 'compliance'],
  debris: ['debris', 'collision', 'deorbit', 'space junk', 'conjunction', 'space sustainability', 'space traffic', 'kessler', 'remediation', 'active debris removal'],
};

export function categorizeArticle(title: string, summary: string): string {
  // First-match wins: CATEGORY_KEYWORDS is ordered by specificity,
  // so "launches" is checked before the broader "missions" category
  const text = `${title} ${summary}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return 'missions'; // default fallback for uncategorizable articles
}

// --- Relevance guard ---
//
// Some RSS feeds are not space-dedicated: they're general-interest outlets
// with a space vertical (CNN, Wired), general business/tech coverage
// (TechCrunch, GeekWire), general defense coverage (Defense One,
// DefenseScoop, Federal News Network), or wire syndication that mixes in
// unrelated stories (SpaceDaily, ScienceAlert). Without a gate, an
// off-topic story (e.g. an HSBC banking/cartel piece from SpaceDaily) can
// slip in — and worse, get mis-categorized as "Earnings" because generic
// financial vocabulary ("profit", "financial", "investor") is also part
// of the earnings category's keyword list.
//
// GENERIC_KEYWORD_DENYLIST removes exactly those generic business/policy
// terms from the relevance signal (they're fine for *categorizing* an
// already-confirmed space article, but too weak on their own to prove an
// article is about space at all).
const GENERIC_KEYWORD_DENYLIST = new Set([
  // earnings — generic financial vocabulary
  'earnings', 'revenue', 'profit', 'financial', 'stock', 'investor', 'quarterly',
  'ipo ', 'spac ', 'valuation', 'funding round', 'series a', 'series b', 'series c',
  'series d', 'venture capital',
  // mergers — generic corporate-deal vocabulary
  'acquisition', 'acquire', 'merger', 'merge', 'deal ', 'buyout', 'takeover',
  'joint venture', 'partnership', 'consolidat',
  // development — generic R&D vocabulary
  'develop', 'test', 'prototype', 'technology', 'innovation', 'research', 'manufacturing',
  // policy — generic government/regulatory vocabulary
  'faa', 'congress', 'regulation', 'law', 'policy', 'government', 'budget', 'administration',
  'fcc ', 'itu ', 'spectrum', 'license', 'authorization', 'liability', 'compliance',
  // defense — generic military vocabulary
  'dod ', 'department of defense', 'national security', 'missile defense',
]);

// A handful of category keywords double as ordinary English words or
// unrelated proper nouns (a Delta Air Lines earnings story, a "gateway
// drug" health piece, a USDA policy story matching "sda ", a Senate
// "probe" story, Apollo Global Management, a Land Rover review...). Fine
// for categorizeArticle (low-stakes, just a mislabeled category) but too
// loose for a gate that decides whether to store the article at all.
const AMBIGUOUS_TERM_DENYLIST = new Set([
  'vast', 'virgin', 'gateway', 'probe', 'rover', 'engine', 'delta', 'atlas',
  'ses ', 'sda ', 'reconnaissance', 'apollo',
  // 'mars' and 'moon' are genuine space signals but disastrous as
  // SUBSTRINGS — they match "marsh", "Marshall", "honeymoon". Both are
  // re-added below in SPACE_RELEVANCE_WORD_TERMS, which matches on word
  // boundaries. (categorizeArticle still uses them as substrings; a
  // mislabeled category is low-stakes, a wrongly-stored article is not.)
  'mars', 'moon',
]);

const SPACE_RELEVANCE_KEYWORDS: string[] = Array.from(new Set([
  ...Object.values(CATEGORY_KEYWORDS)
    .flat()
    .filter(keyword => !GENERIC_KEYWORD_DENYLIST.has(keyword) && !AMBIGUOUS_TERM_DENYLIST.has(keyword)),
  // Core space vocabulary not already covered by the category keyword lists
  'space', 'orbit', 'orbital', 'spacecraft', 'astronaut', 'cosmonaut',
  'nasa', 'esa', 'jaxa', 'isro', 'cnsa', 'cosmos', 'interstellar',
  'exoplanet', 'spaceport', 'space station', 'microgravity', 'zero gravity',
  'space agency', 'space industry',
  // "iss" alone is too short/ambiguous (matches "dismissed", "issue", etc.);
  // require the fuller phrase instead.
  'international space station',
  // Astronomy/astrophysics vocabulary — SpaceDaily/ScienceAlert publish
  // legitimate space-science stories (galaxy surveys, dark matter, stellar
  // physics) that contain none of the industry vocabulary above. Without
  // these, the guard flags real space content (verified against a dry-run
  // that wrongly caught "Flat dark matter sheet solves galaxy motion").
  // Stems chosen to avoid common-noun collisions ("star" and "planet"
  // alone are too generic; "solar" alone matches terrestrial solar-energy).
  'galaxy', 'galaxies', 'galactic', 'dark matter', 'dark energy',
  'black hole', 'supernova', 'nebula', 'telescope', 'observatory',
  'astronom', 'astrophys', 'cosmolog', 'cosmic', 'meteor', 'comet',
  'quasar', 'pulsar', 'gravitational wave', 'neutron star', 'white dwarf',
  'red giant', 'star system', 'stellar', 'planetary', 'solar system',
  'solar flare', 'solar wind', 'solar storm', 'heliosphere', 'aurora',
]));

// --- Feed boilerplate ---
//
// WHY THIS EXISTS (2026-08-20): most WordPress-backed feeds append a
// self-referential trailer to every item's content snippet:
//
//   "The post <full title> appeared first on Space Daily."
//
// The outlet name inside that trailer contains the substring "space", which
// matched the SPACE_RELEVANCE_KEYWORDS entry 'space' on EVERY SpaceDaily
// item. The relevance guard was therefore a no-op for the single feed that
// most needs it, and SpaceDaily's general-interest science filler — the
// chemistry of mown grass, raven cognition, Marcus Aurelius quotes, octopus
// behaviour, Sardinian centenarians — reached the top of the live news feed.
//
// Stripping the trailer before scoring restores the guard without touching
// the keyword list, so legitimate astronomy, planetary science, launch,
// policy and industry stories are unaffected.
const FEED_BOILERPLATE_PATTERNS: RegExp[] = [
  // "The post <title> appeared first on <Outlet>."  (WordPress default)
  /\bthe post\b[\s\S]*?\bappeared first on\b[^.]*\.?/gi,
  // Bare "appeared first on <Outlet>." / "originally appeared on <Outlet>."
  /\b(?:originally\s+)?appeared\s+(?:first\s+)?on\b[^.]*\.?/gi,
  // "This article was originally published on <Outlet>."
  /\bthis (?:article|post|story|piece)\b[^.]*\b(?:published|appeared)\b[^.]*\.?/gi,
  // Common feed footers
  /\bread more at\b[^.]*\.?/gi,
  /\bcontinue reading\b[^.]*\.?/gi,
];

/**
 * Remove syndication trailers that name the publishing outlet. Exported for
 * tests and for the off-topic purge script.
 */
export function stripFeedBoilerplate(text: string): string {
  if (!text) return '';
  let out = text;
  for (const pattern of FEED_BOILERPLATE_PATTERNS) {
    out = out.replace(pattern, ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Remove a feed's own name from the text being scored. An outlet called
 * "SpaceDaily", "CNN Space" or "ScienceAlert Space" must not vouch for its
 * own articles' topicality just by being mentioned in them.
 */
function stripSourceSelfReference(text: string, sourceName: string): string {
  if (!sourceName) return text;
  const spaced = sourceName.replace(/([a-z])([A-Z])/g, '$1 $2');
  const variants = new Set<string>([
    sourceName,
    spaced,
    sourceName.replace(/\s+/g, ''),
    `${sourceName.replace(/\s+/g, '').toLowerCase()}.com`,
  ]);
  let out = text;
  for (const variant of Array.from(variants)) {
    if (variant.length < 4) continue;
    out = out.replace(new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  return out;
}

// Solar-system and astronomy proper nouns that are valuable relevance
// signals but UNSAFE as substrings ('titan' inside "titanium", 'sun' inside
// "Sunday", 'io' inside "region"). Matched on word boundaries instead.
// Without these, closing the boilerplate hole over-blocked real planetary
// science from SpaceDaily — Titan's methane cycle, habitable altitudes over
// Venus, Uranus/Neptune atmospheric temperatures.
const SPACE_RELEVANCE_WORD_TERMS: string[] = [
  'mars', 'martian', 'moon', 'moons', 'lunar', 'venus', 'venusian',
  'jupiter', 'jovian', 'saturn', 'saturnian', 'titan', 'europa',
  'enceladus', 'ganymede', 'callisto', 'triton', 'uranus', 'neptune',
  'pluto', 'ceres', 'milky way', 'eclipse', 'sunspot', 'universe',
  'light-year', 'light years', 'big bang', 'star formation', 'spacewalk',
  'launch pad', 'launch site', 'payload fairing',
];

const SPACE_RELEVANCE_WORD_PATTERN = new RegExp(
  `\\b(?:${SPACE_RELEVANCE_WORD_TERMS.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

/**
 * Conservative relevance check: does the title+summary contain at least
 * one keyword that signals the article is genuinely about space? Used to
 * gate feeds that aren't space-dedicated (see RELEVANCE_GUARD_FEEDS).
 *
 * `sourceName` is optional for backwards compatibility; pass it whenever it
 * is known so the feed's own branding can't satisfy the guard.
 */
export function isSpaceRelevant(title: string, summary: string, sourceName?: string): boolean {
  let text = `${title} ${stripFeedBoilerplate(summary)}`;
  if (sourceName) text = stripSourceSelfReference(text, sourceName);
  const lowered = text.toLowerCase();
  if (SPACE_RELEVANCE_KEYWORDS.some(keyword => lowered.includes(keyword))) return true;
  return SPACE_RELEVANCE_WORD_PATTERN.test(lowered);
}

// Feeds that require at least one space-relevance keyword match before an
// article is stored. Space-dedicated feeds (NASA, ESA, SpaceNews,
// NASASpaceflight, Payload, etc.) bypass this guard entirely — everything
// they publish is presumed on-topic.
export const RELEVANCE_GUARD_FEEDS = new Set([
  'SpaceDaily',
  'ScienceAlert Space',
  'CNN Space',
  'Wired Science',
  'TechCrunch Space',
  'GeekWire Space',
  'Federal News Network Defense',
  'Defense One',
  'DefenseScoop',
]);

// --- Deduplication helpers ---

/**
 * Normalize a title for deduplication comparison:
 * lowercase, strip punctuation/extra whitespace, take first 50 chars.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // remove punctuation
    .replace(/\s+/g, ' ')     // collapse whitespace
    .trim()
    .slice(0, 50);            // compare first 50 chars
}

/**
 * In-memory deduplication cache that loads existing articles once per fetch batch.
 * Avoids repeated DB queries for every individual article check.
 */
class DeduplicationCache {
  private urlSet: Set<string> = new Set();
  private normalizedTitleSet: Set<string> = new Set();
  private normalizedTitleList: string[] = [];
  private loaded = false;

  /**
   * Load existing articles from the last 7 days into memory.
   * Call once before processing a batch of articles.
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existing = await prisma.newsArticle.findMany({
      where: { publishedAt: { gte: sevenDaysAgo } },
      select: { title: true, url: true },
    });

    for (const article of existing) {
      this.urlSet.add(article.url);
      const normalized = normalizeTitle(article.title);
      if (normalized) {
        this.normalizedTitleSet.add(normalized);
        this.normalizedTitleList.push(normalized);
      }
    }

    this.loaded = true;
    logger.info(`[Dedup] Loaded ${existing.length} existing articles into cache`);
  }

  /**
   * Check if an article is a duplicate by exact URL or similar title.
   *
   * Title comparison: normalized titles are compared for exact match
   * or containment (one title containing the other), which catches
   * the same story published under slightly different headlines.
   *
   * Returns { isDuplicate: boolean, reason?: string }
   */
  isDuplicate(title: string, url: string): { isDuplicate: boolean; reason?: string } {
    // 1. Exact URL match
    if (this.urlSet.has(url)) {
      return { isDuplicate: true, reason: 'exact-url' };
    }

    // 2. Normalized title match
    const normalizedTarget = normalizeTitle(title);
    if (!normalizedTarget) {
      return { isDuplicate: false };
    }

    // Exact normalized title match
    if (this.normalizedTitleSet.has(normalizedTarget)) {
      return { isDuplicate: true, reason: 'exact-title' };
    }

    // Containment check: one title contains the other
    for (const existing of this.normalizedTitleList) {
      if (
        (normalizedTarget.length >= 20 && existing.includes(normalizedTarget)) ||
        (existing.length >= 20 && normalizedTarget.includes(existing))
      ) {
        return { isDuplicate: true, reason: 'title-containment' };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Register a newly inserted article so subsequent checks in the same
   * batch will detect it as existing.
   */
  trackInserted(title: string, url: string): void {
    this.urlSet.add(url);
    const normalized = normalizeTitle(title);
    if (normalized) {
      this.normalizedTitleSet.add(normalized);
      this.normalizedTitleList.push(normalized);
    }
  }
}

// Module-level cache instance, reset per fetch cycle
let dedupCache: DeduplicationCache | null = null;

async function getDeduplicationCache(): Promise<DeduplicationCache> {
  if (!dedupCache) {
    dedupCache = new DeduplicationCache();
    await dedupCache.load();
  }
  return dedupCache;
}

function resetDeduplicationCache(): void {
  dedupCache = null;
}

// --- SNAPI (Spaceflight News API) fetching ---

async function fetchSNAPIEndpoint(endpoint: string, limit: number): Promise<number> {
  return snapiBreaker.execute(async () => {
    const cache = await getDeduplicationCache();

    const response = await fetch(
      `https://api.spaceflightnewsapi.net/v4/${endpoint}/?limit=${limit}&ordering=-published_at`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
    }

    const data = await response.json();
    const articles: SpaceflightNewsArticle[] = data.results;

    let savedCount = 0;
    let skippedCount = 0;

    for (const article of articles) {
      const category = categorizeArticle(article.title, article.summary || '');

      try {
        const { isDuplicate, reason } = cache.isDuplicate(article.title, article.url);

        if (isDuplicate) {
          // If the URL already exists, let the upsert update it.
          // If only the title matched, it's the same story from a different
          // source — skip the insert entirely.
          if (reason !== 'exact-url') {
            logger.debug('[SNAPI] Skipping duplicate article', {
              title: article.title,
              url: article.url,
              source: article.news_site,
              reason,
            });
            skippedCount++;
            continue;
          }
        }

        await prisma.newsArticle.upsert({
          where: { url: article.url },
          update: {
            title: article.title,
            summary: article.summary || null,
            source: article.news_site,
            category,
            imageUrl: article.image_url || null,
            publishedAt: new Date(article.published_at),
            fetchedAt: new Date(),
          },
          create: {
            title: article.title,
            summary: article.summary || null,
            url: article.url,
            source: article.news_site,
            category,
            imageUrl: article.image_url || null,
            publishedAt: new Date(article.published_at),
          },
        });
        cache.trackInserted(article.title, article.url);
        savedCount++;
      } catch {
        continue;
      }
    }

    if (skippedCount > 0) {
      logger.info(`[SNAPI] ${endpoint}: skipped ${skippedCount} duplicate articles`);
    }

    return savedCount;
  }, 0); // fallback: 0 saved articles
}

export async function fetchSpaceflightNews(): Promise<number> {
  try {
    // Reset the deduplication cache at the start of each fetch cycle
    // so it loads fresh data from the DB
    resetDeduplicationCache();

    // Fetch articles, blogs, and reports from SNAPI in parallel
    const [articlesCount, blogsCount, reportsCount] = await Promise.all([
      fetchSNAPIEndpoint('articles', 100),
      fetchSNAPIEndpoint('blogs', 40),
      fetchSNAPIEndpoint('reports', 20),
    ]);

    const totalSNAPI = articlesCount + blogsCount + reportsCount;
    logger.info(`[SNAPI] Fetched ${articlesCount} articles, ${blogsCount} blogs, ${reportsCount} reports`);

    // Fetch RSS feeds
    let rssCount = 0;
    try {
      rssCount = await fetchRSSFeeds();
      logger.info(`[RSS] Fetched ${rssCount} articles from RSS feeds`);
    } catch (rssError) {
      logger.error('[RSS] Error fetching RSS feeds', { error: rssError instanceof Error ? rssError.message : String(rssError) });
    }

    // Bounded og:image enrichment for recent imageless articles (capped at
    // 30 page fetches per cron run — see enrichRecentArticlesWithOgImages).
    try {
      await enrichRecentArticlesWithOgImages();
    } catch (enrichError) {
      logger.warn('[OG-Enrich] Enrichment step failed', { error: enrichError instanceof Error ? enrichError.message : String(enrichError) });
    }

    // Clean up the cache after the fetch cycle completes
    resetDeduplicationCache();

    return totalSNAPI + rssCount;
  } catch (error) {
    logger.error('Error fetching spaceflight news', { error: error instanceof Error ? error.message : String(error) });
    resetDeduplicationCache();
    throw error;
  }
}

// --- RSS Feed fetching ---

interface RSSFeedSource {
  name: string;
  url: string;
  defaultCategory?: string;
}

const RSS_FEEDS: RSSFeedSource[] = [
  // Satellite industry (not in SNAPI)
  { name: 'SatNews', url: 'https://news.satnews.com/feed/', defaultCategory: 'satellites' },
  { name: 'Via Satellite', url: 'https://feeds.feedburner.com/ViaSatellite', defaultCategory: 'satellites' },
  { name: 'SpaceWatch.Global', url: 'https://spacewatch.global/feed/', defaultCategory: 'companies' },

  // Defense & national security space (not in SNAPI)
  { name: 'Breaking Defense', url: 'https://breakingdefense.com/category/space/feed/', defaultCategory: 'defense' },
  { name: 'Defense News Space', url: 'https://www.defensenews.com/arc/outboundfeeds/rss/category/space/?outputType=xml', defaultCategory: 'defense' },
  { name: 'U.S. Space Force', url: 'https://www.spaceforce.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1060&max=20', defaultCategory: 'defense' },

  // Space business (not in SNAPI)
  { name: 'Payload Space', url: 'https://payloadspace.com/feed/', defaultCategory: 'companies' },
  { name: 'Orbital Today', url: 'https://orbitaltoday.com/feed/', defaultCategory: 'missions' },

  // Government/institutional
  { name: 'NASA Breaking News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', defaultCategory: 'missions' },
  { name: 'ESA Top News', url: 'https://www.esa.int/rssfeed/TopNews', defaultCategory: 'missions' },
  // JAXA removed — global.jaxa.jp RSS feed discontinued (404)
  { name: 'NASA JPL', url: 'https://www.jpl.nasa.gov/feeds/news', defaultCategory: 'missions' },

  // Additional general space (not in SNAPI)
  { name: 'NASA Watch', url: 'https://nasawatch.com/feed/', defaultCategory: 'policy' },
  { name: 'SpaceQ', url: 'https://spaceq.ca/feed/', defaultCategory: 'companies' },
  { name: 'Universe Today', url: 'https://www.universetoday.com/feed/', defaultCategory: 'missions' },

  // Additional news sources — expanded coverage
  { name: 'SpaceNews', url: 'https://spacenews.com/feed/', defaultCategory: 'companies' },
  { name: 'NASASpaceFlight', url: 'https://www.nasaspaceflight.com/feed/', defaultCategory: 'launches' },
  { name: 'Ars Technica Space', url: 'https://arstechnica.com/space/feed/', defaultCategory: 'missions' },
  { name: 'The Planetary Society', url: 'https://www.planetary.org/rss/articles', defaultCategory: 'missions' },
  // SpaceRef removed — site shut down, feed now serves a JS redirect page
  { name: 'Space.com', url: 'https://www.space.com/feeds/all', defaultCategory: 'missions' },
  { name: 'The Verge Space', url: 'https://www.theverge.com/rss/space/index.xml', defaultCategory: 'missions' },
  // Parabolic Arc removed — domain absorbed by SpaceNews
  { name: 'European Spaceflight', url: 'https://europeanspaceflight.com/feed/', defaultCategory: 'launches' },
  { name: 'Space Explored', url: 'https://spaceexplored.com/feed/', defaultCategory: 'companies' },
  { name: 'The Space Review', url: 'https://www.thespacereview.com/articles.xml', defaultCategory: 'policy' },
  { name: 'CSIS Aerospace', url: 'https://aerospace.csis.org/feed/', defaultCategory: 'defense' },

  // Agency feeds
  { name: 'ESA Human Spaceflight', url: 'https://www.esa.int/rssfeed/HSF', defaultCategory: 'missions' },
  // ESA renamed its topic feeds; Science_Exploration/Space_Safety/Applications 404 now
  { name: 'ESA Science', url: 'https://www.esa.int/rssfeed/science', defaultCategory: 'missions' },
  { name: 'UK Space Agency', url: 'https://space.blog.gov.uk/feed/', defaultCategory: 'policy' },

  // Defense feeds
  // Space Systems Command removed — ssc.spaceforce.mil blocks non-browser clients (403)
  { name: 'Defense One', url: 'https://www.defenseone.com/rss/all/', defaultCategory: 'defense' },
  { name: 'DefenseScoop', url: 'https://defensescoop.com/feed/', defaultCategory: 'defense' },

  // Science/Academic feeds
  { name: 'Sky & Telescope', url: 'https://skyandtelescope.org/astronomy-news/feed/', defaultCategory: 'missions' },
  { name: 'ScienceAlert Space', url: 'https://feeds.feedburner.com/sciencealert-latestnews', defaultCategory: 'missions' },
  { name: 'Phys.org Space', url: 'https://phys.org/rss-feed/space-news/', defaultCategory: 'missions' },
  { name: 'ScienceDaily Space', url: 'https://www.sciencedaily.com/rss/space_time.xml', defaultCategory: 'missions' },
  { name: 'NASA Earth Observatory', url: 'https://earthobservatory.nasa.gov/feeds/earth-observatory.rss', defaultCategory: 'satellites' },

  // Business/Economy feeds
  { name: 'TechCrunch Space', url: 'https://techcrunch.com/category/space/feed/', defaultCategory: 'earnings' },
  { name: 'GeekWire Space', url: 'https://www.geekwire.com/space/feed/', defaultCategory: 'companies' },
  { name: 'New Space Economy', url: 'https://newspaceeconomy.ca/feed/', defaultCategory: 'companies' },
  { name: 'Space Intel Report', url: 'https://www.spaceintelreport.com/feed/', defaultCategory: 'companies' },

  // General space news
  { name: 'Spaceflight Now', url: 'https://spaceflightnow.com/feed/', defaultCategory: 'launches' },
  { name: 'SpaceDaily', url: 'https://www.spacedaily.com/spacedaily.xml', defaultCategory: 'missions' },
  { name: 'Teslarati SpaceX', url: 'https://www.teslarati.com/category/spacex/feed/', defaultCategory: 'launches' },
  { name: 'Smithsonian Air & Space', url: 'https://www.smithsonianmag.com/rss/air-space-magazine/', defaultCategory: 'missions' },

  // Mission-specific
  { name: 'NASA Artemis Blog', url: 'https://blogs.nasa.gov/artemis/feed/', defaultCategory: 'missions' },
  { name: 'NASA JWST Blog', url: 'https://science.nasa.gov/blogs/webb/feed/', defaultCategory: 'missions' },
  { name: 'NASA Space Station Blog', url: 'https://blogs.nasa.gov/spacestation/feed/', defaultCategory: 'missions' },

  // Regional
  { name: 'Space in Africa', url: 'https://spaceinafrica.com/feed/', defaultCategory: 'companies' },
  { name: 'Moon Monday', url: 'https://blog.jatan.space/feed', defaultCategory: 'missions' },

  // Additional sources — expanded coverage (batch 2)
  { name: 'SciTechDaily Space', url: 'https://scitechdaily.com/news/space/feed/', defaultCategory: 'missions' },
  { name: 'AmericaSpace', url: 'https://www.americaspace.com/feed/', defaultCategory: 'launches' },
  { name: 'CNN Space', url: 'http://rss.cnn.com/rss/edition_space.rss', defaultCategory: 'general' },
  // Military Aerospace removed — publisher discontinued the RSS endpoint (404)
  { name: 'Federal News Network Defense', url: 'https://federalnewsnetwork.com/category/defense-main/feed/', defaultCategory: 'defense' },
  { name: 'Wired Science', url: 'https://www.wired.com/feed/category/science/latest/rss', defaultCategory: 'general' },
  { name: 'NASA Technology', url: 'https://www.nasa.gov/technology/feed/', defaultCategory: 'technology' },
  { name: 'NASA Kennedy Space Center', url: 'https://www.nasa.gov/centers-and-facilities/kennedy/feed/', defaultCategory: 'launches' },
  { name: 'ESA Launchers', url: 'http://www.esa.int/rssfeed/Our_Activities/Launchers', defaultCategory: 'launches' },
  { name: 'ESA Observing the Earth', url: 'http://www.esa.int/rssfeed/Our_Activities/Observing_the_Earth', defaultCategory: 'satellites' },
  { name: 'ESA Navigation', url: 'http://www.esa.int/rssfeed/Our_Activities/Navigation', defaultCategory: 'satellites' },
  { name: 'NASA Image of the Day', url: 'https://www.nasa.gov/feeds/iotd-feed/', defaultCategory: 'general' },

  // YouTube space channels
  { name: 'Scott Manley', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCxzC4EngIsMrPmbm6Nxvb-A', defaultCategory: 'general' },
  { name: 'Marcus House', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCBNHHEoiSF8pcLgqLKVugOw', defaultCategory: 'launches' },
  { name: 'Everyday Astronaut', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6uKrU_WqJ1R2HMTY3LIx5Q', defaultCategory: 'launches' },
  { name: 'NASA YouTube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLA_DiR1FfKNvjuUpBHmylQ', defaultCategory: 'general' },
  { name: 'SpaceX YouTube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCtI0Hodo5o5dUb67FeUjDeA', defaultCategory: 'launches' },
];

const rssParser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'SpaceNexus/1.0 (Space Industry News Aggregator)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
});

async function fetchSingleRSSFeed(feed: RSSFeedSource): Promise<number> {
  return rssBreaker.execute(async () => {
    try {
      const cache = await getDeduplicationCache();
      const parsed = await rssParser.parseURL(feed.url);
      let savedCount = 0;
      let skippedCount = 0;
      let offtopicSkipped = 0;

      const items = (parsed.items || []).slice(0, 25); // Max 25 per feed

      for (const item of items) {
        if (!item.link || !item.title) continue;

        const summary = item.contentSnippet || item.content || item.summary || '';
        // Strip the syndication trailer ("The post … appeared first on Space
        // Daily.") before storing: it is reader-visible cruft that repeats the
        // headline verbatim, and it is what defeated the relevance guard.
        const cleanSummary = stripFeedBoilerplate(
          sanitizeHtml(summary, { allowedTags: [], allowedAttributes: {} })
        ).slice(0, 500);

        // Conservative relevance guard for feeds that aren't space-dedicated
        if (RELEVANCE_GUARD_FEEDS.has(feed.name) && !isSpaceRelevant(item.title, cleanSummary, feed.name)) {
          offtopicSkipped++;
          continue;
        }

        // Use keyword-based categorization when it finds a specific match;
        // fall back to the feed's default category only when categorizeArticle
        // returns the generic 'missions' default (meaning no keywords matched)
        const category = categorizeArticle(item.title, cleanSummary) !== 'missions'
          ? categorizeArticle(item.title, cleanSummary)
          : (feed.defaultCategory || 'missions');

        const rawDate = item.pubDate ? new Date(item.pubDate) : new Date();
        // Cap future dates to now (RSS feeds with timezone offsets can appear in the future)
        const publishedAt = rawDate > new Date() ? new Date() : rawDate;
        // Skip articles older than 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (publishedAt < sevenDaysAgo) continue;

        const imageUrl = extractImageFromRSS(item);

        try {
          const { isDuplicate, reason } = cache.isDuplicate(item.title, item.link);

          if (isDuplicate) {
            // If the URL already exists, let the upsert update it.
            // If only the title matched, it's the same story from a different
            // source — skip the insert entirely.
            if (reason !== 'exact-url') {
              logger.debug('[RSS] Skipping duplicate article', {
                title: item.title,
                url: item.link,
                source: feed.name,
                reason,
              });
              skippedCount++;
              continue;
            }
          }

          await prisma.newsArticle.upsert({
            where: { url: item.link },
            update: {
              title: item.title,
              summary: cleanSummary || null,
              source: feed.name,
              category,
              imageUrl,
              publishedAt,
              fetchedAt: new Date(),
            },
            create: {
              title: item.title,
              summary: cleanSummary || null,
              url: item.link,
              source: feed.name,
              category,
              imageUrl,
              publishedAt,
            },
          });
          cache.trackInserted(item.title, item.link);
          savedCount++;
        } catch {
          continue;
        }
      }

      if (skippedCount > 0) {
        logger.info(`[RSS] ${feed.name}: skipped ${skippedCount} duplicate articles`);
      }
      if (offtopicSkipped > 0) {
        logger.info(`[RSS] ${feed.name}: skipped ${offtopicSkipped} off-topic articles (relevance guard)`);
      }

      return savedCount;
    } catch (error) {
      logger.warn(`[RSS] Failed to fetch ${feed.name}`, { error: String(error) });
      throw error; // Re-throw so the circuit breaker can track the failure
    }
  }, 0); // fallback: 0 saved articles
}

// URL shapes that are almost never a real article thumbnail: tracking
// pixels, ad-network beacons, and FeedBurner's stats beacon path.
const JUNK_IMAGE_URL_PATTERNS: RegExp[] = [
  /\/(pixel|beacon|spacer|blank|tracking|track)[.\-_/]/i,
  /\/~ff\//i, // FeedBurner tracking-beacon path (feeds.feedburner.com/~ff/...)
  /feedburner\.com\/.*\b(count|stats)\b/i,
  /doubleclick\.net/i,
  /google-analytics\.com/i,
  /googlesyndication\.com/i,
];

function isJunkImageUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  if (url.startsWith('data:')) return true; // reject data: URIs outright
  if (JUNK_IMAGE_URL_PATTERNS.some(pattern => pattern.test(url))) return true;
  // A bare .gif whose path also hints at tracking/1x1 usage — reject as a
  // likely tracking pixel. (Legitimate photo .gifs are rare in RSS content
  // and this keeps the check conservative rather than blocking all .gifs.)
  if (/\.gif(\?.*)?$/i.test(url) && /(pixel|beacon|spacer|track|1x1|blank)/i.test(url)) return true;
  return false;
}

function isTooSmall(width?: string, height?: string): boolean {
  const w = width ? parseInt(width, 10) : NaN;
  const h = height ? parseInt(height, 10) : NaN;
  if (!Number.isNaN(w) && w < 200) return true;
  if (!Number.isNaN(h) && h < 200) return true;
  return false;
}

function extractImageFromRSS(item: RSSParser.Item & Record<string, unknown>): string | null {
  // 1. Enclosure (type image/*)
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image') && !isJunkImageUrl(item.enclosure.url)) {
    return item.enclosure.url;
  }

  // 2. media:content
  const media = item['media:content'] as { $?: { url?: string; width?: string; height?: string } } | undefined;
  if (media?.$?.url && !isJunkImageUrl(media.$.url) && !isTooSmall(media.$.width, media.$.height)) {
    return media.$.url;
  }

  // 3. media:thumbnail
  const mediaThumbnail = item['media:thumbnail'] as { $?: { url?: string; width?: string; height?: string } } | undefined;
  if (mediaThumbnail?.$?.url && !isJunkImageUrl(mediaThumbnail.$.url) && !isTooSmall(mediaThumbnail.$.width, mediaThumbnail.$.height)) {
    return mediaThumbnail.$.url;
  }

  // 4. itunes:image (podcast namespace — some feeds carry it)
  const itunesImage = item['itunes:image'] as { $?: { href?: string } } | undefined;
  if (itunesImage?.$?.href && !isJunkImageUrl(itunesImage.$.href)) {
    return itunesImage.$.href;
  }

  // 5. First qualifying <img> in content:encoded / content / description HTML
  const content = (item.content || item['content:encoded'] || item['description'] || '') as string;
  const imgTags = content.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgTags) {
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (isJunkImageUrl(src)) continue;
    const widthMatch = tag.match(/\bwidth=["']?(\d+)/i);
    const heightMatch = tag.match(/\bheight=["']?(\d+)/i);
    if (isTooSmall(widthMatch?.[1], heightMatch?.[1])) continue;
    return src;
  }

  return null;
}

// --- Bounded og:image enrichment ---
//
// RSS-extracted images cover most feeds, but some publish no usable image
// at all in their feed XML. Rather than page-scrape og:image for every
// article on every cron run (too slow), we bound it: only the most recent
// N imageless articles (the ones most likely to surface on the
// homepage/top-of-feed) get a single bounded-timeout fetch per cron cycle.
const OG_IMAGE_ENRICHMENT_LIMIT = 30;
const OG_IMAGE_FETCH_TIMEOUT_MS = 5000;
const OG_IMAGE_ENRICHMENT_CONCURRENCY = 5;

async function fetchOgImage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OG_IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SpaceNexus/1.0 (Space Industry News Aggregator)' },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    // og:image/twitter:image live in <head> — read only a bounded prefix
    // of the page rather than the full body.
    let html = '';
    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      const MAX_BYTES = 100_000; // 100KB comfortably covers <head>
      let bytesRead = 0;
      while (bytesRead < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
    } else {
      html = await response.text();
    }

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1] && !isJunkImageUrl(ogMatch[1])) return ogMatch[1];

    const twitterMatch =
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twitterMatch?.[1] && !isJunkImageUrl(twitterMatch[1])) return twitterMatch[1];

    return null;
  } catch {
    return null; // fail silent — timeout, network error, bad markup, etc.
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Enrich the most recently published imageless articles with an og:image
 * scraped from the article page. Bounded to OG_IMAGE_ENRICHMENT_LIMIT page
 * fetches per call (i.e. per cron run), each with a 5s timeout, processed
 * with limited concurrency. Best-effort / fail-silent throughout.
 */
async function enrichRecentArticlesWithOgImages(limit = OG_IMAGE_ENRICHMENT_LIMIT): Promise<number> {
  try {
    const candidates = await prisma.newsArticle.findMany({
      where: { imageUrl: null },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, url: true },
    });

    if (candidates.length === 0) return 0;

    let enrichedCount = 0;
    for (let i = 0; i < candidates.length; i += OG_IMAGE_ENRICHMENT_CONCURRENCY) {
      const batch = candidates.slice(i, i + OG_IMAGE_ENRICHMENT_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (article) => {
          const ogImage = await fetchOgImage(article.url);
          if (!ogImage) return false;
          try {
            await prisma.newsArticle.update({ where: { id: article.id }, data: { imageUrl: ogImage } });
            return true;
          } catch {
            return false;
          }
        })
      );
      enrichedCount += results.filter(Boolean).length;
    }

    if (enrichedCount > 0) {
      logger.info(`[OG-Enrich] Enriched ${enrichedCount}/${candidates.length} imageless articles with og:image`);
    }
    return enrichedCount;
  } catch (error) {
    logger.warn('[OG-Enrich] Failed to enrich articles with og:image', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

async function fetchRSSFeeds(): Promise<number> {
  // Fetch all RSS feeds concurrently with individual error handling
  const results = await Promise.all(
    RSS_FEEDS.map(feed => fetchSingleRSSFeed(feed))
  );

  return results.reduce((sum, count) => sum + count, 0);
}

// --- Company tagging ---

// Cache company names for tagging (refreshed per fetch cycle)
let companyNameCache: Array<{ id: string; slug: string; name: string; aliases: string[] }> | null = null;

async function getCompanyNameCache() {
  if (companyNameCache) return companyNameCache;

  try {
    const companies = await prisma.companyProfile.findMany({
      select: { id: true, slug: true, name: true, ticker: true, tags: true },
    });

    companyNameCache = companies.map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      aliases: [
        c.name.toLowerCase(),
        // Add ticker as alias if it exists
        ...(c.ticker ? [c.ticker.toLowerCase()] : []),
        // Common name variants (e.g., "Rocket Lab" matches "RocketLab")
        c.name.toLowerCase().replace(/\s+/g, ''),
      ].filter(Boolean),
    }));

    return companyNameCache;
  } catch {
    return [];
  }
}

export function clearCompanyNameCache() {
  companyNameCache = null;
}

async function tagArticleWithCompanies(articleId: string, title: string, summary: string): Promise<void> {
  const companies = await getCompanyNameCache();
  if (companies.length === 0) return;

  const text = `${title} ${summary || ''}`.toLowerCase();
  const matchedIds: string[] = [];

  for (const company of companies) {
    for (const alias of company.aliases) {
      // Use word boundary check for short names to avoid false positives
      if (alias.length <= 3) {
        // For short names like "SES", "ULA", "ABL" - require word boundaries
        const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(text)) {
          matchedIds.push(company.id);
          break;
        }
      } else if (text.includes(alias)) {
        matchedIds.push(company.id);
        break;
      }
    }
  }

  if (matchedIds.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.newsArticle as any).update({
        where: { id: articleId },
        data: {
          companyTags: {
            set: matchedIds.map(id => ({ id })),
          },
        },
      });
    } catch {
      // Silently fail - tagging is best-effort
    }
  }
}

// Tag recent articles with company profiles (called after news fetch)
export async function tagRecentArticlesWithCompanies(limit = 200): Promise<number> {
  clearCompanyNameCache();
  const companies = await getCompanyNameCache();
  if (companies.length === 0) return 0;

  const articles = await prisma.newsArticle.findMany({
    select: { id: true, title: true, summary: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });

  let tagged = 0;
  for (const article of articles) {
    await tagArticleWithCompanies(article.id, article.title, article.summary || '');
    tagged++;
  }

  return tagged;
}

// --- Query functions ---

export async function getNewsArticles(options?: {
  category?: string;
  limit?: number;
  offset?: number;
  companySlug?: string;
}) {
  const { category, limit = 20, offset = 0, companySlug } = options || {};

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (companySlug) where.companyTags = { some: { slug: companySlug } };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = await (prisma.newsArticle as any).findMany({
    where,
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      source: true,
      imageUrl: true,
      url: true,
      publishedAt: true,
      companyTags: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          tier: true,
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = await (prisma.newsArticle as any).count({ where });

  return { articles, total };
}

export async function getArticleById(id: string) {
  return prisma.newsArticle.findUnique({ where: { id } });
}
