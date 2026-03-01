'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type PropulsionType = 'Chemical Liquid' | 'Chemical Solid' | 'Electric' | 'Green' | 'Nuclear' | 'Cold Gas' | 'Electrospray';
type PropulsionStatus = 'Operational' | 'In Development' | 'Retired' | 'Concept';

interface PropulsionSystem {
  name: string;
  manufacturer: string;
  type: PropulsionType;
  thrust: string;
  isp: number;
  propellant: string;
  status: PropulsionStatus;
  applications: string[];
  massKg: number | null;
  heritage: string;
}

// ────────────────────────────────────────
// Filter categories
// ────────────────────────────────────────

const TYPE_FILTERS: { label: string; value: PropulsionType | 'All' }[] = [
  { label: 'All Types', value: 'All' },
  { label: 'Chemical Liquid', value: 'Chemical Liquid' },
  { label: 'Chemical Solid', value: 'Chemical Solid' },
  { label: 'Electric', value: 'Electric' },
  { label: 'Green', value: 'Green' },
  { label: 'Nuclear', value: 'Nuclear' },
  { label: 'Cold Gas', value: 'Cold Gas' },
  { label: 'Electrospray', value: 'Electrospray' },
];

const STATUS_FILTERS: { label: string; value: PropulsionStatus | 'All' }[] = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Operational', value: 'Operational' },
  { label: 'In Development', value: 'In Development' },
  { label: 'Retired', value: 'Retired' },
  { label: 'Concept', value: 'Concept' },
];

type SortKey = 'name' | 'thrust' | 'isp' | 'mass';

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Name', value: 'name' },
  { label: 'Thrust', value: 'thrust' },
  { label: 'Specific Impulse', value: 'isp' },
  { label: 'Mass', value: 'mass' },
];

// ────────────────────────────────────────
// Helper: parse thrust string to Newtons
// ────────────────────────────────────────

