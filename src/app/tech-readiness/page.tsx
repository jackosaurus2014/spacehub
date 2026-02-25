'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface Technology {
  name: string;
  category: string;
  trl: number;
  description: string;
  developers: string[];
  timeline: string;
  impact: string;
  challenges: string[];
}

type SortField = 'trl' | 'name' | 'timeline';
type SortDir = 'asc' | 'desc';

// ────────────────────────────────────────
// TRL scale definitions
// ────────────────────────────────────────

const TRL_LABELS: Record<number, string> = {
  1: 'Basic Principles Observed',
  2: 'Technology Concept Formulated',
  3: 'Experimental Proof of Concept',
  4: 'Technology Validated in Lab',
  5: 'Technology Validated in Relevant Environment',
  6: 'Technology Demonstrated in Relevant Environment',
  7: 'System Prototype Demonstration in Space',
  8: 'System Complete and Flight Qualified',
  9: 'Actual System Flight Proven',
};

function getTrlColor(trl: number): string {
  const colors: Record<number, string> = {
    1: 'bg-red-600',
    2: 'bg-red-500',
    3: 'bg-orange-500',
    4: 'bg-amber-500',
    5: 'bg-yellow-500',
    6: 'bg-lime-500',
    7: 'bg-green-500',
    8: 'bg-emerald-500',
    9: 'bg-teal-500',
  };
  return colors[trl] || 'bg-slate-500';
}

function getTrlTextColor(trl: number): string {
  const colors: Record<number, string> = {
    1: 'text-red-400',
    2: 'text-red-400',
    3: 'text-orange-400',
    4: 'text-amber-400',
    5: 'text-yellow-400',
    6: 'text-lime-400',
    7: 'text-green-400',
    8: 'text-emerald-400',
    9: 'text-teal-400',
  };
  return colors[trl] || 'text-slate-400';
}

function getTrlBorderColor(trl: number): string {
  const colors: Record<number, string> = {
    1: 'border-red-600/40',
    2: 'border-red-500/40',
    3: 'border-orange-500/40',
    4: 'border-amber-500/40',
    5: 'border-yellow-500/40',
    6: 'border-lime-500/40',
    7: 'border-green-500/40',
    8: 'border-emerald-500/40',
    9: 'border-teal-500/40',
  };
  return colors[trl] || 'border-slate-500/40';
}

// ────────────────────────────────────────
// Category metadata
// ────────────────────────────────────────

const CATEGORIES = [
  { id: 'Propulsion', icon: '🚀', color: 'text-orange-400' },
  { id: 'Materials', icon: '🧱', color: 'text-amber-400' },
  { id: 'Communications', icon: '📡', color: 'text-blue-400' },
  { id: 'Power', icon: '⚡', color: 'text-yellow-400' },
  { id: 'Manufacturing', icon: '🏭', color: 'text-cyan-400' },
  { id: 'AI & Autonomy', icon: '🤖', color: 'text-purple-400' },
  { id: 'Life Support', icon: '🫁', color: 'text-green-400' },
];

// ────────────────────────────────────────
// Technology data (27 entries)
// ────────────────────────────────────────

