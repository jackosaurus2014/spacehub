'use client';

import { useState, useMemo, useCallback } from 'react';

// ############################################################################
// TYPES & STYLE CONFIGS
// ############################################################################

type RegulatoryBodyRefCategory = 'us_licensing' | 'international' | 'export_control';

interface RegulatoryBodyRef {
  id: string;
  name: string;
  abbreviation: string;
  category: RegulatoryBodyRefCategory;
  jurisdiction: string;
  primaryFunction: string;
  description: string;
  keyResponsibilities: string[];
  spaceRelevance: string;
  website: string;
  contactInfo: string;
  recentDevelopments: string[];
}

type RegulationCategory = 'international_treaty' | 'us_export_control' | 'us_licensing_rule';

interface KeyRegulation {
  id: string;
  name: string;
  shortName: string;
  category: RegulationCategory;
  year: number;
  authority: string;
  cfrReference?: string;
  description: string;
  keyProvisions: string[];
  applicability: string;
  penalties: string;
  recentAmendments: string[];
  furtherReading: string;
}

type ChecklistActivityId = 'launch_satellite' | 'ground_station' | 'export_hardware' | 'space_tourism' | 'remote_sensing' | 'spectrum_use';

interface ComplianceChecklistItem {
  step: number;
  agency: string;
  requirement: string;
  description: string;
  estimatedTimeline: string;
  estimatedCost: string;
  notes?: string;
}

interface ComplianceChecklist {
  id: ChecklistActivityId;
  activity: string;
  description: string;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  totalEstimatedTimeline: string;
  steps: ComplianceChecklistItem[];
  tips: string[];
  commonPitfalls: string[];
}

