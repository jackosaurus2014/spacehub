// ============================================================
// SpaceNexus Marketplace — Types, Taxonomy & Constants
// ============================================================

// ---- Unified Service Taxonomy (10 categories, 40+ subcategories) ----

export interface MarketplaceSubcategory {
  value: string;
  label: string;
  description: string;
  matchWeight?: number; // 0-1 weight for matching relevance
}

export interface MarketplaceCategory {
  value: string;
  label: string;
  icon: string;
  description: string;
  subcategories: MarketplaceSubcategory[];
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    value: 'launch',
    label: 'Launch Services',
    icon: '🚀',
    description: 'Dedicated launch, rideshare, rapid/responsive launch, orbital transfer',
    subcategories: [
      { value: 'dedicated', label: 'Dedicated Launch', description: 'Full vehicle for a single payload', matchWeight: 1.0 },
      { value: 'rideshare', label: 'Rideshare', description: 'Shared launch vehicle with other payloads', matchWeight: 0.8 },
      { value: 'rapid_responsive', label: 'Rapid/Responsive Launch', description: 'Quick-turnaround launch on demand', matchWeight: 0.9 },
      { value: 'orbital_transfer', label: 'Orbital Transfer Vehicle', description: 'Last-mile delivery to target orbit', matchWeight: 0.7 },
    ],
  },
  {
    value: 'satellite',
    label: 'Satellite Services',
    icon: '🛰️',
    description: 'Earth observation, communications, navigation, IoT connectivity',
    subcategories: [
      { value: 'earth_observation', label: 'Earth Observation', description: 'Optical, SAR, and multispectral imagery', matchWeight: 1.0 },
      { value: 'communications', label: 'Communications', description: 'Broadband, narrowband, and relay services', matchWeight: 0.9 },
      { value: 'navigation', label: 'Navigation & PNT', description: 'Positioning, navigation, and timing augmentation', matchWeight: 0.8 },
      { value: 'iot', label: 'IoT Connectivity', description: 'Satellite-based IoT and M2M connectivity', matchWeight: 0.7 },
    ],
  },
  {
    value: 'in_space',
    label: 'In-Space Services',
    icon: '⚡',
    description: 'Hosted payloads, in-orbit computing, satellite servicing, logistics',
    subcategories: [
      { value: 'hosted_payload', label: 'Hosted Payloads', description: 'Fly your instrument on an existing satellite', matchWeight: 0.9 },
      { value: 'in_orbit_computing', label: 'In-Orbit Computing', description: 'Edge processing and cloud in space', matchWeight: 0.8 },
      { value: 'satellite_servicing', label: 'Satellite Servicing (RPO)', description: 'Inspection, refueling, repair, de-orbit', matchWeight: 1.0 },
      { value: 'space_logistics', label: 'Space Logistics', description: 'Cargo transport and orbital delivery', matchWeight: 0.8 },
    ],
  },
  {
    value: 'ground',
    label: 'Ground Segment',
    icon: '📡',
    description: 'Ground stations, mission control, data processing, antenna networks',
    subcategories: [
      { value: 'ground_stations', label: 'Ground Stations (GaaS)', description: 'Ground station as a service for satellite operations', matchWeight: 1.0 },
      { value: 'mission_control', label: 'Mission Control', description: 'Outsourced spacecraft operations and monitoring', matchWeight: 0.9 },
      { value: 'data_processing', label: 'Data Processing', description: 'Downlink, storage, and analytics pipelines', matchWeight: 0.8 },
      { value: 'antenna_networks', label: 'Antenna Networks', description: 'Global antenna sharing and scheduling', matchWeight: 0.7 },
    ],
  },
  {
    value: 'manufacturing',
    label: 'Manufacturing & Components',
    icon: '🏭',
    description: 'Satellite buses, propulsion, avionics, solar arrays, structures',
    subcategories: [
      { value: 'satellite_buses', label: 'Satellite Buses', description: 'Complete satellite platforms and bus systems', matchWeight: 1.0 },
      { value: 'propulsion', label: 'Propulsion Systems', description: 'Electric, chemical, and hybrid propulsion', matchWeight: 0.9 },
      { value: 'avionics', label: 'Avionics & Electronics', description: 'Flight computers, sensors, and electronics', matchWeight: 0.8 },
      { value: 'solar_arrays', label: 'Solar Arrays & Power', description: 'Power generation and distribution systems', matchWeight: 0.8 },
      { value: 'structures', label: 'Structures & Mechanisms', description: 'Structural components and deployment mechanisms', matchWeight: 0.7 },
    ],
  },
  {
    value: 'engineering',
    label: 'Engineering & Consulting',
    icon: '📐',
    description: 'Systems engineering, mission design, regulatory, testing & qualification',
    subcategories: [
      { value: 'systems_engineering', label: 'Systems Engineering', description: 'End-to-end systems design and integration', matchWeight: 1.0 },
      { value: 'mission_design', label: 'Mission Design & Analysis', description: 'Orbit analysis, mission planning, and simulation', matchWeight: 0.9 },
      { value: 'regulatory', label: 'Regulatory Consulting', description: 'Licensing, spectrum, and compliance advisory', matchWeight: 0.7 },
      { value: 'testing', label: 'Testing & Qualification', description: 'Environmental testing, vibration, thermal vacuum', matchWeight: 0.8 },
    ],
  },
  {
    value: 'environment',
    label: 'Space Environment',
    icon: '🌍',
    description: 'Weather/radiation monitoring, debris tracking, conjunction assessment',
    subcategories: [
      { value: 'weather_radiation', label: 'Weather & Radiation Monitoring', description: 'Solar weather alerts and radiation forecasting', matchWeight: 0.9 },
      { value: 'debris_tracking', label: 'Debris Tracking', description: 'Orbital debris cataloging and tracking', matchWeight: 1.0 },
      { value: 'conjunction_assessment', label: 'Conjunction Assessment', description: 'Collision avoidance analysis and maneuver planning', matchWeight: 1.0 },
    ],
  },
  {
    value: 'rnd',
    label: 'R&D Services',
    icon: '🔬',
    description: 'Materials research, microgravity experiments, technology demonstration',
    subcategories: [
      { value: 'materials', label: 'Materials Research', description: 'Advanced materials development and testing', matchWeight: 0.8 },
      { value: 'microgravity', label: 'Microgravity Experiments', description: 'ISS and free-flyer experiment platforms', matchWeight: 0.9 },
      { value: 'tech_demo', label: 'Technology Demonstration', description: 'On-orbit technology validation missions', matchWeight: 1.0 },
    ],
  },
  {
    value: 'human',
    label: 'Human Spaceflight',
    icon: '👨‍🚀',
    description: 'Crew transport, habitat modules, life support, space tourism',
    subcategories: [
      { value: 'crew_transport', label: 'Crew Transport', description: 'Crewed spacecraft and launch services', matchWeight: 1.0 },
      { value: 'habitats', label: 'Habitat Modules', description: 'Space station modules and inflatable habitats', matchWeight: 0.9 },
      { value: 'life_support', label: 'Life Support Systems', description: 'ECLSS, food, water, and air systems', matchWeight: 0.8 },
      { value: 'tourism', label: 'Space Tourism', description: 'Suborbital and orbital tourism experiences', matchWeight: 0.7 },
    ],
  },
  {
    value: 'power',
    label: 'Space Power',
    icon: '☀️',
    description: 'Space solar, in-orbit power services, power beaming',
    subcategories: [
      { value: 'space_solar', label: 'Space Solar Power', description: 'Orbital solar collection and transmission', matchWeight: 0.9 },
      { value: 'in_orbit_power', label: 'In-Orbit Power Services', description: 'Power-as-a-service for space assets', matchWeight: 1.0 },
      { value: 'power_beaming', label: 'Power Beaming', description: 'Wireless power transmission technology', matchWeight: 0.8 },
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

/** Search categories and subcategories by text query */
export function getMatchingCategories(query: string): { category: MarketplaceCategory; subcategory?: MarketplaceSubcategory }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: { category: MarketplaceCategory; subcategory?: MarketplaceSubcategory }[] = [];
  for (const cat of MARKETPLACE_CATEGORIES) {
    if (cat.label.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q)) {
      results.push({ category: cat });
    }
    for (const sub of cat.subcategories) {
      if (sub.label.toLowerCase().includes(q) || sub.description.toLowerCase().includes(q)) {
        results.push({ category: cat, subcategory: sub });
      }
    }
  }
  return results;
}

/** Group certifications by their category */
export function getCertificationsByGroup(): Record<string, typeof CERTIFICATION_OPTIONS> {
  const groups: Record<string, typeof CERTIFICATION_OPTIONS> = {};
  for (const cert of CERTIFICATION_OPTIONS) {
    if (!groups[cert.category]) groups[cert.category] = [];
    groups[cert.category].push(cert);
  }
  return groups;
}

/** Get subcategory description for tooltips */
export function getSubcategoryDescription(category: string, subcategory: string): string {
  const cat = MARKETPLACE_CATEGORIES.find((c) => c.value === category);
  return cat?.subcategories.find((s) => s.value === subcategory)?.description || '';
}
