/**
 * US Space Regulatory Agencies Data
 * Comprehensive seed data for regulatory database
 *
 * Sources:
 * - FAA Office of Commercial Space Transportation: https://www.faa.gov/space
 * - FCC Space Bureau: https://www.fcc.gov/space
 * - NOAA Office of Space Commerce: https://space.commerce.gov
 * - UN Office for Outer Space Affairs: https://www.unoosa.org
 * - ITU Radiocommunication Bureau: https://www.itu.int/en/ITU-R
 */

// ============================================================================
// TYPES
// ============================================================================

export type RegulatoryAgency = 'FAA_AST' | 'FCC' | 'NOAA_CRSRA' | 'NOAA_OSC' | 'ITU';

export type LicenseStatus = 'active' | 'pending' | 'expired' | 'suspended' | 'denied';

export type ApplicationStatus =
  | 'pre_application'
  | 'submitted'
  | 'under_review'
  | 'additional_info_requested'
  | 'approved'
  | 'denied'
  | 'withdrawn';

export interface RegulatoryAgencyInfo {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  parentAgency: string;
  jurisdiction: string;
  website: string;
  contactEmail?: string;
  description: string;
  keyStatutes: string[];
  keyRegulations: string[];
  updatedAt: string;
}

export interface LicenseType {
  id: string;
  slug: string;
  agencyId: string;
  name: string;
  description: string;
  regulatoryBasis: string;
  applicableTo: string[];
  estimatedProcessingDays: { min: number; max: number };
  estimatedCostUSD: { min: number; max: number } | null;
  validityPeriodYears: number | null;
  isRenewable: boolean;
  keyRequirements: string[];
  applicationUrl?: string;
  guidanceDocuments: string[];
  recentChanges?: string[];
  effectiveDate?: string;
  notes?: string;
}

export interface InternationalTreaty {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  adoptedDate: string;
  entryIntoForceDate: string;
  depositaryOrganization: string;
  numberOfParties: number;
  keyProvisions: string[];
  commercialSpaceImplications: string[];
  usImplementation: string;
  sourceUrl: string;
}

export interface RecentRuleChange {
  id: string;
  slug: string;
  agencyId: string;
  title: string;
  summary: string;
  effectiveDate: string;
  federalRegisterCitation?: string;
  impactAreas: string[];
  keyChanges: string[];
  sourceUrl: string;
  status: 'proposed' | 'final' | 'effective' | 'pending';
}

export interface SpectrumAllocation {
  id: string;
  slug: string;
  bandName: string;
  frequencyRange: string;
  allocation: string;
  primaryServices: string[];
  secondaryServices?: string[];
  notes: string;
  licensingRequirements: string;
}

// ============================================================================
// REGULATORY AGENCIES
// ============================================================================

export const REGULATORY_AGENCIES: RegulatoryAgencyInfo[] = [
  {
    id: 'faa-ast',
    slug: 'faa-ast',
    name: 'FAA AST',
    fullName: 'FAA Office of Commercial Space Transportation',
    parentAgency: 'Department of Transportation',
    jurisdiction: 'Launch, reentry, and launch/reentry site operations',
    website: 'https://www.faa.gov/space',
    contactEmail: 'ASTPreApp@faa.gov',
    description: 'The FAA Office of Commercial Space Transportation (AST) licenses and regulates U.S. commercial space launch and reentry activity, as well as the operation of launch and reentry sites.',
    keyStatutes: [
      '51 U.S.C. Chapter 509 - Commercial Space Launch Activities',
      'Commercial Space Launch Amendments Act of 2004 (CSLAA)',
      'Commercial Space Launch Competitiveness Act of 2015',
    ],
    keyRegulations: [
      '14 CFR Part 413 - License Application Procedures',
      '14 CFR Part 414 - Safety Approvals',
      '14 CFR Part 420 - License to Operate a Launch Site',
      '14 CFR Part 437 - Experimental Permits',
      '14 CFR Part 440 - Financial Responsibility',
      '14 CFR Part 450 - Launch and Reentry License Requirements',
    ],
    updatedAt: '2025-01-22',
  },
  {
    id: 'fcc-space',
    slug: 'fcc-space',
    name: 'FCC Space Bureau',
    fullName: 'Federal Communications Commission Space Bureau',
    parentAgency: 'Federal Communications Commission',
    jurisdiction: 'Satellite communications, spectrum allocation, orbital debris mitigation',
    website: 'https://www.fcc.gov/space',
    description: 'The FCC Space Bureau regulates satellite communications in the United States, including licensing of space stations and earth stations, spectrum allocation, and orbital debris mitigation requirements.',
    keyStatutes: [
      'Communications Act of 1934',
      'Telecommunications Act of 1996',
    ],
    keyRegulations: [
      '47 CFR Part 25 - Satellite Communications',
      '47 CFR Part 5 - Experimental Radio Service',
      '47 CFR Part 97 - Amateur Radio Service',
    ],
    updatedAt: '2025-01-22',
  },
  {
    id: 'noaa-crsra',
    slug: 'noaa-crsra',
    name: 'NOAA CRSRA',
    fullName: 'NOAA Commercial Remote Sensing Regulatory Affairs',
    parentAgency: 'Department of Commerce / NOAA',
    jurisdiction: 'Private remote sensing space systems',
    website: 'https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/',
    contactEmail: 'CRSRA@noaa.gov',
    description: 'CRSRA licenses and regulates private operators of remote sensing space systems under the Land Remote Sensing Policy Act of 1992.',
    keyStatutes: [
      'Land Remote Sensing Policy Act of 1992 (51 U.S.C. Chapter 601)',
      'U.S. Commercial Space Launch Competitiveness Act of 2015',
    ],
    keyRegulations: [
      '15 CFR Part 960 - Licensing of Private Remote Sensing Space Systems',
    ],
    updatedAt: '2025-01-22',
  },
  {
    id: 'noaa-osc',
    slug: 'noaa-osc',
    name: 'NOAA OSC',
    fullName: 'NOAA Office of Space Commerce',
    parentAgency: 'Department of Commerce / NOAA',
    jurisdiction: 'Space situational awareness, traffic coordination',
    website: 'https://space.commerce.gov',
    description: 'The Office of Space Commerce leads U.S. civil space situational awareness activities and is developing the Traffic Coordination System for Space (TraCSS) to provide spaceflight safety services.',
    keyStatutes: [
      'Space Policy Directive-3 (2018)',
      '51 U.S.C. Chapter 507 - Office of Space Commerce',
    ],
    keyRegulations: [],
    updatedAt: '2025-01-22',
  },
  {
    id: 'itu',
    slug: 'itu',
    name: 'ITU',
    fullName: 'International Telecommunication Union',
    parentAgency: 'United Nations',
    jurisdiction: 'International spectrum coordination, satellite network filings',
    website: 'https://www.itu.int/en/ITU-R',
    description: 'The ITU Radiocommunication Bureau manages international spectrum allocation and satellite network coordination through the Radio Regulations treaty.',
    keyStatutes: [
      'ITU Constitution and Convention',
      'ITU Radio Regulations',
    ],
    keyRegulations: [
      'ITU Radio Regulations Articles 9, 11, and 21',
      'Appendix 4 - Information Requirements for Satellite Filings',
      'Appendix 30/30A/30B - Satellite Broadcasting and FSS Plans',
    ],
    updatedAt: '2025-01-22',
  },
];

