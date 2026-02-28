'use client';

import React, { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StandardsOrg {
  id: string;
  name: string;
  fullName: string;
  description: string;
  color: string;
  website: string;
}

type StandardCategory =
  | 'Communications'
  | 'Materials'
  | 'Testing'
  | 'Safety'
  | 'Quality'
  | 'Environmental'
  | 'Software'
  | 'Systems Engineering'
  | 'Export Control'
  | 'Frequency Management'
  | 'EMC'
  | 'Hardware'
  | 'Contamination'
  | 'Mass Properties'
  | 'Debris Mitigation';

type StandardStatus = 'Active' | 'Superseded' | 'Draft';

interface Standard {
  id: string;
  title: string;
  organization: string;
  category: StandardCategory;
  description: string;
  status: StandardStatus;
  lastUpdated?: string;
  supersededBy?: string;
}

type MissionType = 'LEO Commercial' | 'GEO Comsat' | 'Lunar' | 'Interplanetary';

// ---------------------------------------------------------------------------
// Data: Standards Organizations
// ---------------------------------------------------------------------------

const ORGANIZATIONS: StandardsOrg[] = [
  {
    id: 'ccsds',
    name: 'CCSDS',
    fullName: 'Consultative Committee for Space Data Systems',
    description: 'Data handling, communications protocols, and data link standards for space missions.',
    color: 'cyan',
    website: 'https://public.ccsds.org',
  },
  {
    id: 'ecss',
    name: 'ECSS',
    fullName: 'European Cooperation for Space Standardization',
    description: 'European standards for space systems engineering, quality, materials, and processes.',
    color: 'blue',
    website: 'https://ecss.nl',
  },
  {
    id: 'nasa',
    name: 'NASA Standards',
    fullName: 'NASA Technical Standards Program',
    description: 'NASA-STD series covering materials, processes, testing, debris mitigation, and safety.',
    color: 'red',
    website: 'https://standards.nasa.gov',
  },
  {
    id: 'mil-std',
    name: 'MIL-STD',
    fullName: 'U.S. Military Standards',
    description: 'Military standards applicable to space systems including MIL-STD-1553 and MIL-STD-461.',
    color: 'green',
    website: 'https://quicksearch.dla.mil',
  },
  {
    id: 'iso',
    name: 'ISO/TC 20/SC 14',
    fullName: 'ISO Technical Committee 20, Subcommittee 14',
    description: 'International standards for space systems and operations, debris mitigation, and safety.',
    color: 'purple',
    website: 'https://www.iso.org/committee/46614.html',
  },
  {
    id: 'aiaa',
    name: 'AIAA',
    fullName: 'American Institute of Aeronautics and Astronautics',
    description: 'Aerospace design, testing, mass properties, and qualification standards.',
    color: 'amber',
    website: 'https://www.aiaa.org/standards',
  },
  {
    id: 'itar-ear',
    name: 'ITAR/EAR',
    fullName: 'International Traffic in Arms Regulations / Export Administration Regulations',
    description: 'U.S. export control regulations governing defense articles and dual-use technologies.',
    color: 'rose',
    website: 'https://www.pmddtc.state.gov',
  },
  {
    id: 'itu-r',
    name: 'ITU-R',
    fullName: 'International Telecommunication Union - Radiocommunication Sector',
    description: 'Radio frequency allocation, satellite coordination, and orbital slot regulations.',
    color: 'teal',
    website: 'https://www.itu.int/en/ITU-R',
  },
];

// ---------------------------------------------------------------------------
// Data: Standards Database (30+ entries)
// ---------------------------------------------------------------------------

const STANDARDS_DATABASE: Standard[] = [
  // ECSS
  {
    id: 'ECSS-E-ST-10C',
    title: 'Space engineering - System engineering general requirements',
    organization: 'ecss',
    category: 'Systems Engineering',
    description: 'Defines system engineering processes and requirements for space projects including requirements management, design, verification, and validation.',
    status: 'Active',
    lastUpdated: '2024-03',
  },
  {
    id: 'ECSS-Q-ST-70C',
    title: 'Materials, mechanical parts and processes',
    organization: 'ecss',
    category: 'Materials',
    description: 'Requirements for selection, control, and qualification of materials, mechanical parts, and processes used in space hardware.',
    status: 'Active',
    lastUpdated: '2023-11',
  },
  {
    id: 'ECSS-E-ST-50-05C',
    title: 'Radio frequency and modulation',
    organization: 'ecss',
    category: 'Communications',
    description: 'Defines RF and modulation standards for space-to-ground and space-to-space communication links.',
    status: 'Active',
    lastUpdated: '2023-06',
  },
  {
    id: 'ECSS-Q-ST-20C',
    title: 'Quality assurance',
    organization: 'ecss',
    category: 'Quality',
    description: 'Quality assurance requirements for space projects including supplier management, non-conformance handling, and auditing.',
    status: 'Active',
    lastUpdated: '2024-01',
  },
  // NASA
  {
    id: 'NASA-STD-5009A',
    title: 'Nondestructive Evaluation Requirements for Fracture-Critical Metallic Components',
    organization: 'nasa',
    category: 'Testing',
    description: 'Establishes NDE requirements for fracture-critical metallic components to ensure structural integrity of flight hardware.',
    status: 'Active',
    lastUpdated: '2024-06',
  },
  {
    id: 'NASA-STD-8719.14B',
    title: 'Process for Limiting Orbital Debris',
    organization: 'nasa',
    category: 'Debris Mitigation',
    description: 'Requirements and processes for limiting orbital debris generation during and after mission operations, including passivation and disposal.',
    status: 'Active',
    lastUpdated: '2025-02',
  },
  {
    id: 'NASA-STD-5001B',
    title: 'Structural Design and Test Factors of Safety for Spaceflight Hardware',
    organization: 'nasa',
    category: 'Safety',
    description: 'Defines minimum factors of safety for structural design, analysis, and testing of spaceflight hardware.',
    status: 'Active',
    lastUpdated: '2023-09',
  },
  {
    id: 'NASA-STD-6016B',
    title: 'Standard Materials and Processes Requirements for Spacecraft',
    organization: 'nasa',
    category: 'Materials',
    description: 'Materials and processes requirements including outgassing, flammability, stress corrosion, and fracture control for spacecraft.',
    status: 'Active',
    lastUpdated: '2024-08',
  },
  {
    id: 'NASA-STD-8739.8B',
    title: 'Software Assurance and Software Safety Standard',
    organization: 'nasa',
    category: 'Software',
    description: 'Requirements for software assurance, software safety, and software quality throughout the software development lifecycle.',
    status: 'Active',
    lastUpdated: '2025-01',
  },
  {
    id: 'GSFC-STD-7000A',
    title: 'Clean Room and Contamination Control',
    organization: 'nasa',
    category: 'Contamination',
    description: 'Requirements for cleanroom operations, contamination control, and particulate/molecular cleanliness levels for spacecraft and instruments.',
    status: 'Active',
    lastUpdated: '2023-04',
  },
  // CCSDS
  {
    id: 'CCSDS 131.0-B-4',
    title: 'TM Synchronization and Channel Coding',
    organization: 'ccsds',
    category: 'Communications',
    description: 'Specifies telemetry synchronization and channel coding schemes including convolutional, Reed-Solomon, turbo, and LDPC codes for space data links.',
    status: 'Active',
    lastUpdated: '2024-11',
  },
  {
    id: 'CCSDS 232.0-B-4',
    title: 'TC Space Data Link Protocol',
    organization: 'ccsds',
    category: 'Communications',
    description: 'Defines the telecommand space data link protocol for reliable uplink of commands from ground to spacecraft.',
    status: 'Active',
    lastUpdated: '2024-05',
  },
  {
    id: 'CCSDS 133.0-B-2',
    title: 'Space Packet Protocol',
    organization: 'ccsds',
    category: 'Communications',
    description: 'Application-level protocol for packetizing data for transfer over CCSDS space data link protocols.',
    status: 'Active',
    lastUpdated: '2023-07',
  },
  {
    id: 'CCSDS 727.0-B-5',
    title: 'CCSDS File Delivery Protocol (CFDP)',
    organization: 'ccsds',
    category: 'Communications',
    description: 'Reliable and unreliable file delivery protocol designed for space links with long propagation delays and intermittent connectivity.',
    status: 'Active',
    lastUpdated: '2024-03',
  },
  {
    id: 'CCSDS 350.0-G-3',
    title: 'The Application of Security to CCSDS Protocols',
    organization: 'ccsds',
    category: 'Communications',
    description: 'Guide for applying security services (authentication, encryption, access control) to CCSDS protocols.',
    status: 'Active',
    lastUpdated: '2025-06',
  },
  // ISO
  {
    id: 'ISO 24113:2024',
    title: 'Space debris mitigation requirements',
    organization: 'iso',
    category: 'Debris Mitigation',
    description: 'International requirements for mitigating space debris including mission-related objects, passivation, and end-of-life disposal.',
    status: 'Active',
    lastUpdated: '2024-09',
  },
  {
    id: 'ISO 17770:2017',
    title: 'Spacecraft maximum permissible probability of catastrophic failure',
    organization: 'iso',
    category: 'Safety',
    description: 'Establishes methods for computing the maximum permissible probability of catastrophic hazardous events during crewed and uncrewed missions.',
    status: 'Active',
    lastUpdated: '2023-12',
  },
  {
    id: 'ISO 14620-1:2018',
    title: 'Space systems - Safety requirements - System safety',
    organization: 'iso',
    category: 'Safety',
    description: 'Safety requirements for space systems covering hazard analysis, risk assessment, and safety verification throughout the project lifecycle.',
    status: 'Active',
    lastUpdated: '2023-08',
  },
  {
    id: 'ISO 15863:2003',
    title: 'Space systems - Spacecraft-to-launch-vehicle interface control document',
    organization: 'iso',
    category: 'Systems Engineering',
    description: 'Defines the interface control document structure between spacecraft and launch vehicle including mechanical, electrical, and environmental interfaces.',
    status: 'Active',
    lastUpdated: '2022-05',
  },
  // MIL-STD
  {
    id: 'MIL-STD-1553B',
    title: 'Digital Time Division Command/Response Multiplex Data Bus',
    organization: 'mil-std',
    category: 'Communications',
    description: 'Defines the MIL-STD-1553 data bus widely used in military and space vehicles for deterministic command/response communications between subsystems.',
    status: 'Active',
    lastUpdated: '2024-02',
  },
  {
    id: 'MIL-STD-461G',
    title: 'Requirements for the Control of Electromagnetic Interference Characteristics',
    organization: 'mil-std',
    category: 'EMC',
    description: 'EMI/EMC emission and susceptibility requirements for electronic equipment ensuring electromagnetic compatibility in space and defense systems.',
    status: 'Active',
    lastUpdated: '2023-12',
  },
  {
    id: 'MIL-STD-810H',
    title: 'Environmental Engineering Considerations and Laboratory Tests',
    organization: 'mil-std',
    category: 'Environmental',
    description: 'Environmental test methods for equipment including vibration, shock, temperature, humidity, altitude, and other conditions encountered in space transport and operation.',
    status: 'Active',
    lastUpdated: '2024-04',
  },
  {
    id: 'MIL-STD-883K',
    title: 'Test Methods and Procedures for Microelectronics',
    organization: 'mil-std',
    category: 'Testing',
    description: 'Test methods for microelectronic devices covering electrical, mechanical, environmental, and reliability screening used for space-grade components.',
    status: 'Active',
    lastUpdated: '2023-10',
  },
  // DO/RTCA
  {
    id: 'DO-178C',
    title: 'Software Considerations in Airborne Systems and Equipment Certification',
    organization: 'aiaa',
    category: 'Software',
    description: 'Industry standard for safety-critical software development widely adopted for space flight software. Defines development assurance levels (DAL) A through E.',
    status: 'Active',
    lastUpdated: '2023-01',
  },
  // AIAA
  {
    id: 'AIAA S-111A-2005',
    title: 'Qualification and Quality Requirements for Space Solar Cells',
    organization: 'aiaa',
    category: 'Testing',
    description: 'Qualification testing requirements for space solar cells including performance characterization, environmental testing, and radiation testing.',
    status: 'Active',
    lastUpdated: '2023-03',
  },
  {
    id: 'ANSI/AIAA S-120A-2015',
    title: 'Mass Properties Control for Space Systems',
    organization: 'aiaa',
    category: 'Mass Properties',
    description: 'Requirements for mass properties management including mass, center of gravity, moments of inertia, and product of inertia control throughout spacecraft development.',
    status: 'Active',
    lastUpdated: '2024-07',
  },
  // IEEE / SpaceWire
  {
    id: 'ECSS-E-ST-50-12C',
    title: 'SpaceWire - Links, nodes, routers and networks',
    organization: 'ecss',
    category: 'Hardware',
    description: 'High-speed serial data link (based on IEEE 1355) for spacecraft onboard data handling, providing 200 Mbit/s links with low latency and simple protocol.',
    status: 'Active',
    lastUpdated: '2024-10',
  },
  // VPX
  {
    id: 'ANSI/VITA 46.0-2019',
    title: 'VPX Baseline Standard',
    organization: 'aiaa',
    category: 'Hardware',
    description: 'Open standard for rugged embedded computing modules (3U/6U) used in space and defense avionics. Defines mechanical, electrical, and connector specifications.',
    status: 'Active',
    lastUpdated: '2024-01',
  },
  // ITAR/EAR
  {
    id: 'ITAR (22 CFR 120-130)',
    title: 'International Traffic in Arms Regulations',
    organization: 'itar-ear',
    category: 'Export Control',
    description: 'U.S. State Department regulations controlling export and import of defense articles and services, including satellites and space launch vehicles on the USML.',
    status: 'Active',
    lastUpdated: '2025-04',
  },
  {
    id: 'EAR (15 CFR 730-774)',
    title: 'Export Administration Regulations',
    organization: 'itar-ear',
    category: 'Export Control',
    description: 'U.S. Commerce Department regulations controlling export of dual-use items including commercial spacecraft components and satellite technology.',
    status: 'Active',
    lastUpdated: '2025-06',
  },
  // ITU-R
  {
    id: 'ITU-R S.1003',
    title: 'Environmental protection of the geostationary-satellite orbit',
    organization: 'itu-r',
    category: 'Frequency Management',
    description: 'Recommendations for protecting the geostationary orbit as a limited natural resource, including end-of-life re-orbiting requirements.',
    status: 'Active',
    lastUpdated: '2024-12',
  },
  {
    id: 'ITU Radio Regulations',
    title: 'Radio Regulations - Articles and Appendices',
    organization: 'itu-r',
    category: 'Frequency Management',
    description: 'International treaty governing use of the radio-frequency spectrum and satellite orbits. Includes frequency allocation tables, coordination procedures, and notification requirements.',
    status: 'Active',
    lastUpdated: '2025-01',
  },
  // SMAD reference
  {
    id: 'SMAD (Reference)',
    title: 'Space Mission Analysis and Design',
    organization: 'aiaa',
    category: 'Systems Engineering',
    description: 'Foundational reference textbook (Wertz, Everett, Puschell) widely used in mission design. Covers orbit mechanics, payload sizing, power, thermal, structures, and cost estimation.',
    status: 'Active',
    lastUpdated: '2024-01',
  },
  // Additional to reach 30+
  {
    id: 'ECSS-E-ST-33-01C',
    title: 'Mechanisms',
    organization: 'ecss',
    category: 'Systems Engineering',
    description: 'Requirements for design, manufacture, assembly, testing, and operation of mechanisms used in space systems.',
    status: 'Active',
    lastUpdated: '2023-05',
  },
  {
    id: 'NASA-STD-5019A',
    title: 'Fracture Control Requirements for Spaceflight Hardware',
    organization: 'nasa',
    category: 'Safety',
    description: 'Fracture control program requirements ensuring structural integrity of pressurized and fracture-critical components through damage tolerance analysis and NDE.',
    status: 'Active',
    lastUpdated: '2024-11',
  },
  {
    id: 'MIL-HDBK-340A',
    title: 'Test Requirements for Launch, Upper-Stage, and Space Vehicles (Superseded)',
    organization: 'mil-std',
    category: 'Testing',
    description: 'Historical standard for environmental test requirements for launch and space vehicles. Superseded by SMC-S-016.',
    status: 'Superseded',
    supersededBy: 'SMC-S-016',
    lastUpdated: '2020-01',
  },
  {
    id: 'ISO 23339:2024',
    title: 'Space systems - GNSS-based precise orbit determination for LEO satellites',
    organization: 'iso',
    category: 'Systems Engineering',
    description: 'Standard methods for precise orbit determination of LEO satellites using GNSS observations, covering processing techniques and accuracy requirements.',
    status: 'Active',
    lastUpdated: '2025-08',
  },
];

// ---------------------------------------------------------------------------
// Data: Compliance Checklist per Mission Type
// ---------------------------------------------------------------------------

const COMPLIANCE_CHECKLISTS: Record<MissionType, string[]> = {
  'LEO Commercial': [
    'NASA-STD-8719.14B',
    'ISO 24113:2024',
    'ECSS-E-ST-10C',
    'ECSS-Q-ST-70C',
    'MIL-STD-461G',
    'MIL-STD-810H',
    'NASA-STD-5001B',
    'DO-178C',
    'ITAR (22 CFR 120-130)',
    'EAR (15 CFR 730-774)',
    'ITU Radio Regulations',
    'ANSI/AIAA S-120A-2015',
    'ECSS-E-ST-50-12C',
  ],
  'GEO Comsat': [
    'NASA-STD-8719.14B',
    'ISO 24113:2024',
    'ITU-R S.1003',
    'ITU Radio Regulations',
    'CCSDS 131.0-B-4',
    'CCSDS 232.0-B-4',
    'ECSS-E-ST-10C',
    'ECSS-E-ST-50-05C',
    'MIL-STD-461G',
    'MIL-STD-1553B',
    'ITAR (22 CFR 120-130)',
    'ANSI/AIAA S-120A-2015',
    'AIAA S-111A-2005',
    'GSFC-STD-7000A',
  ],
  'Lunar': [
    'NASA-STD-8719.14B',
    'NASA-STD-5001B',
    'NASA-STD-5019A',
    'NASA-STD-6016B',
    'GSFC-STD-7000A',
    'CCSDS 131.0-B-4',
    'CCSDS 232.0-B-4',
    'CCSDS 727.0-B-5',
    'ECSS-E-ST-10C',
    'ISO 14620-1:2018',
    'ISO 17770:2017',
    'MIL-STD-461G',
    'MIL-STD-810H',
    'DO-178C',
    'ITAR (22 CFR 120-130)',
  ],
  'Interplanetary': [
    'NASA-STD-8719.14B',
    'NASA-STD-5001B',
    'NASA-STD-5019A',
    'NASA-STD-6016B',
    'NASA-STD-5009A',
    'NASA-STD-8739.8B',
    'GSFC-STD-7000A',
    'CCSDS 131.0-B-4',
    'CCSDS 232.0-B-4',
    'CCSDS 727.0-B-5',
    'CCSDS 133.0-B-2',
    'CCSDS 350.0-G-3',
    'ECSS-E-ST-10C',
    'ECSS-Q-ST-20C',
    'ISO 14620-1:2018',
    'ISO 17770:2017',
    'MIL-STD-461G',
    'MIL-STD-810H',
    'DO-178C',
    'ITAR (22 CFR 120-130)',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORG_COLORS: Record<string, string> = {
  cyan: 'border-cyan-400/40 text-cyan-400',
  blue: 'border-blue-400/40 text-blue-400',
  red: 'border-red-400/40 text-red-400',
  green: 'border-green-400/40 text-green-400',
  purple: 'border-purple-400/40 text-purple-400',
  amber: 'border-amber-400/40 text-amber-400',
  rose: 'border-rose-400/40 text-rose-400',
  teal: 'border-teal-400/40 text-teal-400',
};

const ORG_BG: Record<string, string> = {
  cyan: 'bg-cyan-400/10',
  blue: 'bg-blue-400/10',
  red: 'bg-red-400/10',
  green: 'bg-green-400/10',
  purple: 'bg-purple-400/10',
  amber: 'bg-amber-400/10',
  rose: 'bg-rose-400/10',
  teal: 'bg-teal-400/10',
};

const STATUS_BADGE: Record<StandardStatus, string> = {
  Active: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  Superseded: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  Draft: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

function getOrgName(orgId: string): string {
  return ORGANIZATIONS.find((o) => o.id === orgId)?.name ?? orgId;
}

function getOrgColor(orgId: string): string {
  const org = ORGANIZATIONS.find((o) => o.id === orgId);
  return org?.color ?? 'cyan';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OrganizationCard({ org }: { org: StandardsOrg }) {
  return (
    <a
      href={org.website}
      target="_blank"
      rel="noopener noreferrer"
      className={`card p-5 flex flex-col gap-2 hover:scale-[1.02] transition-transform cursor-pointer group`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded border ${ORG_COLORS[org.color]} ${ORG_BG[org.color]}`}
        >
          {org.name}
        </span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
        {org.fullName}
      </p>
      <p className="text-sm text-slate-300 leading-relaxed">
        {org.description}
      </p>
      <span className="text-xs text-cyan-400/70 group-hover:text-cyan-400 transition-colors mt-auto">
        Visit website &rarr;
      </span>
    </a>
  );
}

function StandardRow({ standard, isChecked, onToggle }: { standard: Standard; isChecked?: boolean; onToggle?: () => void }) {
  const color = getOrgColor(standard.organization);
  return (
    <tr className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
      {onToggle !== undefined && (
        <td className="p-3 text-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggle}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
          />
        </td>
      )}
      <td className="p-3">
        <span className={`text-sm font-mono font-semibold ${ORG_COLORS[color]?.split(' ')[1] || 'text-cyan-400'}`}>
          {standard.id}
        </span>
      </td>
      <td className="p-3">
        <span className="text-sm text-slate-200">{standard.title}</span>
      </td>
      <td className="p-3 hidden md:table-cell">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded border ${ORG_COLORS[color]} ${ORG_BG[color]}`}
        >
          {getOrgName(standard.organization)}
        </span>
      </td>
      <td className="p-3 hidden lg:table-cell">
        <span className="text-xs text-slate-400">{standard.category}</span>
      </td>
      <td className="p-3 hidden xl:table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[standard.status]}`}>
          {standard.status}
        </span>
        {standard.supersededBy && (
          <span className="text-xs text-slate-500 ml-1">({standard.supersededBy})</span>
        )}
      </td>
    </tr>
  );
}

function StandardDetail({ standard }: { standard: Standard }) {
  const color = getOrgColor(standard.organization);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${ORG_COLORS[color]} ${ORG_BG[color]}`}>
          {getOrgName(standard.organization)}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[standard.status]}`}>
          {standard.status}
        </span>
        <span className="text-xs text-slate-500">{standard.category}</span>
      </div>
      <h3 className={`font-mono font-bold text-sm mb-1 ${ORG_COLORS[color]?.split(' ')[1] || 'text-cyan-400'}`}>
        {standard.id}
      </h3>
      <h4 className="text-slate-200 text-sm font-medium mb-2">{standard.title}</h4>
      <p className="text-slate-400 text-sm leading-relaxed">{standard.description}</p>
      {standard.lastUpdated && (
        <p className="text-xs text-slate-500 mt-2">Last updated: {standard.lastUpdated}</p>
      )}
      {standard.supersededBy && (
        <p className="text-xs text-amber-400/70 mt-1">Superseded by: {standard.supersededBy}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function StandardsReferencePage() {
  // -- State --
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'database' | 'checklist' | 'recent'>('database');
  const [selectedMission, setSelectedMission] = useState<MissionType>('LEO Commercial');
  const [checkedStandards, setCheckedStandards] = useState<Set<string>>(new Set());
  const [expandedStandard, setExpandedStandard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // -- Derived data --
  const allCategories = useMemo(
    () => Array.from(new Set(STANDARDS_DATABASE.map((s) => s.category))).sort(),
    []
  );

  const filteredStandards = useMemo(() => {
    return STANDARDS_DATABASE.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.id.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      const matchesOrg = selectedOrg === 'all' || s.organization === selectedOrg;
      const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
      return matchesSearch && matchesOrg && matchesCategory && matchesStatus;
    });
  }, [searchQuery, selectedOrg, selectedCategory, selectedStatus]);

  const recentlyUpdated = useMemo(() => {
    return STANDARDS_DATABASE
      .filter((s) => s.lastUpdated && (s.lastUpdated.startsWith('2025') || s.lastUpdated.startsWith('2026')))
      .sort((a, b) => (b.lastUpdated || '').localeCompare(a.lastUpdated || ''));
  }, []);

  const checklistStandards = useMemo(() => {
    const ids = COMPLIANCE_CHECKLISTS[selectedMission] || [];
    return ids.map((id) => STANDARDS_DATABASE.find((s) => s.id === id)).filter(Boolean) as Standard[];
  }, [selectedMission]);

  const checklistProgress = useMemo(() => {
    const total = checklistStandards.length;
    const done = checklistStandards.filter((s) => checkedStandards.has(s.id)).length;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [checklistStandards, checkedStandards]);

  // -- Handlers --
  const toggleChecked = (id: string) => {
    setCheckedStandards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedOrg('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  const hasActiveFilters =
    searchQuery !== '' || selectedOrg !== 'all' || selectedCategory !== 'all' || selectedStatus !== 'all';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Standards Reference' }]} />

        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Standards Reference"
          subtitle="Comprehensive reference of standards from CCSDS, ECSS, NASA, MIL-STD, ISO, AIAA, ITAR/EAR, and ITU-R governing space systems engineering, communications, materials, testing, and compliance."
          accentColor="cyan"
        />

        {/* ================================================================ */}
        {/* SECTION 1: Standards Organizations                                */}
        {/* ================================================================ */}
        <ScrollReveal>
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Standards Organizations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ORGANIZATIONS.map((org) => (
              <OrganizationCard key={org.id} org={org} />
            ))}
          </div>
        </section>

        </ScrollReveal>

        {/* ================================================================ */}
        {/* TAB NAVIGATION                                                   */}
        {/* ================================================================ */}
        <ScrollReveal delay={0.1}>
        <div className="flex gap-1 mb-6 border-b border-slate-700/50 pb-px overflow-x-auto">
          {([
            { key: 'database' as const, label: 'Standards Database', count: STANDARDS_DATABASE.length },
            { key: 'checklist' as const, label: 'Compliance Checklist', count: undefined as number | undefined },
            { key: 'recent' as const, label: 'Recently Updated', count: recentlyUpdated.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === tab.key
                  ? 'bg-slate-800/80 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs bg-slate-700/60 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/* TAB: Standards Database                                           */}
        {/* ================================================================ */}
        {activeTab === 'database' && (
          <section>
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
                  placeholder="Search by ID, title, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 min-h-[44px]"
                />
              </div>

              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 min-h-[44px] cursor-pointer"
              >
                <option value="all">All Organizations</option>
                {ORGANIZATIONS.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 min-h-[44px] cursor-pointer"
              >
                <option value="all">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 min-h-[44px] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Superseded">Superseded</option>
                <option value="Draft">Draft</option>
              </select>

              {/* View toggle */}
              <div className="flex border border-slate-700/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2.5 text-sm min-h-[44px] transition-colors ${
                    viewMode === 'table' ? 'bg-cyan-600/30 text-cyan-400' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Table view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2.5 text-sm min-h-[44px] transition-colors ${
                    viewMode === 'cards' ? 'bg-cyan-600/30 text-cyan-400' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Card view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Active filters summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <span className="text-slate-400">
                  Showing {filteredStandards.length} of {STANDARDS_DATABASE.length} standards
                </span>
                <button
                  onClick={resetFilters}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-800/30">
                        <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Standard ID
                        </th>
                        <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          Organization
                        </th>
                        <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                          Category
                        </th>
                        <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStandards.map((s) => (
                        <StandardRow key={s.id} standard={s} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredStandards.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-slate-400 text-sm">No standards match your filters.</p>
                    <button
                      onClick={resetFilters}
                      className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm underline underline-offset-2"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cards View */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredStandards.map((s) => (
                  <div key={s.id} onClick={() => setExpandedStandard(expandedStandard === s.id ? null : s.id)} className="cursor-pointer">
                    <StandardDetail standard={s} />
                  </div>
                ))}
                {filteredStandards.length === 0 && (
                  <div className="col-span-full p-12 text-center">
                    <p className="text-slate-400 text-sm">No standards match your filters.</p>
                    <button
                      onClick={resetFilters}
                      className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm underline underline-offset-2"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ================================================================ */}
        {/* TAB: Compliance Checklist                                         */}
        {/* ================================================================ */}
        {activeTab === 'checklist' && (
          <section>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-100 mb-2">
                Mission Compliance Checklist
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Select a mission type to see which standards typically apply. Check off items as you achieve compliance.
              </p>

              {/* Mission type selector */}
              <div className="flex flex-wrap gap-2 mb-6">
                {(Object.keys(COMPLIANCE_CHECKLISTS) as MissionType[]).map((mission) => (
                  <button
                    key={mission}
                    onClick={() => {
                      setSelectedMission(mission);
                      setCheckedStandards(new Set());
                    }}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors min-h-[44px] ${
                      selectedMission === mission
                        ? 'bg-cyan-600/30 text-cyan-400 border border-cyan-400/50'
                        : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {mission}
                  </button>
                ))}
              </div>

              {/* Progress bar */}
              <div className="card p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200">
                    Compliance Progress: {selectedMission}
                  </span>
                  <span className="text-sm font-mono text-cyan-400">
                    {checklistProgress.done}/{checklistProgress.total} ({checklistProgress.percent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${checklistProgress.percent}%`,
                      background:
                        checklistProgress.percent === 100
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                    }}
                  />
                </div>
                {checklistProgress.percent === 100 && (
                  <p className="text-emerald-400 text-xs mt-2 font-medium">
                    All applicable standards checked for {selectedMission} mission type.
                  </p>
                )}
              </div>
            </div>

            {/* Checklist table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-800/30">
                      <th className="p-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                        Done
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Standard ID
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                        Organization
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                        Category
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistStandards.map((s) => (
                      <StandardRow
                        key={s.id}
                        standard={s}
                        isChecked={checkedStandards.has(s.id)}
                        onToggle={() => toggleChecked(s.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* TAB: Recently Updated                                            */}
        {/* ================================================================ */}
        {activeTab === 'recent' && (
          <section>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-100 mb-2">
                Recently Updated Standards (2025-2026)
              </h2>
              <p className="text-sm text-slate-400">
                Standards that have been revised or updated in 2025 and 2026.
              </p>
            </div>

            {recentlyUpdated.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-slate-400 text-sm">No standards with 2025-2026 update dates found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recentlyUpdated.map((s) => (
                  <StandardDetail key={s.id} standard={s} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================================================================ */}
        {/* Footer note                                                      */}
        {/* ================================================================ */}
        <div className="mt-12 pt-6 border-t border-slate-700/30">
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            This reference is provided for informational purposes only and does not constitute legal or compliance advice.
            Standards are subject to revision. Always consult the official issuing organization for the latest version
            of any standard. Export control classifications (ITAR/EAR) should be verified with qualified legal counsel.
          </p>
        </div>

        </ScrollReveal>
        <RelatedModules modules={PAGE_RELATIONS['standards-reference']} />
      </div>
    </div>
  );
}
