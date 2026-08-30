// Prime-contractor backfill (SYNTHESIS.md item 34, scoped): pure helpers for
// mapping USAspending.gov `spending_by_award` results into GovernmentContract
// rows for the four flagship defense primes. Split out from the cron route
// (src/app/api/cron/prime-contracts-backfill/route.ts) so the mapper and
// classifier are unit-testable without a live network call or a database.
//
// GovernmentContract.agency and .category are plain `String` columns in
// Prisma (no DB-level enum), but the rest of the site treats them as the
// fixed unions documented in src/types/index.ts: GovContractAgency
// ('NASA' | 'USSF' | 'ESA') and GovContractCategory (10 fixed values). This
// file only ever emits values from those unions so contracts backfilled here
// render correctly in the existing /procurement UI and category/agency
// filters. "US Air Force" awards are tagged 'USSF' — the site has no
// separate Air Force badge, and the two increasingly share the same
// procurement pipeline for space systems.

export const MIN_AWARD_VALUE_USD = 1_000_000;

export interface PrimeCompany {
  /** Exact CompanyProfile.name string (see scripts/seed-company-profiles.ts). */
  name: string;
  /** USAspending recipient_search_text query — same string works fine. */
  searchText: string;
}

export const PRIME_COMPANIES: PrimeCompany[] = [
  { name: 'Lockheed Martin', searchText: 'Lockheed Martin' },
  { name: 'Boeing', searchText: 'Boeing' },
  { name: 'Northrop Grumman', searchText: 'Northrop Grumman' },
  { name: 'L3Harris Technologies', searchText: 'L3Harris' },
];

export type PrimeAgencyCode = 'NASA' | 'USSF';

export interface AgencyFilter {
  type: 'awarding' | 'funding';
  tier: 'toptier' | 'subtier';
  name: string;
  toptier_name?: string;
}

// Confirmed against https://api.usaspending.gov/api/v2/references/toptier_agencies/
// (NASA is toptier code 080). The Air Force/Space Force entry is NOT a
// separate toptier agency in USAspending — DoD (097) is toptier and
// "Department of the Air Force" is its subtier, which is also where Space
// Force procurement is attributed. Unverified live (no DB/network access in
// this environment) — if the subtier `name` string has drifted, the route's
// per-agency `fetched` count for USSF will read 0 and that's the signal to
// re-check it in production logs.
export const PRIME_AGENCIES: Record<PrimeAgencyCode, AgencyFilter> = {
  NASA: { type: 'awarding', tier: 'toptier', name: 'National Aeronautics and Space Administration' },
  USSF: { type: 'awarding', tier: 'subtier', name: 'Department of the Air Force', toptier_name: 'Department of Defense' },
};

export const AWARD_TYPE_CODES = ['A', 'B', 'C', 'D'];

export const SPENDING_BY_AWARD_FIELDS = [
  'Award ID',
  'Recipient Name',
  'Awarding Agency',
  'Award Amount',
  'Start Date',
  'End Date',
  'Description',
  'generated_internal_id',
];

export const PAGE_SIZE = 50;
export const MAX_PAGES_PER_REQUEST = 2;

export interface FiscalYearRange {
  start_date: string;
  end_date: string;
}

/**
 * Federal fiscal years run Oct 1 - Sep 30. Returns the start of the fiscal
 * year that began 2 years before the current one through the end of the
 * current fiscal year (i.e. "last 3 fiscal years" inclusive of the one in
 * progress).
 */
export function getLast3FiscalYearsRange(now: Date = new Date()): FiscalYearRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed; 9 = October
  const currentFY = month >= 9 ? year + 1 : year;
  const startFY = currentFY - 2; // 3 fiscal years inclusive: startFY, startFY+1, currentFY
  return {
    start_date: `${startFY - 1}-10-01`,
    end_date: `${currentFY}-09-30`,
  };
}

export interface SpendingByAwardRequestBody {
  subawards: false;
  limit: number;
  page: number;
  filters: {
    award_type_codes: string[];
    time_period: FiscalYearRange[];
    recipient_search_text: string[];
    agencies: AgencyFilter[];
  };
  fields: string[];
  sort: string;
  order: 'asc' | 'desc';
}

export function buildSpendingByAwardRequest(
  recipientSearchText: string,
  agencyFilter: AgencyFilter,
  timePeriod: FiscalYearRange,
  page: number,
  limit: number = PAGE_SIZE
): SpendingByAwardRequestBody {
  return {
    subawards: false,
    limit,
    page,
    filters: {
      award_type_codes: AWARD_TYPE_CODES,
      time_period: [timePeriod],
      recipient_search_text: [recipientSearchText],
      agencies: [agencyFilter],
    },
    fields: SPENDING_BY_AWARD_FIELDS,
    sort: 'Award Amount',
    order: 'desc',
  };
}

