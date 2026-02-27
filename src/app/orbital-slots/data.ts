// ────────────────────────────────────────
// Static Data for Orbital Slots page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────

import { CongestionLevel, OrbitalEventType } from '@/types';

// ── Types ──

export interface OrbitalRegimeInfo {
  id: string;
  name: string;
  abbreviation: string;
  altitudeRange: string;
  altitudeMin: number;
  altitudeMax: number;
  activeSatellites: number;
  periodRange: string;
  velocityRange: string;
  congestion: CongestionLevel;
  description: string;
  keyUses: string[];
  challenges: string[];
  notableConstellations: string[];
}

export interface GeoSlotInfo {
  position: string;
  longitude: number;
  operator: string;
  satelliteName: string;
  country: string;
  use: string;
  band: string;
  coverageRegion: string;
  launchYear: number | null;
  estimatedValue: string;
  status: 'active' | 'planned' | 'transitioning';
  notes: string;
}

export interface MegaConstellationInfo {
  name: string;
  operator: string;
  country: string;
  orbit: string;
  altitude: string;
  launched: number;
  operational: number;
  approved: number;
  gen2Target: number | null;
  purpose: string;
  status: 'operational' | 'deploying' | 'planned' | 'early-stage';
  firstLaunch: string;
  inclinationPlanes: string;
  massPerSat: string;
  designLife: string;
  deorbitPlan: string;
  fundingStatus: string;
  website: string;
}

export interface RegulatoryBody {
  name: string;
  abbreviation: string;
  country: string;
  scope: string;
  jurisdiction: string;
  role: string;
  keyResponsibilities: string[];
  website: string;
  filingTypes: string[];
  relevantTreaties: string[];
}

// ── Static Data: Orbital Regimes ──

export const ORBITAL_REGIMES: OrbitalRegimeInfo[] = [
  {
    id: 'leo',
    name: 'Low Earth Orbit',
    abbreviation: 'LEO',
    altitudeRange: '160 - 2,000 km',
    altitudeMin: 160,
    altitudeMax: 2000,
    activeSatellites: 7500,
    periodRange: '88 - 127 min',
    velocityRange: '7.8 - 6.9 km/s',
    congestion: 'critical',
    description: 'The most congested orbital regime, home to mega-constellations, ISS, Earth observation satellites, and the majority of tracked debris. LEO is experiencing explosive growth driven by Starlink and other broadband constellations.',
    keyUses: ['Broadband Internet', 'Earth Observation', 'Scientific Research', 'Space Stations', 'Technology Demonstration'],
    challenges: ['Orbital debris density', 'Atmospheric drag requires station-keeping', 'Short ground contact windows', 'Conjunction avoidance maneuvers', 'Light pollution concerns'],
    notableConstellations: ['Starlink', 'OneWeb', 'Planet Labs', 'Spire Global', 'ISS'],
  },
  {
    id: 'meo',
    name: 'Medium Earth Orbit',
    abbreviation: 'MEO',
    altitudeRange: '2,000 - 35,786 km',
    altitudeMin: 2000,
    altitudeMax: 35786,
    activeSatellites: 300,
    periodRange: '2 - 24 hours',
    velocityRange: '6.9 - 3.1 km/s',
    congestion: 'moderate',
    description: 'Primarily used by navigation constellations (GPS, Galileo, GLONASS, BeiDou). MEO offers a balance between coverage area and signal latency, making it ideal for positioning systems and some communications.',
    keyUses: ['Navigation (GNSS)', 'Search and Rescue (COSPAS-SARSAT)', 'Communications', 'Science Missions'],
    challenges: ['Van Allen radiation belts', 'Higher launch energy required', 'Complex orbital mechanics', 'Radiation-hardened electronics needed'],
    notableConstellations: ['GPS (USA)', 'Galileo (EU)', 'GLONASS (Russia)', 'BeiDou (China)', 'O3b mPOWER (SES)'],
  },
  {
    id: 'geo',
    name: 'Geostationary Orbit',
    abbreviation: 'GEO',
    altitudeRange: '35,786 km (circular)',
    altitudeMin: 35786,
    altitudeMax: 35786,
    activeSatellites: 565,
    periodRange: '23 hr 56 min',
    velocityRange: '3.07 km/s',
    congestion: 'high',
    description: 'The most commercially valuable orbit. Satellites here appear stationary relative to Earth, enabling fixed ground antennas for broadcast TV, weather monitoring, and communications. GEO slot allocation is managed by the ITU and is a finite, contested resource.',
    keyUses: ['Direct Broadcast Television', 'Weather Monitoring', 'Military Communications', 'Commercial Broadband', 'Data Relay'],
    challenges: ['Limited slot availability (1,800 positions at 0.2\u00B0 spacing)', 'Signal latency (~240ms round-trip)', 'High launch cost', 'Graveyard orbit disposal required', 'Slot coordination via ITU'],
    notableConstellations: ['SES Astra', 'Eutelsat', 'Intelsat', 'Viasat', 'GOES (NOAA)'],
  },
  {
    id: 'heo',
    name: 'Highly Elliptical Orbit',
    abbreviation: 'HEO',
    altitudeRange: '500 - 40,000+ km',
    altitudeMin: 500,
    altitudeMax: 40000,
    activeSatellites: 100,
    periodRange: '12 - 24 hours',
    velocityRange: 'Variable',
    congestion: 'low',
    description: 'Elliptical orbits like Molniya and Tundra provide extended dwell time over high-latitude regions that GEO cannot serve well. These orbits are critical for communications and early-warning systems covering polar regions.',
    keyUses: ['Arctic Communications', 'Early Warning Systems', 'Signals Intelligence', 'Scientific Observation', 'Polar Coverage'],
    challenges: ['Crosses Van Allen belts twice per orbit', 'Complex ground tracking', 'Variable altitude complicates link budgets', 'Radiation exposure'],
    notableConstellations: ['Molniya (Russia)', 'Tundra (Russia)', 'SDS (USA)', 'Quasi-Zenith (Japan)', 'Sirius XM'],
  },
];

