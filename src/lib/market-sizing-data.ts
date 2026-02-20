// Market Sizing & TAM data for space industry verticals
// Sources: SIA, Morgan Stanley, Euroconsult, BryceTech, NSR

export interface MarketSegment {
  id: string;
  name: string;
  parentId?: string;
  description: string;
  currentTAM: number; // USD billions
  tamYear: number;
  projectedTAM: number;
  projectedYear: number;
  cagr: number; // Compound annual growth rate as decimal (0.08 = 8%)
  governmentShare: number; // 0-1
  keyPlayers: string[];
  trends: string[];
  source: string;
  color: string; // Hex color for charts
}

export interface MarketDataPoint {
  segmentId: string;
  year: number;
  value: number; // USD billions
  type: 'actual' | 'projected';
  source?: string;
}

export interface RegionalBreakdown {
  segmentId: string;
  region: string;
  share: number; // 0-1
}

export const MARKET_SEGMENTS: MarketSegment[] = [
  {
    id: 'global-space-economy',
    name: 'Global Space Economy',
    description: 'Total global space economy including government budgets and commercial revenues.',
    currentTAM: 469,
    tamYear: 2024,
    projectedTAM: 1800,
    projectedYear: 2035,
    cagr: 0.13,
    governmentShare: 0.21,
    keyPlayers: ['SpaceX', 'Boeing', 'Airbus', 'Lockheed Martin', 'Northrop Grumman'],
    trends: ['Commercialization accelerating', 'Launch costs declining 10x per decade', 'Mega-constellation deployments'],
    source: 'SIA State of the Satellite Industry 2024, Morgan Stanley Space Report',
    color: '#06b6d4',
  },
  {
    id: 'satellite-services',
    name: 'Satellite Services',
    description: 'Revenue from satellite communications, broadcasting, and broadband services.',
    parentId: 'global-space-economy',
    currentTAM: 184,
    tamYear: 2024,
    projectedTAM: 510,
    projectedYear: 2035,
    cagr: 0.096,
    governmentShare: 0.08,
    keyPlayers: ['SES', 'Intelsat', 'Eutelsat', 'Viasat', 'SpaceX Starlink', 'Amazon Kuiper'],
    trends: ['LEO broadband disrupting GEO', 'Direct-to-device connectivity', 'IoT from space'],
    source: 'SIA 2024, Euroconsult Satellite Communications Report',
    color: '#8b5cf6',
  },
  {
    id: 'satellite-manufacturing',
    name: 'Satellite Manufacturing',
    description: 'Revenue from building satellites including spacecraft buses and payloads.',
    parentId: 'global-space-economy',
    currentTAM: 19.4,
    tamYear: 2024,
    projectedTAM: 42,
    projectedYear: 2035,
    cagr: 0.073,
    governmentShare: 0.35,
    keyPlayers: ['Airbus Defence & Space', 'Boeing', 'Lockheed Martin', 'Maxar', 'Northrop Grumman', 'York Space'],
    trends: ['Standardized small satellite buses', 'Software-defined payloads', 'On-orbit assembly'],
    source: 'SIA 2024, BryceTech',
    color: '#f59e0b',
  },
  {
    id: 'launch-services',
    name: 'Launch Services',
    description: 'Revenue from orbital and suborbital launch services including rideshare.',
    parentId: 'global-space-economy',
    currentTAM: 8.8,
    tamYear: 2024,
    projectedTAM: 32,
    projectedYear: 2035,
    cagr: 0.124,
    governmentShare: 0.40,
    keyPlayers: ['SpaceX', 'Arianespace', 'ULA', 'Rocket Lab', 'Relativity Space', 'Blue Origin'],
    trends: ['Reusability driving cost reduction', 'Mega-rocket competition', 'Small launch vehicle proliferation'],
    source: 'BryceTech 2024, FAA Annual Compendium',
    color: '#ef4444',
  },
  {
    id: 'ground-equipment',
    name: 'Ground Equipment',
    description: 'Revenue from satellite ground terminals, antennas, VSAT, and user equipment.',
    parentId: 'global-space-economy',
    currentTAM: 145,
    tamYear: 2024,
    projectedTAM: 340,
    projectedYear: 2035,
    cagr: 0.08,
    governmentShare: 0.05,
    keyPlayers: ['Hughes', 'Gilat', 'Kymeta', 'Intellian', 'Ball Aerospace'],
    trends: ['Flat-panel antennas for LEO', 'Multi-orbit terminals', 'Software-defined ground stations'],
    source: 'SIA 2024',
    color: '#10b981',
  },
  {
    id: 'earth-observation',
    name: 'Earth Observation & Remote Sensing',
    description: 'Commercial and government Earth observation services including optical, SAR, RF, and analytics.',
    parentId: 'satellite-services',
    currentTAM: 6.2,
    tamYear: 2024,
    projectedTAM: 18,
    projectedYear: 2035,
    cagr: 0.101,
    governmentShare: 0.45,
    keyPlayers: ['Planet Labs', 'Maxar', 'Airbus', 'BlackSky', 'Capella Space', 'Iceye', 'Muon Space'],
    trends: ['SAR constellation growth', 'AI-powered analytics', 'Sub-meter resolution becoming commodity'],
    source: 'Euroconsult EO Market Report 2024',
    color: '#22d3ee',
  },
  {
    id: 'satellite-broadband',
    name: 'Satellite Broadband / Internet',
    description: 'LEO and GEO broadband internet service subscriptions and enterprise connectivity.',
    parentId: 'satellite-services',
    currentTAM: 12,
    tamYear: 2024,
    projectedTAM: 95,
    projectedYear: 2035,
    cagr: 0.206,
    governmentShare: 0.10,
    keyPlayers: ['SpaceX Starlink', 'Amazon Kuiper', 'OneWeb', 'Telesat Lightspeed', 'Astranis'],
    trends: ['Starlink dominance (6000+ sats)', 'Direct-to-cell', 'V-band spectrum utilization'],
    source: 'Morgan Stanley, NSR Satellite Broadband Report',
    color: '#a78bfa',
  },
  {
    id: 'navigation-pnt',
    name: 'Navigation & PNT Services',
    description: 'GPS/GNSS services, augmentation, and complementary PNT solutions.',
    parentId: 'satellite-services',
    currentTAM: 110,
    tamYear: 2024,
    projectedTAM: 210,
    projectedYear: 2035,
    cagr: 0.06,
    governmentShare: 0.15,
    keyPlayers: ['Trimble', 'Hexagon', 'Topcon', 'u-blox', 'Xona Space'],
    trends: ['LEO PNT augmentation', 'Anti-jamming/spoofing', 'Autonomous vehicle demand'],
    source: 'European GNSS Agency Market Report, GSA',
    color: '#f97316',
  },
  {
    id: 'space-defense',
    name: 'Space Defense & National Security',
    description: 'Government spending on military space systems, SSA, and space security.',
    currentTAM: 52,
    tamYear: 2024,
    projectedTAM: 95,
    projectedYear: 2035,
    cagr: 0.056,
    governmentShare: 1.0,
    keyPlayers: ['Lockheed Martin', 'Northrop Grumman', 'L3Harris', 'Raytheon', 'Boeing', 'Anduril', 'True Anomaly'],
    trends: ['Proliferated LEO for resilience', 'Space domain awareness', 'Commercial SATCOM for military', 'Responsive launch'],
    source: 'DoD Budget FY2025, CSIS Space Threat Assessment',
    color: '#dc2626',
  },
  {
    id: 'space-tourism',
    name: 'Space Tourism',
    description: 'Suborbital and orbital tourism flights and space station visits.',
    currentTAM: 0.8,
    tamYear: 2024,
    projectedTAM: 8,
    projectedYear: 2035,
    cagr: 0.233,
    governmentShare: 0.0,
    keyPlayers: ['SpaceX', 'Blue Origin', 'Virgin Galactic', 'Axiom Space', 'Space Perspective'],
    trends: ['Orbital tourism via Crew Dragon', 'Commercial space stations', 'Suborbital flights scaling'],
    source: 'UBS Space Tourism Report, NSR',
    color: '#ec4899',
  },
  {
    id: 'in-space-servicing',
    name: 'In-Space Servicing & Manufacturing',
    description: 'Satellite life extension, debris removal, on-orbit assembly, and microgravity manufacturing.',
    currentTAM: 0.5,
    tamYear: 2024,
    projectedTAM: 12,
    projectedYear: 2035,
    cagr: 0.335,
    governmentShare: 0.60,
    keyPlayers: ['Northrop Grumman MEV', 'Astroscale', 'Orbit Fab', 'Redwire', 'Varda Space', 'Made In Space'],
    trends: ['First commercial servicing missions operational', 'Active debris removal mandates', 'In-space fiber optic manufacturing'],
    source: 'NSR In-Space Servicing Report, McKinsey',
    color: '#14b8a6',
  },
  {
    id: 'lunar-economy',
    name: 'Lunar Economy',
    description: 'Commercial lunar transportation, surface infrastructure, and resource utilization.',
    currentTAM: 1.2,
    tamYear: 2024,
    projectedTAM: 15,
    projectedYear: 2035,
    cagr: 0.257,
    governmentShare: 0.80,
    keyPlayers: ['SpaceX', 'Blue Origin', 'Intuitive Machines', 'Astrobotic', 'Firefly Aerospace', 'ispace'],
    trends: ['Artemis program accelerating', 'CLPS commercial lunar landers', 'Lunar Gateway construction', 'In-situ resource utilization R&D'],
    source: 'McKinsey Space Report, NASA Artemis Budget',
    color: '#64748b',
  },
  {
    id: 'space-insurance',
    name: 'Space Insurance',
    description: 'Launch insurance, in-orbit insurance, and liability coverage for space activities.',
    currentTAM: 0.6,
    tamYear: 2024,
    projectedTAM: 2.5,
    projectedYear: 2035,
    cagr: 0.139,
    governmentShare: 0.0,
    keyPlayers: ['AXA XL', 'Marsh', 'Swiss Re', 'Munich Re', 'Assure Space'],
    trends: ['Premium rates declining with reusability', 'Mega-constellation aggregate risk', 'Parametric insurance products'],
    source: 'Seradata SpaceTrak, Swiss Re Report',
    color: '#6366f1',
  },
  {
    id: 'space-situational-awareness',
    name: 'Space Situational Awareness & Debris',
    description: 'Space traffic management, conjunction assessment, debris tracking, and active debris removal.',
    currentTAM: 1.5,
    tamYear: 2024,
    projectedTAM: 8,
    projectedYear: 2035,
    cagr: 0.164,
    governmentShare: 0.65,
    keyPlayers: ['LeoLabs', 'ExoAnalytic', 'Slingshot Aerospace', 'Astroscale', 'ClearSpace'],
    trends: ['Commercial SSA becoming standard', 'Regulatory pressure for debris mitigation', 'AI-powered collision avoidance'],
    source: 'NSR SSA Report, Euroconsult',
    color: '#f43f5e',
  },
  {
    id: 'space-mining',
    name: 'Space Mining & Resources',
    description: 'Asteroid mining, lunar ISRU, and space-based resource extraction.',
    currentTAM: 0.1,
    tamYear: 2024,
    projectedTAM: 3.5,
    projectedYear: 2035,
    cagr: 0.386,
    governmentShare: 0.70,
    keyPlayers: ['AstroForge', 'TransAstra', 'ispace', 'Offworld'],
    trends: ['First asteroid sample returns', 'Lunar water ice prospecting', 'In-situ propellant production'],
    source: 'Goldman Sachs Space Mining Report, NASA ISRU Studies',
    color: '#d97706',
  },
];