const REGULATORY_BODY_REF_CATEGORY_CONFIG: Record<RegulatoryBodyRefCategory, { label: string; bg: string; text: string; border: string }> = {
  us_licensing: { label: 'US Licensing', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  international: { label: 'International', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  export_control: { label: 'Export Control', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const REGULATION_CATEGORY_CONFIG: Record<RegulationCategory, { label: string; bg: string; text: string; border: string }> = {
  international_treaty: { label: 'International Treaty', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  us_export_control: { label: 'US Export Control', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  us_licensing_rule: { label: 'US Licensing Rule', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
};

const CHECKLIST_COMPLEXITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'Low Complexity', bg: 'bg-green-500/20', text: 'text-green-400' },
  medium: { label: 'Medium Complexity', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  high: { label: 'High Complexity', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  very_high: { label: 'Very High Complexity', bg: 'bg-red-500/20', text: 'text-red-400' },
};

// ############################################################################
// DATA - Regulatory Bodies
// ############################################################################

const KEY_REGULATORY_BODIES: RegulatoryBodyRef[] = [
  {
    id: 'fcc',
    name: 'Federal Communications Commission',
    abbreviation: 'FCC',
    category: 'us_licensing',
    jurisdiction: 'United States',
    primaryFunction: 'Spectrum allocation and satellite communications licensing',
    description: 'The FCC regulates interstate and international communications by radio, television, wire, satellite, and cable. Its Space Bureau (established 2023) handles satellite licensing, spectrum allocation for space services, orbital debris mitigation rules, and coordination of satellite constellations.',
    keyResponsibilities: [
      'Satellite system licensing and authorization (Part 25)',
      'Spectrum allocation for space-to-Earth and Earth-to-space services',
      'Orbital debris mitigation requirements (25-year deorbit rule)',
      'Market access for non-US satellite operators',
      'Interference coordination between satellite operators',
      'Small satellite streamlined licensing process',
    ],
    spaceRelevance: 'Any entity operating or communicating with satellites from US territory must hold FCC authorization. The FCC also sets technical standards for satellite systems and enforces spectrum sharing rules critical to avoiding interference.',
    website: 'https://www.fcc.gov/space',
    contactInfo: 'Space Bureau: (202) 418-0300',
    recentDevelopments: [
      'Established dedicated Space Bureau in 2023 to handle growing satellite licensing workload',
      'Adopted 5-year post-mission deorbit rule replacing the prior 25-year guideline (2022)',
      'Streamlined processing for small satellite and NGSO constellation applications',
      'Updated spectrum sharing framework for Ka-band NGSO systems',
    ],
  },
  {
    id: 'faa-ast',
    name: 'Federal Aviation Administration / Office of Commercial Space Transportation',
    abbreviation: 'FAA/AST',
    category: 'us_licensing',
    jurisdiction: 'United States',
    primaryFunction: 'Commercial space launch and reentry vehicle licensing',
    description: 'The FAA\'s Office of Commercial Space Transportation (AST) licenses and regulates US commercial space launch and reentry activities including launch vehicles, reentry vehicles, launch sites, and reentry sites. Updated Part 450 regulations (effective March 2021) consolidated and modernized the licensing framework.',
    keyResponsibilities: [
      'Launch and reentry vehicle operator licensing (14 CFR Part 450)',
      'Launch and reentry site licensing',
      'Safety review and approval for commercial launches',
      'Financial responsibility (insurance) requirements',
      'Environmental review under NEPA for launch operations',
      'Human space flight informed consent requirements',
    ],
    spaceRelevance: 'All commercial launches and reentries from US territory or by US citizens anywhere in the world require FAA/AST authorization. This includes suborbital space tourism flights, orbital launches, and experimental vehicle flights.',
    website: 'https://www.faa.gov/space',
    contactInfo: 'AST Main Office: (202) 267-7793',
    recentDevelopments: [
      'Part 450 streamlined licensing replaced legacy Part 431/435/437 framework (2021)',
      'Increased launch tempo processing with record 131 licensed launches in 2024',
      'Updated human space flight waiver of claims requirements',
      'Expanded environmental review streamlining for frequently used launch sites',
    ],
  },
  {
    id: 'itu',
    name: 'International Telecommunication Union',
    abbreviation: 'ITU',
    category: 'international',
    jurisdiction: 'Global (UN specialized agency)',
    primaryFunction: 'International frequency coordination and orbital slot allocation',
    description: 'The ITU is a UN specialized agency responsible for global coordination of radio spectrum and satellite orbits. Its Radiocommunication Sector (ITU-R) manages the international frequency allocation table, coordinates satellite network filings, and maintains the Master International Frequency Register for space services.',
    keyResponsibilities: [
      'International frequency allocation and spectrum management (Radio Regulations)',
      'Satellite network coordination (Article 9 procedures)',
      'Geostationary orbit slot assignment and coordination',
      'Due diligence requirements for satellite network filings',
      'World Radiocommunication Conferences (WRC) every 3-4 years',
      'Resolution of harmful interference between satellite systems',
    ],
    spaceRelevance: 'Before launching any satellite, operators must coordinate through their national administration to the ITU to ensure non-interference with existing services. GSO slot assignments and NGSO coordination are essential for constellation deployment.',
    website: 'https://www.itu.int/en/ITU-R',
    contactInfo: 'ITU Radiocommunication Bureau: +41 22 730 5800',
    recentDevelopments: [
      'WRC-23 outcomes: new spectrum allocations for satellite broadband and Earth exploration',
      'Updated milestone-based approach for NGSO constellation filings',
      'Enhanced due diligence requirements to prevent spectrum warehousing',
      'New framework for coordination between NGSO mega-constellations',
    ],
  },
  {
    id: 'noaa',
    name: 'National Oceanic and Atmospheric Administration',
    abbreviation: 'NOAA',
    category: 'us_licensing',
    jurisdiction: 'United States',
    primaryFunction: 'Remote sensing satellite licensing and space commerce',
    description: 'NOAA\'s Office of Space Commerce licenses private remote sensing space systems under the Land Remote Sensing Policy Act. The office is also developing a space traffic management framework and serves as the civil agency focal point for commercial space situational awareness.',
    keyResponsibilities: [
      'Remote sensing satellite system licensing (15 CFR Part 960)',
      'Monitoring compliance with remote sensing license conditions',
      'Space situational awareness data sharing',
      'Open Architecture Data Repository (OADR) for SSA',
      'Commercial weather data pilot programs',
      'Space commerce policy coordination',
    ],
    spaceRelevance: 'Any US entity operating Earth observation or remote sensing satellites needs NOAA licensing. This includes optical, radar (SAR), hyperspectral, and other imaging payloads. License conditions address shutter control, data distribution, and national security.',
    website: 'https://space.commerce.gov',
    contactInfo: 'Office of Space Commerce: (202) 482-6125',
    recentDevelopments: [
      'Modernized Part 960 remote sensing licensing regulations (2020) with tiered authorization',
      'Developing Open Architecture Data Repository for space traffic coordination',
      'Taking over civil space situational awareness mission from DoD',
      'Expanded commercial weather data purchasing programs',
    ],
  },
  {
    id: 'bis',
    name: 'Bureau of Industry and Security',
    abbreviation: 'BIS',
    category: 'export_control',
    jurisdiction: 'United States',
    primaryFunction: 'Export controls for dual-use technologies (EAR)',
    description: 'BIS, within the US Department of Commerce, administers the Export Administration Regulations (EAR) controlling dual-use items including commercial satellites and components. Since 2014, most commercial satellites were transferred from the USML (ITAR) to the Commerce Control List (CCL) under the 9x515 series.',
    keyResponsibilities: [
      'Administer Export Administration Regulations (EAR)',
      'Commerce Control List (CCL) ECCN classifications',
      'Export license processing for dual-use space items',
      'Entity List and denied persons list enforcement',
      'Deemed export rules (technology transfer to foreign nationals)',
      'End-use and end-user verification',
    ],
    spaceRelevance: 'Commercial satellite components, ground equipment, and many space technologies fall under EAR. Companies must properly classify items by ECCN and obtain licenses for controlled destinations. The 9x515 series is specifically designed for space-related items transferred from ITAR.',
    website: 'https://www.bis.gov',
    contactInfo: 'Exporter Counseling: (202) 482-4811',
    recentDevelopments: [
      'Expanded Entity List restrictions affecting space technology transfers to certain countries',
      'Updated deemed export rules for foreign national access to space technology',
      'New controls on advanced satellite components and AI-enabled remote sensing',
      'Increased enforcement actions for EAR violations in space sector',
    ],
  },
  {
    id: 'copuos',
    name: 'United Nations Committee on the Peaceful Uses of Outer Space',
    abbreviation: 'COPUOS',
    category: 'international',
    jurisdiction: 'Global (UN General Assembly)',
    primaryFunction: 'International space governance and treaty development',
    description: 'COPUOS is the main international forum for developing space governance norms and treaties. Established in 1959, it has two subcommittees: the Scientific and Technical Subcommittee and the Legal Subcommittee. COPUOS developed all five UN space treaties and continues to address emerging issues in space sustainability and governance.',
    keyResponsibilities: [
      'Development of international space law treaties and guidelines',
      'Long-term sustainability of outer space activities (LTS guidelines)',
      'Space debris mitigation guidelines',
      'Registration of space objects (Registration Convention)',
      'Space resource utilization governance discussions',
      'Coordination on space weather, NEO threats, and nuclear power in space',
    ],
    spaceRelevance: 'While COPUOS does not directly regulate commercial operators, its guidelines and norms shape national legislation worldwide. Companies must track COPUOS developments as they signal future regulatory directions on debris, resources, and sustainability.',
    website: 'https://www.unoosa.org/oosa/en/ourwork/copuos/index.html',
    contactInfo: 'UNOOSA: +43 1 26060 4950 (Vienna)',
    recentDevelopments: [
      'Ongoing implementation review of 21 Long-Term Sustainability Guidelines',
      'Active working group on space resource utilization governance',
      'Discussions on a new framework for space traffic management',
      'Enhanced focus on mega-constellation sustainability and dark sky impact',
    ],
  },
];

// ############################################################################
// DATA - Key Regulations
// ############################################################################

const KEY_REGULATIONS: KeyRegulation[] = [
  {
    id: 'outer-space-treaty', name: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies', shortName: 'Outer Space Treaty (1967)', category: 'international_treaty', year: 1967, authority: 'United Nations',
    description: 'The foundational treaty of international space law, often called the "constitution of space." It establishes that outer space is free for exploration and use by all states, cannot be subject to national appropriation, and shall be used exclusively for peaceful purposes. It makes states internationally responsible for national space activities, including those of private entities.',
    keyProvisions: ['Article I: Space exploration and use shall be carried out for the benefit of all countries','Article II: Outer space is not subject to national appropriation by sovereignty, use, or occupation','Article III: Space activities shall be in accordance with international law and the UN Charter','Article IV: Prohibition of nuclear weapons and WMDs in outer space; military bases banned on celestial bodies','Article VI: States bear international responsibility for national space activities including private sector','Article VII: Launching states are liable for damage caused by their space objects','Article VIII: State of registry retains jurisdiction and control over space objects','Article IX: Due regard principle; consultation for potentially harmful activities'],
    applicability: 'Applies to all state parties (114 ratifications as of 2025). Indirectly binds commercial operators through Article VI state responsibility.',
    penalties: 'State-level liability under international law. No direct enforcement mechanism for private entities, but national legislation implements treaty obligations.',
    recentAmendments: ['No formal amendments since adoption','Ongoing debates about Article II interpretation in context of space resource utilization','Artemis Accords (2020) attempt to operationalize key treaty principles for lunar activities'],
    furtherReading: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html',
  },
  {
    id: 'registration-convention', name: 'Convention on Registration of Objects Launched into Outer Space', shortName: 'Registration Convention (1975)', category: 'international_treaty', year: 1975, authority: 'United Nations',
    description: 'Requires states to maintain a national registry of space objects and provide launch information to the UN Secretary-General for inclusion in the UN Register. Essential for establishing jurisdiction, identifying liable parties, and tracking the growing population of objects in orbit.',
    keyProvisions: ['Article II: Launching state shall register space objects in a national registry','Article III: UN Secretary-General maintains a central Register of space objects','Article IV: Registration data includes launching state, designator, date/territory, basic orbital parameters, and general function','Article VI: Mutual assistance in identification of space objects causing damage'],
    applicability: 'All state parties (72 ratifications). In practice, most satellite operators register through their national space agency or designated authority.',
    penalties: 'No direct penalties, but unregistered objects complicate liability claims and may face regulatory issues nationally.',
    recentAmendments: ['UN General Assembly resolutions have expanded recommended registration practices','Push for improved timeliness of registration (pre-launch notification)','Discussions on registration of on-orbit servicing, debris removal, and constellation changes'],
    furtherReading: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/registration-convention.html',
  },
  {
    id: 'liability-convention', name: 'Convention on International Liability for Damage Caused by Space Objects', shortName: 'Liability Convention (1972)', category: 'international_treaty', year: 1972, authority: 'United Nations',
    description: 'Establishes international rules for liability when space objects cause damage. Provides for absolute liability for damage on Earth\'s surface and fault-based liability for damage in outer space. The only time it was formally invoked was Canada\'s claim against the USSR for the Cosmos 954 incident (1978).',
    keyProvisions: ['Article II: Absolute liability for damage caused on Earth surface or to aircraft in flight','Article III: Fault-based liability for damage to another space object in outer space','Article IV: Joint and several liability for joint launches','Article V: Exoneration if claimant state caused the damage through gross negligence','Articles XIV-XX: Claims Commission procedure if diplomatic negotiations fail'],
    applicability: 'All state parties (98 ratifications). Claims are state-to-state; private entities must work through their government.',
    penalties: 'Full compensation for damage under international law standards. No punitive damages. Limited to state-to-state claims framework.',
    recentAmendments: ['No formal amendments since adoption','Growing discussion about updating for mega-constellation era and active debris removal','Questions about liability for autonomous collision avoidance decisions'],
    furtherReading: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html',
  },
  {
    id: 'itar', name: 'International Traffic in Arms Regulations', shortName: 'ITAR', category: 'us_export_control', year: 1976, authority: 'US Department of State, Directorate of Defense Trade Controls (DDTC)', cfrReference: '22 CFR Parts 120-130',
    description: 'Controls the export and temporary import of defense articles and services on the United States Munitions List (USML). Launch vehicles, certain spacecraft, and defense-related space technologies remain on the USML. Any export requires DDTC authorization, with no license exceptions available.',
    keyProvisions: ['USML Category IV: Launch vehicles, guided missiles, ballistic missiles, rockets, torpedoes, bombs, and mines','USML Category XV: Spacecraft and related articles (defense and intelligence satellites)','Registration requirement for all manufacturers and exporters of defense articles','Technical Assistance Agreements (TAA) for defense services','DSP-5 license for permanent exports, DSP-73 for temporary exports','Strict "see-through" rule: ITAR-controlled items embedded in larger systems remain controlled'],
    applicability: 'All US persons (citizens, permanent residents, US-incorporated entities). Also applies to foreign persons in the US accessing ITAR data. Violations carry criminal and civil penalties.',
    penalties: 'Criminal: Up to $1M fine and 20 years imprisonment per violation. Civil: Up to $1.29M per violation. Debarment from export privileges. Consent agreements with mandatory compliance programs.',
    recentAmendments: ['ECR (Export Control Reform) transferred commercial satellites to EAR (2014)','Defense and intelligence spacecraft remain on USML Category XV','Updated DDTC electronic filing system (DECCS)','New voluntary self-disclosure guidelines'],
    furtherReading: 'https://www.pmddtc.state.gov/ddtc_public/ddtc_public?id=ddtc_kb_article_page&sys_id=24d528fddbfc930044f9ff621f961987',
  },
  {
    id: 'ear', name: 'Export Administration Regulations', shortName: 'EAR', category: 'us_export_control', year: 1979, authority: 'US Department of Commerce, Bureau of Industry and Security (BIS)', cfrReference: '15 CFR Parts 730-774',
    description: 'Controls the export of dual-use items on the Commerce Control List (CCL). Since the Export Control Reform of 2014, most commercial satellite systems and components fall under the EAR 9x515 series. Unlike ITAR, EAR provides license exceptions for certain transactions.',
    keyProvisions: ['ECCN 9A515: Spacecraft and related items (commercial satellites transferred from USML)','ECCN 9B515: Test, inspection, and production equipment for spacecraft','ECCN 9D515: Software for spacecraft development and production','ECCN 9E515: Technology for spacecraft','License exceptions: STA (Strategic Trade Authorization), TMP (Temporary exports), GOV (Government)','EAR99: Items subject to EAR but not on CCL (minimal controls)'],
    applicability: 'All US-origin items, items in the US, and certain foreign-made items incorporating US content above de minimis thresholds. Applies to all persons subject to US jurisdiction.',
    penalties: 'Criminal: Up to $1M fine and 20 years imprisonment. Civil: Up to $364,992 per violation or twice the transaction value. Denial of export privileges. Entity List placement.',
    recentAmendments: ['Expanded Entity List restrictions on space technology to certain countries','New controls on items enabling precision geolocation and AI-enabled EO','Updated de minimis calculation rules for foreign-produced items','Enhanced military end-use and end-user controls'],
    furtherReading: 'https://www.bis.gov/regulations/export-administration-regulations-ear',
  },
  {
    id: 'fcc-part-25', name: 'FCC Part 25 - Satellite Communications Rules', shortName: 'FCC Part 25', category: 'us_licensing_rule', year: 1962, authority: 'Federal Communications Commission', cfrReference: '47 CFR Part 25',
    description: 'The primary FCC rules governing satellite communications. Part 25 establishes licensing requirements for space stations (satellites), Earth stations, and related facilities. It covers technical standards, application procedures, orbital debris mitigation, and spectrum sharing for both GSO and NGSO systems.',
    keyProvisions: ['Section 25.114: Space station application requirements and processing','Section 25.117: Modification and assignment of satellite licenses','Section 25.121: License term (typically 15 years for GSO, variable for NGSO)','Section 25.156: Processing rounds and first-come-first-served procedures','Section 25.160: Application fees and regulatory fees','Section 25.271: Orbital debris mitigation requirements (updated 5-year deorbit rule)','Section 25.289: Surety bond requirement for NGSO systems ($100K-$2M per satellite)'],
    applicability: 'All entities seeking to operate or communicate with satellites from US territory, or non-US systems seeking US market access. Covers all frequency bands allocated for satellite services.',
    penalties: 'License revocation, fines (forfeiture up to $2.46M per violation per day for non-broadcasters), and cease-and-desist orders. Unauthorized transmissions can result in equipment seizure.',
    recentAmendments: ['Adopted 5-year post-mission disposal rule (2022)','Mandatory orbital debris mitigation disclosure (2020)','Streamlined small satellite licensing (Part 25 and new Part 25A)','Updated NGSO spectrum sharing framework for mega-constellations','New surety bond/insurance requirements for orbital debris compliance'],
    furtherReading: 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25',
  },
  {
    id: 'faa-part-450', name: 'FAA Part 450 - Commercial Space Transportation Licensing', shortName: 'FAA 14 CFR Part 450', category: 'us_licensing_rule', year: 2021, authority: 'Federal Aviation Administration, Office of Commercial Space Transportation', cfrReference: '14 CFR Part 450',
    description: 'The modernized FAA framework for commercial space launch and reentry licensing. Part 450 replaced the legacy Part 431 (reusable launch vehicles), Part 435 (expendable launch vehicles), and Part 437 (experimental permits) with a single performance-based, technology-neutral regulation.',
    keyProvisions: ['Section 450.41-450.49: Vehicle operator license application requirements','Section 450.101-450.109: Flight safety analysis including debris risk assessment','Section 450.131-450.139: Safety requirements for crew and space flight participants','Section 450.161-450.169: Financial responsibility (liability insurance) requirements','Section 450.171-450.177: Mishap reporting and investigation requirements','Performance-based approach: operators can use any methodology meeting safety criteria','Aggregate risk criteria: expected casualty per mission limits for public safety'],
    applicability: 'All US commercial launch and reentry operators, launch site operators, and operations involving US citizens abroad. Applies to orbital, suborbital, and experimental flights.',
    penalties: 'Civil penalties up to $283,750 per violation per day. License suspension or revocation. Criminal penalties for knowingly and willfully violating license terms. Cease-and-desist authority.',
    recentAmendments: ['Full Part 450 effective March 10, 2021 (consolidating legacy parts)','Updated maximum probable loss calculations for insurance requirements','New informed consent requirements for human space flight participants','Streamlined environmental review for programmatic launches at established sites'],
    furtherReading: 'https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450',
  },
];

// ############################################################################
// DATA - Compliance Checklists
// ############################################################################

const COMPLIANCE_CHECKLISTS: ComplianceChecklist[] = [
  {
    id: 'launch_satellite', activity: 'Launching a Satellite', description: 'Complete regulatory pathway for placing a commercial satellite into orbit from US territory or by a US operator.', complexity: 'very_high', totalEstimatedTimeline: '12-24 months',
    steps: [
      { step: 1, agency: 'FCC', requirement: 'Space Station License Application (Part 25)', description: 'File FCC Form 312 with technical specifications including orbital parameters, frequency bands, power levels, antenna characteristics, and orbital debris mitigation plan.', estimatedTimeline: '6-12 months', estimatedCost: '$37,675-$505,275 (varies by complexity)', notes: 'Small satellite streamlined process available for qualifying missions' },
      { step: 2, agency: 'FAA/AST', requirement: 'Launch Vehicle Operator License (Part 450)', description: 'Obtain launch license or verify your launch provider holds a valid license covering your mission profile. Submit mission-specific data for safety analysis.', estimatedTimeline: '6-18 months', estimatedCost: '$10,000-$50,000+ (application and review)', notes: 'If using an existing licensed provider (SpaceX, Rocket Lab, etc.), they hold the launch license' },
      { step: 3, agency: 'ITU', requirement: 'International Frequency Coordination', description: 'Coordinate through the FCC (US administration) to the ITU for advance publication, coordination (Article 9), and notification (Article 11) of satellite network frequencies.', estimatedTimeline: '2-7 years (parallel with other steps)', estimatedCost: 'Varies by filing type', notes: 'Begin ITU coordination early as it is the longest lead-time item' },
      { step: 4, agency: 'NOAA', requirement: 'Remote Sensing License (if applicable)', description: 'If satellite carries any Earth imaging capability (optical, SAR, multispectral, etc.), obtain a NOAA remote sensing license under 15 CFR Part 960.', estimatedTimeline: '3-6 months', estimatedCost: 'No application fee; compliance costs vary', notes: 'Required even for secondary or incidental imaging capability' },
      { step: 5, agency: 'BIS/DDTC', requirement: 'Export Control Classification', description: 'Determine whether satellite and components are controlled under EAR (ECCN 9x515) or ITAR (USML Cat IV/XV). Obtain necessary export licenses for any foreign components, ground station equipment, or launch from foreign territory.', estimatedTimeline: '1-6 months', estimatedCost: '$0 for classification; license processing varies' },
      { step: 6, agency: 'FCC', requirement: 'Earth Station Licenses', description: 'License ground station facilities for commanding, tracking, and receiving data from the satellite. May use blanket licensing for multiple terminals.', estimatedTimeline: '3-6 months', estimatedCost: '$3,545-$37,675' },
      { step: 7, agency: 'Insurance', requirement: 'Launch and In-Orbit Insurance', description: 'Obtain third-party liability insurance as required by FAA (minimum varies by mission) and typically first-party coverage for the satellite asset.', estimatedTimeline: '2-4 months', estimatedCost: '2-15% of satellite value for first-party; varies for TPL' },
      { step: 8, agency: 'UN/UNOOSA', requirement: 'Space Object Registration', description: 'Register the satellite through the US State Department to the UN Register of Space Objects per the Registration Convention.', estimatedTimeline: '1-3 months post-launch', estimatedCost: 'No fee' },
    ],
    tips: ['Start ITU coordination and FCC licensing in parallel -- these have the longest timelines','Engage an experienced space regulatory attorney early in the process','Use the FCC small satellite streamlined process if your satellite qualifies (under 180kg, under 600km altitude)','Maintain a clear ITAR/EAR Technology Control Plan from day one of development','Consider regulatory requirements during satellite design phase, not after'],
    commonPitfalls: ['Underestimating ITU coordination timeline -- can take years for complex filings','Failing to classify components for export control before engaging foreign suppliers','Not including orbital debris mitigation costs in satellite budget','Missing FCC surety bond or performance bond requirements for NGSO systems','Assuming launch provider license covers all mission-specific requirements'],
  },
  {
    id: 'ground_station', activity: 'Operating a Ground Station', description: 'Regulatory requirements for establishing and operating a satellite ground station facility in the United States.', complexity: 'medium', totalEstimatedTimeline: '3-9 months',
    steps: [
      { step: 1, agency: 'FCC', requirement: 'Earth Station License Application', description: 'File FCC Form 312 for fixed or mobile Earth station authorization. Specify antenna size, frequencies, emission designators, and satellite points of communication.', estimatedTimeline: '3-6 months', estimatedCost: '$3,545-$37,675', notes: 'Blanket licensing available for networks of similar terminals' },
      { step: 2, agency: 'FCC', requirement: 'Frequency Coordination', description: 'Coordinate proposed frequencies with existing terrestrial microwave users. Required for C-band and Ku-band Earth stations to avoid interference.', estimatedTimeline: '1-3 months', estimatedCost: '$1,000-$10,000 (coordination study)', notes: 'Required before FCC filing; hire a frequency coordination company' },
      { step: 3, agency: 'Local', requirement: 'Land Use Permits and Zoning', description: 'Obtain local building permits, zoning approval, and environmental clearances for antenna installation. May require FAA Form 7460-1 if near an airport.', estimatedTimeline: '1-6 months', estimatedCost: 'Varies by jurisdiction' },
      { step: 4, agency: 'FAA', requirement: 'Obstruction Evaluation (if applicable)', description: 'If the antenna exceeds 200 feet or is near an airport, file FAA Form 7460-1 for aeronautical study and obstruction marking/lighting determination.', estimatedTimeline: '1-3 months', estimatedCost: 'No federal fee' },
      { step: 5, agency: 'FCC', requirement: 'RF Safety Compliance', description: 'Ensure compliance with FCC RF exposure limits (OET Bulletin 65). May require an environmental assessment for high-power transmit stations.', estimatedTimeline: 'Concurrent with license', estimatedCost: '$1,000-$5,000 for RF study' },
    ],
    tips: ['Consider receive-only Earth stations which require only registration, not full licensing','Blanket earth station licenses are more efficient for deploying multiple terminals','Check for local RF emissions ordinances which may be stricter than FCC requirements','Plan antenna placement to minimize interference from and to adjacent systems'],
    commonPitfalls: ['Forgetting frequency coordination before filing with FCC -- delays processing','Not checking local zoning restrictions on antenna installations','Underestimating EMI/RFI issues at the selected site','Neglecting ongoing annual regulatory fees to FCC'],
  },
  {
    id: 'export_hardware', activity: 'Exporting Space Hardware', description: 'Process for legally exporting US-origin space technology, satellite components, or related technical data to foreign entities.', complexity: 'high', totalEstimatedTimeline: '1-12 months',
    steps: [
      { step: 1, agency: 'Self', requirement: 'Commodity Jurisdiction / Classification', description: 'Determine if your item is controlled under ITAR (USML) or EAR (CCL). File a Commodity Jurisdiction request with DDTC if classification is unclear, or self-classify under EAR.', estimatedTimeline: '2-8 weeks (CJ determination)', estimatedCost: 'No filing fee; legal costs for CJ analysis' },
      { step: 2, agency: 'DDTC', requirement: 'ITAR Registration (if USML)', description: 'Register with the Directorate of Defense Trade Controls as a manufacturer or exporter of defense articles. Required before applying for any ITAR export license.', estimatedTimeline: '4-6 weeks', estimatedCost: '$2,250/year registration fee' },
      { step: 3, agency: 'DDTC or BIS', requirement: 'Export License Application', description: 'For ITAR: Submit DSP-5 (permanent export) or DSP-73 (temporary export) via DECCS. For EAR: Submit BIS Form 748P via SNAP-R. Include end-user statement and transaction details.', estimatedTimeline: 'ITAR: 2-4 months. EAR: 1-3 months', estimatedCost: 'No application fees; legal preparation costs vary', notes: 'Some EAR items qualify for License Exceptions (STA, TMP, etc.)' },
      { step: 4, agency: 'DDTC', requirement: 'Technical Assistance Agreement (if services)', description: 'For providing defense services, technical data, or training to foreign persons, execute a TAA approved by DDTC. Required for most collaborative development programs.', estimatedTimeline: '3-6 months', estimatedCost: 'Legal costs for agreement drafting' },
      { step: 5, agency: 'Self', requirement: 'Technology Control Plan', description: 'Implement and maintain a Technology Control Plan (TCP) governing access to controlled items, IT security, visitor protocols, and deemed export controls for foreign national employees.', estimatedTimeline: 'Ongoing', estimatedCost: 'Internal compliance program costs' },
      { step: 6, agency: 'CBP', requirement: 'Customs and Shipping Documentation', description: 'File Electronic Export Information (EEI) via ACE/AESDirect for shipments over $2,500 or requiring an export license. Obtain Shipper\'s Export Declaration.', estimatedTimeline: 'At time of export', estimatedCost: 'Minimal filing costs' },
    ],
    tips: ['Classify items early in the design phase to identify export constraints before committing to foreign partners','Consider "design-to-EAR" strategies to avoid ITAR restrictions where possible','Implement robust deemed export controls for any foreign national employees','Use license exceptions (EAR) or exemptions (ITAR Section 125/126) where applicable to speed transactions','Maintain detailed records -- both ITAR and EAR require 5+ year record retention'],
    commonPitfalls: ['Assuming commercial satellites are EAR without verifying -- defense-related payloads may be ITAR','Failing to register with DDTC before applying for an ITAR license','Sharing technical data with foreign nationals without proper authorization (deemed export violation)','Not screening end-users against denied parties lists before each transaction','Inadequate compliance training for engineering staff working with foreign partners'],
  },
  {
    id: 'space_tourism', activity: 'Space Tourism Operations', description: 'Regulatory requirements for conducting commercial human spaceflight operations carrying paying passengers.', complexity: 'very_high', totalEstimatedTimeline: '18-36 months',
    steps: [
      { step: 1, agency: 'FAA/AST', requirement: 'Launch/Reentry License (Part 450)', description: 'Obtain an FAA launch or launch-and-reentry operator license. Must demonstrate safety analysis meeting aggregate risk criteria including EC (expected casualty) requirements for public and crew/participants.', estimatedTimeline: '12-24 months', estimatedCost: '$50,000-$500,000+', notes: 'Performance-based approach under Part 450 allows various vehicle designs' },
      { step: 2, agency: 'FAA/AST', requirement: 'Human Space Flight Requirements', description: 'Comply with crew qualification and space flight participant (SFP) safety requirements under Part 450 Subpart D. Provide safety briefings, emergency training, and medical screening protocols.', estimatedTimeline: 'Concurrent with license', estimatedCost: 'Included in operations development' },
      { step: 3, agency: 'FAA/AST', requirement: 'Informed Consent', description: 'Each space flight participant must provide written informed consent acknowledging the risks of space flight. Must describe the safety record of the vehicle and known hazards.', estimatedTimeline: 'Pre-flight per mission', estimatedCost: 'Legal document preparation', notes: 'FAA moratorium on SFP safety regulations extended through 2025' },
      { step: 4, agency: 'FAA/AST', requirement: 'Financial Responsibility / Insurance', description: 'Obtain third-party liability insurance at Maximum Probable Loss (MPL) amount determined by FAA. Typically $100M-$500M depending on vehicle and trajectory.', estimatedTimeline: '2-6 months', estimatedCost: 'Significant premium; varies by risk profile' },
      { step: 5, agency: 'FCC', requirement: 'Communications Licenses', description: 'Obtain FCC authorization for vehicle-to-ground communications, telemetry, and any passenger communications services during flight.', estimatedTimeline: '3-6 months', estimatedCost: 'Standard FCC fees' },
      { step: 6, agency: 'NEPA', requirement: 'Environmental Review', description: 'Complete environmental assessment or environmental impact statement under the National Environmental Policy Act for launch operations.', estimatedTimeline: '6-24 months', estimatedCost: '$100,000-$2M+', notes: 'May use programmatic EIS if operating from established launch site' },
    ],
    tips: ['Engage FAA/AST in pre-application consultations well before formal filing','The learning period (regulatory moratorium on passenger safety rules) is still in effect -- use this flexibility wisely','Build a robust safety management system from the start; FAA expects SMS even if not yet formally required','Consider operating from an already-licensed launch site to simplify environmental review'],
    commonPitfalls: ['Underestimating the time and cost of environmental review for new launch sites','Insufficient insurance coverage -- MPL determinations can be higher than expected','Not planning for the eventual end of the regulatory learning period and future crew safety requirements','Inadequate informed consent documentation that does not meet evolving FAA guidance'],
  },
  {
    id: 'remote_sensing', activity: 'Operating a Remote Sensing Satellite', description: 'Additional regulatory requirements specific to satellites carrying Earth observation or imaging payloads.', complexity: 'high', totalEstimatedTimeline: '6-18 months (in addition to general satellite licensing)',
    steps: [
      { step: 1, agency: 'NOAA', requirement: 'Remote Sensing License Application (Part 960)', description: 'Submit application to NOAA Office of Space Commerce describing the system, data products, distribution plans, and any shutter control provisions. Tiered authorization based on capability.', estimatedTimeline: '3-6 months', estimatedCost: 'No application fee' },
      { step: 2, agency: 'NOAA', requirement: 'Tier Classification', description: 'NOAA classifies your system into Tier 1 (unenhanced data freely available), Tier 2 (standard controls), or Tier 3 (enhanced security requirements based on capability).', estimatedTimeline: 'Part of application review', estimatedCost: 'No additional fee', notes: 'Higher resolution systems typically receive more restrictive tier classification' },
      { step: 3, agency: 'NOAA', requirement: 'Data Distribution Plan', description: 'Specify how imagery data will be distributed, to whom, and any restrictions. May include shutter control provisions allowing the government to restrict imaging during national security events.', estimatedTimeline: 'Part of application', estimatedCost: 'Compliance infrastructure costs' },
      { step: 4, agency: 'BIS/DDTC', requirement: 'Export Control for Imagery', description: 'Classify remote sensing data products for export control. High-resolution EO data may require export licenses depending on resolution, spectral bands, and end user.', estimatedTimeline: '1-3 months', estimatedCost: 'Varies' },
      { step: 5, agency: 'NOAA', requirement: 'Annual Reporting and Compliance', description: 'Maintain ongoing compliance including annual operations reports, notification of any system changes, and cooperation with NOAA compliance inspections.', estimatedTimeline: 'Ongoing annually', estimatedCost: 'Internal compliance costs' },
    ],
    tips: ['The 2020 Part 960 modernization significantly simplified the licensing process with tiered approach','Engage NOAA pre-application to understand likely tier classification for your system','Consider data distribution restrictions early in business model development','SAR and hyperspectral systems may face additional scrutiny and higher tier classification'],
    commonPitfalls: ['Designing a satellite with remote sensing capability without obtaining NOAA license (even if imaging is not the primary mission)','Not planning for potential shutter control or imaging restriction requirements','Underestimating export control implications of high-resolution imagery distribution','Failing to report system changes or operational anomalies to NOAA'],
  },
  {
    id: 'spectrum_use', activity: 'Using Radio Spectrum for Space Operations', description: 'Comprehensive guide to obtaining radio frequency spectrum authorization for satellite communications and space operations.', complexity: 'high', totalEstimatedTimeline: '6-36 months depending on band and system complexity',
    steps: [
      { step: 1, agency: 'ITU', requirement: 'Advance Publication Information (API)', description: 'File advance publication with ITU through FCC (US administration) to notify other administrations of planned satellite network at least 2 years before use.', estimatedTimeline: '2+ years before operation', estimatedCost: 'ITU cost recovery charges apply' },
      { step: 2, agency: 'ITU', requirement: 'Coordination (Article 9)', description: 'Coordinate with potentially affected satellite networks and terrestrial services. Negotiate technical parameters to ensure compatible operation.', estimatedTimeline: '7 years max from API', estimatedCost: 'Coordination study costs vary' },
      { step: 3, agency: 'FCC', requirement: 'Space Station Authorization', description: 'File for FCC space station license specifying all frequency bands, emission characteristics, and service areas. Must demonstrate ITU coordination status.', estimatedTimeline: '6-12 months', estimatedCost: 'FCC application fees' },
      { step: 4, agency: 'FCC', requirement: 'Spectrum Sharing Analysis', description: 'Demonstrate compatibility with other authorized systems in the same or adjacent bands. Particularly important for NGSO systems sharing with GSO networks.', estimatedTimeline: 'Part of application review', estimatedCost: 'Engineering study costs' },
      { step: 5, agency: 'ITU', requirement: 'Notification and Recording (Article 11)', description: 'After coordination, notify the ITU for recording in the Master International Frequency Register. This provides international recognition and protection.', estimatedTimeline: '1-2 years', estimatedCost: 'ITU cost recovery charges' },
      { step: 6, agency: 'ITU', requirement: 'Due Diligence / Milestone Compliance', description: 'Meet ITU milestone requirements demonstrating genuine progress toward satellite deployment. Failure to meet milestones can result in loss of filing priority.', estimatedTimeline: 'Per ITU milestone schedule', estimatedCost: 'Deployment costs' },
    ],
    tips: ['Begin ITU filings as early as possible -- spectrum rights are based on filing priority','Hire experienced spectrum engineers and regulatory counsel for ITU coordination','Consider multiple frequency bands for operational flexibility and redundancy','Monitor WRC outcomes as they can change spectrum allocation landscape significantly'],
    commonPitfalls: ['Missing ITU milestone deadlines resulting in cancellation of filing rights','Underestimating the complexity and duration of NGSO-GSO coordination','Not accounting for coordination with non-US satellite systems in the same bands','Failing to coordinate with terrestrial services that share satellite frequency bands'],
  },
];

// ############################################################################
// REGULATORY BODIES TAB
// ############################################################################

export function RegulatoryBodiesRefTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return KEY_REGULATORY_BODIES.filter((body) => {
      if (categoryFilter && body.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          body.name.toLowerCase().includes(q) ||
          body.abbreviation.toLowerCase().includes(q) ||
          body.primaryFunction.toLowerCase().includes(q) ||
          body.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, categoryFilter]);

  return (
    <div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-400 mb-2">Key Space Regulatory Bodies</h4>
        <p className="text-sm text-slate-400">Essential regulatory authorities governing commercial space activities. Understanding which agencies regulate your operations is the first step toward compliance.</p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Search</label>
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search regulatory bodies..." aria-label="Search regulatory bodies" className="w-full bg-white/[0.06] border border-white/[0.1] text-white/90 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/15 placeholder:text-slate-400" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none">
              <option value="">All Categories</option>
              <option value="us_licensing">US Licensing</option>
              <option value="international">International</option>
              <option value="export_control">Export Control</option>
            </select>
          </div>
          {(searchQuery || categoryFilter) && (
            <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} className="text-sm text-white/90 hover:text-white py-2">Clear Filters</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {(Object.entries(REGULATORY_BODY_REF_CATEGORY_CONFIG) as [RegulatoryBodyRefCategory, typeof REGULATORY_BODY_REF_CATEGORY_CONFIG[RegulatoryBodyRefCategory]][]).map(([cat, config]) => {
          const count = KEY_REGULATORY_BODIES.filter((b) => b.category === cat).length;
          return (
            <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)} className={`card-elevated p-4 text-center transition-all cursor-pointer ${categoryFilter === cat ? 'ring-2 ring-white/15' : ''}`}>
              <div className={`text-2xl font-bold font-display ${config.text}`}>{count}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">{config.label}</div>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filtered.map((body) => {
          const catConfig = REGULATORY_BODY_REF_CATEGORY_CONFIG[body.category];
          const isExpanded = expandedId === body.id;
          return (
            <div key={body.id} className="card p-5 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-xl font-bold text-white">{body.abbreviation}</h4>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>{catConfig.label}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{body.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
                <span>Jurisdiction: {body.jurisdiction}</span>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.1] rounded-lg p-3 mb-3">
                <p className="text-sm text-white/90 font-medium">{body.primaryFunction}</p>
              </div>
              <p className="text-slate-400 text-sm mb-3 leading-relaxed">{body.description}</p>
              <button onClick={() => setExpandedId(isExpanded ? null : body.id)} className="text-sm text-white/90 hover:text-white transition-colors">
                {isExpanded ? 'Show Less' : 'View Details'}
              </button>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-4">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Key Responsibilities</h5>
                    <ul className="space-y-1.5">
                      {body.keyResponsibilities.map((resp, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <svg className="w-3 h-3 text-slate-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Space Industry Relevance</h5>
                    <p className="text-xs text-slate-400">{body.spaceRelevance}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Recent Developments</h5>
                    <ul className="space-y-1.5">
                      {body.recentDevelopments.map((dev, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <span className="text-yellow-400 flex-shrink-0 mt-0.5">*</span>
                          {dev}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
                    <span>{body.contactInfo}</span>
                    <a href={body.website} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white">Visit Website &rarr;</a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold text-white mb-2">No regulatory bodies match your search</h3>
          <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} className="text-white/90 hover:text-white text-sm transition-colors">Clear All Filters</button>
        </div>
      )}
    </div>
  );
}

// ############################################################################
// KEY REGULATIONS TAB
// ############################################################################

export function KeyRegulationsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return KEY_REGULATIONS.filter((reg) => {
      if (categoryFilter && reg.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          reg.name.toLowerCase().includes(q) ||
          reg.shortName.toLowerCase().includes(q) ||
          reg.description.toLowerCase().includes(q) ||
          reg.authority.toLowerCase().includes(q) ||
          (reg.cfrReference && reg.cfrReference.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [searchQuery, categoryFilter]);

  return (
    <div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-purple-400 mb-2">Key Space Regulations & Treaties</h4>
        <p className="text-sm text-slate-400">The core legal instruments governing commercial space activities, from foundational international treaties to specific US regulatory frameworks. Each entry includes key provisions, penalties, and recent amendments.</p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Search</label>
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search regulations, treaties, CFR references..." aria-label="Search regulations" className="w-full bg-white/[0.06] border border-white/[0.1] text-white/90 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/15 placeholder:text-slate-400" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none">
              <option value="">All Categories</option>
              <option value="international_treaty">International Treaties</option>
              <option value="us_export_control">US Export Controls</option>
              <option value="us_licensing_rule">US Licensing Rules</option>
            </select>
          </div>
          {(searchQuery || categoryFilter) && (
            <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} className="text-sm text-white/90 hover:text-white py-2">Clear Filters</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(Object.entries(REGULATION_CATEGORY_CONFIG) as [RegulationCategory, typeof REGULATION_CATEGORY_CONFIG[RegulationCategory]][]).map(([cat, config]) => {
          const count = KEY_REGULATIONS.filter((r) => r.category === cat).length;
          return (
            <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)} className={`card-elevated p-4 text-center transition-all cursor-pointer ${categoryFilter === cat ? 'ring-2 ring-white/15' : ''}`}>
              <div className={`text-2xl font-bold font-display ${config.text}`}>{count}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">{config.label}</div>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filtered.map((reg) => {
          const catConfig = REGULATION_CATEGORY_CONFIG[reg.category];
          const isExpanded = expandedId === reg.id;
          return (
            <div key={reg.id} className="card p-5 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-lg mb-1">{reg.shortName}</h4>
                  <p className="text-slate-400 text-xs line-clamp-2">{reg.name}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>{catConfig.label}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
                <span>Year: {reg.year}</span>
                <span>Authority: {reg.authority}</span>
                {reg.cfrReference && <span className="font-mono text-white/90">{reg.cfrReference}</span>}
              </div>
              <p className="text-slate-400 text-sm mb-3 leading-relaxed line-clamp-3">{reg.description}</p>
              <button onClick={() => setExpandedId(isExpanded ? null : reg.id)} className="text-sm text-white/90 hover:text-white transition-colors">
                {isExpanded ? 'Show Less' : 'View Full Details'}
              </button>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-4">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Key Provisions</h5>
                    <ul className="space-y-1.5">
                      {reg.keyProvisions.map((provision, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <svg className="w-3 h-3 text-slate-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          {provision}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/[0.04] border border-white/[0.1] rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Applicability</h5>
                      <p className="text-xs text-slate-400">{reg.applicability}</p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wider">Penalties</h5>
                      <p className="text-xs text-slate-400">{reg.penalties}</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Recent Amendments & Developments</h5>
                    <ul className="space-y-1.5">
                      {reg.recentAmendments.map((amendment, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <span className="text-yellow-400 flex-shrink-0 mt-0.5">*</span>
                          {amendment}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a href={reg.furtherReading} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-white/90 hover:text-white">View Full Text / Further Reading &rarr;</a>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold text-white mb-2">No regulations match your search</h3>
          <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} className="text-white/90 hover:text-white text-sm transition-colors">Clear All Filters</button>
        </div>
      )}
    </div>
  );
}

// ############################################################################
// COMPLIANCE CHECKLISTS TAB
// ############################################################################

export function ComplianceChecklistsTab() {
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistActivityId>('launch_satellite');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const checklist = COMPLIANCE_CHECKLISTS.find((c) => c.id === selectedChecklist) || COMPLIANCE_CHECKLISTS[0];

  const handleToggleStep = useCallback((checklistId: string, step: number) => {
    const key = `${checklistId}-${step}`;
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const completionCount = checklist.steps.filter((s) => completedSteps.has(`${checklist.id}-${s.step}`)).length;
  const completionPct = Math.round((completionCount / checklist.steps.length) * 100);

  const filteredSteps = useMemo(() => {
    if (!searchQuery) return checklist.steps;
    const q = searchQuery.toLowerCase();
    return checklist.steps.filter(
      (s) =>
        s.requirement.toLowerCase().includes(q) ||
        s.agency.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [checklist.steps, searchQuery]);

  return (
    <div>
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-green-400 mb-2">Compliance Checklists</h4>
        <p className="text-sm text-slate-400">Step-by-step regulatory checklists for common space activities. Select an activity below to see all required licenses, approvals, and registrations with estimated timelines and costs. Track your progress with the interactive checklist.</p>
      </div>

      {/* Activity Selector */}
      <div className="relative mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {COMPLIANCE_CHECKLISTS.map((cl) => {
            const complexityConfig = CHECKLIST_COMPLEXITY_CONFIG[cl.complexity];
            return (
              <button
                key={cl.id}
                onClick={() => { setSelectedChecklist(cl.id); setCompletedSteps(new Set()); setSearchQuery(''); }}
                className={`flex flex-col items-start px-4 py-3 rounded-lg transition-all whitespace-nowrap min-w-[180px] ${
                  selectedChecklist === cl.id
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.1]'
                }`}
              >
                <span className="text-sm font-semibold">{cl.activity}</span>
                <span className={`text-xs mt-1 px-2 py-0.5 rounded ${complexityConfig.bg} ${complexityConfig.text}`}>{complexityConfig.label}</span>
              </button>
            );
          })}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Checklist Header */}
      <div className="card p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{checklist.activity}</h3>
            <p className="text-sm text-slate-400">{checklist.description}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <div className="text-2xl font-bold text-white">{checklist.totalEstimatedTimeline}</div>
            <div className="text-xs text-slate-400">Estimated Total Timeline</div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progress: {completionCount}/{checklist.steps.length} steps</span>
            <span className="text-sm font-bold text-white/90">{completionPct}%</span>
          </div>
          <div className="h-3 bg-white/[0.08] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-white to-slate-400 rounded-full transition-all duration-300" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      {/* Search within steps */}
      <div className="mb-4">
        <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search within checklist steps..." aria-label="Search checklist steps" className="w-full md:w-96 bg-white/[0.06] border border-white/[0.1] text-white/90 rounded-lg px-4 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:border-white/15" />
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-8">
        {filteredSteps.map((step) => {
          const isCompleted = completedSteps.has(`${checklist.id}-${step.step}`);
          return (
            <div key={step.step} className={`card p-4 transition-all ${isCompleted ? 'border-green-500/30 bg-green-500/5' : 'hover:border-white/10'}`}>
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleStep(checklist.id, step.step)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/[0.04] text-slate-400 border border-white/[0.1] hover:border-white/15'
                  }`}
                  aria-label={`${isCompleted ? 'Uncheck' : 'Check'} step ${step.step}`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className="text-sm font-bold">{step.step}</span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white/90 bg-white/[0.08] px-2 py-0.5 rounded">{step.agency}</span>
                        <h4 className={`font-semibold text-sm ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>{step.requirement}</h4>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{step.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>Timeline: <span className="text-white font-medium">{step.estimatedTimeline}</span></span>
                    <span>Cost: <span className="text-white font-medium">{step.estimatedCost}</span></span>
                  </div>
                  {step.notes && (
                    <div className="mt-2 bg-yellow-500/5 border border-yellow-500/20 rounded px-3 py-1.5">
                      <p className="text-xs text-yellow-400">{step.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips and Pitfalls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-4">Tips for Success</h4>
          <ul className="space-y-2">
            {checklist.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <svg className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">Common Pitfalls to Avoid</h4>
          <ul className="space-y-2">
            {checklist.commonPitfalls.map((pitfall, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-red-400 flex-shrink-0 mt-0.5 text-sm">!</span>
                {pitfall}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
