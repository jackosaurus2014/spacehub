'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import InlineDisclaimer from '@/components/InlineDisclaimer';
import PremiumGate from '@/components/PremiumGate';
import ExportButton from '@/components/ui/ExportButton';
import {
  POLICY_CHANGES,
  LICENSE_REQUIREMENTS,
  SPACE_LAW_CASES,
  ECCN_CLASSIFICATIONS,
  USML_CATEGORIES,
  EXPERT_SOURCES,
  TREATY_OBLIGATIONS,
  getRegulatoryHubStats,
  getUpcomingDeadlines,
  type PolicyChange,
  type LicenseRequirement,
  type SpaceLawCase,
  type ECCNClassification,
  type USMLCategory,
  type ExpertSource,
  type TreatyObligation,
} from '@/lib/regulatory-hub-data';

// ############################################################################
// SPACE LAW - Types, Status Configs, and Data
// ############################################################################

type SpaceLawTabId = 'treaties' | 'national' | 'artemis' | 'proceedings' | 'bodies';

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

const TREATIES: Treaty[] = [
  {
    id: 'ost',
    name: 'Outer Space Treaty',
    fullName: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies',
    adoptedYear: 1966, entryIntoForceYear: 1967, status: 'in_force', ratifications: 114, signatories: 23, depositary: 'UN Secretary-General',
    keyProvisions: ['Outer space is free for exploration and use by all states','No national appropriation of outer space or celestial bodies','No weapons of mass destruction in orbit or on celestial bodies','States bear international responsibility for national space activities','Astronauts are envoys of mankind and must be assisted','States liable for damage caused by their space objects'],
    description: 'The foundational treaty of international space law, often called the "Magna Carta of Space." It establishes the basic framework for international space activities, including the peaceful use of outer space and the prohibition of sovereignty claims.',
    significance: 'The cornerstone of space law, ratified by all major spacefaring nations. Forms the basis for all subsequent space treaties and national space legislation.',
  },
  {
    id: 'rescue', name: 'Rescue Agreement',
    fullName: 'Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space',
    adoptedYear: 1967, entryIntoForceYear: 1968, status: 'in_force', ratifications: 99, signatories: 23, depositary: 'UN Secretary-General',
    keyProvisions: ['States shall immediately notify the launching authority of astronauts in distress','States shall take all possible steps to rescue and assist astronauts in distress','Astronauts shall be safely and promptly returned to the launching state','Space objects found beyond the launching state must be returned','Launching authority shall bear costs of recovery and return'],
    description: 'Elaborates on the rescue provisions of the Outer Space Treaty. Requires states to assist astronauts in distress and return them and their space objects to the launching state.',
    significance: 'Provides detailed humanitarian obligations regarding astronauts. Has been invoked in practical scenarios involving the return of space debris landing in foreign territories.',
  },
  {
    id: 'liability', name: 'Liability Convention',
    fullName: 'Convention on International Liability for Damage Caused by Space Objects',
    adoptedYear: 1971, entryIntoForceYear: 1972, status: 'in_force', ratifications: 98, signatories: 19, depositary: 'UN Secretary-General',
    keyProvisions: ['Absolute liability for damage caused on the surface of the Earth or to aircraft in flight','Fault-based liability for damage caused in outer space','Joint and several liability when two states jointly launch','Claims presented through diplomatic channels within one year','Claims Commission established if no settlement reached'],
    description: 'Establishes the international liability framework for damage caused by space objects. A launching state is absolutely liable for damage on Earth and fault-liable for damage in space.',
    significance: 'The only UN space treaty invoked in a formal claim: Canada v. USSR over Cosmos 954 (1978), which resulted in a $3 million settlement. Increasingly relevant as orbital debris grows.',
  },
  {
    id: 'registration', name: 'Registration Convention',
    fullName: 'Convention on Registration of Objects Launched into Outer Space',
    adoptedYear: 1974, entryIntoForceYear: 1976, status: 'in_force', ratifications: 72, signatories: 4, depositary: 'UN Secretary-General',
    keyProvisions: ['Launching states shall maintain a national registry of space objects','Launching states shall furnish information to the UN Secretary-General','Registration information includes designating name, date, launch parameters, and orbital data','The UN maintains a public Register of Objects Launched into Outer Space','Applies to objects launched into Earth orbit or beyond'],
    description: 'Requires states to register space objects with both a national registry and the UN. Provides the legal basis for tracking jurisdiction and control over space objects.',
    significance: 'Essential for space traffic management and determining liability. The UN register now contains over 15,000 entries. Growing importance with mega-constellations.',
  },
  {
    id: 'moon', name: 'Moon Agreement',
    fullName: 'Agreement Governing the Activities of States on the Moon and Other Celestial Bodies',
    adoptedYear: 1979, entryIntoForceYear: 1984, status: 'not_in_force', ratifications: 18, signatories: 4, depositary: 'UN Secretary-General',
    keyProvisions: ['The Moon and its natural resources are the common heritage of mankind','An international regime shall govern exploitation of natural resources','Freedom of scientific investigation on the Moon','Prohibition of military use beyond peaceful purposes','States shall inform the UN of activities on the Moon','Establishment of international stations must not impede free access'],
    description: 'The most controversial of the five UN space treaties. Declares the Moon and its resources the "common heritage of mankind" and calls for an international regime to govern resource exploitation.',
    significance: 'Not ratified by any major spacefaring nation (US, Russia, China, India, Japan, ESA members). Its "common heritage" principle is directly challenged by national resource rights legislation and the Artemis Accords.',
  },
];

const NATIONAL_LAWS: NationalLaw[] = [
  { id: 'us-csa-2015', country: 'United States', countryCode: 'US', lawName: 'U.S. Commercial Space Launch Competitiveness Act', year: 2015, status: 'enacted', agency: 'FAA / DOC', keyFeatures: ['Grants US citizens rights to own, possess, and sell space resources','Extends ISS operations authorization','Updates commercial launch license requirements','Clarifies regulatory framework for space resource extraction'], description: 'Landmark legislation granting US citizens the right to own and sell resources obtained from celestial bodies, while asserting this does not constitute sovereignty claims.', scope: 'Commercial launch, space resources, ISS operations' },
  { id: 'us-space-act-2020', country: 'United States', countryCode: 'US', lawName: 'National Aeronautics and Space Administration Authorization Act of 2020', year: 2020, status: 'enacted', agency: 'NASA / FAA', keyFeatures: ['Authorizes Artemis program and lunar exploration','Supports commercial LEO economy development','Establishes space situational awareness sharing requirements','Directs development of orbital debris mitigation guidelines'], description: 'Provides authorization and direction for NASA programs including Artemis, commercial LEO destinations, and space debris mitigation.', scope: 'Space exploration, commercial space, orbital debris' },
  { id: 'us-eo-2020', country: 'United States', countryCode: 'US', lawName: 'Executive Order on Encouraging International Support for the Recovery and Use of Space Resources', year: 2020, status: 'enacted', agency: 'White House / DOS', keyFeatures: ['Rejects Moon Agreement as reflecting customary international law','Affirms US right to extract and use space resources','Directs bilateral agreements on space resource rights','Lays groundwork for the Artemis Accords'], description: 'Executive order explicitly rejecting the Moon Agreement and affirming US policy supporting commercial recovery and use of space resources.', scope: 'Space resources policy, international engagement' },
  { id: 'lux-2017', country: 'Luxembourg', countryCode: 'LU', lawName: 'Law on the Exploration and Use of Space Resources', year: 2017, status: 'enacted', agency: 'Luxembourg Space Agency', keyFeatures: ['First European law granting property rights over space resources','Requires authorization for space resource missions','Company must be incorporated in Luxembourg (no nationality requirement)','Government may acquire equity stakes in space mining ventures'], description: 'Luxembourg became the first European country to enact comprehensive space resource utilization legislation, establishing itself as a hub for space mining companies.', scope: 'Space resource rights, commercial authorization' },
  { id: 'uae-2020', country: 'United Arab Emirates', countryCode: 'AE', lawName: 'Federal Law No. 12 on the Regulation of the Space Sector', year: 2020, status: 'enacted', agency: 'UAE Space Agency', keyFeatures: ['Comprehensive national space law framework','Permits and licensing for space activities','Space resource utilization provisions','Liability and insurance requirements','Registration of space objects'], description: 'Comprehensive space law covering licensing, supervision, liability, and space resource extraction. One of the most modern national space laws.', scope: 'All space activities, licensing, resources, liability' },
  { id: 'japan-2016', country: 'Japan', countryCode: 'JP', lawName: 'Space Activities Act', year: 2016, status: 'enacted', agency: 'JAXA / Cabinet Office', keyFeatures: ['Licensing system for launch activities','Satellite control and management framework','Third-party liability provisions','Mandatory insurance requirements for launch operators'], description: 'Establishes a comprehensive legal framework for Japan\'s commercial space activities including launch licensing and satellite operations.', scope: 'Launch activities, satellite operations, liability' },
  { id: 'japan-resources-2021', country: 'Japan', countryCode: 'JP', lawName: 'Space Resources Act', year: 2021, status: 'enacted', agency: 'Cabinet Office', keyFeatures: ['Grants rights to extract and use space resources','Business plan approval system for resource activities','Consistent with international space law obligations','Third country in the world to pass space resource legislation'], description: 'Japan became the third country (after the US and Luxembourg) to enact legislation recognizing property rights over extracted space resources.', scope: 'Space resource extraction and utilization' },
  { id: 'uk-2018', country: 'United Kingdom', countryCode: 'GB', lawName: 'Space Industry Act 2018', year: 2018, status: 'enacted', agency: 'UK Space Agency / CAA', keyFeatures: ['Licensing regime for UK launch operations','Spaceflight activities from UK spaceports','Operator liability and insurance requirements','Orbital activities licensing framework','Powers for range control and safety'], description: 'Comprehensive legislation enabling commercial spaceflight activities from UK territory, including vertical and horizontal launch, and associated regulation.', scope: 'Launch operations, spaceports, orbital activities' },
  { id: 'india-2023', country: 'India', countryCode: 'IN', lawName: 'Indian Space Policy 2023', year: 2023, status: 'enacted', agency: 'ISRO / IN-SPACe / DOS', keyFeatures: ['Opens space sector to private participation','IN-SPACe as single-window authorization body','ISRO transitions to R&D focus','NewSpace India Limited (NSIL) for commercialization','Non-governmental entity participation framework'], description: 'Landmark policy reform opening India\'s space sector to private enterprise, with ISRO refocusing on research and transferring operational activities to commercial entities.', scope: 'Private sector participation, commercial space activities' },
  { id: 'australia-2018', country: 'Australia', countryCode: 'AU', lawName: 'Space (Launches and Returns) Act 2018', year: 2018, status: 'amended', agency: 'Australian Space Agency', keyFeatures: ['Updated launch permit framework','High-power rocket regulation','Overseas launch certificates for Australian payloads','Third-party liability and insurance provisions'], description: 'Modernized Australian space legislation to support the growing commercial space sector, streamlining the licensing process for launches and returns.', scope: 'Launches, returns, payload operations' },
  { id: 'france-2008', country: 'France', countryCode: 'FR', lawName: 'French Space Operations Act (Loi relative aux operations spatiales)', year: 2008, status: 'enacted', agency: 'CNES', keyFeatures: ['Authorization required for all space operations by French entities','Technical regulations for design and operations','Operator liability capped at EUR 60 million','Government guarantee above the cap','Registration of space objects launched from French territory'], description: 'One of the most comprehensive national space laws in Europe, covering authorization, technical standards, liability, and registration of French space operations.', scope: 'Launch operations, satellite control, liability, registration' },
  { id: 'germany-2024', country: 'Germany', countryCode: 'DE', lawName: 'German Space Act (Weltraumgesetz)', year: 2024, status: 'enacted', agency: 'German Aerospace Center (DLR)', keyFeatures: ['Licensing framework for private space activities','Mandatory debris mitigation compliance','Liability and insurance obligations','Registry of German space objects'], description: 'Germany\'s first dedicated national space law, providing a comprehensive framework for licensing and regulating private space activities from German territory.', scope: 'Private space activities, licensing, debris mitigation' },
  { id: 'eu-ssa-2023', country: 'European Union', countryCode: 'EU', lawName: 'EU Space Law Initiative', year: 2024, status: 'proposed', agency: 'European Commission / EUSPA', keyFeatures: ['Harmonized EU-wide framework for space activities','Common authorization and licensing standards','Space traffic management provisions','Sustainability and debris mitigation requirements','Competitiveness measures for European space industry'], description: 'Proposed EU-wide space law to harmonize the regulatory framework across member states, addressing authorization, safety, sustainability, and competitiveness.', scope: 'EU-wide space regulation and harmonization' },
  { id: 'nz-2017', country: 'New Zealand', countryCode: 'NZ', lawName: 'Outer Space and High-altitude Activities Act 2017', year: 2017, status: 'enacted', agency: 'New Zealand Space Agency', keyFeatures: ['Licensing for launch and high-altitude vehicles','Payload permits for space objects','Orbital debris mitigation requirements','Facility operator licenses for launch sites'], description: 'Enacted to support Rocket Lab\'s Electron launches from the Mahia Peninsula, establishing New Zealand as a launch jurisdiction.', scope: 'Launch licensing, payload permits, facility operations' },
];

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

const LEGAL_PROCEEDINGS: LegalProceeding[] = [
  { id: 'cosmos-954', title: 'Cosmos 954 Incident (Canada v. USSR)', type: 'Liability Claim', parties: 'Canada v. Union of Soviet Socialist Republics', status: 'resolved', year: 1978, jurisdiction: 'International (Liability Convention)', description: 'Soviet nuclear-powered satellite Cosmos 954 re-entered over northern Canada, scattering radioactive debris across 124,000 sq km of the Northwest Territories. Canada submitted a claim under the Liability Convention.', significance: 'The only formal claim ever made under the Liability Convention. Resulted in a C$6 million (approx. US$3 million) settlement in 1981 through diplomatic channels.', outcome: 'Settled for approximately $3 million CAD in 1981' },
  { id: 'bogota-declaration', title: 'Bogota Declaration (Equatorial States)', type: 'Sovereignty Claim', parties: 'Colombia, Brazil, Congo, Ecuador, Indonesia, Kenya, Uganda, Zaire', status: 'resolved', year: 1976, jurisdiction: 'International', description: 'Eight equatorial countries declared sovereignty over the geostationary orbit segments above their territories, arguing the GEO arc is a limited natural resource not covered by the Outer Space Treaty.', significance: 'Challenged the non-appropriation principle of the Outer Space Treaty. Ultimately rejected by the international community, but highlighted tensions over equitable access to orbital resources.', outcome: 'Claims not recognized internationally; countries later moderated positions' },
  { id: 'itu-orbital-slots', title: 'ITU Orbital Slot Coordination Disputes', type: 'Regulatory Dispute', parties: 'Multiple nations and satellite operators', status: 'active', year: 2020, jurisdiction: 'International Telecommunication Union (ITU)', description: 'Ongoing disputes over geostationary orbital slot allocations, with growing tension between established operators and developing nations seeking equitable access. Mega-constellations add pressure on non-geostationary coordination.', significance: 'ITU Radio Regulations and coordination processes under strain from the explosion of satellite filings. Paper satellite filings blocking genuine entrants is a growing concern.', outcome: 'WRC-23 adopted new rules on milestone-based spectrum use, anti-warehousing' },
  { id: 'starlink-oneweb-coord', title: 'SpaceX Starlink vs. OneWeb Frequency Coordination', type: 'Spectrum Dispute', parties: 'SpaceX (Starlink) vs. OneWeb (Eutelsat)', status: 'resolved', year: 2021, jurisdiction: 'FCC / ITU', description: 'Dispute over Ku-band and Ka-band spectrum sharing between SpaceX\'s Starlink and OneWeb constellations, including disagreements over interference mitigation and orbital coordination in LEO.', significance: 'Highlighted challenges of coordinating mega-constellations in the same frequency bands. Led to FCC establishing clearer rules for NGSO constellation coordination.', outcome: 'Resolved through bilateral coordination agreement and FCC regulatory framework' },
  { id: 'china-iss-2021', title: 'China Tiangong / Starlink Near-Miss Incidents', type: 'Close Approach Concern', parties: 'China vs. SpaceX (Starlink)', status: 'active', year: 2021, jurisdiction: 'COPUOS / Diplomatic', description: 'China filed a note verbale with the UN stating that its space station Tiangong had to perform evasive maneuvers in July and October 2021 to avoid potential collisions with Starlink satellites.', significance: 'Raised questions about mega-constellation operators\' responsibilities under the Outer Space Treaty and the need for better space traffic management frameworks.', outcome: 'Ongoing discussions at COPUOS; no formal resolution' },
  { id: 'asat-debris-2021', title: 'Russian ASAT Test Debris (Cosmos 1408)', type: 'Debris Incident', parties: 'International community vs. Russia', status: 'resolved', year: 2021, jurisdiction: 'UN General Assembly / COPUOS', description: 'Russia conducted a destructive anti-satellite weapons test against its own defunct satellite Cosmos 1408, generating over 1,500 trackable debris fragments threatening the ISS and other spacecraft.', significance: 'Led to US announcing a moratorium on destructive ASAT testing (April 2022) and a UNGA resolution (Dec 2022) with broad support against such tests. Accelerated norms-building.', outcome: 'US ASAT test moratorium; UN resolution A/RES/77/41 adopted December 2022' },
  { id: 'dish-echostar-debris', title: 'FCC vs. DISH Network (EchoStar-7 Debris Penalty)', type: 'Regulatory Enforcement', parties: 'FCC vs. DISH Network', status: 'resolved', year: 2023, jurisdiction: 'United States (FCC)', description: 'First-ever FCC enforcement action and fine for orbital debris violation. DISH failed to properly deorbit its EchoStar-7 satellite to the required graveyard orbit, leaving it approximately 122 km below the prescribed disposal altitude.', significance: 'Landmark regulatory enforcement -- the first financial penalty by any national authority for failure to comply with orbital debris mitigation rules. Signals growing regulatory teeth for debris compliance.', outcome: '$150,000 fine and compliance plan imposed on DISH Network' },
  { id: 'ula-amazon-kuiper', title: 'Amazon Kuiper Constellation FCC License Conditions', type: 'Licensing Dispute', parties: 'Amazon (Project Kuiper) vs. SpaceX / FCC', status: 'resolved', year: 2022, jurisdiction: 'United States (FCC)', description: 'SpaceX challenged the FCC\'s approval of Amazon\'s Project Kuiper constellation, raising concerns about interference and orbital debris. Amazon reciprocally challenged Starlink Gen2 modifications.', significance: 'Illustrated growing regulatory complexity of accommodating multiple mega-constellations. FCC imposed deployment milestones and debris mitigation requirements.', outcome: 'FCC approved both constellations with specific conditions and milestones' },
  { id: 'icj-nuclear-space', title: 'ICJ Advisory Opinion on Nuclear Weapons in Space', type: 'Advisory Proceedings', parties: 'UN General Assembly Request', status: 'advisory', year: 1996, jurisdiction: 'International Court of Justice', description: 'While not specifically about space, the ICJ Advisory Opinion on the Legality of the Threat or Use of Nuclear Weapons addressed principles relevant to the prohibition of nuclear weapons in space under the Outer Space Treaty.', significance: 'Reinforced the legal framework prohibiting weapons of mass destruction in outer space and informed interpretations of Article IV of the Outer Space Treaty.', outcome: 'Advisory opinion issued; threat or use generally contrary to international law' },
  { id: 'viasat-starlink-2022', title: 'Viasat Challenge to Starlink Gen2 FCC Approval', type: 'Environmental/Regulatory Challenge', parties: 'Viasat Inc. vs. FCC / SpaceX', status: 'active', year: 2022, jurisdiction: 'D.C. Circuit Court of Appeals', description: 'Viasat challenged the FCC\'s approval of SpaceX\'s Starlink Gen2 constellation (up to 29,988 satellites), arguing the FCC failed to conduct proper environmental review under NEPA regarding orbital debris and light pollution impacts.', significance: 'First major court challenge to apply environmental law principles to satellite constellation approvals. Could set precedent for environmental review of large-scale space activities.', outcome: 'Court remanded to FCC for further review; operations allowed to continue pending review' },
];

