import prisma from './db';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'dc:creator', 'media:content'],
  },
});

// Predefined blog sources focused on space industry professionals
const BLOG_SOURCES = [
  {
    name: 'The Space Review',
    slug: 'space-review',
    url: 'https://www.thespacereview.com',
    feedUrl: 'https://www.thespacereview.com/rss.xml',
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
    name: 'Parabolic Arc',
    slug: 'parabolic-arc',
    url: 'http://www.parabolicarc.com',
    feedUrl: 'http://www.parabolicarc.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Space news and commentary',
  },
  {
    name: 'SpaceNews Opinion',
    slug: 'spacenews-opinion',
    url: 'https://spacenews.com/section/opinion/',
    feedUrl: 'https://spacenews.com/section/opinion/feed/',
    type: 'blog',
    authorType: 'consultant',
    description: 'Expert opinions on space industry matters',
  },
  {
    name: 'NASA Blogs',
    slug: 'nasa-blogs',
    url: 'https://blogs.nasa.gov',
    feedUrl: 'https://blogs.nasa.gov/feed/',
    type: 'blog',
    authorType: 'engineer',
    description: 'Official NASA mission and program blogs',
  },
  {
    name: 'The Planetary Society Blog',
    slug: 'planetary-society',
    url: 'https://www.planetary.org/articles',
    feedUrl: 'https://www.planetary.org/feed',
    type: 'blog',
    authorType: 'consultant',
    description: 'Space exploration advocacy and education',
  },
  {
    name: 'Space Explored',
    slug: 'space-explored',
    url: 'https://spaceexplored.com',
    feedUrl: 'https://spaceexplored.com/feed/',
    type: 'blog',
    authorType: 'journalist',
    description: 'Space industry news and analysis',
  },
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  space_law: ['law', 'legal', 'regulation', 'treaty', 'liability', 'property rights', 'fcc', 'itu', 'artemis accords'],
  investment: ['investment', 'investor', 'funding', 'venture', 'capital', 'ipo', 'spac', 'valuation', 'market', 'stock'],
  policy: ['policy', 'congress', 'legislation', 'government', 'budget', 'administration', 'faa', 'nasa budget'],
  technology: ['technology', 'innovation', 'propulsion', 'engine', 'satellite', 'spacecraft', 'rocket', 'reusable'],
  business: ['business', 'commercial', 'contract', 'revenue', 'profit', 'startup', 'company', 'enterprise'],
  exploration: ['exploration', 'moon', 'mars', 'asteroid', 'deep space', 'artemis', 'human spaceflight', 'colony'],
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
  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, '').trim();
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
      console.error(`Failed to add source ${source.name}:`, err);
    }
  }

  return count;
}

export async function fetchBlogPosts(): Promise<number> {
  const sources = await prisma.blogSource.findMany({
    where: { isActive: true, feedUrl: { not: null } },
  });

  let totalSaved = 0;

  for (const source of sources) {
    if (!source.feedUrl) continue;

    try {
      const feed = await parser.parseURL(source.feedUrl);

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
              authorName: item['dc:creator'] || item.creator || source.authorName,
              topic,
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            },
            create: {
              title: item.title,
              excerpt,
              url: item.link,
              sourceId: source.id,
              authorName: item['dc:creator'] || item.creator || source.authorName,
              topic,
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            },
          });
          totalSaved++;
        } catch {
          // Skip duplicates or errors
          continue;
        }
      }

      // Update last fetched time
      await prisma.blogSource.update({
        where: { id: source.id },
        data: { lastFetched: new Date() },
      });
    } catch (err) {
      console.error(`Failed to fetch from ${source.name}:`, err);
      continue;
    }
  }

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
    include: {
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
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getRecentBlogPosts(limit: number = 6) {
  return prisma.blogPost.findMany({
    include: {
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