const TECHNOLOGIES: Technology[] = [
  // --- Propulsion ---
  {
    name: 'Nuclear Thermal Propulsion (NTP)',
    category: 'Propulsion',
    trl: 4,
    description:
      'Uses a nuclear fission reactor to heat hydrogen propellant, achieving roughly twice the specific impulse of chemical rockets. Enables faster crewed Mars transits by cutting travel time from 9 months to approximately 4.',
    developers: ['NASA', 'DARPA (DRACO)', 'BWX Technologies', 'Lockheed Martin'],
    timeline: '2027-2030',
    impact: 'Enables crewed Mars missions with reduced transit time and lower propellant mass',
    challenges: [
      'Nuclear regulatory approvals for launch',
      'Reactor shielding mass penalties',
      'Ground testing constraints for nuclear exhaust',
      'Public perception of nuclear in space',
    ],
  },
  {
    name: 'Hall-Effect Thrusters (Advanced)',
    category: 'Propulsion',
    trl: 8,
    description:
      'Next-generation Hall thrusters operating at higher power levels (50-100 kW) with nested channel designs. Provide efficient electric propulsion for large spacecraft and cargo tugs.',
    developers: ['Busek', 'Aerojet Rocketdyne', 'NASA Glenn', 'Safran'],
    timeline: '2025-2027',
    impact: 'High-efficiency orbit transfers and deep-space cargo delivery',
    challenges: [
      'Electrode erosion at high power',
      'Power supply mass and solar array sizing',
      'Thrust-to-weight ratio for crewed missions',
    ],
  },
  {
    name: 'Rotating Detonation Engines (RDE)',
    category: 'Propulsion',
    trl: 3,
    description:
      'Continuously detonates fuel in a rotating wave inside an annular chamber, achieving higher thermodynamic efficiency than conventional deflagration combustion. Promises 25% fuel savings over traditional engines.',
    developers: ['NASA MSFC', 'Aerojet Rocketdyne', 'Venus Aerospace', 'JAXA'],
    timeline: '2029-2033',
    impact: 'Major improvement in fuel efficiency for upper stages and in-space propulsion',
    challenges: [
      'Stable detonation wave control',
      'Thermal management of chamber walls',
      'Scaling to flight-weight hardware',
      'Injector design for consistent detonation',
    ],
  },
  {
    name: 'Green Propellant Systems (AF-M315E / LMP-103S)',
    category: 'Propulsion',
    trl: 7,
    description:
      'Low-toxicity monopropellants replacing hydrazine. AF-M315E (now ASCENT) offers 50% higher performance by density and simpler handling, dramatically reducing launch processing costs.',
    developers: ['NASA', 'Ball Aerospace', 'Bradford ECAPS', 'AFRL'],
    timeline: '2025-2026',
    impact: 'Safer handling, lower launch costs, and better performance than hydrazine',
    challenges: [
      'Catalyst preheating requirements',
      'Long-duration storage qualification',
      'Supply chain maturation for new propellant',
    ],
  },
  {
    name: 'Gridded Ion Thrusters (Next-Gen)',
    category: 'Propulsion',
    trl: 7,
    description:
      'High-specific-impulse electric thrusters using electrostatic grids to accelerate xenon or krypton ions. NEXT-C and derivatives target 7 kW+ operation for deep-space missions.',
    developers: ['NASA Glenn', 'Aerojet Rocketdyne', 'QinetiQ', 'JAXA'],
    timeline: '2025-2028',
    impact: 'Enables efficient deep-space and asteroid missions with extended operational life',
    challenges: [
      'Grid erosion limiting thruster lifetime',
      'Xenon supply constraints and cost',
      'Krypton performance trade-offs',
    ],
  },

  // --- Materials ---
  {
    name: 'Advanced Radiation Shielding Composites',
    category: 'Materials',
    trl: 4,
    description:
      'Multi-layer composites incorporating hydrogen-rich polymers, boron nitride nanotubes, and regolith-derived ceramics. Designed to attenuate GCR and SPE radiation for deep-space habitats.',
    developers: ['NASA Langley', 'Lockheed Martin', 'BNNT LLC', 'ESA'],
    timeline: '2028-2031',
    impact: 'Critical enabler for long-duration crewed missions beyond LEO',
    challenges: [
      'Mass penalties versus protection level',
      'GCR attenuation remains difficult',
      'Integration with structural elements',
      'Long-term material degradation in space',
    ],
  },
  {
    name: 'Inflatable / Expandable Habitat Modules',
    category: 'Materials',
    trl: 7,
    description:
      'Soft-goods habitat structures that launch compactly and expand on-orbit to provide large pressurized volumes. BEAM module on ISS has demonstrated multi-year performance.',
    developers: ['Sierra Space', 'Bigelow Aerospace', 'NASA JSC', 'Lockheed Martin'],
    timeline: '2025-2027',
    impact: 'Dramatically increases habitable volume per launch mass for stations and bases',
    challenges: [
      'MMOD protection for soft walls',
      'Pressure seal reliability over decades',
      'Fire safety in large-volume modules',
    ],
  },
  {
    name: 'Lunar Regolith Construction (Sintering/3D Printing)',
    category: 'Materials',
    trl: 3,
    description:
      'Uses concentrated solar energy or microwave sintering to fuse lunar regolith into structural blocks, roads, and landing pads. Reduces Earth-launched construction mass by up to 90%.',
    developers: ['ICON', 'AI SpaceFactory', 'ESA / Foster+Partners', 'NASA KSC'],
    timeline: '2029-2034',
    impact: 'Enables large-scale lunar base construction using local materials',
    challenges: [
      'Regolith variability across lunar sites',
      'Dust contamination of equipment',
      'Vacuum-compatible sintering processes',
      'Structural qualification standards',
    ],
  },

  // --- Communications ---
  {
    name: 'Optical / Laser Communications (LCRD)',
    category: 'Communications',
    trl: 7,
    description:
      'Free-space optical links using modulated laser beams to achieve 10-100x higher data rates than RF. NASA LCRD demonstrated 1.2 Gbps from GEO. DSOC pushing laser comms to deep space.',
    developers: ['NASA GSFC', 'MIT Lincoln Lab', 'General Atomics', 'Mynaric'],
    timeline: '2025-2027',
    impact: 'Enables HD video from deep space and massive data downlink from LEO constellations',
    challenges: [
      'Atmospheric scintillation and cloud blockage',
      'Precision pointing requirements',
      'Ground station network buildout',
      'Deep-space link budget constraints',
    ],
  },
  {
    name: 'Quantum Key Distribution (Space-Based)',
    category: 'Communications',
    trl: 4,
    description:
      'Distributes quantum-encrypted keys via satellite using entangled photon pairs. China\'s Micius satellite demonstrated QKD over 1,200 km. Enables theoretically unbreakable encryption for space networks.',
    developers: ['USTC / Micius Team', 'ESA SAGA', 'ArQit', 'SpeQtral'],
    timeline: '2028-2032',
    impact: 'Ultra-secure communications for defense, financial, and diplomatic space links',
    challenges: [
      'Photon loss over long distances',
      'Daylight operation limitations',
      'Detector efficiency and dark counts',
      'Integration with classical network infrastructure',
    ],
  },
  {
    name: 'Delay/Disruption-Tolerant Networking (DTN)',
    category: 'Communications',
    trl: 6,
    description:
      'Store-and-forward networking protocol suite designed for space environments where continuous connectivity is impossible. Implements Bundle Protocol for interplanetary internet.',
    developers: ['NASA JPL', 'Johns Hopkins APL', 'ESA ESOC', 'CCSDS'],
    timeline: '2026-2028',
    impact: 'Enables reliable data transfer across the solar system despite light-speed delays',
    challenges: [
      'Buffer management on resource-constrained spacecraft',
      'Security key management across delay',
      'Interoperability between agency implementations',
    ],
  },
  {
    name: 'Reconfigurable Intelligent Surfaces for Space',
    category: 'Communications',
    trl: 2,
    description:
      'Meta-surface antenna panels that electronically steer and shape RF beams without mechanical movement. Could enable ultra-lightweight, high-gain antennas for small satellites.',
    developers: ['MIT', 'Greenerwave', 'NTT', 'ESA'],
    timeline: '2030-2035',
    impact: 'Low-mass, electronically steered high-gain antennas for CubeSats and constellations',
    challenges: [
      'Radiation tolerance of meta-materials',
      'Bandwidth limitations',
      'Manufacturing consistency at scale',
      'Space qualification of novel materials',
    ],
  },

  // --- Power ---
  {
    name: 'Space-Based Solar Power (SBSP)',
    category: 'Power',
    trl: 3,
    description:
      'Collects solar energy in orbit using massive arrays and beams it to Earth via microwave or laser. Caltech SSPD-1 demonstrated wireless power transfer from orbit in 2023.',
    developers: ['Caltech / SSPP', 'ESA SOLARIS', 'JAXA', 'Virtus Solis'],
    timeline: '2032-2040',
    impact: 'Continuous gigawatt-scale clean energy beamed to any location on Earth',
    challenges: [
      'Enormous on-orbit assembly requirements',
      'Wireless power transfer efficiency',
      'Cost per watt vs. terrestrial solar',
      'Orbital debris and collision risk for large structures',
    ],
  },
  {
    name: 'Kilopower / Fission Surface Power',
    category: 'Power',
    trl: 5,
    description:
      'Compact nuclear fission reactors producing 1-40 kW of electrical power for lunar and Mars surface operations. NASA KRUSTY test demonstrated full-power operation of a Stirling-based system.',
    developers: ['NASA Glenn', 'DOE / NNSA', 'Lockheed Martin', 'IX (Intuitive Machines)'],
    timeline: '2028-2030',
    impact: 'Reliable power for lunar bases through 14-day nights and Mars dust storms',
    challenges: [
      'Launch safety and nuclear regulatory approvals',
      'Heat rejection in vacuum',
      'Autonomous startup and load following',
      'Integration with habitat power grids',
    ],
  },
  {
    name: 'Solid-State Batteries for Space',
    category: 'Power',
    trl: 4,
    description:
      'All-solid-state lithium batteries offering higher energy density, wider temperature range, and improved safety over liquid electrolyte cells. Critical for EVA suits, rovers, and small spacecraft.',
    developers: ['QuantumScape', 'Samsung SDI', 'NASA JPL', 'Toyota'],
    timeline: '2027-2030',
    impact: 'Higher energy density and safety for spacesuits, rovers, and CubeSats',
    challenges: [
      'Interface resistance between solid electrolyte and electrodes',
      'Cycling stability in thermal extremes',
      'Manufacturing scale-up for space-grade cells',
    ],
  },

  // --- Manufacturing ---
  {
    name: 'In-Space 3D Printing (Metals & Polymers)',
    category: 'Manufacturing',
    trl: 6,
    description:
      'Additive manufacturing in microgravity for producing spare parts, tools, and structural components on-demand. Made In Space (now Redwire) printed tools on ISS. Metal printing in development.',
    developers: ['Redwire (Made In Space)', 'Relativity Space', 'NASA MSFC', 'Airbus'],
    timeline: '2026-2029',
    impact: 'Reduces logistics dependency for long-duration missions by manufacturing on-demand',
    challenges: [
      'Metal feedstock handling in microgravity',
      'Quality assurance without full ground labs',
      'Outgassing and contamination in cabin',
      'Certification of printed flight-critical parts',
    ],
  },
  {
    name: 'In-Situ Resource Utilization (ISRU) - Oxygen Extraction',
    category: 'Manufacturing',
    trl: 5,
    description:
      'Extracting oxygen from lunar regolith or Martian CO2 for propellant and life support. MOXIE on Perseverance produced oxygen on Mars. Lunar ice extraction techniques in active development.',
    developers: ['NASA JPL (MOXIE)', 'ESA PROSPECT', 'Intuitive Machines', 'Astrobotic'],
    timeline: '2027-2031',
    impact: 'Enables sustainable deep-space operations without constant resupply from Earth',
    challenges: [
      'Scaling from demonstration to production rates',
      'Regolith excavation and transport systems',
      'Thermal energy requirements for processing',
      'Water ice deposit characterization uncertainty',
    ],
  },
  {
    name: 'Orbital Assembly & Robotic Construction',
    category: 'Manufacturing',
    trl: 4,
    description:
      'Robotic systems that autonomously assemble large structures in orbit from modular components. Enables construction of space stations, solar arrays, and telescope structures too large to launch whole.',
    developers: ['Orbital Reef (Blue Origin/Sierra)', 'Maxar', 'NASA Goddard', 'Tethers Unlimited'],
    timeline: '2028-2032',
    impact: 'Enables structures far larger than any launch fairing for stations and observatories',
    challenges: [
      'Robotic dexterity in microgravity',
      'Autonomous inspection and quality control',
      'Thermal cycling effects on joints',
      'Logistics of modular component delivery',
    ],
  },
  {
    name: 'Space-Based Semiconductor Manufacturing',
    category: 'Manufacturing',
    trl: 2,
    description:
      'Leveraging microgravity for producing higher-purity semiconductor crystals and fiber optics. ZBLAN fiber produced in space shows vastly superior optical properties to ground-manufactured equivalents.',
    developers: ['Varda Space Industries', 'Space Tango', 'Redwire', 'Flawless Photonics'],
    timeline: '2030-2035',
    impact: 'Ultra-high-quality optical fibers and crystals not achievable under gravity',
    challenges: [
      'Return-to-Earth logistics and cost',
      'Automated furnace operation in microgravity',
      'Market price points for space-made products',
      'Contamination control in orbital facilities',
    ],
  },

  // --- AI & Autonomy ---
  {
    name: 'Autonomous Rendezvous & Proximity Operations',
    category: 'AI & Autonomy',
    trl: 7,
    description:
      'AI-driven navigation systems enabling spacecraft to autonomously approach, inspect, and dock with targets. Demonstrated by MEV-1/2 servicing missions and multiple cargo vehicle dockings.',
    developers: ['Northrop Grumman (MEV)', 'Astroscale', 'NASA (OSAM-1)', 'D-Orbit'],
    timeline: '2025-2027',
    impact: 'Enables satellite servicing, debris removal, and autonomous station assembly',
    challenges: [
      'Non-cooperative target tumble estimation',
      'Lighting and sensor degradation',
      'Collision avoidance during close approach',
    ],
  },
  {
    name: 'AI-Driven Mission Operations',
    category: 'AI & Autonomy',
    trl: 5,
    description:
      'Machine learning systems that automate spacecraft health monitoring, anomaly detection, and mission replanning. Reduces ground crew workload and enables faster response than human-in-the-loop.',
    developers: ['NASA JPL', 'KBR', 'Palantir', 'Slingshot Aerospace'],
    timeline: '2026-2029',
    impact: 'Dramatically reduces ops costs and enables autonomous deep-space mission management',
    challenges: [
      'Verification & validation of ML decisions',
      'Training data scarcity for rare events',
      'Explainability requirements for safety-critical systems',
      'Cybersecurity of AI decision systems',
    ],
  },
  {
    name: 'Satellite Swarm Coordination',
    category: 'AI & Autonomy',
    trl: 4,
    description:
      'Distributed AI algorithms enabling dozens to hundreds of small satellites to self-organize for coordinated observation, communication relay, or formation flying without centralized control.',
    developers: ['NASA Ames', 'MIT Space Systems Lab', 'Swarm Technologies', 'ESA OPS-SAT'],
    timeline: '2028-2031',
    impact: 'Enables distributed sensor networks and resilient space architectures',
    challenges: [
      'Inter-satellite communication bandwidth',
      'Consensus algorithms with signal latency',
      'Fault tolerance when nodes fail',
      'Spectrum management for large swarms',
    ],
  },
  {
    name: 'Cognitive Radio for Space Networks',
    category: 'AI & Autonomy',
    trl: 3,
    description:
      'Software-defined radios using AI to dynamically select frequencies, modulation, and power based on the electromagnetic environment. Enables efficient spectrum use in congested orbital bands.',
    developers: ['NASA Glenn', 'Harris (L3Harris)', 'Virginia Tech', 'DARPA'],
    timeline: '2028-2032',
    impact: 'Adaptive spectrum sharing for growing satellite mega-constellations',
    challenges: [
      'Real-time spectrum sensing in orbit',
      'Regulatory frameworks for dynamic allocation',
      'Processing power on small satellites',
      'Testing and verification complexity',
    ],
  },

  // --- Life Support ---
  {
    name: 'Closed-Loop ECLSS (>98% Recovery)',
    category: 'Life Support',
    trl: 5,
    description:
      'Environmental Control and Life Support Systems recovering >98% of water and oxygen from crew metabolic waste. Builds on ISS ECLSS which achieves ~90% water recovery.',
    developers: ['NASA MSFC', 'Collins Aerospace', 'Honeywell', 'Paragon SDC'],
    timeline: '2027-2030',
    impact: 'Essential for Mars missions where resupply is impossible',
    challenges: [
      'Brine processing for final water recovery',
      'Trace contaminant removal reliability',
      'Biological fouling of membranes',
      'Spare parts and maintenance on multi-year missions',
    ],
  },
  {
    name: 'Artificial Gravity via Rotation (Short-Radius)',
    category: 'Life Support',
    trl: 2,
    description:
      'Short-radius centrifuge systems providing intermittent or continuous partial gravity to counter bone loss, muscle atrophy, and fluid shift effects during long-duration spaceflight.',
    developers: ['NASA HRP', 'MIT Man-Vehicle Lab', 'University of Colorado', 'ESA'],
    timeline: '2032-2038',
    impact: 'Prevents physiological deconditioning on multi-year Mars transit missions',
    challenges: [
      'Coriolis effects and motion sickness',
      'Structural integration with spacecraft',
      'Minimum effective gravity dose unknown',
      'Mechanical bearing reliability over years',
    ],
  },
  {
    name: 'Active Radiation Countermeasures (Pharmaceutical/Biological)',
    category: 'Life Support',
    trl: 2,
    description:
      'Pharmaceutical compounds and biological interventions (radioprotectors, DNA repair enhancers) that mitigate the effects of space radiation exposure on crews during deep-space missions.',
    developers: ['NASA HRP', 'Georgetown University', 'Brigham & Women\'s Hospital', 'JAXA'],
    timeline: '2030-2035',
    impact: 'Reduces cancer and degenerative disease risk for deep-space crews',
    challenges: [
      'Side effects of chronic radioprotector use',
      'Efficacy against GCR heavy ions',
      'Individual genetic variability in response',
      'Regulatory pathway for space-only pharmaceuticals',
    ],
  },
];

