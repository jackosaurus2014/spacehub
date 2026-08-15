import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkLaunchAlerts, checkSpaceWeatherAlerts } from '@/lib/push-triggers';
import { fetchSpaceflightNews } from '@/lib/news-fetcher';
import { fetchLaunchLibraryEvents } from '@/lib/events-fetcher';
import { fetchBlogPosts, initializeBlogSources } from '@/lib/blogs-fetcher';
import { refreshDaily } from '@/lib/refresh-daily-chain';
// Newsletter sending moved to dedicated /api/newsletter/send-digest endpoint (Mon/Thu schedule)
import { refreshAllExternalAPIs, fetchAndStoreEnhancedSpaceWeather, fetchAndStoreDonkiEnhanced } from '@/lib/module-api-fetchers';
import { refreshAllAIResearchedModules } from '@/lib/ai-data-refresher';
import { getAllModuleFreshness } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const NEWS_STALE_THRESHOLD = 15; // minutes
const DAILY_STALE_THRESHOLD = 24 * 60; // minutes (24 hours)

async function refreshNews(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const newsCount = await fetchSpaceflightNews();
  results.news = `Refreshed ${newsCount} articles`;
  return results;
}

async function refreshEvents(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const eventsCount = await fetchLaunchLibraryEvents();
  results.events = `Refreshed ${eventsCount} events`;
  return results;
}

async function refreshBlogs(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  await initializeBlogSources();
  const blogCount = await fetchBlogPosts();
  results.blogs = `Refreshed ${blogCount} blog posts`;
  return results;
}

