'use client';

import React, { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// --- Types ---

type ConfidenceLevel = 'Confirmed' | 'Likely' | 'Tentative' | 'Speculative';
type MissionCategory = 'Human Spaceflight' | 'Robotic Science' | 'Commercial' | 'Military';

interface Mission {
  name: string;
  operator: string;
  destination: string;
  vehicle: string;
  confidence: ConfidenceLevel;
  description: string;
  icon: string;
  category: MissionCategory;
  year: string;
}

// --- Data ---

const MISSIONS: Mission[] = [
  // 2025
  {
    name: 'Artemis II',
    operator: 'NASA',
    destination: 'Lunar Flyby',
    vehicle: 'SLS / Orion',
    confidence: 'Confirmed',
    description:
      'The first crewed Artemis mission will send four astronauts on a 10-day lunar flyby, testing Orion life support systems and deep-space navigation. This marks humanity\'s return to the Moon\'s vicinity for the first time since Apollo 17.',
    icon: '\u{1F315}',
    category: 'Human Spaceflight',
    year: '2025',
  },
  {
    name: 'Europa Clipper Arrival',
    operator: 'NASA / JPL',
    destination: 'Jupiter (Europa)',
    vehicle: 'Europa Clipper',
    confidence: 'Confirmed',
    description:
      'After launching in 2024, Europa Clipper begins its science campaign around Jupiter\'s icy moon Europa. The spacecraft will perform dozens of close flybys to investigate the subsurface ocean and assess habitability potential.',
    icon: '\u{1FA90}',
    category: 'Robotic Science',
    year: '2025',
  },
  {
    name: 'New Glenn First Launch',
    operator: 'Blue Origin',
    destination: 'Low Earth Orbit',
    vehicle: 'New Glenn',
    confidence: 'Likely',
    description:
      'Blue Origin\'s heavy-lift orbital rocket aims to complete its inaugural flight, establishing a new competitor in the heavy-launch market. New Glenn features a reusable first stage designed for 25+ flights.',
    icon: '\u{1F680}',
    category: 'Commercial',
    year: '2025',
  },
  {
    name: 'Dream Chaser First Mission',
    operator: 'Sierra Space',
    destination: 'ISS / Low Earth Orbit',
    vehicle: 'Dream Chaser / Vulcan Centaur',
    confidence: 'Likely',
    description:
      'Sierra Space\'s winged cargo spacecraft makes its first operational flight to the International Space Station. Dream Chaser lands on a conventional runway, enabling gentle return of sensitive experiments.',
    icon: '\u{1F6E9}\u{FE0F}',
    category: 'Commercial',
    year: '2025',
  },
  {
    name: 'Project Kuiper First Satellites',
    operator: 'Amazon',
    destination: 'Low Earth Orbit',
    vehicle: 'Atlas V / New Glenn',
    confidence: 'Confirmed',
    description:
      'Amazon begins deploying its Kuiper broadband constellation with initial prototype and production satellites. The constellation aims to deliver affordable internet to underserved communities worldwide.',
    icon: '\u{1F4E1}',
    category: 'Commercial',
    year: '2025',
  },
  {
    name: 'Starship Rapid Reuse Demos',
    operator: 'SpaceX',
    destination: 'Suborbital / Orbital',
    vehicle: 'Starship / Super Heavy',
    confidence: 'Likely',
    description:
      'SpaceX targets rapid turnaround demonstrations of the fully reusable Starship system, including booster catch-and-refly attempts. Success here is critical for Artemis III lunar lander and Mars mission timelines.',
    icon: '\u{2B50}',
    category: 'Commercial',
    year: '2025',
  },

  // 2026
  {
    name: 'Lunar Gateway PPE+HALO Launch',
    operator: 'NASA',
    destination: 'Near-Rectilinear Halo Orbit (Moon)',
    vehicle: 'Falcon Heavy',
    confidence: 'Confirmed',
    description:
      'The first two modules of the Lunar Gateway station launch together: the Power and Propulsion Element and the Habitation and Logistics Outpost. Gateway will serve as a staging point for lunar surface missions.',
    icon: '\u{1F6F8}',
    category: 'Human Spaceflight',
    year: '2026',
  },
  {
    name: 'VIPER Lunar Rover',
    operator: 'NASA',
    destination: 'Lunar South Pole',
    vehicle: 'Falcon Heavy / Griffin Lander',
    confidence: 'Likely',
    description:
      'The Volatiles Investigating Polar Exploration Rover will explore the Moon\'s south pole searching for water ice deposits. VIPER\'s findings will directly inform where future Artemis astronauts set up base.',
    icon: '\u{1F916}',
    category: 'Robotic Science',
    year: '2026',
  },
  {
    name: 'Axiom Station Expansion',
    operator: 'Axiom Space',
    destination: 'Low Earth Orbit',
    vehicle: 'Various',
    confidence: 'Likely',
    description:
      'Axiom Space continues attaching commercial modules to the ISS, building toward an eventual free-flying commercial station. These modules will eventually detach to form the core of Axiom Station.',
    icon: '\u{1F3D7}\u{FE0F}',
    category: 'Commercial',
    year: '2026',
  },
  {
    name: 'Starship Lunar Lander Test',
    operator: 'SpaceX / NASA',
    destination: 'Lunar Surface',
    vehicle: 'Starship HLS',
    confidence: 'Tentative',
    description:
      'An uncrewed demonstration of the Starship Human Landing System, testing lunar descent, surface operations, and ascent capabilities. This test flight is a prerequisite for the crewed Artemis III landing.',
    icon: '\u{1F311}',
    category: 'Human Spaceflight',
    year: '2026',
  },
  {
    name: 'OneWeb Gen 2 Deployment',
    operator: 'Eutelsat OneWeb',
    destination: 'Low Earth Orbit',
    vehicle: 'Various',
    confidence: 'Likely',
    description:
      'OneWeb begins launching its second-generation constellation satellites with enhanced throughput and lower latency. Gen 2 satellites incorporate advanced beamforming technology for higher capacity per satellite.',
    icon: '\u{1F310}',
    category: 'Commercial',
    year: '2026',
  },

  // 2027
  {
    name: 'Artemis III Lunar Landing',
    operator: 'NASA / SpaceX',
    destination: 'Lunar South Pole',
    vehicle: 'SLS / Orion / Starship HLS',
    confidence: 'Tentative',
    description:
      'The first crewed lunar landing since Apollo 17 will place two astronauts on the Moon\'s south pole using SpaceX\'s Starship as the lander. Artemis III will conduct surface EVAs and collect samples from permanently shadowed craters.',
    icon: '\u{1F468}\u{200D}\u{1F680}',
    category: 'Human Spaceflight',
    year: '2027',
  },
  {
    name: 'Orbital Reef Station',
    operator: 'Blue Origin / Sierra Space',
    destination: 'Low Earth Orbit',
    vehicle: 'New Glenn',
    confidence: 'Tentative',
    description:
      'A commercial space station designed to accommodate up to 10 people for research, tourism, and manufacturing. Orbital Reef is a joint venture selected by NASA\'s Commercial LEO Destinations program.',
    icon: '\u{1F3E2}',
    category: 'Commercial',
    year: '2027',
  },
  {
    name: 'Starlab Station',
    operator: 'Voyager Space / Airbus',
    destination: 'Low Earth Orbit',
    vehicle: 'Starship',
    confidence: 'Tentative',
    description:
      'A continuously crewed commercial space station launching as a single module with built-in laboratory, habitat, and docking capabilities. Starlab leverages Airbus heritage from Columbus and ATV programs.',
    icon: '\u{1F52C}',
    category: 'Commercial',
    year: '2027',
  },
  {
    name: 'Mars Window Missions',
    operator: 'Various (ESA, CNSA, ISRO)',
    destination: 'Mars',
    vehicle: 'Various',
    confidence: 'Speculative',
    description:
      'The 2027 Mars transfer window offers launch opportunities for multiple international missions. Candidates include ESA\'s ExoMars rover revival, China\'s Mars sample return precursor, and India\'s follow-up mission.',
    icon: '\u{1F534}',
    category: 'Robotic Science',
    year: '2027',
  },

  // 2028
  {
    name: 'Artemis IV with Gateway',
    operator: 'NASA',
    destination: 'Lunar Orbit / Surface',
    vehicle: 'SLS Block 1B / Orion / Starship HLS',
    confidence: 'Tentative',
    description:
      'The first Artemis mission to dock with the Lunar Gateway station, delivering the I-Hab module and conducting extended lunar surface operations. Artemis IV validates the sustainable lunar exploration architecture.',
    icon: '\u{1F31B}',
    category: 'Human Spaceflight',
    year: '2028',
  },
  {
    name: 'Dragonfly Launch to Titan',
    operator: 'NASA',
    destination: 'Titan (Saturn moon)',
    vehicle: 'Heavy-lift (TBD)',
    confidence: 'Confirmed',
    description:
      'Dragonfly is a rotorcraft lander that will explore Saturn\'s largest moon Titan, studying prebiotic chemistry and habitability. It will fly to dozens of locations across Titan\'s diverse surface over a 2.7-year baseline mission.',
    icon: '\u{1FA81}',
    category: 'Robotic Science',
    year: '2028',
  },
  {
    name: 'Mars Sample Return Window',
    operator: 'NASA / ESA',
    destination: 'Mars / Earth Return',
    vehicle: 'Mars Ascent Vehicle / Earth Return Orbiter',
    confidence: 'Speculative',
    description:
      'The complex Mars Sample Return campaign aims to retrieve samples cached by the Perseverance rover and return them to Earth. The mission architecture has undergone multiple redesigns to reduce cost and complexity.',
    icon: '\u{1F4E6}',
    category: 'Robotic Science',
    year: '2028',
  },

  // 2029-2030
  {
    name: 'Commercial LEO Stations Operational',
    operator: 'Axiom / Blue Origin / Voyager',
    destination: 'Low Earth Orbit',
    vehicle: 'Various',
    confidence: 'Likely',
    description:
      'Multiple commercial space stations achieve full operational capability, providing continuous crewed presence in LEO after ISS retirement. These stations will host government, commercial, and tourist missions.',
    icon: '\u{1F3E0}',
    category: 'Commercial',
    year: '2029-2030',
  },
  {
    name: 'Lunar Surface Infrastructure',
    operator: 'NASA / International Partners',
    destination: 'Lunar South Pole',
    vehicle: 'Various',
    confidence: 'Tentative',
    description:
      'Permanent infrastructure at the lunar south pole begins taking shape, including power systems, habitats, and ISRU plants. This marks the transition from exploration to sustained lunar presence.',
    icon: '\u{1F3D7}\u{FE0F}',
    category: 'Human Spaceflight',
    year: '2029-2030',
  },
  {
    name: 'Deep Space Communications Network',
    operator: 'NASA / ESA / JAXA',
    destination: 'Solar System Wide',
    vehicle: 'N/A (Ground + Relay Infrastructure)',
    confidence: 'Likely',
    description:
      'Next-generation deep space communication capabilities using optical (laser) links and relay satellites dramatically increase data rates. This infrastructure supports the growing fleet of missions across the solar system.',
    icon: '\u{1F4E1}',
    category: 'Military',
    year: '2029-2030',
  },
  {
    name: 'Next-Gen GPS III Complete',
    operator: 'US Space Force / Lockheed Martin',
    destination: 'Medium Earth Orbit',
    vehicle: 'Falcon 9 / Vulcan Centaur',
    confidence: 'Confirmed',
    description:
      'The full GPS III constellation reaches operational capability with enhanced accuracy, anti-jam resilience, and new civil signals. GPS IIIF satellites add regional military protection and search-and-rescue features.',
    icon: '\u{1F6F0}\u{FE0F}',
    category: 'Military',
    year: '2029-2030',
  },
];

const YEAR_TABS = ['All', '2025', '2026', '2027', '2028', '2029-2030'] as const;
const CATEGORIES: MissionCategory[] = ['Human Spaceflight', 'Robotic Science', 'Commercial', 'Military'];

const CONFIDENCE_STYLES: Record<ConfidenceLevel, { bg: string; text: string; border: string }> = {
  Confirmed: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
  Likely: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  Tentative: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  Speculative: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40' },
};

const CATEGORY_ICONS: Record<MissionCategory, string> = {
  'Human Spaceflight': '\u{1F468}\u{200D}\u{1F680}',
  'Robotic Science': '\u{1F916}',
  Commercial: '\u{1F4BC}',
  Military: '\u{1F6E1}\u{FE0F}',
};

// --- Component ---

export default function MissionPipelinePage() {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<MissionCategory | 'All'>('All');

  const filteredMissions = useMemo(() => {
    return MISSIONS.filter((m) => {
      const yearMatch = selectedYear === 'All' || m.year === selectedYear;
      const catMatch = selectedCategory === 'All' || m.category === selectedCategory;
      return yearMatch && catMatch;
    });
  }, [selectedYear, selectedCategory]);

  const uniqueAgencies = useMemo(() => {
    const agencies = new Set<string>();
    MISSIONS.forEach((m) => {
      m.operator.split(/[/,]/).forEach((a) => agencies.add(a.trim()));
    });
    return agencies.size;
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Future Missions Pipeline"
          subtitle="Track every major upcoming space mission from launch to landing. Explore humanity's roadmap to the Moon, Mars, and beyond."
          icon="🚀"
          breadcrumb="Mission Planning"
          accentColor="cyan"
        />

        {/* Stats Bar */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-slate-300">{MISSIONS.length}+</p>
              <p className="text-sm text-slate-400 mt-1">Planned Missions</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-slate-300">{uniqueAgencies}+</p>
              <p className="text-sm text-slate-400 mt-1">Agencies &amp; Operators</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-slate-300">6</p>
              <p className="text-sm text-slate-400 mt-1">Year Range</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={0.15}>
          <div className="mb-8 space-y-4">
            {/* Year Tabs */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
                Filter by Year
              </label>
              <div className="flex flex-wrap gap-2">
                {YEAR_TABS.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedYear === year
                        ? 'bg-white/10 text-slate-300 border border-white/15 shadow-lg shadow-black/5'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
                Filter by Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategory === 'All'
                      ? 'bg-white/10 text-slate-300 border border-white/15 shadow-lg shadow-black/5'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  All Categories
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategory === cat
                        ? 'bg-white/10 text-slate-300 border border-white/15 shadow-lg shadow-black/5'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
                    }`}
                  >
                    <span className="mr-1.5">{CATEGORY_ICONS[cat]}</span>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Results Count */}
        <ScrollReveal delay={0.2}>
          <p className="text-sm text-slate-500 mb-6">
            Showing {filteredMissions.length} of {MISSIONS.length} missions
            {selectedYear !== 'All' && <span> in <span className="text-slate-300">{selectedYear}</span></span>}
            {selectedCategory !== 'All' && (
              <span>
                {' '}
                &middot; <span className="text-slate-300">{selectedCategory}</span>
              </span>
            )}
          </p>
        </ScrollReveal>

        {/* Mission Cards */}
        {filteredMissions.length === 0 ? (
          <ScrollReveal>
            <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/30">
              <p className="text-4xl mb-3">{'\u{1F52D}'}</p>
              <p className="text-slate-400 text-lg">No missions match your current filters.</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting the year or category filters above.</p>
            </div>
          </ScrollReveal>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.07}>
            {filteredMissions.map((mission, index) => {
              const conf = CONFIDENCE_STYLES[mission.confidence];
              return (
                <StaggerItem key={`${mission.year}-${mission.name}`}>
                  <div className="group bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 h-full flex flex-col hover:border-white/10 hover:bg-slate-800/70 transition-all duration-300 hover:shadow-lg hover:shadow-black/20/5">
                    {/* Top Row: Icon + Year Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl" role="img" aria-label={mission.name}>
                        {mission.icon}
                      </span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded">
                        {mission.year}
                      </span>
                    </div>

                    {/* Mission Name */}
                    <h3 className="text-lg font-semibold text-slate-100 mb-1 group-hover:text-white transition-colors">
                      {mission.name}
                    </h3>

                    {/* Operator */}
                    <p className="text-sm text-slate-300/80 mb-3">{mission.operator}</p>

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Confidence Badge */}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${conf.bg} ${conf.text} ${conf.border}`}
                      >
                        {mission.confidence}
                      </span>
                      {/* Category Badge */}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
                        {CATEGORY_ICONS[mission.category]}{' '}
                        {mission.category}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 mb-4 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0 w-20">Destination</span>
                        <span className="text-slate-300">{mission.destination}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0 w-20">Vehicle</span>
                        <span className="text-slate-300">{mission.vehicle}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-400 leading-relaxed mt-auto">
                      {mission.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}

        {/* Confidence Legend */}
        <ScrollReveal delay={0.2} className="mt-12">
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Confidence Level Guide</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(CONFIDENCE_STYLES) as ConfidenceLevel[]).map((level) => {
                const style = CONFIDENCE_STYLES[level];
                const descriptions: Record<ConfidenceLevel, string> = {
                  Confirmed: 'Mission is funded, hardware is in production or complete, and a launch date is scheduled.',
                  Likely: 'Strong programmatic support and funding; minor schedule risks remain.',
                  Tentative: 'Mission is approved but faces significant schedule, technical, or funding uncertainties.',
                  Speculative: 'Early planning phase, unfunded, or dependent on major milestones being achieved first.',
                };
                return (
                  <div key={level} className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 mt-0.5 ${style.bg} ${style.text} ${style.border}`}
                    >
                      {level}
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">{descriptions[level]}</p>
                  

        <RelatedModules modules={PAGE_RELATIONS['mission-pipeline']} />
      </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Disclaimer */}
        <ScrollReveal delay={0.25}>
          <p className="text-center text-xs text-slate-600 mt-8 mb-4">
            Mission timelines are based on publicly available information and are subject to change.
            Last updated February 2026.
          </p>
        </ScrollReveal>
      </div>
    </main>
  );
}
