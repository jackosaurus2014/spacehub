'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface ArtemisMission {
  id: string;
  name: string;
  date: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'planned';
  vehicle: string;
  hls?: string;
  crew?: number;
  objectives: string[];
  internationalContributions?: string[];
  description: string;
}

interface CLPSMission {
  id: string;
  name: string;
  company: string;
  lander: string;
  launchDate: string;
  landingSite?: string;
  status: 'success' | 'partial-success' | 'failure' | 'in-transit' | 'upcoming' | 'planned';
  payloads: string[];
  result?: string;
  contractValue?: string;
  description: string;
}

interface ISRUProgram {
  id: string;
  name: string;
  organization: string;
  category: 'water-ice' | 'oxygen' | 'regolith' | 'metals' | 'propellant' | 'prospecting';
  trl: number;
  status: 'active' | 'completed' | 'cancelled' | 'planned';
  description: string;
  keyMilestones?: string[];
  targetDate?: string;
}

interface InfrastructureElement {
  id: string;
  name: string;
  category: 'gateway' | 'communications' | 'power' | 'surface' | 'transport';
  developer: string;
  status: 'operational' | 'under-construction' | 'development' | 'design' | 'concept';
  description: string;
  timeline?: string;
  cost?: string;
  partners?: string[];
}

interface LunarInvestment {
  id: string;
  program: string;
  organization: string;
  type: 'government' | 'commercial' | 'international';
  amount: string;
  amountNum: number;
  period: string;
  category: string;
  description: string;
}

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

