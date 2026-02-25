'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Regulation {
  title: string;
  authority: string;
  type: 'treaty' | 'regulation' | 'law' | 'guideline' | 'accord' | 'policy';
  jurisdiction: 'international' | 'us' | 'eu' | 'uk' | 'france' | 'luxembourg' | 'uae' | 'japan' | 'australia' | 'multi-national';
  effectiveDate: string;
  status: 'active' | 'proposed' | 'amended';
  summary: string;
  keyProvisions: string[];
  affectedActivities: string[];
  complianceBurden: 'low' | 'medium' | 'high' | 'critical';
}

// ---------------------------------------------------------------------------
// Static Data -- 32 regulations
// ---------------------------------------------------------------------------

const REGULATIONS: Regulation[] = [
  // ── International Treaties ──────────────────────────────────────────────
  {
    title: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space (Outer Space Treaty)',
    authority: 'United Nations',
    type: 'treaty',
    jurisdiction: 'international',
    effectiveDate: '1967-10-10',
    status: 'active',
    summary:
      'The foundational treaty of international space law. Establishes that outer space is free for exploration by all nations, prohibits national appropriation of celestial bodies, and bans weapons of mass destruction in space.',
    keyProvisions: [
      'Outer space free for exploration and use by all states',
      'No national appropriation of outer space or celestial bodies',
      'Prohibition of nuclear weapons and WMDs in space',
      'States bear international responsibility for national space activities',
      'Astronauts regarded as envoys of mankind',
    ],
    affectedActivities: ['All space operations', 'Launch activities', 'Satellite deployment', 'Space resource utilization'],
    complianceBurden: 'medium',
  },
  {
    title: 'Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space (Rescue Agreement)',
    authority: 'United Nations',
    type: 'treaty',
    jurisdiction: 'international',
    effectiveDate: '1968-12-03',
    status: 'active',
    summary:
      'Requires signatories to provide all possible assistance to astronauts in distress and promptly return them and any space objects to the launching state.',
    keyProvisions: [
      'Immediate notification of astronaut distress',
      'All possible rescue assistance to astronauts',
      'Return of astronauts to launching state',
      'Return of space objects found beyond launching state territory',
    ],
    affectedActivities: ['Crewed missions', 'Launch operations', 'Re-entry operations'],
    complianceBurden: 'low',
  },
  {
    title: 'Convention on International Liability for Damage Caused by Space Objects (Liability Convention)',
    authority: 'United Nations',
    type: 'treaty',
    jurisdiction: 'international',
    effectiveDate: '1972-09-01',
    status: 'active',
    summary:
      'Establishes absolute liability for damage caused on Earth by space objects and fault-based liability for damage in outer space. Defines claims procedures between states.',
    keyProvisions: [
      'Absolute liability for surface damage by space objects',
      'Fault-based liability for damage in outer space',
      'Claims presented through diplomatic channels',
      'Claims Commission established for unresolved disputes',
      'Joint launches create joint and several liability',
    ],
    affectedActivities: ['Launch operations', 'Satellite operations', 'Orbital maneuvers', 'De-orbit and re-entry'],
    complianceBurden: 'high',
  },
  {
    title: 'Convention on Registration of Objects Launched into Outer Space (Registration Convention)',
    authority: 'United Nations',
    type: 'treaty',
    jurisdiction: 'international',
    effectiveDate: '1976-09-15',
    status: 'active',
    summary:
      'Requires launching states to maintain a national registry and provide orbital data to the UN Secretary-General for inclusion in a central UN register.',
    keyProvisions: [
      'Mandatory national registry of space objects',
      'Notification to the UN Secretary-General',
      'Required orbital parameters: apogee, perigee, inclination, period',
      'General function of the space object disclosed',
    ],
    affectedActivities: ['Satellite deployment', 'Launch operations', 'Constellation management'],
    complianceBurden: 'medium',
  },
  {
    title: 'Agreement Governing the Activities of States on the Moon and Other Celestial Bodies (Moon Agreement)',
    authority: 'United Nations',
    type: 'treaty',
    jurisdiction: 'international',
    effectiveDate: '1984-07-11',
    status: 'active',
    summary:
      'Declares the Moon and its natural resources as the common heritage of mankind. Few major spacefaring nations have ratified this treaty, limiting its practical impact.',
    keyProvisions: [
      'Moon and resources are common heritage of mankind',
      'Exclusive use of celestial bodies for peaceful purposes',
      'International regime for resource exploitation required',
      'Freedom of scientific investigation',
      'Prohibition of military bases and weapons testing',
    ],
    affectedActivities: ['Lunar missions', 'Space resource mining', 'Celestial body exploration'],
    complianceBurden: 'low',
  },

  // ── United States Regulations ───────────────────────────────────────────
  {
    title: 'International Traffic in Arms Regulations (ITAR)',
    authority: 'U.S. Department of State / DDTC',
    type: 'regulation',
    jurisdiction: 'us',
    effectiveDate: '1976-01-01',
    status: 'amended',
    summary:
      'Controls the export and import of defense-related articles and services listed on the United States Munitions List (USML). Space launch vehicles, satellites, and related technical data fall under strict ITAR controls.',
    keyProvisions: [
      'USML Category IV covers launch vehicles and guided missiles',
      'USML Category XV covers spacecraft and related articles',
      'Technical Assistance Agreements (TAA) required for foreign collaboration',
      'Manufacturing License Agreements (MLA) for foreign production',
      'Violations carry severe criminal and civil penalties',
    ],
    affectedActivities: ['Satellite manufacturing', 'Launch vehicle development', 'International collaboration', 'Technology transfer'],
    complianceBurden: 'critical',
  },
  {
    title: 'Export Administration Regulations (EAR)',
    authority: 'U.S. Bureau of Industry and Security (BIS)',
    type: 'regulation',
    jurisdiction: 'us',
    effectiveDate: '1979-01-01',
    status: 'amended',
    summary:
      'Controls the export of commercial and dual-use items that could contribute to weapons proliferation or adversely affect U.S. national security. Covers many space-related components and technologies.',
    keyProvisions: [
      'Commerce Control List (CCL) categories for dual-use items',
      'License exceptions for certain exports',
      'End-use and end-user restrictions',
      'Entity List screening requirements',
      'Deemed export rules for technology released to foreign nationals',
    ],
    affectedActivities: ['Component sourcing', 'International sales', 'Technical data sharing', 'Space technology development'],
    complianceBurden: 'high',
  },
  {
    title: 'FCC Rules Part 25 -- Satellite Communications',
    authority: 'U.S. Federal Communications Commission',
    type: 'regulation',
    jurisdiction: 'us',
    effectiveDate: '1962-01-01',
    status: 'amended',
    summary:
      'Governs licensing and operation of satellite earth stations and space stations in the United States. Includes orbital debris mitigation requirements, spectrum coordination, and technical operating standards.',
    keyProvisions: [
      'Satellite network licensing and authorization',
      'Orbital debris mitigation disclosure requirements',
      'Spectrum coordination and interference protection',
      'Bond requirement for NGSO constellations',
      'Milestone-based deployment schedules for large constellations',
      '5-year post-mission de-orbit rule (updated from 25 years)',
    ],
    affectedActivities: ['Satellite communications', 'Constellation deployment', 'Spectrum management', 'Ground station operations'],
    complianceBurden: 'high',
  },
  {
    title: 'FAA Commercial Space Transportation Regulations (14 CFR Part 450)',
    authority: 'U.S. Federal Aviation Administration / AST',
    type: 'regulation',
    jurisdiction: 'us',
    effectiveDate: '2021-03-10',
    status: 'active',
    summary:
      'Streamlined, performance-based licensing framework for commercial launch and re-entry vehicles. Replaced legacy Parts 415, 417, 431, and 435 with a single unified part.',
    keyProvisions: [
      'Single vehicle operator license covers all launch/re-entry',
      'Performance-based safety requirements',
      'Flight safety analysis with quantitative risk criteria',
      'Maximum public risk thresholds (Ec < 1x10^-4 per launch)',
      'Environmental review under NEPA required',
      'Financial responsibility requirements for third-party liability',
    ],
    affectedActivities: ['Launch operations', 'Re-entry operations', 'Spaceport operations', 'Suborbital flights'],
    complianceBurden: 'critical',
  },
  {
    title: 'NASA Technology Transfer and Licensing Regulations',
    authority: 'National Aeronautics and Space Administration',
    type: 'regulation',
    jurisdiction: 'us',
    effectiveDate: '1958-07-29',
    status: 'amended',
    summary:
      'Governs the licensing and commercialization of NASA-developed technologies. Establishes frameworks for patent licensing, software usage agreements, and cooperative research partnerships.',
    keyProvisions: [
      'Patent licensing for NASA-developed inventions',
      'Software usage agreements for NASA code',
      'Space Act Agreements for cooperative R&D',
      'Reporting and compliance requirements for licensees',
      'Preference for small businesses and startups',
    ],
    affectedActivities: ['Technology commercialization', 'Spin-off products', 'Research partnerships', 'Software licensing'],
    complianceBurden: 'medium',
  },
  {
    title: 'NOAA Commercial Remote Sensing Licensing (15 CFR Part 960)',
    authority: 'U.S. National Oceanic and Atmospheric Administration',
    type: 'regulation',
    jurisdiction: 'us',
    effectiveDate: '2020-05-20',
    status: 'active',
    summary:
      'Modernized licensing framework for private remote sensing satellite systems. Streamlined the process by removing tiered licensing and reducing compliance burdens on commercial operators.',
    keyProvisions: [
      'Single-tier licensing for all remote sensing systems',
      'Notification-only for most standard system types',
      'Data distribution without shutter control for most operators',
      'Annual reporting requirements',
      'Temporary operational restrictions in national security situations',
    ],
    affectedActivities: ['Earth observation', 'Remote sensing operations', 'Geospatial data services', 'Imaging satellites'],
    complianceBurden: 'medium',
  },
  {
    title: 'U.S. Commercial Space Launch Competitiveness Act (CSLCA)',
    authority: 'U.S. Congress',
    type: 'law',
    jurisdiction: 'us',
    effectiveDate: '2015-11-25',
    status: 'active',
    summary:
      'Grants U.S. citizens the right to own, transport, use, and sell space resources obtained from asteroids and other celestial bodies. Extends the FAA launch liability learning period for commercial spaceflight participants.',
    keyProvisions: [
      'Right to possess and sell extracted space resources',
      'No assertion of sovereignty or ownership over celestial bodies',
      'Extension of learning period for spaceflight participant liability',
      'Codification of launch indemnification regime',
    ],
    affectedActivities: ['Space mining', 'Asteroid resource extraction', 'Commercial spaceflight', 'Space tourism'],
    complianceBurden: 'low',
  },

  // ── European Union Regulations ──────────────────────────────────────────
  {
    title: 'EU Space Programme Regulation (2021/696)',
    authority: 'European Parliament and Council',
    type: 'regulation',
    jurisdiction: 'eu',
    effectiveDate: '2021-05-12',
    status: 'active',
    summary:
      'Establishes the EU Space Programme and the European Union Agency for the Space Programme (EUSPA). Consolidates governance of Galileo, EGNOS, Copernicus, and SSA/GOVSATCOM under one regulatory framework.',
    keyProvisions: [
      'Unified governance for Galileo, Copernicus, EGNOS',
      'EU Agency for the Space Programme (EUSPA) mandate',
      'Space Situational Awareness (SSA) and Space Traffic Management',
      'GOVSATCOM secure satellite communications',
      'Budget framework of EUR 14.88 billion (2021-2027)',
    ],
    affectedActivities: ['EU navigation services', 'Earth observation', 'Satellite communications', 'Space surveillance'],
    complianceBurden: 'medium',
  },
  {
    title: 'Copernicus Data and Information Policy',
    authority: 'European Commission / EUSPA',
    type: 'policy',
    jurisdiction: 'eu',
    effectiveDate: '2013-12-03',
    status: 'amended',
    summary:
      'Establishes the free, full, and open data policy for the Copernicus Earth observation programme. Sentinel satellite data is available at no cost to all users worldwide for any purpose.',
    keyProvisions: [
      'Free, full, and open access to all Copernicus data',
      'No restrictions on use, reproduction, or redistribution',
      'User registration required for data access',
      'Security restrictions may apply to high-resolution data',
      'Attribution requirement for Copernicus data products',
    ],
    affectedActivities: ['Earth observation analytics', 'Environmental monitoring', 'Agricultural services', 'Disaster response'],
    complianceBurden: 'low',
  },
  {
    title: 'Galileo Security Framework and PRS Access Rules',
    authority: 'European Commission / GSA',
    type: 'regulation',
    jurisdiction: 'eu',
    effectiveDate: '2011-09-22',
    status: 'amended',
    summary:
      'Establishes security governance for the Galileo satellite navigation system, including the Public Regulated Service (PRS) restricted to government-authorized users. Defines threat assessment, encryption management, and access control procedures.',
    keyProvisions: [
      'PRS restricted to government-authorized users',
      'Security accreditation for all Galileo components',
      'Encryption and anti-spoofing protocols',
      'Member State PRS competent authorities',
      'Export control for PRS receivers',
    ],
    affectedActivities: ['Satellite navigation services', 'Timing infrastructure', 'Critical infrastructure', 'Defense navigation'],
    complianceBurden: 'high',
  },
  {
    title: 'EU Space Law -- Proposed Regulation on Space Traffic Management',
    authority: 'European Commission',
    type: 'regulation',
    jurisdiction: 'eu',
    effectiveDate: '2024-01-01',
    status: 'proposed',
    summary:
      'Draft framework for EU-level space traffic management rules, including mandatory collision avoidance, space debris mitigation standards, and a coordinated EU space surveillance and tracking (SST) capability.',
    keyProvisions: [
      'Mandatory collision avoidance maneuver capability',
      'Post-mission disposal within 5 years',
      'Debris mitigation design standards for new satellites',
      'EU Space Surveillance and Tracking (SST) network participation',
      'Reporting requirements for close-approach events',
    ],
    affectedActivities: ['Satellite operations', 'Constellation management', 'Launch planning', 'End-of-life disposal'],
    complianceBurden: 'high',
  },

  // ── National Space Laws ─────────────────────────────────────────────────
  {
    title: 'UK Space Industry Act 2018',
    authority: 'UK Parliament / Civil Aviation Authority',
    type: 'law',
    jurisdiction: 'uk',
    effectiveDate: '2018-03-15',
    status: 'active',
    summary:
      'Establishes the regulatory framework for spaceflight activities carried out from the United Kingdom. Covers launch, orbital operations, and spaceport licensing, with the CAA as the regulator.',
    keyProvisions: [
      'Operator and spaceport licensing by the CAA',
      'Third-party liability and indemnification requirements',
      'Range safety and ground hazard assessment',
      'Environmental impact assessment mandatory',
      'Informed consent from spaceflight participants',
    ],
    affectedActivities: ['Launch from UK territory', 'Spaceport operations', 'Sub-orbital spaceflight', 'UK satellite operations'],
    complianceBurden: 'high',
  },
  {
    title: 'French Space Operations Act (Loi relative aux operations spatiales)',
    authority: 'French Government / CNES',
    type: 'law',
    jurisdiction: 'france',
    effectiveDate: '2008-06-03',
    status: 'active',
    summary:
      'Comprehensive national space law requiring authorization for all space operations conducted by French entities or from French territory. CNES provides technical oversight and compliance verification.',
    keyProvisions: [
      'Authorization required for launch, in-orbit operations, and re-entry',
      'Technical regulations based on CNES safety standards',
      'Operator liability for surface damage (strict) and in-orbit damage (fault)',
      'Financial guarantee requirements',
      'State guarantee beyond operator financial cap',
      'Post-mission passivation and disposal requirements',
    ],
    affectedActivities: ['Launch from French Guiana', 'French satellite operations', 'European space missions', 'Ariane launches'],
    complianceBurden: 'high',
  },
  {
    title: 'Luxembourg Law on the Exploration and Use of Space Resources',
    authority: 'Government of Luxembourg',
    type: 'law',
    jurisdiction: 'luxembourg',
    effectiveDate: '2017-08-01',
    status: 'active',
    summary:
      'First European national law to provide a legal framework for the ownership of space resources extracted by private companies. Positions Luxembourg as a hub for space mining ventures.',
    keyProvisions: [
      'Private companies can own extracted space resources',
      'Authorization required from Luxembourg government',
      'Company must be established or headquartered in Luxembourg',
      'No claim of sovereignty over celestial bodies',
      'Government supervisory regime for authorized operators',
    ],
    affectedActivities: ['Space mining', 'Asteroid resource extraction', 'In-situ resource utilization', 'Space manufacturing'],
    complianceBurden: 'medium',
  },
  {
    title: 'UAE Federal Law No. 12 of 2019 on the Regulation of the Space Sector',
    authority: 'UAE Space Agency',
    type: 'law',
    jurisdiction: 'uae',
    effectiveDate: '2020-01-17',
    status: 'active',
    summary:
      'Comprehensive space law establishing a licensing and regulatory framework for space activities conducted from or by entities in the UAE. Supports the UAE National Space Strategy 2030.',
    keyProvisions: [
      'Space activity permits issued by UAE Space Agency',
      'Registration of space objects with national registry',
      'Operator liability provisions for damages',
      'Technology transfer and IP protection',
      'Space debris mitigation and end-of-life compliance',
      'Fines and penalties for unauthorized activities',
    ],
    affectedActivities: ['Satellite manufacturing in UAE', 'Launch operations', 'Ground segment operations', 'Space tourism'],
    complianceBurden: 'medium',
  },
  {
    title: 'Japan Space Activities Act (Act No. 76 of 2016)',
    authority: 'Government of Japan / Cabinet Office',
    type: 'law',
    jurisdiction: 'japan',
    effectiveDate: '2016-11-16',
    status: 'active',
    summary:
      'Establishes a licensing framework for launch and satellite operations by Japanese private entities. Includes third-party liability provisions with government indemnification beyond the operator cap.',
    keyProvisions: [
      'Launch activity licensing by the Prime Minister',
      'Satellite management licensing',
      'Mandatory third-party liability insurance',
      'Government indemnification beyond operator liability cap',
      'Safety review and compliance inspection regime',
    ],
    affectedActivities: ['Japanese commercial launches', 'Satellite operations', 'Rocket development', 'Space tourism'],
    complianceBurden: 'medium',
  },
  {
    title: 'Australian Space (Launches and Returns) Act 2018',
    authority: 'Australian Space Agency',
    type: 'law',
    jurisdiction: 'australia',
    effectiveDate: '2019-06-29',
    status: 'active',
    summary:
      'Modernized Australian space legislation covering launch, return, and high-power rocket operations. Includes simplified pathways for small launch vehicles and suborbital missions.',
    keyProvisions: [
      'Launch permits and overseas launch certificates',
      'Return authorization for re-entry vehicles',
      'Liability provisions aligned with Liability Convention',
      'Simplified process for launches of reduced complexity',
      'Insurance and financial requirements for operators',
    ],
    affectedActivities: ['Launch from Australia', 'Sub-orbital launches', 'Small launch vehicles', 'High-power rocketry'],
    complianceBurden: 'medium',
  },

  // ── Emerging Frameworks & Guidelines ────────────────────────────────────
  {
    title: 'IADC Space Debris Mitigation Guidelines',
    authority: 'Inter-Agency Space Debris Coordination Committee',
    type: 'guideline',
    jurisdiction: 'international',
    effectiveDate: '2002-10-15',
    status: 'amended',
    summary:
      'Non-binding best-practice guidelines for debris mitigation adopted by the major space agencies. Covers design, operations, and disposal practices to limit the growth of orbital debris.',
    keyProvisions: [
      'Limit debris released during normal operations',
      'Minimize breakup potential during operational phases',
      'Post-mission disposal within 25 years (now 5 years recommended)',
      'Avoidance of intentional destruction in orbit',
      'Passivation of all energy sources at end-of-life',
    ],
    affectedActivities: ['Satellite design', 'Mission planning', 'End-of-life operations', 'Launch vehicle upper stages'],
    complianceBurden: 'medium',
  },
  {
    title: 'UN COPUOS Long-term Sustainability of Outer Space Activities Guidelines',
    authority: 'United Nations COPUOS',
    type: 'guideline',
    jurisdiction: 'international',
    effectiveDate: '2019-06-21',
    status: 'active',
    summary:
      'Set of 21 voluntary guidelines adopted by the UN Committee on the Peaceful Uses of Outer Space to ensure the long-term sustainability of space activities for all nations.',
    keyProvisions: [
      '21 guidelines covering policy, safety, operations, and science',
      'Space situational awareness sharing among states',
      'Registration practices for space objects',
      'Conjunction assessment and collision avoidance procedures',
      'Spectrum management best practices',
    ],
    affectedActivities: ['Space operations', 'Policy development', 'International coordination', 'Space situational awareness'],
    complianceBurden: 'low',
  },
  {
    title: 'Artemis Accords',
    authority: 'United States / International Partners',
    type: 'accord',
    jurisdiction: 'multi-national',
    effectiveDate: '2020-10-13',
    status: 'active',
    summary:
      'Bilateral accords establishing principles for cooperative civil space exploration consistent with the Outer Space Treaty. Over 40 nations have signed as of 2025, supporting sustainable lunar exploration.',
    keyProvisions: [
      'Peaceful purposes and transparency of space activities',
      'Interoperability of space systems',
      'Emergency assistance to astronauts in distress',
      'Registration of space objects',
      'Release of scientific data publicly',
      'Preservation of outer space heritage sites',
      'Space resource extraction consistent with Outer Space Treaty',
      'Deconfliction of activities through safety zones',
    ],
    affectedActivities: ['Lunar exploration', 'Mars missions', 'International cooperation', 'Space resource utilization'],
    complianceBurden: 'medium',
  },
  {
    title: 'ITU Radio Regulations for Space Services',
    authority: 'International Telecommunication Union',
    type: 'regulation',
    jurisdiction: 'international',
    effectiveDate: '1906-01-01',
    status: 'amended',
    summary:
      'International treaty governing the global use of the radio-frequency spectrum and geostationary-satellite and non-geostationary-satellite orbits. Mandatory for all ITU member states.',
    keyProvisions: [
      'Frequency allocation table for space services',
      'Coordination procedures for satellite networks',
      'Notification and recording in the Master International Frequency Register',
      'Due diligence requirements for bringing into use',
      'Harmful interference protection obligations',
    ],
    affectedActivities: ['Spectrum licensing', 'Satellite communications', 'Ground station operations', 'Constellation coordination'],
    complianceBurden: 'high',
  },
  {
    title: 'Space Traffic Management Framework Proposal',
    authority: 'U.S. Department of Commerce (proposed)',
    type: 'regulation',
    jurisdiction: 'us',
    effectiveDate: '2025-01-01',
    status: 'proposed',
    summary:
      'Proposed civilian-led space traffic management framework to replace DoD as the primary provider of space situational awareness data to commercial operators. Would create a civil open-architecture data repository.',
    keyProvisions: [
      'Civil SSA data repository open to commercial users',
      'Standardized conjunction notifications',
      'Commercial SSA data provider integration',
      'Voluntary best practices for collision avoidance',
      'International data-sharing agreements',
    ],
    affectedActivities: ['Satellite operations', 'Conjunction assessment', 'Collision avoidance', 'SSA data services'],
    complianceBurden: 'medium',
  },
  {
    title: 'ISO 24113 -- Space Debris Mitigation Requirements',
    authority: 'International Organization for Standardization',
    type: 'guideline',
    jurisdiction: 'international',
    effectiveDate: '2011-05-15',
    status: 'amended',
    summary:
      'International standard defining requirements for the design and operation of space systems to mitigate the creation of orbital debris. Referenced by many national regulators in their licensing conditions.',
    keyProvisions: [
      'Debris release limitation during mission phases',
      'Controlled re-entry or graveyard orbit disposal',
      'Passivation of stored energy at end-of-life',
      'Collision avoidance capability requirements',
      'Probability of successful disposal > 0.9',
    ],
    affectedActivities: ['Satellite design', 'Mission assurance', 'Regulatory compliance', 'Launch licensing'],
    complianceBurden: 'medium',
  },
  {
    title: 'Proposed UN Convention on Space Resource Activities',
    authority: 'United Nations / The Hague Working Group',
    type: 'treaty',
    jurisdiction: 'international',
    effectiveDate: '2026-01-01',
    status: 'proposed',
    summary:
      'Draft international framework based on The Hague Building Blocks for developing an international regime for space resource activities. Aims to balance national legislation like the U.S. CSLCA and Luxembourg law with international consensus.',
    keyProvisions: [
      'Priority rights for space resource extraction areas',
      'Benefit-sharing mechanisms for developing nations',
      'Environmental impact assessment for extraction activities',
      'International registry of resource utilization zones',
      'Dispute resolution mechanisms',
    ],
    affectedActivities: ['Space mining', 'Lunar resource extraction', 'Asteroid mining', 'In-situ resource utilization'],
    complianceBurden: 'high',
  },
  {
    title: 'ECSS Space Sustainability Standards (ECSS-U-AS-10C)',
    authority: 'European Cooperation for Space Standardization',
    type: 'guideline',
    jurisdiction: 'eu',
    effectiveDate: '2023-03-01',
    status: 'active',
    summary:
      'European technical standard defining sustainability requirements for space missions, including design-for-demise, active debris removal compatibility, and environmental impact quantification.',
    keyProvisions: [
      'Design-for-demise requirements for re-entering objects',
      'ADR compatibility interface standards',
      'Quantified environmental impact metrics',
      'Servicing and refueling interface recommendations',
      'Lifecycle sustainability assessment methodology',
    ],
    affectedActivities: ['European space missions', 'Satellite design', 'ESA procurement', 'Debris removal services'],
    complianceBurden: 'medium',
  },
  {
    title: 'FCC Space Innovation Rules -- In-Space Servicing, Assembly, and Manufacturing (ISAM)',
    authority: 'U.S. Federal Communications Commission',
    type: 'regulation',
    jurisdiction: 'us',
    effectiveDate: '2025-06-01',
    status: 'proposed',
    summary:
      'Proposed spectrum and licensing rules for in-space servicing, assembly, and manufacturing activities. Addresses communications for robotic servicing vehicles, on-orbit assembly, and space-based manufacturing.',
    keyProvisions: [
      'Spectrum allocations for ISAM inter-satellite links',
      'Licensing framework for proximity operations communications',
      'Interference mitigation for rendezvous operations',
      'Coordination requirements with serviced satellite operators',
      'Debris generation assessment for assembly activities',
    ],
    affectedActivities: ['On-orbit servicing', 'Space assembly', 'Space manufacturing', 'Debris removal'],
    complianceBurden: 'medium',
  },
];

