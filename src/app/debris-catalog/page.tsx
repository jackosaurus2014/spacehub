'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ════════════════════════════════════════
// Types & Data
// ════════════════════════════════════════

type OrbitFilter = 'all' | 'LEO' | 'MEO' | 'GEO' | 'HEO';
type OriginFilter = 'all' | 'Russia/CIS' | 'USA' | 'China' | 'France' | 'Japan' | 'India' | 'ESA' | 'Other';
type ObjectTypeFilter = 'all' | 'satellite' | 'rocket_body' | 'fragment';

interface DebrisEvent {
  year: number;
  title: string;
  description: string;
  fragments: string;
  orbitRange: string;
  decayTimeline: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
}

interface OrbitBreakdown {
  orbit: string;
  fullName: string;
  altitudeRange: string;
  tracked: number;
  maxTracked: number;
  color: string;
}

interface Contributor {
  name: string;
  objects: number;
  color: string;
}

interface RemediationProgram {
  name: string;
  organization: string;
  status: string;
  statusColor: string;
  description: string;
  year: string;
  technique: string;
}

// ════════════════════════════════════════
// Overview Stats
// ════════════════════════════════════════

const OVERVIEW_STATS = [
  { label: 'Tracked Objects', value: '36,500+', icon: '\uD83D\uDEF0\uFE0F', detail: 'Cataloged by SSN' },
  { label: 'Debris >10cm', value: '36,500', icon: '\u26A0\uFE0F', detail: 'Trackable from ground' },
  { label: 'Debris 1\u201310cm', value: '~1,000,000', icon: '\uD83D\uDD34', detail: 'Estimated' },
  { label: 'Debris <1cm', value: '~130,000,000', icon: '\uD83D\uDFE0', detail: 'Estimated' },
  { label: 'Active Satellites', value: '10,500+', icon: '\uD83D\uDCE1', detail: 'Currently operational' },
  { label: 'Defunct Satellites', value: '4,500+', icon: '\u274C', detail: 'No longer functional' },
  { label: 'Rocket Bodies', value: '2,500+', icon: '\uD83D\uDE80', detail: 'Spent upper stages' },
  { label: 'Avoidance Maneuvers/yr', value: '50,000+', icon: '\uD83D\uDEE1\uFE0F', detail: 'Estimated annually' },
];

// ════════════════════════════════════════
// Major Debris Events
// ════════════════════════════════════════

