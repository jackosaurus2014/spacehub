/**
 * External API fetchers for module data.
 * Each function fetches from a real API, transforms the data, and stores it in DynamicContent.
 */

import { createCircuitBreaker } from './circuit-breaker';
import {
  EXTERNAL_APIS,
  fetchWithRetry,
  formatDateForApi,
  fetchNasaApod,
  fetchNasaTechport,
  fetchJplCad,
  fetchNoaaSwpcJson,
  fetchNoaaSwpcProducts,
  fetchFinnhub,
  fetchSamGov,
  fetchFccEcfs,
} from './external-apis';
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

// ─── NASA APOD (Astronomy Picture of the Day) ──────────────────────────

interface ApodResponse {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
}

export async function fetchAndStoreApod(): Promise<number> {
  const start = Date.now();
  try {
    const data = await fetchNasaApod() as ApodResponse | null;

    if (!data || !data.title) {
      logger.warn('NASA APOD returned empty data');
      return 0;
    }

    await upsertContent(
      'mission-control:apod-today',
      'mission-control',
      'apod',
      {
        date: data.date,
        title: data.title,
        explanation: data.explanation?.slice(0, 500),
        imageUrl: data.url,
        hdImageUrl: data.hdurl || null,
        mediaType: data.media_type,
        copyright: data.copyright || null,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://api.nasa.gov/planetary/apod' }
    );

    await logRefresh('mission-control', 'api-fetch', 'success', {
      itemsUpdated: 1,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`APOD data updated: ${data.title}`);
    return 1;
  } catch (error) {
    await logRefresh('mission-control', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch APOD data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NASA TechPort (Technology Projects) ────────────────────────────────

interface TechportProjectSummary {
  projectId: number;
  title: string;
  acronym?: string;
  statusDescription?: string;
  startDateString?: string;
  endDateString?: string;
  description?: string;
  leadOrganization?: { organizationName: string };
  program?: { title: string };
}

export async function fetchAndStoreTechProjects(): Promise<number> {
  const start = Date.now();
  try {
    // Fetch projects updated in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const updatedSince = formatDateForApi(thirtyDaysAgo);

    const data = await fetchNasaTechport('projects', { updatedSince }) as {
      projects?: Array<{ projectId: number }>;
    } | null;

    if (!data || !data.projects || data.projects.length === 0) {
      logger.warn('NASA TechPort returned empty project list');
      return 0;
    }

    // Fetch details for up to 10 recent projects (rate-limit friendly)
    const projectIds = data.projects.slice(0, 10).map((p) => p.projectId);
    const projectDetails: TechportProjectSummary[] = [];

    for (const id of projectIds) {
      try {
        const detail = await fetchNasaTechport(`projects/${id}`) as {
          project?: TechportProjectSummary;
        } | null;
        if (detail?.project) {
          projectDetails.push(detail.project);
        }
        // Small delay between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        // Skip individual project failures
        continue;
      }
    }

    if (projectDetails.length === 0) {
      logger.warn('NASA TechPort: no project details retrieved');
      return 0;
    }

    const projects = projectDetails.map((p) => ({
      id: p.projectId,
      title: p.title,
      acronym: p.acronym || null,
      status: p.statusDescription || 'Unknown',
      startDate: p.startDateString || null,
      endDate: p.endDateString || null,
      description: p.description?.slice(0, 300) || null,
      organization: p.leadOrganization?.organizationName || null,
      program: p.program?.title || null,
    }));

    await upsertContent(
      'mission-control:nasa-tech-projects',
      'mission-control',
      'technology',
      {
        projects,
        totalProjectsUpdated: data.projects.length,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://techport.nasa.gov' }
    );

    await logRefresh('mission-control', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.projects.length,
      apiCallsMade: projectIds.length + 1,
      duration: Date.now() - start,
    });

    logger.info(`TechPort data updated: ${projects.length} projects from ${data.projects.length} recently updated`);
    return 1;
  } catch (error) {
    await logRefresh('mission-control', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch TechPort data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── JPL SBDB Close Approach Data (Asteroids) ──────────────────────────

interface CadApiResponse {
  signature: { version: string; source: string };
  count: number;
  fields: string[];
  data: Array<Array<string | null>>;
}

export async function fetchAndStoreJplCloseApproaches(): Promise<number> {
  const start = Date.now();
  try {
    const today = formatDateForApi(new Date());
    const sixtyDaysOut = new Date();
    sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);

    const data = await fetchJplCad({
      'date-min': today,
      'date-max': formatDateForApi(sixtyDaysOut),
      'dist-max': '0.05', // 0.05 AU — NEO close approach threshold
      sort: 'dist',
    }) as CadApiResponse | null;

    if (!data || !data.data || data.count === 0) {
      logger.warn('JPL CAD returned empty data');
      return 0;
    }

    // Map field names to indices
    const fieldIndex: Record<string, number> = {};
    data.fields.forEach((f, i) => { fieldIndex[f] = i; });

    const approaches = data.data.slice(0, 25).map((row) => ({
      designation: row[fieldIndex['des']] || 'Unknown',
      orbitId: row[fieldIndex['orbit_id']] || null,
      closeApproachDate: row[fieldIndex['cd']] || null,
      distanceAU: row[fieldIndex['dist']] ? parseFloat(row[fieldIndex['dist']] as string) : null,
      distanceMinAU: row[fieldIndex['dist_min']] ? parseFloat(row[fieldIndex['dist_min']] as string) : null,
      distanceMaxAU: row[fieldIndex['dist_max']] ? parseFloat(row[fieldIndex['dist_max']] as string) : null,
      velocityKmS: row[fieldIndex['v_rel']] ? parseFloat(row[fieldIndex['v_rel']] as string) : null,
      velocityInfKmS: row[fieldIndex['v_inf']] ? parseFloat(row[fieldIndex['v_inf']] as string) : null,
      absoluteMagnitude: row[fieldIndex['h']] ? parseFloat(row[fieldIndex['h']] as string) : null,
      body: row[fieldIndex['body']] || 'Earth',
    }));

    await upsertContent(
      'asteroid-watch:jpl-close-approaches',
      'asteroid-watch',
      'jpl-close-approaches',
      {
        approaches,
        totalCount: data.count,
        dateRange: { start: today, end: formatDateForApi(sixtyDaysOut) },
        source: 'JPL SBDB Close Approach Data',
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://ssd-api.jpl.nasa.gov/cad.api' }
    );

    await logRefresh('asteroid-watch', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.count,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`JPL CAD data updated: ${data.count} close approaches in next 60 days`);
    return 1;
  } catch (error) {
    await logRefresh('asteroid-watch', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch JPL CAD data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NOAA SWPC Enhanced Space Weather (Kp Index, Solar Regions, Alerts) ─

export async function fetchAndStoreEnhancedSpaceWeather(): Promise<number> {
  const start = Date.now();
  let updated = 0;

  // 1. Planetary K-index (geomagnetic activity indicator)
  try {
    const kpData = await fetchNoaaSwpcJson('planetary_k_index_1m.json') as Array<{
      time_tag: string;
      kp_index: number;
      a_running: number;
      station_count: number;
    }> | null;

    if (kpData && Array.isArray(kpData) && kpData.length > 0) {
      // Get the most recent 24 hours of data
      const recent = kpData.slice(-24);
      const latestKp = recent[recent.length - 1];
      const maxKp = Math.max(...recent.map((d) => d.kp_index));

      await upsertContent(
        'space-environment:kp-index-live',
        'space-environment',
        'kp-index',
        {
          currentKp: latestKp.kp_index,
          maxKp24h: maxKp,
          stormLevel: maxKp >= 7 ? 'Extreme (G4-G5)' : maxKp >= 5 ? 'Strong (G3)' : maxKp >= 4 ? 'Moderate (G1-G2)' : 'Quiet',
          recentReadings: recent.map((d) => ({
            time: d.time_tag,
            kpIndex: d.kp_index,
            aRunning: d.a_running,
          })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch Kp index data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 2. Solar regions (active sunspot regions)
  try {
    const regions = await fetchNoaaSwpcJson('solar_regions.json') as Array<{
      observed_date: string;
      region: number;
      latitude: number;
      longitude: number;
      location: string;
      carrington_longitude: number;
      area: number;
      spot_class: string;
      mag_class: string;
      num_spots: number;
    }> | null;

    if (regions && Array.isArray(regions) && regions.length > 0) {
      // Get the most recent observation date's data
      const latestDate = regions[regions.length - 1]?.observed_date;
      const todayRegions = regions.filter((r) => r.observed_date === latestDate);

      await upsertContent(
        'space-environment:solar-regions-live',
        'space-environment',
        'solar-regions',
        {
          observedDate: latestDate,
          activeRegionCount: todayRegions.length,
          totalSunspots: todayRegions.reduce((sum, r) => sum + (r.num_spots || 0), 0),
          regions: todayRegions.map((r) => ({
            region: r.region,
            location: r.location,
            area: r.area,
            spotClass: r.spot_class,
            magClass: r.mag_class,
            numSpots: r.num_spots,
          })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/solar_regions.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch solar regions data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 3. Solar Cycle Sunspot Progression
  try {
    const sunspotData = await fetchNoaaSwpcJson('solar-cycle/predicted-solar-cycle.json') as Array<{
      'time-tag': string;
      predicted_ssn: number;
      high_ssn: number;
      low_ssn: number;
    }> | null;

    if (sunspotData && Array.isArray(sunspotData) && sunspotData.length > 0) {
      // Get last 12 months + next 12 months of predictions
      const now = new Date();
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const twelveMonthsAhead = new Date(now);
      twelveMonthsAhead.setMonth(twelveMonthsAhead.getMonth() + 12);

      const relevant = sunspotData.filter((d) => {
        const date = new Date(d['time-tag']);
        return date >= twelveMonthsAgo && date <= twelveMonthsAhead;
      });

      await upsertContent(
        'space-environment:solar-cycle-prediction',
        'space-environment',
        'solar-cycle',
        {
          predictions: relevant.map((d) => ({
            date: d['time-tag'],
            predictedSsn: d.predicted_ssn,
            highSsn: d.high_ssn,
            lowSsn: d.low_ssn,
          })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch solar cycle data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 4. NOAA Space Weather Alerts
  try {
    const alerts = await fetchNoaaSwpcProducts('alerts.json') as Array<{
      product_id: string;
      issue_datetime: string;
      message: string;
    }> | null;

    if (alerts && Array.isArray(alerts) && alerts.length > 0) {
      // Get last 10 alerts
      const recentAlerts = alerts.slice(-10).reverse();

      await upsertContent(
        'space-environment:swpc-alerts-live',
        'space-environment',
        'alerts',
        {
          alertCount: alerts.length,
          recentAlerts: recentAlerts.map((a) => ({
            id: a.product_id,
            issuedAt: a.issue_datetime,
            message: a.message?.slice(0, 500),
          })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/products/alerts.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch SWPC alerts', { error: error instanceof Error ? error.message : String(error) });
  }

  // 5. F10.7 cm Solar Radio Flux
  try {
    const fluxData = await fetchNoaaSwpcJson('f107_cm_flux.json') as Array<{
      time_tag: string;
      flux: number;
    }> | null;

    if (fluxData && Array.isArray(fluxData) && fluxData.length > 0) {
      const recent = fluxData.slice(-30); // Last 30 readings
      const latest = recent[recent.length - 1];

      await upsertContent(
        'space-environment:solar-flux-live',
        'space-environment',
        'solar-flux',
        {
          currentFlux: latest.flux,
          latestTime: latest.time_tag,
          activityLevel: latest.flux >= 200 ? 'Very High' : latest.flux >= 150 ? 'High' : latest.flux >= 100 ? 'Moderate' : 'Low',
          recentReadings: recent.map((d) => ({
            time: d.time_tag,
            flux: d.flux,
          })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/f107_cm_flux.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch solar flux data', { error: error instanceof Error ? error.message : String(error) });
  }

  await logRefresh('space-environment', 'api-fetch', updated > 0 ? 'success' : 'failed', {
    itemsUpdated: updated,
    apiCallsMade: 5,
    duration: Date.now() - start,
  });

  logger.info(`Enhanced space weather data updated: ${updated} datasets`);
  return updated;
}

// ─── SPACE COMPANY STOCKS (Finnhub) ─────────────────────────────────────

const SPACE_COMPANY_TICKERS = [
  { symbol: 'RKLB', name: 'Rocket Lab USA' },
  { symbol: 'SPCE', name: 'Virgin Galactic' },
  { symbol: 'BA', name: 'Boeing' },
  { symbol: 'LMT', name: 'Lockheed Martin' },
  { symbol: 'NOC', name: 'Northrop Grumman' },
  { symbol: 'RTX', name: 'RTX Corporation (Raytheon)' },
  { symbol: 'LHX', name: 'L3Harris Technologies' },
  { symbol: 'ASTS', name: 'AST SpaceMobile' },
  { symbol: 'PL', name: 'Planet Labs' },
  { symbol: 'BKSY', name: 'BlackSky Technology' },
  { symbol: 'MNTS', name: 'Momentus' },
  { symbol: 'LUNR', name: 'Intuitive Machines' },
  { symbol: 'RDW', name: 'Redwire Corporation' },
  { symbol: 'VSAT', name: 'ViaSat' },
];

export async function fetchAndStoreSpaceStocks(): Promise<number> {
  const start = Date.now();
  try {
    if (!EXTERNAL_APIS.FINNHUB.apiKey) {
      logger.info('Finnhub API key not configured — skipping space stocks fetch');
      return 0;
    }

    const quotes: Array<{
      symbol: string;
      name: string;
      currentPrice: number;
      change: number;
      changePercent: number;
      highPrice: number;
      lowPrice: number;
      openPrice: number;
      previousClose: number;
      timestamp: number;
    }> = [];

    for (const company of SPACE_COMPANY_TICKERS) {
      try {
        const data = await fetchFinnhub('quote', { symbol: company.symbol }) as {
          c: number; // current price
          d: number; // change
          dp: number; // change percent
          h: number; // high
          l: number; // low
          o: number; // open
          pc: number; // previous close
          t: number; // timestamp
        } | null;

        if (data && data.c > 0) {
          quotes.push({
            symbol: company.symbol,
            name: company.name,
            currentPrice: data.c,
            change: data.d,
            changePercent: data.dp,
            highPrice: data.h,
            lowPrice: data.l,
            openPrice: data.o,
            previousClose: data.pc,
            timestamp: data.t,
          });
        }

        // Finnhub rate limit: 60/min — wait 1.1s between calls
        await new Promise((r) => setTimeout(r, 1100));
      } catch {
        logger.warn(`Failed to fetch stock quote for ${company.symbol}`);
      }
    }

    if (quotes.length > 0) {
      // Separate gainers and losers
      const sortedByChange = [...quotes].sort((a, b) => b.changePercent - a.changePercent);

      await upsertContent(
        'space-economy:stock-quotes',
        'space-economy',
        'stock-market',
        {
          quotes,
          gainers: sortedByChange.filter((q) => q.changePercent > 0).slice(0, 5),
          losers: sortedByChange.filter((q) => q.changePercent < 0).slice(-5).reverse(),
          marketSummary: {
            companiesTracked: quotes.length,
            averageChange: quotes.reduce((sum, q) => sum + q.changePercent, 0) / quotes.length,
          },
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://finnhub.io' }
      );

      await logRefresh('space-economy', 'api-fetch', 'success', {
        itemsUpdated: 1,
        itemsChecked: SPACE_COMPANY_TICKERS.length,
        apiCallsMade: quotes.length,
        duration: Date.now() - start,
      });

      logger.info(`Space stock data updated: ${quotes.length} companies`);
      return 1;
    }

    return 0;
  } catch (error) {
    await logRefresh('space-economy', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch space stock data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── GOVERNMENT CONTRACT OPPORTUNITIES (SAM.gov) ───────────────────────

export async function fetchAndStoreGovContracts(): Promise<number> {
  const start = Date.now();
  try {
    if (!EXTERNAL_APIS.SAM_GOV.apiKey) {
      logger.info('SAM.gov API key not configured — skipping contract opportunities fetch');
      return 0;
    }

    // Search for space and aerospace related opportunities
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const data = await fetchSamGov({
      postedFrom: formatDateForApi(thirtyDaysAgo),
      postedTo: formatDateForApi(new Date()),
      limit: '25',
      offset: '0',
      ptype: 'o', // opportunities
      title: 'space satellite launch aerospace',
    }) as {
      totalRecords?: number;
      opportunitiesData?: Array<{
        noticeId: string;
        title: string;
        solicitationNumber?: string;
        department?: string;
        subTier?: string;
        office?: string;
        postedDate: string;
        type: string;
        baseType: string;
        archiveType: string;
        archiveDate?: string;
        responseDeadLine?: string;
        naicsCode?: string;
        classificationCode?: string;
        description?: string;
        uiLink?: string;
      }>;
    } | null;

    if (!data || !data.opportunitiesData || data.opportunitiesData.length === 0) {
      logger.warn('SAM.gov returned empty opportunities data');
      return 0;
    }

    const opportunities = data.opportunitiesData.map((opp) => ({
      id: opp.noticeId,
      title: opp.title,
      solicitationNumber: opp.solicitationNumber || null,
      department: opp.department || null,
      subTier: opp.subTier || null,
      office: opp.office || null,
      postedDate: opp.postedDate,
      type: opp.type,
      responseDeadline: opp.responseDeadLine || null,
      naicsCode: opp.naicsCode || null,
      classificationCode: opp.classificationCode || null,
      description: opp.description?.slice(0, 300) || null,
      link: opp.uiLink || null,
    }));

    await upsertContent(
      'business-opportunities:gov-contracts-live',
      'business-opportunities',
      'government-contracts',
      {
        opportunities,
        totalRecords: data.totalRecords || opportunities.length,
        fetchedAt: new Date().toISOString(),
        source: 'SAM.gov',
      },
      { sourceType: 'api', sourceUrl: 'https://api.sam.gov' }
    );

    await logRefresh('business-opportunities', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.totalRecords || opportunities.length,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`Government contract opportunities updated: ${opportunities.length} from ${data.totalRecords} total`);
    return 1;
  } catch (error) {
    await logRefresh('business-opportunities', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch government contract opportunities', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── FCC FILINGS (ECFS) — Satellite & Spectrum Related ─────────────────

export async function fetchAndStoreFccFilings(): Promise<number> {
  const start = Date.now();
  try {
    // Search for satellite and spectrum related FCC filings
    const data = await fetchFccEcfs({
      q: 'satellite OR spectrum OR "space station" OR "earth station" OR NGSO OR GSO',
      rows: '20',
      sort: 'date_received desc',
    }) as {
      response?: {
        numFound: number;
        docs: Array<{
          id_edocs: string;
          text_data?: string;
          date_received?: string;
          date_submission?: string;
          proceeding?: string;
          applicant?: string;
          lawfirm?: string;
          author?: string;
          brief?: string;
          city?: string;
          state?: string;
        }>;
      };
    } | null;

    if (!data || !data.response || data.response.docs.length === 0) {
      logger.warn('FCC ECFS returned empty data');
      return 0;
    }

    const filings = data.response.docs.map((doc) => ({
      id: doc.id_edocs,
      dateReceived: doc.date_received || doc.date_submission || null,
      proceeding: doc.proceeding || null,
      applicant: doc.applicant || doc.author || null,
      lawFirm: doc.lawfirm || null,
      brief: doc.brief?.slice(0, 300) || doc.text_data?.slice(0, 300) || null,
      city: doc.city || null,
      state: doc.state || null,
    }));

    await upsertContent(
      'compliance:fcc-filings-live',
      'compliance',
      'fcc-filings',
      {
        filings,
        totalFound: data.response.numFound,
        fetchedAt: new Date().toISOString(),
        source: 'FCC ECFS',
      },
      { sourceType: 'api', sourceUrl: 'https://www.fcc.gov/ecfs' }
    );

    await logRefresh('compliance', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.response.numFound,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`FCC filings updated: ${filings.length} from ${data.response.numFound} total`);
    return 1;
  } catch (error) {
    await logRefresh('compliance', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch FCC filings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── FEDERAL REGISTER — Space Regulatory Documents ──────────────────────

const federalRegBreaker = createCircuitBreaker('federal-register-fetcher', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

export async function fetchAndStoreFederalRegDocs(): Promise<number> {
  const start = Date.now();
  try {
    const data = await federalRegBreaker.execute(async () => {
      const params = new URLSearchParams({
        'conditions[term]': 'space satellite launch spectrum orbital',
        'conditions[agencies][]': 'federal-communications-commission',
        'per_page': '20',
        'order': 'newest',
      });

      // Also fetch FAA space docs
      const params2 = new URLSearchParams({
        'conditions[term]': 'commercial space launch reentry license',
        'conditions[agencies][]': 'federal-aviation-administration',
        'per_page': '10',
        'order': 'newest',
      });

      const [fccRes, faaRes] = await Promise.all([
        fetchWithRetry(`${EXTERNAL_APIS.FEDERAL_REGISTER.baseUrl}/documents.json?${params}`),
        fetchWithRetry(`${EXTERNAL_APIS.FEDERAL_REGISTER.baseUrl}/documents.json?${params2}`),
      ]);

      const fccData = await fccRes.json();
      const faaData = await faaRes.json();

      return { fcc: fccData, faa: faaData };
    }, null);

    if (!data) {
      logger.warn('Federal Register returned no data');
      return 0;
    }

    let updated = 0;

    // Process FCC docs
    const fccDocs = data.fcc?.results || [];
    if (fccDocs.length > 0) {
      await upsertContent(
        'compliance:federal-register-fcc',
        'compliance',
        'federal-register',
        {
          documents: fccDocs.slice(0, 15).map((doc: {
            document_number: string;
            title: string;
            type: string;
            abstract?: string;
            publication_date: string;
            html_url: string;
            agencies?: Array<{ name: string }>;
          }) => ({
            documentNumber: doc.document_number,
            title: doc.title,
            type: doc.type,
            abstract: doc.abstract?.slice(0, 300) || null,
            publicationDate: doc.publication_date,
            url: doc.html_url,
            agency: doc.agencies?.[0]?.name || 'FCC',
          })),
          fetchedAt: new Date().toISOString(),
          source: 'Federal Register',
        },
        { sourceType: 'api', sourceUrl: 'https://www.federalregister.gov/api/v1' }
      );
      updated++;
    }

    // Process FAA docs
    const faaDocs = data.faa?.results || [];
    if (faaDocs.length > 0) {
      await upsertContent(
        'compliance:federal-register-faa',
        'compliance',
        'federal-register-faa',
        {
          documents: faaDocs.slice(0, 10).map((doc: {
            document_number: string;
            title: string;
            type: string;
            abstract?: string;
            publication_date: string;
            html_url: string;
            agencies?: Array<{ name: string }>;
          }) => ({
            documentNumber: doc.document_number,
            title: doc.title,
            type: doc.type,
            abstract: doc.abstract?.slice(0, 300) || null,
            publicationDate: doc.publication_date,
            url: doc.html_url,
            agency: doc.agencies?.[0]?.name || 'FAA',
          })),
          fetchedAt: new Date().toISOString(),
          source: 'Federal Register',
        },
        { sourceType: 'api', sourceUrl: 'https://www.federalregister.gov/api/v1' }
      );
      updated++;
    }

    await logRefresh('compliance', 'api-fetch', updated > 0 ? 'success' : 'partial', {
      itemsUpdated: updated,
      apiCallsMade: 2,
      duration: Date.now() - start,
    });

    logger.info(`Federal Register docs updated: ${fccDocs.length} FCC + ${faaDocs.length} FAA docs`);
    return updated;
  } catch (error) {
    await logRefresh('compliance', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch Federal Register docs', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NASA DONKI Enhanced (Solar Particle Events, Magnetopause Crossings) ─

export async function fetchAndStoreDonkiEnhanced(): Promise<number> {
  const start = Date.now();
  let updated = 0;

  const nasaApiKey = EXTERNAL_APIS.NASA_DONKI.apiKey;
  const endDate = formatDateForApi(new Date());
  const startDate30 = formatDateForApi(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const startDate7 = formatDateForApi(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const donkiEnhancedBreaker = createCircuitBreaker('donki-enhanced', {
    failureThreshold: 3,
    resetTimeout: 120_000,
  });

  // 1. Solar Energetic Particle events (SEP)
  try {
    const sepData = await donkiEnhancedBreaker.execute(async () => {
      const url = `${EXTERNAL_APIS.NASA_DONKI.baseUrl}/SEP?startDate=${startDate30}&endDate=${endDate}&api_key=${nasaApiKey}`;
      const res = await fetchWithRetry(url);
      return res.json() as Promise<Array<{
        sepID: string;
        eventTime: string;
        instruments: Array<{ displayName: string }>;
        linkedEvents: Array<{ activityID: string }> | null;
      }>>;
    }, null);

    if (sepData && Array.isArray(sepData)) {
      await upsertContent(
        'space-environment:sep-events',
        'space-environment',
        'sep-events',
        {
          events: sepData.map((e) => ({
            id: e.sepID,
            eventTime: e.eventTime,
            instruments: e.instruments?.map((i) => i.displayName) || [],
            linkedEventCount: e.linkedEvents?.length || 0,
          })),
          count: sepData.length,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://api.nasa.gov/DONKI/SEP' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch DONKI SEP data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 2. Radiation Belt Enhancement (RBE) events
  try {
    const rbeData = await donkiEnhancedBreaker.execute(async () => {
      const url = `${EXTERNAL_APIS.NASA_DONKI.baseUrl}/RBE?startDate=${startDate30}&endDate=${endDate}&api_key=${nasaApiKey}`;
      const res = await fetchWithRetry(url);
      return res.json() as Promise<Array<{
        rbeID: string;
        eventTime: string;
        instruments: Array<{ displayName: string }>;
      }>>;
    }, null);

    if (rbeData && Array.isArray(rbeData)) {
      await upsertContent(
        'space-environment:rbe-events',
        'space-environment',
        'rbe-events',
        {
          events: rbeData.map((e) => ({
            id: e.rbeID,
            eventTime: e.eventTime,
            instruments: e.instruments?.map((i) => i.displayName) || [],
          })),
          count: rbeData.length,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://api.nasa.gov/DONKI/RBE' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch DONKI RBE data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 3. High Speed Stream (HSS) events
  try {
    const hssData = await donkiEnhancedBreaker.execute(async () => {
      const url = `${EXTERNAL_APIS.NASA_DONKI.baseUrl}/HSS?startDate=${startDate7}&endDate=${endDate}&api_key=${nasaApiKey}`;
      const res = await fetchWithRetry(url);
      return res.json() as Promise<Array<{
        hssID: string;
        eventTime: string;
        instruments: Array<{ displayName: string }>;
        linkedEvents: Array<{ activityID: string }> | null;
      }>>;
    }, null);

    if (hssData && Array.isArray(hssData)) {
      await upsertContent(
        'space-environment:hss-events',
        'space-environment',
        'hss-events',
        {
          events: hssData.map((e) => ({
            id: e.hssID,
            eventTime: e.eventTime,
            instruments: e.instruments?.map((i) => i.displayName) || [],
            linkedEventCount: e.linkedEvents?.length || 0,
          })),
          count: hssData.length,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://api.nasa.gov/DONKI/HSS' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch DONKI HSS data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 4. Interplanetary Shock (IPS) events
  try {
    const ipsData = await donkiEnhancedBreaker.execute(async () => {
      const url = `${EXTERNAL_APIS.NASA_DONKI.baseUrl}/IPS?startDate=${startDate30}&endDate=${endDate}&api_key=${nasaApiKey}`;
      const res = await fetchWithRetry(url);
      return res.json() as Promise<Array<{
        activityID: string;
        eventTime: string;
        catalog: string;
        instruments: Array<{ displayName: string }>;
        location: string;
      }>>;
    }, null);

    if (ipsData && Array.isArray(ipsData)) {
      await upsertContent(
        'space-environment:ips-events',
        'space-environment',
        'ips-events',
        {
          events: ipsData.map((e) => ({
            id: e.activityID,
            eventTime: e.eventTime,
            catalog: e.catalog,
            location: e.location,
            instruments: e.instruments?.map((i) => i.displayName) || [],
          })),
          count: ipsData.length,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://api.nasa.gov/DONKI/IPS' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch DONKI IPS data', { error: error instanceof Error ? error.message : String(error) });
  }

  await logRefresh('space-environment', 'api-fetch', updated > 0 ? 'success' : 'failed', {
    itemsUpdated: updated,
    apiCallsMade: 4,
    duration: Date.now() - start,
  });

  logger.info(`DONKI enhanced data updated: ${updated} event types`);
  return updated;
}

// ─── ORCHESTRATOR: Run all external API fetchers ────────────────────────

export async function refreshAllExternalAPIs(): Promise<{
  totalUpdated: number;
  results: Record<string, number>;
}> {
  const results: Record<string, number> = {};

  // Run fetchers sequentially to respect rate limits
  // --- Existing fetchers ---
  results['iss-crew'] = await fetchAndStoreISSCrew();
  results['neo-objects'] = await fetchAndStoreNeoObjects();
  results['satellite-counts'] = await fetchAndStoreSatelliteCounts();
  results['defense-spending'] = await fetchAndStoreDefenseSpending();
  results['patents'] = await fetchAndStorePatents();

  // --- New fetchers ---
  results['apod'] = await fetchAndStoreApod();
  results['nasa-tech-projects'] = await fetchAndStoreTechProjects();
  results['jpl-close-approaches'] = await fetchAndStoreJplCloseApproaches();
  results['enhanced-space-weather'] = await fetchAndStoreEnhancedSpaceWeather();
  results['donki-enhanced'] = await fetchAndStoreDonkiEnhanced();
  results['space-stocks'] = await fetchAndStoreSpaceStocks();
  results['gov-contracts'] = await fetchAndStoreGovContracts();
  results['fcc-filings'] = await fetchAndStoreFccFilings();
  results['federal-register'] = await fetchAndStoreFederalRegDocs();

  const totalUpdated = Object.values(results).reduce((sum, n) => sum + n, 0);

  logger.info('External API refresh complete', { totalUpdated, results });

  return { totalUpdated, results };
}
