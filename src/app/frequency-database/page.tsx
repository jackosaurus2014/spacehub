'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import EmptyState from '@/components/ui/EmptyState';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface FrequencyBand {
  id: string;
  name: string;
  range: string;
  rangeGHz: [number, number];
  color: string;
  description: string;
  applications: string[];
}

interface FrequencyAllocation {
  id: number;
  frequencyStart: number; // MHz
  frequencyEnd: number;   // MHz
  band: string;
  serviceType: string;
  serviceCode: string;
  primaryOperator: string;
  satelliteSystem: string;
  region: string;
  status: 'Active' | 'Planned' | 'Coordinating';
  interferenceRisk: 'Low' | 'Medium' | 'High';
  notes: string;
}

interface ConstellationSummary {
  name: string;
  operator: string;
  bands: string[];
  satellites: string;
  orbitType: string;
  status: string;
  licensedBy: string;
  description: string;
}

interface ITUStep {
  step: number;
  title: string;
  description: string;
  duration: string;
}

type SortField = 'frequencyStart' | 'primaryOperator' | 'status' | 'band' | 'serviceCode';
type SortDirection = 'asc' | 'desc';

// ────────────────────────────────────────
// Data - Frequency Bands
// ────────────────────────────────────────

const FREQUENCY_BANDS: FrequencyBand[] = [
  {
    id: 'l-band',
    name: 'L-band',
    range: '1-2 GHz',
    rangeGHz: [1, 2],
    color: 'from-green-400 to-emerald-600',
    description: 'Used for mobile satellite services, GPS navigation, and satellite phone communications. Excellent propagation through atmosphere with lower data rates.',
    applications: ['Mobile satellite services', 'GPS/GNSS navigation', 'Satellite phones (Iridium, Thuraya)', 'ADS-B aircraft tracking'],
  },
  {
    id: 's-band',
    name: 'S-band',
    range: '2-4 GHz',
    rangeGHz: [2, 4],
    color: 'from-teal-400 to-cyan-600',
    description: 'Weather satellites, ISS communications, and some mobile broadband. Good balance of bandwidth and atmospheric penetration.',
    applications: ['Weather satellite data', 'ISS communications', 'NASA deep space (S-band up)', 'Satellite radio (SiriusXM)'],
  },
  {
    id: 'c-band',
    name: 'C-band',
    range: '4-8 GHz',
    rangeGHz: [4, 8],
    color: 'from-blue-400 to-indigo-600',
    description: 'Traditional workhorse for fixed satellite services and TV distribution. Resilient to rain fade, widely used in tropical regions.',
    applications: ['Fixed satellite services', 'TV distribution/contribution', 'VSAT networks', 'Telephony backhaul'],
  },
  {
    id: 'x-band',
    name: 'X-band',
    range: '8-12 GHz',
    rangeGHz: [8, 12],
    color: 'from-indigo-400 to-purple-600',
    description: 'Primarily reserved for military communications and Earth observation satellites. High reliability and security applications.',
    applications: ['Military SATCOM (MUOS, WGS)', 'Earth observation (SAR)', 'Government communications', 'Space research'],
  },
  {
    id: 'ku-band',
    name: 'Ku-band',
    range: '12-18 GHz',
    rangeGHz: [12, 18],
    color: 'from-purple-400 to-pink-600',
    description: 'Most popular band for direct-to-home TV, VSAT broadband, and maritime/aero connectivity. Moderate rain fade susceptibility.',
    applications: ['Direct-to-home TV (DTH)', 'VSAT broadband', 'Maritime VSAT', 'In-flight connectivity'],
  },
  {
    id: 'ka-band',
    name: 'Ka-band',
    range: '26-40 GHz',
    rangeGHz: [26, 40],
    color: 'from-pink-400 to-rose-600',
    description: 'High-throughput satellite (HTS) band enabling gigabit-class connectivity. Used by next-gen broadband constellations. Susceptible to rain fade.',
    applications: ['High-throughput satellites (HTS)', '5G backhaul', 'LEO broadband (Starlink, Kuiper)', 'Military Ka-band SATCOM'],
  },
  {
    id: 'v-band',
    name: 'V-band',
    range: '40-75 GHz',
    rangeGHz: [40, 75],
    color: 'from-rose-400 to-red-600',
    description: 'Next-generation band for LEO mega-constellations seeking massive capacity. High atmospheric attenuation limits to clear-sky conditions.',
    applications: ['Next-gen LEO constellations', 'Inter-satellite links', 'High-capacity feeder links', 'Point-to-point backhaul'],
  },
  {
    id: 'q-band',
    name: 'Q-band',
    range: '33-50 GHz',
    rangeGHz: [33, 50],
    color: 'from-amber-400 to-orange-600',
    description: 'Future high-throughput satellite capacity band. Overlaps with Ka and V bands. Being explored for next-generation feeder links.',
    applications: ['Future HTS capacity', 'Feeder link augmentation', 'Research and development', 'Next-gen gateway links'],
  },
];

