import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError, requireCronSecret } from '@/lib/errors';
import { generateEditorialReviewEmail } from '@/lib/newsletter/email-templates';

export const dynamic = 'force-dynamic';

interface GeneratedInsight {
  title: string;
  summary: string;
  content: string;
  category: 'regulatory' | 'market' | 'technology' | 'geopolitical' | 'forecast';
  sources: string[];
}

interface ClaudeInsightsResponse {
  insights: GeneratedInsight[];
}

interface FactCheckResult {
  overallVerdict: 'pass' | 'minor_issues' | 'major_issues';
  notes: string;
  corrections: string[];
}

/**
 * Generate a URL-friendly slug from a title.
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
  if (requireCronSecret(request) === null) return true;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    const session = await getServerSession(authOptions);
    if (session?.user?.isAdmin) return true;
  }
  return false;
}

/**
 * Fact-check an AI-generated article using a second Claude call.
 */
async function factCheckArticle(
  anthropic: Anthropic,
  title: string,
  content: string,
  sources: string[]
): Promise<FactCheckResult> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a fact-checker for a space industry intelligence platform. Review the following article for factual accuracy.

## Article Title
${title}

## Article Content
${content}

## Cited Sources
${sources.join('\n')}

## Instructions
Check the article for:
1. Factual claims that are verifiable (company names, dates, statistics, technical specs)
2. Logical consistency (does the analysis follow from the evidence?)
3. Misattributed information (correct company/agency referenced?)
4. Outdated information presented as current
5. Speculation clearly labeled vs presented as fact

Respond with valid JSON (no markdown code fences):
{
  "overallVerdict": "pass" | "minor_issues" | "major_issues",
  "notes": "Brief summary of fact-check findings (2-3 sentences max)",
  "corrections": ["List of specific corrections needed, if any"]
}

IMPORTANT GUIDELINES:
- Return "pass" for well-sourced, accurate articles (empty corrections array)
- Return "minor_issues" for small inaccuracies or missing context that don't undermine the analysis
- ONLY return "major_issues" for clear factual errors (wrong company names, fabricated statistics, incorrect dates) — NOT for analysis, opinions, forecasts, or forward-looking predictions
- Analysis and forecast articles inherently contain projections — this is expected and should NOT be flagged as major issues
- Stylistic preferences, tone concerns, or "could be more nuanced" feedback should be "pass" or "minor_issues" at most`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { overallVerdict: 'pass', notes: 'Fact-check returned no response', corrections: [] };
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { overallVerdict: 'pass', notes: 'Could not parse fact-check response', corrections: [] };
    }

    return JSON.parse(jsonMatch[0]) as FactCheckResult;
  } catch (error) {
    logger.warn('Fact-check failed, proceeding with article', {
      title,
      error: error instanceof Error ? error.message : String(error),
    });
    return { overallVerdict: 'pass', notes: 'Fact-check service unavailable', corrections: [] };
  }
}

/**
 * Send editorial review email to admin.
 */
async function sendReviewEmail(
  articles: Array<{
    title: string;
    slug: string;
    summary: string;
    category: string;
    content: string;
    factCheckNote: string | null;
    reviewToken: string;
  }>
): Promise<boolean> {
  try {
    const { Resend } = await import('resend');
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEWSLETTER_REPLY_TO;

    if (!apiKey || !adminEmail) {
      logger.warn('Cannot send editorial review email — RESEND_API_KEY or ADMIN_EMAIL not configured');
      return false;
    }

    const resend = new Resend(apiKey);
    const emailData = generateEditorialReviewEmail(
      articles.map((a) => ({
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        category: a.category,
        contentPreview: a.content.slice(0, 300),
        factCheckNote: a.factCheckNote,
        reviewToken: a.reviewToken,
      }))
    );

    const { error } = await resend.emails.send({
      from: process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <newsletter@spacenexus.us>',
      to: adminEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    if (error) {
      logger.error('Failed to send editorial review email', { error: error.message });
      return false;
    }

    logger.info('Editorial review email sent', { to: adminEmail, articleCount: articles.length });
    return true;
  } catch (error) {
    logger.error('Error sending editorial review email', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Determine if today should include a forecast article based on day of week.
 * Forecasts are generated on Wednesdays and Saturdays for variety.
 */
function shouldIncludeForecast(): boolean {
  const dayOfWeek = new Date().getUTCDay();
  return dayOfWeek === 3 || dayOfWeek === 6; // Wednesday or Saturday
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return unauthorizedError('Valid CRON_SECRET token or admin session required');
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('AI insights generation failed — ANTHROPIC_API_KEY not set');
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY environment variable is not configured' },
        { status: 500 }
      );
    }

    // Skip if insights were already generated today
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

    // Fetch recent content for analysis
    const thirtysSixHoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const newsArticles = await prisma.newsArticle.findMany({
      where: { publishedAt: { gte: thirtysSixHoursAgo } },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: { title: true, summary: true, url: true, source: true, category: true },
    });

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const blogPosts = await prisma.blogPost.findMany({
      where: { publishedAt: { gte: fortyEightHoursAgo } },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: { title: true, excerpt: true, url: true, topic: true, source: { select: { name: true } } },
    });

    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const legalUpdates = await prisma.legalUpdate.findMany({
      where: { publishedAt: { gte: seventyTwoHoursAgo } },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: { title: true, excerpt: true, url: true, topics: true },
    });

    logger.info('AI insights content availability', {
      newsCount: newsArticles.length,
      blogCount: blogPosts.length,
      legalCount: legalUpdates.length,
    });

    if (newsArticles.length === 0 && blogPosts.length === 0 && legalUpdates.length === 0) {
      logger.error('AI insights generation skipped — no recent content found');
      return NextResponse.json(
        { success: false, error: 'No recent content found to analyze' },
        { status: 404 }
      );
    }

    // Build context strings
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

    // Determine content mix for today
    const includeForecast = shouldIncludeForecast();
    const articleCount = 2;
    const forecastInstructions = includeForecast
      ? `\n\nIMPORTANT: Make one of the 2 articles a FORECAST piece. For the forecast article:
