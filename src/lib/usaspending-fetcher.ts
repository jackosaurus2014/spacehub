/**
 * USAspending.gov Federal Space Spending Data Fetcher
 *
 * Fetches federal space spending data from the USAspending.gov API,
 * including NASA agency spending and recent space contract awards.
 *
 * API docs: https://api.usaspending.gov
 * No API key required (free public API).
 *
 * Uses the in-memory api-cache with a 4-hour TTL.
 */

import { withCache } from './api-cache';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgencySpendingItem {
  name: string;
  abbreviation: string;
  obligatedAmount: number;
  budgetAuthority: number;
  fiscalYear: number;
}

export interface SpaceContractAward {
  awardId: string;
  recipientName: string;
  description: string;
  awardAmount: number;
  awardDate: string;
  awardingAgency: string;
  awardType: string;
}

export interface USASpendingData {
  agencySpending: AgencySpendingItem[];
  recentAwards: SpaceContractAward[];
  totalSpending: number;
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPENDING_BY_AGENCY_URL =
  'https://api.usaspending.gov/api/v2/search/spending_by_agency/';
const SPENDING_BY_AWARD_URL =
  'https://api.usaspending.gov/api/v2/search/spending_by_award/';

/** 4-hour TTL in seconds */
const CACHE_TTL_4H = 14_400;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetch NASA and Space Force-related agency spending from USAspending.gov.
 */
async function fetchAgencySpending(): Promise<AgencySpendingItem[]> {
  try {
    const currentFY = new Date().getFullYear();
    const response = await fetch(SPENDING_BY_AGENCY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        fiscal_year: currentFY,
        agency_type: 'awarding',
        filters: {
          agency: { type: 'awarding', tier: 'toptier', name: 'National Aeronautics and Space Administration' },
        },
        limit: 10,
        page: 1,
      }),
    });

    if (!response.ok) {
      logger.warn('[USASpending] Agency spending endpoint returned non-OK', {
        status: response.status,
      });
      return [];
    }

    const data = await response.json();
    const results = data?.results ?? [];

    return results.map((r: Record<string, unknown>) => ({
      name: String(r.name ?? r.agency_name ?? 'Unknown'),
      abbreviation: String(r.abbreviation ?? r.agency_abbreviation ?? ''),
      obligatedAmount: Number(r.obligated_amount ?? 0),
      budgetAuthority: Number(r.budget_authority_amount ?? r.obligated_amount ?? 0),
      fiscalYear: currentFY,
    }));
  } catch (error) {
    logger.error('[USASpending] Failed to fetch agency spending', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Fetch recent space-related contract awards from USAspending.gov.
 */
async function fetchRecentAwards(): Promise<SpaceContractAward[]> {
  try {
    const response = await fetch(SPENDING_BY_AWARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        filters: {
          agencies: [
            {
              type: 'awarding',
              tier: 'toptier',
              name: 'National Aeronautics and Space Administration',
            },
            {
              type: 'awarding',
              tier: 'toptier',
              name: 'Department of Defense',
            },
          ],
          keywords: ['space', 'satellite', 'launch', 'orbital', 'spacecraft', 'rocket'],
          time_period: [
            {
              start_date: new Date(Date.now() - 180 * 86_400_000).toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0],
            },
          ],
          award_type_codes: ['A', 'B', 'C', 'D'],
        },
        fields: [
          'Award ID',
          'Recipient Name',
          'Description',
          'Award Amount',
          'Start Date',
          'Awarding Agency',
          'Award Type',
        ],
        limit: 20,
        page: 1,
        sort: 'Award Amount',
        order: 'desc',
      }),
    });

    if (!response.ok) {
      logger.warn('[USASpending] Awards endpoint returned non-OK', {
        status: response.status,
      });
      return [];
    }

    const data = await response.json();
    const results = data?.results ?? [];

    return results
      .map((r: Record<string, unknown>) => ({
        awardId: String(r['Award ID'] ?? r.award_id ?? ''),
        recipientName: String(r['Recipient Name'] ?? r.recipient_name ?? 'Unknown'),
        description: String(r['Description'] ?? r.description ?? ''),
        awardAmount: Number(r['Award Amount'] ?? r.award_amount ?? 0),
        awardDate: String(r['Start Date'] ?? r.start_date ?? ''),
        awardingAgency: String(r['Awarding Agency'] ?? r.awarding_agency ?? ''),
        awardType: String(r['Award Type'] ?? r.award_type ?? ''),
      }))
      .filter((a: SpaceContractAward) => a.awardAmount > 0);
  } catch (error) {
    logger.error('[USASpending] Failed to fetch recent awards', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch federal space spending data from USAspending.gov.
 *
 * Results are cached for 4 hours via the shared in-memory api-cache.
 * On fetch failure, stale data is returned if available; otherwise
 * empty arrays are used as fallbacks.
 */
export async function fetchUSASpendingData(): Promise<USASpendingData> {
  return withCache<USASpendingData>(
    'usaspending:space-data',
    async () => {
      logger.info('[USASpending] Fetching federal space spending data');

      const [agencySpending, recentAwards] = await Promise.all([
        fetchAgencySpending(),
        fetchRecentAwards(),
      ]);

      const totalSpending = agencySpending.reduce(
        (sum, a) => sum + a.obligatedAmount,
        0,
      );

      logger.info('[USASpending] Data fetched successfully', {
        agencies: agencySpending.length,
        awards: recentAwards.length,
        totalSpending,
      });

      return {
        agencySpending,
        recentAwards,
        totalSpending,
        fetchedAt: new Date().toISOString(),
      };
    },
    {
      ttlSeconds: CACHE_TTL_4H,
      staleWhileRevalidate: true,
      fallbackToStale: true,
    },
  );
}
