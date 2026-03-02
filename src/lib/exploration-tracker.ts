/**
 * Exploration Tracker - tracks which modules a user has visited
 * Uses localStorage to persist visit data across sessions.
 */

const STORAGE_KEY = 'spacenexus-exploration-visits';

export interface ModuleVisit {
  path: string;
  firstVisit: number;
  lastVisit: number;
  visitCount: number;
}

export interface ExplorationStats {
  totalModulesVisited: number;
  totalModulesAvailable: number;
  percentage: number;
  visits: ModuleVisit[];
}

/** All trackable module paths in the platform */
const ALL_MODULE_PATHS = [
  '/dashboard',
  '/mission-control',
  '/news',
  '/blogs',
  '/space-defense',
  '/ai-insights',
  '/solar-exploration',
  '/mars-planner',
  '/cislunar',
  '/asteroid-watch',
  '/market-map',
  '/resources',
  '/mission-pipeline',
  '/mission-stats',
  '/news-digest',
  '/orbit-guide',
  '/career-guide',
  '/acronyms',
  '/space-agencies',
  '/podcasts',
  '/debris-remediation',
  '/debris-tracker',
  '/space-tourism',
  '/news-aggregator',
  '/faq',
  '/market-intel',
  '/space-economy',
  '/space-capital',
  '/compliance',
  '/space-law',
  '/spectrum',
  '/patents',
  '/investment-tracker',
  '/government-budgets',
  '/intelligence-brief',
  '/executive-moves',
  '/startup-tracker',
  '/report-cards',
  '/portfolio-tracker',
  '/industry-trends',
  '/contract-awards',
  '/tech-readiness',
  '/business-opportunities',
  '/space-talent',
  '/jobs',
  '/supply-chain',
  '/space-mining',
  '/space-insurance',
  '/space-manufacturing',
  '/deal-flow',
  '/supply-chain-map',
  '/mission-cost',
  '/launch-vehicles',
  '/satellites',
  '/space-stations',
  '/orbital-slots',
  '/constellations',
  '/ground-stations',
  '/spaceports',
  '/resource-exchange',
  '/launch-windows',
  '/space-environment',
  '/blueprints',
  '/launch-cost-calculator',
  '/propulsion-database',
  '/launch-sites',
  '/frequency-bands',
  '/materials-database',
  '/isru',
  '/space-comms',
  '/constellation-designer',
  '/unit-economics',
  '/orbital-calculator',
  '/mission-simulator',
  '/reading-list',
  '/company-profiles',
  '/marketplace',
  '/community/forums',
] as const;

function getVisits(): ModuleVisit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVisits(visits: ModuleVisit[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // Storage full or unavailable
  }
}

/** Record that the user visited a module path */
export function recordModuleVisit(path: string): void {
  const visits = getVisits();
  const now = Date.now();
  const existing = visits.find((v) => v.path === path);

  if (existing) {
    existing.lastVisit = now;
    existing.visitCount += 1;
  } else {
    visits.push({
      path,
      firstVisit: now,
      lastVisit: now,
      visitCount: 1,
    });
  }

  saveVisits(visits);
}

/** Get exploration statistics */
export function getExplorationStats(): ExplorationStats {
  const visits = getVisits();
  const totalAvailable = ALL_MODULE_PATHS.length;
  const visitedPaths = new Set(visits.map((v) => v.path));
  const totalVisited = ALL_MODULE_PATHS.filter((p) => visitedPaths.has(p)).length;

  return {
    totalModulesVisited: totalVisited,
    totalModulesAvailable: totalAvailable,
    percentage: totalAvailable > 0 ? Math.round((totalVisited / totalAvailable) * 100) : 0,
    visits,
  };
}