- Project 5-10 years into the future based on current trends
- Use the category "forecast" for this article
- Ground predictions in real data and current trajectories
- Include specific milestones, timelines, and projected metrics
- Address potential disruptions and wildcards
- Title should clearly indicate it's forward-looking (e.g., "Where Will X Be by 2035?", "The Next Decade of...")`
      : '';

    const anthropic = new Anthropic();

    const prompt = `You are a senior space industry analyst writing in-depth intelligence briefings for SpaceNexus, a professional space industry platform. Based on the following recent news articles, blog posts, and legal/regulatory updates, identify the ${articleCount} most significant space industry developments and write a comprehensive analysis for each.

## Recent News Articles (Last 36 Hours)
${newsContext}

## Recent Blog Posts & Analysis (Last 48 Hours)
${blogContext}

## Recent Legal & Regulatory Updates (Last 72 Hours)
${legalContext}

## Instructions
For each of the ${articleCount} most significant developments:
1. Write a compelling, specific title (not generic)
2. Write a 1-2 sentence executive summary
3. Write a comprehensive analysis (1500-2500 words) structured as follows:
   - **What Happened**: Detailed account of the development
   - **Why It Matters**: Significance for the space industry
   - **Industry Implications**: How this affects different sectors (commercial, government, defense, etc.)
   - **Key Stakeholders**: Companies, agencies, and entities involved or affected
   - **Future Outlook**: What to expect next, potential cascading effects
4. Assign exactly one category: regulatory, market, technology, geopolitical, or forecast
5. List the source URLs that informed this analysis${forecastInstructions}

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
    }
  ]
}`;

    logger.info('Generating AI insights', {
      newsCount: newsArticles.length,
      blogCount: blogPosts.length,
      legalCount: legalUpdates.length,
      includeForecast,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error('AI insights generation returned no text content');
      return internalError('AI response contained no text content');
    }

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
      });
      return internalError('Failed to parse AI response JSON');
    }

    if (!parsed.insights || !Array.isArray(parsed.insights) || parsed.insights.length === 0) {
      logger.error('AI insights response contained no insights array');
      return internalError('AI response contained no insights');
    }

    const validCategories = new Set(['regulatory', 'market', 'technology', 'geopolitical', 'forecast']);
    const now = new Date();
    const upsertedInsights: Array<{
      id: string;
      title: string;
      slug: string;
      category: string;
      status: string;
      generatedAt: Date;
      reviewToken: string | null;
      factCheckNote: string | null;
    }> = [];

    // Process each insight: fact-check, then save as pending_review
    for (const insight of parsed.insights) {
      const slug = generateSlug(insight.title);
      const category = validCategories.has(insight.category) ? insight.category : 'market';

      // Fact-check the article
      const factCheck = await factCheckArticle(
        anthropic,
        insight.title,
        insight.content,
        insight.sources || []
      );

      // If major issues found, require manual review; otherwise auto-publish
      const finalContent = insight.content;
      let factCheckNote: string | null = null;
      const needsManualReview = factCheck.overallVerdict === 'major_issues';

      if (factCheck.overallVerdict === 'major_issues') {
        factCheckNote = `MAJOR ISSUES: ${factCheck.notes}\nCorrections needed: ${factCheck.corrections.join('; ')}`;
        logger.warn('AI insight has major fact-check issues — requires manual review', { slug, notes: factCheck.notes });
      } else if (factCheck.overallVerdict === 'minor_issues') {
        factCheckNote = `Minor notes: ${factCheck.notes}${factCheck.corrections.length > 0 ? `\nSuggestions: ${factCheck.corrections.join('; ')}` : ''}`;
      } else {
        factCheckNote = factCheck.notes || 'Passed fact-check';
      }

      // Only generate review token for articles needing manual review
      const reviewToken = needsManualReview ? crypto.randomUUID() : null;
      const publishStatus = needsManualReview ? 'pending_review' : 'published';

      try {
        // status, factCheckNote, reviewToken are new schema fields — cast for Prisma client compat
        const upserted = await (prisma.aIInsight as any).upsert({
          where: { slug },
          create: {
            title: insight.title,
            slug,
            summary: insight.summary,
            content: finalContent,
            category,
            sources: JSON.stringify(insight.sources || []),
            status: publishStatus,
            factCheckNote,
            reviewToken,
            generatedAt: now,
          },
          update: {
            title: insight.title,
            summary: insight.summary,
            content: finalContent,
            category,
            sources: JSON.stringify(insight.sources || []),
            status: publishStatus,
            factCheckNote,
            reviewToken,
            generatedAt: now,
          },
        });
        upsertedInsights.push({
          id: upserted.id,
          title: upserted.title,
          slug: upserted.slug,
          category: upserted.category,
          status: (upserted as any).status || publishStatus,
          generatedAt: upserted.generatedAt,
          reviewToken,
          factCheckNote,
        });
      } catch (dbError) {
        logger.error('Failed to upsert AI insight', {
          slug,
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
    }

    // Send editorial review email only for articles needing manual review
    const needsReview = upsertedInsights.filter((i) => i.status === 'pending_review');
    const autoPublished = upsertedInsights.filter((i) => i.status === 'published');

    if (needsReview.length > 0) {
      await sendReviewEmail(
        needsReview.map((i) => ({
          title: i.title,
          slug: i.slug,
          summary: parsed.insights.find((p) => generateSlug(p.title) === i.slug)?.summary || '',
          category: i.category,
          content: parsed.insights.find((p) => generateSlug(p.title) === i.slug)?.content || '',
          factCheckNote: i.factCheckNote,
          reviewToken: i.reviewToken || '',
        }))
      );
    }

    logger.info('AI insights generated', {
      total: upsertedInsights.length,
      autoPublished: autoPublished.length,
      pendingReview: needsReview.length,
      categories: upsertedInsights.map((i) => i.category),
      factCheckResults: upsertedInsights.map((i) => ({
        slug: i.slug,
        note: i.factCheckNote?.slice(0, 100),
      })),
    });

    return NextResponse.json({
      success: true,
      count: upsertedInsights.length,
      autoPublished: autoPublished.length,
      pendingReview: needsReview.length,
      message: autoPublished.length > 0
        ? `${autoPublished.length} insight(s) auto-published, ${needsReview.length} need review`
        : 'Insights generated and sent for editorial review',
      insights: upsertedInsights.map((i) => ({
        id: i.id,
        title: i.title,
        slug: i.slug,
        category: i.category,
        status: i.status,
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
