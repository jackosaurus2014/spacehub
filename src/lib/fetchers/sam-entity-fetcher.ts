// ─── SAM.gov Entity API Integration ──────────────────────────────────────────
// Fetches contractor registration data (CAGE codes, NAICS, registration status).
// Enriches company profiles with government contracting eligibility data.
// API docs: https://open.gsa.gov/api/entity-api/

import { logger } from '../logger';
import { upsertContent } from '../dynamic-content';

const ENTITY_URL = 'https://api.sam.gov/entity-information/v3/entities';

interface EntityRecord {
  ueiSAM: string;          // Unique Entity Identifier
  entityName: string;
  cageCode: string;
  registrationStatus: string;
  naicsCodeList: string[];
  physicalAddress: {
    city: string;
    state: string;
    country: string;
  };
  businessTypes: string[];
  sbaBusinessTypes: string[];
  activeDate: string;
  expirationDate: string;
}

// Known space companies to look up
const SPACE_COMPANY_NAMES = [
  'SpaceX', 'Blue Origin', 'Rocket Lab', 'Relativity Space',
  'Northrop Grumman', 'Lockheed Martin', 'Boeing',
  'L3Harris', 'Ball Aerospace', 'Aerojet Rocketdyne',
  'Planet Labs', 'Maxar', 'Viasat', 'SES',
  'Firefly Aerospace', 'Virgin Orbit', 'ABL Space',
  'Astrobotic', 'Intuitive Machines', 'ispace',
];

/**
 * Fetch entity registration data for known space companies.
 * Runs monthly to enrich company profiles.
 */
export async function fetchSpaceEntityData(): Promise<number> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) {
    logger.debug('SAM_GOV_API_KEY not set — skipping entity fetch');
    return 0;
  }

  const entities: EntityRecord[] = [];

  // Search for each company (limit to avoid rate limits)
  for (const companyName of SPACE_COMPANY_NAMES.slice(0, 10)) {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        legalBusinessName: companyName,
        registrationStatus: 'A', // Active only
      });

      const res = await fetch(`${ENTITY_URL}?${params}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const results = data?.entityData || [];

      for (const entity of results.slice(0, 1)) { // Take first match
        const core = entity.coreData || {};
        const entityInfo = core.entityInformation || {};
        const physAddr = core.physicalAddress || {};
        const businessTypes = entity.assertions?.goodsAndServices?.naicsList || [];

        entities.push({
          ueiSAM: core.ueiSAM || '',
          entityName: entityInfo.entityLegalBusinessName || companyName,
          cageCode: entityInfo.cageCode || '',
          registrationStatus: core.registrationStatus || 'Active',
          naicsCodeList: businessTypes.map((n: { naicsCode: string }) => n.naicsCode).slice(0, 10),
          physicalAddress: {
            city: physAddr.city || '',
            state: physAddr.stateOrProvinceCode || '',
            country: physAddr.countryCode || 'US',
          },
          businessTypes: (entity.assertions?.businessTypes || []).map((bt: { businessTypeDescription: string }) => bt.businessTypeDescription),
          sbaBusinessTypes: (entity.assertions?.sbaBusinessTypes || []).map((bt: { sbaBusinessTypeDescription: string }) => bt.sbaBusinessTypeDescription),
          activeDate: core.registrationDate || '',
          expirationDate: core.expirationDate || '',
        });
      }
    } catch (err) {
      logger.debug('SAM.gov entity lookup failed for ' + companyName, { error: String(err) });
    }
  }

  if (entities.length > 0) {
    await upsertContent(
      'procurement:sam-entities:space-companies',
      'procurement',
      'sam-entities',
      entities,
      { sourceType: 'api', sourceUrl: 'https://sam.gov' },
    );
  }

  logger.info('SAM.gov entity data fetched', { count: entities.length });
  return entities.length;
}
