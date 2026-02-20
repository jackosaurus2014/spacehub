import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError, requireCronSecret } from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface GeneratedInsight {
  title: string;
  summary: string;
  content: string;
  category: 'regulatory' | 'market' | 'technology' | 'geopolitical';
  sources: string[];
}

interface ClaudeInsightsResponse {
  insights: GeneratedInsight[];
}

/**
 * Generate a URL-friendly slug from a title.
 * Lowercases, replaces non-alphanumeric characters with hyphens,
 * collapses multiple hyphens, trims, and truncates to 80 characters.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Verify that the request is authorized via either:
 * 1. A Bearer token matching CRON_SECRET
 * 2. An authenticated admin session
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Timing-safe Bearer token check for cron/automated calls
  if (requireCronSecret(request) === null) return true;

  // Fall back to admin session (only when no Bearer token was attempted)
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    const session = await getServerSession(authOptions);
    if (session?.user?.isAdmin) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Authorization check
    if (!(await isAuthorized(request))) {
      return unauthorizedError('Valid CRON_SECRET token or admin session required');
    }

    // Check for ANTHROPIC_API_KEY early to fail fast with a clear message
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('AI insights generation failed — ANTHROPIC_API_KEY not set');
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY environment variable is not configured' },
        { status: 500 }
      );
    }

    // Skip if insights were already generated today (avoids duplicate work on retry)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const existingToday = await prisma.aIInsight.count({
      where: { generatedAt: { gte: todayStart } },
    });
    if (existingToday > 0) {
      logger.info('AI insights already generated today, skipping', { count: existingToday });
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `${existingToday} insights already generated today`,
      });
    }

    // Fetch news articles from the last 36 hours (wider window for timezone resilience)
    const thirtysSixHoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const newsArticles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: thirtysSixHoursAgo },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: {
        title: true,
        summary: true,
        url: true,
        source: true,
        category: true,
      },
    });

    // Fetch blog posts from the last 48 hours (blogs publish less frequently)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const blogPosts = await prisma.blogPost.findMany({
      where: {
        publishedAt: { gte: fortyEightHoursAgo },
      },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: {
        title: true,
        excerpt: true,
        url: true,
        topic: true,
        source: { select: { name: true } },
      },
    });

    // Fetch legal updates from the last 72 hours
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const legalUpdates = await prisma.legalUpdate.findMany({
      where: {
        publishedAt: { gte: seventyTwoHoursAgo },
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        title: true,
        excerpt: true,
        url: true,
        topics: true,
      },
    });

    logger.info('AI insights content availability', {
      newsCount: newsArticles.length,
      blogCount: blogPosts.length,
      legalCount: legalUpdates.length,
    });

    if (newsArticles.length === 0 && blogPosts.length === 0 && legalUpdates.length === 0) {
      logger.error('AI insights generation skipped — no recent content found in any source', {
        newsWindow: '36h',
        blogWindow: '48h',
        legalWindow: '72h',
      });
      return NextResponse.json(
        { success: false, error: 'No recent news articles, blog posts, or legal updates found to analyze' },
        { status: 404 }
      );
    }

    // Build context strings for the prompt
    const newsContext = newsArticles
      .map(
        (a, i) =>
          `${i + 1}. [${a.category}] ${a.title}\n   Source: ${a.source}\n   Summary: ${a.summary || 'N/A'}\n   URL: ${a.url}`
      )
      .join('\n\n');

    const blogContext =
      blogPosts.length > 0
        ? blogPosts
            .map(
              (b, i) =>
                `${i + 1}. [${b.topic || 'general'}] ${b.title}\n   Source: ${b.source?.name || 'Unknown'}\n   Excerpt: ${b.excerpt || 'N/A'}\n   URL: ${b.url}`
            )
            .join('\n\n')
        : 'No recent blog posts available.';

    const legalContext =
      legalUpdates.length > 0
        ? legalUpdates
            .map(
              (u, i) =>
                `${i + 1}. ${u.title}\n   Topics: ${u.topics}\n   Excerpt: ${u.excerpt || 'N/A'}\n   URL: ${u.url}`
            )
            .join('\n\n')
        : 'No recent legal updates available.';

    // Call Claude to generate insights
    const anthropic = new Anthropic();

    const prompt = `You are a senior space industry analyst writing in-depth intelligence briefings for SpaceNexus, a professional space industry platform. Based on the following recent news articles, blog posts, and legal/regulatory updates, identify the 2 most significant space industry developments and write a comprehensive analysis for each.

## Recent News Articles (Last 24 Hours)
${newsContext}

## Recent Blog Posts & Analysis (Last 24 Hours)
${blogContext}

## Recent Legal & Regulatory Updates (Last 48 Hours)
${legalContext}

## Instructions
For each of the 2 most significant developments:
1. Write a compelling, specific title (not generic)
2. Write a 1-2 sentence executive summary
3. Write a comprehensive analysis (1500-2500 words) structured as follows:
   - **What Happened**: Detailed account of the development
   - **Why It Matters**: Significance for the space industry
   - **Industry Implications**: How this affects different sectors (commercial, government, defense, etc.)
   - **Key Stakeholders**: Companies, agencies, and entities involved or affected
   - **Future Outlook**: What to expect next, potential cascading effects
4. Assign exactly one category: regulatory, market, technology, or geopolitical
5. List the source URLs that informed this analysis

Format the article content using proper Markdown:
- Use ## for main section headers and ### for sub-sections
- Use bullet lists (- item) for key points and enumerations
- Use numbered lists (1. item) for sequential steps or rankings
- Use **bold** for key terms, company names, and important figures
- Use > for key takeaways or notable quotes
- End the article with a ## Key Takeaways section containing 3-5 bullet points summarizing the main insights
- Use --- to separate major sections when appropriate
- Keep paragraphs focused and concise (3-5 sentences each)

The analysis should be professional, data-driven, and provide actionable intelligence. Avoid speculation without basis. Reference specific entities and facts from the source material.

Respond with valid JSON in this exact format (no markdown code fences):
{
  "insights": [
    {
      "title": "Specific, Compelling Title",
      "summary": "1-2 sentence executive summary.",
      "content": "Full analysis in markdown format (1500-2500 words)...",
      "category": "market",
      "sources": ["https://example.com/article1", "https://example.com/article2"]
    },
    {
      "title": "Second Insight Title",
      "summary": "1-2 sentence executive summary.",
      "content": "Full analysis in markdown format (1500-2500 words)...",
      "category": "technology",
      "sources": ["https://example.com/article3"]
    }
  ]
}`;

    logger.info('Generating AI insights', {
      newsCount: newsArticles.length,
      blogCount: blogPosts.length,
      legalCount: legalUpdates.length,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error('AI insights generation returned no text content');
      return internalError('AI response contained no text content');
    }

    // Parse JSON from response (handle potential markdown code fences)
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('AI insights generation returned no valid JSON', {
        responsePreview: textBlock.text.slice(0, 200),
      });
      return internalError('Failed to parse AI response');
    }

    let parsed: ClaudeInsightsResponse;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('Failed to parse AI insights JSON', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responsePreview: jsonMatch[0].slice(0, 200),
      });
      return internalError('Failed to parse AI response JSON');
    }

    if (!parsed.insights || !Array.isArray(parsed.insights) || parsed.insights.length === 0) {
      logger.error('AI insights response contained no insights array');
      return internalError('AI response contained no insights');
    }

    // Validate categories
    const validCategories = new Set(['regulatory', 'market', 'technology', 'geopolitical']);

    // Upsert insights into the database
    const now = new Date();
    const upsertedInsights = [];

    for (const insight of parsed.insights) {
      const slug = generateSlug(insight.title);
      const category = validCategories.has(insight.category) ? insight.category : 'market';

      try {
        const upserted = await prisma.aIInsight.upsert({
          where: { slug },
          create: {
            title: insight.title,
            slug,
            summary: insight.summary,
            content: insight.content,
            category,
            sources: JSON.stringify(insight.sources || []),
            generatedAt: now,
          },
          update: {
            title: insight.title,
            summary: insight.summary,
            content: insight.content,
            category,
            sources: JSON.stringify(insight.sources || []),
            generatedAt: now,
          },
        });
        upsertedInsights.push(upserted);
      } catch (dbError) {
        logger.error('Failed to upsert AI insight', {
          slug,
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
        // Continue with remaining insights even if one fails
      }
    }

    logger.info('AI insights generated successfully', {
      count: upsertedInsights.length,
      categories: upsertedInsights.map((i) => i.category),
      newsArticlesUsed: newsArticles.length,
      blogPostsUsed: blogPosts.length,
      legalUpdatesUsed: legalUpdates.length,
    });

    return NextResponse.json({
      success: true,
      count: upsertedInsights.length,
      insights: upsertedInsights.map((i) => ({
        id: i.id,
        title: i.title,
        slug: i.slug,
        category: i.category,
        generatedAt: i.generatedAt,
      })),
    });
  } catch (error) {
    logger.error('AI insights generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to generate AI insights');
  }
}