// ── Static Data: Key GEO Slots ──

export const KEY_GEO_SLOTS: GeoSlotInfo[] = [
  {
    position: '77\u00B0W',
    longitude: -77,
    operator: 'DirecTV / AT&T',
    satelliteName: 'DirecTV-14, DirecTV-15',
    country: 'USA',
    use: 'Direct Broadcast Satellite TV',
    band: 'Ku-band, Ka-band',
    coverageRegion: 'Continental USA',
    launchYear: 2014,
    estimatedValue: '$500M+',
    status: 'active',
    notes: 'Primary slot for DirecTV residential service to North America.',
  },
  {
    position: '101\u00B0W',
    longitude: -101,
    operator: 'DirecTV / AT&T',
    satelliteName: 'DirecTV-10, DirecTV-12',
    country: 'USA',
    use: 'Direct Broadcast Satellite TV',
    band: 'Ka-band',
    coverageRegion: 'Continental USA',
    launchYear: 2007,
    estimatedValue: '$400M+',
    status: 'active',
    notes: 'High-definition and local channel delivery for DirecTV subscribers.',
  },
  {
    position: '137\u00B0E',
    longitude: 137,
    operator: 'JSAT (SKY Perfect JSAT)',
    satelliteName: 'JCSAT-2B',
    country: 'Japan',
    use: 'Communications & Broadcasting',
    band: 'C-band, Ku-band',
    coverageRegion: 'Asia-Pacific',
    launchYear: 2016,
    estimatedValue: '$300M+',
    status: 'active',
    notes: 'Key broadcasting slot for Japanese and Asia-Pacific markets.',
  },
  {
    position: '13\u00B0E',
    longitude: 13,
    operator: 'Eutelsat',
    satelliteName: 'Hot Bird 13F, 13G',
    country: 'France',
    use: 'Direct-to-Home Television',
    band: 'Ku-band',
    coverageRegion: 'Europe, North Africa, Middle East',
    launchYear: 2022,
    estimatedValue: '$800M+',
    status: 'active',
    notes: 'One of the most valuable orbital positions in the world. Serves 1,000+ TV channels to 135M homes.',
  },
  {
    position: '28.2\u00B0E',
    longitude: 28.2,
    operator: 'SES',
    satelliteName: 'Astra 2E, 2F, 2G',
    country: 'Luxembourg',
    use: 'Direct-to-Home Television',
    band: 'Ku-band',
    coverageRegion: 'UK, Ireland, Europe',
    launchYear: 2013,
    estimatedValue: '$600M+',
    status: 'active',
    notes: 'Primary position for UK Sky TV platform and Freesat. Serves 13M+ households.',
  },
  {
    position: '9\u00B0E',
    longitude: 9,
    operator: 'Eutelsat',
    satelliteName: 'Ka-Sat, Eutelsat 9B',
    country: 'France',
    use: 'Broadband Internet & Broadcasting',
    band: 'Ka-band, Ku-band',
    coverageRegion: 'Europe, Mediterranean',
    launchYear: 2010,
    estimatedValue: '$450M+',
    status: 'active',
    notes: 'High-throughput Ka-band satellite delivering broadband across Europe with 90 Gbps capacity.',
  },
  {
    position: '19.2\u00B0E',
    longitude: 19.2,
    operator: 'SES',
    satelliteName: 'Astra 1KR, 1L, 1M, 1N',
    country: 'Luxembourg',
    use: 'Direct-to-Home Television',
    band: 'Ku-band',
    coverageRegion: 'Central Europe, Germany',
    launchYear: 2006,
    estimatedValue: '$700M+',
    status: 'active',
    notes: 'Premier European TV position. Primary platform for German and Central European broadcasters with 118M+ TV homes.',
  },
  {
    position: '95\u00B0W',
    longitude: -95,
    operator: 'SES / DISH Network',
    satelliteName: 'SES-11 / EchoStar-105',
    country: 'USA',
    use: 'Television & Government',
    band: 'C-band, Ku-band',
    coverageRegion: 'North America',
    launchYear: 2017,
    estimatedValue: '$350M+',
    status: 'active',
    notes: 'Shared satellite serving DISH Network TV and government/enterprise C-band customers.',
  },
  {
    position: '105.5\u00B0E',
    longitude: 105.5,
    operator: 'APT Satellite (AsiaSat)',
    satelliteName: 'AsiaSat 7',
    country: 'China',
    use: 'Broadcasting & Communications',
    band: 'C-band, Ku-band',
    coverageRegion: 'Asia-Pacific',
    launchYear: 2011,
    estimatedValue: '$250M+',
    status: 'active',
    notes: 'Serves major broadcasters across Asia including CCTV, Star TV, and regional networks.',
  },
  {
    position: '74\u00B0W',
    longitude: -74,
    operator: 'Star One (Embratel)',
    satelliteName: 'Star One D2',
    country: 'USA',
    use: 'Broadcasting & Broadband',
    band: 'C-band, Ku-band, Ka-band',
    coverageRegion: 'Latin America',
    launchYear: 2022,
    estimatedValue: '$300M+',
    status: 'active',
    notes: 'Primary position for Brazilian and Latin American broadcast and broadband services.',
  },
  {
    position: '108.2\u00B0E',
    longitude: 108.2,
    operator: 'Telkom Indonesia',
    satelliteName: 'Telkom 4 (Merah Putih)',
    country: 'India',
    use: 'Communications & Broadcasting',
    band: 'C-band',
    coverageRegion: 'Indonesia, South Asia',
    launchYear: 2018,
    estimatedValue: '$200M+',
    status: 'active',
    notes: 'Critical connectivity infrastructure for the Indonesian archipelago.',
  },
  {
    position: '75\u00B0E',
    longitude: 75,
    operator: 'ISRO (Indian Space Research Organisation)',
    satelliteName: 'GSAT-15',
    country: 'India',
    use: 'Broadcasting & Navigation (GAGAN)',
    band: 'Ku-band',
    coverageRegion: 'Indian Subcontinent',
    launchYear: 2015,
    estimatedValue: '$150M+',
    status: 'active',
    notes: 'Supports DTH television and the GPS-Aided Geo Augmented Navigation (GAGAN) system.',
  },
];

