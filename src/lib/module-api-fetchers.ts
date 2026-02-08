/**
 * External API fetchers for module data.
 * Each function fetches from a real API, transforms the data, and stores it in DynamicContent.
 */

import { createCircuitBreaker } from './circuit-breaker';
import { EXTERNAL_APIS, fetchWithRetry, formatDateForApi } from './external-apis';
import { upsertContent, bulkUpsertContent, logRefresh } from './dynamic-content';
import { logger } from './logger';

// Circuit breakers for new APIs
const openNotifyBreaker = createCircuitBreaker('open-notify', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

const nasaNeoWsBreaker = createCircuitBreaker('nasa-neows', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

const celestrakGPBreaker = createCircuitBreaker('celestrak-gp', {
  failureThreshold: 3,
  resetTimeout: 300_000,
});

const usaSpendingBreaker = createCircuitBreaker('usaspending', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

const usptoBreaker = createCircuitBreaker('uspto-patentsview', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

// ─── ISS CREW (Open Notify) ─────────────────────────────────────────────

interface OpenNotifyResponse {
  people: Array<{ name: string; craft: string }>;
  number: number;
  message: string;
}

export async function fetchAndStoreISSCrew(): Promise<number> {
  const start = Date.now();
  try {
    const data = await openNotifyBreaker.execute(async () => {
      const res = await fetchWithRetry(`${EXTERNAL_APIS.OPEN_NOTIFY.baseUrl}/astros.json`);
      return res.json() as Promise<OpenNotifyResponse>;
    }, null);

    if (!data || data.message !== 'success') {
      logger.warn('Open Notify API returned non-success', { data });
      return 0;
    }

    // Group by craft (ISS, Tiangong, etc.)
    const byCraft: Record<string, Array<{ name: string; craft: string }>> = {};
    for (const person of data.people) {
      if (!byCraft[person.craft]) byCraft[person.craft] = [];
      byCraft[person.craft].push(person);
    }

    let count = 0;
    for (const [craft, crew] of Object.entries(byCraft)) {
      const key = craft.toLowerCase().replace(/\s+/g, '-');
      await upsertContent(
        `space-stations:crew-${key}`,
        'space-stations',
        'crew',
        {
          craft,
          crewCount: crew.length,
          members: crew.map((c) => ({ name: c.name, craft: c.craft })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: EXTERNAL_APIS.OPEN_NOTIFY.baseUrl }
      );
      count++;
    }

    // Also store the total count
    await upsertContent(
      'space-stations:people-in-space',
      'space-stations',
      'overview',
      {
        totalPeopleInSpace: data.number,
        crafts: Object.keys(byCraft),
        breakdown: Object.entries(byCraft).map(([craft, crew]) => ({
          craft,
          count: crew.length,
        })),
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: EXTERNAL_APIS.OPEN_NOTIFY.baseUrl }
    );
    count++;

    await logRefresh('space-stations', 'api-fetch', 'success', {
      itemsUpdated: count,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`ISS crew data updated: ${data.number} people in space`);
    return count;
  } catch (error) {
    await logRefresh('space-stations', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch ISS crew data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NEAR-EARTH OBJECTS (NASA NeoWs) ────────────────────────────────────

interface NeoWsResponse {
  element_count: number;
  near_earth_objects: Record<
    string,
    Array<{
      id: string;
      name: string;
      nasa_jpl_url: string;
      absolute_magnitude_h: number;
      estimated_diameter: {
        meters: { estimated_diameter_min: number; estimated_diameter_max: number };
      };
      is_potentially_hazardous_asteroid: boolean;
      close_approach_data: Array<{
        close_approach_date: string;
        close_approach_date_full: string;
        relative_velocity: { kilometers_per_hour: string };
        miss_distance: { kilometers: string; lunar: string };
        orbiting_body: string;
      }>;
    }>
  >;
}

export async function fetchAndStoreNeoObjects(): Promise<number> {
  const start = Date.now();
  try {
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const data = await nasaNeoWsBreaker.execute(async () => {
      const url = `${EXTERNAL_APIS.NASA_NEOWS.baseUrl}/feed?start_date=${formatDateForApi(today)}&end_date=${formatDateForApi(weekFromNow)}&api_key=${EXTERNAL_APIS.NASA_NEOWS.apiKey}`;
      const res = await fetchWithRetry(url);
      return res.json() as Promise<NeoWsResponse>;
    }, null);

    if (!data || !data.near_earth_objects) {
      logger.warn('NASA NeoWs returned empty data');
      return 0;
    }

    // Flatten all objects across dates
    const allObjects = Object.values(data.near_earth_objects).flat();

    // Sort by closest approach distance
    const sorted = allObjects
      .filter((obj) => obj.close_approach_data.length > 0)
      .sort((a, b) => {
        const distA = parseFloat(a.close_approach_data[0]?.miss_distance.kilometers || '0');
        const distB = parseFloat(b.close_approach_data[0]?.miss_distance.kilometers || '0');
        return distA - distB;
      });

    // Store top 20 closest approaches
    const closeApproaches = sorted.slice(0, 20).map((obj) => {
      const approach = obj.close_approach_data[0];
      return {
        id: obj.id,
        name: obj.name.replace(/[()]/g, '').trim(),
        nasaUrl: obj.nasa_jpl_url,
        magnitude: obj.absolute_magnitude_h,
        diameterMin: Math.round(obj.estimated_diameter.meters.estimated_diameter_min),
        diameterMax: Math.round(obj.estimated_diameter.meters.estimated_diameter_max),
        isPotentiallyHazardous: obj.is_potentially_hazardous_asteroid,
        approachDate: approach.close_approach_date,
        approachDateFull: approach.close_approach_date_full,
        velocityKmH: Math.round(parseFloat(approach.relative_velocity.kilometers_per_hour)),
        missDistanceKm: Math.round(parseFloat(approach.miss_distance.kilometers)),
        missDistanceLunar: parseFloat(approach.miss_distance.lunar).toFixed(2),
        orbitingBody: approach.orbiting_body,
      };
    });

    // Store close approaches
    await upsertContent(
      'asteroid-watch:close-approaches-live',
      'asteroid-watch',
      'close-approaches',
      {
        approaches: closeApproaches,
        totalCount: data.element_count,
        dateRange: {
          start: formatDateForApi(today),
          end: formatDateForApi(weekFromNow),
        },
        hazardousCount: closeApproaches.filter((a) => a.isPotentiallyHazardous).length,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://api.nasa.gov/neo' }
    );

    // Store summary stats
    await upsertContent(
      'asteroid-watch:neo-stats-live',
      'asteroid-watch',
      'stats',
      {
        weeklyApproachCount: data.element_count,
        hazardousCount: allObjects.filter((o) => o.is_potentially_hazardous_asteroid).length,
        closestApproach: closeApproaches[0] || null,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://api.nasa.gov/neo' }
    );

    await logRefresh('asteroid-watch', 'api-fetch', 'success', {
      itemsUpdated: 2,
      itemsChecked: data.element_count,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`Asteroid data updated: ${data.element_count} objects, ${closeApproaches.length} close approaches`);
    return 2;
  } catch (error) {
    await logRefresh('asteroid-watch', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch NEO data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── SATELLITE CONSTELLATION COUNTS (CelesTrak) ────────────────────────

const CONSTELLATION_GROUPS: Record<string, { group: string; displayName: string; operator: string }> = {
  starlink: { group: 'starlink', displayName: 'Starlink', operator: 'SpaceX' },
  oneweb: { group: 'oneweb', displayName: 'OneWeb', operator: 'Eutelsat OneWeb' },
  'planet': { group: 'planet', displayName: 'Planet Labs', operator: 'Planet Labs' },
  'spire': { group: 'spire', displayName: 'Spire Global', operator: 'Spire Global' },
  iridium: { group: 'iridium-NEXT', displayName: 'Iridium NEXT', operator: 'Iridium Communications' },
  globalstar: { group: 'globalstar', displayName: 'Globalstar', operator: 'Globalstar' },
  orbcomm: { group: 'orbcomm', displayName: 'Orbcomm', operator: 'Orbcomm' },
  'gps-ops': { group: 'gps-ops', displayName: 'GPS', operator: 'US Space Force' },
  'galileo': { group: 'galileo', displayName: 'Galileo', operator: 'ESA/EU' },
  'beidou': { group: 'beidou', displayName: 'BeiDou', operator: 'CNSA' },
  'glonass': { group: 'glo-ops', displayName: 'GLONASS', operator: 'Roscosmos' },
};

export async function fetchAndStoreSatelliteCounts(): Promise<number> {
  const start = Date.now();
  let updated = 0;

  for (const [key, config] of Object.entries(CONSTELLATION_GROUPS)) {
    try {
      const data = await celestrakGPBreaker.execute(async () => {
        const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${config.group}&FORMAT=json`;
        const res = await fetchWithRetry(url);
        return res.json() as Promise<Array<{ OBJECT_NAME: string; NORAD_CAT_ID: number }>>;
      }, null);

      if (!data || !Array.isArray(data)) continue;

      await upsertContent(
        `constellations:${key}`,
        'constellations',
        'constellation-data',
        {
          name: config.displayName,
          operator: config.operator,
          activeSatellites: data.length,
          sampleSatellites: data.slice(0, 5).map((s) => ({
            name: s.OBJECT_NAME,
            noradId: s.NORAD_CAT_ID,
          })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: `https://celestrak.org/NORAD/elements/gp.php?GROUP=${config.group}` }
      );
      updated++;

      // CelesTrak has strict rate limits (4/day per IP) — add delay between requests
      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      logger.warn(`Failed to fetch ${config.displayName} count from CelesTrak`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await logRefresh('constellations', 'api-fetch', updated > 0 ? 'success' : 'failed', {
    itemsUpdated: updated,
    apiCallsMade: updated,
    duration: Date.now() - start,
  });

  logger.info(`Constellation data updated: ${updated} constellations`);
  return updated;
}

// ─── DEFENSE SPENDING (USAspending.gov) ────────────────────────────────

export async function fetchAndStoreDefenseSpending(): Promise<number> {
  const start = Date.now();
  try {
    // Fetch space-related agency spending
    const spaceAgencies = [
      { code: '080', name: 'NASA' },
      { code: '057', name: 'Department of the Air Force' }, // Includes Space Force
      { code: '097', name: 'Department of Defense' },
    ];

    const results: Array<{
      agency: string;
      agencyCode: string;
      totalObligations: number;
      fiscalYear: number;
    }> = [];

    for (const agency of spaceAgencies) {
      try {
        const data = await usaSpendingBreaker.execute(async () => {
          const res = await fetchWithRetry(
            `${EXTERNAL_APIS.USASPENDING.baseUrl}/agency/${agency.code}/`,
            { method: 'GET' }
          );
          return res.json() as Promise<{
            fiscal_year: number;
            toptier_code: string;
            name: string;
            total_obligations: number;
          }>;
        }, null);

        if (data) {
          results.push({
            agency: data.name || agency.name,
            agencyCode: agency.code,
            totalObligations: data.total_obligations || 0,
            fiscalYear: data.fiscal_year || new Date().getFullYear(),
          });
        }
      } catch {
        logger.warn(`Failed to fetch USAspending data for ${agency.name}`);
      }
    }

    if (results.length > 0) {
      await upsertContent(
        'space-defense:agency-spending',
        'space-defense',
        'budgets',
        {
          agencies: results,
          fetchedAt: new Date().toISOString(),
          source: 'USAspending.gov',
        },
        { sourceType: 'api', sourceUrl: EXTERNAL_APIS.USASPENDING.baseUrl }
      );
    }

    await logRefresh('space-defense', 'api-fetch', results.length > 0 ? 'success' : 'partial', {
      itemsUpdated: results.length > 0 ? 1 : 0,
      apiCallsMade: spaceAgencies.length,
      duration: Date.now() - start,
    });

    logger.info(`Defense spending data updated: ${results.length} agencies`);
    return results.length > 0 ? 1 : 0;
  } catch (error) {
    await logRefresh('space-defense', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch defense spending data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── SPACE PATENTS (USPTO PatentsView) ──────────────────────────────────

export async function fetchAndStorePatents(): Promise<number> {
  const start = Date.now();
  try {
    // Search for space-related patents (CPC class B64G = cosmonautics/space vehicles)
    const currentYear = new Date().getFullYear();
    const data = await usptoBreaker.execute(async () => {
      const url = `${EXTERNAL_APIS.USPTO_PATENTSVIEW.baseUrl}/patent/?q={"_and":[{"_gte":{"patent_date":"${currentYear - 1}-01-01"}},{"_contains":{"cpc_group_id":"B64G"}}]}&f=["patent_number","patent_title","patent_date","patent_abstract","assignee_organization"]&o={"page":1,"per_page":25}&s=[{"patent_date":"desc"}]`;
      const res = await fetchWithRetry(url);
      return res.json() as Promise<{
        patents: Array<{
          patent_number: string;
          patent_title: string;
          patent_date: string;
          patent_abstract: string;
          assignees: Array<{ assignee_organization: string }>;
        }>;
        count: number;
        total_patent_count: number;
      }>;
    }, null);

    if (!data || !data.patents) {
      logger.warn('USPTO PatentsView returned empty data');
      return 0;
    }

    const patents = data.patents.map((p) => ({
      number: p.patent_number,
      title: p.patent_title,
      date: p.patent_date,
      abstract: p.patent_abstract?.slice(0, 300),
      assignee: p.assignees?.[0]?.assignee_organization || 'Unknown',
    }));

    await upsertContent(
      'patents:recent-space-patents',
      'patents',
      'recent-filings',
      {
        patents,
        totalCount: data.total_patent_count,
        yearRange: `${currentYear - 1}-${currentYear}`,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: EXTERNAL_APIS.USPTO_PATENTSVIEW.baseUrl }
    );

    // Aggregate top assignees
    const assigneeCounts: Record<string, number> = {};
    for (const p of data.patents) {
      const org = p.assignees?.[0]?.assignee_organization;
      if (org) {
        assigneeCounts[org] = (assigneeCounts[org] || 0) + 1;
      }
    }
    const topAssignees = Object.entries(assigneeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([org, count]) => ({ organization: org, patentCount: count }));

    await upsertContent(
      'patents:top-assignees',
      'patents',
      'top-holders',
      {
        topAssignees,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: EXTERNAL_APIS.USPTO_PATENTSVIEW.baseUrl }
    );

    await logRefresh('patents', 'api-fetch', 'success', {
      itemsUpdated: 2,
      itemsChecked: data.total_patent_count,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`Patent data updated: ${patents.length} recent patents, ${topAssignees.length} top assignees`);
    return 2;
  } catch (error) {
    await logRefresh('patents', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch patent data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── ORCHESTRATOR: Run all external API fetchers ────────────────────────

export async function refreshAllExternalAPIs(): Promise<{
  totalUpdated: number;
  results: Record<string, number>;
}> {
  const results: Record<string, number> = {};

  // Run fetchers sequentially to respect rate limits
  results['iss-crew'] = await fetchAndStoreISSCrew();
  results['neo-objects'] = await fetchAndStoreNeoObjects();
  results['satellite-counts'] = await fetchAndStoreSatelliteCounts();
  results['defense-spending'] = await fetchAndStoreDefenseSpending();
  results['patents'] = await fetchAndStorePatents();

  const totalUpdated = Object.values(results).reduce((sum, n) => sum + n, 0);

  logger.info('External API refresh complete', { totalUpdated, results });

  return { totalUpdated, results };
}