// ---------------------------------------------------------------------------
// Filter & Display Configuration
// ---------------------------------------------------------------------------

const JURISDICTION_LABELS: Record<string, string> = {
  international: 'International',
  us: 'United States',
  eu: 'European Union',
  uk: 'United Kingdom',
  france: 'France',
  luxembourg: 'Luxembourg',
  uae: 'UAE',
  japan: 'Japan',
  australia: 'Australia',
  'multi-national': 'Multi-National',
};

const TYPE_LABELS: Record<string, string> = {
  treaty: 'Treaty',
  regulation: 'Regulation',
  law: 'National Law',
  guideline: 'Guideline / Standard',
  accord: 'Accord',
  policy: 'Policy',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  proposed: { label: 'Proposed', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  amended: { label: 'Amended', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const BURDEN_CONFIG: Record<string, { label: string; color: string; bars: number }> = {
  low: { label: 'Low', color: 'text-emerald-400', bars: 1 },
  medium: { label: 'Medium', color: 'text-amber-400', bars: 2 },
  high: { label: 'High', color: 'text-orange-400', bars: 3 },
  critical: { label: 'Critical', color: 'text-red-400', bars: 4 },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ComplianceBurdenIndicator({ level }: { level: string }) {
  const config = BURDEN_CONFIG[level] || BURDEN_CONFIG.medium;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1.5 rounded-sm ${
              bar <= config.bars
                ? level === 'critical'
                  ? 'bg-red-400'
                  : level === 'high'
                  ? 'bg-orange-400'
                  : level === 'medium'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
                : 'bg-slate-700'
            }`}
            style={{ height: `${8 + bar * 4}px` }}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
}

function RegulationCard({ regulation, index }: { regulation: Regulation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[regulation.status];

  return (
    <ScrollReveal delay={Math.min(index * 0.04, 0.3)}>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 hover:border-amber-500/30 transition-all duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-100 leading-snug">{regulation.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{regulation.authority}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            <ComplianceBurdenIndicator level={regulation.complianceBurden} />
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
            {TYPE_LABELS[regulation.type] || regulation.type}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
            {JURISDICTION_LABELS[regulation.jurisdiction] || regulation.jurisdiction}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
            Effective: {new Date(regulation.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-slate-300 leading-relaxed mb-3">{regulation.summary}</p>

        {/* Affected Activities */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {regulation.affectedActivities.map((activity) => (
            <span
              key={activity}
              className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"
            >
              {activity}
            </span>
          ))}
        </div>

        {/* Expandable Key Provisions */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {expanded ? 'Hide' : 'Show'} Key Provisions ({regulation.keyProvisions.length})
        </button>

        {expanded && (
          <ul className="mt-3 space-y-1.5 pl-4 border-l-2 border-amber-500/30">
            {regulation.keyProvisions.map((provision, i) => (
              <li key={i} className="text-sm text-slate-300 relative before:content-[''] before:absolute before:-left-[17px] before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-amber-500/40">
                {provision}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScrollReveal>
  );
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function StatsBar({ regulations }: { regulations: Regulation[] }) {
  const active = regulations.filter((r) => r.status === 'active').length;
  const proposed = regulations.filter((r) => r.status === 'proposed').length;
  const critical = regulations.filter((r) => r.complianceBurden === 'critical').length;
  const jurisdictions = new Set(regulations.map((r) => r.jurisdiction)).size;

  const stats = [
    { label: 'Total Regulations', value: regulations.length, color: 'text-slate-100' },
    { label: 'Active', value: active, color: 'text-emerald-400' },
    { label: 'Proposed', value: proposed, color: 'text-amber-400' },
    { label: 'Critical Burden', value: critical, color: 'text-red-400' },
    { label: 'Jurisdictions', value: jurisdictions, color: 'text-blue-400' },
  ];

  return (
    <ScrollReveal>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SpaceRegulationsExplorerPage() {
  const [search, setSearch] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [burdenFilter, setBurdenFilter] = useState<string>('all');

  // Build unique filter options from the data
  const jurisdictions = Array.from(new Set(REGULATIONS.map((r) => r.jurisdiction))).sort();
  const types = Array.from(new Set(REGULATIONS.map((r) => r.type))).sort();

  // Apply filters
  const filtered = REGULATIONS.filter((r) => {
    if (jurisdictionFilter !== 'all' && r.jurisdiction !== jurisdictionFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (burdenFilter !== 'all' && r.complianceBurden !== burdenFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const searchable = [
        r.title,
        r.authority,
        r.summary,
        ...r.keyProvisions,
        ...r.affectedActivities,
      ]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSearch('');
    setJurisdictionFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setBurdenFilter('all');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    jurisdictionFilter !== 'all' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    burdenFilter !== 'all';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Regulations Explorer"
          subtitle="Searchable database of space regulations, treaties, and legal frameworks governing commercial and governmental space activities worldwide."
          icon={<span>&#9878;&#65039;</span>}
          accentColor="amber"
        />

        {/* Stats */}
        <StatsBar regulations={filtered} />

        {/* Search & Filters */}
        <ScrollReveal>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 mb-8">
            {/* Search Bar */}
            <div className="relative mb-4">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search regulations by keyword, authority, activity..."
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Jurisdiction */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Jurisdiction</label>
                <select
                  value={jurisdictionFilter}
                  onChange={(e) => setJurisdictionFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  <option value="all">All Jurisdictions</option>
                  {jurisdictions.map((j) => (
                    <option key={j} value={j}>
                      {JURISDICTION_LABELS[j] || j}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  <option value="all">All Types</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="proposed">Proposed</option>
                  <option value="amended">Amended</option>
                </select>
              </div>

              {/* Compliance Burden */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Compliance Burden</label>
                <select
                  value={burdenFilter}
                  onChange={(e) => setBurdenFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  <option value="all">All Levels</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Active Filters / Clear */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
                <p className="text-sm text-slate-400">
                  Showing <span className="text-amber-400 font-medium">{filtered.length}</span> of{' '}
                  <span className="text-slate-300">{REGULATIONS.length}</span> regulations
                </p>
                <button
                  onClick={clearFilters}
                  className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Results */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((regulation, index) => (
              <RegulationCard key={regulation.title} regulation={regulation} index={index} />
            ))}
          </div>
        ) : (
          <ScrollReveal>
            <div className="text-center py-16 bg-slate-800/30 border border-slate-700/40 rounded-xl">
              <svg
                className="w-12 h-12 mx-auto text-slate-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">No regulations found</h3>
              <p className="text-sm text-slate-500 mb-4">
                Try adjusting your search terms or clearing some filters.
              </p>
              <button
                onClick={clearFilters}
                className="text-sm px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Related Pages */}
        <ScrollReveal delay={0.2}>
          <div className="mt-12 bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                href="/compliance"
                className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700/40 rounded-lg hover:border-amber-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-2xl">&#128203;</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
                    Compliance Hub
                  </p>
                  <p className="text-xs text-slate-500">Treaties, filings & compliance tracking</p>
                </div>
              </Link>

              <Link
                href="/regulatory-risk"
                className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700/40 rounded-lg hover:border-amber-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-2xl">&#9888;&#65039;</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
                    Regulatory Risk
                  </p>
                  <p className="text-xs text-slate-500">Risk assessment & impact analysis</p>
                </div>
              </Link>

              <Link
                href="/regulatory-calendar"
                className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700/40 rounded-lg hover:border-amber-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-2xl">&#128197;</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
                    Regulatory Calendar
                  </p>
                  <p className="text-xs text-slate-500">Deadlines & upcoming changes</p>
                </div>
              </Link>

              <Link
                href="/regulation-explainers"
                className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-700/40 rounded-lg hover:border-amber-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-2xl">&#128218;</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
                    Regulation Explainers
                  </p>
                  <p className="text-xs text-slate-500">Plain-language guides & summaries</p>
                </div>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Disclaimer */}
        <ScrollReveal delay={0.3}>
          <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700/40 rounded-lg">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="text-slate-400 font-medium">Disclaimer:</span> This database is provided
              for informational purposes only and does not constitute legal advice. Regulations may have
              been amended or superseded since the effective dates listed. Always consult with qualified
              legal counsel specializing in space law before making compliance decisions. Data is current
              as of February 2026.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </main>
  );
}
