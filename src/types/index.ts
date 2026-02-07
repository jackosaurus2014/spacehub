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
  { name: 'Satellites', slug: 'satellites', description: 'Satellite constellations and telecom' },
  { name: 'Defense', slug: 'defense', description: 'National security and military space' },
  { name: 'Earnings', slug: 'earnings', description: 'Financial news and earnings reports' },
  { name: 'M&A', slug: 'mergers', description: 'Mergers, acquisitions, and partnerships' },
  { name: 'Development', slug: 'development', description: 'Technology and R&D updates' },
  { name: 'Policy', slug: 'policy', description: 'Space policy and regulations' },
  { name: 'Debris', slug: 'debris', description: 'Space debris and collision risk' },
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

export type MissionPhase =
  | 'pre_launch'
  | 'countdown'
  | 'liftoff'
  | 'max_q'
  | 'stage_separation'
  | 'ascent'
  | 'orbit_insertion'
  | 'nominal_orbit'
  | 'payload_deployment'
  | 'landing_attempt'
  | 'mission_complete';

export const MISSION_PHASE_INFO: Record<MissionPhase, { label: string; color: string; icon: string }> = {
  pre_launch: { label: 'Pre-Launch', color: 'text-blue-400', icon: '⏳' },
  countdown: { label: 'Countdown', color: 'text-yellow-400', icon: '⏱️' },
  liftoff: { label: 'Liftoff', color: 'text-orange-400', icon: '🚀' },
  max_q: { label: 'Max-Q', color: 'text-red-400', icon: '⚡' },
  stage_separation: { label: 'Stage Separation', color: 'text-purple-400', icon: '🔀' },
  ascent: { label: 'Ascent', color: 'text-cyan-400', icon: '📈' },
  orbit_insertion: { label: 'Orbit Insertion', color: 'text-green-400', icon: '🎯' },
  nominal_orbit: { label: 'Nominal Orbit', color: 'text-green-400', icon: '✓' },
  payload_deployment: { label: 'Payload Deployment', color: 'text-blue-400', icon: '📦' },
  landing_attempt: { label: 'Landing Attempt', color: 'text-orange-400', icon: '🎯' },
  mission_complete: { label: 'Mission Complete', color: 'text-green-400', icon: '🎉' },
};

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
  // Live stream fields
  isLive?: boolean;
  streamUrl?: string | null;
  missionPhase?: MissionPhase | null;
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

export type ModuleSection = 'explore' | 'intelligence' | 'business' | 'tools' | 'data';

