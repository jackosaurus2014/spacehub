'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';
import { clientLogger } from '@/lib/client-logger';

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
// Fallback Data (used when API/DB is empty)
// ────────────────────────────────────────

const FALLBACK_ACTIVE_MISSIONS: ActiveMission[] = [
  { name: 'Perseverance Rover', agency: 'NASA', agencyFlag: '\u{1F1FA}\u{1F1F8}', type: 'rover', arrived: 'Feb 2021', location: 'Jezero Crater', status: 'active', highlight: 'Collected 24+ rock and soil samples for future Mars Sample Return mission. Demonstrated MOXIE oxygen production from Martian CO2.' },
  { name: 'Ingenuity Helicopter', agency: 'NASA', agencyFlag: '\u{1F1FA}\u{1F1F8}', type: 'helicopter', arrived: 'Deployed Apr 2021', status: 'ended', statusDetail: 'Mission ended Jan 2024 after 72 flights, damaged rotor blade on Flight 72', highlight: 'First powered, controlled flight on another planet. Logged over 128 minutes of total flight time.' },
  { name: 'Curiosity Rover', agency: 'NASA', agencyFlag: '\u{1F1FA}\u{1F1F8}', type: 'rover', arrived: 'Aug 2012', location: 'Gale Crater / Mt. Sharp', status: 'active', years: '13+', highlight: 'Discovered ancient organic molecules and seasonal methane variations. Climbed over 800m up Mount Sharp.' },
  { name: 'Mars Reconnaissance Orbiter (MRO)', agency: 'NASA', agencyFlag: '\u{1F1FA}\u{1F1F8}', type: 'orbiter', arrived: 'Mar 2006', status: 'active', years: '19+', highlight: 'High-resolution HiRISE camera has imaged most of Mars surface. Primary data relay for surface missions.' },
  { name: 'MAVEN', agency: 'NASA', agencyFlag: '\u{1F1FA}\u{1F1F8}', type: 'orbiter', arrived: 'Sep 2014', status: 'active', years: '11+', highlight: 'Studying Mars upper atmosphere and solar wind interaction. Determined how Mars lost its atmosphere over billions of years.' },
  { name: 'Mars Odyssey', agency: 'NASA', agencyFlag: '\u{1F1FA}\u{1F1F8}', type: 'orbiter', arrived: 'Oct 2001', status: 'active', years: '24+', highlight: 'Longest-serving spacecraft at Mars. Mapped subsurface hydrogen (water ice) distribution globally.' },
  { name: 'Tianwen-1 Orbiter', agency: 'CNSA', agencyFlag: '\u{1F1E8}\u{1F1F3}', type: 'orbiter', arrived: 'Feb 2021', status: 'active', highlight: 'China\'s first Mars orbiter. Carries 7 scientific instruments including high-res camera and subsurface radar.' },
  { name: 'Zhurong Rover', agency: 'CNSA', agencyFlag: '\u{1F1E8}\u{1F1F3}', type: 'rover', arrived: 'May 2021', location: 'Utopia Planitia', status: 'dormant', statusDetail: 'Entered hibernation May 2022 for Martian winter, no signal reacquired as of 2024', highlight: 'Traveled 1,921 meters on Mars surface. Detected evidence of recent water activity in Utopia Planitia.' },
  { name: 'Mars Express', agency: 'ESA', agencyFlag: '\u{1F1EA}\u{1F1FA}', type: 'orbiter', arrived: 'Dec 2003', status: 'active', years: '22+', highlight: 'MARSIS subsurface radar discovered possible liquid water reservoirs beneath south polar ice cap.' },
  { name: 'ExoMars Trace Gas Orbiter (TGO)', agency: 'ESA/Roscosmos', agencyFlag: '\u{1F1EA}\u{1F1FA}', type: 'orbiter', arrived: 'Oct 2016', status: 'active', highlight: 'Detecting trace gases including methane. Serves as data relay for current and future surface missions.' },
  { name: 'Hope Probe (Al-Amal)', agency: 'UAESA', agencyFlag: '\u{1F1E6}\u{1F1EA}', type: 'orbiter', arrived: 'Feb 2021', status: 'active', highlight: 'First Arab interplanetary mission. Studies Martian weather and atmosphere from a unique high orbit.' },
  { name: 'Mars Orbiter Mission (Mangalyaan)', agency: 'ISRO', agencyFlag: '\u{1F1EE}\u{1F1F3}', type: 'orbiter', arrived: 'Sep 2014', status: 'ended', statusDetail: 'Lost contact in 2022 after 8 years (designed for 6 months)', highlight: 'India\'s first interplanetary mission. Achieved Mars orbit on first attempt at a record-low cost of $74M.' },
];