const DEBRIS_EVENTS: DebrisEvent[] = [
  {
    year: 2007,
    title: 'China ASAT Test (Fengyun-1C)',
    description: 'China destroyed its own Fengyun-1C weather satellite using a kinetic kill vehicle at 865 km altitude, creating the largest single debris-generating event in history.',
    fragments: '3,500+ tracked fragments',
    orbitRange: '200\u20134,000 km',
    decayTimeline: 'Centuries for many fragments; some in orbits that will persist for 100+ years',
    severity: 'critical',
  },
  {
    year: 2009,
    title: 'Iridium 33 / Cosmos 2251 Collision',
    description: 'The first accidental hypervelocity collision between two intact satellites, occurring at 789 km altitude at a relative velocity of ~11.7 km/s.',
    fragments: '2,300+ tracked fragments',
    orbitRange: '500\u20131,400 km',
    decayTimeline: 'Decades to centuries; fragments spread across wide altitude band',
    severity: 'critical',
  },
  {
    year: 2021,
    title: 'Russia ASAT Test (Cosmos 1408)',
    description: 'Russia destroyed the defunct Cosmos 1408 satellite at ~480 km altitude, generating debris that threatened the ISS crew who had to shelter in their spacecraft.',
    fragments: '1,500+ tracked fragments',
    orbitRange: '300\u2013800 km',
    decayTimeline: 'Years to decades; lower altitude fragments decay faster',
    severity: 'critical',
  },
  {
    year: 2023,
    title: 'ISS Avoidance Maneuver (Chinese Debris)',
    description: 'The International Space Station performed a debris avoidance maneuver to dodge fragments from the 2007 Chinese ASAT test, highlighting the long-term consequences of that event.',
    fragments: 'N/A (avoidance)',
    orbitRange: '~420 km (ISS orbit)',
    decayTimeline: 'Ongoing threat from legacy debris',
    severity: 'moderate',
  },
  {
    year: 2019,
    title: 'India ASAT Test (Mission Shakti)',
    description: 'India destroyed the Microsat-R satellite at ~300 km altitude. The low altitude meant most debris decayed relatively quickly, though some fragments were lofted higher.',
    fragments: '400+ tracked fragments',
    orbitRange: '200\u2013600 km',
    decayTimeline: 'Most decayed within months; some fragments persisted years',
    severity: 'high',
  },
  {
    year: 2013,
    title: 'BLITS Satellite Struck by Debris',
    description: 'The Russian BLITS laser ranging satellite was struck by a small debris fragment, altering its spin and rendering it non-functional, demonstrating vulnerability of operational satellites.',
    fragments: 'Unknown (small impact)',
    orbitRange: '~832 km',
    decayTimeline: 'N/A (impact event)',
    severity: 'moderate',
  },
  {
    year: 1996,
    title: 'Cerise Satellite Hit by Ariane Debris',
    description: 'The French Cerise military satellite was struck by a fragment from an Ariane-1 H-10 upper stage that had exploded 10 years earlier, severing its gravity gradient boom.',
    fragments: 'Known impactor fragment',
    orbitRange: '~680 km',
    decayTimeline: 'N/A (impact event)',
    severity: 'moderate',
  },
  {
    year: 2018,
    title: 'RemoveDEBRIS Net Capture Test',
    description: 'The University of Surrey\'s RemoveDEBRIS mission successfully demonstrated net capture technology in orbit, catching a deployed cubesat target in a landmark active debris removal test.',
    fragments: 'N/A (remediation test)',
    orbitRange: '~400 km',
    decayTimeline: 'Technology demonstration; platform deorbited 2019',
    severity: 'low',
  },
  {
    year: 2020,
    title: 'Close Approach: IRAS & GGSE-4',
    description: 'Two defunct objects\u2014the IRAS telescope and the GGSE-4 payload\u2014passed within an estimated 12 meters of each other, narrowly avoiding what would have been a catastrophic collision generating thousands of fragments.',
    fragments: 'Near-miss (no fragments)',
    orbitRange: '~900 km',
    decayTimeline: 'N/A (near-miss)',
    severity: 'high',
  },
  {
    year: 2025,
    title: 'Starlink Constellation Maneuvers Surge',
    description: 'SpaceX reported a significant increase in collision avoidance maneuvers for its Starlink constellation, executing thousands of automated maneuvers per month as LEO becomes increasingly congested.',
    fragments: 'N/A (avoidance operations)',
    orbitRange: '~550 km',
    decayTimeline: 'Ongoing operational challenge',
    severity: 'moderate',
  },
];

// ════════════════════════════════════════
// Debris by Orbit
// ════════════════════════════════════════

const ORBIT_BREAKDOWN: OrbitBreakdown[] = [
  { orbit: 'LEO', fullName: 'Low Earth Orbit', altitudeRange: '200\u20132,000 km', tracked: 27000, maxTracked: 27000, color: 'bg-cyan-500' },
  { orbit: 'MEO', fullName: 'Medium Earth Orbit', altitudeRange: '2,000\u201335,786 km', tracked: 1800, maxTracked: 27000, color: 'bg-blue-500' },
  { orbit: 'GEO', fullName: 'Geostationary Orbit', altitudeRange: '~35,786 km', tracked: 4200, maxTracked: 27000, color: 'bg-purple-500' },
  { orbit: 'HEO', fullName: 'Highly Elliptical Orbit', altitudeRange: 'Variable', tracked: 1500, maxTracked: 27000, color: 'bg-amber-500' },
];

// ════════════════════════════════════════
// Top Contributors
// ════════════════════════════════════════

