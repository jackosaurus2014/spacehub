import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';

const usaSpendingBreaker = createCircuitBreaker('usaspending', {
  failureThreshold: 3,
  resetTimeout: 120000,
});

const USASPENDING_API_URL =
  'https://api.usaspending.gov/api/v2/search/spending_by_award/';

// Space-related NAICS codes
export const SPACE_NAICS_CODES = [
  '336414', // Guided Missile and Space Vehicle Manufacturing
  '517410', // Satellite Telecommunications
  '927110', // Space Research and Technology
  '336415', // Guided Missile and Space Vehicle Propulsion Unit Manufacturing
  '334511', // Search, Detection, Navigation, Guidance, Aeronautical Systems
  '541715', // R&D in Physical, Engineering, and Life Sciences
] as const;

const NAICS_DESCRIPTIONS: Record<string, string> = {
  '336414': 'Guided Missile and Space Vehicle Manufacturing',
  '336415': 'Space Vehicle Propulsion Unit Manufacturing',
  '517410': 'Satellite Telecommunications',
  '927110': 'Space Research and Technology',
  '334511': 'Search, Detection, Navigation, Guidance Systems',
  '541715': 'R&D in Physical, Engineering, and Life Sciences',
};

// Known company name aliases to slug mappings
const COMPANY_ALIASES: Record<string, string> = {
  'SPACE EXPLORATION TECHNOLOGIES CORP': 'spacex',
  'SPACEX': 'spacex',
  'ROCKET LAB USA INC': 'rocket-lab',
  'ROCKET LAB USA, INC.': 'rocket-lab',
  'ROCKET LAB': 'rocket-lab',
  'THE BOEING COMPANY': 'boeing',
  'BOEING': 'boeing',
  'LOCKHEED MARTIN CORPORATION': 'lockheed-martin',
  'LOCKHEED MARTIN CORP': 'lockheed-martin',
  'LOCKHEED MARTIN': 'lockheed-martin',
  'NORTHROP GRUMMAN SYSTEMS CORPORATION': 'northrop-grumman',
  'NORTHROP GRUMMAN CORPORATION': 'northrop-grumman',
  'NORTHROP GRUMMAN CORP': 'northrop-grumman',
  'NORTHROP GRUMMAN': 'northrop-grumman',
  'RAYTHEON TECHNOLOGIES CORPORATION': 'rtx',
  'RTX CORPORATION': 'rtx',
  'RAYTHEON': 'rtx',
  'L3HARRIS TECHNOLOGIES INC': 'l3harris',
  'L3HARRIS TECHNOLOGIES, INC.': 'l3harris',
  'L3HARRIS': 'l3harris',
  'UNITED LAUNCH ALLIANCE LLC': 'united-launch-alliance',
  'UNITED LAUNCH ALLIANCE, L.L.C.': 'united-launch-alliance',
  'UNITED LAUNCH ALLIANCE': 'united-launch-alliance',
  'BALL AEROSPACE & TECHNOLOGIES CORP': 'ball-aerospace',
  'BALL AEROSPACE': 'ball-aerospace',
  'BLUE ORIGIN LLC': 'blue-origin',
  'BLUE ORIGIN, LLC': 'blue-origin',
  'BLUE ORIGIN': 'blue-origin',
  'AEROJET ROCKETDYNE INC': 'aerojet-rocketdyne',
  'AEROJET ROCKETDYNE': 'aerojet-rocketdyne',
  'MAXAR TECHNOLOGIES INC': 'maxar-technologies',
  'MAXAR TECHNOLOGIES': 'maxar-technologies',
  'RELATIVITY SPACE INC': 'relativity-space',
  'RELATIVITY SPACE': 'relativity-space',
  'VIRGIN ORBIT LLC': 'virgin-orbit',
  'VIRGIN ORBIT': 'virgin-orbit',
  'PLANET LABS PBC': 'planet-labs',
  'PLANET LABS INC': 'planet-labs',
  'PLANET LABS': 'planet-labs',
  'SPIRE GLOBAL INC': 'spire-global',
  'SPIRE GLOBAL': 'spire-global',
  'SIERRA SPACE LLC': 'sierra-space',
  'SIERRA SPACE': 'sierra-space',
  'FIREFLY AEROSPACE INC': 'firefly-aerospace',
  'FIREFLY AEROSPACE': 'firefly-aerospace',
  'ASTROBOTIC TECHNOLOGY INC': 'astrobotic',
  'ASTROBOTIC': 'astrobotic',
  'INTUITIVE MACHINES LLC': 'intuitive-machines',
  'INTUITIVE MACHINES': 'intuitive-machines',
};

