'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import { clientLogger } from '@/lib/client-logger';
import {
  SpectrumAllocation,
  SpectrumFiling,
  SPECTRUM_BANDS,
} from '@/types';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface SpectrumStats {
  totalBands: number;
  congestedBands: number;
  totalFilings: number;
  pendingFilings: number;
  topBand: {
    bandName: string;
    filingStatus: string;
    numberOfFilings: number;
  } | null;
}

interface SpectrumData {
  allocations: SpectrumAllocation[];
  filings: SpectrumFiling[];
  stats: SpectrumStats;
}

type AuctionStatus = 'completed' | 'ongoing' | 'pending' | 'policy';

interface Auction {
  id: string;
  name: string;
  band: string;
  status: AuctionStatus;
  country: string;
  year: string;
  raised?: string;
  winnerHighlight?: string;
  relevance: string;
  details: string;
}

interface FrequencyBand {
  band: string;
  range: string;
  services: string;
  spaceRelevance: string;
  congestion: 'low' | 'medium' | 'high' | 'critical';
  keyOperators: string[];
  throughput: string;
  propagation: string;
  wavelength: string;
  color: string;
}

interface SatelliteOperator {
  name: string;
  orbitType: string;
  constellationSize: string;
  spectrumBands: string[];
  keySystem: string;
  status: string;
  description: string;
  hqCountry: string;
  revenueEst: string;
}

interface SpectrumChallenge {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'emerging';
  parties: string[];
  description: string;
  outlook: string;
}

interface ITUTimelineEvent {
  year: string;
  event: string;
  type: 'wrc' | 'filing' | 'decision' | 'milestone';
  description: string;
}

interface RegulatoryProceeding {
  id: string;
  body: string;
  title: string;
  docket: string;
  status: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  date: string;
}

// All valid tab IDs for the consolidated page
type TabId = 'bands' | 'filings' | 'coordination' | 'auctions' | 'freq-bands' | 'operators' | 'challenges' | 'itu-timeline' | 'regulatory' | 'education' | 'lawyers';

const ALL_TABS: TabId[] = ['bands', 'filings', 'coordination', 'auctions', 'freq-bands', 'operators', 'challenges', 'itu-timeline', 'regulatory', 'education', 'lawyers'];

// ────────────────────────────────────────
// Constants (original spectrum page)
// ────────────────────────────────────────

const FILING_STATUS_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500' },
  filed: { label: 'Filed', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  coordinating: { label: 'Coordinating', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  assigned: { label: 'Assigned', color: 'text-purple-400', bgColor: 'bg-purple-500' },
  congested: { label: 'Congested', color: 'text-red-400', bgColor: 'bg-red-500' },
};

const OPERATOR_FILING_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'approved', label: 'Approved', color: 'bg-green-500/20 text-green-400' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'coordinating', label: 'Coordinating', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'denied', label: 'Denied', color: 'bg-red-500/20 text-red-400' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-500/20 text-gray-400' },
];

const SERVICE_LABELS: Record<string, string> = {
  fixed_satellite: 'Fixed Satellite',
  mobile_satellite: 'Mobile Satellite',
  earth_exploration: 'Earth Exploration',
  radio_astronomy: 'Radio Astronomy',
  inter_satellite: 'Inter-Satellite',
};

// ── Export column definitions ──

const FILING_EXPORT_COLUMNS = [
  { key: 'operator', label: 'Operator' },
  { key: 'system', label: 'System Name' },
  { key: 'bandName', label: 'Band' },
  { key: 'frequencyRange', label: 'Frequency Range' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'status', label: 'Status' },
  { key: 'filingDate', label: 'Filed Date' },
  { key: 'grantDate', label: 'Approval Date' },
  { key: 'expiryDate', label: 'Expiry Date' },
  { key: 'agency', label: 'Agency' },
  { key: 'filingId', label: 'Filing ID' },
  { key: 'numberOfSatellites', label: 'Satellites' },
  { key: 'description', label: 'Description' },
];

const ALLOCATION_EXPORT_COLUMNS = [
  { key: 'bandName', label: 'Band Name' },
  { key: 'frequencyRange', label: 'Frequency Range' },
  { key: 'allocationType', label: 'Allocation Type' },
  { key: 'service', label: 'Primary Service' },
  { key: 'region', label: 'Region' },
  { key: 'filingStatus', label: 'Status' },
  { key: 'assignedTo', label: 'Assigned Operator' },
  { key: 'ituReference', label: 'ITU Reference' },
  { key: 'fccReference', label: 'FCC Reference' },
];

// ── Known satellite operators for cross-module linking ──

const KNOWN_SATELLITE_OPERATORS = [
  'SpaceX', 'Starlink', 'OneWeb', 'Amazon', 'Kuiper', 'Telesat',
  'SES', 'Intelsat', 'Eutelsat', 'Viasat', 'Hughes', 'Iridium',
  'Globalstar', 'O3b', 'Boeing', 'Inmarsat', 'EchoStar',
];

// ────────────────────────────────────────
// Constants (from spectrum-auctions page)
// ────────────────────────────────────────

const AUCTIONS: Auction[] = [
  {
    id: 'fcc-110',
    name: 'FCC Auction 110 (3.45-3.55 GHz CBRS)',
    band: '3.45-3.55 GHz',
    status: 'completed',
    country: 'US',
    year: '2024',
    raised: '$22.5B',
    winnerHighlight: 'T-Mobile',
    relevance: 'Adjacent to satellite C-band',
    details: 'The CBRS mid-band auction cleared spectrum previously used by federal government and satellite operators. T-Mobile secured the largest share of licenses, strengthening its 5G mid-band holdings. The proximity to satellite C-band downlinks raises interference concerns for adjacent-band satellite operations.',
  },
  {
    id: 'fcc-107',
    name: 'FCC C-Band Auction 107 (3.7-3.98 GHz)',
    band: '3.7-3.98 GHz',
    status: 'completed',
    country: 'US',
    year: '2021',
    raised: '$81.2B',
    relevance: 'Cleared from satellite downlinks',
    details: 'The largest spectrum auction in history reallocated 280 MHz of C-band spectrum from satellite downlink use to terrestrial 5G. Incumbent satellite operators (SES, Intelsat) received relocation payments to migrate services to the upper C-band (4.0-4.2 GHz). This fundamentally changed the economics of satellite C-band operations in the US.',
  },
  {
    id: 'fcc-12ghz',
    name: 'FCC 12 GHz Band (NGSO)',
    band: '12.2-12.7 GHz',
    status: 'completed',
    country: 'US',
    year: '2025',
    relevance: 'Starlink downlink band protected; FCC declined two-way terrestrial 5G',
    details: 'In May 2025, the FCC concluded that authorizing two-way terrestrial 5G service in the 12.2-12.7 GHz band was not in the public interest given harmful interference risk to satellite users. SpaceX and other NGSO operators scored a major win. The FCC is now exploring limited expanded MVDDS use (point-to-point fixed links) and separately opened an NPRM for mobile use of the adjacent 12.7-13.25 GHz band.',
  },
  {
    id: 'itu-wrc23',
    name: 'ITU WRC-23 Outcomes',
    band: 'Multiple (Ka, MSS)',
    status: 'completed',
    country: 'Global',
    year: '2023',
    relevance: 'Ka-band sharing decisions, NGSO/GSO sharing framework updates, new MSS allocations',
    details: 'WRC-23 addressed several critical satellite spectrum issues: revised NGSO/GSO sharing frameworks under Article 22, new allocations for mobile-satellite services (MSS), updated Ka-band sharing rules, and identification of spectrum for IMT in bands adjacent to satellite services. Outcomes set the stage for WRC-27 agenda items.',
  },
  {
    id: 'ofcom-leo',
    name: 'Ofcom UK LEO & D2D Spectrum',
    band: 'Ku/Ka-band + Mobile',
    status: 'completed',
    country: 'UK',
    year: '2024-2025',
    relevance: 'UK first in Western Europe to authorize satellite direct-to-device',
    details: 'In December 2025, Ofcom published its final framework authorizing satellite direct-to-device (D2D) services in most mobile spectrum bands, making the UK the first country in Western Europe to enable standard smartphones to receive signals from space. Ofcom also authorized 9 NGSO licences with over 110,000 active satellite connections in 2025. An NGSO licensing streamlining review is expected to conclude in early 2026.',
  },
  {
    id: 'acma-ka',
    name: 'Australia ACMA Spectrum Outlook',
    band: 'Ka-band (26/28 GHz)',
    status: 'ongoing',
    country: 'Australia',
    year: '2025-2030',
    relevance: 'Ka-band area-wide licences and LEO satellite facilitation',
    details: 'ACMA published its Five-Year Spectrum Outlook 2025-30, prioritizing area-wide licences (AWL) for satellite services in the 26 and 28 GHz Ka-band ranges. The October 2025 Radiofrequency Spectrum Plan variation updated allocations to facilitate LEO satellite broadband and progressed mobile satellite service allocations in the 1980-2005/2170-2195 MHz bands. Compatibility studies are ongoing for the 24.25-27.5 GHz band overlap with FSS spectrum.',
  },
  {
    id: 'india-dot',
    name: 'India DoT Satellite Spectrum',
    band: 'Multiple',
    status: 'ongoing',
    country: 'India',
    year: '2025-2026',
    relevance: 'Administrative spectrum allocation for Starlink, OneWeb, and Jio SGS',
    details: 'India\'s DoT chose administrative allocation over auction for satellite spectrum, granting Starlink a GMPCS licence in June 2025 and provisional spectrum in August 2025. Licensing terms include a 5-year term, 4% adjusted gross revenue, mandatory data localization, and Indian-national-only ground station operation. Reliance Jio and Airtel continue to contest the decision, arguing it violates the Supreme Court\'s 2G spectrum ruling mandating transparent allocation. Final spectrum pricing for all satcom providers is pending.',
  },
  {
    id: 'brazil-anatel',
    name: 'Brazil Anatel 5G/Satellite',
    band: 'C-band',
    status: 'completed',
    country: 'Brazil',
    year: '2024-2025',
    raised: 'N/A',
    relevance: 'C-band cleared for 5G; satellite FTA migrated to Ku-band',
    details: 'Anatel completed the C-band to 5G transition, with all 5,570 municipalities now eligible for SA 5G service as of December 2024. FTA satellite channels were migrated from C-band to Ku-band, with Anatel subsidizing migration kits for over 7 million households. In October 2025, the new General Regulation of Telecommunications Services (RGST) took effect, triggering a 2-year transition from the SMGS satellite authorization framework to the new SMP framework.',
  },
  {
    id: 'fcc-113',
    name: 'FCC Auction 113 (AWS-3 Returned Licenses)',
    band: '1695-1780 MHz / 2155-2180 MHz',
    status: 'pending',
    country: 'US',
    year: '2026',
    relevance: 'Returned AWS-3 licenses; funds rip-and-replace of Chinese telecom equipment',
    details: 'Following the 2025 restoration of FCC auction authority, Auction 113 is scheduled to open bidding on June 2, 2026. The auction will sell returned AWS-3 licenses from Dish Network entities and proceeds are earmarked to fund the federal rip-and-replace program removing Chinese-manufactured equipment (Huawei/ZTE) from US wireless networks. This is the first FCC spectrum auction since the authority lapsed in March 2023.',
  },
  {
    id: 'fcc-upper-cband',
    name: 'FCC Upper C-Band Auction (3.98-4.2 GHz)',
    band: '3.98-4.2 GHz',
    status: 'policy',
    country: 'US',
    year: '2027',
    relevance: 'Up to 180 MHz of mid-band spectrum for 5G/6G; adjacent to satellite C-band',
    details: 'In late 2025, the FCC adopted an NPRM to clear a minimum of 100 MHz (up to 180 MHz) of upper C-band spectrum for auction by July 2027, as mandated by Congress in the 2025 budget legislation that restored FCC auction authority and opened an 800 MHz spectrum pipeline. This spectrum is currently used for satellite downlinks and fixed microwave services. The proceeding will determine sharing and relocation rules for incumbent satellite operators in the upper portion of C-band.',
  },
];