const CONTRIBUTORS: Contributor[] = [
  { name: 'Russia/CIS', objects: 7500, color: 'bg-red-500' },
  { name: 'USA', objects: 6000, color: 'bg-blue-500' },
  { name: 'China', objects: 4800, color: 'bg-yellow-500' },
  { name: 'France', objects: 600, color: 'bg-indigo-500' },
  { name: 'Japan', objects: 400, color: 'bg-pink-500' },
  { name: 'India', objects: 400, color: 'bg-orange-500' },
  { name: 'ESA', objects: 200, color: 'bg-teal-500' },
];

const MAX_CONTRIBUTOR_OBJECTS = 7500;

// ════════════════════════════════════════
// Active Remediation Programs
// ════════════════════════════════════════

const REMEDIATION_PROGRAMS: RemediationProgram[] = [
  {
    name: 'ClearSpace-1',
    organization: 'ESA / ClearSpace SA',
    status: 'In Development',
    statusColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
    description: 'Mission to capture and deorbit a Vega Secondary Payload Adapter (VESPA) upper stage using a four-armed robotic capture mechanism.',
    year: '2026 Launch',
    technique: 'Robotic arms capture',
  },
  {
    name: 'ADRAS-J',
    organization: 'Astroscale (JAXA contract)',
    status: 'Active',
    statusColor: 'text-green-400 bg-green-400/10 border-green-400/30',
    description: 'Active Debris Removal by Astroscale-Japan. Performing proximity inspection of a Japanese H-2A upper stage rocket body to demonstrate rendezvous and characterization capabilities.',
    year: '2024 Launch',
    technique: 'Proximity inspection & characterization',
  },
  {
    name: 'ELSA-d',
    organization: 'Astroscale',
    status: 'Completed',
    statusColor: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
    description: 'End-of-Life Services by Astroscale demonstration. Successfully demonstrated magnetic capture and release of a client satellite in orbit using a servicer spacecraft.',
    year: '2021\u20132023',
    technique: 'Magnetic docking plate capture',
  },
  {
    name: 'RemoveDEBRIS',
    organization: 'University of Surrey / SSC',
    status: 'Completed',
    statusColor: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
    description: 'Demonstrated multiple debris capture technologies in orbit including a net capture, a harpoon capture, and a vision-based navigation system for approaching debris.',
    year: '2018\u20132019',
    technique: 'Net capture & harpoon',
  },
  {
    name: 'CRD2',
    organization: 'JAXA',
    status: 'In Development',
    statusColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
    description: 'Commercial Removal of Debris Demonstration Phase 2. Developing technologies for large-scale debris removal targeting spent rocket upper stages in critical orbital regions.',
    year: 'TBD',
    technique: 'Robotic capture & deorbit',
  },
];

// ════════════════════════════════════════
// Severity helpers
// ════════════════════════════════════════

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'Critical' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', label: 'High' },
  moderate: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Moderate' },
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'Low Impact' },
};

// ════════════════════════════════════════
// Main Page Component
// ════════════════════════════════════════

