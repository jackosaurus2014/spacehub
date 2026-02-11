// Per-module TTL and refresh priority configuration

export interface FreshnessPolicy {
  ttlHours: number;
  refreshPriority: 'critical' | 'high' | 'moderate' | 'low';
  refreshSource: 'api' | 'ai-research' | 'both';
  keywords: string[]; // For matching relevant news articles
}

export const FRESHNESS_POLICIES: Record<string, FreshnessPolicy> = {
  // CRITICAL: Changes frequently, data must be current
  'space-stations': {
    ttlHours: 24,
    refreshPriority: 'critical',
    refreshSource: 'both', // Open Notify API + AI for details
    keywords: ['ISS', 'space station', 'Tiangong', 'crew', 'astronaut', 'cosmonaut', 'Axiom', 'Orbital Reef'],
  },

  // HIGH: Changes weekly or with news cycles
  'constellations': {
    ttlHours: 168, // 7 days
    refreshPriority: 'high',
    refreshSource: 'api', // CelesTrak
    keywords: ['Starlink', 'OneWeb', 'Kuiper', 'constellation', 'satellite deploy'],
  },
  'space-economy': {
    ttlHours: 24,
    refreshPriority: 'high',
    refreshSource: 'both', // Finnhub stock API + AI research
    keywords: ['space economy', 'space market', 'venture capital', 'space investment', 'space IPO', 'space funding', 'space stock'],
  },
  'startups': {
    ttlHours: 168,
    refreshPriority: 'high',
    refreshSource: 'ai-research',
    keywords: ['startup', 'funding round', 'Series A', 'Series B', 'space startup', 'seed round', 'space venture'],
  },
  'space-defense': {
    ttlHours: 24,
    refreshPriority: 'high',
    refreshSource: 'both', // USAspending API + SAM.gov + AI
    keywords: ['Space Force', 'space defense', 'SDA', 'military space', 'space command', 'NRO', 'defense contract', 'NSSL', 'ASAT', 'counterspace'],
  },
  'cislunar': {
    ttlHours: 168,
    refreshPriority: 'high',
    refreshSource: 'ai-research',
    keywords: ['Artemis', 'lunar', 'moon mission', 'Gateway', 'CLPS', 'cislunar', 'Lunar Pathfinder'],
  },
  'compliance': {
    ttlHours: 48,
    refreshPriority: 'high',
    refreshSource: 'both', // FCC ECFS + Federal Register APIs + AI
    keywords: ['FCC', 'FAA license', 'space law', 'space regulation', 'ITU', 'Artemis Accords', 'space treaty', 'spectrum filing'],
  },

  // MODERATE: Changes monthly
  'asteroid-watch': {
    ttlHours: 48, // JPL SBDB + NASA NeoWs updated daily
    refreshPriority: 'high',
    refreshSource: 'api', // NASA NeoWs + JPL SBDB
    keywords: ['asteroid', 'NEO', 'near-Earth', 'DART', 'planetary defense', 'close approach', 'JPL'],
  },
  'patents': {
    ttlHours: 720, // 30 days
    refreshPriority: 'moderate',
    refreshSource: 'api', // USPTO PatentsView
    keywords: ['space patent', 'space IP', 'patent filing', 'space technology patent'],
  },
  'launch-vehicles': {
    ttlHours: 720,
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['Falcon 9', 'Starship', 'New Glenn', 'Vulcan', 'Ariane', 'launch vehicle', 'rocket', 'first flight'],
  },
  'mars-planner': {
    ttlHours: 720,
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['Mars', 'Perseverance', 'Curiosity', 'Mars mission', 'Mars launch', 'ExoMars'],
  },
  'spaceports': {
    ttlHours: 720,
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['spaceport', 'launch site', 'launch pad', 'Cape Canaveral', 'Boca Chica', 'launch complex'],
  },
  'space-manufacturing': {
    ttlHours: 720,
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['space manufacturing', 'in-space production', 'Varda', 'Redwire', 'space factory', 'microgravity'],
  },
  'space-tourism': {
    ttlHours: 720,
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['space tourism', 'Blue Origin', 'Virgin Galactic', 'SpaceX tourism', 'Axiom mission', 'private astronaut'],
  },
  'supply-chain': {
    ttlHours: 720,
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['space supply chain', 'space components', 'satellite manufacturing', 'launch supply'],
  },
  'talent-board': {
    ttlHours: 168, // 7 days
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['space expert', 'space consultant', 'chief engineer', 'space workforce', 'space career', 'space appointment'],
  },
  'webinars': {
    ttlHours: 168, // 7 days
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['space conference', 'space webinar', 'space symposium', 'space forum', 'IAC', 'SpaceCom'],
  },

  // Mission Control (APOD + TechPort)
  'mission-control': {
    ttlHours: 24,
    refreshPriority: 'high',
    refreshSource: 'api', // NASA APOD + TechPort APIs
    keywords: ['NASA', 'mission control', 'technology', 'APOD', 'astronomy picture'],
  },

  // Space Economy (Finnhub stock data)
  // (extends existing ai-research with API data)

  // Business Opportunities (SAM.gov contracts)
  'business-opportunities': {
    ttlHours: 24,
    refreshPriority: 'high',
    refreshSource: 'both', // SAM.gov API + AI
    keywords: ['contract', 'opportunity', 'RFP', 'procurement', 'award', 'SAM.gov', 'aerospace contract'],
  },

  // Space Environment (Enhanced NOAA + DONKI)
  'space-environment': {
    ttlHours: 6,
    refreshPriority: 'critical',
    refreshSource: 'api', // NOAA SWPC + NASA DONKI
    keywords: ['solar flare', 'geomagnetic storm', 'Kp index', 'solar wind', 'CME', 'space weather', 'radiation belt'],
  },

  // Exoplanets (weekly refresh - data changes slowly)
  'exoplanets': {
    ttlHours: 168, // 7 days
    refreshPriority: 'low',
    refreshSource: 'api',
    keywords: ['exoplanet', 'TESS', 'Kepler', 'habitable zone', 'transit', 'radial velocity'],
  },

  // Earth imagery (daily - new EPIC images daily)
  'earth-imagery': {
    ttlHours: 24,
    refreshPriority: 'moderate',
    refreshSource: 'api',
    keywords: ['DSCOVR', 'EPIC', 'Earth image', 'blue marble'],
  },

  // Deep Space Network (real-time - 15min refresh)
  'dsn': {
    ttlHours: 1,
    refreshPriority: 'critical',
    refreshSource: 'api',
    keywords: ['DSN', 'deep space network', 'Goldstone', 'Madrid', 'Canberra', 'antenna'],
  },

  // Fireballs/bolides (daily)
  'fireballs': {
    ttlHours: 24,
    refreshPriority: 'moderate',
    refreshSource: 'api',
    keywords: ['fireball', 'bolide', 'meteor', 'impact', 'atmospheric entry'],
  },

  // SBIR grants (weekly)
  'sbir-grants': {
    ttlHours: 168,
    refreshPriority: 'low',
    refreshSource: 'api',
    keywords: ['SBIR', 'STTR', 'innovation grant', 'small business', 'NASA award'],
  },

  // Solar imagery (30min - real-time solar monitoring)
  'solar-imagery': {
    ttlHours: 1,
    refreshPriority: 'critical',
    refreshSource: 'api',
    keywords: ['SDO', 'solar image', 'sun', 'helioviewer', 'AIA', 'HMI'],
  },

  // Aurora forecast (30min)
  'aurora': {
    ttlHours: 1,
    refreshPriority: 'critical',
    refreshSource: 'api',
    keywords: ['aurora', 'northern lights', 'OVATION', 'geomagnetic'],
  },

  // LOW: Rarely changes
  'ground-stations': {
    ttlHours: 1440, // 60 days
    refreshPriority: 'low',
    refreshSource: 'ai-research',
    keywords: ['ground station', 'DSN', 'KSAT', 'AWS Ground Station', 'antenna network'],
  },
};

