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

// --- SNAPI (Spaceflight News API) fetching ---

async function fetchSNAPIEndpoint(endpoint: string, limit: number): Promise<number> {
  return snapiBreaker.execute(async () => {
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

    for (const article of articles) {
      const category = categorizeArticle(article.title, article.summary || '');

      try {
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
        savedCount++;
      } catch {
        continue;
      }
    }

    return savedCount;
  }, 0); // fallback: 0 saved articles
}

export async function fetchSpaceflightNews(): Promise<number> {
  try {
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

    return totalSNAPI + rssCount;
  } catch (error) {
    logger.error('Error fetching spaceflight news', { error: error instanceof Error ? error.message : String(error) });
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
  { name: 'Via Satellite', url: 'https://www.satellitetoday.com/feed/', defaultCategory: 'satellites' },
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
  { name: 'JAXA', url: 'https://global.jaxa.jp/feed/index.xml', defaultCategory: 'missions' },
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
  { name: 'SpaceRef', url: 'https://spaceref.com/feed/', defaultCategory: 'missions' },
  { name: 'Space.com', url: 'https://www.space.com/feeds/all', defaultCategory: 'missions' },
  { name: 'The Verge Space', url: 'https://www.theverge.com/rss/space/index.xml', defaultCategory: 'missions' },
  // Parabolic Arc removed — domain absorbed by SpaceNews
  { name: 'European Spaceflight', url: 'https://europeanspaceflight.com/feed/', defaultCategory: 'launches' },
  { name: 'Space Explored', url: 'https://spaceexplored.com/feed/', defaultCategory: 'companies' },
  { name: 'The Space Review', url: 'https://www.thespacereview.com/articles.xml', defaultCategory: 'policy' },
  { name: 'CSIS Aerospace', url: 'https://aerospace.csis.org/feed/', defaultCategory: 'defense' },

  // Agency feeds
  { name: 'ESA Human Spaceflight', url: 'https://www.esa.int/rssfeed/HSF', defaultCategory: 'missions' },
  { name: 'ESA Science & Exploration', url: 'https://www.esa.int/rssfeed/Science_Exploration', defaultCategory: 'missions' },
  { name: 'ESA Space Safety', url: 'https://www.esa.int/rssfeed/Space_Safety', defaultCategory: 'debris' },
  { name: 'ESA Applications', url: 'https://www.esa.int/rssfeed/Applications', defaultCategory: 'satellites' },
  { name: 'UK Space Agency', url: 'https://space.blog.gov.uk/feed/', defaultCategory: 'policy' },

  // Defense feeds
  { name: 'Space Systems Command', url: 'https://www.ssc.spaceforce.mil/RSS', defaultCategory: 'defense' },
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
  { name: 'NASA JWST Blog', url: 'https://blogs.nasa.gov/webb/feed/', defaultCategory: 'missions' },
  { name: 'NASA Space Station Blog', url: 'https://blogs.nasa.gov/spacestation/feed/', defaultCategory: 'missions' },

  // Regional
  { name: 'Space in Africa', url: 'https://spaceinafrica.com/feed/', defaultCategory: 'companies' },
  { name: 'Moon Monday', url: 'https://blog.jatan.space/feed', defaultCategory: 'missions' },
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
      const parsed = await rssParser.parseURL(feed.url);
      let savedCount = 0;

      const items = (parsed.items || []).slice(0, 25); // Max 25 per feed

      for (const item of items) {
        if (!item.link || !item.title) continue;

        const summary = item.contentSnippet || item.content || item.summary || '';
        const cleanSummary = sanitizeHtml(summary, { allowedTags: [], allowedAttributes: {} }).slice(0, 500);
        // Use keyword-based categorization when it finds a specific match;
        // fall back to the feed's default category only when categorizeArticle
        // returns the generic 'missions' default (meaning no keywords matched)
        const category = categorizeArticle(item.title, cleanSummary) !== 'missions'
          ? categorizeArticle(item.title, cleanSummary)
          : (feed.defaultCategory || 'missions');

        const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
        // Skip articles older than 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (publishedAt < sevenDaysAgo) continue;

        const imageUrl = extractImageFromRSS(item);

        try {
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
          savedCount++;
        } catch {
          continue;
        }
      }

      return savedCount;
    } catch (error) {
      logger.warn(`[RSS] Failed to fetch ${feed.name}`, { error: String(error) });
      throw error; // Re-throw so the circuit breaker can track the failure
    }
  }, 0); // fallback: 0 saved articles
}

function extractImageFromRSS(item: RSSParser.Item & Record<string, unknown>): string | null {
  // Check enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }

  // Check media:content or media:thumbnail
  const media = item['media:content'] as { $?: { url?: string } } | undefined;
  if (media?.$?.url) {
    return media.$.url;
  }
  const mediaThumbnail = item['media:thumbnail'] as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url) {
    return mediaThumbnail.$.url;
  }

  // Try to extract first image from content HTML
  const content = (item.content || item['content:encoded'] || '') as string;
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) {
    return imgMatch[1];
  }

  return null;
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
