/**
 * Default dashboard layout presets for SpaceNexus
 * Users can start from these templates and customize
 */

export interface LayoutPreset {
  name: string;
  description: string;
  widgets: {
    moduleId: string;
    widgetType: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }[];
}

export const DEFAULT_LAYOUTS: LayoutPreset[] = [
  {
    name: 'Morning Brief',
    description: 'Quick overview of overnight news, market moves, and upcoming launches',
    widgets: [
      { moduleId: 'news-feed', widgetType: 'feed', x: 0, y: 0, w: 8, h: 6 },
      { moduleId: 'market-intel', widgetType: 'stats', x: 8, y: 0, w: 4, h: 3 },
      { moduleId: 'mission-control', widgetType: 'compact', x: 8, y: 3, w: 4, h: 3 },
      { moduleId: 'space-environment', widgetType: 'compact', x: 0, y: 6, w: 6, h: 3 },
      { moduleId: 'space-capital', widgetType: 'compact', x: 6, y: 6, w: 6, h: 3 },
    ],
  },
  {
    name: 'Investment Research',
    description: 'Market data, company analysis, and funding activity',
    widgets: [
      { moduleId: 'market-intel', widgetType: 'full', x: 0, y: 0, w: 8, h: 6 },
      { moduleId: 'space-economy', widgetType: 'chart', x: 8, y: 0, w: 4, h: 6 },
      { moduleId: 'space-capital', widgetType: 'feed', x: 0, y: 6, w: 6, h: 4 },
      { moduleId: 'business-opportunities', widgetType: 'compact', x: 6, y: 6, w: 6, h: 4 },
    ],
  },
  {
    name: 'Regulatory Watch',
    description: 'Compliance updates, spectrum activity, and policy changes',
    widgets: [
      { moduleId: 'regulatory-hub', widgetType: 'full', x: 0, y: 0, w: 12, h: 5 },
      { moduleId: 'spectrum-management', widgetType: 'compact', x: 0, y: 5, w: 6, h: 4 },
      { moduleId: 'news-feed', widgetType: 'feed', x: 6, y: 5, w: 6, h: 4 },
    ],
  },
  {
    name: 'Operations Center',
    description: 'Satellite tracking, weather, debris, and mission status',
    widgets: [
      { moduleId: 'satellite-tracker', widgetType: 'full', x: 0, y: 0, w: 8, h: 6 },
      { moduleId: 'space-environment', widgetType: 'stats', x: 8, y: 0, w: 4, h: 3 },
      { moduleId: 'mission-control', widgetType: 'compact', x: 8, y: 3, w: 4, h: 3 },
      { moduleId: 'constellation-tracker', widgetType: 'compact', x: 0, y: 6, w: 6, h: 3 },
      { moduleId: 'ground-station-map', widgetType: 'compact', x: 6, y: 6, w: 6, h: 3 },
    ],
  },
];
