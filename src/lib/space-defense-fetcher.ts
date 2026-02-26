/**
 * Space Defense module fetcher
 * Fetches live SAM.gov defense procurement, compiles defense news,
 * and pulls top defense RSS feeds directly from 5 high-priority sources.
 *
 * RSS Sources (Tier 1):
 *   1. SpaceNews Defense section
 *   2. Breaking Defense Space section
 *   3. Defense.gov Contracts RSS
 *   4. US Space Force official news
 *   5. C4ISRNET Space section
 */

import { fetchSAMOpportunities } from '@/lib/procurement/sam-gov';
import { upsertContent, getContentItem } from '@/lib/dynamic-content';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import RSSParser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';

// Circuit breaker for defense RSS feeds — tolerates individual feed failures
// without tripping on transient errors from any single source
const defenseRssBreaker = createCircuitBreaker('defense-rss', {
  failureThreshold: 8, // High threshold: 5 feeds x ~1-2 transient failures each
  resetTimeout: 120_000, // 2 minutes
});

const DEFENSE_AGENCIES = [
  'Department of Defense',
  'Department of the Air Force',
  'Space Force',
  'DARPA',
  'Missile Defense Agency',
];

const DEFENSE_KEYWORDS = [
  'space',
  'satellite',
  'GPS',
  'SATCOM',
  'launch',
  'missile warning',
  'space domain',
  'orbital',
];

/**
 * Fetch defense-related procurement from SAM.gov
 */