export default function DebrisCatalogPage() {
  // Filter state
  const [orbitFilter, setOrbitFilter] = useState<OrbitFilter>('all');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [objectTypeFilter, setObjectTypeFilter] = useState<ObjectTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand/collapse for timeline
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let events = [...DEBRIS_EVENTS];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.year.toString().includes(q)
      );
    }

    // Origin filter maps to event titles
    if (originFilter !== 'all') {
      const originMap: Record<string, string[]> = {
        'Russia/CIS': ['Russia', 'Cosmos', 'IRAS'],
        'USA': ['Iridium', 'Starlink', 'ISS'],
        'China': ['China', 'Chinese'],
        'France': ['Cerise', 'Ariane'],
        'Japan': ['ADRAS'],
        'India': ['India', 'Shakti'],
        'ESA': ['RemoveDEBRIS'],
      };
      const keywords = originMap[originFilter] || [];
      if (keywords.length > 0) {
        events = events.filter((e) =>
          keywords.some((kw) => e.title.includes(kw) || e.description.includes(kw))
        );
      }
    }

    // Object type filter
    if (objectTypeFilter !== 'all') {
      const typeMap: Record<string, string[]> = {
        satellite: ['satellite', 'ASAT', 'Iridium', 'Cosmos', 'Fengyun', 'BLITS', 'Cerise', 'IRAS', 'GGSE'],
        rocket_body: ['upper stage', 'rocket', 'Ariane', 'H-10', 'VESPA'],
        fragment: ['fragment', 'debris', 'collision'],
      };
      const keywords = typeMap[objectTypeFilter] || [];
      if (keywords.length > 0) {
        events = events.filter((e) =>
          keywords.some((kw) => e.title.toLowerCase().includes(kw.toLowerCase()) || e.description.toLowerCase().includes(kw.toLowerCase()))
        );
      }
    }

    return events;
  }, [searchQuery, originFilter, objectTypeFilter]);

  // Filtered orbit breakdown
  const filteredOrbits = useMemo(() => {
    if (orbitFilter === 'all') return ORBIT_BREAKDOWN;
    return ORBIT_BREAKDOWN.filter((o) => o.orbit === orbitFilter);
  }, [orbitFilter]);

  // Filtered contributors
  const filteredContributors = useMemo(() => {
    if (originFilter === 'all') return CONTRIBUTORS;
    return CONTRIBUTORS.filter((c) => c.name === originFilter);
  }, [originFilter]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumbs */}
        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Operations', href: '/space-environment' },
          { name: 'Debris Catalog' },
        ]} />
        <Breadcrumbs
          items={[
            { label: 'Operations', href: '/space-environment' },
            { label: 'Debris Catalog' },
          ]}
        />

        {/* Header */}
        <AnimatedPageHeader
          title="Space Debris Catalog"
          subtitle="Comprehensive catalog of tracked orbital debris, major fragmentation events, remediation programs, and cascade risk assessment."
          icon={<span>&#x1F6F0;&#xFE0F;</span>}
          accentColor="red"
        />

        {/* ══════════ Search & Filter Bar ══════════ */}
        <ScrollReveal>
        <div className="card p-4 mb-8">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            {/* Search */}
            <div className="relative flex-1 w-full lg:max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search events, objects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
              />
            </div>

            {/* Orbit Filter */}
            <select
              value={orbitFilter}
              onChange={(e) => setOrbitFilter(e.target.value as OrbitFilter)}
              className="px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
            >
              <option value="all">All Orbits</option>
              <option value="LEO">LEO (200-2,000 km)</option>
              <option value="MEO">MEO</option>
              <option value="GEO">GEO (~35,786 km)</option>
              <option value="HEO">HEO (Variable)</option>
            </select>

            {/* Origin Country */}
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as OriginFilter)}
              className="px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
            >
              <option value="all">All Origins</option>
              <option value="Russia/CIS">Russia/CIS</option>
              <option value="USA">USA</option>
              <option value="China">China</option>
              <option value="France">France</option>
              <option value="Japan">Japan</option>
              <option value="India">India</option>
              <option value="ESA">ESA</option>
            </select>

            {/* Object Type */}
            <select
              value={objectTypeFilter}
              onChange={(e) => setObjectTypeFilter(e.target.value as ObjectTypeFilter)}
              className="px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
            >
              <option value="all">All Object Types</option>
              <option value="satellite">Satellites</option>
              <option value="rocket_body">Rocket Bodies</option>
              <option value="fragment">Fragments</option>
            </select>
          </div>
        </div>

        </ScrollReveal>

        {/* ══════════ Section 1: Debris Overview Stats ══════════ */}
        <section className="mb-10">
          <ScrollReveal>
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-cyan-400">{'// '}</span>Orbital Debris Overview
          </h2>
          </ScrollReveal>
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {OVERVIEW_STATS.map((stat) => (
              <StaggerItem key={stat.label}><div className="card p-5 text-center group">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-2xl md:text-3xl font-bold text-slate-100 mb-1 group-hover:text-cyan-400 transition-colors">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-slate-300 mb-0.5">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.detail}</div>
              </div></StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ══════════ Section 2: Major Debris Events Timeline ══════════ */}
        <ScrollReveal delay={0.1}>
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-cyan-400">{'// '}</span>Major Debris Events
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-400">No events match your current filters.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[52px] top-0 bottom-0 w-px bg-slate-700/50 hidden md:block" />

              <div className="space-y-4">
                {filteredEvents.map((event, index) => {
                  const sev = SEVERITY_STYLES[event.severity];
                  const isExpanded = expandedEvent === index;

                  return (
                    <div
                      key={`${event.year}-${event.title}`}
                      className="card p-0 overflow-hidden"
                    >
                      {/* Main row */}
                      <button
                        onClick={() => setExpandedEvent(isExpanded ? null : index)}
                        className="w-full flex items-start gap-4 p-5 text-left hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Year badge */}
                        <div className="flex-shrink-0 w-[52px]">
                          <span className="inline-block px-2 py-1 bg-slate-800 border border-slate-700/50 rounded-md text-xs font-mono font-bold text-slate-300">
                            {event.year}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-base font-semibold text-slate-100">
                              {event.title}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${sev.bg} ${sev.text} ${sev.border}`}>
                              {sev.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 line-clamp-2">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Fragments: {event.fragments}</span>
                            <span>Orbit: {event.orbitRange}</span>
                          </div>
                        </div>

                        {/* Expand chevron */}
                        <div className="flex-shrink-0 mt-1">
                          <svg
                            className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-slate-700/30">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="bg-slate-800/40 rounded-lg p-3">
                              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Fragment Count</div>
                              <div className="text-sm font-medium text-slate-200">{event.fragments}</div>
                            </div>
                            <div className="bg-slate-800/40 rounded-lg p-3">
                              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Orbit Range</div>
                              <div className="text-sm font-medium text-slate-200">{event.orbitRange}</div>
                            </div>
                            <div className="bg-slate-800/40 rounded-lg p-3">
                              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Decay Timeline</div>
                              <div className="text-sm font-medium text-slate-200">{event.decayTimeline}</div>
                            </div>
                          </div>
                          <p className="text-sm text-slate-300 mt-4 leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

        <RelatedModules modules={PAGE_RELATIONS['debris-catalog']} />
              </div>
            </div>
          )}
        </section>
        </ScrollReveal>

        {/* ══════════ Two-Column Layout: Orbit + Contributors ══════════ */}
        <ScrollReveal delay={0.2}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Section 3: Debris by Orbit */}
          <section>
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span className="text-cyan-400">{'// '}</span>Debris by Orbit
            </h2>
            <div className="card p-6">
              <div className="space-y-5">
                {filteredOrbits.map((orbit) => {
                  const pct = (orbit.tracked / orbit.maxTracked) * 100;
                  return (
                    <div key={orbit.orbit}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="text-sm font-semibold text-slate-200">{orbit.orbit}</span>
                          <span className="text-xs text-slate-500 ml-2">{orbit.fullName}</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-slate-300">
                          {orbit.tracked.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-800/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${orbit.color} transition-all duration-700 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{orbit.altitudeRange}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total Tracked</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {ORBIT_BREAKDOWN.reduce((sum, o) => sum + o.tracked, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Top Contributors */}
          <section>
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span className="text-cyan-400">{'// '}</span>Top Contributors
            </h2>
            <div className="card p-6">
              <div className="space-y-4">
                {filteredContributors.map((contributor, index) => {
                  const pct = (contributor.objects / MAX_CONTRIBUTOR_OBJECTS) * 100;
                  return (
                    <div key={contributor.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-600 w-5">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-semibold text-slate-200">
                            {contributor.name}
                          </span>
                        </div>
                        <span className="text-sm font-mono font-bold text-slate-300">
                          {contributor.objects.toLocaleString()}+
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-800/60 rounded-full overflow-hidden ml-7">
                        <div
                          className={`h-full rounded-full ${contributor.color} transition-all duration-700 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-700/30 text-xs text-slate-500">
                Source: ESA Space Debris Office, 18th Space Defense Squadron catalog data
              </div>
            </div>
          </section>
        </div>

        {/* ══════════ Section 5: Active Remediation Programs ══════════ */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-cyan-400">{'// '}</span>Active Remediation Programs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {REMEDIATION_PROGRAMS.map((program) => (
              <div key={program.name} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{program.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{program.organization}</p>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${program.statusColor}`}>
                    {program.status}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed flex-1 mb-3">
                  {program.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-700/30">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {program.year}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {program.technique}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ Section 6: Kessler Syndrome Risk Assessment ══════════ */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-cyan-400">{'// '}</span>Kessler Syndrome Risk Assessment
          </h2>
          <div className="card p-6 border-orange-500/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Risk Level */}
              <div className="text-center md:text-left">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Risk Level</div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30">
                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-lg font-bold text-orange-400">Moderate-High</span>
                </div>
                <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                  The current rate of debris generation, combined with mega-constellation deployments, is approaching thresholds where cascading collisions become statistically significant in critical orbital bands.
                </p>
              </div>

              {/* Critical Altitude Bands */}
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Critical Altitude Bands</div>
                <div className="space-y-3">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-red-400">800 &ndash; 1,000 km</span>
                      <span className="text-xs text-red-400/80">Highest Density</span>
                    </div>
                    <p className="text-xs text-slate-400">Peak debris concentration zone. Includes fragments from 2007 China ASAT test and 2009 Iridium-Cosmos collision.</p>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-orange-400">700 &ndash; 800 km</span>
                      <span className="text-xs text-orange-400/80">High Density</span>
                    </div>
                    <p className="text-xs text-slate-400">Sun-synchronous orbit region with significant debris and active satellite population overlap.</p>
                  </div>
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-yellow-400">500 &ndash; 600 km</span>
                      <span className="text-xs text-yellow-400/80">Growing Concern</span>
                    </div>
                    <p className="text-xs text-slate-400">Mega-constellation deployment zone. Starlink, OneWeb, and others are rapidly increasing object density here.</p>
                  </div>
                </div>
              </div>

              {/* Cascade Timeline */}
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Cascade Timeline Estimate</div>
                <div className="space-y-3">
                  <div className="bg-slate-800/40 rounded-lg p-3">
                    <div className="text-sm font-semibold text-slate-200 mb-1">Current Trajectory</div>
                    <p className="text-xs text-slate-400">Without active debris removal, models predict the onset of cascading collisions in the 800-1,000 km band within 50-100 years.</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-3">
                    <div className="text-sm font-semibold text-slate-200 mb-1">With Mitigation</div>
                    <p className="text-xs text-slate-400">Removing 5-10 large objects per year from critical bands could stabilize the environment and significantly extend the cascade timeline.</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-3">
                    <div className="text-sm font-semibold text-slate-200 mb-1">Key Metric</div>
                    <p className="text-xs text-slate-400">
                      The &ldquo;critical density&rdquo; threshold for LEO is estimated at ~1 collision every 5 years generating enough fragments to sustain a chain reaction.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom disclaimer */}
            <div className="mt-6 pt-4 border-t border-slate-700/30 text-xs text-slate-500 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Risk assessments based on ESA Space Debris Office models, NASA ORDEM, and IADC guidelines. Actual cascade timelines depend on launch rates, compliance with post-mission disposal guidelines, and active debris removal efforts.
              </span>
            </div>
          </div>
        </section>

        {/* ══════════ Data Sources Footer ══════════ */}
        <section className="mb-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Data Sources &amp; References</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0" />
                18th Space Defense Squadron (US Space Force) &mdash; SSN Catalog
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0" />
                ESA Space Debris Office &mdash; Annual Environment Report
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0" />
                NASA Orbital Debris Program Office (ODPO)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0" />
                Inter-Agency Space Debris Coordination Committee (IADC)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0" />
                Space-Track.org &mdash; Public catalog data
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0" />
                CelesTrak &mdash; SOCRATES conjunction assessments
              </div>
            </div>
          </div>
        </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