export function getPolicy(module: string): FreshnessPolicy {
  return FRESHNESS_POLICIES[module] || {
    ttlHours: 720,
    refreshPriority: 'moderate' as const,
    refreshSource: 'ai-research' as const,
    keywords: [],
  };
}

export function getExpiresAt(module: string, fromDate?: Date): Date {
  const policy = getPolicy(module);
  const date = new Date(fromDate || Date.now());
  date.setHours(date.getHours() + policy.ttlHours);
  return date;
}

export function isStale(module: string, lastRefreshed: Date): boolean {
  const policy = getPolicy(module);
  const ageMs = Date.now() - lastRefreshed.getTime();
  const ttlMs = policy.ttlHours * 60 * 60 * 1000;
  return ageMs > ttlMs;
}

export function isExpired(module: string, lastRefreshed: Date): boolean {
  const policy = getPolicy(module);
  const ageMs = Date.now() - lastRefreshed.getTime();
  const ttlMs = policy.ttlHours * 60 * 60 * 1000 * 2; // 2x TTL = expired
  return ageMs > ttlMs;
}

// Get all modules that need refresh, ordered by priority
export function getModulesNeedingRefresh(): string[] {
  const priorityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
  return Object.entries(FRESHNESS_POLICIES)
    .sort(([, a], [, b]) => priorityOrder[a.refreshPriority] - priorityOrder[b.refreshPriority])
    .map(([module]) => module);
}

// Get modules that use a specific refresh source
export function getModulesBySource(source: 'api' | 'ai-research'): string[] {
  return Object.entries(FRESHNESS_POLICIES)
    .filter(([, policy]) => policy.refreshSource === source || policy.refreshSource === 'both')
    .map(([module]) => module);
}
