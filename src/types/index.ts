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
  isPremium?: boolean;
}

// Subscription tiers
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  priceYearly: number;
  features: string[];
  highlighted?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Explorer',
    price: 0,
    priceYearly: 0,
    features: [
      'Browse news by category',
      'Mission Control countdown',
      'Basic news feed',
      'Limited to 10 articles/day',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 9.99,
    priceYearly: 99,
    highlighted: true,
    features: [
      'Everything in Explorer',
      'Unlimited article access',
      'Real-time stock tracking',
      'Market Intel dashboard',
      'Resource Exchange calculator',
      'Price alerts & notifications',
      'Ad-free experience',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    priceYearly: 499,
    features: [
      'Everything in Professional',
      'AI-powered opportunities',
      'Government contract alerts',
      'Custom watchlists',
      'API access',
      'Team collaboration',
      'Dedicated account manager',
      'Custom integrations',
    ],
  },
];

export const AVAILABLE_MODULES: ModuleConfig[] = [
  {
    moduleId: 'categories',
    name: 'Browse Categories',
    description: 'Explore news by category',
    icon: '📂',
    defaultEnabled: true,
    defaultPosition: 0,
  },
  {
    moduleId: 'mission-control',
    name: 'Mission Control',
    description: 'Countdown to upcoming space missions and events',
    icon: '🎯',
    defaultEnabled: true,
    defaultPosition: 1,
  },
  {
    moduleId: 'blogs-articles',
    name: 'Blogs & Articles',
    description: 'Expert insights from space industry professionals',
    icon: '✍️',
    defaultEnabled: true,
    defaultPosition: 2,
  },
  {
    moduleId: 'news-feed',
    name: 'News Feed',
    description: 'Latest space industry news',
    icon: '📰',
    defaultEnabled: true,
    defaultPosition: 3,
  },
  {
    moduleId: 'market-intel',
    name: 'Market Intel',
    description: 'Space industry companies, stocks, and funding data',
    icon: '📊',
    defaultEnabled: true,
    defaultPosition: 4,
    isPremium: true,
  },
  {
    moduleId: 'resource-exchange',
    name: 'Resource Exchange',
    description: 'Space commodities pricing - Earth vs orbit costs',
    icon: '💰',
    defaultEnabled: true,
    defaultPosition: 5,
    isPremium: true,
  },
  {
    moduleId: 'business-opportunities',
    name: 'Business Opportunities',
    description: 'AI-powered space business opportunities and government contracts',
    icon: '💼',
    defaultEnabled: true,
    defaultPosition: 6,
    isPremium: true,
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

// Blog Types
export type BlogAuthorType =
  | 'consultant'
  | 'lawyer'
  | 'entrepreneur'
  | 'investor'
  | 'engineer'
  | 'journalist';

export type BlogTopic =
  | 'space_law'
  | 'investment'
  | 'policy'
  | 'technology'
  | 'business'
  | 'exploration';

export interface BlogSource {
  id: string;
  name: string;
  slug: string;
  url: string;
  feedUrl: string | null;
  type: string;
  authorName: string | null;
  authorTitle: string | null;
  authorType: BlogAuthorType;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  url: string;
  sourceId: string;
  source: {
    name: string;
    slug: string;
    authorType: string;
    imageUrl?: string | null;
  };
  authorName: string | null;
  imageUrl: string | null;
  tags: string | null;
  topic: BlogTopic | null;
  publishedAt: Date;
  fetchedAt: Date;
}

export const BLOG_TOPICS: { value: BlogTopic; label: string; icon: string }[] = [
  { value: 'space_law', label: 'Space Law', icon: '⚖️' },
  { value: 'investment', label: 'Investment', icon: '💰' },
  { value: 'policy', label: 'Policy', icon: '📜' },
  { value: 'technology', label: 'Technology', icon: '🔧' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'exploration', label: 'Exploration', icon: '🚀' },
];

export const AUTHOR_TYPES: { value: BlogAuthorType; label: string; icon: string }[] = [
  { value: 'consultant', label: 'Consultants', icon: '👔' },
  { value: 'lawyer', label: 'Lawyers', icon: '⚖️' },
  { value: 'entrepreneur', label: 'Entrepreneurs', icon: '💡' },
  { value: 'investor', label: 'Investors', icon: '📈' },
  { value: 'engineer', label: 'Engineers', icon: '🔬' },
  { value: 'journalist', label: 'Journalists', icon: '📝' },
];

// Space Company Types
export type CompanyFocusArea =
  | 'launch_provider'
  | 'satellites'
  | 'space_stations'
  | 'lunar'
  | 'mars'
  | 'defense'
  | 'earth_observation'
  | 'communications'
  | 'in_space_services'
  | 'manufacturing'
  | 'propulsion'
  | 'space_tourism'
  | 'asteroid_mining'
  | 'space_infrastructure';

export type CompanyCountry =
  | 'USA'
  | 'CHN'
  | 'RUS'
  | 'JPN'
  | 'EUR'
  | 'FRA'
  | 'IND'
  | 'KOR'
  | 'ISR'
  | 'NZL'
  | 'AUS';

export interface SpaceCompany {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  country: CompanyCountry;
  headquarters: string | null;
  founded: number | null;
  website: string | null;
  logoUrl: string | null;

  // Public company info
  isPublic: boolean;
  ticker: string | null;
  exchange: string | null;
  marketCap: number | null;
  stockPrice: number | null;
  priceChange24h: number | null;

  // Private company info
  isPreIPO: boolean;
  expectedIPODate: string | null;
  lastFundingRound: string | null;
  lastFundingAmount: number | null;
  lastFundingDate: string | null;
  totalFunding: number | null;
  nextFundingRound: string | null;
  valuation: number | null;

  // Space industry focus
  focusAreas: CompanyFocusArea[];
  subSectors: string[] | null;

  // Metadata
  employeeCount: number | null;
  revenueEstimate: number | null;

  createdAt: Date;
  updatedAt: Date;
}

export const FOCUS_AREAS: { value: CompanyFocusArea; label: string; icon: string }[] = [
  { value: 'launch_provider', label: 'Launch Provider', icon: '🚀' },
  { value: 'satellites', label: 'Satellites', icon: '📡' },
  { value: 'space_stations', label: 'Space Stations', icon: '🛰️' },
  { value: 'lunar', label: 'Lunar', icon: '🌙' },
  { value: 'mars', label: 'Mars', icon: '🔴' },
  { value: 'defense', label: 'Defense & National Security', icon: '🛡️' },
  { value: 'earth_observation', label: 'Earth Observation', icon: '🌍' },
  { value: 'communications', label: 'Communications', icon: '📶' },
  { value: 'in_space_services', label: 'In-Space Services', icon: '🔧' },
  { value: 'manufacturing', label: 'Space Manufacturing', icon: '🏭' },
  { value: 'propulsion', label: 'Propulsion', icon: '⚡' },
  { value: 'space_tourism', label: 'Space Tourism', icon: '✈️' },
  { value: 'asteroid_mining', label: 'Asteroid Mining', icon: '⛏️' },
  { value: 'space_infrastructure', label: 'Space Infrastructure', icon: '🏗️' },
];

export const COUNTRY_INFO: Record<CompanyCountry, { name: string; flag: string }> = {
  USA: { name: 'United States', flag: '🇺🇸' },
  CHN: { name: 'China', flag: '🇨🇳' },
  RUS: { name: 'Russia', flag: '🇷🇺' },
  JPN: { name: 'Japan', flag: '🇯🇵' },
  EUR: { name: 'Europe', flag: '🇪🇺' },
  FRA: { name: 'France', flag: '🇫🇷' },
  IND: { name: 'India', flag: '🇮🇳' },
  KOR: { name: 'South Korea', flag: '🇰🇷' },
  ISR: { name: 'Israel', flag: '🇮🇱' },
  NZL: { name: 'New Zealand', flag: '🇳🇿' },
  AUS: { name: 'Australia', flag: '🇦🇺' },
};

export const EXCHANGES: Record<string, string> = {
  NYSE: 'New York Stock Exchange',
  NASDAQ: 'NASDAQ',
  TSE: 'Tokyo Stock Exchange',
  SSE: 'Shanghai Stock Exchange',
  LSE: 'London Stock Exchange',
  MOEX: 'Moscow Exchange',
  EPA: 'Euronext Paris',
};

// Space Resource Types
export type ResourceCategory =
  | 'raw_material'
  | 'composite'
  | 'fuel'
  | 'life_support'
  | 'electronics'
  | 'exotic';

export type ResourceAvailability =
  | 'abundant'
  | 'common'
  | 'limited'
  | 'rare'
  | 'critical';

export interface SpaceResource {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: ResourceCategory;
  earthPricePerKg: number;
  priceUnit: string | null;
  priceSource: string | null;
  density: number | null;
  applications: string[];
  usedIn: string[] | null;
  primarySuppliers: string[] | null;
  availability: ResourceAvailability;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaunchProvider {
  id: string;
  slug: string;
  name: string;
  vehicle: string;
  costPerKgToLEO: number;
  costPerKgToGEO: number | null;
  costPerKgToMoon: number | null;
  costPerKgToMars: number | null;
  payloadToLEO: number | null;
  status: string;
  country: string;
  reusable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const RESOURCE_CATEGORIES: { value: ResourceCategory; label: string; icon: string }[] = [
  { value: 'raw_material', label: 'Raw Materials', icon: '🪨' },
  { value: 'composite', label: 'Composites', icon: '🧬' },
  { value: 'fuel', label: 'Propellants & Fuels', icon: '⛽' },
  { value: 'life_support', label: 'Life Support', icon: '💧' },
  { value: 'electronics', label: 'Electronics', icon: '💻' },
  { value: 'exotic', label: 'Exotic Materials', icon: '💎' },
];

export const AVAILABILITY_INFO: Record<ResourceAvailability, { label: string; color: string }> = {
  abundant: { label: 'Abundant', color: 'bg-green-500' },
  common: { label: 'Common', color: 'bg-blue-500' },
  limited: { label: 'Limited', color: 'bg-yellow-500' },
  rare: { label: 'Rare', color: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'bg-red-500' },
};

// Conversion constants
export const KG_TO_LB = 2.20462;
export const LB_TO_KG = 0.453592;

// Business Opportunity Types
export type OpportunityType =
  | 'government_contract'
  | 'industry_need'
  | 'resource_shortage'
  | 'service_gap'
  | 'ai_insight'
  | 'market_trend';

export type OpportunityCategory =
  | 'launch_services'
  | 'hardware'
  | 'satellites'
  | 'software'
  | 'logistics'
  | 'manufacturing'
  | 'research'
  | 'consulting'
  | 'other';

export type OpportunityTimeframe =
  | 'immediate'
  | 'short_term'
  | 'medium_term'
  | 'long_term';

export type OpportunityDifficulty =
  | 'low'
  | 'medium'
  | 'high'
  | 'expert';

export type TargetAudience =
  | 'entrepreneurs'
  | 'investors'
  | 'students'
  | 'corporations';

export interface BusinessOpportunity {
  id: string;
  slug: string;
  title: string;
  description: string;
  fullAnalysis: string | null;
  type: OpportunityType;
  category: OpportunityCategory;
  sector: string | null;
  estimatedValue: string | null;
  timeframe: OpportunityTimeframe | null;
  difficulty: OpportunityDifficulty | null;
  sourceType: string;
  sourceUrl: string | null;
  sourceName: string | null;
  solicitationId: string | null;
  agency: string | null;
  dueDate: Date | null;
  contractType: string | null;
  setAside: string | null;
  aiConfidence: number | null;
  aiReasoning: string | null;
  relatedTrends: string[] | null;
  targetAudience: TargetAudience[] | null;
  status: string;
  featured: boolean;
  viewCount: number;
  discoveredAt: Date;
  publishedAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date;
}

export const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; icon: string; color: string }[] = [
  { value: 'government_contract', label: 'Government Contract', icon: '🏛️', color: 'bg-blue-500' },
  { value: 'industry_need', label: 'Industry Need', icon: '🏭', color: 'bg-purple-500' },
  { value: 'resource_shortage', label: 'Resource Shortage', icon: '⚠️', color: 'bg-orange-500' },
  { value: 'service_gap', label: 'Service Gap', icon: '🔧', color: 'bg-cyan-500' },
  { value: 'ai_insight', label: 'AI Insight', icon: '🤖', color: 'bg-nebula-500' },
  { value: 'market_trend', label: 'Market Trend', icon: '📈', color: 'bg-green-500' },
];

export const OPPORTUNITY_CATEGORIES: { value: OpportunityCategory; label: string; icon: string }[] = [
  { value: 'launch_services', label: 'Launch Services', icon: '🚀' },
  { value: 'hardware', label: 'Hardware', icon: '🔩' },
  { value: 'satellites', label: 'Satellites', icon: '📡' },
  { value: 'software', label: 'Software', icon: '💻' },
  { value: 'logistics', label: 'Logistics', icon: '📦' },
  { value: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
  { value: 'research', label: 'Research', icon: '🔬' },
  { value: 'consulting', label: 'Consulting', icon: '💼' },
  { value: 'other', label: 'Other', icon: '📋' },
];

export const TIMEFRAME_INFO: Record<OpportunityTimeframe, { label: string; color: string }> = {
  immediate: { label: 'Immediate', color: 'bg-red-500' },
  short_term: { label: '1-2 Years', color: 'bg-orange-500' },
  medium_term: { label: '2-5 Years', color: 'bg-yellow-500' },
  long_term: { label: '5+ Years', color: 'bg-green-500' },
};

export const DIFFICULTY_INFO: Record<OpportunityDifficulty, { label: string; color: string }> = {
  low: { label: 'Low Barrier', color: 'bg-green-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  expert: { label: 'Expert Only', color: 'bg-red-500' },
};

export const TARGET_AUDIENCE_INFO: Record<TargetAudience, { label: string; icon: string }> = {
  entrepreneurs: { label: 'Entrepreneurs', icon: '💡' },
  investors: { label: 'Investors', icon: '💰' },
  students: { label: 'Students', icon: '🎓' },
  corporations: { label: 'Corporations', icon: '🏢' },
};