const FALLBACK_UPCOMING_MISSIONS: UpcomingMission[] = [
  { name: 'Mars Sample Return (MSR)', agency: 'NASA/ESA', agencyFlag: '\u{1F1FA}\u{1F1F8}', targetDate: '~2030s (revised)', description: 'Multi-mission campaign to retrieve cached samples from Perseverance rover in Jezero Crater and return them to Earth for laboratory analysis. Architecture under redesign for lower cost approach.', budget: '~$8-11B (under review, revised down from original)', note: 'NASA exploring faster, cheaper architectures including commercial partnerships' },
  { name: 'ExoMars Rosalind Franklin Rover', agency: 'ESA', agencyFlag: '\u{1F1EA}\u{1F1FA}', targetDate: 'NET 2028', description: 'First European Mars rover equipped with a 2-meter drill to search for biosignatures beneath the surface where organic molecules are shielded from radiation.', budget: '~$1.8B (total program)', note: 'Previously partnered with Roscosmos; new landing platform under development' },
  { name: 'SpaceX Starship Mars Mission', agency: 'SpaceX', agencyFlag: '\u{1F1FA}\u{1F1F8}', targetDate: '2026 window (uncrewed)', description: 'First commercial vehicle designed for Mars. Uncrewed test flight to demonstrate entry, descent, and landing of the largest spacecraft ever sent to Mars. 100+ ton payload capacity.', note: 'Timeline contingent on Starship orbital flight program progress' },
  { name: 'Tianwen-2', agency: 'CNSA', agencyFlag: '\u{1F1E8}\u{1F1F3}', targetDate: '~2025 (asteroid), then Mars', description: 'Multi-target mission: first visits near-Earth asteroid Kamoʻoalewa for sample collection, then proceeds to Mars system for flyby observations.', note: 'Demonstrates technologies for future Tianwen-3 Mars sample return' },
  { name: 'Tianwen-3 (Mars Sample Return)', agency: 'CNSA', agencyFlag: '\u{1F1E8}\u{1F1F3}', targetDate: '~2028-2030', description: 'Dedicated Mars sample return mission using two launches. Lander collects surface samples while orbiter waits to carry them back to Earth.', note: 'Could become the first Mars sample return if MSR faces further delays' },
  { name: 'MMX - Martian Moons eXploration', agency: 'JAXA', agencyFlag: '\u{1F1EF}\u{1F1F5}', targetDate: 'NET 2026', description: 'Land on Phobos, collect over 10g of surface material, and return samples to Earth. Will also deploy a small rover (built by CNES/DLR) onto Phobos.', budget: '~$410M', note: 'Phobos samples may contain ejected Mars material from ancient impacts' },
  { name: 'Mangalyaan-2 (Mars Orbiter Mission 2)', agency: 'ISRO', agencyFlag: '\u{1F1EE}\u{1F1F3}', targetDate: 'NET 2028', description: 'Follow-up to India\'s highly successful and cost-effective first Mars orbiter. Enhanced instruments for atmospheric and surface studies.', note: 'May include a lander/helicopter component' },
  { name: 'SpaceX Crewed Mars Mission', agency: 'SpaceX', agencyFlag: '\u{1F1FA}\u{1F1F8}', targetDate: '~2028-2030 (aspirational)', description: 'First crewed mission to Mars using Starship. Would establish initial surface infrastructure including ISRU propellant production for return trip.', note: 'Depends on successful uncrewed landing demonstrations' },
];

const FALLBACK_LAUNCH_WINDOWS: LaunchWindow[] = [
  { period: 'Late 2026', note: 'Hohmann transfer ~7 months. Next opportunity for Mars missions.' },
  { period: 'Early 2029', note: 'Following window after 2026. ~26 months between windows.' },
  { period: 'Mid 2031', note: 'Favorable alignment. Good for both robotic and crewed missions.' },
  { period: 'Late 2033', note: 'Particularly favorable opposition. Closest approach in this cycle.' },
];

