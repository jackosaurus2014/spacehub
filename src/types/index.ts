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

export type ModuleSection = 'explore' | 'intelligence' | 'business' | 'tools';

export const MODULE_SECTIONS: { value: ModuleSection; label: string }[] = [
  { value: 'explore', label: 'Explore' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'business', label: 'Business' },
  { value: 'tools', label: 'Tools' },
];

export interface ModuleConfig {
  moduleId: string;
  name: string;
  description: string;
  icon: string;
  section: ModuleSection;
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
  // === Explore ===
  {
    moduleId: 'mission-control',
    name: 'Mission Control',
    description: 'Countdown to upcoming space missions and events',
    icon: '🎯',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 0,
  },
  {
    moduleId: 'categories',
    name: 'Browse News by Category',
    description: 'Explore news by category',
    icon: '📂',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 1,
  },
  {
    moduleId: 'news-feed',
    name: 'News Feed',
    description: 'Latest space industry news',
    icon: '📰',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 2,
  },
  {
    moduleId: 'solar-exploration',
    name: 'Solar Exploration',
    description: 'Interactive 3D visualization of planetary bodies with rover and lander locations',
    icon: '🌍',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 3,
    isPremium: true,
  },
  // === Intelligence ===
  {
    moduleId: 'market-intel',
    name: 'Market Intel',
    description: 'Space industry companies, stocks, and funding data',
    icon: '📊',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 4,
    isPremium: true,
  },
  {
    moduleId: 'blogs-articles',
    name: 'Blogs & Articles',
    description: 'Expert insights from space industry professionals',
    icon: '✍️',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 5,
  },
  // === Business ===
  {
    moduleId: 'business-opportunities',
    name: 'Business Opportunities',
    description: 'AI-powered space business opportunities and government contracts',
    icon: '💼',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 6,
    isPremium: true,
  },
  {
    moduleId: 'spectrum-tracker',
    name: 'Spectrum Tracker',
    description: 'Satellite frequency allocations, filings, and spectrum availability',
    icon: '📡',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 7,
    isPremium: true,
  },
  {
    moduleId: 'space-insurance',
    name: 'Space Insurance',
    description: 'Insurance market data, premium calculator, and risk assessment',
    icon: '🛡️',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 8,
    isPremium: true,
  },
  {
    moduleId: 'space-workforce',
    name: 'Space Workforce',
    description: 'Job market analytics, salary benchmarks, and talent trends',
    icon: '👩‍🚀',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 9,
    isPremium: true,
  },
  // === Tools ===
  {
    moduleId: 'resource-exchange',
    name: 'Resource Exchange',
    description: 'Space commodities pricing - Earth vs orbit costs',
    icon: '💰',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 10,
    isPremium: true,
  },
  {
    moduleId: 'compliance',
    name: 'Compliance',
    description: 'Export controls, regulations, and legal updates for space industry',
    icon: '⚖️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 11,
    isPremium: true,
  },
  {
    moduleId: 'solar-flare-tracker',
    name: 'Solar Flare Tracker',
    description: 'Real-time solar activity monitoring with 90-day danger forecasts',
    icon: '☀️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 12,
    isPremium: true,
  },
  {
    moduleId: 'orbital-slots',
    name: 'Orbital Slots',
    description: 'Satellite population by orbit with 1Y and 5Y projections',
    icon: '🛰️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 13,
    isPremium: true,
  },
  {
    moduleId: 'launch-windows',
    name: 'Launch Windows',
    description: 'Optimal launch windows and mission planning for planetary destinations',
    icon: '🪟',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 14,
    isPremium: true,
  },
  {
    moduleId: 'debris-monitor',
    name: 'Debris Monitor',
    description: 'Space debris tracking, collision risk, and Kessler syndrome monitoring',
    icon: '⚠️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 15,
    isPremium: true,
  },
];