// ── Static Data: Mega-Constellation Stats ──

export const MEGA_CONSTELLATIONS: MegaConstellationInfo[] = [
  {
    name: 'Starlink',
    operator: 'SpaceX',
    country: 'USA',
    orbit: 'LEO',
    altitude: '540-570 km',
    launched: 6800,
    operational: 6300,
    approved: 12000,
    gen2Target: 42000,
    purpose: 'Global broadband internet with low latency',
    status: 'operational',
    firstLaunch: 'May 2019',
    inclinationPlanes: '53\u00B0, 70\u00B0, 97.6\u00B0 (72 planes)',
    massPerSat: '~295 kg (v2 Mini)',
    designLife: '5 years',
    deorbitPlan: 'Autonomous propulsive deorbit within 5 years',
    fundingStatus: 'Self-funded by SpaceX; contributing to >$6B/yr revenue',
    website: 'https://www.starlink.com',
  },
  {
    name: 'OneWeb',
    operator: 'Eutelsat OneWeb',
    country: 'UK',
    orbit: 'LEO',
    altitude: '1,200 km',
    launched: 634,
    operational: 630,
    approved: 648,
    gen2Target: 7088,
    purpose: 'Enterprise broadband and government connectivity',
    status: 'operational',
    firstLaunch: 'February 2019',
    inclinationPlanes: '87.9\u00B0 (12 planes)',
    massPerSat: '~150 kg',
    designLife: '7 years',
    deorbitPlan: 'Propulsive deorbit; 25-year natural decay backup',
    fundingStatus: 'Merged with Eutelsat in 2023; combined entity',
    website: 'https://oneweb.net',
  },
  {
    name: 'Project Kuiper',
    operator: 'Amazon',
    country: 'USA',
    orbit: 'LEO',
    altitude: '590-630 km',
    launched: 2,
    operational: 2,
    approved: 3236,
    gen2Target: 7774,
    purpose: 'Global broadband internet service',
    status: 'deploying',
    firstLaunch: 'October 2023',
    inclinationPlanes: '30\u00B0, 40\u00B0, 51.9\u00B0 (multiple planes)',
    massPerSat: '~500 kg',
    designLife: '7 years',
    deorbitPlan: 'Propulsive deorbit; design for 355-day deorbit',
    fundingStatus: '$10B+ committed investment by Amazon',
    website: 'https://www.aboutamazon.com/what-we-do/devices-services/project-kuiper',
  },
  {
    name: 'Telesat Lightspeed',
    operator: 'Telesat',
    country: 'Canada',
    orbit: 'LEO',
    altitude: '1,015-1,325 km',
    launched: 0,
    operational: 0,
    approved: 198,
    gen2Target: null,
    purpose: 'Enterprise and government broadband',
    status: 'planned',
    firstLaunch: 'Expected 2026',
    inclinationPlanes: '98.98\u00B0, 50.88\u00B0 (6 planes polar, 5 inclined)',
    massPerSat: '~700 kg',
    designLife: '10 years',
    deorbitPlan: 'Propulsive deorbit capability',
    fundingStatus: 'C$2.14B federal loan + C$1.44B equity',
    website: 'https://www.telesat.com/leo-satellites/',
  },
  {
    name: 'G60 Starnet (Guowang)',
    operator: 'Shanghai Spacecom Satellite Technology (SSST)',
    country: 'China',
    orbit: 'LEO',
    altitude: '500-1,145 km',
    launched: 36,
    operational: 36,
    approved: 12000,
    gen2Target: 12000,
    purpose: 'Global broadband and IoT connectivity',
    status: 'deploying',
    firstLaunch: 'August 2024',
    inclinationPlanes: 'Multiple planes at various inclinations',
    massPerSat: '~300 kg',
    designLife: '5-7 years',
    deorbitPlan: 'TBD - active propulsion expected',
    fundingStatus: 'State-backed; Shanghai municipal government support',
    website: 'N/A',
  },
  {
    name: 'Guowang (GW)',
    operator: 'China SatNet',
    country: 'China',
    orbit: 'LEO',
    altitude: '500-1,145 km',
    launched: 0,
    operational: 0,
    approved: 12992,
    gen2Target: 12992,
    purpose: 'National broadband constellation',
    status: 'planned',
    firstLaunch: 'Expected 2025-2026',
    inclinationPlanes: 'Multiple shells across LEO',
    massPerSat: '~300 kg (estimated)',
    designLife: '5-7 years',
    deorbitPlan: 'TBD',
    fundingStatus: 'Chinese state-owned enterprise; fully state-funded',
    website: 'N/A',
  },
  {
    name: 'Rivada Space Network',
    operator: 'Rivada Networks',
    country: 'Germany',
    orbit: 'LEO',
    altitude: '1,000 km',
    launched: 0,
    operational: 0,
    approved: 600,
    gen2Target: null,
    purpose: 'Secure optical mesh network for enterprise & government',
    status: 'planned',
    firstLaunch: 'Expected 2026-2027',
    inclinationPlanes: '10 planes at 87.4\u00B0',
    massPerSat: '~500 kg',
    designLife: '7 years',
    deorbitPlan: 'Propulsive deorbit',
    fundingStatus: 'Private investment + Terran Orbital manufacturing contract',
    website: 'https://rivadaspace.com',
  },
  {
    name: 'Hanwha Systems',
    operator: 'Hanwha Systems',
    country: 'Germany',
    orbit: 'LEO',
    altitude: '500-600 km',
    launched: 0,
    operational: 0,
    approved: 2000,
    gen2Target: null,
    purpose: 'Broadband and aerospace connectivity',
    status: 'early-stage',
    firstLaunch: 'Expected 2027+',
    inclinationPlanes: 'TBD',
    massPerSat: 'TBD',
    designLife: 'TBD',
    deorbitPlan: 'TBD',
    fundingStatus: 'Acquired Phasor and OneWeb subsidiary technologies',
    website: 'https://www.hanwhasystems.com',
  },
];

