'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

type FilingStatus = 'granted' | 'pending' | 'denied' | 'dismissed' | 'amended' | 'active' | 'expired' | 'proposed' | 'final' | 'comment';

interface FCCFiling {
  id: string;
  callSign?: string;
  fileNumber: string;
  applicant: string;
  filingType: string;
  band: string;
  orbitType: 'NGSO' | 'GSO' | 'HEO' | 'MEO';
  status: FilingStatus;
  dateFiled: string;
  dateActedOn?: string;
  satelliteCount?: number;
  summary: string;
  docket?: string;
}

interface FAALicense {
  id: string;
  licenseNumber: string;
  licensee: string;
  licenseType: 'Launch' | 'Reentry' | 'Launch Site' | 'Launch/Reentry';
  vehicle: string;
  launchSite: string;
  status: FilingStatus;
  dateIssued: string;
  expirationDate: string;
  missionsAuthorized: number;
  summary: string;
}

interface ITUFiling {
  id: string;
  networkName: string;
  administration: string;
  filingType: 'AP30/30A' | 'AP30B' | 'Art.9 Coordination' | 'Art.11 Notification' | 'Due Diligence';
  serviceBand: string;
  orbitType: 'GSO' | 'NGSO' | 'HEO' | 'MEO';
  status: FilingStatus;
  dateFiled: string;
  satellites?: number;
  summary: string;
}

interface SECFiling {
  id: string;
  company: string;
  ticker: string;
  filingType: '10-K' | '10-Q' | '8-K' | 'S-1' | 'DEF 14A' | '13F' | 'SC 13D';
  dateFiled: string;
  period?: string;
  summary: string;
  keyMetric?: string;
  keyMetricLabel?: string;
  url: string;
}

