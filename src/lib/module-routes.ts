// Centralized module route mapping
export const MODULE_ROUTES: Record<string, string> = {
  'mission-control': '/mission-control',
  'categories': '/news',
  'news-feed': '/news',
  'operational-awareness': '/operational-awareness',
  'solar-exploration': '/solar-exploration',
  'market-intel': '/market-intel',
  'blogs-articles': '/blogs',
  'business-opportunities': '/business-opportunities',
  'spectrum-tracker': '/spectrum',
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
  'satellite-tracker': '/satellites',
  'supply-chain': '/supply-chain',
  'space-mining': '/space-mining',
  'mission-cost': '/mission-cost',
  'blueprints': '/blueprints',
};

// Helper to get module route
export function getModuleRoute(moduleId: string): string {
  return MODULE_ROUTES[moduleId] || '/dashboard';
}