const REGULATORY_BODIES: RegulatoryBody[] = [
  { id: 'unoosa', name: 'United Nations Office for Outer Space Affairs', abbreviation: 'UNOOSA', type: 'un', headquarters: 'Vienna, Austria', established: 1958, members: '193 UN Member States', mandate: 'Promote international cooperation in the peaceful use of outer space and serve as the secretariat for COPUOS.', keyFunctions: ['Secretariat for COPUOS and its subcommittees','Maintains the UN Register of Objects Launched into Outer Space','Administers UN space treaties','Capacity building in space science and technology','Space4SDGs initiative for sustainable development'], website: 'https://www.unoosa.org' },
  { id: 'copuos', name: 'Committee on the Peaceful Uses of Outer Space', abbreviation: 'COPUOS', type: 'un', headquarters: 'Vienna, Austria', established: 1959, members: '102 Member States', mandate: 'Review international cooperation in peaceful uses of outer space, study space-related activities, and prepare programs for UN cooperation.', keyFunctions: ['Forum for developing international space law','Scientific and Technical Subcommittee (STSC)','Legal Subcommittee (LSC)','Long-term sustainability of outer space activities guidelines','Review of national space legislation'], website: 'https://www.unoosa.org/oosa/en/ourwork/copuos/index.html' },
  { id: 'itu', name: 'International Telecommunication Union', abbreviation: 'ITU', type: 'un', headquarters: 'Geneva, Switzerland', established: 1865, members: '193 Member States', mandate: 'Coordinate global use of the radio spectrum and satellite orbits, develop technical standards, and promote connectivity.', keyFunctions: ['Radio Regulations governing spectrum and orbital slots','World Radiocommunication Conference (WRC) every 4 years','Coordination of geostationary and non-geostationary satellite networks','Master International Frequency Register (MIFR)','Technical standards for satellite communications'], website: 'https://www.itu.int' },
  { id: 'faa-ast', name: 'Federal Aviation Administration - Office of Commercial Space Transportation', abbreviation: 'FAA/AST', type: 'national', headquarters: 'Washington, D.C., USA', established: 1984, members: 'United States', mandate: 'License and regulate commercial launch and reentry operations to protect public health, safety, and the environment.', keyFunctions: ['Commercial launch and reentry vehicle licensing','Launch site operator licensing','Safety inspections and mishap investigations','Financial responsibility requirements','Environmental reviews under NEPA'], website: 'https://www.faa.gov/space' },
  { id: 'fcc', name: 'Federal Communications Commission', abbreviation: 'FCC', type: 'national', headquarters: 'Washington, D.C., USA', established: 1934, members: 'United States', mandate: 'Regulate radio spectrum use including satellite communications, and enforce orbital debris mitigation rules for US-licensed satellites.', keyFunctions: ['Satellite licensing and spectrum authorization','Orbital debris mitigation rules (25-year / 5-year rule)','Earth station licensing','NGSO constellation coordination','Space station authorization and market access'], website: 'https://www.fcc.gov' },
  { id: 'noaa', name: 'National Oceanic and Atmospheric Administration', abbreviation: 'NOAA', type: 'national', headquarters: 'Washington, D.C., USA', established: 1970, members: 'United States', mandate: 'License and regulate private remote sensing satellite systems operating from the US.', keyFunctions: ['Private remote sensing licensing under Title 51','Satellite imagery data policy','Weather satellite operations','Ocean and atmospheric monitoring','Space weather prediction services'], website: 'https://www.noaa.gov' },
  { id: 'esa', name: 'European Space Agency', abbreviation: 'ESA', type: 'regional', headquarters: 'Paris, France', established: 1975, members: '22 Member States', mandate: 'Develop Europe\'s space capability and ensure that investment in space continues to deliver benefits to citizens.', keyFunctions: ['Space program development and execution','Technology development and transfer','International space cooperation coordination','Space Safety Programme (debris, asteroids, space weather)','Commercial space industry support'], website: 'https://www.esa.int' },
  { id: 'euspa', name: 'European Union Agency for the Space Programme', abbreviation: 'EUSPA', type: 'regional', headquarters: 'Prague, Czech Republic', established: 2021, members: 'European Union', mandate: 'Manage Galileo, EGNOS, and Copernicus services and contribute to the EU Space Programme.', keyFunctions: ['Galileo navigation system operations','Copernicus Earth observation management','EU Space Programme market development','Space traffic management support','GOVSATCOM secure communications'], website: 'https://www.euspa.europa.eu' },
  { id: 'caa-uk', name: 'Civil Aviation Authority (UK Space)', abbreviation: 'CAA', type: 'national', headquarters: 'London, United Kingdom', established: 1972, members: 'United Kingdom', mandate: 'Regulate spaceflight activities in the UK under the Space Industry Act 2018.', keyFunctions: ['Spaceflight operator licensing','Spaceport licensing','Range safety and control','Orbital operator licensing','Coordination with UKSA on policy'], website: 'https://www.caa.co.uk' },
  { id: 'cnes', name: 'Centre National d\'Etudes Spatiales', abbreviation: 'CNES', type: 'national', headquarters: 'Paris, France', established: 1961, members: 'France', mandate: 'Implement French space policy, license and supervise space operations under the French Space Operations Act.', keyFunctions: ['Space operations authorization and supervision','Technical regulatory standards development','Launch operations from Guiana Space Centre','Debris mitigation compliance enforcement','Space situational awareness services'], website: 'https://cnes.fr' },
  { id: 'in-space', name: 'Indian National Space Promotion and Authorization Centre', abbreviation: 'IN-SPACe', type: 'national', headquarters: 'Ahmedabad, India', established: 2020, members: 'India', mandate: 'Authorize, regulate, and promote private space activities in India as a single-window clearance agency.', keyFunctions: ['Authorization for private space activities','ISRO facility access coordination','Technology transfer oversight','Policy recommendations to DOS','Promotion of space startups and industry'], website: 'https://www.inspace.gov.in' },
  { id: 'iadc', name: 'Inter-Agency Space Debris Coordination Committee', abbreviation: 'IADC', type: 'industry', headquarters: 'Rotating Chair', established: 1993, members: '13 Space Agencies (NASA, ESA, JAXA, CNSA, Roscosmos, etc.)', mandate: 'Coordinate efforts between space agencies to address debris issues and develop mitigation guidelines.', keyFunctions: ['Space debris mitigation guidelines development','Conjunction assessment coordination','Debris environment modeling','Re-entry safety analysis','Best practices for satellite design and operations'], website: 'https://www.iadc-home.org' },
  { id: 'confers', name: 'Consortium for Execution of Rendezvous and Servicing Operations', abbreviation: 'CONFERS', type: 'industry', headquarters: 'USA', established: 2018, members: 'Industry Consortium', mandate: 'Develop industry standards and best practices for on-orbit servicing and rendezvous and proximity operations (RPO).', keyFunctions: ['Guiding principles for commercial RPO and OOS','Industry technical standards development','Government engagement on policy frameworks','Safety of operations guidance','Stakeholder coordination on space sustainability'], website: 'https://www.satelliteconfers.org' },
  { id: 'ofcom', name: 'Office of Communications', abbreviation: 'Ofcom', type: 'national', headquarters: 'London, United Kingdom', established: 2003, members: 'United Kingdom', mandate: 'Regulate satellite communications and spectrum use in the UK.', keyFunctions: ['Satellite spectrum licensing in the UK','Interference management','ITU coordination for UK satellite networks','Spectrum allocation and management','Broadcasting satellite regulation'], website: 'https://www.ofcom.org.uk' },
];

// ############################################################################
// REGULATORY FILINGS - Types, Status Configs, and Data
// ############################################################################

type FilingStatus = 'granted' | 'pending' | 'denied' | 'dismissed' | 'amended' | 'active' | 'expired' | 'proposed' | 'final' | 'comment';

interface FCCFiling { id: string; callSign?: string; fileNumber: string; applicant: string; filingType: string; band: string; orbitType: 'NGSO' | 'GSO' | 'HEO' | 'MEO'; status: FilingStatus; dateFiled: string; dateActedOn?: string; satelliteCount?: number; summary: string; docket?: string; }
interface FAALicense { id: string; licenseNumber: string; licensee: string; licenseType: 'Launch' | 'Reentry' | 'Launch Site' | 'Launch/Reentry'; vehicle: string; launchSite: string; status: FilingStatus; dateIssued: string; expirationDate: string; missionsAuthorized: number; summary: string; }
interface ITUFiling { id: string; networkName: string; administration: string; filingType: 'AP30/30A' | 'AP30B' | 'Art.9 Coordination' | 'Art.11 Notification' | 'Due Diligence'; serviceBand: string; orbitType: 'GSO' | 'NGSO' | 'HEO' | 'MEO'; status: FilingStatus; dateFiled: string; satellites?: number; summary: string; }
interface SECFiling { id: string; company: string; ticker: string; filingType: '10-K' | '10-Q' | '8-K' | 'S-1' | 'DEF 14A' | '13F' | 'SC 13D'; dateFiled: string; period?: string; summary: string; keyMetric?: string; keyMetricLabel?: string; url: string; }
interface FederalRegisterEntry { id: string; agency: string; title: string; documentType: 'Proposed Rule' | 'Final Rule' | 'Notice' | 'Presidential Document' | 'Request for Comment'; federalRegisterNumber: string; publishedDate: string; commentDeadline?: string; effectiveDate?: string; impact: 'high' | 'medium' | 'low'; summary: string; docket?: string; }

