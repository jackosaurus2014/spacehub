// ============================================================
// SpaceNexus Marketplace — Types, Taxonomy & Constants
// ============================================================

// ---- Unified Service Taxonomy (10 categories, 40+ subcategories) ----

export interface MarketplaceCategory {
  value: string;
  label: string;
  icon: string;
  description: string;
  subcategories: { value: string; label: string }[];
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    value: 'launch',
    label: 'Launch Services',
    icon: '🚀',
    description: 'Dedicated launch, rideshare, rapid/responsive launch, orbital transfer',
    subcategories: [
      { value: 'dedicated', label: 'Dedicated Launch' },
      { value: 'rideshare', label: 'Rideshare' },
      { value: 'rapid_responsive', label: 'Rapid/Responsive Launch' },
      { value: 'orbital_transfer', label: 'Orbital Transfer Vehicle' },
    ],
  },
  {
    value: 'satellite',
    label: 'Satellite Services',
    icon: '🛰️',
    description: 'Earth observation, communications, navigation, IoT connectivity',
    subcategories: [
      { value: 'earth_observation', label: 'Earth Observation' },
      { value: 'communications', label: 'Communications' },
      { value: 'navigation', label: 'Navigation & PNT' },
      { value: 'iot', label: 'IoT Connectivity' },
    ],
  },
  {
    value: 'in_space',
    label: 'In-Space Services',
    icon: '⚡',
    description: 'Hosted payloads, in-orbit computing, satellite servicing, logistics',
    subcategories: [
      { value: 'hosted_payload', label: 'Hosted Payloads' },
      { value: 'in_orbit_computing', label: 'In-Orbit Computing' },
      { value: 'satellite_servicing', label: 'Satellite Servicing (RPO)' },
      { value: 'space_logistics', label: 'Space Logistics' },
    ],
  },
  {
    value: 'ground',
    label: 'Ground Segment',
    icon: '📡',
    description: 'Ground stations, mission control, data processing, antenna networks',
    subcategories: [
      { value: 'ground_stations', label: 'Ground Stations (GaaS)' },
      { value: 'mission_control', label: 'Mission Control' },
      { value: 'data_processing', label: 'Data Processing' },
      { value: 'antenna_networks', label: 'Antenna Networks' },
    ],
  },
  {
    value: 'manufacturing',
    label: 'Manufacturing & Components',
    icon: '🏭',
    description: 'Satellite buses, propulsion, avionics, solar arrays, structures',
    subcategories: [
      { value: 'satellite_buses', label: 'Satellite Buses' },
      { value: 'propulsion', label: 'Propulsion Systems' },
      { value: 'avionics', label: 'Avionics & Electronics' },
      { value: 'solar_arrays', label: 'Solar Arrays & Power' },
      { value: 'structures', label: 'Structures & Mechanisms' },
    ],
  },
  {
    value: 'engineering',
    label: 'Engineering & Consulting',
    icon: '📐',
    description: 'Systems engineering, mission design, regulatory, testing & qualification',
    subcategories: [
      { value: 'systems_engineering', label: 'Systems Engineering' },
      { value: 'mission_design', label: 'Mission Design & Analysis' },
      { value: 'regulatory', label: 'Regulatory Consulting' },
      { value: 'testing', label: 'Testing & Qualification' },
    ],
  },
  {
    value: 'environment',
    label: 'Space Environment',
    icon: '🌍',
    description: 'Weather/radiation monitoring, debris tracking, conjunction assessment',
    subcategories: [
      { value: 'weather_radiation', label: 'Weather & Radiation Monitoring' },
      { value: 'debris_tracking', label: 'Debris Tracking' },
      { value: 'conjunction_assessment', label: 'Conjunction Assessment' },
    ],
  },
  {
    value: 'rnd',
    label: 'R&D Services',
    icon: '🔬',
    description: 'Materials research, microgravity experiments, technology demonstration',
    subcategories: [
      { value: 'materials', label: 'Materials Research' },
      { value: 'microgravity', label: 'Microgravity Experiments' },
      { value: 'tech_demo', label: 'Technology Demonstration' },
    ],
  },
  {
    value: 'human',
    label: 'Human Spaceflight',
    icon: '👨‍🚀',
    description: 'Crew transport, habitat modules, life support, space tourism',
    subcategories: [
      { value: 'crew_transport', label: 'Crew Transport' },
      { value: 'habitats', label: 'Habitat Modules' },
      { value: 'life_support', label: 'Life Support Systems' },
      { value: 'tourism', label: 'Space Tourism' },
    ],
  },
  {
    value: 'power',
    label: 'Space Power',
    icon: '☀️',
    description: 'Space solar, in-orbit power services, power beaming',
    subcategories: [
      { value: 'space_solar', label: 'Space Solar Power' },
      { value: 'in_orbit_power', label: 'In-Orbit Power Services' },
      { value: 'power_beaming', label: 'Power Beaming' },
    ],
  },
];

// ---- Pricing Types ----

