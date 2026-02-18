import prisma from './db';
import Parser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import { logger } from './logger';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'SpaceNexus/1.0 (Space Industry News Aggregator)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
  customFields: {
    item: ['content:encoded', 'dc:creator', 'media:content'],
  },
});

// Predefined blog sources focused on space industry professionals
const BLOG_SOURCES = [
  // --- Policy & Analysis ---
  {
    name: 'The Space Review',
    slug: 'space-review',
    url: 'https://www.thespacereview.com',
    feedUrl: 'https://www.thespacereview.com/articles.xml',
    type: 'blog',
    authorType: 'journalist',
    description: 'Essays and commentary about the final frontier',
  },
  {
    name: 'Space Policy Online',
    slug: 'space-policy-online',
    url: 'https://spacepolicyonline.com',
    feedUrl: 'https://spacepolicyonline.com/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'Space policy news and analysis',
  },
  {
    name: 'SpaceNews Opinion',
    slug: 'spacenews-opinion',
    url: 'https://spacenews.com/section/opinion/',
    feedUrl: 'https://spacenews.com/tag/opinion/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'Expert opinions on space industry matters',
  },
  {
    name: 'CSIS Aerospace Security',
    slug: 'csis-aerospace',
    url: 'https://aerospace.csis.org',
    feedUrl: 'https://aerospace.csis.org/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'Space security analysis and annual Space Threat Assessment',
  },

  // --- Law Firm Blogs ---
  {
    name: 'Sheppard Mullin FCC Law Blog',
    slug: 'sheppard-mullin-fcc',
    url: 'https://www.fcclawblog.com',
    feedUrl: 'https://www.fcclawblog.com/feed/',
    type: 'blog',
    authorType: 'lawyer',
    description: 'FCC satellite and space regulatory proceedings analysis',
  },
  {
    name: 'StarLaw Blog',
    slug: 'starlaw-blog',
    url: 'https://www.starlawblog.com',
    feedUrl: 'https://www.starlawblog.com/feed/',
    type: 'blog',
    authorType: 'lawyer',
    description: 'Global Space Law Center at Cleveland-Marshall College of Law',
  },
  {
    name: 'Space Legal Issues',
    slug: 'space-legal-issues',
    url: 'https://www.spacelegalissues.com',
    feedUrl: 'https://www.spacelegalissues.com/feed/',
    type: 'blog',
    authorType: 'lawyer',
    description: 'Space law and public international law analysis',
  },
  {
    name: 'EJIL: Talk! — Space Law',
    slug: 'ejil-space-law',
    url: 'https://www.ejiltalk.org/category/space-law/',
    feedUrl: 'https://www.ejiltalk.org/feed/',
    type: 'blog',
    authorType: 'lawyer',
    description: 'European Journal of International Law blog — space law coverage',
  },
  {
    name: 'Above the Law — Space Law',
    slug: 'above-the-law-space',
    url: 'https://abovethelaw.com/tag/space-law/',
    feedUrl: 'https://abovethelaw.com/tag/space-law/feed/',
    type: 'blog',
    authorType: 'lawyer',
    description: 'Legal industry coverage of space law developments',
  },

  // --- Technical Blogs ---
  // Parabolic Arc removed — domain redirects to SpaceNews (absorbed)
  {
    name: 'NASA Blogs',
    slug: 'nasa-blogs',
    url: 'https://www.nasa.gov/news',
    feedUrl: 'https://www.nasa.gov/news-release/feed/',
    type: 'blog',
    authorType: 'engineer',
    description: 'Official NASA news releases',
  },
  {
    name: 'The Planetary Society Blog',
    slug: 'planetary-society',
    url: 'https://www.planetary.org/articles',
    feedUrl: 'https://www.planetary.org/rss/articles',
    type: 'blog',
    authorType: 'consultant',
    description: 'Space exploration advocacy and education',
  },
  {
    name: 'Everyday Astronaut',
    slug: 'everyday-astronaut',
    url: 'https://everydayastronaut.com',
    feedUrl: 'https://everydayastronaut.com/feed',
    type: 'blog',
    authorType: 'journalist',
    description: 'Detailed technical analysis of rockets and space systems',
  },
  {
    name: 'European Spaceflight',
    slug: 'european-spaceflight',
    url: 'https://europeanspaceflight.com',
    feedUrl: 'https://europeanspaceflight.com/feed',
    type: 'blog',
    authorType: 'journalist',
    description: 'European space activities, rocket startups, and ESA programs',
  },
  {
    name: 'NASASpaceflight',
    slug: 'nasaspaceflight',
    url: 'https://www.nasaspaceflight.com',
    feedUrl: 'https://www.nasaspaceflight.com/feed',
    type: 'blog',
    authorType: 'journalist',
    description: 'Leading technical coverage of SpaceX, NASA, and global launch providers',
  },
  {
    name: 'Ars Technica — Space',
    slug: 'arstechnica-space',
    url: 'https://arstechnica.com/space/',
    feedUrl: 'https://arstechnica.com/space/feed',
    type: 'blog',
    authorType: 'journalist',
    description: 'Award-winning space reporting with technical depth',
  },

  // --- Industry & Business ---
  {
    name: 'Space Explored',
    slug: 'space-explored',
    url: 'https://spaceexplored.com',
    feedUrl: 'https://spaceexplored.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Space industry news and analysis',
  },
  {
    name: 'Payload Space',
    slug: 'payload-space',
    url: 'https://payloadspace.com',
    feedUrl: 'https://payloadspace.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Daily coverage of space business and policy',
  },
  {
    name: 'SpaceWatch.Global',
    slug: 'spacewatch-global',
    url: 'https://spacewatch.global',
    feedUrl: 'https://spacewatch.global/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'International space industry news and geopolitical analysis',
  },
  {
    name: 'SpaceQ',
    slug: 'spaceq',
    url: 'https://spaceq.ca',
    feedUrl: 'https://spaceq.ca/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Canadian and international space sector coverage',
  },
  {
    name: 'NASA Watch',
    slug: 'nasa-watch',
    url: 'https://nasawatch.com',
    feedUrl: 'https://nasawatch.com/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'NASA program commentary and space policy analysis',
  },
  {
    name: 'SpaceNews',
    slug: 'spacenews-articles',
    url: 'https://spacenews.com',
    feedUrl: 'https://spacenews.com/feed',
    type: 'blog',
    authorType: 'journalist',
    description: 'Comprehensive space industry news since 1989',
  },

  // --- Additional Sources ---
  {
    name: 'SpaceRef',
    slug: 'spaceref',
    url: 'https://spaceref.com',
    feedUrl: 'https://spaceref.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Space news and reference articles since 1999',
  },
  {
    name: 'Space.com',
    slug: 'space-dot-com',
    url: 'https://www.space.com',
    feedUrl: 'https://www.space.com/feeds/all',
    type: 'blog',
    authorType: 'journalist',
    description: 'Popular space science news and features',
  },
  {
    name: 'SatNews',
    slug: 'satnews',
    url: 'https://news.satnews.com',
    feedUrl: 'https://news.satnews.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Satellite industry news and analysis',
  },
  {
    name: 'Via Satellite',
    slug: 'via-satellite',
    url: 'https://www.satellitetoday.com',
    feedUrl: 'https://www.satellitetoday.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Global satellite communications industry coverage',
  },
  {
    name: 'The Verge Space',
    slug: 'the-verge-space',
    url: 'https://www.theverge.com/space',
    feedUrl: 'https://www.theverge.com/rss/space/index.xml',
    type: 'blog',
    authorType: 'journalist',
    description: 'Space reporting from The Verge',
  },
  {
    name: 'Breaking Defense Space',
    slug: 'breaking-defense-space',
    url: 'https://breakingdefense.com/category/space/',
    feedUrl: 'https://breakingdefense.com/category/space/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Defense and national security space news',
  },
  {
    name: 'Orbital Today',
    slug: 'orbital-today',
    url: 'https://orbitaltoday.com',
    feedUrl: 'https://orbitaltoday.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Space industry and aerospace news coverage',
  },

  // --- Space Company Blogs ---
  // SpaceX Updates removed — no public RSS feed available
  // Lockheed Martin Space removed — feed format not recognized as RSS

  // --- Academic/Research ---
  {
    name: 'arXiv Astrophysics',
    slug: 'arxiv-astrophysics',
    url: 'https://arxiv.org/list/astro-ph/recent',
    feedUrl: 'https://rss.arxiv.org/rss/astro-ph',
    type: 'blog',
    authorType: 'engineer',
    description: 'Daily astrophysics research preprints',
  },

  // --- Science/Astrobiology ---
  {
    name: 'Many Worlds',
    slug: 'many-worlds',
    url: 'https://manyworlds.space',
    feedUrl: 'https://manyworlds.space/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'Exoplanet and astrobiology news',
  },
  {
    name: 'Astrobiology Web',
    slug: 'astrobiology-web',
    url: 'https://astrobiology.com',
    feedUrl: 'https://astrobiology.com/feed',
    type: 'blog',
    authorType: 'consultant',
    description: 'Astrobiology research and missions',
  },

  // --- Space Journalism ---
  {
    name: 'Leonard David Inside Outer Space',
    slug: 'leonard-david',
    url: 'https://www.leonarddavid.com',
    feedUrl: 'https://www.leonarddavid.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Veteran space journalist covering NASA and policy',
  },
  {
    name: 'Cosmic Log',
    slug: 'cosmic-log',
    url: 'https://cosmiclog.com',
    feedUrl: 'https://cosmiclog.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Alan Boyle veteran space and science reporting',
  },

  // --- Policy/Think Tanks ---
  {
    name: 'National Space Society',
    slug: 'national-space-society',
    url: 'https://space.nss.org',
    feedUrl: 'https://space.nss.org/blog/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'Space settlement, policy, and education',
  },
  {
    name: 'Space Foundation',
    slug: 'space-foundation',
    url: 'https://www.spacefoundation.org',
    feedUrl: 'https://www.spacefoundation.org/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'Space advocacy and Space Symposium updates',
  },

  // --- Life Sciences ---
  {
    name: 'ISS National Lab',
    slug: 'iss-national-lab',
    url: 'https://issnationallab.org',
    feedUrl: 'https://issnationallab.org/feed/',
    type: 'blog',
    authorType: 'engineer',
    description: 'Microgravity experiments and research results',
  },

  // --- Insurance & Risk Industry ---
  {
    name: 'Insurance Journal',
    slug: 'insurance-journal',
    url: 'https://www.insurancejournal.com',
    feedUrl: 'https://www.insurancejournal.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Property/casualty insurance news including space and satellite coverage',
  },
  {
    name: 'Artemis.bm',
    slug: 'artemis-bm',
    url: 'https://www.artemis.bm',
    feedUrl: 'https://www.artemis.bm/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Catastrophe bonds, insurance-linked securities, and reinsurance capital markets',
  },
  {
    name: 'AXA XL Fast Forward',
    slug: 'axa-xl-articles',
    url: 'https://axaxl.com/fast-fast-forward/articles',
    feedUrl: 'https://axaxl.com/fast-fast-forward/articles/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'Risk management insights including space insurance and satellite coverage',
  },
  {
    name: 'Global Reinsurance',
    slug: 'global-reinsurance',
    url: 'https://www.globalreinsurance.com',
    feedUrl: 'https://www.globalreinsurance.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Reinsurance industry news covering aerospace and space markets',
  },
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  space_law: ['law', 'legal', 'regulation', 'treaty', 'liability', 'property rights', 'fcc', 'itu', 'artemis accords', 'outer space treaty', 'licensing', 'compliance', 'regulatory', 'litigation', 'adjudication', 'jurisdiction', 'space act', 'copuos', 'spectrum allocation', 'orbital debris regulation', 'launch license', 'reentry authorization', 'part 25', 'part 97'],
  investment: ['investment', 'investor', 'funding', 'venture', 'capital', 'ipo', 'spac', 'valuation', 'market', 'stock', 'series a', 'series b', 'series c', 'fundraise', 'acquisition', 'merger', 'm&a', 'deal', 'portfolio'],
  policy: ['policy', 'congress', 'legislation', 'government', 'budget', 'administration', 'faa', 'nasa budget', 'appropriation', 'authorization', 'white house', 'executive order', 'space council', 'national space'],
  technology: ['technology', 'innovation', 'propulsion', 'engine', 'satellite', 'spacecraft', 'rocket', 'reusable', 'electric propulsion', 'in-space manufacturing', 'additive manufacturing', 'laser comms', 'optical', 'antenna', 'phased array'],
  business: ['business', 'commercial', 'contract', 'revenue', 'profit', 'startup', 'company', 'enterprise', 'partnership', 'joint venture', 'award', 'procurement'],
  exploration: ['exploration', 'moon', 'mars', 'asteroid', 'deep space', 'artemis', 'human spaceflight', 'colony', 'lunar', 'gateway', 'interplanetary', 'hab', 'lander', 'rover'],
};

