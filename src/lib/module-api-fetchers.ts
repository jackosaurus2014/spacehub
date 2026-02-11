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
  fetchNasaEpic,
  fetchNasaEonet,
  fetchNasaMarsPhotos,
  fetchNasaExoplanets,
  fetchJplSentry,
  fetchJplFireball,
  fetchAsterank,
  fetchNasaImages,
  fetchHelioviewer,
  fetchNasaDsn,
  fetchWhereTheIss,
  fetchSbirGov,
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

  // 6. Solar Wind Plasma (real-time from DSCOVR)
  try {
    const plasmaData = await fetchNoaaSwpcProducts('solar-wind/plasma-2-hour.json') as Array<
      [string, string, string, string] // [time_tag, density, speed, temperature] — first row is headers
    > | null;

    if (plasmaData && Array.isArray(plasmaData) && plasmaData.length > 1) {
      // Skip header row (index 0), parse recent readings
      const readings = plasmaData.slice(1).map((row) => ({
        time: row[0],
        density: row[1] ? parseFloat(row[1]) : null,
        speed: row[2] ? parseFloat(row[2]) : null,
        temperature: row[3] ? parseFloat(row[3]) : null,
      })).filter((r) => r.density !== null || r.speed !== null);

      const latest = readings[readings.length - 1];
      const validSpeeds = readings.filter((r) => r.speed !== null).map((r) => r.speed as number);
      const validDensities = readings.filter((r) => r.density !== null).map((r) => r.density as number);

      await upsertContent(
        'space-environment:solar-wind-plasma',
        'space-environment',
        'solar-wind',
        {
          latest: latest || null,
          summary: {
            avgSpeed: validSpeeds.length > 0 ? Math.round(validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length) : null,
            maxSpeed: validSpeeds.length > 0 ? Math.round(Math.max(...validSpeeds)) : null,
            avgDensity: validDensities.length > 0 ? parseFloat((validDensities.reduce((a, b) => a + b, 0) / validDensities.length).toFixed(2)) : null,
            readingCount: readings.length,
          },
          recentReadings: readings.slice(-30), // Last 30 data points
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch solar wind plasma data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 7. Solar Wind Magnetometer (IMF from DSCOVR)
  try {
    const magData = await fetchNoaaSwpcProducts('solar-wind/mag-2-hour.json') as Array<
      [string, string, string, string, string, string, string] // [time_tag, bx_gsm, by_gsm, bz_gsm, lon_gsm, lat_gsm, bt] — first row is headers
    > | null;

    if (magData && Array.isArray(magData) && magData.length > 1) {
      // Skip header row
      const readings = magData.slice(1).map((row) => ({
        time: row[0],
        bxGsm: row[1] ? parseFloat(row[1]) : null,
        byGsm: row[2] ? parseFloat(row[2]) : null,
        bzGsm: row[3] ? parseFloat(row[3]) : null,
        lonGsm: row[4] ? parseFloat(row[4]) : null,
        latGsm: row[5] ? parseFloat(row[5]) : null,
        bt: row[6] ? parseFloat(row[6]) : null,
      })).filter((r) => r.bt !== null || r.bzGsm !== null);

      const latest = readings[readings.length - 1];
      const validBz = readings.filter((r) => r.bzGsm !== null).map((r) => r.bzGsm as number);
      const validBt = readings.filter((r) => r.bt !== null).map((r) => r.bt as number);

      await upsertContent(
        'space-environment:solar-wind-mag',
        'space-environment',
        'solar-wind',
        {
          latest: latest || null,
          summary: {
            avgBz: validBz.length > 0 ? parseFloat((validBz.reduce((a, b) => a + b, 0) / validBz.length).toFixed(2)) : null,
            minBz: validBz.length > 0 ? parseFloat(Math.min(...validBz).toFixed(2)) : null,
            avgBt: validBt.length > 0 ? parseFloat((validBt.reduce((a, b) => a + b, 0) / validBt.length).toFixed(2)) : null,
            maxBt: validBt.length > 0 ? parseFloat(Math.max(...validBt).toFixed(2)) : null,
            // Southward Bz is geoeffective (negative values drive geomagnetic storms)
            geoeffectiveConditions: validBz.length > 0 && Math.min(...validBz) < -10 ? 'Active' : validBz.length > 0 && Math.min(...validBz) < -5 ? 'Moderate' : 'Quiet',
            readingCount: readings.length,
          },
          recentReadings: readings.slice(-30),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch solar wind magnetometer data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 8. GOES X-Ray Flux (solar flare indicator)
  try {
    const xrayData = await fetchNoaaSwpcJson('goes/primary/xrays-1-day.json') as Array<{
      time_tag: string;
      satellite: number;
      current_class: string;
      current_ratio: number;
      flux: number;
      observed_flux: number;
      electron_correction: number;
      electron_contaminaton: boolean;
      energy: string;
    }> | null;

    if (xrayData && Array.isArray(xrayData) && xrayData.length > 0) {
      // Filter to the short-wavelength channel (0.1-0.8 nm) which is used for flare classification
      const shortWave = xrayData.filter((d) => d.energy === '0.1-0.8nm');
      const recent = shortWave.length > 0 ? shortWave.slice(-60) : xrayData.slice(-60); // Last ~60 readings
      const latest = recent[recent.length - 1];

      // Determine current flare level from flux
      const peakFlux = Math.max(...recent.map((d) => d.flux));
      const flareClass = peakFlux >= 1e-4 ? 'X' : peakFlux >= 1e-5 ? 'M' : peakFlux >= 1e-6 ? 'C' : peakFlux >= 1e-7 ? 'B' : 'A';

      await upsertContent(
        'space-environment:goes-xray',
        'space-environment',
        'xray-flux',
        {
          latest: {
            time: latest.time_tag,
            flux: latest.flux,
            currentClass: latest.current_class || null,
            satellite: latest.satellite,
            energy: latest.energy,
          },
          summary: {
            peakFlux,
            peakFlareClass: flareClass,
            currentClass: latest.current_class || flareClass,
            readingCount: recent.length,
          },
          recentReadings: recent.map((d) => ({
            time: d.time_tag,
            flux: d.flux,
            currentClass: d.current_class || null,
          })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch GOES X-ray flux data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 9. GOES Proton Flux (radiation)
  try {
    const protonData = await fetchNoaaSwpcJson('goes/primary/differential-protons-1-day.json') as Array<{
      time_tag: string;
      satellite: number;
      flux: number;
      energy: string;
      yaw_flip: boolean;
      channel: string;
    }> | null;

    if (protonData && Array.isArray(protonData) && protonData.length > 0) {
      // Group by energy channel and get latest + stats for each
      const channelMap: Record<string, Array<{ time: string; flux: number }>> = {};
      for (const d of protonData) {
        const ch = d.channel || d.energy || 'unknown';
        if (!channelMap[ch]) channelMap[ch] = [];
        channelMap[ch].push({ time: d.time_tag, flux: d.flux });
      }

      const channelSummaries = Object.entries(channelMap).slice(0, 10).map(([channel, readings]) => {
        const fluxValues = readings.map((r) => r.flux).filter((f) => f > 0);
        return {
          channel,
          latestFlux: readings[readings.length - 1]?.flux ?? null,
          latestTime: readings[readings.length - 1]?.time ?? null,
          maxFlux: fluxValues.length > 0 ? Math.max(...fluxValues) : null,
          avgFlux: fluxValues.length > 0 ? parseFloat((fluxValues.reduce((a, b) => a + b, 0) / fluxValues.length).toExponential(2)) : null,
          readingCount: readings.length,
        };
      });

      await upsertContent(
        'space-environment:goes-protons',
        'space-environment',
        'particle-radiation',
        {
          channelSummaries,
          totalReadings: protonData.length,
          satellite: protonData[0]?.satellite ?? null,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/goes/primary/differential-protons-1-day.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch GOES proton flux data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 10. OVATION Aurora Model
  try {
    const auroraData = await fetchNoaaSwpcJson('ovation_aurora_latest.json') as {
      Observation_Time?: string;
      Forecast_Time?: string;
      Data_Format?: string;
      coordinates?: Array<[number, number, number]>; // [lon, lat, probability]
    } | null;

    if (auroraData && auroraData.coordinates && Array.isArray(auroraData.coordinates)) {
      // This payload is ~900KB raw, so store summary stats + top locations
      const coords = auroraData.coordinates;
      const nonZero = coords.filter((c) => c[2] > 0);
      const sorted = [...nonZero].sort((a, b) => b[2] - a[2]);
      const top20 = sorted.slice(0, 20).map((c) => ({
        longitude: c[0],
        latitude: c[1],
        probability: c[2],
      }));

      // Compute hemisphere stats
      const northernCoords = nonZero.filter((c) => c[1] >= 0);
      const southernCoords = nonZero.filter((c) => c[1] < 0);

      await upsertContent(
        'space-environment:aurora-forecast',
        'space-environment',
        'aurora',
        {
          observationTime: auroraData.Observation_Time || null,
          forecastTime: auroraData.Forecast_Time || null,
          summary: {
            totalGridPoints: coords.length,
            activePoints: nonZero.length,
            peakProbability: top20[0]?.probability ?? 0,
            northernActivePoints: northernCoords.length,
            southernActivePoints: southernCoords.length,
            avgNorthernProbability: northernCoords.length > 0
              ? parseFloat((northernCoords.reduce((s, c) => s + c[2], 0) / northernCoords.length).toFixed(1))
              : 0,
            avgSouthernProbability: southernCoords.length > 0
              ? parseFloat((southernCoords.reduce((s, c) => s + c[2], 0) / southernCoords.length).toFixed(1))
              : 0,
          },
          topLocations: top20,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch OVATION aurora data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 11. ENLIL Solar Wind Model
  try {
    const enlilData = await fetchNoaaSwpcJson('enlil_time_series.json') as Array<{
      time_tag?: string;
      speed?: number;
      density?: number;
      temperature?: number;
      bx?: number;
      by?: number;
      bz?: number;
      bt?: number;
      [key: string]: unknown;
    }> | null;

    if (enlilData && Array.isArray(enlilData) && enlilData.length > 0) {
      // ENLIL model data can be large — store recent + forecast summary
      const now = new Date();
      const recent = enlilData.slice(-48); // Last ~48 time steps

      // Separate past (observed/validated) vs future (predicted)
      const past = recent.filter((d) => d.time_tag && new Date(d.time_tag) <= now);
      const future = recent.filter((d) => d.time_tag && new Date(d.time_tag) > now);

      await upsertContent(
        'space-environment:enlil-model',
        'space-environment',
        'models',
        {
          modelRunTime: enlilData[0]?.time_tag || null,
          dataPoints: enlilData.length,
          recentTimeSeries: recent.map((d) => ({
            time: d.time_tag,
            speed: d.speed ?? null,
            density: d.density ?? null,
            bt: d.bt ?? null,
            bz: d.bz ?? null,
          })),
          summary: {
            pastDataPoints: past.length,
            forecastDataPoints: future.length,
            latestSpeed: recent[recent.length - 1]?.speed ?? null,
            latestDensity: recent[recent.length - 1]?.density ?? null,
            peakForecastSpeed: future.length > 0
              ? Math.max(...future.filter((d) => d.speed != null).map((d) => d.speed as number))
              : null,
          },
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/enlil_time_series.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch ENLIL model data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 12. Sunspot Report
  try {
    const sunspotData = await fetchNoaaSwpcJson('sunspot_report.json') as Array<{
      timeTag?: string;
      time_tag?: string;
      Rone?: number;
      Region?: number;
      region?: number;
      Lat?: number;
      latitude?: number;
      Lo?: number;
      longitude?: number;
      Location?: string;
      location?: string;
      Area?: number;
      area?: number;
      Z?: string;
      spot_class?: string;
      LL?: number;
      NN?: number;
      num_spots?: number;
      Magtype?: string;
      mag_class?: string;
      [key: string]: unknown;
    }> | null;

    if (sunspotData && Array.isArray(sunspotData) && sunspotData.length > 0) {
      const groups = sunspotData.map((s) => ({
        region: s.Region ?? s.region ?? s.Rone ?? null,
        timeTag: s.timeTag ?? s.time_tag ?? null,
        latitude: s.Lat ?? s.latitude ?? null,
        longitude: s.Lo ?? s.longitude ?? null,
        location: s.Location ?? s.location ?? null,
        area: s.Area ?? s.area ?? null,
        spotClass: s.Z ?? s.spot_class ?? null,
        numSpots: s.NN ?? s.num_spots ?? null,
        magClass: s.Magtype ?? s.mag_class ?? null,
      }));

      const totalSpots = groups.reduce((sum, g) => sum + (g.numSpots || 0), 0);

      await upsertContent(
        'space-environment:sunspot-report',
        'space-environment',
        'sunspots',
        {
          groups,
          totalGroups: groups.length,
          totalSunspots: totalSpots,
          latestTimeTag: groups[groups.length - 1]?.timeTag || null,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/sunspot_report.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch sunspot report data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 13. Solar Probabilities (flare and proton event forecasts)
  try {
    const probData = await fetchNoaaSwpcJson('solar_probabilities.json') as Array<{
      date_tag?: string;
      time_tag?: string;
      c_class_1_day?: number;
      m_class_1_day?: number;
      x_class_1_day?: number;
      proton_1_day?: number;
      c_class_2_day?: number;
      m_class_2_day?: number;
      x_class_2_day?: number;
      proton_2_day?: number;
      c_class_3_day?: number;
      m_class_3_day?: number;
      x_class_3_day?: number;
      proton_3_day?: number;
      [key: string]: unknown;
    }> | null;

    if (probData && Array.isArray(probData) && probData.length > 0) {
      const latest = probData[probData.length - 1];

      await upsertContent(
        'space-environment:solar-probabilities',
        'space-environment',
        'forecasts',
        {
          forecastDate: latest.date_tag ?? latest.time_tag ?? null,
          day1: {
            cClass: latest.c_class_1_day ?? null,
            mClass: latest.m_class_1_day ?? null,
            xClass: latest.x_class_1_day ?? null,
            protonEvent: latest.proton_1_day ?? null,
          },
          day2: {
            cClass: latest.c_class_2_day ?? null,
            mClass: latest.m_class_2_day ?? null,
            xClass: latest.x_class_2_day ?? null,
            protonEvent: latest.proton_2_day ?? null,
          },
          day3: {
            cClass: latest.c_class_3_day ?? null,
            mClass: latest.m_class_3_day ?? null,
            xClass: latest.x_class_3_day ?? null,
            protonEvent: latest.proton_3_day ?? null,
          },
          allForecasts: probData.map((d) => ({
            date: d.date_tag ?? d.time_tag ?? null,
            cClass1d: d.c_class_1_day ?? null,
            mClass1d: d.m_class_1_day ?? null,
            xClass1d: d.x_class_1_day ?? null,
            proton1d: d.proton_1_day ?? null,
          })),
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/solar_probabilities.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch solar probabilities data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 14. GOES X-Ray Flux 6-hour (radiation belt electron environment for launch ops)
  try {
    const xray6h = await fetchNoaaSwpcJson('goes/primary/xrays-6-hour.json') as Array<{
      time_tag: string;
      satellite: number;
      flux: number;
      observed_flux: number;
      energy: string;
      current_class?: string;
    }> | null;

    if (xray6h && Array.isArray(xray6h) && xray6h.length > 0) {
      const shortWave = xray6h.filter((d) => d.energy === '0.1-0.8nm');
      const data = shortWave.length > 0 ? shortWave : xray6h;
      const recent = data.slice(-72); // ~6 hours at 5-min cadence
      const latest = recent[recent.length - 1];
      const peakFlux = Math.max(...recent.map((d) => d.flux).filter((f) => f > 0));
      const flareClass = peakFlux >= 1e-4 ? 'X' : peakFlux >= 1e-5 ? 'M' : peakFlux >= 1e-6 ? 'C' : peakFlux >= 1e-7 ? 'B' : 'A';

      // Launch constraint: M-class or above = caution, X-class = no-go
      const launchConstraint = flareClass === 'X' ? 'NO-GO' : flareClass === 'M' ? 'CAUTION' : 'GO';

      await upsertContent(
        'space-environment:xray-6hour',
        'space-environment',
        'radiation-belt',
        {
          latest: {
            time: latest.time_tag,
            flux: latest.flux,
            currentClass: latest.current_class || null,
          },
          peakFlux6h: peakFlux,
          peakFlareClass6h: flareClass,
          launchConstraint,
          readingCount: recent.length,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch GOES X-ray 6-hour data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 15. NOAA Space Weather Scales (3-day geomagnetic forecast for launch ops)
  try {
    const scalesData = await fetchNoaaSwpcProducts('noaa-scales.json') as Array<{
      DateStamp?: string;
      TimeStamp?: string;
      Scale?: string;
      'R'?: { Scale?: number; Text?: string; MinorProb?: string; MajorProb?: string };
      'S'?: { Scale?: number; Text?: string; Prob?: string };
      'G'?: { Scale?: number; Text?: string };
      [key: string]: unknown;
    }> | null;

    if (scalesData && Array.isArray(scalesData) && scalesData.length > 0) {
      // The NOAA scales JSON typically contains current conditions + forecasts
      // Parse the 3-day geomagnetic storm, solar radiation, and radio blackout scales
      const entries = scalesData.slice(0, 7); // Current + forecast entries

      const geomagScale = entries.map((e) => ({
        date: e.DateStamp || null,
        time: e.TimeStamp || null,
        gScale: (e as Record<string, unknown>)['G'] ? ((e as Record<string, unknown>)['G'] as Record<string, unknown>)?.Scale ?? null : null,
        gText: (e as Record<string, unknown>)['G'] ? ((e as Record<string, unknown>)['G'] as Record<string, unknown>)?.Text ?? null : null,
        sScale: (e as Record<string, unknown>)['S'] ? ((e as Record<string, unknown>)['S'] as Record<string, unknown>)?.Scale ?? null : null,
        rScale: (e as Record<string, unknown>)['R'] ? ((e as Record<string, unknown>)['R'] as Record<string, unknown>)?.Scale ?? null : null,
      }));

      // Determine launch constraint from G-scale
      const maxGScale = Math.max(...geomagScale.map((g) => (typeof g.gScale === 'number' ? g.gScale : 0)));
      const launchConstraint = maxGScale >= 4 ? 'NO-GO' : maxGScale >= 2 ? 'CAUTION' : 'GO';

      await upsertContent(
        'space-environment:geomagnetic-forecast',
        'space-environment',
        'geomagnetic-forecast',
        {
          forecast: geomagScale,
          maxGeomagneticScale: maxGScale,
          launchConstraint,
          stormLevel: maxGScale >= 5 ? 'Extreme (G5)' : maxGScale >= 4 ? 'Severe (G4)' : maxGScale >= 3 ? 'Strong (G3)' : maxGScale >= 2 ? 'Moderate (G2)' : maxGScale >= 1 ? 'Minor (G1)' : 'None',
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/products/noaa-scales.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch NOAA scales data', { error: error instanceof Error ? error.message : String(error) });
  }

  // 16. GOES Integral Protons 1-day (radiation risk for crewed missions)
  try {
    const integralProtons = await fetchNoaaSwpcJson('goes/primary/integral-protons-1-day.json') as Array<{
      time_tag: string;
      satellite: number;
      flux: number;
      energy: string;
      channel?: string;
    }> | null;

    if (integralProtons && Array.isArray(integralProtons) && integralProtons.length > 0) {
      // Filter to >=10 MeV channel (S1-S5 threshold: 10 pfu)
      const mev10 = integralProtons.filter((d) => d.energy === '>=10 MeV' || d.channel === 'P>10');
      const data = mev10.length > 0 ? mev10 : integralProtons;
      const recent = data.slice(-60); // Last ~60 readings
      const latest = recent[recent.length - 1];
      const peakFlux = Math.max(...recent.map((d) => d.flux).filter((f) => f > 0));

      // SEP event threshold: 10 pfu for >=10 MeV protons
      const sepEvent = peakFlux >= 10;
      const launchConstraint = peakFlux >= 100 ? 'NO-GO' : peakFlux >= 10 ? 'CAUTION' : 'GO';

      await upsertContent(
        'space-environment:integral-protons',
        'space-environment',
        'proton-flux',
        {
          latest: {
            time: latest.time_tag,
            flux: latest.flux,
            energy: latest.energy || latest.channel || '>=10 MeV',
          },
          peakFlux24h: peakFlux,
          sepEvent,
          launchConstraint,
          radiationRisk: peakFlux >= 1000 ? 'Extreme' : peakFlux >= 100 ? 'High' : peakFlux >= 10 ? 'Elevated' : 'Normal',
          readingCount: recent.length,
          fetchedAt: new Date().toISOString(),
        },
        { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json' }
      );
      updated++;
    }
  } catch (error) {
    logger.warn('Failed to fetch GOES integral protons data', { error: error instanceof Error ? error.message : String(error) });
  }

  await logRefresh('space-environment', 'api-fetch', updated > 0 ? 'success' : 'failed', {
    itemsUpdated: updated,
    apiCallsMade: 16,
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

// ─── NASA EPIC (Earth Polychromatic Imaging Camera) ─────────────────────

interface EpicImage {
  identifier: string;
  caption: string;
  image: string;
  date: string;
  centroid_coordinates: { lat: number; lon: number };
  dscovr_j2000_position: { x: number; y: number; z: number };
  lunar_j2000_position: { x: number; y: number; z: number };
  sun_j2000_position: { x: number; y: number; z: number };
  attitude_quaternions: { q0: number; q1: number; q2: number; q3: number };
}

export async function fetchAndStoreEpicEarth(): Promise<number> {
  const start = Date.now();
  try {
    const data = await fetchNasaEpic('natural') as EpicImage[] | null;

    if (!data || !Array.isArray(data) || data.length === 0) {
      logger.warn('NASA EPIC returned empty data');
      return 0;
    }

    // Store the most recent images (up to 10)
    const recentImages = data.slice(0, 10).map((img) => {
      // EPIC image URL format: https://epic.gsfc.nasa.gov/archive/natural/{year}/{month}/{day}/png/{image}.png
      const dateObj = new Date(img.date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${img.image}.png`;
      const thumbnailUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/thumbs/${img.image}.jpg`;

      return {
        identifier: img.identifier,
        caption: img.caption,
        date: img.date,
        imageUrl,
        thumbnailUrl,
        centroidCoordinates: img.centroid_coordinates,
        dscovrPosition: img.dscovr_j2000_position,
      };
    });

    await upsertContent(
      'mission-control:epic-earth',
      'mission-control',
      'epic-earth',
      {
        images: recentImages,
        totalAvailable: data.length,
        latestDate: recentImages[0]?.date || null,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://epic.gsfc.nasa.gov/api/natural' }
    );

    await logRefresh('mission-control', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.length,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`EPIC Earth data updated: ${recentImages.length} images from ${data.length} available`);
    return 1;
  } catch (error) {
    await logRefresh('mission-control', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch EPIC Earth data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NASA EONET (Earth Observatory Natural Event Tracker) ───────────────

interface EonetEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;
  categories: Array<{ id: string; title: string }>;
  sources: Array<{ id: string; url: string }>;
  geometry: Array<{
    magnitudeValue: number | null;
    magnitudeUnit: string | null;
    date: string;
    type: string;
    coordinates: number[];
  }>;
}

interface EonetResponse {
  title: string;
  description: string;
  link: string;
  events: EonetEvent[];
}

export async function fetchAndStoreEarthEvents(): Promise<number> {
  const start = Date.now();
  try {
    const data = await fetchNasaEonet({
      status: 'open',
      limit: '50',
    }) as EonetResponse | null;

    if (!data || !data.events || data.events.length === 0) {
      logger.warn('NASA EONET returned empty events data');
      return 0;
    }

    // Categorize events
    const categorized: Record<string, Array<{
      id: string;
      title: string;
      category: string;
      date: string;
      coordinates: number[] | null;
      magnitude: number | null;
      magnitudeUnit: string | null;
      sourceUrl: string | null;
      isClosed: boolean;
    }>> = {};

    for (const event of data.events) {
      const category = event.categories[0]?.title || 'Other';
      if (!categorized[category]) categorized[category] = [];

      const latestGeometry = event.geometry[event.geometry.length - 1];

      categorized[category].push({
        id: event.id,
        title: event.title,
        category,
        date: latestGeometry?.date || '',
        coordinates: latestGeometry?.coordinates || null,
        magnitude: latestGeometry?.magnitudeValue || null,
        magnitudeUnit: latestGeometry?.magnitudeUnit || null,
        sourceUrl: event.sources[0]?.url || null,
        isClosed: event.closed !== null,
      });
    }

    await upsertContent(
      'space-environment:earth-events',
      'space-environment',
      'earth-events',
      {
        events: data.events.slice(0, 30).map((e) => {
          const latestGeom = e.geometry[e.geometry.length - 1];
          return {
            id: e.id,
            title: e.title,
            category: e.categories[0]?.title || 'Other',
            date: latestGeom?.date || '',
            coordinates: latestGeom?.coordinates || null,
            magnitude: latestGeom?.magnitudeValue || null,
            magnitudeUnit: latestGeom?.magnitudeUnit || null,
            sourceUrl: e.sources[0]?.url || null,
            isClosed: e.closed !== null,
          };
        }),
        categorySummary: Object.entries(categorized).map(([cat, events]) => ({
          category: cat,
          count: events.length,
        })),
        totalActiveEvents: data.events.filter((e) => e.closed === null).length,
        totalEvents: data.events.length,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://eonet.gsfc.nasa.gov/api/v3/events' }
    );

    await logRefresh('space-environment', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.events.length,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`EONET Earth events updated: ${data.events.length} events across ${Object.keys(categorized).length} categories`);
    return 1;
  } catch (error) {
    await logRefresh('space-environment', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch EONET Earth events', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NASA Mars Rover Photos (Perseverance) ──────────────────────────────

interface MarsRoverPhoto {
  id: number;
  sol: number;
  camera: {
    id: number;
    name: string;
    rover_id: number;
    full_name: string;
  };
  img_src: string;
  earth_date: string;
  rover: {
    id: number;
    name: string;
    landing_date: string;
    launch_date: string;
    status: string;
    max_sol: number;
    max_date: string;
    total_photos: number;
  };
}

interface MarsRoverResponse {
  latest_photos: MarsRoverPhoto[];
}

export async function fetchAndStoreMarsRoverPhotos(): Promise<number> {
  const start = Date.now();
  try {
    const data = await fetchNasaMarsPhotos('perseverance') as MarsRoverResponse | null;

    if (!data || !data.latest_photos || data.latest_photos.length === 0) {
      logger.warn('NASA Mars Rover Photos returned empty data');
      return 0;
    }

    // Group photos by camera
    const byCamera: Record<string, MarsRoverPhoto[]> = {};
    for (const photo of data.latest_photos) {
      const cam = photo.camera.name;
      if (!byCamera[cam]) byCamera[cam] = [];
      byCamera[cam].push(photo);
    }

    const photos = data.latest_photos.slice(0, 20).map((p) => ({
      id: p.id,
      sol: p.sol,
      earthDate: p.earth_date,
      camera: p.camera.name,
      cameraFullName: p.camera.full_name,
      imageUrl: p.img_src,
    }));

    const roverInfo = data.latest_photos[0]?.rover;

    await upsertContent(
      'mars-planner:rover-photos',
      'mars-planner',
      'rover-photos',
      {
        photos,
        roverInfo: roverInfo ? {
          name: roverInfo.name,
          status: roverInfo.status,
          landingDate: roverInfo.landing_date,
          launchDate: roverInfo.launch_date,
          maxSol: roverInfo.max_sol,
          maxDate: roverInfo.max_date,
          totalPhotos: roverInfo.total_photos,
        } : null,
        cameraSummary: Object.entries(byCamera).map(([cam, imgs]) => ({
          camera: cam,
          photoCount: imgs.length,
        })),
        latestEarthDate: data.latest_photos[0]?.earth_date || null,
        totalAvailable: data.latest_photos.length,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://api.nasa.gov/mars-photos/api/v1' }
    );

    await logRefresh('mars-planner', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.latest_photos.length,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`Mars rover photos updated: ${photos.length} photos, latest sol ${photos[0]?.sol}`);
    return 1;
  } catch (error) {
    await logRefresh('mars-planner', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch Mars rover photos', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NASA Exoplanet Archive ─────────────────────────────────────────────

interface ExoplanetRecord {
  pl_name: string;
  hostname: string;
  discoverymethod: string;
  disc_year: number;
  pl_orbper: number | null;
  pl_rade: number | null;
  pl_bmasse: number | null;
  pl_eqt: number | null;
  sy_dist: number | null;
}

export async function fetchAndStoreExoplanets(): Promise<number> {
  const start = Date.now();
  try {
    const data = await fetchNasaExoplanets() as ExoplanetRecord[] | null;

    if (!data || !Array.isArray(data) || data.length === 0) {
      logger.warn('NASA Exoplanet Archive returned empty data');
      return 0;
    }

    // Get the most recent 100 exoplanets and compute stats
    const recent = data.slice(0, 100).map((p) => ({
      name: p.pl_name,
      hostStar: p.hostname,
      discoveryMethod: p.discoverymethod,
      discoveryYear: p.disc_year,
      orbitalPeriodDays: p.pl_orbper,
      radiusEarthRadii: p.pl_rade,
      massEarthMasses: p.pl_bmasse,
      equilibriumTempK: p.pl_eqt,
      distanceParsecs: p.sy_dist,
    }));

    // Compute discovery method breakdown
    const methodCounts: Record<string, number> = {};
    for (const planet of data) {
      const method = planet.discoverymethod || 'Unknown';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    }

    // Discovery year distribution (last 10 years)
    const currentYear = new Date().getFullYear();
    const yearCounts: Record<number, number> = {};
    for (const planet of data) {
      if (planet.disc_year >= currentYear - 10) {
        yearCounts[planet.disc_year] = (yearCounts[planet.disc_year] || 0) + 1;
      }
    }

    // Potentially habitable candidates (rough filter: 200K < T_eq < 320K, 0.5 < R < 1.5 Earth)
    const habitableCandidates = data.filter(
      (p) => p.pl_eqt !== null && p.pl_eqt > 200 && p.pl_eqt < 320 &&
             p.pl_rade !== null && p.pl_rade > 0.5 && p.pl_rade < 1.5
    ).slice(0, 20).map((p) => ({
      name: p.pl_name,
      hostStar: p.hostname,
      equilibriumTempK: p.pl_eqt,
      radiusEarthRadii: p.pl_rade,
      distanceParsecs: p.sy_dist,
    }));

    await upsertContent(
      'solar-exploration:exoplanets',
      'solar-exploration',
      'exoplanets',
      {
        recentDiscoveries: recent,
        totalConfirmed: data.length,
        discoveryMethodBreakdown: Object.entries(methodCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([method, count]) => ({ method, count })),
        yearlyDiscoveries: Object.entries(yearCounts)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([year, count]) => ({ year: Number(year), count })),
        habitableCandidates,
        habitableCandidateCount: habitableCandidates.length,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://exoplanetarchive.ipac.caltech.edu' }
    );

    await logRefresh('solar-exploration', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.length,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`Exoplanet data updated: ${data.length} confirmed planets, ${habitableCandidates.length} habitable candidates`);
    return 1;
  } catch (error) {
    await logRefresh('solar-exploration', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch exoplanet data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── JPL Sentry (Impact Risk) ───────────────────────────────────────────

interface SentryApiResponse {
  signature: { version: string; source: string };
  count: string;
  data: Array<{
    des: string;
    fullname: string;
    last_obs: string;
    last_obs_jd: string;
    n_imp: number;
    ip: string; // impact probability
    ps_cum: string; // Palermo scale cumulative
    ps_max: string; // Palermo scale maximum
    ts_max: string; // Torino scale maximum
    v_inf: string; // velocity at infinity
    range: string; // date range of possible impacts
    diameter?: string;
    h?: string; // absolute magnitude
  }>;
}

export async function fetchAndStoreSentryImpactRisk(): Promise<number> {
  const start = Date.now();
  try {
    const data = await fetchJplSentry() as SentryApiResponse | null;

    if (!data || !data.data || data.data.length === 0) {
      logger.warn('JPL Sentry returned empty data');
      return 0;
    }

    // Sort by Palermo scale (highest risk first)
    const sorted = [...data.data].sort(
      (a, b) => parseFloat(b.ps_cum) - parseFloat(a.ps_cum)
    );

    const impactRisks = sorted.slice(0, 30).map((obj) => ({
      designation: obj.des,
      fullName: obj.fullname,
      lastObserved: obj.last_obs,
      numberOfImpacts: obj.n_imp,
      impactProbability: obj.ip,
      palermoCumulative: parseFloat(obj.ps_cum),
      palermoMaximum: parseFloat(obj.ps_max),
      torinoScale: parseInt(obj.ts_max, 10),
      velocityInfKmS: parseFloat(obj.v_inf),
      impactDateRange: obj.range,
      diameter: obj.diameter || null,
      absoluteMagnitude: obj.h ? parseFloat(obj.h) : null,
    }));

    // Count by Torino scale
    const torinoDistribution: Record<number, number> = {};
    for (const obj of data.data) {
      const ts = parseInt(obj.ts_max, 10);
      torinoDistribution[ts] = (torinoDistribution[ts] || 0) + 1;
    }

    await upsertContent(
      'asteroid-watch:impact-risk',
      'asteroid-watch',
      'impact-risk',
      {
        highestRiskObjects: impactRisks,
        totalTracked: parseInt(data.count, 10),
        torinoDistribution: Object.entries(torinoDistribution)
          .map(([scale, count]) => ({ torinoScale: Number(scale), count })),
        highestPalermoScale: impactRisks[0]?.palermoCumulative || null,
        source: 'JPL Sentry System',
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://ssd-api.jpl.nasa.gov/sentry.api' }
    );

    await logRefresh('asteroid-watch', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: parseInt(data.count, 10),
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`Sentry impact risk data updated: ${data.count} objects tracked`);
    return 1;
  } catch (error) {
    await logRefresh('asteroid-watch', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch Sentry impact risk data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── JPL Fireball (Bolide Events) ──────────────────────────────────────

interface FireballApiResponse {
  signature: { version: string; source: string };
  count: string;
  fields: string[];
  data: Array<Array<string | null>>;
}

export async function fetchAndStoreFireballs(): Promise<number> {
  const start = Date.now();
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const data = await fetchJplFireball({
      'date-min': formatDateForApi(thirtyDaysAgo),
      'req-alt': 'true',
    }) as FireballApiResponse | null;

    if (!data || !data.data || data.data.length === 0) {
      logger.warn('JPL Fireball returned empty data');
      return 0;
    }

    // Map field names to indices
    const fieldIndex: Record<string, number> = {};
    data.fields.forEach((f, i) => { fieldIndex[f] = i; });

    const fireballs = data.data.map((row) => ({
      date: row[fieldIndex['date']] || null,
      latitude: row[fieldIndex['lat']] ? parseFloat(row[fieldIndex['lat']] as string) : null,
      latitudeDir: row[fieldIndex['lat-dir']] || null,
      longitude: row[fieldIndex['lon']] ? parseFloat(row[fieldIndex['lon']] as string) : null,
      longitudeDir: row[fieldIndex['lon-dir']] || null,
      altitude: row[fieldIndex['alt']] ? parseFloat(row[fieldIndex['alt']] as string) : null,
      velocityKmS: row[fieldIndex['vel']] ? parseFloat(row[fieldIndex['vel']] as string) : null,
      totalRadiatedEnergyJ: row[fieldIndex['energy']] ? parseFloat(row[fieldIndex['energy']] as string) : null,
      impactEnergyKt: row[fieldIndex['impact-e']] ? parseFloat(row[fieldIndex['impact-e']] as string) : null,
    }));

    // Sort by energy (biggest events first)
    const sortedByEnergy = [...fireballs]
      .filter((f) => f.impactEnergyKt !== null)
      .sort((a, b) => (b.impactEnergyKt || 0) - (a.impactEnergyKt || 0));

    await upsertContent(
      'asteroid-watch:fireballs',
      'asteroid-watch',
      'fireballs',
      {
        recentFireballs: fireballs,
        totalCount: parseInt(data.count, 10),
        largestEvents: sortedByEnergy.slice(0, 5),
        dateRange: {
          start: formatDateForApi(thirtyDaysAgo),
          end: formatDateForApi(new Date()),
        },
        source: 'JPL Fireball and Bolide Data',
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://ssd-api.jpl.nasa.gov/fireball.api' }
    );

    await logRefresh('asteroid-watch', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: parseInt(data.count, 10),
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`Fireball data updated: ${data.count} events in last 30 days`);
    return 1;
  } catch (error) {
    await logRefresh('asteroid-watch', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch fireball data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── Asterank (Asteroid Mining Economics) ───────────────────────────────

interface AsterankRecord {
  full_name?: string;
  name?: string;
  spec_B?: string;
  spec_T?: string;
  e?: number; // eccentricity
  i?: number; // inclination
  a?: number; // semi-major axis
  q?: number; // perihelion
  ad?: number; // aphelion
  per?: number; // orbital period
  price?: number; // estimated value ($)
  profit?: number; // estimated profit ($)
  closeness?: number;
  score?: number;
  class?: string;
  dv?: number; // delta-v
}

export async function fetchAndStoreMiningTargets(): Promise<number> {
  const start = Date.now();
  try {
    // Low eccentricity + low inclination = easier to reach
    const queryJson = JSON.stringify({ e: { $lt: 0.1 }, i: { $lt: 10 } });
    const data = await fetchAsterank(queryJson, 50) as AsterankRecord[] | null;

    if (!data || !Array.isArray(data) || data.length === 0) {
      logger.warn('Asterank returned empty data');
      return 0;
    }

    const targets = data
      .filter((a) => a.price || a.profit)
      .map((a) => ({
        name: a.full_name || a.name || 'Unknown',
        spectralTypeB: a.spec_B || null,
        spectralTypeT: a.spec_T || null,
        eccentricity: a.e || null,
        inclination: a.i || null,
        semiMajorAxis: a.a || null,
        orbitalPeriodYears: a.per ? a.per / 365.25 : null,
        estimatedValueUsd: a.price || null,
        estimatedProfitUsd: a.profit || null,
        closeness: a.closeness || null,
        miningScore: a.score || null,
        orbitClass: a.class || null,
        deltaV: a.dv || null,
      }))
      .sort((a, b) => (b.estimatedProfitUsd || 0) - (a.estimatedProfitUsd || 0));

    // Aggregate top candidates by estimated value
    const totalEstimatedValue = targets.reduce(
      (sum, t) => sum + (t.estimatedValueUsd || 0), 0
    );

    await upsertContent(
      'space-mining:mining-targets',
      'space-mining',
      'mining-targets',
      {
        targets: targets.slice(0, 30),
        totalAnalyzed: data.length,
        topByProfit: targets.slice(0, 5),
        totalEstimatedValueUsd: totalEstimatedValue,
        filterCriteria: {
          maxEccentricity: 0.1,
          maxInclination: 10,
        },
        source: 'Asterank',
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://www.asterank.com/api/asterank' }
    );

    await logRefresh('space-mining', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.length,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`Asterank mining targets updated: ${targets.length} viable targets from ${data.length} analyzed`);
    return 1;
  } catch (error) {
    await logRefresh('space-mining', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch Asterank mining targets', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NASA Image and Video Library ───────────────────────────────────────

interface NasaImageItem {
  data: Array<{
    title: string;
    description?: string;
    date_created: string;
    nasa_id: string;
    center?: string;
    keywords?: string[];
    media_type: string;
  }>;
  links?: Array<{
    href: string;
    rel: string;
    render?: string;
  }>;
}

interface NasaImagesResponse {
  collection: {
    items: NasaImageItem[];
    metadata: { total_hits: number };
  };
}

export async function fetchAndStoreNasaImages(): Promise<number> {
  const start = Date.now();
  try {
    const currentYear = new Date().getFullYear();
    const data = await fetchNasaImages({
      q: 'space',
      media_type: 'image',
      year_start: String(currentYear),
    }) as NasaImagesResponse | null;

    if (!data || !data.collection || !data.collection.items || data.collection.items.length === 0) {
      logger.warn('NASA Images API returned empty data');
      return 0;
    }

    const images = data.collection.items.slice(0, 20).map((item) => {
      const meta = item.data[0];
      const thumbnail = item.links?.find((l) => l.rel === 'preview')?.href || null;

      return {
        nasaId: meta?.nasa_id || '',
        title: meta?.title || '',
        description: meta?.description?.slice(0, 300) || null,
        dateCreated: meta?.date_created || '',
        center: meta?.center || null,
        keywords: meta?.keywords?.slice(0, 5) || [],
        thumbnailUrl: thumbnail,
      };
    });

    await upsertContent(
      'mission-control:nasa-images',
      'mission-control',
      'nasa-images',
      {
        images,
        totalHits: data.collection.metadata.total_hits,
        year: currentYear,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://images-api.nasa.gov' }
    );

    await logRefresh('mission-control', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: data.collection.metadata.total_hits,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`NASA Images updated: ${images.length} images from ${data.collection.metadata.total_hits} total`);
    return 1;
  } catch (error) {
    await logRefresh('mission-control', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch NASA Images', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── Helioviewer (Solar Images) ─────────────────────────────────────────

interface HelioviewerResponse {
  id: number;
  date: string;
  name: string;
  scale: number;
  width: number;
  height: number;
  refPixelX: number;
  refPixelY: number;
  sunCenterOffsetParams: unknown;
  layeringOrder: number;
}

export async function fetchAndStoreSolarImagery(): Promise<number> {
  const start = Date.now();
  try {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Fetch from multiple SDO sources for different wavelengths
    const sourceIds = [
      { id: '14', name: 'SDO AIA 304', description: 'Chromosphere (He II 304A)' },
      { id: '10', name: 'SDO AIA 171', description: 'Quiet Corona (Fe IX 171A)' },
      { id: '11', name: 'SDO AIA 193', description: 'Corona/Flare (Fe XII 193A)' },
      { id: '8',  name: 'SDO AIA 094', description: 'Flaring Corona (Fe XVIII 94A)' },
    ];

    const solarImages: Array<{
      sourceId: string;
      sourceName: string;
      description: string;
      imageId: number | null;
      date: string | null;
      thumbnailUrl: string;
    }> = [];

    for (const source of sourceIds) {
      try {
        const data = await fetchHelioviewer({
          date: now,
          sourceId: source.id,
        }) as HelioviewerResponse | null;

        if (data && data.id) {
          solarImages.push({
            sourceId: source.id,
            sourceName: source.name,
            description: source.description,
            imageId: data.id,
            date: data.date,
            thumbnailUrl: `https://api.helioviewer.org/v2/getJP2Image/?id=${data.id}`,
          });
        }

        // Small delay between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        logger.warn(`Failed to fetch Helioviewer source ${source.name}`);
      }
    }

    if (solarImages.length === 0) {
      logger.warn('Helioviewer returned no imagery');
      return 0;
    }

    await upsertContent(
      'space-environment:solar-imagery',
      'space-environment',
      'solar-imagery',
      {
        solarImages,
        sourcesAvailable: solarImages.length,
        latestImageDate: solarImages[0]?.date || null,
        source: 'Helioviewer / SDO',
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://api.helioviewer.org/v2' }
    );

    await logRefresh('space-environment', 'api-fetch', 'success', {
      itemsUpdated: 1,
      apiCallsMade: sourceIds.length,
      duration: Date.now() - start,
    });

    logger.info(`Solar imagery updated: ${solarImages.length} sources`);
    return 1;
  } catch (error) {
    await logRefresh('space-environment', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch solar imagery', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── NASA DSN Now (Deep Space Network) ──────────────────────────────────

/**
 * Parses the DSN XML into structured data.
 * The DSN XML has a simple structure with <dish> and <target> elements.
 * We use basic string parsing since we cannot use an XML parser in all environments.
 */
function parseDsnXml(xml: string): Array<{
  antenna: string;
  site: string;
  targets: Array<{ name: string; upSignal: boolean; downSignal: boolean }>;
}> {
  const dishes: Array<{
    antenna: string;
    site: string;
    targets: Array<{ name: string; upSignal: boolean; downSignal: boolean }>;
  }> = [];

  // Extract dish elements — format: <dish name="DSS-XX" ...>
  const dishRegex = /<dish\s+[^>]*name="([^"]*)"[^>]*azimuthAngle="([^"]*)"[^>]*>/g;
  let dishMatch;
  const dishPositions: Array<{ name: string; start: number }> = [];

  while ((dishMatch = dishRegex.exec(xml)) !== null) {
    dishPositions.push({ name: dishMatch[1], start: dishMatch.index });
  }

  for (let i = 0; i < dishPositions.length; i++) {
    const dishName = dishPositions[i].name;
    const startPos = dishPositions[i].start;
    const endPos = i + 1 < dishPositions.length ? dishPositions[i + 1].start : xml.length;
    const dishSection = xml.slice(startPos, endPos);

    // Determine site from antenna name (DSS-1x=Goldstone, DSS-3x=Canberra, DSS-5x/6x=Madrid)
    const antennaNum = parseInt(dishName.replace('DSS', '').replace('-', ''), 10);
    let site = 'Unknown';
    if (antennaNum >= 10 && antennaNum < 30) site = 'Goldstone, CA';
    else if (antennaNum >= 30 && antennaNum < 50) site = 'Canberra, Australia';
    else if (antennaNum >= 50 && antennaNum < 70) site = 'Madrid, Spain';

    // Extract target names
    const targetRegex = /<target\s+[^>]*name="([^"]*)"[^>]*downlegRange="([^"]*)"[^>]*>/g;
    let targetMatch;
    const targets: Array<{ name: string; upSignal: boolean; downSignal: boolean }> = [];

    while ((targetMatch = targetRegex.exec(dishSection)) !== null) {
      const targetName = targetMatch[1];
      if (targetName && targetName !== 'none' && targetName !== '') {
        // Check for up/down signals in the dish section
        const hasUpSignal = dishSection.includes('<upSignal');
        const hasDownSignal = dishSection.includes('<downSignal');
        targets.push({
          name: targetName,
          upSignal: hasUpSignal,
          downSignal: hasDownSignal,
        });
      }
    }

    if (targets.length > 0) {
      dishes.push({
        antenna: dishName,
        site,
        targets,
      });
    }
  }

  return dishes;
}

export async function fetchAndStoreDsnStatus(): Promise<number> {
  const start = Date.now();
  try {
    const xmlData = await fetchNasaDsn();

    if (!xmlData || typeof xmlData !== 'string' || xmlData.length === 0) {
      logger.warn('NASA DSN returned empty data');
      return 0;
    }

    const dishes = parseDsnXml(xmlData);

    if (dishes.length === 0) {
      logger.warn('DSN XML parsed but no active dishes found');
      return 0;
    }

    // Group by site
    const bySite: Record<string, typeof dishes> = {};
    for (const dish of dishes) {
      if (!bySite[dish.site]) bySite[dish.site] = [];
      bySite[dish.site].push(dish);
    }

    // Get unique spacecraft being tracked
    const allTargets = new Set<string>();
    for (const dish of dishes) {
      for (const target of dish.targets) {
        allTargets.add(target.name);
      }
    }

    await upsertContent(
      'mission-control:dsn-status',
      'mission-control',
      'dsn-status',
      {
        activeDishes: dishes,
        siteStatus: Object.entries(bySite).map(([site, siteDishes]) => ({
          site,
          activeDishCount: siteDishes.length,
          antennas: siteDishes.map((d) => d.antenna),
        })),
        spacecraftBeingTracked: Array.from(allTargets),
        totalActiveDishes: dishes.length,
        totalSpacecraft: allTargets.size,
        fetchedAt: new Date().toISOString(),
        source: 'NASA DSN Now',
      },
      { sourceType: 'api', sourceUrl: 'https://eyes.jpl.nasa.gov/dsn/data/dsn.xml' }
    );

    await logRefresh('mission-control', 'api-fetch', 'success', {
      itemsUpdated: 1,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`DSN status updated: ${dishes.length} active dishes tracking ${allTargets.size} spacecraft`);
    return 1;
  } catch (error) {
    await logRefresh('mission-control', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch DSN status', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── Where The ISS At (Real-Time ISS Position) ─────────────────────────

interface IssPositionResponse {
  name: string;
  id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
  daynum: number;
  solar_lat: number;
  solar_lon: number;
  units: string;
}

export async function fetchAndStoreIssPosition(): Promise<number> {
  const start = Date.now();
  try {
    const data = await fetchWhereTheIss('25544') as IssPositionResponse | null;

    if (!data || !data.latitude) {
      logger.warn('Where The ISS At returned empty data');
      return 0;
    }

    await upsertContent(
      'space-stations:iss-position',
      'space-stations',
      'iss-position',
      {
        name: data.name,
        satelliteId: data.id,
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,
        velocity: data.velocity,
        visibility: data.visibility,
        footprint: data.footprint,
        timestamp: data.timestamp,
        solarLat: data.solar_lat,
        solarLon: data.solar_lon,
        units: data.units,
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://api.wheretheiss.at/v1/satellites/25544' }
    );

    await logRefresh('space-stations', 'api-fetch', 'success', {
      itemsUpdated: 1,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`ISS position updated: lat=${data.latitude.toFixed(2)}, lon=${data.longitude.toFixed(2)}, alt=${data.altitude.toFixed(1)}km`);
    return 1;
  } catch (error) {
    await logRefresh('space-stations', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch ISS position', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ─── SBIR.gov (Space Innovation Grants) ─────────────────────────────────

interface SbirAward {
  company: string;
  award_title: string;
  agency: string;
  branch?: string;
  contract?: string;
  award_amount?: number;
  award_year?: number;
  phase?: string;
  program?: string;
  solicitation_id?: string;
  topic_code?: string;
  abstract?: string;
  ri_name?: string;
  ri_state?: string;
}

export async function fetchAndStoreSbirAwards(): Promise<number> {
  const start = Date.now();
  try {
    const data = await fetchSbirGov({
      keyword: 'space satellite launch',
      agency: 'NASA',
      rows: '25',
    }) as SbirAward[] | null;

    if (!data || !Array.isArray(data) || data.length === 0) {
      logger.warn('SBIR.gov returned empty awards data');
      return 0;
    }

    const awards = data.map((a) => ({
      company: a.company || 'Unknown',
      title: a.award_title || 'Untitled',
      agency: a.agency || 'NASA',
      branch: a.branch || null,
      contract: a.contract || null,
      amount: a.award_amount || null,
      year: a.award_year || null,
      phase: a.phase || null,
      program: a.program || null,
      solicitationId: a.solicitation_id || null,
      topicCode: a.topic_code || null,
      abstract: a.abstract?.slice(0, 300) || null,
      state: a.ri_state || null,
    }));

    // Aggregate by company
    const companyCounts: Record<string, { count: number; totalAmount: number }> = {};
    for (const award of awards) {
      const key = award.company;
      if (!companyCounts[key]) companyCounts[key] = { count: 0, totalAmount: 0 };
      companyCounts[key].count++;
      companyCounts[key].totalAmount += award.amount || 0;
    }

    const topCompanies = Object.entries(companyCounts)
      .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
      .slice(0, 10)
      .map(([company, stats]) => ({
        company,
        awardCount: stats.count,
        totalFunding: stats.totalAmount,
      }));

    // Phase distribution
    const phaseCounts: Record<string, number> = {};
    for (const award of awards) {
      const phase = award.phase || 'Unknown';
      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    }

    await upsertContent(
      'startups:sbir-awards',
      'startups',
      'sbir-awards',
      {
        awards,
        totalReturned: awards.length,
        topCompanies,
        phaseDistribution: Object.entries(phaseCounts)
          .map(([phase, count]) => ({ phase, count })),
        totalFunding: awards.reduce((sum, a) => sum + (a.amount || 0), 0),
        source: 'SBIR.gov',
        fetchedAt: new Date().toISOString(),
      },
      { sourceType: 'api', sourceUrl: 'https://www.sbir.gov/api/awards.json' }
    );

    await logRefresh('startups', 'api-fetch', 'success', {
      itemsUpdated: 1,
      itemsChecked: awards.length,
      apiCallsMade: 1,
      duration: Date.now() - start,
    });

    logger.info(`SBIR awards updated: ${awards.length} space-related awards`);
    return 1;
  } catch (error) {
    await logRefresh('startups', 'api-fetch', 'failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    logger.error('Failed to fetch SBIR awards', {
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
  // --- Core fetchers ---
  results['iss-crew'] = await fetchAndStoreISSCrew();
  results['neo-objects'] = await fetchAndStoreNeoObjects();
  results['satellite-counts'] = await fetchAndStoreSatelliteCounts();
  results['defense-spending'] = await fetchAndStoreDefenseSpending();
  results['patents'] = await fetchAndStorePatents();

  // --- v0.7.0 fetchers ---
  results['apod'] = await fetchAndStoreApod();
  results['nasa-tech-projects'] = await fetchAndStoreTechProjects();
  results['jpl-close-approaches'] = await fetchAndStoreJplCloseApproaches();
  results['enhanced-space-weather'] = await fetchAndStoreEnhancedSpaceWeather();
  results['donki-enhanced'] = await fetchAndStoreDonkiEnhanced();
  results['space-stocks'] = await fetchAndStoreSpaceStocks();
  results['gov-contracts'] = await fetchAndStoreGovContracts();
  results['fcc-filings'] = await fetchAndStoreFccFilings();
  results['federal-register'] = await fetchAndStoreFederalRegDocs();

  // --- v0.8.0 fetchers (12 new APIs) ---
  results['epic-earth'] = await fetchAndStoreEpicEarth();
  results['earth-events'] = await fetchAndStoreEarthEvents();
  results['mars-rover-photos'] = await fetchAndStoreMarsRoverPhotos();
  results['exoplanets'] = await fetchAndStoreExoplanets();
  results['sentry-impact-risk'] = await fetchAndStoreSentryImpactRisk();
  results['fireballs'] = await fetchAndStoreFireballs();
  results['mining-targets'] = await fetchAndStoreMiningTargets();
  results['nasa-images'] = await fetchAndStoreNasaImages();
  results['solar-imagery'] = await fetchAndStoreSolarImagery();
  results['dsn-status'] = await fetchAndStoreDsnStatus();
  results['iss-position'] = await fetchAndStoreIssPosition();
  results['sbir-awards'] = await fetchAndStoreSbirAwards();

  const totalUpdated = Object.values(results).reduce((sum, n) => sum + n, 0);

  logger.info('External API refresh complete', { totalUpdated, results });

  return { totalUpdated, results };
}

/**
 * Refresh only high-frequency APIs (those needing updates every 15-30 minutes).
 * Call this more often than refreshAllExternalAPIs() for near-real-time data.
 */
export async function refreshHighFrequencyAPIs(): Promise<{
  totalUpdated: number;
  results: Record<string, number>;
}> {
  const results: Record<string, number> = {};

  // Every ~15 minutes: DSN status, ISS position
  results['dsn-status'] = await fetchAndStoreDsnStatus();
  results['iss-position'] = await fetchAndStoreIssPosition();

  // Every ~30 minutes: solar imagery
  results['solar-imagery'] = await fetchAndStoreSolarImagery();

  const totalUpdated = Object.values(results).reduce((sum, n) => sum + n, 0);

  logger.info('High-frequency API refresh complete', { totalUpdated, results });

  return { totalUpdated, results };
}
