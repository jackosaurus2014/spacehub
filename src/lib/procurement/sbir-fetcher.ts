import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

const sbirBreaker = createCircuitBreaker('sbir-gov', {
  failureThreshold: 3,
  resetTimeout: 120000,
});

const SBIR_API_URL = 'https://www.sbir.gov/api/solicitations.json';

// Space-related keywords for filtering SBIR/STTR topics
const SPACE_KEYWORDS = [
  'space',
  'satellite',
  'orbit',
  'launch',
  'rocket',
  'propulsion',
  'spacecraft',
  'lunar',
  'mars',
  'asteroid',
  'telescope',
  'remote sensing',
  'earth observation',
  'GPS',
  'navigation',
  'cislunar',
  'deep space',
  'solar',
  'radiation',
  'microgravity',
  'LEO',
  'GEO',
  'MEO',
];

export interface SBIRSearchParams {
  agency?: string;
  keyword?: string;
  open?: boolean;
}

export interface RawSBIRSolicitation {
  id?: number;
  agency?: string;
  program?: string;
  topic_number?: string;
  topic_title?: string;
  description?: string;
  phase?: string;
  award_amount?: number;
  open_date?: string;
  close_date?: string;
  solicitation_url?: string;
  keywords?: string[];
}

export interface MappedSBIRSolicitation {
  program: string;
  agency: string;
  topicNumber: string | null;
  topicTitle: string;
  description: string | null;
  phase: string | null;
  awardAmount: number | null;
  openDate: Date | null;
  closeDate: Date | null;
  url: string | null;
  keywords: string[];
  isActive: boolean;
}

function isSpaceRelated(solicitation: RawSBIRSolicitation): boolean {
  // Always include NASA and SpaceWERX/Space Force solicitations
  const agency = (solicitation.agency || '').toLowerCase();
  if (
    agency.includes('nasa') ||
    agency.includes('spacewerx') ||
    agency.includes('space force')
  ) {
    return true;
  }

  // Check title and description for space keywords
  const text = `${solicitation.topic_title || ''} ${solicitation.description || ''}`.toLowerCase();
  return SPACE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

function mapSBIRSolicitation(
  raw: RawSBIRSolicitation
): MappedSBIRSolicitation {
  const now = new Date();
  const closeDate = raw.close_date ? new Date(raw.close_date) : null;

  return {
    program: raw.program || 'SBIR',
    agency: raw.agency || 'Unknown',
    topicNumber: raw.topic_number || null,
    topicTitle: raw.topic_title || 'Untitled Topic',
    description: raw.description || null,
    phase: raw.phase || null,
    awardAmount: raw.award_amount || null,
    openDate: raw.open_date ? new Date(raw.open_date) : null,
    closeDate,
    url: raw.solicitation_url || null,
    keywords: raw.keywords || [],
    isActive: closeDate ? closeDate > now : true,
  };
}

export async function fetchSBIRSolicitations(
  params: SBIRSearchParams
): Promise<MappedSBIRSolicitation[]> {
  const cacheKey = `sbir:${JSON.stringify(params)}`;
  const cached = apiCache.get<MappedSBIRSolicitation[]>(cacheKey);
  if (cached) {
    return cached;
  }

  return sbirBreaker.execute(
    async () => {
      const queryParams = new URLSearchParams();

      if (params.agency) {
        queryParams.set('agency', params.agency);
      }
      if (params.keyword) {
        queryParams.set('keyword', params.keyword);
      }
      if (params.open !== undefined) {
        queryParams.set('open', params.open ? '1' : '0');
      }

      const urlStr = queryParams.toString()
        ? `${SBIR_API_URL}?${queryParams.toString()}`
        : SBIR_API_URL;

      const response = await fetch(urlStr, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(
          `SBIR.gov API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const rawSolicitations: RawSBIRSolicitation[] = Array.isArray(data)
        ? data
        : data.solicitations || [];

      // Filter for space-related topics
      const spaceSolicitations = rawSolicitations
        .filter(isSpaceRelated)
        .map(mapSBIRSolicitation);

      // Cache for 15 minutes
      apiCache.set(cacheKey, spaceSolicitations, CacheTTL.SLOW);

      logger.info('SBIR.gov fetch successful', {
        total: rawSolicitations.length,
        spaceRelated: spaceSolicitations.length,
      });

      return spaceSolicitations;
    },
    []
  );
}
