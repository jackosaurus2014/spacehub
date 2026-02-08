'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'active' | 'upcoming' | 'windows' | 'facts' | 'commercial' | 'rover-photos';

interface ActiveMission {
  name: string;
  agency: string;
  agencyFlag: string;
  type: 'rover' | 'orbiter' | 'helicopter' | 'lander';
  arrived: string;
  location?: string;
  status: 'active' | 'dormant' | 'ended' | 'planned';
  statusDetail?: string;
  highlight: string;
  years?: string;
}

interface UpcomingMission {
  name: string;
  agency: string;
  agencyFlag: string;
  targetDate: string;
  description: string;
  budget?: string;
  note?: string;
}

interface LaunchWindow {
  period: string;
  note: string;
}

interface TransferType {
  name: string;
  duration: string;
  description: string;
}

interface CostEstimate {
  type: string;
  range: string;
  icon: string;
}

interface CommercialOpportunity {
  title: string;
  description: string;
  icon: string;
  readiness: 'near-term' | 'mid-term' | 'long-term';
}

interface RoverPhoto {
  id: string;
  sol: number;
  earth_date: string;
  camera_name: string;
  camera_full_name: string;
  img_src: string;
  rover_name: string;
}

// ────────────────────────────────────────
// Data is fetched from /api/content/mars-planner
// ────────────────────────────────────────

// ────────────────────────────────────────
// Status Helpers
// ────────────────────────────────────────