// ============================================================================
// FAA LICENSE TYPES
// ============================================================================

export const FAA_LICENSE_TYPES: LicenseType[] = [
  {
    id: 'faa-vehicle-operator-license',
    slug: 'vehicle-operator-license',
    agencyId: 'faa-ast',
    name: 'Vehicle Operator License',
    description: 'Authorizes a licensee to conduct one or more launches or reentries using the same vehicle or family of vehicles. Replaced legacy Part 415, 417, 431, and 435 licenses under the new Part 450 framework.',
    regulatoryBasis: '14 CFR Part 450',
    applicableTo: ['Launch vehicles', 'Reentry vehicles', 'Commercial spacecraft'],
    estimatedProcessingDays: { min: 114, max: 180 },
    estimatedCostUSD: null,
    validityPeriodYears: 5,
    isRenewable: true,
    keyRequirements: [
      'Pre-application consultation with FAA AST',
      'Flight safety analysis demonstrating acceptable risk to public',
      'Ground safety analysis and emergency response plans',
      'Environmental review (NEPA compliance)',
      'Financial responsibility/insurance demonstration',
      'Maximum Probable Loss (MPL) determination',
      'Operations and software safety assessments',
    ],
    applicationUrl: 'https://www.faa.gov/space/licenses/operator_licenses_permits',
    guidanceDocuments: [
      'AC 450.101-1 - Flight Safety Analysis',
      'AC 450.131-1 - Collision Avoidance Analysis',
      'AC 450.161-1 - Ground Safety Analysis',
    ],
    recentChanges: [
      'All legacy licenses must transition to Part 450 by March 10, 2026',
      'Performance-based regulations replace prescriptive requirements',
      'New Glenn received Part 450 license in 114 days (January 2025)',
    ],
    effectiveDate: '2021-03-10',
    notes: 'As of August 2025, FAA reached its 1,000th licensed commercial space operation. Processing times improving with Part 450 experience.',
  },
  {
    id: 'faa-experimental-permit',
    slug: 'experimental-permit',
    agencyId: 'faa-ast',
    name: 'Experimental Permit',
    description: 'Optional authorization for developmental reusable suborbital rockets or reusable launch vehicles for limited purposes including R&D, compliance demonstration, and crew training.',
    regulatoryBasis: '14 CFR Part 437',
    applicableTo: ['Reusable suborbital rockets', 'Reusable launch vehicles (developmental)'],
    estimatedProcessingDays: { min: 120, max: 150 },
    estimatedCostUSD: null,
    validityPeriodYears: 1,
    isRenewable: false,
    keyRequirements: [
      'Vehicle must be reusable suborbital rocket or reusable launch vehicle',
      'Limited to R&D, compliance demonstration, or crew training purposes',
      'No carrying property or human beings for compensation',
      'Real-time position and velocity measurement capability',
      'Communication with Air Traffic Control during all flight phases',
      'Financial responsibility demonstration',
      'Vehicle must be available for FAA inspection before permit issuance',
    ],
    applicationUrl: 'https://www.faa.gov/space/licenses/experimental-permits-reusable-suborbital-rockets',
    guidanceDocuments: [
      'Experimental Permit Program (PDF)',
      'Sample Experimental Permit Application (PDF)',
      'Calculation of Safety Clear Zones for Experimental Permits',
    ],
    notes: 'Permits authorize unlimited launches/reentries from a specified site for one year. Not eligible for government indemnification.',
  },
  {
    id: 'faa-launch-site-operator-license',
    slug: 'launch-site-operator-license',
    agencyId: 'faa-ast',
    name: 'Launch Site Operator License (Spaceport License)',
    description: 'Authorizes operation of a launch or reentry site (spaceport) to host vehicle activities that are separately licensed or permitted.',
    regulatoryBasis: '14 CFR Part 420',
    applicableTo: ['Spaceports', 'Launch sites', 'Reentry sites'],
    estimatedProcessingDays: { min: 180, max: 365 },
    estimatedCostUSD: null,
    validityPeriodYears: 5,
    isRenewable: true,
    keyRequirements: [
      'Environmental Assessment or Environmental Impact Statement (NEPA)',
      'Explosive site plan compliance (Parts 420.63-420.69)',
      'Safety area and flight corridor analysis',
      'Coordination with local authorities and emergency services',
      'Demonstration of equivalent level of safety',
    ],
    applicationUrl: 'https://www.faa.gov/space/licenses/spaceport_license',
    guidanceDocuments: [
      'Launch Site Operator License Application Checklist',
    ],
    notes: 'Currently 14 FAA-licensed spaceports in the US (9 horizontal, 4 vertical, 1 both). One licensed reentry site.',
  },
  {
    id: 'faa-safety-element-approval',
    slug: 'safety-element-approval',
    agencyId: 'faa-ast',
    name: 'Safety Element Approval',
    description: 'FAA determination that a launch/reentry vehicle, safety system, process, service, or qualified personnel will not jeopardize public health and safety when used within defined parameters.',
    regulatoryBasis: '14 CFR Part 414',
    applicableTo: ['Launch vehicles', 'Reentry vehicles', 'Safety systems', 'Processes', 'Services', 'Personnel'],
    estimatedProcessingDays: { min: 90, max: 180 },
    estimatedCostUSD: null,
    validityPeriodYears: null,
    isRenewable: false,
    keyRequirements: [
      'Demonstration that element meets safety standards',
      'Definition of approved scope and envelope',
      'May be submitted concurrently with vehicle operator license',
    ],
    applicationUrl: 'https://www.faa.gov/space/licenses/safety_approvals',
    guidanceDocuments: [
      'Safety Approval: Guide for Applicants',
    ],
    notes: 'Once approved, element can be used in future license applications without re-examination within approved scope.',
  },
];