export interface SpaceContractAward {
  awardId: string;
  title: string;
  recipientName: string;
  recipientUei?: string;
  awardingAgency: string;
  fundingAgency?: string;
  totalObligation: number;
  startDate: string;
  endDate?: string;
  description: string;
  naicsCode?: string;
  naicsDescription?: string;
  placeOfPerformance?: string;
  awardType: string;
  companySlug?: string;
}

export interface FetchAwardsOptions {
  search?: string;
  agency?: string;
  dateRange?: number; // days
  minAmount?: number;
  page?: number;
  limit?: number;
}

export interface FetchAwardsResult {
  awards: SpaceContractAward[];
  totalCount: number;
  page: number;
}

/**
 * Match a contract award recipient to a CompanyProfile slug.
 *
 * Strategy:
 *   1. Try UEI match against CompanyProfile.samUei
 *   2. Try static alias mapping (known company names)
 *   3. Try exact case-insensitive name match in DB
 *   4. Try partial name match (contains) in DB
 */
export async function matchAwardToCompany(
  recipientName: string,
  recipientUei?: string
): Promise<string | null> {
  // 1. UEI match
  if (recipientUei) {
    try {
      const byUei = await prisma.companyProfile.findFirst({
        where: { samUei: recipientUei },
        select: { slug: true },
      });
      if (byUei) return byUei.slug;
    } catch {
      // DB query failed, continue to next strategy
    }
  }

  // 2. Static alias mapping
  const upperName = recipientName.toUpperCase().trim();
  const aliasSlug = COMPANY_ALIASES[upperName];
  if (aliasSlug) return aliasSlug;

  // 3. Case-insensitive exact name match in DB
  try {
    const byName = await prisma.companyProfile.findFirst({
      where: { name: { equals: recipientName, mode: 'insensitive' } },
      select: { slug: true },
    });
    if (byName) return byName.slug;
  } catch {
    // DB query failed, continue
  }

  // 4. Partial name match — try the first significant word(s) of the recipient
  try {
    // Extract a meaningful search term: remove common suffixes
    const cleanedName = recipientName
      .replace(
        /\b(INC|LLC|CORP|CORPORATION|COMPANY|TECHNOLOGIES|LTD|CO|PBC|PLC|LP|L\.L\.C\.|L\.P\.)\.?\b/gi,
        ''
      )
      .trim();

    if (cleanedName.length >= 4) {
      const byPartial = await prisma.companyProfile.findFirst({
        where: { name: { contains: cleanedName, mode: 'insensitive' } },
        select: { slug: true },
      });
      if (byPartial) return byPartial.slug;
    }
  } catch {
    // DB query failed
  }

  return null;
}

/**
 * Fetch space-related contract awards from USASpending.gov API.
 *
 * The API is free, no authentication required.
 * Uses POST endpoint: https://api.usaspending.gov/api/v2/search/spending_by_award/
 */