interface GatewayArtemisMission {
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
// Data: Fetched from /api/content/cislunar
// ────────────────────────────────────────

let ARTEMIS_MISSIONS: ArtemisMission[] = [];
let CLPS_MISSIONS: CLPSMission[] = [];
let ISRU_PROGRAMS: ISRUProgram[] = [];
let INFRASTRUCTURE: InfrastructureElement[] = [];
let INVESTMENTS: LunarInvestment[] = [];
let GATEWAY_MODULES: GatewayModule[] = [];
let GATEWAY_ARTEMIS_MISSIONS: GatewayArtemisMission[] = [];
let INTERNATIONAL_PARTNERS: InternationalPartner[] = [];



// ────────────────────────────────────────
// Status Styles
// ────────────────────────────────────────

const ARTEMIS_STATUS_STYLES: Record<ArtemisMission['status'], { label: string; color: string; bg: string; border: string }> = {
  'completed': { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
  'in-progress': { label: 'In Progress', color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
  'upcoming': { label: 'Upcoming', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
  'planned': { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
};

const CLPS_STATUS_STYLES: Record<CLPSMission['status'], { label: string; color: string; bg: string }> = {
  'success': { label: 'Success', color: 'text-green-400', bg: 'bg-green-900/20' },
  'partial-success': { label: 'Partial Success', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  'failure': { label: 'Failed', color: 'text-red-400', bg: 'bg-red-900/20' },
  'in-transit': { label: 'In Transit', color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
  'upcoming': { label: 'Upcoming', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  'planned': { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/20' },
};

const ISRU_STATUS_STYLES: Record<ISRUProgram['status'], { label: string; color: string; bg: string }> = {
  'active': { label: 'Active', color: 'text-green-400', bg: 'bg-green-900/20' },
  'completed': { label: 'Completed', color: 'text-blue-400', bg: 'bg-blue-900/20' },
  'cancelled': { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-900/20' },
  'planned': { label: 'Planned', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
};

const INFRA_STATUS_STYLES: Record<InfrastructureElement['status'], { label: string; color: string; bg: string }> = {
  'operational': { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/20' },
  'under-construction': { label: 'Under Construction', color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
  'development': { label: 'In Development', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  'design': { label: 'Design Phase', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  'concept': { label: 'Concept', color: 'text-purple-400', bg: 'bg-purple-900/20' },
};

const ISRU_CATEGORY_STYLES: Record<ISRUProgram['category'], { label: string; icon: string }> = {
  'water-ice': { label: 'Water Ice', icon: '🧊' },
  'oxygen': { label: 'Oxygen Production', icon: '💨' },
  'regolith': { label: 'Regolith Processing', icon: '🪨' },
  'metals': { label: 'Metal Extraction', icon: '🔩' },
  'propellant': { label: 'Propellant Production', icon: '⛽' },
  'prospecting': { label: 'Resource Prospecting', icon: '🔍' },
};

const INFRA_CATEGORY_STYLES: Record<InfrastructureElement['category'], { label: string; icon: string }> = {
  'gateway': { label: 'Lunar Gateway', icon: '🛰️' },
  'communications': { label: 'Communications', icon: '📡' },
  'power': { label: 'Power Systems', icon: '⚡' },
  'surface': { label: 'Surface Systems', icon: '🏗️' },
  'transport': { label: 'Transportation', icon: '🚀' },
};

const GATEWAY_MODULE_STATUS_STYLES: Record<GatewayModule['status'], { label: string; color: string; bg: string }> = {
  integration: { label: 'Integration Testing', color: 'text-green-400', bg: 'bg-green-900/30' },
  construction: { label: 'Under Construction', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  manufacturing: { label: 'Design/Manufacturing', color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  design: { label: 'Design Phase', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  development: { label: 'Development', color: 'text-orange-400', bg: 'bg-orange-900/30' },
  study: { label: 'Under Study', color: 'text-purple-400', bg: 'bg-purple-900/30' },
};

const GATEWAY_MISSION_STATUS_STYLES: Record<GatewayArtemisMission['status'], { label: string; color: string; bg: string; border: string }> = {
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
  upcoming: { label: 'Upcoming', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
  planned: { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
};

// ────────────────────────────────────────
// TRL Bar Component
// ────────────────────────────────────────

function TRLBar({ trl }: { trl: number }) {
  const getColor = (level: number) => {
    if (level <= 3) return 'bg-red-500';
    if (level <= 5) return 'bg-yellow-500';
    if (level <= 7) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-star-400 text-xs min-w-[52px]">TRL {trl}/9</span>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm ${i < trl ? getColor(trl) : 'bg-slate-700/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Hero Stats
// ────────────────────────────────────────

function HeroStats() {
  const stats = [
    { label: 'Artemis Missions', value: '6+', icon: '🚀', sub: 'Planned through 2030s' },
    { label: 'CLPS Deliveries', value: `${CLPS_MISSIONS.length}`, icon: '🌙', sub: 'Missions awarded' },
    { label: 'Cislunar Investment', value: '$93B+', icon: '💰', sub: 'NASA Artemis total' },
    { label: 'Accords Signatories', value: '43', icon: '🌐', sub: 'Nations as of 2025' },
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

// ────────────────────────────────────────
// Tab 1: Artemis Program
// ────────────────────────────────────────

function ArtemisTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* SLS/Orion Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🚀</span>
          SLS & Orion Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
            <h3 className="text-white font-semibold mb-2">Space Launch System (SLS)</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-star-400">Configuration:</span>
                <span className="text-star-200">Block 1 (Artemis I-III) / Block 1B (IV+)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">LEO Payload (Block 1):</span>
                <span className="text-star-200">95 metric tons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">TLI Payload (Block 1B):</span>
                <span className="text-star-200">38+ metric tons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Prime Contractor:</span>
                <span className="text-star-200">Boeing (core stage)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Engines:</span>
                <span className="text-star-200">4x RS-25 + 2x SRBs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Flights to Date:</span>
                <span className="text-green-400 font-semibold">1 (Artemis I)</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
            <h3 className="text-white font-semibold mb-2">Orion MPCV</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-star-400">Crew Capacity:</span>
                <span className="text-star-200">4 astronauts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Mission Duration:</span>
                <span className="text-star-200">Up to 21 days (free-flying)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Crew Module:</span>
                <span className="text-star-200">Lockheed Martin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Service Module:</span>
                <span className="text-star-200">Airbus (ESA contribution)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Heat Shield:</span>
                <span className="text-star-200">AVCOAT (5,000 deg F capable)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Status:</span>
                <span className="text-green-400 font-semibold">Flight proven</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HLS Status */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🛬</span>
          Human Landing Systems
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-900/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-400">In Development</span>
              <span className="text-white font-semibold">SpaceX Starship HLS</span>
            </div>
            <p className="text-star-300 text-sm mb-3">
              Modified Starship for Artemis III and IV. Requires orbital refueling via tanker flights. Features high-mounted crew cabin, elevator for surface access. Iterative flight test program ongoing from Starbase, Texas.
            </p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-star-400">Contract:</span>
                <span className="text-green-400">$4.04B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">First Use:</span>
                <span className="text-star-200">Artemis III (NET mid-2026)</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-900/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-900/30 text-blue-400">In Development</span>
              <span className="text-white font-semibold">Blue Origin Blue Moon Mk2</span>
            </div>
            <p className="text-star-300 text-sm mb-3">
              Single-stage lander using BE-7 LOX/LH2 engine. National Team with Lockheed Martin, Draper, Boeing, Astrobotic, Honeybee Robotics. Does not require orbital refueling.
            </p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-star-400">Contract:</span>
                <span className="text-green-400">$3.4B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">First Use:</span>
                <span className="text-star-200">Artemis V (NET 2030)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Timeline */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📅</span>
          Artemis Mission Timeline
        </h2>
        <div className="relative">
          <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500 opacity-30" />
          <div className="space-y-6">
            {ARTEMIS_MISSIONS.map((mission) => {
              const style = ARTEMIS_STATUS_STYLES[mission.status];
              const isExpanded = expandedId === mission.id;
              return (
                <div key={mission.id} className="relative pl-12">
                  <div className={`absolute left-2.5 top-2 w-4 h-4 rounded-full border-2 ${
                    mission.status === 'completed'
                      ? 'bg-green-500 border-green-400'
                      : mission.status === 'upcoming'
                        ? 'bg-yellow-500 border-yellow-400 animate-pulse'
                        : mission.status === 'in-progress'
                          ? 'bg-cyan-500 border-cyan-400 animate-pulse'
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
                    <div className="flex flex-wrap gap-4 text-sm mb-3">
                      <span className="text-star-400">
                        Vehicle: <span className="text-star-200">{mission.vehicle}</span>
                      </span>
                      {mission.hls && (
                        <span className="text-star-400">
                          HLS: <span className="text-star-200">{mission.hls}</span>
                        </span>
                      )}
                      {mission.crew !== undefined && (
                        <span className="text-star-400">
                          Crew: <span className="text-star-200">{mission.crew === 0 ? 'Uncrewed' : `${mission.crew} astronauts`}</span>
                        </span>
                      )}
                    </div>
                    <div className="mb-3">
                      <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Objectives</div>
                      <ul className="space-y-1">
                        {mission.objectives.map((obj) => (
                          <li key={obj} className="text-star-300 text-sm flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-nebula-500 mt-2 flex-shrink-0" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {mission.internationalContributions && mission.internationalContributions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {mission.internationalContributions.map((contrib) => (
                          <span key={contrib} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">
                            {contrib}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                      className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {isExpanded ? 'Show less' : 'Read full details'}
                    </button>
                    {isExpanded && (
                      <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
                        {mission.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 2: Commercial Lunar
// ────────────────────────────────────────

function CommercialLunarTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const companies = Array.from(new Set(CLPS_MISSIONS.map((m) => m.company))).sort();
  const statuses = Array.from(new Set(CLPS_MISSIONS.map((m) => m.status)));

  const filtered = CLPS_MISSIONS.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (companyFilter !== 'all' && m.company !== companyFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{CLPS_STATUS_STYLES[s].label}</option>
          ))}
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-star-400 text-sm self-center ml-2">
          {filtered.length} mission{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* CLPS Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📋</span>
          CLPS Program Overview
        </h2>
        <p className="text-star-300 text-sm leading-relaxed">
          NASA&apos;s Commercial Lunar Payload Services (CLPS) initiative allows the agency to buy lunar delivery as a commercial service
          rather than building and operating its own landers. Fourteen companies are certified as CLPS vendors, competing for task orders
          to deliver NASA instruments and technology demonstrations to the lunar surface. The program embraces a &ldquo;shoot for the Moon&rdquo;
          philosophy, accepting higher risk in exchange for faster, more affordable access to the Moon. Total CLPS funding exceeds $2.6 billion
          across all awarded task orders.
        </p>
      </div>

      {/* Mission Cards */}
      <div className="space-y-4">
        {filtered.map((mission) => {
          const style = CLPS_STATUS_STYLES[mission.status];
          const isExpanded = expandedId === mission.id;
          return (
            <div
              key={mission.id}
              className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-lg">{mission.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.bg} ${style.color}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-star-400">
                    <span>Company: <span className="text-star-200">{mission.company}</span></span>
                    <span>Lander: <span className="text-star-200">{mission.lander}</span></span>
                    <span>Launch: <span className="text-star-200 font-mono">{mission.launchDate}</span></span>
                  </div>
                </div>
                {mission.contractValue && (
                  <span className="text-green-400 font-semibold text-sm">{mission.contractValue}</span>
                )}
              </div>

              {mission.landingSite && (
                <div className="text-sm mb-2">
                  <span className="text-star-400">Landing Site: </span>
                  <span className="text-star-200">{mission.landingSite}</span>
                </div>
              )}

              {/* Payloads */}
              <div className="mb-3">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Payloads</div>
                <div className="flex flex-wrap gap-1.5">
                  {mission.payloads.slice(0, isExpanded ? undefined : 4).map((payload) => (
                    <span
                      key={payload}
                      className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium"
                    >
                      {payload}
                    </span>
                  ))}
                  {!isExpanded && mission.payloads.length > 4 && (
                    <span className="px-2 py-0.5 bg-slate-700/50 text-star-400 rounded text-xs">
                      +{mission.payloads.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Result */}
              {mission.result && (
                <div className={`rounded-lg p-3 text-sm mb-3 ${
                  mission.status === 'failure' ? 'bg-red-900/10 border border-red-500/20' :
                  mission.status === 'partial-success' ? 'bg-yellow-900/10 border border-yellow-500/20' :
                  'bg-slate-900/40 border border-slate-700/50'
                }`}>
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Result</div>
                  <p className="text-star-300 text-sm leading-relaxed">{mission.result}</p>
                </div>
              )}

              <button
                onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {isExpanded ? 'Show less' : 'Show full details'}
              </button>
              {isExpanded && (
                <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
                  {mission.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 3: ISRU & Resources
// ────────────────────────────────────────

function ISRUTab() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const categories = Array.from(new Set(ISRU_PROGRAMS.map((p) => p.category)));

  const filtered = ISRU_PROGRAMS.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🏭</span>
          Lunar ISRU Overview
        </h2>
        <p className="text-star-300 leading-relaxed mb-4">
          In-Situ Resource Utilization (ISRU) is the practice of harvesting, processing, and using materials found at the destination
          rather than launching everything from Earth. For the Moon, ISRU focuses on extracting water ice from permanently shadowed
          craters, producing oxygen from regolith, and eventually manufacturing propellant, construction materials, and metals. Successful
          ISRU would transform the economics of lunar exploration by reducing the mass that must be launched from Earth -- water alone
          could provide drinking water, breathable oxygen, and hydrogen/oxygen rocket propellant.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-center">
            <div className="text-2xl mb-1">🧊</div>
            <div className="text-white font-semibold text-sm">Water Ice</div>
            <div className="text-star-400 text-xs">600M+ metric tons (est.)</div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-center">
            <div className="text-2xl mb-1">💨</div>
            <div className="text-white font-semibold text-sm">Oxygen</div>
            <div className="text-star-400 text-xs">43% of regolith by weight</div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-center">
            <div className="text-2xl mb-1">🔩</div>
            <div className="text-white font-semibold text-sm">Metals</div>
            <div className="text-star-400 text-xs">Iron, titanium, aluminum</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{ISRU_CATEGORY_STYLES[c].icon} {ISRU_CATEGORY_STYLES[c].label}</option>
          ))}
        </select>
        <span className="text-star-400 text-sm self-center ml-2">
          {filtered.length} program{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ISRU Program Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((program) => {
          const catStyle = ISRU_CATEGORY_STYLES[program.category];
          const statusStyle = ISRU_STATUS_STYLES[program.status];
          return (
            <div
              key={program.id}
              className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catStyle.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold">{program.name}</h3>
                    <span className="text-star-400 text-xs">{program.organization}</span>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>

              <p className="text-star-300 text-sm leading-relaxed mb-3">{program.description}</p>

              {/* TRL */}
              <div className="mb-3">
                <TRLBar trl={program.trl} />
              </div>

              {/* Milestones */}
              {program.keyMilestones && program.keyMilestones.length > 0 && (
                <div className="mb-2">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Key Milestones</div>
                  <ul className="space-y-1">
                    {program.keyMilestones.map((milestone) => (
                      <li key={milestone} className="text-star-300 text-xs flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-nebula-500 mt-1.5 flex-shrink-0" />
                        {milestone}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {program.targetDate && (
                <div className="text-sm mt-2 pt-2 border-t border-slate-700/50">
                  <span className="text-star-400">Target: </span>
                  <span className="text-star-200 font-mono">{program.targetDate}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 4: Infrastructure
// ────────────────────────────────────────

function InfrastructureTab() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const categories = Array.from(new Set(INFRASTRUCTURE.map((i) => i.category)));

  const filtered = INFRASTRUCTURE.filter((i) => {
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{INFRA_CATEGORY_STYLES[c].icon} {INFRA_CATEGORY_STYLES[c].label}</option>
          ))}
        </select>
        <span className="text-star-400 text-sm self-center ml-2">
          {filtered.length} element{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Infrastructure Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const catStyle = INFRA_CATEGORY_STYLES[item.category];
          const statusStyle = INFRA_STATUS_STYLES[item.status];
          return (
            <div
              key={item.id}
              className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catStyle.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold">{item.name}</h3>
                    <span className="text-star-400 text-xs">{item.developer}</span>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>

              <p className="text-star-300 text-sm leading-relaxed mb-3">{item.description}</p>

              <div className="space-y-2 text-sm">
                {item.timeline && (
                  <div className="flex items-start gap-2">
                    <span className="text-star-400 min-w-[70px]">Timeline:</span>
                    <span className="text-star-200">{item.timeline}</span>
                  </div>
                )}
                {item.cost && (
                  <div className="flex items-start gap-2">
                    <span className="text-star-400 min-w-[70px]">Cost:</span>
                    <span className="text-green-400">{item.cost}</span>
                  </div>
                )}
              </div>

              {item.partners && item.partners.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-700/50">
                  {item.partners.map((partner) => (
                    <span key={partner} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">
                      {partner}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 5: Investment
// ────────────────────────────────────────

function InvestmentTab() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const types = Array.from(new Set(INVESTMENTS.map((i) => i.type)));

  const filtered = INVESTMENTS.filter((i) => {
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    return true;
  });

  const typeLabels: Record<string, string> = {
    government: 'Government (NASA)',
    commercial: 'Commercial',
    international: 'International',
  };

  // Summary stats
  const govTotal = INVESTMENTS.filter((i) => i.type === 'government').reduce((sum, i) => sum + i.amountNum, 0);
  const intlTotal = INVESTMENTS.filter((i) => i.type === 'international').reduce((sum, i) => sum + i.amountNum, 0);
  const commercialCount = INVESTMENTS.filter((i) => i.type === 'commercial').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇺🇸</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">NASA / US Government</div>
              <div className="text-white font-bold text-xl">${(govTotal / 1000).toFixed(0)}B+</div>
              <div className="text-star-400 text-xs">Artemis program total</div>
            </div>
          </div>
        </div>
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">International Partners</div>
              <div className="text-white font-bold text-xl">${(intlTotal / 1000).toFixed(1)}B+</div>
              <div className="text-star-400 text-xs">ESA, JAXA, ISRO, KARI combined</div>
            </div>
          </div>
        </div>
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">Commercial Players</div>
              <div className="text-white font-bold text-xl">{commercialCount}+ Companies</div>
              <div className="text-star-400 text-xs">Public & private lunar ventures</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{typeLabels[t] || t}</option>
          ))}
        </select>
        <span className="text-star-400 text-sm self-center ml-2">
          {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Investment Cards */}
      <div className="space-y-4">
        {filtered.map((investment) => {
          const typeBg =
            investment.type === 'government'
              ? 'border-l-blue-500'
              : investment.type === 'commercial'
                ? 'border-l-green-500'
                : 'border-l-purple-500';

          return (
            <div
              key={investment.id}
              className={`card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur border-l-4 ${typeBg} hover:border-nebula-500/40 transition-all`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-white font-semibold text-lg">{investment.program}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-star-400">
                    <span>{investment.organization}</span>
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs">{investment.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold text-lg">{investment.amount}</div>
                  <div className="text-star-400 text-xs">{investment.period}</div>
                </div>
              </div>
              <p className="text-star-300 text-sm leading-relaxed">{investment.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 6: Gateway
// ────────────────────────────────────────

function GatewayModuleCard({ module }: { module: GatewayModule }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = GATEWAY_MODULE_STATUS_STYLES[module.status];

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

function GatewayTab() {
  const [gatewaySubTab, setGatewaySubTab] = useState<'overview' | 'modules' | 'timeline' | 'partners' | 'orbit'>('overview');

  const subTabs: { id: typeof gatewaySubTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🏗️' },
    { id: 'modules', label: 'Modules', icon: '🛰️' },
    { id: 'timeline', label: 'Artemis Timeline', icon: '🚀' },
    { id: 'partners', label: 'Partners', icon: '🤝' },
    { id: 'orbit', label: 'NRHO Orbit', icon: '🌑' },
  ];

  const gatewayHeroStats = [
    { label: 'Modules Planned', value: '6+', icon: '🛰️', sub: 'Core station elements' },
    { label: 'Partner Nations', value: '4', icon: '🌐', sub: 'International collaboration' },
    { label: 'Program Cost', value: '~$7.8B', icon: '💰', sub: 'NASA Gateway contracts' },
    { label: 'First Crew Visit', value: '2028', icon: '👨‍🚀', sub: 'Artemis IV target' },
  ];

  const orbitFacts = [
    { label: 'Orbit Period', value: '~6.5 days', detail: 'One complete orbit around the Moon' },
    { label: 'Closest Approach', value: '~3,000 km', detail: 'Periapsis (nearest point to Moon)' },
    { label: 'Farthest Distance', value: '~70,000 km', detail: 'Apoapsis (farthest point from Moon)' },
  ];

  const orbitBenefits = [
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

  const commercialOpportunities = [
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
    <div className="space-y-6">
      {/* Gateway Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gatewayHeroStats.map((stat) => (
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

      {/* Sub-tab Navigation */}
      <div className="border-b border-slate-700/50">
        <div className="flex gap-1 overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setGatewaySubTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                gatewaySubTab === tab.id
                  ? 'border-nebula-500 text-nebula-300'
                  : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Sub-tab */}
      {gatewaySubTab === 'overview' && (
        <div className="space-y-8">
          {/* Gateway Overview */}
          <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
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

          {/* Quick module overview */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🛰️</span>
              Gateway Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {GATEWAY_MODULES.map((module) => (
                <GatewayModuleCard key={module.id} module={module} />
              ))}
            </div>
          </div>

          {/* Commercial Opportunities */}
          <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">💼</span>
              Commercial Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {commercialOpportunities.map((opp) => (
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

          {/* NRHO Explainer */}
          <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {orbitFacts.map((fact) => (
                <div key={fact.label} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-center">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">{fact.label}</div>
                  <div className="text-white font-bold text-2xl mb-1">{fact.value}</div>
                  <div className="text-star-400 text-xs">{fact.detail}</div>
                </div>
              ))}
            </div>
            <h3 className="text-white font-semibold mb-3">Key Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {orbitBenefits.map((benefit) => (
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
        </div>
      )}

      {/* Modules Sub-tab */}
      {gatewaySubTab === 'modules' && (
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
                const style = GATEWAY_MODULE_STATUS_STYLES[module.status];
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
              <GatewayModuleCard key={module.id} module={module} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline Sub-tab */}
      {gatewaySubTab === 'timeline' && (
        <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🚀</span>
            Artemis Mission Timeline
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500 opacity-30" />

            <div className="space-y-6">
              {GATEWAY_ARTEMIS_MISSIONS.map((mission) => {
                const style = GATEWAY_MISSION_STATUS_STYLES[mission.status];
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
      )}

      {/* Partners Sub-tab */}
      {gatewaySubTab === 'partners' && (
        <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
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
      )}

      {/* Orbit Sub-tab */}
      {gatewaySubTab === 'orbit' && (
        <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
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
            {orbitBenefits.map((benefit) => (
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
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Tabs Configuration
// ────────────────────────────────────────

type TabId = 'artemis' | 'commercial' | 'isru' | 'infrastructure' | 'investment' | 'gateway';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'artemis', label: 'Artemis Program', icon: '🚀' },
  { id: 'commercial', label: 'Commercial Lunar', icon: '🌙' },
  { id: 'isru', label: 'ISRU & Resources', icon: '🏭' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🛰️' },
  { id: 'investment', label: 'Investment', icon: '💰' },
  { id: 'gateway', label: 'Gateway', icon: '🏗️' },
];

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

function CislunarEcosystemContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const validTabs = TABS.map((t) => t.id);
  const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'artemis';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const sections = [
          'artemis-missions',
          'clps-missions',
          'isru-programs',
          'infrastructure',
          'investments',
          'gateway-modules',
          'gateway-artemis-missions',
          'international-partners',
        ];

        const results = await Promise.all(
          sections.map((section) =>
            fetch(`/api/content/cislunar?section=${section}`)
              .then((res) => res.json())
              .catch(() => ({ data: [], meta: {} }))
          )
        );

        ARTEMIS_MISSIONS = results[0]?.data || [];
        CLPS_MISSIONS = results[1]?.data || [];
        ISRU_PROGRAMS = results[2]?.data || [];
        INFRASTRUCTURE = results[3]?.data || [];
        INVESTMENTS = results[4]?.data || [];
        GATEWAY_MODULES = results[5]?.data || [];
        GATEWAY_ARTEMIS_MISSIONS = results[6]?.data || [];
        INTERNATIONAL_PARTNERS = results[7]?.data || [];

        const firstMeta = results.find((r) => r?.meta?.lastRefreshed)?.meta;
        if (firstMeta?.lastRefreshed) {
          setRefreshedAt(firstMeta.lastRefreshed);
        }
      } catch (error) {
        console.error('Failed to fetch cislunar data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
          title="Cislunar Ecosystem"
          subtitle="Comprehensive intelligence on the Artemis program, commercial lunar services, in-situ resource utilization, cislunar infrastructure, investment, and the Lunar Gateway across the Earth-Moon economic zone"
          icon="🌙"
          accentColor="cyan"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

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
        {activeTab === 'artemis' && <ArtemisTab />}
        {activeTab === 'commercial' && <CommercialLunarTab />}
        {activeTab === 'isru' && <ISRUTab />}
        {activeTab === 'infrastructure' && <InfrastructureTab />}
        {activeTab === 'investment' && <InvestmentTab />}
        {activeTab === 'gateway' && <GatewayTab />}

        {/* Related Modules */}
        <ScrollReveal><div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/solar-exploration" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Solar Exploration
            </Link>
            <Link href="/space-mining" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Space Mining
            </Link>
            <Link href="/launch-windows" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Launch Windows
            </Link>
            <Link href="/mars-planner" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Mars Planner
            </Link>
            <Link href="/market-intel" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Market Intel
            </Link>
          </div>
        </div></ScrollReveal>
      </div>
    </div>
  );
}

export default function CislunarEcosystemPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CislunarEcosystemContent />
    </Suspense>
  );
}