// ============================================================================
// FCC LICENSE TYPES
// ============================================================================

export const FCC_LICENSE_TYPES: LicenseType[] = [
  {
    id: 'fcc-gso-space-station',
    slug: 'gso-space-station-license',
    agencyId: 'fcc-space',
    name: 'GSO Space Station License',
    description: 'License to operate a geostationary orbit (GSO) satellite for commercial communications services.',
    regulatoryBasis: '47 CFR Part 25',
    applicableTo: ['Geostationary communications satellites'],
    estimatedProcessingDays: { min: 180, max: 270 },
    estimatedCostUSD: { min: 471575, max: 471575 },
    validityPeriodYears: 15,
    isRenewable: true,
    keyRequirements: [
      'Technical showing of non-interference with existing systems',
      'Orbital debris mitigation plan (5-year post-mission disposal)',
      'ITU coordination filings through FCC',
      'Bond requirement (proposed to be eliminated under Part 100)',
      'Milestone requirements for system deployment',
      'Demonstrated legal, technical, and financial qualifications',
    ],
    applicationUrl: 'https://www.fcc.gov/space/space-stations',
    guidanceDocuments: [
      'Part 25 Space Station License Checklist',
      'FAQ: Processing of Space Station Applications',
    ],
    recentChanges: [
      'Space Modernization NPRM proposes eliminating GSO surety bond requirement',
      'FY 2024 regulatory fee: $117,580 per operational GSO space station',
    ],
    notes: 'Applications processed on first-come/first-served basis. Processing may take longer with waiver requests or shared federal bands.',
  },
  {
    id: 'fcc-ngso-space-station',
    slug: 'ngso-space-station-license',
    agencyId: 'fcc-space',
    name: 'NGSO Space Station License',
    description: 'License to operate non-geostationary orbit (NGSO) satellite systems, including LEO and MEO constellations.',
    regulatoryBasis: '47 CFR Part 25',
    applicableTo: ['NGSO satellite constellations', 'LEO satellites', 'MEO satellites'],
    estimatedProcessingDays: { min: 180, max: 365 },
    estimatedCostUSD: { min: 471575, max: 471575 },
    validityPeriodYears: 15,
    isRenewable: true,
    keyRequirements: [
      'Technical analysis for spectrum sharing with GSO systems',
      'Orbital debris mitigation plan (5-year post-mission disposal for LEO)',
      'ITU coordination filings',
      'Surety bond for larger constellations (200+ satellites)',
      'Milestone requirements for constellation deployment',
      'Collision avoidance capabilities',
    ],
    applicationUrl: 'https://www.fcc.gov/space/space-stations',
    guidanceDocuments: [
      'Part 25 Space Station License Checklist',
    ],
    recentChanges: [
      'FY 2025: New NGSO-Small and NGSO-Large constellation fee categories',
      'FY 2024 regulatory fees: $130,405 (Less Complex) or $347,755 (Other) per system',
      'Systems with 200+ satellites subject to processing round procedures',
    ],
    notes: 'Processing round procedures apply to larger constellations in shared bands.',
  },
  {
    id: 'fcc-small-satellite',
    slug: 'small-satellite-license',
    agencyId: 'fcc-space',
    name: 'Small Satellite License (Streamlined)',
    description: 'Streamlined licensing process for small satellites meeting specific criteria, with reduced fees and shorter processing times.',
    regulatoryBasis: '47 CFR Part 25 (Streamlined Small Satellite Process)',
    applicableTo: ['Small satellites', 'CubeSats', 'Small spacecraft'],
    estimatedProcessingDays: { min: 180, max: 270 },
    estimatedCostUSD: { min: 30000, max: 30000 },
    validityPeriodYears: 6,
    isRenewable: false,
    keyRequirements: [
      'Maximum 10 satellites per license',
      'Maximum 6-year in-orbit lifetime per satellite',
      'Maximum 180 kg mass per satellite (including propellant)',
      'Deployment below 600 km OR propulsion capability for collision avoidance',
      'Minimum 10 cm dimension (for trackability)',
      'Unique telemetry marker per satellite',
      'Orbital debris mitigation compliance',
    ],
    applicationUrl: 'https://www.fcc.gov/space/small-satellite-and-small-spacecraft-licensing-process',
    guidanceDocuments: [
      'Small Satellite Licensing Process Overview',
    ],
    recentChanges: [
      'One-year grace period from surety bond requirement',
      'Exempt from processing round procedures',
      'FY 2025 regulatory fee: approximately $12,330 per license',
    ],
    notes: 'Created in 2019 to facilitate growth of small satellite industry. Significantly lower application fee ($30,000 vs $471,575).',
  },
  {
    id: 'fcc-earth-station',
    slug: 'earth-station-license',
    agencyId: 'fcc-space',
    name: 'Earth Station License',
    description: 'License to operate ground-based earth stations for satellite communications.',
    regulatoryBasis: '47 CFR Part 25',
    applicableTo: ['Fixed earth stations', 'Gateway stations', 'User terminals'],
    estimatedProcessingDays: { min: 60, max: 180 },
    estimatedCostUSD: null,
    validityPeriodYears: 15,
    isRenewable: true,
    keyRequirements: [
      'Frequency coordination analysis (for bands shared with terrestrial services)',
      'Technical specifications of antenna and transmission parameters',
      'Identification of satellite(s) to be accessed',
      'Coordination with existing earth stations if required',
    ],
    applicationUrl: 'https://www.fcc.gov/space/overview-earth-station-licensing-and-license-contents',
    guidanceDocuments: [
      'Earth Station Licensing Overview',
    ],
    recentChanges: [
      'Space Modernization NPRM proposes nationwide blanket licensing option',
      'Proposed new "Immovable" earth station class',
      'Expedited 7-day processing for applications meeting criteria',
    ],
  },
  {
    id: 'fcc-market-access',
    slug: 'market-access-grant',
    agencyId: 'fcc-space',
    name: 'Market Access Grant',
    description: 'Authorization for non-U.S. licensed satellite operators to provide services to U.S. customers through U.S. earth stations.',
    regulatoryBasis: '47 CFR 25.137',
    applicableTo: ['Non-U.S. licensed satellites serving U.S. market'],
    estimatedProcessingDays: { min: 180, max: 365 },
    estimatedCostUSD: null,
    validityPeriodYears: 15,
    isRenewable: true,
    keyRequirements: [
      'Demonstration of competitive opportunities for U.S. satellites in foreign markets',
      'Technical information equivalent to U.S. license application',
      'Public interest showing',
      'Compliance with FCC technical and service rules',
      'Change of control notification within 30 days',
    ],
    applicationUrl: 'https://www.fcc.gov/space/space-stations',
    guidanceDocuments: [],
    recentChanges: [
      'Non-U.S. operators can now seek special temporary access',
      'Default ex parte status changed to permit-but-disclose',
    ],
  },
];

