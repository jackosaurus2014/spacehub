export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';
import { sendDailyDigest, filterSubscribersByPreferences } from '@/lib/newsletter/email-service';
import {
  generateWeeklyDigestEmail,
  generateWeeklyDigestPlainText,
  type WeeklyDigestData,
  type WeeklyLaunch,
  type WeeklyMarketMover,
  type WeeklyTopStory,
  type WeeklyFeaturedArticle,
  type WeeklyStatHighlight,
} from '@/lib/newsletter/weekly-digest-template';
import { BLOG_POSTS } from '@/lib/blog-content';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a date range label like "March 17–21, 2026" */
function formatWeekLabel(start: Date, end: Date): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const startMonth = monthNames[start.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay}\u2013${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}, ${year}`;
}

/** Compute a simple issue number: weeks since a fixed epoch (2026-01-02, a Friday). */
function computeIssueNumber(): number {
  const epoch = new Date('2026-01-02T00:00:00Z');
  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((now.getTime() - epoch.getTime()) / weekMs) + 1);
}

/** Map SpaceEvent status to a WeeklyLaunch outcome. */
function mapOutcome(status: string): WeeklyLaunch['outcome'] {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'success';
    case 'failure':
    case 'failed':
      return 'failure';
    case 'partial':
    case 'partial_failure':
      return 'partial';
    default:
      return 'upcoming';
  }
}

// ---------------------------------------------------------------------------
// POST /api/newsletter/send-weekly-digest
// ---------------------------------------------------------------------------

/**
 * Aggregates the past week's launches, top stories, market movers, featured
 * blog content, and week-ahead items, then renders the weekly digest template
 * and sends it to all subscribed users via Resend.
 *
 * Secured by CRON_SECRET — called by the cron scheduler on Fridays at 9am UTC.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    logger.info('Weekly digest: aggregating data', {
      periodStart: sevenDaysAgo.toISOString(),
      periodEnd: now.toISOString(),
    });

    // -----------------------------------------------------------------------
    // 1. Recent launches (SpaceEvent type=launch from last 7 days)
    // -----------------------------------------------------------------------
    const recentLaunches = await prisma.spaceEvent.findMany({
      where: {
        type: 'launch',
        launchDate: { gte: sevenDaysAgo, lte: now },
      },
      orderBy: { launchDate: 'desc' },
      take: 10,
      select: {
        name: true,
        rocket: true,
        mission: true,
        agency: true,
        status: true,
        launchDate: true,
      },
    });

    const launches: WeeklyLaunch[] = recentLaunches.map((e) => ({
      vehicle: e.rocket || 'Unknown Vehicle',
      mission: e.mission || e.name,
      provider: e.agency || 'Unknown Provider',
      date: e.launchDate
        ? e.launchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'TBD',
      outcome: mapOutcome(e.status),
    }));

    // -----------------------------------------------------------------------
    // 2. Market movers (public companies with biggest price changes)
    // -----------------------------------------------------------------------
    const marketMoversRaw = await prisma.companyProfile.findMany({
      where: {
        isPublic: true,
        ticker: { not: null },
        priceChange24h: { not: null },
      },
      orderBy: { priceChange24h: 'desc' },
      take: 10,
      select: {
        ticker: true,
        name: true,
        priceChange24h: true,
        sector: true,
      },
    });

    // Take the top 3 gainers and top 3 losers for variety
    const gainers = marketMoversRaw.filter((c) => (c.priceChange24h ?? 0) > 0).slice(0, 3);
    const losers = marketMoversRaw
      .filter((c) => (c.priceChange24h ?? 0) < 0)
      .sort((a, b) => (a.priceChange24h ?? 0) - (b.priceChange24h ?? 0))
      .slice(0, 3);

    const marketMovers: WeeklyMarketMover[] = [...gainers, ...losers].map((c) => ({
      ticker: c.ticker || '',
      name: c.name,
      change: (c.priceChange24h ?? 0) >= 0
        ? `+${(c.priceChange24h ?? 0).toFixed(1)}%`
        : `${(c.priceChange24h ?? 0).toFixed(1)}%`,
      catalyst: c.sector ? `Sector: ${c.sector}` : undefined,
    }));

    // -----------------------------------------------------------------------
    // 3. Top stories (news articles from last 7 days)
    // -----------------------------------------------------------------------
    const recentNews = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: sevenDaysAgo, lte: now },
      },
      orderBy: { publishedAt: 'desc' },
      take: 8,
      select: {
        title: true,
        summary: true,
        url: true,
        source: true,
        category: true,
      },
    });

    const topStories: WeeklyTopStory[] = recentNews.map((a) => ({
      title: a.title,
      summary: a.summary || '',
      url: a.url,
      source: a.source,
      category: a.category,
    }));

    // -----------------------------------------------------------------------
    // 4. Featured blog articles (most recent from BLOG_POSTS)
    // -----------------------------------------------------------------------
    const sortedBlogs = [...BLOG_POSTS]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 2);

    const featuredArticles: WeeklyFeaturedArticle[] = sortedBlogs.map((b) => ({
      title: b.title,
      excerpt: b.excerpt,
      slug: b.slug,
      category: b.category,
      readTime: b.readingTime,
    }));

    // -----------------------------------------------------------------------
    // 5. Stat highlights
    // -----------------------------------------------------------------------
    const totalNewsCount = await prisma.newsArticle.count({
      where: { publishedAt: { gte: sevenDaysAgo, lte: now } },
    });

    const totalLaunchCount = await prisma.spaceEvent.count({
      where: {
        type: 'launch',
        launchDate: { gte: sevenDaysAgo, lte: now },
      },
    });

    const totalCompaniesTracked = await prisma.companyProfile.count({
      where: { status: 'active' },
    });

    const statHighlights: WeeklyStatHighlight[] = [
      { label: 'Launches', value: String(totalLaunchCount), context: 'this week' },
      { label: 'News Articles', value: String(totalNewsCount), context: 'tracked this week' },
      { label: 'Companies', value: String(totalCompaniesTracked), context: 'actively monitored' },
    ];

    // -----------------------------------------------------------------------
    // 6. Week ahead (upcoming launches + events in next 7 days)
    // -----------------------------------------------------------------------
    const upcomingEvents = await prisma.spaceEvent.findMany({
      where: {
        launchDate: { gt: now, lte: sevenDaysAhead },
        status: { in: ['upcoming', 'tbd', 'in_progress'] },
      },
      orderBy: { launchDate: 'asc' },
      take: 8,
      select: {
        name: true,
        agency: true,
        launchDate: true,
        type: true,
      },
    });

    const weekAhead: string[] = upcomingEvents.map((e) => {
      const dateStr = e.launchDate
        ? e.launchDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : 'TBD';
      const provider = e.agency ? ` (${e.agency})` : '';
      return `${dateStr}: ${e.name}${provider}`;
    });

    // -----------------------------------------------------------------------
    // 7. Assemble digest data
    // -----------------------------------------------------------------------
    const weekLabel = formatWeekLabel(sevenDaysAgo, now);
    const issueNumber = computeIssueNumber();

    const digestData: WeeklyDigestData = {
      weekLabel,
      issueNumber,
      editorNote:
        launches.length > 0
          ? `A busy week in space with ${launches.length} launch${launches.length === 1 ? '' : 'es'} and ${topStories.length} top stories. Here\u2019s your roundup.`
          : `Here\u2019s your weekly space industry intelligence briefing with ${topStories.length} top stories and the latest market moves.`,
      launches,
      marketMovers,
      topStories,
      featuredArticles,
      statHighlights,
      weekAhead: weekAhead.length > 0 ? weekAhead : undefined,
    };

    // -----------------------------------------------------------------------
    // 8. Render email
    // -----------------------------------------------------------------------
    const html = generateWeeklyDigestEmail(digestData);
    const plain = generateWeeklyDigestPlainText(digestData);
    const subject = `SpaceNexus Weekly Digest #${issueNumber} \u2014 ${weekLabel}`;

    // -----------------------------------------------------------------------
    // 9. Save digest record
    // -----------------------------------------------------------------------
    const digestDate = new Date();
    digestDate.setHours(0, 0, 0, 0);

    const digest = await prisma.dailyDigest.create({
      data: {
        digestDate,
        subject,
        htmlContent: html,
        plainContent: plain,
        featureArticles: JSON.stringify(featuredArticles),
        newsArticleCount: topStories.length,
        categoriesIncluded: JSON.stringify(['launches', 'market', 'news', 'blog']),
        status: 'sending',
        sendStartedAt: new Date(),
        aiModel: null,
      },
    });

    // -----------------------------------------------------------------------
    // 10. Get subscribers and send
    // -----------------------------------------------------------------------
    const allSubscribers = await prisma.newsletterSubscriber.findMany({
      where: {
        verified: true,
        unsubscribedAt: null,
      },
      select: {
        email: true,
        unsubscribeToken: true,
        userId: true,
      },
    });

    const subscribers = await filterSubscribersByPreferences(allSubscribers, 'news');

    if (subscribers.length === 0) {
      await prisma.dailyDigest.update({
        where: { id: digest.id },
        data: { status: 'sent', sendCompletedAt: new Date(), recipientCount: 0 },
      });
      logger.info('Weekly digest: no subscribers to send to', { digestId: digest.id });
      return NextResponse.json({
        success: true,
        message: 'No subscribers to send to',
        digestId: digest.id,
      });
    }

    const sendResult = await sendDailyDigest(subscribers, html, plain, subject);

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

    logger.info('Weekly digest sent', {
      digestId: digest.id,
      issueNumber,
      launches: launches.length,
      marketMovers: marketMovers.length,
      topStories: topStories.length,
      featuredArticles: featuredArticles.length,
      sentTo: sendResult.sentCount,
      failed: sendResult.failedCount,
    });

    return NextResponse.json({
      success: true,
      digestId: digest.id,
      issueNumber,
      content: {
        launches: launches.length,
        marketMovers: marketMovers.length,
        topStories: topStories.length,
        featuredArticles: featuredArticles.length,
        weekAhead: weekAhead.length,
        statHighlights: statHighlights.length,
      },
      sent: sendResult.sentCount,
      failed: sendResult.failedCount,
    });
  } catch (error) {
    logger.error('Weekly digest send failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to send weekly digest');
  }
}
