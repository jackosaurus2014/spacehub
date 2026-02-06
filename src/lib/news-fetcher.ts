import prisma from './db';
import RSSParser from 'rss-parser';

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
  const text = `${title} ${summary}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return 'missions'; // default category
}

// --- SNAPI (Spaceflight News API) fetching ---

async function fetchSNAPIEndpoint(endpoint: string, limit: number): Promise<number> {
  const response = await fetch(
    `https://api.spaceflightnewsapi.net/v4/${endpoint}/?limit=${limit}&ordering=-published_at`,
    { next: { revalidate: 300 } }
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
    console.log(`[SNAPI] Fetched ${articlesCount} articles, ${blogsCount} blogs, ${reportsCount} reports`);

    // Fetch RSS feeds
    let rssCount = 0;
    try {
      rssCount = await fetchRSSFeeds();
      console.log(`[RSS] Fetched ${rssCount} articles from RSS feeds`);
    } catch (rssError) {
      console.error('[RSS] Error fetching RSS feeds:', rssError);
    }

    return totalSNAPI + rssCount;
  } catch (error) {
    console.error('Error fetching spaceflight news:', error);
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
];

const rssParser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'SpaceNexus/1.0 (Space Industry News Aggregator)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
});

async function fetchSingleRSSFeed(feed: RSSFeedSource): Promise<number> {
  try {
    const parsed = await rssParser.parseURL(feed.url);
    let savedCount = 0;

    const items = (parsed.items || []).slice(0, 25); // Max 25 per feed

    for (const item of items) {
      if (!item.link || !item.title) continue;

      const summary = item.contentSnippet || item.content || item.summary || '';
      const cleanSummary = summary.replace(/<[^>]*>/g, '').slice(0, 500);
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
    console.warn(`[RSS] Failed to fetch ${feed.name}: ${error}`);
    return 0;
  }
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

// --- Query functions ---

export async function getNewsArticles(options?: {
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const { category, limit = 20, offset = 0 } = options || {};

  const where = category ? { category } : {};

  const articles = await prisma.newsArticle.findMany({
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
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.newsArticle.count({ where });

  return { articles, total };
}

export async function getArticleById(id: string) {
  return prisma.newsArticle.findUnique({ where: { id } });
}
