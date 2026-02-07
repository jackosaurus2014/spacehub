'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'treaties' | 'national' | 'artemis' | 'proceedings' | 'bodies';

type TreatyStatus = 'in_force' | 'open' | 'not_in_force';
type NationalLawStatus = 'enacted' | 'amended' | 'proposed' | 'under_review';
type ArtemisStatus = 'signatory' | 'implementing' | 'observer';
type ProceedingStatus = 'active' | 'resolved' | 'pending' | 'advisory';
type BodyType = 'un' | 'national' | 'regional' | 'industry';

interface Treaty {
  id: string;
  name: string;
  fullName: string;
  adoptedYear: number;
  entryIntoForceYear: number;
  status: TreatyStatus;
  ratifications: number;
  signatories: number;
  depositary: string;
  keyProvisions: string[];
  description: string;
  significance: string;
}

interface NationalLaw {
  id: string;
  country: string;
  countryCode: string;
  lawName: string;
  year: number;
  status: NationalLawStatus;
  agency: string;
  keyFeatures: string[];
  description: string;
  scope: string;
}

interface ArtemisSignatory {
  id: string;
  country: string;
  countryCode: string;
  dateSigned: string;
  region: string;
  spaceAgency: string;
  implementationStatus: ArtemisStatus;
  notes: string;
}

interface LegalProceeding {
  id: string;
  title: string;
  type: string;
  parties: string;
  status: ProceedingStatus;
  year: number;
  jurisdiction: string;
  description: string;
  significance: string;
  outcome: string;
}

interface RegulatoryBody {
  id: string;
  name: string;
  abbreviation: string;
  type: BodyType;
  headquarters: string;
  established: number;
  members: string;
  mandate: string;
  keyFunctions: string[];
  website: string;
}

// ────────────────────────────────────────
// Status Configs
// ────────────────────────────────────────

