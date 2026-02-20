// Centralized module route mapping (v0.7.0 consolidated)
export const MODULE_ROUTES: Record<string, string> = {
  // ── Main module routes (10 main modules) ──
  'mission-control': '/mission-control',
  'news-media': '/news',
  'space-market-intelligence': '/market-intel',
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
  'market-intel': '/market-intel',
  'space-economy': '/space-economy',
  'space-capital': '/space-capital',
  'company-profiles': '/company-profiles',
  'market-sizing': '/market-sizing',
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
  'resource-exchange': '/resource-exchange',
  'launch-windows': '/launch-windows',
  'launch-vehicles': '/launch-vehicles',
  'blueprints': '/blueprints',
  'orbital-costs': '/orbital-costs',

  // ── Space Operations children ──
  'satellite-tracker': '/satellites',
  'orbital-management': '/orbital-slots',
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
  'procurement-copilot': '/marketplace/copilot',
  'provider-dashboard': '/provider-dashboard',

  // ── Customer Discovery ──
  'customer-discovery': '/customer-discovery',

  // ── Business Planning Tools ──
  'business-models': '/business-models',
  'space-events': '/space-events',
  'investment-thesis': '/investment-thesis',

  // ── Deal Room ──
  'deal-rooms': '/deal-rooms',

  // ── Legacy backward-compat aliases ──
  // (These also have redirects in next.config.js for direct URL access)
  'news-intelligence': '/news',
  'compliance-spectrum': '/compliance',
};

// Helper to get module route
export function getModuleRoute(moduleId: string): string {
  return MODULE_ROUTES[moduleId] || '/dashboard';
}