function thrustToNewtons(thrust: string): number {
  const lower = thrust.toLowerCase();
  const num = parseFloat(thrust.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 0;
  if (lower.includes('mn')) return num * 1e6;
  if (lower.includes('kn')) return num * 1e3;
  if (lower.includes('mn') && lower.indexOf('m') < lower.indexOf('n')) return num * 0.001;
  if (lower.includes(' n')) return num;
  // mN (millinewtons)
  if (lower.includes('mn')) return num * 0.001;
  return num;
}

// ────────────────────────────────────────
// Propulsion Systems Data (30+ systems)
// ────────────────────────────────────────

const PROPULSION_SYSTEMS: PropulsionSystem[] = [
  // ── Chemical Liquid ──
  {
    name: 'Raptor 3',
    manufacturer: 'SpaceX',
    type: 'Chemical Liquid',
    thrust: '2,256 kN',
    isp: 350,
    propellant: 'LOX / Liquid Methane',
    status: 'Operational',
    applications: ['Starship Super Heavy', 'Starship upper stage'],
    massKg: 1525,
    heritage: 'Full-flow staged combustion cycle. First operational FFSC engine. Powers both Super Heavy booster (33 engines) and Starship upper stage (6 engines). Raptor 3 eliminates external shielding for mass reduction.',
  },
  {
    name: 'RS-25',
    manufacturer: 'Aerojet Rocketdyne',
    type: 'Chemical Liquid',
    thrust: '2,279 kN',
    isp: 452,
    propellant: 'LOH / LOX',
    status: 'Operational',
    applications: ['Space Shuttle (retired)', 'SLS Core Stage'],
    massKg: 3177,
    heritage: 'Heritage Space Shuttle Main Engine (SSME). 135 Shuttle missions flown. Restarted production for SLS with RS-25E expendable variant. Staged combustion cycle, highest chamber pressure of any US engine.',
  },
  {
    name: 'BE-4',
    manufacturer: 'Blue Origin',
    type: 'Chemical Liquid',
    thrust: '2,400 kN',
    isp: 339,
    propellant: 'LOX / Liquid Methane',
    status: 'Operational',
    applications: ['Vulcan Centaur (ULA)', 'New Glenn'],
    massKg: 2250,
    heritage: 'Ox-rich staged combustion cycle. First US methane engine to fly (Vulcan Centaur, Jan 2024). Two engines power Vulcan first stage; seven engines power New Glenn first stage.',
  },
  {
    name: 'Merlin 1D',
    manufacturer: 'SpaceX',
    type: 'Chemical Liquid',
    thrust: '981 kN',
    isp: 311,
    propellant: 'RP-1 / LOX',
    status: 'Operational',
    applications: ['Falcon 9', 'Falcon Heavy'],
    massKg: 470,
    heritage: 'Gas-generator cycle. Highest thrust-to-weight ratio of any operational rocket engine. Over 1,200 engines flown. Powers nine on Falcon 9 first stage, 27 on Falcon Heavy.',
  },
  {
    name: 'Merlin Vacuum',
    manufacturer: 'SpaceX',
    type: 'Chemical Liquid',
    thrust: '981 kN',
    isp: 348,
    propellant: 'RP-1 / LOX',
    status: 'Operational',
    applications: ['Falcon 9 upper stage', 'Falcon Heavy upper stage'],
    massKg: 500,
    heritage: 'Vacuum-optimized variant of Merlin with regeneratively-cooled niobium alloy nozzle extension. Single engine on Falcon 9/Heavy upper stage. Proven across hundreds of missions.',
  },
  {
    name: 'Vulcain 2.1',
    manufacturer: 'ArianeGroup',
    type: 'Chemical Liquid',
    thrust: '1,390 kN',
    isp: 434,
    propellant: 'LOH / LOX',
    status: 'Operational',
    applications: ['Ariane 6 core stage'],
    massKg: 2100,
    heritage: 'Gas-generator cycle. Evolution of Vulcain 2 from Ariane 5. Simplified manufacturing with 3D-printed injector head. First flight on Ariane 6 inaugural launch (Jul 2024).',
  },
  {
    name: 'RD-180',
    manufacturer: 'NPO Energomash',
    type: 'Chemical Liquid',
    thrust: '4,152 kN',
    isp: 338,
    propellant: 'RP-1 / LOX',
    status: 'Retired',
    applications: ['Atlas V (ULA)'],
    massKg: 5480,
    heritage: 'Ox-rich staged combustion, two-chamber design derived from RD-170. 100+ flights on Atlas V with 100% mission success. US imports ended; replaced by BE-4 on Vulcan.',
  },
  {
    name: 'RL-10C-1-1',
    manufacturer: 'Aerojet Rocketdyne',
    type: 'Chemical Liquid',
    thrust: '106 kN',
    isp: 453,
    propellant: 'LOH / LOX',
    status: 'Operational',
    applications: ['Centaur V (Vulcan)', 'SLS Exploration Upper Stage'],
    massKg: 190,
    heritage: 'Expander cycle, one of the most reliable upper-stage engines ever built. RL-10 family has 500+ flights since 1963. Latest variant features 3D-printed injector and extended nozzle.',
  },
  {
    name: 'Vinci',
    manufacturer: 'ArianeGroup',
    type: 'Chemical Liquid',
    thrust: '180 kN',
    isp: 457,
    propellant: 'LOH / LOX',
    status: 'Operational',
    applications: ['Ariane 6 upper stage'],
    massKg: 550,
    heritage: 'Expander cycle with re-ignition capability (up to 5 restarts). First European re-ignitable cryogenic upper-stage engine. Enables direct GEO insertion and multi-orbit missions.',
  },
  {
    name: 'Prometheus',
    manufacturer: 'ArianeGroup',
    type: 'Chemical Liquid',
    thrust: '1,000 kN',
    isp: 360,
    propellant: 'LOX / Liquid Methane',
    status: 'In Development',
    applications: ['Themis reusable demonstrator', 'Future Ariane launchers'],
    massKg: 1300,
    heritage: 'Ox-rich staged combustion. Designed for 10x cost reduction vs. Vulcain through 3D printing and digital twins. Target unit cost below EUR 1M. ESA-funded demonstrator.',
  },
  {
    name: 'Rutherford',
    manufacturer: 'Rocket Lab',
    type: 'Chemical Liquid',
    thrust: '25.8 kN',
    isp: 343,
    propellant: 'RP-1 / LOX',
    status: 'Operational',
    applications: ['Electron'],
    massKg: 35,
    heritage: 'Electric pump-fed cycle, first flight-proven engine using electric turbopumps instead of gas generators. Powered by lithium-polymer batteries. Nine on Electron first stage.',
  },
  {
    name: 'Archimedes',
    manufacturer: 'Rocket Lab',
    type: 'Chemical Liquid',
    thrust: '695 kN',
    isp: 350,
    propellant: 'LOX / Liquid Methane',
    status: 'In Development',
    applications: ['Neutron'],
    massKg: null,
    heritage: 'Gas-generator cycle designed for Rocket Lab\'s medium-lift reusable Neutron rocket. Seven engines on first stage, single vacuum-optimized variant on upper stage.',
  },

  // ── Chemical Solid ──
  {
    name: 'SRB (5-Segment)',
    manufacturer: 'Northrop Grumman',
    type: 'Chemical Solid',
    thrust: '16,000 kN',
    isp: 269,
    propellant: 'PBAN (Polybutadiene Acrylonitrile)',
    status: 'Operational',
    applications: ['SLS (2x boosters)'],
    massKg: 726000,
    heritage: 'Largest solid rocket motors ever flown. Derived from Space Shuttle 4-segment SRBs with added 5th segment. Each booster provides ~75% of SLS liftoff thrust.',
  },
  {
    name: 'GEM 63XL',
    manufacturer: 'Northrop Grumman',
    type: 'Chemical Solid',
    thrust: '1,663 kN',
    isp: 275,
    propellant: 'HTPB (Hydroxyl-Terminated Polybutadiene)',
    status: 'Operational',
    applications: ['Vulcan Centaur (0, 2, 4, or 6 strap-ons)'],
    massKg: 20200,
    heritage: 'Graphite-epoxy composite motor case, extended length variant of GEM 63. Provides thrust augmentation for Vulcan missions requiring higher payload capacity.',
  },
  {
    name: 'Star 48BV',
    manufacturer: 'Northrop Grumman',
    type: 'Chemical Solid',
    thrust: '68 kN',
    isp: 292,
    propellant: 'HTPB',
    status: 'Operational',
    applications: ['Payload kick stage', 'Interplanetary injection'],
    massKg: 2950,
    heritage: 'Compact upper-stage motor for satellites and deep-space missions. Used on New Horizons (Pluto flyby), Parker Solar Probe, and numerous GEO insertions. Proven across 100+ missions.',
  },
  {
    name: 'P120C',
    manufacturer: 'ArianeGroup / Avio',
    type: 'Chemical Solid',
    thrust: '4,500 kN',
    isp: 278,
    propellant: 'HTPB',
    status: 'Operational',
    applications: ['Ariane 6 (2 or 4 boosters)', 'Vega-C first stage'],
    massKg: 142000,
    heritage: 'Largest monolithic carbon-fiber solid rocket motor in production. Common to both Ariane 6 and Vega-C for production cost savings. 3.4 m diameter, 13.5 m long.',
  },

  // ── Electric Propulsion ──
  {
    name: 'NEXT-C',
    manufacturer: 'Aerojet Rocketdyne',
    type: 'Electric',
    thrust: '0.236 N',
    isp: 4190,
    propellant: 'Xenon',
    status: 'Operational',
    applications: ['DART mission', 'Deep-space missions'],
    massKg: 12,
    heritage: 'NASA Evolutionary Xenon Thruster. Gridded ion engine with 7 kW power processing. Flew on DART asteroid-deflection mission (2022). Over 50,000 hours of ground test life.',
  },
  {
    name: 'SPT-140',
    manufacturer: 'OKB Fakel',
    type: 'Electric',
    thrust: '0.29 N',
    isp: 1770,
    propellant: 'Xenon',
    status: 'Operational',
    applications: ['GEO satellite station-keeping', 'Electric orbit raising'],
    massKg: 8,
    heritage: 'Hall-effect thruster. Widely used on Russian and commercial GEO satellites. 4.5 kW nominal power. Heritage from SPT-100 family with over 50 million hours cumulative in orbit.',
  },
  {
    name: 'BHT-6000',
    manufacturer: 'Busek',
    type: 'Electric',
    thrust: '0.39 N',
    isp: 2100,
    propellant: 'Xenon / Krypton',
    status: 'Operational',
    applications: ['GEO satellite orbit raising', 'Station-keeping', 'Cislunar transport'],
    massKg: 14,
    heritage: 'High-power Hall thruster, 6 kW class. Flight heritage on multiple commercial GEO platforms. Capable of operation on lower-cost krypton propellant with modest Isp trade.',
  },
  {
    name: 'PPS-5000',
    manufacturer: 'Safran',
    type: 'Electric',
    thrust: '0.326 N',
    isp: 1800,
    propellant: 'Xenon',
    status: 'Operational',
    applications: ['Eurostar Neo (Airbus)', 'Spacebus Neo (Thales)', 'OneSat'],
    massKg: 9,
    heritage: 'Plasma propulsion system, 5 kW Hall thruster. Primary EP system for European telecom satellites. Qualifed life of 20,000+ hours. Successor to PPS-1350 flown on SMART-1 lunar mission.',
  },
  {
    name: 'XIPS-25',
    manufacturer: 'L3Harris (Boeing heritage)',
    type: 'Electric',
    thrust: '0.165 N',
    isp: 3500,
    propellant: 'Xenon',
    status: 'Operational',
    applications: ['Boeing 702SP all-electric satellites', 'Station-keeping'],
    massKg: 5,
    heritage: 'Xenon Ion Propulsion System. Gridded ion thruster enabling the first all-electric GEO satellite (ABS-3A, 2015). Over 100,000+ cumulative flight hours across multiple platforms.',
  },
  {
    name: 'Starlink Hall Thruster',
    manufacturer: 'SpaceX',
    type: 'Electric',
    thrust: '0.055 N',
    isp: 1600,
    propellant: 'Krypton',
    status: 'Operational',
    applications: ['Starlink v1.5 / v2 Mini satellites'],
    massKg: 2,
    heritage: 'Custom-designed compact Hall thruster for the Starlink constellation. Uses low-cost krypton instead of xenon. Over 30,000 units deployed in orbit across 6,000+ satellites.',
  },

  // ── Green Propulsion ──
  {
    name: 'GPIM / ASCENT (AF-M315E)',
    manufacturer: 'Aerojet Rocketdyne',
    type: 'Green',
    thrust: '1.0 N',
    isp: 255,
    propellant: 'AF-M315E (HAN-based)',
    status: 'Operational',
    applications: ['CubeSat propulsion', 'Smallsat maneuvering', 'Lunar Gateway'],
    massKg: 1.5,
    heritage: 'Advanced Spacecraft Energetic Non-Toxic propellant. Demonstrated on NASA GPIM mission (2019). 50% higher density impulse than hydrazine. Non-toxic handling reduces launch costs.',
  },
  {
    name: 'LMP-103S Thruster',
    manufacturer: 'Bradford ECAPS',
    type: 'Green',
    thrust: '1.0 N',
    isp: 252,
    propellant: 'LMP-103S (ADN-based)',
    status: 'Operational',
    applications: ['SkySat constellation (Planet)', 'Prisma mission', 'Small satellite propulsion'],
    massKg: 0.4,
    heritage: 'First green propellant system flown in space (Prisma, 2010). ADN-based monopropellant with 6% higher Isp and 24% higher density than hydrazine. Used on Planet\'s SkySat satellites.',
  },

  // ── Nuclear ──
  {
    name: 'DRACO NTP',
    manufacturer: 'Lockheed Martin / BWX Technologies',
    type: 'Nuclear',
    thrust: '~25,000 N',
    isp: 900,
    propellant: 'Liquid Hydrogen',
    status: 'In Development',
    applications: ['Cislunar transport', 'Mars transit'],
    massKg: null,
    heritage: 'Demonstration Rocket for Agile Cislunar Operations. DARPA-funded nuclear thermal propulsion flight demo targeting 2027. Uses High-Assay Low-Enriched Uranium (HALEU) reactor. 2-3x Isp improvement over chemical engines.',
  },
  {
    name: 'Kilopower / KRUSTY',
    manufacturer: 'NASA / Los Alamos National Lab',
    type: 'Nuclear',
    thrust: 'N/A (power source)',
    isp: 0,
    propellant: 'Uranium-235 (reactor)',
    status: 'In Development',
    applications: ['Surface power for Moon/Mars', 'Nuclear Electric Propulsion power source'],
    massKg: 1500,
    heritage: 'Kilopower Reactor Using Stirling Technology. 10 kW fission reactor demonstrated in ground test (2018). Designed to provide reliable surface power for crewed missions. Could power high-Isp electric thrusters for cargo tugs.',
  },
  {
    name: 'X3 Nested Hall Thruster',
    manufacturer: 'University of Michigan / NASA',
    type: 'Electric',
    thrust: '5.42 N',
    isp: 2650,
    propellant: 'Xenon',
    status: 'In Development',
    applications: ['Mars cargo transport', 'Deep-space exploration'],
    massKg: 230,
    heritage: 'Largest and most powerful Hall thruster ever tested. 100 kW-class, three nested discharge channels. Set thrust record for Hall thrusters at 5.4 N. Targeted for solar electric propulsion Mars cargo missions.',
  },

  // ── Cold Gas / Electrospray ──
  {
    name: 'IFM Nano Thruster',
    manufacturer: 'Enpulsion',
    type: 'Electrospray',
    thrust: '0.0004 N',
    isp: 6000,
    propellant: 'Indium (FEEP)',
    status: 'Operational',
    applications: ['CubeSat propulsion', 'Precision formation flying', 'Constellation maintenance'],
    massKg: 0.9,
    heritage: 'Field-Emission Electric Propulsion using liquid indium. Over 300 units sold. Flown on ESA, NASA, and commercial missions. Extremely compact thruster for nanosatellites with high delta-v capability.',
  },
  {
    name: 'TILE Electrospray',
    manufacturer: 'Accion Systems',
    type: 'Electrospray',
    thrust: '0.0001 N',
    isp: 1800,
    propellant: 'Ionic Liquid',
    status: 'Operational',
    applications: ['CubeSat propulsion', 'Smallsat maneuvering'],
    massKg: 0.2,
    heritage: 'Tiled Ionic Liquid Electrospray. No pressurized propellant tanks or moving parts. Compact solid-state design using MEMS fabrication. Flown on Astra and other commercial small satellites.',
  },
  {
    name: 'Cold Gas Nitrogen System',
    manufacturer: 'Various (VACCO, Moog)',
    type: 'Cold Gas',
    thrust: '0.5 N',
    isp: 65,
    propellant: 'Nitrogen (N2)',
    status: 'Operational',
    applications: ['CubeSat attitude control', 'Spacecraft RCS', 'ISS experiments'],
    massKg: 1.2,
    heritage: 'Simplest form of spacecraft propulsion. No combustion or electrical heating. Used extensively for attitude control and proximity operations. Extremely reliable with no risk of contamination.',
  },
  {
    name: 'MiXI Miniature Ion Thruster',
    manufacturer: 'NASA JPL',
    type: 'Electric',
    thrust: '0.0015 N',
    isp: 3200,
    propellant: 'Xenon',
    status: 'In Development',
    applications: ['CubeSat primary propulsion', 'Lunar CubeSat missions'],
    massKg: 0.3,
    heritage: 'Miniature Xenon Ion thruster, only 3 cm beam diameter. Designed to bring gridded ion engine performance to CubeSat scale. Under development at JPL for deep-space CubeSat missions.',
  },
  {
    name: 'T6 Ion Thruster',
    manufacturer: 'QinetiQ',
    type: 'Electric',
    thrust: '0.143 N',
    isp: 4120,
    propellant: 'Xenon',
    status: 'Operational',
    applications: ['BepiColombo (ESA/JAXA)', 'Eurostar satellite platform'],
    massKg: 7,
    heritage: 'Kaufman-type gridded ion thruster, 4.5 kW. Four T6 engines power the BepiColombo Mercury Transfer Module. Over 30,000 hours demonstrated life. Europe\'s highest-power ion thruster.',
  },
];

// ────────────────────────────────────────
// Colour helpers
// ────────────────────────────────────────

function typeColor(type: PropulsionType): string {
  switch (type) {
    case 'Chemical Liquid': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'Chemical Solid': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'Electric': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'Green': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'Nuclear': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'Cold Gas': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    case 'Electrospray': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

function statusColor(status: PropulsionStatus): string {
  switch (status) {
    case 'Operational': return 'text-emerald-400';
    case 'In Development': return 'text-amber-400';
    case 'Retired': return 'text-slate-400';
    case 'Concept': return 'text-purple-400';
    default: return 'text-slate-400';
  }
}

function statusDot(status: PropulsionStatus): string {
  switch (status) {
    case 'Operational': return 'bg-emerald-400';
    case 'In Development': return 'bg-amber-400';
    case 'Retired': return 'bg-slate-400';
    case 'Concept': return 'bg-purple-400';
    default: return 'bg-slate-400';
  }
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default function PropulsionDatabasePage() {
  const [typeFilter, setTypeFilter] = useState<PropulsionType | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<PropulsionStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (name: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let results = PROPULSION_SYSTEMS;

    if (typeFilter !== 'All') {
      results = results.filter(s => s.type === typeFilter);
    }
    if (statusFilter !== 'All') {
      results = results.filter(s => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.manufacturer.toLowerCase().includes(q) ||
        s.propellant.toLowerCase().includes(q) ||
        s.applications.some(a => a.toLowerCase().includes(q))
      );
    }

    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'thrust':
          return thrustToNewtons(b.thrust) - thrustToNewtons(a.thrust);
        case 'isp':
          return b.isp - a.isp;
        case 'mass':
          return (a.massKg ?? Infinity) - (b.massKg ?? Infinity);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return results;
  }, [typeFilter, statusFilter, sortBy, searchQuery]);

  // Stats
  const totalSystems = PROPULSION_SYSTEMS.length;
  const operationalCount = PROPULSION_SYSTEMS.filter(s => s.status === 'Operational').length;
  const typeCount = new Set(PROPULSION_SYSTEMS.map(s => s.type)).size;
  const mfrCount = new Set(PROPULSION_SYSTEMS.map(s => s.manufacturer)).size;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Propulsion Systems Database"
          subtitle="Comprehensive reference of space propulsion technologies -- engines, thrusters, and experimental systems powering humanity's expansion into space."
          icon={<span>&#x1F525;</span>}
          accentColor="amber"
        />

        {/* Summary Stats */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Systems', value: totalSystems, color: 'text-orange-400' },
              { label: 'Operational', value: operationalCount, color: 'text-emerald-400' },
              { label: 'Propulsion Types', value: typeCount, color: 'text-blue-400' },
              { label: 'Manufacturers', value: mfrCount, color: 'text-purple-400' },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 text-center"
              >
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Filters & Controls */}
        <ScrollReveal delay={0.1}>
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
                type="search"
                placeholder="Search by name, manufacturer, propellant, or application..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap gap-3">
              {/* Type filter */}
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as PropulsionType | 'All')}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                {TYPE_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as PropulsionStatus | 'All')}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                {STATUS_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                {SORT_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>Sort: {s.label}</option>
                ))}
              </select>

              {/* Result count */}
              <span className="ml-auto text-sm text-slate-400 self-center">
                {filtered.length} of {totalSystems} systems
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* Propulsion System Cards */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg">No propulsion systems match your filters.</p>
              <button
                onClick={() => {
                  setTypeFilter('All');
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
                className="mt-3 text-orange-400 hover:text-orange-300 underline text-sm"
              >
                Clear all filters
              </button>
            </div>
          )}

          {filtered.map((system, idx) => {
            const isExpanded = expandedCards.has(system.name);
            return (
              <ScrollReveal key={system.name} delay={Math.min(idx * 0.04, 0.4)}>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/70 transition-colors">
                  {/* Card Header -- always visible */}
                  <button
                    onClick={() => toggleCard(system.name)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4"
                  >
                    {/* Type badge */}
                    <span
                      className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${typeColor(system.type)}`}
                    >
                      {system.type}
                    </span>

                    {/* Name & manufacturer */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-100 truncate">
                        {system.name}
                      </h3>
                      <p className="text-sm text-slate-400 truncate">{system.manufacturer}</p>
                    </div>

                    {/* Key specs */}
                    <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
                      <div className="text-right">
                        <div className="text-slate-300 font-mono">{system.thrust}</div>
                        <div className="text-xs text-slate-500">Thrust</div>
                      </div>
                      {system.isp > 0 && (
                        <div className="text-right">
                          <div className="text-slate-300 font-mono">{system.isp.toLocaleString()} s</div>
                          <div className="text-xs text-slate-500">Isp</div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusDot(system.status)}`} />
                        <span className={`text-xs ${statusColor(system.status)}`}>{system.status}</span>
                      </div>
                    </div>

                    {/* Expand arrow */}
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Mobile specs row (visible below sm) */}
                  <div className="sm:hidden px-5 pb-3 flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Thrust:</span>{' '}
                      <span className="text-slate-200 font-mono">{system.thrust}</span>
                    </div>
                    {system.isp > 0 && (
                      <div>
                        <span className="text-slate-400">Isp:</span>{' '}
                        <span className="text-slate-200 font-mono">{system.isp.toLocaleString()} s</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusDot(system.status)}`} />
                      <span className={`text-xs ${statusColor(system.status)}`}>{system.status}</span>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 px-5 py-4 bg-slate-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Thrust */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Thrust</div>
                          <div className="text-lg font-mono text-orange-400">{system.thrust}</div>
                        </div>

                        {/* Specific Impulse */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Specific Impulse (Isp)</div>
                          <div className="text-lg font-mono text-blue-400">
                            {system.isp > 0 ? `${system.isp.toLocaleString()} s` : 'N/A'}
                          </div>
                        </div>

                        {/* Mass */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dry Mass</div>
                          <div className="text-lg font-mono text-slate-300">
                            {system.massKg !== null
                              ? system.massKg >= 1000
                                ? `${(system.massKg / 1000).toFixed(1)} t`
                                : `${system.massKg.toLocaleString()} kg`
                              : 'TBD'}
                          </div>
                        </div>

                        {/* Propellant */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Propellant</div>
                          <div className="text-sm text-slate-200">{system.propellant}</div>
                        </div>

                        {/* Status */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</div>
                          <div className={`text-sm font-medium flex items-center gap-2 ${statusColor(system.status)}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${statusDot(system.status)}`} />
                            {system.status}
                          </div>
                        </div>

                        {/* Type */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Propulsion Type</div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${typeColor(system.type)}`}>
                            {system.type}
                          </span>
                        </div>
                      </div>

                      {/* Applications */}
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Applications</div>
                        <div className="flex flex-wrap gap-2">
                          {system.applications.map(app => (
                            <span
                              key={app}
                              className="text-xs bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-full"
                            >
                              {app}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Heritage */}
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Heritage &amp; Notes</div>
                        <p className="text-sm text-slate-300 leading-relaxed">{system.heritage}</p>

        <RelatedModules modules={PAGE_RELATIONS['propulsion-database']} />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Type Legend */}
        <ScrollReveal delay={0.15}>
          <div className="mt-10 bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Propulsion Type Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-orange-500/60" />
                <div>
                  <div className="font-medium text-orange-300">Chemical Liquid</div>
                  <div className="text-slate-400">High thrust, moderate Isp. Turbopump-fed liquid propellants. Workhorse of orbital launch.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-red-500/60" />
                <div>
                  <div className="font-medium text-red-300">Chemical Solid</div>
                  <div className="text-slate-400">Very high thrust, lower Isp. Simple and reliable. Boosters and kick stages.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-blue-500/60" />
                <div>
                  <div className="font-medium text-blue-300">Electric</div>
                  <div className="text-slate-400">Very low thrust, very high Isp. Ion and Hall thrusters for long-duration in-space propulsion.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-emerald-500/60" />
                <div>
                  <div className="font-medium text-emerald-300">Green</div>
                  <div className="text-slate-400">Non-toxic alternatives to hydrazine. Lower handling costs, reduced launch-site hazards.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-purple-500/60" />
                <div>
                  <div className="font-medium text-purple-300">Nuclear</div>
                  <div className="text-slate-400">Fission-heated propellant or reactor power. Highest theoretical Isp for high-thrust applications.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-cyan-500/60" />
                <div>
                  <div className="font-medium text-cyan-300">Cold Gas / Electrospray</div>
                  <div className="text-slate-400">Miniaturized systems for CubeSats and nanosats. Low thrust, high precision or simplicity.</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Pages */}
        <ScrollReveal delay={0.2}>
          <div className="mt-8 mb-4">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  href: '/blueprints',
                  title: 'Spacecraft Blueprints',
                  description: 'Technical drawings and system diagrams',
                  icon: '\u{1F4D0}',
                },
                {
                  href: '/launch-vehicles',
                  title: 'Launch Vehicles',
                  description: 'Rocket database and performance comparison',
                  icon: '\u{1F680}',
                },
                {
                  href: '/tech-readiness',
                  title: 'Tech Readiness',
                  description: 'Technology readiness levels and assessments',
                  icon: '\u{1F52C}',
                },
                {
                  href: '/tools',
                  title: 'Engineering Tools',
                  description: 'Calculators, converters, and planning tools',
                  icon: '\u{1F6E0}\u{FE0F}',
                },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-orange-500/40 hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{link.icon}</span>
                    <h3 className="font-medium text-slate-200 group-hover:text-orange-300 transition-colors">
                      {link.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer note */}
        <div className="text-center text-xs text-slate-500 py-8">
          Data compiled from manufacturer specifications, NASA technical reports, and ESA documentation.
          Specifications may vary by configuration and mission profile.
        </div>
      </div>
    </main>
  );
}
