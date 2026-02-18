/**
 * Fetcher for insurance and resource exchange related news
 * Queries the NewsArticle and BlogPost tables for keyword-matched content
 * and stores curated results in DynamicContent for display on module pages.
 */

import prisma from '@/lib/db';
import { upsertContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

// ── Insurance News ──────────────────────────────────────────

const INSURANCE_KEYWORDS = [
  'space insurance', 'satellite insurance', 'launch insurance',
  'space underwriter', 'space risk', 'orbital insurance',
  'in-orbit insurance', 'launch failure', 'mission failure',
  'space liability', 'space claims', 'premium rate',
  'Swiss Re', 'Munich Re', 'AXA XL', 'Lloyd\'s space',
  'Global Aerospace', 'SCOR space', 'Tokio Marine space',
  'Aon space', 'Marsh space', 'Hiscox space',
  'Viasat claim', 'anomaly insurance', 'coverage space',
  'reinsurance satellite', 'underwriting space',
];

const RESOURCE_KEYWORDS = [
  'space mining', 'asteroid mining', 'lunar mining',
  'in-space manufacturing', 'space resources', 'ISRU',
  'in-situ resource', 'space commodity', 'orbital manufacturing',
  'launch cost', 'cost per kilogram', 'cost per kg',
  'propellant depot', 'fuel depot', 'orbital refueling',
  'space materials', 'radiation hardened', 'space-grade',
  'rare earth', 'titanium aerospace', 'carbon fiber aerospace',
  'platinum group', 'helium-3', 'xenon propellant',
  'water ice moon', 'regolith', 'space economy resources',
  'Starship cost', 'reusable rocket cost',
];

interface ModuleNewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  category: string;
  matchedKeywords: string[];
}

async function fetchModuleNews(
  keywords: string[],
  module: string,
  section: string,
  contentKey: string,
  lookbackDays: number = 14,
  maxArticles: number = 15,
): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const articles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: cutoff },
        OR: keywords.map((kw) => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { summary: { contains: kw, mode: 'insensitive' as const } },
          ],
        })),
      },
      orderBy: { publishedAt: 'desc' },
      take: maxArticles,
      select: {
        id: true,
        title: true,
        summary: true,
        source: true,
        url: true,
        imageUrl: true,
        publishedAt: true,
        category: true,
      },
    });

    if (articles.length > 0) {
      const newsData: ModuleNewsArticle[] = articles.map((a) => {
        const text = `${a.title} ${a.summary || ''}`.toLowerCase();
        const matched = keywords.filter((kw) => text.includes(kw.toLowerCase()));
        return {
          id: a.id,
          title: a.title,
          summary: a.summary || '',
          source: a.source,
          url: a.url,
          imageUrl: a.imageUrl,
          publishedAt: a.publishedAt.toISOString(),
          category: a.category,
          matchedKeywords: matched.slice(0, 3),
        };
      });

      await upsertContent(contentKey, module, section, newsData, {
        sourceType: 'api',
        sourceUrl: 'internal-news-db',
      });
    }

    logger.info(`[${module}] Related news compilation complete`, {
      articlesFound: articles.length,
    });

    return articles.length;
  } catch (error) {
    logger.error(`[${module}] Related news compilation failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

async function fetchModuleBlogPosts(
  keywords: string[],
  module: string,
  section: string,
  contentKey: string,
  lookbackDays: number = 30,
  maxPosts: number = 10,
): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const posts = await prisma.blogPost.findMany({
      where: {
        publishedAt: { gte: cutoff },
        OR: keywords.map((kw) => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { excerpt: { contains: kw, mode: 'insensitive' as const } },
          ],
        })),
      },
      orderBy: { publishedAt: 'desc' },
      take: maxPosts,
      select: {
        id: true,
        title: true,
        excerpt: true,
        url: true,
        publishedAt: true,
        topic: true,
        source: { select: { name: true, slug: true } },
      },
    });

    if (posts.length > 0) {
      const blogData = posts.map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: p.excerpt || '',
        url: p.url,
        publishedAt: p.publishedAt.toISOString(),
        topic: p.topic,
        sourceName: p.source?.name || 'Unknown',
      }));

      await upsertContent(contentKey, module, section, blogData, {
        sourceType: 'api',
        sourceUrl: 'internal-blog-db',
      });
    }

    logger.info(`[${module}] Related blog posts compilation complete`, {
      postsFound: posts.length,
    });

    return posts.length;
  } catch (error) {
    logger.error(`[${module}] Related blog posts compilation failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ── Public API ──────────────────────────────────────────

export async function fetchInsuranceRelatedNews(): Promise<{ news: number; blogs: number }> {
  const news = await fetchModuleNews(
    INSURANCE_KEYWORDS,
    'space-insurance',
    'related-news',
    'space-insurance:related-news',
  );
  const blogs = await fetchModuleBlogPosts(
    INSURANCE_KEYWORDS,
    'space-insurance',
    'related-blogs',
    'space-insurance:related-blogs',
  );
  return { news, blogs };
}

export async function fetchResourceExchangeRelatedNews(): Promise<{ news: number; blogs: number }> {
  const news = await fetchModuleNews(
    RESOURCE_KEYWORDS,
    'resource-exchange',
    'related-news',
    'resource-exchange:related-news',
  );
  const blogs = await fetchModuleBlogPosts(
    RESOURCE_KEYWORDS,
    'resource-exchange',
    'related-blogs',
    'resource-exchange:related-blogs',
  );
  return { news, blogs };
}