// Compliance Module Types
export type ExportRegime = 'EAR' | 'ITAR';
export type ClassificationCategory = 'spacecraft' | 'satellite' | 'launch_vehicle' | 'component' | 'software' | 'technology' | 'orbital_hab' | 'rover';
export type RegulationType = 'proposed_rule' | 'final_rule' | 'notice' | 'guidance' | 'executive_order';
export type RegulationCategory = 'export_control' | 'licensing' | 'safety' | 'spectrum' | 'environmental' | 'commercial_space';
export type RegulationStatus = 'open' | 'comment_period' | 'closed' | 'final' | 'withdrawn';
export type LegalSourceType = 'law_firm' | 'government' | 'industry_association' | 'think_tank';

export interface ExportClassification {
  id: string;
  slug: string;
  regime: ExportRegime;
  classification: string;
  name: string;
  description: string;
  technicalNotes?: string;
  category: ClassificationCategory;
  subCategory?: string;
  controlReason?: string;
  licenseRequired?: string;
  exceptions?: string[];
  relatedECCNs?: string[];
  sourceUrl?: string;
  effectiveDate?: Date;
}

export interface ProposedRegulation {
  id: string;
  slug: string;
  title: string;
  summary: string;
  fullText?: string;
  agency: string;
  docketNumber?: string;
  federalRegisterCitation?: string;
  type: RegulationType;
  category: RegulationCategory;
  impactAreas: string[];
  impactSeverity?: 'low' | 'medium' | 'high' | 'critical';
  publishedDate: Date;
  commentDeadline?: Date;
  effectiveDate?: Date;
  status: RegulationStatus;
  sourceUrl: string;
  commentUrl?: string;
  keyChanges?: string[];
  industryImpact?: string;
}

export interface LegalUpdate {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  sourceId: string;
  sourceName?: string;
  authorName?: string;
  topics: string[];
  relevantRegimes?: string[];
  url: string;
  publishedAt: Date;
}

export interface LegalSource {
  id: string;
  name: string;
  slug: string;
  type: LegalSourceType;
  organization?: string;
  specialty?: string;
  url: string;
  feedUrl?: string;
  isActive: boolean;
}

export const EXPORT_REGIMES: { value: ExportRegime; label: string; description: string }[] = [
  { value: 'EAR', label: 'EAR', description: 'Export Administration Regulations (Commerce Dept)' },
  { value: 'ITAR', label: 'ITAR', description: 'International Traffic in Arms Regulations (State Dept)' },
];

export const CLASSIFICATION_CATEGORIES: { value: ClassificationCategory; label: string; icon: string }[] = [
  { value: 'spacecraft', label: 'Spacecraft', icon: '🛸' },
  { value: 'satellite', label: 'Satellites', icon: '🛰️' },
  { value: 'launch_vehicle', label: 'Launch Vehicles', icon: '🚀' },
  { value: 'component', label: 'Components', icon: '⚙️' },
  { value: 'software', label: 'Software', icon: '💻' },
  { value: 'technology', label: 'Technology', icon: '🔬' },
  { value: 'orbital_hab', label: 'Orbital Habitats', icon: '🏠' },
  { value: 'rover', label: 'Rovers', icon: '🤖' },
];

export const REGULATION_AGENCIES: { value: string; label: string }[] = [
  { value: 'BIS', label: 'Bureau of Industry and Security' },
  { value: 'DDTC', label: 'Directorate of Defense Trade Controls' },
  { value: 'FAA', label: 'Federal Aviation Administration' },
  { value: 'FCC', label: 'Federal Communications Commission' },
  { value: 'NASA', label: 'NASA' },
  { value: 'NOAA', label: 'NOAA' },
  { value: 'DoD', label: 'Department of Defense' },
  { value: 'State', label: 'Department of State' },
  { value: 'Commerce', label: 'Department of Commerce' },
];

export const REGULATION_STATUSES: { value: RegulationStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open for Comment', color: 'green' },
  { value: 'comment_period', label: 'Comment Period', color: 'yellow' },
  { value: 'closed', label: 'Comments Closed', color: 'orange' },
  { value: 'final', label: 'Final Rule', color: 'blue' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'gray' },
];