const TREATY_STATUS_CONFIG: Record<TreatyStatus, { label: string; bg: string; text: string; border: string }> = {
  in_force: { label: 'In Force', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  open: { label: 'Open for Signature', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  not_in_force: { label: 'Not Widely Ratified', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

const NATIONAL_STATUS_CONFIG: Record<NationalLawStatus, { label: string; bg: string; text: string; border: string }> = {
  enacted: { label: 'Enacted', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  amended: { label: 'Amended', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  proposed: { label: 'Proposed', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  under_review: { label: 'Under Review', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
};

const ARTEMIS_STATUS_CONFIG: Record<ArtemisStatus, { label: string; bg: string; text: string; border: string }> = {
  signatory: { label: 'Signatory', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  implementing: { label: 'Implementing', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  observer: { label: 'Observer', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

const PROCEEDING_STATUS_CONFIG: Record<ProceedingStatus, { label: string; bg: string; text: string; border: string }> = {
  active: { label: 'Active', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  resolved: { label: 'Resolved', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  advisory: { label: 'Advisory', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
};

const BODY_TYPE_CONFIG: Record<BodyType, { label: string; bg: string; text: string; border: string }> = {
  un: { label: 'UN Body', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  national: { label: 'National', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  regional: { label: 'Regional', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  industry: { label: 'Industry', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
};

// ────────────────────────────────────────
// Data: Treaties
// ────────────────────────────────────────

const TREATIES: Treaty[] = [
  {
    id: 'ost',
    name: 'Outer Space Treaty',
    fullName: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies',
    adoptedYear: 1966,
    entryIntoForceYear: 1967,
    status: 'in_force',
    ratifications: 114,
    signatories: 23,
    depositary: 'UN Secretary-General',
    keyProvisions: [
      'Outer space is free for exploration and use by all states',
      'No national appropriation of outer space or celestial bodies',
      'No weapons of mass destruction in orbit or on celestial bodies',
      'States bear international responsibility for national space activities',
      'Astronauts are envoys of mankind and must be assisted',
      'States liable for damage caused by their space objects',
    ],
    description: 'The foundational treaty of international space law, often called the "Magna Carta of Space." It establishes the basic framework for international space activities, including the peaceful use of outer space and the prohibition of sovereignty claims.',
    significance: 'The cornerstone of space law, ratified by all major spacefaring nations. Forms the basis for all subsequent space treaties and national space legislation.',
  },
  {
    id: 'rescue',
    name: 'Rescue Agreement',
    fullName: 'Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space',
    adoptedYear: 1967,
    entryIntoForceYear: 1968,
    status: 'in_force',
    ratifications: 99,
    signatories: 23,
    depositary: 'UN Secretary-General',
    keyProvisions: [
      'States shall immediately notify the launching authority of astronauts in distress',
      'States shall take all possible steps to rescue and assist astronauts in distress',
      'Astronauts shall be safely and promptly returned to the launching state',
      'Space objects found beyond the launching state must be returned',
      'Launching authority shall bear costs of recovery and return',
    ],
    description: 'Elaborates on the rescue provisions of the Outer Space Treaty. Requires states to assist astronauts in distress and return them and their space objects to the launching state.',
    significance: 'Provides detailed humanitarian obligations regarding astronauts. Has been invoked in practical scenarios involving the return of space debris landing in foreign territories.',
  },
  {
    id: 'liability',
    name: 'Liability Convention',
    fullName: 'Convention on International Liability for Damage Caused by Space Objects',
    adoptedYear: 1971,
    entryIntoForceYear: 1972,
    status: 'in_force',
    ratifications: 98,
    signatories: 19,
    depositary: 'UN Secretary-General',
    keyProvisions: [
      'Absolute liability for damage caused on the surface of the Earth or to aircraft in flight',
      'Fault-based liability for damage caused in outer space',
      'Joint and several liability when two states jointly launch',
      'Claims presented through diplomatic channels within one year',
      'Claims Commission established if no settlement reached',
    ],
    description: 'Establishes the international liability framework for damage caused by space objects. A launching state is absolutely liable for damage on Earth and fault-liable for damage in space.',
    significance: 'The only UN space treaty invoked in a formal claim: Canada v. USSR over Cosmos 954 (1978), which resulted in a $3 million settlement. Increasingly relevant as orbital debris grows.',
  },
  {
    id: 'registration',
    name: 'Registration Convention',
    fullName: 'Convention on Registration of Objects Launched into Outer Space',
    adoptedYear: 1974,
    entryIntoForceYear: 1976,
    status: 'in_force',
    ratifications: 72,
    signatories: 4,
    depositary: 'UN Secretary-General',
    keyProvisions: [
      'Launching states shall maintain a national registry of space objects',
      'Launching states shall furnish information to the UN Secretary-General',
      'Registration information includes designating name, date, launch parameters, and orbital data',
      'The UN maintains a public Register of Objects Launched into Outer Space',
      'Applies to objects launched into Earth orbit or beyond',
    ],
    description: 'Requires states to register space objects with both a national registry and the UN. Provides the legal basis for tracking jurisdiction and control over space objects.',
    significance: 'Essential for space traffic management and determining liability. The UN register now contains over 15,000 entries. Growing importance with mega-constellations.',
  },
  {
    id: 'moon',
    name: 'Moon Agreement',
    fullName: 'Agreement Governing the Activities of States on the Moon and Other Celestial Bodies',
    adoptedYear: 1979,
    entryIntoForceYear: 1984,
    status: 'not_in_force',
    ratifications: 18,
    signatories: 4,
    depositary: 'UN Secretary-General',
    keyProvisions: [
      'The Moon and its natural resources are the common heritage of mankind',
      'An international regime shall govern exploitation of natural resources',
      'Freedom of scientific investigation on the Moon',
      'Prohibition of military use beyond peaceful purposes',
      'States shall inform the UN of activities on the Moon',
      'Establishment of international stations must not impede free access',
    ],
    description: 'The most controversial of the five UN space treaties. Declares the Moon and its resources the "common heritage of mankind" and calls for an international regime to govern resource exploitation.',
    significance: 'Not ratified by any major spacefaring nation (US, Russia, China, India, Japan, ESA members). Its "common heritage" principle is directly challenged by national resource rights legislation and the Artemis Accords.',
  },
];

// ────────────────────────────────────────
// Data: National Laws
// ────────────────────────────────────────

const NATIONAL_LAWS: NationalLaw[] = [
  {
    id: 'us-csa-2015',
    country: 'United States',
    countryCode: 'US',
    lawName: 'U.S. Commercial Space Launch Competitiveness Act',
    year: 2015,
    status: 'enacted',
    agency: 'FAA / DOC',
    keyFeatures: [
      'Grants US citizens rights to own, possess, and sell space resources',
      'Extends ISS operations authorization',
      'Updates commercial launch license requirements',
      'Clarifies regulatory framework for space resource extraction',
    ],
    description: 'Landmark legislation granting US citizens the right to own and sell resources obtained from celestial bodies, while asserting this does not constitute sovereignty claims.',
    scope: 'Commercial launch, space resources, ISS operations',
  },
  {
    id: 'us-space-act-2020',
    country: 'United States',
    countryCode: 'US',
    lawName: 'National Aeronautics and Space Administration Authorization Act of 2020',
    year: 2020,
    status: 'enacted',
    agency: 'NASA / FAA',
    keyFeatures: [
      'Authorizes Artemis program and lunar exploration',
      'Supports commercial LEO economy development',
      'Establishes space situational awareness sharing requirements',
      'Directs development of orbital debris mitigation guidelines',
    ],
    description: 'Provides authorization and direction for NASA programs including Artemis, commercial LEO destinations, and space debris mitigation.',
    scope: 'Space exploration, commercial space, orbital debris',
  },
  {
    id: 'us-eo-2020',
    country: 'United States',
    countryCode: 'US',
    lawName: 'Executive Order on Encouraging International Support for the Recovery and Use of Space Resources',
    year: 2020,
    status: 'enacted',
    agency: 'White House / DOS',
    keyFeatures: [
      'Rejects Moon Agreement as reflecting customary international law',
      'Affirms US right to extract and use space resources',
      'Directs bilateral agreements on space resource rights',
      'Lays groundwork for the Artemis Accords',
    ],
    description: 'Executive order explicitly rejecting the Moon Agreement and affirming US policy supporting commercial recovery and use of space resources.',
    scope: 'Space resources policy, international engagement',
  },
  {
    id: 'lux-2017',
    country: 'Luxembourg',
    countryCode: 'LU',
    lawName: 'Law on the Exploration and Use of Space Resources',
    year: 2017,
    status: 'enacted',
    agency: 'Luxembourg Space Agency',
    keyFeatures: [
      'First European law granting property rights over space resources',
      'Requires authorization for space resource missions',
      'Company must be incorporated in Luxembourg (no nationality requirement)',
      'Government may acquire equity stakes in space mining ventures',
    ],
    description: 'Luxembourg became the first European country to enact comprehensive space resource utilization legislation, establishing itself as a hub for space mining companies.',
    scope: 'Space resource rights, commercial authorization',
  },
  {
    id: 'uae-2020',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    lawName: 'Federal Law No. 12 on the Regulation of the Space Sector',
    year: 2020,
    status: 'enacted',
    agency: 'UAE Space Agency',
    keyFeatures: [
      'Comprehensive national space law framework',
      'Permits and licensing for space activities',
      'Space resource utilization provisions',
      'Liability and insurance requirements',
      'Registration of space objects',
    ],
    description: 'Comprehensive space law covering licensing, supervision, liability, and space resource extraction. One of the most modern national space laws.',
    scope: 'All space activities, licensing, resources, liability',
  },
  {
    id: 'japan-2016',
    country: 'Japan',
    countryCode: 'JP',
    lawName: 'Space Activities Act',
    year: 2016,
    status: 'enacted',
    agency: 'JAXA / Cabinet Office',
    keyFeatures: [
      'Licensing system for launch activities',
      'Satellite control and management framework',
      'Third-party liability provisions',
      'Mandatory insurance requirements for launch operators',
    ],
    description: 'Establishes a comprehensive legal framework for Japan\'s commercial space activities including launch licensing and satellite operations.',
    scope: 'Launch activities, satellite operations, liability',
  },
  {
    id: 'japan-resources-2021',
    country: 'Japan',
    countryCode: 'JP',
    lawName: 'Space Resources Act',
    year: 2021,
    status: 'enacted',
    agency: 'Cabinet Office',
    keyFeatures: [
      'Grants rights to extract and use space resources',
      'Business plan approval system for resource activities',
      'Consistent with international space law obligations',
      'Third country in the world to pass space resource legislation',
    ],
    description: 'Japan became the third country (after the US and Luxembourg) to enact legislation recognizing property rights over extracted space resources.',
    scope: 'Space resource extraction and utilization',
  },
  {
    id: 'uk-2018',
    country: 'United Kingdom',
    countryCode: 'GB',
    lawName: 'Space Industry Act 2018',
    year: 2018,
    status: 'enacted',
    agency: 'UK Space Agency / CAA',
    keyFeatures: [
      'Licensing regime for UK launch operations',
      'Spaceflight activities from UK spaceports',
      'Operator liability and insurance requirements',
      'Orbital activities licensing framework',
      'Powers for range control and safety',
    ],
    description: 'Comprehensive legislation enabling commercial spaceflight activities from UK territory, including vertical and horizontal launch, and associated regulation.',
    scope: 'Launch operations, spaceports, orbital activities',
  },
  {
    id: 'india-2023',
    country: 'India',
    countryCode: 'IN',
    lawName: 'Indian Space Policy 2023',
    year: 2023,
    status: 'enacted',
    agency: 'ISRO / IN-SPACe / DOS',
    keyFeatures: [
      'Opens space sector to private participation',
      'IN-SPACe as single-window authorization body',
      'ISRO transitions to R&D focus',
      'NewSpace India Limited (NSIL) for commercialization',
      'Non-governmental entity participation framework',
    ],
    description: 'Landmark policy reform opening India\'s space sector to private enterprise, with ISRO refocusing on research and transferring operational activities to commercial entities.',
    scope: 'Private sector participation, commercial space activities',
  },
  {
    id: 'australia-2018',
    country: 'Australia',
    countryCode: 'AU',
    lawName: 'Space (Launches and Returns) Act 2018',
    year: 2018,
    status: 'amended',
    agency: 'Australian Space Agency',
    keyFeatures: [
      'Updated launch permit framework',
      'High-power rocket regulation',
      'Overseas launch certificates for Australian payloads',
      'Third-party liability and insurance provisions',
    ],
    description: 'Modernized Australian space legislation to support the growing commercial space sector, streamlining the licensing process for launches and returns.',
    scope: 'Launches, returns, payload operations',
  },
  {
    id: 'france-2008',
    country: 'France',
    countryCode: 'FR',
    lawName: 'French Space Operations Act (Loi relative aux operations spatiales)',
    year: 2008,
    status: 'enacted',
    agency: 'CNES',
    keyFeatures: [
      'Authorization required for all space operations by French entities',
      'Technical regulations for design and operations',
      'Operator liability capped at EUR 60 million',
      'Government guarantee above the cap',
      'Registration of space objects launched from French territory',
    ],
    description: 'One of the most comprehensive national space laws in Europe, covering authorization, technical standards, liability, and registration of French space operations.',
    scope: 'Launch operations, satellite control, liability, registration',
  },
  {
    id: 'germany-2024',
    country: 'Germany',
    countryCode: 'DE',
    lawName: 'German Space Act (Weltraumgesetz)',
    year: 2024,
    status: 'enacted',
    agency: 'German Aerospace Center (DLR)',
    keyFeatures: [
      'Licensing framework for private space activities',
      'Mandatory debris mitigation compliance',
      'Liability and insurance obligations',
      'Registry of German space objects',
    ],
    description: 'Germany\'s first dedicated national space law, providing a comprehensive framework for licensing and regulating private space activities from German territory.',
    scope: 'Private space activities, licensing, debris mitigation',
  },
  {
    id: 'eu-ssa-2023',
    country: 'European Union',
    countryCode: 'EU',
    lawName: 'EU Space Law Initiative',
    year: 2024,
    status: 'proposed',
    agency: 'European Commission / EUSPA',
    keyFeatures: [
      'Harmonized EU-wide framework for space activities',
      'Common authorization and licensing standards',
      'Space traffic management provisions',
      'Sustainability and debris mitigation requirements',
      'Competitiveness measures for European space industry',
    ],
    description: 'Proposed EU-wide space law to harmonize the regulatory framework across member states, addressing authorization, safety, sustainability, and competitiveness.',
    scope: 'EU-wide space regulation and harmonization',
  },
  {
    id: 'nz-2017',
    country: 'New Zealand',
    countryCode: 'NZ',
    lawName: 'Outer Space and High-altitude Activities Act 2017',
    year: 2017,
    status: 'enacted',
    agency: 'New Zealand Space Agency',
    keyFeatures: [
      'Licensing for launch and high-altitude vehicles',
      'Payload permits for space objects',
      'Orbital debris mitigation requirements',
      'Facility operator licenses for launch sites',
    ],
    description: 'Enacted to support Rocket Lab\'s Electron launches from the Mahia Peninsula, establishing New Zealand as a launch jurisdiction.',
    scope: 'Launch licensing, payload permits, facility operations',
  },
];

// ────────────────────────────────────────
// Data: Artemis Accords Signatories
// ────────────────────────────────────────

const ARTEMIS_PRINCIPLES: { title: string; description: string }[] = [
  { title: 'Peaceful Purposes', description: 'Cooperation under the Accords is exclusively for peaceful purposes in accordance with the Outer Space Treaty.' },
  { title: 'Transparency', description: 'Signatories commit to transparent description of their policies and plans related to civil space exploration.' },
  { title: 'Interoperability', description: 'Infrastructure and systems should be interoperable to the greatest extent practicable to enhance safety and sustainability.' },
  { title: 'Emergency Assistance', description: 'Commitment to render necessary assistance to personnel in outer space who are in distress.' },
  { title: 'Registration of Space Objects', description: 'Signatories commit to registration of space objects consistent with the Registration Convention.' },
  { title: 'Release of Scientific Data', description: 'Commitment to the public release of scientific data from civil space exploration activities.' },
  { title: 'Preserving Heritage', description: 'Commitment to preserve outer space heritage, including historically significant landing sites and artifacts.' },
  { title: 'Space Resources', description: 'Extraction and utilization of space resources should be consistent with the Outer Space Treaty, not inherently constituting national appropriation.' },
  { title: 'Deconfliction of Activities', description: 'Signatories commit to providing notification and coordinating activities to avoid harmful interference.' },
  { title: 'Orbital Debris', description: 'Commitment to plan for the safe disposal of debris and limiting the generation of new orbital debris.' },
];

const ARTEMIS_SIGNATORIES: ArtemisSignatory[] = [
  { id: 'us', country: 'United States', countryCode: 'US', dateSigned: '2020-10-13', region: 'North America', spaceAgency: 'NASA', implementationStatus: 'implementing', notes: 'Lead architect and coordinator of the Accords' },
  { id: 'au', country: 'Australia', countryCode: 'AU', dateSigned: '2020-10-13', region: 'Oceania', spaceAgency: 'ASA', implementationStatus: 'implementing', notes: 'Founding signatory, contributing to lunar rover' },
  { id: 'ca', country: 'Canada', countryCode: 'CA', dateSigned: '2020-10-13', region: 'North America', spaceAgency: 'CSA', implementationStatus: 'implementing', notes: 'Founding signatory, contributing Canadarm3 to Gateway' },
  { id: 'it', country: 'Italy', countryCode: 'IT', dateSigned: '2020-10-13', region: 'Europe', spaceAgency: 'ASI', implementationStatus: 'implementing', notes: 'Founding signatory, contributing to HALO module' },
  { id: 'jp', country: 'Japan', countryCode: 'JP', dateSigned: '2020-10-13', region: 'Asia-Pacific', spaceAgency: 'JAXA', implementationStatus: 'implementing', notes: 'Founding signatory, contributing I-HAB module and HTV-X' },
  { id: 'lu', country: 'Luxembourg', countryCode: 'LU', dateSigned: '2020-10-13', region: 'Europe', spaceAgency: 'LSA', implementationStatus: 'signatory', notes: 'Founding signatory, space resources pioneer' },
  { id: 'ae', country: 'United Arab Emirates', countryCode: 'AE', dateSigned: '2020-10-13', region: 'Middle East', spaceAgency: 'UAESA', implementationStatus: 'implementing', notes: 'Founding signatory, developing lunar rover Rashid' },
  { id: 'gb', country: 'United Kingdom', countryCode: 'GB', dateSigned: '2020-10-13', region: 'Europe', spaceAgency: 'UKSA', implementationStatus: 'implementing', notes: 'Founding signatory, ESA-NASA cooperation' },
  { id: 'ua', country: 'Ukraine', countryCode: 'UA', dateSigned: '2020-11-12', region: 'Europe', spaceAgency: 'SSAU', implementationStatus: 'signatory', notes: 'Ninth signatory to join' },
  { id: 'kr', country: 'South Korea', countryCode: 'KR', dateSigned: '2021-05-24', region: 'Asia-Pacific', spaceAgency: 'KARI/KASA', implementationStatus: 'implementing', notes: 'Active lunar exploration program with Danuri orbiter' },
  { id: 'nz', country: 'New Zealand', countryCode: 'NZ', dateSigned: '2021-05-31', region: 'Oceania', spaceAgency: 'NZSA', implementationStatus: 'signatory', notes: 'Rocket Lab launch jurisdiction' },
  { id: 'br', country: 'Brazil', countryCode: 'BR', dateSigned: '2021-06-15', region: 'South America', spaceAgency: 'AEB', implementationStatus: 'signatory', notes: 'Largest South American signatory' },
  { id: 'pl', country: 'Poland', countryCode: 'PL', dateSigned: '2021-10-26', region: 'Europe', spaceAgency: 'POLSA', implementationStatus: 'signatory', notes: 'Active ESA member state' },
  { id: 'mx', country: 'Mexico', countryCode: 'MX', dateSigned: '2021-12-09', region: 'North America', spaceAgency: 'AEM', implementationStatus: 'signatory', notes: 'Contributing to Earth observation cooperation' },
  { id: 'il', country: 'Israel', countryCode: 'IL', dateSigned: '2022-01-26', region: 'Middle East', spaceAgency: 'ISA', implementationStatus: 'signatory', notes: 'Active lunar exploration (Beresheet mission heritage)' },
  { id: 'ro', country: 'Romania', countryCode: 'RO', dateSigned: '2022-03-01', region: 'Europe', spaceAgency: 'ROSA', implementationStatus: 'signatory', notes: 'ESA cooperating state' },
  { id: 'bh', country: 'Bahrain', countryCode: 'BH', dateSigned: '2022-03-02', region: 'Middle East', spaceAgency: 'NSSA', implementationStatus: 'signatory', notes: 'Developing national space program' },
  { id: 'sg', country: 'Singapore', countryCode: 'SG', dateSigned: '2022-03-28', region: 'Asia-Pacific', spaceAgency: 'OSTIn', implementationStatus: 'signatory', notes: 'Space technology innovation hub' },
  { id: 'co', country: 'Colombia', countryCode: 'CO', dateSigned: '2022-05-10', region: 'South America', spaceAgency: 'CCE', implementationStatus: 'signatory', notes: 'Growing space program with EO focus' },
  { id: 'fr', country: 'France', countryCode: 'FR', dateSigned: '2022-06-07', region: 'Europe', spaceAgency: 'CNES', implementationStatus: 'implementing', notes: 'Major ESA contributor, Ariane launch capability' },
  { id: 'sa', country: 'Saudi Arabia', countryCode: 'SA', dateSigned: '2022-07-14', region: 'Middle East', spaceAgency: 'SSC', implementationStatus: 'signatory', notes: 'Investing heavily in space capabilities' },
  { id: 'rw', country: 'Rwanda', countryCode: 'RW', dateSigned: '2022-08-18', region: 'Africa', spaceAgency: 'RSA', implementationStatus: 'signatory', notes: 'First African signatory' },
  { id: 'ng', country: 'Nigeria', countryCode: 'NG', dateSigned: '2022-12-13', region: 'Africa', spaceAgency: 'NASRDA', implementationStatus: 'signatory', notes: 'Largest African space program budget' },
  { id: 'es', country: 'Spain', countryCode: 'ES', dateSigned: '2023-03-01', region: 'Europe', spaceAgency: 'INTA/AEE', implementationStatus: 'signatory', notes: 'Major ESA participant' },
  { id: 'ec', country: 'Ecuador', countryCode: 'EC', dateSigned: '2023-03-21', region: 'South America', spaceAgency: 'EXA', implementationStatus: 'signatory', notes: 'Equatorial launch advantage interest' },
  { id: 'in', country: 'India', countryCode: 'IN', dateSigned: '2023-06-23', region: 'Asia-Pacific', spaceAgency: 'ISRO', implementationStatus: 'implementing', notes: 'Major spacefaring nation, Chandrayaan program' },
  { id: 'ar', country: 'Argentina', countryCode: 'AR', dateSigned: '2023-07-27', region: 'South America', spaceAgency: 'CONAE', implementationStatus: 'signatory', notes: 'SAOCOM radar satellite program' },
  { id: 'cz', country: 'Czech Republic', countryCode: 'CZ', dateSigned: '2023-09-13', region: 'Europe', spaceAgency: 'CzSO', implementationStatus: 'signatory', notes: 'ESA member state, instrument development' },
  { id: 'de', country: 'Germany', countryCode: 'DE', dateSigned: '2023-09-14', region: 'Europe', spaceAgency: 'DLR', implementationStatus: 'implementing', notes: 'Largest ESA contributor, major space industry' },
  { id: 'se', country: 'Sweden', countryCode: 'SE', dateSigned: '2023-10-04', region: 'Europe', spaceAgency: 'SNSA', implementationStatus: 'signatory', notes: 'SSC ground station network, Esrange' },
  { id: 'ch', country: 'Switzerland', countryCode: 'CH', dateSigned: '2023-12-04', region: 'Europe', spaceAgency: 'Swiss Space Office', implementationStatus: 'signatory', notes: 'ClearSpace debris removal mission' },
  { id: 'ic', country: 'Iceland', countryCode: 'IS', dateSigned: '2023-11-15', region: 'Europe', spaceAgency: 'IRR', implementationStatus: 'signatory', notes: 'Polar observation interests' },
  { id: 'gr', country: 'Greece', countryCode: 'GR', dateSigned: '2023-11-23', region: 'Europe', spaceAgency: 'HSA', implementationStatus: 'signatory', notes: 'ESA member state' },
  { id: 'dk', country: 'Denmark', countryCode: 'DK', dateSigned: '2024-01-10', region: 'Europe', spaceAgency: 'DTU Space', implementationStatus: 'signatory', notes: 'Strong instrumentation and geoscience heritage' },
  { id: 'be', country: 'Belgium', countryCode: 'BE', dateSigned: '2024-01-24', region: 'Europe', spaceAgency: 'BELSPO', implementationStatus: 'signatory', notes: 'ESA headquarters host country' },
  { id: 'an', country: 'Angola', countryCode: 'AO', dateSigned: '2024-03-05', region: 'Africa', spaceAgency: 'GGPEN', implementationStatus: 'signatory', notes: 'AngoSat program operator' },
  { id: 'pe', country: 'Peru', countryCode: 'PE', dateSigned: '2024-05-17', region: 'South America', spaceAgency: 'CONIDA', implementationStatus: 'signatory', notes: 'PeruSAT-1 Earth observation' },
  { id: 'nl', country: 'Netherlands', countryCode: 'NL', dateSigned: '2024-06-20', region: 'Europe', spaceAgency: 'NSO', implementationStatus: 'signatory', notes: 'ESA ESTEC host country, strong industry' },
  { id: 'sl', country: 'Slovenia', countryCode: 'SI', dateSigned: '2024-09-24', region: 'Europe', spaceAgency: 'ZRSS', implementationStatus: 'signatory', notes: 'Growing space technology sector' },
  { id: 'lt', country: 'Lithuania', countryCode: 'LT', dateSigned: '2024-09-25', region: 'Europe', spaceAgency: 'LSO', implementationStatus: 'signatory', notes: 'Baltic space sector development' },
  { id: 'bu', country: 'Bulgaria', countryCode: 'BG', dateSigned: '2024-11-12', region: 'Europe', spaceAgency: 'SRTI-BAS', implementationStatus: 'signatory', notes: 'Space research heritage' },
  { id: 'uy', country: 'Uruguay', countryCode: 'UY', dateSigned: '2024-09-23', region: 'South America', spaceAgency: 'CEE', implementationStatus: 'signatory', notes: 'First signing from Southern Cone' },
  { id: 'fi', country: 'Finland', countryCode: 'FI', dateSigned: '2024-11-14', region: 'Europe', spaceAgency: 'BFSA', implementationStatus: 'signatory', notes: 'Arctic monitoring and ICEYE radar constellation' },
];

// ────────────────────────────────────────
// Data: Legal Proceedings
// ────────────────────────────────────────

const LEGAL_PROCEEDINGS: LegalProceeding[] = [
  {
    id: 'cosmos-954',
    title: 'Cosmos 954 Incident (Canada v. USSR)',
    type: 'Liability Claim',
    parties: 'Canada v. Union of Soviet Socialist Republics',
    status: 'resolved',
    year: 1978,
    jurisdiction: 'International (Liability Convention)',
    description: 'Soviet nuclear-powered satellite Cosmos 954 re-entered over northern Canada, scattering radioactive debris across 124,000 sq km of the Northwest Territories. Canada submitted a claim under the Liability Convention.',
    significance: 'The only formal claim ever made under the Liability Convention. Resulted in a C$6 million (approx. US$3 million) settlement in 1981 through diplomatic channels.',
    outcome: 'Settled for approximately $3 million CAD in 1981',
  },
  {
    id: 'bogota-declaration',
    title: 'Bogota Declaration (Equatorial States)',
    type: 'Sovereignty Claim',
    parties: 'Colombia, Brazil, Congo, Ecuador, Indonesia, Kenya, Uganda, Zaire',
    status: 'resolved',
    year: 1976,
    jurisdiction: 'International',
    description: 'Eight equatorial countries declared sovereignty over the geostationary orbit segments above their territories, arguing the GEO arc is a limited natural resource not covered by the Outer Space Treaty.',
    significance: 'Challenged the non-appropriation principle of the Outer Space Treaty. Ultimately rejected by the international community, but highlighted tensions over equitable access to orbital resources.',
    outcome: 'Claims not recognized internationally; countries later moderated positions',
  },
  {
    id: 'itu-orbital-slots',
    title: 'ITU Orbital Slot Coordination Disputes',
    type: 'Regulatory Dispute',
    parties: 'Multiple nations and satellite operators',
    status: 'active',
    year: 2020,
    jurisdiction: 'International Telecommunication Union (ITU)',
    description: 'Ongoing disputes over geostationary orbital slot allocations, with growing tension between established operators and developing nations seeking equitable access. Mega-constellations add pressure on non-geostationary coordination.',
    significance: 'ITU Radio Regulations and coordination processes under strain from the explosion of satellite filings. Paper satellite filings blocking genuine entrants is a growing concern.',
    outcome: 'WRC-23 adopted new rules on milestone-based spectrum use, anti-warehousing',
  },
  {
    id: 'starlink-oneweb-coord',
    title: 'SpaceX Starlink vs. OneWeb Frequency Coordination',
    type: 'Spectrum Dispute',
    parties: 'SpaceX (Starlink) vs. OneWeb (Eutelsat)',
    status: 'resolved',
    year: 2021,
    jurisdiction: 'FCC / ITU',
    description: 'Dispute over Ku-band and Ka-band spectrum sharing between SpaceX\'s Starlink and OneWeb constellations, including disagreements over interference mitigation and orbital coordination in LEO.',
    significance: 'Highlighted challenges of coordinating mega-constellations in the same frequency bands. Led to FCC establishing clearer rules for NGSO constellation coordination.',
    outcome: 'Resolved through bilateral coordination agreement and FCC regulatory framework',
  },
  {
    id: 'china-iss-2021',
    title: 'China Tiangong / Starlink Near-Miss Incidents',
    type: 'Close Approach Concern',
    parties: 'China vs. SpaceX (Starlink)',
    status: 'active',
    year: 2021,
    jurisdiction: 'COPUOS / Diplomatic',
    description: 'China filed a note verbale with the UN stating that its space station Tiangong had to perform evasive maneuvers in July and October 2021 to avoid potential collisions with Starlink satellites.',
    significance: 'Raised questions about mega-constellation operators\' responsibilities under the Outer Space Treaty and the need for better space traffic management frameworks.',
    outcome: 'Ongoing discussions at COPUOS; no formal resolution',
  },
  {
    id: 'asat-debris-2021',
    title: 'Russian ASAT Test Debris (Cosmos 1408)',
    type: 'Debris Incident',
    parties: 'International community vs. Russia',
    status: 'resolved',
    year: 2021,
    jurisdiction: 'UN General Assembly / COPUOS',
    description: 'Russia conducted a destructive anti-satellite weapons test against its own defunct satellite Cosmos 1408, generating over 1,500 trackable debris fragments threatening the ISS and other spacecraft.',
    significance: 'Led to US announcing a moratorium on destructive ASAT testing (April 2022) and a UNGA resolution (Dec 2022) with broad support against such tests. Accelerated norms-building.',
    outcome: 'US ASAT test moratorium; UN resolution A/RES/77/41 adopted December 2022',
  },
  {
    id: 'dish-echostar-debris',
    title: 'FCC vs. DISH Network (EchoStar-7 Debris Penalty)',
    type: 'Regulatory Enforcement',
    parties: 'FCC vs. DISH Network',
    status: 'resolved',
    year: 2023,
    jurisdiction: 'United States (FCC)',
    description: 'First-ever FCC enforcement action and fine for orbital debris violation. DISH failed to properly deorbit its EchoStar-7 satellite to the required graveyard orbit, leaving it approximately 122 km below the prescribed disposal altitude.',
    significance: 'Landmark regulatory enforcement -- the first financial penalty by any national authority for failure to comply with orbital debris mitigation rules. Signals growing regulatory teeth for debris compliance.',
    outcome: '$150,000 fine and compliance plan imposed on DISH Network',
  },
  {
    id: 'ula-amazon-kuiper',
    title: 'Amazon Kuiper Constellation FCC License Conditions',
    type: 'Licensing Dispute',
    parties: 'Amazon (Project Kuiper) vs. SpaceX / FCC',
    status: 'resolved',
    year: 2022,
    jurisdiction: 'United States (FCC)',
    description: 'SpaceX challenged the FCC\'s approval of Amazon\'s Project Kuiper constellation, raising concerns about interference and orbital debris. Amazon reciprocally challenged Starlink Gen2 modifications.',
    significance: 'Illustrated growing regulatory complexity of accommodating multiple mega-constellations. FCC imposed deployment milestones and debris mitigation requirements.',
    outcome: 'FCC approved both constellations with specific conditions and milestones',
  },
  {
    id: 'icj-nuclear-space',
    title: 'ICJ Advisory Opinion on Nuclear Weapons in Space',
    type: 'Advisory Proceedings',
    parties: 'UN General Assembly Request',
    status: 'advisory',
    year: 1996,
    jurisdiction: 'International Court of Justice',
    description: 'While not specifically about space, the ICJ Advisory Opinion on the Legality of the Threat or Use of Nuclear Weapons addressed principles relevant to the prohibition of nuclear weapons in space under the Outer Space Treaty.',
    significance: 'Reinforced the legal framework prohibiting weapons of mass destruction in outer space and informed interpretations of Article IV of the Outer Space Treaty.',
    outcome: 'Advisory opinion issued; threat or use generally contrary to international law',
  },
  {
    id: 'viasat-starlink-2022',
    title: 'Viasat Challenge to Starlink Gen2 FCC Approval',
    type: 'Environmental/Regulatory Challenge',
    parties: 'Viasat Inc. vs. FCC / SpaceX',
    status: 'active',
    year: 2022,
    jurisdiction: 'D.C. Circuit Court of Appeals',
    description: 'Viasat challenged the FCC\'s approval of SpaceX\'s Starlink Gen2 constellation (up to 29,988 satellites), arguing the FCC failed to conduct proper environmental review under NEPA regarding orbital debris and light pollution impacts.',
    significance: 'First major court challenge to apply environmental law principles to satellite constellation approvals. Could set precedent for environmental review of large-scale space activities.',
    outcome: 'Court remanded to FCC for further review; operations allowed to continue pending review',
  },
];

// ────────────────────────────────────────
// Data: Regulatory Bodies
// ────────────────────────────────────────

const REGULATORY_BODIES: RegulatoryBody[] = [
  {
    id: 'unoosa',
    name: 'United Nations Office for Outer Space Affairs',
    abbreviation: 'UNOOSA',
    type: 'un',
    headquarters: 'Vienna, Austria',
    established: 1958,
    members: '193 UN Member States',
    mandate: 'Promote international cooperation in the peaceful use of outer space and serve as the secretariat for COPUOS.',
    keyFunctions: [
      'Secretariat for COPUOS and its subcommittees',
      'Maintains the UN Register of Objects Launched into Outer Space',
      'Administers UN space treaties',
      'Capacity building in space science and technology',
      'Space4SDGs initiative for sustainable development',
    ],
    website: 'https://www.unoosa.org',
  },
  {
    id: 'copuos',
    name: 'Committee on the Peaceful Uses of Outer Space',
    abbreviation: 'COPUOS',
    type: 'un',
    headquarters: 'Vienna, Austria',
    established: 1959,
    members: '102 Member States',
    mandate: 'Review international cooperation in peaceful uses of outer space, study space-related activities, and prepare programs for UN cooperation.',
    keyFunctions: [
      'Forum for developing international space law',
      'Scientific and Technical Subcommittee (STSC)',
      'Legal Subcommittee (LSC)',
      'Long-term sustainability of outer space activities guidelines',
      'Review of national space legislation',
    ],
    website: 'https://www.unoosa.org/oosa/en/ourwork/copuos/index.html',
  },
  {
    id: 'itu',
    name: 'International Telecommunication Union',
    abbreviation: 'ITU',
    type: 'un',
    headquarters: 'Geneva, Switzerland',
    established: 1865,
    members: '193 Member States',
    mandate: 'Coordinate global use of the radio spectrum and satellite orbits, develop technical standards, and promote connectivity.',
    keyFunctions: [
      'Radio Regulations governing spectrum and orbital slots',
      'World Radiocommunication Conference (WRC) every 4 years',
      'Coordination of geostationary and non-geostationary satellite networks',
      'Master International Frequency Register (MIFR)',
      'Technical standards for satellite communications',
    ],
    website: 'https://www.itu.int',
  },
  {
    id: 'faa-ast',
    name: 'Federal Aviation Administration - Office of Commercial Space Transportation',
    abbreviation: 'FAA/AST',
    type: 'national',
    headquarters: 'Washington, D.C., USA',
    established: 1984,
    members: 'United States',
    mandate: 'License and regulate commercial launch and reentry operations to protect public health, safety, and the environment.',
    keyFunctions: [
      'Commercial launch and reentry vehicle licensing',
      'Launch site operator licensing',
      'Safety inspections and mishap investigations',
      'Financial responsibility requirements',
      'Environmental reviews under NEPA',
    ],
    website: 'https://www.faa.gov/space',
  },
  {
    id: 'fcc',
    name: 'Federal Communications Commission',
    abbreviation: 'FCC',
    type: 'national',
    headquarters: 'Washington, D.C., USA',
    established: 1934,
    members: 'United States',
    mandate: 'Regulate radio spectrum use including satellite communications, and enforce orbital debris mitigation rules for US-licensed satellites.',
    keyFunctions: [
      'Satellite licensing and spectrum authorization',
      'Orbital debris mitigation rules (25-year / 5-year rule)',
      'Earth station licensing',
      'NGSO constellation coordination',
      'Space station authorization and market access',
    ],
    website: 'https://www.fcc.gov',
  },
  {
    id: 'noaa',
    name: 'National Oceanic and Atmospheric Administration',
    abbreviation: 'NOAA',
    type: 'national',
    headquarters: 'Washington, D.C., USA',
    established: 1970,
    members: 'United States',
    mandate: 'License and regulate private remote sensing satellite systems operating from the US.',
    keyFunctions: [
      'Private remote sensing licensing under Title 51',
      'Satellite imagery data policy',
      'Weather satellite operations',
      'Ocean and atmospheric monitoring',
      'Space weather prediction services',
    ],
    website: 'https://www.noaa.gov',
  },
  {
    id: 'esa',
    name: 'European Space Agency',
    abbreviation: 'ESA',
    type: 'regional',
    headquarters: 'Paris, France',
    established: 1975,
    members: '22 Member States',
    mandate: 'Develop Europe\'s space capability and ensure that investment in space continues to deliver benefits to citizens.',
    keyFunctions: [
      'Space program development and execution',
      'Technology development and transfer',
      'International space cooperation coordination',
      'Space Safety Programme (debris, asteroids, space weather)',
      'Commercial space industry support',
    ],
    website: 'https://www.esa.int',
  },
  {
    id: 'euspa',
    name: 'European Union Agency for the Space Programme',
    abbreviation: 'EUSPA',
    type: 'regional',
    headquarters: 'Prague, Czech Republic',
    established: 2021,
    members: 'European Union',
    mandate: 'Manage Galileo, EGNOS, and Copernicus services and contribute to the EU Space Programme.',
    keyFunctions: [
      'Galileo navigation system operations',
      'Copernicus Earth observation management',
      'EU Space Programme market development',
      'Space traffic management support',
      'GOVSATCOM secure communications',
    ],
    website: 'https://www.euspa.europa.eu',
  },
  {
    id: 'caa-uk',
    name: 'Civil Aviation Authority (UK Space)',
    abbreviation: 'CAA',
    type: 'national',
    headquarters: 'London, United Kingdom',
    established: 1972,
    members: 'United Kingdom',
    mandate: 'Regulate spaceflight activities in the UK under the Space Industry Act 2018.',
    keyFunctions: [
      'Spaceflight operator licensing',
      'Spaceport licensing',
      'Range safety and control',
      'Orbital operator licensing',
      'Coordination with UKSA on policy',
    ],
    website: 'https://www.caa.co.uk',
  },
  {
    id: 'cnes',
    name: 'Centre National d\'Etudes Spatiales',
    abbreviation: 'CNES',
    type: 'national',
    headquarters: 'Paris, France',
    established: 1961,
    members: 'France',
    mandate: 'Implement French space policy, license and supervise space operations under the French Space Operations Act.',
    keyFunctions: [
      'Space operations authorization and supervision',
      'Technical regulatory standards development',
      'Launch operations from Guiana Space Centre',
      'Debris mitigation compliance enforcement',
      'Space situational awareness services',
    ],
    website: 'https://cnes.fr',
  },
  {
    id: 'in-space',
    name: 'Indian National Space Promotion and Authorization Centre',
    abbreviation: 'IN-SPACe',
    type: 'national',
    headquarters: 'Ahmedabad, India',
    established: 2020,
    members: 'India',
    mandate: 'Authorize, regulate, and promote private space activities in India as a single-window clearance agency.',
    keyFunctions: [
      'Authorization for private space activities',
      'ISRO facility access coordination',
      'Technology transfer oversight',
      'Policy recommendations to DOS',
      'Promotion of space startups and industry',
    ],
    website: 'https://www.inspace.gov.in',
  },
  {
    id: 'iadc',
    name: 'Inter-Agency Space Debris Coordination Committee',
    abbreviation: 'IADC',
    type: 'industry',
    headquarters: 'Rotating Chair',
    established: 1993,
    members: '13 Space Agencies (NASA, ESA, JAXA, CNSA, Roscosmos, etc.)',
    mandate: 'Coordinate efforts between space agencies to address debris issues and develop mitigation guidelines.',
    keyFunctions: [
      'Space debris mitigation guidelines development',
      'Conjunction assessment coordination',
      'Debris environment modeling',
      'Re-entry safety analysis',
      'Best practices for satellite design and operations',
    ],
    website: 'https://www.iadc-home.org',
  },
  {
    id: 'confers',
    name: 'Consortium for Execution of Rendezvous and Servicing Operations',
    abbreviation: 'CONFERS',
    type: 'industry',
    headquarters: 'USA',
    established: 2018,
    members: 'Industry Consortium',
    mandate: 'Develop industry standards and best practices for on-orbit servicing and rendezvous and proximity operations (RPO).',
    keyFunctions: [
      'Guiding principles for commercial RPO and OOS',
      'Industry technical standards development',
      'Government engagement on policy frameworks',
      'Safety of operations guidance',
      'Stakeholder coordination on space sustainability',
    ],
    website: 'https://www.satelliteconfers.org',
  },
  {
    id: 'ofcom',
    name: 'Office of Communications',
    abbreviation: 'Ofcom',
    type: 'national',
    headquarters: 'London, United Kingdom',
    established: 2003,
    members: 'United Kingdom',
    mandate: 'Regulate satellite communications and spectrum use in the UK.',
    keyFunctions: [
      'Satellite spectrum licensing in the UK',
      'Interference management',
      'ITU coordination for UK satellite networks',
      'Spectrum allocation and management',
      'Broadcasting satellite regulation',
    ],
    website: 'https://www.ofcom.org.uk',
  },
];

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function HeroStats() {
  const totalTreaties = TREATIES.length;
  const totalNationalLaws = NATIONAL_LAWS.length;
  const totalSignatories = ARTEMIS_SIGNATORIES.length;
  const totalBodies = REGULATORY_BODIES.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="card-elevated p-6 text-center">
        <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{totalTreaties}</div>
        <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">UN Space Treaties</div>
      </div>
      <div className="card-elevated p-6 text-center">
        <div className="text-4xl font-bold font-display tracking-tight text-cyan-400">{totalNationalLaws}</div>
        <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">National Laws</div>
      </div>
      <div className="card-elevated p-6 text-center">
        <div className="text-4xl font-bold font-display tracking-tight text-green-400">{totalSignatories}</div>
        <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Artemis Signatories</div>
      </div>
      <div className="card-elevated p-6 text-center">
        <div className="text-4xl font-bold font-display tracking-tight text-purple-400">{totalBodies}</div>
        <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Regulatory Bodies</div>
      </div>
    </div>
  );
}

// ── Treaties Tab ──

function TreatyCard({ treaty }: { treaty: Treaty }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = TREATY_STATUS_CONFIG[treaty.status];

  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-lg">{treaty.name}</h4>
          <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{treaty.fullName}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ml-3 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center">
          <div className="text-slate-900 font-bold text-xl">{treaty.ratifications}</div>
          <div className="text-slate-400 text-xs">Ratifications</div>
        </div>
        <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center">
          <div className="text-slate-900 font-bold text-xl">{treaty.signatories}</div>
          <div className="text-slate-400 text-xs">Signatories</div>
        </div>
        <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center">
          <div className="text-slate-900 font-bold text-xl">{treaty.entryIntoForceYear}</div>
          <div className="text-slate-400 text-xs">In Force</div>
        </div>
      </div>

      <p className="text-slate-500 text-sm mb-3 line-clamp-3">{treaty.description}</p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors"
      >
        {expanded ? 'Show Less' : 'View Key Provisions'}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
          <div>
            <h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Provisions</h5>
            <ul className="space-y-1.5">
              {treaty.keyProvisions.map((provision, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="text-cyan-400 mt-0.5 flex-shrink-0">*</span>
                  {provision}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Significance</h5>
            <p className="text-xs text-slate-500">{treaty.significance}</p>
          </div>
          <div className="text-xs text-slate-400">
            Adopted: {treaty.adoptedYear} | Depositary: {treaty.depositary}
          </div>
        </div>
      )}
    </div>
  );
}

function TreatiesTab() {
  return (
    <div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-600 mb-2">United Nations Space Treaty Framework</h4>
        <p className="text-sm text-slate-400">
          Five core UN treaties form the foundation of international space law. The Outer Space Treaty (1967) serves as the
          cornerstone, with four supplementary treaties addressing specific aspects of space activities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {TREATIES.map((treaty) => (
          <TreatyCard key={treaty.id} treaty={treaty} />
        ))}
      </div>

      <div className="card p-5 border-dashed mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Treaty Ratification Overview</h3>
        <div className="space-y-3">
          {TREATIES.map((treaty) => {
            const maxRatifications = 114;
            const pct = (treaty.ratifications / maxRatifications) * 100;
            return (
              <div key={treaty.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 font-medium">{treaty.name}</span>
                  <span className="text-sm text-slate-400">{treaty.ratifications} ratifications</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      treaty.status === 'not_in_force'
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Data based on UNOOSA treaty status reports. Signatories that have not ratified are counted separately.
        </p>
      </div>
    </div>
  );
}

// ── National Laws Tab ──

function NationalLawCard({ law }: { law: NationalLaw }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = NATIONAL_STATUS_CONFIG[law.status];

  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
            {law.countryCode}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">{law.country}</h4>
            <span className="text-slate-400 text-xs">{law.agency}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
          {statusConfig.label}
        </span>
      </div>

      <h5 className="text-sm font-medium text-nebula-300 mb-1">{law.lawName}</h5>
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
        <span>Year: {law.year}</span>
        <span>Scope: {law.scope}</span>
      </div>

      <p className="text-slate-500 text-sm mb-3 line-clamp-2">{law.description}</p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors"
      >
        {expanded ? 'Show Less' : 'View Key Features'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/50">
          <h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Features</h5>
          <ul className="space-y-1.5">
            {law.keyFeatures.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                <svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NationalLawsTab() {
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const countries = useMemo(() => {
    return Array.from(new Set(NATIONAL_LAWS.map(l => l.country))).sort();
  }, []);

  const filteredLaws = useMemo(() => {
    let result = [...NATIONAL_LAWS];
    if (countryFilter) result = result.filter(l => l.country === countryFilter);
    if (statusFilter) result = result.filter(l => l.status === statusFilter);
    return result;
  }, [countryFilter, statusFilter]);

  return (
    <div>
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-cyan-600 mb-2">National Space Legislation Tracker</h4>
        <p className="text-sm text-slate-400">
          As commercial space activities expand, nations are rapidly developing domestic legislation to regulate launches,
          satellite operations, space resources, and liability. This tracker monitors major national frameworks.
        </p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Country</label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Countries</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Statuses</option>
              <option value="enacted">Enacted</option>
              <option value="amended">Amended</option>
              <option value="proposed">Proposed</option>
              <option value="under_review">Under Review</option>
            </select>
          </div>
          {(countryFilter || statusFilter) && (
            <button
              onClick={() => { setCountryFilter(''); setStatusFilter(''); }}
              className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">
          Showing {filteredLaws.length} of {NATIONAL_LAWS.length} laws
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredLaws.map((law) => (
          <NationalLawCard key={law.id} law={law} />
        ))}
      </div>
    </div>
  );
}

// ── Artemis Accords Tab ──

function ArtemisAccordsTab() {
  const [regionFilter, setRegionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const regions = useMemo(() => {
    return Array.from(new Set(ARTEMIS_SIGNATORIES.map(s => s.region))).sort();
  }, []);

  const filteredSignatories = useMemo(() => {
    let result = [...ARTEMIS_SIGNATORIES];
    if (regionFilter) result = result.filter(s => s.region === regionFilter);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.country.toLowerCase().includes(query) ||
        s.spaceAgency.toLowerCase().includes(query) ||
        s.notes.toLowerCase().includes(query)
      );
    }
    return result;
  }, [regionFilter, searchQuery]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ARTEMIS_SIGNATORIES.forEach(s => {
      counts[s.region] = (counts[s.region] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div>
      {/* Artemis Accords Overview */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">About the Artemis Accords</h3>
        <p className="text-slate-500 text-sm mb-4">
          The Artemis Accords are a set of bilateral agreements between the United States and partner nations, grounded in
          the Outer Space Treaty. Established in 2020 by NASA, they set principles for the responsible and peaceful
          exploration of the Moon, Mars, and other celestial bodies as part of the Artemis program.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{ARTEMIS_SIGNATORIES.length}</div>
            <div className="text-slate-400 text-xs">Total Signatories</div>
          </div>
          <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">{Object.keys(regionCounts).length}</div>
            <div className="text-slate-400 text-xs">Regions</div>
          </div>
          <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {ARTEMIS_SIGNATORIES.filter(s => s.implementationStatus === 'implementing').length}
            </div>
            <div className="text-slate-400 text-xs">Implementing</div>
          </div>
          <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{ARTEMIS_PRINCIPLES.length}</div>
            <div className="text-slate-400 text-xs">Core Principles</div>
          </div>
        </div>
      </div>

      {/* Principles */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Core Principles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ARTEMIS_PRINCIPLES.map((principle, i) => (
            <div key={i} className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-600 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <h5 className="font-medium text-slate-900 text-sm">{principle.title}</h5>
              </div>
              <p className="text-xs text-slate-500 ml-8">{principle.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Breakdown */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Regional Distribution</h3>
        <div className="space-y-3">
          {Object.entries(regionCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([region, count]) => {
              const maxCount = Math.max(...Object.values(regionCounts));
              const pct = (count / maxCount) * 100;
              return (
                <div key={region}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 font-medium">{region}</span>
                    <span className="text-sm text-slate-400">{count} signatories</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search countries, agencies..."
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Region</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Regions</option>
              {regions.map(r => (
                <option key={r} value={r}>{r} ({regionCounts[r]})</option>
              ))}
            </select>
          </div>
          {(regionFilter || searchQuery) && (
            <button
              onClick={() => { setRegionFilter(''); setSearchQuery(''); }}
              className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">
          Showing {filteredSignatories.length} of {ARTEMIS_SIGNATORIES.length} signatories
        </span>
      </div>

      {/* Signatory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSignatories.map((signatory) => {
          const status = ARTEMIS_STATUS_CONFIG[signatory.implementationStatus];
          return (
            <div key={signatory.id} className="card p-4 hover:border-cyan-500/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                    {signatory.countryCode}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{signatory.country}</h4>
                    <span className="text-slate-400 text-xs">{signatory.spaceAgency}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${status.bg} ${status.text} ${status.border}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                <span>Signed: {new Date(signatory.dateSigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span>{signatory.region}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{signatory.notes}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Legal Proceedings Tab ──

function ProceedingCard({ proceeding }: { proceeding: LegalProceeding }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = PROCEEDING_STATUS_CONFIG[proceeding.status];

  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-medium">
            {proceeding.type}
          </span>
          <span className="text-xs text-slate-400">{proceeding.year}</span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
          {statusConfig.label}
        </span>
      </div>

      <h4 className="font-semibold text-slate-900 mb-1">{proceeding.title}</h4>
      <p className="text-xs text-slate-400 mb-3">{proceeding.parties}</p>

      <p className="text-slate-500 text-sm mb-3 line-clamp-3">{proceeding.description}</p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors"
      >
        {expanded ? 'Show Less' : 'View Details'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-3">
          <div>
            <h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Jurisdiction</h5>
            <p className="text-xs text-slate-500">{proceeding.jurisdiction}</p>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Significance</h5>
            <p className="text-xs text-slate-500">{proceeding.significance}</p>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Outcome</h5>
            <p className="text-xs text-slate-500">{proceeding.outcome}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function LegalProceedingsTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const types = useMemo(() => {
    return Array.from(new Set(LEGAL_PROCEEDINGS.map(p => p.type))).sort();
  }, []);

  const filteredProceedings = useMemo(() => {
    let result = [...LEGAL_PROCEEDINGS];
    if (typeFilter) result = result.filter(p => p.type === typeFilter);
    if (statusFilter) result = result.filter(p => p.status === statusFilter);
    return result.sort((a, b) => b.year - a.year);
  }, [typeFilter, statusFilter]);

  return (
    <div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-red-600 mb-2">Space Law Cases and Legal Proceedings</h4>
        <p className="text-sm text-slate-400">
          Tracking notable legal disputes, regulatory enforcement actions, and advisory opinions that shape the
          evolving body of space law. Includes both international and domestic proceedings.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-slate-900">{LEGAL_PROCEEDINGS.length}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Cases</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-red-400">
            {LEGAL_PROCEEDINGS.filter(p => p.status === 'active').length}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Active</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-green-400">
            {LEGAL_PROCEEDINGS.filter(p => p.status === 'resolved').length}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Resolved</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-yellow-400">
            {LEGAL_PROCEEDINGS.filter(p => p.status === 'pending').length}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Pending</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Case Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Types</option>
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="pending">Pending</option>
              <option value="advisory">Advisory</option>
            </select>
          </div>
          {(typeFilter || statusFilter) && (
            <button
              onClick={() => { setTypeFilter(''); setStatusFilter(''); }}
              className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredProceedings.map((p) => (
          <ProceedingCard key={p.id} proceeding={p} />
        ))}
      </div>
    </div>
  );
}

// ── Regulatory Bodies Tab ──

function BodyCard({ body }: { body: RegulatoryBody }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = BODY_TYPE_CONFIG[body.type];

  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900">{body.abbreviation}</h4>
            <span className={`text-xs px-2 py-0.5 rounded border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}>
              {typeConfig.label}
            </span>
          </div>
          <p className="text-slate-400 text-sm">{body.name}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
        <span>Est. {body.established}</span>
        <span>{body.headquarters}</span>
        <span>{body.members}</span>
      </div>

      <p className="text-slate-500 text-sm mb-3 line-clamp-2">{body.mandate}</p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors"
      >
        {expanded ? 'Show Less' : 'View Functions'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/50">
          <h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Functions</h5>
          <ul className="space-y-1.5">
            {body.keyFunctions.map((func, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                <svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {func}
              </li>
            ))}
          </ul>
          <a
            href={body.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-xs text-nebula-300 hover:text-nebula-200"
          >
            Visit Website
          </a>
        </div>
      )}
    </div>
  );
}

function RegulatoryBodiesTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBodies = useMemo(() => {
    let result = [...REGULATORY_BODIES];
    if (typeFilter) result = result.filter(b => b.type === typeFilter);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.abbreviation.toLowerCase().includes(query) ||
        b.mandate.toLowerCase().includes(query) ||
        b.headquarters.toLowerCase().includes(query)
      );
    }
    return result;
  }, [typeFilter, searchQuery]);

  return (
    <div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-purple-600 mb-2">Space Regulatory Bodies Directory</h4>
        <p className="text-sm text-slate-400">
          Comprehensive directory of international, regional, and national regulatory bodies governing space activities.
          From UN organizations to national licensing authorities and industry coordination groups.
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bodies, functions..."
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Types</option>
              <option value="un">UN Bodies</option>
              <option value="national">National</option>
              <option value="regional">Regional</option>
              <option value="industry">Industry</option>
            </select>
          </div>
          {(typeFilter || searchQuery) && (
            <button
              onClick={() => { setTypeFilter(''); setSearchQuery(''); }}
              className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Body Type Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(Object.entries(BODY_TYPE_CONFIG) as [BodyType, typeof BODY_TYPE_CONFIG[BodyType]][]).map(([type, config]) => {
          const count = REGULATORY_BODIES.filter(b => b.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              className={`card-elevated p-4 text-center transition-all cursor-pointer ${
                typeFilter === type ? 'ring-2 ring-nebula-500/50' : ''
              }`}
            >
              <div className={`text-2xl font-bold font-display ${config.text}`}>{count}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">{config.label}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredBodies.map((body) => (
          <BodyCard key={body.id} body={body} />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'treaties', label: 'Treaties' },
  { id: 'national', label: 'National Laws' },
  { id: 'artemis', label: 'Artemis Accords' },
  { id: 'proceedings', label: 'Legal Proceedings' },
  { id: 'bodies', label: 'Regulatory Bodies' },
];

export default function SpaceLawPage() {
  const [activeTab, setActiveTab] = useState<TabId>('treaties');

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Space Law & Treaty Monitor"
          subtitle="Comprehensive tracker of international space treaties, national legislation, the Artemis Accords, legal proceedings, and regulatory bodies governing space activities"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Space Law' }]}
        />

        {/* Hero Stats */}
        <HeroStats />

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'treaties' && <TreatiesTab />}
        {activeTab === 'national' && <NationalLawsTab />}
        {activeTab === 'artemis' && <ArtemisAccordsTab />}
        {activeTab === 'proceedings' && <LegalProceedingsTab />}
        {activeTab === 'bodies' && <RegulatoryBodiesTab />}
      </div>
    </div>
  );
}
