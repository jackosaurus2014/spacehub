/**
 * Regulatory & Legal Intelligence Hub Data Layer
 * Comprehensive data for space law, policy tracking, compliance, and case law
 *
 * Sources:
 * - FAA Office of Commercial Space Transportation: https://www.faa.gov/space
 * - FCC Space Bureau: https://www.fcc.gov/space
 * - NOAA Office of Space Commerce: https://space.commerce.gov
 * - Government Accountability Office: https://www.gao.gov
 * - Congressional Research Service reports
 * - UN Office for Outer Space Affairs: https://www.unoosa.org
 * - Law firm publications and case law databases
 */

import prisma from './db';
import { logger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export type PolicyStatus = 'proposed' | 'final' | 'effective' | 'pending' | 'withdrawn' | 'superseded';
export type AgencyType = 'FAA' | 'FCC' | 'NOAA' | 'BIS' | 'DDTC' | 'NASA' | 'DOD' | 'DOS';
export type CaseJurisdiction = 'federal' | 'state' | 'international' | 'arbitration' | 'gao';
export type CaseOutcome = 'plaintiff_victory' | 'defendant_victory' | 'settlement' | 'dismissed' | 'pending' | 'vacated';
export type ExpertSourceType = 'law_firm' | 'think_tank' | 'government' | 'academic' | 'industry_association';
export type LicenseCategory = 'launch' | 'satellite' | 'remote_sensing' | 'spectrum' | 'export';
export type TreatyType = 'un_treaty' | 'bilateral' | 'multilateral' | 'itu' | 'memorandum';

export interface PolicyChange {
  id: string;
  slug: string;
  agency: AgencyType;
  title: string;
  summary: string;
  fullText?: string;
  impactAnalysis: string;
  impactSeverity: 'low' | 'medium' | 'high' | 'critical';
  impactAreas: string[];
  status: PolicyStatus;
  federalRegisterCitation?: string;
  docketNumber?: string;
  publishedDate: string;
  commentDeadline?: string;
  effectiveDate?: string;
  keyChanges: string[];
  affectedParties: string[];
  sourceUrl: string;
  relatedPolicies?: string[];
}

export interface LicenseRequirement {
  id: string;
  slug: string;
  agency: AgencyType;
  licenseType: string;
  category: LicenseCategory;
  description: string;
  regulatoryBasis: string;
  requirements: string[];
  processingTimeMin: number;
  processingTimeMax: number;
  applicationFee?: number;
  annualFee?: number;
  validityYears?: number;
  isRenewable: boolean;
  guidanceDocuments: string[];
  applicationUrl?: string;
  recentChanges?: string[];
  notes?: string;
}

export interface SpaceLawCase {
  id: string;
  slug: string;
  caseName: string;
  citation?: string;
  year: number;
  jurisdiction: CaseJurisdiction;
  court?: string;
  parties: {
    plaintiff: string;
    defendant: string;
  };
  subjectMatter: string[];
  summary: string;
  facts: string;
  holdings: string[];
  outcome: CaseOutcome;
  damages?: number;
  damagesDescription?: string;
  significance: string;
  precedentValue: string;
  keyQuotes?: string[];
  relatedCases?: string[];
  sourceUrl?: string;
}

export interface ExpertSource {
  id: string;
  slug: string;
  name: string;
  type: ExpertSourceType;
  organization?: string;
  url: string;
  feedUrl?: string;
  topics: string[];
  description: string;
  keyContributors?: string[];
  isActive: boolean;
  lastUpdated?: string;
}

export interface ECCNClassification {
  id: string;
  eccn: string;
  description: string;
  category: string;
  productGroup: string;
  reasonForControl: string[];
  licenseRequirements: string;
  licenseExceptions: string[];
  spaceRelevance: string;
  examples: string[];
  relatedECCNs?: string[];
}

export interface USMLCategory {
  id: string;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  items: string[];
  spaceRelevance: string;
  licensingAuthority: string;
  exemptions?: string[];
  relatedCategories?: string[];
}

export interface TreatyObligation {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  type: TreatyType;
  adoptedDate: string;
  effectiveDate: string;
  parties: number;
  usRatified: boolean;
  keyObligations: string[];
  commercialImplications: string[];
  enforcementMechanism: string;
  usImplementation: string;
  sourceUrl: string;
}

// ============================================================================
// FEDERAL REGISTER API TYPES
// ============================================================================

/**
 * Raw response from Federal Register API documents.json endpoint
 */
export interface FederalRegisterApiResponse {
  count: number;
  description: string;
  total_pages: number;
  next_page_url: string | null;
  results: FederalRegisterApiDocument[];
}

/**
 * Individual document from Federal Register API
 */
export interface FederalRegisterApiDocument {
  document_number: string;
  title: string;
  type: string;
  abstract: string | null;
  publication_date: string;
  effective_on: string | null;
  agencies: Array<{
    raw_name: string;
    name: string;
    id: number;
    url: string;
    json_url: string;
    parent_id: number | null;
    slug: string;
  }>;
  html_url: string;
  pdf_url: string;
  public_inspection_pdf_url: string | null;
  citation: string | null;
  docket_ids: string[];
  regulation_id_numbers: string[];
  significant: boolean;
}

/**
 * Transformed Federal Register document for internal use
 */
export interface FederalRegisterDocument {
  documentNumber: string;
  title: string;
  type: string;
  abstract: string | null;
  publicationDate: string;
  effectiveOn: string | null;
  agencies: string[];
  agencySlugs: string[];
  htmlUrl: string;
  pdfUrl: string;
  citation: string | null;
  docketIds: string[];
  regulationIdNumbers: string[];
  significant: boolean;
}

/**
 * Options for fetching Federal Register updates
 */
export interface FederalRegisterFetchOptions {
  agencies?: string[];
  searchTerm?: string;
  perPage?: number;
  startDate?: string;
  endDate?: string;
  documentTypes?: string[];
}

/**
 * Result from fetching Federal Register updates
 */
export interface FederalRegisterFetchResult {
  success: boolean;
  documents?: FederalRegisterDocument[];
  totalCount?: number;
  error?: string;
}

// ============================================================================
// POLICY TRACKER DATA - FAA, FCC, NOAA Regulatory Changes
// ============================================================================

export const POLICY_CHANGES: PolicyChange[] = [
  // TraCSS - Traffic Coordination System for Space
  {
    id: 'tracss-implementation',
    slug: 'tracss-traffic-coordination-system',
    agency: 'NOAA',
    title: 'Traffic Coordination System for Space (TraCSS) Implementation',
    summary: 'NOAA Office of Space Commerce develops civil space situational awareness system to provide spaceflight safety services to satellite operators worldwide.',
    fullText: 'TraCSS represents a fundamental shift in how space traffic management is conducted. The system integrates multiple data sources including commercial providers and international partners to deliver conjunction warnings and collision avoidance services.',
    impactAnalysis: 'TraCSS will provide free, open-access conjunction data messages (CDMs) to satellite operators, enabling better collision avoidance decisions. The system covers approximately 80% of active spacecraft and aims to become the authoritative source for civil space situational awareness.',
    impactSeverity: 'high',
    impactAreas: ['satellite_operations', 'collision_avoidance', 'space_traffic_management', 'debris_mitigation'],
    status: 'pending',
    publishedDate: '2024-06-01',
    effectiveDate: '2026-01-01',
    keyChanges: [
      'Transition from DoD-operated space catalog to civil agency',
      'Open data policy (CC0-1.0 license) for most tracking data',
      'Free conjunction data messages for all operators',
      'Integration with commercial SSA providers',
      'On-demand and bulk screening capabilities',
      'International data sharing agreements',
    ],
    affectedParties: ['satellite_operators', 'launch_providers', 'commercial_ssa_providers', 'international_partners'],
    sourceUrl: 'https://space.commerce.gov/traffic-coordination-system-for-space-tracss/',
    relatedPolicies: ['spd-3-space-traffic-management'],
  },

  // FCC 5-Year Deorbit Rule
  {
    id: 'fcc-5-year-deorbit',
    slug: 'fcc-5-year-deorbit-rule',
    agency: 'FCC',
    title: 'FCC 5-Year Post-Mission Orbital Debris Disposal Rule',
    summary: 'FCC reduces post-mission disposal period for LEO satellites from 25 years to 5 years to address orbital debris concerns.',
    impactAnalysis: 'This rule significantly increases the operational requirements for LEO satellite operators. Satellites must be designed with sufficient propellant reserves or deployed at altitudes enabling natural decay within 5 years. Non-compliance may result in license denial or revocation.',
    impactSeverity: 'critical',
    impactAreas: ['leo_satellites', 'satellite_design', 'constellation_planning', 'orbital_debris'],
    status: 'effective',
    federalRegisterCitation: 'FCC 22-74',
    docketNumber: 'IB Docket No. 18-313',
    publishedDate: '2022-09-29',
    effectiveDate: '2024-09-29',
    keyChanges: [
      'Maximum 5-year post-mission disposal (previously 25 years)',
      'Applies to satellites at or below 2,000 km altitude',
      'Covers both US-licensed and market access satellites',
      'Grandfathering for satellites in orbit as of effective date',
      'Two-year grace period for pre-authorized but not launched satellites',
      'Applies to license modifications for additional satellites',
    ],
    affectedParties: ['leo_satellite_operators', 'constellation_operators', 'cubesat_developers', 'commercial_ssa'],
    sourceUrl: 'https://www.fcc.gov/document/fcc-adopts-new-5-year-rule-deorbiting-satellites-0',
  },

  // FAA Part 450 Transition
  {
    id: 'faa-part-450-transition',
    slug: 'faa-part-450-full-transition',
    agency: 'FAA',
    title: 'FAA Part 450 Streamlined Launch and Reentry Licensing - Full Transition',
    summary: 'All legacy commercial space launch and reentry licenses must transition to the performance-based Part 450 framework by March 10, 2026.',
    impactAnalysis: 'Part 450 replaces prescriptive regulations with performance-based requirements, giving operators flexibility in demonstrating safety compliance. This modernization reduces licensing burden while maintaining public safety standards.',
    impactSeverity: 'high',
    impactAreas: ['launch_licensing', 'reentry_licensing', 'vehicle_operators', 'spaceports'],
    status: 'pending',
    federalRegisterCitation: '14 CFR Part 450',
    publishedDate: '2020-12-10',
    effectiveDate: '2026-03-10',
    keyChanges: [
      'Consolidates Parts 415, 417, 431, and 435 into single Part 450',
      'Performance-based safety requirements replace prescriptive rules',
      '20 license holders require transition',
      'Single license framework for all vehicle types',
      'Flexible compliance approaches permitted',
      'Streamlined modification procedures',
    ],
    affectedParties: ['launch_providers', 'spaceport_operators', 'reentry_operators', 'safety_analysts'],
    sourceUrl: 'https://www.faa.gov/space/licenses/operator_licenses_permits',
    relatedPolicies: ['faa-part-414-safety-approvals'],
  },

  // FCC Space Modernization NPRM
  {
    id: 'fcc-space-modernization',
    slug: 'fcc-space-modernization-nprm',
    agency: 'FCC',
    title: 'Space Modernization for the 21st Century (Part 100)',
    summary: 'Comprehensive overhaul of FCC Part 25 satellite licensing rules, potentially establishing new Part 100 framework to streamline satellite licensing.',
    impactAnalysis: 'This modernization effort aims to accelerate licensing, reduce regulatory burden, and enable emerging space activities including ISAM and lunar missions. The licensing assembly line concept could dramatically reduce processing times.',
    impactSeverity: 'high',
    impactAreas: ['satellite_licensing', 'earth_stations', 'spectrum_sharing', 'novel_missions', 'isam'],
    status: 'proposed',
    docketNumber: 'IB Docket No. 24-234',
    publishedDate: '2024-10-28',
    commentDeadline: '2025-01-27',
    keyChanges: [
      'Proposed elimination of GSO surety bond requirement',
      'Expanded bond exemptions for small satellites',
      'Processing rounds only for 200+ satellite NGSO systems',
      'New expedited "licensing assembly line" process',
      'Framework for novel missions (ISAM, lunar, cislunar)',
      'Nationwide blanket earth station licensing option',
      'New "Immovable" earth station classification',
    ],
    affectedParties: ['satellite_operators', 'earth_station_operators', 'isam_companies', 'lunar_operators'],
    sourceUrl: 'https://www.fcc.gov/document/space-modernization-21st-century-nprm',
  },

  // FAA Human Spaceflight Requirements
  {
    id: 'faa-human-spaceflight-moratorium',
    slug: 'faa-human-spaceflight-regulatory-moratorium',
    agency: 'FAA',
    title: 'Commercial Human Spaceflight Regulatory Moratorium Extension Discussions',
    summary: 'Ongoing discussions about the FAA moratorium on occupant safety regulations for commercial human spaceflight, originally set to expire in 2023 but extended.',
    impactAnalysis: 'The moratorium has allowed the commercial human spaceflight industry to develop without prescriptive safety regulations. Extension debates involve balancing industry growth with passenger safety as flights become more routine.',
    impactSeverity: 'medium',
    impactAreas: ['human_spaceflight', 'space_tourism', 'suborbital_flights', 'passenger_safety'],
    status: 'effective',
    federalRegisterCitation: '51 U.S.C. § 50905',
    publishedDate: '2023-01-01',
    effectiveDate: '2024-01-01',
    keyChanges: [
      'Moratorium on prescriptive occupant safety regulations continues',
      'Informed consent requirements remain in place',
      'FAA may still issue regulations to protect crew',
      'Industry self-regulation and voluntary standards encouraged',
      'Congressional oversight continues',
    ],
    affectedParties: ['space_tourism_operators', 'suborbital_providers', 'spaceflight_participants'],
    sourceUrl: 'https://www.faa.gov/space/licenses',
  },

  // NOAA Remote Sensing Tier Conditions
  {
    id: 'noaa-tier3-conditions-relaxation',
    slug: 'noaa-tier3-remote-sensing-relaxation',
    agency: 'NOAA',
    title: 'NOAA Tier 3 Remote Sensing License Conditions Relaxation',
    summary: 'NOAA permanently removed 39 temporary operating conditions from Tier 3 commercial remote sensing licenses, significantly expanding imaging capabilities.',
    impactAnalysis: 'This regulatory relief enables advanced commercial remote sensing systems to operate with fewer restrictions. Global imaging restrictions now cover less than 1% of Earth\'s surface, dramatically expanding commercial Earth observation capabilities.',
    impactSeverity: 'high',
    impactAreas: ['remote_sensing', 'sar_imaging', 'earth_observation', 'commercial_imaging'],
    status: 'effective',
    publishedDate: '2023-07-19',
    effectiveDate: '2023-07-19',
    keyChanges: [
      '39 temporary conditions permanently expired',
      'Global imaging restrictions reduced to <1% of Earth surface',
      'All X-Band SAR temporary conditions removed',
      'Non-Earth Imaging restrictions relaxed',
      'Rapid revisit conditions partially removed',
      'Only small number of national security conditions retained',
    ],
    affectedParties: ['remote_sensing_operators', 'sar_satellite_operators', 'geospatial_companies', 'defense_contractors'],
    sourceUrl: 'https://space.commerce.gov/noaa-eliminates-restrictive-operating-conditions-from-commercial-remote-sensing-satellite-licenses/',
  },

  // Export Control Reform
  {
    id: 'bis-commercial-space-export',
    slug: 'bis-commercial-space-export-controls',
    agency: 'BIS',
    title: 'Revisions to Export Controls on Commercial Space Items',
    summary: 'BIS proposes updates to EAR to clarify jurisdiction between EAR and ITAR for commercial space items and expand license exceptions.',
    impactAnalysis: 'These changes would provide clearer guidance on export control classification for commercial space items and potentially reduce licensing burden for exports to allied countries.',
    impactSeverity: 'medium',
    impactAreas: ['export_controls', 'satellite_exports', 'technology_transfer', 'international_partnerships'],
    status: 'proposed',
    docketNumber: 'BIS-2024-0001',
    publishedDate: '2024-06-15',
    commentDeadline: '2024-09-15',
    keyChanges: [
      'Clarification of 9x515 satellite classifications',
      'Expanded license exceptions for allied countries',
      'Updated deemed export provisions for space technology',
      'Streamlined licensing for commercial communication satellites',
    ],
    affectedParties: ['satellite_manufacturers', 'component_suppliers', 'technology_exporters', 'international_partners'],
    sourceUrl: 'https://www.bis.doc.gov/',
  },

  // NASA Artemis Accords Implementation
  {
    id: 'nasa-artemis-accords',
    slug: 'nasa-artemis-accords-implementation',
    agency: 'NASA',
    title: 'Artemis Accords Bilateral Implementation',
    summary: 'NASA continues bilateral implementation of Artemis Accords principles with partner nations for sustainable and transparent lunar exploration.',
    impactAnalysis: 'The Artemis Accords establish norms for civil space exploration that may influence future international space governance. Commercial entities operating under NASA contracts must consider these principles.',
    impactSeverity: 'medium',
    impactAreas: ['lunar_exploration', 'international_cooperation', 'space_resources', 'safety_zones'],
    status: 'effective',
    publishedDate: '2020-10-13',
    effectiveDate: '2020-10-13',
    keyChanges: [
      '46 signatory nations as of 2025',
      'Interoperability standards for lunar operations',
      'Safety zone notification requirements',
      'Space resource extraction principles',
      'Orbital debris mitigation commitments',
      'Emergency assistance obligations',
    ],
    affectedParties: ['lunar_operators', 'international_partners', 'space_resource_companies', 'nasa_contractors'],
    sourceUrl: 'https://www.nasa.gov/artemis-accords/',
  },
];

// ============================================================================
// COMPLIANCE WIZARD DATA - License Requirements Checklist
// ============================================================================

export const LICENSE_REQUIREMENTS: LicenseRequirement[] = [
  // FAA Launch Licenses
  {
    id: 'faa-vehicle-operator-license',
    slug: 'faa-vehicle-operator-license',
    agency: 'FAA',
    licenseType: 'Vehicle Operator License',
    category: 'launch',
    description: 'Primary authorization for commercial launch and reentry operations under the streamlined Part 450 framework.',
    regulatoryBasis: '14 CFR Part 450',
    requirements: [
      'Pre-application consultation with FAA AST',
      'Policy approval demonstrating responsible operations',
      'Flight safety analysis showing acceptable public risk (Ec < 30×10⁻⁶)',
      'Ground safety analysis with hazard identification',
      'Environmental review (NEPA) - EA or EIS as appropriate',
      'Maximum Probable Loss (MPL) determination',
      'Financial responsibility demonstration ($500M third party, $100M government)',
      'Operations and maintenance procedures',
      'Software safety assessment for flight-critical systems',
      'Collision avoidance analysis for orbital insertions',
      'Emergency response plan coordination',
    ],
    processingTimeMin: 114,
    processingTimeMax: 180,
    validityYears: 5,
    isRenewable: true,
    guidanceDocuments: [
      'AC 450.101-1: Flight Safety Analysis',
      'AC 450.131-1: Collision Avoidance Analysis',
      'AC 450.161-1: Ground Safety Analysis',
      'AC 450.171-1: Computing Systems and Software',
      'AC 450.181-1: Operational Safety',
    ],
    applicationUrl: 'https://www.faa.gov/space/licenses/operator_licenses_permits',
    recentChanges: [
      'All legacy licenses must transition to Part 450 by March 10, 2026',
      'Blue Origin New Glenn received Part 450 license in 114 days (January 2025)',
      'FAA reached 1,000th licensed commercial space operation in 2025',
    ],
    notes: 'Processing times improving as FAA gains Part 450 experience. Pre-application consultation strongly recommended.',
  },
  {
    id: 'faa-site-operator-license',
    slug: 'faa-site-operator-license',
    agency: 'FAA',
    licenseType: 'Launch Site Operator License (Spaceport License)',
    category: 'launch',
    description: 'Authorization to operate a commercial launch or reentry site that hosts separately licensed vehicle operations.',
    regulatoryBasis: '14 CFR Part 420',
    requirements: [
      'Environmental Assessment or Environmental Impact Statement',
      'Explosive site plan compliance (quantity-distance requirements)',
      'Safety area analysis for flight corridors',
      'Local coordination with emergency services',
      'Air traffic impact assessment',
      'Ground safety plan for facility operations',
      'Security plan for public access control',
      'Demonstration of equivalent level of safety',
    ],
    processingTimeMin: 180,
    processingTimeMax: 365,
    validityYears: 5,
    isRenewable: true,
    guidanceDocuments: [
      'Launch Site Operator License Application Checklist',
      'Advisory Circular 420.1: Launch Site Licensing',
    ],
    applicationUrl: 'https://www.faa.gov/space/licenses/spaceport_license',
    notes: 'Currently 14 FAA-licensed spaceports in US (9 horizontal, 4 vertical, 1 both). One licensed reentry site.',
  },
  {
    id: 'faa-experimental-permit',
    slug: 'faa-experimental-permit',
    agency: 'FAA',
    licenseType: 'Experimental Permit',
    category: 'launch',
    description: 'Streamlined authorization for developmental reusable suborbital vehicles or launch vehicles for R&D, compliance demonstration, or crew training.',
    regulatoryBasis: '14 CFR Part 437',
    requirements: [
      'Vehicle must be reusable (suborbital rocket or launch vehicle)',
      'Limited to R&D, compliance demonstration, or crew training',
      'No carrying property or people for compensation',
      'Real-time position and velocity measurement capability',
      'Communication with Air Traffic Control during all phases',
      'Financial responsibility demonstration',
      'Vehicle available for FAA inspection before permit issuance',
      'Operating procedures and limitations documentation',
    ],
    processingTimeMin: 120,
    processingTimeMax: 150,
    validityYears: 1,
    isRenewable: false,
    guidanceDocuments: [
      'Experimental Permit Program Guide',
      'Sample Experimental Permit Application',
      'Calculation of Safety Clear Zones for Experimental Permits',
    ],
    applicationUrl: 'https://www.faa.gov/space/licenses/experimental-permits-reusable-suborbital-rockets',
    notes: 'Permits authorize unlimited launches/reentries from specified site for one year. Not eligible for government indemnification.',
  },

  // FCC Satellite Licenses
  {
    id: 'fcc-gso-space-station',
    slug: 'fcc-gso-space-station-license',
    agency: 'FCC',
    licenseType: 'GSO Space Station License',
    category: 'satellite',
    description: 'Authorization to operate geostationary orbit communications satellites serving the United States market.',
    regulatoryBasis: '47 CFR Part 25',
    requirements: [
      'Technical analysis demonstrating non-interference with existing systems',
      'Orbital debris mitigation plan (25-year post-mission disposal for GEO)',
      'ITU coordination filings through FCC',
      'Surety bond (proposed to be eliminated under Part 100)',
      'Milestone schedule for system deployment',
      'Legal, technical, and financial qualifications',
      'Contact information and 24/7 operations capability',
      'Station-keeping and end-of-life disposal plan',
    ],
    processingTimeMin: 180,
    processingTimeMax: 270,
    applicationFee: 471575,
    annualFee: 117580,
    validityYears: 15,
    isRenewable: true,
    guidanceDocuments: [
      'Part 25 Space Station License Checklist',
      'FAQ: Processing of Space Station Applications',
    ],
    applicationUrl: 'https://www.fcc.gov/space/space-stations',
    recentChanges: [
      'Space Modernization NPRM proposes eliminating surety bond requirement',
      'FY 2024 regulatory fee: $117,580 per operational GSO station',
    ],
    notes: 'First-come/first-served processing. Longer processing with waiver requests or shared federal bands.',
  },
  {
    id: 'fcc-ngso-space-station',
    slug: 'fcc-ngso-space-station-license',
    agency: 'FCC',
    licenseType: 'NGSO Space Station License',
    category: 'satellite',
    description: 'Authorization to operate non-geostationary satellite systems including LEO and MEO constellations.',
    regulatoryBasis: '47 CFR Part 25',
    requirements: [
      'Technical analysis for spectrum sharing with GSO systems',
      'Orbital debris mitigation plan (5-year disposal for LEO)',
      'ITU coordination filings',
      'Surety bond for systems with 200+ satellites',
      'Milestone schedule for constellation deployment',
      'Collision avoidance capabilities',
      'Legal, technical, and financial qualifications',
      'Inter-satellite link specifications if applicable',
    ],
    processingTimeMin: 180,
    processingTimeMax: 365,
    applicationFee: 471575,
    annualFee: 347755,
    validityYears: 15,
    isRenewable: true,
    guidanceDocuments: [
      'Part 25 Space Station License Checklist',
      'NGSO Spectrum Sharing Requirements',
    ],
    applicationUrl: 'https://www.fcc.gov/space/space-stations',
    recentChanges: [
      'FY 2025: New NGSO-Small and NGSO-Large constellation fee categories',
      'Processing rounds apply to 200+ satellite systems',
    ],
    notes: 'Processing round procedures apply to larger constellations in shared bands.',
  },
  {
    id: 'fcc-small-satellite',
    slug: 'fcc-small-satellite-license',
    agency: 'FCC',
    licenseType: 'Small Satellite License (Streamlined)',
    category: 'satellite',
    description: 'Streamlined licensing for small satellites meeting specific size, altitude, and lifetime criteria.',
    regulatoryBasis: '47 CFR Part 25 (Streamlined Small Satellite Process)',
    requirements: [
      'Maximum 10 satellites per license',
      'Maximum 6-year in-orbit lifetime per satellite',
      'Maximum 180 kg mass per satellite (including propellant)',
      'Deployment below 600 km OR propulsion for collision avoidance',
      'Minimum 10 cm dimension for trackability',
      'Unique telemetry marker per satellite',
      'Orbital debris mitigation compliance',
      'Deorbit capability or natural decay within 6 years',
    ],
    processingTimeMin: 180,
    processingTimeMax: 270,
    applicationFee: 30000,
    annualFee: 12330,
    validityYears: 6,
    isRenewable: false,
    guidanceDocuments: [
      'Small Satellite Licensing Process Overview',
      'Small Spacecraft Eligibility Criteria',
    ],
    applicationUrl: 'https://www.fcc.gov/space/small-satellite-and-small-spacecraft-licensing-process',
    recentChanges: [
      'One-year grace period from surety bond requirement',
      'Exempt from processing round procedures',
    ],
    notes: 'Created in 2019 for small satellite industry. $30,000 fee vs $471,575 for standard license.',
  },
  {
    id: 'fcc-earth-station',
    slug: 'fcc-earth-station-license',
    agency: 'FCC',
    licenseType: 'Earth Station License',
    category: 'satellite',
    description: 'Authorization to operate ground-based earth stations for satellite communications.',
    regulatoryBasis: '47 CFR Part 25',
    requirements: [
      'Frequency coordination analysis for shared terrestrial bands',
      'Technical specifications of antenna and transmission parameters',
      'Identification of satellites to be accessed',
      'Coordination with existing earth stations if required',
      'Environmental assessment for large antennas',
      'Compliance with RF exposure limits',
    ],
    processingTimeMin: 60,
    processingTimeMax: 180,
    validityYears: 15,
    isRenewable: true,
    guidanceDocuments: [
      'Earth Station Licensing Overview',
      'Earth Station Technical Filing Requirements',
    ],
    applicationUrl: 'https://www.fcc.gov/space/overview-earth-station-licensing-and-license-contents',
    recentChanges: [
      'Space Modernization NPRM proposes nationwide blanket licensing option',
      'Proposed new "Immovable" earth station class',
      'Expedited 7-day processing for qualifying applications',
    ],
  },

  // NOAA Remote Sensing
  {
    id: 'noaa-tier1-remote-sensing',
    slug: 'noaa-tier1-remote-sensing',
    agency: 'NOAA',
    licenseType: 'Tier 1 Remote Sensing License',
    category: 'remote_sensing',
    description: 'License for systems producing data substantially the same as currently available unenhanced data from unregulated sources.',
    regulatoryBasis: '15 CFR Part 960',
    requirements: [
      'System capabilities match currently available unregulated data',
      'Statutory conditions only (data archiving, government access)',
      'Annual compliance certification',
      'Disposition agreement for space debris',
      'Data protection and security measures',
    ],
    processingTimeMin: 14,
    processingTimeMax: 60,
    isRenewable: true,
    guidanceDocuments: [
      'CRSRA Application Guide',
      'Tier 1 Eligibility Criteria',
    ],
    applicationUrl: 'https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/licensing/',
    notes: 'Most permissive tier. NOT subject to shutter control or limited-operations directives.',
  },
  {
    id: 'noaa-tier2-remote-sensing',
    slug: 'noaa-tier2-remote-sensing',
    agency: 'NOAA',
    licenseType: 'Tier 2 Remote Sensing License',
    category: 'remote_sensing',
    description: 'License for systems producing data substantially the same as data available only from other US sources.',
    regulatoryBasis: '15 CFR Part 960',
    requirements: [
      'System capabilities match US-only available data',
      'Consent required from ARSO owners for resolved imaging of their spacecraft',
      '5-day advance notification to Secretary of Commerce for ARSO imaging',
      'Annual compliance certification',
      'Data archiving and government access requirements',
    ],
    processingTimeMin: 14,
    processingTimeMax: 60,
    isRenewable: true,
    guidanceDocuments: [
      'CRSRA Application Guide',
      'ARSO Imaging Requirements',
    ],
    applicationUrl: 'https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/licensing/',
    notes: 'ARSO = Artificial Resident Space Object (other satellites in orbit).',
  },
  {
    id: 'noaa-tier3-remote-sensing',
    slug: 'noaa-tier3-remote-sensing',
    agency: 'NOAA',
    licenseType: 'Tier 3 Remote Sensing License',
    category: 'remote_sensing',
    description: 'License for systems with capabilities producing unenhanced data not available from any domestic or foreign source.',
    regulatoryBasis: '15 CFR Part 960',
    requirements: [
      'Most capable/novel imaging systems',
      'May have temporary operating conditions',
      'Conditions reviewed and may expire over time',
      'Subject to national security review',
      'Annual compliance certification',
      'Enhanced data protection measures',
    ],
    processingTimeMin: 30,
    processingTimeMax: 120,
    isRenewable: true,
    guidanceDocuments: [
      'CRSRA Application Guide',
      'Tier 3 Operating Conditions Framework',
    ],
    applicationUrl: 'https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/licensing/',
    recentChanges: [
      'July 2023: 39 temporary conditions permanently expired',
      'Most X-Band SAR restrictions removed',
      'Imaging restrictions reduced to <1% of Earth surface',
    ],
    notes: 'Processing time reduced from 48 days (2020) to 14 days (2023) on average.',
  },

  // ITU Spectrum Coordination
  {
    id: 'itu-spectrum-coordination',
    slug: 'itu-spectrum-coordination',
    agency: 'FCC',
    licenseType: 'ITU Spectrum Coordination (via FCC)',
    category: 'spectrum',
    description: 'International coordination of satellite spectrum through FCC filings to the ITU Radiocommunication Bureau.',
    regulatoryBasis: 'ITU Radio Regulations Articles 9, 11, 21',
    requirements: [
      'Advance Publication Information (API) filing 2-7 years before operation',
      'Coordination Request (CR) with potentially affected systems',
      'Technical coordination negotiations with other administrations',
      '7-year regulatory deadline to bring network into use (BIU)',
      'Due diligence documentation for spectrum rights maintenance',
      'Notification filing upon system deployment',
    ],
    processingTimeMin: 730,
    processingTimeMax: 2555,
    isRenewable: false,
    guidanceDocuments: [
      'ITU Appendix 4 - Information Requirements',
      'FCC International Bureau Filing Procedures',
    ],
    notes: 'Date priority system determines interference rights. Coordination can take years.',
  },
];

// ============================================================================
// INTERNATIONAL TREATY OBLIGATIONS
// ============================================================================

export const TREATY_OBLIGATIONS: TreatyObligation[] = [
  {
    id: 'outer-space-treaty',
    slug: 'outer-space-treaty-1967',
    name: 'Outer Space Treaty',
    fullName: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies',
    type: 'un_treaty',
    adoptedDate: '1966-12-19',
    effectiveDate: '1967-10-10',
    parties: 118,
    usRatified: true,
    keyObligations: [
      'Space exploration shall be for the benefit of all countries (Article I)',
      'Outer space is free for exploration and use by all States (Article I)',
      'Outer space is not subject to national appropriation (Article II)',
      'States shall not place nuclear weapons in space (Article IV)',
      'Astronauts are envoys of mankind and shall be rendered assistance (Article V)',
      'States bear international responsibility for national space activities (Article VI)',
      'States must authorize and supervise non-governmental activities (Article VI)',
      'Launching State is liable for damage caused by space objects (Article VII)',
    ],
    commercialImplications: [
      'Article VI requires government authorization of private activities (basis for licensing regimes)',
      'States are internationally responsible for commercial operator activities',
      'Prohibition on national appropriation raises questions about space resource utilization',
      'Liability provisions require insurance and indemnification frameworks',
      'International consultations required for potentially harmful interference',
    ],
    enforcementMechanism: 'State responsibility and liability; diplomatic channels; ICJ jurisdiction where agreed',
    usImplementation: 'Implemented through FAA (launches), FCC (communications), NOAA (remote sensing) licensing; executive orders; various implementing statutes',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html',
  },
  {
    id: 'liability-convention',
    slug: 'liability-convention-1972',
    name: 'Liability Convention',
    fullName: 'Convention on International Liability for Damage Caused by Space Objects',
    type: 'un_treaty',
    adoptedDate: '1972-03-29',
    effectiveDate: '1972-09-01',
    parties: 98,
    usRatified: true,
    keyObligations: [
      'Absolute liability for damage on Earth surface or to aircraft in flight (Article II)',
      'Fault-based liability for damage in outer space (Article III)',
      'Joint and several liability for joint launches (Article V)',
      'Claims presented through diplomatic channels (Article IX)',
      'One-year statute of limitations from date of damage (Article X)',
      'Claims Commission for dispute resolution (Articles XIV-XX)',
    ],
    commercialImplications: [
      'Launching State liable even for private company activities',
      'Creates basis for government indemnification programs',
      'Operators must carry liability insurance',
      'Only one claim ever filed: Cosmos 954 (Canada v USSR, 1978)',
      'Growing constellation activity increases collision and liability risk',
    ],
    enforcementMechanism: 'Diplomatic claims; Claims Commission; international arbitration',
    usImplementation: 'FAA requires MPL determination and insurance up to $500M (third party) and $100M (government). Government provides indemnification above these limits.',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html',
  },
  {
    id: 'registration-convention',
    slug: 'registration-convention-1976',
    name: 'Registration Convention',
    fullName: 'Convention on Registration of Objects Launched into Outer Space',
    type: 'un_treaty',
    adoptedDate: '1975-01-14',
    effectiveDate: '1976-09-15',
    parties: 75,
    usRatified: true,
    keyObligations: [
      'Launching States shall maintain national registry of space objects (Article II)',
      'Information provided to UN Secretary-General for central register (Article III)',
      'Registration includes: designator, launch date/location, orbital parameters, function (Article IV)',
      'Assists identification for liability purposes',
      'Mark space objects for identification where practicable',
    ],
    commercialImplications: [
      'Determines which state has jurisdiction over commercial satellites',
      'Establishes state responsibility under OST Article VI',
      '54 countries and 2 international organizations register satellites',
      'Over 8,126 satellites registered as of 2024',
      'Majority of active satellites are now commercial',
    ],
    enforcementMechanism: 'National registration requirements; FCC and FAA license conditions',
    usImplementation: 'NASA maintains US registry. Commercial operators provide information as condition of FCC and FAA licenses.',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/registration-convention.html',
  },
  {
    id: 'itu-constitution',
    slug: 'itu-constitution-convention',
    name: 'ITU Constitution and Radio Regulations',
    fullName: 'Constitution and Convention of the International Telecommunication Union and Radio Regulations',
    type: 'itu',
    adoptedDate: '1865-05-17',
    effectiveDate: '1865-05-17',
    parties: 193,
    usRatified: true,
    keyObligations: [
      'International spectrum allocation for all radio services',
      'Satellite network coordination procedures (RR Article 9)',
      'Notification and recording of frequency assignments (RR Article 11)',
      'Advance Publication Information requirements',
      'Seven-year deadline to bring satellite network into use',
      'No harmful interference to other systems',
    ],
    commercialImplications: [
      'All satellite operators must coordinate spectrum through ITU',
      'Date priority system determines interference rights',
      'Failure to coordinate can result in loss of spectrum rights',
      'World Radiocommunication Conferences update allocations every 4 years',
      'Coordination negotiations can take years for complex constellations',
    ],
    enforcementMechanism: 'ITU procedures; national spectrum regulators; coordination negotiations',
    usImplementation: 'FCC prepares and submits US satellite filings. NTIA coordinates federal user interests.',
    sourceUrl: 'https://www.itu.int/en/ITU-R/terrestrial/fmd/Pages/regulatory_procedures.aspx',
  },
];

// ============================================================================
// CASE LAW ARCHIVE - Space-Related Legal Cases
// ============================================================================

export const SPACE_LAW_CASES: SpaceLawCase[] = [
  // Cosmos 954 - Seminal Liability Convention Case
  {
    id: 'cosmos-954',
    slug: 'cosmos-954-canada-ussr',
    caseName: 'Cosmos 954 Claim (Canada v. USSR)',
    year: 1978,
    jurisdiction: 'international',
    parties: {
      plaintiff: 'Canada',
      defendant: 'Union of Soviet Socialist Republics',
    },
    subjectMatter: ['space_liability', 'nuclear_debris', 'environmental_damage'],
    summary: 'First and only formal claim under the 1972 Liability Convention. Soviet nuclear-powered satellite Cosmos 954 reentered atmosphere uncontrolled and scattered radioactive debris across northern Canada.',
    facts: 'On January 24, 1978, Cosmos 954, a Soviet radar ocean reconnaissance satellite powered by a nuclear reactor, reentered the Earth\'s atmosphere and broke apart over northern Canada. Radioactive debris was scattered over approximately 124,000 square kilometers of Canadian territory, primarily in the Northwest Territories. Canada conducted "Operation Morning Light," a massive search and cleanup effort costing over $14 million CAD.',
    holdings: [
      'USSR accepted responsibility through diplomatic settlement',
      'USSR paid CAD $3 million (approximately $6 million CAD claimed)',
      'Settlement reached without formal Claims Commission',
      'Established precedent for absolute liability under Liability Convention',
    ],
    outcome: 'settlement',
    damages: 3000000,
    damagesDescription: 'CAD $3 million paid by USSR in full and final settlement (Canada claimed $6 million)',
    significance: 'Only claim ever presented under the Liability Convention. Established important precedent for state responsibility for nuclear-powered satellites and cleanup costs. Demonstrated the practical application of absolute liability for ground damage.',
    precedentValue: 'Landmark case establishing practical application of 1972 Liability Convention. Shows absolute liability applies regardless of fault for damage on Earth\'s surface. Sets precedent for cleanup cost recovery.',
    keyQuotes: [
      'The principle of absolute liability applies to damage caused by a space object on the surface of the earth',
      'Canada claims compensation for all reasonable costs of search, recovery, and cleanup',
    ],
    sourceUrl: 'https://www.jaxa.jp/library/space_law/chapter_3/3-2-2-1_e.html',
  },

  // Iridium-Cosmos Collision
  {
    id: 'iridium-cosmos-collision',
    slug: 'iridium-cosmos-collision-2009',
    caseName: 'Iridium 33 - Cosmos 2251 Collision',
    year: 2009,
    jurisdiction: 'international',
    parties: {
      plaintiff: 'Iridium Communications Inc. (US)',
      defendant: 'Russian Federation (Cosmos 2251 owner)',
    },
    subjectMatter: ['space_debris', 'collision', 'liability', 'insurance'],
    summary: 'First accidental collision between two intact satellites. Iridium 33 (US commercial) collided with Cosmos 2251 (Russian military, defunct) at approximately 42,120 km/h, creating over 2,000 pieces of trackable debris.',
    facts: 'On February 10, 2009, at approximately 16:56 UTC, operational Iridium 33 communications satellite collided with defunct Russian military satellite Cosmos 2251 at an altitude of 789 km over Siberia. The collision produced thousands of debris fragments. No formal liability claim was filed. The incident occurred despite the availability of conjunction warnings.',
    holdings: [
      'No formal legal claims filed',
      'No liability determination made',
      'Insurance covered Iridium\'s losses',
      'Sparked increased focus on space traffic management',
    ],
    outcome: 'dismissed',
    damagesDescription: 'Iridium satellite valued at approximately $55 million; covered by insurance',
    significance: 'First hypervelocity collision between two intact satellites in history. Dramatically increased debris population in LEO. Catalyst for improved space situational awareness and FCC orbital debris rules. Raised questions about fault-based liability in space under Article III of Liability Convention.',
    precedentValue: 'Demonstrated inadequacy of existing liability framework for in-space collisions. Led to increased emphasis on debris mitigation and conjunction assessment. No legal precedent set due to absence of formal claims.',
    keyQuotes: [
      'The collision created approximately 2,000 pieces of debris larger than 10 cm',
    ],
    relatedCases: ['cosmos-954'],
    sourceUrl: 'https://www.space-track.org/',
  },

  // ViaSat v. SSL - $283M Verdict
  {
    id: 'viasat-v-ssl',
    slug: 'viasat-v-ssl-283m',
    caseName: 'ViaSat, Inc. v. Space Systems/Loral, LLC',
    citation: 'Case No. 3:12-cv-00260 (S.D. Cal.)',
    year: 2020,
    jurisdiction: 'federal',
    court: 'U.S. District Court, Southern District of California',
    parties: {
      plaintiff: 'ViaSat, Inc.',
      defendant: 'Space Systems/Loral, LLC (Maxar Technologies)',
    },
    subjectMatter: ['satellite_manufacturing', 'breach_of_contract', 'satellite_defects'],
    summary: 'Major satellite manufacturing dispute. Jury awarded ViaSat $283 million for SSL\'s breach of contract related to the ViaSat-2 satellite, which suffered a partial antenna deployment failure.',
    facts: 'ViaSat contracted with SSL to manufacture the ViaSat-2 high-capacity broadband satellite. After launch in June 2017, one of the satellite\'s reflector antennas failed to fully deploy, reducing the satellite\'s capacity by approximately 40%. ViaSat alleged SSL failed to properly design and test the antenna deployment mechanism.',
    holdings: [
      'Jury found SSL breached its contract with ViaSat',
      'Awarded $283 million in damages',
      'Found SSL\'s testing procedures inadequate',
      'SSL held responsible for antenna deployment failure',
    ],
    outcome: 'plaintiff_victory',
    damages: 283000000,
    damagesDescription: '$283 million jury verdict for breach of contract and satellite capacity loss',
    significance: 'One of the largest verdicts in commercial satellite industry history. Demonstrates significant liability exposure for satellite manufacturers. Highlights importance of rigorous testing and quality assurance in satellite manufacturing.',
    precedentValue: 'Important precedent for satellite manufacturer liability. Shows courts will award substantial damages for satellite defects. Emphasizes importance of contractual terms and testing requirements.',
    relatedCases: [],
    sourceUrl: 'https://www.law360.com/',
  },

  // SpaceX v. Blue Origin Patent
  {
    id: 'spacex-blue-origin-patent',
    slug: 'spacex-blue-origin-barge-landing',
    caseName: 'Space Exploration Technologies Corp. v. Blue Origin, LLC',
    citation: 'PGR2014-00012 (PTAB)',
    year: 2014,
    jurisdiction: 'federal',
    court: 'Patent Trial and Appeal Board (USPTO)',
    parties: {
      plaintiff: 'Space Exploration Technologies Corp. (SpaceX)',
      defendant: 'Blue Origin, LLC',
    },
    subjectMatter: ['patent_dispute', 'rocket_reusability', 'barge_landing'],
    summary: 'SpaceX challenged Blue Origin\'s patent on sea-based rocket landing techniques. PTAB invalidated most claims of Blue Origin\'s patent for drone ship rocket landings.',
    facts: 'Blue Origin was granted U.S. Patent 8,678,321 covering the concept of landing a rocket on a sea-based platform. SpaceX filed a petition for post-grant review, arguing the patent claims were obvious and anticipated by prior art. SpaceX was actively developing its own sea-based landing capability.',
    holdings: [
      'PTAB found most patent claims unpatentable',
      'Prior art anticipated Blue Origin\'s claims',
      'Sea-based landing concepts found obvious',
      'Blue Origin\'s patent scope significantly narrowed',
    ],
    outcome: 'plaintiff_victory',
    significance: 'Important precedent for rocket reusability technology patents. Demonstrated difficulty of patenting broadly-conceived launch vehicle innovations. Allowed SpaceX to proceed with Falcon 9 drone ship landings without patent encumbrance.',
    precedentValue: 'Sets boundaries for patenting rocket reusability concepts. Shows importance of specific, novel claims in space technology patents. PTAB willing to invalidate overly broad space technology patents.',
    relatedCases: [],
    sourceUrl: 'https://www.uspto.gov/ptab',
  },

  // Swarm FCC Enforcement
  {
    id: 'swarm-fcc-enforcement',
    slug: 'swarm-fcc-900k-settlement',
    caseName: 'In re Swarm Technologies, Inc.',
    citation: 'EB Docket No. 18-138',
    year: 2018,
    jurisdiction: 'federal',
    court: 'Federal Communications Commission Enforcement Bureau',
    parties: {
      plaintiff: 'Federal Communications Commission',
      defendant: 'Swarm Technologies, Inc.',
    },
    subjectMatter: ['unauthorized_launch', 'fcc_violation', 'satellite_licensing'],
    summary: 'FCC settled with Swarm Technologies for $900,000 after the company launched four unlicensed SpaceBEE satellites in January 2018 after FCC denied their license application.',
    facts: 'In December 2017, FCC denied Swarm\'s application to launch SpaceBEE satellites, citing concerns about their small size (0.25U CubeSats) making them difficult to track. Despite this denial, Swarm arranged for the satellites to be launched on an ISRO PSLV rocket in January 2018. FCC discovered the unauthorized launch and opened an enforcement proceeding.',
    holdings: [
      'Swarm violated FCC rules by operating unlicensed satellites',
      'Consent decree required $900,000 payment',
      'Swarm subject to enhanced compliance plan',
      'Required to implement compliance training program',
      'Required to designate compliance officer',
    ],
    outcome: 'settlement',
    damages: 900000,
    damagesDescription: '$900,000 civil penalty payment to U.S. Treasury',
    significance: 'First FCC enforcement action for unauthorized satellite launch. Established FCC\'s authority over commercial satellite operations. Highlighted importance of obtaining proper authorization before launch. Raised awareness of satellite trackability requirements.',
    precedentValue: 'Key precedent for FCC enforcement authority over satellite launches. Demonstrates consequences of launching without authorization. Sets baseline for FCC penalties in satellite licensing violations.',
    relatedCases: [],
    sourceUrl: 'https://www.fcc.gov/document/swarm-consent-decree',
  },

  // Loral/Hughes Export Control Violations
  {
    id: 'loral-hughes-export',
    slug: 'loral-hughes-export-violation',
    caseName: 'United States v. Loral Space & Communications / Hughes Electronics',
    year: 2002,
    jurisdiction: 'federal',
    court: 'U.S. Department of State (DDTC) / Department of Justice',
    parties: {
      plaintiff: 'United States Department of State',
      defendant: 'Loral Space & Communications Ltd. / Hughes Electronics Corporation',
    },
    subjectMatter: ['export_controls', 'itar_violation', 'technology_transfer', 'china'],
    summary: 'Loral and Hughes paid $32 million and $32 million respectively ($64 million total) for allegedly providing technical assistance to China regarding launch vehicle failures without proper export authorization.',
    facts: 'Following the failures of Chinese Long March rockets carrying Loral and Hughes satellites in 1995 and 1996, both companies participated in failure review committees that allegedly transferred controlled rocket technology to Chinese engineers. This assistance was provided without proper State Department licenses under ITAR. The case led to the transfer of commercial satellite export licensing from Commerce to State Department.',
    holdings: [
      'Loral paid $14 million civil penalty (largest ITAR penalty at time)',
      'Hughes paid $32 million to settle charges',
      'Both companies denied licenses for future China business',
      'Led to statutory changes in export control jurisdiction',
    ],
    outcome: 'settlement',
    damages: 46000000,
    damagesDescription: '$14 million (Loral) and $32 million (Hughes) in civil penalties',
    significance: 'Catalyzed major changes to satellite export control regime. Led to 1999 transfer of commercial satellites to USML. Established precedent for severe penalties in technology transfer cases. Changed industry practices regarding international launch providers.',
    precedentValue: 'Landmark export control case. Demonstrated government willingness to impose significant penalties. Shaped current ITAR/EAR framework for satellites. Cautionary tale for international space cooperation.',
    relatedCases: ['aeroflex-export-violation'],
    sourceUrl: 'https://www.state.gov/ddtc',
  },

  // Aeroflex Export Control
  {
    id: 'aeroflex-export-violation',
    slug: 'aeroflex-export-57m',
    caseName: 'In re Aeroflex Incorporated',
    year: 2020,
    jurisdiction: 'federal',
    court: 'Bureau of Industry and Security / DDTC',
    parties: {
      plaintiff: 'U.S. Department of Commerce / U.S. Department of State',
      defendant: 'Aeroflex Incorporated',
    },
    subjectMatter: ['export_controls', 'ear_violation', 'itar_violation', 'rad_hard_electronics'],
    summary: 'Aeroflex paid $57 million to settle charges of exporting controlled radiation-hardened electronics to China without proper licenses.',
    facts: 'Between 2007 and 2016, Aeroflex allegedly exported radiation-hardened microelectronics (controlled under both EAR and ITAR) to entities in China, including entities with military connections, without required export licenses. The components had applications in satellites and missiles.',
    holdings: [
      'Combined settlement of $57 million',
      'Suspended denial of export privileges',
      'Enhanced compliance measures required',
      'Voluntary self-disclosure considered as mitigating factor',
    ],
    outcome: 'settlement',
    damages: 57000000,
    damagesDescription: '$57 million combined civil penalty to BIS and DDTC',
    significance: 'One of largest export control settlements. Highlights sensitivity of radiation-hardened components. Demonstrates coordinated BIS/DDTC enforcement. Shows continuing focus on technology transfer to China.',
    precedentValue: 'Important precedent for component-level export control violations. Emphasizes compliance requirements for dual-use space components. Demonstrates value of voluntary disclosure in reducing penalties.',
    relatedCases: ['loral-hughes-export'],
    sourceUrl: 'https://www.bis.doc.gov/',
  },

  // Blue Origin v. NASA HLS Protest
  {
    id: 'blue-origin-nasa-hls',
    slug: 'blue-origin-nasa-hls-protest',
    caseName: 'Blue Origin Federation, LLC v. United States',
    citation: 'No. 21-1695C (Fed. Cl.)',
    year: 2021,
    jurisdiction: 'federal',
    court: 'U.S. Court of Federal Claims',
    parties: {
      plaintiff: 'Blue Origin Federation, LLC',
      defendant: 'United States (NASA)',
    },
    subjectMatter: ['government_contracts', 'bid_protest', 'artemis_program', 'hls'],
    summary: 'Blue Origin challenged NASA\'s decision to award the sole Human Landing System contract to SpaceX. The Court of Federal Claims denied Blue Origin\'s protest.',
    facts: 'NASA originally solicited multiple HLS providers but received less funding than requested from Congress. NASA decided to make a single award to SpaceX for $2.89 billion. Blue Origin (which bid $5.99 billion) protested the decision to GAO and, after GAO denial, to the Court of Federal Claims. Blue Origin alleged NASA improperly changed evaluation criteria.',
    holdings: [
      'Court denied Blue Origin\'s motion for judgment',
      'NASA\'s source selection was reasonable',
      'Budget constraints justified single award approach',
      'Evaluation of SpaceX proposal was reasonable',
    ],
    outcome: 'defendant_victory',
    significance: 'Major precedent for NASA procurement flexibility. Affirmed agency discretion in source selection. Highlighted budget constraints in Artemis program. Demonstrated limits of bid protest process for major space contracts.',
    precedentValue: 'Important precedent for government space procurement. Affirms agency discretion when budget-constrained. Shows deference to technical evaluations. Limits effectiveness of bid protests for space contracts.',
    relatedCases: [],
    sourceUrl: 'https://www.uscfc.uscourts.gov/',
  },

  // Devas v. India Arbitration
  {
    id: 'devas-india-arbitration',
    slug: 'devas-antrix-arbitration',
    caseName: 'CC/Devas (Mauritius) Ltd. et al. v. Republic of India',
    citation: 'PCA Case No. 2013-09',
    year: 2020,
    jurisdiction: 'arbitration',
    court: 'Permanent Court of Arbitration (The Hague)',
    parties: {
      plaintiff: 'CC/Devas (Mauritius) Ltd., Devas Employees Mauritius Private Limited, Telecom Devas Mauritius Limited',
      defendant: 'Republic of India',
    },
    subjectMatter: ['bilateral_investment_treaty', 'satellite_lease', 'spectrum_cancellation'],
    summary: 'Investors in Devas Multimedia awarded over $1.2 billion after India cancelled a satellite spectrum lease agreement, found to violate investment treaty protections.',
    facts: 'In 2005, Devas signed a 12-year agreement with Antrix Corporation (ISRO\'s commercial arm) to lease S-band spectrum capacity on two satellites for mobile multimedia services. In 2011, India\'s Cabinet Committee on Security cancelled the agreement citing national security and spectrum needs. Investors brought claims under India-Mauritius Bilateral Investment Treaty.',
    holdings: [
      'India violated fair and equitable treatment standard',
      'Cancellation constituted expropriation without compensation',
      'National security justification not established',
      'Awarded $1.2 billion in damages plus interest',
    ],
    outcome: 'plaintiff_victory',
    damages: 1200000000,
    damagesDescription: 'Over $1.2 billion in damages plus interest',
    significance: 'One of largest arbitration awards in space sector. Demonstrates investment treaty exposure for space spectrum decisions. Highlights risks of government interference in commercial space agreements. Important for sovereign investment in space assets.',
    precedentValue: 'Key precedent for investment treaty protection in space sector. Shows substantial exposure for spectrum/satellite cancellations. Demonstrates effectiveness of BIT arbitration for space disputes.',
    relatedCases: [],
    sourceUrl: 'https://www.pcacases.com/',
  },
];

// ============================================================================
// EXPERT COMMENTARY DATA - Sources for Expert Articles
// ============================================================================

export const EXPERT_SOURCES: ExpertSource[] = [
  // Law Firm Blogs
  {
    id: 'dla-piper-space',
    slug: 'dla-piper-aerospace-defense',
    name: 'DLA Piper Aerospace, Defense & Government',
    type: 'law_firm',
    organization: 'DLA Piper LLP',
    url: 'https://www.dlapiper.com/en-us/insights?sector=aerospace-defense-and-government-contracting',
    topics: ['space_law', 'government_contracts', 'export_controls', 'regulatory'],
    description: 'Global law firm with significant aerospace and defense practice. Publishes analysis of space policy developments, government contracting issues, and regulatory compliance.',
    keyContributors: ['Various partners across global offices'],
    isActive: true,
  },
  {
    id: 'akin-gump-export',
    slug: 'akin-gump-international-trade',
    name: 'Akin Gump International Trade Blog',
    type: 'law_firm',
    organization: 'Akin Gump Strauss Hauer & Feld LLP',
    url: 'https://www.akingump.com/en/insights?services=international-trade',
    topics: ['export_controls', 'itar', 'ear', 'sanctions', 'cfius'],
    description: 'Leading export controls and international trade practice. Provides detailed analysis of ITAR/EAR developments affecting space industry.',
    keyContributors: ['Export controls and national security team'],
    isActive: true,
  },
  {
    id: 'holland-knight-space',
    slug: 'holland-knight-aerospace',
    name: 'Holland & Knight Aerospace & Defense',
    type: 'law_firm',
    organization: 'Holland & Knight LLP',
    url: 'https://www.hklaw.com/en/industries/aerospace-and-defense',
    topics: ['space_law', 'faa_licensing', 'commercial_space', 'regulatory'],
    description: 'Active aerospace practice with focus on FAA commercial space licensing and regulatory matters.',
    keyContributors: ['Aerospace regulatory team'],
    isActive: true,
  },
  {
    id: 'hogan-lovells-space',
    slug: 'hogan-lovells-space-satellite',
    name: 'Hogan Lovells Space & Satellite',
    type: 'law_firm',
    organization: 'Hogan Lovells',
    url: 'https://www.hoganlovells.com/en/industry/aerospace-defense-and-government-services',
    topics: ['space_law', 'satellite_communications', 'spectrum', 'fcc_licensing'],
    description: 'Major space and satellite communications practice. Expertise in FCC licensing, spectrum matters, and international space law.',
    keyContributors: ['Space and satellite team'],
    isActive: true,
  },
  {
    id: 'milbank-space',
    slug: 'milbank-space-industry',
    name: 'Milbank Space Industry Group',
    type: 'law_firm',
    organization: 'Milbank LLP',
    url: 'https://www.milbank.com/en/practices/industries/space.html',
    topics: ['space_finance', 'satellite_transactions', 'project_finance'],
    description: 'Leading space industry finance practice. Focuses on satellite financing, M&A, and project finance for space ventures.',
    keyContributors: ['Space industry finance team'],
    isActive: true,
  },

  // Think Tanks
  {
    id: 'aerospace-corp',
    slug: 'aerospace-corporation',
    name: 'The Aerospace Corporation - Center for Space Policy and Strategy',
    type: 'think_tank',
    organization: 'The Aerospace Corporation',
    url: 'https://aerospace.org/policy',
    topics: ['space_policy', 'national_security', 'commercial_space', 'technology'],
    description: 'Federally funded research center providing policy analysis on space issues. Publishes influential papers on space policy, technology, and national security.',
    keyContributors: ['Center for Space Policy and Strategy analysts'],
    isActive: true,
  },
  {
    id: 'csis-aerospace',
    slug: 'csis-aerospace-security',
    name: 'CSIS Aerospace Security Project',
    type: 'think_tank',
    organization: 'Center for Strategic and International Studies',
    url: 'https://www.csis.org/programs/international-security-program/aerospace-security-project',
    topics: ['space_security', 'space_policy', 'international_affairs', 'defense'],
    description: 'Leading think tank analysis of space security and policy issues. Produces reports on space threats, commercial space, and international competition.',
    keyContributors: ['Todd Harrison', 'Kaitlyn Johnson', 'Thomas Roberts'],
    isActive: true,
  },
  {
    id: 'secure-world',
    slug: 'secure-world-foundation',
    name: 'Secure World Foundation',
    type: 'think_tank',
    organization: 'Secure World Foundation',
    url: 'https://swfound.org/',
    topics: ['space_sustainability', 'space_governance', 'debris', 'norms'],
    description: 'Promotes cooperative solutions for space sustainability challenges. Publishes analysis on space debris, governance, and sustainability issues.',
    keyContributors: ['Brian Weeden', 'Victoria Samson'],
    isActive: true,
  },

  // Government Resources
  {
    id: 'gao-space',
    slug: 'gao-space-reports',
    name: 'Government Accountability Office - Space Reports',
    type: 'government',
    organization: 'Government Accountability Office',
    url: 'https://www.gao.gov/topics/space',
    topics: ['government_oversight', 'acquisition', 'nasa', 'space_force'],
    description: 'Congressional watchdog providing oversight reports on federal space programs. Covers NASA, Space Force, and commercial space policy implementation.',
    isActive: true,
  },
  {
    id: 'crs-space',
    slug: 'crs-space-policy',
    name: 'Congressional Research Service - Space Policy',
    type: 'government',
    organization: 'Congressional Research Service',
    url: 'https://crsreports.congress.gov/',
    topics: ['space_policy', 'legislation', 'agency_oversight', 'budget'],
    description: 'Nonpartisan policy research for Congress. Provides authoritative reports on space legislation, agency activities, and policy issues.',
    isActive: true,
  },
  {
    id: 'faa-ast-resources',
    slug: 'faa-ast-publications',
    name: 'FAA Office of Commercial Space Transportation',
    type: 'government',
    organization: 'Federal Aviation Administration',
    url: 'https://www.faa.gov/space',
    topics: ['launch_licensing', 'safety', 'regulations', 'guidance'],
    description: 'Official source for commercial space transportation regulations, advisory circulars, and industry data. Publishes annual Commercial Space Transportation reports.',
    isActive: true,
  },
  {
    id: 'fcc-space-bureau',
    slug: 'fcc-space-bureau',
    name: 'FCC Space Bureau',
    type: 'government',
    organization: 'Federal Communications Commission',
    url: 'https://www.fcc.gov/space',
    topics: ['satellite_licensing', 'spectrum', 'orbital_debris', 'fcc_rules'],
    description: 'Official source for satellite communications regulations and licensing. Provides guidance on Part 25, spectrum issues, and debris mitigation.',
    isActive: true,
  },

  // Academic Sources
  {
    id: 'journal-space-law',
    slug: 'journal-space-law',
    name: 'Journal of Space Law',
    type: 'academic',
    organization: 'University of Mississippi School of Law',
    url: 'https://airandspacelaw.olemiss.edu/journal-of-space-law/',
    topics: ['space_law', 'international_law', 'treaties', 'liability'],
    description: 'Premier academic journal for space law scholarship. Publishes peer-reviewed articles on all aspects of space law and policy.',
    isActive: true,
  },
  {
    id: 'space-policy-journal',
    slug: 'space-policy-journal',
    name: 'Space Policy Journal',
    type: 'academic',
    organization: 'Elsevier',
    url: 'https://www.sciencedirect.com/journal/space-policy',
    topics: ['space_policy', 'governance', 'economics', 'international'],
    description: 'Leading academic journal for space policy analysis. Covers policy, economics, law, and social aspects of space activities.',
    isActive: true,
  },

  // Industry Associations
  {
    id: 'sia',
    slug: 'satellite-industry-association',
    name: 'Satellite Industry Association',
    type: 'industry_association',
    organization: 'Satellite Industry Association',
    url: 'https://sia.org/',
    topics: ['satellite_industry', 'policy_advocacy', 'market_data'],
    description: 'Trade association for satellite communications industry. Publishes annual State of the Satellite Industry Report and policy positions.',
    isActive: true,
  },
  {
    id: 'csf',
    slug: 'commercial-spaceflight-federation',
    name: 'Commercial Spaceflight Federation',
    type: 'industry_association',
    organization: 'Commercial Spaceflight Federation',
    url: 'https://www.commercialspaceflight.org/',
    topics: ['commercial_space', 'policy_advocacy', 'faa_licensing'],
    description: 'Industry association promoting commercial spaceflight. Advocates for commercial space policy and provides industry perspective.',
    isActive: true,
  },
];

// ============================================================================
// ECCN CLASSIFICATIONS - Export Control
// ============================================================================

export const ECCN_CLASSIFICATIONS: ECCNClassification[] = [
  {
    id: 'eccn-9a515',
    eccn: '9A515',
    description: 'Spacecraft, including satellites, and space vehicles, whether designated developmental or experimental, and related commodities',
    category: '9 - Aerospace and Propulsion',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['NS', 'RS', 'MT', 'AT'],
    licenseRequirements: 'License required to most destinations. License Exception STA available for some destinations.',
    licenseExceptions: ['STA', 'TMP', 'RPL', 'GOV', 'TSU'],
    spaceRelevance: 'Primary ECCN for commercial communications satellites and commercial remote sensing satellites transferred from USML.',
    examples: [
      'Commercial communications satellite buses',
      'Commercial remote sensing satellites',
      'Spacecraft structural components',
      'Attitude control systems',
      'Thermal control systems',
    ],
    relatedECCNs: ['9D515', '9E515', '3A515'],
  },
  {
    id: 'eccn-9d515',
    eccn: '9D515',
    description: 'Software specially designed for the development, production, operation, or maintenance of commodities controlled by 9A515',
    category: '9 - Aerospace and Propulsion',
    productGroup: 'D - Software',
    reasonForControl: ['NS', 'RS', 'MT', 'AT'],
    licenseRequirements: 'License required. Deemed export rules apply to release of software to foreign nationals.',
    licenseExceptions: ['STA', 'TSU', 'GOV'],
    spaceRelevance: 'Controls satellite ground control software, flight software, and development tools.',
    examples: [
      'Satellite command and control software',
      'Flight dynamics software',
      'Attitude determination software',
      'Telemetry processing software',
    ],
    relatedECCNs: ['9A515', '9E515'],
  },
  {
    id: 'eccn-9e515',
    eccn: '9E515',
    description: 'Technology required for the development, production, or use of commodities controlled by 9A515, 9B515, or 9D515',
    category: '9 - Aerospace and Propulsion',
    productGroup: 'E - Technology',
    reasonForControl: ['NS', 'RS', 'MT', 'AT'],
    licenseRequirements: 'License required. Deemed export rules strictly apply.',
    licenseExceptions: ['STA', 'TSU'],
    spaceRelevance: 'Controls technical data and know-how for satellite design and manufacturing.',
    examples: [
      'Satellite design documentation',
      'Manufacturing procedures',
      'Test procedures and data',
      'Integration techniques',
    ],
    relatedECCNs: ['9A515', '9D515'],
  },
  {
    id: 'eccn-9a004',
    eccn: '9A004',
    description: 'Space launch vehicles and spacecraft propulsion systems',
    category: '9 - Aerospace and Propulsion',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['MT', 'NP', 'AT'],
    licenseRequirements: 'License required under MTCR. Very limited license exceptions.',
    licenseExceptions: ['GOV'],
    spaceRelevance: 'Controls sounding rockets and components with range exceeding 300 km.',
    examples: [
      'Sounding rockets with 300+ km range',
      'Complete rocket stages',
      'Rocket propellant tanks for MTCR-controlled systems',
    ],
    relatedECCNs: ['9A005', '9A104'],
  },
  {
    id: 'eccn-3a001-rad-hard',
    eccn: '3A001.a.1',
    description: 'Radiation-hardened integrated circuits',
    category: '3 - Electronics',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['NS', 'AT'],
    licenseRequirements: 'License required for circuits rated for total dose > 5×10³ Gy (Si)',
    licenseExceptions: ['STA', 'TSR', 'TMP'],
    spaceRelevance: 'Space-grade electronics for satellites and launch vehicles.',
    examples: [
      'Radiation-hardened processors',
      'Rad-hard memory devices',
      'Space-qualified FPGAs',
      'Rad-tolerant power converters',
    ],
    relatedECCNs: ['3A001', '3A991'],
  },
];

// ============================================================================
// USML CATEGORIES - ITAR
// ============================================================================

export const USML_CATEGORIES: USMLCategory[] = [
  {
    id: 'usml-iv',
    category: 'IV',
    title: 'Launch Vehicles, Guided Missiles, Ballistic Missiles, Rockets, Torpedoes, Bombs and Mines',
    description: 'Complete launch vehicles, rocket engines, guidance systems, and related components, parts, and accessories.',
    items: [
      'Launch vehicles and space launch vehicle components',
      'Liquid and solid rocket propulsion systems with thrust > 25,000 lbs',
      'Guidance and control systems',
      'Staging systems and separation mechanisms',
      'Thrust vector control systems',
      'Turbo machinery for rocket engines',
    ],
    spaceRelevance: 'All launch vehicles remain on USML. No license exception for exports.',
    licensingAuthority: 'Directorate of Defense Trade Controls (DDTC)',
    exemptions: [
      'Some less sensitive components may transfer to EAR via 600-series ECCNs',
    ],
    relatedCategories: ['XV', 'XII'],
  },
  {
    id: 'usml-xv',
    category: 'XV',
    title: 'Spacecraft and Related Articles',
    description: 'Defense spacecraft, satellite systems designed for intelligence or military applications, and related components.',
    items: [
      'Spacecraft designed for defense or intelligence purposes',
      'Reconnaissance satellites',
      'Early warning satellites',
      'Military communications satellites',
      'Radiation-hardened electronics for defense spacecraft',
      'Anti-jam GPS receivers',
      'Space-qualified atomic frequency standards',
      'Star trackers for defense applications',
    ],
    spaceRelevance: 'Defense and intelligence satellites remain on USML. Commercial comms and remote sensing transferred to EAR.',
    licensingAuthority: 'Directorate of Defense Trade Controls (DDTC)',
    exemptions: [
      'Commercial communications satellites now on CCL (9A515)',
      'Commercial remote sensing satellites now on CCL (9A515)',
    ],
    relatedCategories: ['IV', 'XI', 'XII'],
  },
  {
    id: 'usml-xi',
    category: 'XI',
    title: 'Military Electronics',
    description: 'Electronic equipment and components specifically designed for military applications.',
    items: [
      'Military-grade encryption equipment',
      'Electronic warfare systems',
      'Radiation-hardened electronics for defense systems',
      'Secure communications equipment',
    ],
    spaceRelevance: 'Certain space-qualified electronics with military applications remain controlled.',
    licensingAuthority: 'Directorate of Defense Trade Controls (DDTC)',
    relatedCategories: ['XV', 'XII'],
  },
];

// ============================================================================
// HELPER FUNCTIONS AND INITIALIZATION
// ============================================================================

/**
 * Get all policy changes, optionally filtered by agency or status
 */
export function getPolicyChanges(options?: {
  agency?: AgencyType;
  status?: PolicyStatus;
  limit?: number;
}): PolicyChange[] {
  let results = [...POLICY_CHANGES];

  if (options?.agency) {
    results = results.filter(p => p.agency === options.agency);
  }
  if (options?.status) {
    results = results.filter(p => p.status === options.status);
  }

  // Sort by effective date (most recent first) or published date
  results.sort((a, b) => {
    const dateA = new Date(a.effectiveDate || a.publishedDate);
    const dateB = new Date(b.effectiveDate || b.publishedDate);
    return dateB.getTime() - dateA.getTime();
  });

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get upcoming policy deadlines (comment deadlines and effective dates)
 */
export function getUpcomingDeadlines(daysAhead: number = 90): Array<{
  policy: PolicyChange;
  deadlineType: 'comment' | 'effective';
  date: Date;
}> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const deadlines: Array<{ policy: PolicyChange; deadlineType: 'comment' | 'effective'; date: Date }> = [];

  for (const policy of POLICY_CHANGES) {
    if (policy.commentDeadline) {
      const commentDate = new Date(policy.commentDeadline);
      if (commentDate >= now && commentDate <= cutoff) {
        deadlines.push({ policy, deadlineType: 'comment', date: commentDate });
      }
    }
    if (policy.effectiveDate) {
      const effectiveDate = new Date(policy.effectiveDate);
      if (effectiveDate >= now && effectiveDate <= cutoff) {
        deadlines.push({ policy, deadlineType: 'effective', date: effectiveDate });
      }
    }
  }

  deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
  return deadlines;
}

/**
 * Get license requirements by agency or category
 */
export function getLicenseRequirements(options?: {
  agency?: AgencyType;
  category?: LicenseCategory;
}): LicenseRequirement[] {
  let results = [...LICENSE_REQUIREMENTS];

  if (options?.agency) {
    results = results.filter(l => l.agency === options.agency);
  }
  if (options?.category) {
    results = results.filter(l => l.category === options.category);
  }

  return results;
}

/**
 * Get space law cases by jurisdiction, outcome, or subject matter
 */
export function getSpaceLawCases(options?: {
  jurisdiction?: CaseJurisdiction;
  outcome?: CaseOutcome;
  subjectMatter?: string;
  limit?: number;
}): SpaceLawCase[] {
  let results = [...SPACE_LAW_CASES];

  if (options?.jurisdiction) {
    results = results.filter(c => c.jurisdiction === options.jurisdiction);
  }
  if (options?.outcome) {
    results = results.filter(c => c.outcome === options.outcome);
  }
  if (options?.subjectMatter) {
    results = results.filter(c =>
      c.subjectMatter.some(s => s.toLowerCase().includes(options.subjectMatter!.toLowerCase()))
    );
  }

  // Sort by year (most recent first)
  results.sort((a, b) => b.year - a.year);

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get expert sources by type or topic
 */
export function getExpertSources(options?: {
  type?: ExpertSourceType;
  topic?: string;
  activeOnly?: boolean;
}): ExpertSource[] {
  let results = [...EXPERT_SOURCES];

  if (options?.type) {
    results = results.filter(s => s.type === options.type);
  }
  if (options?.topic) {
    results = results.filter(s =>
      s.topics.some(t => t.toLowerCase().includes(options.topic!.toLowerCase()))
    );
  }
  if (options?.activeOnly !== false) {
    results = results.filter(s => s.isActive);
  }

  return results;
}

/**
 * Get ECCN classification by ECCN code or keyword search
 */
export function getECCNClassifications(options?: {
  eccn?: string;
  search?: string;
}): ECCNClassification[] {
  let results = [...ECCN_CLASSIFICATIONS];

  if (options?.eccn) {
    results = results.filter(e => e.eccn.toLowerCase().includes(options.eccn!.toLowerCase()));
  }
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    results = results.filter(e =>
      e.description.toLowerCase().includes(searchLower) ||
      e.spaceRelevance.toLowerCase().includes(searchLower) ||
      e.examples.some(ex => ex.toLowerCase().includes(searchLower))
    );
  }

  return results;
}

/**
 * Get USML category by category number or search
 */
export function getUSMLCategories(options?: {
  category?: string;
  search?: string;
}): USMLCategory[] {
  let results = [...USML_CATEGORIES];

  if (options?.category) {
    results = results.filter(u => u.category === options.category);
  }
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    results = results.filter(u =>
      u.title.toLowerCase().includes(searchLower) ||
      u.description.toLowerCase().includes(searchLower) ||
      u.items.some(item => item.toLowerCase().includes(searchLower))
    );
  }

  return results;
}