function categorizeTopic(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return topic;
      }
    }
  }

  return 'exploration'; // default
}

function extractExcerpt(content: string, maxLength: number = 300): string {
  const text = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }).trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export async function initializeBlogSources(): Promise<number> {
  let count = 0;

  for (const source of BLOG_SOURCES) {
    try {
      await prisma.blogSource.upsert({
        where: { slug: source.slug },
        update: {
          name: source.name,
          url: source.url,
          feedUrl: source.feedUrl,
          type: source.type,
          authorType: source.authorType,
          description: source.description,
          isActive: true,
        },
        create: {
          name: source.name,
          slug: source.slug,
          url: source.url,
          feedUrl: source.feedUrl,
          type: source.type,
          authorType: source.authorType,
          description: source.description,
          isActive: true,
        },
      });
      count++;
    } catch (err) {
      logger.error(`Failed to add source ${source.name}`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return count;
}

export async function fetchBlogPosts(): Promise<number> {
  const sources = await prisma.blogSource.findMany({
    where: { isActive: true, feedUrl: { not: null } },
    select: {
      id: true,
      name: true,
      feedUrl: true,
      authorName: true,
    },
  });

  let totalSaved = 0;
  let successCount = 0;
  let failCount = 0;

  for (const source of sources) {
    if (!source.feedUrl) continue;

    const feedUrl = source.feedUrl;
    const sourceName = source.name;
    const sourceId = source.id;
    const sourceAuthorName = source.authorName;

    try {
      // Per-source timeout: 15 seconds to parse the feed
      // Using Promise.race because rss-parser doesn't support AbortController
      const feed = await Promise.race([
        parser.parseURL(feedUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`TIMEOUT after 15s for ${sourceName}`)), 15_000)
        ),
      ]);

      let count = 0;

      for (const item of feed.items.slice(0, 20)) {
        if (!item.link || !item.title) continue;

        const content = item['content:encoded'] || item.contentSnippet || item.content || '';
        const excerpt = extractExcerpt(content);
        const topic = categorizeTopic(item.title, content);

        try {
          await prisma.blogPost.upsert({
            where: { url: item.link },
            update: {
              title: item.title,
              excerpt,
              authorName: item['dc:creator'] || item.creator || sourceAuthorName,
              topic,
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
              fetchedAt: new Date(),
            },
            create: {
              title: item.title,
              excerpt,
              url: item.link,
              sourceId: sourceId,
              authorName: item['dc:creator'] || item.creator || sourceAuthorName,
              topic,
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
              fetchedAt: new Date(),
            },
          });
          count++;
        } catch (err) {
          logger.warn(`[Blogs] Failed to upsert post from ${sourceName}`, {
            url: item.link,
            error: err instanceof Error ? err.message : String(err),
          });
          continue;
        }
      }

      // Update last fetched time
      await prisma.blogSource.update({
        where: { id: sourceId },
        data: { lastFetched: new Date() },
      });

      totalSaved += count;
      successCount++;
    } catch (err) {
      failCount++;
      logger.warn(`[Blogs] Failed to fetch feed: ${sourceName}`, {
        feedUrl,
        error: err instanceof Error ? err.message : String(err),
      });
      // Continue to next source — don't let one broken feed block others
    }
  }

  logger.info(`[Blogs] Fetch complete`, {
    totalSaved,
    sourcesSuccess: successCount,
    sourcesFailed: failCount,
    totalSources: sources.length,
  });

  return totalSaved;
}

