import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError } from '@/lib/errors';

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
  // Check Bearer token first (for cron/automated calls)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Fall back to session-based admin check
  const session = await getServerSession(authOptions);
  if (session?.user?.isAdmin) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Authorization check
    if (!(await isAuthorized(request))) {
      return unauthorizedError('Valid CRON_SECRET token or admin session required');
    }

    // Fetch news articles from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newsArticles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: twentyFourHoursAgo },
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

    // Fetch legal updates from the last 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const legalUpdates = await prisma.legalUpdate.findMany({
      where: {
        publishedAt: { gte: fortyEightHoursAgo },
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

    if (newsArticles.length === 0 && legalUpdates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recent news articles or legal updates found to analyze' },
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

    const prompt = `You are a senior space industry analyst writing in-depth intelligence briefings for SpaceNexus, a professional space industry platform. Based on the following recent news articles and legal/regulatory updates, identify the 2 most significant space industry developments and write a comprehensive analysis for each.

## Recent News Articles (Last 24 Hours)
${newsContext}

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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
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
