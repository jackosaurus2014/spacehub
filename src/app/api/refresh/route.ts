import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { fetchSpaceflightNews } from '@/lib/news-fetcher';
import { fetchLaunchLibraryEvents } from '@/lib/events-fetcher';
import { fetchBlogPosts, initializeBlogSources } from '@/lib/blogs-fetcher';
import { initializeCompanies } from '@/lib/companies-data';
import { initializeResources } from '@/lib/resources-data';
import { initializeOpportunities } from '@/lib/opportunities-data';
import { initializeComplianceData } from '@/lib/compliance-data';
import { initializeSolarExplorationData } from '@/lib/solar-exploration-data';
import { initializeSpectrumData } from '@/lib/spectrum-data';
import { initializeSpaceInsuranceData } from '@/lib/space-insurance-data';
import { initializeWorkforceData } from '@/lib/workforce-data';
import { initializeSolarFlareData } from '@/lib/solar-flare-data';
import { initializeOrbitalData } from '@/lib/orbital-slots-data';
import { initializeLaunchWindowsData } from '@/lib/launch-windows-data';
import { initializeDebrisData } from '@/lib/debris-data';
import { generateDailyDigest } from '@/lib/newsletter/digest-generator';
import { sendDailyDigest } from '@/lib/newsletter/email-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const NEWS_STALE_THRESHOLD = 15; // minutes
const DAILY_STALE_THRESHOLD = 24 * 60; // minutes (24 hours)

async function refreshNews(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const newsCount = await fetchSpaceflightNews();
  results.news = `Refreshed ${newsCount} articles`;
  const eventsCount = await fetchLaunchLibraryEvents();
  results.events = `Refreshed ${eventsCount} events`;
  return results;
}

async function refreshDaily(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  await initializeBlogSources();
  const blogCount = await fetchBlogPosts();
  results.blogs = `Refreshed ${blogCount} blog posts`;

  await initializeCompanies();
  results.companies = 'Refreshed';

  await initializeResources();
  results.resources = 'Refreshed';

  await initializeOpportunities();
  results.opportunities = 'Refreshed';

  await initializeComplianceData();
  results.compliance = 'Refreshed';

  await initializeSolarExplorationData();
  results.solarExploration = 'Refreshed';

  await initializeSpectrumData();
  results.spectrum = 'Refreshed';

  await initializeSpaceInsuranceData();
  results.spaceInsurance = 'Refreshed';

  await initializeWorkforceData();
  results.workforce = 'Refreshed';

  await initializeSolarFlareData();
  results.solarFlares = 'Refreshed';

  await initializeOrbitalData();
  results.orbitalSlots = 'Refreshed';

  await initializeLaunchWindowsData();
  results.launchWindows = 'Refreshed';

  await initializeDebrisData();
  results.debris = 'Refreshed';

  // Generate and send newsletter digest
  try {
    const digestResult = await generateDailyDigest();
    if (digestResult.success) {
      results.newsletterDigest = `Generated with ${digestResult.newsCount} articles`;

      // Get verified subscribers and send
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

      if (subscribers.length > 0 && digestResult.digestId) {
        const digest = await prisma.dailyDigest.findUnique({
          where: { id: digestResult.digestId },
        });

        if (digest) {
          await prisma.dailyDigest.update({
            where: { id: digest.id },
            data: {
              status: 'sending',
              sendStartedAt: new Date(),
            },
          });

          const sendResult = await sendDailyDigest(
            subscribers,
            digest.htmlContent,
            digest.plainContent,
            digest.subject
          );

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

          results.newsletterSend = `Sent to ${sendResult.sentCount}/${subscribers.length} subscribers`;
        }
      } else {
        results.newsletterSend = 'No subscribers to send to';
      }
    } else {
      results.newsletterDigest = digestResult.error || 'Generation failed';
    }
  } catch (error) {
    logger.error('Newsletter error in refresh', { error: error instanceof Error ? error.message : String(error) });
    results.newsletterDigest = `Error: ${String(error)}`;
  }

  return results;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'news', 'daily', or null (both)

  const results: Record<string, string> = {};

  try {
    if (!type || type === 'news') {
      const newsResults = await refreshNews();
      Object.assign(results, newsResults);
    }

    if (!type || type === 'daily') {
      const dailyResults = await refreshDaily();
      Object.assign(results, dailyResults);
    }

    logger.info(`Data refresh completed (type=${type || 'all'})`, results);

    return NextResponse.json({
      success: true,
      message: 'Data refresh complete',
      type: type || 'all',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Refresh error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: String(error), results },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [latestNews, latestEvent, latestCompany] = await Promise.all([
      prisma.newsArticle.findFirst({ orderBy: { fetchedAt: 'desc' }, select: { fetchedAt: true } }),
      prisma.spaceEvent.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
      prisma.spaceCompany.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    ]);

    const now = new Date();
    const newsAge = latestNews ? Math.floor((now.getTime() - latestNews.fetchedAt.getTime()) / 1000 / 60) : null;
    const eventsAge = latestEvent ? Math.floor((now.getTime() - latestEvent.updatedAt.getTime()) / 1000 / 60) : null;
    const dailyAge = latestCompany ? Math.floor((now.getTime() - latestCompany.updatedAt.getTime()) / 1000 / 60) : null;

    const newsStale = (newsAge !== null && newsAge > NEWS_STALE_THRESHOLD) ||
                      (eventsAge !== null && eventsAge > NEWS_STALE_THRESHOLD) ||
                      newsAge === null;
    const dailyStale = (dailyAge !== null && dailyAge > DAILY_STALE_THRESHOLD) ||
                       dailyAge === null;

    return NextResponse.json({
      lastNewsUpdate: latestNews?.fetchedAt || null,
      lastEventsUpdate: latestEvent?.updatedAt || null,
      lastDailyUpdate: latestCompany?.updatedAt || null,
      newsAgeMinutes: newsAge,
      eventsAgeMinutes: eventsAge,
      dailyAgeMinutes: dailyAge,
      newsStale,
      dailyStale,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
