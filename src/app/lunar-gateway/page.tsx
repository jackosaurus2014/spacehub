'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface GatewayModule {
  id: string;
  name: string;
  abbreviation: string;
  builder: string;
  mass?: string;
  power?: string;
  propulsion?: string;
  basedOn?: string;
  crewCapacity?: string;
  function?: string;
  features?: string;
  launchDate: string;
  launchVehicle?: string;
  status: 'integration' | 'construction' | 'manufacturing' | 'design' | 'development' | 'study';
  cost?: string;
  partners: string[];
  description: string;
}

interface ArtemisMission {
  name: string;
  date: string;
  status: 'completed' | 'upcoming' | 'planned';
  description: string;
  details: string;
}

interface InternationalPartner {
  agency: string;
  country: string;
  flag: string;
  contributions: string[];
  keyHardware: string;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const GATEWAY_MODULES: GatewayModule[] = [
  {
    id: 'ppe',
    name: 'Power & Propulsion Element',
    abbreviation: 'PPE',
    builder: 'Maxar Technologies (now MDA Space)',
    mass: '~5,000 kg',
    power: '60 kW solar electric propulsion',
    propulsion: 'Hall-effect thrusters (SEP)',
    launchDate: 'NET 2025 (co-manifested with HALO)',
    launchVehicle: 'Falcon Heavy',
    status: 'integration',
    cost: '~$375M (NASA contract)',
    partners: ['NASA'],
    description: 'The PPE provides power, high-rate communications, attitude control, and orbital maneuvering capability for the Gateway. Its 60 kW solar electric propulsion system uses advanced Hall-effect thrusters to maintain the station\'s unique near-rectilinear halo orbit around the Moon. The PPE serves as the backbone of Gateway\'s power and communications infrastructure.',
  },
  {
    id: 'halo',
    name: 'Habitation and Logistics Outpost',
    abbreviation: 'HALO',
    builder: 'Northrop Grumman',
    mass: '~8,600 kg',
    basedOn: 'Cygnus spacecraft heritage',
    crewCapacity: '4 (for up to 30 days initially)',
    launchDate: 'NET 2025 (co-manifested with PPE)',
    launchVehicle: 'Falcon Heavy',
    status: 'construction',
    cost: '~$935M (NASA contract)',
    partners: ['NASA'],
    description: 'HALO is the initial crew module for the Gateway, derived from Northrop Grumman\'s proven Cygnus spacecraft design. It provides living quarters for up to four crew members during short-duration stays, along with docking ports for visiting vehicles including the Orion spacecraft and logistics resupply vehicles. HALO includes command and control capabilities and basic life support systems.',
  },
  {
    id: 'ihab',
    name: 'International Habitation Module',
    abbreviation: 'I-HAB',
    builder: 'Thales Alenia Space (ESA contribution)',
    function: 'Additional living quarters, life support',
    launchDate: 'NET 2028',
    status: 'manufacturing',
    partners: ['ESA', 'JAXA'],
    description: 'I-HAB significantly expands the Gateway\'s habitable volume and life support capabilities. Built by Thales Alenia Space as a European contribution to the program, it incorporates JAXA-provided environmental control and life support system (ECLSS) components. I-HAB will enable longer crew stays and provide additional workspace for science operations.',
  },
  {
    id: 'esprit',
    name: 'European System Providing Refueling, Infrastructure & Telecommunications',
    abbreviation: 'ESPRIT',
    builder: 'Thales Alenia Space',
    function: 'Refueling, communications relay, science airlock, EVA capabilities',
    launchDate: 'NET 2029',
    status: 'design',
    partners: ['ESA'],
    description: 'ESPRIT provides critical refueling infrastructure, enhanced communications relay capabilities, and a science airlock for deploying instruments and conducting extravehicular activities. As a European contribution, it extends the Gateway\'s operational flexibility and enables propellant resupply for the station\'s orbit maintenance.',
  },
  {
    id: 'canadarm3',
    name: 'Canadarm3 Robotic System',
    abbreviation: 'Canadarm3',
    builder: 'MDA Space (CSA contribution)',
    function: 'External robotics, maintenance, science payloads',
    features: 'AI-enabled autonomous operations, small dexterous arm',
    launchDate: 'With I-HAB or later',
    status: 'development',
    partners: ['CSA'],
    description: 'Canadarm3 represents the next generation of Canadian robotic technology for space. Unlike its predecessors on the Space Shuttle and ISS, Canadarm3 features AI-enabled autonomous operations, allowing it to perform maintenance, capture visiting vehicles, and manipulate science payloads without real-time crew intervention. It includes both a large arm for major operations and a small dexterous arm for precision tasks.',
  },
  {
    id: 'airlock',
    name: 'Crew & Science Airlock',
    abbreviation: 'Airlock',
    builder: 'TBD (under study)',
    function: 'EVA access, science instrument deployment',
    launchDate: 'TBD (~2030)',
    status: 'study',
    partners: ['NASA'],
    description: 'The dedicated Crew and Science Airlock will provide a full-capability EVA (extravehicular activity) access point, enabling astronauts to perform spacewalks for external maintenance, science instrument deployment, and future assembly operations. This module is currently under study with contractor selection pending.',
  },
];

const ARTEMIS_MISSIONS: ArtemisMission[] = [
  {
    name: 'Artemis I',
    date: 'Dec 2022',
    status: 'completed',
    description: 'Uncrewed Orion test flight around Moon',
    details: 'Successfully demonstrated the Space Launch System (SLS) rocket and Orion spacecraft on a 25.5-day mission that traveled 1.4 million miles, including multiple lunar flybys and a distant retrograde orbit. The mission set a new distance record for a spacecraft designed to carry humans.',
  },
  {
    name: 'Artemis II',
    date: 'NET Sep 2025',
    status: 'upcoming',
    description: 'First crewed Orion flight, lunar flyby (4 crew)',
    details: 'The first crewed mission of the Artemis program will send four astronauts on a free-return trajectory around the Moon. Crew members Reid Wiseman, Victor Glover, Christina Koch, and Jeremy Hansen (CSA) will test Orion\'s life support systems and manual piloting capabilities during an approximately 10-day mission.',
  },
  {
    name: 'Artemis III',
    date: 'NET 2026',
    status: 'upcoming',
    description: 'First crewed lunar landing since Apollo (SpaceX Starship HLS)',
    details: 'This historic mission will return humans to the lunar surface for the first time since Apollo 17 in 1972. Using SpaceX\'s Starship Human Landing System (HLS) as the descent vehicle, two astronauts will spend approximately a week on the lunar surface near the south pole, conducting science and exploration activities.',
  },
  {
    name: 'Artemis IV',
    date: 'NET 2028',
    status: 'planned',
    description: 'First crewed mission to Gateway (PPE+HALO), I-HAB delivery',
    details: 'The first mission to utilize the Lunar Gateway. Crew will dock Orion with the PPE+HALO modules already in lunar orbit and deliver the I-HAB module, significantly expanding the station\'s capabilities. This mission marks the beginning of sustained operations at the Gateway.',
  },
  {
    name: 'Artemis V',
    date: 'NET 2030',
    status: 'planned',
    description: 'Blue Origin Blue Moon lander, further Gateway assembly',
    details: 'Featuring Blue Origin\'s Blue Moon Human Landing System as the second provider for crewed lunar landings. This mission will continue Gateway assembly and enable surface operations with an expanded lander capability.',
  },
  {
    name: 'Artemis VI+',
    date: '2030s',
    status: 'planned',
    description: 'Full Gateway operations, surface missions',
    details: 'The Artemis program envisions a sustained human presence at the Moon through the 2030s and beyond. Regular missions to the Gateway will enable extended surface stays, resource prospecting, technology demonstrations for Mars, and international partnership activities.',
  },
];

const INTERNATIONAL_PARTNERS: InternationalPartner[] = [
  {
    agency: 'NASA',
    country: 'United States',
    flag: 'US',
    contributions: ['PPE module', 'HALO module', 'Orion spacecraft', 'SLS launch vehicle', 'Program management'],
    keyHardware: 'PPE, HALO, Orion, SLS, Crew & Science Airlock',
  },
  {
    agency: 'ESA',
    country: 'Europe',
    flag: 'EU',
    contributions: ['I-HAB module', 'ESPRIT module', 'Orion European Service Module', 'Science instruments'],
    keyHardware: 'I-HAB, ESPRIT, European Service Module (ESM)',
  },
  {
    agency: 'JAXA',
    country: 'Japan',
    flag: 'JP',
    contributions: ['Life support components for I-HAB', 'HTV-X resupply capability', 'Battery technology', 'Science payloads'],
    keyHardware: 'ECLSS components, batteries, cargo resupply',
  },
  {
    agency: 'CSA',
    country: 'Canada',
    flag: 'CA',
    contributions: ['Canadarm3 robotic system', 'AI autonomy software', 'Crew member (Artemis II)', 'Gateway external robotics'],
    keyHardware: 'Canadarm3 (large arm + dexterous manipulator)',
  },
];

// ────────────────────────────────────────
// Status styling
// ────────────────────────────────────────

const MODULE_STATUS_STYLES: Record<GatewayModule['status'], { label: string; color: string; bg: string }> = {
  integration: { label: 'Integration Testing', color: 'text-green-400', bg: 'bg-green-900/30' },
  construction: { label: 'Under Construction', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  manufacturing: { label: 'Design/Manufacturing', color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  design: { label: 'Design Phase', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  development: { label: 'Development', color: 'text-orange-400', bg: 'bg-orange-900/30' },
  study: { label: 'Under Study', color: 'text-purple-400', bg: 'bg-purple-900/30' },
};

const MISSION_STATUS_STYLES: Record<ArtemisMission['status'], { label: string; color: string; bg: string; border: string }> = {
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
  upcoming: { label: 'Upcoming', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
  planned: { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
};

// ────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────

function HeroStats() {
  const stats = [
    { label: 'Modules Planned', value: '6+', icon: '🛰️', sub: 'Core station elements' },
    { label: 'Partner Nations', value: '4', icon: '🌐', sub: 'International collaboration' },
    { label: 'Program Cost', value: '~$7.8B', icon: '💰', sub: 'NASA Gateway contracts' },
    { label: 'First Crew Visit', value: '2028', icon: '👨‍🚀', sub: 'Artemis IV target' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
              <div className="text-white font-bold text-xl">{stat.value}</div>
              <div className="text-star-400 text-xs">{stat.sub}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GatewayOverview() {
  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🏗️</span>
        Gateway Overview
      </h2>
      <div className="space-y-4 text-star-300 leading-relaxed">
        <p>
          The <span className="text-white font-semibold">Lunar Gateway</span> is a planned small space station
          that will orbit the Moon in a <span className="text-nebula-400">near-rectilinear halo orbit (NRHO)</span>,
          serving as a multi-purpose outpost for the Artemis program. Unlike the International Space Station in
          low Earth orbit, the Gateway will be the first space station in deep space -- positioned as a staging
          point for lunar surface missions and future deep space exploration.
        </p>
        <p>
          The station will serve multiple critical roles: a staging area for crewed and robotic lunar surface
          expeditions, a laboratory for deep space science and technology demonstrations, a communications relay
          for surface operations, and a testbed for systems and operations needed for eventual crewed missions
          to Mars. The Gateway is designed for intermittent habitation, with crews visiting during Artemis
          missions rather than maintaining a permanent presence.
        </p>
        <p>
          As a truly international endeavor, the Gateway brings together contributions from NASA, the European
          Space Agency (ESA), the Japan Aerospace Exploration Agency (JAXA), and the Canadian Space Agency (CSA),
          making it one of the most significant collaborative space infrastructure projects since the ISS.
        </p>
      </div>
    </div>
  );
}

function ModuleCard({ module }: { module: GatewayModule }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = MODULE_STATUS_STYLES[module.status];

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-nebula-400 font-mono font-bold text-sm">{module.abbreviation}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
          </div>
          <h3 className="text-white font-semibold text-lg leading-tight">{module.name}</h3>
        </div>
      </div>

      {/* Builder & Key Specs */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Builder:</span>
          <span className="text-star-200">{module.builder}</span>
        </div>
        {module.mass && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Mass:</span>
            <span className="text-star-200">{module.mass}</span>
          </div>
        )}
        {module.power && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Power:</span>
            <span className="text-star-200">{module.power}</span>
          </div>
        )}
        {module.propulsion && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Propulsion:</span>
            <span className="text-star-200">{module.propulsion}</span>
          </div>
        )}
        {module.basedOn && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Based on:</span>
            <span className="text-star-200">{module.basedOn}</span>
          </div>
        )}
        {module.crewCapacity && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Crew:</span>
            <span className="text-star-200">{module.crewCapacity}</span>
          </div>
        )}
        {module.function && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Function:</span>
            <span className="text-star-200">{module.function}</span>
          </div>
        )}
        {module.features && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Features:</span>
            <span className="text-star-200">{module.features}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Launch:</span>
          <span className="text-star-200">{module.launchDate}</span>
        </div>
        {module.launchVehicle && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Vehicle:</span>
            <span className="text-star-200">{module.launchVehicle}</span>
          </div>
        )}
        {module.cost && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Cost:</span>
            <span className="text-green-400">{module.cost}</span>
          </div>
        )}
      </div>

      {/* Partners */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {module.partners.map((partner) => (
          <span key={partner} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">
            {partner}
          </span>
        ))}
      </div>

      {/* Expandable Description */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Show less' : 'Read more'}
      </button>
      {expanded && (
        <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
          {module.description}
        </p>
      )}
    </div>
  );
}

function ArtemisTimeline() {
  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🚀</span>
        Artemis Mission Timeline
      </h2>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500 opacity-30" />

        <div className="space-y-6">
          {ARTEMIS_MISSIONS.map((mission, index) => {
            const style = MISSION_STATUS_STYLES[mission.status];
            return (
              <div key={mission.name} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-2.5 top-2 w-4 h-4 rounded-full border-2 ${
                  mission.status === 'completed'
                    ? 'bg-green-500 border-green-400'
                    : mission.status === 'upcoming'
                      ? 'bg-yellow-500 border-yellow-400 animate-pulse'
                      : 'bg-slate-600 border-slate-500'
                }`} />

                <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">{mission.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.color} bg-slate-800/50`}>
                      {style.label}
                    </span>
                    <span className="text-star-400 text-sm font-mono">{mission.date}</span>
                  </div>
                  <p className="text-star-200 font-medium text-sm mb-2">{mission.description}</p>
                  <p className="text-star-400 text-sm leading-relaxed">{mission.details}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PartnersSection() {
  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🤝</span>
        International Partners
      </h2>
      <p className="text-star-300 mb-6 leading-relaxed">
        The Lunar Gateway represents one of the most significant international collaborations in human spaceflight
        since the International Space Station. Four space agencies have committed hardware, technology, and crew
        contributions to build and operate the Gateway throughout the Artemis era.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTERNATIONAL_PARTNERS.map((partner) => (
          <div
            key={partner.agency}
            className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 hover:border-nebula-500/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-xs font-bold text-white">
                {partner.flag}
              </div>
              <div>
                <h3 className="text-white font-bold">{partner.agency}</h3>
                <span className="text-star-400 text-sm">{partner.country}</span>
              </div>
            </div>
            <div className="mb-3">
              <span className="text-star-400 text-xs uppercase tracking-widest">Key Hardware</span>
              <p className="text-nebula-400 text-sm font-medium mt-1">{partner.keyHardware}</p>
            </div>
            <div>
              <span className="text-star-400 text-xs uppercase tracking-widest">Contributions</span>
              <ul className="mt-1 space-y-1">
                {partner.contributions.map((contribution) => (
                  <li key={contribution} className="text-star-300 text-sm flex items-start gap-2">
                    <span className="text-nebula-500 mt-1.5 w-1 h-1 rounded-full bg-nebula-500 flex-shrink-0" />
                    {contribution}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommercialOpportunities() {
  const opportunities = [
    {
      title: 'Logistics Resupply',
      description: 'SpaceX Dragon XL has been selected to deliver cargo, experiments, and supplies to the Gateway. The Dragon XL will remain docked for 6-12 months, serving as additional storage volume.',
      provider: 'SpaceX Dragon XL',
      icon: '📦',
    },
    {
      title: 'Science Payloads',
      description: 'The Gateway provides a unique platform for deep space science, heliophysics, and lunar observations. Multiple external and internal payload accommodations are planned.',
      provider: 'Multiple agencies & institutions',
      icon: '🔬',
    },
    {
      title: 'Technology Demonstrations',
      description: 'The deep space environment near the Moon offers opportunities to test technologies critical for future Mars missions, including radiation shielding, closed-loop life support, and autonomous systems.',
      provider: 'NASA & commercial partners',
      icon: '🧪',
    },
    {
      title: 'Future Commercial Modules',
      description: 'As the Gateway architecture matures, opportunities exist for commercial partners to develop and attach additional modules for habitation, research, or manufacturing purposes.',
      provider: 'To be determined',
      icon: '🏭',
    },
  ];

  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">💼</span>
        Commercial Opportunities
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opportunities.map((opp) => (
          <div
            key={opp.title}
            className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 hover:border-nebula-500/30 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{opp.icon}</span>
              <h3 className="text-white font-semibold">{opp.title}</h3>
            </div>
            <p className="text-star-300 text-sm leading-relaxed mb-2">{opp.description}</p>
            <span className="text-nebula-400 text-xs font-medium">{opp.provider}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NRHOExplainer() {
  const orbitFacts = [
    { label: 'Orbit Period', value: '~6.5 days', detail: 'One complete orbit around the Moon' },
    { label: 'Closest Approach', value: '~3,000 km', detail: 'Periapsis (nearest point to Moon)' },
    { label: 'Farthest Distance', value: '~70,000 km', detail: 'Apoapsis (farthest point from Moon)' },
  ];

  const benefits = [
    {
      title: 'Low Delta-V for Lunar Access',
      description: 'The NRHO minimizes the propellant needed to transfer between the Gateway and the lunar surface, making it efficient for supporting crewed landing missions.',
    },
    {
      title: 'Continuous Earth Communication',
      description: 'Unlike low lunar orbit, the NRHO maintains near-continuous line-of-sight with Earth, ensuring reliable communication and telemetry links.',
    },
    {
      title: 'Orbital Stability',
      description: 'The near-rectilinear halo orbit is dynamically stable with minimal station-keeping propellant requirements, extending the operational lifetime of the Gateway.',
    },
    {
      title: 'Full Lunar Coverage',
      description: 'The orbit\'s geometry provides access to a wide range of lunar landing sites, including the scientifically valuable south polar region.',
    },
  ];

  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🌑</span>
        Near-Rectilinear Halo Orbit (NRHO)
      </h2>
      <p className="text-star-300 mb-6 leading-relaxed">
        The Gateway will orbit the Moon in a unique <span className="text-white font-semibold">near-rectilinear halo orbit
        (NRHO)</span>, a type of orbit in the Earth-Moon system that takes advantage of gravitational balance points.
        This orbit was specifically chosen to balance accessibility to the lunar surface with stable
        communications to Earth -- a critical tradeoff for sustained exploration operations.
      </p>

      {/* Orbit parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {orbitFacts.map((fact) => (
          <div key={fact.label} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-center">
            <div className="text-star-400 text-xs uppercase tracking-widest mb-1">{fact.label}</div>
            <div className="text-white font-bold text-2xl mb-1">{fact.value}</div>
            <div className="text-star-400 text-xs">{fact.detail}</div>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <h3 className="text-white font-semibold mb-3">Key Benefits</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {benefits.map((benefit) => (
          <div key={benefit.title} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-nebula-500 mt-2 flex-shrink-0" />
            <div>
              <span className="text-white text-sm font-medium">{benefit.title}</span>
              <p className="text-star-400 text-sm mt-0.5">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tabs
// ────────────────────────────────────────

type TabId = 'overview' | 'modules' | 'timeline' | 'partners' | 'orbit';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🏗️' },
  { id: 'modules', label: 'Modules', icon: '🛰️' },
  { id: 'timeline', label: 'Artemis Timeline', icon: '🚀' },
  { id: 'partners', label: 'Partners', icon: '🤝' },
  { id: 'orbit', label: 'NRHO Orbit', icon: '🌑' },
];

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function LunarGatewayPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Lunar Gateway"
          subtitle="NASA's Lunar Gateway space station -- the Artemis program's staging point for lunar surface missions and deep space exploration"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Solar System Expansion', href: '/solar-exploration' },
            { label: 'Lunar Gateway' },
          ]}
        />

        {/* Hero Stats */}
        <HeroStats />

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-nebula-500 text-nebula-300'
                    : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <GatewayOverview />

            {/* Quick module overview */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🛰️</span>
                Gateway Modules
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {GATEWAY_MODULES.map((module) => (
                  <ModuleCard key={module.id} module={module} />
                ))}
              </div>
            </div>

            <CommercialOpportunities />
            <NRHOExplainer />
          </div>
        )}

        {activeTab === 'modules' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white mb-2">Gateway Station Modules</h2>
              <p className="text-star-300 text-sm">
                Detailed specifications and status for each module of the Lunar Gateway.
                The first two modules (PPE and HALO) will launch together on a single Falcon Heavy rocket,
                with subsequent modules delivered on later Artemis missions.
              </p>
            </div>

            {/* Assembly order visualization */}
            <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-6">
              <h3 className="text-white font-semibold text-sm mb-3">Assembly Sequence</h3>
              <div className="flex flex-wrap items-center gap-2">
                {GATEWAY_MODULES.map((module, index) => {
                  const style = MODULE_STATUS_STYLES[module.status];
                  return (
                    <div key={module.id} className="flex items-center gap-2">
                      <div className={`px-3 py-1.5 rounded-lg border ${style.bg} border-slate-700/50`}>
                        <span className={`text-xs font-bold ${style.color}`}>{module.abbreviation}</span>
                      </div>
                      {index < GATEWAY_MODULES.length - 1 && (
                        <svg className="w-4 h-4 text-star-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {GATEWAY_MODULES.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && <ArtemisTimeline />}

        {activeTab === 'partners' && <PartnersSection />}

        {activeTab === 'orbit' && <NRHOExplainer />}

        {/* Related Modules */}
        <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/solar-exploration" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Solar Exploration
            </Link>
            <Link href="/launch-windows" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Launch Windows
            </Link>
            <Link href="/space-mining" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Space Mining
            </Link>
            <Link href="/debris-monitor" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Debris Monitor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