export async function getBlogPosts(options?: {
  topic?: string;
  authorType?: string;
  sourceId?: string;
  limit?: number;
  offset?: number;
}) {
  const { topic, authorType, sourceId, limit = 20, offset = 0 } = options || {};

  const where: Record<string, unknown> = {};

  if (topic) {
    where.topic = topic;
  }

  if (sourceId) {
    where.sourceId = sourceId;
  }

  if (authorType) {
    where.source = { authorType };
  }

  const posts = await prisma.blogPost.findMany({
    where,
    select: {
      id: true,
      title: true,
      excerpt: true,
      url: true,
      authorName: true,
      topic: true,
      publishedAt: true,
      sourceId: true,
      source: {
        select: {
          name: true,
          slug: true,
          authorType: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.blogPost.count({ where });

  return { posts, total };
}

export async function getBlogSources(options?: {
  authorType?: string;
  isActive?: boolean;
}) {
  const { authorType, isActive = true } = options || {};

  const where: Record<string, unknown> = { isActive };

  if (authorType) {
    where.authorType = authorType;
  }

  return prisma.blogSource.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      url: true,
      feedUrl: true,
      type: true,
      authorType: true,
      description: true,
      imageUrl: true,
      isActive: true,
      lastFetched: true,
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getRecentBlogPosts(limit: number = 6) {
  return prisma.blogPost.findMany({
    select: {
      id: true,
      title: true,
      excerpt: true,
      url: true,
      authorName: true,
      topic: true,
      publishedAt: true,
      source: {
        select: {
          name: true,
          slug: true,
          authorType: true,
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}