interface FederalRegisterEntry {
  id: string;
  agency: string;
  title: string;
  documentType: 'Proposed Rule' | 'Final Rule' | 'Notice' | 'Presidential Document' | 'Request for Comment';
  federalRegisterNumber: string;
  publishedDate: string;
  commentDeadline?: string;
  effectiveDate?: string;
  impact: 'high' | 'medium' | 'low';
  summary: string;
  docket?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Status & Style Configs
// ════════════════════════════════════════════════════════════════════════════

const STATUS_STYLES: Record<FilingStatus, { label: string; bg: string; text: string }> = {
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

const IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
};

const ORBIT_STYLES: Record<string, { bg: string; text: string }> = {
  NGSO: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  GSO: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  HEO: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  MEO: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
};

// ════════════════════════════════════════════════════════════════════════════
// FCC Filing Data
// ════════════════════════════════════════════════════════════════════════════

const FCC_FILINGS: FCCFiling[] = [
  {
    id: 'fcc-1',
    callSign: 'S3070',
    fileNumber: 'SAT-MPL-20200526-00062',
    applicant: 'SpaceX Services, Inc.',
    filingType: 'Part 25 NGSO Modification',
    band: 'Ku/Ka-band',
    orbitType: 'NGSO',
    status: 'granted',
    dateFiled: '2020-05-26',
    dateActedOn: '2021-04-27',
    satelliteCount: 2814,
    summary: 'SpaceX Gen2 modification to lower orbital shells from 1,110 km to 540-570 km for up to 2,814 satellites. Approved by FCC with conditions on debris mitigation and interference protection to GSO systems.',
    docket: 'IBFS File No. SAT-MPL-20200526-00062',
  },
  {
    id: 'fcc-2',
    callSign: 'S3070',
    fileNumber: 'SAT-MOD-20230120-00012',
    applicant: 'SpaceX Services, Inc.',
    filingType: 'Part 25 Gen2 System',
    band: 'Ku/Ka/V-band',
    orbitType: 'NGSO',
    status: 'granted',
    dateFiled: '2022-01-18',
    dateActedOn: '2023-12-01',
    satelliteCount: 7500,
    summary: 'SpaceX Second Generation (Gen2) constellation authorization for 7,500 satellites across multiple orbital shells (525-535 km). FCC approved a reduced constellation from the requested 29,988 satellites with conditions on space debris and coordination.',
    docket: 'IB Docket No. 22-271',
  },
  {
    id: 'fcc-3',
    fileNumber: 'SAT-LOA-20200721-00073',
    applicant: 'Kuiper Systems LLC (Amazon)',
    filingType: 'Part 25 NGSO License',
    band: 'Ka-band',
    orbitType: 'NGSO',
    status: 'granted',
    dateFiled: '2019-07-04',
    dateActedOn: '2020-07-30',
    satelliteCount: 3236,
    summary: 'Amazon Project Kuiper authorization for 3,236-satellite broadband constellation in three orbital shells (590 km, 610 km, 630 km). FCC imposed milestone requirements: 50% by 2026-07-30, 100% by 2029-07-30.',
    docket: 'IBFS File No. SAT-LOA-20200721-00073',
  },
  {
    id: 'fcc-4',
    fileNumber: 'SAT-MOD-20231030-00156',
    applicant: 'Kuiper Systems LLC (Amazon)',
    filingType: 'Part 25 Modification',
    band: 'Ka-band',
    orbitType: 'NGSO',
    status: 'pending',
    dateFiled: '2023-10-30',
    satelliteCount: 7774,
    summary: 'Amazon Kuiper modification request to expand constellation to 7,774 satellites and add V-band frequencies. If approved, would more than double the authorized constellation size with additional orbital planes.',
  },
  {
    id: 'fcc-5',
    callSign: 'S2935',
    fileNumber: 'SAT-LOI-20160428-00041',
    applicant: 'OneWeb (Network Access Associates)',
    filingType: 'Part 25 NGSO License',
    band: 'Ku/Ka-band',
    orbitType: 'NGSO',
    status: 'granted',
    dateFiled: '2016-04-28',
    dateActedOn: '2017-06-22',
    satelliteCount: 720,
    summary: 'OneWeb authorization for 720-satellite LEO broadband constellation at 1,200 km altitude. Later modified to include 48,000-satellite Phase 2. Post-bankruptcy, Eutelsat OneWeb continues operations with 634 satellites in orbit.',
  },
  {
    id: 'fcc-6',
    fileNumber: 'SAT-LOA-20221003-00109',
    applicant: 'AST SpaceMobile, Inc.',
    filingType: 'Part 25 NGSO License',
    band: 'V-band (feeder links)',
    orbitType: 'NGSO',
    status: 'granted',
    dateFiled: '2022-10-03',
    dateActedOn: '2023-09-21',
    satelliteCount: 243,
    summary: 'AST SpaceMobile authorization for 243 BlueBird satellites providing direct-to-cellular broadband service. V-band feeder links with terrestrial mobile spectrum used for service links through MNO partnerships.',
  },
  {
    id: 'fcc-7',
    fileNumber: 'SAT-LOA-20230301-00034',
    applicant: 'Lynk Global, Inc.',
    filingType: 'Part 25 NGSO License',
    band: 'Cellular bands (service), Ku-band (feeder)',
    orbitType: 'NGSO',
    status: 'granted',
    dateFiled: '2023-03-01',
    dateActedOn: '2023-12-07',
    satelliteCount: 100,
    summary: 'Lynk Global authorization for satellite-to-cell-phone service constellation. First company to receive FCC commercial license for direct satellite-to-standard-phone connectivity.',
  },
  {
    id: 'fcc-8',
    fileNumber: 'SAT-MOD-20240315-00048',
    applicant: 'Telesat Canada',
    filingType: 'Part 25 NGSO Market Access',
    band: 'Ka-band',
    orbitType: 'NGSO',
    status: 'granted',
    dateFiled: '2018-11-02',
    dateActedOn: '2024-03-15',
    satelliteCount: 198,
    summary: 'Telesat Lightspeed constellation US market access for 198 LEO satellites at 1,015-1,325 km. Enterprise-focused broadband constellation targeting government and aviation connectivity markets.',
  },
  {
    id: 'fcc-9',
    fileNumber: 'SAT-LOA-20231215-00187',
    applicant: 'Rivada Space Networks GmbH',
    filingType: 'Part 25 NGSO License',
    band: 'Ka/V-band',
    orbitType: 'NGSO',
    status: 'pending',
    dateFiled: '2023-12-15',
    satelliteCount: 600,
    summary: 'Rivada Space Networks application for 600-satellite LEO constellation providing secure mesh networking with optical inter-satellite links. Targeting government and enterprise markets with low-latency data relay.',
  },
  {
    id: 'fcc-10',
    fileNumber: 'SAT-LOA-20240201-00019',
    applicant: 'Astranis Space Technologies',
    filingType: 'Part 25 GSO Application',
    band: 'Ka-band',
    orbitType: 'GSO',
    status: 'granted',
    dateFiled: '2024-02-01',
    dateActedOn: '2024-08-15',
    satelliteCount: 1,
    summary: 'Astranis MicroGEO satellite application for dedicated broadband capacity to underserved markets. Ultra-small GEO spacecraft design enables dedicated single-country coverage at lower cost than traditional GSO birds.',
  },
  {
    id: 'fcc-11',
    fileNumber: 'SAT-RPL-20240615-00089',
    applicant: 'SES S.A.',
    filingType: 'Part 25 GSO Replacement',
    band: 'C/Ku-band',
    orbitType: 'GSO',
    status: 'pending',
    dateFiled: '2024-06-15',
    satelliteCount: 1,
    summary: 'SES replacement satellite application for SES-22 at 135 degrees West. Continuing C-band and Ku-band services post C-band transition with upgraded high-throughput payload.',
  },
  {
    id: 'fcc-12',
    fileNumber: 'SAT-LOA-20240901-00112',
    applicant: 'Mangata Networks LLC',
    filingType: 'Part 25 HEO/MEO License',
    band: 'Ka/Q/V-band',
    orbitType: 'HEO',
    status: 'pending',
    dateFiled: '2024-09-01',
    satelliteCount: 791,
    summary: 'Mangata Networks application for hybrid HEO/MEO constellation of 791 satellites. Unique highly elliptical orbit design provides persistent high-latitude coverage for Arctic regions and government users.',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// FAA License Data
// ════════════════════════════════════════════════════════════════════════════

const FAA_LICENSES: FAALicense[] = [
  {
    id: 'faa-1',
    licenseNumber: 'LRLO 24-118A',
    licensee: 'Space Exploration Technologies Corp.',
    licenseType: 'Launch/Reentry',
    vehicle: 'Falcon 9 / Dragon',
    launchSite: 'KSC LC-39A, CCSFS SLC-40, VSFB SLC-4E',
    status: 'active',
    dateIssued: '2024-01-15',
    expirationDate: '2029-01-15',
    missionsAuthorized: 100,
    summary: 'Operator license for Falcon 9 launch and Dragon spacecraft reentry operations. Covers all SpaceX launch sites including Kennedy Space Center, Cape Canaveral Space Force Station, and Vandenberg Space Force Base.',
  },
  {
    id: 'faa-2',
    licenseNumber: 'LRLO 23-112',
    licensee: 'Space Exploration Technologies Corp.',
    licenseType: 'Launch/Reentry',
    vehicle: 'Starship / Super Heavy',
    launchSite: 'Boca Chica, TX (Starbase)',
    status: 'active',
    dateIssued: '2023-06-14',
    expirationDate: '2028-06-14',
    missionsAuthorized: 10,
    summary: 'Launch and reentry license for Starship/Super Heavy vehicle from Starbase, Boca Chica. Multiple test flights conducted under this license including IFT-1 through IFT-6. Subject to environmental mitigations per FAA Programmatic Environmental Assessment.',
  },
  {
    id: 'faa-3',
    licenseNumber: 'LRLO 24-120',
    licensee: 'Rocket Lab USA, Inc.',
    licenseType: 'Launch',
    vehicle: 'Electron',
    launchSite: 'Wallops Flight Facility LC-2, Mahia LC-1 (NZ)',
    status: 'active',
    dateIssued: '2024-03-01',
    expirationDate: '2029-03-01',
    missionsAuthorized: 50,
    summary: 'Operator license for Electron small launch vehicle. Covers US launches from Mid-Atlantic Regional Spaceport at Wallops Island and supports New Zealand launches from Mahia Peninsula Launch Complex 1.',
  },
  {
    id: 'faa-4',
    licenseNumber: 'LRLO 24-122',
    licensee: 'Rocket Lab USA, Inc.',
    licenseType: 'Launch',
    vehicle: 'Neutron',
    launchSite: 'Wallops Flight Facility LC-3',
    status: 'pending',
    dateIssued: '2024-11-01',
    expirationDate: '2029-11-01',
    missionsAuthorized: 25,
    summary: 'Application for Neutron medium-lift vehicle launch license from new pad at Wallops Flight Facility. Neutron is an 8-ton-to-LEO reusable rocket targeting 2025 first flight for mega-constellation deployment and national security missions.',
  },
  {
    id: 'faa-5',
    licenseNumber: 'LRLO 23-108',
    licensee: 'United Launch Alliance, LLC',
    licenseType: 'Launch',
    vehicle: 'Vulcan Centaur',
    launchSite: 'CCSFS SLC-41',
    status: 'active',
    dateIssued: '2023-12-20',
    expirationDate: '2028-12-20',
    missionsAuthorized: 30,
    summary: 'Launch license for Vulcan Centaur rocket from Cape Canaveral SLC-41. Inaugural Cert-1 mission launched January 2024 carrying Astrobotic Peregrine lunar lander. Vehicle certified for National Security Space Launch missions.',
  },
  {
    id: 'faa-6',
    licenseNumber: 'LRLO 24-115',
    licensee: 'Firefly Aerospace, Inc.',
    licenseType: 'Launch',
    vehicle: 'Alpha / MLV',
    launchSite: 'VSFB SLC-2',
    status: 'active',
    dateIssued: '2024-02-10',
    expirationDate: '2029-02-10',
    missionsAuthorized: 20,
    summary: 'Operator license for Firefly Alpha small launch vehicle and future Medium Launch Vehicle (MLV). Alpha has achieved multiple successful orbital missions. MLV under development in partnership with Northrop Grumman.',
  },
  {
    id: 'faa-7',
    licenseNumber: 'LRLO 24-119',
    licensee: 'Relativity Space, Inc.',
    licenseType: 'Launch',
    vehicle: 'Terran R',
    launchSite: 'CCSFS LC-16',
    status: 'pending',
    dateIssued: '2024-06-01',
    expirationDate: '2029-06-01',
    missionsAuthorized: 15,
    summary: 'Application for Terran R fully reusable, 3D-printed medium-lift launch vehicle. First launch targeted from Cape Canaveral LC-16. Designed to lift 23,500 kg to LEO with full reusability.',
  },
  {
    id: 'faa-8',
    licenseNumber: 'LRLO 23-105',
    licensee: 'Blue Origin, LLC',
    licenseType: 'Launch',
    vehicle: 'New Glenn',
    launchSite: 'CCSFS LC-36',
    status: 'active',
    dateIssued: '2024-07-01',
    expirationDate: '2029-07-01',
    missionsAuthorized: 25,
    summary: 'Launch license for New Glenn heavy-lift orbital vehicle from Cape Canaveral LC-36. Inaugural flight (NG-1) launched October 2024 carrying ESCAPADE Mars mission prototype. Booster landing attempt on first flight.',
  },
  {
    id: 'faa-9',
    licenseNumber: 'RSO 24-003',
    licensee: 'Blue Origin, LLC',
    licenseType: 'Reentry',
    vehicle: 'New Shepard',
    launchSite: 'West Texas Launch Site',
    status: 'active',
    dateIssued: '2024-04-01',
    expirationDate: '2026-04-01',
    missionsAuthorized: 12,
    summary: 'Reentry license for New Shepard suborbital vehicle crew capsule recovery. Supports human spaceflight tourism and research payload missions from West Texas Launch Site near Van Horn.',
  },
  {
    id: 'faa-10',
    licenseNumber: 'LRLO 24-125',
    licensee: 'Stoke Space Technologies, Inc.',
    licenseType: 'Launch',
    vehicle: 'Nova',
    launchSite: 'CCSFS (TBD)',
    status: 'pending',
    dateIssued: '2024-09-15',
    expirationDate: '2029-09-15',
    missionsAuthorized: 10,
    summary: 'Application for Nova fully reusable launch vehicle. Stoke Space is developing a fully reusable rocket with a novel second-stage heat shield design for upper stage return and reuse.',
  },
  {
    id: 'faa-11',
    licenseNumber: 'LSO 20-014A',
    licensee: 'Space Florida',
    licenseType: 'Launch Site',
    vehicle: 'N/A',
    launchSite: 'Cape Canaveral Spaceport',
    status: 'active',
    dateIssued: '2020-08-15',
    expirationDate: '2025-08-15',
    missionsAuthorized: 0,
    summary: 'Launch site operator license for Cape Canaveral Spaceport facilities managed by Space Florida. Supports commercial launch operations from multiple pads including horizontal launch capabilities.',
  },
  {
    id: 'faa-12',
    licenseNumber: 'LRLO 24-128',
    licensee: 'Intuitive Machines, LLC',
    licenseType: 'Launch/Reentry',
    vehicle: 'Nova-C Lunar Lander',
    launchSite: 'KSC (via SpaceX F9)',
    status: 'active',
    dateIssued: '2024-01-20',
    expirationDate: '2026-01-20',
    missionsAuthorized: 5,
    summary: 'Reentry authorization for Nova-C lunar lander operations under NASA CLPS program. IM-1 (Odysseus) successfully landed on the Moon in February 2024, becoming the first US commercial lunar landing.',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// ITU Filing Data
// ════════════════════════════════════════════════════════════════════════════

const ITU_FILINGS: ITUFiling[] = [
  {
    id: 'itu-1',
    networkName: 'STARLINK',
    administration: 'United States (FCC)',
    filingType: 'Art.9 Coordination',
    serviceBand: 'Ku/Ka/V-band',
    orbitType: 'NGSO',
    status: 'active',
    dateFiled: '2016-11-15',
    satellites: 11943,
    summary: 'ITU coordination filings for SpaceX Starlink NGSO constellation across multiple orbital shells. Active coordination with GSO operators under Article 9.12 and NGSO operators under Article 9.12A. EPFD validation ongoing per Article 22.',
  },
  {
    id: 'itu-2',
    networkName: 'KUIPER',
    administration: 'United States (FCC)',
    filingType: 'Art.9 Coordination',
    serviceBand: 'Ka-band',
    orbitType: 'NGSO',
    status: 'active',
    dateFiled: '2018-12-12',
    satellites: 3236,
    summary: 'Amazon Kuiper NGSO system coordination filings for 3,236-satellite Ka-band constellation. Coordination requests with existing GSO and NGSO operators. Due diligence milestones being tracked by ITU BR.',
  },
  {
    id: 'itu-3',
    networkName: 'ONEWEB',
    administration: 'United Kingdom (Ofcom)',
    filingType: 'Art.9 Coordination',
    serviceBand: 'Ku/Ka-band',
    orbitType: 'NGSO',
    status: 'active',
    dateFiled: '2015-06-01',
    satellites: 648,
    summary: 'Eutelsat OneWeb LEO broadband constellation filed through UK administration. Phase 1 (648 satellites at 1,200 km) largely deployed. Coordination with GSO operators in Ku-band ongoing.',
  },
  {
    id: 'itu-4',
    networkName: 'O3B-2',
    administration: 'Luxembourg',
    filingType: 'Art.9 Coordination',
    serviceBand: 'Ka-band',
    orbitType: 'MEO',
    status: 'active',
    dateFiled: '2017-03-20',
    satellites: 11,
    summary: 'SES O3b mPOWER next-generation MEO constellation. 11 high-throughput satellites in 8,062 km orbit. Fully deployed as of 2024, providing terabit-scale connectivity. Coordinated through Luxembourg administration.',
  },
  {
    id: 'itu-5',
    networkName: 'TELESAT-LEO-V2',
    administration: 'Canada (ISED)',
    filingType: 'Art.9 Coordination',
    serviceBand: 'Ka-band',
    orbitType: 'NGSO',
    status: 'active',
    dateFiled: '2020-08-15',
    satellites: 198,
    summary: 'Telesat Lightspeed LEO constellation coordination through Canadian administration (ISED). 198 Ka-band satellites in polar and inclined orbits at 1,015-1,325 km. Enterprise-focused broadband service.',
  },
  {
    id: 'itu-6',
    networkName: 'CINNAMON-937',
    administration: 'Rwanda (RURA)',
    filingType: 'Art.9 Coordination',
    serviceBand: 'V/E-band',
    orbitType: 'NGSO',
    status: 'pending',
    dateFiled: '2021-09-08',
    satellites: 327000,
    summary: 'Controversial filing through Rwanda for massive 327,000-satellite constellation. Widely suspected to be linked to undisclosed commercial entity. ITU BR has requested additional due diligence information. Raised concerns about spectrum warehousing.',
  },
  {
    id: 'itu-7',
    networkName: 'GW-A59',
    administration: 'China (MIIT)',
    filingType: 'Art.9 Coordination',
    serviceBand: 'Ka/V-band',
    orbitType: 'NGSO',
    status: 'active',
    dateFiled: '2020-09-21',
    satellites: 12992,
    summary: 'China SatNet (Guowang) NGSO mega-constellation filing for 12,992 satellites. Filed through Chinese administration as national broadband satellite project. Coordination challenges with existing Starlink and Kuiper filings in overlapping bands.',
  },
  {
    id: 'itu-8',
    networkName: 'IRIS2-EU',
    administration: 'France (ANFR) / EU',
    filingType: 'Art.9 Coordination',
    serviceBand: 'Ku/Ka-band',
    orbitType: 'NGSO',
    status: 'pending',
    dateFiled: '2024-03-01',
    satellites: 290,
    summary: 'European Union IRIS2 sovereign connectivity constellation. Multi-orbit system with 290 satellites filed through ANFR. Consortium led by SES, Eutelsat, Hispasat, and Telespazio. Deployment planned 2028-2030.',
  },
  {
    id: 'itu-9',
    networkName: 'LIGHTSPEED-DD',
    administration: 'Canada (ISED)',
    filingType: 'Due Diligence',
    serviceBand: 'Ka-band',
    orbitType: 'NGSO',
    status: 'active',
    dateFiled: '2024-06-01',
    satellites: 198,
    summary: 'Telesat Lightspeed due diligence filing demonstrating concrete plans for constellation deployment. Manufacturing contract with MDA and launch contracts required by ITU milestones to maintain spectrum priority.',
  },
  {
    id: 'itu-10',
    networkName: 'ASTRA-3B-KA',
    administration: 'Luxembourg',
    filingType: 'AP30B',
    serviceBand: 'Ka-band',
    orbitType: 'GSO',
    status: 'granted',
    dateFiled: '2023-07-15',
    satellites: 1,
    summary: 'SES ASTRA 3B Ka-band plan filing under Appendix 30B for fixed-satellite service in the planned Ka-band allotment plan. Part of SES fleet replacement strategy for European coverage.',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// SEC Filing Data
// ════════════════════════════════════════════════════════════════════════════

const SEC_FILINGS: SECFiling[] = [
  {
    id: 'sec-1',
    company: 'Rocket Lab USA, Inc.',
    ticker: 'RKLB',
    filingType: '10-K',
    dateFiled: '2025-02-27',
    period: 'FY 2024',
    summary: 'Annual report reflecting record revenue of $436M (up 78% YoY). Electron achieved 50th launch milestone. Neutron development on track for 2025 first flight. Space Systems segment growing with HASTE hypersonic contracts and satellite manufacturing.',
    keyMetric: '$436M',
    keyMetricLabel: 'FY24 Revenue',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=RKLB&type=10-K',
  },
  {
    id: 'sec-2',
    company: 'Rocket Lab USA, Inc.',
    ticker: 'RKLB',
    filingType: '8-K',
    dateFiled: '2025-01-15',
    summary: 'Current report announcing $515M contract from classified US government customer for satellite constellation development and launch services using Neutron vehicle. Largest single contract in company history.',
    keyMetric: '$515M',
    keyMetricLabel: 'Contract Value',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=RKLB&type=8-K',
  },
  {
    id: 'sec-3',
    company: 'Intuitive Machines, Inc.',
    ticker: 'LUNR',
    filingType: '10-K',
    dateFiled: '2025-03-15',
    period: 'FY 2024',
    summary: 'Annual report covering historic IM-1 Odysseus lunar landing (Feb 2024) and IM-2 mission preparations. Revenue of $228M driven by NASA CLPS task orders and lunar data services. Backlog exceeds $316M.',
    keyMetric: '$228M',
    keyMetricLabel: 'FY24 Revenue',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=LUNR&type=10-K',
  },
  {
    id: 'sec-4',
    company: 'Intuitive Machines, Inc.',
    ticker: 'LUNR',
    filingType: '8-K',
    dateFiled: '2024-12-10',
    summary: 'Current report announcing IM-2 mission delay to Q1 2025 due to additional testing requirements for Micro-Nova hopper payload. NASA CLPS CP-12 task order awarded for IM-3 south pole mission.',
    keyMetric: 'IM-2',
    keyMetricLabel: 'Mission Update',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=LUNR&type=8-K',
  },
  {
    id: 'sec-5',
    company: 'AST SpaceMobile, Inc.',
    ticker: 'ASTS',
    filingType: '10-K',
    dateFiled: '2025-03-01',
    period: 'FY 2024',
    summary: 'Annual report highlighting successful launch of 5 BlueBird Block 1 satellites in September 2024. Pre-revenue stage with $1.5B in MNO partnership agreements covering 2.8B mobile subscribers. Commercial service launch targeted mid-2025.',
    keyMetric: '$1.5B',
    keyMetricLabel: 'MNO Agreements',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=ASTS&type=10-K',
  },
  {
    id: 'sec-6',
    company: 'AST SpaceMobile, Inc.',
    ticker: 'ASTS',
    filingType: '8-K',
    dateFiled: '2024-09-12',
    summary: 'Current report confirming successful deployment and unfurling of five BlueBird satellites. Each satellite features 64 square meter phased array antenna. Initial signal testing with AT&T and Vodafone commenced.',
    keyMetric: '5 Sats',
    keyMetricLabel: 'Deployed',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=ASTS&type=8-K',
  },
  {
    id: 'sec-7',
    company: 'Spire Global, Inc.',
    ticker: 'SPIR',
    filingType: '10-K',
    dateFiled: '2025-03-10',
    period: 'FY 2024',
    summary: 'Annual report for space-based data analytics company. Revenue of $110M with ARR (annual recurring revenue) of $103M. 100+ satellite constellation providing weather, maritime, and aviation data. Achieved positive adjusted EBITDA in Q4 2024.',
    keyMetric: '$110M',
    keyMetricLabel: 'FY24 Revenue',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=SPIR&type=10-K',
  },
  {
    id: 'sec-8',
    company: 'Planet Labs PBC',
    ticker: 'PL',
    filingType: '10-K',
    dateFiled: '2025-03-28',
    period: 'FY 2025 (Jan 31)',
    summary: 'Annual report for Earth observation company. Revenue of $244M operating 200+ imaging satellites. Government segment growing with NRO Electro-Optical CLINs contract. Pelican next-gen satellite constellation deployment begun.',
    keyMetric: '$244M',
    keyMetricLabel: 'FY25 Revenue',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=PL&type=10-K',
  },
  {
    id: 'sec-9',
    company: 'Virgin Galactic Holdings, Inc.',
    ticker: 'SPCE',
    filingType: '10-K',
    dateFiled: '2025-02-28',
    period: 'FY 2024',
    summary: 'Annual report covering pause in commercial flights while Delta-class spaceship fleet is developed. Revenue of $8.4M from limited research flights. Cash reserves of $862M. Delta ships expected to begin flights in 2026.',
    keyMetric: '$862M',
    keyMetricLabel: 'Cash Reserves',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=SPCE&type=10-K',
  },
  {
    id: 'sec-10',
    company: 'Terran Orbital Corporation',
    ticker: 'LLAP',
    filingType: '8-K',
    dateFiled: '2024-08-12',
    summary: 'Current report announcing completion of acquisition by Lockheed Martin for $450M. Terran Orbital delisted from NYSE. Satellite manufacturing capabilities integrated into Lockheed Martin Space division.',
    keyMetric: '$450M',
    keyMetricLabel: 'Acquisition',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=LLAP&type=8-K',
  },
  {
    id: 'sec-11',
    company: 'Iridium Communications Inc.',
    ticker: 'IRDM',
    filingType: '10-K',
    dateFiled: '2025-02-20',
    period: 'FY 2024',
    summary: 'Annual report for global satellite communications company. Revenue of $813M with strong IoT growth (+22% YoY). 66-satellite Iridium NEXT constellation fully operational. Evaluating Iridium NEXT successor architecture for 2030s deployment.',
    keyMetric: '$813M',
    keyMetricLabel: 'FY24 Revenue',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=IRDM&type=10-K',
  },
  {
    id: 'sec-12',
    company: 'Viasat, Inc.',
    ticker: 'VSAT',
    filingType: '10-K',
    dateFiled: '2024-08-15',
    period: 'FY 2024 (Mar 31)',
    summary: 'Annual report post-Inmarsat acquisition. Combined revenue of $4.4B. ViaSat-3 Americas satellite operational with 1 Tbps capacity. Integration of Inmarsat fleet and L-band services expanding government and aviation connectivity markets.',
    keyMetric: '$4.4B',
    keyMetricLabel: 'FY24 Revenue',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=VSAT&type=10-K',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// Federal Register Data
// ════════════════════════════════════════════════════════════════════════════

const FEDERAL_REGISTER_ENTRIES: FederalRegisterEntry[] = [
  {
    id: 'fr-1',
    agency: 'FCC',
    title: 'Space Innovation: NGSO Deployment Milestone Rules',
    documentType: 'Final Rule',
    federalRegisterNumber: '2024-12456',
    publishedDate: '2024-09-29',
    effectiveDate: '2024-11-15',
    impact: 'high',
    summary: 'Final rule establishing revised deployment milestones for NGSO satellite constellations. Requires licensees to deploy 50% of authorized satellites within 6 years and 100% within 9 years of authorization or face license reduction or revocation.',
    docket: 'IB Docket No. 22-271',
  },
  {
    id: 'fr-2',
    agency: 'FCC',
    title: 'Mitigation of Orbital Debris in the New Space Age',
    documentType: 'Final Rule',
    federalRegisterNumber: '2024-08832',
    publishedDate: '2024-03-15',
    effectiveDate: '2024-09-29',
    impact: 'high',
    summary: 'Final rule implementing 5-year post-mission disposal rule for LEO satellites, replacing previous 25-year guideline. Requires operators to demonstrate ability to deorbit within 5 years or provide surety bond. Applies to all new applications.',
    docket: 'IB Docket No. 18-313',
  },
  {
    id: 'fr-3',
    agency: 'FCC',
    title: 'Single Network Future: Supplemental Coverage from Space',
    documentType: 'Proposed Rule',
    federalRegisterNumber: '2024-15678',
    publishedDate: '2024-11-20',
    commentDeadline: '2025-02-20',
    impact: 'high',
    summary: 'NPRM proposing framework for direct-to-device satellite services using terrestrial mobile spectrum. Would allow satellite operators to use MNO spectrum with MNO consent. Addresses interference management, international coordination, and emergency services.',
    docket: 'GN Docket No. 23-65',
  },
  {
    id: 'fr-4',
    agency: 'FAA',
    title: 'Streamlining Launch and Reentry Licensing Requirements',
    documentType: 'Final Rule',
    federalRegisterNumber: '2024-09901',
    publishedDate: '2024-05-18',
    effectiveDate: '2025-03-21',
    impact: 'high',
    summary: 'Part 450 final rule completing modernization of commercial space launch and reentry regulations. Replaces prescriptive approach with performance-based standards. Enables operator licenses instead of per-mission licenses. Reduces licensing timeline from 180 to 120 days.',
    docket: 'FAA-2019-0229',
  },
  {
    id: 'fr-5',
    agency: 'FAA',
    title: 'Commercial Space Launch Safety: Updated Populated Area Restrictions',
    documentType: 'Proposed Rule',
    federalRegisterNumber: '2024-22109',
    publishedDate: '2024-12-01',
    commentDeadline: '2025-03-01',
    impact: 'medium',
    summary: 'Proposed amendments to individual risk criteria and expected casualty calculations for launch and reentry operations near populated areas. Responds to increased launch cadence from sites near communities.',
    docket: 'FAA-2024-1456',
  },
  {
    id: 'fr-6',
    agency: 'NOAA',
    title: 'Licensing of Private Remote Sensing Space Systems',
    documentType: 'Final Rule',
    federalRegisterNumber: '2024-07234',
    publishedDate: '2024-04-10',
    effectiveDate: '2024-07-01',
    impact: 'medium',
    summary: 'Revised Part 960 regulations simplifying NOAA remote sensing licensing. Creates tiered licensing approach based on data capabilities. Reduces processing times and eliminates unnecessary conditions for Tier 1 (publicly available quality) systems.',
    docket: 'NOAA-2023-0105',
  },
  {
    id: 'fr-7',
    agency: 'BIS',
    title: 'Space-Related Export Controls: Commerce Control List Updates',
    documentType: 'Final Rule',
    federalRegisterNumber: '2024-18876',
    publishedDate: '2024-10-05',
    effectiveDate: '2024-12-01',
    impact: 'medium',
    summary: 'Updates to ECCN 9x515 series and related space items on the Commerce Control List. Clarifies EAR jurisdiction over commercial satellite components and adds new license exception provisions for allied nation satellite programs.',
    docket: 'BIS-2024-0012',
  },
  {
    id: 'fr-8',
    agency: 'FCC',
    title: '12 GHz Band: Protecting NGSO Satellite Operations',
    documentType: 'Notice',
    federalRegisterNumber: '2024-20543',
    publishedDate: '2024-11-01',
    commentDeadline: '2025-01-15',
    impact: 'high',
    summary: 'Public notice seeking further comment on 12 GHz band sharing between NGSO satellite downlinks and proposed terrestrial 5G services. FCC requests updated interference analyses given Starlink constellation growth since original NPRM.',
    docket: 'WT Docket No. 20-443',
  },
  {
    id: 'fr-9',
    agency: 'DoC',
    title: 'National Spectrum Strategy Implementation Plan',
    documentType: 'Notice',
    federalRegisterNumber: '2024-14321',
    publishedDate: '2024-08-20',
    commentDeadline: '2024-11-20',
    impact: 'high',
    summary: 'Department of Commerce implementation plan for the National Spectrum Strategy. Identifies 2,786 MHz of spectrum for study including bands used for satellite operations. Establishes interagency coordination framework between DoD, FCC, NTIA, and NASA.',
    docket: 'DOC-2024-0015',
  },
  {
    id: 'fr-10',
    agency: 'FCC',
    title: 'Space Bureau: Satellite Licensing Process Improvements',
    documentType: 'Notice',
    federalRegisterNumber: '2024-25678',
    publishedDate: '2024-12-15',
    commentDeadline: '2025-03-15',
    impact: 'medium',
    summary: 'FCC Space Bureau request for comment on streamlining satellite licensing. Proposes consolidated application forms, expedited review for small satellite systems, and digital filing improvements for Part 25 applications.',
    docket: 'IB Docket No. 24-89',
  },
  {
    id: 'fr-11',
    agency: 'FAA',
    title: 'Commercial Human Spaceflight: Extension of Learning Period Moratorium',
    documentType: 'Notice',
    federalRegisterNumber: '2024-11234',
    publishedDate: '2024-06-15',
    impact: 'medium',
    summary: 'Notice extending the commercial human spaceflight "learning period" moratorium on FAA safety regulations for spaceflight participants through January 2026. Congress continues to evaluate appropriate regulatory framework.',
    docket: 'FAA-2024-0891',
  },
  {
    id: 'fr-12',
    agency: 'OSTP',
    title: 'United States Space Priorities Framework Update',
    documentType: 'Presidential Document',
    federalRegisterNumber: '2024-16789',
    publishedDate: '2024-09-10',
    impact: 'high',
    summary: 'Updated Space Priorities Framework directing agencies to streamline commercial space regulations, enhance space situational awareness sharing, and establish spectrum protection for critical space services. Mandates interagency review completion within 180 days.',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// Tab Definitions
// ════════════════════════════════════════════════════════════════════════════

type TabId = 'fcc' | 'faa' | 'itu' | 'sec' | 'federal-register';

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: 'fcc', label: 'FCC Filings', count: FCC_FILINGS.length },
  { id: 'faa', label: 'FAA Licenses', count: FAA_LICENSES.length },
  { id: 'itu', label: 'ITU Filings', count: ITU_FILINGS.length },
  { id: 'sec', label: 'SEC & Financial', count: SEC_FILINGS.length },
  { id: 'federal-register', label: 'Federal Register', count: FEDERAL_REGISTER_ENTRIES.length },
];

// ════════════════════════════════════════════════════════════════════════════
// Tab Components
// ════════════════════════════════════════════════════════════════════════════

function FCCFilingsTab() {
  const [search, setSearch] = useState('');
  const [orbitFilter, setOrbitFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = FCC_FILINGS.filter((f) => {
    if (orbitFilter && f.orbitType !== orbitFilter) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        f.applicant.toLowerCase().includes(s) ||
        f.fileNumber.toLowerCase().includes(s) ||
        f.summary.toLowerCase().includes(s) ||
        f.band.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const uniqueStatuses = Array.from(new Set(FCC_FILINGS.map((f) => f.status)));
  const uniqueOrbits = Array.from(new Set(FCC_FILINGS.map((f) => f.orbitType)));
  const totalSats = FCC_FILINGS.reduce((sum, f) => sum + (f.satelliteCount || 0), 0);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-white">{FCC_FILINGS.length}</div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Total Filings</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-green-400">
            {FCC_FILINGS.filter((f) => f.status === 'granted').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Granted</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-yellow-400">
            {FCC_FILINGS.filter((f) => f.status === 'pending').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Pending</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-cyan-400">
            {totalSats.toLocaleString()}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Satellites Filed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search applicant, file number, band..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50"
          />
          <select
            value={orbitFilter}
            onChange={(e) => setOrbitFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Orbits</option>
            {uniqueOrbits.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
            ))}
          </select>
          <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
        </div>
      </div>

      {/* Filing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((filing) => {
          const statusStyle = STATUS_STYLES[filing.status];
          const orbitStyle = ORBIT_STYLES[filing.orbitType];
          return (
            <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-base">{filing.applicant}</h4>
                  <span className="text-star-300 text-xs font-mono">{filing.fileNumber}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${orbitStyle.bg} ${orbitStyle.text}`}>
                    {filing.orbitType}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-3 text-sm">
                <div>
                  <span className="text-star-300 text-xs block">Type</span>
                  <span className="text-white text-sm">{filing.filingType}</span>
                </div>
                <div>
                  <span className="text-star-300 text-xs block">Band</span>
                  <span className="text-nebula-300 text-sm font-mono">{filing.band}</span>
                </div>
                {filing.satelliteCount && (
                  <div>
                    <span className="text-star-300 text-xs block">Satellites</span>
                    <span className="text-white text-sm font-bold">{filing.satelliteCount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>

              <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10">
                <span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span>
                {filing.dateActedOn && (
                  <>
                    <span className="text-white/20">|</span>
                    <span>Acted: <span className="text-white font-medium">{filing.dateActedOn}</span></span>
                  </>
                )}
                {filing.docket && (
                  <>
                    <span className="text-white/20">|</span>
                    <span className="text-nebula-300 font-mono">{filing.docket}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 text-star-300/50">~</div>
          <h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3>
          <p className="text-star-300 mb-4">Try adjusting your filters or search terms.</p>
          <button onClick={() => { setSearch(''); setOrbitFilter(''); setStatusFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

function FAALicensesTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = FAA_LICENSES.filter((l) => {
    if (typeFilter && l.licenseType !== typeFilter) return false;
    if (statusFilter && l.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        l.licensee.toLowerCase().includes(s) ||
        l.vehicle.toLowerCase().includes(s) ||
        l.launchSite.toLowerCase().includes(s) ||
        l.licenseNumber.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const uniqueTypes = Array.from(new Set(FAA_LICENSES.map((l) => l.licenseType)));
  const uniqueStatuses = Array.from(new Set(FAA_LICENSES.map((l) => l.status)));
  const totalMissions = FAA_LICENSES.reduce((sum, l) => sum + l.missionsAuthorized, 0);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-white">{FAA_LICENSES.length}</div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Total Licenses</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-green-400">
            {FAA_LICENSES.filter((l) => l.status === 'active').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Active</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-yellow-400">
            {FAA_LICENSES.filter((l) => l.status === 'pending').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Pending</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-cyan-400">{totalMissions}</div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Missions Auth.</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search licensee, vehicle, launch site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
            ))}
          </select>
          <span className="text-xs text-star-300 ml-auto">{filtered.length} licenses</span>
        </div>
      </div>

      {/* License Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((license) => {
          const statusStyle = STATUS_STYLES[license.status];
          return (
            <div key={license.id} className="card p-5 hover:border-nebula-500/50 transition-all">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-base">{license.licensee}</h4>
                  <span className="text-star-300 text-xs font-mono">{license.licenseNumber}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                    {license.licenseType}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <span className="text-star-300 text-xs block">Vehicle</span>
                  <span className="text-white text-sm font-medium">{license.vehicle}</span>
                </div>
                <div>
                  <span className="text-star-300 text-xs block">Launch Site</span>
                  <span className="text-nebula-300 text-sm">{license.launchSite}</span>
                </div>
                {license.missionsAuthorized > 0 && (
                  <div>
                    <span className="text-star-300 text-xs block">Missions</span>
                    <span className="text-white text-sm font-bold">{license.missionsAuthorized}</span>
                  </div>
                )}
              </div>

              <p className="text-star-300 text-sm leading-relaxed mb-3">{license.summary}</p>

              <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10">
                <span>Issued: <span className="text-white font-medium">{license.dateIssued}</span></span>
                <span className="text-white/20">|</span>
                <span>Expires: <span className="text-white font-medium">{license.expirationDate}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 text-star-300/50">~</div>
          <h3 className="text-xl font-semibold text-white mb-2">No licenses match your search</h3>
          <p className="text-star-300 mb-4">Try adjusting your filters or search terms.</p>
          <button onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

function ITUFilingsTab() {
  const [search, setSearch] = useState('');
  const [orbitFilter, setOrbitFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = ITU_FILINGS.filter((f) => {
    if (orbitFilter && f.orbitType !== orbitFilter) return false;
    if (typeFilter && f.filingType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        f.networkName.toLowerCase().includes(s) ||
        f.administration.toLowerCase().includes(s) ||
        f.summary.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const uniqueTypes = Array.from(new Set(ITU_FILINGS.map((f) => f.filingType)));
  const uniqueOrbits = Array.from(new Set(ITU_FILINGS.map((f) => f.orbitType)));
  const totalSats = ITU_FILINGS.reduce((sum, f) => sum + (f.satellites || 0), 0);

  return (
    <div>
      {/* Info Banner */}
      <div className="card p-5 mb-6 border border-purple-500/20">
        <h3 className="text-white font-semibold mb-2">ITU Radio Regulations Filings</h3>
        <p className="text-star-300 text-sm leading-relaxed">
          Satellite network filings under the ITU Radio Regulations. Includes Article 9 coordination requests,
          Appendix 30/30A/30B plan filings, Article 11 notifications, and due diligence submissions. The ITU
          Radiocommunication Bureau (BR) manages the international spectrum filing and coordination process.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-white">{ITU_FILINGS.length}</div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Network Filings</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-purple-400">
            {Array.from(new Set(ITU_FILINGS.map((f) => f.administration))).length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Administrations</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-cyan-400">
            {totalSats.toLocaleString()}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Total Satellites</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-green-400">
            {ITU_FILINGS.filter((f) => f.status === 'active').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Active Filings</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search network name, administration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50"
          />
          <select
            value={orbitFilter}
            onChange={(e) => setOrbitFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Orbits</option>
            {uniqueOrbits.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Filing Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
        </div>
      </div>

      {/* Filing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((filing) => {
          const statusStyle = STATUS_STYLES[filing.status];
          const orbitStyle = ORBIT_STYLES[filing.orbitType];
          return (
            <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-base font-mono">{filing.networkName}</h4>
                  <span className="text-star-300 text-sm">{filing.administration}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${orbitStyle.bg} ${orbitStyle.text}`}>
                    {filing.orbitType}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-3 text-sm">
                <div>
                  <span className="text-star-300 text-xs block">Filing Type</span>
                  <span className="text-white text-sm">{filing.filingType}</span>
                </div>
                <div>
                  <span className="text-star-300 text-xs block">Service Band</span>
                  <span className="text-nebula-300 text-sm font-mono">{filing.serviceBand}</span>
                </div>
                {filing.satellites && (
                  <div>
                    <span className="text-star-300 text-xs block">Satellites</span>
                    <span className="text-white text-sm font-bold">{filing.satellites.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>

              <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10">
                <span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 text-star-300/50">~</div>
          <h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3>
          <p className="text-star-300 mb-4">Try adjusting your filters or search terms.</p>
          <button onClick={() => { setSearch(''); setOrbitFilter(''); setTypeFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

function SECFilingsTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const filtered = SEC_FILINGS.filter((f) => {
    if (typeFilter && f.filingType !== typeFilter) return false;
    if (companyFilter && f.ticker !== companyFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        f.company.toLowerCase().includes(s) ||
        f.ticker.toLowerCase().includes(s) ||
        f.summary.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const uniqueTypes = Array.from(new Set(SEC_FILINGS.map((f) => f.filingType)));
  const uniqueTickers = Array.from(new Set(SEC_FILINGS.map((f) => f.ticker)));

  const filingTypeColors: Record<string, { bg: string; text: string }> = {
    '10-K': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    '10-Q': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    '8-K': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    'S-1': { bg: 'bg-green-500/20', text: 'text-green-400' },
    'DEF 14A': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    '13F': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    'SC 13D': { bg: 'bg-red-500/20', text: 'text-red-400' },
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-white">{SEC_FILINGS.length}</div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Total Filings</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-blue-400">
            {SEC_FILINGS.filter((f) => f.filingType === '10-K').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Annual Reports</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-orange-400">
            {SEC_FILINGS.filter((f) => f.filingType === '8-K').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Current Reports</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-purple-400">
            {uniqueTickers.length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Companies</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search company, ticker, content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50"
          />
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Companies</option>
            {uniqueTickers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Filing Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
        </div>
      </div>

      {/* Filing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((filing) => {
          const typeColor = filingTypeColors[filing.filingType] || { bg: 'bg-slate-500/20', text: 'text-slate-400' };
          return (
            <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-base">{filing.company}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-nebula-300 text-sm font-bold font-mono">${filing.ticker}</span>
                    {filing.period && (
                      <span className="text-star-300 text-xs">({filing.period})</span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded ${typeColor.bg} ${typeColor.text}`}>
                  {filing.filingType}
                </span>
              </div>

              {filing.keyMetric && (
                <div className="flex items-center gap-4 mb-3">
                  <div className="card-elevated px-4 py-2 rounded-lg">
                    <span className="text-star-300 text-xs block">{filing.keyMetricLabel}</span>
                    <span className="text-white text-lg font-bold font-display">{filing.keyMetric}</span>
                  </div>
                </div>
              )}

              <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>

              <div className="flex items-center justify-between text-xs text-star-300 pt-3 border-t border-white/10">
                <span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span>
                <a
                  href={filing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nebula-300 hover:text-white transition-colors"
                >
                  View on EDGAR
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 text-star-300/50">~</div>
          <h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3>
          <p className="text-star-300 mb-4">Try adjusting your filters or search terms.</p>
          <button onClick={() => { setSearch(''); setTypeFilter(''); setCompanyFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

function FederalRegisterTab() {
  const [search, setSearch] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [impactFilter, setImpactFilter] = useState('');

  const filtered = FEDERAL_REGISTER_ENTRIES.filter((e) => {
    if (agencyFilter && e.agency !== agencyFilter) return false;
    if (typeFilter && e.documentType !== typeFilter) return false;
    if (impactFilter && e.impact !== impactFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        e.title.toLowerCase().includes(s) ||
        e.agency.toLowerCase().includes(s) ||
        e.summary.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const uniqueAgencies = Array.from(new Set(FEDERAL_REGISTER_ENTRIES.map((e) => e.agency)));
  const uniqueTypes = Array.from(new Set(FEDERAL_REGISTER_ENTRIES.map((e) => e.documentType)));

  const docTypeColors: Record<string, { bg: string; text: string }> = {
    'Proposed Rule': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    'Final Rule': { bg: 'bg-green-500/20', text: 'text-green-400' },
    'Notice': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    'Presidential Document': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    'Request for Comment': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  };

  const openForComment = FEDERAL_REGISTER_ENTRIES.filter((e) => {
    if (!e.commentDeadline) return false;
    return new Date(e.commentDeadline) > new Date();
  });

  return (
    <div>
      {/* Comment Deadlines Alert */}
      {openForComment.length > 0 && (
        <div className="card p-5 mb-6 border border-yellow-500/30 bg-yellow-500/5">
          <h3 className="text-yellow-400 font-semibold mb-3">Open Comment Periods</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {openForComment.map((entry) => (
              <div key={entry.id} className="card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-nebula-300">{entry.agency}</span>
                  <span className="text-xs text-yellow-400">Due: {entry.commentDeadline}</span>
                </div>
                <p className="text-sm text-white line-clamp-2">{entry.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-white">{FEDERAL_REGISTER_ENTRIES.length}</div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Total Entries</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-green-400">
            {FEDERAL_REGISTER_ENTRIES.filter((e) => e.documentType === 'Final Rule').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Final Rules</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-yellow-400">
            {FEDERAL_REGISTER_ENTRIES.filter((e) => e.documentType === 'Proposed Rule').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">Proposed Rules</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-red-400">
            {FEDERAL_REGISTER_ENTRIES.filter((e) => e.impact === 'high').length}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest">High Impact</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search title, agency, content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50"
          />
          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Agencies</option>
            {uniqueAgencies.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={impactFilter}
            onChange={(e) => setImpactFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Impact Levels</option>
            <option value="high">High Impact</option>
            <option value="medium">Medium Impact</option>
            <option value="low">Low Impact</option>
          </select>
          <span className="text-xs text-star-300 ml-auto">{filtered.length} entries</span>
        </div>
      </div>

      {/* Entry Cards */}
      <div className="space-y-4">
        {filtered.map((entry) => {
          const typeColor = docTypeColors[entry.documentType] || { bg: 'bg-slate-500/20', text: 'text-slate-400' };
          const impactStyle = IMPACT_STYLES[entry.impact];
          return (
            <div key={entry.id} className="card p-5 hover:border-nebula-500/50 transition-all">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-nebula-300 shrink-0">
                    {entry.agency}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base">{entry.title}</h4>
                    <span className="text-star-300 text-xs font-mono">FR {entry.federalRegisterNumber}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${typeColor.bg} ${typeColor.text}`}>
                    {entry.documentType}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${impactStyle.bg} ${impactStyle.text}`}>
                    {entry.impact.charAt(0).toUpperCase() + entry.impact.slice(1)} Impact
                  </span>
                </div>
              </div>

              <p className="text-star-300 text-sm leading-relaxed mb-3">{entry.summary}</p>

              <div className="flex items-center flex-wrap gap-4 text-xs text-star-300 pt-3 border-t border-white/10">
                <span>Published: <span className="text-white font-medium">{entry.publishedDate}</span></span>
                {entry.effectiveDate && (
                  <>
                    <span className="text-white/20">|</span>
                    <span>Effective: <span className="text-white font-medium">{entry.effectiveDate}</span></span>
                  </>
                )}
                {entry.commentDeadline && (
                  <>
                    <span className="text-white/20">|</span>
                    <span className={new Date(entry.commentDeadline) > new Date() ? 'text-yellow-400 font-semibold' : 'text-star-300'}>
                      Comments Due: {entry.commentDeadline}
                    </span>
                  </>
                )}
                {entry.docket && (
                  <>
                    <span className="text-white/20">|</span>
                    <span className="text-nebula-300 font-mono">{entry.docket}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 text-star-300/50">~</div>
          <h3 className="text-xl font-semibold text-white mb-2">No entries match your search</h3>
          <p className="text-star-300 mb-4">Try adjusting your filters or search terms.</p>
          <button onClick={() => { setSearch(''); setAgencyFilter(''); setTypeFilter(''); setImpactFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main Page
// ════════════════════════════════════════════════════════════════════════════

export default function RegulatoryFilingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('fcc');

  const totalFilings = FCC_FILINGS.length + FAA_LICENSES.length + ITU_FILINGS.length + SEC_FILINGS.length + FEDERAL_REGISTER_ENTRIES.length;
  const pendingItems = FCC_FILINGS.filter((f) => f.status === 'pending').length +
    FAA_LICENSES.filter((l) => l.status === 'pending').length +
    ITU_FILINGS.filter((f) => f.status === 'pending').length;
  const uniqueAgencies = Array.from(new Set([
    ...FEDERAL_REGISTER_ENTRIES.map((e) => e.agency),
    'FCC', 'FAA', 'SEC', 'ITU',
  ])).length;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Regulatory Filing Tracker"
          subtitle="Track FCC satellite applications, FAA launch licenses, ITU spectrum filings, SEC financial disclosures, and Federal Register rulemakings across the space industry"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Compliance', href: '/compliance' },
            { label: 'Regulatory Filing Tracker' },
          ]}
        >
          <Link href="/compliance" className="btn-secondary text-sm py-2 px-4">
            Compliance Hub
          </Link>
        </PageHeader>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-white">{totalFilings}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">Total Filings</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">{pendingItems}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">Pending Review</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-cyan-400">{uniqueAgencies}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">Agencies Tracked</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-green-400">5</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">Filing Categories</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-white/5 text-star-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-star-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'fcc' && <FCCFilingsTab />}
        {activeTab === 'faa' && <FAALicensesTab />}
        {activeTab === 'itu' && <ITUFilingsTab />}
        {activeTab === 'sec' && <SECFilingsTab />}
        {activeTab === 'federal-register' && <FederalRegisterTab />}

        {/* Cross-module Links */}
        <div className="card p-5 mt-8 mb-8 border border-nebula-500/20">
          <h3 className="text-white font-semibold mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/compliance"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Regulatory & Legal Hub
            </Link>
            <Link
              href="/spectrum-auctions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Spectrum Auctions
            </Link>
            <Link
              href="/spectrum"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Spectrum Tracker
            </Link>
            <Link
              href="/market-intel"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Market Intelligence
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="card p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex flex-wrap gap-4">
              {Object.entries(STATUS_STYLES).slice(0, 6).map(([key, style]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${style.bg.replace('/20', '')}`} />
                  <span className="text-star-300">{style.label}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-star-300">
              {totalFilings} filings across {uniqueAgencies} agencies
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
