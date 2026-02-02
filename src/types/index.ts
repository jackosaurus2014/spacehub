export interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  source: string;
  category: string;
  imageUrl: string | null;
  publishedAt: Date;
  fetchedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export const NEWS_CATEGORIES = [
  { name: 'Launches', slug: 'launches', description: 'Rocket launches and mission updates' },
  { name: 'Missions', slug: 'missions', description: 'Space exploration missions' },
  { name: 'Companies', slug: 'companies', description: 'Space industry company news' },
  { name: 'Earnings', slug: 'earnings', description: 'Financial news and earnings reports' },
  { name: 'Development', slug: 'development', description: 'Technology and R&D updates' },
  { name: 'Policy', slug: 'policy', description: 'Space policy and regulations' },
] as const;

export type CategorySlug = typeof NEWS_CATEGORIES[number]['slug'];

// Space Event Types
export type SpaceEventType =
  | 'launch'
  | 'moon_mission'
  | 'mars_mission'
  | 'rover'
  | 'payload'
  | 'orbital_hab'
  | 'space_station'
  | 'crewed_mission'
  | 'satellite'
  | 'probe';

export type SpaceEventStatus =
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'scrubbed'
  | 'tbd'
  | 'go'
  | 'tbc';

export interface SpaceEvent {
  id: string;
  externalId: string | null;
  name: string;
  description: string | null;
  type: SpaceEventType;
  status: SpaceEventStatus;
  launchDate: Date | null;
  launchDatePrecision: string | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  location: string | null;
  country: string | null;
  agency: string | null;
  rocket: string | null;
  mission: string | null;
  imageUrl: string | null;
  infoUrl: string | null;
  videoUrl: string | null;
  fetchedAt: Date;
  updatedAt: Date;
}

// Module System Types
export interface ModuleDefinition {
  id: string;
  moduleId: string;
  name: string;
  description: string | null;
  icon: string | null;
  defaultEnabled: boolean;
  defaultPosition: number;
}

export interface UserModulePreference {
  id: string;
  userId: string;
  moduleId: string;
  enabled: boolean;
  position: number;
  settings: string | null;
}

export interface ModuleConfig {
  moduleId: string;
  name: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
  defaultPosition: number;
}

export const AVAILABLE_MODULES: ModuleConfig[] = [
  {
    moduleId: 'mission-control',
    name: 'Mission Control',
    description: 'Countdown to upcoming space missions and events',
    icon: '🎯',
    defaultEnabled: true,
    defaultPosition: 0,
  },
  {
    moduleId: 'news-feed',
    name: 'News Feed',
    description: 'Latest space industry news',
    icon: '📰',
    defaultEnabled: true,
    defaultPosition: 1,
  },
  {
    moduleId: 'categories',
    name: 'Browse Categories',
    description: 'Explore news by category',
    icon: '📂',
    defaultEnabled: true,
    defaultPosition: 2,
  },
];

export const EVENT_TYPE_INFO: Record<SpaceEventType, { label: string; icon: string; color: string }> = {
  launch: { label: 'Launch', icon: '🚀', color: 'bg-rocket-500' },
  moon_mission: { label: 'Moon Mission', icon: '🌙', color: 'bg-gray-400' },
  mars_mission: { label: 'Mars Mission', icon: '🔴', color: 'bg-red-500' },
  rover: { label: 'Rover', icon: '🤖', color: 'bg-yellow-500' },
  payload: { label: 'Payload', icon: '📦', color: 'bg-blue-500' },
  orbital_hab: { label: 'Orbital Habitat', icon: '🏠', color: 'bg-green-500' },
  space_station: { label: 'Space Station', icon: '🛰️', color: 'bg-purple-500' },
  crewed_mission: { label: 'Crewed Mission', icon: '👨‍🚀', color: 'bg-nebula-500' },
  satellite: { label: 'Satellite', icon: '📡', color: 'bg-cyan-500' },
  probe: { label: 'Probe', icon: '🛸', color: 'bg-indigo-500' },
};

export const EVENT_STATUS_INFO: Record<SpaceEventStatus, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-green-500' },
  completed: { label: 'Completed', color: 'bg-gray-500' },
  scrubbed: { label: 'Scrubbed', color: 'bg-red-500' },
  tbd: { label: 'TBD', color: 'bg-yellow-500' },
  go: { label: 'GO', color: 'bg-green-600' },
  tbc: { label: 'TBC', color: 'bg-orange-500' },
};
