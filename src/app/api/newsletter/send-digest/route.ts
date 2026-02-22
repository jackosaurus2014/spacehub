export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';
import { sendDailyDigest } from '@/lib/newsletter/email-service';
import { renderDigestEmail } from '@/lib/newsletter/email-templates';
import { generateFeatureArticles, categorizeNews } from '@/lib/newsletter/digest-generator';

/**
 * POST /api/newsletter/send-digest
 *
 * Sends the newsletter digest every few days (Mon/Thu).
 * Prioritizes AI-generated blogs/articles from SpaceNexus, then top 10 external news.
 * Covers the period since the last successfully sent newsletter.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    // 1. Find when the last newsletter was sent
    const lastSentDigest = await prisma.dailyDigest.findFirst({
      where: { status: 'sent' },
      orderBy: { sendCompletedAt: 'desc' },
      select: { sendCompletedAt: true, digestDate: true },
    });

    const periodStart = lastSentDigest?.sendCompletedAt || lastSentDigest?.digestDate
      || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // fallback: 3 days ago

    const periodEnd = new Date();

    logger.info('Newsletter digest: building content', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });

    // 2. Fetch AI-generated insights (published) from the period
    const aiInsights = await (prisma.aIInsight as any).findMany({
      where: {
        status: 'published',
        generatedAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });

    // 3. Fetch AI-generated blog posts from the period
    const aiBlogPosts = await prisma.blogPost.findMany({
      where: {
        publishedAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });

    // 4. Fetch top external news articles from the period (limit to 10)
    const newsArticles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });

    // 5. Build prioritized content: AI insights first, then blog posts, then news
    const siteContent = [
      ...aiInsights.map((a: any) => ({
        title: a.title,
        summary: a.summary || '',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us'}/ai-insights/${a.slug}`,
        source: 'SpaceNexus AI Analysis',
        category: a.category || 'analysis',
      })),
      ...aiBlogPosts.map((b: any) => ({
        title: b.title,
        summary: b.excerpt || '',
        url: b.url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us'}/blog`,
        source: 'SpaceNexus Blog',
        category: b.topic || 'blog',
      })),
    ];

    const externalNews = newsArticles.map((article) => ({
      title: article.title,
      summary: article.summary || '',
      url: article.url,
      source: article.source,
      category: article.category,
    }));

    // Combine: site content first (prioritized), then external news
    const allContent = [...siteContent, ...externalNews];

    if (allContent.length === 0) {
      logger.info('Newsletter digest: no content to send for period');
      return NextResponse.json({
        success: false,
        message: 'No content available for this period',
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
    }

    // 6. Generate AI feature analysis articles based on all content
    const featureArticles = await generateFeatureArticles(allContent);

    // 7. Categorize news for the email template
    const categorizedNews = categorizeNews(allContent);

    // 8. Render the email
    const digestDate = new Date();
    digestDate.setHours(0, 0, 0, 0);
    const { html, plain, subject } = renderDigestEmail(
      digestDate,
      featureArticles,
      categorizedNews
    );

    // 9. Save digest record
    const digest = await prisma.dailyDigest.create({
      data: {
        digestDate,
        subject: `${subject} (${siteContent.length} SpaceNexus articles + ${externalNews.length} industry news)`,
        htmlContent: html,
        plainContent: plain,
        featureArticles: JSON.stringify(featureArticles),
        newsArticleCount: allContent.length,
        categoriesIncluded: JSON.stringify(Object.keys(categorizedNews)),
        status: 'sending',
        sendStartedAt: new Date(),
        aiModel: 'claude-sonnet-4-20250514',
      },
    });

    // 10. Get verified subscribers and send
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: {
        verified: true,
        unsubscribedAt: null,
      },
      select: {
        email: true,
        unsubscribeToken: true,
      },
    });

    if (subscribers.length === 0) {
      await prisma.dailyDigest.update({
        where: { id: digest.id },
        data: { status: 'sent', sendCompletedAt: new Date(), recipientCount: 0 },
      });
      return NextResponse.json({
        success: true,
        message: 'No subscribers to send to',
        digestId: digest.id,
      });
    }

    const sendResult = await sendDailyDigest(subscribers, html, plain, digest.subject);

    await prisma.dailyDigest.update({
      where: { id: digest.id },
      data: {
        status: sendResult.success ? 'sent' : 'failed',
        sendCompletedAt: new Date(),
        recipientCount: sendResult.sentCount,
        failureCount: sendResult.failedCount,
        errorLog: sendResult.errors.length > 0 ? sendResult.errors.join('\n') : null,
      },
    });

    logger.info('Newsletter digest sent', {
      digestId: digest.id,
      siteContentCount: siteContent.length,
      externalNewsCount: externalNews.length,
      sentTo: sendResult.sentCount,
      failed: sendResult.failedCount,
    });

    return NextResponse.json({
      success: true,
      digestId: digest.id,
      content: {
        aiInsights: aiInsights.length,
        blogPosts: aiBlogPosts.length,
        externalNews: externalNews.length,
        featureArticles: featureArticles.length,
      },
      sent: sendResult.sentCount,
      failed: sendResult.failedCount,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
  } catch (error) {
    logger.error('Newsletter digest send failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to send newsletter digest');
  }
}
