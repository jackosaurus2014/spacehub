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
export type AgencyType = 'FAA' | 'FCC' | 'NOAA' | 'BIS' | 'DDTC' | 'NASA' | 'DOD' | 'DOS' | 'USSF' | 'UKSA' | 'EU' | 'JAXA';
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

  // ITAR/EAR Export Control Updates
  {
    id: 'ddtc-itar-cat-xv-revision',
    slug: 'ddtc-itar-category-xv-revision-2024',
    agency: 'DDTC',
    title: 'ITAR Category XV Spacecraft and Related Articles - Revised Definitions',
    summary: 'DDTC revises USML Category XV definitions to clarify jurisdiction boundaries between ITAR and EAR for spacecraft components, updating the Export Control Reform Act (ECRA) framework.',
    fullText: 'The Directorate of Defense Trade Controls issued revisions to USML Category XV clarifying which spacecraft components remain on the USML versus those transferred to the CCL. The revision addresses persistent classification uncertainty that slowed commercial satellite exports to allied nations.',
    impactAnalysis: 'Provides greater certainty for commercial satellite manufacturers regarding which components require ITAR licensing versus EAR licensing. Expected to streamline exports of non-sensitive satellite subsystems to NATO allies and close partners while maintaining controls on defense-critical items.',
    impactSeverity: 'high',
    impactAreas: ['export_controls', 'satellite_manufacturing', 'technology_transfer', 'allied_cooperation'],
    status: 'effective',
    federalRegisterCitation: '89 FR 42101',
    docketNumber: 'DOS-2023-0042',
    publishedDate: '2024-05-14',
    effectiveDate: '2024-08-12',
    keyChanges: [
      'Revised definitions for defense-critical spacecraft subsystems',
      'Clarified boundary between USML Category XV and CCL 9x515',
      'Updated Technical Assistance Agreements (TAA) requirements for allied programs',
      'Streamlined commodity jurisdiction (CJ) determination process',
      'New exemption pathways for NATO/Five Eyes collaborative programs',
      'Enhanced deemed export protections for foreign national employees',
    ],
    affectedParties: ['satellite_manufacturers', 'defense_contractors', 'component_suppliers', 'international_partners'],
    sourceUrl: 'https://www.state.gov/ddtc',
    relatedPolicies: ['bis-commercial-space-export'],
  },

  // BIS Entity List Updates Affecting Space
  {
    id: 'bis-entity-list-space-2024',
    slug: 'bis-entity-list-space-sector-2024',
    agency: 'BIS',
    title: 'Entity List Additions Affecting Space Sector Supply Chains',
    summary: 'BIS adds multiple entities involved in foreign space and missile programs to the Entity List, restricting exports of space-grade components without specific licenses.',
    impactAnalysis: 'Expands export restrictions on space-grade electronics, propulsion components, and satellite subsystems to entities associated with foreign military space programs. Increases compliance burden for US suppliers with international customers.',
    impactSeverity: 'high',
    impactAreas: ['export_controls', 'supply_chain', 'component_suppliers', 'satellite_manufacturing'],
    status: 'effective',
    federalRegisterCitation: '89 FR 56877',
    docketNumber: 'BIS-2024-0018',
    publishedDate: '2024-07-08',
    effectiveDate: '2024-07-08',
    keyChanges: [
      '23 entities added linked to foreign ballistic missile programs',
      'New restrictions on radiation-hardened semiconductor exports',
      'Enhanced end-use monitoring requirements for space-grade components',
      'Expanded definition of space-related items subject to review',
      'New license review presumption of denial for certain destinations',
    ],
    affectedParties: ['component_suppliers', 'semiconductor_manufacturers', 'satellite_manufacturers', 'defense_contractors'],
    sourceUrl: 'https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern/entity-list',
  },

  // FCC Supply Chain Order
  {
    id: 'fcc-supply-chain-order',
    slug: 'fcc-supply-chain-security-order',
    agency: 'FCC',
    title: 'FCC Supply Chain Security Order - Covered Equipment and Services Ban',
    summary: 'FCC bans the use of telecommunications equipment from certain foreign manufacturers (Huawei, ZTE, Hytera, Hikvision, Dahua) deemed national security threats, impacting ground station and satellite communications infrastructure.',
    fullText: 'The FCC Supply Chain Order prohibits the authorization and use of telecommunications equipment produced by companies determined to pose unacceptable national security risks. This includes equipment used in satellite ground stations, earth station terminals, and network infrastructure supporting satellite communications.',
    impactAnalysis: 'Satellite operators and ground station providers must audit their equipment inventories and replace any covered equipment. The Secure and Trusted Communications Networks Reimbursement Program provides funding for smaller providers to remove and replace covered equipment.',
    impactSeverity: 'high',
    impactAreas: ['ground_stations', 'satellite_communications', 'supply_chain_security', 'equipment_procurement'],
    status: 'effective',
    federalRegisterCitation: 'FCC 22-84',
    docketNumber: 'PS Docket No. 19-351',
    publishedDate: '2022-11-25',
    effectiveDate: '2022-11-25',
    keyChanges: [
      'Ban on authorization of equipment from covered entities (Huawei, ZTE, etc.)',
      'Prohibition on use of USF funds for covered equipment',
      '$1.9 billion Rip and Replace program for equipment removal',
      'Applies to satellite ground station equipment and earth station terminals',
      'Network equipment used for satellite backhaul included',
      'Annual certification requirements for carriers regarding covered equipment',
    ],
    affectedParties: ['ground_station_operators', 'satellite_operators', 'telecom_carriers', 'equipment_vendors'],
    sourceUrl: 'https://www.fcc.gov/supplychain',
    relatedPolicies: ['fcc-5-year-deorbit'],
  },

  // FCC 12 GHz Spectrum Decision
  {
    id: 'fcc-12ghz-rulemaking',
    slug: 'fcc-12ghz-spectrum-ngso-terrestrial',
    agency: 'FCC',
    title: 'FCC 12 GHz Band Rulemaking - NGSO Satellite vs Terrestrial 5G Sharing',
    summary: 'FCC addresses the contentious 12.2-12.7 GHz band sharing question between NGSO satellite services (Starlink) and proposed terrestrial 5G use (DISH/RS Access), with implications for next-generation satellite broadband.',
    impactAnalysis: 'The outcome will determine whether NGSO satellite operators like SpaceX can continue exclusive use of the 12 GHz band or must share with terrestrial 5G operations. A sharing framework could reduce satellite broadband capacity in the band by up to 77% according to SpaceX estimates.',
    impactSeverity: 'critical',
    impactAreas: ['spectrum_management', 'ngso_operations', 'broadband_satellite', 'terrestrial_5g'],
    status: 'proposed',
    docketNumber: 'WT Docket No. 20-443',
    publishedDate: '2022-01-06',
    commentDeadline: '2025-06-30',
    keyChanges: [
      'Evaluation of spectrum sharing feasibility between NGSO and terrestrial services',
      'Technical studies on interference potential from terrestrial transmitters to NGSO receivers',
      'Consideration of geographic and power-based sharing approaches',
      'V-band allocation analysis for future NGSO migration',
      'Assessment of economic impact on satellite broadband deployment',
    ],
    affectedParties: ['ngso_satellite_operators', 'terrestrial_wireless_carriers', 'broadband_consumers', 'spectrum_holders'],
    sourceUrl: 'https://www.fcc.gov/document/12-ghz-band-noi',
  },

  // NASA Orbital Debris Standard 8719.14B
  {
    id: 'nasa-orbital-debris-standard',
    slug: 'nasa-orbital-debris-standard-8719-14b',
    agency: 'NASA',
    title: 'NASA Standard 8719.14B - Process for Limiting Orbital Debris',
    summary: 'Updated NASA technical standard establishing requirements for limiting orbital debris generation during and after space missions, including stricter post-mission disposal and casualty risk requirements.',
    impactAnalysis: 'All NASA missions and NASA-funded commercial activities must comply with updated debris mitigation requirements. The standard now aligns with the FCC 5-year deorbit rule and adds new requirements for constellation operations and in-space servicing missions.',
    impactSeverity: 'high',
    impactAreas: ['orbital_debris', 'satellite_design', 'mission_planning', 'constellation_operations'],
    status: 'effective',
    publishedDate: '2023-04-25',
    effectiveDate: '2023-04-25',
    keyChanges: [
      'Reduced post-mission disposal to 5 years (aligned with FCC)',
      'Updated casualty risk threshold to 1:10,000',
      'New requirements for constellation collision avoidance',
      'Enhanced passivation requirements for upper stages',
      'Debris assessment software updated to DAS 3.2',
      'New provisions for in-space servicing and assembly missions',
    ],
    affectedParties: ['nasa_missions', 'nasa_contractors', 'commercial_crew_providers', 'commercial_cargo_providers'],
    sourceUrl: 'https://standards.nasa.gov/',
    relatedPolicies: ['fcc-5-year-deorbit'],
  },

  // NOAA Commercial Remote Sensing Licensing (15 CFR 960)
  {
    id: 'noaa-part-960-update',
    slug: 'noaa-part-960-remote-sensing-update',
    agency: 'NOAA',
    title: 'Updated Commercial Remote Sensing Licensing Rules (15 CFR Part 960)',
    summary: 'NOAA finalizes comprehensive revision of commercial remote sensing licensing regulations, implementing a three-tier system and dramatically reducing processing times and regulatory burden.',
    impactAnalysis: 'The updated Part 960 rule replaces the previous case-by-case approach with a predictable three-tier system. Tier 1 licenses have minimal conditions, while Tier 3 licenses for the most capable systems may include temporary operating conditions that expire as commercial availability catches up.',
    impactSeverity: 'high',
    impactAreas: ['remote_sensing', 'commercial_imaging', 'earth_observation', 'sar_systems'],
    status: 'effective',
    federalRegisterCitation: '85 FR 30790',
    publishedDate: '2020-05-20',
    effectiveDate: '2020-07-20',
    keyChanges: [
      'Three-tier licensing system based on data capability',
      'Average processing time reduced from 120+ days to 14-48 days',
      'Temporary conditions now have automatic expiration',
      'Streamlined application process with clear eligibility criteria',
      'Reduced shutter control provisions',
      'Enhanced data protection framework',
    ],
    affectedParties: ['remote_sensing_operators', 'sar_operators', 'geospatial_companies', 'earth_observation_startups'],
    sourceUrl: 'https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/licensing/',
    relatedPolicies: ['noaa-tier3-conditions-relaxation'],
  },

  // EU Space Regulation Proposal
  {
    id: 'eu-space-law-proposal',
    slug: 'eu-space-law-regulation-proposal',
    agency: 'EU',
    title: 'EU Space Law - Proposed Regulation on Space Traffic Management and Sustainability',
    summary: 'The European Commission proposes the first comprehensive EU-wide regulation addressing space traffic management, orbital debris mitigation, and space sustainability, including mandatory requirements for EU-based operators.',
    impactAnalysis: 'Would establish mandatory debris mitigation rules for all EU member states, create an EU space surveillance and tracking service, and potentially require EU operators to comply with stricter standards than current international guidelines. Could affect US companies operating in or launching from EU territory.',
    impactSeverity: 'medium',
    impactAreas: ['space_traffic_management', 'debris_mitigation', 'international_regulation', 'eu_operators'],
    status: 'proposed',
    publishedDate: '2024-03-12',
    commentDeadline: '2025-09-30',
    keyChanges: [
      'Mandatory debris mitigation standards for EU operators',
      'EU Space Surveillance and Tracking (EU SST) service expansion',
      'Registration requirements harmonized across member states',
      'End-of-life disposal requirements (25-year standard, 5-year goal)',
      'Insurance and liability framework for EU space activities',
      'Proposed mutual recognition of operator licenses',
    ],
    affectedParties: ['eu_satellite_operators', 'launch_providers_europe', 'esa_contractors', 'us_companies_with_eu_operations'],
    sourceUrl: 'https://ec.europa.eu/defence-industry-space/eu-space-policy/eu-space-law_en',
  },

  // UK Space Industry Act Updates
  {
    id: 'uk-space-industry-act-updates',
    slug: 'uk-space-industry-act-2018-amendments',
    agency: 'UKSA',
    title: 'UK Space Industry Act 2018 - Licensing Framework Implementation and Updates',
    summary: 'UK Civil Aviation Authority implements updated licensing regulations under the Space Industry Act 2018, enabling commercial launch and orbital operations from UK spaceports.',
    impactAnalysis: 'Establishes the UK as a competitive location for small satellite launch and orbital operations. The licensing framework covers launch vehicles, orbital carriers, suborbital activities, and spaceport operations from UK soil.',
    impactSeverity: 'medium',
    impactAreas: ['uk_space_operations', 'launch_licensing', 'spaceport_development', 'international_launch_market'],
    status: 'effective',
    publishedDate: '2021-07-29',
    effectiveDate: '2021-07-29',
    keyChanges: [
      'CAA designated as UK space regulator',
      'Launch operator licensing framework operational',
      'Spaceport licensing for SaxaVord and Sutherland',
      'Orbital operator license category established',
      'Third-party liability framework with government indemnification',
      'Range safety and environmental assessment requirements',
      'Return to Earth operations licensing',
    ],
    affectedParties: ['uk_launch_providers', 'spaceport_operators_uk', 'satellite_operators_uk', 'international_launch_customers'],
    sourceUrl: 'https://www.legislation.gov.uk/ukpga/2018/5/contents',
  },

  // Japan Space Activities Act
  {
    id: 'japan-space-activities-act',
    slug: 'japan-space-activities-act-updates',
    agency: 'JAXA',
    title: 'Japan Space Activities Act - Updated Licensing and Safety Framework',
    summary: 'Japan updates its Space Activities Act to expand commercial launch licensing, establish new safety standards for reusable vehicles, and streamline satellite operator registration.',
    impactAnalysis: 'Modernizes Japan\'s commercial space regulatory framework to support a growing domestic launch industry. Enables Japanese companies to compete more effectively in the international launch market.',
    impactSeverity: 'medium',
    impactAreas: ['japan_space_operations', 'launch_licensing', 'commercial_launch', 'international_cooperation'],
    status: 'effective',
    publishedDate: '2024-01-15',
    effectiveDate: '2024-04-01',
    keyChanges: [
      'Updated launch licensing categories for commercial vehicles',
      'New framework for reusable launch vehicle operations',
      'Streamlined satellite operator registration',
      'Enhanced third-party liability insurance requirements',
      'Debris mitigation alignment with IADC guidelines',
      'Support for international collaboration under Artemis Accords',
    ],
    affectedParties: ['japanese_launch_providers', 'satellite_operators_japan', 'international_partners', 'space_startups_japan'],
    sourceUrl: 'https://www8.cao.go.jp/space/english/index-e.html',
  },

  // COPUOS LTS Guidelines Implementation
  {
    id: 'copuos-lts-guidelines',
    slug: 'copuos-lts-guidelines-adoption',
    agency: 'NASA',
    title: 'COPUOS Long-Term Sustainability Guidelines - US Implementation',
    summary: 'US agencies implement the 21 COPUOS Long-Term Sustainability (LTS) Guidelines for space activities, addressing space debris mitigation, space weather, and responsible behavior norms.',
    impactAnalysis: 'While voluntary at the international level, US implementation through existing regulatory agencies makes many LTS Guidelines effectively binding for US operators. Industry must track compliance with guidelines on information sharing, conjunction assessment, and post-mission disposal.',
    impactSeverity: 'medium',
    impactAreas: ['space_sustainability', 'debris_mitigation', 'space_weather', 'international_norms'],
    status: 'effective',
    publishedDate: '2022-06-01',
    effectiveDate: '2022-06-01',
    keyChanges: [
      '21 voluntary guidelines adopted by COPUOS in 2019',
      'US implementation through existing FAA/FCC/NOAA frameworks',
      'Information sharing requirements for conjunction data',
      'Space weather monitoring and notification provisions',
      'Registry and transparency obligations',
      'New Working Group established for additional guidelines',
    ],
    affectedParties: ['all_space_operators', 'launch_providers', 'satellite_operators', 'debris_monitoring_services'],
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/topics/long-term-sustainability-of-outer-space-activities.html',
  },

  // USSF Acquisition Reform
  {
    id: 'ussf-acquisition-reform',
    slug: 'ussf-acquisition-pathway-reform',
    agency: 'DOD',
    title: 'US Space Force Acquisition Pathway Reform - Space Rapid Capabilities Office',
    summary: 'Space Force restructures acquisition pathways to accelerate procurement of commercial space services and technologies, expanding the Space Rapid Capabilities Office mandate.',
    impactAnalysis: 'Creates faster procurement vehicles for commercial space services, including satellite communications, space domain awareness, and launch services. Reduces typical acquisition timelines from 5-7 years to 1-3 years for qualifying programs.',
    impactSeverity: 'high',
    impactAreas: ['defense_procurement', 'commercial_space_services', 'launch_services', 'satellite_communications'],
    status: 'effective',
    publishedDate: '2024-03-01',
    effectiveDate: '2024-03-01',
    keyChanges: [
      'Expanded Space Rapid Capabilities Office authority',
      'New commercial solutions opening (CSO) processes for space services',
      'Streamlined Other Transaction Authority (OTA) for space programs',
      'Increased threshold for rapid acquisition authority',
      'Commercial satellite communications as a service procurement',
      'Space Development Agency integration into Space Force',
    ],
    affectedParties: ['defense_contractors', 'commercial_space_providers', 'launch_companies', 'satellite_operators'],
    sourceUrl: 'https://www.spaceforce.mil/',
    relatedPolicies: ['nasa-artemis-accords'],
  },

  // CHIPS Act Space Implications
  {
    id: 'chips-act-space-implications',
    slug: 'chips-act-space-semiconductor-provisions',
    agency: 'BIS',
    title: 'CHIPS and Science Act - Space Semiconductor and Technology Provisions',
    summary: 'The CHIPS and Science Act includes provisions affecting space-grade semiconductor supply chains, research funding for space technology, and export controls on advanced chips with space applications.',
    impactAnalysis: 'Increases domestic production capacity for radiation-hardened semiconductors critical to satellite and spacecraft systems. New export controls on advanced chips may affect foreign satellite programs that rely on US-origin space-grade processors and FPGAs.',
    impactSeverity: 'high',
    impactAreas: ['semiconductors', 'supply_chain', 'export_controls', 'space_electronics'],
    status: 'effective',
    federalRegisterCitation: 'Pub. L. 117-167',
    publishedDate: '2022-08-09',
    effectiveDate: '2022-08-09',
    keyChanges: [
      '$52.7 billion for domestic semiconductor manufacturing incentives',
      'Export restrictions on advanced logic chips to certain countries',
      'Funding for space-grade semiconductor R&D',
      'National security guardrails on subsidized facilities',
      'Enhanced review of foreign investments in semiconductor facilities',
      'Supply chain resilience requirements for defense-critical chips',
    ],
    affectedParties: ['semiconductor_manufacturers', 'satellite_manufacturers', 'defense_contractors', 'space_electronics_suppliers'],
    sourceUrl: 'https://www.congress.gov/bill/117th-congress/house-bill/4346',
  },

  // FAA Part 414 Safety Approvals
  {
    id: 'faa-part-414-safety-approvals',
    slug: 'faa-part-414-safety-element-approvals',
    agency: 'FAA',
    title: 'FAA Part 414 Safety Element Approvals for Launch and Reentry',
    summary: 'FAA updates procedures for issuing safety element approvals that allow manufacturers and operators to pre-qualify safety systems for future launch licenses.',
    impactAnalysis: 'Reduces licensing timelines by allowing vehicle and system manufacturers to obtain pre-approved safety elements. Particularly beneficial for reusable vehicle operators who can demonstrate safety compliance once rather than per-flight.',
    impactSeverity: 'medium',
    impactAreas: ['launch_safety', 'vehicle_certification', 'reusable_vehicles', 'licensing_efficiency'],
    status: 'effective',
    federalRegisterCitation: '14 CFR Part 414',
    publishedDate: '2023-09-15',
    effectiveDate: '2024-01-15',
    keyChanges: [
      'Streamlined safety element approval process',
      'New approval categories for reusable vehicle systems',
      'Pre-qualification of flight safety systems',
      'Reduced duplicative analysis requirements',
      'Enhanced portability of safety approvals across license modifications',
    ],
    affectedParties: ['launch_vehicle_manufacturers', 'reusable_vehicle_operators', 'safety_system_suppliers'],
    sourceUrl: 'https://www.faa.gov/space/licenses',
    relatedPolicies: ['faa-part-450-transition'],
  },

  // V-Band Spectrum Allocation for NGSO
  {
    id: 'fcc-vband-ngso-allocation',
    slug: 'fcc-vband-allocation-ngso-systems',
    agency: 'FCC',
    title: 'FCC V-Band Spectrum Allocation for NGSO Satellite Systems',
    summary: 'FCC establishes rules for V-band (37.5-51.4 GHz) spectrum use by NGSO satellite constellations, opening significant new capacity for next-generation satellite broadband.',
    impactAnalysis: 'V-band allocation provides roughly 5x the spectrum capacity of current Ka-band satellite operations. Critical for next-generation constellation deployments including SpaceX Gen2 and Amazon Kuiper.',
    impactSeverity: 'high',
    impactAreas: ['spectrum_management', 'ngso_operations', 'broadband_satellite', 'next_gen_constellations'],
    status: 'effective',
    docketNumber: 'IB Docket No. 17-348',
    publishedDate: '2023-11-15',
    effectiveDate: '2024-02-15',
    keyChanges: [
      'V-band spectrum rules for NGSO fixed-satellite service',
      'Sharing framework between NGSO and GSO operators',
      'Processing round procedures for V-band NGSO applications',
      'Power flux density limits to protect terrestrial services',
      'Coordination requirements with federal government users',
    ],
    affectedParties: ['ngso_constellation_operators', 'gso_operators', 'earth_station_operators', 'federal_spectrum_users'],
    sourceUrl: 'https://www.fcc.gov/space/space-stations',
    relatedPolicies: ['fcc-space-modernization', 'fcc-12ghz-rulemaking'],
  },

  // Space Sustainability Act (proposed)
  {
    id: 'proposed-space-sustainability-act',
    slug: 'proposed-orbital-sustainability-act-2025',
    agency: 'NASA',
    title: 'Proposed Orbital Sustainability Act of 2025',
    summary: 'Bipartisan Congressional bill proposing comprehensive orbital sustainability legislation, including mandatory debris mitigation standards, active debris removal incentives, and a space sustainability fund.',
    impactAnalysis: 'Would establish the first comprehensive US legislation specifically addressing orbital sustainability. Creates a regulatory framework that goes beyond current agency-level rules to establish statutory requirements for debris mitigation and remediation.',
    impactSeverity: 'high',
    impactAreas: ['orbital_debris', 'space_sustainability', 'active_debris_removal', 'constellation_operations'],
    status: 'proposed',
    publishedDate: '2025-03-15',
    keyChanges: [
      'Mandatory 5-year post-mission disposal codified into statute',
      'Active debris removal demonstration program ($500M authorization)',
      'Space Sustainability Fund for debris remediation',
      'Collision avoidance data sharing requirements',
      'Incentives for operators exceeding minimum standards',
      'International cooperation provisions for debris tracking',
    ],
    affectedParties: ['all_space_operators', 'debris_removal_companies', 'constellation_operators', 'space_insurers'],
    sourceUrl: 'https://www.congress.gov/',
    relatedPolicies: ['fcc-5-year-deorbit', 'nasa-orbital-debris-standard', 'copuos-lts-guidelines'],
  },

  // SPD-3 Space Traffic Management
  {
    id: 'spd-3-space-traffic-management',
    slug: 'spd-3-space-traffic-management',
    agency: 'NOAA',
    title: 'Space Policy Directive-3: National Space Traffic Management Policy',
    summary: 'Presidential directive establishing US policy for space traffic management, directing civil agencies to assume greater responsibility for space situational awareness and traffic coordination.',
    impactAnalysis: 'Initiates the transition of space traffic management from DoD to civil agencies (NOAA/DOC). Establishes the framework for TraCSS and open data policies for SSA. Represents a fundamental shift in how the US manages the space operating environment.',
    impactSeverity: 'critical',
    impactAreas: ['space_traffic_management', 'space_situational_awareness', 'conjunction_assessment', 'data_sharing'],
    status: 'effective',
    publishedDate: '2018-06-18',
    effectiveDate: '2018-06-18',
    keyChanges: [
      'Department of Commerce designated as civil SSA lead',
      'Open data policy for most space tracking data',
      'STM guidelines for satellite operators',
      'Research priorities for SSA technology improvements',
      'International engagement on STM standards',
      'Minimum safety standards for orbital operations',
    ],
    affectedParties: ['satellite_operators', 'launch_providers', 'commercial_ssa_providers', 'government_agencies'],
    sourceUrl: 'https://trumpwhitehouse.archives.gov/presidential-actions/space-policy-directive-3-national-space-traffic-management-policy/',
    relatedPolicies: ['tracss-implementation'],
  },

  // DDTC Fundamental Research Exclusion Update
  {
    id: 'ddtc-fundamental-research-update',
    slug: 'ddtc-fundamental-research-exclusion-space',
    agency: 'DDTC',
    title: 'DDTC Guidance on Fundamental Research Exclusion for Space-Related Activities',
    summary: 'Updated DDTC guidance clarifying the scope of the fundamental research exclusion under ITAR for university and research institution space-related activities.',
    impactAnalysis: 'Provides clearer boundaries for academic researchers working on space technology, reducing compliance uncertainty for university-based satellite development programs and space technology research.',
    impactSeverity: 'medium',
    impactAreas: ['academic_research', 'technology_transfer', 'university_programs', 'cubesat_development'],
    status: 'effective',
    publishedDate: '2024-02-15',
    effectiveDate: '2024-02-15',
    keyChanges: [
      'Clarified scope of fundamental research for space activities',
      'Updated guidance for university CubeSat and SmallSat programs',
      'New safe harbor provisions for academic conferences',
      'Enhanced guidance on foreign national participation in research',
      'Streamlined Technology Control Plans for university labs',
    ],
    affectedParties: ['universities', 'research_institutions', 'cubesat_developers', 'academic_researchers'],
    sourceUrl: 'https://www.state.gov/ddtc',
    relatedPolicies: ['ddtc-itar-cat-xv-revision'],
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

  // Rescue Agreement
  {
    id: 'rescue-agreement',
    slug: 'rescue-agreement-1968',
    name: 'Rescue Agreement',
    fullName: 'Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space',
    type: 'un_treaty',
    adoptedDate: '1967-12-19',
    effectiveDate: '1968-12-03',
    parties: 99,
    usRatified: true,
    keyObligations: [
      'States shall notify launching authority and UN of astronauts in distress (Article 1)',
      'States shall take all possible steps to rescue astronauts in distress (Article 2)',
      'Astronauts who land in foreign territory shall be safely returned (Article 4)',
      'States shall return space objects found in their territory (Article 5)',
      'Launching authority shall reimburse expenses for recovery/return (Article 5)',
      'Applies to personnel of spacecraft including crews (Article 3)',
    ],
    commercialImplications: [
      'Applies to commercial crew missions (SpaceX Dragon, Boeing Starliner)',
      'Establishes framework for international rescue cooperation',
      'Launching states responsible for recovery costs of returned objects',
      'Growing relevance with commercial space stations and tourism',
      'May need updates for lunar surface operations under Artemis',
    ],
    enforcementMechanism: 'Diplomatic channels; notification requirements through UN Secretary-General',
    usImplementation: 'Implemented through NASA agreements with international partners. FAA human spaceflight regulations require emergency plans.',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/rescueagreement.html',
  },

  // Moon Agreement
  {
    id: 'moon-agreement',
    slug: 'moon-agreement-1979',
    name: 'Moon Agreement',
    fullName: 'Agreement Governing the Activities of States on the Moon and Other Celestial Bodies',
    type: 'un_treaty',
    adoptedDate: '1979-12-05',
    effectiveDate: '1984-07-11',
    parties: 18,
    usRatified: false,
    keyObligations: [
      'Moon and its natural resources are the common heritage of mankind (Article 11)',
      'International regime to govern exploitation of resources (Article 11)',
      'Freedom of scientific investigation on the Moon (Article 6)',
      'Prohibition on altering the environment of the Moon (Article 7)',
      'Inform UN Secretary-General of Moon activities (Article 5)',
      'States may establish manned and unmanned stations (Article 9)',
    ],
    commercialImplications: [
      'NOT ratified by any major spacefaring nation (US, Russia, China, EU)',
      'Common heritage doctrine conflicts with commercial resource extraction',
      'US explicitly rejects its applicability via Commercial Space Launch Competitiveness Act (2015)',
      'Artemis Accords designed as alternative framework for lunar operations',
      'Resource extraction rights remain contested under general Outer Space Treaty',
    ],
    enforcementMechanism: 'Largely unenforceable due to minimal ratification; no major spacefaring nation is party',
    usImplementation: 'Not ratified. US position: Outer Space Treaty does not prohibit resource extraction; CSLCA Section 51303 grants US citizens property rights over resources obtained.',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/moon-agreement.html',
  },

  // Artemis Accords (as treaty)
  {
    id: 'artemis-accords',
    slug: 'artemis-accords-2020',
    name: 'Artemis Accords',
    fullName: 'Principles for Cooperation in the Civil Exploration and Use of the Moon, Mars, Comets, and Asteroids for Peaceful Purposes',
    type: 'bilateral',
    adoptedDate: '2020-10-13',
    effectiveDate: '2020-10-13',
    parties: 46,
    usRatified: true,
    keyObligations: [
      'Peaceful purposes: Activities solely for peaceful purposes (Section 1)',
      'Transparency: Public description of policies and plans (Section 3)',
      'Interoperability: Systems designed for interoperability (Section 4)',
      'Emergency assistance: Render assistance to personnel in distress (Section 5)',
      'Registration: Register objects per Registration Convention (Section 7)',
      'Release of scientific data: Publicly release scientific data (Section 8)',
      'Space resources: Extraction and utilization consistent with OST (Section 10)',
      'Orbital debris: Plan for safe disposal of spacecraft (Section 12)',
    ],
    commercialImplications: [
      'Non-binding but politically significant framework for lunar operations',
      'Establishes safety zones around operations as practical norms',
      'Resource extraction principle supports commercial lunar mining',
      'Interoperability requirement affects hardware design choices',
      '46 signatories as of 2025 covering major spacefaring nations',
    ],
    enforcementMechanism: 'Non-binding bilateral agreements; political and diplomatic enforcement through NASA partnerships',
    usImplementation: 'NASA implements through bilateral agreements with each signatory. Requirements flow down to commercial contractors through contract terms.',
    sourceUrl: 'https://www.nasa.gov/artemis-accords/',
  },

  // Convention on International Liability
  {
    id: 'liability-convention-full',
    slug: 'liability-convention-detailed',
    name: 'Liability Convention (Detailed)',
    fullName: 'Convention on International Liability for Damage Caused by Space Objects',
    type: 'un_treaty',
    adoptedDate: '1972-03-29',
    effectiveDate: '1972-09-01',
    parties: 98,
    usRatified: true,
    keyObligations: [
      'Absolute liability for damage on Earth surface (Article II)',
      'Fault-based liability for damage in outer space (Article III)',
      'Joint and several liability for joint launches (Article V)',
      'Claims within one year through diplomatic channels (Articles IX, X)',
      'Claims Commission establishment (Articles XIV-XX)',
      'Launching State definition includes procurer and territory state (Article I)',
    ],
    commercialImplications: [
      'Launching State liable even for private company activities',
      'Basis for government indemnification and insurance requirements',
      'Only formal claim: Cosmos 954 (Canada v. USSR, 1978)',
      'Growing constellation operations increase collision liability risk',
      'Active debris removal creates new liability scenarios',
    ],
    enforcementMechanism: 'Diplomatic claims; Claims Commission; ICJ; domestic court proceedings',
    usImplementation: 'FAA requires Maximum Probable Loss (MPL) determination and insurance up to $500M (third party), $100M (government). Government indemnification above insured amounts.',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html',
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

  // Bogota Declaration
  {
    id: 'bogota-declaration',
    slug: 'bogota-declaration-1976',
    caseName: 'Bogota Declaration (Equatorial States Claim to GEO)',
    year: 1976,
    jurisdiction: 'international',
    parties: {
      plaintiff: 'Eight Equatorial States (Colombia, Brazil, Congo, Ecuador, Indonesia, Kenya, Uganda, Zaire)',
      defendant: 'International Community / Spacefaring Nations',
    },
    subjectMatter: ['geostationary_orbit', 'sovereignty', 'natural_resources', 'space_law'],
    summary: 'Eight equatorial nations declared sovereignty over geostationary orbit segments above their territories, claiming GEO is a limited natural resource not part of outer space.',
    facts: 'On December 3, 1976, eight equatorial countries signed the Declaration of the First Meeting of Equatorial Countries (Bogota Declaration), asserting that the geostationary orbit (GEO) above their equatorial territory is a scarce natural resource under their sovereign control. They argued GEO is physically dependent on Earth\'s gravity and equatorial location, making it distinct from "outer space" under the Outer Space Treaty.',
    holdings: [
      'Declaration rejected by the international community',
      'ITU and UN did not recognize sovereignty claims over GEO',
      'Outer Space Treaty Article II prohibition on national appropriation affirmed',
      'Equatorial countries received no special GEO rights',
    ],
    outcome: 'dismissed',
    significance: 'First major challenge to the Outer Space Treaty\'s prohibition on national appropriation. Raised fundamental questions about the definition of outer space and the legal status of GEO. While rejected, it influenced discussions about equitable access to orbital resources.',
    precedentValue: 'Affirmed that GEO is part of outer space subject to the Outer Space Treaty. Demonstrated that sovereignty claims over orbital locations will not be recognized. Influenced ITU deliberations on equitable access for developing nations.',
    keyQuotes: [
      'The geostationary orbit is a scarce natural resource whose utilization must not be monopolized by the developed nations',
    ],
    relatedCases: ['cosmos-954'],
    sourceUrl: 'https://www.unoosa.org/',
  },

  // LightSquared/Ligado Networks v. GPS Users
  {
    id: 'ligado-gps-interference',
    slug: 'ligado-networks-gps-interference',
    caseName: 'Ligado Networks LLC v. GPS Industry / FCC Proceedings',
    year: 2020,
    jurisdiction: 'federal',
    court: 'Federal Communications Commission / D.C. Circuit Court of Appeals',
    parties: {
      plaintiff: 'Ligado Networks LLC (formerly LightSquared)',
      defendant: 'U.S. GPS Industry Council / Multiple Intervenors',
    },
    subjectMatter: ['spectrum_interference', 'gps', 'satellite_terrestrial', 'fcc_licensing'],
    summary: 'Decade-long spectrum dispute over Ligado Networks\' proposal to repurpose satellite L-band spectrum for terrestrial wireless use, which GPS industry argued would cause harmful interference to GPS receivers.',
    facts: 'LightSquared (later Ligado Networks) sought FCC approval to deploy a terrestrial wireless network using spectrum adjacent to GPS frequencies in the L-band. GPS manufacturers, the military, and aviation industry argued terrestrial transmissions would overload GPS receivers. FCC initially approved with conditions in 2020 despite DoD opposition. Multiple legal challenges followed.',
    holdings: [
      'FCC approved Ligado\'s modified application with strict power limits (April 2020)',
      'DoD filed formal objections citing national security GPS interference risks',
      'Congressional language in NDAA required further study',
      'D.C. Circuit upheld FCC authority to approve license',
      'Ligado required to implement interference mitigation fund',
    ],
    outcome: 'plaintiff_victory',
    significance: 'Landmark spectrum sharing case with major implications for satellite-terrestrial coexistence. Demonstrated FCC authority over spectrum allocation even against DoD objections. Set precedent for adjacent-band interference analysis in space frequencies.',
    precedentValue: 'Critical precedent for satellite-terrestrial spectrum sharing disputes. Shows FCC authority on spectrum decisions. Important for 12 GHz and other space-terrestrial sharing proceedings.',
    relatedCases: [],
    sourceUrl: 'https://www.fcc.gov/document/fcc-grants-ligados-modification-application',
  },

  // Dish Network Orbital Debris Fine
  {
    id: 'dish-network-debris-fine',
    slug: 'dish-network-orbital-debris-fine-2023',
    caseName: 'In re DISH Network LLC (Orbital Debris Violation)',
    citation: 'FCC 23-83',
    year: 2023,
    jurisdiction: 'federal',
    court: 'Federal Communications Commission Enforcement Bureau',
    parties: {
      plaintiff: 'Federal Communications Commission',
      defendant: 'DISH Network LLC',
    },
    subjectMatter: ['orbital_debris', 'fcc_enforcement', 'satellite_disposal', 'compliance'],
    summary: 'FCC issued first-ever fine for orbital debris violation, penalizing DISH Network $150,000 for failing to properly deorbit its EchoStar-7 satellite to the required graveyard orbit.',
    facts: 'DISH Network\'s EchoStar-7 geostationary satellite was required to be moved to a graveyard orbit at least 300 km above GEO at end of life. Instead, DISH retired the satellite at approximately 122 km above GEO due to insufficient remaining fuel. The FCC found this violated DISH\'s post-mission disposal plan and license conditions.',
    holdings: [
      'DISH Network violated its orbital debris mitigation plan',
      'First-ever FCC enforcement action specifically for orbital debris violation',
      '$150,000 consent decree payment',
      'DISH required to implement enhanced compliance plan',
      'Compliance officer designation required',
    ],
    outcome: 'settlement',
    damages: 150000,
    damagesDescription: '$150,000 civil penalty for orbital debris mitigation plan violation',
    significance: 'First FCC enforcement action for failure to properly deorbit a satellite. Signals FCC\'s willingness to enforce orbital debris rules. Established precedent for orbital debris compliance enforcement as FCC prepares stricter 5-year deorbit rules.',
    precedentValue: 'Landmark first enforcement of orbital debris mitigation rules. Shows FCC treating debris compliance as enforceable obligation. Expected to encourage industry compliance with tightening disposal requirements.',
    relatedCases: ['swarm-fcc-enforcement'],
    sourceUrl: 'https://www.fcc.gov/document/fcc-reaches-first-space-debris-settlement',
  },

  // Boeing/SpaceX Patent Disputes
  {
    id: 'boeing-spacex-starliner',
    slug: 'boeing-spacex-patent-crew-capsule',
    caseName: 'Boeing Co. v. SpaceX (Crew Capsule Design Elements)',
    year: 2019,
    jurisdiction: 'federal',
    court: 'U.S. District Court, Central District of California',
    parties: {
      plaintiff: 'The Boeing Company',
      defendant: 'Space Exploration Technologies Corp.',
    },
    subjectMatter: ['patent_dispute', 'crew_capsule', 'commercial_crew', 'spacecraft_design'],
    summary: 'Boeing alleged SpaceX infringed patents related to crew capsule thermal protection and landing systems in the development of Dragon 2 / Crew Dragon.',
    facts: 'Boeing filed suit alleging SpaceX\'s Crew Dragon spacecraft infringed on multiple Boeing patents related to ablative thermal protection systems and propulsive/parachute landing systems. The case was settled confidentially before trial, with neither party admitting infringement.',
    holdings: [
      'Case settled out of court with confidential terms',
      'No public admission of infringement',
      'Cross-licensing agreement reportedly reached',
      'Both companies continued Commercial Crew operations',
    ],
    outcome: 'settlement',
    significance: 'Illustrates growing patent tensions as more companies develop crew-rated spacecraft. Settlement suggests industry preference for licensing over litigation in critical space programs. Highlights IP challenges in government-funded commercial space programs.',
    precedentValue: 'Demonstrates patent litigation risk in commercial crew development. Settlement pattern suggests cross-licensing as preferred resolution. Government-funded IP ownership questions remain partially unresolved.',
    relatedCases: ['spacex-blue-origin-patent'],
    sourceUrl: 'https://www.uscourts.gov/',
  },

  // Sierra Nevada CCtCap Protest
  {
    id: 'sierra-nevada-cctcap',
    slug: 'sierra-nevada-dream-chaser-cctcap-protest',
    caseName: 'Sierra Nevada Corporation v. NASA (CCtCap Dream Chaser)',
    citation: 'B-410550, B-410550.2',
    year: 2014,
    jurisdiction: 'gao',
    court: 'Government Accountability Office',
    parties: {
      plaintiff: 'Sierra Nevada Corporation',
      defendant: 'National Aeronautics and Space Administration',
    },
    subjectMatter: ['bid_protest', 'commercial_crew', 'dream_chaser', 'procurement'],
    summary: 'Sierra Nevada protested NASA\'s Commercial Crew Transportation Capability (CCtCap) decision to select only Boeing and SpaceX, excluding its Dream Chaser spacecraft.',
    facts: 'NASA\'s CCtCap contract awarded crew transportation development contracts to Boeing ($4.2B) and SpaceX ($2.6B), excluding Sierra Nevada\'s Dream Chaser lifting body design. Sierra Nevada protested the evaluation methodology and argued NASA applied different standards in evaluating proposals. GAO denied the main protest but recommended NASA re-examine certain aspects.',
    holdings: [
      'GAO denied Sierra Nevada\'s main protest grounds',
      'Found NASA\'s evaluation methodology was reasonable',
      'Recommended NASA re-examine specific technical evaluation elements',
      'NASA took voluntary corrective action on minor issues',
      'Boeing and SpaceX awards upheld',
    ],
    outcome: 'dismissed',
    significance: 'Key precedent for NASA commercial crew procurement. Demonstrated GAO deference to NASA technical evaluations. Sierra Nevada subsequently won CRS-2 cargo contract for Dream Chaser, showing alternative procurement paths.',
    precedentValue: 'Shows difficulty of overturning NASA technical evaluations through GAO protest. Demonstrates that losing a protest does not preclude future contract opportunities. Important for understanding GAO review of best-value trade-off decisions.',
    relatedCases: ['blue-origin-nasa-hls'],
    sourceUrl: 'https://www.gao.gov/products/b-410550',
  },

  // SpaceX EELV Lawsuit
  {
    id: 'spacex-eelv-block-buy',
    slug: 'spacex-eelv-block-buy-lawsuit-2014',
    caseName: 'Space Exploration Technologies Corp. v. United States (EELV Block Buy)',
    citation: 'No. 14-354C (Fed. Cl.)',
    year: 2014,
    jurisdiction: 'federal',
    court: 'U.S. Court of Federal Claims',
    parties: {
      plaintiff: 'Space Exploration Technologies Corp. (SpaceX)',
      defendant: 'United States (Air Force)',
    },
    subjectMatter: ['government_contracts', 'launch_services', 'eelv', 'competition'],
    summary: 'SpaceX challenged the Air Force sole-source block buy of 36 rocket cores from United Launch Alliance for national security launches without competition.',
    facts: 'The Air Force awarded ULA a sole-source contract for 36 Evolved Expendable Launch Vehicle (EELV) rocket cores worth approximately $11 billion without competition. SpaceX, which had not yet been certified for national security launches, argued the block buy violated competition requirements under CICA. The case was settled when the Air Force agreed to open future competitions.',
    holdings: [
      'Case settled before trial',
      'Air Force agreed to compete future launch service contracts',
      'SpaceX subsequently certified for national security space launches in 2015',
      'Block buy reduced from 36 to 28 cores',
    ],
    outcome: 'settlement',
    significance: 'Broke ULA\'s decade-long monopoly on national security space launches. Led to SpaceX certification for military launches and eventual dominance of the national security launch market. Transformed the entire US launch industry competitive landscape.',
    precedentValue: 'Watershed moment for competition in national security space launches. Demonstrated effectiveness of legal challenges to sole-source military space contracts. Led to fundamental restructuring of EELV/NSSL procurement.',
    relatedCases: ['blue-origin-nasa-hls'],
    sourceUrl: 'https://www.uscfc.uscourts.gov/',
  },

  // NEPA Challenge to SpaceX Boca Chica
  {
    id: 'nepa-spacex-boca-chica',
    slug: 'nepa-spacex-boca-chica-starbase',
    caseName: 'Save RGV et al. v. FAA (Boca Chica Starbase Environmental Review)',
    year: 2022,
    jurisdiction: 'federal',
    court: 'U.S. District Court, District of Columbia',
    parties: {
      plaintiff: 'Save RGV / Multiple Environmental Groups',
      defendant: 'Federal Aviation Administration',
    },
    subjectMatter: ['environmental_law', 'nepa', 'launch_site', 'spaceport'],
    summary: 'Environmental groups challenged FAA\'s Programmatic Environmental Assessment for SpaceX Starship/Super Heavy operations at Boca Chica, arguing a full Environmental Impact Statement was required.',
    facts: 'The FAA issued a Mitigated Finding of No Significant Impact (FONSI) for SpaceX Starship operations at Boca Chica, Texas after a lengthy Programmatic Environmental Assessment. Environmental groups and local residents argued the assessment underestimated noise impacts, wildlife disturbance (endangered species), and water contamination risks. They sought a full EIS.',
    holdings: [
      'Challenge partially addressed through FAA enhanced mitigation requirements',
      'FAA added over 75 mitigation conditions to SpaceX operations',
      'No full EIS required but continued monitoring mandated',
      'SpaceX required to fund environmental monitoring programs',
    ],
    outcome: 'settlement',
    significance: 'Set precedent for environmental review of commercial spaceport operations. Demonstrated that NEPA challenges can significantly constrain launch operations even without blocking them. Led to enhanced environmental mitigation requirements for all future spaceport developments.',
    precedentValue: 'Key case for understanding NEPA application to commercial space facilities. Shows environmental challenges as effective tool for securing mitigation conditions. Important for future spaceport environmental reviews.',
    relatedCases: [],
    sourceUrl: 'https://www.faa.gov/space/stakeholder_engagement/spacex_starship_super_heavy',
  },

  // Planet Labs ITAR Settlement
  {
    id: 'planet-labs-export-settlement',
    slug: 'planet-labs-ddtc-settlement',
    caseName: 'In re Planet Labs PBC (Export Control Disclosure)',
    year: 2023,
    jurisdiction: 'federal',
    court: 'Directorate of Defense Trade Controls (DDTC)',
    parties: {
      plaintiff: 'U.S. Department of State / DDTC',
      defendant: 'Planet Labs PBC',
    },
    subjectMatter: ['export_controls', 'itar_violation', 'remote_sensing', 'voluntary_disclosure'],
    summary: 'Planet Labs voluntarily disclosed ITAR violations related to the sharing of remote sensing satellite technical data with foreign national employees and international partners without required licenses.',
    facts: 'Planet Labs discovered and voluntarily disclosed to DDTC that technical data related to its satellite systems had been shared with foreign national employees and international partner organizations without required ITAR licenses or Technical Assistance Agreements. The violations occurred during rapid company growth when export compliance procedures did not keep pace with hiring.',
    holdings: [
      'DDTC accepted voluntary disclosure as mitigating factor',
      'Reduced penalty due to cooperation and remediation',
      'Planet Labs required to enhance compliance program',
      'External compliance auditor required for three years',
    ],
    outcome: 'settlement',
    damages: 2800000,
    damagesDescription: '$2.8 million civil penalty with portion suspended contingent on compliance improvements',
    significance: 'Demonstrates export control risks for fast-growing space companies. Voluntary disclosure significantly reduced penalties. Highlights challenges of maintaining ITAR compliance with diverse international workforce.',
    precedentValue: 'Important precedent for startup space companies regarding deemed export compliance. Shows value of voluntary self-disclosure program. Demonstrates DDTC enforcement focus on remote sensing sector.',
    relatedCases: ['loral-hughes-export', 'aeroflex-export-violation'],
    sourceUrl: 'https://www.state.gov/ddtc',
  },

  // Amazon Kuiper FCC Challenge
  {
    id: 'kuiper-fcc-milestone',
    slug: 'amazon-kuiper-fcc-milestone-extension',
    caseName: 'Amazon Kuiper Systems LLC - FCC Deployment Milestone Proceedings',
    year: 2024,
    jurisdiction: 'federal',
    court: 'Federal Communications Commission',
    parties: {
      plaintiff: 'Multiple NGSO Operators / Commenters',
      defendant: 'Amazon Kuiper Systems LLC',
    },
    subjectMatter: ['fcc_licensing', 'deployment_milestones', 'ngso_constellation', 'spectrum_rights'],
    summary: 'Industry challenges and FCC proceedings regarding Amazon Kuiper\'s compliance with satellite deployment milestones required to maintain its FCC license and spectrum rights.',
    facts: 'FCC licenses for NGSO constellations include strict deployment milestones. Amazon Kuiper received its license in 2020 with requirements to deploy half its 3,236-satellite constellation by July 2026. Competitors raised questions about whether Kuiper could meet these milestones given launch vehicle availability constraints.',
    holdings: [
      'FCC maintained strict milestone enforcement framework',
      'Amazon demonstrated committed launch contracts (ULA, Arianespace, Blue Origin)',
      'FCC affirmed deployment milestones are non-negotiable license conditions',
      'Failure to meet milestones results in proportional license reduction',
    ],
    outcome: 'pending',
    significance: 'Tests FCC enforcement of deployment milestones for mega-constellations. Outcome will affect billions in spectrum rights. Demonstrates competitive dynamics between Starlink and Kuiper.',
    precedentValue: 'Key precedent for FCC deployment milestone enforcement. Will determine whether FCC grants flexibility for legitimate launch delays. Important for all future NGSO constellation licensing.',
    relatedCases: [],
    sourceUrl: 'https://www.fcc.gov/space/space-stations',
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

  // Additional Think Tanks
  {
    id: 'space-foundation',
    slug: 'space-foundation',
    name: 'Space Foundation',
    type: 'think_tank',
    organization: 'Space Foundation',
    url: 'https://www.spacefoundation.org/',
    topics: ['space_policy', 'space_economy', 'workforce', 'education', 'commercial_space'],
    description: 'Colorado Springs-based nonprofit advocating for the global space community. Publishes annual Space Report on global space economy. Organizes Space Symposium, the premier space industry conference.',
    keyContributors: ['Space Foundation research team'],
    isActive: true,
  },
  {
    id: 'national-space-council',
    slug: 'national-space-council',
    name: 'National Space Council',
    type: 'government',
    organization: 'Executive Office of the President',
    url: 'https://www.whitehouse.gov/ostp/nstc/',
    topics: ['space_policy', 'national_strategy', 'interagency_coordination', 'space_directives'],
    description: 'White House advisory body coordinating US civil, commercial, and national security space policy. Issues Space Policy Directives that shape regulatory framework.',
    keyContributors: ['Vice President (Chair)', 'Cabinet members'],
    isActive: true,
  },
  {
    id: 'espi',
    slug: 'european-space-policy-institute',
    name: 'European Space Policy Institute (ESPI)',
    type: 'think_tank',
    organization: 'ESPI',
    url: 'https://www.espi.or.at/',
    topics: ['european_space_policy', 'space_governance', 'space_economy', 'international_cooperation'],
    description: 'Vienna-based think tank providing policy research for European space decision-makers. Publishes analyses of European space strategy, governance, and economic competitiveness.',
    keyContributors: ['ESPI research fellows'],
    isActive: true,
  },
  {
    id: 'nebraska-space-law',
    slug: 'university-nebraska-space-law',
    name: 'University of Nebraska College of Law - Space, Cyber, and Telecommunications Law',
    type: 'academic',
    organization: 'University of Nebraska-Lincoln',
    url: 'https://law.unl.edu/space-cyber-and-telecommunications-law/',
    topics: ['space_law', 'cyber_law', 'telecommunications', 'international_law', 'academic_research'],
    description: 'Leading US academic program in space law. Hosts the Space, Cyber, and Telecommunications Law program and publishes scholarship on all aspects of space legal frameworks.',
    keyContributors: ['Frans von der Dunk', 'Jack Beard'],
    isActive: true,
  },
  {
    id: 'mcgill-iasl',
    slug: 'mcgill-institute-air-space-law',
    name: 'McGill Institute of Air and Space Law',
    type: 'academic',
    organization: 'McGill University',
    url: 'https://www.mcgill.ca/iasl/',
    topics: ['air_law', 'space_law', 'international_law', 'treaties', 'liability'],
    description: 'Oldest and most prestigious academic institution dedicated to air and space law. The Annals of Air and Space Law journal is a primary reference for space law scholarship worldwide.',
    keyContributors: ['Ram Jakhu', 'IASL faculty'],
    isActive: true,
  },
  {
    id: 'iisl',
    slug: 'international-institute-space-law',
    name: 'International Institute of Space Law (IISL)',
    type: 'industry_association',
    organization: 'International Astronautical Federation',
    url: 'https://www.iislweb.space/',
    topics: ['space_law', 'international_law', 'treaties', 'policy', 'governance'],
    description: 'Premier international association for space law professionals. Organizes annual colloquia on space law and provides advisory opinions on space law questions.',
    keyContributors: ['IISL Board of Directors', 'International space law practitioners'],
    isActive: true,
  },
  {
    id: 'unoosa',
    slug: 'un-office-outer-space-affairs',
    name: 'UN Office for Outer Space Affairs (UNOOSA)',
    type: 'government',
    organization: 'United Nations',
    url: 'https://www.unoosa.org/',
    topics: ['space_law', 'treaties', 'space_governance', 'copuos', 'international_cooperation'],
    description: 'UN body responsible for promoting international cooperation in space activities. Serves as secretariat for COPUOS and maintains the UN Register of Objects Launched into Outer Space.',
    isActive: true,
  },
  {
    id: 'bryce-tech',
    slug: 'bryce-tech-space-analytics',
    name: 'BryceTech (Space Analytics)',
    type: 'think_tank',
    organization: 'BryceTech',
    url: 'https://brycetech.com/',
    topics: ['space_economy', 'market_analysis', 'launch_market', 'satellite_industry', 'investment'],
    description: 'Leading space industry analytics firm. Produces influential reports on space economy, start-up investment, launch industry statistics, and smallsat market trends.',
    keyContributors: ['Carissa Christensen', 'BryceTech analysts'],
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

  // 5A001 - Telecommunications Equipment
  {
    id: 'eccn-5a001',
    eccn: '5A001',
    description: 'Telecommunications systems, equipment and components',
    category: '5 - Telecommunications and Information Security',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['NS', 'AT'],
    licenseRequirements: 'License required for systems exceeding controlled parameters. License Exception ENC may apply.',
    licenseExceptions: ['STA', 'ENC', 'TMP', 'RPL', 'GOV'],
    spaceRelevance: 'Controls satellite communication terminals, ground station equipment, and inter-satellite link systems used in space communication networks.',
    examples: [
      'Satellite communication terminals (VSAT)',
      'Satellite ground station transceivers',
      'Inter-satellite optical communication terminals',
      'Phased array antenna systems for satellite communications',
      'Satellite modems with advanced waveforms',
    ],
    relatedECCNs: ['5A002', '5D001', '5E001'],
  },

  // 7A003 - Inertial Navigation Equipment
  {
    id: 'eccn-7a003',
    eccn: '7A003',
    description: 'Inertial navigation systems, inertial equipment, and specially designed components',
    category: '7 - Navigation and Avionics',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['NS', 'MT', 'AT'],
    licenseRequirements: 'License required. MTCR controls apply to high-accuracy units. Very limited exceptions.',
    licenseExceptions: ['STA', 'GOV'],
    spaceRelevance: 'Controls space-grade inertial measurement units (IMUs), star trackers, and gyroscopes used in spacecraft attitude determination and launch vehicle guidance.',
    examples: [
      'Space-grade ring laser gyroscopes',
      'Fiber optic gyroscopes for satellite attitude control',
      'Hemispherical resonator gyroscopes (HRG)',
      'Star trackers for spacecraft navigation',
      'Inertial measurement units (IMUs) for launch vehicles',
      'Accelerometers meeting controlled accuracy thresholds',
    ],
    relatedECCNs: ['7A103', '7A004', '7D003'],
  },

  // 7A103 - Missile/Space Dual-Use Guidance
  {
    id: 'eccn-7a103',
    eccn: '7A103',
    description: 'Instrumentation, navigation equipment and systems designed for space launch vehicles',
    category: '7 - Navigation and Avionics',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['MT', 'NP', 'AT'],
    licenseRequirements: 'License required under MTCR Annex controls. Presumption of denial to many destinations.',
    licenseExceptions: ['GOV'],
    spaceRelevance: 'MTCR-controlled guidance equipment with dual-use potential for ballistic missiles. Includes GPS receivers designed for high-dynamic environments (space launch trajectory).',
    examples: [
      'GPS receivers capable of operating above 60,000 feet or at 1,000 knots',
      'Integrated flight management systems for launch vehicles',
      'Thrust vector control systems',
      'Flight termination systems for range safety',
      'Mission computers for launch vehicle guidance',
    ],
    relatedECCNs: ['7A003', '7A004', '9A004'],
  },

  // 5D002 - Information Security Software
  {
    id: 'eccn-5d002',
    eccn: '5D002',
    description: 'Software for information security',
    category: '5 - Telecommunications and Information Security',
    productGroup: 'D - Software',
    reasonForControl: ['NS', 'AT', 'EI'],
    licenseRequirements: 'License required for strong encryption. License Exception ENC available after classification review for most commercial encryption.',
    licenseExceptions: ['ENC', 'TSU', 'GOV'],
    spaceRelevance: 'Controls encryption software used in satellite communications, telemetry protection, and command authentication. Critical for securing space-to-ground links.',
    examples: [
      'Satellite command encryption software',
      'Telemetry encryption modules',
      'Space-to-ground link encryption',
      'Anti-jam communication software',
      'Key management systems for satellite networks',
    ],
    relatedECCNs: ['5A002', '5D001', '5E002'],
  },

  // 3A515 - Space Electronics
  {
    id: 'eccn-3a515',
    eccn: '3A515',
    description: 'Test, inspection, and production equipment specially designed for spacecraft commodities',
    category: '3 - Electronics',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['NS', 'RS', 'AT'],
    licenseRequirements: 'License required. Transferred from USML alongside 9A515 spacecraft items.',
    licenseExceptions: ['STA', 'TMP', 'RPL', 'GOV'],
    spaceRelevance: 'Controls manufacturing and test equipment specifically designed for satellite and spacecraft production, including thermal vacuum chambers, vibration test systems, and cleanroom equipment.',
    examples: [
      'Thermal vacuum test chambers for spacecraft qualification',
      'Vibration test systems for launch environment simulation',
      'Electromagnetic compatibility (EMC) test facilities',
      'Satellite integration and test equipment',
      'Antenna range measurement systems for spacecraft',
    ],
    relatedECCNs: ['9A515', '9B515', '3A001'],
  },

  // 9A104 - Sounding Rockets (MTCR)
  {
    id: 'eccn-9a104',
    eccn: '9A104',
    description: 'Sounding rockets capable of a range of at least 300 km',
    category: '9 - Aerospace and Propulsion',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['MT', 'AT'],
    licenseRequirements: 'Strict MTCR Category I controls. License required to all destinations. Presumption of denial for most.',
    licenseExceptions: ['GOV'],
    spaceRelevance: 'Controls suborbital rockets that can reach space altitudes, dual-use potential for ballistic missile development. Includes complete sounding rockets and major subsystems.',
    examples: [
      'Complete sounding rockets with 300+ km range',
      'Suborbital research rockets',
      'Technology demonstrator rockets for space access',
      'Upper stages and kick motors meeting range criteria',
    ],
    relatedECCNs: ['9A004', '9A005', '9A119'],
  },

  // 6A002 - Optical Sensors
  {
    id: 'eccn-6a002',
    eccn: '6A002',
    description: 'Optical sensors and equipment',
    category: '6 - Sensors and Lasers',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['NS', 'MT', 'AT'],
    licenseRequirements: 'License required for sensors exceeding controlled parameters (resolution, sensitivity, spectral range).',
    licenseExceptions: ['STA', 'TMP', 'RPL'],
    spaceRelevance: 'Controls imaging sensors used in Earth observation satellites, including electro-optical imagers, infrared detectors, and multispectral/hyperspectral sensors.',
    examples: [
      'Focal plane arrays for satellite Earth observation',
      'Infrared detectors for space-based sensors',
      'CCD/CMOS imagers meeting controlled resolution thresholds',
      'Hyperspectral imaging sensors for satellites',
      'Space-qualified optical assemblies',
    ],
    relatedECCNs: ['6A003', '6A004', '6E001'],
  },

  // 9A005 - Liquid Rocket Propulsion
  {
    id: 'eccn-9a005',
    eccn: '9A005',
    description: 'Liquid propellant rocket engines and components',
    category: '9 - Aerospace and Propulsion',
    productGroup: 'A - Systems, Equipment, and Components',
    reasonForControl: ['MT', 'NP', 'AT'],
    licenseRequirements: 'License required. MTCR controls for engines capable of use in systems exceeding 300 km range.',
    licenseExceptions: ['GOV'],
    spaceRelevance: 'Controls liquid rocket engines and components including turbopumps, injectors, and combustion chambers used in space launch vehicles.',
    examples: [
      'Liquid rocket engines with controllable thrust systems',
      'Rocket engine turbopumps',
      'Combustion chambers for liquid propellant engines',
      'Injector assemblies for rocket engines',
      'Regeneratively-cooled thrust chambers',
    ],
    relatedECCNs: ['9A004', '9A104', '9A119'],
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

  // Category XII - Fire Control, Range Finder, Optical and Guidance
  {
    id: 'usml-xii',
    category: 'XII',
    title: 'Fire Control, Laser, Imaging, and Guidance Equipment',
    description: 'Fire control systems, range finders, optical and guidance equipment with military applications, including space-based ISR systems.',
    items: [
      'Infrared focal plane arrays designed for military applications',
      'Space-based infrared surveillance sensor systems',
      'Military-grade laser designators and rangefinders',
      'Precision tracking and pointing systems for defense satellites',
      'Space-based persistent surveillance sensors',
      'Overhead persistent infrared (OPIR) sensor systems',
      'Fire control computers and software for space-based platforms',
    ],
    spaceRelevance: 'Controls space-based ISR (Intelligence, Surveillance, Reconnaissance) sensor systems including the Space Development Agency Tracking Layer and missile warning satellites.',
    licensingAuthority: 'Directorate of Defense Trade Controls (DDTC)',
    exemptions: [
      'Commercial Earth observation sensors with limited resolution may be on CCL',
      'Some lidar/laser systems transferred to 600-series ECCNs',
    ],
    relatedCategories: ['XV', 'XI', 'IV'],
  },

  // Category VIII - Aircraft and Related Articles (space-adjacent)
  {
    id: 'usml-viii',
    category: 'VIII',
    title: 'Aircraft and Related Articles',
    description: 'Military aircraft and components, including high-altitude platforms and space-adjacent aerospace systems.',
    items: [
      'Unmanned aerial vehicles (UAVs) with space-relevant altitude capabilities',
      'High-altitude long-endurance (HALE) platforms',
      'Hypersonic flight vehicles and glide bodies',
      'Space plane / aerospace plane designs',
      'Air-launch-to-orbit systems',
      'Atmospheric reentry glide vehicles',
    ],
    spaceRelevance: 'Controls hypersonic vehicles, space planes, and air-launch-to-orbit systems that bridge atmospheric and space flight. Includes classified X-37B-type capabilities.',
    licensingAuthority: 'Directorate of Defense Trade Controls (DDTC)',
    exemptions: [
      'Commercial aircraft engines and parts on CCL',
      'Civil aviation components typically not controlled',
    ],
    relatedCategories: ['IV', 'XV'],
  },

  // Category XVI - Nuclear Weapons Related (space-relevant)
  {
    id: 'usml-xvi',
    category: 'XVI',
    title: 'Nuclear Weapons Design and Testing Equipment',
    description: 'Nuclear weapons design and testing equipment, including items relevant to nuclear propulsion for space systems.',
    items: [
      'Nuclear weapons design and production equipment',
      'Nuclear testing and simulation systems',
      'Classified nuclear propulsion components',
      'Nuclear thermal propulsion elements for defense systems',
    ],
    spaceRelevance: 'Relevance to proposed nuclear thermal propulsion (NTP) systems like DRACO (NASA/DARPA). Nuclear propulsion R&D may involve USML Category XVI items depending on application.',
    licensingAuthority: 'Directorate of Defense Trade Controls (DDTC)',
    relatedCategories: ['IV', 'XV'],
  },

  // Category XX - Submersible Vessels
  {
    id: 'usml-xx',
    category: 'XX',
    title: 'Submersible Vessels and Related Articles',
    description: 'Submersible vessels, oceanographic equipment, and related systems with potential application to underwater launch technologies.',
    items: [
      'Submersible launch platforms',
      'Underwater missile launch systems',
      'Submarine-launched ballistic missile technology',
      'Pressure hull technology for deep-sea platforms',
      'Underwater communication systems',
    ],
    spaceRelevance: 'Limited but relevant for submarine-launched ballistic missile technology and proposed concepts for underwater/sea-based launch platforms. Some overlap with Category IV launch vehicle controls.',
    licensingAuthority: 'Directorate of Defense Trade Controls (DDTC)',
    exemptions: [
      'Commercial submersibles for non-military use generally not controlled',
    ],
    relatedCategories: ['IV', 'XI'],
  },
];

// ============================================================================
// BID PROTESTS DATA - Space Industry Procurement Challenges
// ============================================================================

export type ProtestOutcome = 'denied' | 'sustained' | 'dismissed' | 'withdrawn' | 'corrective_action' | 'settled';
export type ProtestForum = 'gao' | 'cofc' | 'dc_circuit' | 'district_court';
export type ProtestProgram = 'launch' | 'satellite' | 'crewed' | 'science' | 'defense' | 'iss';

export interface BidProtest {
  id: string;
  title: string;
  shortTitle: string;
  caseNumber: string;
  forum: ProtestForum;
  outcome: ProtestOutcome;
  program: ProtestProgram;
  protester: string;
  awardee: string;
  agency: string;
  contractValue: string;
  yearFiled: number;
  yearDecided: number;
  decisionDate: string;
  judge?: string;
  description: string;
  significance: string;
  keyFindings: string[];
}

export const SPACE_BID_PROTESTS: BidProtest[] = [
  {
    id: 'bo-hls-gao-2021',
    title: 'Blue Origin Federation, LLC - Human Landing System (HLS)',
    shortTitle: 'Blue Origin v. NASA (HLS)',
    caseNumber: 'B-419783',
    forum: 'gao',
    outcome: 'denied',
    program: 'crewed',
    protester: 'Blue Origin Federation, LLC',
    awardee: 'SpaceX',
    agency: 'NASA',
    contractValue: '$2.89 billion',
    yearFiled: 2021,
    yearDecided: 2021,
    decisionDate: '2021-07-30',
    description: 'Blue Origin protested NASA\'s decision to award a sole Human Landing System contract to SpaceX for $2.89 billion, arguing NASA improperly changed from a planned dual-award to single-award strategy without adequate justification.',
    significance: 'Landmark protest in Artemis program. GAO found NASA acted within its discretion in making a single award due to Congressional funding constraints. Blue Origin subsequently filed at COFC.',
    keyFindings: [
      'NASA\'s decision to make single award was reasonable given funding constraints',
      'Budget shortfall justified departure from anticipated dual-award approach',
      'SpaceX proposal evaluation was reasonable and consistent with solicitation',
      'NASA properly considered cost/price realism',
      'No unfair competitive advantage found',
    ],
  },
  {
    id: 'dynetics-hls-gao-2021',
    title: 'Dynetics, Inc. - Human Landing System (HLS)',
    shortTitle: 'Dynetics v. NASA (HLS)',
    caseNumber: 'B-419783.3',
    forum: 'gao',
    outcome: 'denied',
    program: 'crewed',
    protester: 'Dynetics, Inc.',
    awardee: 'SpaceX',
    agency: 'NASA',
    contractValue: '$2.89 billion',
    yearFiled: 2021,
    yearDecided: 2021,
    decisionDate: '2021-07-30',
    description: 'Dynetics filed companion protest to Blue Origin challenging NASA\'s sole-source HLS award to SpaceX. Dynetics argued its technical evaluation was flawed and that mass growth issues were improperly evaluated.',
    significance: 'Companion case to Blue Origin HLS protest. GAO found technical evaluation of Dynetics proposal was reasonable despite concerns about negative mass margins.',
    keyFindings: [
      'NASA technical evaluation of Dynetics proposal was reasonable',
      'Negative mass margin findings were properly considered',
      'Agency discretion in technical ratings upheld',
      'Selection methodology consistent with solicitation terms',
    ],
  },
  {
    id: 'bo-hls-cofc-2021',
    title: 'Blue Origin Federation, LLC v. United States (HLS - COFC)',
    shortTitle: 'Blue Origin v. USA (HLS COFC)',
    caseNumber: 'No. 21-1695C',
    forum: 'cofc',
    outcome: 'denied',
    program: 'crewed',
    protester: 'Blue Origin Federation, LLC',
    awardee: 'SpaceX',
    agency: 'NASA',
    contractValue: '$2.89 billion',
    yearFiled: 2021,
    yearDecided: 2021,
    decisionDate: '2021-11-04',
    judge: 'Judge Richard Hertling',
    description: 'After GAO denial, Blue Origin escalated to the Court of Federal Claims. Judge Hertling ruled in favor of NASA, finding the agency\'s procurement decisions were rational and consistent with the solicitation.',
    significance: 'Final adjudication of HLS procurement challenge. Affirmed NASA procurement discretion and ended legal obstacles to SpaceX Starship HLS development.',
    keyFindings: [
      'NASA source selection was reasonable and rational',
      'Budget constraints justified single-award approach',
      'Court deferred to NASA technical expertise',
      'No prejudicial error in evaluation process',
      'SpaceX award upheld on all grounds',
    ],
  },
  {
    id: 'spacex-eelv-cofc-2014',
    title: 'SpaceX v. United States (EELV Block Buy)',
    shortTitle: 'SpaceX v. USAF (EELV)',
    caseNumber: 'No. 14-354C',
    forum: 'cofc',
    outcome: 'settled',
    program: 'defense',
    protester: 'Space Exploration Technologies Corp.',
    awardee: 'United Launch Alliance',
    agency: 'U.S. Air Force',
    contractValue: '$11 billion (36 cores)',
    yearFiled: 2014,
    yearDecided: 2015,
    decisionDate: '2015-01-23',
    description: 'SpaceX challenged the Air Force\'s sole-source block buy of 36 EELV rocket cores from ULA without competition. Settled when Air Force agreed to open future competitions.',
    significance: 'Broke ULA monopoly on national security space launches. Led to SpaceX certification for military launches in 2015 and fundamentally transformed the US launch industry.',
    keyFindings: [
      'Settlement required Air Force to compete future launches',
      'Block buy reduced from 36 to 28 sole-source cores',
      'Remaining missions opened to competition',
      'SpaceX certified for national security launches in 2015',
      'Led to National Security Space Launch (NSSL) Phase 2 competition',
    ],
  },
  {
    id: 'sierra-nevada-cctcap-gao-2014',
    title: 'Sierra Nevada Corporation - CCtCap Dream Chaser',
    shortTitle: 'SNC v. NASA (CCtCap)',
    caseNumber: 'B-410550',
    forum: 'gao',
    outcome: 'denied',
    program: 'crewed',
    protester: 'Sierra Nevada Corporation',
    awardee: 'Boeing / SpaceX',
    agency: 'NASA',
    contractValue: '$6.8 billion (combined awards)',
    yearFiled: 2014,
    yearDecided: 2015,
    decisionDate: '2015-01-05',
    description: 'Sierra Nevada protested NASA\'s CCtCap decision selecting only Boeing and SpaceX for commercial crew development, excluding its Dream Chaser lifting body spacecraft.',
    significance: 'Important precedent for NASA commercial programs. SNC subsequently won CRS-2 cargo contract for Dream Chaser, demonstrating alternative paths after protest denial.',
    keyFindings: [
      'NASA evaluation methodology was reasonable',
      'Technical evaluation of Dream Chaser properly conducted',
      'Best-value trade-off decision within NASA discretion',
      'Minor procedural recommendations issued',
      'Protest denied on substantive grounds',
    ],
  },
  {
    id: 'northrop-crs2-cofc-2016',
    title: 'Orbital ATK v. NASA (CRS-2 Contract)',
    shortTitle: 'Orbital ATK v. NASA (CRS-2)',
    caseNumber: 'No. 16-291C',
    forum: 'cofc',
    outcome: 'denied',
    program: 'iss',
    protester: 'Orbital ATK (now Northrop Grumman)',
    awardee: 'Sierra Nevada / SpaceX',
    agency: 'NASA',
    contractValue: '$14 billion (estimated total)',
    yearFiled: 2016,
    yearDecided: 2016,
    decisionDate: '2016-04-25',
    description: 'Orbital ATK challenged aspects of NASA\'s CRS-2 commercial resupply services contract awards, arguing the evaluation process contained errors.',
    significance: 'Tested procurement procedures for ISS resupply contracts. Court upheld NASA\'s multi-award strategy and evaluation methodology.',
    keyFindings: [
      'NASA evaluation was rational and consistent',
      'Multi-award approach was reasonable',
      'Technical ratings properly supported',
      'Cost evaluation methodology upheld',
    ],
  },
  {
    id: 'orbital-gps3-gao-2017',
    title: 'Orbital ATK v. SpaceX (GPS III Launch Services)',
    shortTitle: 'Orbital ATK v. USAF (GPS III)',
    caseNumber: 'B-413208',
    forum: 'gao',
    outcome: 'denied',
    program: 'defense',
    protester: 'Orbital ATK',
    awardee: 'SpaceX',
    agency: 'U.S. Air Force',
    contractValue: '$96.5 million',
    yearFiled: 2017,
    yearDecided: 2017,
    decisionDate: '2017-05-01',
    description: 'Orbital ATK protested the Air Force\'s award of GPS III satellite launch contract to SpaceX\'s Falcon 9, arguing evaluation errors in the technical and cost analysis.',
    significance: 'Confirmed SpaceX competitiveness in national security GPS launches. Demonstrated growing acceptance of commercial launch vehicles for critical defense payloads.',
    keyFindings: [
      'Air Force evaluation was reasonable and documented',
      'SpaceX Falcon 9 met all technical requirements',
      'Cost evaluation properly conducted',
      'Best-value determination supported by record',
    ],
  },
  {
    id: 'bo-nssl-phase2-cofc-2020',
    title: 'Blue Origin v. United States (NSSL Phase 2)',
    shortTitle: 'Blue Origin v. DoD (NSSL)',
    caseNumber: 'No. 20-1112C',
    forum: 'cofc',
    outcome: 'denied',
    program: 'defense',
    protester: 'Blue Origin',
    awardee: 'ULA / SpaceX',
    agency: 'Department of Defense / Space Force',
    contractValue: '$5.3 billion (total Phase 2)',
    yearFiled: 2020,
    yearDecided: 2020,
    decisionDate: '2020-10-30',
    description: 'Blue Origin challenged the Space Force\'s NSSL Phase 2 Launch Service Procurement decision to award contracts to ULA (Vulcan Centaur) and SpaceX (Falcon 9/Heavy), excluding Blue Origin\'s New Glenn.',
    significance: 'Major national security space procurement decision. Affirmed Space Force discretion in two-provider strategy. Blue Origin subsequently became eligible for NSSL Phase 3.',
    keyFindings: [
      'Space Force two-provider strategy was reasonable',
      'Technical evaluation of New Glenn was proper',
      'Cost evaluation methodology upheld',
      'Selection decision consistent with solicitation criteria',
      'No improper discussions or competitive advantage found',
    ],
  },
  {
    id: 'lockheed-commercial-crew-gao-2014',
    title: 'Lockheed Martin Space Systems v. NASA (Commercial Crew)',
    shortTitle: 'Lockheed Martin v. NASA (CCDev)',
    caseNumber: 'B-408904',
    forum: 'gao',
    outcome: 'withdrawn',
    program: 'crewed',
    protester: 'Lockheed Martin Space Systems',
    awardee: 'Multiple',
    agency: 'NASA',
    contractValue: '$1.1 billion (CCDev Phase 2)',
    yearFiled: 2014,
    yearDecided: 2014,
    decisionDate: '2014-04-15',
    description: 'Lockheed Martin initially protested aspects of NASA\'s Commercial Crew Development (CCDev) program awards but withdrew the protest before GAO decision.',
    significance: 'Early indicator of competitive tensions in commercial crew program. Withdrawal suggested strategic calculation rather than procedural concerns.',
    keyFindings: [
      'Protest withdrawn before GAO decision',
      'No precedential findings issued',
      'Demonstrated early commercial crew procurement tensions',
    ],
  },
  {
    id: 'l3harris-sda-tracking-2023',
    title: 'L3Harris Technologies v. SDA (Tranche 2 Tracking Layer)',
    shortTitle: 'L3Harris v. SDA (Tracking)',
    caseNumber: 'B-421809',
    forum: 'gao',
    outcome: 'denied',
    program: 'defense',
    protester: 'L3Harris Technologies',
    awardee: 'Northrop Grumman / L3Harris (partial)',
    agency: 'Space Development Agency',
    contractValue: '$2.5 billion (estimated)',
    yearFiled: 2023,
    yearDecided: 2023,
    decisionDate: '2023-09-18',
    description: 'L3Harris challenged aspects of SDA\'s Tranche 2 Tracking Layer satellite procurement, arguing evaluation errors in the technical scoring of competing proposals.',
    significance: 'Tests SDA\'s rapid acquisition approach for proliferated LEO defense constellation. SDA\'s streamlined procurement model aims to deploy faster than traditional DoD programs.',
    keyFindings: [
      'SDA evaluation methodology upheld',
      'Technical scoring rationale was reasonable',
      'Rapid acquisition procedures properly followed',
      'Cost realism analysis was adequate',
    ],
  },
  {
    id: 'raytheon-opir-gao-2023',
    title: 'Raytheon Technologies v. Space Force (Next-Gen OPIR)',
    shortTitle: 'Raytheon v. USSF (OPIR)',
    caseNumber: 'B-421456',
    forum: 'gao',
    outcome: 'denied',
    program: 'defense',
    protester: 'Raytheon Technologies',
    awardee: 'Lockheed Martin / Northrop Grumman',
    agency: 'U.S. Space Force',
    contractValue: '$4.9 billion (estimated)',
    yearFiled: 2023,
    yearDecided: 2023,
    decisionDate: '2023-06-12',
    description: 'Raytheon protested aspects of the Next-Generation Overhead Persistent Infrared (Next-Gen OPIR) missile warning satellite procurement awards.',
    significance: 'Critical missile warning satellite program replacing SBIRS. Procurement decisions affect the architecture of US nuclear early warning capabilities.',
    keyFindings: [
      'Space Force evaluation was rational',
      'Technical approach scoring was reasonable',
      'Past performance evaluation properly conducted',
      'Selection decision supported by evaluation record',
    ],
  },
  {
    id: 'spacex-nasa-crew7-gao-2022',
    title: 'SpaceX v. NASA (Crew-7 Mission Award Methodology)',
    shortTitle: 'SpaceX v. NASA (Crew Rotation)',
    caseNumber: 'B-420912',
    forum: 'gao',
    outcome: 'dismissed',
    program: 'crewed',
    protester: 'Space Exploration Technologies Corp.',
    awardee: 'Boeing',
    agency: 'NASA',
    contractValue: '$4.2 billion (Boeing CCtCap total)',
    yearFiled: 2022,
    yearDecided: 2022,
    decisionDate: '2022-08-15',
    description: 'SpaceX raised concerns about NASA\'s approach to maintaining Boeing Starliner in the crew rotation despite repeated delays, questioning whether continued funding met competition requirements.',
    significance: 'Highlighted tensions in NASA dual-provider commercial crew strategy when one provider faces repeated technical setbacks.',
    keyFindings: [
      'Protest dismissed on procedural grounds',
      'GAO declined to review ongoing contract management decisions',
      'NASA dual-provider strategy remains policy decision',
    ],
  },
  {
    id: 'firefly-tacticalspace-gao-2024',
    title: 'Firefly Aerospace v. USSF (Tactically Responsive Space)',
    shortTitle: 'Firefly v. USSF (TacRS)',
    caseNumber: 'B-422301',
    forum: 'gao',
    outcome: 'corrective_action',
    program: 'defense',
    protester: 'Firefly Aerospace',
    awardee: 'Rocket Lab',
    agency: 'U.S. Space Force',
    contractValue: '$87.5 million',
    yearFiled: 2024,
    yearDecided: 2024,
    decisionDate: '2024-03-22',
    description: 'Firefly Aerospace protested Space Force tactically responsive space launch contract award to Rocket Lab, alleging errors in technical evaluation of responsive launch capabilities.',
    significance: 'Tests evaluation criteria for emerging responsive space launch category. Growing importance of small/medium launch for rapid military constellation reconstitution.',
    keyFindings: [
      'GAO recommended corrective action on specific evaluation aspects',
      'Technical evaluation of responsive launch capabilities needed clarification',
      'Space Force agreed to re-evaluate specific technical factors',
      'Award ultimately modified after re-evaluation',
    ],
  },
  {
    id: 'aerojet-raptor-gao-2024',
    title: 'Aerojet Rocketdyne v. Space Force (Upper Stage Engine)',
    shortTitle: 'Aerojet v. USSF (Engine)',
    caseNumber: 'B-422578',
    forum: 'gao',
    outcome: 'denied',
    program: 'defense',
    protester: 'Aerojet Rocketdyne (L3Harris)',
    awardee: 'Blue Origin (BE-3U)',
    agency: 'U.S. Space Force',
    contractValue: '$320 million (estimated)',
    yearFiled: 2024,
    yearDecided: 2024,
    decisionDate: '2024-06-28',
    description: 'Aerojet Rocketdyne protested Space Force upper stage engine procurement decision, challenging technical evaluation and past performance assessment.',
    significance: 'Reflects consolidation in rocket engine industrial base and competition between traditional and new space propulsion providers.',
    keyFindings: [
      'Space Force technical evaluation was reasonable',
      'Past performance assessment properly conducted',
      'Cost evaluation methodology upheld',
      'Selection was consistent with stated evaluation criteria',
    ],
  },
  {
    id: 'viasat-starlink-fcc-2023',
    title: 'Viasat Inc. v. FCC / SpaceX (Starlink Gen2 Environmental Review)',
    shortTitle: 'Viasat v. FCC (Starlink)',
    caseNumber: 'No. 22-1337',
    forum: 'dc_circuit',
    outcome: 'denied',
    program: 'satellite',
    protester: 'Viasat, Inc.',
    awardee: 'SpaceX',
    agency: 'FCC',
    contractValue: 'N/A (licensing matter)',
    yearFiled: 2022,
    yearDecided: 2023,
    decisionDate: '2023-08-09',
    description: 'Viasat challenged FCC\'s approval of SpaceX Starlink Gen2 constellation in the D.C. Circuit, arguing FCC failed to conduct adequate NEPA environmental review of orbital debris and light pollution impacts.',
    significance: 'Tests whether FCC must conduct environmental review for satellite mega-constellation licensing. D.C. Circuit held FCC acted within its authority. Major precedent for future constellation approvals.',
    keyFindings: [
      'FCC is not required to conduct NEPA review for satellite licenses',
      'FCC categorical exclusion from NEPA upheld',
      'Orbital debris analysis in licensing was adequate',
      'Light pollution concerns did not require EIS',
      'FCC authority to manage spectrum and orbital resources affirmed',
    ],
  },
];

// ============================================================================
// LEGAL PROCEEDINGS DATA - FCC/FAA/DOJ Enforcement Actions
// ============================================================================

export type LegalProceedingType = 'fcc_enforcement' | 'faa_enforcement' | 'doj_criminal' | 'doj_civil' | 'itu_dispute' | 'patent_litigation' | 'nepa_challenge' | 'export_control';
export type LegalProceedingStatus = 'active' | 'resolved' | 'pending' | 'advisory';

export interface SpaceLegalProceeding {
  id: string;
  title: string;
  type: LegalProceedingType;
  parties: string;
  status: LegalProceedingStatus;
  year: number;
  jurisdiction: string;
  description: string;
  significance: string;
  outcome: string;
}

export const SPACE_LEGAL_PROCEEDINGS: SpaceLegalProceeding[] = [
  {
    id: 'swarm-fcc-unauthorized-launch',
    title: 'FCC v. Swarm Technologies - Unauthorized Satellite Launch',
    type: 'fcc_enforcement',
    parties: 'FCC Enforcement Bureau v. Swarm Technologies, Inc.',
    status: 'resolved',
    year: 2018,
    jurisdiction: 'FCC',
    description: 'Swarm Technologies launched four SpaceBEE satellites in January 2018 despite FCC denial of their license application, citing trackability concerns. FCC reached $900,000 consent decree.',
    significance: 'First FCC enforcement action for unauthorized satellite launch. Established FCC authority over pre-launch authorization and satellite trackability standards.',
    outcome: '$900,000 consent decree. Enhanced compliance plan required. Swarm subsequently obtained proper licenses and was acquired by SpaceX in 2021.',
  },
  {
    id: 'dish-orbital-debris-fine',
    title: 'FCC v. DISH Network - First Orbital Debris Fine',
    type: 'fcc_enforcement',
    parties: 'FCC Enforcement Bureau v. DISH Network LLC',
    status: 'resolved',
    year: 2023,
    jurisdiction: 'FCC',
    description: 'DISH Network fined $150,000 for failing to properly deorbit EchoStar-7 satellite to the required graveyard orbit, retiring it 178 km short of the required altitude.',
    significance: 'First-ever FCC enforcement action specifically for orbital debris mitigation plan violation. Signals aggressive enforcement posture as 5-year deorbit rule takes effect.',
    outcome: '$150,000 civil penalty. Compliance plan required. Precedent-setting for future debris enforcement.',
  },
  {
    id: 'loral-hughes-china-tech-transfer',
    title: 'DOJ/DOS v. Loral/Hughes - China Technology Transfer',
    type: 'export_control',
    parties: 'United States v. Loral Space & Communications / Hughes Electronics',
    status: 'resolved',
    year: 2002,
    jurisdiction: 'Department of State / DOJ',
    description: 'Loral and Hughes settled charges of providing technical assistance to China regarding Long March launch vehicle failures without proper ITAR licenses. Total settlements exceeded $60 million.',
    significance: 'Led to transfer of commercial satellite export jurisdiction from Commerce to State Department (USML). Shaped the modern ITAR/EAR framework for space technology.',
    outcome: '$14M (Loral) + $32M (Hughes) in civil penalties. Led to statutory changes in satellite export control jurisdiction.',
  },
  {
    id: 'aeroflex-rad-hard-export',
    title: 'BIS/DDTC v. Aeroflex - Rad-Hard Electronics Export',
    type: 'export_control',
    parties: 'U.S. Department of Commerce / State v. Aeroflex Incorporated',
    status: 'resolved',
    year: 2020,
    jurisdiction: 'BIS / DDTC',
    description: 'Aeroflex settled for $57 million for exporting radiation-hardened microelectronics to China without required licenses. Components had applications in satellites and missiles.',
    significance: 'One of largest export control settlements. Highlights sensitivity of rad-hard components and coordinated BIS/DDTC enforcement approach.',
    outcome: '$57 million combined settlement. Suspended denial of export privileges. Enhanced compliance required.',
  },
  {
    id: 'faa-spacex-starship-ift1',
    title: 'FAA Investigation - SpaceX Starship IFT-1 Anomaly',
    type: 'faa_enforcement',
    parties: 'FAA Office of Commercial Space Transportation v. SpaceX',
    status: 'resolved',
    year: 2023,
    jurisdiction: 'FAA',
    description: 'FAA conducted mishap investigation after SpaceX Starship IFT-1 flight test anomaly on April 20, 2023. Vehicle broke apart during ascent. FAA required corrective actions before subsequent flights.',
    significance: 'Tested FAA\'s regulatory approach to developmental flight test failures. Demonstrated balance between safety oversight and enabling iterative testing approach.',
    outcome: 'FAA identified corrective actions. SpaceX implemented 63 corrective measures. License modified for IFT-2 after 7-month investigation.',
  },
  {
    id: 'virgin-orbit-faa-uk-launch',
    title: 'FAA/CAA - Virgin Orbit UK Launch Investigation',
    type: 'faa_enforcement',
    parties: 'FAA / UK Civil Aviation Authority Investigation of Virgin Orbit',
    status: 'resolved',
    year: 2023,
    jurisdiction: 'FAA / UK CAA',
    description: 'Joint investigation of Virgin Orbit LauncherOne failure during the first orbital launch attempt from UK soil (Spaceport Cornwall, January 9, 2023). Vehicle anomaly resulted in loss of mission.',
    significance: 'First orbital launch attempt from UK territory. Investigation highlighted challenges of international launch regulation coordination. Virgin Orbit subsequently filed for bankruptcy.',
    outcome: 'Investigation identified fuel filter anomaly as root cause. Regulatory findings informed UK space licensing procedures. Company ceased operations.',
  },
  {
    id: 'itu-oneweb-intelsat-coordination',
    title: 'ITU Coordination Dispute - OneWeb v. Intelsat (Ku-band)',
    type: 'itu_dispute',
    parties: 'OneWeb / UK Administration v. Intelsat / Multiple Administrations',
    status: 'resolved',
    year: 2021,
    jurisdiction: 'ITU Radiocommunication Bureau',
    description: 'Complex ITU coordination dispute between OneWeb NGSO constellation and Intelsat GSO fleet regarding Ku-band spectrum sharing and interference protection.',
    significance: 'Tested ITU coordination procedures for mega-constellation vs. incumbent GSO operators. Outcome influenced FCC and ITU approaches to NGSO-GSO spectrum sharing.',
    outcome: 'Coordination agreement reached after extensive technical negotiations. Established power flux density limits and operational constraints for coexistence.',
  },
  {
    id: 'nepa-spacex-starship-boca-chica',
    title: 'Save RGV v. FAA - Starbase Environmental Challenge',
    type: 'nepa_challenge',
    parties: 'Save RGV / Environmental Groups v. Federal Aviation Administration',
    status: 'resolved',
    year: 2022,
    jurisdiction: 'U.S. District Court, District of Columbia',
    description: 'Environmental groups challenged FAA\'s Programmatic Environmental Assessment for SpaceX Starship operations at Boca Chica, arguing a full EIS was required for the unprecedented scale of operations.',
    significance: 'Set precedent for NEPA environmental review of commercial spaceport operations. FAA imposed 75+ mitigation conditions as alternative to full EIS.',
    outcome: 'Mitigated FONSI upheld with enhanced conditions. Over 75 environmental mitigation measures required. Monitoring programs established.',
  },
  {
    id: 'viasat-fcc-starlink-gen2',
    title: 'Viasat v. FCC - Starlink Gen2 NEPA Challenge',
    type: 'nepa_challenge',
    parties: 'Viasat, Inc. v. FCC / SpaceX (Intervenor)',
    status: 'resolved',
    year: 2023,
    jurisdiction: 'U.S. Court of Appeals, D.C. Circuit',
    description: 'Viasat challenged FCC approval of SpaceX Starlink Gen2 7,500-satellite constellation, arguing FCC must conduct NEPA environmental review for potential orbital debris and light pollution impacts.',
    significance: 'Landmark ruling that FCC is not required to conduct NEPA review for satellite constellation licensing. Major precedent for all future mega-constellation approvals.',
    outcome: 'D.C. Circuit denied Viasat petition. FCC categorical exclusion from NEPA upheld. FCC authority to manage orbital resources affirmed.',
  },
  {
    id: 'boeing-starliner-patent-crosslicense',
    title: 'Boeing v. SpaceX - Crew Capsule Patent Cross-License',
    type: 'patent_litigation',
    parties: 'The Boeing Company v. Space Exploration Technologies Corp.',
    status: 'resolved',
    year: 2019,
    jurisdiction: 'U.S. District Court, Central District of California',
    description: 'Boeing alleged SpaceX Crew Dragon infringed patents related to thermal protection and landing systems. Settled with reported cross-licensing agreement.',
    significance: 'Illustrates growing patent tensions in commercial space. Settlement suggests industry preference for licensing over protracted litigation in government-critical programs.',
    outcome: 'Confidential settlement with reported cross-licensing agreement. Both companies continued Commercial Crew operations.',
  },
  {
    id: 'doj-nusil-export-silicon',
    title: 'DOJ v. NuSil Technology - Silicone Export Violations',
    type: 'export_control',
    parties: 'United States v. NuSil Technology LLC',
    status: 'resolved',
    year: 2021,
    jurisdiction: 'Department of Justice',
    description: 'NuSil Technology settled charges of exporting controlled silicone materials used in satellite and missile systems to foreign destinations without required BIS licenses.',
    significance: 'Demonstrates enforcement extending beyond major primes to specialized material suppliers. Space-grade silicones are controlled due to dual-use in missile systems.',
    outcome: '$4.6 million settlement. Enhanced compliance program. Highlights supply chain-level export control obligations.',
  },
  {
    id: 'fcc-stec-spectrum-squatting',
    title: 'FCC v. STEC/Spectrum Five - Spectrum Warehousing',
    type: 'fcc_enforcement',
    parties: 'FCC International Bureau v. Spectrum Five LLC',
    status: 'resolved',
    year: 2019,
    jurisdiction: 'FCC',
    description: 'FCC revoked orbital slot and spectrum authorization from Spectrum Five after finding the company failed to meet construction milestones and was effectively warehousing valuable orbital spectrum.',
    significance: 'Reinforced FCC\'s milestone enforcement for GSO orbital slots. Sent signal that spectrum and orbital rights cannot be held indefinitely without deployment.',
    outcome: 'License revoked. Orbital slot returned to availability. Established precedent for milestone enforcement in GSO licensing.',
  },
  {
    id: 'epa-rocket-propellant-contamination',
    title: 'EPA v. Aerojet Rocketdyne - Perchlorate Contamination',
    type: 'nepa_challenge',
    parties: 'EPA / California DTSC v. Aerojet Rocketdyne Holdings',
    status: 'active',
    year: 2020,
    jurisdiction: 'EPA / California State',
    description: 'Ongoing environmental remediation proceedings related to perchlorate and TCE contamination from decades of rocket propellant testing at Aerojet\'s Sacramento facility. Cleanup costs estimated over $1 billion.',
    significance: 'Demonstrates long-term environmental liability from rocket testing operations. Largest Superfund site in California. Affects ongoing L3Harris/Aerojet operations.',
    outcome: 'Ongoing cleanup under Superfund. $1+ billion estimated remediation. Consent decree requires decades of monitoring and treatment.',
  },
  {
    id: 'planet-labs-ddtc-disclosure',
    title: 'DDTC v. Planet Labs - ITAR Voluntary Disclosure',
    type: 'export_control',
    parties: 'U.S. Department of State / DDTC v. Planet Labs PBC',
    status: 'resolved',
    year: 2023,
    jurisdiction: 'DDTC',
    description: 'Planet Labs voluntarily disclosed ITAR violations related to sharing satellite technical data with foreign nationals without required licenses during rapid company growth.',
    significance: 'Highlights export control compliance challenges for fast-growing NewSpace companies. Demonstrates value of voluntary self-disclosure program.',
    outcome: '$2.8 million civil penalty with portion suspended. External compliance auditor required for three years.',
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
    totalBidProtests: SPACE_BID_PROTESTS.length,
    bidProtestsByOutcome: {
      denied: SPACE_BID_PROTESTS.filter(p => p.outcome === 'denied').length,
      sustained: SPACE_BID_PROTESTS.filter(p => p.outcome === 'sustained').length,
      settled: SPACE_BID_PROTESTS.filter(p => p.outcome === 'settled').length,
      corrective_action: SPACE_BID_PROTESTS.filter(p => p.outcome === 'corrective_action').length,
      dismissed: SPACE_BID_PROTESTS.filter(p => p.outcome === 'dismissed').length,
      withdrawn: SPACE_BID_PROTESTS.filter(p => p.outcome === 'withdrawn').length,
    },
    totalLegalProceedings: SPACE_LEGAL_PROCEEDINGS.length,
    legalProceedingsByType: {
      fcc_enforcement: SPACE_LEGAL_PROCEEDINGS.filter(p => p.type === 'fcc_enforcement').length,
      faa_enforcement: SPACE_LEGAL_PROCEEDINGS.filter(p => p.type === 'faa_enforcement').length,
      export_control: SPACE_LEGAL_PROCEEDINGS.filter(p => p.type === 'export_control').length,
      nepa_challenge: SPACE_LEGAL_PROCEEDINGS.filter(p => p.type === 'nepa_challenge').length,
      patent_litigation: SPACE_LEGAL_PROCEEDINGS.filter(p => p.type === 'patent_litigation').length,
      itu_dispute: SPACE_LEGAL_PROCEEDINGS.filter(p => p.type === 'itu_dispute').length,
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
  bidProtests: SPACE_BID_PROTESTS,
  legalProceedings: SPACE_LEGAL_PROCEEDINGS,
};
