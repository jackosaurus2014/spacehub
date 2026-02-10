'use client';

import { useState, useEffect } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'forces' | 'programs' | 'procurement' | 'threats' | 'alliances';

interface SpaceForce {
  id: string;
  name: string;
  country: string;
  flag: string;
  established: string;
  personnel: string;
  budget: string;
  budgetYear: string;
  parentService: string;
  commander: string;
  headquarters: string;
  keyPrograms: string[];
  description: string;
  fieldCommands?: string[];
}

interface DefenseProgram {
  id: string;
  name: string;
  abbreviation: string;
  agency: string;
  contractor: string;
  status: 'operational' | 'development' | 'production' | 'planned' | 'concept';
  category: 'communications' | 'missile_warning' | 'navigation' | 'launch' | 'surveillance' | 'sda' | 'ground' | 'classified';
  budget?: string;
  description: string;
  nextMilestone?: string;
  constellation?: string;
}

interface ContractAward {
  id: string;
  title: string;
  contractor: string;
  value: string;
  awardDate: string;
  agency: string;
  category: string;
  description: string;
  period?: string;
}

interface CounterspaceEvent {
  id: string;
  date: string;
  nation: string;
  flag: string;
  type: 'kinetic_asat' | 'rpo' | 'electronic_warfare' | 'cyber' | 'directed_energy' | 'co_orbital';
  name: string;
  description: string;
  debrisGenerated?: string;
  altitude?: string;
  target?: string;
}

interface Alliance {
  id: string;
  name: string;
  abbreviation?: string;
  established: string;
  members: string[];
  description: string;
  keyActivities: string[];
  headquarters?: string;
}

// ────────────────────────────────────────
// Static Config (UI style mappings)
// ────────────────────────────────────────