export const MODULE_SECTIONS: { value: ModuleSection; label: string }[] = [
  { value: 'explore', label: 'Explore' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'business', label: 'Business' },
  { value: 'tools', label: 'Tools' },
  { value: 'data', label: 'Data' },
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
  parentModuleId?: string;    // If this is a sub-module, which parent it belongs to
  isParent?: boolean;         // If this is a parent module container
  subModuleIds?: string[];    // For parent modules, list of child module IDs
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
  trialDays?: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Enthusiast',
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
    trialDays: 3,
    features: [
      'Everything in Enthusiast',
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
    price: 29.99,
    priceYearly: 250,
    trialDays: 3,
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
  // ═══════════════════════════════════════════════════════════════════
  // 10 MAIN MODULES (v0.7.0 consolidated hierarchy)
  // ═══════════════════════════════════════════════════════════════════

  // 1. Mission Control (standalone)
  {
    moduleId: 'mission-control',
    name: 'Mission Control',
    description: 'Countdown to upcoming space missions and events',
    icon: '🎯',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 0,
  },

  // 2. News & Media (parent)
  {
    moduleId: 'news-media',
    name: 'News & Media',
    description: 'Space news, blogs, and defense intelligence',
    icon: '📰',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 1,
    isParent: true,
    subModuleIds: ['news-feed', 'blogs-articles', 'space-defense'],
  },

  // 3. Space Market Intelligence (parent, NEW)
  {
    moduleId: 'space-market-intelligence',
    name: 'Space Market Intelligence',
    description: 'Market data, space economy trends, and startup ecosystem',
    icon: '📊',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 2,
    isParent: true,
    subModuleIds: ['market-intel', 'space-economy', 'startup-tracker'],
  },

  // 4. Business Opportunities (parent)
  {
    moduleId: 'business-opportunities-group',
    name: 'Business Opportunities',
    description: 'AI opportunities, supply chain, mining, patents, and manufacturing',
    icon: '💼',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 3,
    isParent: true,
    subModuleIds: ['business-opportunities', 'supply-chain', 'space-mining', 'patent-tracker', 'manufacturing-imagery'],
  },

  // 5. Mission Planning (parent, absorbs Blueprints)
  {
    moduleId: 'mission-planning',
    name: 'Mission Planning',
    description: 'Cost simulation, insurance, resources, launch timing, and technical blueprints',
    icon: '🗺️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 4,
    isParent: true,
    subModuleIds: ['mission-cost', 'space-insurance', 'resource-exchange', 'launch-windows', 'launch-vehicles', 'blueprints'],
  },

  // 6. Space Operations (parent)
  {
    moduleId: 'space-operations',
    name: 'Space Operations',
    description: 'Satellite tracking, orbital management, and ground infrastructure',
    icon: '🛰️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 5,
    isParent: true,
    subModuleIds: ['satellite-tracker', 'orbital-management', 'constellation-tracker', 'ground-station-map', 'space-stations', 'infrastructure-network'],
  },

  // 7. Space Talent Hub (standalone with tabs - merged jobs + workforce)
  {
    moduleId: 'talent-workforce',
    name: 'Space Talent Hub',
    description: 'Expert consultants, job listings, salary benchmarks, and hiring trends',
    icon: '👩‍🚀',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 6,
  },

  // 8. Regulatory & Compliance (parent)
  {
    moduleId: 'regulatory-compliance',
    name: 'Regulatory & Compliance',
    description: 'Export controls, space law, regulatory filings, and spectrum management',
    icon: '⚖️',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 7,
    isParent: true,
    subModuleIds: ['regulatory-hub', 'spectrum-management'],
  },

  // 9. Solar System Expansion (parent)
  {
    moduleId: 'solar-system-expansion',
    name: 'Solar System Expansion',
    description: 'Planetary exploration and future expansion planning',
    icon: '🌍',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 8,
    isParent: true,
    subModuleIds: ['solar-exploration', 'mars-planner', 'cislunar-ecosystem', 'asteroid-watch'],
  },

  // 10. Space Environment (standalone with tabs - merged weather + debris + ops)
  {
    moduleId: 'space-environment',
    name: 'Space Environment',
    description: 'Solar activity, debris tracking, conjunction monitoring, and operational awareness',
    icon: '☀️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 9,
  },

  // ═══════════════════════════════════════════════════════════════════
  // CHILD MODULES (sub-modules under parents)
  // ═══════════════════════════════════════════════════════════════════

  // --- News & Media children ---
  {
    moduleId: 'news-feed',
    name: 'News & Categories',
    description: 'Browse by category and read the latest space industry news',
    icon: '📰',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 10,
    parentModuleId: 'news-media',
  },
  {
    moduleId: 'blogs-articles',
    name: 'Blogs & Articles',
    description: 'Expert insights from space industry professionals',
    icon: '✍️',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 11,
    parentModuleId: 'news-media',
  },
  {
    moduleId: 'space-defense',
    name: 'Space Defense & National Security',
    description: 'OSINT military space programs, defense procurement, and counterspace threat assessment',
    icon: '🛡️',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 12,
    isPremium: true,
    parentModuleId: 'news-media',
  },

  // --- Space Market Intelligence children ---
  {
    moduleId: 'market-intel',
    name: 'Market Intel',
    description: 'Space industry companies, stocks, and funding data',
    icon: '📊',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 13,
    parentModuleId: 'space-market-intelligence',
  },
  {
    moduleId: 'space-economy',
    name: 'Space Economy Dashboard',
    description: 'Macro-level space economy data, market size, investment trends, and government budgets',
    icon: '📈',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 14,
    isPremium: true,
    parentModuleId: 'space-market-intelligence',
  },
  {
    moduleId: 'startup-tracker',
    name: 'Space Startup Tracker',
    description: 'Track space startups, funding rounds, investors, and the startup ecosystem',
    icon: '🚀',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 15,
    isPremium: true,
    parentModuleId: 'space-market-intelligence',
  },

  // --- Business Opportunities children ---
  {
    moduleId: 'business-opportunities',
    name: 'Business Opportunities',
    description: 'AI-powered space business opportunities and government contracts',
    icon: '💼',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 16,
    isPremium: true,
    parentModuleId: 'business-opportunities-group',
  },
  {
    moduleId: 'supply-chain',
    name: 'Global Supply Chain',
    description: 'Aerospace supply chain tracking with geopolitical risk analysis and shortage alerts',
    icon: '🗺️',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 17,
    isPremium: true,
    parentModuleId: 'business-opportunities-group',
  },
  {
    moduleId: 'space-mining',
    name: 'Space Mining',
    description: 'Asteroid and planetary body mining intelligence with resource valuations and accessibility data',
    icon: '⛏️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 18,
    isPremium: true,
    parentModuleId: 'business-opportunities-group',
  },
  {
    moduleId: 'patent-tracker',
    name: 'Patent & IP Tracker',
    description: 'Space technology patents, filing trends, company portfolios, and NASA technology transfer',
    icon: '📜',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 19,
    isPremium: true,
    parentModuleId: 'business-opportunities-group',
  },
  {
    moduleId: 'manufacturing-imagery',
    name: 'Manufacturing & Imagery',
    description: 'In-space manufacturing, commercial stations, and satellite imagery marketplace',
    icon: '🏭',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 20,
    isPremium: true,
    parentModuleId: 'business-opportunities-group',
  },

  // --- Mission Planning children ---
  {
    moduleId: 'mission-cost',
    name: 'Mission Cost Simulator',
    description: 'Estimate launch costs, insurance premiums, and regulatory fees across all major providers',
    icon: '💰',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 21,
    isPremium: true,
    parentModuleId: 'mission-planning',
  },
  {
    moduleId: 'space-insurance',
    name: 'Space Insurance',
    description: 'Insurance market data, premium calculator, and risk assessment',
    icon: '🛡️',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 22,
    isPremium: true,
    parentModuleId: 'mission-planning',
  },
  {
    moduleId: 'resource-exchange',
    name: 'Resource Exchange',
    description: 'Space commodities pricing - Earth vs orbit costs',
    icon: '💰',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 23,
    isPremium: true,
    parentModuleId: 'mission-planning',
  },
  {
    moduleId: 'launch-windows',
    name: 'Launch Windows',
    description: 'Optimal launch windows and mission planning for planetary destinations',
    icon: '🪟',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 24,
    isPremium: true,
    parentModuleId: 'mission-planning',
  },
  {
    moduleId: 'launch-vehicles',
    name: 'Launch Vehicle Comparison',
    description: 'Interactive comparison of launch vehicles: specs, costs, reliability, and availability',
    icon: '🚀',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 25,
    isPremium: true,
    parentModuleId: 'mission-planning',
  },
  {
    moduleId: 'blueprints',
    name: 'Blueprint Series',
    description: 'Technical breakdowns of space hardware - rocket engines, satellite buses, and lunar landers',
    icon: '📐',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 26,
    isPremium: true,
    parentModuleId: 'mission-planning',
  },

  // --- Space Operations children ---
  {
    moduleId: 'satellite-tracker',
    name: 'Satellite Tracker',
    description: 'Track active satellites including ISS, Starlink, GPS, and weather satellites',
    icon: '🛰️',
    section: 'data',
    defaultEnabled: true,
    defaultPosition: 27,
    parentModuleId: 'space-operations',
  },
  {
    moduleId: 'orbital-management',
    name: 'Orbital Management',
    description: 'Orbital slots, population projections, and satellite-based services marketplace',
    icon: '🛰️',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 28,
    isPremium: true,
    parentModuleId: 'space-operations',
  },
  {
    moduleId: 'constellation-tracker',
    name: 'Constellation Tracker',
    description: 'Track major satellite constellations - deployments, coverage, and regulatory compliance',
    icon: '🛸',
    section: 'data',
    defaultEnabled: true,
    defaultPosition: 29,
    isPremium: true,
    parentModuleId: 'space-operations',
  },
  {
    moduleId: 'ground-station-map',
    name: 'Ground Station Map',
    description: 'Global ground station networks - locations, capabilities, and service comparison',
    icon: '📡',
    section: 'data',
    defaultEnabled: true,
    defaultPosition: 30,
    isPremium: true,
    parentModuleId: 'space-operations',
  },
  {
    moduleId: 'space-stations',
    name: 'Space Station Tracker',
    description: 'ISS, Tiangong, and commercial space stations: crew, modules, visiting vehicles',
    icon: '🏠',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 31,
    isPremium: true,
    parentModuleId: 'space-operations',
  },
  {
    moduleId: 'infrastructure-network',
    name: 'Infrastructure Network',
    description: 'Spaceport directory, communications networks, DSN status, and relay systems',
    icon: '🏗️',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 32,
    isPremium: true,
    parentModuleId: 'space-operations',
  },

  // --- Regulatory & Compliance children ---
  {
    moduleId: 'regulatory-hub',
    name: 'Regulatory Hub',
    description: 'Export controls, space law, treaties, and regulatory filings across FCC, FAA, ITU, and SEC',
    icon: '⚖️',
    section: 'intelligence',
    defaultEnabled: true,
    defaultPosition: 33,
    isPremium: true,
    parentModuleId: 'regulatory-compliance',
  },
  {
    moduleId: 'spectrum-management',
    name: 'Spectrum Management',
    description: 'Frequency allocations, spectrum auctions, and regulatory proceedings',
    icon: '📡',
    section: 'business',
    defaultEnabled: true,
    defaultPosition: 34,
    isPremium: true,
    parentModuleId: 'regulatory-compliance',
  },

  // --- Solar System Expansion children ---
  {
    moduleId: 'solar-exploration',
    name: 'Solar Exploration',
    description: 'Interactive 3D visualization of planetary bodies with rover and lander locations',
    icon: '🌍',
    section: 'tools',
    defaultEnabled: true,
    defaultPosition: 35,
    parentModuleId: 'solar-system-expansion',
  },
  {
    moduleId: 'mars-planner',
    name: 'Mars Mission Planner',
    description: 'Mars missions, launch windows, costs, and mission planning intelligence',
    icon: '🔴',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 36,
    isPremium: true,
    parentModuleId: 'solar-system-expansion',
  },
  {
    moduleId: 'cislunar-ecosystem',
    name: 'Cislunar Ecosystem',
    description: 'Lunar Gateway, Artemis program, CLPS missions, ISRU development, and cislunar economy',
    icon: '🌙',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 37,
    isPremium: true,
    parentModuleId: 'solar-system-expansion',
  },
  {
    moduleId: 'asteroid-watch',
    name: 'Asteroid Watch',
    description: 'Near-Earth objects, planetary defense, mining targets, and discovery statistics',
    icon: '☄️',
    section: 'explore',
    defaultEnabled: true,
    defaultPosition: 38,
    isPremium: true,
    parentModuleId: 'solar-system-expansion',
  },
];

// Helper: Get only parent modules + standalone modules (for sidebar top-level)
export const PARENT_MODULES: ModuleConfig[] = AVAILABLE_MODULES.filter(
  m => !m.parentModuleId
);

// Helper: Get child modules for a given parent
export function getChildModules(parentModuleId: string): ModuleConfig[] {
  const parent = AVAILABLE_MODULES.find(m => m.moduleId === parentModuleId);
  if (!parent?.subModuleIds) return [];
  return parent.subModuleIds
    .map(id => AVAILABLE_MODULES.find(m => m.moduleId === id))
    .filter((m): m is ModuleConfig => m !== undefined);
}

// Re-export centralized module routes for backward compatibility
export { MODULE_ROUTES, getModuleRoute } from '@/lib/module-routes';

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
  | 'AUS'
  | 'GBR'
  | 'DEU'
  | 'LUX'
  | 'CAN'
  | 'ARE';

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
  GBR: { name: 'United Kingdom', flag: '🇬🇧' },
  DEU: { name: 'Germany', flag: '🇩🇪' },
  LUX: { name: 'Luxembourg', flag: '🇱🇺' },
  CAN: { name: 'Canada', flag: '🇨🇦' },
  ARE: { name: 'UAE', flag: '🇦🇪' },
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

// ============================================================
// Space Jobs - Talent Board & Webinars Types
// ============================================================
export type TalentExpertiseArea = 'space_law' | 'export_controls' | 'regulatory' | 'propulsion' | 'avionics' | 'systems_engineering' | 'government_relations' | 'international_policy';
export type TalentAvailability = 'available' | 'limited' | 'booked' | 'unavailable';

export interface SpaceTalent {
  id: string;
  slug: string;
  name: string;
  title: string;
  organization: string;
  expertise: TalentExpertiseArea[];
  bio: string;
  contactEmail: string;
  linkedIn: string | null;
  consultingRate: number | null;
  availability: TalentAvailability;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Webinar {
  id: string;
  slug: string;
  title: string;
  description: string;
  speaker: string;
  speakerBio: string;
  topic: string;
  date: Date;
  duration: number; // in minutes
  registrationUrl: string | null;
  recordingUrl: string | null;
  isLive: boolean;
  isPast: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const TALENT_EXPERTISE_AREAS: { value: TalentExpertiseArea; label: string; icon: string; category: string }[] = [
  { value: 'space_law', label: 'Space Law', icon: '⚖️', category: 'Legal' },
  { value: 'export_controls', label: 'Export Controls', icon: '📋', category: 'Legal' },
  { value: 'regulatory', label: 'Regulatory', icon: '📜', category: 'Legal' },
  { value: 'propulsion', label: 'Propulsion', icon: '🚀', category: 'Engineering' },
  { value: 'avionics', label: 'Avionics', icon: '📡', category: 'Engineering' },
  { value: 'systems_engineering', label: 'Systems Engineering', icon: '⚙️', category: 'Engineering' },
  { value: 'government_relations', label: 'Government Relations', icon: '🏛️', category: 'Policy' },
  { value: 'international_policy', label: 'International Space Policy', icon: '🌍', category: 'Policy' },
];

export const TALENT_AVAILABILITY_INFO: Record<TalentAvailability, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500' },
  limited: { label: 'Limited Availability', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  booked: { label: 'Booked', color: 'text-orange-400', bgColor: 'bg-orange-500' },
  unavailable: { label: 'Unavailable', color: 'text-red-400', bgColor: 'bg-red-500' },
};

export const WEBINAR_TOPICS: { value: string; label: string; icon: string }[] = [
  { value: 'space_nuclear', label: 'Space Nuclear Payloads', icon: '☢️' },
  { value: 'in_orbit_manufacturing', label: 'In-Orbit Manufacturing', icon: '🏭' },
  { value: 'satellite_servicing', label: 'Satellite Servicing', icon: '🔧' },
  { value: 'debris_mitigation', label: 'Space Debris Mitigation', icon: '🛡️' },
  { value: 'lunar_isru', label: 'Lunar ISRU', icon: '🌙' },
  { value: 'commercial_stations', label: 'Commercial Space Stations', icon: '🛰️' },
  { value: 'propulsion_tech', label: 'Advanced Propulsion', icon: '⚡' },
  { value: 'space_policy', label: 'Space Policy & Regulation', icon: '📜' },
];

// ============================================================
// Orbital Services Marketplace Types
// ============================================================
export type OrbitalServiceCategory =
  | 'earth_observation'
  | 'in_orbit_computing'
  | 'hosted_payload'
  | 'space_solar'
  | 'communications'
  | 'sensor_service';

export type OrbitalServiceStatus = 'active' | 'beta' | 'planned' | 'retired';
export type OrbitalServiceAvailability = 'available' | 'limited' | 'waitlist' | 'coming_soon';
export type OrbitalPricingModel = 'per_km2' | 'per_hour' | 'per_kg_year' | 'subscription' | 'per_gb' | 'custom';
export type OrbitalContractType = 'idiq' | 'firm_fixed' | 'cost_plus' | 'subscription';
export type OrbitalCustomerType = 'government' | 'commercial' | 'academic';

export interface OrbitalService {
  id: string;
  slug: string;
  providerName: string;
  providerSlug: string | null;
  providerCountry: string;
  providerWebsite: string | null;
  category: OrbitalServiceCategory;
  serviceType: string;
  serviceName: string;
  description: string;
  specifications: Record<string, unknown> | null;
  orbitType: string | null;
  coverage: string | null;
  availability: OrbitalServiceAvailability;
  pricingModel: OrbitalPricingModel;
  priceMin: number | null;
  priceMax: number | null;
  priceUnit: string | null;
  pricingNotes: string | null;
  launchCostBasis: number | null;
  operationalCost: number | null;
  marketRate: number | null;
  marginEstimate: number | null;
  status: OrbitalServiceStatus;
  launchDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrbitalServiceContract {
  id: string;
  slug: string;
  title: string;
  description: string;
  customerName: string;
  customerType: OrbitalCustomerType;
  providerName: string;
  contractValue: number | null;
  contractType: OrbitalContractType;
  duration: string | null;
  serviceCategory: string;
  scope: string | null;
  awardDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  sourceUrl: string | null;
  announcementDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrbitalServiceRequest {
  id: string;
  email: string | null;
  companyName: string | null;
  category: string;
  serviceType: string | null;
  description: string;
  requirements: Record<string, unknown> | null;
  budget: string | null;
  timeline: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ORBITAL_SERVICE_CATEGORIES: { value: OrbitalServiceCategory; label: string; icon: string; description: string }[] = [
  { value: 'earth_observation', label: 'Earth Observation', icon: '🛰️', description: 'Satellite imagery, SAR, hyperspectral' },
  { value: 'in_orbit_computing', label: 'In-Orbit Computing', icon: '🖥️', description: 'GPU clusters, edge compute, AI inference' },
  { value: 'hosted_payload', label: 'Hosted Payloads', icon: '📦', description: 'Payload hosting on shared satellites' },
  { value: 'space_solar', label: 'Space Solar Power', icon: '☀️', description: 'Power beaming and orbital energy' },
  { value: 'communications', label: 'Communications', icon: '📡', description: 'Data relay, ground stations, bandwidth' },
  { value: 'sensor_service', label: 'Sensor-as-a-Service', icon: '📊', description: 'Weather, AIS, RF monitoring' },
];

export const ORBITAL_PRICING_MODELS: { value: OrbitalPricingModel; label: string; unit: string }[] = [
  { value: 'per_km2', label: 'Per Square Kilometer', unit: '$/km²' },
  { value: 'per_hour', label: 'Per Hour', unit: '$/hour' },
  { value: 'per_kg_year', label: 'Per kg/Year', unit: '$/kg/year' },
  { value: 'subscription', label: 'Subscription', unit: '$/month' },
  { value: 'per_gb', label: 'Per Gigabyte', unit: '$/GB' },
  { value: 'custom', label: 'Custom Quote', unit: 'Contact' },
];

export const ORBITAL_SERVICE_AVAILABILITY: { value: OrbitalServiceAvailability; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: 'bg-green-500' },
  { value: 'limited', label: 'Limited', color: 'bg-yellow-500' },
  { value: 'waitlist', label: 'Waitlist', color: 'bg-orange-500' },
  { value: 'coming_soon', label: 'Coming Soon', color: 'bg-blue-500' },
];

// Service Type Labels - human-readable labels for each service type
export const ORBITAL_SERVICE_TYPES: { value: string; label: string; icon: string; category: OrbitalServiceCategory }[] = [
  // Earth Observation
  { value: 'optical_imagery', label: 'Optical Imagery', icon: '📸', category: 'earth_observation' },
  { value: 'sar_imagery', label: 'SAR Imagery', icon: '📡', category: 'earth_observation' },
  { value: 'hyperspectral', label: 'Hyperspectral', icon: '🌈', category: 'earth_observation' },
  { value: 'video_imaging', label: 'Video Imaging', icon: '🎥', category: 'earth_observation' },
  // In-Orbit Computing
  { value: 'gpu_compute', label: 'GPU Compute', icon: '🎮', category: 'in_orbit_computing' },
  { value: 'edge_compute', label: 'Edge Computing', icon: '⚡', category: 'in_orbit_computing' },
  { value: 'ai_inference', label: 'AI Inference', icon: '🤖', category: 'in_orbit_computing' },
  { value: 'datacenter', label: 'Orbital Datacenter', icon: '🏢', category: 'in_orbit_computing' },
  // Hosted Payloads
  { value: 'satellite_hosting', label: 'Satellite Hosting', icon: '🛰️', category: 'hosted_payload' },
  { value: 'rideshare_hosting', label: 'Rideshare Hosting', icon: '🚀', category: 'hosted_payload' },
  { value: 'last_mile_delivery', label: 'Last Mile Delivery', icon: '📦', category: 'hosted_payload' },
  { value: 'payload_integration', label: 'Payload Integration', icon: '🔧', category: 'hosted_payload' },
  // Space Solar
  { value: 'power_beaming', label: 'Power Beaming', icon: '⚡', category: 'space_solar' },
  { value: 'solar_power', label: 'Solar Power Generation', icon: '☀️', category: 'space_solar' },
  // Communications
  { value: 'ground_station', label: 'Ground Station', icon: '📡', category: 'communications' },
  { value: 'data_relay', label: 'Data Relay', icon: '🔄', category: 'communications' },
  { value: 'satellite_comms', label: 'Satellite Communications', icon: '📶', category: 'communications' },
  { value: 'iot_connectivity', label: 'IoT Connectivity', icon: '🌐', category: 'communications' },
  // Sensor Services
  { value: 'weather_data', label: 'Weather Data', icon: '🌤️', category: 'sensor_service' },
  { value: 'rf_monitoring', label: 'RF Monitoring', icon: '📻', category: 'sensor_service' },
  { value: 'ais_tracking', label: 'AIS Tracking', icon: '🚢', category: 'sensor_service' },
  { value: 'emissions_monitoring', label: 'Emissions Monitoring', icon: '🏭', category: 'sensor_service' },
];

export const ORBITAL_CONTRACT_TYPES: { value: OrbitalContractType; label: string }[] = [
  { value: 'idiq', label: 'IDIQ (Indefinite Delivery)' },
  { value: 'firm_fixed', label: 'Firm Fixed Price' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'subscription', label: 'Subscription' },
];

export const ORBITAL_CUSTOMER_TYPES: { value: OrbitalCustomerType; label: string; icon: string }[] = [
  { value: 'government', label: 'Government', icon: '🏛️' },
  { value: 'commercial', label: 'Commercial', icon: '🏢' },
  { value: 'academic', label: 'Academic', icon: '🎓' },
];

// ============================================================
// Supply Chain & Global Value Chain Types
// ============================================================
export type SupplyChainTier = 'prime' | 'tier1' | 'tier2' | 'tier3';
export type SupplyCriticality = 'high' | 'medium' | 'low';
export type GeopoliticalRisk = 'high' | 'medium' | 'low' | 'none';
export type ShortageSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SupplyChainCompany {
  id: string;
  slug: string;
  name: string;
  tier: SupplyChainTier;
  country: string;
  countryCode: string;
  products: string[];
  customers: string[];
  suppliers: string[];
  criticality: SupplyCriticality;
  description?: string;
  headquarters?: string;
  employeeCount?: number;
  annualRevenue?: number;
  website?: string;
}

export interface SupplyRelationship {
  id: string;
  supplierId: string;
  supplierName: string;
  customerId: string;
  customerName: string;
  products: string[];
  annualValue?: number;
  geopoliticalRisk: GeopoliticalRisk;
  isCritical: boolean;
  notes?: string;
}

export interface SupplyShortage {
  id: string;
  material: string;
  category: string;
  affectedProducts: string[];
  severity: ShortageSeverity;
  alternativeSuppliers: string[];
  notes: string;
  startDate?: Date;
  estimatedResolution?: string;
  impactedCompanies: string[];
  geopoliticalFactors?: string[];
}

export const SUPPLY_CHAIN_TIERS: { value: SupplyChainTier; label: string; color: string; bgColor: string }[] = [
  { value: 'prime', label: 'Prime Contractor', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  { value: 'tier1', label: 'Tier 1 Supplier', color: 'text-cyan-400', bgColor: 'bg-cyan-500' },
  { value: 'tier2', label: 'Tier 2 Supplier', color: 'text-green-400', bgColor: 'bg-green-500' },
  { value: 'tier3', label: 'Tier 3 Supplier', color: 'text-gray-400', bgColor: 'bg-gray-500' },
];

export const SUPPLY_CRITICALITY_INFO: Record<SupplyCriticality, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High', color: 'text-red-400', bgColor: 'bg-red-500' },
  medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  low: { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500' },
};

export const GEOPOLITICAL_RISK_INFO: Record<GeopoliticalRisk, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High Risk', color: 'text-red-400', bgColor: 'bg-red-500' },
  medium: { label: 'Medium Risk', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  low: { label: 'Low Risk', color: 'text-green-400', bgColor: 'bg-green-500' },
  none: { label: 'No Risk', color: 'text-gray-400', bgColor: 'bg-gray-500' },
};

export const SHORTAGE_SEVERITY_INFO: Record<ShortageSeverity, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500', icon: '🔴' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500', icon: '🟠' },
  medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500', icon: '🟡' },
  low: { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500', icon: '🟢' },
};

export const SUPPLY_CHAIN_COUNTRIES: Record<string, { name: string; flag: string; risk: GeopoliticalRisk }> = {
  USA: { name: 'United States', flag: '🇺🇸', risk: 'none' },
  CHN: { name: 'China', flag: '🇨🇳', risk: 'high' },
  RUS: { name: 'Russia', flag: '🇷🇺', risk: 'high' },
  JPN: { name: 'Japan', flag: '🇯🇵', risk: 'none' },
  EUR: { name: 'Europe', flag: '🇪🇺', risk: 'none' },
  FRA: { name: 'France', flag: '🇫🇷', risk: 'none' },
  DEU: { name: 'Germany', flag: '🇩🇪', risk: 'none' },
  GBR: { name: 'United Kingdom', flag: '🇬🇧', risk: 'none' },
  IND: { name: 'India', flag: '🇮🇳', risk: 'low' },
  KOR: { name: 'South Korea', flag: '🇰🇷', risk: 'low' },
  TWN: { name: 'Taiwan', flag: '🇹🇼', risk: 'medium' },
  ISR: { name: 'Israel', flag: '🇮🇱', risk: 'low' },
  AUS: { name: 'Australia', flag: '🇦🇺', risk: 'none' },
  CAN: { name: 'Canada', flag: '🇨🇦', risk: 'none' },
  BRA: { name: 'Brazil', flag: '🇧🇷', risk: 'low' },
  COD: { name: 'DR Congo', flag: '🇨🇩', risk: 'high' },
  ZAF: { name: 'South Africa', flag: '🇿🇦', risk: 'low' },
  MYS: { name: 'Malaysia', flag: '🇲🇾', risk: 'low' },
  IDN: { name: 'Indonesia', flag: '🇮🇩', risk: 'low' },
  CHL: { name: 'Chile', flag: '🇨🇱', risk: 'low' },
};

export const SUPPLY_CHAIN_PRODUCT_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'propulsion', label: 'Propulsion Systems', icon: '🚀' },
  { value: 'avionics', label: 'Avionics & Electronics', icon: '📡' },
  { value: 'structures', label: 'Structures & Composites', icon: '🏗️' },
  { value: 'semiconductors', label: 'Semiconductors', icon: '💻' },
  { value: 'rare_earth', label: 'Rare Earth Elements', icon: '⚛️' },
  { value: 'specialty_metals', label: 'Specialty Metals', icon: '🔩' },
  { value: 'thermal', label: 'Thermal Systems', icon: '🌡️' },
  { value: 'power', label: 'Power Systems', icon: '⚡' },
  { value: 'sensors', label: 'Sensors & Optics', icon: '👁️' },
  { value: 'software', label: 'Software & Systems', icon: '💾' },
];

// ============================================================
// Government Contracts Types
// ============================================================
export type GovContractAgency = 'NASA' | 'USSF' | 'ESA';
export type GovContractType = 'RFP' | 'RFI' | 'Award' | 'IDIQ';
export type GovContractStatus = 'open' | 'closed' | 'awarded' | 'closing_soon';
export type GovContractCategory =
  | 'lunar_exploration'
  | 'earth_observation'
  | 'satellite_launch'
  | 'ground_systems'
  | 'research_development'
  | 'space_station'
  | 'defense_systems'
  | 'communications'
  | 'propulsion'
  | 'sbir_sttr';

export interface GovernmentContract {
  id: string;
  slug: string;
  agency: GovContractAgency;
  title: string;
  description: string;
  type: GovContractType;
  value: string | null;
  valueMin: number | null;
  valueMax: number | null;
  solicitationNumber: string | null;
  postedDate: Date;
  dueDate: Date | null;
  awardDate: Date | null;
  awardee: string | null;
  naicsCode: string | null;
  category: GovContractCategory;
  status: GovContractStatus;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Agency badge colors
export const GOV_CONTRACT_AGENCIES: { value: GovContractAgency; label: string; color: string; bgColor: string }[] = [
  { value: 'NASA', label: 'NASA', color: 'text-blue-300', bgColor: 'bg-blue-600' },
  { value: 'USSF', label: 'Space Force', color: 'text-slate-200', bgColor: 'bg-slate-700' },
  { value: 'ESA', label: 'ESA', color: 'text-blue-200', bgColor: 'bg-blue-900' },
];

// Contract type badges
export const GOV_CONTRACT_TYPES: { value: GovContractType; label: string; color: string }[] = [
  { value: 'RFP', label: 'RFP', color: 'bg-green-600' },
  { value: 'RFI', label: 'RFI', color: 'bg-yellow-600' },
  { value: 'Award', label: 'Award', color: 'bg-purple-600' },
  { value: 'IDIQ', label: 'IDIQ', color: 'bg-cyan-600' },
];

// Status badges
export const GOV_CONTRACT_STATUS_INFO: Record<GovContractStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: 'text-green-400', bgColor: 'bg-green-600' },
  closing_soon: { label: 'Closing Soon', color: 'text-yellow-400', bgColor: 'bg-yellow-600' },
  awarded: { label: 'Awarded', color: 'text-purple-400', bgColor: 'bg-purple-600' },
  closed: { label: 'Closed', color: 'text-gray-400', bgColor: 'bg-gray-600' },
};

// Category labels
export const GOV_CONTRACT_CATEGORIES: { value: GovContractCategory; label: string }[] = [
  { value: 'lunar_exploration', label: 'Lunar Exploration' },
  { value: 'earth_observation', label: 'Earth Observation' },
  { value: 'satellite_launch', label: 'Satellite Launch' },
  { value: 'ground_systems', label: 'Ground Systems' },
  { value: 'research_development', label: 'R&D' },
  { value: 'space_station', label: 'Space Station' },
  { value: 'defense_systems', label: 'Defense Systems' },
  { value: 'communications', label: 'Communications' },
  { value: 'propulsion', label: 'Propulsion' },
  { value: 'sbir_sttr', label: 'SBIR/STTR' },
];

// ============================================================
// Space Mining Module Types
// ============================================================
export type MiningBodyType = 'asteroid' | 'moon' | 'planet' | 'dwarf_planet';
export type SpectralType = 'C' | 'S' | 'M' | 'V' | 'X' | 'D' | 'P' | 'E' | 'B' | 'Q';
export type OrbitalFamily = 'NEA' | 'Main Belt' | 'Trojan' | 'Mars-crosser' | 'Trans-Neptunian' | 'Kuiper Belt' | 'Planetary Moon';
export type TrajectoryStatus = 'accessible' | 'challenging' | 'difficult' | 'not_feasible';
export type ValueConfidence = 'high' | 'medium' | 'low' | 'speculative';
export type MiningResourceCategory = 'volatile' | 'metal' | 'precious_metal' | 'rare_earth' | 'silicate';
export type ExtractionCost = 'low' | 'medium' | 'high' | 'very_high';
export type CommodityCategory = 'precious_metal' | 'industrial_metal' | 'rare_earth' | 'volatile' | 'mineral';
export type PriceVolatility = 'low' | 'medium' | 'high';

export interface MiningBody {
  id: string;
  slug: string;
  name: string;
  designation: string | null;
  bodyType: MiningBodyType;
  spectralType: SpectralType | null;
  orbitalFamily: OrbitalFamily | null;
  diameter: number | null;
  mass: number | null;
  density: number | null;
  rotationPeriod: number | null;
  semiMajorAxis: number | null;
  eccentricity: number | null;
  inclination: number | null;
  perihelion: number | null;
  aphelion: number | null;
  orbitalPeriod: number | null;
  deltaV: number | null;
  trajectoryStatus: TrajectoryStatus | null;
  missionHistory: string[] | null;
  estimatedValue: number | null;
  valueConfidence: ValueConfidence | null;
  composition: Record<string, number> | null;
  description: string | null;
  imageUrl: string | null;
  resources?: MiningResource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MiningResource {
  id: string;
  miningBodyId: string;
  miningBody?: MiningBody;
  resourceType: string;
  category: MiningResourceCategory;
  abundancePercent: number | null;
  estimatedMass: number | null;
  estimatedValue: number | null;
  extractionMethod: string | null;
  extractionCost: ExtractionCost | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommodityPrice {
  id: string;
  slug: string;
  name: string;
  symbol: string | null;
  category: CommodityCategory;
  pricePerKg: number;
  pricePerTonne: number | null;
  priceUnit: string | null;
  priceSource: string | null;
  lastPriceUpdate: Date | null;
  annualProduction: number | null;
  marketCap: number | null;
  priceVolatility: PriceVolatility | null;
  spaceApplications: string[] | null;
  inSpaceValue: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Mining body type info
export const MINING_BODY_TYPES: { value: MiningBodyType; label: string; icon: string }[] = [
  { value: 'asteroid', label: 'Asteroid', icon: '☄️' },
  { value: 'moon', label: 'Moon', icon: '🌙' },
  { value: 'planet', label: 'Planet', icon: '🪐' },
  { value: 'dwarf_planet', label: 'Dwarf Planet', icon: '⚪' },
];

// Spectral type info - composition indicators
export const SPECTRAL_TYPES: { value: SpectralType; label: string; description: string; color: string }[] = [
  { value: 'C', label: 'C-type (Carbonaceous)', description: 'Carbon-rich, water, organics. ~75% of asteroids.', color: 'bg-gray-600' },
  { value: 'S', label: 'S-type (Silicaceous)', description: 'Silicate rocks, iron, nickel. ~17% of asteroids.', color: 'bg-amber-600' },
  { value: 'M', label: 'M-type (Metallic)', description: 'Iron-nickel metal, PGMs. Rare and valuable.', color: 'bg-slate-400' },
  { value: 'V', label: 'V-type (Vestoid)', description: 'Basaltic, from Vesta family.', color: 'bg-purple-600' },
  { value: 'X', label: 'X-type (Various)', description: 'Metallic or carbon-rich. Composition uncertain.', color: 'bg-zinc-500' },
  { value: 'D', label: 'D-type (Dark)', description: 'Very dark, organic-rich. Outer belt.', color: 'bg-stone-700' },
  { value: 'P', label: 'P-type (Primitive)', description: 'Organic-rich, very dark. Outer solar system.', color: 'bg-stone-600' },
  { value: 'E', label: 'E-type (Enstatite)', description: 'High albedo, enstatite achondrites.', color: 'bg-gray-300' },
  { value: 'B', label: 'B-type', description: 'Blue-sloped, volatile-rich C-type variant.', color: 'bg-blue-600' },
  { value: 'Q', label: 'Q-type', description: 'Fresh, unweathered ordinary chondrite.', color: 'bg-orange-600' },
];

// Trajectory status info
export const TRAJECTORY_STATUS_INFO: Record<TrajectoryStatus, { label: string; color: string; bgColor: string; deltaVRange: string }> = {
  accessible: { label: 'Accessible', color: 'text-green-400', bgColor: 'bg-green-600', deltaVRange: '<6 km/s' },
  challenging: { label: 'Challenging', color: 'text-yellow-400', bgColor: 'bg-yellow-600', deltaVRange: '6-9 km/s' },
  difficult: { label: 'Difficult', color: 'text-orange-400', bgColor: 'bg-orange-600', deltaVRange: '9-12 km/s' },
  not_feasible: { label: 'Not Feasible', color: 'text-red-400', bgColor: 'bg-red-600', deltaVRange: '>12 km/s' },
};

// Resource types for mining
export const RESOURCE_TYPES: { value: string; label: string; category: MiningResourceCategory; icon: string }[] = [
  // Volatiles
  { value: 'water', label: 'Water Ice', category: 'volatile', icon: '💧' },
  { value: 'hydrogen', label: 'Hydrogen', category: 'volatile', icon: '🔵' },
  { value: 'oxygen', label: 'Oxygen', category: 'volatile', icon: '🟢' },
  { value: 'nitrogen', label: 'Nitrogen', category: 'volatile', icon: '🟣' },
  { value: 'carbon', label: 'Carbon', category: 'volatile', icon: '⚫' },
  { value: 'methane', label: 'Methane', category: 'volatile', icon: '🔷' },
  { value: 'ammonia', label: 'Ammonia', category: 'volatile', icon: '🟤' },
  // Metals
  { value: 'iron', label: 'Iron', category: 'metal', icon: '🔩' },
  { value: 'nickel', label: 'Nickel', category: 'metal', icon: '🪙' },
  { value: 'cobalt', label: 'Cobalt', category: 'metal', icon: '🔵' },
  { value: 'copper', label: 'Copper', category: 'metal', icon: '🟠' },
  { value: 'aluminum', label: 'Aluminum', category: 'metal', icon: '⬜' },
  { value: 'titanium', label: 'Titanium', category: 'metal', icon: '⚪' },
  { value: 'magnesium', label: 'Magnesium', category: 'metal', icon: '🔘' },
  // Precious metals
  { value: 'gold', label: 'Gold', category: 'precious_metal', icon: '🥇' },
  { value: 'platinum', label: 'Platinum', category: 'precious_metal', icon: '💎' },
  { value: 'palladium', label: 'Palladium', category: 'precious_metal', icon: '🔷' },
  { value: 'rhodium', label: 'Rhodium', category: 'precious_metal', icon: '💠' },
  { value: 'iridium', label: 'Iridium', category: 'precious_metal', icon: '✨' },
  { value: 'osmium', label: 'Osmium', category: 'precious_metal', icon: '🌟' },
  { value: 'ruthenium', label: 'Ruthenium', category: 'precious_metal', icon: '⭐' },
  // Rare earths
  { value: 'neodymium', label: 'Neodymium', category: 'rare_earth', icon: '🧲' },
  { value: 'europium', label: 'Europium', category: 'rare_earth', icon: '📺' },
  { value: 'yttrium', label: 'Yttrium', category: 'rare_earth', icon: '💡' },
  // Silicates
  { value: 'silicon', label: 'Silicon', category: 'silicate', icon: '🖥️' },
  { value: 'olivine', label: 'Olivine', category: 'silicate', icon: '🟢' },
  { value: 'pyroxene', label: 'Pyroxene', category: 'silicate', icon: '🟤' },
];

// Orbital family info
export const ORBITAL_FAMILIES: { value: OrbitalFamily; label: string; description: string }[] = [
  { value: 'NEA', label: 'Near-Earth Asteroid', description: 'Orbit crosses or approaches Earth orbit' },
  { value: 'Main Belt', label: 'Main Asteroid Belt', description: 'Between Mars and Jupiter orbits' },
  { value: 'Trojan', label: 'Trojan Asteroid', description: 'Shares orbit with Jupiter at L4/L5 points' },
  { value: 'Mars-crosser', label: 'Mars-crosser', description: 'Orbit crosses Mars orbit' },
  { value: 'Trans-Neptunian', label: 'Trans-Neptunian Object', description: 'Beyond Neptune orbit' },
  { value: 'Kuiper Belt', label: 'Kuiper Belt Object', description: 'In the Kuiper Belt beyond Neptune' },
  { value: 'Planetary Moon', label: 'Planetary Moon', description: 'Moon of a planet' },
];

// Commodity categories
export const COMMODITY_CATEGORIES: { value: CommodityCategory; label: string; icon: string }[] = [
  { value: 'precious_metal', label: 'Precious Metals', icon: '💰' },
  { value: 'industrial_metal', label: 'Industrial Metals', icon: '🏭' },
  { value: 'rare_earth', label: 'Rare Earth Elements', icon: '⚛️' },
  { value: 'volatile', label: 'Volatiles', icon: '💧' },
  { value: 'mineral', label: 'Minerals', icon: '💎' },
];

// Value confidence info
export const VALUE_CONFIDENCE_INFO: Record<ValueConfidence, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High Confidence', color: 'text-green-400', bgColor: 'bg-green-600' },
  medium: { label: 'Medium Confidence', color: 'text-yellow-400', bgColor: 'bg-yellow-600' },
  low: { label: 'Low Confidence', color: 'text-orange-400', bgColor: 'bg-orange-600' },
  speculative: { label: 'Speculative', color: 'text-red-400', bgColor: 'bg-red-600' },
};

// Extraction cost info
export const EXTRACTION_COST_INFO: Record<ExtractionCost, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low Cost', color: 'text-green-400', bgColor: 'bg-green-600' },
  medium: { label: 'Medium Cost', color: 'text-yellow-400', bgColor: 'bg-yellow-600' },
  high: { label: 'High Cost', color: 'text-orange-400', bgColor: 'bg-orange-600' },
  very_high: { label: 'Very High Cost', color: 'text-red-400', bgColor: 'bg-red-600' },
};

// Utility function to format large values (quintillions, etc.)
export function formatLargeValue(value: number | null | undefined): string {
  if (value == null) return '$0';
  if (value >= 1e18) {
    return `$${(value / 1e18).toFixed(1)} quintillion`;
  } else if (value >= 1e15) {
    return `$${(value / 1e15).toFixed(1)} quadrillion`;
  } else if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(1)} trillion`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)} billion`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)} million`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Utility function to format distance in AU or km
export function formatDistance(au: number | null | undefined): string {
  if (au == null) return 'Unknown';
  if (au < 0.01) {
    // Less than 0.01 AU, show in millions of km
    const km = au * 149597870.7;
    return `${(km / 1e6).toFixed(2)}M km`;
  } else if (au < 1) {
    return `${au.toFixed(3)} AU`;
  } else if (au < 100) {
    return `${au.toFixed(2)} AU`;
  }
  return `${au.toFixed(0)} AU`;
}

// Utility function to format mass in scientific notation
export function formatMass(kg: number | null | undefined): string {
  if (kg == null) return 'Unknown';
  if (kg >= 1e21) {
    return `${(kg / 1e21).toFixed(2)} x 10^21 kg`;
  } else if (kg >= 1e18) {
    return `${(kg / 1e18).toFixed(2)} x 10^18 kg`;
  } else if (kg >= 1e15) {
    return `${(kg / 1e15).toFixed(2)} x 10^15 kg`;
  } else if (kg >= 1e12) {
    return `${(kg / 1e12).toFixed(2)} x 10^12 kg`;
  } else if (kg >= 1e9) {
    return `${(kg / 1e9).toFixed(2)} x 10^9 kg`;
  } else if (kg >= 1e6) {
    return `${(kg / 1e6).toFixed(2)} x 10^6 kg`;
  }
  return `${kg.toLocaleString()} kg`;
}
