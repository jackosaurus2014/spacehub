import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

const samBreaker = createCircuitBreaker('sam-gov', {
  failureThreshold: 3,
  resetTimeout: 120000,
});

const SAM_API_URL = 'https://api.sam.gov/opportunities/v2/search';

// Space-related NAICS codes
export const SPACE_NAICS_CODES = [
  '336414', // Guided Missile and Space Vehicle Manufacturing
  '336415', // Guided Missile and Space Vehicle Propulsion Unit Manufacturing
  '336419', // Other Guided Missile and Space Vehicle Parts Manufacturing
  '517410', // Satellite Telecommunications
  '541715', // R&D in Physical, Engineering, and Life Sciences
  '927110', // Space Research and Technology
  '334511', // Search, Detection, Navigation, Guidance, Aeronautical Systems
  '334220', // Radio and Television Broadcasting Equipment (satellite comms)
] as const;

// Space-related agencies
export const SPACE_AGENCIES = [
  'NASA',
  'Space Force',
  'USSF',
  'NOAA',
  'NRO',
  'Department of Defense',
  'Air Force',
  'DARPA',
  'Space Development Agency',
  'Missile Defense Agency',
] as const;

export interface SAMSearchParams {
  naicsCodes?: string[];
  keywords?: string;
  agency?: string;
  postedFrom?: string;
  postedTo?: string;
  limit?: number;
  offset?: number;
  type?: string;
  setAside?: string;
}

export interface SAMNotice {
  noticeId: string;
  title: string;
  description?: string;
  department?: string;
  subtier?: string;
  office?: string;
  type?: string;
  naicsCode?: string;
  classificationCode?: string;
  setAside?: string;
  responseDeadLine?: string;
  postedDate?: string;
  archiveDate?: string;
  awardDate?: string;
  awardNumber?: string;
  awardee?: { name?: string };
  pointOfContact?: Array<{
    fullName?: string;
    email?: string;
  }>;
  placeOfPerformance?: {
    city?: { name?: string };
    state?: { code?: string };
    country?: { code?: string };
  };
  solicitationNumber?: string;
  award?: {
    amount?: number;
  };
  uiLink?: string;
}

export interface SAMResponse {
  totalRecords: number;
  opportunities: MappedOpportunity[];
}

export interface MappedOpportunity {
  samNoticeId: string;
  title: string;
  description: string | null;
  agency: string;
  subAgency: string | null;
  office: string | null;
  type: string;
  naicsCode: string | null;
  naicsDescription: string | null;
  setAside: string | null;
  classificationCode: string | null;
  estimatedValue: number | null;
  awardAmount: number | null;
  postedDate: Date | null;
  responseDeadline: Date | null;
  awardDate: Date | null;
  placeOfPerformance: string | null;
  pointOfContact: string | null;
  contactEmail: string | null;
  solicitationNumber: string | null;
  awardee: string | null;
  samUrl: string | null;
  isActive: boolean;
  tags: string[];
}

const NAICS_DESCRIPTIONS: Record<string, string> = {
  '336414': 'Guided Missile and Space Vehicle Manufacturing',
  '336415': 'Space Vehicle Propulsion Unit Manufacturing',
  '336419': 'Space Vehicle Parts Manufacturing',
  '517410': 'Satellite Telecommunications',
  '541715': 'R&D in Physical, Engineering, and Life Sciences',
  '927110': 'Space Research and Technology',
  '334511': 'Search, Detection, Navigation, Guidance Systems',
  '334220': 'Broadcasting and Satellite Equipment',
};

