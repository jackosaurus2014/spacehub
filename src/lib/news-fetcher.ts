import prisma from './db';

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
  launches: ['launch', 'liftoff', 'rocket', 'falcon', 'starship', 'atlas', 'delta', 'ariane', 'soyuz'],
  missions: ['mission', 'mars', 'moon', 'lunar', 'asteroid', 'probe', 'rover', 'artemis', 'apollo', 'voyager'],
  companies: ['spacex', 'blue origin', 'boeing', 'lockheed', 'northrop', 'rocket lab', 'virgin', 'relativity'],
  earnings: ['earnings', 'revenue', 'profit', 'financial', 'stock', 'investor', 'quarterly', 'billion', 'million'],
  development: ['develop', 'test', 'prototype', 'engine', 'technology', 'innovation', 'research'],
  policy: ['nasa', 'faa', 'congress', 'regulation', 'law', 'policy', 'government', 'budget', 'administration'],
};

function categorizeArticle(title: string, summary: string): string {
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

export async function fetchSpaceflightNews(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.spaceflightnewsapi.net/v4/articles/?limit=50&ordering=-published_at',
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch news: ${response.status}`);
    }

    const data = await response.json();
    const articles: SpaceflightNewsArticle[] = data.results;

    let savedCount = 0;

    for (const article of articles) {
      const category = categorizeArticle(article.title, article.summary);

      try {
        await prisma.newsArticle.upsert({
          where: { url: article.url },
          update: {
            title: article.title,
            summary: article.summary,
            source: article.news_site,
            category,
            imageUrl: article.image_url,
            publishedAt: new Date(article.published_at),
          },
          create: {
            title: article.title,
            summary: article.summary,
            url: article.url,
            source: article.news_site,
            category,
            imageUrl: article.image_url,
            publishedAt: new Date(article.published_at),
          },
        });
        savedCount++;
      } catch {
        // Skip duplicates or errors
        continue;
      }
    }

    return savedCount;
  } catch (error) {
    console.error('Error fetching spaceflight news:', error);
    throw error;
  }
}

export async function getNewsArticles(options?: {
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const { category, limit = 20, offset = 0 } = options || {};

  const where = category ? { category } : {};

  const articles = await prisma.newsArticle.findMany({
    where,
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