// ────────────────────────────────────────
// Helper: parse timeline year for sorting
// ────────────────────────────────────────

function parseTimelineYear(timeline: string): number {
  const match = timeline.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : 9999;
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function TechReadinessPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [trlMin, setTrlMin] = useState<number>(1);
  const [trlMax, setTrlMax] = useState<number>(9);
  const [sortField, setSortField] = useState<SortField>('trl');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  // Filtered and sorted technologies
  const filteredTechs = useMemo(() => {
    const result = TECHNOLOGIES.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (t.trl < trlMin || t.trl > trlMax) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'trl':
          cmp = a.trl - b.trl;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'timeline':
          cmp = parseTimelineYear(a.timeline) - parseTimelineYear(b.timeline);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [categoryFilter, trlMin, trlMax, sortField, sortDir]);

  // Category summary stats
  const categorySummary = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const techs = TECHNOLOGIES.filter((t) => t.category === cat.id);
      const avgTrl = techs.length > 0
        ? Math.round((techs.reduce((sum, t) => sum + t.trl, 0) / techs.length) * 10) / 10
        : 0;
      return {
        ...cat,
        count: techs.length,
        avgTrl,
        minTrl: techs.length > 0 ? Math.min(...techs.map((t) => t.trl)) : 0,
        maxTrl: techs.length > 0 ? Math.max(...techs.map((t) => t.trl)) : 0,
      };
    });
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Technology Readiness Tracker"
          subtitle="Tracking emerging space technologies from concept to flight-proven systems using NASA's TRL scale"
          icon={<span>🔬</span>}
          accentColor="purple"
        />

        {/* TRL Scale Reference */}
        <ScrollReveal delay={0.1}>
          <div className="mb-8 bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Technology Readiness Level Scale
            </h2>
            <div className="grid grid-cols-9 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <div key={level} className="flex flex-col items-center">
                  <div
                    className={`w-full h-3 rounded-full ${getTrlColor(level)}`}
                    title={TRL_LABELS[level]}
                  />
                  <span className={`text-xs font-bold mt-1 ${getTrlTextColor(level)}`}>
                    {level}
                  </span>
                  <span className="text-[10px] text-slate-400 text-center leading-tight mt-0.5 hidden md:block">
                    {TRL_LABELS[level]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-500">
              <span>Research</span>
              <span>Development</span>
              <span>Operational</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Category Summary Cards */}
        <ScrollReveal delay={0.15}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Average TRL by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {categorySummary.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() =>
                    setCategoryFilter(categoryFilter === cat.id ? 'All' : cat.id)
                  }
                  className={`p-3 rounded-lg border text-left transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-purple-900/40 border-purple-500/60 ring-1 ring-purple-500/30'
                      : 'bg-slate-900/60 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className={`text-xs font-medium ${cat.color}`}>{cat.id}</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className={`text-xl font-bold ${getTrlTextColor(Math.round(cat.avgTrl))}`}>
                      {cat.avgTrl}
                    </span>
                    <span className="text-[10px] text-slate-500 mb-0.5">avg TRL</span>
                  </div>
                  <div className="mt-1.5 w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${getTrlColor(Math.round(cat.avgTrl))}`}
                      style={{ width: `${(cat.avgTrl / 9) * 100}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {cat.count} tech{cat.count !== 1 ? 's' : ''} &middot; TRL {cat.minTrl}-{cat.maxTrl}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Filters & Sort Controls */}
        <ScrollReveal delay={0.2}>
          <div className="mb-6 bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Category Filter */}
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* TRL Range */}
              <div className="flex gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Min TRL</label>
                  <select
                    value={trlMin}
                    onChange={(e) => setTrlMin(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Max TRL</label>
                  <select
                    value={trlMax}
                    onChange={(e) => setTrlMax(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sort Buttons */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Sort By</label>
                <div className="flex gap-1">
                  {([
                    { field: 'trl' as SortField, label: 'TRL' },
                    { field: 'name' as SortField, label: 'Name' },
                    { field: 'timeline' as SortField, label: 'Timeline' },
                  ]).map(({ field, label }) => (
                    <button
                      key={field}
                      onClick={() => toggleSort(field)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        sortField === field
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {label}
                      {sortField === field && (
                        <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-3 text-xs text-slate-400">
              Showing {filteredTechs.length} of {TECHNOLOGIES.length} technologies
            </div>
          </div>
        </ScrollReveal>

        {/* Technology Cards */}
        <div className="space-y-4 mb-10">
          {filteredTechs.map((tech, idx) => {
            const isExpanded = expandedTech === tech.name;
            return (
              <ScrollReveal key={tech.name} delay={Math.min(idx * 0.04, 0.4)}>
                <div
                  className={`bg-slate-900/70 border rounded-xl overflow-hidden transition-all ${getTrlBorderColor(tech.trl)} ${
                    isExpanded ? 'ring-1 ring-purple-500/20' : ''
                  }`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedTech(isExpanded ? null : tech.name)}
                    className="w-full text-left p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-800/30 transition-colors"
                  >
                    {/* TRL Badge */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white ${getTrlColor(tech.trl)}`}
                      >
                        {tech.trl}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">TRL</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-semibold text-slate-100">
                          {tech.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {tech.category}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2">
                        {tech.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {tech.timeline}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {tech.developers.length} developer{tech.developers.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <div className="flex-shrink-0 text-slate-500">
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 border-t border-slate-700/50">
                      {/* TRL Progress Bar */}
                      <div className="mt-4 mb-5">
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Technology Readiness</span>
                          <span>TRL {tech.trl} / 9</span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                            <div
                              key={level}
                              className={`flex-1 h-2.5 rounded-full transition-all ${
                                level <= tech.trl ? getTrlColor(level) : 'bg-slate-800'
                              }`}
                              title={`TRL ${level}: ${TRL_LABELS[level]}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                          {TRL_LABELS[tech.trl]}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Full Description */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Description
                          </h4>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {tech.description}
                          </p>
                        </div>

                        {/* Impact */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Expected Impact
                          </h4>
                          <p className="text-sm text-purple-300/90 leading-relaxed">
                            {tech.impact}
                          </p>
                        </div>

                        {/* Developers */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Key Developers
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {tech.developers.map((dev) => (
                              <span
                                key={dev}
                                className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50"
                              >
                                {dev}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Challenges */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Key Challenges
                          </h4>
                          <ul className="space-y-1.5">
                            {tech.challenges.map((challenge, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs text-slate-400"
                              >
                                <span className="text-amber-500 mt-0.5 flex-shrink-0">&#x26A0;</span>
                                {challenge}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}

          {filteredTechs.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p className="text-lg">No technologies match your filters</p>
              <p className="text-sm mt-1">Try adjusting the category or TRL range</p>
            </div>
          )}
        </div>

        {/* Overall Stats */}
        <ScrollReveal delay={0.1}>
          <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{TECHNOLOGIES.length}</div>
              <div className="text-xs text-slate-400 mt-1">Technologies Tracked</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {TECHNOLOGIES.filter((t) => t.trl >= 7).length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Near Flight-Ready (TRL 7+)</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {TECHNOLOGIES.filter((t) => t.trl >= 4 && t.trl <= 6).length}
              </div>
              <div className="text-xs text-slate-400 mt-1">In Development (TRL 4-6)</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {TECHNOLOGIES.filter((t) => t.trl <= 3).length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Early Research (TRL 1-3)</div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Pages */}
        <ScrollReveal delay={0.15}>
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: '/patents', label: 'Patent Tracker', icon: '📜', desc: 'Space technology patents and filings' },
                { href: '/blueprints', label: 'Blueprints', icon: '📐', desc: 'Technical blueprints and schematics' },
                { href: '/tools', label: 'Tools', icon: '🛠️', desc: 'Mission planning and analysis tools' },
                { href: '/glossary', label: 'Glossary', icon: '📖', desc: 'Space industry terminology' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/40 hover:bg-slate-800/80 transition-all"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <h3 className="text-sm font-medium text-slate-200 mt-2 group-hover:text-purple-300 transition-colors">
                    {link.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
