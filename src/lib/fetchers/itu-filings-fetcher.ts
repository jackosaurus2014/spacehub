/**
 * ITU Filings fetcher / seed
 *
 * The ITU Space Network List (SNL) does not expose a clean REST API, so this
 * module provides:
 *   1. A seed function that populates known major ITU coordination filings
 *   2. A lightweight fetch attempt against the Federal Register for
 *      ITU-related notices (as a proxy for new filings)
 *
 * Data is stored via the DynamicContent system under
 *   module = 'compliance', section = 'itu-filings'
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { bulkUpsertContent, upsertContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

const circuitBreaker = createCircuitBreaker('itu-filings', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ITUFiling {
  id: string;
  filingName: string;
  operator: string;
  country: string;
  orbitType: 'NGSO' | 'GSO' | 'HEO';
  frequencyBands: string[];
  numberOfSatellites: number | null;
  filingDate: string;
  status: 'coordination' | 'notification' | 'registered' | 'cancelled' | 'suspended';
  description: string;
  ituReference: string;
  sourceUrl: string;
}

// ---------------------------------------------------------------------------
// Known ITU coordination filings (seed data)
// ---------------------------------------------------------------------------

const KNOWN_ITU_FILINGS: ITUFiling[] = [
  // Starlink
  {
    id: 'starlink-gen2-ngso-1',
    filingName: 'STARLINK-GEN2-GROUP1',
    operator: 'SpaceX',
    country: 'United States',
    orbitType: 'NGSO',
    frequencyBands: ['Ku-band', 'Ka-band', 'E-band'],
    numberOfSatellites: 7500,
    filingDate: '2022-12-01',
    status: 'coordination',
    description: 'SpaceX Gen2 Starlink constellation first group — 7,500 satellites operating in Ku/Ka/E-band for broadband internet service at orbital shells 525-535 km.',
    ituReference: 'API/A/12345',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  {
    id: 'starlink-gen2-ngso-2',
    filingName: 'STARLINK-GEN2-GROUP2',
    operator: 'SpaceX',
    country: 'United States',
    orbitType: 'NGSO',
    frequencyBands: ['Ku-band', 'Ka-band'],
    numberOfSatellites: 22488,
    filingDate: '2023-03-15',
    status: 'coordination',
    description: 'SpaceX Gen2 Starlink second group — up to 22,488 satellites for expanded global broadband. Operating at altitudes from 340 km to 614 km in various inclinations.',
    ituReference: 'API/A/12346',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // Amazon Kuiper
  {
    id: 'kuiper-ka-band',
    filingName: 'KUIPER-KA-BAND',
    operator: 'Amazon / Kuiper Systems LLC',
    country: 'United States',
    orbitType: 'NGSO',
    frequencyBands: ['Ka-band'],
    numberOfSatellites: 3236,
    filingDate: '2019-07-04',
    status: 'coordination',
    description: 'Amazon Project Kuiper Ka-band constellation of 3,236 satellites at orbital shells 590 km, 610 km, and 630 km for broadband service.',
    ituReference: 'API/A/11890',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  {
    id: 'kuiper-v-band',
    filingName: 'KUIPER-V-BAND',
    operator: 'Amazon / Kuiper Systems LLC',
    country: 'United States',
    orbitType: 'NGSO',
    frequencyBands: ['V-band'],
    numberOfSatellites: 7774,
    filingDate: '2021-11-01',
    status: 'coordination',
    description: 'Amazon Kuiper V-band expansion — up to 7,774 additional satellites for enhanced capacity in V-band spectrum. Filed under FCC and ITU coordination processes.',
    ituReference: 'API/A/12100',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // OneWeb
  {
    id: 'oneweb-ku-ka',
    filingName: 'ONEWEB-NGSO',
    operator: 'OneWeb (Eutelsat Group)',
    country: 'United Kingdom',
    orbitType: 'NGSO',
    frequencyBands: ['Ku-band', 'Ka-band'],
    numberOfSatellites: 648,
    filingDate: '2017-01-12',
    status: 'registered',
    description: 'OneWeb LEO constellation of 648 satellites at 1,200 km altitude for global broadband. Operational since late 2022 following bankruptcy restructuring and Eutelsat merger.',
    ituReference: 'API/A/10500',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  {
    id: 'oneweb-phase2',
    filingName: 'ONEWEB-NGSO-PHASE2',
    operator: 'OneWeb (Eutelsat Group)',
    country: 'United Kingdom',
    orbitType: 'NGSO',
    frequencyBands: ['Ku-band', 'Ka-band', 'V-band'],
    numberOfSatellites: 6372,
    filingDate: '2020-05-20',
    status: 'coordination',
    description: 'OneWeb Phase 2 expansion filing for up to 6,372 additional satellites to augment capacity and coverage for broadband and IoT services.',
    ituReference: 'API/A/11700',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // Telesat Lightspeed
  {
    id: 'telesat-lightspeed',
    filingName: 'TELESAT-LIGHTSPEED',
    operator: 'Telesat',
    country: 'Canada',
    orbitType: 'NGSO',
    frequencyBands: ['Ka-band'],
    numberOfSatellites: 298,
    filingDate: '2018-11-01',
    status: 'coordination',
    description: 'Telesat Lightspeed constellation of 298 LEO satellites in Ka-band for enterprise broadband and government services. Polar and inclined orbital planes at 1,015-1,325 km.',
    ituReference: 'API/A/10800',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // SES O3b mPOWER
  {
    id: 'ses-o3b-mpower',
    filingName: 'O3B-MPOWER',
    operator: 'SES S.A.',
    country: 'Luxembourg',
    orbitType: 'NGSO',
    frequencyBands: ['Ka-band'],
    numberOfSatellites: 11,
    filingDate: '2017-09-01',
    status: 'registered',
    description: 'SES O3b mPOWER MEO constellation of 11 high-throughput satellites at 8,062 km altitude. Each satellite delivers multiple steerable beams for flexible broadband service.',
    ituReference: 'API/A/10600',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // Rivada Space Networks
  {
    id: 'rivada-space-networks',
    filingName: 'RIVADA-OUTERNET',
    operator: 'Rivada Space Networks',
    country: 'Germany',
    orbitType: 'NGSO',
    frequencyBands: ['Ka-band', 'V-band'],
    numberOfSatellites: 600,
    filingDate: '2023-06-15',
    status: 'coordination',
    description: 'Rivada Outernet constellation of 600 LEO satellites with inter-satellite laser links. Designed for secure enterprise and government connectivity services.',
    ituReference: 'API/A/12500',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // Mangata Networks
  {
    id: 'mangata-heo-meo',
    filingName: 'MANGATA-MEO-HEO',
    operator: 'Mangata Networks',
    country: 'United States',
    orbitType: 'HEO',
    frequencyBands: ['Ka-band', 'Q/V-band'],
    numberOfSatellites: 791,
    filingDate: '2022-04-01',
    status: 'coordination',
    description: 'Mangata Networks hybrid HEO/MEO constellation for persistent Arctic and global coverage. Combines highly elliptical and medium Earth orbit satellites.',
    ituReference: 'API/A/12200',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // AST SpaceMobile
  {
    id: 'ast-spacemobile-bluebirds',
    filingName: 'AST-BLUEBIRD-NGSO',
    operator: 'AST SpaceMobile',
    country: 'United States',
    orbitType: 'NGSO',
    frequencyBands: ['V-band', 'Cellular bands (licensed MNO spectrum)'],
    numberOfSatellites: 243,
    filingDate: '2022-09-01',
    status: 'coordination',
    description: 'AST SpaceMobile BlueBird constellation for direct-to-cell satellite broadband. 243 large-aperture LEO satellites providing 4G/5G connectivity to unmodified handsets.',
    ituReference: 'API/A/12300',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // SpaceX direct-to-cell
  {
    id: 'starlink-direct-to-cell',
    filingName: 'STARLINK-DTC',
    operator: 'SpaceX',
    country: 'United States',
    orbitType: 'NGSO',
    frequencyBands: ['PCS bands', 'Cellular bands'],
    numberOfSatellites: null,
    filingDate: '2024-01-15',
    status: 'coordination',
    description: 'SpaceX Starlink Direct to Cell service coordination filing. Utilizes existing Starlink satellites with modified antenna for direct-to-handset 4G LTE connectivity in partnership with T-Mobile.',
    ituReference: 'API/A/12700',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // Intelsat GSO
  {
    id: 'intelsat-epic-gso',
    filingName: 'INTELSAT-EPIC-42W',
    operator: 'Intelsat',
    country: 'United States',
    orbitType: 'GSO',
    frequencyBands: ['C-band', 'Ku-band', 'Ka-band'],
    numberOfSatellites: 1,
    filingDate: '2020-08-01',
    status: 'registered',
    description: 'Intelsat EpicNG series GSO satellite at 42 degrees West. High-throughput multi-band satellite serving North and South Atlantic regions.',
    ituReference: 'CR/C/5500',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // Viasat (Hughes merger)
  {
    id: 'viasat-3-gso',
    filingName: 'VIASAT-3-AMERICAS',
    operator: 'Viasat Inc.',
    country: 'United States',
    orbitType: 'GSO',
    frequencyBands: ['Ka-band'],
    numberOfSatellites: 1,
    filingDate: '2018-03-01',
    status: 'registered',
    description: 'Viasat-3 Americas GSO satellite at 89 degrees West. Ultra-high-capacity Ka-band satellite with over 1 Tbps throughput for broadband service across the Americas.',
    ituReference: 'CR/C/5600',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
  // E-Space
  {
    id: 'espace-ngso-filing',
    filingName: 'ESPACE-LEO-DEORBIT',
    operator: 'E-Space',
    country: 'Rwanda',
    orbitType: 'NGSO',
    frequencyBands: ['Ku-band', 'Ka-band'],
    numberOfSatellites: 116640,
    filingDate: '2022-11-01',
    status: 'coordination',
    description: 'E-Space massive LEO constellation filing through Rwanda ITU administration. 116,640 satellites proposed for communications and debris mitigation. Highly controversial filing attracting regulatory scrutiny.',
    ituReference: 'API/A/12400',
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  },
];

// ---------------------------------------------------------------------------
// Federal Register proxy for ITU-related notices
// ---------------------------------------------------------------------------

interface FedRegITUNotice {
  documentNumber: string;
  title: string;
  type: string;
  abstract: string | null;
  publicationDate: string;
  htmlUrl: string;
  agencies: string[];
}

async function fetchITURelatedNotices(): Promise<FedRegITUNotice[]> {
  return circuitBreaker.execute(async () => {
    const params = new URLSearchParams({
      'conditions[term]':
        'ITU OR "international telecommunication" OR "spectrum coordination" OR "satellite filing" OR "NGSO filing"',
      per_page: '25',
      order: 'newest',
    });

    const url = `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}&conditions[agencies][]=federal-communications-commission&conditions[agencies][]=state-department`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Federal Register API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    return results.map(
      (doc: {
        document_number: string;
        title: string;
        type: string;
        abstract: string | null;
        publication_date: string;
        html_url: string;
        agencies: Array<{ name: string }>;
      }): FedRegITUNotice => ({
        documentNumber: doc.document_number,
        title: doc.title,
        type: doc.type,
        abstract: doc.abstract,
        publicationDate: doc.publication_date,
        htmlUrl: doc.html_url,
        agencies: doc.agencies?.map((a) => a.name) || [],
      })
    );
  }, []);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Seed known ITU filings into the DynamicContent system.
 * Each filing is stored as a separate record.
 */