// ============================================================================
// NOAA LICENSE TYPES
// ============================================================================

export const NOAA_LICENSE_TYPES: LicenseType[] = [
  {
    id: 'noaa-tier1-remote-sensing',
    slug: 'tier1-remote-sensing-license',
    agencyId: 'noaa-crsra',
    name: 'Tier 1 Remote Sensing License',
    description: 'License for systems capable only of producing data substantially the same as currently available unenhanced data from unregulated sources. Minimal conditions imposed.',
    regulatoryBasis: '15 CFR Part 960',
    applicableTo: ['Commercial remote sensing satellites', 'Earth observation systems'],
    estimatedProcessingDays: { min: 14, max: 60 },
    estimatedCostUSD: null,
    validityPeriodYears: null,
    isRenewable: true,
    keyRequirements: [
      'System capabilities match currently available unregulated data',
      'Statutory conditions only (data archiving, access for government)',
      'Annual compliance certification',
      'NOT subject to shutter control or limited-operations directives',
    ],
    applicationUrl: 'https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/licensing/',
    guidanceDocuments: [
      'CRSRA Application Guide',
    ],
    notes: 'Most permissive tier. No operational limitations on imaging.',
  },
  {
    id: 'noaa-tier2-remote-sensing',
    slug: 'tier2-remote-sensing-license',
    agencyId: 'noaa-crsra',
    name: 'Tier 2 Remote Sensing License',
    description: 'License for systems capable of producing data substantially the same as data available only from other U.S. sources.',
    regulatoryBasis: '15 CFR Part 960',
    applicableTo: ['Commercial remote sensing satellites', 'Earth observation systems'],
    estimatedProcessingDays: { min: 14, max: 60 },
    estimatedCostUSD: null,
    validityPeriodYears: null,
    isRenewable: true,
    keyRequirements: [
      'System capabilities match U.S.-only available data',
      'Consent required from ARSO owners for resolved imaging of their spacecraft',
      '5-day advance notification to Secretary of Commerce for ARSO imaging',
      'Annual compliance certification',
    ],
    applicationUrl: 'https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/licensing/',
    guidanceDocuments: [
      'CRSRA Application Guide',
    ],
    notes: 'ARSO = Artificial Resident Space Object (other satellites in orbit).',
  },
  {
    id: 'noaa-tier3-remote-sensing',
    slug: 'tier3-remote-sensing-license',
    agencyId: 'noaa-crsra',
    name: 'Tier 3 Remote Sensing License',
    description: 'License for systems with capabilities to collect unenhanced data not substantially the same as data available from any domestic or foreign source.',
    regulatoryBasis: '15 CFR Part 960',
    applicableTo: ['Advanced commercial remote sensing satellites', 'Novel imaging systems'],
    estimatedProcessingDays: { min: 30, max: 120 },
    estimatedCostUSD: null,
    validityPeriodYears: null,
    isRenewable: true,
    keyRequirements: [
      'Most capable/novel imaging systems',
      'May have temporary operating conditions',
      'Conditions reviewed and may expire over time',
      'Subject to national security review',
      'Annual compliance certification',
    ],
    applicationUrl: 'https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/licensing/',
    guidanceDocuments: [
      'CRSRA Application Guide',
    ],
    recentChanges: [
      'July 2023: 39 temporary conditions permanently expired for Tier 3 licensees',
      'Most X-Band SAR restrictions removed',
      'Imaging restrictions reduced to <1% of Earth surface',
      'Only a small number of national security conditions retained',
    ],
    notes: 'Average license processing time reduced from 48 days (2020) to 14 days (2023).',
  },
];