const FALLBACK_TRANSFER_TYPES: TransferType[] = [
  { name: 'Hohmann Transfer', duration: '7-9 months', description: 'Minimum-energy trajectory using two engine burns (departure and arrival). Most fuel-efficient but slowest option. Used by the vast majority of robotic Mars missions including Perseverance and Curiosity.' },
  { name: 'Fast Conjunction Class', duration: '4-6 months', description: 'Higher-energy trajectory trading fuel for shorter transit time. Preferred for crewed missions to reduce radiation exposure and consumable requirements. Requires significantly more propellant than Hohmann.' },
  { name: 'Opposition Class', duration: '14-18 months total', description: 'Short Mars stay (30-60 days) with Venus gravity assist on return leg. Total mission time shorter than conjunction class but less time at Mars. Higher total delta-v requirement.' },
  { name: 'Ballistic Capture', duration: '8-11 months', description: 'Uses Sun-Mars gravitational dynamics to gradually capture the spacecraft without a large orbit insertion burn. Saves significant fuel at the cost of longer transit time. Studied for cargo pre-positioning missions.' },
];

const FALLBACK_MARS_FACTS = {
  distance_sun: '227.9M km (1.52 AU)',
  distance_earth: '55M km (closest) to 401M km (farthest)',
  diameter: '6,779 km (53% of Earth)',
  gravity: '3.72 m/s\u00B2 (38% of Earth)',
  day_length: '24h 37m (1 sol)',
  year_length: '687 Earth days (1.88 Earth years)',
  atmosphere: '95.3% CO\u2082, 2.7% N\u2082, 1.6% Ar, 0.13% O\u2082',
  surface_temp: '-87\u00B0C to -5\u00B0C (avg -63\u00B0C)',
  moons: 'Phobos (22 km) & Deimos (12 km)',
};

const FALLBACK_COST_ESTIMATES: CostEstimate[] = [
  { type: 'Mars Orbiter (e.g., MAVEN, MOM)', range: '$74M - $800M', icon: '\u{1F6F0}\u{FE0F}' },
  { type: 'Mars Rover Mission (e.g., Perseverance)', range: '$2B - $3B', icon: '\u{1F916}' },
  { type: 'Mars Helicopter/Drone Add-on', range: '$80M - $200M', icon: '\u{1F681}' },
  { type: 'Mars Sample Return (multi-mission)', range: '$8B - $11B', icon: '\u{1F4E6}' },
  { type: 'Human Mars Mission (estimated)', range: '$100B - $500B', icon: '\u{1F468}\u{200D}\u{1F680}' },
  { type: 'SpaceX Starship (per launch, estimated)', range: '$100M - $200M', icon: '\u{1F680}' },
  { type: 'Mars Communications Relay Satellite', range: '$200M - $500M', icon: '\u{1F4E1}' },
];

const FALLBACK_COMMERCIAL_OPPORTUNITIES: CommercialOpportunity[] = [
  { title: 'Mars Communications Relay Network', description: 'Deploy a constellation of dedicated relay satellites for continuous Mars-Earth communication coverage. Current reliance on aging NASA orbiters creates a critical gap. Companies like SpaceX and Astrobotic are exploring solutions.', icon: '\u{1F4E1}', readiness: 'near-term' },
  { title: 'Mars Cargo Delivery Services', description: 'Commercial delivery of pre-positioned supplies, habitats, and equipment to Mars surface ahead of crewed missions. SpaceX Starship designed to land 100+ tons on Mars surface.', icon: '\u{1F4E6}', readiness: 'near-term' },
  { title: 'Mars Surface Power Systems', description: 'Nuclear fission reactors (like NASA\'s Kilopower/KRUSTY) and advanced solar arrays for sustained Mars surface operations. Essential for ISRU, habitats, and science stations.', icon: '\u{26A1}', readiness: 'mid-term' },
  { title: 'In-Situ Resource Utilization (ISRU)', description: 'Extract water from subsurface ice deposits, produce breathable oxygen from CO2 atmosphere (demonstrated by MOXIE on Perseverance), and manufacture methane/LOX propellant for return trips.', icon: '\u{26CF}\u{FE0F}', readiness: 'mid-term' },
  { title: 'Mars Scientific Instruments & Payloads', description: 'Development and sale of miniaturized scientific instruments, sample analysis tools, and environmental monitoring systems for Mars missions by both government and commercial operators.', icon: '\u{1F52C}', readiness: 'near-term' },
  { title: 'Mars Habitat Construction', description: 'Design and deploy human habitats using a combination of local regolith materials (3D-printed structures), inflatable modules, and pre-fabricated components. AI Spacefactory and ICON exploring concepts.', icon: '\u{1F3D7}\u{FE0F}', readiness: 'long-term' },
  { title: 'Mars Agriculture & Life Support', description: 'Develop closed-loop life support systems, hydroponic/aeroponic food production, and waste recycling for long-duration Mars surface stays. Critical for sustained human presence.', icon: '\u{1F331}', readiness: 'long-term' },
  { title: 'Mars Tourism & Media', description: 'Virtual reality Mars experiences, documentary content from Mars surface, and eventually ultra-premium Mars tourism. Near-term revenue from media rights and VR content built from rover data.', icon: '\u{1F3AC}', readiness: 'mid-term' },
];