/**
 * Get treaty obligations
 */
export function getTreatyObligations(options?: {
  type?: TreatyType;
  usRatified?: boolean;
}): TreatyObligation[] {
  let results = [...TREATY_OBLIGATIONS];

  if (options?.type) {
    results = results.filter(t => t.type === options.type);
  }
  if (options?.usRatified !== undefined) {
    results = results.filter(t => t.usRatified === options.usRatified);
  }

  return results;
}

/**
 * Get regulatory hub statistics
 */
export function getRegulatoryHubStats() {
  const now = new Date();

  const upcomingDeadlines = getUpcomingDeadlines(90);
  const effectivePolicies = POLICY_CHANGES.filter(p => p.status === 'effective');
  const proposedPolicies = POLICY_CHANGES.filter(p => p.status === 'proposed' || p.status === 'pending');

  return {
    totalPolicies: POLICY_CHANGES.length,
    effectivePolicies: effectivePolicies.length,
    proposedPolicies: proposedPolicies.length,
    upcomingDeadlines: upcomingDeadlines.length,
    totalLicenseTypes: LICENSE_REQUIREMENTS.length,
    totalCases: SPACE_LAW_CASES.length,
    totalExpertSources: EXPERT_SOURCES.filter(s => s.isActive).length,
    totalECCNs: ECCN_CLASSIFICATIONS.length,
    totalUSMLCategories: USML_CATEGORIES.length,
    totalTreaties: TREATY_OBLIGATIONS.length,
    byAgency: {
      FAA: POLICY_CHANGES.filter(p => p.agency === 'FAA').length,
      FCC: POLICY_CHANGES.filter(p => p.agency === 'FCC').length,
      NOAA: POLICY_CHANGES.filter(p => p.agency === 'NOAA').length,
      BIS: POLICY_CHANGES.filter(p => p.agency === 'BIS').length,
      DDTC: POLICY_CHANGES.filter(p => p.agency === 'DDTC').length,
    },
    casesByJurisdiction: {
      federal: SPACE_LAW_CASES.filter(c => c.jurisdiction === 'federal').length,
      international: SPACE_LAW_CASES.filter(c => c.jurisdiction === 'international').length,
      arbitration: SPACE_LAW_CASES.filter(c => c.jurisdiction === 'arbitration').length,
    },
    expertSourcesByType: {
      law_firm: EXPERT_SOURCES.filter(s => s.type === 'law_firm').length,
      think_tank: EXPERT_SOURCES.filter(s => s.type === 'think_tank').length,
      government: EXPERT_SOURCES.filter(s => s.type === 'government').length,
      academic: EXPERT_SOURCES.filter(s => s.type === 'academic').length,
      industry_association: EXPERT_SOURCES.filter(s => s.type === 'industry_association').length,
    },
  };
}

