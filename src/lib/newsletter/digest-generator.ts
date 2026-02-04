// Digest generator for newsletter system
// Aggregates yesterday's news and generates AI feature articles

import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { renderDigestEmail } from './email-templates';

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  category: string;
}

interface FeatureArticle {
  title: string;
  content: string;
}

interface CategorizedNews {
  [category: string]: {
    title: string;
    summary: string;
    url: string;
    source: string;
  }[];
}

interface DigestResult {
  success: boolean;
  digestId?: string;
  newsCount: number;
  categories: string[];
  featureArticles: FeatureArticle[];
  error?: string;
}

// Category display names
const CATEGORY_NAMES: { [key: string]: string } = {
  launches: 'Launches & Missions',
  missions: 'Space Missions',
  companies: 'Industry & Companies',
  technology: 'Technology',
  science: 'Science & Discovery',
  policy: 'Policy & Regulation',
  exploration: 'Space Exploration',
  satellites: 'Satellites & Communications',
  human_spaceflight: 'Human Spaceflight',
  astronomy: 'Astronomy',
  defense: 'Defense & Security',
  commercial: 'Commercial Space',
  general: 'General News',
};

export async function aggregateYesterdaysNews(): Promise<NewsItem[]> {
  // Get yesterday's date range
  const now = new Date();
  const yesterdayStart = new Date(now);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);

  const yesterdayEnd = new Date(now);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);

  // Fetch news articles from yesterday
  const articles = await prisma.newsArticle.findMany({
    where: {
      publishedAt: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50, // Limit to 50 articles for the digest
  });

  return articles.map((article) => ({
    title: article.title,
    summary: article.summary || '',
    url: article.url,
    source: article.source,
    category: article.category,
  }));
}

export async function generateFeatureArticles(
  news: NewsItem[]
): Promise<FeatureArticle[]> {
  if (news.length === 0) {
    return [];
  }

  const anthropic = new Anthropic();

  // Build context from news headlines and summaries
  const newsContext = news
    .slice(0, 30) // Use top 30 articles for context
    .map((item, i) => `${i + 1}. [${item.category}] ${item.title}\n   ${item.summary}`)
    .join('\n\n');

  const prompt = `You are a space industry analyst writing for a daily newsletter. Based on the following space industry news headlines from yesterday, write 2 short feature articles (200-300 words each) that analyze trends, provide insights, or connect multiple stories.

Each article should:
- Have a compelling, specific title
- Provide analysis or insight, not just summarize
- Be professional but accessible to space enthusiasts
- Reference specific news items when relevant
- Focus on what the news means for the industry

Today's News Headlines:
${newsContext}

Respond with valid JSON in this exact format:
{
  "articles": [
    {
      "title": "First Article Title",
      "content": "First article content (200-300 words)..."
    },
    {
      "title": "Second Article Title",
      "content": "Second article content (200-300 words)..."
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.error('No text content in AI response');
      return [];
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.articles || [];
  } catch (error) {
    console.error('Error generating feature articles:', error);
    return [];
  }
}

export function categorizeNews(news: NewsItem[]): CategorizedNews {
  const categorized: CategorizedNews = {};

  for (const item of news) {
    const category = item.category || 'general';
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push({
      title: item.title,
      summary: item.summary,
      url: item.url,
      source: item.source,
    });
  }

  // Sort categories by number of articles (descending)
  const sortedCategories = Object.keys(categorized).sort(
    (a, b) => categorized[b].length - categorized[a].length
  );

  // Rebuild object in sorted order with display names
  const sorted: CategorizedNews = {};
  for (const key of sortedCategories) {
    const displayName = CATEGORY_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1);
    sorted[displayName] = categorized[key];
  }

  return sorted;
}

export async function generateDailyDigest(): Promise<DigestResult> {
  const digestDate = new Date();
  digestDate.setDate(digestDate.getDate() - 1); // Yesterday
  digestDate.setHours(0, 0, 0, 0);

  try {
    // Check if digest already exists for this date
    const existing = await prisma.dailyDigest.findUnique({
      where: { digestDate },
    });

    if (existing && existing.status === 'sent') {
      return {
        success: false,
        error: 'Digest already sent for this date',
        newsCount: existing.newsArticleCount,
        categories: JSON.parse(existing.categoriesIncluded || '[]'),
        featureArticles: JSON.parse(existing.featureArticles || '[]'),
      };
    }

    // Aggregate yesterday's news
    const news = await aggregateYesterdaysNews();

    if (news.length === 0) {
      return {
        success: false,
        error: 'No news articles found for yesterday',
        newsCount: 0,
        categories: [],
        featureArticles: [],
      };
    }

    // Generate AI feature articles
    const featureArticles = await generateFeatureArticles(news);

    // Categorize news
    const categorizedNews = categorizeNews(news);
    const categories = Object.keys(categorizedNews);

    // Render email template
    const { html, plain, subject } = renderDigestEmail(
      digestDate,
      featureArticles,
      categorizedNews
    );

    // Save or update digest
    const digest = await prisma.dailyDigest.upsert({
      where: { digestDate },
      create: {
        digestDate,
        subject,
        htmlContent: html,
        plainContent: plain,
        featureArticles: JSON.stringify(featureArticles),
        newsArticleCount: news.length,
        categoriesIncluded: JSON.stringify(categories),
        status: 'draft',
        aiModel: 'claude-sonnet-4-20250514',
      },
      update: {
        subject,
        htmlContent: html,
        plainContent: plain,
        featureArticles: JSON.stringify(featureArticles),
        newsArticleCount: news.length,
        categoriesIncluded: JSON.stringify(categories),
        status: 'draft',
        aiModel: 'claude-sonnet-4-20250514',
      },
    });

    console.log(`Digest generated for ${digestDate.toISOString().split('T')[0]}: ${news.length} articles, ${featureArticles.length} features`);

    return {
      success: true,
      digestId: digest.id,
      newsCount: news.length,
      categories,
      featureArticles,
    };
  } catch (error) {
    console.error('Error generating daily digest:', error);
    return {
      success: false,
      error: String(error),
      newsCount: 0,
      categories: [],
      featureArticles: [],
    };
  }
}

export async function getLatestDigest() {
  return prisma.dailyDigest.findFirst({
    where: { status: 'draft' },
    orderBy: { digestDate: 'desc' },
  });
}