export const HISTORICAL_DATA: MarketDataPoint[] = [
  // Global space economy yearly
  { segmentId: 'global-space-economy', year: 2019, value: 366, type: 'actual', source: 'SIA' },
  { segmentId: 'global-space-economy', year: 2020, value: 371, type: 'actual', source: 'SIA' },
  { segmentId: 'global-space-economy', year: 2021, value: 386, type: 'actual', source: 'SIA' },
  { segmentId: 'global-space-economy', year: 2022, value: 424, type: 'actual', source: 'SIA' },
  { segmentId: 'global-space-economy', year: 2023, value: 449, type: 'actual', source: 'SIA' },
  { segmentId: 'global-space-economy', year: 2024, value: 469, type: 'actual', source: 'SIA' },
  { segmentId: 'global-space-economy', year: 2025, value: 530, type: 'projected' },
  { segmentId: 'global-space-economy', year: 2026, value: 600, type: 'projected' },
  { segmentId: 'global-space-economy', year: 2028, value: 770, type: 'projected' },
  { segmentId: 'global-space-economy', year: 2030, value: 1000, type: 'projected' },
  { segmentId: 'global-space-economy', year: 2035, value: 1800, type: 'projected' },

  // Launch services
  { segmentId: 'launch-services', year: 2019, value: 4.9, type: 'actual' },
  { segmentId: 'launch-services', year: 2020, value: 5.3, type: 'actual' },
  { segmentId: 'launch-services', year: 2021, value: 5.7, type: 'actual' },
  { segmentId: 'launch-services', year: 2022, value: 7.1, type: 'actual' },
  { segmentId: 'launch-services', year: 2023, value: 8.1, type: 'actual' },
  { segmentId: 'launch-services', year: 2024, value: 8.8, type: 'actual' },
  { segmentId: 'launch-services', year: 2030, value: 20, type: 'projected' },
  { segmentId: 'launch-services', year: 2035, value: 32, type: 'projected' },

  // Satellite broadband
  { segmentId: 'satellite-broadband', year: 2020, value: 2.8, type: 'actual' },
  { segmentId: 'satellite-broadband', year: 2021, value: 3.5, type: 'actual' },
  { segmentId: 'satellite-broadband', year: 2022, value: 5.5, type: 'actual' },
  { segmentId: 'satellite-broadband', year: 2023, value: 8.0, type: 'actual' },
  { segmentId: 'satellite-broadband', year: 2024, value: 12, type: 'actual' },
  { segmentId: 'satellite-broadband', year: 2030, value: 55, type: 'projected' },
  { segmentId: 'satellite-broadband', year: 2035, value: 95, type: 'projected' },

  // Earth observation
  { segmentId: 'earth-observation', year: 2020, value: 3.8, type: 'actual' },
  { segmentId: 'earth-observation', year: 2022, value: 5.1, type: 'actual' },
  { segmentId: 'earth-observation', year: 2024, value: 6.2, type: 'actual' },
  { segmentId: 'earth-observation', year: 2030, value: 12, type: 'projected' },
  { segmentId: 'earth-observation', year: 2035, value: 18, type: 'projected' },

  // Satellite services
  { segmentId: 'satellite-services', year: 2019, value: 123, type: 'actual' },
  { segmentId: 'satellite-services', year: 2020, value: 117, type: 'actual' },
  { segmentId: 'satellite-services', year: 2021, value: 118, type: 'actual' },
  { segmentId: 'satellite-services', year: 2022, value: 143, type: 'actual' },
  { segmentId: 'satellite-services', year: 2023, value: 164, type: 'actual' },
  { segmentId: 'satellite-services', year: 2024, value: 184, type: 'actual' },
  { segmentId: 'satellite-services', year: 2030, value: 350, type: 'projected' },
  { segmentId: 'satellite-services', year: 2035, value: 510, type: 'projected' },

  // Ground equipment
  { segmentId: 'ground-equipment', year: 2019, value: 130, type: 'actual' },
  { segmentId: 'ground-equipment', year: 2020, value: 133, type: 'actual' },
  { segmentId: 'ground-equipment', year: 2022, value: 138, type: 'actual' },
  { segmentId: 'ground-equipment', year: 2024, value: 145, type: 'actual' },
  { segmentId: 'ground-equipment', year: 2030, value: 220, type: 'projected' },
  { segmentId: 'ground-equipment', year: 2035, value: 340, type: 'projected' },

  // Satellite manufacturing
  { segmentId: 'satellite-manufacturing', year: 2019, value: 12.5, type: 'actual' },
  { segmentId: 'satellite-manufacturing', year: 2020, value: 13.7, type: 'actual' },
  { segmentId: 'satellite-manufacturing', year: 2022, value: 16.2, type: 'actual' },
  { segmentId: 'satellite-manufacturing', year: 2024, value: 19.4, type: 'actual' },
  { segmentId: 'satellite-manufacturing', year: 2030, value: 30, type: 'projected' },
  { segmentId: 'satellite-manufacturing', year: 2035, value: 42, type: 'projected' },

  // Space defense
  { segmentId: 'space-defense', year: 2019, value: 36, type: 'actual' },
  { segmentId: 'space-defense', year: 2020, value: 40, type: 'actual' },
  { segmentId: 'space-defense', year: 2022, value: 44, type: 'actual' },
  { segmentId: 'space-defense', year: 2024, value: 52, type: 'actual' },
  { segmentId: 'space-defense', year: 2030, value: 72, type: 'projected' },
  { segmentId: 'space-defense', year: 2035, value: 95, type: 'projected' },

  // Space tourism
  { segmentId: 'space-tourism', year: 2021, value: 0.1, type: 'actual' },
  { segmentId: 'space-tourism', year: 2022, value: 0.3, type: 'actual' },
  { segmentId: 'space-tourism', year: 2023, value: 0.5, type: 'actual' },
  { segmentId: 'space-tourism', year: 2024, value: 0.8, type: 'actual' },
  { segmentId: 'space-tourism', year: 2030, value: 3.5, type: 'projected' },
  { segmentId: 'space-tourism', year: 2035, value: 8, type: 'projected' },

  // In-space servicing
  { segmentId: 'in-space-servicing', year: 2022, value: 0.2, type: 'actual' },
  { segmentId: 'in-space-servicing', year: 2024, value: 0.5, type: 'actual' },
  { segmentId: 'in-space-servicing', year: 2030, value: 4.5, type: 'projected' },
  { segmentId: 'in-space-servicing', year: 2035, value: 12, type: 'projected' },

  // Navigation / PNT
  { segmentId: 'navigation-pnt', year: 2019, value: 85, type: 'actual' },
  { segmentId: 'navigation-pnt', year: 2020, value: 88, type: 'actual' },
  { segmentId: 'navigation-pnt', year: 2022, value: 98, type: 'actual' },
  { segmentId: 'navigation-pnt', year: 2024, value: 110, type: 'actual' },
  { segmentId: 'navigation-pnt', year: 2030, value: 160, type: 'projected' },
  { segmentId: 'navigation-pnt', year: 2035, value: 210, type: 'projected' },
];