// ============================================================================
// FEDERAL REGISTER API INTEGRATION
// ============================================================================

import { fetchFederalRegister, createFetchResult } from './external-apis';

/**
 * Map agency slug from Federal Register to our AgencyType
 */
function mapAgencySlugToType(slug: string): AgencyType | null {
  const agencyMap: Record<string, AgencyType> = {
    'federal-aviation-administration': 'FAA',
    'federal-communications-commission': 'FCC',
    'national-oceanic-and-atmospheric-administration': 'NOAA',
    'national-aeronautics-and-space-administration': 'NASA',
    'bureau-of-industry-and-security': 'BIS',
    'department-of-defense': 'DOD',
    'department-of-state': 'DOS',
  };
  return agencyMap[slug] || null;
}

/**
 * Transform raw Federal Register API document to our internal format
 */
function transformFederalRegisterDocument(
  doc: FederalRegisterApiDocument
): FederalRegisterDocument {
  return {
    documentNumber: doc.document_number,
    title: doc.title,
    type: doc.type,
    abstract: doc.abstract,
    publicationDate: doc.publication_date,
    effectiveOn: doc.effective_on,
    agencies: doc.agencies.map(a => a.name),
    agencySlugs: doc.agencies.map(a => a.slug),
    htmlUrl: doc.html_url,
    pdfUrl: doc.pdf_url,
    citation: doc.citation,
    docketIds: doc.docket_ids,
    regulationIdNumbers: doc.regulation_id_numbers,
    significant: doc.significant,
  };
}

