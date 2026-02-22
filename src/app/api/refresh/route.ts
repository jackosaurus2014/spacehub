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
import { initializeOperationalAwarenessData } from '@/lib/operational-awareness-data';
import { initializeSpaceMiningData } from '@/lib/space-mining-data';
import { initializeBlueprintData } from '@/lib/blueprint-data';
import { initializeGovernmentContracts } from '@/lib/government-contracts-data';
import { initializeOrbitalServices } from '@/lib/orbital-services-data';
import { initializeRegulatoryHubData } from '@/lib/regulatory-hub-data';
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

  await initializeOperationalAwarenessData();
  results.operationalAwareness = 'Refreshed';

  await initializeSpaceMiningData();
  results.spaceMining = 'Refreshed';

  await initializeBlueprintData();
  results.blueprints = 'Refreshed';

  await initializeGovernmentContracts();
  results.governmentContracts = 'Refreshed';

  await initializeOrbitalServices();
  results.orbitalServices = 'Refreshed';

  await initializeRegulatoryHubData();
  results.regulatoryHub = 'Refreshed';

  // Newsletter digest is now sent on its own schedule (Mon/Thu) via /api/newsletter/send-digest
  // Daily refresh only handles data seeding — no newsletter sending here
  results.newsletterNote = 'Newsletter sends on Mon/Thu schedule via dedicated endpoint';

  return results;
}

export async function POST(request: Request) {
  const { requireCronSecret } = await import('@/lib/errors');
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'news', 'events', 'blogs', 'daily', 'external-apis', 'space-weather', 'ai-research', 'space-defense', 'live-streams', 'realtime', 'regulatory-feeds', 'sec-filings', 'compliance-refresh', 'federal-register', 'space-environment-daily', 'business-opportunities', or null (all)

  const results: Record<string, unknown> = {};

  try {
    if (!type || type === 'news') {
      const newsResults = await refreshNews();
      Object.assign(results, newsResults);
    }

    if (!type || type === 'events') {
      const eventsResults = await refreshEvents();
      Object.assign(results, eventsResults);
    }

    if (!type || type === 'blogs') {
      const blogsResults = await refreshBlogs();
      Object.assign(results, blogsResults);
    }

    if (!type || type === 'daily') {
      const dailyResults = await refreshDaily();
      Object.assign(results, dailyResults);
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
      const { fetchDefenseProcurement, fetchDefenseNews } = await import('@/lib/space-defense-fetcher');
      const procurementCount = await fetchDefenseProcurement();
      const newsCount = await fetchDefenseNews();
      results.spaceDefense = {
        liveProcurement: procurementCount,
        defenseNews: newsCount,
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

    if (type === 'business-opportunities') {
      const { refreshBusinessOpportunities } = await import('@/lib/fetchers/business-opportunities-fetcher');
      const bizOppResult = await refreshBusinessOpportunities();
      results.businessOpportunities = bizOppResult;
    }

    if (type === 'opportunities-analysis') {
      const { runAIAnalysis } = await import('@/lib/opportunities-data');
      const analysisResult = await runAIAnalysis();
      results.opportunitiesAnalysis = analysisResult;
    }

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