const FREQUENCY_BANDS: FrequencyBand[] = [
  {
    band: 'UHF',
    range: '300-3000 MHz',
    services: 'CubeSat communications, amateur radio, search & rescue, AIS vessel tracking',
    spaceRelevance: 'Primary band for small satellite communications and amateur radio satellites (AMSAT). Low data rates but excellent propagation and penetration through atmosphere.',
    congestion: 'medium',
    keyOperators: ['AMSAT', 'Planet Labs', 'Spire Global', 'Swarm (SpaceX)'],
    throughput: '9.6 kbps - 1 Mbps',
    propagation: 'Excellent atmospheric penetration, good diffraction around obstacles, long range',
    wavelength: '10 cm - 1 m',
    color: '#6366f1',
  },
  {
    band: 'L-band',
    range: '1-2 GHz',
    services: 'Mobile satellite services, GPS/GNSS, Iridium, Globalstar, Inmarsat, COSPAS-SARSAT',
    spaceRelevance: 'Critical for mobile satellite voice/data, navigation (GPS L1/L2/L5), and maritime/aviation safety. Low bandwidth but reliable all-weather connectivity.',
    congestion: 'high',
    keyOperators: ['Iridium', 'Globalstar', 'Inmarsat (Viasat)', 'Ligado Networks'],
    throughput: '64 kbps - 1 Mbps',
    propagation: 'Good penetration through rain/clouds, moderate building penetration',
    wavelength: '15-30 cm',
    color: '#8b5cf6',
  },
  {
    band: 'S-band',
    range: '2-4 GHz',
    services: 'Telemetry, tracking & command (TT&C), weather satellites, NASA deep space, some broadband, AST SpaceMobile',
    spaceRelevance: 'Standard band for satellite TT&C operations. NASA Deep Space Network uses 2.1-2.3 GHz for spacecraft communications. AST SpaceMobile uses S-band for direct-to-cell.',
    congestion: 'medium',
    keyOperators: ['NASA', 'ESA', 'AST SpaceMobile', 'Globalstar'],
    throughput: '1-10 Mbps',
    propagation: 'Good rain fade resistance, moderate atmospheric absorption',
    wavelength: '7.5-15 cm',
    color: '#a855f7',
  },
  {
    band: 'C-band',
    range: '4-8 GHz',
    services: 'Legacy satellite TV (FTA), data distribution, being cleared for 5G in lower 3.7-3.98 GHz portion',
    spaceRelevance: 'Historical workhorse of satellite communications. Excellent rain fade performance but under massive pressure from 5G reallocation globally. Upper C-band (4.0-4.2 GHz) facing further clearing.',
    congestion: 'critical',
    keyOperators: ['SES', 'Intelsat', 'ABS', 'Measat'],
    throughput: '10-100 Mbps per transponder',
    propagation: 'Excellent rain fade resistance (0.04 dB/km at 6 GHz), minimal atmospheric absorption',
    wavelength: '3.75-7.5 cm',
    color: '#ec4899',
  },
  {
    band: 'X-band',
    range: '8-12 GHz',
    services: 'Military satcom (MILSATCOM), Earth observation downlink, high-resolution SAR imaging, deep space communications',
    spaceRelevance: 'Dedicated military and government satellite communications. Used by WGS, XTAR, and Skynet constellations. Deep space missions use X-band for high-rate data return.',
    congestion: 'medium',
    keyOperators: ['US DoD (WGS)', 'XTAR', 'UK MOD (Skynet)', 'Hisdesat'],
    throughput: '100 Mbps - 1 Gbps (military HTS)',
    propagation: 'Moderate rain fade, good atmospheric transmission, narrow beamwidth for security',
    wavelength: '2.5-3.75 cm',
    color: '#f43f5e',
  },
  {
    band: 'Ku-band',
    range: '12-18 GHz',
    services: 'DTH satellite TV, VSAT enterprise networks, NGSO broadband (Starlink, OneWeb), maritime/aviation connectivity',
    spaceRelevance: 'Primary band for consumer satellite broadband and direct-to-home TV. Starlink and OneWeb use Ku-band for user terminal downlinks. Heavily contested between NGSO and GSO operators.',
    congestion: 'high',
    keyOperators: ['SpaceX Starlink', 'OneWeb (Eutelsat)', 'SES', 'Hughes (EchoStar)'],
    throughput: '50-200 Mbps per beam',
    propagation: 'Susceptible to rain fade (0.1-0.5 dB/km), good balance of bandwidth and link margin',
    wavelength: '1.67-2.5 cm',
    color: '#f97316',
  },
  {
    band: 'Ka-band',
    range: '26.5-40 GHz',
    services: 'High-throughput satellites (HTS), NGSO broadband uplink/downlink, gateway feeder links, military wideband',
    spaceRelevance: 'Enables terabit-class satellite capacity via spot beams. ViaSat-3, Jupiter-3, and O3b mPOWER deliver 1+ Tbps per satellite. Amazon Kuiper primary band. Critical for next-gen broadband.',
    congestion: 'high',
    keyOperators: ['Viasat', 'SES (O3b mPOWER)', 'Amazon Kuiper', 'SpaceX Starlink'],
    throughput: '100 Mbps - 1+ Gbps per beam',
    propagation: 'High rain fade (1-5 dB/km), requires adaptive coding and modulation (ACM)',
    wavelength: '7.5-11.3 mm',
    color: '#eab308',
  },
  {
    band: 'Q-band',
    range: '33-50 GHz',
    services: 'Future high-capacity feeder links, military experimental systems, scientific research',
    spaceRelevance: 'Being explored for gateway feeder links to free up Ka-band for user beams. ESA has conducted Q/V-band experiments on Alphasat. WRC-27 agenda item for expanded satellite use.',
    congestion: 'low',
    keyOperators: ['ESA (Alphasat)', 'SES', 'Eutelsat'],
    throughput: '1-10 Gbps (experimental)',
    propagation: 'Very high rain fade, requires site diversity and large fade margins',
    wavelength: '6-9 mm',
    color: '#84cc16',
  },
  {
    band: 'V-band',
    range: '40-75 GHz',
    services: 'Next-gen LEO broadband (Starlink Gen2), inter-satellite links, Boeing V-band constellation',
    spaceRelevance: 'Massive available bandwidth (35 GHz) for future satellite broadband capacity. SpaceX Starlink Gen2 has V-band authorization. Atmospheric oxygen absorption at 60 GHz limits some sub-bands.',
    congestion: 'low',
    keyOperators: ['SpaceX Starlink Gen2', 'Boeing', 'Telesat Lightspeed'],
    throughput: '1-10+ Gbps (projected)',
    propagation: 'Severe rain fade, oxygen absorption peak at 60 GHz, requires advanced PHY layer',
    wavelength: '4-7.5 mm',
    color: '#22c55e',
  },
  {
    band: 'E-band',
    range: '60-90 GHz',
    services: 'Inter-satellite links (ISL), terrestrial backhaul, point-to-point high-capacity links',
    spaceRelevance: 'Emerging for laser-like inter-satellite links in LEO constellations. Minimal interference between space and ground due to oxygen absorption. Used for ISL in Starlink constellation.',
    congestion: 'low',
    keyOperators: ['SpaceX (ISL)', 'Kepler Communications'],
    throughput: '10+ Gbps',
    propagation: 'Severe atmospheric absorption (especially 60 GHz O2 peak), excellent for ISL in vacuum',
    wavelength: '3.3-5 mm',
    color: '#06b6d4',
  },
  {
    band: 'Optical/Laser',
    range: '100-800 THz (375-3000 nm)',
    services: 'Free-space optical communications (FSOC), inter-satellite laser links, deep space optical comms (LCRD, DSOC)',
    spaceRelevance: 'Revolutionary capacity leap: 100+ Gbps demonstrated. NASA LCRD and DSOC missions proved space-to-ground and deep-space optical links. Starlink uses laser ISL across 6,000+ sats. No spectrum licensing needed (unregulated).',
    congestion: 'low',
    keyOperators: ['SpaceX (laser ISL)', 'NASA (LCRD/DSOC)', 'Mynaric', 'CACI (SA Photonics)'],
    throughput: '10-200+ Gbps',
    propagation: 'Blocked by clouds/rain/fog for ground links; perfect in vacuum for ISL. Requires precision pointing.',
    wavelength: '375 nm - 3 um (near-IR/visible)',
    color: '#14b8a6',
  },
];

// ── Major Satellite Operators by Spectrum Holdings ──

const SATELLITE_OPERATORS: SatelliteOperator[] = [
  {
    name: 'SpaceX Starlink',
    orbitType: 'LEO (550 km)',
    constellationSize: '6,700+ active (12,000 Gen1 + 30,000 Gen2 authorized)',
    spectrumBands: ['Ku-band', 'Ka-band', 'V-band', 'E-band (laser ISL)'],
    keySystem: 'Starlink Gen1/Gen2',
    status: 'Operational / Expanding',
    description: 'Largest satellite constellation ever. Gen1 uses Ku/Ka-band for user and gateway links. Gen2 authorized for V-band, enabling massive capacity expansion. Laser inter-satellite links on all Gen2 satellites. Over 4 million subscribers worldwide.',
    hqCountry: 'US',
    revenueEst: '$6.6B (2024)',
  },
  {
    name: 'SES',
    orbitType: 'GEO + MEO (8,000 km)',
    constellationSize: '50+ GEO + 13 MEO (O3b mPOWER)',
    spectrumBands: ['C-band', 'Ku-band', 'Ka-band'],
    keySystem: 'O3b mPOWER (MEO HTS)',
    status: 'Operational',
    description: 'Multi-orbit operator with GEO fleet and O3b mPOWER MEO constellation delivering terabit-class capacity. Received $4B in C-band relocation payments from FCC auction. Merging with Intelsat (announced 2024).',
    hqCountry: 'Luxembourg',
    revenueEst: '$2.1B (2024)',
  },
  {
    name: 'Intelsat',
    orbitType: 'GEO',
    constellationSize: '50+ GEO satellites',
    spectrumBands: ['C-band', 'Ku-band', 'Ka-band'],
    keySystem: 'Epic NG (HTS)',
    status: 'Operational / Merging with SES',
    description: 'One of the oldest commercial satellite operators. Large C-band and Ku-band GEO fleet. Epic NG high-throughput satellites for mobility and enterprise. Received $4.87B in C-band accelerated relocation payments. Merger with SES pending regulatory approval.',
    hqCountry: 'US',
    revenueEst: '$1.8B (2024)',
  },
  {
    name: 'Viasat',
    orbitType: 'GEO',
    constellationSize: '7 GEO (incl. Inmarsat fleet)',
    spectrumBands: ['Ka-band', 'L-band', 'S-band', 'Ka-band HTS'],
    keySystem: 'ViaSat-3 (1+ Tbps per satellite)',
    status: 'Operational',
    description: 'Acquired Inmarsat in 2023 for $7.3B, gaining L-band and S-band assets plus global maritime/aviation dominance. ViaSat-3 constellation (3 satellites) delivers 1+ Tbps each across Americas, EMEA, and APAC. Largest Ka-band HTS capacity.',
    hqCountry: 'US',
    revenueEst: '$4.0B (2024, combined)',
  },
  {
    name: 'Eutelsat / OneWeb',
    orbitType: 'GEO + LEO (1,200 km)',
    constellationSize: '36 GEO + 634 LEO (OneWeb)',
    spectrumBands: ['Ku-band', 'Ka-band'],
    keySystem: 'OneWeb LEO constellation',
    status: 'Operational',
    description: 'Combined GEO/LEO operator after Eutelsat-OneWeb merger in 2023. OneWeb provides Ku-band LEO broadband for enterprise, government, and mobility. GEO fleet serves broadcast and broadband across Europe, Africa, and Asia. IRIS2 EU constellation partner.',
    hqCountry: 'France/UK',
    revenueEst: '$1.4B (2024)',
  },
  {
    name: 'Amazon Kuiper',
    orbitType: 'LEO (590-630 km)',
    constellationSize: '2 prototype launched; 3,236 authorized',
    spectrumBands: ['Ka-band'],
    keySystem: 'Project Kuiper',
    status: 'Pre-Operational (2025 deployment start)',
    description: 'Amazon\'s $10B+ satellite broadband constellation. FCC authorized 3,236 LEO satellites in Ka-band. Must deploy 50% by 2026 under FCC milestone rules. First production satellites launched Q1 2025. Targeting consumer broadband, enterprise, and government.',
    hqCountry: 'US',
    revenueEst: 'Pre-revenue',
  },
  {
    name: 'Telesat Lightspeed',
    orbitType: 'LEO (1,000-1,325 km)',
    constellationSize: '198 planned',
    spectrumBands: ['Ka-band'],
    keySystem: 'Lightspeed LEO',
    status: 'Under Development',
    description: 'Enterprise-focused Ka-band LEO constellation with advanced optical ISL and software-defined networking. Secured $2.5B in financing incl. Canadian government support. Targeting enterprise, government, maritime, and aviation connectivity.',
    hqCountry: 'Canada',
    revenueEst: 'Pre-revenue',
  },
];

// ── Spectrum Challenges ──

