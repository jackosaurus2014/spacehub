/**
 * Space Defense module fetcher
 * Fetches live SAM.gov defense procurement and compiles defense news
 */

import { fetchSAMOpportunities } from '@/lib/procurement/sam-gov';
import { upsertContent } from '@/lib/dynamic-content';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

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