// ────────────────────────────────────────
// Data is fetched from /api/content/mars-planner
// (Falls back to hardcoded data above when DB is not seeded)
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
    default: return { label: status || 'Unknown', color: 'text-slate-400', bg: 'bg-slate-900/30 border-slate-500/30' };
  }
}

function getMissionTypeIcon(type: ActiveMission['type']): string {
  switch (type) {
    case 'rover': return '🤖';
    case 'orbiter': return '🛰️';
    case 'helicopter': return '🚁';
    case 'lander': return '📍';
    default: return '🔭';
  }
}

function getReadinessStyle(readiness: CommercialOpportunity['readiness']): { label: string; color: string; bg: string } {
  switch (readiness) {
    case 'near-term': return { label: 'Near-Term (2025-2030)', color: 'text-green-400', bg: 'bg-green-900/20' };
    case 'mid-term': return { label: 'Mid-Term (2030-2040)', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
    case 'long-term': return { label: 'Long-Term (2040+)', color: 'text-orange-400', bg: 'bg-orange-900/20' };
    default: return { label: readiness || 'Unknown', color: 'text-slate-400', bg: 'bg-slate-900/20' };
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

  // API-fetched data (initialized with fallback so page renders immediately)
  const [ACTIVE_MISSIONS, setActiveMissions] = useState<ActiveMission[]>(FALLBACK_ACTIVE_MISSIONS);
  const [UPCOMING_MISSIONS, setUpcomingMissions] = useState<UpcomingMission[]>(FALLBACK_UPCOMING_MISSIONS);
  const [LAUNCH_WINDOWS, setLaunchWindows] = useState<LaunchWindow[]>(FALLBACK_LAUNCH_WINDOWS);
  const [TRANSFER_TYPES, setTransferTypes] = useState<TransferType[]>(FALLBACK_TRANSFER_TYPES);
  const [MARS_FACTS, setMarsFacts] = useState<any>(FALLBACK_MARS_FACTS);
  const [COST_ESTIMATES, setCostEstimates] = useState<CostEstimate[]>(FALLBACK_COST_ESTIMATES);
  const [COMMERCIAL_OPPORTUNITIES, setCommercialOpportunities] = useState<CommercialOpportunity[]>(FALLBACK_COMMERCIAL_OPPORTUNITIES);
  const [ROVER_PHOTOS, setRoverPhotos] = useState<RoverPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setError(null);
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
        // Only replace fallback data when API returns meaningful results
        if (d1.data?.length > 0) setActiveMissions(d1.data);
        if (d2.data?.length > 0) setUpcomingMissions(d2.data);
        if (d3.data?.length > 0) setLaunchWindows(d3.data);
        if (d4.data?.length > 0) setTransferTypes(d4.data);
        if (d5.data?.[0] && Object.keys(d5.data[0]).length > 0) setMarsFacts(d5.data[0]);
        if (d6.data?.length > 0) setCostEstimates(d6.data);
        if (d7.data?.length > 0) setCommercialOpportunities(d7.data);
        if (d8.data?.length > 0) setRoverPhotos(d8.data);
        setRefreshedAt(d1.meta?.lastRefreshed || null);
      } catch (err) {
        clientLogger.error('Failed to load mars planner data', { error: err instanceof Error ? err.message : String(err) });
        // Fallback data is already set as defaults, so no action needed
        // Only show error if we have no data at all (shouldn't happen with fallbacks)
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

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Hero Stats */}
        <ScrollReveal><HeroStats activeMissions={ACTIVE_MISSIONS} upcomingMissions={UPCOMING_MISSIONS} /></ScrollReveal>

        {/* Tabs */}
        <ScrollReveal delay={0.1}><div className="border-b border-slate-700/50 mb-6">
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
        </div></ScrollReveal>

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
                          <Image
                            src={photo.img_src}
                            alt={`Mars photo from ${photo.rover_name} - ${photo.camera_full_name}`}
                            className="w-full h-full object-cover"
                            width={400}
                            height={400}
                            unoptimized
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
            <Link href="/space-environment?tab=debris" className="btn-secondary text-sm">
              ⚠️ Debris Monitor
            </Link>
          </div>
        </div></ScrollReveal>
      </div>
    </div>
  );
}
