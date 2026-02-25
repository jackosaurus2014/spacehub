/**
 * Space Defense module fetcher
 * Fetches live SAM.gov defense procurement, compiles defense news,
 * and pulls top defense RSS feeds directly.
 */

import { fetchSAMOpportunities } from '@/lib/procurement/sam-gov';
import { upsertContent } from '@/lib/dynamic-content';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import RSSParser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';

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
    url: 'https://breakingdefense.com/category/space/feed/',
  },
  {
    key: 'dod-contracts',
    name: 'DoD Contracts',
    url: 'https://www.defense.gov/News/RSS/',
  },
  {
    key: 'ussf',
    name: 'US Space Force',
    url: 'https://www.spaceforce.mil/RSS/',
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

/**
 * Fetch a single defense RSS feed and store items in DynamicContent.
 * Returns the number of items stored, or 0 on failure.
 */
async function fetchSingleDefenseFeed(feed: DefenseRSSSource): Promise<number> {
  try {
    const parsed = await defenseRssParser.parseURL(feed.url);
    const items = (parsed.items || []).slice(0, 20); // Top 20 items per feed

    const feedItems = items
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

    return feedItems.length;
  } catch (error) {
    logger.warn(`[Defense RSS] Failed to fetch ${feed.name}`, {
      url: feed.url,
      error: error instanceof Error ? error.message : String(error),
    });
    // One feed failing should not break the others
    return 0;
  }
}

/**
 * Fetch all defense RSS feeds.
 * Each feed is fetched independently — failures are isolated per feed.
 * Results are stored in DynamicContent under space-defense:rss-<key>.
 */
export async function fetchDefenseRSSFeeds(): Promise<number> {
  const results = await Promise.all(
    DEFENSE_RSS_FEEDS.map((feed) => fetchSingleDefenseFeed(feed)),
  );

  const totalItems = results.reduce((sum, count) => sum + count, 0);

  logger.info('[Defense RSS] All feeds complete', {
    feedCount: DEFENSE_RSS_FEEDS.length,
    totalItems,
    perFeed: DEFENSE_RSS_FEEDS.map((f, i) => `${f.name}: ${results[i]}`),
  });

  return totalItems;
}
