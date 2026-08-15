// Centralized module route mapping (v0.7.0 consolidated)
export const MODULE_ROUTES: Record<string, string> = {
  // ── Main module routes (10 main modules) ──
  'mission-control': '/mission-control',
  'news-media': '/news',
  'space-market-intelligence': '/space-stocks',
  'business-opportunities-group': '/business-opportunities',
  'mission-planning': '/mission-cost',
  'space-operations': '/satellites',
  'talent-workforce': '/space-talent',
  'regulatory-compliance': '/compliance',
  'solar-system-expansion': '/solar-exploration',
  'space-environment': '/space-environment',

  // ── News & Media children ──
  'news-feed': '/news',
  'blogs-articles': '/blogs',
  'space-defense': '/space-defense',
  'ai-insights': '/ai-insights',

  // ── Space Market Intelligence children ──
  'market-intel': '/space-stocks',
  'company-research': '/company-research',
  'space-economy': '/space-stocks',
  'space-capital': '/funding-tracker',
  'company-profiles': '/company-profiles',
  'market-sizing': '/space-stocks',
  'funding-tracker': '/funding-tracker',
  'investor-directory': '/investors',

  // ── Business Opportunities children ──
  'business-opportunities': '/business-opportunities',
  'supply-chain': '/supply-chain',
  'space-mining': '/space-mining',
  'patent-tracker': '/patents',
  'manufacturing-imagery': '/space-manufacturing',
  'procurement-intelligence': '/procurement',
  'funding-opportunities': '/funding-opportunities',

  // ── Mission Planning children ──
  'mission-cost': '/mission-cost',
  'space-insurance': '/space-insurance',
  'resource-exchange': '/marketplace',
  'launch-windows': '/launch-windows',
  'launch-vehicles': '/launch-vehicles',
  'blueprints': '/propulsion-database',
  'orbital-costs': '/orbital-costs',
  'orbital-calculator': '/orbital-calculator',
  'constellation-designer': '/constellation-designer',
  'power-budget-calculator': '/power-budget-calculator',
  'link-budget-calculator': '/link-budget-calculator',
  'tools': '/tools',

  // ── Space Operations children ──
  'satellite-tracker': '/satellites',
  'orbital-management': '/spectrum?tab=geo-slots',
  'constellation-tracker': '/constellations',
  'ground-station-map': '/ground-stations',
  'space-stations': '/space-stations',
  'infrastructure-network': '/spaceports',

  // ── Regulatory & Compliance children ──
  'regulatory-hub': '/compliance',
  'spectrum-management': '/spectrum',
  'regulatory-risk': '/regulatory-risk',

  // ── Solar System Expansion children ──
  'solar-exploration': '/solar-exploration',
  'mars-planner': '/mars-planner',
  'cislunar-ecosystem': '/cislunar',
  'asteroid-watch': '/asteroid-watch',

  // ── Marketplace ──
  'marketplace': '/marketplace',
  'provider-dashboard': '/provider-dashboard',

  // ── Customer Discovery ──
  'customer-discovery': '/customer-discovery',

  // ── Business Planning Tools ──
  'business-models': '/business-models',
  'space-events': '/space-calendar',
  'unit-economics': '/unit-economics',

  // ── Deal Room ──
  'deal-rooms': '/deal-rooms',

  // ── Intelligence & Analytics ──
  'investment-tracker': '/funding-tracker',
  'market-map': '/space-stocks',
  'intelligence-brief': '/intelligence-brief',
  'mission-stats': '/mission-stats',
  'government-budgets': '/procurement?tab=global-budgets',

  // ── Pipeline & Resources ──
  'mission-pipeline': '/mission-control',
  'resources': '/resources',

  // ── Executive Intelligence ──
  'executive-moves': '/executive-moves',

  // ── Resources & Reference ──
  'glossary': '/glossary',
  'timeline': '/history',
  'comparison-tools': '/compare',
  'satellite-comparison': '/compare/satellites',

  // ── Legacy backward-compat aliases ──
  // (These also have redirects in next.config.js for direct URL access)
  'news-intelligence': '/news',
  'compliance-spectrum': '/compliance',

  // ── Game ──
  'space-tycoon': '/space-tycoon',
};

// Helper to get module route
export function getModuleRoute(moduleId: string): string {
  return MODULE_ROUTES[moduleId] || '/dashboard';
}