/**
 * Transform Federal Register document to PolicyChange for Policy Tracker
 */
export function federalRegisterToPolicyChange(
  doc: FederalRegisterDocument
): PolicyChange {
  // Determine the primary agency
  const primaryAgencySlug = doc.agencySlugs[0] || '';
  const agency = mapAgencySlugToType(primaryAgencySlug) || 'FAA';

  // Determine status based on document type and dates
  let status: PolicyStatus = 'proposed';
  if (doc.type === 'Rule' || doc.type === 'Final Rule') {
    if (doc.effectiveOn) {
      const effectiveDate = new Date(doc.effectiveOn);
      status = effectiveDate <= new Date() ? 'effective' : 'pending';
    } else {
      status = 'final';
    }
  } else if (doc.type === 'Proposed Rule') {
    status = 'proposed';
  } else if (doc.type === 'Notice') {
    status = 'effective';
  }

  // Determine impact severity based on document type
  let impactSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  if (doc.significant) {
    impactSeverity = 'high';
  }
  if (doc.type === 'Final Rule' || doc.type === 'Rule') {
    impactSeverity = doc.significant ? 'critical' : 'high';
  }

  // Build impact areas from search context
  const impactAreas: string[] = [];
  const titleLower = doc.title.toLowerCase();
  const abstractLower = (doc.abstract || '').toLowerCase();
  const combined = titleLower + ' ' + abstractLower;

  if (combined.includes('satellite')) impactAreas.push('satellite_operations');
  if (combined.includes('launch')) impactAreas.push('launch_operations');
  if (combined.includes('orbit')) impactAreas.push('orbital_operations');
  if (combined.includes('spectrum') || combined.includes('frequency')) impactAreas.push('spectrum');
  if (combined.includes('debris')) impactAreas.push('debris_mitigation');
  if (combined.includes('license') || combined.includes('licensing')) impactAreas.push('licensing');
  if (combined.includes('safety')) impactAreas.push('safety');
  if (combined.includes('export')) impactAreas.push('export_control');

  if (impactAreas.length === 0) {
    impactAreas.push('general_compliance');
  }

  // Build affected parties
  const affectedParties: string[] = [];
  if (combined.includes('operator')) affectedParties.push('operators');
  if (combined.includes('provider')) affectedParties.push('service_providers');
  if (combined.includes('manufacturer')) affectedParties.push('manufacturers');
  if (combined.includes('applicant')) affectedParties.push('license_applicants');

  if (affectedParties.length === 0) {
    affectedParties.push('space_industry');
  }

  return {
    id: `fr-${doc.documentNumber}`,
    slug: `federal-register-${doc.documentNumber.toLowerCase()}`,
    agency,
    title: doc.title,
    summary: doc.abstract || `${doc.type} published in the Federal Register.`,
    impactAnalysis: doc.abstract || `This ${doc.type.toLowerCase()} may affect space industry operations. Review the full document for details.`,
    impactSeverity,
    impactAreas,
    status,
    federalRegisterCitation: doc.citation || doc.documentNumber,
    docketNumber: doc.docketIds.length > 0 ? doc.docketIds[0] : undefined,
    publishedDate: doc.publicationDate,
    effectiveDate: doc.effectiveOn || undefined,
    keyChanges: [], // Would need deeper parsing of document
    affectedParties,
    sourceUrl: doc.htmlUrl,
  };
}