// ── Static Data: Regulatory Bodies ──

export const REGULATORY_BODIES: RegulatoryBody[] = [
  {
    name: 'International Telecommunication Union',
    abbreviation: 'ITU',
    country: 'International',
    scope: 'Global frequency and orbit coordination',
    jurisdiction: 'International (193 member states)',
    role: 'The primary international body that coordinates GEO orbital slot allocation, frequency assignments, and prevents harmful interference between satellite networks. All satellite operators must file through their national administration to the ITU.',
    keyResponsibilities: [
      'GEO orbital slot coordination and assignment',
      'Radio frequency spectrum allocation (Radio Regulations)',
      'Advance Publication Information (API) filings',
      'Coordination and notification procedures',
      'Harmful interference resolution',
      'World Radiocommunication Conferences (WRC)',
    ],
    website: 'https://www.itu.int',
    filingTypes: ['API (Advance Publication)', 'CR/C (Coordination Request)', 'Notification', 'Due Diligence'],
    relevantTreaties: ['ITU Radio Regulations', 'ITU Constitution and Convention'],
  },
  {
    name: 'Federal Communications Commission',
    abbreviation: 'FCC',
    country: 'USA',
    scope: 'US domestic satellite licensing',
    jurisdiction: 'United States',
    role: 'Licenses all US satellite systems, grants market access to foreign satellites serving US markets, manages domestic spectrum allocation, and enforces orbital debris mitigation requirements for US-licensed satellites.',
    keyResponsibilities: [
      'US satellite system licensing (Part 25)',
      'Market access for non-US satellites',
      'Spectrum allocation for US operations',
      'Orbital debris mitigation rules (5-year deorbit rule)',
      'NGSO constellation processing rounds',
      'Space Bureau oversight of commercial space',
    ],
    website: 'https://www.fcc.gov',
    filingTypes: ['Space Station Application', 'Earth Station Application', 'Market Access Petition', 'Experimental License'],
    relevantTreaties: ['Communications Act of 1934', 'FCC Space Bureau Rules (47 CFR Part 25)'],
  },
  {
    name: 'Office of Communications',
    abbreviation: 'Ofcom',
    country: 'UK',
    scope: 'UK satellite licensing and spectrum management',
    jurisdiction: 'United Kingdom',
    role: 'Regulates UK satellite communications, manages UK spectrum allocations, and files on behalf of UK operators to the ITU. Oversees OneWeb and other UK-licensed constellations.',
    keyResponsibilities: [
      'UK satellite network filings to ITU',
      'Spectrum management and assignment',
      'Licensing of satellite earth stations',
      'Enforcement of spectrum regulations',
      'International frequency coordination',
    ],
    website: 'https://www.ofcom.org.uk',
    filingTypes: ['Satellite (Non-geostationary) License', 'Satellite (Geostationary) License', 'Earth Station License'],
    relevantTreaties: ['Communications Act 2003', 'Wireless Telegraphy Act 2006'],
  },
  {
    name: 'Centre National d\'Etudes Spatiales',
    abbreviation: 'CNES',
    country: 'France',
    scope: 'French space policy and satellite regulation',
    jurisdiction: 'France',
    role: 'France\'s national space agency responsible for implementing the French Space Operations Act. CNES oversees technical standards, orbital debris mitigation compliance, and coordinates French ITU filings including Eutelsat operations.',
    keyResponsibilities: [
      'French Space Operations Act enforcement',
      'Technical authorization of space objects',
      'Orbital debris mitigation oversight',
      'ITU filing coordination for French operators',
      'Launch and re-entry authorization',
    ],
    website: 'https://cnes.fr',
    filingTypes: ['Launch Authorization', 'Orbital Operations Authorization', 'Transfer of Operations'],
    relevantTreaties: ['French Space Operations Act (2008)', 'ESA Convention'],
  },
  {
    name: 'European Space Agency',
    abbreviation: 'ESA',
    country: 'International',
    scope: 'European space coordination and programs',
    jurisdiction: 'European (22 member states)',
    role: 'Coordinates European space activities, sets space debris mitigation guidelines, operates the Space Debris Office, and manages European GNSS programs (Galileo). Does not directly regulate but sets technical standards.',
    keyResponsibilities: [
      'Space debris guidelines and monitoring',
      'European GNSS (Galileo) program management',
      'Space situational awareness (SSA)',
      'Space sustainability standards',
      'Copernicus Earth observation program',
    ],
    website: 'https://www.esa.int',
    filingTypes: ['N/A - Advisory and programmatic role'],
    relevantTreaties: ['ESA Convention', 'EU Space Regulation'],
  },
  {
    name: 'United Nations Office for Outer Space Affairs',
    abbreviation: 'UNOOSA',
    country: 'International',
    scope: 'International space law and UN treaties',
    jurisdiction: 'International (UN Member States)',
    role: 'Maintains the UN Register of Objects Launched into Outer Space, supports COPUOS (Committee on the Peaceful Uses of Outer Space), and provides the framework for the Outer Space Treaty and related agreements.',
    keyResponsibilities: [
      'UN Registry of Space Objects',
      'COPUOS secretariat',
      'Space law guidance and capacity building',
      'Long-Term Sustainability Guidelines for Outer Space',
      'Space debris mitigation guidelines (IADC-based)',
    ],
    website: 'https://www.unoosa.org',
    filingTypes: ['Registration Convention notification', 'Liability Convention claims'],
    relevantTreaties: ['Outer Space Treaty (1967)', 'Registration Convention (1975)', 'Liability Convention (1972)', 'Rescue Agreement (1968)'],
  },
  {
    name: 'Indian Space Research Organisation / IN-SPACe',
    abbreviation: 'ISRO / IN-SPACe',
    country: 'India',
    scope: 'Indian satellite authorization and spectrum',
    jurisdiction: 'India',
    role: 'ISRO manages India\'s space program including GAGAN navigation augmentation. IN-SPACe (Indian National Space Promotion and Authorization Centre) is the regulatory body that authorizes private space activities in India.',
    keyResponsibilities: [
      'Authorization of private satellite operators',
      'ITU filings for Indian satellite networks',
      'GSAT and IRNSS constellation management',
      'Space Situational Awareness coordination',
      'Private space activity promotion and regulation',
    ],
    website: 'https://www.isro.gov.in',
    filingTypes: ['Space Activity Authorization', 'Frequency Assignment', 'Launch License'],
    relevantTreaties: ['Indian Space Activities Bill (pending)', 'Indian Satellite Communications Policy'],
  },
];