export const REGIONAL_BREAKDOWN: RegionalBreakdown[] = [
  // Global space economy
  { segmentId: 'global-space-economy', region: 'North America', share: 0.52 },
  { segmentId: 'global-space-economy', region: 'Europe', share: 0.22 },
  { segmentId: 'global-space-economy', region: 'Asia-Pacific', share: 0.20 },
  { segmentId: 'global-space-economy', region: 'Rest of World', share: 0.06 },

  // Launch services
  { segmentId: 'launch-services', region: 'North America', share: 0.60 },
  { segmentId: 'launch-services', region: 'Europe', share: 0.18 },
  { segmentId: 'launch-services', region: 'Asia-Pacific', share: 0.17 },
  { segmentId: 'launch-services', region: 'Rest of World', share: 0.05 },

  // Satellite services
  { segmentId: 'satellite-services', region: 'North America', share: 0.45 },
  { segmentId: 'satellite-services', region: 'Europe', share: 0.25 },
  { segmentId: 'satellite-services', region: 'Asia-Pacific', share: 0.22 },
  { segmentId: 'satellite-services', region: 'Rest of World', share: 0.08 },

  // Space defense
  { segmentId: 'space-defense', region: 'North America', share: 0.62 },
  { segmentId: 'space-defense', region: 'Europe', share: 0.15 },
  { segmentId: 'space-defense', region: 'Asia-Pacific', share: 0.18 },
  { segmentId: 'space-defense', region: 'Rest of World', share: 0.05 },

  // Earth observation
  { segmentId: 'earth-observation', region: 'North America', share: 0.48 },
  { segmentId: 'earth-observation', region: 'Europe', share: 0.28 },
  { segmentId: 'earth-observation', region: 'Asia-Pacific', share: 0.18 },
  { segmentId: 'earth-observation', region: 'Rest of World', share: 0.06 },

  // Ground equipment
  { segmentId: 'ground-equipment', region: 'North America', share: 0.40 },
  { segmentId: 'ground-equipment', region: 'Europe', share: 0.22 },
  { segmentId: 'ground-equipment', region: 'Asia-Pacific', share: 0.30 },
  { segmentId: 'ground-equipment', region: 'Rest of World', share: 0.08 },
];

/** Get projected value for any year using CAGR interpolation */
export function getProjectedValue(segment: MarketSegment, year: number): number {
  const yearsFromBase = year - segment.tamYear;
  return segment.currentTAM * Math.pow(1 + segment.cagr, yearsFromBase);
}

/** Get all children of a parent segment */
export function getChildSegments(parentId: string): MarketSegment[] {
  return MARKET_SEGMENTS.filter(s => s.parentId === parentId);
}

/** Get top-level segments (no parent) */
export function getTopLevelSegments(): MarketSegment[] {
  return MARKET_SEGMENTS.filter(s => !s.parentId);
}