export const PRICING_TYPES = [
  { value: 'fixed', label: 'Fixed Price', description: 'One-time fixed cost' },
  { value: 'hourly', label: 'Hourly Rate', description: 'Billed per hour of service' },
  { value: 'per_unit', label: 'Per Unit', description: 'Price per unit (km², kg, pass, etc.)' },
  { value: 'subscription', label: 'Subscription', description: 'Recurring monthly/annual fee' },
  { value: 'rfq_only', label: 'Request Quote', description: 'Contact provider for custom pricing' },
];

// ---- Certifications ----

export const CERTIFICATION_OPTIONS = [
  { value: 'ITAR', label: 'ITAR Registered', category: 'export' },
  { value: 'EAR', label: 'EAR Compliant', category: 'export' },
  { value: 'ISO_9001', label: 'ISO 9001', category: 'quality' },
  { value: 'AS9100', label: 'AS9100', category: 'quality' },
  { value: 'AS9110', label: 'AS9110', category: 'quality' },
  { value: 'CMMI', label: 'CMMI Level 3+', category: 'process' },
  { value: 'ISO_27001', label: 'ISO 27001', category: 'security' },
  { value: 'SOC_2', label: 'SOC 2 Type II', category: 'security' },
  { value: 'FedRAMP', label: 'FedRAMP Authorized', category: 'security' },
  { value: 'NIST_800_171', label: 'NIST 800-171', category: 'security' },
  { value: 'Nadcap', label: 'Nadcap', category: 'quality' },
  { value: 'NASA_QPL', label: 'NASA QPL', category: 'quality' },
];

// ---- Verification Levels ----

export const VERIFICATION_LEVELS = {
  none: {
    label: 'Unverified',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500',
    icon: '',
    description: 'Profile not yet verified',
  },
  identity: {
    label: 'Identity Verified',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500',
    icon: '✓',
    description: 'Company identity confirmed via email domain or business registration',
  },
  capability: {
    label: 'Capability Verified',
    color: 'text-green-400',
    bgColor: 'bg-green-500',
    icon: '✓✓',
    description: 'Government contract on record or capabilities independently verified',
  },
  performance: {
    label: 'Performance Verified',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500',
    icon: '★',
    description: '5+ completed transactions with buyer ratings above 4.0',
  },
};

// ---- Status Constants ----

export const RFQ_STATUSES = {
  open: { label: 'Open', color: 'text-green-400', bgColor: 'bg-green-500' },
  evaluating: { label: 'Evaluating', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  awarded: { label: 'Awarded', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500' },
  closed: { label: 'Closed', color: 'text-slate-400', bgColor: 'bg-slate-500' },
};

export const PROPOSAL_STATUSES = {
  submitted: { label: 'Submitted', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  shortlisted: { label: 'Shortlisted', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  awarded: { label: 'Awarded', color: 'text-green-400', bgColor: 'bg-green-500' },
  rejected: { label: 'Not Selected', color: 'text-red-400', bgColor: 'bg-red-500' },
  withdrawn: { label: 'Withdrawn', color: 'text-slate-400', bgColor: 'bg-slate-500' },
};

export const LISTING_STATUSES = {
  active: { label: 'Active', color: 'text-green-400', bgColor: 'bg-green-500' },
  pending: { label: 'Pending Review', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  paused: { label: 'Paused', color: 'text-orange-400', bgColor: 'bg-orange-500' },
  archived: { label: 'Archived', color: 'text-slate-400', bgColor: 'bg-slate-500' },
};

export const TEAMING_ROLES = [
  { value: 'prime', label: 'Prime Contractor', description: 'Leading the bid' },
  { value: 'subcontractor', label: 'Subcontractor', description: 'Providing specific capabilities' },
  { value: 'teammate', label: 'Teammate', description: 'Equal team member / joint venture' },
];

export const SET_ASIDE_OPTIONS = [
  { value: '8a', label: '8(a)' },
  { value: 'hubzone', label: 'HUBZone' },
  { value: 'wosb', label: 'WOSB (Women-Owned)' },
  { value: 'sdvosb', label: 'SDVOSB (Service-Disabled Veteran)' },
  { value: 'small_business', label: 'Small Business' },
  { value: 'none', label: 'No Set-Aside' },
];

// ---- Helper Functions ----

export function getCategoryLabel(value: string): string {
  return MARKETPLACE_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function getCategoryIcon(value: string): string {
  return MARKETPLACE_CATEGORIES.find((c) => c.value === value)?.icon || '📦';
}

export function getSubcategoryLabel(category: string, subcategory: string): string {
  const cat = MARKETPLACE_CATEGORIES.find((c) => c.value === category);
  return cat?.subcategories.find((s) => s.value === subcategory)?.label || subcategory;
}

export function formatPrice(min?: number | null, max?: number | null, unit?: string | null): string {
  if (!min && !max) return 'Contact for pricing';
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };
  const unitStr = unit ? `/${unit}` : '';
  if (min && max) return `${fmt(min)} - ${fmt(max)}${unitStr}`;
  if (min) return `From ${fmt(min)}${unitStr}`;
  if (max) return `Up to ${fmt(max)}${unitStr}`;
  return 'Contact for pricing';
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);
}