// ============================================================================
// INTERNATIONAL TREATIES
// ============================================================================

export const INTERNATIONAL_TREATIES: InternationalTreaty[] = [
  {
    id: 'outer-space-treaty',
    slug: 'outer-space-treaty-1967',
    name: 'Outer Space Treaty',
    fullName: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies',
    adoptedDate: '1966-12-19',
    entryIntoForceDate: '1967-10-10',
    depositaryOrganization: 'United Nations',
    numberOfParties: 118,
    keyProvisions: [
      'Space exploration shall be for the benefit of all countries (Article I)',
      'Outer space is free for exploration and use by all States (Article I)',
      'Outer space is not subject to national appropriation (Article II)',
      'States shall not place nuclear weapons in space (Article IV)',
      'Celestial bodies shall be used exclusively for peaceful purposes (Article IV)',
      'Astronauts are envoys of mankind (Article V)',
      'States bear international responsibility for national space activities (Article VI)',
      'States must authorize and supervise non-governmental space activities (Article VI)',
      'Launching State is liable for damage caused by space objects (Article VII)',
      'States retain jurisdiction over space objects on their registry (Article VIII)',
    ],
    commercialSpaceImplications: [
      'Article VI requires government authorization and supervision of private space activities',
      'States are internationally responsible for private company activities',
      'Creates basis for national licensing regimes for commercial space',
      'Prohibition on national appropriation raises questions about space resource utilization',
      'Liability provisions require insurance/indemnification frameworks',
    ],
    usImplementation: 'Implemented through FAA licensing (launches), FCC licensing (communications), NOAA licensing (remote sensing), and various executive orders and directives.',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html',
  },
  {
    id: 'liability-convention',
    slug: 'liability-convention-1972',
    name: 'Liability Convention',
    fullName: 'Convention on International Liability for Damage Caused by Space Objects',
    adoptedDate: '1972-03-29',
    entryIntoForceDate: '1972-09-01',
    depositaryOrganization: 'United Nations',
    numberOfParties: 98,
    keyProvisions: [
      'Absolute liability for damage on Earth surface or to aircraft in flight (Article II)',
      'Fault-based liability for damage in outer space (Article III)',
      'Launching State defined as state that launches, procures launch, or provides territory/facility (Article I)',
      'Claims presented through diplomatic channels (Article IX)',
      'One-year statute of limitations from date of damage (Article X)',
      'Claims Commission established if negotiations fail (Article XIV-XX)',
    ],
    commercialSpaceImplications: [
      'Launching State liable even for private company activities',
      'Creates basis for government indemnification programs (e.g., FAA risk-sharing)',
      'Requires operators to carry liability insurance',
      'Only one claim ever filed (Cosmos 954, Canada, 1978)',
      'Growing constellation activity increases collision/liability risk',
    ],
    usImplementation: 'FAA requires Maximum Probable Loss determination and liability insurance up to $500M for third-party claims and $100M for government property. Government provides indemnification above insurance limits.',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html',
  },
  {
    id: 'registration-convention',
    slug: 'registration-convention-1976',
    name: 'Registration Convention',
    fullName: 'Convention on Registration of Objects Launched into Outer Space',
    adoptedDate: '1975-01-14',
    entryIntoForceDate: '1976-09-15',
    depositaryOrganization: 'United Nations',
    numberOfParties: 75,
    keyProvisions: [
      'Launching States shall maintain national registry of space objects (Article II)',
      'Information provided to UN Secretary-General for central register (Article III)',
      'Registration includes: launching State, designator, launch date/location, orbital parameters, general function (Article IV)',
      'Assists in identification for liability purposes',
    ],
    commercialSpaceImplications: [
      'Establishes which state has jurisdiction over commercial satellites',
      'Determines which state is responsible under Outer Space Treaty Article VI',
      '54 countries and 2 international organizations have registered satellites',
      'Over 8,126 satellites registered as of 2024',
      'Majority of active satellites are now commercial',
    ],
    usImplementation: 'NASA maintains US registry. Commercial operators must provide registration information as condition of FCC and FAA licenses.',
    sourceUrl: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/registration-convention.html',
  },
  {
    id: 'itu-radio-regulations',
    slug: 'itu-radio-regulations',
    name: 'ITU Radio Regulations',
    fullName: 'ITU Radio Regulations - International Treaty Governing Radio Spectrum and Satellite Orbits',
    adoptedDate: '1906-01-01',
    entryIntoForceDate: '1906-01-01',
    depositaryOrganization: 'International Telecommunication Union',
    numberOfParties: 193,
    keyProvisions: [
      'International spectrum allocation table for all radio services',
      'Procedures for satellite network coordination (Article 9)',
      'Notification and recording of frequency assignments (Article 11)',
      'Special provisions for GSO and NGSO systems (Article 21, 22)',
      'Advance Publication Information (API) requirements',
      'Coordination Request (CR) procedures',
      'Master International Frequency Register (MIFR)',
    ],
    commercialSpaceImplications: [
      'All satellite operators must coordinate spectrum through ITU',
      'Date priority system determines interference rights',
      '7-year regulatory deadline to bring network into use',
      'API filed 2-7 years before planned operation',
      'Coordination negotiations required with potentially affected systems',
      'World Radiocommunication Conferences (WRC) update allocations every 4 years',
    ],
    usImplementation: 'FCC prepares and submits U.S. satellite filings to ITU. Coordination with U.S. federal users through NTIA. U.S. licensees must comply with ITU coordination requirements.',
    sourceUrl: 'https://www.itu.int/en/ITU-R/terrestrial/fmd/Pages/regulatory_procedures.aspx',
  },
];