// ── Constants ──

export const CONGESTION_STYLES: Record<CongestionLevel, { bg: string; text: string; border: string; barColor: string }> = {
  low: { bg: 'bg-green-900/20', text: 'text-green-400', border: 'border-green-500/30', barColor: 'from-green-500 to-green-400' },
  moderate: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-500/30', barColor: 'from-yellow-500 to-yellow-400' },
  high: { bg: 'bg-orange-900/20', text: 'text-orange-400', border: 'border-orange-500/30', barColor: 'from-orange-500 to-orange-400' },
  critical: { bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-500/30', barColor: 'from-red-500 to-red-400' },
};

export const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'text-green-400' },
  limited: { label: 'Limited', color: 'text-yellow-400' },
  scarce: { label: 'Scarce', color: 'text-orange-400' },
  full: { label: 'Full', color: 'text-red-400' },
};

export const EVENT_TYPE_STYLES: Record<OrbitalEventType, { label: string; icon: string; color: string; bg: string }> = {
  launch: { label: 'Launch', icon: '\u{1F680}', color: 'text-green-400', bg: 'bg-green-900/20' },
  reentry: { label: 'Re-entry', icon: '\u{2604}\u{FE0F}', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  conjunction: { label: 'Conjunction', icon: '\u{26A0}\u{FE0F}', color: 'text-red-400', bg: 'bg-red-900/20' },
  debris_event: { label: 'Debris Event', icon: '\u{1F4A5}', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  maneuver: { label: 'Maneuver', icon: '\u{1F504}', color: 'text-blue-400', bg: 'bg-blue-900/20' },
};

export const CONFIDENCE_STYLES: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmed', color: 'text-green-400' },
  tentative: { label: 'Tentative', color: 'text-yellow-400' },
  estimated: { label: 'Estimated', color: 'text-orange-400' },
};

export const COUNTRY_FLAGS: Record<string, string> = {
  USA: '\u{1F1FA}\u{1F1F8}',
  UK: '\u{1F1EC}\u{1F1E7}',
  China: '\u{1F1E8}\u{1F1F3}',
  France: '\u{1F1EB}\u{1F1F7}',
  Luxembourg: '\u{1F1F1}\u{1F1FA}',
  Germany: '\u{1F1E9}\u{1F1EA}',
  Japan: '\u{1F1EF}\u{1F1F5}',
  India: '\u{1F1EE}\u{1F1F3}',
  Russia: '\u{1F1F7}\u{1F1FA}',
  Canada: '\u{1F1E8}\u{1F1E6}',
};

// ── Export column definitions ──

export const OPERATOR_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'country', label: 'Country' },
  { key: 'constellationName', label: 'Constellation' },
  { key: 'primaryPurpose', label: 'Orbit Type' },
  { key: 'totalActive', label: 'Total Active' },
  { key: 'leoCount', label: 'LEO Count' },
  { key: 'meoCount', label: 'MEO Count' },
  { key: 'geoCount', label: 'GEO Count' },
  { key: 'planned1Year', label: 'Planned 1 Year' },
  { key: 'planned5Year', label: 'Planned 5 Year' },
];

export const EVENT_EXPORT_COLUMNS = [
  { key: 'missionName', label: 'Name' },
  { key: 'eventType', label: 'Type' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'expectedDate', label: 'Date' },
  { key: 'operatorName', label: 'Operator' },
  { key: 'satelliteCount', label: 'Satellites' },
  { key: 'dateConfidence', label: 'Confidence' },
  { key: 'description', label: 'Description' },
];
