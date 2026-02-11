/**
 * Business Opportunities fetcher
 * Fetches broad space procurement from SAM.gov (all agencies) + SBIR/STTR solicitations
 */

import { fetchSAMOpportunities, SPACE_AGENCIES } from '@/lib/procurement/sam-gov';
import { fetchSBIRSolicitations } from '@/lib/procurement/sbir-fetcher';
import { upsertContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

const SPACE_KEYWORDS = [
  'space',
  'satellite',
  'launch',
  'orbital',
  'rocket',
  'propulsion',
  'spacecraft',
  'lunar',
  'GPS',
  'SATCOM',
  'earth observation',
  'remote sensing',
];

/**
 * Fetch broad space procurement from SAM.gov across all space agencies
 */
export async function fetchAndStoreSpaceProcurement(): Promise<number> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const postedFrom = ninetyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/');

    const results = await fetchSAMOpportunities({
      keywords: SPACE_KEYWORDS.join(' OR '),
      postedFrom,
      limit: 100,
    });

    // Map to display format (same pattern as space-defense-fetcher)
    const opportunities = results.opportunities.slice(0, 50).map((opp) => ({
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
      category: opp.type === 'award'
        ? 'Contract Award'
        : opp.type === 'presolicitation'
          ? 'Pre-Solicitation'
          : 'Solicitation',
      description: (opp.description || '').slice(0, 300) +
        (opp.description && opp.description.length > 300 ? '...' : ''),
      deadline: opp.responseDeadline
        ? opp.responseDeadline.toISOString().split('T')[0]
        : null,
      samUrl: opp.samUrl || null,
      naicsCode: opp.naicsCode || null,
      naicsDescription: opp.naicsDescription || null,
      setAside: opp.setAside || null,
      tags: opp.tags,
      type: opp.type,
    }));

    if (opportunities.length > 0) {
      await upsertContent(
        'business-opportunities:sam-gov-all',
        'business-opportunities',
        'sam-gov-all',
        {
          opportunities,
          fetchedAt: new Date().toISOString(),
          count: opportunities.length,
          totalRecords: results.totalRecords,
        },
        { sourceType: 'api', sourceUrl: 'https://sam.gov' }
      );
    }

    logger.info('Space procurement fetch complete', {
      total: results.totalRecords,
      stored: opportunities.length,
    });

    return opportunities.length;
  } catch (error) {
    logger.error('Space procurement fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Fetch open SBIR/STTR solicitations related to space
 */
export async function fetchAndStoreSBIROpportunities(): Promise<number> {
  try {
    const solicitations = await fetchSBIRSolicitations({ open: true });

    if (solicitations.length > 0) {
      const mapped = solicitations.map((s) => ({
        program: s.program,
        agency: s.agency,
        topicNumber: s.topicNumber,
        topicTitle: s.topicTitle,
        description: (s.description || '').slice(0, 500) +
          (s.description && s.description.length > 500 ? '...' : ''),
        phase: s.phase,
        awardAmount: s.awardAmount,
        openDate: s.openDate?.toISOString() || null,
        closeDate: s.closeDate?.toISOString() || null,
        url: s.url,
        keywords: s.keywords,
        isActive: s.isActive,
      }));

      await upsertContent(
        'business-opportunities:sbir-sttr',
        'business-opportunities',
        'sbir-sttr',
        {
          solicitations: mapped,
          fetchedAt: new Date().toISOString(),
          count: mapped.length,
        },
        { sourceType: 'api', sourceUrl: 'https://www.sbir.gov' }
      );

      logger.info('SBIR/STTR fetch complete', { count: mapped.length });
      return mapped.length;
    }

    logger.info('SBIR/STTR fetch returned no open space solicitations');
    return 0;
  } catch (error) {
    logger.error('SBIR/STTR fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Orchestrator: refresh all business opportunity data sources
 */
export async function refreshBusinessOpportunities(): Promise<{
  samGov: number;
  sbir: number;
  total: number;
}> {
  const samGov = await fetchAndStoreSpaceProcurement();
  const sbir = await fetchAndStoreSBIROpportunities();

  logger.info('Business opportunities refresh complete', {
    samGov,
    sbir,
    total: samGov + sbir,
  });

  return { samGov, sbir, total: samGov + sbir };
}
