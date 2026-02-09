/**
 * Widget type definitions and registry for Dashboard Builder
 * Maps each module to its supported widget types and size constraints
 */

export interface WidgetDefinition {
  moduleId: string;
  label: string;
  icon: string;
  supportedTypes: string[];
  defaultType: string;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export const WIDGET_TYPES = ['full', 'compact', 'chart', 'stats', 'feed'] as const;
export type WidgetType = typeof WIDGET_TYPES[number];

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  full: 'Full View',
  compact: 'Compact',
  chart: 'Chart',
  stats: 'Stats Cards',
  feed: 'Feed List',
};

export const WIDGET_TYPE_DESCRIPTIONS: Record<WidgetType, string> = {
  full: 'Complete module view with all details',
  compact: 'Condensed summary with key information',
  chart: 'Primary chart or visualization',
  stats: 'Key metric cards and KPIs',
  feed: 'Scrollable list of recent items',
};

/** Map of module -> supported widget types and constraints */
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  'news-feed': {
    moduleId: 'news-feed',
    label: 'News & Categories',
    icon: '📰',
    supportedTypes: ['full', 'feed', 'compact'],
    defaultType: 'feed',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'market-intel': {
    moduleId: 'market-intel',
    label: 'Market Intel',
    icon: '📊',
    supportedTypes: ['full', 'stats', 'chart', 'compact'],
    defaultType: 'stats',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'mission-control': {
    moduleId: 'mission-control',
    label: 'Mission Control',
    icon: '🎯',
    supportedTypes: ['full', 'compact', 'feed'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'space-environment': {
    moduleId: 'space-environment',
    label: 'Space Environment',
    icon: '☀️',
    supportedTypes: ['full', 'compact', 'stats'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'satellite-tracker': {
    moduleId: 'satellite-tracker',
    label: 'Satellite Tracker',
    icon: '🛰️',
    supportedTypes: ['full', 'compact', 'stats'],
    defaultType: 'full',
    minWidth: 4, minHeight: 3, maxWidth: 12, maxHeight: 8,
  },
  'startup-tracker': {
    moduleId: 'startup-tracker',
    label: 'Startup Tracker',
    icon: '🚀',
    supportedTypes: ['full', 'feed', 'compact', 'stats'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'business-opportunities': {
    moduleId: 'business-opportunities',
    label: 'Business Opportunities',
    icon: '💼',
    supportedTypes: ['full', 'feed', 'compact'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'space-economy': {
    moduleId: 'space-economy',
    label: 'Space Economy',
    icon: '📈',
    supportedTypes: ['full', 'chart', 'stats', 'compact'],
    defaultType: 'chart',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'regulatory-hub': {
    moduleId: 'regulatory-hub',
    label: 'Regulatory Hub',
    icon: '⚖️',
    supportedTypes: ['full', 'feed', 'compact'],
    defaultType: 'full',
    minWidth: 4, minHeight: 3, maxWidth: 12, maxHeight: 8,
  },
  'spectrum-management': {
    moduleId: 'spectrum-management',
    label: 'Spectrum Management',
    icon: '📡',
    supportedTypes: ['full', 'compact', 'stats'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'constellation-tracker': {
    moduleId: 'constellation-tracker',
    label: 'Constellation Tracker',
    icon: '✨',
    supportedTypes: ['full', 'compact', 'stats'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'ground-station-map': {
    moduleId: 'ground-station-map',
    label: 'Ground Stations',
    icon: '📡',
    supportedTypes: ['full', 'compact'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'solar-exploration': {
    moduleId: 'solar-exploration',
    label: 'Solar Exploration',
    icon: '🌍',
    supportedTypes: ['full', 'compact', 'feed'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'mars-planner': {
    moduleId: 'mars-planner',
    label: 'Mars Planner',
    icon: '🔴',
    supportedTypes: ['full', 'compact'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'cislunar-ecosystem': {
    moduleId: 'cislunar-ecosystem',
    label: 'Cislunar Ecosystem',
    icon: '🌙',
    supportedTypes: ['full', 'compact'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'asteroid-watch': {
    moduleId: 'asteroid-watch',
    label: 'Asteroid Watch',
    icon: '☄️',
    supportedTypes: ['full', 'compact', 'feed'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'blogs-articles': {
    moduleId: 'blogs-articles',
    label: 'Blogs & Articles',
    icon: '✍️',
    supportedTypes: ['full', 'feed', 'compact'],
    defaultType: 'feed',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'space-defense': {
    moduleId: 'space-defense',
    label: 'Space Defense',
    icon: '🛡️',
    supportedTypes: ['full', 'feed', 'compact'],
    defaultType: 'feed',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'supply-chain': {
    moduleId: 'supply-chain',
    label: 'Supply Chain',
    icon: '🔗',
    supportedTypes: ['full', 'compact'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'space-mining': {
    moduleId: 'space-mining',
    label: 'Space Mining',
    icon: '⛏️',
    supportedTypes: ['full', 'compact', 'stats'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'patent-tracker': {
    moduleId: 'patent-tracker',
    label: 'Patent Tracker',
    icon: '📋',
    supportedTypes: ['full', 'feed', 'compact'],
    defaultType: 'feed',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'mission-cost': {
    moduleId: 'mission-cost',
    label: 'Mission Cost',
    icon: '💰',
    supportedTypes: ['full', 'compact', 'stats'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'space-insurance': {
    moduleId: 'space-insurance',
    label: 'Space Insurance',
    icon: '🛡️',
    supportedTypes: ['full', 'compact'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'launch-windows': {
    moduleId: 'launch-windows',
    label: 'Launch Windows',
    icon: '🗓️',
    supportedTypes: ['full', 'compact', 'feed'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'launch-vehicles': {
    moduleId: 'launch-vehicles',
    label: 'Launch Vehicles',
    icon: '🚀',
    supportedTypes: ['full', 'compact', 'stats'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'orbital-management': {
    moduleId: 'orbital-management',
    label: 'Orbital Management',
    icon: '🌐',
    supportedTypes: ['full', 'compact'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
  'space-stations': {
    moduleId: 'space-stations',
    label: 'Space Stations',
    icon: '🏠',
    supportedTypes: ['full', 'compact'],
    defaultType: 'compact',
    minWidth: 3, minHeight: 2, maxWidth: 12, maxHeight: 8,
  },
};

/**
 * Get widget definition for a module, with fallback defaults
 */
export function getWidgetDefinition(moduleId: string): WidgetDefinition {
  return WIDGET_REGISTRY[moduleId] ?? {
    moduleId,
    label: moduleId,
    icon: '📦',
    supportedTypes: ['compact', 'full'],
    defaultType: 'compact',
    minWidth: 3,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 8,
  };
}

/**
 * Check if a widget type is supported for a module
 */
export function isWidgetTypeSupported(moduleId: string, widgetType: string): boolean {
  const def = getWidgetDefinition(moduleId);
  return def.supportedTypes.includes(widgetType);
}