// ============================================================================
// RECENT RULE CHANGES
// ============================================================================

export const RECENT_RULE_CHANGES: RecentRuleChange[] = [
  {
    id: 'fcc-5-year-deorbit',
    slug: 'fcc-5-year-deorbit-rule',
    agencyId: 'fcc-space',
    title: 'FCC 5-Year Post-Mission Disposal Rule',
    summary: 'Requires LEO satellite operators to dispose of satellites within 5 years after end of mission, replacing the previous 25-year guideline.',
    effectiveDate: '2024-09-29',
    federalRegisterCitation: 'FCC 22-74',
    impactAreas: ['LEO satellites', 'Satellite constellations', 'Orbital debris'],
    keyChanges: [
      'Maximum 5-year post-mission disposal period (down from 25 years)',
      'Applies to satellites operating at or below 2,000 km altitude',
      'Applies to both U.S. and non-U.S. licensed satellites accessing U.S. market',
      'Satellites already in orbit as of Sept 29, 2024 are grandfathered',
      'Two-year grandfathering for pre-authorized but not-yet-launched satellites',
    ],
    sourceUrl: 'https://www.fcc.gov/document/fcc-adopts-new-5-year-rule-deorbiting-satellites-0',
    status: 'effective',
  },
  {
    id: 'faa-part450-transition',
    slug: 'faa-part450-full-transition',
    agencyId: 'faa-ast',
    title: 'Part 450 Full Transition Deadline',
    summary: 'All legacy launch and reentry licenses must transition to Part 450 framework by March 10, 2026.',
    effectiveDate: '2026-03-10',
    impactAreas: ['Launch vehicles', 'Reentry vehicles', 'Commercial spaceflight'],
    keyChanges: [
      'Legacy Part 415, 417, 431, 435 licenses expire March 10, 2026',
      '20 license holders need to transition to Part 450',
      'Performance-based regulations replace prescriptive requirements',
      'Single set of regulations for all vehicle types',
      'Greater flexibility in compliance approaches',
    ],
    sourceUrl: 'https://www.faa.gov/space/licenses/operator_licenses_permits',
    status: 'pending',
  },
  {
    id: 'fcc-space-modernization',
    slug: 'fcc-space-modernization-nprm',
    agencyId: 'fcc-space',
    title: 'Space Modernization for the 21st Century',
    summary: 'FCC proposes comprehensive overhaul of Part 25 satellite licensing rules, potentially creating new Part 100 framework.',
    effectiveDate: '2025-10-28',
    impactAreas: ['Satellite licensing', 'Earth stations', 'Spectrum sharing', 'Novel missions'],
    keyChanges: [
      'Proposed elimination of GSO surety bond requirement',
      'Expanded bond exemptions for small satellites and expedited processing systems',
      'Processing rounds only for NGSO systems with 200+ satellites',
      '"Licensing assembly line" for expedited processing',
      'New framework for novel missions (ISAM, lunar)',
      'Nationwide blanket earth station licensing option',
      'New "Immovable" earth station class',
    ],
    sourceUrl: 'https://www.fcc.gov/document/space-modernization-21st-century-nprm',
    status: 'proposed',
  },
  {
    id: 'noaa-tier3-conditions-expired',
    slug: 'noaa-tier3-conditions-expired-2023',
    agencyId: 'noaa-crsra',
    title: 'NOAA Tier 3 Temporary Conditions Expired',
    summary: 'NOAA removed 39 temporary operating conditions from Tier 3 remote sensing licenses, significantly relaxing restrictions on advanced imaging systems.',
    effectiveDate: '2023-07-19',
    impactAreas: ['Remote sensing', 'SAR imaging', 'Commercial Earth observation'],
    keyChanges: [
      '39 individual temporary conditions permanently expired',
      'Global imaging restrictions reduced to <1% of Earth surface',
      'All X-Band SAR temporary conditions removed',
      'Some Non-Earth Imaging and Rapid Revisit conditions removed',
      'Small number of national security conditions retained at DoD request',
    ],
    sourceUrl: 'https://space.commerce.gov/noaa-eliminates-restrictive-operating-conditions-from-commercial-remote-sensing-satellite-licenses/',
    status: 'effective',
  },
  {
    id: 'tracss-production-release',
    slug: 'tracss-production-release-2026',
    agencyId: 'noaa-osc',
    title: 'TraCSS Production Release',
    summary: 'Traffic Coordination System for Space (TraCSS) planned production release providing civil space situational awareness services.',
    effectiveDate: '2026-01-01',
    impactAreas: ['Space situational awareness', 'Collision avoidance', 'Satellite operators'],
    keyChanges: [
      'TraCSS provides spaceflight safety screening for 8,000+ spacecraft',
      'Covers nearly 80% of all active space objects',
      'Open data policy (CC0-1.0 license) for most data',
      'Free conjunction data messages (CDMs) for operators',
      '10 beta users including SpaceX, Planet Labs, Intelsat',
      'On-demand screening and bulk submission capabilities',
    ],
    sourceUrl: 'https://space.commerce.gov/traffic-coordination-system-for-space-tracss/',
    status: 'pending',
  },
];