function mapSAMNotice(notice: SAMNotice): MappedOpportunity {
  const poc = notice.pointOfContact?.[0];
  const pop = notice.placeOfPerformance;
  const placeStr = pop
    ? [pop.city?.name, pop.state?.code, pop.country?.code].filter(Boolean).join(', ')
    : null;

  // Map SAM.gov notice type to our type
  const typeMap: Record<string, string> = {
    p: 'presolicitation',
    o: 'solicitation',
    k: 'solicitation',
    a: 'award',
    r: 'sources_sought',
    s: 'special_notice',
    i: 'sources_sought',
  };

  const normalizedType = notice.type
    ? typeMap[notice.type.toLowerCase()] || notice.type.toLowerCase()
    : 'solicitation';

  // Generate auto-tags from content
  const tags: string[] = [];
  const titleLower = (notice.title || '').toLowerCase();
  const descLower = (notice.description || '').toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  if (combined.includes('satellite')) tags.push('satellite');
  if (combined.includes('launch')) tags.push('launch');
  if (combined.includes('propulsion')) tags.push('propulsion');
  if (combined.includes('space station') || combined.includes('iss')) tags.push('space-station');
  if (combined.includes('artemis') || combined.includes('lunar') || combined.includes('moon')) tags.push('lunar');
  if (combined.includes('mars')) tags.push('mars');
  if (combined.includes('gps') || combined.includes('navigation')) tags.push('navigation');
  if (combined.includes('small business') || notice.setAside) tags.push('small-business');
  if (combined.includes('sbir') || combined.includes('sttr')) tags.push('sbir-sttr');
  if (combined.includes('research') || combined.includes('r&d')) tags.push('research');
  if (combined.includes('cybersecurity') || combined.includes('cyber')) tags.push('cybersecurity');

  return {
    samNoticeId: notice.noticeId,
    title: notice.title || 'Untitled Opportunity',
    description: notice.description || null,
    agency: notice.department || 'Unknown Agency',
    subAgency: notice.subtier || null,
    office: notice.office || null,
    type: normalizedType,
    naicsCode: notice.naicsCode || null,
    naicsDescription: notice.naicsCode
      ? NAICS_DESCRIPTIONS[notice.naicsCode] || null
      : null,
    setAside: notice.setAside || null,
    classificationCode: notice.classificationCode || null,
    estimatedValue: null,
    awardAmount: notice.award?.amount || null,
    postedDate: notice.postedDate ? new Date(notice.postedDate) : null,
    responseDeadline: notice.responseDeadLine
      ? new Date(notice.responseDeadLine)
      : null,
    awardDate: notice.awardDate ? new Date(notice.awardDate) : null,
    placeOfPerformance: placeStr,
    pointOfContact: poc?.fullName || null,
    contactEmail: poc?.email || null,
    solicitationNumber: notice.solicitationNumber || null,
    awardee: notice.awardee?.name || null,
    samUrl: notice.uiLink || null,
    isActive: true,
    tags,
  };
}

export async function fetchSAMOpportunities(
  params: SAMSearchParams
): Promise<SAMResponse> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) {
    logger.warn('SAM_GOV_API_KEY not configured, returning empty results');
    return { totalRecords: 0, opportunities: [] };
  }

  // Build cache key from params
  const cacheKey = `sam-gov:${JSON.stringify(params)}`;
  const cached = apiCache.get<SAMResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.set('api_key', apiKey);
  queryParams.set('limit', String(params.limit || 25));
  queryParams.set('offset', String(params.offset || 0));

  // Use space-related NAICS codes by default
  const naicsCodes = params.naicsCodes?.length
    ? params.naicsCodes
    : [...SPACE_NAICS_CODES];
  queryParams.set('ncode', naicsCodes.join(','));

  if (params.keywords) {
    queryParams.set('q', params.keywords);
  }
  if (params.agency) {
    queryParams.set('deptname', params.agency);
  }
  if (params.postedFrom) {
    queryParams.set('postedFrom', params.postedFrom);
  }
  if (params.postedTo) {
    queryParams.set('postedTo', params.postedTo);
  }
  if (params.type) {
    queryParams.set('ptype', params.type);
  }
  if (params.setAside) {
    queryParams.set('typeOfSetAside', params.setAside);
  }

  const url = `${SAM_API_URL}?${queryParams.toString()}`;

  return samBreaker.execute(
    async () => {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(
          `SAM.gov API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const totalRecords = data.totalRecords || 0;
      const rawNotices: SAMNotice[] =
        data.opportunitiesData || data.opportunities || [];

      const opportunities = rawNotices.map(mapSAMNotice);

      const result: SAMResponse = { totalRecords, opportunities };

      // Cache for 10 minutes
      apiCache.set(cacheKey, result, CacheTTL.STOCKS);

      logger.info('SAM.gov fetch successful', {
        total: totalRecords,
        returned: opportunities.length,
      });

      return result;
    },
    { totalRecords: 0, opportunities: [] }
  );
}