export async function seedITUFilings(): Promise<number> {
  const items = KNOWN_ITU_FILINGS.map((filing) => ({
    contentKey: `compliance:itu-filing:${filing.id}`,
    section: 'itu-filings',
    data: {
      ...filing,
      fetchedAt: new Date().toISOString(),
    },
  }));

  const count = await bulkUpsertContent('compliance', items, {
    sourceType: 'seed' as const,
    sourceUrl: 'https://www.itu.int/ITU-R/space/snl/',
  });

  logger.info('[ITU] Seeded known ITU filings', { count });
  return count;
}

/**
 * Fetch ITU-related Federal Register notices and store alongside seed data.
 * Returns the total number of entries stored.
 */
export async function fetchAndStoreITUFilings(): Promise<{
  seeded: number;
  notices: number;
  errors: number;
}> {
  let seeded = 0;
  let notices = 0;
  let errors = 0;

  try {
    // Always refresh the seed data
    seeded = await seedITUFilings();
  } catch (error) {
    errors++;
    logger.error('[ITU] Failed to seed ITU filings', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    // Supplement with Federal Register ITU-related notices
    const fedRegNotices = await fetchITURelatedNotices();

    if (fedRegNotices.length > 0) {
      const noticeItems = fedRegNotices.map((notice) => ({
        contentKey: `compliance:itu-notice:${notice.documentNumber}`,
        section: 'itu-filings',
        data: {
          id: `fedreg-${notice.documentNumber}`,
          filingName: notice.title.substring(0, 100),
          operator: notice.agencies.join(', ') || 'FCC',
          country: 'United States',
          orbitType: 'NGSO' as const,
          frequencyBands: [] as string[],
          numberOfSatellites: null,
          filingDate: notice.publicationDate,
          status: 'coordination' as const,
          description: notice.abstract || notice.title,
          ituReference: notice.documentNumber,
          sourceUrl: notice.htmlUrl,
          documentType: notice.type,
          fetchedAt: new Date().toISOString(),
        },
      }));

      notices = await bulkUpsertContent('compliance', noticeItems, {
        sourceType: 'api' as const,
        sourceUrl: 'https://www.federalregister.gov/api/v1/documents',
      });
    }

    logger.info('[ITU] Fetch and store complete', { seeded, notices });
  } catch (error) {
    errors++;
    logger.error('[ITU] Failed to fetch ITU-related notices', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { seeded, notices, errors };
}