// Raw shape of one row in the `results` array of a spending_by_award
// response, restricted to the fields we requested.
export interface UsaSpendingAwardRow {
  'Award ID'?: string | null;
  'Recipient Name'?: string | null;
  'Awarding Agency'?: string | null;
  'Award Amount'?: number | null;
  'Start Date'?: string | null;
  'End Date'?: string | null;
  Description?: string | null;
  generated_internal_id?: string | null;
  internal_id?: string | number | null;
}

const SPACE_KEYWORDS = [
  'space', 'satellite', 'launch', 'orbit', 'missile warning', 'gps', 'sda', 'nasa',
];

export function isSpaceRelevant(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SPACE_KEYWORDS.some((kw) => lower.includes(kw));
}

export type PrimeContractCategory =
  | 'satellite_launch'
  | 'defense_systems'
  | 'ground_systems'
  | 'communications'
  | 'earth_observation'
  | 'space_station'
  | 'propulsion'
  | 'lunar_exploration'
  | 'research_development';

/**
 * Small keyword classifier over the award description. Maps onto the
 * existing GovContractCategory taxonomy (src/types/index.ts) rather than
 * inventing a parallel one, so backfilled rows filter correctly alongside
 * the hand-seeded contracts already on /procurement. First matching rule
 * wins; most specific checks run first.
 */
export function classifyCategory(description: string | null | undefined): PrimeContractCategory {
  const text = (description || '').toLowerCase();

  if (/missile warning|missile defense|space domain awareness|\bsda\b|early warning|weapon system/.test(text)) {
    return 'defense_systems';
  }
  if (/ground station|ground segment|ground system|ground terminal|antenna|telemetry/.test(text)) {
    return 'ground_systems';
  }
  if (/\bgps\b|satcom|satellite communication|communications? (satellite|system|network)/.test(text)) {
    return 'communications';
  }
  if (/earth observation|weather satellite|imaging satellite|remote sensing/.test(text)) {
    return 'earth_observation';
  }
  if (/space station|orbital platform|iss\b/.test(text)) {
    return 'space_station';
  }
  if (/propulsion|rocket engine|thruster|solid rocket motor/.test(text)) {
    return 'propulsion';
  }
  if (/\blunar\b|\bmoon\b|artemis/.test(text)) {
    return 'lunar_exploration';
  }
  if (/launch vehicle|launch service|launch support|\blaunch\b|rocket/.test(text)) {
    return 'satellite_launch';
  }
  // Generic "satellite"/"spacecraft"/"orbit" mentions with no more specific
  // signal — closest existing bucket is R&D rather than forcing a launch tag.
  return 'research_development';
}

export function formatCompactValue(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export interface MappedGovernmentContract {
  slug: string;
  agency: PrimeAgencyCode;
  title: string;
  description: string;
  type: 'Award';
  value: string;
  valueMin: number;
  valueMax: number;
  solicitationNumber: string | null;
  naicsCode: string | null;
  category: PrimeContractCategory;
  postedDate: Date;
  awardDate: Date;
  awardee: string;
  status: 'awarded';
  sourceUrl: string;
}

/**
 * Maps one raw USAspending award row to a GovernmentContract upsert shape,
 * or returns null if the award should be skipped: under $1M, no space
 * keyword in the description, or missing the identifiers/dates needed to
 * build a stable slug and required (non-nullable) dates.
 */
export function mapAwardToContract(
  award: UsaSpendingAwardRow,
  companyName: string,
  agencyCode: PrimeAgencyCode
): MappedGovernmentContract | null {
  const amount = award['Award Amount'];
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < MIN_AWARD_VALUE_USD) {
    return null;
  }

  const description = (award.Description || '').trim();
  if (!isSpaceRelevant(description) && !isSpaceRelevant(award['Award ID'])) {
    return null;
  }

  const generatedId = award.generated_internal_id || award.internal_id || award['Award ID'];
  if (!generatedId) return null;

  const startDateRaw = award['Start Date'];
  if (!startDateRaw) return null;
  const startDate = new Date(startDateRaw);
  if (Number.isNaN(startDate.getTime())) return null;

  const trimmedDescription = truncate(description || award['Award ID'] || `${companyName} prime award`, 500);
  const titleSource = description || award['Award ID'] || `${companyName} prime award`;

  return {
    slug: `usaspending-${generatedId}`,
    agency: agencyCode,
    title: truncate(`${companyName} — ${titleSource}`, 200),
    description: trimmedDescription,
    type: 'Award',
    value: formatCompactValue(amount),
    valueMin: amount,
    valueMax: amount,
    solicitationNumber: award['Award ID'] || null,
    naicsCode: null,
    category: classifyCategory(description),
    postedDate: startDate,
    awardDate: startDate,
    awardee: companyName,
    status: 'awarded',
    sourceUrl: `https://www.usaspending.gov/award/${generatedId}`,
  };
}
