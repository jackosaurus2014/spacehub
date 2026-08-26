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
  // NOTE: 'space-capital', 'cislunar', 'mars-planner', 'spaceports' and
  // 'constellations' entries were removed 2026-08-26 (Phase-1 content
  // consolidation). Each page drew <=5 views over the prior 28 days (GA4)
  // while its ai-research entry spent daily Claude tokens refreshing content
  // for essentially nobody — and the AI-written rows for exactly this class
  // of module caused the 8/24 talent-board 500 and space-tourism
  // displacement bugs. The pages still render their last-refreshed rows via
  // /api/content/<module>; re-add an entry here to resume refreshing if a
  // module earns traffic. Constellations' CelesTrak satellite sync is
  // unaffected (it does not run off this registry).
  // NOTE: 'space-economy' and 'startups' entries were removed here
  // (2026-08-14 orphaned-pipeline cleanup). Neither module's DynamicContent
  // rows have a reader: /space-economy redirects to /market-intel (reads
  // /api/stocks + /api/companies) and /startups reads
  // src/lib/startup-hub-data.ts. Removing the policy entries takes both out
  // of getModulesBySource('ai-research'), so the daily ai-data-research
  // cron stops burning Claude tokens researching them. See report for the
  // caveat that module-api-fetchers.ts (out of scope for this cleanup)
  // still separately writes space-economy:stock-quotes,
  // space-economy:government-budgets, and startups:sbir-awards via the
  // 'external-apis' cron.
  'space-defense': {
    ttlHours: 24,
    refreshPriority: 'high',
    refreshSource: 'both', // USAspending API + SAM.gov + AI
    keywords: ['Space Force', 'space defense', 'SDA', 'military space', 'space command', 'NRO', 'defense contract', 'NSSL', 'ASAT', 'counterspace'],
  },
  'compliance': {
    ttlHours: 48,
    refreshPriority: 'high',
    refreshSource: 'both', // FCC ECFS + Federal Register APIs + AI
    keywords: ['FCC', 'FAA license', 'space law', 'space regulation', 'ITU', 'Artemis Accords', 'space treaty', 'spectrum filing'],
  },
  'spectrum': {
    ttlHours: 24,
    refreshPriority: 'high',
    refreshSource: 'api', // FCC ECFS public API (recent filings feed)
    keywords: ['spectrum', 'FCC filing', 'NGSO', 'earth station', 'spectrum sharing', 'satellite constellation'],
  },

  // MODERATE: Changes monthly
  'asteroid-watch': {
    ttlHours: 48, // JPL SBDB + NASA NeoWs updated daily
    refreshPriority: 'high',
    refreshSource: 'api', // NASA NeoWs + JPL SBDB
    keywords: ['asteroid', 'NEO', 'near-Earth', 'DART', 'planetary defense', 'close approach', 'JPL'],
  },
  'patents': {
    ttlHours: 168, // 7 days
    refreshPriority: 'moderate',
    refreshSource: 'api', // USPTO PatentsView
    keywords: ['space patent', 'space IP', 'patent filing', 'space technology patent'],
  },
  'launch-vehicles': {
    ttlHours: 168, // 7 days — launch counts and vehicle statuses change weekly
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['Falcon 9', 'Starship', 'New Glenn', 'Vulcan', 'Ariane', 'launch vehicle', 'rocket', 'first flight'],
  },
  'space-manufacturing': {
    ttlHours: 168, // 7 days
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['space manufacturing', 'in-space production', 'Varda', 'Redwire', 'space factory', 'microgravity'],
  },
  'space-tourism': {
    ttlHours: 168, // 7 days — flight schedules and pricing change frequently
    refreshPriority: 'moderate',
    refreshSource: 'ai-research',
    keywords: ['space tourism', 'Blue Origin', 'Virgin Galactic', 'SpaceX tourism', 'Axiom mission', 'private astronaut'],
  },
  'supply-chain': {
    ttlHours: 336, // 14 days
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

  // NOTE: 'business-opportunities' entry removed here (2026-08-14
  // orphaned-pipeline cleanup). The /business-opportunities page reads the
  // BusinessOpportunity Prisma model via /api/opportunities, seeded from
  // SEED_OPPORTUNITIES in src/lib/opportunities-data.ts — never this
  // DynamicContent module. Its two AI-research/API keys
  // (business-opportunities:sam-gov-all, :sbir-sttr, written by
  // src/lib/fetchers/business-opportunities-fetcher.ts) have zero readers.
  // See report for why the fetcher file itself was not deleted.
  // (2026-08-14 update: the weekly runAIAnalysis refresh mentioned in the
  // original note has since been disabled — see opportunities-data.ts —
  // because it generated undisclosed speculative "ai_generated" rows.)

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