const PROGRAM_STATUS_STYLES: Record<DefenseProgram['status'], { label: string; color: string; bg: string }> = {
  operational: { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/20' },
  production: { label: 'Production', color: 'text-blue-400', bg: 'bg-blue-900/20' },
  development: { label: 'Development', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  planned: { label: 'Planned', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  concept: { label: 'Concept', color: 'text-purple-400', bg: 'bg-purple-900/20' },
};

const DEFAULT_PROGRAM_STATUS_STYLE = { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-900/20' };

const CATEGORY_STYLES: Record<DefenseProgram['category'], { label: string; color: string }> = {
  communications: { label: 'Communications', color: 'text-blue-300' },
  missile_warning: { label: 'Missile Warning', color: 'text-red-300' },
  navigation: { label: 'Navigation', color: 'text-green-300' },
  launch: { label: 'Launch', color: 'text-orange-300' },
  surveillance: { label: 'Surveillance', color: 'text-purple-300' },
  sda: { label: 'SDA Architecture', color: 'text-cyan-300' },
  ground: { label: 'Ground Systems', color: 'text-yellow-300' },
  classified: { label: 'Classified', color: 'text-slate-300' },
};

const DEFAULT_CATEGORY_STYLE = { label: 'Unknown', color: 'text-slate-400' };

const EVENT_TYPE_STYLES: Record<CounterspaceEvent['type'], { label: string; color: string; bg: string }> = {
  kinetic_asat: { label: 'Kinetic ASAT', color: 'text-red-400', bg: 'bg-red-900/20' },
  co_orbital: { label: 'Co-Orbital / RPO', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  electronic_warfare: { label: 'Electronic Warfare', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  cyber: { label: 'Cyber Attack', color: 'text-purple-400', bg: 'bg-purple-900/20' },
  directed_energy: { label: 'Directed Energy', color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
  rpo: { label: 'RPO', color: 'text-orange-400', bg: 'bg-orange-900/20' },
};

const DEFAULT_EVENT_TYPE_STYLE = { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-900/20' };

// ────────────────────────────────────────
// Tab Configuration
// ────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'forces', label: 'Space Forces' },
  { id: 'programs', label: 'Programs' },
  { id: 'procurement', label: 'Procurement' },
  { id: 'threats', label: 'Threat Assessment' },
  { id: 'alliances', label: 'Alliances' },
];

// ────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────

interface LiveProcurement {
  id: string;
  title: string;
  contractor: string;
  value: string;
  awardDate: string;
  agency: string;
  category: string;
  description: string;
  period?: string;
  samUrl?: string;
  naicsCode?: string;
  naicsDescription?: string;
  type?: string;
}

interface DefenseNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  category?: string;
}

function HeroStats({ forceCount, programCount, contractCount, allianceCount }: {
  forceCount: number;
  programCount: number;
  contractCount: number;
  allianceCount: number;
}) {
  const stats = [
    { label: 'Space Forces', value: forceCount > 0 ? String(forceCount) : '10', sub: 'Military organizations' },
    { label: 'Defense Programs', value: programCount > 0 ? String(programCount) : '22+', sub: 'Major programs tracked' },
    { label: 'Major Contracts', value: contractCount > 0 ? String(contractCount) : '16+', sub: 'Recent awards' },
    { label: 'Allied Partnerships', value: allianceCount > 0 ? String(allianceCount) : '9', sub: 'International frameworks' },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
            <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
            <div className="text-white font-bold text-2xl mt-1">{stat.value}</div>
            <div className="text-star-400 text-xs">{stat.sub}</div>
          </div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

function SpaceForceCard({ force }: { force: SpaceForce }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-xs font-bold text-white">
            {force.flag}
          </div>
          <div>
            <h3 className="text-white font-bold">{force.name}</h3>
            <span className="text-star-400 text-sm">{force.country}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Established:</span>
          <span className="text-star-200">{force.established}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Personnel:</span>
          <span className="text-star-200">{force.personnel}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Budget:</span>
          <span className="text-green-400 font-medium">{force.budget}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Parent:</span>
          <span className="text-star-200">{force.parentService}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Commander:</span>
          <span className="text-star-200">{force.commander}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">HQ:</span>
          <span className="text-star-200">{force.headquarters}</span>
        </div>
      </div>

      {force.fieldCommands && (
        <div className="mb-4">
          <span className="text-star-400 text-xs uppercase tracking-widest">Field Commands</span>
          <ul className="mt-1 space-y-1">
            {force.fieldCommands.map((cmd) => (
              <li key={cmd} className="text-star-300 text-sm flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-nebula-500 mt-1.5 flex-shrink-0" />
                {cmd}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4">
        <span className="text-star-400 text-xs uppercase tracking-widest">Key Programs</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {force.keyPrograms.map((program) => (
            <span key={program} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">
              {program}
            </span>
          ))}
        </div>
      </div>

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
          {force.description}
        </p>
      )}
    </div>
  );
}

function ProgramCard({ program }: { program: DefenseProgram }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = PROGRAM_STATUS_STYLES[program.status] || DEFAULT_PROGRAM_STATUS_STYLE;
  const catStyle = CATEGORY_STYLES[program.category] || DEFAULT_CATEGORY_STYLE;

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-nebula-400 font-mono font-bold text-sm">{program.abbreviation}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
            <span className={`text-xs ${catStyle.color}`}>{catStyle.label}</span>
          </div>
          <h3 className="text-white font-semibold">{program.name}</h3>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[90px]">Agency:</span>
          <span className="text-star-200">{program.agency}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[90px]">Contractor:</span>
          <span className="text-star-200">{program.contractor}</span>
        </div>
        {program.budget && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[90px]">Budget:</span>
            <span className="text-green-400 font-medium">{program.budget}</span>
          </div>
        )}
        {program.constellation && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[90px]">Constellation:</span>
            <span className="text-star-200">{program.constellation}</span>
          </div>
        )}
        {program.nextMilestone && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[90px]">Next:</span>
            <span className="text-yellow-400">{program.nextMilestone}</span>
          </div>
        )}
      </div>

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
        {expanded ? 'Show less' : 'Details'}
      </button>
      {expanded && (
        <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
          {program.description}
        </p>
      )}
    </div>
  );
}

function ContractCard({ contract }: { contract: ContractAward }) {
  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-white font-semibold">{contract.title}</h3>
        <span className="text-green-400 font-bold text-sm whitespace-nowrap ml-3">{contract.value}</span>
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Contractor:</span>
          <span className="text-star-200">{contract.contractor}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Agency:</span>
          <span className="text-star-200">{contract.agency}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Awarded:</span>
          <span className="text-star-200">{contract.awardDate}</span>
        </div>
        {contract.period && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Period:</span>
            <span className="text-star-200">{contract.period}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Category:</span>
          <span className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">{contract.category}</span>
        </div>
      </div>
      <p className="text-star-300 text-sm leading-relaxed">{contract.description}</p>
    </div>
  );
}

function ThreatEventCard({ event }: { event: CounterspaceEvent }) {
  const typeStyle = EVENT_TYPE_STYLES[event.type] || DEFAULT_EVENT_TYPE_STYLE;

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-700/50 flex items-center justify-center text-xs font-bold text-white">
            {event.flag}
          </div>
          <div>
            <h3 className="text-white font-semibold">{event.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeStyle.bg} ${typeStyle.color}`}>
                {typeStyle.label}
              </span>
              <span className="text-star-400 text-xs">{event.nation}</span>
            </div>
          </div>
        </div>
        <span className="text-star-400 text-sm font-mono whitespace-nowrap">{event.date}</span>
      </div>

      {(event.altitude || event.target || event.debrisGenerated) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {event.altitude && (
            <div className="bg-slate-900/50 rounded p-2">
              <span className="text-star-400 text-xs block">Altitude</span>
              <span className="text-star-200 text-sm font-medium">{event.altitude}</span>
            </div>
          )}
          {event.target && (
            <div className="bg-slate-900/50 rounded p-2">
              <span className="text-star-400 text-xs block">Target</span>
              <span className="text-star-200 text-sm font-medium">{event.target}</span>
            </div>
          )}
          {event.debrisGenerated && (
            <div className="bg-slate-900/50 rounded p-2">
              <span className="text-star-400 text-xs block">Debris Generated</span>
              <span className="text-red-400 text-sm font-medium">{event.debrisGenerated}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-star-300 text-sm leading-relaxed">{event.description}</p>
    </div>
  );
}

function AllianceCard({ alliance }: { alliance: Alliance }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold">{alliance.name}</h3>
            {alliance.abbreviation && (
              <span className="text-nebula-400 font-mono text-sm">({alliance.abbreviation})</span>
            )}
          </div>
          <span className="text-star-400 text-sm">Est. {alliance.established}</span>
        </div>
        {alliance.headquarters && (
          <span className="text-star-400 text-xs">{alliance.headquarters}</span>
        )}
      </div>

      <div className="mb-3">
        <span className="text-star-400 text-xs uppercase tracking-widest">Members</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {alliance.members.map((member) => (
            <span key={member} className="px-2 py-0.5 bg-slate-700/50 text-star-200 rounded text-xs">
              {member}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="text-star-400 text-xs uppercase tracking-widest">Key Activities</span>
        <ul className="mt-1 space-y-1">
          {alliance.keyActivities.slice(0, expanded ? undefined : 3).map((activity) => (
            <li key={activity} className="text-star-300 text-sm flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-nebula-500 mt-1.5 flex-shrink-0" />
              {activity}
            </li>
          ))}
        </ul>
      </div>

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
          {alliance.description}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Spending Trends Component
// ────────────────────────────────────────

function SpendingTrends() {
  const budgetData = [
    { year: 'FY2020', ussf: 15.4, nro: 16.0 },
    { year: 'FY2021', ussf: 17.4, nro: 16.5 },
    { year: 'FY2022', ussf: 24.5, nro: 17.2 },
    { year: 'FY2023', ussf: 26.3, nro: 17.8 },
    { year: 'FY2024', ussf: 30.3, nro: 18.3 },
    { year: 'FY2025', ussf: 33.3, nro: 18.9 },
  ];

  const maxVal = 35;

  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h3 className="text-white font-bold mb-4">U.S. Defense Space Budget Trends ($B)</h3>
      <div className="space-y-3">
        {budgetData.map((row) => (
          <div key={row.year} className="flex items-center gap-3">
            <span className="text-star-400 text-sm font-mono w-16 flex-shrink-0">{row.year}</span>
            <div className="flex-1 flex gap-1">
              <div
                className="h-6 rounded-l bg-nebula-500/60 flex items-center pl-2"
                style={{ width: `${(row.ussf / maxVal) * 100}%` }}
              >
                <span className="text-white text-xs font-medium whitespace-nowrap">${row.ussf}B</span>
              </div>
              <div
                className="h-6 rounded-r bg-purple-500/60 flex items-center pl-2"
                style={{ width: `${(row.nro / maxVal) * 100}%` }}
              >
                <span className="text-white text-xs font-medium whitespace-nowrap">${row.nro}B</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-6 mt-4 text-xs text-star-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-nebula-500/60" />
          <span>USSF Budget</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500/60" />
          <span>NRO Budget</span>
        </div>
      </div>
      <p className="text-star-500 text-xs mt-3">
        Note: FY2025 figures are budget requests. USSF budget includes Space Force-specific funding within the DAF budget.
        NRO budget was first publicly disclosed in 2024. All figures from public/unclassified sources.
      </p>
    </div>
  );
}

// ────────────────────────────────────────
// Threat Summary Component
// ────────────────────────────────────────

function ThreatSummary() {
  const categories = [
    {
      name: 'Kinetic ASAT',
      level: 'high',
      nations: ['China', 'Russia', 'India', 'United States'],
      description: 'Direct-ascent missiles that physically destroy satellites. Creates debris, difficult to conceal. Four nations have demonstrated this capability.',
    },
    {
      name: 'Co-Orbital / RPO',
      level: 'high',
      nations: ['China', 'Russia', 'United States'],
      description: 'Satellites that maneuver near other satellites for inspection, surveillance, or potential interference. Ambiguous intent makes attribution challenging.',
    },
    {
      name: 'Electronic Warfare (Jamming/Spoofing)',
      level: 'very_high',
      nations: ['Russia', 'China', 'Iran', 'North Korea'],
      description: 'Ground-based or space-based systems that jam or spoof satellite signals, particularly GPS/GNSS and SATCOM. Most frequently used counterspace capability.',
    },
    {
      name: 'Cyber',
      level: 'high',
      nations: ['Russia', 'China', 'Iran', 'North Korea'],
      description: 'Attacks on satellite ground systems, communication links, or spacecraft software. Demonstrated in the 2022 Viasat attack. Hard to attribute definitively.',
    },
    {
      name: 'Directed Energy',
      level: 'medium',
      nations: ['China', 'Russia'],
      description: 'Ground-based or space-based lasers for dazzling, blinding, or damaging satellite sensors. China and Russia assessed to be developing these systems.',
    },
  ];

  const levelStyles: Record<string, { label: string; color: string; bg: string }> = {
    very_high: { label: 'Very High', color: 'text-red-400', bg: 'bg-red-900/20' },
    high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-900/20' },
    medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
    low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-900/20' },
  };

  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h3 className="text-white font-bold mb-4">Counterspace Threat Overview (OSINT Assessment)</h3>
      <div className="space-y-4">
        {categories.map((cat) => {
          const style = levelStyles[cat.level];
          return (
            <div key={cat.name} className={`rounded-lg border border-slate-700/50 ${style.bg} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">{cat.name}</h4>
                <span className={`text-xs font-bold px-2.5 py-1 rounded ${style.bg} ${style.color}`}>
                  Threat Level: {style.label}
                </span>
              </div>
              <p className="text-star-300 text-sm mb-2">{cat.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-star-400 text-xs mr-1">Known capable:</span>
                {cat.nations.map((nation) => (
                  <span key={nation} className="px-2 py-0.5 bg-slate-700/50 text-star-200 rounded text-xs">
                    {nation}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-star-500 text-xs mt-4">
        Source: Compiled from the Secure World Foundation Global Counterspace Capabilities report,
        CSIS Aerospace Security Project, and U.S. DoD public threat assessments.
        All information is from open/unclassified sources.
      </p>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SpaceDefensePage() {
  const [spaceForces, setSpaceForces] = useState<SpaceForce[]>([]);
  const [defensePrograms, setDefensePrograms] = useState<DefenseProgram[]>([]);
  const [recentContracts, setRecentContracts] = useState<ContractAward[]>([]);
  const [counterspaceEvents, setCounterspaceEvents] = useState<CounterspaceEvent[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [liveProcurement, setLiveProcurement] = useState<LiveProcurement[]>([]);
  const [defenseNews, setDefenseNews] = useState<DefenseNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('forces');
  const [programCategoryFilter, setProgramCategoryFilter] = useState<DefenseProgram['category'] | ''>('');
  const [threatTypeFilter, setThreatTypeFilter] = useState<CounterspaceEvent['type'] | ''>('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [forcesRes, programsRes, contractsRes, eventsRes, alliancesRes, procurementRes, newsRes] = await Promise.all([
          fetch('/api/content/space-defense?section=space-forces'),
          fetch('/api/content/space-defense?section=defense-programs'),
          fetch('/api/content/space-defense?section=recent-contracts'),
          fetch('/api/content/space-defense?section=counterspace-events'),
          fetch('/api/content/space-defense?section=alliances'),
          fetch('/api/content/space-defense?section=live-procurement'),
          fetch('/api/content/space-defense?section=defense-news'),
        ]);

        const [forcesJson, programsJson, contractsJson, eventsJson, alliancesJson, procurementJson, newsJson] = await Promise.all([
          forcesRes.json(),
          programsRes.json(),
          contractsRes.json(),
          eventsRes.json(),
          alliancesRes.json(),
          procurementRes.json(),
          newsRes.json(),
        ]);

        if (forcesJson.data) setSpaceForces(forcesJson.data);
        if (programsJson.data) setDefensePrograms(programsJson.data);
        if (contractsJson.data) setRecentContracts(contractsJson.data);
        if (eventsJson.data) setCounterspaceEvents(eventsJson.data);
        if (alliancesJson.data) setAlliances(alliancesJson.data);
        if (procurementJson.data) setLiveProcurement(procurementJson.data);
        if (newsJson.data) setDefenseNews(newsJson.data);

        // Use the most recent lastRefreshed from any section
        const timestamps = [
          forcesJson.meta?.lastRefreshed,
          programsJson.meta?.lastRefreshed,
          contractsJson.meta?.lastRefreshed,
          eventsJson.meta?.lastRefreshed,
          alliancesJson.meta?.lastRefreshed,
        ].filter(Boolean);
        if (timestamps.length > 0) {
          setRefreshedAt(timestamps.sort().reverse()[0]);
        }
      } catch (error) {
        console.error('Failed to fetch space defense data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredPrograms = programCategoryFilter
    ? defensePrograms.filter((p) => p.category === programCategoryFilter)
    : defensePrograms;

  const filteredEvents = threatTypeFilter
    ? counterspaceEvents.filter((e) => e.type === threatTypeFilter)
    : counterspaceEvents;

  const programCategories = Array.from(new Set(defensePrograms.map((p) => p.category)));
  const eventTypes = Array.from(new Set(counterspaceEvents.map((e) => e.type)));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Defense & National Security"
          subtitle="Open-source intelligence on military space organizations, programs, procurement, counterspace threats, and allied cooperation"
          icon="🛡️"
          accentColor="red"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {/* Hero Stats */}
        <HeroStats
          forceCount={spaceForces.length}
          programCount={defensePrograms.length}
          contractCount={recentContracts.length}
          allianceCount={alliances.length}
        />

        {/* Classification Disclaimer */}
        <div className="card p-4 border border-yellow-500/30 bg-yellow-900/10 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg flex-shrink-0">&#9888;</span>
            <div>
              <h4 className="text-yellow-400 font-semibold text-sm">UNCLASSIFIED / OPEN SOURCE INFORMATION ONLY</h4>
              <p className="text-star-400 text-xs mt-1">
                All information presented on this page is sourced exclusively from publicly available, unclassified sources
                including official government press releases, congressional budget justification documents, academic research,
                and reputable open-source intelligence publications (Secure World Foundation, CSIS, etc.).
                No classified or controlled unclassified information (CUI) is included.
                Budget figures are based on public budget requests and may differ from enacted appropriations.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setProgramCategoryFilter('');
                  setThreatTypeFilter('');
                }}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-nebula-500 text-nebula-300'
                    : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ──────────────── SPACE FORCES TAB ──────────────── */}
        {activeTab === 'forces' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Military Space Organizations Worldwide</h2>
              <p className="text-star-300 text-sm mb-6">
                Dedicated space forces and commands have proliferated since 2019, reflecting global recognition
                of space as a contested operational domain. The following organizations represent the primary
                military space commands with dedicated organizational structures.
              </p>
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {spaceForces.map((force) => (
                  <StaggerItem key={force.id}>
                    <SpaceForceCard force={force} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            {/* USSF Organizational Detail */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-4">U.S. Space Force Organizational Structure</h3>
              <p className="text-star-300 text-sm mb-4">
                The USSF is organized under the Department of the Air Force and structured around three
                field commands. Space Operations Command (SpOC) is responsible for operating space forces;
                Space Systems Command (SSC) handles acquisition and launch; and Space Training and Readiness
                Command (STARCOM) oversees training, testing, and doctrine development.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
                  <h4 className="text-nebula-400 font-semibold mb-2">Space Operations Command (SpOC)</h4>
                  <p className="text-star-400 text-sm">
                    Peterson SFB, CO. Operates the nation&apos;s military space forces including GPS, missile warning,
                    space surveillance, and satellite communications operations. Houses the Combined Space Operations
                    Center (CSpOC).
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
                  <h4 className="text-nebula-400 font-semibold mb-2">Space Systems Command (SSC)</h4>
                  <p className="text-star-400 text-sm">
                    Los Angeles AFB, CA. Responsible for developing, acquiring, and sustaining lethal and resilient
                    space capabilities. Manages NSSL, GPS, SBIRS/Next-Gen OPIR, WGS, AEHF/ESS, and other programs.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
                  <h4 className="text-nebula-400 font-semibold mb-2">Space Training & Readiness Command (STARCOM)</h4>
                  <p className="text-star-400 text-sm">
                    Peterson SFB, CO. Responsible for training, testing, and developing tactics, techniques, and
                    procedures for space operations. Operates the National Space Test and Training Complex.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── PROGRAMS TAB ──────────────── */}
        {activeTab === 'programs' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Major Defense Space Programs</h2>
              <p className="text-star-300 text-sm mb-6">
                The U.S. defense space enterprise encompasses hundreds of billions of dollars in satellite
                constellations, ground systems, and launch services. The following are the major publicly
                known programs across the Space Force, SDA, and NRO.
              </p>

              {/* Category Filters */}
              <div className="card p-4 border border-slate-700/50 bg-slate-800/50 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-star-400 text-sm mr-2">Filter by category:</span>
                  <button
                    onClick={() => setProgramCategoryFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      programCategoryFilter === ''
                        ? 'bg-nebula-500 text-slate-900'
                        : 'bg-slate-700 text-star-400 hover:bg-slate-600'
                    }`}
                  >
                    All ({defensePrograms.length})
                  </button>
                  {programCategories.map((cat) => {
                    const count = defensePrograms.filter((p) => p.category === cat).length;
                    const style = CATEGORY_STYLES[cat] || DEFAULT_CATEGORY_STYLE;
                    return (
                      <button
                        key={cat}
                        onClick={() => setProgramCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          programCategoryFilter === cat
                            ? `bg-nebula-500/20 ${style.color} border border-nebula-500/40`
                            : 'bg-slate-700 text-star-400 hover:bg-slate-600'
                        }`}
                      >
                        {style.label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </div>

            {/* SDA Architecture Explainer */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-4">Proliferated Warfighter Space Architecture (PWSA)</h3>
              <p className="text-star-300 text-sm mb-4">
                The Space Development Agency (SDA) is building the Proliferated Warfighter Space Architecture,
                a multi-layered constellation of hundreds of satellites in LEO designed for resilience through numbers.
                Unlike traditional exquisite military satellites, PWSA uses a &quot;spiral development&quot; model
                with new tranches every two years, incorporating commercial technology and manufacturing practices.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { layer: 'Transport Layer', purpose: 'Mesh networking and data transport', icon: '&#128752;' },
                  { layer: 'Tracking Layer', purpose: 'Missile warning and missile tracking', icon: '&#128269;' },
                  { layer: 'Custody Layer', purpose: 'Target custody for beyond-LOS fires', icon: '&#127919;' },
                  { layer: 'Deterrence Layer', purpose: 'Demonstration of capabilities', icon: '&#128737;' },
                ].map((layer) => (
                  <div key={layer.layer} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-center">
                    <span className="text-2xl block mb-2" dangerouslySetInnerHTML={{ __html: layer.icon }} />
                    <h4 className="text-nebula-400 font-semibold text-sm">{layer.layer}</h4>
                    <p className="text-star-400 text-xs mt-1">{layer.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── PROCUREMENT TAB ──────────────── */}
        {activeTab === 'procurement' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Recent Contract Awards & Procurement</h2>
              <p className="text-star-300 text-sm mb-6">
                Major defense space contract awards from FY2023-FY2025. Defense space procurement has
                seen a significant increase reflecting the urgency to modernize and expand military space
                capabilities in response to peer competitor developments.
              </p>

              {/* Budget Trends */}
              <SpendingTrends />

              {/* Contract Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {recentContracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} />
                ))}
              </div>
            </div>

            {/* Live SAM.gov Solicitations */}
            {liveProcurement.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Active Solicitations & Opportunities</h2>
                <p className="text-star-300 text-sm mb-6">
                  Live defense space opportunities from SAM.gov, updated daily at 6:00 AM UTC.
                  Filtered for DoD/Space Force/DARPA agencies with space-related NAICS codes.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {liveProcurement.map((opp) => {
                    const typeStyles: Record<string, { label: string; color: string; bg: string }> = {
                      solicitation: { label: 'Solicitation', color: 'text-blue-400', bg: 'bg-blue-900/20' },
                      presolicitation: { label: 'Pre-Solicitation', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
                      award: { label: 'Award', color: 'text-green-400', bg: 'bg-green-900/20' },
                      sources_sought: { label: 'Sources Sought', color: 'text-purple-400', bg: 'bg-purple-900/20' },
                      special_notice: { label: 'Special Notice', color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
                    };
                    const typeStyle = typeStyles[opp.type || 'solicitation'] || typeStyles.solicitation;

                    return (
                      <div key={opp.id} className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-white font-semibold text-sm line-clamp-2">{opp.title}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${typeStyle.bg} ${typeStyle.color}`}>
                            {typeStyle.label}
                          </span>
                        </div>
                        <div className="space-y-1 mb-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-star-400 min-w-[60px]">Agency:</span>
                            <span className="text-star-200 truncate">{opp.agency}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-star-400 min-w-[60px]">Value:</span>
                            <span className="text-green-400 font-medium">{opp.value}</span>
                          </div>
                          {opp.period && (
                            <div className="flex items-center gap-2">
                              <span className="text-star-400 min-w-[60px]">Deadline:</span>
                              <span className="text-yellow-400">{opp.period}</span>
                            </div>
                          )}
                          {opp.naicsDescription && (
                            <div className="flex items-center gap-2">
                              <span className="text-star-400 min-w-[60px]">NAICS:</span>
                              <span className="text-star-300">{opp.naicsDescription}</span>
                            </div>
                          )}
                        </div>
                        {opp.description && (
                          <p className="text-star-400 text-xs line-clamp-2 mb-2">{opp.description}</p>
                        )}
                        {opp.samUrl && (
                          <a
                            href={opp.samUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
                          >
                            View on SAM.gov
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Defense News */}
            {defenseNews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Recent Defense & Security News</h2>
                <p className="text-star-300 text-sm mb-4">
                  Latest news articles related to space defense and national security.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {defenseNews.slice(0, 9).map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all group"
                    >
                      <h4 className="text-white text-sm font-semibold group-hover:text-nebula-300 transition-colors line-clamp-2 mb-2">
                        {article.title}
                      </h4>
                      {article.summary && (
                        <p className="text-star-400 text-xs line-clamp-2 mb-2">{article.summary}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-star-500">
                        <span>{article.source}</span>
                        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* SBIR/STTR Note */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-3">SBIR/STTR Opportunities in Space Defense</h3>
              <p className="text-star-300 text-sm mb-3">
                The Space Force and SDA actively use the Small Business Innovation Research (SBIR) and
                Small Business Technology Transfer (STTR) programs to fund innovative space technologies
                from small businesses. Key topic areas include:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  'Resilient satellite bus technologies',
                  'Optical inter-satellite link components',
                  'On-orbit servicing capabilities',
                  'Space domain awareness sensors',
                  'Anti-jam communication waveforms',
                  'Radiation-hardened electronics',
                  'Autonomous satellite operations (AI/ML)',
                  'Additive manufacturing for space',
                  'Cybersecurity for space systems',
                ].map((topic) => (
                  <div key={topic} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-nebula-500 mt-1.5 flex-shrink-0" />
                    <span className="text-star-300 text-sm">{topic}</span>
                  </div>
                ))}
              </div>
              <p className="text-star-500 text-xs mt-4">
                Visit SAM.gov and the SBIR.gov portal for current solicitations. SpaceWERX (the USSF
                innovation arm) also manages Orbital Prime and other programs for space technology development.
              </p>
            </div>
          </div>
        )}

        {/* ──────────────── THREAT ASSESSMENT TAB ──────────────── */}
        {activeTab === 'threats' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Counterspace Threat Assessment</h2>
              <p className="text-star-300 text-sm mb-6">
                Based exclusively on open-source intelligence (OSINT) from the Secure World Foundation&apos;s
                Global Counterspace Capabilities report, CSIS Aerospace Security Project, and publicly released
                U.S. government threat assessments. This section catalogs known counterspace events and assessed
                capabilities by nation.
              </p>

              {/* Threat Overview */}
              <ThreatSummary />

              {/* Event Type Filters */}
              <div className="card p-4 border border-slate-700/50 bg-slate-800/50 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-star-400 text-sm mr-2">Filter events:</span>
                  <button
                    onClick={() => setThreatTypeFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      threatTypeFilter === ''
                        ? 'bg-nebula-500 text-slate-900'
                        : 'bg-slate-700 text-star-400 hover:bg-slate-600'
                    }`}
                  >
                    All ({counterspaceEvents.length})
                  </button>
                  {eventTypes.map((type) => {
                    const count = counterspaceEvents.filter((e) => e.type === type).length;
                    const style = EVENT_TYPE_STYLES[type] || DEFAULT_EVENT_TYPE_STYLE;
                    return (
                      <button
                        key={type}
                        onClick={() => setThreatTypeFilter(type)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          threatTypeFilter === type
                            ? `${style.bg} ${style.color} border border-slate-600`
                            : 'bg-slate-700 text-star-400 hover:bg-slate-600'
                        }`}
                      >
                        {style.label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Timeline */}
              <h3 className="text-white font-bold mb-4">Counterspace Event Timeline</h3>
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <ThreatEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>

            {/* Source Note */}
            <div className="card p-6 border-dashed border border-slate-700/50">
              <h3 className="text-white font-semibold mb-2">Sources & Methodology</h3>
              <p className="text-star-400 text-sm mb-3">
                This threat assessment is compiled exclusively from open-source materials:
              </p>
              <ul className="space-y-1.5">
                {[
                  'Secure World Foundation -- "Global Counterspace Capabilities: An Open Source Assessment" (annual)',
                  'Center for Strategic and International Studies (CSIS) -- Aerospace Security Project',
                  'U.S. Director of National Intelligence -- Annual Threat Assessment',
                  'U.S. Space Command -- Public statements and press releases',
                  'Defense Intelligence Agency -- "Challenges to Security in Space" (2022)',
                  'Congressional Research Service -- Reports on space security',
                  'Verified tracking data from 18th Space Defense Squadron (public catalog)',
                ].map((source) => (
                  <li key={source} className="text-star-300 text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-star-400 mt-1.5 flex-shrink-0" />
                    {source}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ──────────────── ALLIANCES TAB ──────────────── */}
        {activeTab === 'alliances' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Space Defense Alliances & Cooperation</h2>
              <p className="text-star-300 text-sm mb-6">
                International space defense cooperation has expanded significantly since 2019, with
                multilateral frameworks enabling shared space domain awareness, combined operations,
                and technology cooperation among allied nations.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {alliances.map((alliance) => (
                  <AllianceCard key={alliance.id} alliance={alliance} />
                ))}
              </div>
            </div>

            {/* Data Sharing Frameworks */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-4">Key Data Sharing Frameworks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    name: 'SSA Sharing Agreements',
                    description: 'The U.S. has over 200 SSA sharing agreements with commercial and government entities worldwide, providing conjunction warnings and tracking data through Space-Track.org.',
                    partners: '200+ entities globally',
                  },
                  {
                    name: 'Operation Olympic Defender',
                    description: 'A multinational coalition focused on deterring hostile actions in space through shared domain awareness, combined operations, and coordinated messaging.',
                    partners: 'US, UK, Australia, Canada, France, Germany',
                  },
                  {
                    name: 'Allied Ground Surveillance Sharing',
                    description: 'Bilateral and multilateral agreements for sharing space surveillance sensor data from ground-based radars, telescopes, and other SDA assets.',
                    partners: 'CSpO nations + additional partners',
                  },
                  {
                    name: 'Space-Track.org (Public Catalog)',
                    description: 'The 18th Space Defense Squadron maintains the publicly accessible space object catalog, sharing orbital data with registered users worldwide for collision avoidance and space safety.',
                    partners: 'Open to registered users globally',
                  },
                ].map((framework) => (
                  <div key={framework.name} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
                    <h4 className="text-nebula-400 font-semibold mb-2">{framework.name}</h4>
                    <p className="text-star-400 text-sm mb-2">{framework.description}</p>
                    <span className="text-star-500 text-xs">Partners: {framework.partners}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allied Capability Comparison */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-4">Allied Space Capability Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-3 text-star-400 font-medium">Nation</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">ISR</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">SATCOM</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">PNT</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">SDA</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">Launch</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">Missile Warning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { nation: 'United States', isr: 'full', satcom: 'full', pnt: 'full', sda: 'full', launch: 'full', mw: 'full' },
                      { nation: 'China', isr: 'full', satcom: 'full', pnt: 'full', sda: 'high', launch: 'full', mw: 'high' },
                      { nation: 'Russia', isr: 'high', satcom: 'high', pnt: 'full', sda: 'medium', launch: 'full', mw: 'high' },
                      { nation: 'France', isr: 'high', satcom: 'high', pnt: 'partial', sda: 'medium', launch: 'full', mw: 'limited' },
                      { nation: 'United Kingdom', isr: 'medium', satcom: 'high', pnt: 'partial', sda: 'medium', launch: 'developing', mw: 'none' },
                      { nation: 'Japan', isr: 'high', satcom: 'medium', pnt: 'partial', sda: 'medium', launch: 'full', mw: 'limited' },
                      { nation: 'India', isr: 'medium', satcom: 'medium', pnt: 'regional', sda: 'developing', launch: 'full', mw: 'developing' },
                      { nation: 'Germany', isr: 'high', satcom: 'medium', pnt: 'partial', sda: 'medium', launch: 'none', mw: 'none' },
                      { nation: 'Australia', isr: 'limited', satcom: 'limited', pnt: 'none', sda: 'medium', launch: 'developing', mw: 'none' },
                    ].map((row) => {
                      const capStyles: Record<string, string> = {
                        full: 'text-green-400',
                        high: 'text-blue-400',
                        medium: 'text-yellow-400',
                        regional: 'text-yellow-400',
                        partial: 'text-orange-400',
                        limited: 'text-orange-400',
                        developing: 'text-purple-400',
                        none: 'text-slate-600',
                      };
                      return (
                        <tr key={row.nation} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-white font-medium">{row.nation}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.isr]}`}>{row.isr}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.satcom]}`}>{row.satcom}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.pnt]}`}>{row.pnt}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.sda]}`}>{row.sda}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.launch]}`}>{row.launch}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.mw]}`}>{row.mw}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-star-400">
                <span><span className="text-green-400 font-medium">Full</span> = Comprehensive indigenous capability</span>
                <span><span className="text-blue-400 font-medium">High</span> = Significant capability</span>
                <span><span className="text-yellow-400 font-medium">Medium</span> = Moderate capability</span>
                <span><span className="text-orange-400 font-medium">Limited/Partial</span> = Emerging or dependent</span>
                <span><span className="text-purple-400 font-medium">Developing</span> = Under development</span>
                <span><span className="text-slate-600 font-medium">None</span> = No known capability</span>
              </div>
              <p className="text-star-500 text-xs mt-3">
                Capability assessments are approximate and based on publicly available information.
                ISR = Intelligence, Surveillance, Reconnaissance. PNT = Position, Navigation, Timing.
                SDA = Space Domain Awareness. Missile Warning = Overhead persistent infrared / early warning.
              </p>
            </div>
          </div>
        )}

        {/* Footer Disclaimer */}
        <ScrollReveal>
        <div className="card p-6 mt-8 border-dashed border border-slate-700/50">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">About This Module</h3>
            <p className="text-star-400 text-sm max-w-3xl mx-auto">
              All information on this page is compiled exclusively from publicly available, unclassified sources
              including official government publications, congressional budget documents, academic research, and
              established open-source intelligence organizations. This module is intended for educational and
              industry awareness purposes. Budget figures represent requested amounts unless otherwise noted
              and may differ from final enacted appropriations. Capability assessments represent best
              available open-source analysis and should not be considered authoritative intelligence assessments.
            </p>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