export async function fetchSpaceContractAwards(
  options: FetchAwardsOptions = {}
): Promise<FetchAwardsResult> {
  const {
    search,
    agency,
    dateRange = 90,
    minAmount = 0,
    page = 1,
    limit = 20,
  } = options;

  // Build cache key
  const cacheKey = `usaspending:${JSON.stringify(options)}`;
  const cached = apiCache.get<FetchAwardsResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Build date range filter
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Build filters array for the USASpending API
  const filters: Record<string, unknown> = {
    time_period: [
      {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      },
    ],
    award_type_codes: [
      'A', // BPA Call
      'B', // Purchase Order
      'C', // Delivery Order
      'D', // Definitive Contract
      'IDV_A', // GWAC
      'IDV_B', // IDC
      'IDV_B_A', // IDC / BPA
      'IDV_B_B', // IDC / BOA
      'IDV_B_C', // IDC / IDC
    ],
    naics_codes: {
      require: [...SPACE_NAICS_CODES],
    },
  };

  if (agency) {
    filters.agencies = [
      {
        type: 'awarding',
        tier: 'toptier',
        name: agency,
      },
    ];
  }

  if (search) {
    filters.keywords = [search];
  }

  if (minAmount > 0) {
    filters.award_amounts = [
      {
        lower_bound: minAmount,
      },
    ];
  }

  const requestBody = {
    filters,
    fields: [
      'Award ID',
      'Recipient Name',
      'Recipient UEI',
      'Awarding Agency',
      'Funding Agency',
      'Award Amount',
      'Total Outlayed Amount',
      'Description',
      'Start Date',
      'End Date',
      'Award Type',
      'NAICS Code',
      'Place of Performance City Code',
      'Place of Performance State Code',
      'recipient_id',
      'internal_id',
    ],
    page,
    limit,
    sort: 'Award Amount',
    order: 'desc',
  };

  return usaSpendingBreaker.execute(
    async () => {
      const response = await fetch(USASPENDING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        throw new Error(
          `USASpending API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      const totalCount: number = data.page_metadata?.total ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawResults: any[] = data.results || [];

      // Map API results to our interface and match companies
      const awards: SpaceContractAward[] = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawResults.map(async (r: any) => {
          const recipientName = r['Recipient Name'] || 'Unknown';
          const recipientUei = r['Recipient UEI'] || undefined;
          const naicsCode = r['NAICS Code']?.toString() || undefined;

          // Try to match to a company profile
          let companySlug: string | undefined;
          try {
            const matched = await matchAwardToCompany(
              recipientName,
              recipientUei
            );
            if (matched) companySlug = matched;
          } catch {
            // Non-critical — just skip matching
          }

          const pop = [
            r['Place of Performance City Code'],
            r['Place of Performance State Code'],
          ]
            .filter(Boolean)
            .join(', ');

          const award: SpaceContractAward = {
            awardId:
              r['Award ID'] ||
              r['internal_id']?.toString() ||
              `usa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title:
              r['Description']?.slice(0, 200) ||
              `Contract Award to ${recipientName}`,
            recipientName,
            recipientUei,
            awardingAgency: r['Awarding Agency'] || 'Unknown Agency',
            fundingAgency: r['Funding Agency'] || undefined,
            totalObligation: parseFloat(r['Award Amount']) || 0,
            startDate: r['Start Date'] || formatDate(new Date()),
            endDate: r['End Date'] || undefined,
            description: r['Description'] || '',
            naicsCode,
            naicsDescription: naicsCode
              ? NAICS_DESCRIPTIONS[naicsCode] || undefined
              : undefined,
            placeOfPerformance: pop || undefined,
            awardType: r['Award Type'] || 'Contract',
            companySlug,
          };

          return award;
        })
      );

      const result: FetchAwardsResult = {
        awards,
        totalCount,
        page,
      };

      // Cache for 30 minutes (VERY_SLOW)
      apiCache.set(cacheKey, result, CacheTTL.VERY_SLOW);

      logger.info('USASpending fetch successful', {
        total: totalCount,
        returned: awards.length,
        page,
      });

      return result;
    },
    { awards: [], totalCount: 0, page }
  );
}