const FILING_STATUS_STYLES: Record<FilingStatus, { label: string; bg: string; text: string }> = {
  granted: { label: 'Granted', bg: 'bg-green-500/20', text: 'text-green-400' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  denied: { label: 'Denied', bg: 'bg-red-500/20', text: 'text-red-400' },
  dismissed: { label: 'Dismissed', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  amended: { label: 'Amended', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  active: { label: 'Active', bg: 'bg-green-500/20', text: 'text-green-400' },
  expired: { label: 'Expired', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  proposed: { label: 'Proposed', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  final: { label: 'Final Rule', bg: 'bg-green-500/20', text: 'text-green-400' },
  comment: { label: 'Open for Comment', bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
};

const FILING_IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
};

const FILING_ORBIT_STYLES: Record<string, { bg: string; text: string }> = {
  NGSO: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  GSO: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  HEO: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  MEO: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
};

const FCC_FILINGS: FCCFiling[] = [
  { id: 'fcc-1', callSign: 'S3070', fileNumber: 'SAT-MPL-20200526-00062', applicant: 'SpaceX Services, Inc.', filingType: 'Part 25 NGSO Modification', band: 'Ku/Ka-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2020-05-26', dateActedOn: '2021-04-27', satelliteCount: 2814, summary: 'SpaceX Gen2 modification to lower orbital shells from 1,110 km to 540-570 km for up to 2,814 satellites. Approved by FCC with conditions on debris mitigation and interference protection to GSO systems.', docket: 'IBFS File No. SAT-MPL-20200526-00062' },
  { id: 'fcc-2', callSign: 'S3070', fileNumber: 'SAT-MOD-20230120-00012', applicant: 'SpaceX Services, Inc.', filingType: 'Part 25 Gen2 System', band: 'Ku/Ka/V-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2022-01-18', dateActedOn: '2023-12-01', satelliteCount: 7500, summary: 'SpaceX Second Generation (Gen2) constellation authorization for 7,500 satellites across multiple orbital shells (525-535 km). FCC approved a reduced constellation from the requested 29,988 satellites with conditions on space debris and coordination.', docket: 'IB Docket No. 22-271' },
  { id: 'fcc-3', fileNumber: 'SAT-LOA-20200721-00073', applicant: 'Kuiper Systems LLC (Amazon)', filingType: 'Part 25 NGSO License', band: 'Ka-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2019-07-04', dateActedOn: '2020-07-30', satelliteCount: 3236, summary: 'Amazon Project Kuiper authorization for 3,236-satellite broadband constellation in three orbital shells (590 km, 610 km, 630 km). FCC imposed milestone requirements: 50% by 2026-07-30, 100% by 2029-07-30.', docket: 'IBFS File No. SAT-LOA-20200721-00073' },
  { id: 'fcc-4', fileNumber: 'SAT-MOD-20231030-00156', applicant: 'Kuiper Systems LLC (Amazon)', filingType: 'Part 25 Modification', band: 'Ka-band', orbitType: 'NGSO', status: 'pending', dateFiled: '2023-10-30', satelliteCount: 7774, summary: 'Amazon Kuiper modification request to expand constellation to 7,774 satellites and add V-band frequencies. If approved, would more than double the authorized constellation size with additional orbital planes.' },
  { id: 'fcc-5', callSign: 'S2935', fileNumber: 'SAT-LOI-20160428-00041', applicant: 'OneWeb (Network Access Associates)', filingType: 'Part 25 NGSO License', band: 'Ku/Ka-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2016-04-28', dateActedOn: '2017-06-22', satelliteCount: 720, summary: 'OneWeb authorization for 720-satellite LEO broadband constellation at 1,200 km altitude. Later modified to include 48,000-satellite Phase 2. Post-bankruptcy, Eutelsat OneWeb continues operations with 634 satellites in orbit.' },
  { id: 'fcc-6', fileNumber: 'SAT-LOA-20221003-00109', applicant: 'AST SpaceMobile, Inc.', filingType: 'Part 25 NGSO License', band: 'V-band (feeder links)', orbitType: 'NGSO', status: 'granted', dateFiled: '2022-10-03', dateActedOn: '2023-09-21', satelliteCount: 243, summary: 'AST SpaceMobile authorization for 243 BlueBird satellites providing direct-to-cellular broadband service. V-band feeder links with terrestrial mobile spectrum used for service links through MNO partnerships.' },
  { id: 'fcc-7', fileNumber: 'SAT-LOA-20230301-00034', applicant: 'Lynk Global, Inc.', filingType: 'Part 25 NGSO License', band: 'Cellular bands (service), Ku-band (feeder)', orbitType: 'NGSO', status: 'granted', dateFiled: '2023-03-01', dateActedOn: '2023-12-07', satelliteCount: 100, summary: 'Lynk Global authorization for satellite-to-cell-phone service constellation. First company to receive FCC commercial license for direct satellite-to-standard-phone connectivity.' },
  { id: 'fcc-8', fileNumber: 'SAT-MOD-20240315-00048', applicant: 'Telesat Canada', filingType: 'Part 25 NGSO Market Access', band: 'Ka-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2018-11-02', dateActedOn: '2024-03-15', satelliteCount: 198, summary: 'Telesat Lightspeed constellation US market access for 198 LEO satellites at 1,015-1,325 km. Enterprise-focused broadband constellation targeting government and aviation connectivity markets.' },
  { id: 'fcc-9', fileNumber: 'SAT-LOA-20231215-00187', applicant: 'Rivada Space Networks GmbH', filingType: 'Part 25 NGSO License', band: 'Ka/V-band', orbitType: 'NGSO', status: 'pending', dateFiled: '2023-12-15', satelliteCount: 600, summary: 'Rivada Space Networks application for 600-satellite LEO constellation providing secure mesh networking with optical inter-satellite links. Targeting government and enterprise markets with low-latency data relay.' },
  { id: 'fcc-10', fileNumber: 'SAT-LOA-20240201-00019', applicant: 'Astranis Space Technologies', filingType: 'Part 25 GSO Application', band: 'Ka-band', orbitType: 'GSO', status: 'granted', dateFiled: '2024-02-01', dateActedOn: '2024-08-15', satelliteCount: 1, summary: 'Astranis MicroGEO satellite application for dedicated broadband capacity to underserved markets. Ultra-small GEO spacecraft design enables dedicated single-country coverage at lower cost than traditional GSO birds.' },
  { id: 'fcc-11', fileNumber: 'SAT-RPL-20240615-00089', applicant: 'SES S.A.', filingType: 'Part 25 GSO Replacement', band: 'C/Ku-band', orbitType: 'GSO', status: 'pending', dateFiled: '2024-06-15', satelliteCount: 1, summary: 'SES replacement satellite application for SES-22 at 135 degrees West. Continuing C-band and Ku-band services post C-band transition with upgraded high-throughput payload.' },
  { id: 'fcc-12', fileNumber: 'SAT-LOA-20240901-00112', applicant: 'Mangata Networks LLC', filingType: 'Part 25 HEO/MEO License', band: 'Ka/Q/V-band', orbitType: 'HEO', status: 'pending', dateFiled: '2024-09-01', satelliteCount: 791, summary: 'Mangata Networks application for hybrid HEO/MEO constellation of 791 satellites. Unique highly elliptical orbit design provides persistent high-latitude coverage for Arctic regions and government users.' },
];

const FAA_LICENSES: FAALicense[] = [
  { id: 'faa-1', licenseNumber: 'LRLO 24-118A', licensee: 'Space Exploration Technologies Corp.', licenseType: 'Launch/Reentry', vehicle: 'Falcon 9 / Dragon', launchSite: 'KSC LC-39A, CCSFS SLC-40, VSFB SLC-4E', status: 'active', dateIssued: '2024-01-15', expirationDate: '2029-01-15', missionsAuthorized: 100, summary: 'Operator license for Falcon 9 launch and Dragon spacecraft reentry operations. Covers all SpaceX launch sites including Kennedy Space Center, Cape Canaveral Space Force Station, and Vandenberg Space Force Base.' },
  { id: 'faa-2', licenseNumber: 'LRLO 23-112', licensee: 'Space Exploration Technologies Corp.', licenseType: 'Launch/Reentry', vehicle: 'Starship / Super Heavy', launchSite: 'Boca Chica, TX (Starbase)', status: 'active', dateIssued: '2023-06-14', expirationDate: '2028-06-14', missionsAuthorized: 10, summary: 'Launch and reentry license for Starship/Super Heavy vehicle from Starbase, Boca Chica. Multiple test flights conducted under this license including IFT-1 through IFT-6. Subject to environmental mitigations per FAA Programmatic Environmental Assessment.' },
  { id: 'faa-3', licenseNumber: 'LRLO 24-120', licensee: 'Rocket Lab USA, Inc.', licenseType: 'Launch', vehicle: 'Electron', launchSite: 'Wallops Flight Facility LC-2, Mahia LC-1 (NZ)', status: 'active', dateIssued: '2024-03-01', expirationDate: '2029-03-01', missionsAuthorized: 50, summary: 'Operator license for Electron small launch vehicle. Covers US launches from Mid-Atlantic Regional Spaceport at Wallops Island and supports New Zealand launches from Mahia Peninsula Launch Complex 1.' },
  { id: 'faa-4', licenseNumber: 'LRLO 24-122', licensee: 'Rocket Lab USA, Inc.', licenseType: 'Launch', vehicle: 'Neutron', launchSite: 'Wallops Flight Facility LC-3', status: 'pending', dateIssued: '2024-11-01', expirationDate: '2029-11-01', missionsAuthorized: 25, summary: 'Application for Neutron medium-lift vehicle launch license from new pad at Wallops Flight Facility. Neutron is an 8-ton-to-LEO reusable rocket targeting 2025 first flight for mega-constellation deployment and national security missions.' },
  { id: 'faa-5', licenseNumber: 'LRLO 23-108', licensee: 'United Launch Alliance, LLC', licenseType: 'Launch', vehicle: 'Vulcan Centaur', launchSite: 'CCSFS SLC-41', status: 'active', dateIssued: '2023-12-20', expirationDate: '2028-12-20', missionsAuthorized: 30, summary: 'Launch license for Vulcan Centaur rocket from Cape Canaveral SLC-41. Inaugural Cert-1 mission launched January 2024 carrying Astrobotic Peregrine lunar lander. Vehicle certified for National Security Space Launch missions.' },
  { id: 'faa-6', licenseNumber: 'LRLO 24-115', licensee: 'Firefly Aerospace, Inc.', licenseType: 'Launch', vehicle: 'Alpha / MLV', launchSite: 'VSFB SLC-2', status: 'active', dateIssued: '2024-02-10', expirationDate: '2029-02-10', missionsAuthorized: 20, summary: 'Operator license for Firefly Alpha small launch vehicle and future Medium Launch Vehicle (MLV). Alpha has achieved multiple successful orbital missions. MLV under development in partnership with Northrop Grumman.' },
  { id: 'faa-7', licenseNumber: 'LRLO 24-119', licensee: 'Relativity Space, Inc.', licenseType: 'Launch', vehicle: 'Terran R', launchSite: 'CCSFS LC-16', status: 'pending', dateIssued: '2024-06-01', expirationDate: '2029-06-01', missionsAuthorized: 15, summary: 'Application for Terran R fully reusable, 3D-printed medium-lift launch vehicle. First launch targeted from Cape Canaveral LC-16. Designed to lift 23,500 kg to LEO with full reusability.' },
  { id: 'faa-8', licenseNumber: 'LRLO 23-105', licensee: 'Blue Origin, LLC', licenseType: 'Launch', vehicle: 'New Glenn', launchSite: 'CCSFS LC-36', status: 'active', dateIssued: '2024-07-01', expirationDate: '2029-07-01', missionsAuthorized: 25, summary: 'Launch license for New Glenn heavy-lift orbital vehicle from Cape Canaveral LC-36. Inaugural flight (NG-1) launched October 2024 carrying ESCAPADE Mars mission prototype. Booster landing attempt on first flight.' },
  { id: 'faa-9', licenseNumber: 'RSO 24-003', licensee: 'Blue Origin, LLC', licenseType: 'Reentry', vehicle: 'New Shepard', launchSite: 'West Texas Launch Site', status: 'active', dateIssued: '2024-04-01', expirationDate: '2026-04-01', missionsAuthorized: 12, summary: 'Reentry license for New Shepard suborbital vehicle crew capsule recovery. Supports human spaceflight tourism and research payload missions from West Texas Launch Site near Van Horn.' },
  { id: 'faa-10', licenseNumber: 'LRLO 24-125', licensee: 'Stoke Space Technologies, Inc.', licenseType: 'Launch', vehicle: 'Nova', launchSite: 'CCSFS (TBD)', status: 'pending', dateIssued: '2024-09-15', expirationDate: '2029-09-15', missionsAuthorized: 10, summary: 'Application for Nova fully reusable launch vehicle. Stoke Space is developing a fully reusable rocket with a novel second-stage heat shield design for upper stage return and reuse.' },
  { id: 'faa-11', licenseNumber: 'LSO 20-014A', licensee: 'Space Florida', licenseType: 'Launch Site', vehicle: 'N/A', launchSite: 'Cape Canaveral Spaceport', status: 'active', dateIssued: '2020-08-15', expirationDate: '2025-08-15', missionsAuthorized: 0, summary: 'Launch site operator license for Cape Canaveral Spaceport facilities managed by Space Florida. Supports commercial launch operations from multiple pads including horizontal launch capabilities.' },
  { id: 'faa-12', licenseNumber: 'LRLO 24-128', licensee: 'Intuitive Machines, LLC', licenseType: 'Launch/Reentry', vehicle: 'Nova-C Lunar Lander', launchSite: 'KSC (via SpaceX F9)', status: 'active', dateIssued: '2024-01-20', expirationDate: '2026-01-20', missionsAuthorized: 5, summary: 'Reentry authorization for Nova-C lunar lander operations under NASA CLPS program. IM-1 (Odysseus) successfully landed on the Moon in February 2024, becoming the first US commercial lunar landing.' },
];

const ITU_FILINGS: ITUFiling[] = [
  { id: 'itu-1', networkName: 'STARLINK', administration: 'United States (FCC)', filingType: 'Art.9 Coordination', serviceBand: 'Ku/Ka/V-band', orbitType: 'NGSO', status: 'active', dateFiled: '2016-11-15', satellites: 11943, summary: 'ITU coordination filings for SpaceX Starlink NGSO constellation across multiple orbital shells. Active coordination with GSO operators under Article 9.12 and NGSO operators under Article 9.12A. EPFD validation ongoing per Article 22.' },
  { id: 'itu-2', networkName: 'KUIPER', administration: 'United States (FCC)', filingType: 'Art.9 Coordination', serviceBand: 'Ka-band', orbitType: 'NGSO', status: 'active', dateFiled: '2018-12-12', satellites: 3236, summary: 'Amazon Kuiper NGSO system coordination filings for 3,236-satellite Ka-band constellation. Coordination requests with existing GSO and NGSO operators. Due diligence milestones being tracked by ITU BR.' },
  { id: 'itu-3', networkName: 'ONEWEB', administration: 'United Kingdom (Ofcom)', filingType: 'Art.9 Coordination', serviceBand: 'Ku/Ka-band', orbitType: 'NGSO', status: 'active', dateFiled: '2015-06-01', satellites: 648, summary: 'Eutelsat OneWeb LEO broadband constellation filed through UK administration. Phase 1 (648 satellites at 1,200 km) largely deployed. Coordination with GSO operators in Ku-band ongoing.' },
  { id: 'itu-4', networkName: 'O3B-2', administration: 'Luxembourg', filingType: 'Art.9 Coordination', serviceBand: 'Ka-band', orbitType: 'MEO', status: 'active', dateFiled: '2017-03-20', satellites: 11, summary: 'SES O3b mPOWER next-generation MEO constellation. 11 high-throughput satellites in 8,062 km orbit. Fully deployed as of 2024, providing terabit-scale connectivity. Coordinated through Luxembourg administration.' },
  { id: 'itu-5', networkName: 'TELESAT-LEO-V2', administration: 'Canada (ISED)', filingType: 'Art.9 Coordination', serviceBand: 'Ka-band', orbitType: 'NGSO', status: 'active', dateFiled: '2020-08-15', satellites: 198, summary: 'Telesat Lightspeed LEO constellation coordination through Canadian administration (ISED). 198 Ka-band satellites in polar and inclined orbits at 1,015-1,325 km. Enterprise-focused broadband service.' },
  { id: 'itu-6', networkName: 'CINNAMON-937', administration: 'Rwanda (RURA)', filingType: 'Art.9 Coordination', serviceBand: 'V/E-band', orbitType: 'NGSO', status: 'pending', dateFiled: '2021-09-08', satellites: 327000, summary: 'Controversial filing through Rwanda for massive 327,000-satellite constellation. Widely suspected to be linked to undisclosed commercial entity. ITU BR has requested additional due diligence information. Raised concerns about spectrum warehousing.' },
  { id: 'itu-7', networkName: 'GW-A59', administration: 'China (MIIT)', filingType: 'Art.9 Coordination', serviceBand: 'Ka/V-band', orbitType: 'NGSO', status: 'active', dateFiled: '2020-09-21', satellites: 12992, summary: 'China SatNet (Guowang) NGSO mega-constellation filing for 12,992 satellites. Filed through Chinese administration as national broadband satellite project. Coordination challenges with existing Starlink and Kuiper filings in overlapping bands.' },
  { id: 'itu-8', networkName: 'IRIS2-EU', administration: 'France (ANFR) / EU', filingType: 'Art.9 Coordination', serviceBand: 'Ku/Ka-band', orbitType: 'NGSO', status: 'pending', dateFiled: '2024-03-01', satellites: 290, summary: 'European Union IRIS2 sovereign connectivity constellation. Multi-orbit system with 290 satellites filed through ANFR. Consortium led by SES, Eutelsat, Hispasat, and Telespazio. Deployment planned 2028-2030.' },
  { id: 'itu-9', networkName: 'LIGHTSPEED-DD', administration: 'Canada (ISED)', filingType: 'Due Diligence', serviceBand: 'Ka-band', orbitType: 'NGSO', status: 'active', dateFiled: '2024-06-01', satellites: 198, summary: 'Telesat Lightspeed due diligence filing demonstrating concrete plans for constellation deployment. Manufacturing contract with MDA and launch contracts required by ITU milestones to maintain spectrum priority.' },
  { id: 'itu-10', networkName: 'ASTRA-3B-KA', administration: 'Luxembourg', filingType: 'AP30B', serviceBand: 'Ka-band', orbitType: 'GSO', status: 'granted', dateFiled: '2023-07-15', satellites: 1, summary: 'SES ASTRA 3B Ka-band plan filing under Appendix 30B for fixed-satellite service in the planned Ka-band allotment plan. Part of SES fleet replacement strategy for European coverage.' },
];

const SEC_FILINGS: SECFiling[] = [
  { id: 'sec-1', company: 'Rocket Lab USA, Inc.', ticker: 'RKLB', filingType: '10-K', dateFiled: '2025-02-27', period: 'FY 2024', summary: 'Annual report reflecting record revenue of $436M (up 78% YoY). Electron achieved 50th launch milestone. Neutron development on track for 2025 first flight. Space Systems segment growing with HASTE hypersonic contracts and satellite manufacturing.', keyMetric: '$436M', keyMetricLabel: 'FY24 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=RKLB&type=10-K' },
  { id: 'sec-2', company: 'Rocket Lab USA, Inc.', ticker: 'RKLB', filingType: '8-K', dateFiled: '2025-01-15', summary: 'Current report announcing $515M contract from classified US government customer for satellite constellation development and launch services using Neutron vehicle. Largest single contract in company history.', keyMetric: '$515M', keyMetricLabel: 'Contract Value', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=RKLB&type=8-K' },
  { id: 'sec-3', company: 'Intuitive Machines, Inc.', ticker: 'LUNR', filingType: '10-K', dateFiled: '2025-03-15', period: 'FY 2024', summary: 'Annual report covering historic IM-1 Odysseus lunar landing (Feb 2024) and IM-2 mission preparations. Revenue of $228M driven by NASA CLPS task orders and lunar data services. Backlog exceeds $316M.', keyMetric: '$228M', keyMetricLabel: 'FY24 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=LUNR&type=10-K' },
  { id: 'sec-4', company: 'Intuitive Machines, Inc.', ticker: 'LUNR', filingType: '8-K', dateFiled: '2024-12-10', summary: 'Current report announcing IM-2 mission delay to Q1 2025 due to additional testing requirements for Micro-Nova hopper payload. NASA CLPS CP-12 task order awarded for IM-3 south pole mission.', keyMetric: 'IM-2', keyMetricLabel: 'Mission Update', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=LUNR&type=8-K' },
  { id: 'sec-5', company: 'AST SpaceMobile, Inc.', ticker: 'ASTS', filingType: '10-K', dateFiled: '2025-03-01', period: 'FY 2024', summary: 'Annual report highlighting successful launch of 5 BlueBird Block 1 satellites in September 2024. Pre-revenue stage with $1.5B in MNO partnership agreements covering 2.8B mobile subscribers. Commercial service launch targeted mid-2025.', keyMetric: '$1.5B', keyMetricLabel: 'MNO Agreements', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=ASTS&type=10-K' },
  { id: 'sec-6', company: 'AST SpaceMobile, Inc.', ticker: 'ASTS', filingType: '8-K', dateFiled: '2024-09-12', summary: 'Current report confirming successful deployment and unfurling of five BlueBird satellites. Each satellite features 64 square meter phased array antenna. Initial signal testing with AT&T and Vodafone commenced.', keyMetric: '5 Sats', keyMetricLabel: 'Deployed', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=ASTS&type=8-K' },
  { id: 'sec-7', company: 'Spire Global, Inc.', ticker: 'SPIR', filingType: '10-K', dateFiled: '2025-03-10', period: 'FY 2024', summary: 'Annual report for space-based data analytics company. Revenue of $110M with ARR (annual recurring revenue) of $103M. 100+ satellite constellation providing weather, maritime, and aviation data. Achieved positive adjusted EBITDA in Q4 2024.', keyMetric: '$110M', keyMetricLabel: 'FY24 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=SPIR&type=10-K' },
  { id: 'sec-8', company: 'Planet Labs PBC', ticker: 'PL', filingType: '10-K', dateFiled: '2025-03-28', period: 'FY 2025 (Jan 31)', summary: 'Annual report for Earth observation company. Revenue of $244M operating 200+ imaging satellites. Government segment growing with NRO Electro-Optical CLINs contract. Pelican next-gen satellite constellation deployment begun.', keyMetric: '$244M', keyMetricLabel: 'FY25 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=PL&type=10-K' },
  { id: 'sec-9', company: 'Virgin Galactic Holdings, Inc.', ticker: 'SPCE', filingType: '10-K', dateFiled: '2025-02-28', period: 'FY 2024', summary: 'Annual report covering pause in commercial flights while Delta-class spaceship fleet is developed. Revenue of $8.4M from limited research flights. Cash reserves of $862M. Delta ships expected to begin flights in 2026.', keyMetric: '$862M', keyMetricLabel: 'Cash Reserves', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=SPCE&type=10-K' },
  { id: 'sec-10', company: 'Terran Orbital Corporation', ticker: 'LLAP', filingType: '8-K', dateFiled: '2024-08-12', summary: 'Current report announcing completion of acquisition by Lockheed Martin for $450M. Terran Orbital delisted from NYSE. Satellite manufacturing capabilities integrated into Lockheed Martin Space division.', keyMetric: '$450M', keyMetricLabel: 'Acquisition', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=LLAP&type=8-K' },
  { id: 'sec-11', company: 'Iridium Communications Inc.', ticker: 'IRDM', filingType: '10-K', dateFiled: '2025-02-20', period: 'FY 2024', summary: 'Annual report for global satellite communications company. Revenue of $813M with strong IoT growth (+22% YoY). 66-satellite Iridium NEXT constellation fully operational. Evaluating Iridium NEXT successor architecture for 2030s deployment.', keyMetric: '$813M', keyMetricLabel: 'FY24 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=IRDM&type=10-K' },
  { id: 'sec-12', company: 'Viasat, Inc.', ticker: 'VSAT', filingType: '10-K', dateFiled: '2024-08-15', period: 'FY 2024 (Mar 31)', summary: 'Annual report post-Inmarsat acquisition. Combined revenue of $4.4B. ViaSat-3 Americas satellite operational with 1 Tbps capacity. Integration of Inmarsat fleet and L-band services expanding government and aviation connectivity markets.', keyMetric: '$4.4B', keyMetricLabel: 'FY24 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=VSAT&type=10-K' },
];

const FEDERAL_REGISTER_ENTRIES: FederalRegisterEntry[] = [
  { id: 'fr-1', agency: 'FCC', title: 'Space Innovation: NGSO Deployment Milestone Rules', documentType: 'Final Rule', federalRegisterNumber: '2024-12456', publishedDate: '2024-09-29', effectiveDate: '2024-11-15', impact: 'high', summary: 'Final rule establishing revised deployment milestones for NGSO satellite constellations. Requires licensees to deploy 50% of authorized satellites within 6 years and 100% within 9 years of authorization or face license reduction or revocation.', docket: 'IB Docket No. 22-271' },
  { id: 'fr-2', agency: 'FCC', title: 'Mitigation of Orbital Debris in the New Space Age', documentType: 'Final Rule', federalRegisterNumber: '2024-08832', publishedDate: '2024-03-15', effectiveDate: '2024-09-29', impact: 'high', summary: 'Final rule implementing 5-year post-mission disposal rule for LEO satellites, replacing previous 25-year guideline. Requires operators to demonstrate ability to deorbit within 5 years or provide surety bond. Applies to all new applications.', docket: 'IB Docket No. 18-313' },
  { id: 'fr-3', agency: 'FCC', title: 'Single Network Future: Supplemental Coverage from Space', documentType: 'Proposed Rule', federalRegisterNumber: '2024-15678', publishedDate: '2024-11-20', commentDeadline: '2025-02-20', impact: 'high', summary: 'NPRM proposing framework for direct-to-device satellite services using terrestrial mobile spectrum. Would allow satellite operators to use MNO spectrum with MNO consent. Addresses interference management, international coordination, and emergency services.', docket: 'GN Docket No. 23-65' },
  { id: 'fr-4', agency: 'FAA', title: 'Streamlining Launch and Reentry Licensing Requirements', documentType: 'Final Rule', federalRegisterNumber: '2024-09901', publishedDate: '2024-05-18', effectiveDate: '2025-03-21', impact: 'high', summary: 'Part 450 final rule completing modernization of commercial space launch and reentry regulations. Replaces prescriptive approach with performance-based standards. Enables operator licenses instead of per-mission licenses. Reduces licensing timeline from 180 to 120 days.', docket: 'FAA-2019-0229' },
  { id: 'fr-5', agency: 'FAA', title: 'Commercial Space Launch Safety: Updated Populated Area Restrictions', documentType: 'Proposed Rule', federalRegisterNumber: '2024-22109', publishedDate: '2024-12-01', commentDeadline: '2025-03-01', impact: 'medium', summary: 'Proposed amendments to individual risk criteria and expected casualty calculations for launch and reentry operations near populated areas. Responds to increased launch cadence from sites near communities.', docket: 'FAA-2024-1456' },
  { id: 'fr-6', agency: 'NOAA', title: 'Licensing of Private Remote Sensing Space Systems', documentType: 'Final Rule', federalRegisterNumber: '2024-07234', publishedDate: '2024-04-10', effectiveDate: '2024-07-01', impact: 'medium', summary: 'Revised Part 960 regulations simplifying NOAA remote sensing licensing. Creates tiered licensing approach based on data capabilities. Reduces processing times and eliminates unnecessary conditions for Tier 1 (publicly available quality) systems.', docket: 'NOAA-2023-0105' },
  { id: 'fr-7', agency: 'BIS', title: 'Space-Related Export Controls: Commerce Control List Updates', documentType: 'Final Rule', federalRegisterNumber: '2024-18876', publishedDate: '2024-10-05', effectiveDate: '2024-12-01', impact: 'medium', summary: 'Updates to ECCN 9x515 series and related space items on the Commerce Control List. Clarifies EAR jurisdiction over commercial satellite components and adds new license exception provisions for allied nation satellite programs.', docket: 'BIS-2024-0012' },
  { id: 'fr-8', agency: 'FCC', title: '12 GHz Band: Protecting NGSO Satellite Operations', documentType: 'Notice', federalRegisterNumber: '2024-20543', publishedDate: '2024-11-01', commentDeadline: '2025-01-15', impact: 'high', summary: 'Public notice seeking further comment on 12 GHz band sharing between NGSO satellite downlinks and proposed terrestrial 5G services. FCC requests updated interference analyses given Starlink constellation growth since original NPRM.', docket: 'WT Docket No. 20-443' },
  { id: 'fr-9', agency: 'DoC', title: 'National Spectrum Strategy Implementation Plan', documentType: 'Notice', federalRegisterNumber: '2024-14321', publishedDate: '2024-08-20', commentDeadline: '2024-11-20', impact: 'high', summary: 'Department of Commerce implementation plan for the National Spectrum Strategy. Identifies 2,786 MHz of spectrum for study including bands used for satellite operations. Establishes interagency coordination framework between DoD, FCC, NTIA, and NASA.', docket: 'DOC-2024-0015' },
  { id: 'fr-10', agency: 'FCC', title: 'Space Bureau: Satellite Licensing Process Improvements', documentType: 'Notice', federalRegisterNumber: '2024-25678', publishedDate: '2024-12-15', commentDeadline: '2025-03-15', impact: 'medium', summary: 'FCC Space Bureau request for comment on streamlining satellite licensing. Proposes consolidated application forms, expedited review for small satellite systems, and digital filing improvements for Part 25 applications.', docket: 'IB Docket No. 24-89' },
  { id: 'fr-11', agency: 'FAA', title: 'Commercial Human Spaceflight: Extension of Learning Period Moratorium', documentType: 'Notice', federalRegisterNumber: '2024-11234', publishedDate: '2024-06-15', impact: 'medium', summary: 'Notice extending the commercial human spaceflight "learning period" moratorium on FAA safety regulations for spaceflight participants through January 2026. Congress continues to evaluate appropriate regulatory framework.', docket: 'FAA-2024-0891' },
  { id: 'fr-12', agency: 'OSTP', title: 'United States Space Priorities Framework Update', documentType: 'Presidential Document', federalRegisterNumber: '2024-16789', publishedDate: '2024-09-10', impact: 'high', summary: 'Updated Space Priorities Framework directing agencies to streamline commercial space regulations, enhance space situational awareness sharing, and establish spectrum protection for critical space services. Mandates interagency review completion within 180 days.' },
];

type FilingsTabId = 'fcc' | 'faa' | 'itu' | 'sec' | 'federal-register';

const FILINGS_TABS: { id: FilingsTabId; label: string; count: number }[] = [
  { id: 'fcc', label: 'FCC Filings', count: FCC_FILINGS.length },
  { id: 'faa', label: 'FAA Licenses', count: FAA_LICENSES.length },
  { id: 'itu', label: 'ITU Filings', count: ITU_FILINGS.length },
  { id: 'sec', label: 'SEC & Financial', count: SEC_FILINGS.length },
  { id: 'federal-register', label: 'Federal Register', count: FEDERAL_REGISTER_ENTRIES.length },
];

// ############################################################################
// COMPLIANCE SECTION COMPONENTS (existing)
// ############################################################################

function PolicyCard({ policy }: { policy: PolicyChange }) {
  const severityColors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const statusColors = {
    proposed: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    effective: 'bg-green-500/20 text-green-400',
    final: 'bg-green-500/20 text-green-400',
    withdrawn: 'bg-slate-500/20 text-slate-400',
    superseded: 'bg-slate-500/20 text-slate-400',
  };
  const agencyIcons: Record<string, string> = {
    FAA: '\u2708\uFE0F', FCC: '\uD83D\uDCE1', NOAA: '\uD83C\uDF0A', BIS: '\uD83D\uDCE6', DDTC: '\uD83D\uDD12', NASA: '\uD83D\uDE80', DOD: '\uD83C\uDF96\uFE0F', DOS: '\uD83C\uDFDB\uFE0F',
  };
  const deadline = policy.commentDeadline ? new Date(policy.commentDeadline) : null;
  const isUrgent = deadline && deadline > new Date() && deadline < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agencyIcons[policy.agency] || '\uD83D\uDCCB'}</span>
          <span className="text-xs font-bold text-nebula-300 bg-slate-100 px-2 py-1 rounded">{policy.agency}</span>
          <span className={`text-xs px-2 py-1 rounded ${statusColors[policy.status]}`}>{policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded border ${severityColors[policy.impactSeverity]}`}>{policy.impactSeverity.toUpperCase()} Impact</span>
      </div>
      <h4 className="font-semibold text-slate-900 mb-2">{policy.title}</h4>
      <p className="text-slate-400 text-sm mb-3 line-clamp-3">{policy.summary}</p>
      <div className="bg-slate-50 rounded-lg p-3 mb-3">
        <h5 className="text-xs font-semibold text-slate-700 mb-1">Impact Analysis</h5>
        <p className="text-xs text-slate-400 line-clamp-2">{policy.impactAnalysis}</p>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {policy.affectedParties.slice(0, 3).map((party, i) => (
          <span key={i} className="text-xs bg-nebula-500/10 text-nebula-300 px-2 py-0.5 rounded">{party.replace(/_/g, ' ')}</span>
        ))}
        {policy.affectedParties.length > 3 && (<span className="text-xs text-slate-400">+{policy.affectedParties.length - 3} more</span>)}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{policy.federalRegisterCitation || `Published: ${new Date(policy.publishedDate).toLocaleDateString()}`}</span>
        {deadline && (<span className={`${isUrgent ? 'text-yellow-500 font-semibold' : 'text-slate-400'}`}>{isUrgent && '\u26A0\uFE0F '}Comments due: {deadline.toLocaleDateString()}</span>)}
      </div>
      <a href={policy.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-nebula-300 hover:text-nebula-200 mt-3">View Full Policy &rarr;</a>
    </div>
  );
}

function PolicyTrackerTab() {
  const [agencyFilter, setAgencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filteredPolicies = POLICY_CHANGES.filter(p => { if (agencyFilter && p.agency !== agencyFilter) return false; if (statusFilter && p.status !== statusFilter) return false; return true; });
  const upcomingDeadlines = getUpcomingDeadlines(90);
  return (
    <div>
      {upcomingDeadlines.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-yellow-600 mb-2">Upcoming Regulatory Deadlines</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingDeadlines.slice(0, 3).map((d, i) => (
              <div key={i} className="bg-white rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">{d.policy.agency}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${d.deadlineType === 'comment' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>{d.deadlineType === 'comment' ? 'Comment Deadline' : 'Effective Date'}</span>
                </div>
                <p className="text-sm text-slate-800 line-clamp-1">{d.policy.title}</p>
                <p className="text-xs text-slate-400 mt-1">{d.date.toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm">
          <option value="">All Agencies</option><option value="FAA">FAA (Launches)</option><option value="FCC">FCC (Spectrum)</option><option value="NOAA">NOAA (Remote Sensing)</option><option value="BIS">BIS (Export Controls)</option><option value="DDTC">DDTC (ITAR)</option><option value="NASA">NASA</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option><option value="proposed">Proposed</option><option value="pending">Pending</option><option value="effective">Effective</option><option value="final">Final</option>
        </select>
        <div className="ml-auto">
          <ExportButton data={filteredPolicies} filename="policy-tracker" columns={[{ key: 'agency', label: 'Agency' },{ key: 'title', label: 'Title' },{ key: 'status', label: 'Status' },{ key: 'impactSeverity', label: 'Impact' },{ key: 'summary', label: 'Summary' },{ key: 'publishedDate', label: 'Published' },{ key: 'sourceUrl', label: 'Source' }]} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredPolicies.map((policy) => (<PolicyCard key={policy.id} policy={policy} />))}</div>
    </div>
  );
}

function LicenseCard({ license }: { license: LicenseRequirement }) {
  const [expanded, setExpanded] = useState(false);
  const agencyColors: Record<string, string> = { FAA: 'bg-orange-500/20 text-orange-400 border-orange-500/30', FCC: 'bg-blue-500/20 text-blue-400 border-blue-500/30', NOAA: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-bold px-2 py-1 rounded border ${agencyColors[license.agency] || 'bg-slate-100 text-slate-600'}`}>{license.agency}</span>
        <span className="text-xs text-slate-400">{license.processingTimeMin}-{license.processingTimeMax} days</span>
      </div>
      <h4 className="font-semibold text-slate-900 mb-2">{license.licenseType}</h4>
      <p className="text-slate-400 text-sm mb-3">{license.description}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
        {license.applicationFee && (<span>Application: ${license.applicationFee.toLocaleString()}</span>)}
        {license.annualFee && (<span>Annual: ${license.annualFee.toLocaleString()}</span>)}
        {license.validityYears && (<span>Valid: {license.validityYears} years</span>)}
      </div>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 mb-3">{expanded ? 'Hide Requirements \u25B2' : 'Show Requirements \u25BC'}</button>
      {expanded && (
        <div className="bg-slate-50 rounded-lg p-3 mt-2">
          <h5 className="text-xs font-semibold text-slate-700 mb-2">Requirements Checklist</h5>
          <ul className="space-y-1">
            {(JSON.parse(JSON.stringify(license.requirements)) as string[]).map((req, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-400"><span className="text-nebula-300 mt-0.5">{'\u2610'}</span>{req}</li>))}
          </ul>
          <div className="mt-3 pt-3 border-t border-slate-200"><h5 className="text-xs font-semibold text-slate-700 mb-1">Regulatory Basis</h5><p className="text-xs text-slate-400">{license.regulatoryBasis}</p></div>
          {license.applicationUrl && (<a href={license.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-nebula-300 hover:text-nebula-200">Apply Now &rarr;</a>)}
        </div>
      )}
    </div>
  );
}

function ComplianceWizardTab() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const filteredLicenses = LICENSE_REQUIREMENTS.filter(l => { if (categoryFilter && l.category !== categoryFilter) return false; if (agencyFilter && l.agency !== agencyFilter) return false; return true; });
  return (
    <div>
      <div className="bg-nebula-500/10 border border-nebula-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-nebula-300 mb-2">License Requirements Guide</h4>
        <p className="text-sm text-slate-400">Select your mission type below to see required licenses. Each license includes a checklist of requirements, processing times, fees, and links to application forms.</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm">
          <option value="">All License Types</option><option value="launch">Launch Licenses (FAA)</option><option value="satellite">Satellite Licenses (FCC)</option><option value="remote_sensing">Remote Sensing (NOAA)</option><option value="spectrum">Spectrum (ITU/FCC)</option><option value="export">Export Licenses</option>
        </select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm">
          <option value="">All Agencies</option><option value="FAA">FAA</option><option value="FCC">FCC</option><option value="NOAA">NOAA</option>
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredLicenses.map((license) => (<LicenseCard key={license.id} license={license} />))}</div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">International Treaty Obligations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TREATY_OBLIGATIONS.map((treaty) => (
            <div key={treaty.id} className="card p-4">
              <div className="flex items-start justify-between mb-2"><h4 className="font-semibold text-slate-900">{treaty.name}</h4>{treaty.usRatified && (<span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">US Ratified</span>)}</div>
              <p className="text-xs text-slate-400 mb-2">{treaty.fullName}</p>
              <div className="text-xs text-slate-400"><p><strong>Parties:</strong> {treaty.parties} nations</p><p className="mt-1"><strong>US Implementation:</strong> {treaty.usImplementation}</p></div>
              <a href={treaty.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-nebula-300 hover:text-nebula-200">View Treaty Text &rarr;</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CaseCard({ lawCase }: { lawCase: SpaceLawCase }) {
  const [expanded, setExpanded] = useState(false);
  const outcomeColors = { plaintiff_victory: 'bg-green-500/20 text-green-400', defendant_victory: 'bg-red-500/20 text-red-400', settlement: 'bg-yellow-500/20 text-yellow-400', dismissed: 'bg-slate-500/20 text-slate-400', pending: 'bg-blue-500/20 text-blue-400', vacated: 'bg-purple-500/20 text-purple-400' };
  const jurisdictionIcons = { federal: '\uD83C\uDFDB\uFE0F', international: '\uD83C\uDF0D', arbitration: '\u2696\uFE0F', state: '\uD83C\uDFE2', gao: '\uD83D\uDCCA' };
  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2"><span className="text-xl">{jurisdictionIcons[lawCase.jurisdiction]}</span><span className="text-xs text-slate-400">{lawCase.year}</span></div>
        <span className={`text-xs px-2 py-1 rounded ${outcomeColors[lawCase.outcome]}`}>{lawCase.outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </div>
      <h4 className="font-semibold text-slate-900 mb-1">{lawCase.caseName}</h4>
      {lawCase.citation && (<p className="text-xs text-slate-400 mb-2 font-mono">{lawCase.citation}</p>)}
      <p className="text-slate-400 text-sm mb-3 line-clamp-3">{lawCase.summary}</p>
      <div className="flex flex-wrap gap-1 mb-3">{lawCase.subjectMatter.map((subject, i) => (<span key={i} className="text-xs bg-nebula-500/10 text-nebula-300 px-2 py-0.5 rounded">{subject.replace(/_/g, ' ')}</span>))}</div>
      {lawCase.damages && (<div className="text-sm font-semibold text-green-600 mb-3">Damages: ${lawCase.damages.toLocaleString()}</div>)}
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200">{expanded ? 'Show Less \u25B2' : 'Read More \u25BC'}</button>
      {expanded && (
        <div className="mt-4 space-y-4">
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Parties</h5><p className="text-xs text-slate-400"><strong>Plaintiff:</strong> {lawCase.parties.plaintiff}<br /><strong>Defendant:</strong> {lawCase.parties.defendant}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Facts</h5><p className="text-xs text-slate-400">{lawCase.facts}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Holdings</h5><ul className="text-xs text-slate-400 list-disc list-inside space-y-1">{lawCase.holdings.map((holding, i) => (<li key={i}>{holding}</li>))}</ul></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Significance</h5><p className="text-xs text-slate-400">{lawCase.significance}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Precedent Value</h5><p className="text-xs text-slate-400">{lawCase.precedentValue}</p></div>
          {lawCase.keyQuotes && lawCase.keyQuotes.length > 0 && (<div><h5 className="text-xs font-semibold text-slate-700 mb-1">Key Quotes</h5>{lawCase.keyQuotes.map((quote, i) => (<blockquote key={i} className="text-xs text-slate-400 italic border-l-2 border-nebula-500 pl-2 mb-1">&ldquo;{quote}&rdquo;</blockquote>))}</div>)}
          {lawCase.sourceUrl && (<a href={lawCase.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-nebula-300 hover:text-nebula-200">View Source &rarr;</a>)}
        </div>
      )}
    </div>
  );
}

function CaseLawArchiveTab() {
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const allSubjects = Array.from(new Set(SPACE_LAW_CASES.flatMap(c => c.subjectMatter)));
  const filteredCases = SPACE_LAW_CASES.filter(c => { if (jurisdictionFilter && c.jurisdiction !== jurisdictionFilter) return false; if (subjectFilter && !c.subjectMatter.includes(subjectFilter)) return false; return true; });
  const totalDamages = filteredCases.filter(c => c.damages).reduce((sum, c) => sum + (c.damages || 0), 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-slate-900">{filteredCases.length}</div><div className="text-xs text-slate-400">Cases</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-green-400">${(totalDamages / 1e9).toFixed(2)}B</div><div className="text-xs text-slate-400">Total Damages</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-nebula-300">{filteredCases.filter(c => c.outcome === 'plaintiff_victory').length}</div><div className="text-xs text-slate-400">Plaintiff Wins</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{filteredCases.filter(c => c.outcome === 'settlement').length}</div><div className="text-xs text-slate-400">Settlements</div></div>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={jurisdictionFilter} onChange={(e) => setJurisdictionFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm">
          <option value="">All Jurisdictions</option><option value="federal">Federal Courts</option><option value="international">International</option><option value="arbitration">Arbitration</option>
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm">
          <option value="">All Subject Matter</option>{allSubjects.map(s => (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>))}
        </select>
        <div className="ml-auto"><ExportButton data={filteredCases} filename="space-law-cases" columns={[{ key: 'caseName', label: 'Case Name' },{ key: 'year', label: 'Year' },{ key: 'jurisdiction', label: 'Jurisdiction' },{ key: 'outcome', label: 'Outcome' },{ key: 'damages', label: 'Damages' },{ key: 'summary', label: 'Summary' }]} /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredCases.map((lawCase) => (<CaseCard key={lawCase.id} lawCase={lawCase} />))}</div>
    </div>
  );
}

function ExportControlMonitorTab() {
  const [activeSubTab, setActiveSubTab] = useState<'eccn' | 'usml'>('eccn');
  const [searchTerm, setSearchTerm] = useState('');
  const filteredECCNs = ECCN_CLASSIFICATIONS.filter(e => { if (!searchTerm) return true; const search = searchTerm.toLowerCase(); return e.eccn.toLowerCase().includes(search) || e.description.toLowerCase().includes(search) || e.spaceRelevance.toLowerCase().includes(search); });
  const filteredUSML = USML_CATEGORIES.filter(u => { if (!searchTerm) return true; const search = searchTerm.toLowerCase(); return u.category.toLowerCase().includes(search) || u.title.toLowerCase().includes(search) || u.description.toLowerCase().includes(search); });
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveSubTab('eccn')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'eccn' ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>ECCN Tracker (EAR)</button>
        <button onClick={() => setActiveSubTab('usml')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'usml' ? 'bg-red-500/20 text-red-600 border border-red-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>USML Tracker (ITAR)</button>
      </div>
      <div className="mb-6"><input type="text" placeholder="Search classifications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-96 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-sm" /></div>
      {activeSubTab === 'eccn' && (
        <div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-blue-600 mb-2">Export Administration Regulations (EAR)</h4><p className="text-sm text-slate-400">The Commerce Control List (CCL) classifies dual-use items by Export Control Classification Number (ECCN). Commercial satellites were transferred from ITAR to EAR via the 9x515 series in 2014.</p></div>
          <div className="space-y-4">{filteredECCNs.map((eccn) => (
            <div key={eccn.id} className="card p-5">
              <div className="flex items-start justify-between mb-3"><span className="font-mono text-lg font-bold text-blue-600">{eccn.eccn}</span><span className="text-xs bg-slate-100 px-2 py-1 rounded">{eccn.category}</span></div>
              <h4 className="font-semibold text-slate-900 mb-2">{eccn.description}</h4><p className="text-sm text-slate-400 mb-3">{eccn.spaceRelevance}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div><h5 className="font-semibold text-slate-700 mb-1">Reason for Control</h5><div className="flex flex-wrap gap-1">{eccn.reasonForControl.map((r, i) => (<span key={i} className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{r}</span>))}</div></div>
                <div><h5 className="font-semibold text-slate-700 mb-1">License Exceptions</h5><div className="flex flex-wrap gap-1">{eccn.licenseExceptions.map((e, i) => (<span key={i} className="bg-green-100 text-green-600 px-2 py-0.5 rounded">{e}</span>))}</div></div>
              </div>
              <div className="mt-3"><h5 className="text-xs font-semibold text-slate-700 mb-1">Examples</h5><ul className="text-xs text-slate-400 list-disc list-inside">{eccn.examples.slice(0, 3).map((ex, i) => (<li key={i}>{ex}</li>))}</ul></div>
            </div>
          ))}</div>
        </div>
      )}
      {activeSubTab === 'usml' && (
        <div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-red-600 mb-2">International Traffic in Arms Regulations (ITAR)</h4><p className="text-sm text-slate-400">The United States Munitions List (USML) controls defense articles. Launch vehicles and defense spacecraft remain on USML. All exports require DDTC authorization with no license exceptions.</p></div>
          <div className="space-y-4">{filteredUSML.map((usml) => (
            <div key={usml.id} className="card p-5">
              <div className="flex items-start justify-between mb-3"><span className="font-mono text-lg font-bold text-red-600">Category {usml.category}</span><span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">ITAR</span></div>
              <h4 className="font-semibold text-slate-900 mb-2">{usml.title}</h4><p className="text-sm text-slate-400 mb-3">{usml.description}</p>
              <div className="mb-3"><h5 className="text-xs font-semibold text-slate-700 mb-1">Controlled Items</h5><ul className="text-xs text-slate-400 list-disc list-inside">{usml.items.map((item, i) => (<li key={i}>{item}</li>))}</ul></div>
              <div className="bg-slate-50 rounded p-3"><h5 className="text-xs font-semibold text-slate-700 mb-1">Space Relevance</h5><p className="text-xs text-slate-400">{usml.spaceRelevance}</p></div>
              {usml.exemptions && usml.exemptions.length > 0 && (<div className="mt-3"><h5 className="text-xs font-semibold text-slate-700 mb-1">Exemptions / Notes</h5><ul className="text-xs text-slate-400 list-disc list-inside">{usml.exemptions.map((ex, i) => (<li key={i}>{ex}</li>))}</ul></div>)}
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

function ExpertCommentaryTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const filteredSources = EXPERT_SOURCES.filter(s => { if (typeFilter && s.type !== typeFilter) return false; return s.isActive; });
  const typeLabels: Record<string, { label: string; icon: string; color: string }> = { law_firm: { label: 'Law Firms', icon: '\u2696\uFE0F', color: 'bg-purple-500/20 text-purple-400' }, think_tank: { label: 'Think Tanks', icon: '\uD83D\uDCA1', color: 'bg-yellow-500/20 text-yellow-400' }, government: { label: 'Government', icon: '\uD83C\uDFDB\uFE0F', color: 'bg-blue-500/20 text-blue-400' }, academic: { label: 'Academic', icon: '\uD83C\uDF93', color: 'bg-green-500/20 text-green-400' }, industry_association: { label: 'Industry', icon: '\uD83C\uDFE2', color: 'bg-orange-500/20 text-orange-400' } };
  return (
    <div>
      <div className="bg-nebula-500/10 border border-nebula-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-nebula-300 mb-2">Expert Sources & Commentary</h4>
        <p className="text-sm text-slate-400">Curated collection of authoritative sources for space law, policy analysis, and industry commentary. Follow these sources for the latest expert insights on regulatory developments.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!typeFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All Sources</button>
        {Object.entries(typeLabels).map(([type, info]) => (<button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${typeFilter === type ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><span>{info.icon}</span>{info.label}</button>))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSources.map((source) => { const typeInfo = typeLabels[source.type]; return (
          <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="card p-5 hover:border-nebula-500/50 transition-all group">
            <div className="flex items-start justify-between mb-3"><span className="text-3xl">{typeInfo?.icon || '\uD83D\uDCCB'}</span><span className={`text-xs px-2 py-1 rounded ${typeInfo?.color || 'bg-slate-100'}`}>{typeInfo?.label || source.type}</span></div>
            <h4 className="font-semibold text-slate-900 mb-1 group-hover:text-nebula-300 transition-colors">{source.name}</h4>
            {source.organization && (<p className="text-sm text-slate-400 mb-2">{source.organization}</p>)}
            <p className="text-xs text-slate-400 mb-3 line-clamp-2">{source.description}</p>
            <div className="flex flex-wrap gap-1">{source.topics.slice(0, 3).map((topic, i) => (<span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{topic.replace(/_/g, ' ')}</span>))}</div>
            {source.keyContributors && source.keyContributors.length > 0 && (<div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs text-slate-400"><strong>Contributors:</strong> {source.keyContributors.join(', ')}</p></div>)}
          </a>
        ); })}
      </div>
    </div>
  );
}

// ############################################################################
// SPACE LAW SECTION COMPONENTS
// ############################################################################

function TreatyCard({ treaty }: { treaty: Treaty }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = TREATY_STATUS_CONFIG[treaty.status];
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0"><h4 className="font-semibold text-slate-900 text-lg">{treaty.name}</h4><p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{treaty.fullName}</p></div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ml-3 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>{statusConfig.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center"><div className="text-slate-900 font-bold text-xl">{treaty.ratifications}</div><div className="text-slate-400 text-xs">Ratifications</div></div>
        <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center"><div className="text-slate-900 font-bold text-xl">{treaty.signatories}</div><div className="text-slate-400 text-xs">Signatories</div></div>
        <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center"><div className="text-slate-900 font-bold text-xl">{treaty.entryIntoForceYear}</div><div className="text-slate-400 text-xs">In Force</div></div>
      </div>
      <p className="text-slate-500 text-sm mb-3 line-clamp-3">{treaty.description}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Key Provisions'}</button>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
          <div><h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Provisions</h5><ul className="space-y-1.5">{treaty.keyProvisions.map((provision, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><span className="text-cyan-400 mt-0.5 flex-shrink-0">*</span>{provision}</li>))}</ul></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-slate-500">{treaty.significance}</p></div>
          <div className="text-xs text-slate-400">Adopted: {treaty.adoptedYear} | Depositary: {treaty.depositary}</div>
        </div>
      )}
    </div>
  );
}

function SpaceLawTreatiesTab() {
  return (
    <div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-blue-600 mb-2">United Nations Space Treaty Framework</h4><p className="text-sm text-slate-400">Five core UN treaties form the foundation of international space law. The Outer Space Treaty (1967) serves as the cornerstone, with four supplementary treaties addressing specific aspects of space activities.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{TREATIES.map((treaty) => (<TreatyCard key={treaty.id} treaty={treaty} />))}</div>
      <div className="card p-5 border-dashed mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Treaty Ratification Overview</h3>
        <div className="space-y-3">{TREATIES.map((treaty) => { const maxRatifications = 114; const pct = (treaty.ratifications / maxRatifications) * 100; return (<div key={treaty.id}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600 font-medium">{treaty.name}</span><span className="text-sm text-slate-400">{treaty.ratifications} ratifications</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${treaty.status === 'not_in_force' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-cyan-500 to-blue-400'}`} style={{ width: `${pct}%` }} /></div></div>); })}</div>
        <p className="text-xs text-slate-400 mt-4">Data based on UNOOSA treaty status reports. Signatories that have not ratified are counted separately.</p>
      </div>
    </div>
  );
}

function NationalLawCard({ law }: { law: NationalLaw }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = NATIONAL_STATUS_CONFIG[law.status];
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">{law.countryCode}</div>
          <div><h4 className="font-semibold text-slate-900">{law.country}</h4><span className="text-slate-400 text-xs">{law.agency}</span></div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>{statusConfig.label}</span>
      </div>
      <h5 className="text-sm font-medium text-nebula-300 mb-1">{law.lawName}</h5>
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3"><span>Year: {law.year}</span><span>Scope: {law.scope}</span></div>
      <p className="text-slate-500 text-sm mb-3 line-clamp-2">{law.description}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Key Features'}</button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/50"><h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Features</h5><ul className="space-y-1.5">{law.keyFeatures.map((feature, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{feature}</li>))}</ul></div>
      )}
    </div>
  );
}

function SpaceLawNationalTab() {
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const countries = useMemo(() => Array.from(new Set(NATIONAL_LAWS.map(l => l.country))).sort(), []);
  const filteredLaws = useMemo(() => { let result = [...NATIONAL_LAWS]; if (countryFilter) result = result.filter(l => l.country === countryFilter); if (statusFilter) result = result.filter(l => l.status === statusFilter); return result; }, [countryFilter, statusFilter]);
  return (
    <div>
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-cyan-600 mb-2">National Space Legislation Tracker</h4><p className="text-sm text-slate-400">As commercial space activities expand, nations are rapidly developing domestic legislation to regulate launches, satellite operations, space resources, and liability. This tracker monitors major national frameworks.</p></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div><label className="block text-slate-400 text-sm mb-1">Country</label><select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Countries</option>{countries.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>
        <div><label className="block text-slate-400 text-sm mb-1">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Statuses</option><option value="enacted">Enacted</option><option value="amended">Amended</option><option value="proposed">Proposed</option><option value="under_review">Under Review</option></select></div>
        {(countryFilter || statusFilter) && (<button onClick={() => { setCountryFilter(''); setStatusFilter(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-400">Showing {filteredLaws.length} of {NATIONAL_LAWS.length} laws</span></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{filteredLaws.map((law) => (<NationalLawCard key={law.id} law={law} />))}</div>
    </div>
  );
}

function SpaceLawArtemisTab() {
  const [regionFilter, setRegionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const regions = useMemo(() => Array.from(new Set(ARTEMIS_SIGNATORIES.map(s => s.region))).sort(), []);
  const filteredSignatories = useMemo(() => { let result = [...ARTEMIS_SIGNATORIES]; if (regionFilter) result = result.filter(s => s.region === regionFilter); if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(s => s.country.toLowerCase().includes(query) || s.spaceAgency.toLowerCase().includes(query) || s.notes.toLowerCase().includes(query)); } return result; }, [regionFilter, searchQuery]);
  const regionCounts = useMemo(() => { const counts: Record<string, number> = {}; ARTEMIS_SIGNATORIES.forEach(s => { counts[s.region] = (counts[s.region] || 0) + 1; }); return counts; }, []);
  return (
    <div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-2">About the Artemis Accords</h3><p className="text-slate-500 text-sm mb-4">The Artemis Accords are a set of bilateral agreements between the United States and partner nations, grounded in the Outer Space Treaty. Established in 2020 by NASA, they set principles for the responsible and peaceful exploration of the Moon, Mars, and other celestial bodies as part of the Artemis program.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-400">{ARTEMIS_SIGNATORIES.length}</div><div className="text-slate-400 text-xs">Total Signatories</div></div>
          <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-cyan-400">{Object.keys(regionCounts).length}</div><div className="text-slate-400 text-xs">Regions</div></div>
          <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-400">{ARTEMIS_SIGNATORIES.filter(s => s.implementationStatus === 'implementing').length}</div><div className="text-slate-400 text-xs">Implementing</div></div>
          <div className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-400">{ARTEMIS_PRINCIPLES.length}</div><div className="text-slate-400 text-xs">Core Principles</div></div>
        </div>
      </div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-4">Core Principles</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{ARTEMIS_PRINCIPLES.map((principle, i) => (<div key={i} className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-4"><div className="flex items-center gap-2 mb-1"><span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-600 text-xs font-bold flex items-center justify-center">{i + 1}</span><h5 className="font-medium text-slate-900 text-sm">{principle.title}</h5></div><p className="text-xs text-slate-500 ml-8">{principle.description}</p></div>))}</div></div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-3">Regional Distribution</h3><div className="space-y-3">{Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).map(([region, count]) => { const maxCount = Math.max(...Object.values(regionCounts)); const pct = (count / maxCount) * 100; return (<div key={region}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600 font-medium">{region}</span><span className="text-sm text-slate-400">{count} signatories</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} /></div></div>); })}</div></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="block text-slate-400 text-sm mb-1">Search</label><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search countries, agencies..." className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400" /></div>
        <div><label className="block text-slate-400 text-sm mb-1">Region</label><select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Regions</option>{regions.map(r => (<option key={r} value={r}>{r} ({regionCounts[r]})</option>))}</select></div>
        {(regionFilter || searchQuery) && (<button onClick={() => { setRegionFilter(''); setSearchQuery(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-400">Showing {filteredSignatories.length} of {ARTEMIS_SIGNATORIES.length} signatories</span></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredSignatories.map((signatory) => { const status = ARTEMIS_STATUS_CONFIG[signatory.implementationStatus]; return (<div key={signatory.id} className="card p-4 hover:border-cyan-500/30 transition-all"><div className="flex items-start justify-between mb-2"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">{signatory.countryCode}</div><div><h4 className="font-semibold text-slate-900 text-sm">{signatory.country}</h4><span className="text-slate-400 text-xs">{signatory.spaceAgency}</span></div></div><span className={`text-xs px-2 py-0.5 rounded border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span></div><div className="flex items-center gap-3 text-xs text-slate-400 mb-2"><span>Signed: {new Date(signatory.dateSigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><span>{signatory.region}</span></div><p className="text-xs text-slate-500 line-clamp-2">{signatory.notes}</p></div>); })}</div>
    </div>
  );
}

function ProceedingCard({ proceeding }: { proceeding: LegalProceeding }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = PROCEEDING_STATUS_CONFIG[proceeding.status];
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-2"><div className="flex items-center gap-2"><span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-medium">{proceeding.type}</span><span className="text-xs text-slate-400">{proceeding.year}</span></div><span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>{statusConfig.label}</span></div>
      <h4 className="font-semibold text-slate-900 mb-1">{proceeding.title}</h4><p className="text-xs text-slate-400 mb-3">{proceeding.parties}</p>
      <p className="text-slate-500 text-sm mb-3 line-clamp-3">{proceeding.description}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Details'}</button>
      {expanded && (<div className="mt-3 pt-3 border-t border-slate-200/50 space-y-3"><div><h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Jurisdiction</h5><p className="text-xs text-slate-500">{proceeding.jurisdiction}</p></div><div><h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-slate-500">{proceeding.significance}</p></div><div><h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Outcome</h5><p className="text-xs text-slate-500">{proceeding.outcome}</p></div></div>)}
    </div>
  );
}

function SpaceLawProceedingsTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const types = useMemo(() => Array.from(new Set(LEGAL_PROCEEDINGS.map(p => p.type))).sort(), []);
  const filteredProceedings = useMemo(() => { let result = [...LEGAL_PROCEEDINGS]; if (typeFilter) result = result.filter(p => p.type === typeFilter); if (statusFilter) result = result.filter(p => p.status === statusFilter); return result.sort((a, b) => b.year - a.year); }, [typeFilter, statusFilter]);
  return (
    <div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-red-600 mb-2">Space Law Cases and Legal Proceedings</h4><p className="text-sm text-slate-400">Tracking notable legal disputes, regulatory enforcement actions, and advisory opinions that shape the evolving body of space law. Includes both international and domestic proceedings.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-slate-900">{LEGAL_PROCEEDINGS.length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Cases</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'active').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Active</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'resolved').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Resolved</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'pending').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Pending</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div><label className="block text-slate-400 text-sm mb-1">Case Type</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Types</option>{types.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
        <div><label className="block text-slate-400 text-sm mb-1">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Statuses</option><option value="active">Active</option><option value="resolved">Resolved</option><option value="pending">Pending</option><option value="advisory">Advisory</option></select></div>
        {(typeFilter || statusFilter) && (<button onClick={() => { setTypeFilter(''); setStatusFilter(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredProceedings.map((p) => (<ProceedingCard key={p.id} proceeding={p} />))}</div>
    </div>
  );
}

function BodyCard({ body }: { body: RegulatoryBody }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = BODY_TYPE_CONFIG[body.type];
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-3"><div><div className="flex items-center gap-2 mb-1"><h4 className="font-semibold text-slate-900">{body.abbreviation}</h4><span className={`text-xs px-2 py-0.5 rounded border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}>{typeConfig.label}</span></div><p className="text-slate-400 text-sm">{body.name}</p></div></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3"><span>Est. {body.established}</span><span>{body.headquarters}</span><span>{body.members}</span></div>
      <p className="text-slate-500 text-sm mb-3 line-clamp-2">{body.mandate}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Functions'}</button>
      {expanded && (<div className="mt-3 pt-3 border-t border-slate-200/50"><h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Functions</h5><ul className="space-y-1.5">{body.keyFunctions.map((func, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{func}</li>))}</ul><a href={body.website} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-nebula-300 hover:text-nebula-200">Visit Website</a></div>)}
    </div>
  );
}

function SpaceLawBodiesTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const filteredBodies = useMemo(() => { let result = [...REGULATORY_BODIES]; if (typeFilter) result = result.filter(b => b.type === typeFilter); if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(b => b.name.toLowerCase().includes(query) || b.abbreviation.toLowerCase().includes(query) || b.mandate.toLowerCase().includes(query) || b.headquarters.toLowerCase().includes(query)); } return result; }, [typeFilter, searchQuery]);
  return (
    <div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-purple-600 mb-2">Space Regulatory Bodies Directory</h4><p className="text-sm text-slate-400">Comprehensive directory of international, regional, and national regulatory bodies governing space activities. From UN organizations to national licensing authorities and industry coordination groups.</p></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="block text-slate-400 text-sm mb-1">Search</label><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search bodies, functions..." className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400" /></div>
        <div><label className="block text-slate-400 text-sm mb-1">Type</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Types</option><option value="un">UN Bodies</option><option value="national">National</option><option value="regional">Regional</option><option value="industry">Industry</option></select></div>
        {(typeFilter || searchQuery) && (<button onClick={() => { setTypeFilter(''); setSearchQuery(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{(Object.entries(BODY_TYPE_CONFIG) as [BodyType, typeof BODY_TYPE_CONFIG[BodyType]][]).map(([type, config]) => { const count = REGULATORY_BODIES.filter(b => b.type === type).length; return (<button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)} className={`card-elevated p-4 text-center transition-all cursor-pointer ${typeFilter === type ? 'ring-2 ring-nebula-500/50' : ''}`}><div className={`text-2xl font-bold font-display ${config.text}`}>{count}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">{config.label}</div></button>); })}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{filteredBodies.map((body) => (<BodyCard key={body.id} body={body} />))}</div>
    </div>
  );
}

// ############################################################################
// REGULATORY FILINGS SECTION COMPONENTS
// ############################################################################

function FilingsFCCTab() {
  const [search, setSearch] = useState(''); const [orbitFilter, setOrbitFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('');
  const filtered = FCC_FILINGS.filter((f) => { if (orbitFilter && f.orbitType !== orbitFilter) return false; if (statusFilter && f.status !== statusFilter) return false; if (search) { const s = search.toLowerCase(); return f.applicant.toLowerCase().includes(s) || f.fileNumber.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s) || f.band.toLowerCase().includes(s); } return true; });
  const uniqueStatuses = Array.from(new Set(FCC_FILINGS.map((f) => f.status))); const uniqueOrbits = Array.from(new Set(FCC_FILINGS.map((f) => f.orbitType))); const totalSats = FCC_FILINGS.reduce((sum, f) => sum + (f.satelliteCount || 0), 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{FCC_FILINGS.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{FCC_FILINGS.filter((f) => f.status === 'granted').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Granted</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{FCC_FILINGS.filter((f) => f.status === 'pending').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Pending</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalSats.toLocaleString()}</div><div className="text-star-300 text-xs uppercase tracking-widest">Satellites Filed</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search applicant, file number, band..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={orbitFilter} onChange={(e) => setOrbitFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Orbits</option>{uniqueOrbits.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Statuses</option>{uniqueStatuses.map((s) => (<option key={s} value={s}>{FILING_STATUS_STYLES[s].label}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((filing) => { const statusStyle = FILING_STATUS_STYLES[filing.status]; const orbitStyle = FILING_ORBIT_STYLES[filing.orbitType]; return (
        <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base">{filing.applicant}</h4><span className="text-star-300 text-xs font-mono">{filing.fileNumber}</span></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-2 py-1 rounded ${orbitStyle.bg} ${orbitStyle.text}`}>{filing.orbitType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></div></div>
          <div className="flex items-center gap-4 mb-3 text-sm"><div><span className="text-star-300 text-xs block">Type</span><span className="text-white text-sm">{filing.filingType}</span></div><div><span className="text-star-300 text-xs block">Band</span><span className="text-nebula-300 text-sm font-mono">{filing.band}</span></div>{filing.satelliteCount && (<div><span className="text-star-300 text-xs block">Satellites</span><span className="text-white text-sm font-bold">{filing.satelliteCount.toLocaleString()}</span></div>)}</div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>
          <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span>{filing.dateActedOn && (<><span className="text-white/20">|</span><span>Acted: <span className="text-white font-medium">{filing.dateActedOn}</span></span></>)}{filing.docket && (<><span className="text-white/20">|</span><span className="text-nebula-300 font-mono">{filing.docket}</span></>)}</div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3><button onClick={() => { setSearch(''); setOrbitFilter(''); setStatusFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsFAATab() {
  const [search, setSearch] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('');
  const filtered = FAA_LICENSES.filter((l) => { if (typeFilter && l.licenseType !== typeFilter) return false; if (statusFilter && l.status !== statusFilter) return false; if (search) { const s = search.toLowerCase(); return l.licensee.toLowerCase().includes(s) || l.vehicle.toLowerCase().includes(s) || l.launchSite.toLowerCase().includes(s) || l.licenseNumber.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(FAA_LICENSES.map((l) => l.licenseType))); const uniqueStatuses = Array.from(new Set(FAA_LICENSES.map((l) => l.status))); const totalMissions = FAA_LICENSES.reduce((sum, l) => sum + l.missionsAuthorized, 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{FAA_LICENSES.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Licenses</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{FAA_LICENSES.filter((l) => l.status === 'active').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Active</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{FAA_LICENSES.filter((l) => l.status === 'pending').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Pending</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalMissions}</div><div className="text-star-300 text-xs uppercase tracking-widest">Missions Auth.</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search licensee, vehicle, launch site..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Statuses</option>{uniqueStatuses.map((s) => (<option key={s} value={s}>{FILING_STATUS_STYLES[s].label}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} licenses</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((license) => { const statusStyle = FILING_STATUS_STYLES[license.status]; return (
        <div key={license.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base">{license.licensee}</h4><span className="text-star-300 text-xs font-mono">{license.licenseNumber}</span></div><div className="flex items-center gap-2 shrink-0"><span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-400">{license.licenseType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></div></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3"><div><span className="text-star-300 text-xs block">Vehicle</span><span className="text-white text-sm font-medium">{license.vehicle}</span></div><div><span className="text-star-300 text-xs block">Launch Site</span><span className="text-nebula-300 text-sm">{license.launchSite}</span></div>{license.missionsAuthorized > 0 && (<div><span className="text-star-300 text-xs block">Missions</span><span className="text-white text-sm font-bold">{license.missionsAuthorized}</span></div>)}</div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{license.summary}</p>
          <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Issued: <span className="text-white font-medium">{license.dateIssued}</span></span><span className="text-white/20">|</span><span>Expires: <span className="text-white font-medium">{license.expirationDate}</span></span></div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No licenses match your search</h3><button onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsITUTab() {
  const [search, setSearch] = useState(''); const [orbitFilter, setOrbitFilter] = useState(''); const [typeFilter, setTypeFilter] = useState('');
  const filtered = ITU_FILINGS.filter((f) => { if (orbitFilter && f.orbitType !== orbitFilter) return false; if (typeFilter && f.filingType !== typeFilter) return false; if (search) { const s = search.toLowerCase(); return f.networkName.toLowerCase().includes(s) || f.administration.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(ITU_FILINGS.map((f) => f.filingType))); const uniqueOrbits = Array.from(new Set(ITU_FILINGS.map((f) => f.orbitType))); const totalSats = ITU_FILINGS.reduce((sum, f) => sum + (f.satellites || 0), 0);
  return (
    <div>
      <div className="card p-5 mb-6 border border-purple-500/20"><h3 className="text-white font-semibold mb-2">ITU Radio Regulations Filings</h3><p className="text-star-300 text-sm leading-relaxed">Satellite network filings under the ITU Radio Regulations. Includes Article 9 coordination requests, Appendix 30/30A/30B plan filings, Article 11 notifications, and due diligence submissions.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{ITU_FILINGS.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Network Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{Array.from(new Set(ITU_FILINGS.map((f) => f.administration))).length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Administrations</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalSats.toLocaleString()}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Satellites</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{ITU_FILINGS.filter((f) => f.status === 'active').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Active Filings</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search network name, administration..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={orbitFilter} onChange={(e) => setOrbitFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Orbits</option>{uniqueOrbits.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Filing Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((filing) => { const statusStyle = FILING_STATUS_STYLES[filing.status]; const orbitStyle = FILING_ORBIT_STYLES[filing.orbitType]; return (
        <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base font-mono">{filing.networkName}</h4><span className="text-star-300 text-sm">{filing.administration}</span></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-2 py-1 rounded ${orbitStyle.bg} ${orbitStyle.text}`}>{filing.orbitType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></div></div>
          <div className="flex items-center gap-4 mb-3 text-sm"><div><span className="text-star-300 text-xs block">Filing Type</span><span className="text-white text-sm">{filing.filingType}</span></div><div><span className="text-star-300 text-xs block">Service Band</span><span className="text-nebula-300 text-sm font-mono">{filing.serviceBand}</span></div>{filing.satellites && (<div><span className="text-star-300 text-xs block">Satellites</span><span className="text-white text-sm font-bold">{filing.satellites.toLocaleString()}</span></div>)}</div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>
          <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span></div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3><button onClick={() => { setSearch(''); setOrbitFilter(''); setTypeFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsSECTab() {
  const [search, setSearch] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [companyFilter, setCompanyFilter] = useState('');
  const filtered = SEC_FILINGS.filter((f) => { if (typeFilter && f.filingType !== typeFilter) return false; if (companyFilter && f.ticker !== companyFilter) return false; if (search) { const s = search.toLowerCase(); return f.company.toLowerCase().includes(s) || f.ticker.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(SEC_FILINGS.map((f) => f.filingType))); const uniqueTickers = Array.from(new Set(SEC_FILINGS.map((f) => f.ticker)));
  const filingTypeColors: Record<string, { bg: string; text: string }> = { '10-K': { bg: 'bg-blue-500/20', text: 'text-blue-400' }, '10-Q': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' }, '8-K': { bg: 'bg-orange-500/20', text: 'text-orange-400' }, 'S-1': { bg: 'bg-green-500/20', text: 'text-green-400' }, 'DEF 14A': { bg: 'bg-purple-500/20', text: 'text-purple-400' }, '13F': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }, 'SC 13D': { bg: 'bg-red-500/20', text: 'text-red-400' } };
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{SEC_FILINGS.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-blue-400">{SEC_FILINGS.filter((f) => f.filingType === '10-K').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Annual Reports</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-orange-400">{SEC_FILINGS.filter((f) => f.filingType === '8-K').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Current Reports</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{uniqueTickers.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Companies</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search company, ticker, content..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Companies</option>{uniqueTickers.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Filing Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((filing) => { const typeColor = filingTypeColors[filing.filingType] || { bg: 'bg-slate-500/20', text: 'text-slate-400' }; return (
        <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base">{filing.company}</h4><div className="flex items-center gap-2 mt-1"><span className="text-nebula-300 text-sm font-bold font-mono">${filing.ticker}</span>{filing.period && (<span className="text-star-300 text-xs">({filing.period})</span>)}</div></div><span className={`text-xs font-medium px-2.5 py-1 rounded ${typeColor.bg} ${typeColor.text}`}>{filing.filingType}</span></div>
          {filing.keyMetric && (<div className="flex items-center gap-4 mb-3"><div className="card-elevated px-4 py-2 rounded-lg"><span className="text-star-300 text-xs block">{filing.keyMetricLabel}</span><span className="text-white text-lg font-bold font-display">{filing.keyMetric}</span></div></div>)}
          <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>
          <div className="flex items-center justify-between text-xs text-star-300 pt-3 border-t border-white/10"><span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span><a href={filing.url} target="_blank" rel="noopener noreferrer" className="text-nebula-300 hover:text-white transition-colors">View on EDGAR</a></div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3><button onClick={() => { setSearch(''); setTypeFilter(''); setCompanyFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsFederalRegisterTab() {
  const [search, setSearch] = useState(''); const [agencyFilter, setAgencyFilter] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [impactFilter, setImpactFilter] = useState('');
  const filtered = FEDERAL_REGISTER_ENTRIES.filter((e) => { if (agencyFilter && e.agency !== agencyFilter) return false; if (typeFilter && e.documentType !== typeFilter) return false; if (impactFilter && e.impact !== impactFilter) return false; if (search) { const s = search.toLowerCase(); return e.title.toLowerCase().includes(s) || e.agency.toLowerCase().includes(s) || e.summary.toLowerCase().includes(s); } return true; });
  const uniqueAgencies = Array.from(new Set(FEDERAL_REGISTER_ENTRIES.map((e) => e.agency))); const uniqueTypes = Array.from(new Set(FEDERAL_REGISTER_ENTRIES.map((e) => e.documentType)));
  const docTypeColors: Record<string, { bg: string; text: string }> = { 'Proposed Rule': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }, 'Final Rule': { bg: 'bg-green-500/20', text: 'text-green-400' }, 'Notice': { bg: 'bg-blue-500/20', text: 'text-blue-400' }, 'Presidential Document': { bg: 'bg-purple-500/20', text: 'text-purple-400' }, 'Request for Comment': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' } };
  const openForComment = FEDERAL_REGISTER_ENTRIES.filter((e) => { if (!e.commentDeadline) return false; return new Date(e.commentDeadline) > new Date(); });
  return (
    <div>
      {openForComment.length > 0 && (<div className="card p-5 mb-6 border border-yellow-500/30 bg-yellow-500/5"><h3 className="text-yellow-400 font-semibold mb-3">Open Comment Periods</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{openForComment.map((entry) => (<div key={entry.id} className="card p-3"><div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-nebula-300">{entry.agency}</span><span className="text-xs text-yellow-400">Due: {entry.commentDeadline}</span></div><p className="text-sm text-white line-clamp-2">{entry.title}</p></div>))}</div></div>)}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{FEDERAL_REGISTER_ENTRIES.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Entries</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{FEDERAL_REGISTER_ENTRIES.filter((e) => e.documentType === 'Final Rule').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Final Rules</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{FEDERAL_REGISTER_ENTRIES.filter((e) => e.documentType === 'Proposed Rule').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Proposed Rules</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{FEDERAL_REGISTER_ENTRIES.filter((e) => e.impact === 'high').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">High Impact</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search title, agency, content..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Agencies</option>{uniqueAgencies.map((a) => (<option key={a} value={a}>{a}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Impact Levels</option><option value="high">High Impact</option><option value="medium">Medium Impact</option><option value="low">Low Impact</option></select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} entries</span>
      </div></div>
      <div className="space-y-4">{filtered.map((entry) => { const typeColor = docTypeColors[entry.documentType] || { bg: 'bg-slate-500/20', text: 'text-slate-400' }; const impactStyle = FILING_IMPACT_STYLES[entry.impact]; return (
        <div key={entry.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-nebula-300 shrink-0">{entry.agency}</div><div><h4 className="font-semibold text-white text-base">{entry.title}</h4><span className="text-star-300 text-xs font-mono">FR {entry.federalRegisterNumber}</span></div></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-2 py-1 rounded ${typeColor.bg} ${typeColor.text}`}>{entry.documentType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${impactStyle.bg} ${impactStyle.text}`}>{entry.impact.charAt(0).toUpperCase() + entry.impact.slice(1)} Impact</span></div></div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{entry.summary}</p>
          <div className="flex items-center flex-wrap gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Published: <span className="text-white font-medium">{entry.publishedDate}</span></span>{entry.effectiveDate && (<><span className="text-white/20">|</span><span>Effective: <span className="text-white font-medium">{entry.effectiveDate}</span></span></>)}{entry.commentDeadline && (<><span className="text-white/20">|</span><span className={new Date(entry.commentDeadline) > new Date() ? 'text-yellow-400 font-semibold' : 'text-star-300'}>Comments Due: {entry.commentDeadline}</span></>)}{entry.docket && (<><span className="text-white/20">|</span><span className="text-nebula-300 font-mono">{entry.docket}</span></>)}</div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No entries match your search</h3><button onClick={() => { setSearch(''); setAgencyFilter(''); setTypeFilter(''); setImpactFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

// ############################################################################
// BID PROTESTS & CLAIMS - Types, Status Configs, and Data
// ############################################################################

type ProtestOutcome = 'denied' | 'sustained' | 'dismissed' | 'withdrawn' | 'corrective_action' | 'settled';
type ProtestForum = 'gao' | 'cofc' | 'dc_circuit' | 'district_court';
type ProtestProgram = 'launch' | 'satellite' | 'crewed' | 'science' | 'defense' | 'iss';

interface BidProtest {
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

const PROTEST_OUTCOME_STYLES: Record<ProtestOutcome, { bg: string; text: string; label: string }> = {
  denied: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Denied' },
  sustained: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Sustained' },
  dismissed: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Dismissed' },
  withdrawn: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Withdrawn' },
  corrective_action: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Corrective Action' },
  settled: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Settled' },
};

const PROTEST_FORUM_STYLES: Record<ProtestForum, { bg: string; text: string; label: string }> = {
  gao: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'GAO' },
  cofc: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'COFC' },
  dc_circuit: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'D.C. Circuit' },
  district_court: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'District Court' },
};

const PROTEST_PROGRAM_LABELS: Record<ProtestProgram, string> = {
  launch: 'Launch Services',
  satellite: 'Satellite Systems',
  crewed: 'Crewed Spaceflight',
  science: 'Science Missions',
  defense: 'National Security Space',
  iss: 'ISS Operations',
};

const BID_PROTESTS: BidProtest[] = [
  {
    id: 'bo-hls-cofc-2021',
    title: 'Blue Origin Federation, LLC v. United States',
    shortTitle: 'Blue Origin HLS Lawsuit',
    caseNumber: 'No. 21-1695C',
    forum: 'cofc',
    outcome: 'denied',
    program: 'crewed',
    protester: 'Blue Origin',
    awardee: 'SpaceX',
    agency: 'NASA',
    contractValue: '$2.9B',
    yearFiled: 2021,
    yearDecided: 2021,
    decisionDate: 'November 4, 2021',
    judge: 'Judge Richard A. Hertling',
    description: 'Blue Origin challenged NASA\'s award of the sole Human Landing System (HLS) Option A contract to SpaceX for $2.9 billion to develop the Starship lunar lander for the Artemis program. Blue Origin argued NASA should have selected two providers and that the evaluation was flawed.',
    significance: 'Landmark case establishing that NASA had broad discretion to adjust award strategy based on available funding. Set precedent that agencies can make fewer awards than initially anticipated when budget is insufficient.',
    keyFindings: [
      'NASA conducted a "thorough, reasoned evaluation of the proposals"',
      'Blue Origin did not have "a substantial chance of award"',
      'NASA lawfully decided to make one award instead of two given budget constraints',
      'The protest caused a 4-month delay to the Artemis program',
    ],
  },
  {
    id: 'bo-dynetics-hls-gao-2021',
    title: 'Blue Origin Federation, LLC; Dynetics, Inc.\u2014Loss of the Leidos Company',
    shortTitle: 'Blue Origin & Dynetics HLS GAO Protest',
    caseNumber: 'B-419783; B-419783.2',
    forum: 'gao',
    outcome: 'denied',
    program: 'crewed',
    protester: 'Blue Origin / Dynetics',
    awardee: 'SpaceX',
    agency: 'NASA',
    contractValue: '$2.9B',
    yearFiled: 2021,
    yearDecided: 2021,
    decisionDate: 'July 30, 2021',
    description: 'Both Blue Origin and Dynetics protested NASA\'s sole-source HLS Option A award to SpaceX. They argued NASA was required to make two awards as originally planned, and that the evaluation criteria were not properly applied.',
    significance: 'GAO affirmed broad agency discretion in source selection under Space Act Agreements. Confirmed that when solicitations reserve the right to make fewer awards, agencies can do so without violating procurement law.',
    keyFindings: [
      'NASA did not violate procurement law by making only one award',
      'The announcement provided that number of awards was subject to available funding',
      'No requirement for NASA to engage in discussions or amend the announcement',
      'Dynetics received lowest technical rating of "Marginal"',
    ],
  },
  {
    id: 'bo-nssl-gao-2019',
    title: 'Blue Origin Federation, LLC\u2014NSSL Phase 2 Launch Service Procurement',
    shortTitle: 'Blue Origin NSSL Phase 2 Protest',
    caseNumber: 'B-417839',
    forum: 'gao',
    outcome: 'sustained',
    program: 'defense',
    protester: 'Blue Origin',
    awardee: 'N/A (Pre-Award)',
    agency: 'USAF',
    contractValue: '$3.5B',
    yearFiled: 2019,
    yearDecided: 2019,
    decisionDate: 'November 18, 2019',
    description: 'Blue Origin protested the terms of the Air Force\'s National Security Space Launch (NSSL) Phase 2 solicitation, arguing it contained unclear selection criteria and unnecessarily restricted competition by limiting awards to two providers for a five-year exclusive period.',
    significance: 'One of the few sustained protests in the national security space launch domain. Forced the Air Force to clarify evaluation criteria, though the competition structure was ultimately upheld. ULA and SpaceX were selected in August 2020.',
    keyFindings: [
      'GAO sustained the complaint regarding unclear selection criteria',
      'Selection criteria did not "provide a reasonable, common basis" for competition',
      'GAO rejected the complaint about restricting competition to two providers',
      'Air Force required to clarify RFP before proceeding with evaluation',
    ],
  },
  {
    id: 'snc-cctcap-gao-2014',
    title: 'Sierra Nevada Corporation\u2014Commercial Crew Transportation Capability',
    shortTitle: 'Sierra Nevada Dream Chaser CCtCap',
    caseNumber: 'B-411343',
    forum: 'gao',
    outcome: 'denied',
    program: 'crewed',
    protester: 'Sierra Nevada Corporation',
    awardee: 'Boeing / SpaceX',
    agency: 'NASA',
    contractValue: '$6.8B',
    yearFiled: 2014,
    yearDecided: 2015,
    decisionDate: 'January 5, 2015',
    description: 'Sierra Nevada protested NASA\'s CCtCap awards of $4.2B to Boeing (CST-100 Starliner) and $2.6B to SpaceX (Crew Dragon), arguing that its Dream Chaser proposal was the second-lowest priced and that NASA improperly prioritized technical factors over price despite the solicitation weighting.',
    significance: 'Confirmed NASA\'s discretion in best-value tradeoff decisions for Commercial Crew. Despite SNC\'s lower price, NASA reasonably concluded Boeing and SpaceX offered superior technical and management approaches.',
    keyFindings: [
      'NASA made proper best-value tradeoff decision',
      'Technical evaluation factors reasonably outweighed price advantage',
      'Dream Chaser was second-lowest priced proposal',
      'Federal judge also ruled contract awards valid in October 2014',
    ],
  },
  {
    id: 'spacex-lucy-gao-2019',
    title: 'Space Exploration Technologies Corp.\u2014Lucy Mission Launch Services',
    shortTitle: 'SpaceX Lucy Mission Protest',
    caseNumber: 'B-417317',
    forum: 'gao',
    outcome: 'withdrawn',
    program: 'science',
    protester: 'SpaceX',
    awardee: 'United Launch Alliance',
    agency: 'NASA',
    contractValue: '$148.3M',
    yearFiled: 2019,
    yearDecided: 2019,
    decisionDate: 'March 2019',
    description: 'SpaceX protested NASA\'s award of the Lucy asteroid mission launch contract to ULA for $148.3 million. This was the first time SpaceX had ever challenged a NASA award decision. The key issue was schedule certainty for the narrow launch window to the Trojan asteroids.',
    significance: 'First-ever bid protest filed by SpaceX against a NASA launch services award. Highlighted the tension between price competitiveness and schedule certainty for planetary science missions with narrow launch windows.',
    keyFindings: [
      'First protest ever filed by SpaceX against a NASA award',
      'Schedule certainty was a key evaluation factor for the narrow launch window',
      'SpaceX voluntarily withdrew the protest without public explanation',
      'Lucy successfully launched on a ULA Atlas V in October 2021',
    ],
  },
  {
    id: 'airbus-raytheon-sda-t0-gao-2020',
    title: 'Airbus Defence and Space; Raytheon\u2014SDA Tranche 0 Tracking Layer',
    shortTitle: 'Airbus & Raytheon SDA Tranche 0',
    caseNumber: 'B-419263; B-419264',
    forum: 'gao',
    outcome: 'corrective_action',
    program: 'defense',
    protester: 'Airbus / Raytheon',
    awardee: 'L3Harris / SpaceX',
    agency: 'SDA/DoD',
    contractValue: '$342M',
    yearFiled: 2020,
    yearDecided: 2020,
    decisionDate: '2020',
    description: 'Airbus Defence and Space and Raytheon filed separate protests after the Space Development Agency awarded contracts to L3Harris and SpaceX to build eight missile-tracking satellites for the Tranche 0 Tracking Layer. Protesters alleged evaluation errors in the source selection.',
    significance: 'First major protest of an SDA procurement, signaling that the new agency\'s rapid acquisition approach would face traditional procurement oversight challenges. SDA agreed to reevaluate proposals as corrective action.',
    keyFindings: [
      'SDA agreed to reevaluate proposals rather than litigate',
      'Corrective action taken voluntarily by agency',
      'Highlighted tension between SDA\'s rapid acquisition model and traditional FAR requirements',
      'Original awardees (L3Harris and SpaceX) retained their contracts after reevaluation',
    ],
  },
  {
    id: 'maxar-sda-t1-gao-2021',
    title: 'Maxar Technologies\u2014SDA Transport Layer Tranche 1',
    shortTitle: 'Maxar SDA Transport Layer Protest',
    caseNumber: 'B-420234',
    forum: 'gao',
    outcome: 'dismissed',
    program: 'defense',
    protester: 'Maxar Technologies',
    awardee: 'N/A (Pre-Award)',
    agency: 'SDA/DoD',
    contractValue: 'Est. $1.8B',
    yearFiled: 2021,
    yearDecided: 2021,
    decisionDate: 'October 2021',
    description: 'Maxar Technologies protested the SDA\'s solicitation for 126 Transport Layer Tranche 1 communication satellites, alleging the terms unfairly favored certain companies and limited competition. SDA canceled the solicitation and reissued it as an Other Transaction Authority (OTA) procurement.',
    significance: 'Led to a fundamental shift in SDA procurement strategy from traditional FAR-based contracting to OTA. Demonstrated how protests can reshape entire acquisition approaches in the space domain.',
    keyFindings: [
      'Maxar alleged solicitation terms limited competition',
      'SDA voluntarily canceled and reissued solicitation under OTA',
      'GAO dismissed protest as moot after corrective action',
      'Shift to OTA mechanism bypassed future GAO protest jurisdiction',
    ],
  },
  {
    id: 'l3harris-geoxo-gao-2023',
    title: 'L3Harris Technologies, Inc.\u2014GeoXO Ocean Color Instrument',
    shortTitle: 'L3Harris GeoXO Weather Satellite',
    caseNumber: 'B-422006; B-422006.2',
    forum: 'gao',
    outcome: 'denied',
    program: 'satellite',
    protester: 'L3Harris Technologies',
    awardee: 'Ball Aerospace',
    agency: 'NASA',
    contractValue: '$486.9M',
    yearFiled: 2023,
    yearDecided: 2023,
    decisionDate: 'December 2023',
    description: 'L3Harris protested NASA\'s award of a $486.9 million contract to Ball Aerospace for the GeoXO Ocean Color Instrument, a next-generation weather satellite instrument. L3Harris alleged NASA conducted a flawed best-value tradeoff, failed to perform proper cost realism analysis, and did not address an organizational conflict of interest related to BAE Systems\' acquisition of Ball Aerospace.',
    significance: 'Affirmed that agencies can reasonably favor lower cost when the cost advantage is "very significant" even with a slight technical disadvantage. L3Harris subsequently filed in COFC and lost again in April 2024.',
    keyFindings: [
      'NASA\'s cost realism adjustment yielded $553.9M probable cost for Ball vs. $764.9M for L3Harris',
      '"Very significant cost advantage" outweighed "slight" technical advantage',
      'Organizational conflict of interest claim rejected',
      'L3Harris subsequently challenged in COFC and was dismissed in April 2024',
    ],
  },
  {
    id: 'l3harris-geoxo-cofc-2024',
    title: 'L3Harris Technologies, Inc. v. United States\u2014GeoXO',
    shortTitle: 'L3Harris GeoXO COFC Challenge',
    caseNumber: 'No. 24-64C',
    forum: 'cofc',
    outcome: 'dismissed',
    program: 'satellite',
    protester: 'L3Harris Technologies',
    awardee: 'Ball Aerospace',
    agency: 'NASA',
    contractValue: '$544M',
    yearFiled: 2024,
    yearDecided: 2024,
    decisionDate: 'April 2024',
    description: 'After losing at the GAO, L3Harris escalated its challenge of NASA\'s GeoXO weather satellite instrument contract to the Court of Federal Claims, arguing NASA\'s evaluation was arbitrary and the cost realism analysis was flawed.',
    significance: 'Demonstrated that courts will generally defer to agency evaluation conclusions when the record shows a reasonable basis. Reinforced that losing at GAO makes COFC success unlikely absent new evidence.',
    keyFindings: [
      'Court dismissed L3Harris\'s challenge',
      'Deferred to NASA\'s evaluation methodology',
      'Affirmed GAO\'s earlier findings on cost realism',
      'Ball Aerospace contract proceeded as originally awarded',
    ],
  },
  {
    id: 'spacex-lsa-cofc-2019',
    title: 'Space Exploration Technologies Corp. v. United States\u2014Launch Service Agreements',
    shortTitle: 'SpaceX Launch Service Agreement Protest',
    caseNumber: 'No. 19-742C',
    forum: 'cofc',
    outcome: 'dismissed',
    program: 'defense',
    protester: 'SpaceX',
    awardee: 'ULA / Northrop Grumman / Blue Origin',
    agency: 'USAF',
    contractValue: '$2.3B (LSA Phase)',
    yearFiled: 2019,
    yearDecided: 2019,
    decisionDate: 'September 2019',
    description: 'SpaceX challenged the Air Force\'s award of three Launch Service Agreements (LSAs) under Other Transaction Authority (OTA) to ULA, Northrop Grumman, and Blue Origin, arguing it was improperly excluded. The COFC found it lacked jurisdiction over OTA procurement protests.',
    significance: 'Key jurisdictional ruling establishing that the Court of Federal Claims lacked subject matter jurisdiction over OTA awards. The case was transferred to the Central District of California. Highlighted the legal gray area around OTA protest rights.',
    keyFindings: [
      'COFC dismissed for lack of subject matter jurisdiction over OTA',
      'OTA awards not considered "procurement" under the Tucker Act',
      'Case transferred to U.S. District Court for C.D. California',
      'Raised fundamental questions about protest rights in OTA space acquisitions',
    ],
  },
  {
    id: 'planetspace-crs-gao-2009',
    title: 'PlanetSpace, Inc.\u2014Commercial Resupply Services',
    shortTitle: 'PlanetSpace CRS Protest',
    caseNumber: 'B-401016; B-401016.2',
    forum: 'gao',
    outcome: 'denied',
    program: 'iss',
    protester: 'PlanetSpace',
    awardee: 'SpaceX / Orbital Sciences',
    agency: 'NASA',
    contractValue: '$3.5B',
    yearFiled: 2009,
    yearDecided: 2009,
    decisionDate: 'April 22, 2009',
    description: 'PlanetSpace protested NASA\'s award of Commercial Resupply Services (CRS) contracts to SpaceX ($1.6B) and Orbital Sciences Corporation ($1.9B) for cargo delivery to the International Space Station, alleging NASA\'s evaluation was flawed.',
    significance: 'Early test of NASA\'s commercial space procurement approach. GAO\'s denial cleared the path for the successful CRS program that has delivered cargo to the ISS for over a decade.',
    keyFindings: [
      'GAO denied the protest, finding NASA\'s evaluation was reasonable',
      'NASA properly evaluated technical capability and past performance',
      'Cleared the way for SpaceX Dragon and Orbital Cygnus cargo missions',
      'First protest in what became NASA\'s successful commercial cargo program',
    ],
  },
  {
    id: 'viasat-sda-t2tl-cofc-2024',
    title: 'Viasat, Inc. v. United States\u2014SDA Tranche 2 Transport Layer Gamma',
    shortTitle: 'Viasat SDA Procurement Integrity Case',
    caseNumber: 'No. 24-1487C',
    forum: 'cofc',
    outcome: 'corrective_action',
    program: 'defense',
    protester: 'Viasat',
    awardee: 'Tyvak / York Space Systems',
    agency: 'SDA/DoD',
    contractValue: '$424M',
    yearFiled: 2024,
    yearDecided: 2025,
    decisionDate: 'February 2025',
    description: 'Viasat filed suit after the SDA awarded contracts to Tyvak and York Space Systems for 10 satellites each for the T2TL Gamma program. Investigation revealed an SDA employee violated the Procurement Integrity Act by disclosing Tyvak\'s bid pricing and instructing them to partner with a specific contractor.',
    significance: 'Major procurement integrity case resulting in the SDA director being placed on administrative leave. Led to cancellation of Tyvak\'s contract and a full re-competition. Highlighted ethical risks in rapid acquisition environments.',
    keyFindings: [
      'SDA employee violated Procurement Integrity Act by disclosing bid information',
      'Employee instructed Tyvak on pricing and teaming arrangements',
      'SDA Director placed on administrative leave pending investigation',
      'Tyvak contract canceled; York Space Systems contract maintained',
      'SDA will issue new solicitation for 10 Gamma T2TL satellites',
    ],
  },
];

function ProtestsOverviewTab() {
  const [search, setSearch] = useState('');
  const [forumFilter, setForumFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return BID_PROTESTS
      .filter((p) => {
        if (forumFilter && p.forum !== forumFilter) return false;
        if (outcomeFilter && p.outcome !== outcomeFilter) return false;
        if (programFilter && p.program !== programFilter) return false;
        if (agencyFilter && p.agency !== agencyFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          return p.title.toLowerCase().includes(s) || p.shortTitle.toLowerCase().includes(s) || p.caseNumber.toLowerCase().includes(s) || p.protester.toLowerCase().includes(s) || p.awardee.toLowerCase().includes(s) || p.description.toLowerCase().includes(s);
        }
        return true;
      })
      .sort((a, b) => b.yearDecided - a.yearDecided || b.yearFiled - a.yearFiled);
  }, [search, forumFilter, outcomeFilter, programFilter, agencyFilter]);

  const uniqueForums = Array.from(new Set(BID_PROTESTS.map((p) => p.forum)));
  const uniqueOutcomes = Array.from(new Set(BID_PROTESTS.map((p) => p.outcome)));
  const uniquePrograms = Array.from(new Set(BID_PROTESTS.map((p) => p.program)));
  const uniqueAgencies = Array.from(new Set(BID_PROTESTS.map((p) => p.agency)));

  const deniedCount = BID_PROTESTS.filter((p) => p.outcome === 'denied').length;
  const sustainedCount = BID_PROTESTS.filter((p) => p.outcome === 'sustained').length;
  const correctiveCount = BID_PROTESTS.filter((p) => p.outcome === 'corrective_action').length;
  const gaoCount = BID_PROTESTS.filter((p) => p.forum === 'gao').length;
  const cofcCount = BID_PROTESTS.filter((p) => p.forum === 'cofc').length;

  return (
    <div>
      <div className="card p-5 mb-6 border border-amber-500/20 bg-amber-500/5">
        <h3 className="text-white font-semibold mb-2">Space Industry Bid Protests & Claims Database</h3>
        <p className="text-star-300 text-sm leading-relaxed">Tracking major bid protests and procurement challenges in the U.S. space industry. Includes GAO protests, Court of Federal Claims (COFC) litigation, and appellate decisions affecting NASA, DoD, and other agency space procurements.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{BID_PROTESTS.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Protests</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{deniedCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Denied</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{sustainedCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Sustained</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-blue-400">{correctiveCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Corrective Action</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{gaoCount} / {cofcCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">GAO / COFC</div></div>
      </div>

      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search case, protester, awardee..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={forumFilter} onChange={(e) => setForumFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Forums</option>{uniqueForums.map((f) => (<option key={f} value={f}>{PROTEST_FORUM_STYLES[f].label}</option>))}</select>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Outcomes</option>{uniqueOutcomes.map((o) => (<option key={o} value={o}>{PROTEST_OUTCOME_STYLES[o].label}</option>))}</select>
        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Programs</option>{uniquePrograms.map((p) => (<option key={p} value={p}>{PROTEST_PROGRAM_LABELS[p]}</option>))}</select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Agencies</option>{uniqueAgencies.map((a) => (<option key={a} value={a}>{a}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} cases</span>
      </div></div>

      <div className="space-y-4">{filtered.map((protest) => {
        const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome];
        const forumStyle = PROTEST_FORUM_STYLES[protest.forum];
        const isExpanded = expandedId === protest.id;
        return (
          <div key={protest.id} className="card p-5 hover:border-nebula-500/50 transition-all">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-base">{protest.shortTitle}</h4>
                <span className="text-star-300 text-xs font-mono">{protest.caseNumber}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div><span className="text-star-300 text-xs block">Protester</span><span className="text-white text-sm font-medium">{protest.protester}</span></div>
              <div><span className="text-star-300 text-xs block">Awardee</span><span className="text-nebula-300 text-sm">{protest.awardee}</span></div>
              <div><span className="text-star-300 text-xs block">Agency</span><span className="text-white text-sm">{protest.agency}</span></div>
              <div><span className="text-star-300 text-xs block">Contract Value</span><span className="text-white text-sm font-bold">{protest.contractValue}</span></div>
            </div>
            <p className="text-star-300 text-sm leading-relaxed mb-3">{protest.description}</p>
            <button onClick={() => setExpandedId(isExpanded ? null : protest.id)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors mb-2">{isExpanded ? 'Show Less' : 'View Key Findings & Significance'}</button>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                <div><h5 className="text-xs font-semibold text-star-300 mb-2 uppercase tracking-wider">Key Findings</h5><ul className="space-y-1.5">{protest.keyFindings.map((finding, i) => (<li key={i} className="flex items-start gap-2 text-xs text-star-300"><svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{finding}</li>))}</ul></div>
                <div><h5 className="text-xs font-semibold text-star-300 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-star-300">{protest.significance}</p></div>
                <div className="text-xs text-star-300">
                  <span className="font-medium text-white">{protest.title}</span>
                  <span className="mx-2 text-white/20">|</span>
                  <span>Program: <span className="text-nebula-300">{PROTEST_PROGRAM_LABELS[protest.program]}</span></span>
                  {protest.judge && (<><span className="mx-2 text-white/20">|</span><span>{protest.judge}</span></>)}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10 mt-3">
              <span>Filed: <span className="text-white font-medium">{protest.yearFiled}</span></span>
              <span className="text-white/20">|</span>
              <span>Decided: <span className="text-white font-medium">{protest.decisionDate}</span></span>
              <span className="text-white/20">|</span>
              <span className="text-nebula-300">{PROTEST_PROGRAM_LABELS[protest.program]}</span>
            </div>
          </div>
        );
      })}</div>

      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No protests match your search</h3><button onClick={() => { setSearch(''); setForumFilter(''); setOutcomeFilter(''); setProgramFilter(''); setAgencyFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function ProtestsTimelineTab() {
  const years = useMemo(() => {
    const allYears = Array.from(new Set(BID_PROTESTS.map((p) => p.yearDecided))).sort((a, b) => b - a);
    return allYears;
  }, []);

  const protestsByYear = useMemo(() => {
    const grouped: Record<number, BidProtest[]> = {};
    for (const protest of BID_PROTESTS) {
      if (!grouped[protest.yearDecided]) grouped[protest.yearDecided] = [];
      grouped[protest.yearDecided].push(protest);
    }
    return grouped;
  }, []);

  const outcomeColors: Record<ProtestOutcome, string> = {
    denied: 'bg-red-400',
    sustained: 'bg-green-400',
    dismissed: 'bg-slate-400',
    withdrawn: 'bg-yellow-400',
    corrective_action: 'bg-blue-400',
    settled: 'bg-purple-400',
  };

  return (
    <div>
      <div className="card p-5 mb-6 border border-cyan-500/20 bg-cyan-500/5">
        <h3 className="text-white font-semibold mb-2">Protest Timeline</h3>
        <p className="text-star-300 text-sm leading-relaxed">Chronological view of space industry bid protests grouped by decision year, with color-coded outcome indicators.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(PROTEST_OUTCOME_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${outcomeColors[key as ProtestOutcome]}`} />
            <span className="text-xs text-star-300">{style.label}</span>
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
        {years.map((year) => (
          <div key={year} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-nebula-500 flex items-center justify-center text-white text-xs font-bold relative z-10">{protestsByYear[year].length}</div>
              <h3 className="text-xl font-bold font-display text-white">{year}</h3>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="ml-12 space-y-3">
              {protestsByYear[year].sort((a, b) => {
                const monthA = new Date(a.decisionDate).getTime();
                const monthB = new Date(b.decisionDate).getTime();
                return (isNaN(monthB) ? 0 : monthB) - (isNaN(monthA) ? 0 : monthA);
              }).map((protest) => {
                const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome];
                const forumStyle = PROTEST_FORUM_STYLES[protest.forum];
                return (
                  <div key={protest.id} className="card p-4 hover:border-nebula-500/50 transition-all relative">
                    <div className={`absolute left-[-28px] top-4 w-3 h-3 rounded-full ${outcomeColors[protest.outcome]} border-2 border-slate-900`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm">{protest.shortTitle}</h4>
                        <p className="text-star-300 text-xs mt-1">{protest.protester} vs. {protest.awardee}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-star-300">
                      <span>{protest.caseNumber}</span>
                      <span className="text-white/20">|</span>
                      <span>{protest.agency}</span>
                      <span className="text-white/20">|</span>
                      <span className="text-white font-medium">{protest.contractValue}</span>
                      <span className="text-white/20">|</span>
                      <span>{protest.decisionDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtestsAnalysisTab() {
  const totalProtests = BID_PROTESTS.length;
  const gaoCases = BID_PROTESTS.filter((p) => p.forum === 'gao');
  const cofcCases = BID_PROTESTS.filter((p) => p.forum === 'cofc');

  const gaoSuccessRate = gaoCases.length > 0
    ? Math.round((gaoCases.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / gaoCases.length) * 100)
    : 0;
  const cofcSuccessRate = cofcCases.length > 0
    ? Math.round((cofcCases.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / cofcCases.length) * 100)
    : 0;

  const byProgram = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of BID_PROTESTS) {
      counts[p.program] = (counts[p.program] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  const byAgency = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of BID_PROTESTS) {
      counts[p.agency] = (counts[p.agency] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  const byOutcome = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of BID_PROTESTS) {
      counts[p.outcome] = (counts[p.outcome] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  const yearRange = useMemo(() => {
    const years = Array.from(new Set(BID_PROTESTS.map((p) => p.yearDecided))).sort();
    return years;
  }, []);

  const volumeByYear = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const year of yearRange) counts[year] = 0;
    for (const p of BID_PROTESTS) counts[p.yearDecided] = (counts[p.yearDecided] || 0) + 1;
    return counts;
  }, [yearRange]);

  const maxVolume = Math.max(...Object.values(volumeByYear));

  return (
    <div>
      <div className="card p-5 mb-6 border border-purple-500/20 bg-purple-500/5">
        <h3 className="text-white font-semibold mb-2">Analysis & Trends</h3>
        <p className="text-star-300 text-sm leading-relaxed">Statistical analysis of space industry bid protests, including success rates by forum, protest volume trends, and common grounds for challenge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">GAO Success Rate</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-blue-400">{gaoSuccessRate}%</div>
            <p className="text-xs text-star-300 mt-1">Sustained or Corrective Action</p>
          </div>
          <div className="text-xs text-star-300 text-center">{gaoCases.length} cases filed at GAO</div>
          <div className="h-2 bg-white/5 rounded-full mt-3 overflow-hidden"><div className="h-full bg-blue-400 rounded-full" style={{ width: `${gaoSuccessRate}%` }} /></div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">COFC Success Rate</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-purple-400">{cofcSuccessRate}%</div>
            <p className="text-xs text-star-300 mt-1">Sustained or Corrective Action</p>
          </div>
          <div className="text-xs text-star-300 text-center">{cofcCases.length} cases filed at COFC</div>
          <div className="h-2 bg-white/5 rounded-full mt-3 overflow-hidden"><div className="h-full bg-purple-400 rounded-full" style={{ width: `${cofcSuccessRate}%` }} /></div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Overall Protest Effectiveness</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-white">
              {Math.round((BID_PROTESTS.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / totalProtests) * 100)}%
            </div>
            <p className="text-xs text-star-300 mt-1">Result in Protester-Favorable Outcome</p>
          </div>
          <div className="text-xs text-star-300 text-center">{totalProtests} total protests tracked</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Protest Volume by Year</h4>
          <div className="space-y-2">
            {yearRange.map((year) => (
              <div key={year} className="flex items-center gap-3">
                <span className="text-xs text-star-300 w-10 text-right font-mono">{year}</span>
                <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-nebula-500 to-cyan-400 rounded flex items-center justify-end pr-2" style={{ width: `${(volumeByYear[year] / maxVolume) * 100}%` }}>
                    <span className="text-xs text-white font-bold">{volumeByYear[year]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Outcomes Breakdown</h4>
          <div className="space-y-3">
            {byOutcome.map(([outcome, count]) => {
              const style = PROTEST_OUTCOME_STYLES[outcome as ProtestOutcome];
              const pct = Math.round((count / totalProtests) * 100);
              return (
                <div key={outcome}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
                    <span className="text-xs text-star-300">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${style.bg.replace('/20', '/60')}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">By Program Area</h4>
          <div className="space-y-2">
            {byProgram.map(([program, count]) => (
              <div key={program} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{PROTEST_PROGRAM_LABELS[program as ProtestProgram]}</span>
                <span className="text-sm font-bold text-nebula-300">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">By Agency</h4>
          <div className="space-y-2">
            {byAgency.map(([agency, count]) => (
              <div key={agency} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{agency}</span>
                <span className="text-sm font-bold text-nebula-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-elevated p-5">
        <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">All Cases Summary</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Case</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Forum</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Outcome</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Protester</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Agency</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Value</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Year</th>
              </tr>
            </thead>
            <tbody>
              {BID_PROTESTS.sort((a, b) => b.yearDecided - a.yearDecided).map((protest) => {
                const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome];
                const forumStyle = PROTEST_FORUM_STYLES[protest.forum];
                return (
                  <tr key={protest.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3"><span className="text-white font-medium">{protest.shortTitle}</span><br /><span className="text-star-300 text-xs font-mono">{protest.caseNumber}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-xs font-medium px-2 py-0.5 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-xs font-medium px-2 py-0.5 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span></td>
                    <td className="py-2.5 px-3 text-star-300">{protest.protester}</td>
                    <td className="py-2.5 px-3 text-star-300">{protest.agency}</td>
                    <td className="py-2.5 px-3 text-white font-medium">{protest.contractValue}</td>
                    <td className="py-2.5 px-3 text-star-300">{protest.yearDecided}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ############################################################################
// MAIN PAGE - Two-Level Tab System
// ############################################################################

type TopSection = 'compliance' | 'space-law' | 'filings' | 'protests';

function getTopSectionFromTab(tab: string): TopSection {
  const complianceTabs = ['policy', 'wizard', 'cases', 'export', 'experts'];
  const spaceLawTabs = ['treaties', 'national', 'artemis', 'proceedings', 'bodies'];
  const filingsTabs = ['fcc', 'faa', 'itu', 'sec', 'federal-register'];
  const protestTabs = ['protests-overview', 'protests-timeline', 'protests-analysis'];
  if (complianceTabs.includes(tab)) return 'compliance';
  if (spaceLawTabs.includes(tab)) return 'space-law';
  if (filingsTabs.includes(tab)) return 'filings';
  if (protestTabs.includes(tab)) return 'protests';
  return 'compliance';
}

function getDefaultSubTab(section: TopSection): string {
  if (section === 'compliance') return 'policy';
  if (section === 'space-law') return 'treaties';
  if (section === 'filings') return 'fcc';
  if (section === 'protests') return 'protests-overview';
  return 'policy';
}

function RegulatoryHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = searchParams.get('tab') || 'policy';
  const initialSection = getTopSectionFromTab(initialTab);

  const [activeSection, setActiveSection] = useState<TopSection>(initialSection);
  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  const stats = getRegulatoryHubStats();

  // Sync tab to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeSubTab !== 'policy') params.set('tab', activeSubTab);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeSubTab, router, pathname]);

  const handleSectionChange = (section: TopSection) => {
    setActiveSection(section);
    const defaultTab = getDefaultSubTab(section);
    setActiveSubTab(defaultTab);
  };

  const topSections: { id: TopSection; label: string; icon: string }[] = [
    { id: 'compliance', label: 'Compliance', icon: '\uD83D\uDCCB' },
    { id: 'space-law', label: 'Space Law', icon: '\u2696\uFE0F' },
    { id: 'filings', label: 'Regulatory Filings', icon: '\uD83D\uDCC4' },
    { id: 'protests', label: 'Bid Protests & Claims', icon: '\uD83C\uDFDB\uFE0F' },
  ];

  const complianceSubTabs = [
    { id: 'policy', label: 'Policy Tracker', icon: '\uD83D\uDCF0' },
    { id: 'wizard', label: 'Compliance Wizard', icon: '\uD83E\uDDD9' },
    { id: 'cases', label: 'Case Law Archive', icon: '\u2696\uFE0F' },
    { id: 'export', label: 'Export Controls', icon: '\uD83D\uDCE6' },
    { id: 'experts', label: 'Expert Commentary', icon: '\uD83D\uDCA1' },
  ];

  const spaceLawSubTabs = [
    { id: 'treaties', label: 'Treaties' },
    { id: 'national', label: 'National Laws' },
    { id: 'artemis', label: 'Artemis Accords' },
    { id: 'proceedings', label: 'Legal Proceedings' },
    { id: 'bodies', label: 'Regulatory Bodies' },
  ];

  const protestsSubTabs = [
    { id: 'protests-overview', label: 'All Decisions' },
    { id: 'protests-timeline', label: 'Timeline' },
    { id: 'protests-analysis', label: 'Analysis & Trends' },
  ];

  return (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{stats.totalPolicies}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Policy Changes</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">{stats.totalLicenseTypes}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">License Types</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-green-400">{stats.totalCases}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Case Law</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-blue-400">{stats.totalECCNs + stats.totalUSMLCategories}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Export Controls</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-purple-400">{stats.totalExpertSources}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Expert Sources</div>
        </div>
      </div>

      <InlineDisclaimer />

      {/* Top-Level Section Navigation */}
      <div className="flex gap-2 mb-4">
        {topSections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionChange(section.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all ${
              activeSection === section.id
                ? 'bg-nebula-500 text-white shadow-glow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span>{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab Navigation */}
      {activeSection === 'compliance' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {complianceSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeSubTab === tab.id
                  ? 'bg-slate-100 text-slate-900 border-slate-200 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'space-law' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {spaceLawSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'filings' && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-white/5 text-star-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSubTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-star-300'}`}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {activeSection === 'protests' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {protestsSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {activeSubTab === 'policy' && <PolicyTrackerTab />}
      {activeSubTab === 'wizard' && <ComplianceWizardTab />}
      {activeSubTab === 'cases' && <CaseLawArchiveTab />}
      {activeSubTab === 'export' && <ExportControlMonitorTab />}
      {activeSubTab === 'experts' && <ExpertCommentaryTab />}
      {activeSubTab === 'treaties' && <SpaceLawTreatiesTab />}
      {activeSubTab === 'national' && <SpaceLawNationalTab />}
      {activeSubTab === 'artemis' && <SpaceLawArtemisTab />}
      {activeSubTab === 'proceedings' && <SpaceLawProceedingsTab />}
      {activeSubTab === 'bodies' && <SpaceLawBodiesTab />}
      {activeSubTab === 'fcc' && <FilingsFCCTab />}
      {activeSubTab === 'faa' && <FilingsFAATab />}
      {activeSubTab === 'itu' && <FilingsITUTab />}
      {activeSubTab === 'sec' && <FilingsSECTab />}
      {activeSubTab === 'federal-register' && <FilingsFederalRegisterTab />}
      {activeSubTab === 'protests-overview' && <ProtestsOverviewTab />}
      {activeSubTab === 'protests-timeline' && <ProtestsTimelineTab />}
      {activeSubTab === 'protests-analysis' && <ProtestsAnalysisTab />}
    </>
  );
}

export default function RegulatoryHubPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Regulatory Hub"
          subtitle="Comprehensive regulatory tracking, compliance guidance, space law, bid protests, case law, filings, and expert analysis for the space industry"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Regulatory Hub' }]}
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            &larr; Back to Dashboard
          </Link>
        </PageHeader>

        <PremiumGate requiredTier="pro">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <RegulatoryHubContent />
          </Suspense>
        </PremiumGate>
      </div>
    </div>
  );
}