const SPECTRUM_CHALLENGES: SpectrumChallenge[] = [
  {
    id: 'leo-geo-interference',
    title: 'LEO Mega-Constellation vs. GEO Operator Interference',
    severity: 'critical',
    parties: ['SpaceX', 'Amazon Kuiper', 'SES', 'Intelsat', 'Viasat'],
    description: 'As LEO constellations scale to 10,000+ satellites, aggregate interference into GEO satellite receivers increases. ITU Article 22 EPFD limits, designed for smaller NGSO systems, may be inadequate. SpaceX has petitioned the FCC to modernize EPFD calculations, while GEO operators argue current limits are already too lenient.',
    outlook: 'WRC-27 will review Article 22 EPFD limits. FCC IB Docket 25-145 (NGSO/GSO modernization) may set US precedent. Resolution expected 2027-2028.',
  },
  {
    id: '5g-satellite-sharing',
    title: '5G/Satellite C-Band Spectrum Sharing',
    severity: 'high',
    parties: ['Mobile operators (T-Mobile, Verizon, AT&T)', 'SES', 'Intelsat', 'Eutelsat'],
    description: 'The global C-band clearing for 5G (3.3-4.2 GHz) displaces satellite operators from spectrum they have used for 40+ years. The US cleared 3.7-3.98 GHz with $9.7B in relocation payments, and the FCC is now proposing to clear the upper C-band (3.98-4.2 GHz). Similar transitions are underway in Brazil, EU, India, and Japan.',
    outlook: 'Upper C-band NPRM (GN Docket 25-289) comments due mid-2026. Auction mandated by July 2027. Global C-band satellite services will be compressed to <100 MHz in most markets.',
  },
  {
    id: 'optical-interference',
    title: 'Space-to-Ground Optical Link Interference',
    severity: 'emerging',
    parties: ['Laser comm providers', 'Astronomical observatories', 'Aviation authorities'],
    description: 'As free-space optical communication ground stations proliferate, concerns grow about laser beams interfering with astronomical observations and aviation safety. Unlike RF spectrum, optical frequencies are largely unregulated for space communications. No international coordination framework exists for ground station siting.',
    outlook: 'ITU-R is studying optical link regulation under WRC-27 preparatory work. Industry-led voluntary coordination emerging. Formal regulation likely post-2030.',
  },
  {
    id: 'military-commercial-tension',
    title: 'Military vs. Commercial Spectrum Access',
    severity: 'high',
    parties: ['US DoD', 'NATO', 'SpaceX', 'Commercial satellite operators'],
    description: 'Defense agencies hold vast X-band and UHF spectrum allocations with low utilization rates, while commercial operators face severe congestion in adjacent bands. Proposals to share or reallocate military spectrum face national security objections. Conversely, military increasingly relies on commercial satellite services (COMSATCOM), blurring the boundary.',
    outlook: 'US National Spectrum Strategy (2023) calls for spectrum sharing studies. DoD commercial SATCOM procurement growing at 15% CAGR. Formal sharing frameworks under development.',
  },
  {
    id: 'd2d-spectrum-conflict',
    title: 'Direct-to-Device (D2D) Spectrum Conflicts',
    severity: 'high',
    parties: ['SpaceX/T-Mobile', 'AST SpaceMobile', 'MNOs globally', 'National regulators'],
    description: 'Satellite direct-to-cell services transmit in terrestrial mobile bands from space, creating cross-border interference that terrestrial systems do not. A satellite beam covering 700 km may span multiple countries with different spectrum assignments. MNOs debate whether existing licenses authorize satellite-based transmission of their spectrum.',
    outlook: 'FCC SCS framework established. Ofcom UK authorized D2D Dec 2025. WRC-27 agenda item addresses D2D allocations. Bilateral coordination agreements needed for border areas.',
  },
  {
    id: 'spectrum-warehousing',
    title: 'Spectrum Warehousing and Paper Satellites',
    severity: 'medium',
    parties: ['Small nations filing on behalf of operators', 'ITU', 'Established operators'],
    description: 'Some entities file ITU satellite network registrations for orbital slots and spectrum they have no immediate plans to use, blocking access for legitimate operators. "Paper satellites" and speculative filings clog the ITU coordination process and create artificial scarcity.',
    outlook: 'ITU Resolution 559 addresses filing abuse. WRC-23 tightened milestone requirements. Continued enforcement and due diligence obligations being strengthened.',
  },
];

// ── ITU Regulatory Timeline ──

const ITU_REGULATORY_TIMELINE: ITUTimelineEvent[] = [
  {
    year: '1906',
    event: 'International Radiotelegraph Convention',
    type: 'wrc',
    description: 'First international radio regulations established in Berlin, laying the foundation for global spectrum governance.',
  },
  {
    year: '1963',
    event: 'First GEO Satellite Spectrum Allocation',
    type: 'decision',
    description: 'ITU allocated dedicated frequency bands for geostationary satellite communications, enabling the commercial satellite industry.',
  },
  {
    year: '1971',
    event: 'WARC-71: Satellite Broadcasting Allocations',
    type: 'wrc',
    description: 'World Administrative Radio Conference allocated Ku-band spectrum for satellite broadcasting services (BSS), enabling direct-to-home TV.',
  },
  {
    year: '1992',
    event: 'WRC-92: Mobile Satellite Service Expansion',
    type: 'wrc',
    description: 'Expanded L-band allocations for mobile satellite services, enabling Iridium and Globalstar constellations.',
  },
  {
    year: '1997',
    event: 'WRC-97: LEO Constellation Framework',
    type: 'wrc',
    description: 'Established NGSO satellite coordination procedures and EPFD limits under Article 22, prompted by Teledesic and other broadband LEO proposals.',
  },
  {
    year: '2000',
    event: 'WRC-2000: Ka-band Allocation',
    type: 'wrc',
    description: 'Major Ka-band allocations for fixed satellite service (FSS), setting the stage for high-throughput satellite (HTS) systems.',
  },
  {
    year: '2012',
    event: 'WRC-12: C-band Sharing Studies Initiated',
    type: 'wrc',
    description: 'Began studies on sharing between satellite and terrestrial mobile broadband in C-band, foreshadowing the 5G spectrum conflict.',
  },
  {
    year: '2015',
    event: 'WRC-15: IMT Identification in C-band',
    type: 'wrc',
    description: 'Identified portions of C-band for IMT (International Mobile Telecommunications) in some regions, starting the global C-band transition.',
  },
  {
    year: '2019',
    event: 'WRC-19: V-band & NGSO Milestones',
    type: 'wrc',
    description: 'Established milestone-based approach for NGSO satellite deployments. Identified spectrum for 5G in bands adjacent to satellite services. V-band Earth station sharing studies initiated.',
  },
  {
    year: '2020',
    event: 'FCC C-Band Auction 107',
    type: 'milestone',
    description: 'FCC auctioned 280 MHz of C-band spectrum (3.7-3.98 GHz) for $81.2B, the largest spectrum auction in history. Satellite operators received $9.7B in relocation payments.',
  },
  {
    year: '2022',
    event: 'FCC 5-Year Deorbit Rule',
    type: 'decision',
    description: 'FCC reduced post-mission deorbit requirement from 25 years to 5 years for LEO satellites, affecting spectrum licensing conditions for all NGSO constellations.',
  },
  {
    year: '2023',
    event: 'WRC-23: Ka-band Sharing & MSS Updates',
    type: 'wrc',
    description: 'Revised NGSO/GSO sharing frameworks under Article 22. New MSS allocations. IMT identification in bands adjacent to satellite. Set WRC-27 agenda with D2D satellite spectrum as key item.',
  },
  {
    year: '2023',
    event: 'FCC Space Bureau Established',
    type: 'decision',
    description: 'FCC created dedicated Space Bureau to consolidate satellite licensing, spectrum coordination, and orbital debris rules under a single regulatory body.',
  },
  {
    year: '2024',
    event: 'SCS Framework for D2D Satellite',
    type: 'decision',
    description: 'FCC adopted Supplemental Coverage from Space framework allowing satellite operators to use terrestrial mobile spectrum from space (SpaceX/T-Mobile, AST SpaceMobile).',
  },
  {
    year: '2025',
    event: '12 GHz Band Decision & Spectrum Pipeline Act',
    type: 'decision',
    description: 'FCC protected NGSO satellite downlinks in 12.2-12.7 GHz, declining terrestrial 5G. Congress restored FCC auction authority and mandated 800 MHz spectrum pipeline. FCC opened upper C-band clearing proceeding.',
  },
  {
    year: '2027',
    event: 'WRC-27 (Planned)',
    type: 'wrc',
    description: 'Key agenda: D2D satellite spectrum, V-band earth stations in motion (AI 1.1), radio quiet zones (AI 1.16), space weather sensors (AI 1.17), EPFD limit review. Expected to shape satellite spectrum policy for the 2030s.',
  },
];

