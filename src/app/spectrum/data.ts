// ────────────────────────────────────────
// Static Data for Spectrum page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────

export type AuctionStatus = 'completed' | 'ongoing' | 'pending' | 'policy';

export interface Auction {
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

export interface FrequencyBand {
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

export interface SatelliteOperator {
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

export interface SpectrumChallenge {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'emerging';
  parties: string[];
  description: string;
  outlook: string;
}

export interface ITUTimelineEvent {
  year: string;
  event: string;
  type: 'wrc' | 'filing' | 'decision' | 'milestone';
  description: string;
}

export interface RegulatoryProceeding {
  id: string;
  body: string;
  title: string;
  docket: string;
  status: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  date: string;
}

// ────────────────────────────────────────
// Constants (original spectrum page)
// ────────────────────────────────────────

export const FILING_STATUS_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500' },
  filed: { label: 'Filed', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  coordinating: { label: 'Coordinating', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  assigned: { label: 'Assigned', color: 'text-purple-400', bgColor: 'bg-purple-500' },
  congested: { label: 'Congested', color: 'text-red-400', bgColor: 'bg-red-500' },
};

export const OPERATOR_FILING_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'approved', label: 'Approved', color: 'bg-green-500/20 text-green-400' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'coordinating', label: 'Coordinating', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'denied', label: 'Denied', color: 'bg-red-500/20 text-red-400' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-500/20 text-gray-400' },
];

export const SERVICE_LABELS: Record<string, string> = {
  fixed_satellite: 'Fixed Satellite',
  mobile_satellite: 'Mobile Satellite',
  earth_exploration: 'Earth Exploration',
  radio_astronomy: 'Radio Astronomy',
  inter_satellite: 'Inter-Satellite',
};

// ── Export column definitions ──

export const FILING_EXPORT_COLUMNS = [
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

export const ALLOCATION_EXPORT_COLUMNS = [
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

export const KNOWN_SATELLITE_OPERATORS = [
  'SpaceX', 'Starlink', 'OneWeb', 'Amazon', 'Kuiper', 'Telesat',
  'SES', 'Intelsat', 'Eutelsat', 'Viasat', 'Hughes', 'Iridium',
  'Globalstar', 'O3b', 'Boeing', 'Inmarsat', 'EchoStar',
];

// ────────────────────────────────────────
// Constants (from spectrum-auctions page)
// ────────────────────────────────────────

export const AUCTIONS: Auction[] = [
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

export const FREQUENCY_BANDS: FrequencyBand[] = [
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

export const SATELLITE_OPERATORS: SatelliteOperator[] = [
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

export const SPECTRUM_CHALLENGES: SpectrumChallenge[] = [
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

export const ITU_REGULATORY_TIMELINE: ITUTimelineEvent[] = [
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

export const REGULATORY_PROCEEDINGS: RegulatoryProceeding[] = [
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

export const AUCTION_STATUS_STYLES: Record<AuctionStatus, { label: string; bg: string; text: string }> = {
  completed: { label: 'Completed', bg: 'bg-green-500/20', text: 'text-green-400' },
  ongoing: { label: 'Ongoing', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  policy: { label: 'Policy Dev', bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

export const IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
};

export const CONGESTION_STYLES: Record<string, { label: string; bg: string; text: string; barColor: string; percent: number }> = {
  low: { label: 'Low', bg: 'bg-green-500/20', text: 'text-green-400', barColor: 'bg-green-500', percent: 20 },
  medium: { label: 'Medium', bg: 'bg-yellow-500/20', text: 'text-yellow-400', barColor: 'bg-yellow-500', percent: 50 },
  high: { label: 'High', bg: 'bg-orange-500/20', text: 'text-orange-400', barColor: 'bg-orange-500', percent: 75 },
  critical: { label: 'Critical', bg: 'bg-red-500/20', text: 'text-red-400', barColor: 'bg-red-500', percent: 95 },
};