function getStatusStyle(status: ActiveMission['status']): { label: string; color: string; bg: string } {
  switch (status) {
    case 'active': return { label: 'Active', color: 'text-green-400', bg: 'bg-green-900/30 border-green-500/30' };
    case 'dormant': return { label: 'Dormant', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-500/30' };
    case 'ended': return { label: 'Ended', color: 'text-red-400', bg: 'bg-red-900/30 border-red-500/30' };
    case 'planned': return { label: 'Planning', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-500/30' };
  }
}

function getMissionTypeIcon(type: ActiveMission['type']): string {
  switch (type) {
    case 'rover': return '🤖';
    case 'orbiter': return '🛰️';
    case 'helicopter': return '🚁';
    case 'lander': return '📍';
  }
}

function getReadinessStyle(readiness: CommercialOpportunity['readiness']): { label: string; color: string; bg: string } {
  switch (readiness) {
    case 'near-term': return { label: 'Near-Term (2025-2030)', color: 'text-green-400', bg: 'bg-green-900/20' };
    case 'mid-term': return { label: 'Mid-Term (2030-2040)', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
    case 'long-term': return { label: 'Long-Term (2040+)', color: 'text-orange-400', bg: 'bg-orange-900/20' };
  }
}

// ────────────────────────────────────────
// Hero Stats
// ────────────────────────────────────────

function HeroStats({ activeMissions: ACTIVE_MISSIONS, upcomingMissions: UPCOMING_MISSIONS }: { activeMissions: ActiveMission[]; upcomingMissions: UpcomingMission[] }) {
  const activeMissions = ACTIVE_MISSIONS.filter(m => m.status === 'active').length;
  const upcomingCount = UPCOMING_MISSIONS.length;
  const countriesWithPrograms = 6; // USA, China, EU, UAE, India, Japan

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="card p-5 border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛰️</span>
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-widest">Active Missions</div>
            <div className="text-white font-bold text-2xl">{activeMissions}</div>
            <div className="text-slate-400 text-xs">Currently at Mars</div>
          </div>
        </div>
      </div>
      <div className="card p-5 border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚀</span>
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-widest">Upcoming Missions</div>
            <div className="text-white font-bold text-2xl">{upcomingCount}</div>
            <div className="text-slate-400 text-xs">In development</div>
          </div>
        </div>
      </div>
      <div className="card p-5 border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🪟</span>
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-widest">Next Window</div>
            <div className="text-white font-bold text-2xl">Late 2026</div>
            <div className="text-slate-400 text-xs">Transfer opportunity</div>
          </div>
        </div>
      </div>
      <div className="card p-5 border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌍</span>
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-widest">Nations</div>
            <div className="text-white font-bold text-2xl">{countriesWithPrograms}</div>
            <div className="text-slate-400 text-xs">Mars programs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Active Mission Card
// ────────────────────────────────────────

function MissionCard({ mission }: { mission: ActiveMission }) {
  const statusStyle = getStatusStyle(mission.status);
  const typeIcon = getMissionTypeIcon(mission.type);

  return (
    <div className="card p-5 border border-slate-700/50 hover:border-red-500/30 transition-all bg-gradient-to-br from-slate-800/60 to-slate-900/60">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{typeIcon}</span>
          <div>
            <h3 className="text-white font-semibold text-lg leading-tight">{mission.name}</h3>
            <span className="text-slate-400 text-sm">{mission.agencyFlag} {mission.agency}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusStyle.bg} ${statusStyle.color}`}>
          {statusStyle.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Arrived</div>
          <div className="text-white font-semibold text-sm">{mission.arrived}</div>
        </div>
        {mission.location && (
          <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Location</div>
            <div className="text-white font-semibold text-sm">{mission.location}</div>
          </div>
        )}
        {!mission.location && mission.years && (
          <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Active</div>
            <div className="text-white font-semibold text-sm">{mission.years} years</div>
          </div>
        )}
        {!mission.location && !mission.years && (
          <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Type</div>
            <div className="text-white font-semibold text-sm capitalize">{mission.type}</div>
          </div>
        )}
      </div>

      {mission.statusDetail && (
        <p className="text-yellow-400/80 text-xs mb-2 italic">{mission.statusDetail}</p>
      )}

      <div className="border-t border-slate-700/50 pt-3">
        <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Key Achievement</div>
        <p className="text-slate-300 text-sm leading-relaxed">{mission.highlight}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Upcoming Mission Card
// ────────────────────────────────────────

function UpcomingMissionCard({ mission, index, totalCount }: { mission: UpcomingMission; index: number; totalCount: number }) {
  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/30 border border-red-500/50 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {index + 1}
        </div>
        {index < totalCount - 1 && (
          <div className="w-px flex-1 bg-gradient-to-b from-red-500/30 to-transparent mt-2" />
        )}
      </div>

      {/* Card */}
      <div className="card p-5 border border-slate-700/50 hover:border-orange-500/30 transition-all bg-gradient-to-br from-slate-800/60 to-slate-900/60 flex-1 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-white font-semibold text-lg">{mission.name}</h3>
            <span className="text-slate-400 text-sm">{mission.agencyFlag} {mission.agency}</span>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded bg-orange-900/30 border border-orange-500/30 text-orange-400 whitespace-nowrap">
            {mission.targetDate}
          </span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed mb-2">{mission.description}</p>
        {mission.budget && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-green-400">$</span> Budget: {mission.budget}
          </div>
        )}
        {mission.note && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-blue-400">i</span> {mission.note}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Launch Windows Section
// ────────────────────────────────────────

function LaunchWindowsSection({ launchWindows: LAUNCH_WINDOWS, transferTypes: TRANSFER_TYPES }: { launchWindows: LaunchWindow[]; transferTypes: TransferType[] }) {
  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="card p-6 border border-slate-700/50 bg-gradient-to-br from-blue-900/20 to-slate-900/60">
        <h3 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
          <span>🌌</span> Orbital Mechanics
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          Mars transfer windows occur every ~26 months due to Earth-Mars orbital mechanics. During these windows,
          the relative positions of Earth and Mars allow for minimum-energy transfer orbits. Missing a window
          means waiting over two years for the next opportunity, making precise mission timing critical.
        </p>
      </div>

      {/* Upcoming Windows */}
      <div className="card p-6 border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
        <h3 className="text-white font-semibold text-lg mb-4">Upcoming Launch Windows</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LAUNCH_WINDOWS.map((w, i) => (
            <div
              key={w.period}
              className={`rounded-xl p-4 border text-center ${
                i === 0
                  ? 'bg-red-900/20 border-red-500/40'
                  : 'bg-slate-800/50 border-slate-700/50'
              }`}
            >
              {i === 0 && (
                <div className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Next Window</div>
              )}
              <div className="text-white font-bold text-xl mb-1">{w.period}</div>
              <div className="text-slate-400 text-xs">{w.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Types */}
      <div className="card p-6 border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
        <h3 className="text-white font-semibold text-lg mb-4">Transfer Trajectory Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TRANSFER_TYPES.map((t) => (
            <div key={t.name} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-white font-semibold mb-1">{t.name}</div>
              <div className="text-cyan-400 text-sm font-bold mb-2">{t.duration}</div>
              <p className="text-slate-400 text-xs leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Mars Facts & Numbers
// ────────────────────────────────────────

function MarsFactsSection({ marsFacts: MARS_FACTS, costEstimates: COST_ESTIMATES }: { marsFacts: any; costEstimates: CostEstimate[] }) {
  const factEntries: { label: string; value: string; icon: string }[] = [
    { label: 'Distance from Sun', value: MARS_FACTS.distance_sun || '', icon: '☀️' },
    { label: 'Distance from Earth', value: MARS_FACTS.distance_earth || '', icon: '🌍' },
    { label: 'Diameter', value: MARS_FACTS.diameter || '', icon: '📏' },
    { label: 'Gravity', value: MARS_FACTS.gravity || '', icon: '⚖️' },
    { label: 'Day Length', value: MARS_FACTS.day_length || '', icon: '🕐' },
    { label: 'Year Length', value: MARS_FACTS.year_length || '', icon: '📅' },
    { label: 'Atmosphere', value: MARS_FACTS.atmosphere || '', icon: '💨' },
    { label: 'Surface Temperature', value: MARS_FACTS.surface_temp || '', icon: '🌡️' },
    { label: 'Moons', value: MARS_FACTS.moons || '', icon: '🌙' },
  ];

  return (
    <div className="space-y-6">
      {/* Mars by the Numbers */}
      <div className="card p-6 border border-slate-700/50 bg-gradient-to-br from-red-900/10 to-slate-900/60">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <span>🔴</span> Mars by the Numbers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {factEntries.map((fact) => (
            <div key={fact.label} className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
              <span className="text-xl flex-shrink-0 mt-0.5">{fact.icon}</span>
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-widest">{fact.label}</div>
                <div className="text-white font-semibold text-sm mt-0.5">{fact.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission Cost Estimates */}
      <div className="card p-6 border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <span>💰</span> Mission Cost Estimates
        </h3>
        <div className="space-y-3">
          {COST_ESTIMATES.map((cost) => (
            <div key={cost.type} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cost.icon}</span>
                <span className="text-white font-medium text-sm">{cost.type}</span>
              </div>
              <span className="text-green-400 font-bold text-sm whitespace-nowrap">{cost.range}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-4 italic">
          * Estimates based on historical mission costs and publicly available projections. Actual costs vary significantly based on mission complexity, technology readiness, and political factors.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Commercial Opportunities
// ────────────────────────────────────────

function CommercialSection({ commercialOpportunities: COMMERCIAL_OPPORTUNITIES }: { commercialOpportunities: CommercialOpportunity[] }) {
  return (
    <div className="space-y-6">
      <div className="card p-6 border border-slate-700/50 bg-gradient-to-br from-purple-900/10 to-slate-900/60">
        <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
          <span>🏢</span> Commercial Mars Opportunities
        </h3>
        <p className="text-slate-400 text-sm mb-6">
          As Mars exploration transitions from government-only to public-private partnerships, new commercial opportunities are emerging across the value chain.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMERCIAL_OPPORTUNITIES.map((opp) => {
            const readinessStyle = getReadinessStyle(opp.readiness);
            return (
              <div key={opp.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{opp.icon}</span>
                    <h4 className="text-white font-semibold">{opp.title}</h4>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-3">{opp.description}</p>
                <span className={`text-xs font-medium px-2.5 py-1 rounded ${readinessStyle.bg} ${readinessStyle.color}`}>
                  {readinessStyle.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Enablers */}
      <div className="card p-6 border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <span>🔑</span> Key Technology Enablers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { tech: 'Autonomous Landing Systems', maturity: 'TRL 7-9', color: 'text-green-400' },
            { tech: 'ISRU Oxygen Production', maturity: 'TRL 5-6', color: 'text-yellow-400' },
            { tech: 'Nuclear Thermal Propulsion', maturity: 'TRL 3-4', color: 'text-orange-400' },
            { tech: 'Mars Aerocapture', maturity: 'TRL 4-5', color: 'text-yellow-400' },
            { tech: 'Radiation Shielding', maturity: 'TRL 4-6', color: 'text-yellow-400' },
            { tech: 'Closed-Loop Life Support', maturity: 'TRL 5-7', color: 'text-yellow-400' },
          ].map((item) => (
            <div key={item.tech} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
              <span className="text-white text-sm">{item.tech}</span>
              <span className={`text-xs font-bold ${item.color}`}>{item.maturity}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-3 italic">
          TRL = Technology Readiness Level (1-9 scale, where 9 = flight proven)
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tabs
// ────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'active', label: 'Active Missions', icon: '🛰️' },
  { id: 'upcoming', label: 'Upcoming', icon: '🚀' },
  { id: 'windows', label: 'Launch Windows', icon: '🪟' },
  { id: 'facts', label: 'Mars Facts & Costs', icon: '🔴' },
  { id: 'commercial', label: 'Commercial', icon: '🏢' },
  { id: 'rover-photos', label: 'Rover Photos', icon: '📷' },
];

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function MarsPlannerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');

  // API-fetched data
  const [ACTIVE_MISSIONS, setActiveMissions] = useState<ActiveMission[]>([]);
  const [UPCOMING_MISSIONS, setUpcomingMissions] = useState<UpcomingMission[]>([]);
  const [LAUNCH_WINDOWS, setLaunchWindows] = useState<LaunchWindow[]>([]);
  const [TRANSFER_TYPES, setTransferTypes] = useState<TransferType[]>([]);
  const [MARS_FACTS, setMarsFacts] = useState<any>({});
  const [COST_ESTIMATES, setCostEstimates] = useState<CostEstimate[]>([]);
  const [COMMERCIAL_OPPORTUNITIES, setCommercialOpportunities] = useState<CommercialOpportunity[]>([]);
  const [ROVER_PHOTOS, setRoverPhotos] = useState<RoverPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
          fetch('/api/content/mars-planner?section=active-missions'),
          fetch('/api/content/mars-planner?section=upcoming-missions'),
          fetch('/api/content/mars-planner?section=launch-windows'),
          fetch('/api/content/mars-planner?section=transfer-types'),
          fetch('/api/content/mars-planner?section=mars-facts'),
          fetch('/api/content/mars-planner?section=cost-estimates'),
          fetch('/api/content/mars-planner?section=commercial-opportunities'),
          fetch('/api/content/mars-planner?section=rover-photos'),
        ]);
        const [d1, d2, d3, d4, d5, d6, d7, d8] = await Promise.all([
          r1.json(), r2.json(), r3.json(), r4.json(), r5.json(), r6.json(), r7.json(), r8.json(),
        ]);
        setActiveMissions(d1.data || []);
        setUpcomingMissions(d2.data || []);
        setLaunchWindows(d3.data || []);
        setTransferTypes(d4.data || []);
        if (d5.data?.[0]) setMarsFacts(d5.data[0]);
        setCostEstimates(d6.data || []);
        setCommercialOpportunities(d7.data || []);
        setRoverPhotos(d8.data || []);
        setRefreshedAt(d1.meta?.lastRefreshed || null);
      } catch (error) {
        console.error('Failed to load mars planner data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const agencies = Array.from(new Set(ACTIVE_MISSIONS.map(m => m.agency)));
  const filteredMissions = agencyFilter === 'all'
    ? ACTIVE_MISSIONS
    : ACTIVE_MISSIONS.filter(m => m.agency === agencyFilter);

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
          title="Mars Mission Planner"
          subtitle="Comprehensive intelligence on Mars missions past, present, and future -- launch windows, costs, and commercial opportunities"
          icon="🔴"
          accentColor="red"
        />

        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" className="mb-4" />

        {/* Hero Stats */}
        <HeroStats activeMissions={ACTIVE_MISSIONS} upcomingMissions={UPCOMING_MISSIONS} />

        {/* Tabs */}
        <div className="border-b border-slate-700/50 mb-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'active' && (
          <div className="space-y-6">
            {/* Agency Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAgencyFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  agencyFilter === 'all'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
                }`}
              >
                All Agencies
              </button>
              {agencies.map((agency) => (
                <button
                  key={agency}
                  onClick={() => setAgencyFilter(agency)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    agencyFilter === agency
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
                  }`}
                >
                  {agency}
                </button>
              ))}
            </div>

            {/* Mission Cards */}
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredMissions.map((mission) => (
                <StaggerItem key={mission.name}>
                  <MissionCard mission={mission} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Mission Count */}
            <div className="text-center text-slate-500 text-sm">
              Showing {filteredMissions.length} of {ACTIVE_MISSIONS.length} missions
            </div>
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="space-y-2">
            <p className="text-slate-400 text-sm mb-6">
              Planned Mars missions from space agencies and commercial entities worldwide. Dates are subject to change based on funding, technical readiness, and launch window availability.
            </p>
            {UPCOMING_MISSIONS.map((mission, i) => (
              <UpcomingMissionCard key={mission.name} mission={mission} index={i} totalCount={UPCOMING_MISSIONS.length} />
            ))}
          </div>
        )}

        {activeTab === 'windows' && <LaunchWindowsSection launchWindows={LAUNCH_WINDOWS} transferTypes={TRANSFER_TYPES} />}

        {activeTab === 'facts' && <MarsFactsSection marsFacts={MARS_FACTS} costEstimates={COST_ESTIMATES} />}

        {activeTab === 'commercial' && <CommercialSection commercialOpportunities={COMMERCIAL_OPPORTUNITIES} />}

        {activeTab === 'rover-photos' && (
          <div className="space-y-6">
            <div className="card p-6 border border-slate-700/50 bg-gradient-to-br from-red-900/10 to-slate-900/60">
              <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
                <span>📷</span> Mars Rover Photos
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Recent images captured by NASA Mars rovers, showcasing the Martian surface from multiple camera systems.
              </p>
              {ROVER_PHOTOS.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">📷</span>
                  <p className="text-slate-400 text-sm">No rover photos available yet.</p>
                </div>
              ) : (
                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ROVER_PHOTOS.map((photo) => (
                    <StaggerItem key={photo.id}>
                      <div className="card p-3 border border-slate-700/50 hover:border-red-500/30 transition-all bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-slate-800">
                          <img
                            src={photo.img_src}
                            alt={`Mars photo from ${photo.rover_name} - ${photo.camera_full_name}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-white font-medium text-sm truncate" title={photo.camera_full_name}>
                            {photo.camera_full_name}
                          </div>
                          <div className="text-slate-400 text-xs">{photo.rover_name}</div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">{photo.earth_date}</span>
                            <span className="text-red-400 font-mono">Sol {photo.sol}</span>
                          </div>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </div>
          </div>
        )}

        {/* Cross-links */}
        <ScrollReveal><div className="card p-5 border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60 mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/solar-exploration" className="btn-secondary text-sm">
              🌍 Solar Exploration
            </Link>
            <Link href="/launch-windows" className="btn-secondary text-sm">
              🪟 Launch Windows
            </Link>
            <Link href="/space-mining" className="btn-secondary text-sm">
              ⛏️ Space Mining
            </Link>
            <Link href="/mission-cost" className="btn-secondary text-sm">
              💰 Mission Cost Calculator
            </Link>
            <Link href="/debris-monitor" className="btn-secondary text-sm">
              ⚠️ Debris Monitor
            </Link>
          </div>
        </div></ScrollReveal>
      </div>
    </div>
  );
}