const REGULATORY_PROCEEDINGS: RegulatoryProceeding[] = [
  {
    id: 'fcc-12ghz-nprm',
    body: 'FCC',
    title: '12 GHz Band Sharing Rules',
    docket: 'WT Docket No. 20-443 / FCC 25-29',
    status: 'Resolved',
    impact: 'high',
    description: 'FCC declined two-way terrestrial 5G in the 12.2-12.7 GHz band (May 2025), protecting NGSO satellite downlinks. A new FNPRM seeks comment on limited expanded MVDDS use (point-to-point fixed links) and a separate NPRM explores mobile use of the adjacent 12.7-13.25 GHz band.',
    date: '2025',
  },
  {
    id: 'fcc-ngso-milestone',
    body: 'FCC',
    title: 'NGSO Deployment Milestones',
    docket: 'IB Docket No. 20-330',
    status: 'Active',
    impact: 'high',
    description: 'Revised deployment milestone rules for NGSO satellite constellations requiring 50% deployment within 6 years of authorization.',
    date: '2024',
  },
  {
    id: 'fcc-space-bureau',
    body: 'FCC',
    title: 'Space Bureau Establishment',
    docket: 'GN Docket No. 23-232',
    status: 'Implemented',
    impact: 'medium',
    description: 'New FCC Space Bureau consolidates satellite licensing, spectrum coordination, and orbital debris rules under a single bureau.',
    date: '2023',
  },
  {
    id: 'itu-wrc27-prep',
    body: 'ITU',
    title: 'WRC-27 Preparatory Studies',
    docket: 'CPM23-2',
    status: 'In Progress',
    impact: 'high',
    description: 'ITU-R studies period runs Jan 2024 to Oct 2026 across 19 agenda items plus 11 standing items. The 1st Interregional Workshop was held Dec 2025; the 2nd (Draft CPM Report) is scheduled for Q4 2026, and the Conference Preparatory Meeting for April 2027. Key items include D2D satellite spectrum, V-band earth stations in motion (AI 1.1), radio quiet zones (AI 1.16), space weather sensors (AI 1.17), and unwanted emissions above 76 GHz (AI 1.18).',
    date: '2024-2027',
  },
  {
    id: 'itu-epfd-review',
    body: 'ITU',
    title: 'EPFD Limit Review (Article 22)',
    docket: 'ITU-R S.1503',
    status: 'Under Review',
    impact: 'high',
    description: 'Review of equivalent power flux density limits governing NGSO-to-GSO interference, critical for mega-constellation operations.',
    date: 'Ongoing',
  },
  {
    id: 'eu-satcom',
    body: 'EU',
    title: 'IRIS2 Constellation Spectrum',
    docket: 'COM/2022/57',
    status: 'Active',
    impact: 'high',
    description: 'The EU\u2019s \u20AC10.6B IRIS2 sovereign constellation (290 MEO/LEO satellites) entered the design and development phase in 2025. SpaceRISE consortium has brought Ka-band filings into use to secure Europe\u2019s Ka spectrum on the IRIS2 orbit. Initial governmental services started in 2025 using pooled GEO capacity from 5 member states via GOVSATCOM. Full deployment expected 2029-2030.',
    date: '2025-2030',
  },
  {
    id: 'fcc-v-band-ngso',
    body: 'FCC',
    title: 'V-Band Allocation for NGSO Systems',
    docket: 'IB Docket No. 18-314',
    status: 'Active',
    impact: 'high',
    description: 'Rulemaking to establish a licensing framework for NGSO operations in the 37.5-42 GHz and 47.2-50.2 GHz V-band spectrum, critical for next-gen mega-constellations. WRC-27 agenda item 1.1 also addresses the 47.2-50.2 GHz and 50.4-51.4 GHz bands for earth stations in motion.',
    date: '2023-2026',
  },
  {
    id: 'fcc-ka-sharing',
    body: 'FCC',
    title: 'Ka-Band NGSO/GSO Sharing Framework',
    docket: 'IB Docket No. 22-271',
    status: 'Active',
    impact: 'high',
    description: 'Updated sharing rules between NGSO and GSO operators in Ka-band to prevent harmful interference as mega-constellations scale operations.',
    date: '2024',
  },
  {
    id: 'fcc-ngso-processing',
    body: 'FCC',
    title: 'NGSO Processing Round Procedures',
    docket: 'IB Docket No. 21-456',
    status: 'Open',
    impact: 'medium',
    description: 'FCC procedures for processing NGSO satellite applications in bands shared with GSO systems. Establishes priority and interference protection rules.',
    date: 'Ongoing',
  },
  {
    id: 'itu-wrc23-outcomes',
    body: 'ITU',
    title: 'WRC-23 Ka-Band & MSS Outcomes',
    docket: 'ACTS/WRC-23/1',
    status: 'Implemented',
    impact: 'high',
    description: 'WRC-23 decisions on revised Ka-band sharing frameworks under Article 22, new MSS allocations, and identification of spectrum for IMT in bands adjacent to satellite services.',
    date: '2023',
  },
  {
    id: 'fcc-orbital-debris',
    body: 'FCC',
    title: 'Orbital Debris Mitigation (5-Year Rule)',
    docket: 'IB Docket No. 18-313',
    status: 'Implemented',
    impact: 'high',
    description: 'New FCC rule requiring LEO satellites to deorbit within 5 years of mission end (down from 25). Impacts spectrum licensing conditions for all NGSO constellations.',
    date: '2024',
  },
  {
    id: 'fcc-scs-framework',
    body: 'FCC',
    title: 'Supplemental Coverage from Space (SCS)',
    docket: 'GN Docket No. 23-65',
    status: 'Implemented',
    impact: 'high',
    description: 'Framework for satellite operators to provide supplemental cellular coverage using terrestrial mobile spectrum bands. Starlink/T-Mobile and AST SpaceMobile direct-to-cell services are now authorized under SCS rules. Ofcom UK followed with its own D2D framework in December 2025.',
    date: '2024-2025',
  },
  {
    id: 'itu-article22-coordination',
    body: 'ITU',
    title: 'Article 22 Coordination Requirements',
    docket: 'ITU-R Resolution 169',
    status: 'Under Review',
    impact: 'high',
    description: 'ITU Radio Regulations Article 22 requirements for NGSO systems to coordinate with GSO networks. EPFD limits and coordination triggers under active review for mega-constellation era.',
    date: 'Ongoing',
  },
  {
    id: 'fcc-ngso-gso-modernization',
    body: 'FCC',
    title: 'Modernizing NGSO/GSO Spectrum Sharing',
    docket: 'IB Docket No. 25-145',
    status: 'Open',
    impact: 'high',
    description: 'In June 2025, the FCC opened a rulemaking to modernize the spectrum-sharing regime between NGSO and GSO satellite systems in the 10.7-12.7, 17.3-18.6, and 19.7-20.2 GHz bands. SpaceX petitioned for the proceeding, arguing current EPFD limits are based on "flawed and outdated assumptions" from 25 years ago that constrain modern mega-constellation operations.',
    date: '2025-2026',
  },
  {
    id: 'fcc-satellite-abundance',
    body: 'FCC',
    title: 'Satellite Spectrum Abundance (12.7 & 42 GHz)',
    docket: 'IB Docket No. 25-162',
    status: 'Open',
    impact: 'high',
    description: 'In May 2025, the FCC unanimously adopted an FNPRM proposing to permit more intensive and efficient use of the 12.7 GHz and 42 GHz bands by satellite communications, either as an alternative or complement to terrestrial wireless. Part of the broader "Satellite Spectrum Abundance" initiative.',
    date: '2025',
  },
  {
    id: 'fcc-upper-cband-nprm',
    body: 'FCC',
    title: 'Upper C-Band Clearing (3.98-4.2 GHz)',
    docket: 'GN Docket No. 25-289',
    status: 'Open',
    impact: 'high',
    description: 'NPRM to clear 100-180 MHz of upper C-band spectrum for 5G/6G auction by July 2027, as mandated by the 2025 Spectrum Pipeline Act. Proposes sharing and relocation rules for incumbent satellite and fixed microwave operators. Part of the 800 MHz spectrum pipeline requiring 600+ MHz between 1.3-10 GHz for exclusive licensed use.',
    date: '2025-2027',
  },
];

// ── Auction status helpers ──