// ============================================================================
// FINANCIAL RESPONSIBILITY REQUIREMENTS
// ============================================================================

export interface FinancialResponsibilityRequirement {
  id: string;
  agencyId: string;
  name: string;
  description: string;
  thirdPartyMaximum: number;
  governmentPropertyMaximum: number;
  determinationBasis: string;
  alternatives: string[];
  notes: string;
}

export const FINANCIAL_RESPONSIBILITY_REQUIREMENTS: FinancialResponsibilityRequirement[] = [
  {
    id: 'faa-launch-reentry-insurance',
    agencyId: 'faa-ast',
    name: 'FAA Launch/Reentry Financial Responsibility',
    description: 'Insurance or other financial responsibility demonstration required for licensed launch and reentry operations.',
    thirdPartyMaximum: 500000000,
    governmentPropertyMaximum: 100000000,
    determinationBasis: 'Maximum Probable Loss (MPL) - greatest dollar amount of loss reasonably expected (probability >= 1 in 10 million for third parties, >= 1 in 100,000 for government)',
    alternatives: [
      'Liability insurance policy',
      'Demonstration of financial responsibility through other means',
      'Self-insurance with adequate reserves',
      'Combination of above methods',
    ],
    notes: 'Three-tiered approach: (1) Operator insurance up to MPL, (2) Third-party insurance, (3) Government indemnification above statutory limits. Statutory limits subject to inflation adjustment.',
  },
];

// ============================================================================
// SPECTRUM ALLOCATIONS (KEY SPACE BANDS)
// ============================================================================

