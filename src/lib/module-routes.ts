// Centralized module route mapping
export const MODULE_ROUTES: Record<string, string> = {
  // Standalone & parent module routes (parents route to first child)
  'mission-control': '/mission-control',
  'news-intelligence': '/news',
  'business-opportunities-group': '/business-opportunities',
  'mission-planning': '/mission-cost',
  'space-operations': '/satellites',
  'talent-workforce': '/space-jobs',
  'compliance-spectrum': '/compliance',
  'solar-system-expansion': '/solar-exploration',
  'space-environment': '/solar-flares',
  'blueprints': '/blueprints',

  // Child module routes
  'categories': '/news',
  'news-feed': '/news',
  'operational-awareness': '/operational-awareness',
  'solar-exploration': '/solar-exploration',
  'market-intel': '/market-intel',
  'blogs-articles': '/blogs',
  'business-opportunities': '/business-opportunities',
  'spectrum-tracker': '/spectrum',
  'spectrum-auction-monitor': '/spectrum-auctions',
  'space-insurance': '/space-insurance',
  'space-workforce': '/workforce',
  'space-jobs': '/space-jobs',
  'orbital-services': '/orbital-services',
  'orbital-slots': '/orbital-slots',
  'resource-exchange': '/resource-exchange',
  'compliance': '/compliance',
  'solar-flare-tracker': '/solar-flares',
  'launch-windows': '/launch-windows',
  'debris-monitor': '/debris-monitor',
  'constellation-tracker': '/constellations',
  'satellite-tracker': '/satellites',
  'supply-chain': '/supply-chain',
  'space-mining': '/space-mining',
  'mission-cost': '/mission-cost',
  'startup-tracker': '/startups',
  'mars-planner': '/mars-planner',
  'lunar-gateway': '/lunar-gateway',
  'ground-station-map': '/ground-stations',

  // New modules (v0.6.0)
  'space-law': '/space-law',
  'regulatory-filings': '/regulatory-filings',
  'space-economy': '/space-economy',
  'launch-vehicles': '/launch-vehicles',
  'space-stations': '/space-stations',
  'cislunar-tracker': '/cislunar',
  'spaceport-directory': '/spaceports',
  'asteroid-watch': '/asteroid-watch',
  'patent-tracker': '/patents',
  'space-manufacturing': '/space-manufacturing',
  'space-comms': '/space-comms',
  'imagery-marketplace': '/imagery-marketplace',
  'space-defense': '/space-defense',
};

// Helper to get module route
export function getModuleRoute(moduleId: string): string {
  return MODULE_ROUTES[moduleId] || '/dashboard';
}