/**
 * Fetch space-related regulatory updates from Federal Register API
 *
 * @param options - Fetch options including agencies, search terms, pagination
 * @returns FederalRegisterFetchResult with transformed documents
 *
 * Federal Register API Documentation:
 * https://www.federalregister.gov/developers/documentation/api/v1
 */
export async function fetchFederalRegisterUpdates(
  options: FederalRegisterFetchOptions = {}
): Promise<FederalRegisterFetchResult> {
  const {
    agencies = [
      'federal-aviation-administration',
      'federal-communications-commission',
      'national-oceanic-and-atmospheric-administration',
      'national-aeronautics-and-space-administration',
    ],
    searchTerm = 'space OR satellite OR launch OR orbit OR spectrum',
    perPage = 25,
    startDate,
    endDate,
    documentTypes,
  } = options;

  try {
    // Build query parameters for Federal Register API
    const params: Record<string, string> = {
      'per_page': String(perPage),
      'order': 'newest',
    };

    // Add search term
    if (searchTerm) {
      params['conditions[term]'] = searchTerm;
    }

    // Add agencies - Note: Federal Register API uses array notation for multiple agencies
    // We need to construct the URL differently for array params
    const agencyParams = agencies
      .map(agency => `conditions[agencies][]=${encodeURIComponent(agency)}`)
      .join('&');

    // Add date range if specified
    if (startDate) {
      params['conditions[publication_date][gte]'] = startDate;
    }
    if (endDate) {
      params['conditions[publication_date][lte]'] = endDate;
    }

    // Add document types if specified
    if (documentTypes && documentTypes.length > 0) {
      // Similar to agencies, types use array notation
      const typeParams = documentTypes
        .map(type => `conditions[type][]=${encodeURIComponent(type)}`)
        .join('&');
      // We'll append this separately
    }

    // Build the URL manually to handle array parameters correctly
    const baseUrl = 'https://www.federalregister.gov/api/v1/documents.json';
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${baseUrl}?${queryString}&${agencyParams}`;

    logger.info(`[Federal Register] Fetching from: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Federal Register API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as FederalRegisterApiResponse;

    // Transform results to our internal format
    const documents = data.results.map(transformFederalRegisterDocument);

    logger.info(`[Federal Register] Fetched ${documents.length} of ${data.count} total documents`);

    return {
      success: true,
      documents,
      totalCount: data.count,
    };
  } catch (error) {
    logger.error('[Federal Register] Fetch error', { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching from Federal Register',
    };
  }
}

/**
 * Fetch and store new Federal Register documents as policy changes
 * Returns the count of new documents stored
 */
export async function syncFederalRegisterUpdates(
  options: FederalRegisterFetchOptions = {}
): Promise<{ success: boolean; newCount: number; error?: string }> {
  const result = await fetchFederalRegisterUpdates(options);

  if (!result.success || !result.documents) {
    return {
      success: false,
      newCount: 0,
      error: result.error,
    };
  }

  let newCount = 0;

  // Transform and store each document
  for (const doc of result.documents) {
    const policyChange = federalRegisterToPolicyChange(doc);

    try {
      // Check if this document already exists
      const existing = await prisma.policyChange.findUnique({
        where: { slug: policyChange.slug },
      });

      if (!existing) {
        // Store new policy change
        await prisma.policyChange.create({
          data: {
            slug: policyChange.slug,
            agency: policyChange.agency,
            title: policyChange.title,
            summary: policyChange.summary,
            impactAnalysis: policyChange.impactAnalysis,
            impactSeverity: policyChange.impactSeverity,
            impactAreas: JSON.stringify(policyChange.impactAreas),
            status: policyChange.status,
            federalRegisterCitation: policyChange.federalRegisterCitation,
            docketNumber: policyChange.docketNumber,
            publishedDate: new Date(policyChange.publishedDate),
            effectiveDate: policyChange.effectiveDate ? new Date(policyChange.effectiveDate) : null,
            keyChanges: JSON.stringify(policyChange.keyChanges),
            affectedParties: JSON.stringify(policyChange.affectedParties),
            sourceUrl: policyChange.sourceUrl,
          },
        });
        newCount++;
        logger.info(`[Federal Register Sync] Stored new document: ${policyChange.slug}`);
      }
    } catch (error) {
      logger.error(`[Federal Register Sync] Error storing ${policyChange.slug}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    success: true,
    newCount,
  };
}

// ============================================================================
// PRISMA DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize regulatory hub data in database
 */
export async function initializeRegulatoryHubData(): Promise<{
  policies: number;
  licenses: number;
  cases: number;
  sources: number;
  eccns: number;
  usml: number;
}> {
  let policiesCount = 0;
  let licensesCount = 0;
  let casesCount = 0;
  let sourcesCount = 0;
  let eccnsCount = 0;
  let usmlCount = 0;

  // Initialize policy changes
  for (const policy of POLICY_CHANGES) {
    try {
      await prisma.policyChange.upsert({
        where: { slug: policy.slug },
        update: {
          agency: policy.agency,
          title: policy.title,
          summary: policy.summary,
          impactAnalysis: policy.impactAnalysis,
          impactSeverity: policy.impactSeverity,
          impactAreas: JSON.stringify(policy.impactAreas),
          status: policy.status,
          federalRegisterCitation: policy.federalRegisterCitation,
          docketNumber: policy.docketNumber,
          publishedDate: new Date(policy.publishedDate),
          commentDeadline: policy.commentDeadline ? new Date(policy.commentDeadline) : null,
          effectiveDate: policy.effectiveDate ? new Date(policy.effectiveDate) : null,
          keyChanges: JSON.stringify(policy.keyChanges),
          affectedParties: JSON.stringify(policy.affectedParties),
          sourceUrl: policy.sourceUrl,
        },
        create: {
          slug: policy.slug,
          agency: policy.agency,
          title: policy.title,
          summary: policy.summary,
          impactAnalysis: policy.impactAnalysis,
          impactSeverity: policy.impactSeverity,
          impactAreas: JSON.stringify(policy.impactAreas),
          status: policy.status,
          federalRegisterCitation: policy.federalRegisterCitation,
          docketNumber: policy.docketNumber,
          publishedDate: new Date(policy.publishedDate),
          commentDeadline: policy.commentDeadline ? new Date(policy.commentDeadline) : null,
          effectiveDate: policy.effectiveDate ? new Date(policy.effectiveDate) : null,
          keyChanges: JSON.stringify(policy.keyChanges),
          affectedParties: JSON.stringify(policy.affectedParties),
          sourceUrl: policy.sourceUrl,
        },
      });
      policiesCount++;
    } catch (error) {
      logger.error(`Failed to save policy ${policy.slug}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Initialize license requirements
  for (const license of LICENSE_REQUIREMENTS) {
    try {
      await prisma.licenseRequirement.upsert({
        where: { slug: license.slug },
        update: {
          agency: license.agency,
          licenseType: license.licenseType,
          category: license.category,
          description: license.description,
          regulatoryBasis: license.regulatoryBasis,
          requirements: JSON.stringify(license.requirements),
          processingTimeMin: license.processingTimeMin,
          processingTimeMax: license.processingTimeMax,
          applicationFee: license.applicationFee,
          annualFee: license.annualFee,
          validityYears: license.validityYears,
          isRenewable: license.isRenewable,
          guidanceDocuments: JSON.stringify(license.guidanceDocuments),
          applicationUrl: license.applicationUrl,
          recentChanges: license.recentChanges ? JSON.stringify(license.recentChanges) : null,
          notes: license.notes,
        },
        create: {
          slug: license.slug,
          agency: license.agency,
          licenseType: license.licenseType,
          category: license.category,
          description: license.description,
          regulatoryBasis: license.regulatoryBasis,
          requirements: JSON.stringify(license.requirements),
          processingTimeMin: license.processingTimeMin,
          processingTimeMax: license.processingTimeMax,
          applicationFee: license.applicationFee,
          annualFee: license.annualFee,
          validityYears: license.validityYears,
          isRenewable: license.isRenewable,
          guidanceDocuments: JSON.stringify(license.guidanceDocuments),
          applicationUrl: license.applicationUrl,
          recentChanges: license.recentChanges ? JSON.stringify(license.recentChanges) : null,
          notes: license.notes,
        },
      });
      licensesCount++;
    } catch (error) {
      logger.error(`Failed to save license ${license.slug}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Initialize space law cases
  for (const lawCase of SPACE_LAW_CASES) {
    try {
      await prisma.spaceLawCase.upsert({
        where: { slug: lawCase.slug },
        update: {
          caseName: lawCase.caseName,
          citation: lawCase.citation,
          year: lawCase.year,
          jurisdiction: lawCase.jurisdiction,
          court: lawCase.court,
          plaintiff: lawCase.parties.plaintiff,
          defendant: lawCase.parties.defendant,
          subjectMatter: JSON.stringify(lawCase.subjectMatter),
          summary: lawCase.summary,
          facts: lawCase.facts,
          holdings: JSON.stringify(lawCase.holdings),
          outcome: lawCase.outcome,
          damages: lawCase.damages,
          damagesDescription: lawCase.damagesDescription,
          significance: lawCase.significance,
          precedentValue: lawCase.precedentValue,
          keyQuotes: lawCase.keyQuotes ? JSON.stringify(lawCase.keyQuotes) : null,
          relatedCases: lawCase.relatedCases ? JSON.stringify(lawCase.relatedCases) : null,
          sourceUrl: lawCase.sourceUrl,
        },
        create: {
          slug: lawCase.slug,
          caseName: lawCase.caseName,
          citation: lawCase.citation,
          year: lawCase.year,
          jurisdiction: lawCase.jurisdiction,
          court: lawCase.court,
          plaintiff: lawCase.parties.plaintiff,
          defendant: lawCase.parties.defendant,
          subjectMatter: JSON.stringify(lawCase.subjectMatter),
          summary: lawCase.summary,
          facts: lawCase.facts,
          holdings: JSON.stringify(lawCase.holdings),
          outcome: lawCase.outcome,
          damages: lawCase.damages,
          damagesDescription: lawCase.damagesDescription,
          significance: lawCase.significance,
          precedentValue: lawCase.precedentValue,
          keyQuotes: lawCase.keyQuotes ? JSON.stringify(lawCase.keyQuotes) : null,
          relatedCases: lawCase.relatedCases ? JSON.stringify(lawCase.relatedCases) : null,
          sourceUrl: lawCase.sourceUrl,
        },
      });
      casesCount++;
    } catch (error) {
      logger.error(`Failed to save case ${lawCase.slug}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Initialize expert sources
  for (const source of EXPERT_SOURCES) {
    try {
      await prisma.expertSource.upsert({
        where: { slug: source.slug },
        update: {
          name: source.name,
          type: source.type,
          organization: source.organization,
          url: source.url,
          feedUrl: source.feedUrl,
          topics: JSON.stringify(source.topics),
          description: source.description,
          keyContributors: source.keyContributors ? JSON.stringify(source.keyContributors) : null,
          isActive: source.isActive,
        },
        create: {
          slug: source.slug,
          name: source.name,
          type: source.type,
          organization: source.organization,
          url: source.url,
          feedUrl: source.feedUrl,
          topics: JSON.stringify(source.topics),
          description: source.description,
          keyContributors: source.keyContributors ? JSON.stringify(source.keyContributors) : null,
          isActive: source.isActive,
        },
      });
      sourcesCount++;
    } catch (error) {
      logger.error(`Failed to save source ${source.slug}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Initialize ECCN classifications
  for (const eccn of ECCN_CLASSIFICATIONS) {
    try {
      await prisma.eCCNClassification.upsert({
        where: { eccn: eccn.eccn },
        update: {
          description: eccn.description,
          category: eccn.category,
          productGroup: eccn.productGroup,
          reasonForControl: JSON.stringify(eccn.reasonForControl),
          licenseRequirements: eccn.licenseRequirements,
          licenseExceptions: JSON.stringify(eccn.licenseExceptions),
          spaceRelevance: eccn.spaceRelevance,
          examples: JSON.stringify(eccn.examples),
          relatedECCNs: eccn.relatedECCNs ? JSON.stringify(eccn.relatedECCNs) : null,
        },
        create: {
          eccn: eccn.eccn,
          description: eccn.description,
          category: eccn.category,
          productGroup: eccn.productGroup,
          reasonForControl: JSON.stringify(eccn.reasonForControl),
          licenseRequirements: eccn.licenseRequirements,
          licenseExceptions: JSON.stringify(eccn.licenseExceptions),
          spaceRelevance: eccn.spaceRelevance,
          examples: JSON.stringify(eccn.examples),
          relatedECCNs: eccn.relatedECCNs ? JSON.stringify(eccn.relatedECCNs) : null,
        },
      });
      eccnsCount++;
    } catch (error) {
      logger.error(`Failed to save ECCN ${eccn.eccn}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Initialize USML categories
  for (const usml of USML_CATEGORIES) {
    try {
      await prisma.uSMLCategory.upsert({
        where: { category: usml.category },
        update: {
          subcategory: usml.subcategory,
          title: usml.title,
          description: usml.description,
          items: JSON.stringify(usml.items),
          spaceRelevance: usml.spaceRelevance,
          licensingAuthority: usml.licensingAuthority,
          exemptions: usml.exemptions ? JSON.stringify(usml.exemptions) : null,
          relatedCategories: usml.relatedCategories ? JSON.stringify(usml.relatedCategories) : null,
        },
        create: {
          category: usml.category,
          subcategory: usml.subcategory,
          title: usml.title,
          description: usml.description,
          items: JSON.stringify(usml.items),
          spaceRelevance: usml.spaceRelevance,
          licensingAuthority: usml.licensingAuthority,
          exemptions: usml.exemptions ? JSON.stringify(usml.exemptions) : null,
          relatedCategories: usml.relatedCategories ? JSON.stringify(usml.relatedCategories) : null,
        },
      });
      usmlCount++;
    } catch (error) {
      logger.error(`Failed to save USML ${usml.category}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    policies: policiesCount,
    licenses: licensesCount,
    cases: casesCount,
    sources: sourcesCount,
    eccns: eccnsCount,
    usml: usmlCount,
  };
}

// ============================================================================
// DATABASE QUERY FUNCTIONS
// ============================================================================

/**
 * Query policy changes from database
 */
export async function queryPolicyChanges(options?: {
  agency?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ policies: any[]; total: number }> {
  const where: any = {};

  if (options?.agency) {
    where.agency = options.agency;
  }
  if (options?.status) {
    where.status = options.status;
  }

  const [policies, total] = await Promise.all([
    prisma.policyChange.findMany({
      where,
      orderBy: { publishedDate: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.policyChange.count({ where }),
  ]);

  return { policies, total };
}

/**
 * Query license requirements from database
 */
export async function queryLicenseRequirements(options?: {
  agency?: string;
  category?: string;
}): Promise<any[]> {
  const where: any = {};

  if (options?.agency) {
    where.agency = options.agency;
  }
  if (options?.category) {
    where.category = options.category;
  }

  return prisma.licenseRequirement.findMany({
    where,
    orderBy: [{ agency: 'asc' }, { licenseType: 'asc' }],
  });
}

/**
 * Query space law cases from database
 */
export async function querySpaceLawCases(options?: {
  jurisdiction?: string;
  outcome?: string;
  search?: string;
  limit?: number;
}): Promise<any[]> {
  const where: any = {};

  if (options?.jurisdiction) {
    where.jurisdiction = options.jurisdiction;
  }
  if (options?.outcome) {
    where.outcome = options.outcome;
  }
  if (options?.search) {
    where.OR = [
      { caseName: { contains: options.search, mode: 'insensitive' } },
      { summary: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  return prisma.spaceLawCase.findMany({
    where,
    orderBy: { year: 'desc' },
    take: options?.limit || 50,
  });
}

/**
 * Query expert sources from database
 */
export async function queryExpertSources(options?: {
  type?: string;
  activeOnly?: boolean;
}): Promise<any[]> {
  const where: any = {};

  if (options?.type) {
    where.type = options.type;
  }
  if (options?.activeOnly !== false) {
    where.isActive = true;
  }

  return prisma.expertSource.findMany({
    where,
    orderBy: { name: 'asc' },
  });
}

/**
 * Query ECCN classifications from database
 */
export async function queryECCNClassifications(options?: {
  eccn?: string;
  search?: string;
}): Promise<any[]> {
  const where: any = {};

  if (options?.eccn) {
    where.eccn = { contains: options.eccn, mode: 'insensitive' };
  }
  if (options?.search) {
    where.OR = [
      { description: { contains: options.search, mode: 'insensitive' } },
      { spaceRelevance: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  return prisma.eCCNClassification.findMany({
    where,
    orderBy: { eccn: 'asc' },
  });
}

/**
 * Query USML categories from database
 */
export async function queryUSMLCategories(options?: {
  category?: string;
}): Promise<any[]> {
  const where: any = {};

  if (options?.category) {
    where.category = options.category;
  }

  return prisma.uSMLCategory.findMany({
    where,
    orderBy: { category: 'asc' },
  });
}

// ============================================================================
// EXPORT ALL DATA FOR DIRECT ACCESS
// ============================================================================

export const regulatoryHubData = {
  policies: POLICY_CHANGES,
  licenses: LICENSE_REQUIREMENTS,
  cases: SPACE_LAW_CASES,
  sources: EXPERT_SOURCES,
  eccns: ECCN_CLASSIFICATIONS,
  usml: USML_CATEGORIES,
  treaties: TREATY_OBLIGATIONS,
};