export const REGULATION_CATEGORIES: { value: RegulationCategory; label: string; icon: string }[] = [
  { value: 'export_control', label: 'Export Control', icon: '📋' },
  { value: 'licensing', label: 'Licensing', icon: '📜' },
  { value: 'safety', label: 'Safety', icon: '🛡️' },
  { value: 'spectrum', label: 'Spectrum', icon: '📡' },
  { value: 'environmental', label: 'Environmental', icon: '🌍' },
  { value: 'commercial_space', label: 'Commercial Space', icon: '🚀' },
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

// Solar Exploration Module Types
export type PlanetaryBodyType = 'planet' | 'moon' | 'asteroid';
export type LanderMissionType = 'lander' | 'rover' | 'probe' | 'sample_return';
export type LanderStatus = 'active' | 'inactive' | 'completed' | 'lost';

export interface PlanetaryBody {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  diameter: number;
  type: PlanetaryBodyType;
  textureUrl: string | null;
  color: string | null;
  hasBeenExplored: boolean;
  landers?: SurfaceLander[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SurfaceLander {
  id: string;
  slug: string;
  name: string;
  missionType: LanderMissionType;
  status: LanderStatus;
  planetaryBodyId: string;
  planetaryBody?: PlanetaryBody;
  latitude: number;
  longitude: number;
  landingSite: string | null;
  country: string;
  agency: string | null;
  company: string | null;
  launchDate: Date | null;
  landingDate: Date | null;
  endDate: Date | null;
  description: string | null;
  objectives: string[] | null;
  mass: number | null;
  powerSource: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PLANETARY_BODY_TYPES: { value: PlanetaryBodyType; label: string; icon: string }[] = [
  { value: 'planet', label: 'Planet', icon: '🪐' },
  { value: 'moon', label: 'Moon', icon: '🌙' },
  { value: 'asteroid', label: 'Asteroid', icon: '☄️' },
];

export const LANDER_MISSION_TYPES: { value: LanderMissionType; label: string; icon: string }[] = [
  { value: 'rover', label: 'Rover', icon: '🤖' },
  { value: 'lander', label: 'Lander', icon: '🛬' },
  { value: 'probe', label: 'Probe', icon: '🛸' },
  { value: 'sample_return', label: 'Sample Return', icon: '📦' },
];

export const LANDER_STATUS_INFO: Record<LanderStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-green-400', bgColor: 'bg-green-500' },
  inactive: { label: 'Inactive', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  completed: { label: 'Completed', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  lost: { label: 'Lost', color: 'text-red-400', bgColor: 'bg-red-500' },
};

export const SPACE_AGENCIES: Record<string, { name: string; flag: string }> = {
  NASA: { name: 'NASA', flag: '🇺🇸' },
  CNSA: { name: 'CNSA', flag: '🇨🇳' },
  ESA: { name: 'ESA', flag: '🇪🇺' },
  JAXA: { name: 'JAXA', flag: '🇯🇵' },
  ISRO: { name: 'ISRO', flag: '🇮🇳' },
  Roscosmos: { name: 'Roscosmos', flag: '🇷🇺' },
};

// Solar Flare Tracker Types
export type FlareClassification = 'X' | 'M' | 'C' | 'B' | 'A';
export type ImpactLevel = 'none' | 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe' | 'extreme';
export type GeomagneticLevel = 'quiet' | 'unsettled' | 'active' | 'storm';
export type SolarStatus = 'quiet' | 'active' | 'stormy';

export interface SolarFlare {
  id: string;
  flareId: string;
  classification: FlareClassification;
  intensity: number;
  startTime: Date;
  peakTime: Date | null;
  endTime: Date | null;
  activeRegion: string | null;
  sourceLocation: string | null;
  radioBlackout: ImpactLevel | null;
  solarRadiation: ImpactLevel | null;
  geomagneticStorm: ImpactLevel | null;
  description: string | null;
  linkedCME: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolarForecast {
  id: string;
  forecastDate: Date;
  issueDate: Date;
  probC: number;
  probM: number;
  probX: number;
  probProton: number | null;
  kpIndex: number | null;
  geomagneticLevel: GeomagneticLevel | null;
  riskLevel: RiskLevel;
  alertActive: boolean;
  activeRegions: string[] | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolarActivity {
  id: string;
  timestamp: Date;
  solarWindSpeed: number | null;
  solarWindDensity: number | null;
  bz: number | null;
  bt: number | null;
  kpIndex: number | null;
  dstIndex: number | null;
  sunspotNumber: number | null;
  f107: number | null;
  overallStatus: SolarStatus;
  createdAt: Date;
}

export const FLARE_CLASSIFICATIONS: { value: FlareClassification; label: string; color: string; description: string }[] = [
  { value: 'X', label: 'X-Class', color: 'bg-red-500', description: 'Extreme - Can cause planet-wide radio blackouts and radiation storms' },
  { value: 'M', label: 'M-Class', color: 'bg-orange-500', description: 'Major - Can cause brief radio blackouts at polar regions' },
  { value: 'C', label: 'C-Class', color: 'bg-yellow-500', description: 'Common - Minor impact on Earth' },
  { value: 'B', label: 'B-Class', color: 'bg-green-500', description: 'Background - No significant impact' },
  { value: 'A', label: 'A-Class', color: 'bg-blue-500', description: 'Smallest - Negligible impact' },
];

export const RISK_LEVEL_INFO: Record<RiskLevel, { label: string; color: string; bgColor: string; icon: string }> = {
  low: { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500', icon: '✓' },
  moderate: { label: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500', icon: '⚡' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500', icon: '⚠️' },
  severe: { label: 'Severe', color: 'text-red-400', bgColor: 'bg-red-500', icon: '🔴' },
  extreme: { label: 'Extreme', color: 'text-red-600', bgColor: 'bg-red-600', icon: '☢️' },
};

export const IMPACT_LEVEL_INFO: Record<ImpactLevel, { label: string; scale: number; color: string }> = {
  none: { label: 'None', scale: 0, color: 'text-gray-400' },
  minor: { label: 'Minor (R1/S1/G1)', scale: 1, color: 'text-green-400' },
  moderate: { label: 'Moderate (R2/S2/G2)', scale: 2, color: 'text-yellow-400' },
  strong: { label: 'Strong (R3/S3/G3)', scale: 3, color: 'text-orange-400' },
  severe: { label: 'Severe (R4/S4/G4)', scale: 4, color: 'text-red-400' },
  extreme: { label: 'Extreme (R5/S5/G5)', scale: 5, color: 'text-red-600' },
};

// Orbital Slots Module Types
export type OrbitType = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'SSO' | 'Molniya' | 'Lagrange' | 'Lunar' | 'Interplanetary';
export type CongestionLevel = 'low' | 'moderate' | 'high' | 'critical';
export type SlotAvailability = 'available' | 'limited' | 'scarce' | 'full';
export type SatellitePurpose = 'communications' | 'earth_observation' | 'navigation' | 'research' | 'military' | 'internet';
export type OrbitalEventType = 'launch' | 'reentry' | 'conjunction' | 'debris_event' | 'maneuver';

export interface OrbitalSlot {
  id: string;
  slug: string;
  orbitType: OrbitType;
  orbitName: string;
  altitudeMin: number | null;
  altitudeMax: number | null;
  inclinationMin: number | null;
  inclinationMax: number | null;
  activeSatellites: number;
  inactiveSatellites: number;
  debrisCount: number;
  projected1Year: number;
  projected5Year: number;
  description: string | null;
  congestionLevel: CongestionLevel | null;
  slotAvailability: SlotAvailability | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SatelliteOperator {
  id: string;
  slug: string;
  name: string;
  country: string;
  leoCount: number;
  meoCount: number;
  geoCount: number;
  otherCount: number;
  totalActive: number;
  primaryPurpose: SatellitePurpose | null;
  constellationName: string | null;
  planned1Year: number;
  planned5Year: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrbitalEvent {
  id: string;
  eventType: OrbitalEventType;
  orbitType: string;
  expectedDate: Date;
  dateConfidence: string | null;
  satelliteCount: number;
  operatorName: string | null;
  missionName: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ORBIT_TYPES: { value: OrbitType; label: string; icon: string; altitude: string }[] = [
  { value: 'LEO', label: 'Low Earth Orbit', icon: '🛰️', altitude: '160-2,000 km' },
  { value: 'MEO', label: 'Medium Earth Orbit', icon: '📡', altitude: '2,000-35,786 km' },
  { value: 'GEO', label: 'Geostationary Orbit', icon: '🌐', altitude: '35,786 km' },
  { value: 'HEO', label: 'Highly Elliptical Orbit', icon: '🔄', altitude: 'Variable' },
  { value: 'SSO', label: 'Sun-Synchronous Orbit', icon: '☀️', altitude: '600-800 km' },
  { value: 'Molniya', label: 'Molniya Orbit', icon: '🇷🇺', altitude: '500-40,000 km' },
  { value: 'Lagrange', label: 'Lagrange Points', icon: '⚖️', altitude: 'L1-L5' },
  { value: 'Lunar', label: 'Lunar Orbit', icon: '🌙', altitude: '~384,400 km' },
  { value: 'Interplanetary', label: 'Interplanetary', icon: '🚀', altitude: 'Beyond Moon' },
];

export const CONGESTION_LEVEL_INFO: Record<CongestionLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500' },
  moderate: { label: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500' },
};

export const SATELLITE_PURPOSE_INFO: Record<SatellitePurpose, { label: string; icon: string }> = {
  communications: { label: 'Communications', icon: '📡' },
  earth_observation: { label: 'Earth Observation', icon: '🌍' },
  navigation: { label: 'Navigation', icon: '🧭' },
  research: { label: 'Research', icon: '🔬' },
  military: { label: 'Military', icon: '🛡️' },
  internet: { label: 'Internet', icon: '🌐' },
};

// ============================================================
// Space Insurance & Risk Calculator Types
// ============================================================
export type InsuranceMissionType = 'launch' | 'in_orbit' | 'liability' | 'third_party' | 'ground';
export type InsuranceCoverageType = 'full' | 'partial' | 'excess' | 'reinsurance';
export type InsuranceStatus = 'active' | 'expired' | 'claimed' | 'settled';

export interface InsurancePolicy {
  id: string;
  slug: string;
  missionType: InsuranceMissionType;
  coverageType: InsuranceCoverageType;
  insurer: string;
  country: string;
  premiumRate: number;
  insuredValue: number;
  premiumAmount: number;
  deductible: number | null;
  maxPayout: number | null;
  missionName: string | null;
  launchVehicle: string | null;
  operator: string | null;
  yearWritten: number;
  claimFiled: boolean;
  claimAmount: number | null;
  claimPaid: number | null;
  claimReason: string | null;
  status: InsuranceStatus;
}

export interface InsuranceMarketData {
  id: string;
  year: number;
  totalPremiums: number;
  totalClaims: number;
  lossRatio: number;
  marketCapacity: number;
  launchPremiums: number | null;
  inOrbitPremiums: number | null;
  liabilityPremiums: number | null;
  avgPremiumRate: number;
  largestClaim: number | null;
  numberOfPolicies: number;
}

export const INSURANCE_MISSION_TYPES: { value: InsuranceMissionType; label: string; icon: string }[] = [
  { value: 'launch', label: 'Launch', icon: '🚀' },
  { value: 'in_orbit', label: 'In-Orbit', icon: '🛰️' },
  { value: 'liability', label: 'Liability', icon: '⚖️' },
  { value: 'third_party', label: 'Third Party', icon: '👥' },
  { value: 'ground', label: 'Ground', icon: '🏗️' },
];

// ============================================================
// Spectrum & Frequency Allocation Types
// ============================================================
export type SpectrumService = 'fixed_satellite' | 'mobile_satellite' | 'earth_exploration' | 'radio_astronomy' | 'inter_satellite';
export type SpectrumFilingStatus = 'available' | 'filed' | 'coordinating' | 'assigned' | 'congested';

export interface SpectrumAllocation {
  id: string;
  slug: string;
  bandName: string;
  frequencyMin: number;
  frequencyMax: number;
  bandwidth: number;
  service: SpectrumService;
  region: string;
  allocationType: string;
  assignedTo: string | null;
  filingStatus: SpectrumFilingStatus;
  numberOfFilings: number;
  ituReference: string | null;
  fccReference: string | null;
  coordinationRequired: boolean;
  description: string | null;
}

export interface SpectrumFiling {
  id: string;
  filingId: string;
  operator: string;
  system: string;
  agency: string;
  bandName: string;
  frequencyMin: number;
  frequencyMax: number;
  orbitType: string;
  numberOfSatellites: number | null;
  status: string;
  filingDate: Date;
  grantDate: Date | null;
  expiryDate: Date | null;
  description: string | null;
  country: string;
}

export const SPECTRUM_BANDS: { value: string; label: string; range: string }[] = [
  { value: 'L-band', label: 'L-Band', range: '1-2 GHz' },
  { value: 'S-band', label: 'S-Band', range: '2-4 GHz' },
  { value: 'C-band', label: 'C-Band', range: '4-8 GHz' },
  { value: 'X-band', label: 'X-Band', range: '8-12 GHz' },
  { value: 'Ku-band', label: 'Ku-Band', range: '12-18 GHz' },
  { value: 'Ka-band', label: 'Ka-Band', range: '26-40 GHz' },
  { value: 'V-band', label: 'V-Band', range: '40-75 GHz' },
  { value: 'Q-band', label: 'Q-Band', range: '33-50 GHz' },
];

// ============================================================
// Space Workforce & Talent Analytics Types
// ============================================================
export type JobCategory = 'engineering' | 'operations' | 'business' | 'research' | 'legal' | 'manufacturing';
export type SeniorityLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'director' | 'vp' | 'c_suite';

export interface SpaceJobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  remoteOk: boolean;
  category: JobCategory;
  specialization: string | null;
  seniorityLevel: SeniorityLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryMedian: number | null;
  yearsExperience: number | null;
  clearanceRequired: boolean;
  degreeRequired: string | null;
  isActive: boolean;
  postedDate: Date;
  sourceUrl: string | null;
}

export interface WorkforceTrend {
  id: string;
  period: string;
  year: number;
  quarter: number;
  totalOpenings: number;
  totalHires: number | null;
  avgSalary: number | null;
  medianSalary: number | null;
  engineeringOpenings: number;
  operationsOpenings: number;
  businessOpenings: number;
  researchOpenings: number;
  topSkills: string[] | null;
  topCompanies: string[] | null;
  yoyGrowth: number | null;
}

export const JOB_CATEGORIES: { value: JobCategory; label: string; icon: string }[] = [
  { value: 'engineering', label: 'Engineering', icon: '⚙️' },
  { value: 'operations', label: 'Operations', icon: '🎯' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'research', label: 'Research', icon: '🔬' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
];

export const SENIORITY_LEVELS: { value: SeniorityLevel; label: string }[] = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
  { value: 'c_suite', label: 'C-Suite' },
];

// ============================================================
// Launch Windows & Mission Planner Types
// ============================================================
export type TransferType = 'hohmann' | 'low_energy' | 'gravity_assist' | 'direct';

export interface LaunchWindow {
  id: string;
  slug: string;
  destination: string;
  missionType: string;
  windowOpen: Date;
  windowClose: Date;
  optimalDate: Date | null;
  deltaV: number;
  travelTime: number;
  transferType: TransferType;
  c3Energy: number | null;
  arrivalVelocity: number | null;
  frequency: string;
  nextAfter: Date | null;
  description: string | null;
}

export interface CelestialDestination {
  id: string;
  slug: string;
  name: string;
  type: string;
  distanceFromSun: number | null;
  distanceFromEarth: number | null;
  orbitalPeriod: number | null;
  synodicPeriod: number | null;
  deltaVToOrbit: number | null;
  deltaVToLand: number | null;
  totalMissions: number;
  successfulMissions: number;
  description: string | null;
}

export const TRANSFER_TYPES: { value: TransferType; label: string; description: string }[] = [
  { value: 'hohmann', label: 'Hohmann Transfer', description: 'Minimum energy elliptical transfer' },
  { value: 'low_energy', label: 'Low-Energy', description: 'Uses gravitational assists for lower delta-V' },
  { value: 'gravity_assist', label: 'Gravity Assist', description: 'Planetary flyby to gain velocity' },
  { value: 'direct', label: 'Direct', description: 'Shortest time, highest energy' },
];

// ============================================================
// Space Debris & Collision Risk Monitor Types
// ============================================================
export type DebrisObjectType = 'payload' | 'rocket_body' | 'debris' | 'unknown';
export type DebrisSize = 'small' | 'medium' | 'large';
export type ConjunctionRisk = 'low' | 'moderate' | 'high' | 'critical';

export interface DebrisObject {
  id: string;
  noradId: string | null;
  name: string;
  objectType: DebrisObjectType;
  orbitType: string;
  altitude: number;
  inclination: number | null;
  eccentricity: number | null;
  size: DebrisSize | null;
  mass: number | null;
  originMission: string | null;
  originCountry: string | null;
  originYear: number | null;
  isActive: boolean;
  trackable: boolean;
  deorbitDate: Date | null;
}

export interface ConjunctionEvent {
  id: string;
  eventTime: Date;
  probability: number;
  missDistance: number;
  primaryObject: string;
  secondaryObject: string;
  primaryType: string;
  secondaryType: string;
  altitude: number;
  orbitType: string;
  riskLevel: ConjunctionRisk;
  maneuverRequired: boolean;
  maneuverExecuted: boolean;
  description: string | null;
}

export interface DebrisStats {
  id: string;
  snapshotDate: Date;
  totalTracked: number;
  totalPayloads: number;
  totalRocketBodies: number;
  totalDebris: number;
  totalUnknown: number;
  leoCount: number;
  meoCount: number;
  geoCount: number;
  kesslerRiskIndex: number | null;
  conjunctionsPerDay: number | null;
  avgCollisionProb: number | null;
  compliant25Year: number | null;
  nonCompliant: number | null;
}

export const DEBRIS_OBJECT_TYPES: { value: DebrisObjectType; label: string; icon: string }[] = [
  { value: 'payload', label: 'Payload', icon: '🛰️' },
  { value: 'rocket_body', label: 'Rocket Body', icon: '🚀' },
  { value: 'debris', label: 'Debris', icon: '💥' },
  { value: 'unknown', label: 'Unknown', icon: '❓' },
];

export const CONJUNCTION_RISK_INFO: Record<ConjunctionRisk, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500' },
  moderate: { label: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500' },
};

// ============================================================
// Feature Request & Help Request Types
// ============================================================
export type FeatureRequestType = 'existing_module' | 'new_module';
export type FeatureRequestStatus = 'new' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';
export type HelpRequestStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export interface FeatureRequest {
  id: string;
  userId: string | null;
  email: string;
  type: FeatureRequestType;
  module: string | null;
  title: string;
  details: string;
  status: FeatureRequestStatus;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HelpRequest {
  id: string;
  userId: string | null;
  email: string;
  subject: string;
  details: string;
  status: HelpRequestStatus;
  adminResponse: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const FEATURE_REQUEST_STATUSES: { value: FeatureRequestStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-500' },
  { value: 'planned', label: 'Planned', color: 'bg-purple-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-orange-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'declined', label: 'Declined', color: 'bg-red-500' },
];

export const HELP_REQUEST_STATUSES: { value: HelpRequestStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-500' },
];