export async function POST(request: Request) {
  const { requireCronSecret } = await import('@/lib/errors');
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'news', 'events', 'blogs', 'daily', 'external-apis', 'space-weather', 'ai-research', 'space-defense', 'live-streams', 'realtime', 'regulatory-feeds', 'sec-filings', 'compliance-refresh', 'federal-register', 'spectrum-filings', 'space-environment-daily', 'business-opportunities', 'ats-jobs', or null (all)

  const results: Record<string, unknown> = {};

  try {
    if (!type || type === 'news') {
      const newsResults = await refreshNews();
      Object.assign(results, newsResults);
    }

    if (!type || type === 'events') {
      const eventsResults = await refreshEvents();
      Object.assign(results, eventsResults);
      // Check for launch alerts after events refresh (non-blocking)
      checkLaunchAlerts().catch(() => {});
    }

    if (!type || type === 'blogs') {
      const blogsResults = await refreshBlogs();
      Object.assign(results, blogsResults);
    }

    if (!type || type === 'daily') {
      const { results: dailyResults, stepResults } = await refreshDaily();
      Object.assign(results, dailyResults);
      results.dailySteps = stepResults;

      const failedSteps = stepResults.filter((s) => !s.ok);
      const status = failedSteps.length === 0
        ? 'success'
        : failedSteps.length === stepResults.length
          ? 'failed'
          : 'partial';
      const totalDuration = stepResults.reduce((sum, s) => sum + s.durationMs, 0);

      if (failedSteps.length > 0) {
        logger.error(`refreshDaily completed with ${failedSteps.length}/${stepResults.length} step(s) failed`, {
          failedSteps: failedSteps.map((s) => s.step),
        });
      }

      try {
        await prisma.dataRefreshLog.create({
          data: {
            module: 'daily-refresh',
            refreshType: 'api-fetch',
            status,
            itemsChecked: stepResults.length,
            itemsUpdated: stepResults.filter((s) => s.ok).length,
            itemsExpired: 0,
            itemsCreated: 0,
            duration: totalDuration,
            errorMessage: failedSteps.length > 0
              ? failedSteps.map((s) => `${s.step}: ${s.error}`).join('; ').slice(0, 4000)
              : null,
            details: JSON.stringify(stepResults),
          },
        });
      } catch (logErr) {
        logger.error('Failed to write DataRefreshLog for daily-refresh', {
          error: logErr instanceof Error ? logErr.message : String(logErr),
        });
      }
    }

    if (type === 'external-apis') {
      const apiResults = await refreshAllExternalAPIs();
      results.externalApis = apiResults;
    }

    if (type === 'space-weather') {
      const swpcUpdated = await fetchAndStoreEnhancedSpaceWeather();
      const donkiUpdated = await fetchAndStoreDonkiEnhanced();
      results.spaceWeather = {
        swpcDatasets: swpcUpdated,
        donkiEventTypes: donkiUpdated,
        totalUpdated: swpcUpdated + donkiUpdated,
      };
      // Check for severe space weather alerts (non-blocking)
      checkSpaceWeatherAlerts().catch(() => {});
    }

    if (type === 'ai-research') {
      const aiResults = await refreshAllAIResearchedModules();
      results.aiResearch = aiResults;
    }

    if (type === 'live-streams') {
      // Fetch upcoming launches from SpaceEvent and create stream entries
      const upcomingLaunches = await prisma.spaceEvent.findMany({
        where: {
          launchDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { launchDate: 'asc' },
        take: 20,
      });
      results.liveStreams = `Found ${upcomingLaunches.length} upcoming launches`;
    }

    if (type === 'space-defense') {
      const { fetchDefenseProcurement, fetchDefenseNews, fetchAllDefenseFeeds } = await import('@/lib/space-defense-fetcher');
      const procurementCount = await fetchDefenseProcurement();
      const newsCount = await fetchDefenseNews();
      const rssAggregation = await fetchAllDefenseFeeds();
      results.spaceDefense = {
        liveProcurement: procurementCount,
        defenseNews: newsCount,
        defenseRSS: rssAggregation.totalArticles,
        feedStats: rssAggregation.feedStats,
      };
    }

    if (type === 'realtime') {
      // Import and call real-time fetchers
      const { fetchAndStoreIssPosition, fetchAndStoreDsnStatus } = await import('@/lib/module-api-fetchers');
      const issUpdated = await fetchAndStoreIssPosition();
      const dsnUpdated = await fetchAndStoreDsnStatus();
      results.realtime = {
        issPosition: issUpdated,
        dsnStatus: dsnUpdated,
        totalUpdated: issUpdated + dsnUpdated,
      };
    }

    if (type === 'regulation-explainers') {
      const { generateRegulationExplainers } = await import('@/lib/regulation-explainer-generator');
      const explainerResult = await generateRegulationExplainers();
      results.regulationExplainers = explainerResult;
    }

    if (type === 'company-digests') {
      const { generateCompanyDigests } = await import('@/lib/company-digest-generator');
      const digestResult = await generateCompanyDigests();
      results.companyDigests = digestResult;
    }

    if (type === 'watchlist-alerts') {
      const { processWatchlistAlerts, sendWatchlistDailyDigest } = await import('@/lib/alerts/watchlist-alert-processor');
      const alertResult = await processWatchlistAlerts(prisma);
      const digestResult = await sendWatchlistDailyDigest(prisma);
      results.watchlistAlerts = { alerts: alertResult, digest: digestResult };
    }

    if (type === 'regulatory-feeds') {
      const { fetchAndStoreFAALicenses } = await import('@/lib/fetchers/faa-license-fetcher');
      const { fetchAndStoreFCCFilings } = await import('@/lib/fetchers/fcc-space-filings-fetcher');
      const { fetchAndStoreFederalRegister } = await import('@/lib/fetchers/federal-register-fetcher');
      const { fetchAndStoreITUFilings } = await import('@/lib/fetchers/itu-filings-fetcher');
      const faaCount = await fetchAndStoreFAALicenses();
      const fccCount = await fetchAndStoreFCCFilings();
      const fedRegResult = await fetchAndStoreFederalRegister();
      const ituResult = await fetchAndStoreITUFilings();
      results.regulatoryFeeds = {
        faaLicenses: faaCount,
        fccFilings: fccCount,
        federalRegister: fedRegResult,
        ituFilings: ituResult,
        totalUpdated: faaCount + fccCount + fedRegResult.stored + ituResult.seeded + ituResult.notices,
      };
    }

    if (type === 'sec-filings') {
      const { fetchAndStoreSECFilings } = await import('@/lib/fetchers/sec-edgar-fetcher');
      const secCount = await fetchAndStoreSECFilings();
      results.secFilings = { count: secCount };
    }

    if (type === 'federal-register') {
      const { fetchAndStoreFederalRegister } = await import('@/lib/fetchers/federal-register-fetcher');
      const fedRegResult = await fetchAndStoreFederalRegister();
      results.federalRegister = fedRegResult;
    }

    if (type === 'spectrum-filings') {
      const { fetchAndStoreSpectrumFilings } = await import('@/lib/fetchers/spectrum-filings-fetcher');
      const spectrumFilingsCount = await fetchAndStoreSpectrumFilings();
      results.spectrumFilings = { count: spectrumFilingsCount };
    }

    if (type === 'compliance-refresh') {
      const { refreshComplianceData } = await import('@/lib/fetchers/compliance-fetcher');
      const { fetchAndStoreFAALicenses } = await import('@/lib/fetchers/faa-license-fetcher');
      const { fetchAndStoreFCCFilings } = await import('@/lib/fetchers/fcc-space-filings-fetcher');
      const { fetchAndStoreSECFilings } = await import('@/lib/fetchers/sec-edgar-fetcher');
      const { fetchAndStoreFederalRegister } = await import('@/lib/fetchers/federal-register-fetcher');
      const { fetchAndStoreITUFilings } = await import('@/lib/fetchers/itu-filings-fetcher');

      // Run the compliance-fetcher orchestrator (legal RSS, ITU via FedReg, export control)
      const complianceResult = await refreshComplianceData();

      // Also run dedicated fetchers that store in DynamicContent
      const fccCount = await fetchAndStoreFCCFilings();
      const faaCount = await fetchAndStoreFAALicenses();
      const secCount = await fetchAndStoreSECFilings();
      const fedRegResult = await fetchAndStoreFederalRegister();
      const ituResult = await fetchAndStoreITUFilings();

      results.complianceRefresh = {
        ...complianceResult,
        fccFilings: fccCount,
        faaLicenses: faaCount,
        secFilings: secCount,
        federalRegister: fedRegResult,
        ituFilings: ituResult,
      };
    }

    if (type === 'space-environment-daily') {
      const { refreshSpaceEnvironmentDaily } = await import('@/lib/fetchers/space-environment-fetcher');
      const spaceEnvResult = await refreshSpaceEnvironmentDaily();
      results.spaceEnvironmentDaily = spaceEnvResult;
    }

    // 'business-opportunities' + 'sam-gov-active' types removed — they fed
    // orphaned DynamicContent keys nobody reads (the real /business-opportunities
    // page is served by the Opportunity model via /api/opportunities).

    // 'opportunities-analysis' type disabled (2026-08-14 data-integrity fix):
    // this used to call runAIAnalysis() to generate speculative
    // BusinessOpportunity rows (sourceType 'ai_generated') that were mixed
    // in with real sam_gov/news_analysis opportunities on
    // /business-opportunities with fabricated-precision valuations and no
    // disclosure. Founder decision: retire AI-generated opportunities
    // entirely. The cron entry that called this type was removed from
    // src/lib/cron-scheduler.ts; the manual trigger at
    // POST /api/opportunities/analyze is also disabled. Existing
    // ai_generated rows were archived in prod, and
    // getOpportunities()/getOpportunityStats() in
    // src/lib/opportunities-data.ts hard-exclude sourceType 'ai_generated'
    // regardless of status as a second line of defense.

    if (type === 'patents') {
      const { fetchAndStorePatents } = await import('@/lib/module-api-fetchers');
      const patentCount = await fetchAndStorePatents();
      results.patents = { count: patentCount };
    }

    if (type === 'module-news') {
      const { fetchInsuranceRelatedNews, fetchResourceExchangeRelatedNews } = await import('@/lib/fetchers/insurance-resource-news-fetcher');
      const insuranceNews = await fetchInsuranceRelatedNews();
      const resourceNews = await fetchResourceExchangeRelatedNews();
      results.moduleNews = {
        insurance: insuranceNews,
        resourceExchange: resourceNews,
      };
    }

    if (type === 'commodity-prices') {
      const { fetchAndUpdateCommodityPrices } = await import('@/lib/fetchers/commodity-pricing-fetcher');
      const updated = await fetchAndUpdateCommodityPrices();
      results.commodityPrices = { updated };
    }

    if (type === 'market-commentary') {
      const { generateInsuranceCommentary, generateResourceCommentary } = await import('@/lib/fetchers/module-market-commentary');
      const insuranceOk = await generateInsuranceCommentary();
      const resourceOk = await generateResourceCommentary();
      results.marketCommentary = {
        insurance: insuranceOk ? 'generated' : 'skipped',
        resourceExchange: resourceOk ? 'generated' : 'skipped',
      };
    }

    if (type === 'patents-market-intel') {
      const { refreshPatentMarketIntelligence } = await import('@/lib/module-api-fetchers');
      const sectionsUpdated = await refreshPatentMarketIntelligence();
      results.patentsMarketIntel = { sectionsUpdated };
    }

    // ─── New Data Feed Integrations ──────────────────────────────────
    if (type === 'conjunction-alerts') {
      const { fetchConjunctionAlerts } = await import('@/lib/fetchers/space-track-fetcher');
      const alertCount = await fetchConjunctionAlerts();
      results.conjunctionAlerts = { count: alertCount };
    }

    if (type === 'executive-moves') {
      const { fetchAndStoreExecutiveMoves } = await import('@/lib/fetchers/executive-moves-fetcher');
      const moveResults = await fetchAndStoreExecutiveMoves();
      results.executiveMoves = moveResults;
    }

    if (type === 'ats-jobs') {
      const { fetchAndStoreATSJobs } = await import('@/lib/fetchers/ats-jobs-fetcher');
      const atsResults = await fetchAndStoreATSJobs();
      results.atsJobs = atsResults;
    }

    if (type === 'funding-signals') {
      const { detectAndStoreFundingSignals } = await import('@/lib/fetchers/funding-signal-detector');
      const fundingResults = await detectAndStoreFundingSignals();
      results.fundingSignals = fundingResults;
    }

    if (type === 'grants-gov') {
      const { fetchSpaceGrants } = await import('@/lib/fetchers/grants-gov-fetcher');
      const grantCount = await fetchSpaceGrants();
      results.grantsGov = { count: grantCount };
    }

    if (type === 'sam-awards') {
      const { fetchSpaceContractAwards } = await import('@/lib/fetchers/sam-awards-fetcher');
      const awardCount = await fetchSpaceContractAwards();
      results.samAwards = { count: awardCount };
    }

    if (type === 'sam-entities') {
      const { fetchSpaceEntityData } = await import('@/lib/fetchers/sam-entity-fetcher');
      const entityCount = await fetchSpaceEntityData();
      results.samEntities = { count: entityCount };
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
      { success: false, error: 'Data refresh failed', results },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [latestNews, latestEvent, latestCompany] = await Promise.all([
      prisma.newsArticle.findFirst({ orderBy: { fetchedAt: 'desc' }, select: { fetchedAt: true } }),
      prisma.spaceEvent.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
      prisma.companyProfile.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
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

    // Get DynamicContent freshness per module
    let dynamicContentFreshness = {};
    try {
      dynamicContentFreshness = await getAllModuleFreshness();
    } catch {
      // DynamicContent table may not be populated yet
    }

    return NextResponse.json({
      lastNewsUpdate: latestNews?.fetchedAt || null,
      lastEventsUpdate: latestEvent?.updatedAt || null,
      lastDailyUpdate: latestCompany?.updatedAt || null,
      newsAgeMinutes: newsAge,
      eventsAgeMinutes: eventsAge,
      dailyAgeMinutes: dailyAge,
      newsStale,
      dailyStale,
      dynamicContent: dynamicContentFreshness,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch refresh status' }, { status: 500 });
  }
}