export async function fetchDefenseProcurement(): Promise<number> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const postedFrom = ninetyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');

    const results = await fetchSAMOpportunities({
      keywords: DEFENSE_KEYWORDS.join(' OR '),
      postedFrom,
      limit: 50,
    });

    // Filter for defense-related agencies
    const defenseOpps = results.opportunities.filter((opp) => {
      const agencyLower = (opp.agency || '').toLowerCase();
      const subAgencyLower = (opp.subAgency || '').toLowerCase();
      const combined = `${agencyLower} ${subAgencyLower}`;
      return DEFENSE_AGENCIES.some((da) => combined.includes(da.toLowerCase()));
    });

    // Transform to match ContractAward interface for display
    const liveContracts = defenseOpps.slice(0, 25).map((opp) => ({
      id: `sam-${opp.samNoticeId}`,
      title: opp.title,
      contractor: opp.awardee || 'TBD (Open Solicitation)',
      value: opp.awardAmount
        ? `$${(opp.awardAmount / 1_000_000).toFixed(1)}M`
        : opp.estimatedValue
          ? `~$${(opp.estimatedValue / 1_000_000).toFixed(1)}M (est.)`
          : 'See solicitation',
      awardDate: opp.postedDate
        ? opp.postedDate.toISOString().split('T')[0]
        : 'Pending',
      agency: `${opp.agency}${opp.subAgency ? ' / ' + opp.subAgency : ''}`,
      category: opp.type === 'award' ? 'Contract Award' : opp.type === 'presolicitation' ? 'Pre-Solicitation' : 'Solicitation',
      description: (opp.description || '').slice(0, 300) + (opp.description && opp.description.length > 300 ? '...' : ''),
      period: opp.responseDeadline
        ? `Deadline: ${opp.responseDeadline.toISOString().split('T')[0]}`
        : undefined,
      samUrl: opp.samUrl || undefined,
      naicsCode: opp.naicsCode || undefined,
      naicsDescription: opp.naicsDescription || undefined,
      type: opp.type,
    }));

    if (liveContracts.length > 0) {
      await upsertContent(
        'space-defense:live-procurement',
        'space-defense',
        'live-procurement',
        liveContracts,
        {
          sourceType: 'api',
          sourceUrl: 'https://sam.gov',
        }
      );
    }

    logger.info('Defense procurement fetch complete', {
      total: results.totalRecords,
      defenseFiltered: defenseOpps.length,
      stored: liveContracts.length,
    });

    return liveContracts.length;
  } catch (error) {
    logger.error('Defense procurement fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Fetch recent defense-tagged news articles
 */
export async function fetchDefenseNews(): Promise<number> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const defenseKeywords = [
      'Space Force', 'USSF', 'space defense', 'SDA', 'Space Development Agency',
      'military space', 'space command', 'NRO', 'defense contract', 'NSSL',
      'ASAT', 'counterspace', 'space weapon', 'missile defense', 'GPS III',
      'Next-Gen OPIR', 'SBIRS', 'space surveillance', 'space domain',
    ];

    const articles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: sevenDaysAgo },
        OR: defenseKeywords.map((kw) => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' as const } },
            { summary: { contains: kw, mode: 'insensitive' as const } },
          ],
        })),
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        summary: true,
        source: true,
        url: true,
        imageUrl: true,
        publishedAt: true,
        category: true,
      },
    });

    if (articles.length > 0) {
      const newsData = articles.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        source: a.source,
        url: a.url,
        imageUrl: a.imageUrl,
        publishedAt: a.publishedAt.toISOString(),
        category: a.category,
      }));

      await upsertContent(
        'space-defense:defense-news',
        'space-defense',
        'defense-news',
        newsData,
        {
          sourceType: 'api',
          sourceUrl: 'internal-news-db',
        }
      );
    }

    logger.info('Defense news compilation complete', {
      articlesFound: articles.length,
    });

    return articles.length;
  } catch (error) {
    logger.error('Defense news compilation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Defense RSS Feeds — Top 5 sources (Tier 1 from SPACE-DEFENSE-DATA-SOURCES.md)
// ---------------------------------------------------------------------------

interface DefenseRSSSource {
  /** Short key used in DynamicContent contentKey (e.g. space-defense:rss-spacenews) */
  key: string;
  name: string;
  url: string;
}

const DEFENSE_RSS_FEEDS: DefenseRSSSource[] = [
  {
    key: 'spacenews',
    name: 'SpaceNews Defense',
    url: 'https://spacenews.com/section/military/feed/',
  },
  {
    key: 'breaking-defense',
    name: 'Breaking Defense Space',
    // Breaking Defense uses /tag/ for topic-based feeds
    url: 'https://breakingdefense.com/tag/space/feed/',
  },
  {
    key: 'dod-contracts',
    name: 'Defense.gov Contracts',
    // Defense.gov RSS for contract announcements (ContentType=1 = press releases / contracts, Site=945 = Contracts)
    url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?max=20&ContentType=1&Site=945',
  },
  {
    key: 'ussf',
    name: 'US Space Force',
    // Space Force official news feed — DesktopModules RSS endpoint (Site=1060 = USSF)
    // Falls back to /RSS/ if this endpoint changes
    url: 'https://www.spaceforce.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1060&max=20',
  },
  {
    key: 'c4isrnet',
    name: 'C4ISRNET Space',
    url: 'https://www.c4isrnet.com/arc/outboundfeeds/rss/category/space/?outputType=xml',
  },
];

const defenseRssParser = new RSSParser({
  timeout: 20000,
  headers: {
    'User-Agent': 'SpaceNexus/1.0 (Space Defense News Aggregator)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
});

/** Shape of a single defense RSS article after parsing */
export interface DefenseRSSArticle {
  title: string;
  url: string;
  publishedAt: string; // ISO 8601
  source: string;
  summary: string;
  feedKey: string;
}

/** Result of fetching a single feed */
interface SingleFeedResult {
  feedKey: string;
  feedName: string;
  items: DefenseRSSArticle[];
  error?: string;
}

/**
 * Fetch a single defense RSS feed, store items in DynamicContent, and return
 * the parsed articles. Uses the defense-rss circuit breaker so that repeated
 * failures across feeds eventually stop outbound requests.
 *
 * Returns the parsed items (empty array on failure) so the aggregator can
 * combine them.
 */
async function fetchSingleDefenseFeed(feed: DefenseRSSSource): Promise<SingleFeedResult> {
  return defenseRssBreaker.execute(
    async () => {
      const parsed = await defenseRssParser.parseURL(feed.url);
      const rawItems = (parsed.items || []).slice(0, 20); // Top 20 items per feed

      const feedItems: DefenseRSSArticle[] = rawItems
        .filter((item) => item.title && item.link)
        .map((item) => {
          const rawSummary = item.contentSnippet || item.content || item.summary || '';
          const summary = sanitizeHtml(rawSummary, {
            allowedTags: [],
            allowedAttributes: {},
          }).slice(0, 500);

          return {
            title: item.title!,
            url: item.link!,
            publishedAt: item.pubDate
              ? new Date(item.pubDate).toISOString()
              : new Date().toISOString(),
            source: feed.name,
            summary,
            feedKey: feed.key,
          };
        });

      if (feedItems.length > 0) {
        await upsertContent(
          `space-defense:rss-${feed.key}`,
          'space-defense',
          'rss-feeds',
          feedItems,
          {
            sourceType: 'api',
            sourceUrl: feed.url,
          },
        );
      }

      logger.info(`[Defense RSS] Fetched ${feed.name}`, {
        itemCount: feedItems.length,
      });

      return { feedKey: feed.key, feedName: feed.name, items: feedItems };
    },
    // Fallback when circuit breaker is open or call fails:
    // return empty result with error note so aggregator can report it
    { feedKey: feed.key, feedName: feed.name, items: [], error: 'circuit-breaker-fallback' } as SingleFeedResult,
  );
}

/**
 * Fetch all defense RSS feeds.
 * Each feed is fetched independently via circuit breaker — failures are
 * isolated per feed. Results are stored in DynamicContent under
 * space-defense:rss-<key>.
 *
 * Returns the total number of items stored across all feeds.
 */
export async function fetchDefenseRSSFeeds(): Promise<number> {
  const results = await Promise.all(
    DEFENSE_RSS_FEEDS.map((feed) => fetchSingleDefenseFeed(feed)),
  );

  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
  const succeeded = results.filter((r) => !r.error);
  const failed = results.filter((r) => !!r.error);

  logger.info('[Defense RSS] All feeds complete', {
    feedCount: DEFENSE_RSS_FEEDS.length,
    succeeded: succeeded.length,
    failed: failed.length,
    totalItems,
    perFeed: results.map((r) => `${r.feedName}: ${r.items.length}${r.error ? ' (failed)' : ''}`),
  });

  if (failed.length > 0) {
    logger.warn('[Defense RSS] Some feeds failed', {
      failedFeeds: failed.map((r) => r.feedName),
    });
  }

  return totalItems;
}

// ---------------------------------------------------------------------------
// Aggregator — combines all defense RSS feeds into a single sorted list
// ---------------------------------------------------------------------------

/** Summary returned by the aggregator */
export interface DefenseFeedAggregation {
  /** All articles from all feeds, sorted newest-first */
  articles: DefenseRSSArticle[];
  /** Per-feed stats */
  feedStats: Array<{
    key: string;
    name: string;
    count: number;
    status: 'ok' | 'failed' | 'stale-cache';
  }>;
  /** Total articles across all feeds */
  totalArticles: number;
  /** ISO timestamp of when the aggregation ran */
  aggregatedAt: string;
}

/**
 * Fetch all 5 defense RSS feeds, combine the results into a single list
 * sorted by publishedAt (newest first), and store the combined result in
 * DynamicContent under `space-defense:rss-combined`.
 *
 * If a feed fails, its previously-cached items from DynamicContent are used
 * as a fallback so the aggregation is never empty due to transient errors.
 *
 * Returns the full aggregation including articles and per-feed stats.
 */
export async function fetchAllDefenseFeeds(): Promise<DefenseFeedAggregation> {
  // Fetch all feeds in parallel
  const results = await Promise.all(
    DEFENSE_RSS_FEEDS.map((feed) => fetchSingleDefenseFeed(feed)),
  );

  const allArticles: DefenseRSSArticle[] = [];
  const feedStats: DefenseFeedAggregation['feedStats'] = [];

  for (const result of results) {
    if (result.items.length > 0) {
      // Feed returned fresh items
      allArticles.push(...result.items);
      feedStats.push({
        key: result.feedKey,
        name: result.feedName,
        count: result.items.length,
        status: 'ok',
      });
    } else if (result.error) {
      // Feed failed — try to load previously-cached items from DynamicContent
      const cached = await getContentItem<DefenseRSSArticle[]>(
        `space-defense:rss-${result.feedKey}`,
      );
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        allArticles.push(...cached.data);
        feedStats.push({
          key: result.feedKey,
          name: result.feedName,
          count: cached.data.length,
          status: 'stale-cache',
        });
        logger.info(`[Defense RSS] Using cached data for ${result.feedName}`, {
          cachedItems: cached.data.length,
          cachedAt: cached.refreshedAt.toISOString(),
        });
      } else {
        feedStats.push({
          key: result.feedKey,
          name: result.feedName,
          count: 0,
          status: 'failed',
        });
      }
    } else {
      // Feed returned 0 items but no error (feed may be legitimately empty)
      feedStats.push({
        key: result.feedKey,
        name: result.feedName,
        count: 0,
        status: 'ok',
      });
    }
  }

  // Sort combined articles by publishedAt, newest first
  allArticles.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA;
  });

  const aggregation: DefenseFeedAggregation = {
    articles: allArticles,
    feedStats,
    totalArticles: allArticles.length,
    aggregatedAt: new Date().toISOString(),
  };

  // Store combined aggregation in DynamicContent for downstream consumers
  if (allArticles.length > 0) {
    await upsertContent(
      'space-defense:rss-combined',
      'space-defense',
      'rss-feeds',
      aggregation,
      {
        sourceType: 'api',
        sourceUrl: 'multiple-defense-rss-feeds',
      },
    );
  }

  logger.info('[Defense RSS] Aggregation complete', {
    totalArticles: allArticles.length,
    feedStats: feedStats.map((s) => `${s.name}: ${s.count} (${s.status})`),
  });

  return aggregation;
}