const AUCTION_STATUS_STYLES: Record<AuctionStatus, { label: string; bg: string; text: string }> = {
  completed: { label: 'Completed', bg: 'bg-green-500/20', text: 'text-green-400' },
  ongoing: { label: 'Ongoing', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  policy: { label: 'Policy Dev', bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

const IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
};

const CONGESTION_STYLES: Record<string, { label: string; bg: string; text: string; barColor: string; percent: number }> = {
  low: { label: 'Low', bg: 'bg-green-500/20', text: 'text-green-400', barColor: 'bg-green-500', percent: 20 },
  medium: { label: 'Medium', bg: 'bg-yellow-500/20', text: 'text-yellow-400', barColor: 'bg-yellow-500', percent: 50 },
  high: { label: 'High', bg: 'bg-orange-500/20', text: 'text-orange-400', barColor: 'bg-orange-500', percent: 75 },
  critical: { label: 'Critical', bg: 'bg-red-500/20', text: 'text-red-400', barColor: 'bg-red-500', percent: 95 },
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatFrequency(mhz: number): string {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(1)} GHz`;
  }
  return `${mhz.toFixed(0)} MHz`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function getCongestionLevel(filingStatus: string, numberOfFilings: number): { label: string; percent: number; color: string } {
  if (filingStatus === 'congested') {
    return { label: 'High', percent: 90, color: 'bg-red-500' };
  }
  if (filingStatus === 'assigned' || filingStatus === 'coordinating') {
    const percent = Math.min(Math.max((numberOfFilings / 120) * 100, 30), 80);
    return { label: numberOfFilings > 50 ? 'Medium-High' : 'Medium', percent, color: 'bg-yellow-500' };
  }
  if (filingStatus === 'filed') {
    return { label: 'Low-Medium', percent: 35, color: 'bg-blue-500' };
  }
  return { label: 'Low', percent: 15, color: 'bg-green-500' };
}

function isKnownSatelliteOperator(operator: string): boolean {
  return KNOWN_SATELLITE_OPERATORS.some(
    (known) => operator.toLowerCase().includes(known.toLowerCase())
  );
}

/**
 * Enrich filing/allocation data with a computed frequencyRange field for export.
 */
function enrichWithFrequencyRange<T extends { frequencyMin: number; frequencyMax: number }>(
  items: T[]
): (T & { frequencyRange: string })[] {
  return items.map((item) => ({
    ...item,
    frequencyRange: `${formatFrequency(item.frequencyMin)} - ${formatFrequency(item.frequencyMax)}`,
  }));
}

// ────────────────────────────────────────
// Band Allocation Row
// ────────────────────────────────────────

function BandAllocationRow({ allocation }: { allocation: SpectrumAllocation }) {
  const statusInfo = FILING_STATUS_INFO[allocation.filingStatus] || FILING_STATUS_INFO.available;
  const bandInfo = SPECTRUM_BANDS.find((b) => b.value === allocation.bandName);
  const congestion = getCongestionLevel(allocation.filingStatus, allocation.numberOfFilings);

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg shrink-0">
            {allocation.filingStatus === 'congested' ? '!' : '~'}
          </div>
          <div>
            <h4 className="font-semibold text-white text-base">
              {bandInfo?.label || allocation.bandName}
            </h4>
            <span className="text-slate-400 text-sm">
              {formatFrequency(allocation.frequencyMin)} - {formatFrequency(allocation.frequencyMax)}
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded flex items-center gap-1.5 ${statusInfo.color}`}
          style={{ backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)` }}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${statusInfo.bgColor}`} />
          {statusInfo.label}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-slate-400 text-xs block mb-1">Allocation</span>
          <span className="text-white text-sm font-medium capitalize">{allocation.allocationType}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Primary Service</span>
          <span className="text-white text-sm font-medium">{SERVICE_LABELS[allocation.service] || allocation.service}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Region</span>
          <span className="text-white text-sm font-medium">{allocation.region}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Active Filings</span>
          <span className="text-white text-sm font-medium">{allocation.numberOfFilings}</span>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-400 text-xs">Congestion Level</span>
          <span className={`text-xs font-medium ${
            congestion.percent > 70 ? 'text-red-400' : congestion.percent > 40 ? 'text-yellow-400' : 'text-green-400'
          }`}>{congestion.label}</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${congestion.color} rounded-full transition-all duration-500`}
            style={{ width: `${congestion.percent}%`, opacity: 0.8 }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {allocation.assignedTo && (
            <span>Assigned: <span className="text-slate-400">{allocation.assignedTo}</span></span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {allocation.ituReference && (
            <span className="text-slate-400">ITU: <span className="text-nebula-300 font-mono">{allocation.ituReference}</span></span>
          )}
          {allocation.fccReference && (
            <span className="text-slate-400">FCC: <span className="text-nebula-300 font-mono">{allocation.fccReference}</span></span>
          )}
          {allocation.coordinationRequired && (
            <span className="text-yellow-400 flex items-center gap-1">Coordination Required</span>
          )}
        </div>
      </div>

      {/* Cross-module link: View regulatory framework */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
        <Link
          href="/compliance"
          className="text-xs text-nebula-300 hover:text-nebula-200 underline underline-offset-2 transition-colors"
        >
          View regulatory framework
        </Link>
      </div>

      {/* Description */}
      {allocation.description && (
        <p className="text-slate-400 text-xs mt-3 leading-relaxed">{allocation.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Filing Card
// ────────────────────────────────────────

function FilingCard({ filing }: { filing: SpectrumFiling }) {
  const statusEntry = OPERATOR_FILING_STATUSES.find((s) => s.value === filing.status);
  const statusClass = statusEntry?.color || 'bg-slate-700/50 text-slate-500';
  const statusLabel = statusEntry?.label || filing.status;

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-base">{filing.operator}</h4>
          <p className="text-slate-400 text-sm mt-0.5">{filing.system}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <span className="text-slate-400 text-xs block mb-0.5">Band</span>
          <span className="text-white text-sm font-medium">{filing.bandName}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-0.5">Frequency Range</span>
          <span className="text-white text-sm font-medium">
            {formatFrequency(filing.frequencyMin)} - {formatFrequency(filing.frequencyMax)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-0.5">Orbit Type</span>
          <span className="text-white text-sm font-medium">{filing.orbitType}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-0.5">Satellites</span>
          <span className="text-white text-sm font-medium">
            {filing.numberOfSatellites?.toLocaleString() || '--'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3 flex-wrap">
        <span>Filed: <span className="text-slate-400">{formatDate(filing.filingDate)}</span></span>
        {filing.grantDate && (
          <span>Approved: <span className="text-green-400">{formatDate(filing.grantDate)}</span></span>
        )}
        {filing.expiryDate && (
          <span>Expires: <span className="text-yellow-400">{formatDate(filing.expiryDate)}</span></span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <span className="text-xs text-slate-400">
          Agency: <span className="text-nebula-300 font-medium">{filing.agency}</span>
        </span>
        <span className="text-xs font-mono text-slate-400">{filing.filingId}</span>
      </div>

      {/* Cross-module link: operator -> orbital slots */}
      {isKnownSatelliteOperator(filing.operator) && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <Link
            href="/orbital-slots?tab=operators"
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            View {filing.operator} orbital slots
          </Link>
        </div>
      )}

      {filing.description && (
        <p className="text-slate-400 text-xs mt-3 leading-relaxed">{filing.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Auction Card
// ────────────────────────────────────────

function AuctionCard({ auction }: { auction: Auction }) {
  const [expanded, setExpanded] = useState(false);
  const style = AUCTION_STATUS_STYLES[auction.status];

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-base">{auction.name}</h4>
          <div className="flex items-center gap-3 mt-1 text-sm text-star-300">
            <span>{auction.country}</span>
            <span className="text-star-300/30">|</span>
            <span>{auction.year}</span>
            <span className="text-star-300/30">|</span>
            <span className="font-mono text-xs">{auction.band}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      {auction.raised && (
        <div className="flex items-center gap-4 mb-3">
          <div>
            <span className="text-star-300 text-xs block mb-0.5">Total Raised</span>
            <span className="text-white text-lg font-bold font-display">{auction.raised}</span>
          </div>
          {auction.winnerHighlight && (
            <div className="ml-6">
              <span className="text-star-300 text-xs block mb-0.5">Top Winner</span>
              <span className="text-white text-sm font-medium">{auction.winnerHighlight}</span>
            </div>
          )}
        </div>
      )}

      <div className="mb-3">
        <span className="text-star-300 text-xs block mb-0.5">Satellite Relevance</span>
        <span className="text-nebula-300 text-sm font-medium">{auction.relevance}</span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-star-300 hover:text-white transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Less detail' : 'More detail'}
      </button>

      {expanded && (
        <p className="text-star-300 text-sm leading-relaxed mt-3 pt-3 border-t border-white/10">
          {auction.details}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (uses useSearchParams)
// ────────────────────────────────────────

function SpectrumContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as TabId) || 'bands';
  const initialStatus = searchParams.get('status') || '';
  const initialBand = searchParams.get('band') || '';

  const [activeTab, setActiveTab] = useState<TabId>(
    ALL_TABS.includes(initialTab) ? initialTab : 'bands'
  );
  const [data, setData] = useState<SpectrumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  // Filing filters (initialized from URL)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [bandFilter, setBandFilter] = useState<string>(initialBand);

  // Auction status filter
  const [auctionStatusFilter, setAuctionStatusFilter] = useState<string>('');

  // Error state
  const [error, setError] = useState<string | null>(null);

  // ── URL sync helper ──

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (
          !value ||
          (key === 'tab' && value === 'bands') ||
          (key === 'status' && value === '') ||
          (key === 'band' && value === '')
        ) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      // When switching away from filings, remove filter params
      if (tab !== 'filings') {
        updateUrl({ tab, status: '', band: '' });
      } else {
        updateUrl({ tab, status: statusFilter, band: bandFilter });
      }
    },
    [updateUrl, statusFilter, bandFilter]
  );

  const handleStatusFilterChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      updateUrl({ status });
    },
    [updateUrl]
  );

  const handleBandFilterChange = useCallback(
    (band: string) => {
      setBandFilter(band);
      updateUrl({ band });
    },
    [updateUrl]
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter('');
    setBandFilter('');
    updateUrl({ status: '', band: '' });
  }, [updateUrl]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/spectrum');
      const result = await res.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setData(result);
    } catch (err) {
      clientLogger.error('Failed to fetch spectrum data', { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/spectrum/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      clientLogger.error('Failed to initialize spectrum data', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setInitializing(false);
    }
  };

  // Compute derived stats
  const approvedFilings = data?.filings.filter((f) => f.status === 'approved').length || 0;
  const pendingFilings = data?.stats.pendingFilings || 0;

  // Filtered filings
  const filteredFilings = (data?.filings || []).filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false;
    if (bandFilter && f.bandName !== bandFilter) return false;
    return true;
  });

  // Get unique bands from filings for the band filter
  const filingBands = Array.from(new Set((data?.filings || []).map((f) => f.bandName))).sort();

  // Enriched data for export (with computed frequencyRange)
  const enrichedFilings = enrichWithFrequencyRange(filteredFilings);
  const enrichedAllocations = data ? enrichWithFrequencyRange(data.allocations) : [];

  // Auction derived stats
  const filteredAuctions = auctionStatusFilter
    ? AUCTIONS.filter((a) => a.status === auctionStatusFilter)
    : AUCTIONS;
  const activeAuctions = AUCTIONS.filter((a) => a.status === 'ongoing' || a.status === 'pending').length;
  const completedAuctions = AUCTIONS.filter((a) => a.status === 'completed').length;
  const countriesTracked = new Set(AUCTIONS.map((a) => a.country)).size;

  // Determine whether the current tab is from the "allocations" group or "auctions" group
  const isAuctionTab = activeTab === 'auctions' || activeTab === 'freq-bands' || activeTab === 'operators' || activeTab === 'challenges' || activeTab === 'itu-timeline' || activeTab === 'regulatory' || activeTab === 'education' || activeTab === 'lawyers';

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <AnimatedPageHeader
            title="Spectrum Management"
            subtitle="Satellite frequency allocations, filings, auctions, and spectrum coordination"
            icon="📶"
            accentColor="purple"
          />
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || (!data.allocations.length && !data.filings.length)) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <AnimatedPageHeader
            title="Spectrum Management"
            subtitle="Satellite frequency allocations, filings, auctions, and spectrum coordination"
            icon="📶"
            accentColor="purple"
          />
          <div className="card p-12 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">~</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Spectrum Data Available</h3>
            <p className="text-slate-400 mb-6">
              Load satellite frequency allocations, spectrum filings, and coordination data to get started.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="btn-primary"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading Data...
                </span>
              ) : (
                'Load Spectrum Data'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Spectrum Management"
          subtitle="Satellite frequency allocations, filings, auctions, and spectrum coordination"
          icon="📶"
          accentColor="purple"
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            Back to Dashboard
          </Link>
        </AnimatedPageHeader>

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Quick Stats -- show allocation stats or auction stats based on active section */}
        <ScrollReveal>
        {!isAuctionTab ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-white">
                {data.stats.totalBands}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Bands Tracked
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-blue-400">
                {data.stats.totalFilings}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Total Filings
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-green-400">
                {approvedFilings}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Approved Filings
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">
                {pendingFilings}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Pending Filings
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-blue-400">
                {activeAuctions}
              </div>
              <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
                Active Auctions
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-green-400">
                $103.7B
              </div>
              <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
                Total Value Traded
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">
                {completedAuctions}
              </div>
              <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
                Completed Auctions
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-purple-400">
                {countriesTracked}
              </div>
              <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
                Countries Tracked
              </div>
            </div>
          </div>
        )}
        </ScrollReveal>

        {/* Tab Navigation */}
        <div className="relative">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {/* Divider label: Allocations & Filings */}
          <span className="text-xs text-slate-400 uppercase tracking-widest font-medium self-center pr-1 hidden md:inline">Tracker</span>
          {([
            { id: 'bands' as const, label: 'Band Allocations', count: data.allocations.length },
            { id: 'filings' as const, label: 'Active Filings', count: data.filings.length },
            { id: 'coordination' as const, label: 'Coordination' },
          ] as { id: TabId; label: string; count?: number }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px bg-slate-600 mx-1 self-stretch hidden md:block" />
          <span className="text-xs text-slate-400 uppercase tracking-widest font-medium self-center px-1 hidden md:inline">Analysis</span>

          {([
            { id: 'auctions' as const, label: 'Auctions', count: AUCTIONS.length },
            { id: 'freq-bands' as const, label: 'Frequency Bands', count: FREQUENCY_BANDS.length },
            { id: 'operators' as const, label: 'Operators', count: SATELLITE_OPERATORS.length },
            { id: 'challenges' as const, label: 'Challenges', count: SPECTRUM_CHALLENGES.length },
            { id: 'itu-timeline' as const, label: 'ITU Timeline' },
            { id: 'regulatory' as const, label: 'Regulatory Tracker', count: REGULATORY_PROCEEDINGS.length },
            { id: 'education' as const, label: 'How Auctions Work' },
            { id: 'lawyers' as const, label: 'For Lawyers' },
          ] as { id: TabId; label: string; count?: number }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
        </div>

        {/* ──────────────── BAND ALLOCATIONS TAB ──────────────── */}
        {activeTab === 'bands' && (
          <div>
            {/* Spectrum Overview Bar */}
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Spectrum Overview</h3>
                <ExportButton
                  data={enrichedAllocations}
                  filename="spectrum-band-allocations"
                  columns={ALLOCATION_EXPORT_COLUMNS}
                  label="Export Allocations"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden h-8 mb-4">
                {data.allocations.map((alloc) => {
                  const statusInfo = FILING_STATUS_INFO[alloc.filingStatus] || FILING_STATUS_INFO.available;
                  const widthPercent = (alloc.bandwidth / data.allocations.reduce((sum, a) => sum + a.bandwidth, 0)) * 100;
                  return (
                    <div
                      key={alloc.id}
                      className={`${statusInfo.bgColor} relative group cursor-default`}
                      style={{ width: `${Math.max(widthPercent, 3)}%`, opacity: 0.7 }}
                      title={`${alloc.bandName}: ${formatFrequency(alloc.frequencyMin)} - ${formatFrequency(alloc.frequencyMax)}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white/80 truncate px-1">
                          {widthPercent > 8 ? alloc.bandName : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4">
                {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${info.bgColor}`} style={{ opacity: 0.7 }} />
                    <span className="text-slate-400">{info.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Band Cards */}
            <div className="space-y-4">
              {data.allocations.map((allocation) => (
                <BandAllocationRow key={allocation.id} allocation={allocation} />
              ))}
            </div>
          </div>
        )}

        {/* ──────────────── ACTIVE FILINGS TAB ──────────────── */}
        {activeTab === 'filings' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                >
                  <option value="">All Statuses</option>
                  {OPERATOR_FILING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <select
                  value={bandFilter}
                  onChange={(e) => handleBandFilterChange(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                >
                  <option value="">All Bands</option>
                  {filingBands.map((band) => {
                    const bandInfo = SPECTRUM_BANDS.find((b) => b.value === band);
                    return (
                      <option key={band} value={band}>{bandInfo?.label || band}</option>
                    );
                  })}
                </select>

                {(statusFilter || bandFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                )}

                <span className="text-xs text-slate-400 ml-auto mr-3">
                  {filteredFilings.length} {filteredFilings.length === 1 ? 'filing' : 'filings'} found
                </span>

                <ExportButton
                  data={enrichedFilings}
                  filename="spectrum-filings"
                  columns={FILING_EXPORT_COLUMNS}
                  label="Export Filings"
                />
              </div>
            </div>

            {/* Filing Cards */}
            {filteredFilings.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">~</div>
                <h3 className="text-xl font-semibold text-white mb-2">No filings found</h3>
                <p className="text-slate-400 mb-4">
                  {(statusFilter || bandFilter)
                    ? 'Try adjusting your filters to see more results.'
                    : 'No spectrum filings are currently available.'}
                </p>
                {(statusFilter || bandFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="btn-secondary"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredFilings.map((filing) => (
                  <FilingCard key={filing.id} filing={filing} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────────────── COORDINATION TAB ──────────────── */}
        {activeTab === 'coordination' && (
          <div className="space-y-6">
            {/* Coordination Overview */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Spectrum Coordination Process</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Satellite spectrum coordination is the process by which operators negotiate with existing
                spectrum users to minimize interference. This is required before any new satellite system
                can begin operations in a shared frequency band. The process involves regulatory filings,
                technical analyses, and bilateral agreements between operators.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: '1', title: 'Filing', desc: 'Operator submits spectrum request to national regulator (e.g., FCC) and ITU.' },
                  { step: '2', title: 'Publication', desc: 'ITU publishes the filing in the International Frequency Information Circular (BR IFIC).' },
                  { step: '3', title: 'Coordination', desc: 'Affected administrations and operators review and negotiate interference mitigation.' },
                  { step: '4', title: 'Registration', desc: 'Once coordinated, the assignment is recorded in the Master International Frequency Register.' },
                ].map((item) => (
                  <div key={item.step} className="card p-4 text-center">
                    <div className="w-8 h-8 rounded-full bg-nebula-500/20 text-nebula-300 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                      {item.step}
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Regulatory Bodies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ITU */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                    ITU
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">International Telecommunication Union</h4>
                    <p className="text-slate-400 text-sm">United Nations specialized agency</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  The ITU is the global body responsible for coordinating the shared use of radio spectrum.
                  The Radiocommunication Sector (ITU-R) manages the Radio Regulations, which govern
                  international spectrum use for all satellite and terrestrial services.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Coordination Framework</span>
                    <span className="text-white">Radio Regulations (RR)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Filing Database</span>
                    <span className="text-white">Space Network Systems (SNS)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Key Conference</span>
                    <span className="text-white">World Radiocommunication Conference (WRC)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Regions</span>
                    <span className="text-white">Region 1, 2, 3 (Global)</span>
                  </div>
                </div>
                {/* Cross-module link to compliance */}
                <div className="mt-4 pt-3 border-t border-slate-700/50">
                  <Link
                    href="/compliance?tab=regulations"
                    className="inline-flex items-center gap-1.5 text-xs text-nebula-300 hover:text-nebula-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    View ITU regulations in Compliance module
                  </Link>
                </div>
              </div>

              {/* FCC */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                    FCC
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Federal Communications Commission</h4>
                    <p className="text-slate-400 text-sm">United States regulator</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  The FCC regulates satellite communications in the United States through its
                  International Bureau and Space Bureau. It processes satellite applications,
                  manages spectrum auctions, and enforces compliance with license conditions.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Satellite Bureau</span>
                    <span className="text-white">Space Bureau (est. 2023)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Filing System</span>
                    <span className="text-white">IBFS / MyIBFS</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Key Dockets</span>
                    <span className="text-white">NGSO FSS, MSS, C-band transition</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Jurisdiction</span>
                    <span className="text-white">United States (ITU Region 2)</span>
                  </div>
                </div>
                {/* Cross-module link to compliance */}
                <div className="mt-4 pt-3 border-t border-slate-700/50">
                  <Link
                    href="/compliance?tab=regulations"
                    className="inline-flex items-center gap-1.5 text-xs text-nebula-300 hover:text-nebula-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    View FCC regulations in Compliance module
                  </Link>
                </div>
              </div>
            </div>

            {/* Coordination Requirements Table */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Bands Requiring Coordination</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Band</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Range</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Service</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Status</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Filings</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3">References</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allocations
                      .filter((a) => a.coordinationRequired)
                      .map((alloc) => {
                        const statusInfo = FILING_STATUS_INFO[alloc.filingStatus] || FILING_STATUS_INFO.available;
                        return (
                          <tr key={alloc.id} className="border-b border-slate-700/50 last:border-0">
                            <td className="py-3 pr-4 text-white font-medium">{alloc.bandName}</td>
                            <td className="py-3 pr-4 text-slate-400">
                              {formatFrequency(alloc.frequencyMin)} - {formatFrequency(alloc.frequencyMax)}
                            </td>
                            <td className="py-3 pr-4 text-slate-400">{SERVICE_LABELS[alloc.service] || alloc.service}</td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                            </td>
                            <td className="py-3 pr-4 text-slate-400">{alloc.numberOfFilings}</td>
                            <td className="py-3 text-slate-400 font-mono text-xs">
                              {[alloc.ituReference, alloc.fccReference].filter(Boolean).join(', ') || '--'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Context */}
            <div className="card p-6 border-dashed">
              <h3 className="text-white font-semibold mb-3">Key Considerations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">NGSO/GSO Sharing</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Non-geostationary (NGSO) constellations like Starlink and Kuiper must demonstrate
                    that they will not cause harmful interference to existing geostationary (GSO) satellite
                    operators through equivalent power flux density (EPFD) limits set by ITU Article 22.
                  </p>
                </div>
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">Milestone Requirements</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    The FCC requires NGSO licensees to deploy a portion of their constellation within specific
                    timeframes. Failure to meet deployment milestones can result in license modification or
                    revocation. The ITU also has bring-into-use deadlines for filed satellite networks.
                  </p>
                </div>
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">Spectrum Auctions</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Some bands, particularly C-band (3.7-3.98 GHz), have undergone spectrum auctions
                    to reallocate frequencies from satellite to terrestrial 5G use. This process involves
                    clearing incumbent satellite operators and providing relocation compensation.
                  </p>
                </div>
              </div>
            </div>

            {/* Cross-module links for coordination resources */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-white font-semibold mb-3">Related Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=regulations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  FCC/ITU Regulations
                </Link>
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  Orbital Slot Operators
                </Link>
                <Link
                  href="/compliance"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Compliance Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ AUCTIONS TAB ═══════════════════ */}
        {activeTab === 'auctions' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-star-300 text-sm">Filter by status:</span>
                {['', 'completed', 'ongoing', 'pending', 'policy'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setAuctionStatusFilter(status)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      auctionStatusFilter === status
                        ? 'bg-nebula-500/30 text-nebula-300'
                        : 'bg-white/5 text-star-300 hover:bg-white/10'
                    }`}
                  >
                    {status === '' ? 'All' : AUCTION_STATUS_STYLES[status as AuctionStatus].label}
                  </button>
                ))}
                <span className="text-xs text-star-300 ml-auto">
                  {filteredAuctions.length} {filteredAuctions.length === 1 ? 'auction' : 'auctions'}
                </span>
              </div>
            </div>

            {/* Auction Cards */}
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAuctions.map((auction) => (
                <StaggerItem key={auction.id}>
                  <AuctionCard auction={auction} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {filteredAuctions.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4 text-star-300">~</div>
                <h3 className="text-xl font-semibold text-white mb-2">No auctions match filter</h3>
                <p className="text-star-300 mb-4">Try a different status filter.</p>
                <button
                  onClick={() => setAuctionStatusFilter('')}
                  className="btn-secondary"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ FREQUENCY BANDS TAB ═══════════════════ */}
        {activeTab === 'freq-bands' && (
          <div className="space-y-4">
            <div className="card p-5 mb-2">
              <h3 className="text-white font-semibold mb-2">Key Frequency Bands for Space Communications</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                Satellite and space communications rely on specific frequency bands allocated by the ITU.
                Each band has unique propagation characteristics, capacity, and regulatory status. From UHF
                CubeSat links to 100+ Gbps optical laser communications, the spectrum landscape spans six
                orders of magnitude in frequency.
              </p>
            </div>

            {/* Visual Spectrum Chart */}
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-4">Electromagnetic Spectrum for Space Communications</h3>
              <p className="text-star-300 text-xs mb-4">Frequency increases left to right. Bar width represents relative bandwidth. Color intensity indicates congestion level.</p>
              <div className="space-y-1.5">
                {FREQUENCY_BANDS.map((band) => {
                  const cong = CONGESTION_STYLES[band.congestion];
                  // Approximate relative bandwidth widths
                  const bandwidthMap: Record<string, number> = {
                    'UHF': 18, 'L-band': 6, 'S-band': 12, 'C-band': 25,
                    'X-band': 25, 'Ku-band': 38, 'Ka-band': 85, 'Q-band': 55,
                    'V-band': 100, 'E-band': 80, 'Optical/Laser': 95,
                  };
                  const barWidth = bandwidthMap[band.band] || 30;
                  return (
                    <div key={band.band} className="group relative">
                      <div className="flex items-center gap-3">
                        <div className="w-28 sm:w-32 text-right shrink-0">
                          <span className="text-white text-xs font-medium">{band.band}</span>
                          <span className="text-star-300 text-[10px] block font-mono">{band.range}</span>
                        </div>
                        <div className="flex-1 relative h-7">
                          <div
                            className="h-full rounded-md transition-all duration-500 flex items-center px-2 cursor-default"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: band.color,
                              opacity: band.congestion === 'critical' ? 0.95 : band.congestion === 'high' ? 0.8 : band.congestion === 'medium' ? 0.65 : 0.5,
                            }}
                          >
                            <span className="text-[10px] font-medium text-white/90 truncate">
                              {band.throughput}
                            </span>
                          </div>
                        </div>
                        <div className="w-20 shrink-0">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cong.bg} ${cong.text}`}>
                            {cong.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/10">
                <span className="text-star-300 text-xs">Congestion:</span>
                {Object.entries(CONGESTION_STYLES).map(([key, style]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.barColor}`} style={{ opacity: key === 'critical' ? 0.95 : key === 'high' ? 0.8 : key === 'medium' ? 0.65 : 0.5 }} />
                    <span className="text-star-300 text-xs">{style.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Band Cards */}
            {FREQUENCY_BANDS.map((band) => {
              const cong = CONGESTION_STYLES[band.congestion];
              return (
                <div key={band.band} className="card p-5 hover:border-nebula-500/50 transition-all">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${band.color}20` }}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: band.color, opacity: 0.8 }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-base">{band.band}</h4>
                        <span className="text-star-300 text-sm font-mono">{band.range}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${cong.bg} ${cong.text}`}>
                      {cong.label} Congestion
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-star-300 text-xs block mb-0.5">Services</span>
                      <span className="text-white text-sm">{band.services}</span>
                    </div>
                    <div>
                      <span className="text-star-300 text-xs block mb-0.5">Space Relevance</span>
                      <span className="text-nebula-300 text-sm">{band.spaceRelevance}</span>
                    </div>
                  </div>

                  {/* Technical specs row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-white/[0.02]">
                    <div>
                      <span className="text-star-300 text-[10px] uppercase tracking-wider block mb-0.5">Throughput</span>
                      <span className="text-white text-xs font-medium">{band.throughput}</span>
                    </div>
                    <div>
                      <span className="text-star-300 text-[10px] uppercase tracking-wider block mb-0.5">Wavelength</span>
                      <span className="text-white text-xs font-medium font-mono">{band.wavelength}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-star-300 text-[10px] uppercase tracking-wider block mb-0.5">Propagation</span>
                      <span className="text-white text-xs">{band.propagation}</span>
                    </div>
                  </div>

                  {/* Key operators */}
                  <div className="mb-4">
                    <span className="text-star-300 text-xs block mb-1.5">Key Operators</span>
                    <div className="flex flex-wrap gap-1.5">
                      {band.keyOperators.map((op) => (
                        <span
                          key={op}
                          className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-white/80 border border-white/5"
                        >
                          {op}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Congestion bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-star-300 text-xs">Spectrum Congestion</span>
                      <span className={`text-xs font-medium ${cong.text}`}>{cong.percent}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cong.percent}%`, backgroundColor: band.color, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Reference table */}
            <div className="card p-6 mt-4">
              <h3 className="text-white font-semibold mb-4">Band Allocation Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3 pr-4">Band</th>
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3 pr-4">Range</th>
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3 pr-4">Throughput</th>
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3 pr-4">Key Operators</th>
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3">Congestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FREQUENCY_BANDS.map((band) => {
                      const cong = CONGESTION_STYLES[band.congestion];
                      return (
                        <tr key={band.band} className="border-b border-white/5 last:border-0">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: band.color }} />
                              <span className="text-white font-medium">{band.band}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-star-300 font-mono text-xs">{band.range}</td>
                          <td className="py-3 pr-4 text-star-300 text-xs">{band.throughput}</td>
                          <td className="py-3 pr-4 text-star-300 text-xs">{band.keyOperators.slice(0, 2).join(', ')}{band.keyOperators.length > 2 ? ` +${band.keyOperators.length - 2}` : ''}</td>
                          <td className="py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${cong.bg} ${cong.text}`}>
                              {cong.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ OPERATORS TAB ═══════════════════ */}
        {activeTab === 'operators' && (
          <div className="space-y-4">
            <div className="card p-5 mb-2">
              <h3 className="text-white font-semibold mb-2">Major Satellite Operators by Spectrum Holdings</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                The satellite communications industry is dominated by a handful of operators controlling
                vast spectrum holdings across GEO, MEO, and LEO orbits. Understanding their spectrum portfolios
                is essential for tracking competitive dynamics, interference risks, and market evolution.
              </p>
            </div>

            {/* Operator Comparison Chart */}
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-4">Spectrum Band Coverage by Operator</h3>
              <p className="text-star-300 text-xs mb-4">Dots indicate spectrum bands held by each operator. Larger operators have broader multi-band portfolios.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3 pr-4 sticky left-0 bg-slate-900/95">Operator</th>
                      {['UHF', 'L', 'S', 'C', 'X', 'Ku', 'Ka', 'Q', 'V', 'E', 'Optical'].map((b) => (
                        <th key={b} className="text-center text-star-300 text-[10px] uppercase tracking-wider font-medium py-3 px-2 min-w-[48px]">{b}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SATELLITE_OPERATORS.map((op) => (
                      <tr key={op.name} className="border-b border-white/5 last:border-0">
                        <td className="py-3 pr-4 sticky left-0 bg-slate-900/95">
                          <span className="text-white font-medium text-xs">{op.name}</span>
                          <span className="text-star-300 text-[10px] block">{op.orbitType}</span>
                        </td>
                        {['UHF', 'L-band', 'S-band', 'C-band', 'X-band', 'Ku-band', 'Ka-band', 'Q-band', 'V-band', 'E-band (laser ISL)', 'Optical/Laser'].map((bandKey) => {
                          const hasBand = op.spectrumBands.some((sb) =>
                            bandKey.toLowerCase().includes(sb.toLowerCase().replace('-band', '').replace('-band', '')) ||
                            sb.toLowerCase().includes(bandKey.toLowerCase().split(' ')[0].split('-')[0])
                          );
                          return (
                            <td key={bandKey} className="py-3 px-2 text-center">
                              {hasBand ? (
                                <div className="w-4 h-4 rounded-full bg-nebula-500/60 border border-nebula-400/40 mx-auto" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-white/5 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operator Detail Cards */}
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {SATELLITE_OPERATORS.map((op) => (
                <StaggerItem key={op.name}>
                  <div className="card p-5 hover:border-nebula-500/50 transition-all h-full">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div>
                        <h4 className="font-semibold text-white text-base">{op.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-star-300 text-sm">{op.orbitType}</span>
                          <span className="text-star-300/30">|</span>
                          <span className="text-star-300 text-sm">{op.hqCountry}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${
                        op.status.includes('Operational') ? 'bg-green-500/20 text-green-400'
                        : op.status.includes('Pre-') ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {op.status.split('/')[0].trim()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <span className="text-star-300 text-xs block mb-0.5">Constellation Size</span>
                        <span className="text-white text-sm font-medium">{op.constellationSize}</span>
                      </div>
                      <div>
                        <span className="text-star-300 text-xs block mb-0.5">Revenue (est.)</span>
                        <span className="text-white text-sm font-medium">{op.revenueEst}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-star-300 text-xs block mb-0.5">Key System</span>
                        <span className="text-nebula-300 text-sm font-medium">{op.keySystem}</span>
                      </div>
                    </div>

                    {/* Spectrum bands */}
                    <div className="mb-4">
                      <span className="text-star-300 text-xs block mb-1.5">Spectrum Bands</span>
                      <div className="flex flex-wrap gap-1.5">
                        {op.spectrumBands.map((band) => (
                          <span
                            key={band}
                            className="text-[11px] px-2 py-0.5 rounded bg-nebula-500/10 text-nebula-300 border border-nebula-500/20"
                          >
                            {band}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-star-300 text-xs leading-relaxed">{op.description}</p>

                    {/* Cross-module link */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <Link
                        href={`/company-profiles`}
                        className="text-xs text-nebula-300 hover:text-nebula-200 underline underline-offset-2 transition-colors"
                      >
                        View company profile
                      </Link>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        )}

        {/* ═══════════════════ CHALLENGES TAB ═══════════════════ */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            <div className="card p-5 mb-2">
              <h3 className="text-white font-semibold mb-2">Spectrum Challenges & Conflicts</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                The satellite industry faces mounting spectrum challenges as mega-constellations compete with
                each other, with GEO incumbents, and with terrestrial 5G/6G networks for finite radio frequency
                resources. These conflicts shape regulatory policy, investment decisions, and technology roadmaps.
              </p>
            </div>

            {/* Severity overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['critical', 'high', 'medium', 'emerging'] as const).map((sev) => {
                const count = SPECTRUM_CHALLENGES.filter((c) => c.severity === sev).length;
                const sevStyles = {
                  critical: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Critical' },
                  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'High' },
                  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Medium' },
                  emerging: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Emerging' },
                };
                const style = sevStyles[sev];
                return (
                  <div key={sev} className="card-elevated p-4 text-center">
                    <div className={`text-2xl font-bold font-display ${style.text}`}>{count}</div>
                    <div className={`text-xs font-medium mt-1 ${style.text}`}>{style.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Challenge Cards */}
            {SPECTRUM_CHALLENGES.map((challenge) => {
              const sevStyles: Record<string, { bg: string; text: string; label: string; borderColor: string }> = {
                critical: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Critical', borderColor: 'border-red-500/30' },
                high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'High', borderColor: 'border-orange-500/30' },
                medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Medium', borderColor: 'border-yellow-500/30' },
                emerging: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Emerging', borderColor: 'border-blue-500/30' },
              };
              const style = sevStyles[challenge.severity];
              return (
                <div key={challenge.id} className={`card p-5 hover:border-nebula-500/50 transition-all border-l-2 ${style.borderColor}`}>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <h4 className="font-semibold text-white text-base">{challenge.title}</h4>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>

                  <p className="text-star-300 text-sm leading-relaxed mb-4">{challenge.description}</p>

                  {/* Affected parties */}
                  <div className="mb-4">
                    <span className="text-star-300 text-xs block mb-1.5">Key Parties</span>
                    <div className="flex flex-wrap gap-1.5">
                      {challenge.parties.map((party) => (
                        <span
                          key={party}
                          className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-white/80 border border-white/5"
                        >
                          {party}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Outlook */}
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-nebula-300 text-xs font-medium block mb-1">Outlook</span>
                    <p className="text-star-300 text-xs leading-relaxed">{challenge.outlook}</p>
                  </div>
                </div>
              );
            })}

            {/* Cross-module links */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-white font-semibold mb-3">Related Analysis</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=regulations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Regulatory Framework
                </Link>
                <Link
                  href="/space-environment?tab=debris"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Orbital Debris Impact
                </Link>
                <Link
                  href="/market-intel"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Market Intelligence
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ ITU TIMELINE TAB ═══════════════════ */}
        {activeTab === 'itu-timeline' && (
          <div className="space-y-4">
            <div className="card p-5 mb-2">
              <h3 className="text-white font-semibold mb-2">ITU Regulatory Framework & Timeline</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                The International Telecommunication Union (ITU) governs global spectrum allocation through the
                Radio Regulations, updated at each World Radiocommunication Conference (WRC). The filing process
                for satellite networks follows a defined path: Advance Publication Information (API) leads to
                Coordination Request (CR/C), then notification, coordination with affected parties, and finally
                registration in the Master International Frequency Register (MIFR).
              </p>
            </div>

            {/* ITU Filing Process */}
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-4">ITU Satellite Network Filing Process</h3>
              <p className="text-star-300 text-xs mb-5">The standard process for registering a new satellite network with the ITU Radiocommunication Bureau (BR).</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  {
                    step: '1',
                    title: 'API Filing',
                    subtitle: 'Advance Publication',
                    desc: 'Administration files Advance Publication Information (API) with ITU-BR, providing basic orbital and frequency parameters. Published in BR IFIC for comment.',
                    timeline: 'T+0',
                  },
                  {
                    step: '2',
                    title: 'CR/C Request',
                    subtitle: 'Coordination',
                    desc: 'Coordination Request (CR/C) filed with detailed technical parameters. ITU identifies potentially affected administrations and satellite networks.',
                    timeline: 'T+6 months',
                  },
                  {
                    step: '3',
                    title: 'Coordination',
                    subtitle: 'Bilateral/Multilateral',
                    desc: 'Administrations negotiate bilaterally to resolve interference issues. Technical analyses exchanged. Agreements documented in coordination letters.',
                    timeline: 'T+6-30 months',
                  },
                  {
                    step: '4',
                    title: 'Notification',
                    subtitle: 'ITU-BR Examination',
                    desc: 'Once coordinated, administration files notification. ITU-BR examines conformity with Radio Regulations and coordination agreements.',
                    timeline: 'T+24-36 months',
                  },
                  {
                    step: '5',
                    title: 'Registration',
                    subtitle: 'MIFR Entry',
                    desc: 'Frequency assignments recorded in the Master International Frequency Register (MIFR). Network gains international recognition and protection rights.',
                    timeline: 'T+30-42 months',
                  },
                ].map((item) => (
                  <div key={item.step} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-nebula-500/20 text-nebula-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-xs">{item.title}</h4>
                        <span className="text-nebula-300 text-[10px]">{item.subtitle}</span>
                      </div>
                    </div>
                    <p className="text-star-300 text-[11px] leading-relaxed mb-2">{item.desc}</p>
                    <span className="text-[10px] font-mono text-star-300/60">{item.timeline}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GEO vs NGSO Filing Differences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-elevated p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                    GEO
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">GEO Orbital Slot Filings</h4>
                    <span className="text-star-300 text-xs">Geostationary Orbit (35,786 km)</span>
                  </div>
                </div>
                <ul className="space-y-2 text-star-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1 shrink-0">--</span>
                    <span>Filing covers specific orbital position (e.g., 101 degrees W longitude)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1 shrink-0">--</span>
                    <span>Coordination based on orbital spacing and antenna discrimination</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1 shrink-0">--</span>
                    <span>Limited slots available (roughly 2-degree spacing for same-band operations)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1 shrink-0">--</span>
                    <span>7-year bring-into-use deadline from date of receipt of API</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1 shrink-0">--</span>
                    <span>Protected under ITU Article 9 (coordination with GSO networks)</span>
                  </li>
                </ul>
              </div>

              <div className="card-elevated p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                    NGSO
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">NGSO Constellation Filings</h4>
                    <span className="text-star-300 text-xs">Non-Geostationary Orbits (LEO/MEO)</span>
                  </div>
                </div>
                <ul className="space-y-2 text-star-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1 shrink-0">--</span>
                    <span>Filing covers entire constellation (orbital planes, altitude, inclination)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1 shrink-0">--</span>
                    <span>Must demonstrate compliance with EPFD limits (Article 22) to protect GSO</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1 shrink-0">--</span>
                    <span>Milestone-based deployment requirements (FCC: 50% in 6 years)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1 shrink-0">--</span>
                    <span>Aggregate interference from multiple NGSO systems is a growing concern</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1 shrink-0">--</span>
                    <span>ITU processing rounds determine access priority among competing NGSO filings</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* WRC-23 Key Outcomes */}
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-2">WRC-23 Key Outcomes for Satellite</h3>
              <p className="text-star-300 text-xs mb-4">Dubai, November-December 2023. Attended by 3,900+ delegates from 163 countries.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    title: 'NGSO/GSO Sharing',
                    desc: 'Revised Article 22 frameworks for NGSO-to-GSO protection. Initiated studies on EPFD limit adequacy for mega-constellations.',
                    icon: 'N/G',
                  },
                  {
                    title: 'IMT-2020 (5G) Bands',
                    desc: 'New allocations for 5G in bands adjacent to satellite: 4.8-4.99 GHz, 3.3-3.4 GHz (Region 2). Sharing studies mandated.',
                    icon: '5G',
                  },
                  {
                    title: 'MSS Allocations',
                    desc: 'New mobile-satellite service allocations in 1.7/2.0 GHz bands. Framework for satellite direct-to-device referenced.',
                    icon: 'MSS',
                  },
                  {
                    title: 'WRC-27 Agenda Set',
                    desc: 'Key items: D2D satellite spectrum (AI 1.2), V-band ESIM (AI 1.1), space weather (AI 1.17), EPFD review continuation.',
                    icon: '27',
                  },
                ].map((item) => (
                  <div key={item.title} className="card p-4">
                    <div className="w-8 h-8 rounded-full bg-nebula-500/20 text-nebula-300 font-bold text-[10px] flex items-center justify-center mb-3">
                      {item.icon}
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-star-300 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-4">Spectrum Regulation Timeline</h3>
              <p className="text-star-300 text-xs mb-5">Key milestones in satellite spectrum governance from the first radio regulations to the upcoming WRC-27.</p>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[83px] md:left-[95px] top-0 bottom-0 w-px bg-white/10" />

                <div className="space-y-4">
                  {ITU_REGULATORY_TIMELINE.map((event, idx) => {
                    const typeStyles: Record<string, { bg: string; text: string; label: string }> = {
                      wrc: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'WRC' },
                      filing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Filing' },
                      decision: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Decision' },
                      milestone: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Milestone' },
                    };
                    const typeStyle = typeStyles[event.type];
                    return (
                      <div key={idx} className="flex items-start gap-4 group">
                        <div className="w-[72px] md:w-[84px] text-right shrink-0">
                          <span className="text-white font-bold text-sm font-mono">{event.year}</span>
                        </div>
                        <div className="relative shrink-0 mt-1">
                          <div className={`w-3 h-3 rounded-full border-2 border-slate-900 ${typeStyle.bg.replace('/20', '')} z-10 relative`} />
                        </div>
                        <div className="flex-1 pb-2 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="text-white font-semibold text-sm">{event.event}</h4>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeStyle.bg} ${typeStyle.text}`}>
                              {typeStyle.label}
                            </span>
                          </div>
                          <p className="text-star-300 text-xs leading-relaxed">{event.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cross-module links */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-white font-semibold mb-3">Related Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=treaties"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  International Treaties
                </Link>
                <Link
                  href="/orbital-slots"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  Orbital Slot Management
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ REGULATORY TRACKER TAB ═══════════════════ */}
        {activeTab === 'regulatory' && (
          <div className="space-y-4">
            <div className="card p-5 mb-2">
              <h3 className="text-white font-semibold mb-2">Active Regulatory Proceedings</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                Key regulatory proceedings from the FCC, ITU, and other bodies that affect satellite spectrum rights
                and operations. Proceedings are ranked by potential impact on the satellite industry.
              </p>
            </div>

            {REGULATORY_PROCEEDINGS.map((proc) => {
              const impact = IMPACT_STYLES[proc.impact];
              return (
                <div key={proc.id} className="card p-5 hover:border-nebula-500/50 transition-all">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-nebula-300 shrink-0">
                        {proc.body}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-base">{proc.title}</h4>
                        <span className="text-star-300 text-sm font-mono">{proc.docket}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded ${impact.bg} ${impact.text}`}>
                        {proc.impact.charAt(0).toUpperCase() + proc.impact.slice(1)} Impact
                      </span>
                    </div>
                  </div>

                  <p className="text-star-300 text-sm leading-relaxed mb-3">{proc.description}</p>

                  <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10">
                    <span>Status: <span className="text-white font-medium">{proc.status}</span></span>
                    <span className="text-white/20">|</span>
                    <span>Timeline: <span className="text-white font-medium">{proc.date}</span></span>
                  </div>
                </div>
              );
            })}

            {/* Cross-module links */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-white font-semibold mb-3">Related Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=regulations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Compliance Dashboard
                </Link>
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  Orbital Slot Operators
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ EDUCATION TAB ═══════════════════ */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            {/* FCC Auction Process */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">FCC Auction Process</h3>
              <p className="text-star-300 text-sm leading-relaxed mb-5">
                The Federal Communications Commission uses competitive bidding (auctions) to assign licenses
                for commercial use of the electromagnetic spectrum. This process was authorized by Congress
                in 1993 and has since generated over $230 billion in revenue.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  {
                    step: '1',
                    title: 'Pre-Auction',
                    desc: 'FCC issues a public notice defining the spectrum to be auctioned, service rules, and license areas. Prospective bidders file applications and submit upfront payments.',
                  },
                  {
                    step: '2',
                    title: 'Bidding Rounds',
                    desc: 'Multiple rounds of simultaneous ascending bids occur. Bidders place bids on licenses across geographic areas. Activity rules ensure genuine participation.',
                  },
                  {
                    step: '3',
                    title: 'License Grant',
                    desc: 'Winning bidders make final payments and receive licenses. Licenses include buildout requirements and technical conditions for interference protection.',
                  },
                  {
                    step: '4',
                    title: 'Post-Auction',
                    desc: 'Licensees deploy infrastructure within mandated timelines. The FCC monitors compliance and can revoke licenses for failure to meet build-out milestones.',
                  },
                ].map((item) => (
                  <div key={item.step} className="card p-4 text-center">
                    <div className="w-8 h-8 rounded-full bg-nebula-500/20 text-nebula-300 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                      {item.step}
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-star-300 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ITU WRC Cycle */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">ITU World Radiocommunication Conference (WRC) Cycle</h3>
              <p className="text-star-300 text-sm leading-relaxed mb-5">
                The WRC is held every 3-4 years by the International Telecommunication Union to review and revise
                the Radio Regulations, the international treaty governing the use of radio-frequency spectrum and
                satellite orbits. WRC decisions are binding on all 193 ITU member states.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Agenda Setting',
                    desc: 'The previous WRC establishes the agenda for the next conference. Study groups and regional bodies conduct technical studies over the 3-4 year inter-conference period.',
                    icon: 'A',
                  },
                  {
                    title: 'Conference',
                    desc: 'Delegates from member states negotiate and adopt changes to the Radio Regulations. Decisions include new allocations, sharing frameworks, and regulatory procedures.',
                    icon: 'C',
                  },
                  {
                    title: 'Implementation',
                    desc: 'National administrations implement WRC decisions into domestic regulations. The ITU Radiocommunication Bureau updates the Master Register and coordination procedures.',
                    icon: 'I',
                  },
                ].map((item) => (
                  <div key={item.title} className="card p-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold text-sm flex items-center justify-center mb-3">
                      {item.icon}
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-star-300 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Spectrum Types */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Licensed vs. Unlicensed vs. Shared Spectrum</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-5 border-green-500/30">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm mb-3">
                    L
                  </div>
                  <h4 className="text-white font-semibold mb-2">Licensed Spectrum</h4>
                  <p className="text-star-300 text-sm leading-relaxed">
                    Exclusive rights to use specific frequencies in defined geographic areas. Obtained through
                    auctions or administrative assignment. Provides interference protection and regulatory certainty.
                    Most satellite bands are licensed.
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-star-300 text-xs">Examples: </span>
                    <span className="text-white text-xs">C-band satellite, Ku-band DTH, Ka-band HTS</span>
                  </div>
                </div>

                <div className="card p-5 border-blue-500/30">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm mb-3">
                    U
                  </div>
                  <h4 className="text-white font-semibold mb-2">Unlicensed Spectrum</h4>
                  <p className="text-star-300 text-sm leading-relaxed">
                    Shared spectrum available to anyone meeting technical requirements. No exclusive rights or
                    interference protection. Devices must accept interference from other users. Low barriers to
                    entry but limited quality-of-service guarantees.
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-star-300 text-xs">Examples: </span>
                    <span className="text-white text-xs">Wi-Fi (2.4/5/6 GHz), Bluetooth, ISM bands</span>
                  </div>
                </div>

                <div className="card p-5 border-yellow-500/30">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-sm mb-3">
                    S
                  </div>
                  <h4 className="text-white font-semibold mb-2">Shared Spectrum</h4>
                  <p className="text-star-300 text-sm leading-relaxed">
                    Spectrum shared between multiple services under defined rules. Priority tiers determine
                    access rights. Dynamic spectrum access (DSA) and spectrum access systems (SAS)
                    manage interference in real time. Increasingly common model.
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-star-300 text-xs">Examples: </span>
                    <span className="text-white text-xs">CBRS (3.5 GHz), 12 GHz NGSO/terrestrial, C-band transition</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary vs Secondary */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Primary vs. Secondary Allocation Status</h3>
              <p className="text-star-300 text-sm leading-relaxed mb-5">
                The ITU Radio Regulations define two levels of allocation status for radio services in each
                frequency band. This hierarchy determines interference rights and protection obligations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-elevated p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <h4 className="text-white font-semibold">Primary Allocation</h4>
                  </div>
                  <ul className="space-y-2 text-star-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 shrink-0">--</span>
                      <span>Full interference protection from secondary services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 shrink-0">--</span>
                      <span>Must coordinate with other primary services in the same band</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 shrink-0">--</span>
                      <span>Recorded in the Table of Frequency Allocations in UPPERCASE</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 shrink-0">--</span>
                      <span>Example: FIXED-SATELLITE in Ku-band (primary)</span>
                    </li>
                  </ul>
                </div>

                <div className="card-elevated p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <h4 className="text-white font-semibold">Secondary Allocation</h4>
                  </div>
                  <ul className="space-y-2 text-star-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1 shrink-0">--</span>
                      <span>Must not cause harmful interference to primary services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1 shrink-0">--</span>
                      <span>Cannot claim protection from interference by primary services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1 shrink-0">--</span>
                      <span>Recorded in the Table of Frequency Allocations in lowercase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1 shrink-0">--</span>
                      <span>Example: radiolocation in S-band (secondary)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ FOR LAWYERS TAB ═══════════════════ */}
        {activeTab === 'lawyers' && (
          <div className="space-y-6">
            <div className="card p-6 border border-nebula-500/20">
              <h3 className="text-lg font-semibold text-white mb-2">Impact Analysis: Spectrum Auctions & Satellite Operator Rights</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                This section analyzes how spectrum auction outcomes and regulatory proceedings affect the rights,
                operations, and business models of existing satellite operators. Key legal and commercial impacts
                are assessed for each major proceeding.
              </p>
            </div>

            {/* C-Band Transition Impact */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
                  C
                </div>
                <div>
                  <h4 className="text-white font-semibold">C-Band Reallocation (3.7-3.98 GHz)</h4>
                  <span className="text-xs text-red-400 font-medium">High Impact on Incumbent Operators</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Legal Framework</h5>
                  <p className="text-star-300 text-sm leading-relaxed">
                    FCC Order 20-22 mandated the clearing of 280 MHz of C-band spectrum from satellite downlink use.
                    Incumbent satellite operators (SES, Intelsat, Eutelsat) received accelerated relocation payments
                    totaling approximately $9.7 billion to transition services to the upper C-band (4.0-4.2 GHz) and
                    alternative bands.
                  </p>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Impact on Existing Rights</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- Loss of primary allocation in 3.7-3.98 GHz for satellite downlinks in the US</li>
                    <li>-- Required migration of thousands of earth stations to alternative frequencies</li>
                    <li>-- Compressed available spectrum for C-band satellite services from 500 MHz to 200 MHz</li>
                    <li>-- Precedent for future satellite-to-terrestrial spectrum reallocation globally</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Key Legal Considerations</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- Relocation compensation adequacy and timeline disputes</li>
                    <li>-- Interference protection for remaining C-band satellite operations</li>
                    <li>-- International coordination obligations under ITU Radio Regulations</li>
                    <li>-- Impact on long-term satellite service contracts and capacity commitments</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 12 GHz Band */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-xs shrink-0">
                  12G
                </div>
                <div>
                  <h4 className="text-white font-semibold">12 GHz Band Sharing (12.2-12.7 GHz)</h4>
                  <span className="text-xs text-yellow-400 font-medium">Contested -- Active Rulemaking</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Dispute Summary</h5>
                  <p className="text-star-300 text-sm leading-relaxed">
                    The MVDDS Coalition (led by RS Access) petitioned the FCC to allow two-way terrestrial
                    broadband in the 12 GHz band, which is currently used by NGSO satellite systems (primarily
                    Starlink) for downlinks. SpaceX and DISH Network (DBS) argue that terrestrial use would cause
                    harmful interference to millions of satellite terminals.
                  </p>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Legal Stakes</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- Starlink relies on 12 GHz for approximately 75% of its downlink capacity</li>
                    <li>-- Existing MVDDS licenses are secondary to satellite services</li>
                    <li>-- Proposed elevation to co-primary status would fundamentally alter sharing dynamics</li>
                    <li>-- Technical studies from both sides present conflicting interference conclusions</li>
                    <li>-- Potential for significant reduction in NGSO satellite throughput if terrestrial use is authorized</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* NGSO/GSO Sharing */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                  N/G
                </div>
                <div>
                  <h4 className="text-white font-semibold">NGSO/GSO Spectrum Sharing (ITU Article 22)</h4>
                  <span className="text-xs text-blue-400 font-medium">Ongoing International Framework</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Framework Overview</h5>
                  <p className="text-star-300 text-sm leading-relaxed">
                    ITU Article 22 establishes EPFD (equivalent power flux density) limits that NGSO systems must
                    meet to protect GSO systems from aggregate interference. As mega-constellations like Starlink
                    (12,000+ satellites) and Kuiper (3,236 satellites) deploy, the adequacy of existing EPFD limits
                    is being challenged.
                  </p>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Legal Implications</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- GSO operators (SES, Intelsat, Eutelsat) argue EPFD limits are too lenient for mega-constellations</li>
                    <li>-- NGSO operators argue existing limits are technically sound and commercially necessary</li>
                    <li>-- WRC-23 initiated review studies; WRC-27 may revise Article 22 limits</li>
                    <li>-- Potential for operational constraints on NGSO systems if limits are tightened</li>
                    <li>-- Coordination obligation complexities for systems with thousands of satellites</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* D2D Satellite Spectrum */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
                  D2D
                </div>
                <div>
                  <h4 className="text-white font-semibold">Direct-to-Device (D2D) Satellite Spectrum</h4>
                  <span className="text-xs text-purple-400 font-medium">Emerging Regulatory Area</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Regulatory Landscape</h5>
                  <p className="text-star-300 text-sm leading-relaxed">
                    Direct-to-device satellite services (e.g., SpaceX/T-Mobile, AST SpaceMobile) use terrestrial
                    mobile spectrum from space, creating a new category of spectrum sharing. National regulators are
                    developing frameworks for this hybrid use, with significant implications for existing spectrum
                    rights holders.
                  </p>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Key Issues</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- Whether MNO spectrum licenses extend to satellite-based transmission</li>
                    <li>-- Cross-border interference concerns from satellite beams covering multiple countries</li>
                    <li>-- India auction vs. administrative assignment debate for satellite spectrum</li>
                    <li>-- Compatibility between D2D satellite and terrestrial mobile in the same bands</li>
                    <li>-- ITU WRC-27 agenda item on supplemental satellite component (SSC) allocations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Related Resources */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-white font-semibold mb-3">Legal Research Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=regulations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  FCC/ITU Regulations
                </Link>
                <Link
                  href="/space-insurance"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Space Insurance
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Status Legend Footer */}
        <div className="card p-4 mt-8 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {!isAuctionTab ? (
              <>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${info.bgColor}`} />
                      <span className="text-slate-400">{info.label}</span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  {data.stats.totalBands} bands | {data.stats.totalFilings} total filings | {data.stats.congestedBands} congested
                </span>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(AUCTION_STATUS_STYLES).map(([key, style]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${style.bg.replace('/20', '')}`} />
                      <span className="text-star-300">{style.label}</span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-star-300">
                  {AUCTIONS.length} auctions | {FREQUENCY_BANDS.length} bands | {SATELLITE_OPERATORS.length} operators | {SPECTRUM_CHALLENGES.length} challenges | {REGULATORY_PROCEEDINGS.length} proceedings
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (with Suspense boundary)
// ────────────────────────────────────────

export default function SpectrumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4">
            <AnimatedPageHeader
              title="Spectrum Management"
              subtitle="Satellite frequency allocations, filings, auctions, and spectrum coordination"
              icon="📶"
              accentColor="purple"
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      }
    >
      <SpectrumContent />
    </Suspense>
  );
}