export const KEY_SPECTRUM_ALLOCATIONS: SpectrumAllocation[] = [
  {
    id: 'l-band-mobile-satellite',
    slug: 'l-band-mobile-satellite',
    bandName: 'L-Band',
    frequencyRange: '1525-1559 MHz / 1626.5-1660.5 MHz',
    allocation: 'Mobile Satellite Service (MSS)',
    primaryServices: ['Mobile Satellite Service'],
    notes: 'Used for satellite phones, maritime communications, aviation safety services.',
    licensingRequirements: 'Part 25 space station license, Part 25 earth station license for gateways',
  },
  {
    id: 's-band-mobile-satellite',
    slug: 's-band-mobile-satellite',
    bandName: 'S-Band',
    frequencyRange: '2000-2020 MHz / 2180-2200 MHz',
    allocation: 'Mobile Satellite Service (MSS)',
    primaryServices: ['Mobile Satellite Service'],
    notes: 'Supplemental Coverage from Space (SCS) rules enable satellite-to-smartphone services.',
    licensingRequirements: 'Part 25 space station license, coordination with terrestrial wireless operators',
  },
  {
    id: 'c-band-fss',
    slug: 'c-band-fss',
    bandName: 'C-Band',
    frequencyRange: '3.7-4.2 GHz (downlink) / 5.925-6.425 GHz (uplink)',
    allocation: 'Fixed Satellite Service (FSS)',
    primaryServices: ['Fixed Satellite Service'],
    notes: 'Traditional workhorse band for satellite communications. Lower portion (3.7-3.98 GHz) transitioned to 5G.',
    licensingRequirements: 'Part 25 space station license, Part 25 earth station license',
  },
  {
    id: 'ku-band-fss',
    slug: 'ku-band-fss',
    bandName: 'Ku-Band',
    frequencyRange: '10.7-12.75 GHz (downlink) / 13.75-14.5 GHz (uplink)',
    allocation: 'Fixed Satellite Service (FSS), Broadcasting Satellite Service (BSS)',
    primaryServices: ['Fixed Satellite Service', 'Broadcasting Satellite Service'],
    notes: 'Widely used for DTH broadcasting, VSAT, broadband. Higher rain fade than C-band.',
    licensingRequirements: 'Part 25 space station license, Part 25 earth station license',
  },
  {
    id: 'ka-band-fss',
    slug: 'ka-band-fss',
    bandName: 'Ka-Band',
    frequencyRange: '17.7-20.2 GHz (downlink) / 27.5-30 GHz (uplink)',
    allocation: 'Fixed Satellite Service (FSS)',
    primaryServices: ['Fixed Satellite Service'],
    notes: 'High-throughput satellite (HTS) band. Used by LEO broadband constellations (Starlink, OneWeb).',
    licensingRequirements: 'Part 25 space station license, NGSO/GSO spectrum sharing requirements',
  },
  {
    id: 'v-band',
    slug: 'v-band',
    bandName: 'V-Band',
    frequencyRange: '37.5-42.5 GHz (downlink) / 47.2-51.4 GHz (uplink)',
    allocation: 'Fixed Satellite Service (FSS)',
    primaryServices: ['Fixed Satellite Service'],
    notes: 'Next-generation band for satellite broadband. High capacity but susceptible to rain fade.',
    licensingRequirements: 'Part 25 space station license, limited commercial deployment',
  },
  {
    id: 'space-launch-operations',
    slug: 'space-launch-operations',
    bandName: 'Space Launch Operations',
    frequencyRange: '2025-2110 MHz / 2200-2290 MHz',
    allocation: 'Space Operations',
    primaryServices: ['Space Operations Service'],
    secondaryServices: ['Fixed', 'Mobile'],
    notes: 'Used for telemetry, tracking, and command of launch vehicles. Recent FCC allocation updates.',
    licensingRequirements: 'Coordination with federal users through NTIA, Part 25 or Part 87 authorization',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAgencyById(id: string): RegulatoryAgencyInfo | undefined {
  return REGULATORY_AGENCIES.find(a => a.id === id);
}

export function getLicenseTypesByAgency(agencyId: string): LicenseType[] {
  const allLicenses = [...FAA_LICENSE_TYPES, ...FCC_LICENSE_TYPES, ...NOAA_LICENSE_TYPES];
  return allLicenses.filter(l => l.agencyId === agencyId);
}

export function getAllLicenseTypes(): LicenseType[] {
  return [...FAA_LICENSE_TYPES, ...FCC_LICENSE_TYPES, ...NOAA_LICENSE_TYPES];
}

export function getRuleChangesByAgency(agencyId: string): RecentRuleChange[] {
  return RECENT_RULE_CHANGES.filter(r => r.agencyId === agencyId);
}

export function getActiveRuleChanges(): RecentRuleChange[] {
  return RECENT_RULE_CHANGES.filter(r => r.status === 'effective' || r.status === 'pending');
}

// ============================================================================
// SUMMARY STATISTICS
// ============================================================================

export const REGULATORY_SUMMARY = {
  totalAgencies: REGULATORY_AGENCIES.length,
  totalLicenseTypes: FAA_LICENSE_TYPES.length + FCC_LICENSE_TYPES.length + NOAA_LICENSE_TYPES.length,
  totalTreaties: INTERNATIONAL_TREATIES.length,
  totalRecentChanges: RECENT_RULE_CHANGES.length,
  keyDates: {
    part450Deadline: '2026-03-10',
    fcc5YearRuleEffective: '2024-09-29',
    tracssProductionRelease: '2026-01-01',
    spaceModernizationComments: '2026-01-20',
  },
  keyFees: {
    fccGsoApplication: 471575,
    fccSmallSatApplication: 30000,
    fccGsoAnnualRegulatory: 117580,
    fccNgsoOtherAnnualRegulatory: 347755,
    fccNgsoLessComplexAnnualRegulatory: 130405,
    fccSmallSatAnnualRegulatory: 12330,
  },
  processingTimes: {
    faaVehicleLicense: { min: 114, max: 180 },
    faaExperimentalPermit: { min: 120, max: 150 },
    fccSpaceStation: { min: 180, max: 365 },
    fccSmallSat: { min: 180, max: 270 },
    noaaRemoteSensing: { min: 14, max: 60 },
  },
};