// ────────────────────────────────────────
// Data - 45 Frequency Allocations
// ────────────────────────────────────────

const FREQUENCY_ALLOCATIONS: FrequencyAllocation[] = [
  // L-band allocations
  { id: 1, frequencyStart: 1525, frequencyEnd: 1559, band: 'L-band', serviceType: 'Mobile Satellite Service', serviceCode: 'MSS', primaryOperator: 'Inmarsat', satelliteSystem: 'Inmarsat-4/6', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Downlink for Inmarsat BGAN and SwiftBroadband' },
  { id: 2, frequencyStart: 1610, frequencyEnd: 1618.725, band: 'L-band', serviceType: 'Mobile Satellite Service', serviceCode: 'MSS', primaryOperator: 'Iridium', satelliteSystem: 'Iridium NEXT', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Iridium uplink/downlink for voice and data' },
  { id: 3, frequencyStart: 1559, frequencyEnd: 1610, band: 'L-band', serviceType: 'Radionavigation Satellite', serviceCode: 'RNSS', primaryOperator: 'GPS/Galileo/GLONASS', satelliteSystem: 'Multiple GNSS', region: 'Global', status: 'Active', interferenceRisk: 'Medium', notes: 'Shared GNSS band - GPS L1, Galileo E1, GLONASS L1' },
  { id: 4, frequencyStart: 1668, frequencyEnd: 1675, band: 'L-band', serviceType: 'Mobile Satellite Service', serviceCode: 'MSS', primaryOperator: 'Ligado Networks', satelliteSystem: 'SkyTerra', region: 'ITU Region 2', status: 'Coordinating', interferenceRisk: 'High', notes: 'Controversial - adjacent to GPS band, interference concerns' },
  { id: 5, frequencyStart: 1618.725, frequencyEnd: 1626.5, band: 'L-band', serviceType: 'Mobile Satellite Service', serviceCode: 'MSS', primaryOperator: 'Iridium', satelliteSystem: 'Iridium NEXT', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Iridium primary allocation' },

  // S-band allocations
  { id: 6, frequencyStart: 2025, frequencyEnd: 2110, band: 'S-band', serviceType: 'Space Operation Service', serviceCode: 'SOS', primaryOperator: 'NASA/ESA', satelliteSystem: 'Multiple LEO/GEO', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Spacecraft TT&C uplink' },
  { id: 7, frequencyStart: 2200, frequencyEnd: 2290, band: 'S-band', serviceType: 'Space Research Service', serviceCode: 'SRS', primaryOperator: 'NASA/ESA', satelliteSystem: 'Deep Space Network', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Space research downlink, planetary missions' },
  { id: 8, frequencyStart: 2310, frequencyEnd: 2360, band: 'S-band', serviceType: 'Broadcasting Satellite', serviceCode: 'BSS', primaryOperator: 'SiriusXM', satelliteSystem: 'SXM-7/8', region: 'ITU Region 2', status: 'Active', interferenceRisk: 'Medium', notes: 'Satellite radio broadcasting - CONUS' },
  { id: 9, frequencyStart: 2483.5, frequencyEnd: 2500, band: 'S-band', serviceType: 'Mobile Satellite Service', serviceCode: 'MSS', primaryOperator: 'Globalstar', satelliteSystem: 'Globalstar-2', region: 'Global', status: 'Active', interferenceRisk: 'Medium', notes: 'Globalstar downlink - also used for IoT/M2M' },
  { id: 10, frequencyStart: 2170, frequencyEnd: 2200, band: 'S-band', serviceType: 'Mobile Satellite Service', serviceCode: 'MSS', primaryOperator: 'DISH Network', satelliteSystem: 'EchoStar XXI', region: 'ITU Region 1', status: 'Active', interferenceRisk: 'Medium', notes: 'S-band MSS for European mobile broadband' },

  // C-band allocations
  { id: 11, frequencyStart: 3700, frequencyEnd: 4200, band: 'C-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Intelsat/SES', satelliteSystem: 'Multiple GEO', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'Traditional C-band downlink - under pressure from 5G (3.7-3.98 GHz cleared in US)' },
  { id: 12, frequencyStart: 5925, frequencyEnd: 6425, band: 'C-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Intelsat/SES', satelliteSystem: 'Multiple GEO', region: 'Global', status: 'Active', interferenceRisk: 'Medium', notes: 'C-band uplink - critical for video distribution' },
  { id: 13, frequencyStart: 3400, frequencyEnd: 3700, band: 'C-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Various', satelliteSystem: 'Multiple GEO', region: 'ITU Region 1/3', status: 'Active', interferenceRisk: 'High', notes: 'Extended C-band being repurposed for 5G in many countries' },
  { id: 14, frequencyStart: 4500, frequencyEnd: 4800, band: 'C-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Eutelsat', satelliteSystem: 'Eutelsat fleet', region: 'ITU Region 1', status: 'Active', interferenceRisk: 'Low', notes: 'C-band extension downlink for African/Asian coverage' },

  // X-band allocations
  { id: 15, frequencyStart: 7900, frequencyEnd: 8400, band: 'X-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'US DoD', satelliteSystem: 'WGS (Wideband Global SATCOM)', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Military X-band uplink - WGS constellation' },
  { id: 16, frequencyStart: 7250, frequencyEnd: 7750, band: 'X-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'US DoD', satelliteSystem: 'WGS', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Military X-band downlink' },
  { id: 17, frequencyStart: 8025, frequencyEnd: 8400, band: 'X-band', serviceType: 'Earth Exploration Satellite', serviceCode: 'EESS', primaryOperator: 'ESA/NASA', satelliteSystem: 'Sentinel/Landsat', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'SAR and optical EO data downlink' },
  { id: 18, frequencyStart: 9300, frequencyEnd: 9800, band: 'X-band', serviceType: 'Earth Exploration Satellite', serviceCode: 'EESS', primaryOperator: 'DLR/CONAE', satelliteSystem: 'TerraSAR-X/SAOCOM', region: 'Global', status: 'Active', interferenceRisk: 'Medium', notes: 'SAR active sensing band' },

  // Ku-band allocations
  { id: 19, frequencyStart: 10700, frequencyEnd: 11700, band: 'Ku-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SES', satelliteSystem: 'SES Astra fleet', region: 'ITU Region 1', status: 'Active', interferenceRisk: 'Medium', notes: 'Ku-band downlink for European DTH TV' },
  { id: 20, frequencyStart: 11700, frequencyEnd: 12200, band: 'Ku-band', serviceType: 'Broadcasting Satellite', serviceCode: 'BSS', primaryOperator: 'DIRECTV/DISH', satelliteSystem: 'DIRECTV fleet', region: 'ITU Region 2', status: 'Active', interferenceRisk: 'Medium', notes: 'DTH TV broadcasting Americas' },
  { id: 21, frequencyStart: 14000, frequencyEnd: 14500, band: 'Ku-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Multiple', satelliteSystem: 'Various GEO/LEO', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'Ku-band uplink - heavily congested' },
  { id: 22, frequencyStart: 12750, frequencyEnd: 13250, band: 'Ku-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Eutelsat', satelliteSystem: 'Eutelsat fleet', region: 'ITU Region 1', status: 'Active', interferenceRisk: 'Medium', notes: 'Ku-band uplink for European VSAT' },
  { id: 23, frequencyStart: 10700, frequencyEnd: 12700, band: 'Ku-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SpaceX', satelliteSystem: 'Starlink Gen1', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'Starlink user terminal downlink - Ku-band' },
  { id: 24, frequencyStart: 14000, frequencyEnd: 14500, band: 'Ku-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SpaceX', satelliteSystem: 'Starlink Gen1', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'Starlink user terminal uplink - Ku-band' },
  { id: 25, frequencyStart: 10700, frequencyEnd: 12700, band: 'Ku-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'OneWeb', satelliteSystem: 'OneWeb Gen1', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'OneWeb user downlink - Ku-band' },
  { id: 26, frequencyStart: 12750, frequencyEnd: 13250, band: 'Ku-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'OneWeb', satelliteSystem: 'OneWeb Gen1', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'OneWeb user uplink - Ku-band' },

  // Ka-band allocations
  { id: 27, frequencyStart: 17700, frequencyEnd: 20200, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Viasat', satelliteSystem: 'ViaSat-3', region: 'Global', status: 'Active', interferenceRisk: 'Medium', notes: 'Ka-band downlink - ViaSat-3 HTS constellation' },
  { id: 28, frequencyStart: 27500, frequencyEnd: 30000, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Viasat', satelliteSystem: 'ViaSat-3', region: 'Global', status: 'Active', interferenceRisk: 'Medium', notes: 'Ka-band uplink - ViaSat-3 HTS' },
  { id: 29, frequencyStart: 17800, frequencyEnd: 20200, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SES', satelliteSystem: 'O3b mPOWER', region: 'Global', status: 'Active', interferenceRisk: 'Medium', notes: 'O3b mPOWER MEO Ka-band downlink' },
  { id: 30, frequencyStart: 27500, frequencyEnd: 30000, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SES', satelliteSystem: 'O3b mPOWER', region: 'Global', status: 'Active', interferenceRisk: 'Medium', notes: 'O3b mPOWER MEO Ka-band uplink' },
  { id: 31, frequencyStart: 17700, frequencyEnd: 20200, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SpaceX', satelliteSystem: 'Starlink Gen2', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'Starlink gateway downlink - Ka-band' },
  { id: 32, frequencyStart: 27500, frequencyEnd: 29100, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SpaceX', satelliteSystem: 'Starlink Gen2', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'Starlink gateway uplink - Ka-band' },
  { id: 33, frequencyStart: 17700, frequencyEnd: 20200, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Amazon', satelliteSystem: 'Project Kuiper', region: 'Global', status: 'Planned', interferenceRisk: 'High', notes: 'Kuiper Ka-band downlink - FCC authorized 2020' },
  { id: 34, frequencyStart: 27500, frequencyEnd: 30000, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Amazon', satelliteSystem: 'Project Kuiper', region: 'Global', status: 'Planned', interferenceRisk: 'High', notes: 'Kuiper Ka-band uplink' },
  { id: 35, frequencyStart: 17800, frequencyEnd: 18600, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Telesat', satelliteSystem: 'Telesat Lightspeed', region: 'Global', status: 'Planned', interferenceRisk: 'Medium', notes: 'Lightspeed Ka-band downlink - 298 LEO sats' },
  { id: 36, frequencyStart: 27500, frequencyEnd: 29500, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Telesat', satelliteSystem: 'Telesat Lightspeed', region: 'Global', status: 'Planned', interferenceRisk: 'Medium', notes: 'Lightspeed Ka-band uplink' },
  { id: 37, frequencyStart: 17700, frequencyEnd: 19700, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'OneWeb', satelliteSystem: 'OneWeb Gen1', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'OneWeb gateway Ka-band downlink' },
  { id: 38, frequencyStart: 27500, frequencyEnd: 29500, band: 'Ka-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'OneWeb', satelliteSystem: 'OneWeb Gen1', region: 'Global', status: 'Active', interferenceRisk: 'High', notes: 'OneWeb gateway Ka-band uplink' },
  { id: 39, frequencyStart: 26500, frequencyEnd: 27000, band: 'Ka-band', serviceType: 'Earth Exploration Satellite', serviceCode: 'EESS', primaryOperator: 'ESA', satelliteSystem: 'Copernicus/MetOp', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Ka-band for high-rate EO data downlink' },

  // V-band allocations
  { id: 40, frequencyStart: 37500, frequencyEnd: 42500, band: 'V-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SpaceX', satelliteSystem: 'Starlink Gen2', region: 'Global', status: 'Coordinating', interferenceRisk: 'Medium', notes: 'Starlink V-band filing for Gen2 capacity expansion' },
  { id: 41, frequencyStart: 47200, frequencyEnd: 50200, band: 'V-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'SpaceX', satelliteSystem: 'Starlink Gen2', region: 'Global', status: 'Coordinating', interferenceRisk: 'Medium', notes: 'Starlink V-band uplink for Gen2' },
  { id: 42, frequencyStart: 37500, frequencyEnd: 42000, band: 'V-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Amazon', satelliteSystem: 'Project Kuiper', region: 'Global', status: 'Planned', interferenceRisk: 'Medium', notes: 'Kuiper V-band capacity expansion filing' },
  { id: 43, frequencyStart: 40000, frequencyEnd: 42000, band: 'V-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Boeing', satelliteSystem: 'Boeing V-band', region: 'Global', status: 'Coordinating', interferenceRisk: 'Low', notes: 'Boeing 147-satellite V-band constellation' },

  // Q-band allocations
  { id: 44, frequencyStart: 33000, frequencyEnd: 36000, band: 'Q-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'Eutelsat', satelliteSystem: 'Eutelsat KONNECT VHTS', region: 'ITU Region 1', status: 'Coordinating', interferenceRisk: 'Low', notes: 'Q-band feeder link trials for next-gen HTS' },
  { id: 45, frequencyStart: 33000, frequencyEnd: 36000, band: 'Q-band', serviceType: 'Fixed Satellite Service', serviceCode: 'FSS', primaryOperator: 'ESA', satelliteSystem: 'Alphasat TDP5', region: 'ITU Region 1', status: 'Active', interferenceRisk: 'Low', notes: 'Q/V-band propagation experiment payload' },
  { id: 46, frequencyStart: 37500, frequencyEnd: 40000, band: 'Q-band', serviceType: 'Space Research Service', serviceCode: 'SRS', primaryOperator: 'NASA', satelliteSystem: 'LCRD', region: 'Global', status: 'Active', interferenceRisk: 'Low', notes: 'Laser Communications Relay Demo - Ka/Q-band backup' },
];

// ────────────────────────────────────────
// Data - Constellation Summaries
// ────────────────────────────────────────

const CONSTELLATION_SUMMARIES: ConstellationSummary[] = [
  {
    name: 'Starlink',
    operator: 'SpaceX',
    bands: ['Ku-band', 'Ka-band', 'V-band'],
    satellites: '12,000+ (Gen1: 4,408 / Gen2: 7,500)',
    orbitType: 'LEO (540-570 km)',
    status: 'Operational / Expanding',
    licensedBy: 'FCC (USA)',
    description: 'Largest LEO broadband constellation. Ku-band for user links, Ka-band for gateway feeder links. V-band filings for Gen2 capacity expansion. Laser inter-satellite links on newer sats.',
  },
  {
    name: 'OneWeb',
    operator: 'Eutelsat OneWeb',
    bands: ['Ku-band', 'Ka-band'],
    satellites: '648 (Gen1 complete)',
    orbitType: 'LEO (1,200 km)',
    status: 'Operational',
    licensedBy: 'Ofcom (UK)',
    description: 'Global LEO broadband constellation. Ku-band for user terminals, Ka-band for gateway links. Focus on enterprise, government, maritime, and aviation markets.',
  },
  {
    name: 'Project Kuiper',
    operator: 'Amazon',
    bands: ['Ka-band', 'V-band'],
    satellites: '3,236 planned',
    orbitType: 'LEO (590-630 km)',
    status: 'Pre-operational (prototypes launched)',
    licensedBy: 'FCC (USA)',
    description: 'Amazon mega-constellation for consumer and enterprise broadband. Ka-band primary, V-band for additional capacity. Must deploy 50% by 2026 per FCC license.',
  },
  {
    name: 'O3b mPOWER',
    operator: 'SES',
    bands: ['Ka-band'],
    satellites: '11 (MEO constellation)',
    orbitType: 'MEO (8,062 km)',
    status: 'Operational',
    licensedBy: 'FCC (USA) / Luxembourg',
    description: 'Medium Earth Orbit Ka-band HTS constellation. Software-defined, steerable beams. Targeting enterprise, government, and mobile network operator markets with low-latency connectivity.',
  },
  {
    name: 'Telesat Lightspeed',
    operator: 'Telesat',
    bands: ['Ka-band'],
    satellites: '298 planned',
    orbitType: 'LEO (1,015-1,325 km)',
    status: 'Pre-deployment',
    licensedBy: 'ISED (Canada)',
    description: 'Canadian LEO broadband constellation focused on enterprise and government. Ka-band with advanced digital processing. Partnership with MDA for manufacturing.',
  },
  {
    name: 'Iridium NEXT',
    operator: 'Iridium Communications',
    bands: ['L-band'],
    satellites: '66 active + 9 spares',
    orbitType: 'LEO (780 km)',
    status: 'Operational',
    licensedBy: 'FCC (USA)',
    description: 'Only satellite constellation providing true global coverage including polar regions. L-band for voice, data, SBD messaging, and Iridium Certus broadband. Cross-linked mesh network.',
  },
];

// ────────────────────────────────────────
// Data - ITU Filing Process
// ────────────────────────────────────────

const ITU_FILING_STEPS: ITUStep[] = [
  {
    step: 1,
    title: 'Advance Publication Information (API)',
    description: 'The administrating country submits an Advance Publication Information to the ITU Radiocommunication Bureau. This notifies other administrations of the planned satellite system and its frequency use, allowing early identification of potential interference issues.',
    duration: '0-2 years',
  },
  {
    step: 2,
    title: 'Coordination Request (CR)',
    description: 'A detailed Coordination Request is filed within 2 years of the API. This includes technical parameters such as orbital location, antenna patterns, power levels, and coverage areas. The ITU publishes the CR and affected administrations have 4 months to respond with interference concerns.',
    duration: '2-5 years',
  },
  {
    step: 3,
    title: 'Notification and Recording',
    description: 'Once coordination is completed (or deemed complete), the administration notifies the ITU for formal recording in the Master International Frequency Register (MIFR). This provides international recognition and protection of the frequency assignment. The satellite must be brought into use within the regulatory deadline.',
    duration: '5-7+ years',
  },
];

// ────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────

function formatFrequency(mhz: number): string {
  if (mhz >= 1000) {
    const ghz = mhz / 1000;
    return ghz % 1 === 0 ? `${ghz.toFixed(0)} GHz` : `${ghz.toFixed(1)} GHz`;
  }
  return `${mhz.toFixed(0)} MHz`;
}

function formatFrequencyRange(start: number, end: number): string {
  return `${formatFrequency(start)} - ${formatFrequency(end)}`;
}

// ────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Planned: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Coordinating: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
      {status}
    </span>
  );
}

function InterferenceIndicator({ risk }: { risk: string }) {
  const config: Record<string, { color: string; bars: number; label: string }> = {
    Low: { color: 'bg-emerald-400', bars: 1, label: 'Low Risk' },
    Medium: { color: 'bg-amber-400', bars: 2, label: 'Medium Risk' },
    High: { color: 'bg-red-400', bars: 3, label: 'High Risk' },
  };
  const c = config[risk] || config.Low;
  return (
    <div className="flex items-center gap-2" title={`Interference: ${c.label}`}>
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={`w-1.5 rounded-sm transition-all ${bar <= c.bars ? c.color : 'bg-slate-600/40'}`}
            style={{ height: `${bar * 5 + 2}px` }}
          />
        ))}
      </div>
      <span className={`text-xs ${risk === 'High' ? 'text-red-300' : risk === 'Medium' ? 'text-amber-300' : 'text-emerald-300'}`}>
        {c.label}
      </span>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function FrequencyDatabasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [bandFilter, setBandFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('frequencyStart');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeSection, setActiveSection] = useState<'overview' | 'allocations' | 'constellations' | 'itu' | 'all'>('all');

  // Unique values for filters
  const uniqueBands = useMemo(() => Array.from(new Set(FREQUENCY_ALLOCATIONS.map(a => a.band))).sort(), []);
  const uniqueServices = useMemo(() => Array.from(new Set(FREQUENCY_ALLOCATIONS.map(a => a.serviceCode))).sort(), []);
  const uniqueRegions = useMemo(() => Array.from(new Set(FREQUENCY_ALLOCATIONS.map(a => a.region))).sort(), []);

  // Filtered and sorted allocations
  const filteredAllocations = useMemo(() => {
    let results = [...FREQUENCY_ALLOCATIONS];

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(a =>
        a.primaryOperator.toLowerCase().includes(q) ||
        a.satelliteSystem.toLowerCase().includes(q) ||
        a.serviceType.toLowerCase().includes(q) ||
        a.serviceCode.toLowerCase().includes(q) ||
        a.band.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q) ||
        `${a.frequencyStart}`.includes(q) ||
        `${a.frequencyEnd}`.includes(q) ||
        formatFrequency(a.frequencyStart).toLowerCase().includes(q) ||
        formatFrequency(a.frequencyEnd).toLowerCase().includes(q)
      );
    }

    // Apply filters
    if (bandFilter !== 'all') {
      results = results.filter(a => a.band === bandFilter);
    }
    if (serviceFilter !== 'all') {
      results = results.filter(a => a.serviceCode === serviceFilter);
    }
    if (regionFilter !== 'all') {
      results = results.filter(a => a.region === regionFilter);
    }

    // Apply sort
    results.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'frequencyStart':
          cmp = a.frequencyStart - b.frequencyStart;
          break;
        case 'primaryOperator':
          cmp = a.primaryOperator.localeCompare(b.primaryOperator);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'band':
          cmp = a.band.localeCompare(b.band);
          break;
        case 'serviceCode':
          cmp = a.serviceCode.localeCompare(b.serviceCode);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return results;
  }, [searchQuery, bandFilter, serviceFilter, regionFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-600 ml-1">&#x25B4;&#x25BE;</span>;
    return <span className="text-cyan-400 ml-1">{sortDirection === 'asc' ? '\u25B4' : '\u25BE'}</span>;
  };

  const showOverview = activeSection === 'all' || activeSection === 'overview';
  const showAllocations = activeSection === 'all' || activeSection === 'allocations';
  const showConstellations = activeSection === 'all' || activeSection === 'constellations';
  const showITU = activeSection === 'all' || activeSection === 'itu';

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <AnimatedPageHeader
          title="Satellite Frequency Allocation Database"
          subtitle="Searchable database of satellite frequency allocations across all major bands. Browse ITU filings, constellation frequency plans, and interference risk analysis."
          icon={<span>📡</span>}
          accentColor="purple"
        />

        {/* Section Navigation */}
        <ScrollReveal>
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'all' as const, label: 'All Sections' },
            { id: 'overview' as const, label: 'Band Overview' },
            { id: 'allocations' as const, label: 'Allocation Table' },
            { id: 'constellations' as const, label: 'Constellations' },
            { id: 'itu' as const, label: 'ITU Filing Process' },
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
        </ScrollReveal>

        {/* ──────────────────────────────────────── */}
        {/* Section 1: Frequency Band Overview       */}
        {/* ──────────────────────────────────────── */}
        {showOverview && (
          <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
              <span className="text-purple-400">&#9632;</span>
              Frequency Band Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FREQUENCY_BANDS.map(band => (
                <div key={band.id} className="card p-5 group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${band.color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                      {band.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{band.name}</h3>
                      <p className="text-xs text-slate-400">{band.range}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {band.description}
                  </p>
                  <div className="border-t border-slate-700/50 pt-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Applications</p>
                    <ul className="space-y-1">
                      {band.applications.map((app, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className={`mt-1 w-1 h-1 rounded-full bg-gradient-to-r ${band.color} flex-shrink-0`} />
                          {app}
                        </li>
                      ))}
                    </ul>

        <RelatedModules modules={PAGE_RELATIONS['frequency-database']} />
                  </div>
                </div>
              ))}
            </div>
          </section>
          </ScrollReveal>
        )}

        {/* ──────────────────────────────────────── */}
        {/* Section 2: Allocation Table               */}
        {/* ──────────────────────────────────────── */}
        {showAllocations && (
          <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
              <span className="text-cyan-400">&#9632;</span>
              Frequency Allocation Table
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({filteredAllocations.length} of {FREQUENCY_ALLOCATIONS.length} entries)
              </span>
            </h2>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by frequency, operator, system, or service type..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={bandFilter}
                onChange={(e) => setBandFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition-colors"
              >
                <option value="all">All Bands</option>
                {uniqueBands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition-colors"
              >
                <option value="all">All Service Types</option>
                {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 transition-colors"
              >
                <option value="all">All Regions</option>
                {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              {(bandFilter !== 'all' || serviceFilter !== 'all' || regionFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setBandFilter('all');
                    setServiceFilter('all');
                    setRegionFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                        onClick={() => handleSort('frequencyStart')}
                      >
                        Frequency Range <SortIcon field="frequencyStart" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                        onClick={() => handleSort('band')}
                      >
                        Band <SortIcon field="band" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                        onClick={() => handleSort('serviceCode')}
                      >
                        Service <SortIcon field="serviceCode" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                        onClick={() => handleSort('primaryOperator')}
                      >
                        Operator / System <SortIcon field="primaryOperator" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Region
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        Status <SortIcon field="status" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Interference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {filteredAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12">
                          <EmptyState
                            icon={<span className="text-4xl">📡</span>}
                            title="No allocations found"
                            description="No allocations match your search criteria. Try adjusting your filters."
                            action={
                              <button
                                onClick={() => {
                                  setSearchQuery('');
                                  setBandFilter('all');
                                  setServiceFilter('all');
                                  setRegionFilter('all');
                                }}
                                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                              >
                                Clear all filters
                              </button>
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredAllocations.map(alloc => (
                        <tr key={alloc.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs text-slate-200">
                              {formatFrequencyRange(alloc.frequencyStart, alloc.frequencyEnd)}
                            </div>
                            <div className="font-mono text-xs text-slate-500 mt-0.5">
                              {alloc.frequencyStart.toLocaleString()} - {alloc.frequencyEnd.toLocaleString()} MHz
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-300 font-medium">{alloc.band}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-medium text-purple-300">{alloc.serviceCode}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{alloc.serviceType}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-200 font-medium">{alloc.primaryOperator}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{alloc.satelliteSystem}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-400">{alloc.region}</span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={alloc.status} />
                          </td>
                          <td className="px-4 py-3">
                            <InterferenceIndicator risk={alloc.interferenceRisk} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Service Type Legend */}
            <div className="mt-4 card p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Service Type Codes</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { code: 'FSS', name: 'Fixed Satellite Service' },
                  { code: 'MSS', name: 'Mobile Satellite Service' },
                  { code: 'BSS', name: 'Broadcasting Satellite Service' },
                  { code: 'EESS', name: 'Earth Exploration Satellite Service' },
                  { code: 'RNSS', name: 'Radionavigation Satellite Service' },
                  { code: 'SRS', name: 'Space Research Service' },
                  { code: 'SOS', name: 'Space Operation Service' },
                ].map(svc => (
                  <div key={svc.code} className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-purple-300">{svc.code}</span>
                    <span className="text-xs text-slate-400">{svc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          </ScrollReveal>
        )}

        {/* ──────────────────────────────────────── */}
        {/* Section 3: Constellation Frequency Summary */}
        {/* ──────────────────────────────────────── */}
        {showConstellations && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
              <span className="text-amber-400">&#9632;</span>
              Constellation Frequency Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONSTELLATION_SUMMARIES.map(constellation => (
                <div key={constellation.name} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">{constellation.name}</h3>
                      <p className="text-sm text-slate-400">{constellation.operator}</p>
                    </div>
                    <StatusBadge status={constellation.status.includes('Operational') ? 'Active' : 'Planned'} />
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{constellation.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Frequency Bands</p>
                      <div className="flex flex-wrap gap-1">
                        {constellation.bands.map(band => (
                          <span key={band} className="inline-block px-2 py-0.5 text-xs bg-purple-500/15 text-purple-300 border border-purple-500/20 rounded-md">
                            {band}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Satellites</p>
                      <p className="text-xs text-slate-200 font-medium">{constellation.satellites}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-slate-700/50 pt-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Orbit</p>
                      <p className="text-xs text-slate-300">{constellation.orbitType}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Licensed By</p>
                      <p className="text-xs text-slate-300">{constellation.licensedBy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ──────────────────────────────────────── */}
        {/* Section 4: ITU Filing Process             */}
        {/* ──────────────────────────────────────── */}
        {showITU && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
              <span className="text-emerald-400">&#9632;</span>
              ITU Filing Process
            </h2>

            <div className="card p-6 mb-6">
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                The International Telecommunication Union (ITU) coordinates satellite frequency assignments globally through the Radiocommunication Bureau. Filing for orbital slots and frequency rights is a multi-year process governed by the ITU Radio Regulations. The typical timeline from initial filing to satellite launch spans <span className="text-cyan-300 font-semibold">7+ years</span>.
              </p>

              {/* Timeline steps */}
              <div className="relative">
                {/* Vertical connector line */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-500/50 via-cyan-500/50 to-purple-500/50" />

                <div className="space-y-8">
                  {ITU_FILING_STEPS.map((step, idx) => (
                    <div key={step.step} className="relative flex gap-5">
                      {/* Step number circle */}
                      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg flex-shrink-0 ${
                        idx === 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
                        idx === 1 ? 'bg-gradient-to-br from-cyan-500 to-cyan-700' :
                        'bg-gradient-to-br from-purple-500 to-purple-700'
                      }`}>
                        {step.step}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-bold text-slate-100">{step.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
                            {step.duration}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional ITU info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <h4 className="text-sm font-bold text-slate-100 mb-2">Regulatory Deadline</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Satellites must be brought into use within <span className="text-cyan-300 font-medium">7 years</span> of the API filing date. Non-GSO systems have additional milestones requiring deployment progress (e.g., 10% of constellation within 2 years of BIU date).
                </p>
              </div>
              <div className="card p-5">
                <h4 className="text-sm font-bold text-slate-100 mb-2">Coordination Challenges</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  With the proliferation of mega-constellations, the ITU backlog has grown significantly. Over <span className="text-amber-300 font-medium">300,000+ satellite filings</span> are in the queue, creating coordination bottlenecks between GSO and NGSO systems.
                </p>
              </div>
              <div className="card p-5">
                <h4 className="text-sm font-bold text-slate-100 mb-2">MIFR Protection</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Once recorded in the Master International Frequency Register (MIFR), frequency assignments receive <span className="text-emerald-300 font-medium">international legal protection</span>. Other systems must coordinate to avoid causing harmful interference.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ──────────────────────────────────────── */}
        {/* Stats Footer                             */}
        {/* ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-300">{FREQUENCY_BANDS.length}</p>
              <p className="text-xs text-slate-400">Frequency Bands</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-300">{FREQUENCY_ALLOCATIONS.length}</p>
              <p className="text-xs text-slate-400">Allocations Tracked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-300">{FREQUENCY_ALLOCATIONS.filter(a => a.status === 'Active').length}</p>
              <p className="text-xs text-slate-400">Active Allocations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-300">{CONSTELLATION_SUMMARIES.length}</p>
              <p className="text-xs text-slate-400">Constellations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-300">{FREQUENCY_ALLOCATIONS.filter(a => a.interferenceRisk === 'High').length}</p>
              <p className="text-xs text-slate-400">High Interference Risk</p>
            </div>
          </div>
        </div>

        {/* Data source attribution */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Data compiled from ITU Radio Regulations, FCC filings, Ofcom records, and operator publications. For official allocations, consult the ITU MIFR.
        </p>
      </div>
    </div>
  );
}
