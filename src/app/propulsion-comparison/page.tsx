'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ShareButton from '@/components/ui/ShareButton';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type PropulsionCategory =
  | 'chemical-bipropellant'
  | 'chemical-solid'
  | 'electric-hall'
  | 'electric-ion'
  | 'electric-pulsed-plasma'
  | 'cold-gas'
  | 'green-propellant'
  | 'nuclear-thermal';

type SortField = 'name' | 'isp' | 'thrust' | 'trl';
type SortDir = 'asc' | 'desc';

interface PropulsionTechnology {
  id: PropulsionCategory;
  name: string;
  subtitle: string;
  icon: string;
  ispRange: [number, number];
  thrustClass: string;
  description: string;
  applications: string[];
  advantages: string[];
  disadvantages: string[];
  trlRange: [number, number];
  color: string;
}

interface Engine {
  id: string;
  name: string;
  manufacturer: string;
  category: PropulsionCategory;
  propellant: string;
  thrustN: number;
  thrustDisplay: string;
  ispS: number;
  massKg: number | null;
  twr: number | null;
  powerKw: number | null;
  trl: number;
  status: 'Operational' | 'In Development' | 'Experimental' | 'Retired';
  vehicle: string;
  notes: string;
}

// ────────────────────────────────────────
// Propulsion Technology Data
// ────────────────────────────────────────

const TECHNOLOGIES: PropulsionTechnology[] = [
  {
    id: 'chemical-bipropellant',
    name: 'Chemical - Bipropellant',
    subtitle: 'LOX/RP-1, LOX/LH2, NTO/MMH',
    icon: '\u{1F525}',
    ispRange: [300, 460],
    thrustClass: 'High (100 kN - 10 MN)',
    description: 'The workhorse of spaceflight. Two-component liquid propellants react in a combustion chamber to produce high-pressure exhaust. Mature technology with excellent thrust for orbital insertion and interplanetary burns.',
    applications: ['Launch vehicles', 'Upper stages', 'Orbital maneuvering', 'Deep space injection'],
    advantages: ['High thrust', 'Throttleable', 'Restartable', 'Proven heritage'],
    disadvantages: ['Low Isp vs. electric', 'Complex plumbing', 'Cryogenic handling', 'Heavy propellant'],
    trlRange: [9, 9],
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 'chemical-solid',
    name: 'Chemical - Solid',
    subtitle: 'HTPB/AP, PBAN/AP composite',
    icon: '\u{1F4A5}',
    ispRange: [250, 280],
    thrustClass: 'Very High (500 kN - 15 MN)',
    description: 'Pre-mixed solid fuel and oxidizer cast into a grain pattern. Ignites and burns until depleted. Simplest and most reliable propulsion for boosters and tactical applications.',
    applications: ['Strap-on boosters', 'Kick stages', 'Missile systems', 'Sounding rockets'],
    advantages: ['Simple design', 'Long storage life', 'High thrust density', 'Instant readiness'],
    disadvantages: ['Cannot be throttled', 'Cannot be shut down', 'Low Isp', 'Limited restart capability'],
    trlRange: [9, 9],
    color: 'from-red-500 to-orange-600',
  },
  {
    id: 'electric-hall',
    name: 'Electric - Hall Effect',
    subtitle: 'Xenon / Krypton plasma',
    icon: '\u{26A1}',
    ispRange: [1200, 3000],
    thrustClass: 'Low (10 mN - 1 N)',
    description: 'A crossed electric and magnetic field ionizes propellant (typically xenon) and accelerates ions through an annular channel. Excellent balance of thrust and efficiency for orbit raising and station keeping.',
    applications: ['GEO station keeping', 'Orbit raising', 'LEO constellation maintenance', 'Deep space cruise'],
    advantages: ['High Isp', 'Good thrust for electric', 'Mature technology', 'Long operational life'],
    disadvantages: ['Low thrust', 'Requires high power', 'Electrode erosion', 'Long maneuver times'],
    trlRange: [8, 9],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'electric-ion',
    name: 'Electric - Ion (Gridded)',
    subtitle: 'Xenon / Krypton gridded ion',
    icon: '\u{1F4AB}',
    ispRange: [2000, 10000],
    thrustClass: 'Very Low (1 mN - 500 mN)',
    description: 'Ionizes propellant and accelerates ions through electrostatically charged grids. Highest Isp of any mature electric propulsion. Ideal for long-duration deep space missions where thrust time is abundant.',
    applications: ['Deep space missions', 'Asteroid rendezvous', 'Interplanetary cruise', 'Science missions'],
    advantages: ['Very high Isp', 'Exceptional fuel efficiency', 'Precise thrust vectoring', 'Long lifetime'],
    disadvantages: ['Very low thrust', 'High power requirement', 'Grid erosion', 'Complex power processing'],
    trlRange: [7, 9],
    color: 'from-purple-500 to-blue-600',
  },
  {
    id: 'electric-pulsed-plasma',
    name: 'Electric - Pulsed Plasma',
    subtitle: 'PTFE / Teflon ablative',
    icon: '\u{2728}',
    ispRange: [850, 1500],
    thrustClass: 'Micro (0.01 mN - 1 mN)',
    description: 'An electric arc ablates a solid propellant (typically Teflon), creating a plasma that is electromagnetically accelerated. Very compact and simple, ideal for micro-satellites needing fine attitude control.',
    applications: ['CubeSat propulsion', 'Attitude control', 'Drag compensation', 'Formation flying'],
    advantages: ['Very compact', 'Simple design', 'Solid propellant storage', 'Low power'],
    disadvantages: ['Extremely low thrust', 'Low efficiency', 'Limited total impulse', 'Electrode wear'],
    trlRange: [6, 8],
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'cold-gas',
    name: 'Cold Gas',
    subtitle: 'N2, He, R-236fa',
    icon: '\u{1F4A8}',
    ispRange: [50, 75],
    thrustClass: 'Very Low (1 mN - 10 N)',
    description: 'The simplest propulsion concept: pressurized gas expelled through a nozzle. No combustion, no electrical power needed. Used where simplicity and reliability outweigh performance concerns.',
    applications: ['CubeSat attitude control', 'Docking', 'EVA maneuvering units', 'De-tumbling'],
    advantages: ['Simplest possible design', 'No contamination', 'Extremely reliable', 'Very low cost'],
    disadvantages: ['Very low Isp', 'Low thrust', 'Heavy tanks', 'Limited delta-v'],
    trlRange: [9, 9],
    color: 'from-slate-400 to-slate-500',
  },
  {
    id: 'green-propellant',
    name: 'Green Propellant',
    subtitle: 'AF-M315E, LMP-103S',
    icon: '\u{1F33F}',
    ispRange: [220, 250],
    thrustClass: 'Low to Medium (0.5 N - 500 N)',
    description: 'Next-generation monopropellants replacing toxic hydrazine. AF-M315E (now ASCENT) and LMP-103S offer similar or better performance with dramatically safer handling, lower toxicity, and higher density.',
    applications: ['Satellite maneuvering', 'Attitude control', 'Small satellite propulsion', 'Orbit maintenance'],
    advantages: ['Non-toxic handling', 'Higher density than hydrazine', 'Comparable Isp', 'Growing flight heritage'],
    disadvantages: ['Higher combustion temperature', 'Catalyst development needed', 'Limited flight heritage', 'Higher ignition temperature'],
    trlRange: [7, 9],
    color: 'from-emerald-500 to-green-600',
  },
  {
    id: 'nuclear-thermal',
    name: 'Nuclear Thermal',
    subtitle: 'DRACO / NTP programs',
    icon: '\u{2622}\u{FE0F}',
    ispRange: [800, 1000],
    thrustClass: 'Medium (25 kN - 250 kN)',
    description: 'A nuclear fission reactor heats propellant (liquid hydrogen) to extreme temperatures, achieving roughly twice the Isp of chemical engines. NASA/DARPA DRACO program aims for an in-space demonstration by 2027.',
    applications: ['Mars transit', 'Cislunar transportation', 'Deep space cargo', 'Crewed interplanetary'],
    advantages: ['~2x chemical Isp', 'High thrust for nuclear', 'Reduces Mars transit time', 'Enables crewed missions'],
    disadvantages: ['Radiation shielding mass', 'Regulatory hurdles', 'No flight heritage yet', 'Very expensive development'],
    trlRange: [4, 5],
    color: 'from-yellow-500 to-amber-600',
  },
];

// ────────────────────────────────────────
// Engine Database (20+ specific engines)
// ────────────────────────────────────────

const ENGINES: Engine[] = [
  // Chemical - Bipropellant
  {
    id: 'merlin-1d',
    name: 'Merlin 1D',
    manufacturer: 'SpaceX',
    category: 'chemical-bipropellant',
    propellant: 'LOX/RP-1',
    thrustN: 845000,
    thrustDisplay: '845 kN',
    ispS: 311,
    massKg: 470,
    twr: 183.3,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'Falcon 9 / Falcon Heavy',
    notes: 'Sea-level variant. 9 per first stage. Over 1,000 engines flown.',
  },
  {
    id: 'raptor-3',
    name: 'Raptor 3',
    manufacturer: 'SpaceX',
    category: 'chemical-bipropellant',
    propellant: 'LOX/CH4',
    thrustN: 2750000,
    thrustDisplay: '2,750 kN',
    ispS: 350,
    massKg: 1525,
    twr: 183.8,
    powerKw: null,
    trl: 7,
    status: 'In Development',
    vehicle: 'Starship / Super Heavy',
    notes: 'Full-flow staged combustion. No external shielding. Simplified plumbing.',
  },
  {
    id: 'rs-25',
    name: 'RS-25',
    manufacturer: 'Aerojet Rocketdyne',
    category: 'chemical-bipropellant',
    propellant: 'LOX/LH2',
    thrustN: 2279000,
    thrustDisplay: '2,279 kN',
    ispS: 452,
    massKg: 3527,
    twr: 65.9,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'SLS',
    notes: 'Heritage Space Shuttle Main Engine. 4 per SLS core stage. 135 Shuttle missions.',
  },
  {
    id: 'be-4',
    name: 'BE-4',
    manufacturer: 'Blue Origin',
    category: 'chemical-bipropellant',
    propellant: 'LOX/CH4',
    thrustN: 2400000,
    thrustDisplay: '2,400 kN',
    ispS: 310,
    massKg: 2200,
    twr: 111.2,
    powerKw: null,
    trl: 8,
    status: 'Operational',
    vehicle: 'Vulcan Centaur / New Glenn',
    notes: 'Oxidizer-rich staged combustion. 2 per Vulcan, 7 per New Glenn booster.',
  },
  {
    id: 'rl10',
    name: 'RL10C-1-1',
    manufacturer: 'Aerojet Rocketdyne',
    category: 'chemical-bipropellant',
    propellant: 'LOX/LH2',
    thrustN: 110000,
    thrustDisplay: '110 kN',
    ispS: 465,
    massKg: 190,
    twr: 59.0,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'Vulcan Centaur / SLS ICPS',
    notes: 'Highest Isp production LOX/LH2 engine. Expander cycle. 500+ flights since 1963.',
  },
  {
    id: 'vulcain-2.1',
    name: 'Vulcain 2.1',
    manufacturer: 'ArianeGroup',
    category: 'chemical-bipropellant',
    propellant: 'LOX/LH2',
    thrustN: 1390000,
    thrustDisplay: '1,390 kN',
    ispS: 434,
    massKg: 2100,
    twr: 67.5,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'Ariane 6',
    notes: 'Gas-generator cycle. Updated from Vulcain 2 for Ariane 6 program.',
  },
  {
    id: 'rutherford',
    name: 'Rutherford',
    manufacturer: 'Rocket Lab',
    category: 'chemical-bipropellant',
    propellant: 'LOX/RP-1',
    thrustN: 25000,
    thrustDisplay: '25 kN',
    ispS: 311,
    massKg: 35,
    twr: 72.9,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'Electron',
    notes: 'Electric pump-fed. 3D printed combustion chamber. 9 per first stage.',
  },
  {
    id: 'rd-180',
    name: 'RD-180',
    manufacturer: 'NPO Energomash',
    category: 'chemical-bipropellant',
    propellant: 'LOX/RP-1',
    thrustN: 4152000,
    thrustDisplay: '4,152 kN',
    ispS: 338,
    massKg: 5480,
    twr: 77.3,
    powerKw: null,
    trl: 9,
    status: 'Retired',
    vehicle: 'Atlas V (retired)',
    notes: 'Oxygen-rich staged combustion. 116 consecutive successful flights. No longer imported.',
  },
  {
    id: 'vinci',
    name: 'Vinci',
    manufacturer: 'ArianeGroup',
    category: 'chemical-bipropellant',
    propellant: 'LOX/LH2',
    thrustN: 180000,
    thrustDisplay: '180 kN',
    ispS: 457,
    massKg: 550,
    twr: 33.4,
    powerKw: null,
    trl: 8,
    status: 'Operational',
    vehicle: 'Ariane 6 (upper stage)',
    notes: 'Expander cycle. Multiple restart capability (up to 5). A64 configuration.',
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    manufacturer: 'ArianeGroup',
    category: 'chemical-bipropellant',
    propellant: 'LOX/CH4',
    thrustN: 1000000,
    thrustDisplay: '1,000 kN',
    ispS: 340,
    massKg: null,
    twr: null,
    powerKw: null,
    trl: 5,
    status: 'In Development',
    vehicle: 'Themis / future Ariane',
    notes: 'Reusable LOX/CH4. Target cost <1M EUR per unit. 3D printed.',
  },
  // Chemical - Solid
  {
    id: 'p120c',
    name: 'P120C',
    manufacturer: 'ArianeGroup / Avio',
    category: 'chemical-solid',
    propellant: 'HTPB/AP composite',
    thrustN: 4500000,
    thrustDisplay: '4,500 kN',
    ispS: 278,
    massKg: 142600,
    twr: 3.2,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'Ariane 6 / Vega-C',
    notes: 'Largest monolithic CFRP solid motor casing. Shared across two vehicle families.',
  },
  {
    id: 'srb-shuttle',
    name: 'SRB (5-segment)',
    manufacturer: 'Northrop Grumman',
    category: 'chemical-solid',
    propellant: 'PBAN/AP composite',
    thrustN: 16000000,
    thrustDisplay: '16,000 kN',
    ispS: 269,
    massKg: 726000,
    twr: 2.2,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'SLS',
    notes: 'Extended Shuttle SRBs with 5th segment. 2 per SLS. 71% of liftoff thrust.',
  },
  {
    id: 'gqm-163a',
    name: 'GEM-63XL',
    manufacturer: 'Northrop Grumman',
    category: 'chemical-solid',
    propellant: 'HTPB/AP composite',
    thrustN: 1660000,
    thrustDisplay: '1,660 kN',
    ispS: 275,
    massKg: 44200,
    twr: 3.8,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'Vulcan Centaur',
    notes: 'Strap-on boosters. Up to 6 per Vulcan. Carbon fiber casing.',
  },
  // Electric - Hall Effect
  {
    id: 'spt-100',
    name: 'SPT-100',
    manufacturer: 'Fakel (Russia)',
    category: 'electric-hall',
    propellant: 'Xenon',
    thrustN: 0.083,
    thrustDisplay: '83 mN',
    ispS: 1500,
    massKg: 3.5,
    twr: 0.0024,
    powerKw: 1.35,
    trl: 9,
    status: 'Operational',
    vehicle: 'Various GEO commsats',
    notes: 'Most flown Hall thruster. 500+ units in orbit. Standard GEO station keeping.',
  },
  {
    id: 'bht-200',
    name: 'BHT-200',
    manufacturer: 'Busek',
    category: 'electric-hall',
    propellant: 'Xenon',
    thrustN: 0.013,
    thrustDisplay: '13 mN',
    ispS: 1390,
    massKg: 1.0,
    twr: 0.0013,
    powerKw: 0.2,
    trl: 9,
    status: 'Operational',
    vehicle: 'FalconSat-5/6, various smallsats',
    notes: 'Compact Hall thruster for small satellites. Multiple flight demonstrations.',
  },
  {
    id: 'pps-1350',
    name: 'PPS-1350',
    manufacturer: 'Safran',
    category: 'electric-hall',
    propellant: 'Xenon',
    thrustN: 0.088,
    thrustDisplay: '88 mN',
    ispS: 1660,
    massKg: 5.3,
    twr: 0.0017,
    powerKw: 1.5,
    trl: 9,
    status: 'Operational',
    vehicle: 'SMART-1, Eurostar 3000',
    notes: 'Flew ESA SMART-1 lunar mission. Operational on Eurostar-series commsats.',
  },
  {
    id: 'x3',
    name: 'X3',
    manufacturer: 'Aerojet / Univ. Michigan',
    category: 'electric-hall',
    propellant: 'Xenon / Krypton',
    thrustN: 5.4,
    thrustDisplay: '5.4 N',
    ispS: 2340,
    massKg: 230,
    twr: 0.0024,
    powerKw: 100,
    trl: 5,
    status: 'In Development',
    vehicle: 'NASA Mars transport concept',
    notes: 'Nested-channel Hall thruster. Record 100 kW operation. Targeting crewed Mars.',
  },
  // Electric - Ion (Gridded)
  {
    id: 'next-c',
    name: 'NEXT-C',
    manufacturer: 'Aerojet Rocketdyne / NASA',
    category: 'electric-ion',
    propellant: 'Xenon',
    thrustN: 0.236,
    thrustDisplay: '236 mN',
    ispS: 4190,
    massKg: 12.7,
    twr: 0.0019,
    powerKw: 6.9,
    trl: 8,
    status: 'Operational',
    vehicle: 'DART (flew 2022), AEPS program',
    notes: '36 cm gridded ion thruster. 7 kW class. Successor to NSTAR from Dawn mission.',
  },
  {
    id: 'nstar',
    name: 'NSTAR',
    manufacturer: 'NASA JPL / Hughes',
    category: 'electric-ion',
    propellant: 'Xenon',
    thrustN: 0.092,
    thrustDisplay: '92 mN',
    ispS: 3100,
    massKg: 8.2,
    twr: 0.0011,
    powerKw: 2.3,
    trl: 9,
    status: 'Operational',
    vehicle: 'Deep Space 1, Dawn',
    notes: '30 cm gridded ion. First ion engine used for primary propulsion (DS1, 1998).',
  },
  {
    id: 't6',
    name: 'T6 Ion Thruster',
    manufacturer: 'QinetiQ',
    category: 'electric-ion',
    propellant: 'Xenon',
    thrustN: 0.145,
    thrustDisplay: '145 mN',
    ispS: 4120,
    massKg: 8.0,
    twr: 0.0018,
    powerKw: 4.5,
    trl: 9,
    status: 'Operational',
    vehicle: 'BepiColombo',
    notes: 'Four T6 engines on ESA/JAXA BepiColombo Mercury mission (launched 2018).',
  },
  // Electric - Pulsed Plasma
  {
    id: 'busek-mpt',
    name: 'BmP-220',
    manufacturer: 'Busek',
    category: 'electric-pulsed-plasma',
    propellant: 'PTFE (Teflon)',
    thrustN: 0.00014,
    thrustDisplay: '0.14 mN',
    ispS: 1150,
    massKg: 0.5,
    twr: 0.000029,
    powerKw: 0.005,
    trl: 7,
    status: 'Operational',
    vehicle: 'FalconSat-3, Dawgstar',
    notes: 'Micro pulsed plasma thruster. 5W class. Ideal for 3U+ CubeSats.',
  },
  // Cold Gas
  {
    id: 'cubesat-coldgas',
    name: 'VACCO MiPS',
    manufacturer: 'VACCO Industries',
    category: 'cold-gas',
    propellant: 'R-236fa',
    thrustN: 0.025,
    thrustDisplay: '25 mN',
    ispS: 40,
    massKg: 0.48,
    twr: 0.0053,
    powerKw: 0,
    trl: 9,
    status: 'Operational',
    vehicle: 'MarCO CubeSats, various',
    notes: 'Micro propulsion system for CubeSats. Flew on Mars Cube One (MarCO) mission.',
  },
  {
    id: 'moog-coldgas',
    name: 'Moog 58X125A',
    manufacturer: 'Moog Inc.',
    category: 'cold-gas',
    propellant: 'Nitrogen (N2)',
    thrustN: 4.4,
    thrustDisplay: '4.4 N',
    ispS: 73,
    massKg: 0.9,
    twr: 0.50,
    powerKw: 0,
    trl: 9,
    status: 'Operational',
    vehicle: 'Various spacecraft',
    notes: 'Heritage cold gas thruster. Used for attitude control and RCS applications.',
  },
  // Green Propellant
  {
    id: 'gp-gpim',
    name: 'GR-1',
    manufacturer: 'Aerojet Rocketdyne',
    category: 'green-propellant',
    propellant: 'AF-M315E (ASCENT)',
    thrustN: 1.0,
    thrustDisplay: '1.0 N',
    ispS: 235,
    massKg: 0.4,
    twr: 0.26,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'GPIM mission (2019)',
    notes: 'First in-space demo of AF-M315E. 12% higher density Isp than hydrazine.',
  },
  {
    id: 'hpgp',
    name: 'HPGP 1N',
    manufacturer: 'Bradford ECAPS',
    category: 'green-propellant',
    propellant: 'LMP-103S',
    thrustN: 1.0,
    thrustDisplay: '1.0 N',
    ispS: 240,
    massKg: 0.38,
    twr: 0.27,
    powerKw: null,
    trl: 9,
    status: 'Operational',
    vehicle: 'PRISMA, SkySat constellation',
    notes: 'ADN-based green monoprop. Operational on SkySat constellation (Planet Labs).',
  },
  // Nuclear Thermal
  {
    id: 'draco-ntp',
    name: 'DRACO NTP Engine',
    manufacturer: 'Lockheed Martin / BWX Tech',
    category: 'nuclear-thermal',
    propellant: 'Liquid Hydrogen',
    thrustN: 55600,
    thrustDisplay: '55.6 kN',
    ispS: 900,
    massKg: null,
    twr: null,
    powerKw: null,
    trl: 4,
    status: 'In Development',
    vehicle: 'DARPA DRACO demonstrator',
    notes: 'DARPA/NASA program. In-space demo targeted ~2027. Low-enriched HALEU fuel.',
  },
  {
    id: 'nerva-heritage',
    name: 'NERVA (Heritage)',
    manufacturer: 'Aerojet (historical)',
    category: 'nuclear-thermal',
    propellant: 'Liquid Hydrogen',
    thrustN: 246000,
    thrustDisplay: '246 kN',
    ispS: 841,
    massKg: 10200,
    twr: 2.46,
    powerKw: null,
    trl: 6,
    status: 'Retired',
    vehicle: 'Ground test only (1960s-70s)',
    notes: 'NASA program cancelled 1973. Successfully ground tested. Informs modern NTP designs.',
  },
];

// ────────────────────────────────────────
// Utility helpers
// ────────────────────────────────────────

const CATEGORY_LABELS: Record<PropulsionCategory, string> = {
  'chemical-bipropellant': 'Chemical - Bipropellant',
  'chemical-solid': 'Chemical - Solid',
  'electric-hall': 'Electric - Hall Effect',
  'electric-ion': 'Electric - Ion (Gridded)',
  'electric-pulsed-plasma': 'Electric - Pulsed Plasma',
  'cold-gas': 'Cold Gas',
  'green-propellant': 'Green Propellant',
  'nuclear-thermal': 'Nuclear Thermal',
};

function formatThrust(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MN`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} kN`;
  if (n >= 1) return `${n.toFixed(1)} N`;
  if (n >= 0.001) return `${(n * 1000).toFixed(1)} mN`;
  return `${(n * 1_000_000).toFixed(1)} uN`;
}

function trlColor(trl: number): string {
  if (trl >= 9) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
  if (trl >= 7) return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
  if (trl >= 5) return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
  return 'text-red-400 bg-red-400/10 border-red-400/30';
}

function trlLabel(trl: number): string {
  if (trl >= 9) return 'Flight Proven';
  if (trl >= 7) return 'Prototype Tested';
  if (trl >= 5) return 'Component Validated';
  if (trl >= 3) return 'Proof of Concept';
  return 'Research';
}

function statusColor(status: string): string {
  switch (status) {
    case 'Operational': return 'text-emerald-400 bg-emerald-400/10';
    case 'In Development': return 'text-amber-400 bg-amber-400/10';
    case 'Experimental': return 'text-purple-400 bg-purple-400/10';
    case 'Retired': return 'text-slate-400 bg-slate-400/10';
    default: return 'text-slate-400 bg-slate-400/10';
  }
}

// For the performance bar charts, we need to compute max values
const MAX_ISP = Math.max(...ENGINES.map(e => e.ispS));
const MAX_THRUST = Math.max(...ENGINES.map(e => e.thrustN));
const MAX_POWER = Math.max(...ENGINES.filter(e => e.powerKw).map(e => e.powerKw!));

// ────────────────────────────────────────
// Unique values for filters
// ────────────────────────────────────────

const ALL_MANUFACTURERS = Array.from(new Set(ENGINES.map(e => e.manufacturer))).sort();
const ALL_PROPELLANTS = Array.from(new Set(ENGINES.map(e => e.propellant))).sort();

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

type ViewTab = 'technologies' | 'engines' | 'performance';

export default function PropulsionComparisonPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('technologies');
  const [filterCategory, setFilterCategory] = useState<PropulsionCategory | 'all'>('all');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');
  const [filterPropellant, setFilterPropellant] = useState<string>('all');
  const [filterThrustMin, setFilterThrustMin] = useState<string>('');
  const [filterThrustMax, setFilterThrustMax] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedTech, setExpandedTech] = useState<PropulsionCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered + sorted engines
  const filteredEngines = useMemo(() => {
    let result = [...ENGINES];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.manufacturer.toLowerCase().includes(q) ||
          e.vehicle.toLowerCase().includes(q) ||
          e.propellant.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter(e => e.category === filterCategory);
    }

    // Manufacturer filter
    if (filterManufacturer !== 'all') {
      result = result.filter(e => e.manufacturer === filterManufacturer);
    }

    // Propellant filter
    if (filterPropellant !== 'all') {
      result = result.filter(e => e.propellant === filterPropellant);
    }

    // Thrust range filter
    const tMin = filterThrustMin ? parseFloat(filterThrustMin) : null;
    const tMax = filterThrustMax ? parseFloat(filterThrustMax) : null;
    if (tMin !== null) result = result.filter(e => e.thrustN >= tMin);
    if (tMax !== null) result = result.filter(e => e.thrustN <= tMax);

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'isp':
          cmp = a.ispS - b.ispS;
          break;
        case 'thrust':
          cmp = a.thrustN - b.thrustN;
          break;
        case 'trl':
          cmp = a.trl - b.trl;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [filterCategory, filterManufacturer, filterPropellant, filterThrustMin, filterThrustMax, sortField, sortDir, searchQuery]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  }

  function sortIcon(field: SortField) {
    if (sortField !== field) return '\u{2195}';
    return sortDir === 'asc' ? '\u{2191}' : '\u{2193}';
  }

  function clearFilters() {
    setFilterCategory('all');
    setFilterManufacturer('all');
    setFilterPropellant('all');
    setFilterThrustMin('');
    setFilterThrustMax('');
    setSearchQuery('');
  }

  const hasActiveFilters =
    filterCategory !== 'all' ||
    filterManufacturer !== 'all' ||
    filterPropellant !== 'all' ||
    filterThrustMin !== '' ||
    filterThrustMax !== '' ||
    searchQuery !== '';

  // ── Stats ──
  const stats = useMemo(() => {
    const categories = new Set(ENGINES.map(e => e.category));
    const manufacturers = new Set(ENGINES.map(e => e.manufacturer));
    const operational = ENGINES.filter(e => e.status === 'Operational').length;
    return {
      totalEngines: ENGINES.length,
      categories: categories.size,
      manufacturers: manufacturers.size,
      operational,
    };
  }, []);

  const TABS: { id: ViewTab; label: string; icon: string }[] = [
    { id: 'technologies', label: 'Technology Overview', icon: '\u{1F52C}' },
    { id: 'engines', label: 'Engine Database', icon: '\u{2699}\u{FE0F}' },
    { id: 'performance', label: 'Performance Comparison', icon: '\u{1F4CA}' },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Tools' },
          { name: 'Propulsion Comparison' },
        ]} />
        <Breadcrumbs
          items={[
            { label: 'Tools' },
            { label: 'Propulsion Comparison' },
          ]}
        />

        {/* Header */}
        <AnimatedPageHeader
          title="Space Propulsion Systems"
          subtitle="Compare propulsion technologies and specific engines across chemical, electric, nuclear, and green propulsion categories. 27 engines spanning 8 technology families."
          accentColor="amber"
        />

        <div className="flex justify-end mb-4">
          <ShareButton
            title="Space Propulsion Systems - SpaceNexus"
            description="Compare propulsion technologies and specific engines across chemical, electric, nuclear, and green propulsion categories."
          />
        </div>

        {/* Stats row */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Engine Models', value: stats.totalEngines, color: 'text-cyan-400' },
            { label: 'Technology Types', value: stats.categories, color: 'text-amber-400' },
            { label: 'Manufacturers', value: stats.manufacturers, color: 'text-purple-400' },
            { label: 'Operational', value: stats.operational, color: 'text-emerald-400' },
          ].map((s, i) => (
            <StaggerItem key={i}><div className="card p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div></StaggerItem>
          ))}
        </StaggerContainer>

        {/* Tabs */}
        <ScrollReveal delay={0.1}>
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        </ScrollReveal>

        {/* ══════════════════════════════════════ */}
        {/* TAB: Technology Overview               */}
        {/* ══════════════════════════════════════ */}
        {activeTab === 'technologies' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {TECHNOLOGIES.map(tech => {
                const isExpanded = expandedTech === tech.id;
                const techEngines = ENGINES.filter(e => e.category === tech.id);
                return (
                  <div
                    key={tech.id}
                    className={`card p-5 cursor-pointer transition-all duration-300 hover:ring-1 hover:ring-cyan-500/30 ${
                      isExpanded ? 'ring-1 ring-cyan-500/50 md:col-span-2 xl:col-span-2' : ''
                    }`}
                    onClick={() => setExpandedTech(isExpanded ? null : tech.id)}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`text-3xl w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br ${tech.color} bg-opacity-20`}
                      >
                        {tech.icon}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${trlColor(tech.trlRange[0])}`}>
                          TRL {tech.trlRange[0]}{tech.trlRange[1] !== tech.trlRange[0] ? `-${tech.trlRange[1]}` : ''}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 mb-0.5">{tech.name}</h3>
                    <p className="text-xs text-slate-400 mb-3">{tech.subtitle}</p>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-slate-800/50 rounded-lg px-2.5 py-1.5">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Isp Range</p>
                        <p className="text-sm font-semibold text-cyan-400">
                          {tech.ispRange[0].toLocaleString()}-{tech.ispRange[1].toLocaleString()}s
                        </p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg px-2.5 py-1.5">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Thrust Class</p>
                        <p className="text-sm font-semibold text-slate-300">{tech.thrustClass.split('(')[0].trim()}</p>
                      </div>
                    </div>

                    {/* Isp bar visualization */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>Isp Range (relative)</span>
                        <span>{tech.ispRange[1].toLocaleString()}s max</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${tech.color}`}
                          style={{
                            marginLeft: `${(tech.ispRange[0] / 10000) * 100}%`,
                            width: `${((tech.ispRange[1] - tech.ispRange[0]) / 10000) * 100}%`,
                            minWidth: '8%',
                          }}
                        />
                      </div>
                    </div>

                    {/* Engine count badge */}
                    <p className="text-xs text-slate-500">
                      {techEngines.length} engine{techEngines.length !== 1 ? 's' : ''} in database
                    </p>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                        <p className="text-sm text-slate-300 leading-relaxed">{tech.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Applications</h4>
                            <ul className="space-y-1">
                              {tech.applications.map((app, i) => (
                                <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                  <span className="text-emerald-500 mt-0.5">&#x25B8;</span>
                                  {app}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Advantages</h4>
                            <ul className="space-y-1">
                              {tech.advantages.map((adv, i) => (
                                <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                  <span className="text-cyan-500 mt-0.5">+</span>
                                  {adv}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Limitations</h4>
                          <ul className="space-y-1">
                            {tech.disadvantages.map((dis, i) => (
                              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                <span className="text-red-500 mt-0.5">-</span>
                                {dis}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Engines in this category */}
                        {techEngines.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                              Engines ({techEngines.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {techEngines.map(engine => (
                                <div key={engine.id} className="bg-slate-800/60 rounded-lg px-3 py-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-200">{engine.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor(engine.status)}`}>
                                      {engine.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500">{engine.manufacturer} &middot; {engine.thrustDisplay} &middot; {engine.ispS}s Isp</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* TRL visual */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Technology Readiness</h4>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 9 }).map((_, i) => {
                              const level = i + 1;
                              const inRange = level >= tech.trlRange[0] && level <= tech.trlRange[1];
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 h-3 rounded-sm transition-colors ${
                                    inRange
                                      ? level >= 7
                                        ? 'bg-emerald-500'
                                        : level >= 5
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                      : 'bg-slate-800'
                                  }`}
                                  title={`TRL ${level}`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-slate-600">TRL 1</span>
                            <span className="text-[10px] text-slate-600">TRL 9</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="card p-4 mt-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Technology Readiness Level (TRL) Scale</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                {[
                  { trl: 1, label: 'Basic principles' },
                  { trl: 2, label: 'Concept formulated' },
                  { trl: 3, label: 'Proof of concept' },
                  { trl: 4, label: 'Lab validated' },
                  { trl: 5, label: 'Component validated' },
                  { trl: 6, label: 'Prototype demo' },
                  { trl: 7, label: 'System prototype' },
                  { trl: 8, label: 'System qualified' },
                  { trl: 9, label: 'Flight proven' },
                ].map(item => (
                  <div key={item.trl} className="text-center">
                    <div
                      className={`w-full h-2 rounded-sm mb-1 ${
                        item.trl >= 7 ? 'bg-emerald-500' : item.trl >= 5 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    />
                    <p className="text-[10px] font-bold text-slate-300">TRL {item.trl}</p>
                    <p className="text-[10px] text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════ */}
        {/* TAB: Engine Database (Comparison Table)*/}
        {/* ══════════════════════════════════════ */}
        {activeTab === 'engines' && (
          <div>
            {/* Search + Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap gap-3 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Engine name, manufacturer, vehicle..."
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none"
                  />
                </div>

                {/* Category */}
                <div className="min-w-[160px]">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Type</label>
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value as PropulsionCategory | 'all')}
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                  >
                    <option value="all">All Types</option>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Manufacturer */}
                <div className="min-w-[160px]">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Manufacturer</label>
                  <select
                    value={filterManufacturer}
                    onChange={e => setFilterManufacturer(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                  >
                    <option value="all">All Manufacturers</option>
                    {ALL_MANUFACTURERS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Propellant */}
                <div className="min-w-[140px]">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Propellant</label>
                  <select
                    value={filterPropellant}
                    onChange={e => setFilterPropellant(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                  >
                    <option value="all">All Propellants</option>
                    {ALL_PROPELLANTS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Thrust range */}
                <div className="min-w-[120px]">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Min Thrust (N)</label>
                  <input
                    type="number"
                    value={filterThrustMin}
                    onChange={e => setFilterThrustMin(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                  />
                </div>
                <div className="min-w-[120px]">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max Thrust (N)</label>
                  <input
                    type="number"
                    value={filterThrustMax}
                    onChange={e => setFilterThrustMax(e.target.value)}
                    placeholder="Any"
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-cyan-500/50 outline-none"
                  />
                </div>

                {/* Clear */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Showing {filteredEngines.length} of {ENGINES.length} engines
              </p>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/70 border-b border-slate-700/50">
                      {[
                        { field: 'name' as SortField, label: 'Engine', width: 'min-w-[160px]' },
                        { field: null, label: 'Manufacturer', width: 'min-w-[140px]' },
                        { field: null, label: 'Type', width: 'min-w-[140px]' },
                        { field: null, label: 'Propellant', width: 'min-w-[100px]' },
                        { field: 'thrust' as SortField, label: 'Thrust', width: 'min-w-[100px]' },
                        { field: 'isp' as SortField, label: 'Isp (s)', width: 'min-w-[80px]' },
                        { field: null, label: 'T/W', width: 'min-w-[60px]' },
                        { field: null, label: 'Power (kW)', width: 'min-w-[80px]' },
                        { field: 'trl' as SortField, label: 'TRL', width: 'min-w-[60px]' },
                        { field: null, label: 'Status', width: 'min-w-[100px]' },
                        { field: null, label: 'Vehicle', width: 'min-w-[160px]' },
                      ].map((col, i) => (
                        <th
                          key={i}
                          className={`px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider ${col.width} ${
                            col.field ? 'cursor-pointer hover:text-cyan-400 transition-colors select-none' : ''
                          }`}
                          onClick={col.field ? () => handleSort(col.field as SortField) : undefined}
                        >
                          {col.label}
                          {col.field && (
                            <span className="ml-1 text-slate-600">{sortIcon(col.field as SortField)}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEngines.map((engine, idx) => (
                      <tr
                        key={engine.id}
                        className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-slate-900/20' : ''
                        }`}
                        title={engine.notes}
                      >
                        <td className="px-3 py-3">
                          <span className="font-medium text-slate-100">{engine.name}</span>
                        </td>
                        <td className="px-3 py-3 text-slate-300">{engine.manufacturer}</td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-slate-400">{CATEGORY_LABELS[engine.category]}</span>
                        </td>
                        <td className="px-3 py-3 text-slate-300 text-xs">{engine.propellant}</td>
                        <td className="px-3 py-3 font-mono text-xs text-amber-400">{engine.thrustDisplay}</td>
                        <td className="px-3 py-3 font-mono text-xs text-cyan-400">{engine.ispS.toLocaleString()}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-300">
                          {engine.twr !== null ? engine.twr.toFixed(1) : '--'}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-purple-400">
                          {engine.powerKw !== null ? engine.powerKw.toFixed(1) : '--'}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${trlColor(engine.trl)}`}>
                            {engine.trl}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(engine.status)}`}>
                            {engine.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-400 max-w-[200px] truncate" title={engine.vehicle}>
                          {engine.vehicle}
                        </td>
                      </tr>
                    ))}
                    {filteredEngines.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                          No engines match the current filters. Try broadening your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="card p-4 mt-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredEngines.filter(e => e.notes).slice(0, 8).map(engine => (
                  <div key={engine.id} className="text-xs text-slate-500">
                    <span className="font-medium text-slate-300">{engine.name}:</span>{' '}
                    {engine.notes}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════ */}
        {/* TAB: Performance Comparison             */}
        {/* ══════════════════════════════════════ */}
        {activeTab === 'performance' && (
          <div className="space-y-8">
            {/* Specific Impulse comparison */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-1">Specific Impulse (Isp)</h3>
              <p className="text-xs text-slate-400 mb-5">
                Higher Isp means more efficient use of propellant. Electric propulsion vastly exceeds chemical but at much lower thrust.
              </p>
              <div className="space-y-2">
                {[...ENGINES]
                  .sort((a, b) => b.ispS - a.ispS)
                  .map(engine => {
                    // Use log scale for the bar because range spans 40-4190
                    const logMax = Math.log10(MAX_ISP);
                    const logVal = Math.log10(engine.ispS);
                    const pct = (logVal / logMax) * 100;
                    const tech = TECHNOLOGIES.find(t => t.id === engine.category);
                    return (
                      <div key={engine.id} className="flex items-center gap-3">
                        <div className="w-28 sm:w-36 text-right shrink-0">
                          <p className="text-xs font-medium text-slate-200 truncate" title={engine.name}>{engine.name}</p>
                          <p className="text-[10px] text-slate-500">{engine.manufacturer}</p>
                        </div>
                        <div className="flex-1 h-5 bg-slate-800/60 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tech?.color || 'from-cyan-500 to-blue-500'} transition-all duration-700`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                        <div className="w-20 text-right shrink-0">
                          <span className="text-xs font-mono text-cyan-400">{engine.ispS.toLocaleString()}s</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Thrust comparison */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-1">Thrust</h3>
              <p className="text-xs text-slate-400 mb-5">
                Chemical engines dominate in thrust. Electric thrusters trade thrust for fuel efficiency. Log scale used due to 8+ orders of magnitude range.
              </p>
              <div className="space-y-2">
                {[...ENGINES]
                  .sort((a, b) => b.thrustN - a.thrustN)
                  .map(engine => {
                    const logMax = Math.log10(MAX_THRUST);
                    const logVal = Math.log10(Math.max(engine.thrustN, 0.0001));
                    // Normalize: map from [log10(0.0001), logMax] to [0, 100]
                    const logMin = Math.log10(0.0001);
                    const pct = ((logVal - logMin) / (logMax - logMin)) * 100;
                    const tech = TECHNOLOGIES.find(t => t.id === engine.category);
                    return (
                      <div key={engine.id} className="flex items-center gap-3">
                        <div className="w-28 sm:w-36 text-right shrink-0">
                          <p className="text-xs font-medium text-slate-200 truncate" title={engine.name}>{engine.name}</p>
                          <p className="text-[10px] text-slate-500">{engine.manufacturer}</p>
                        </div>
                        <div className="flex-1 h-5 bg-slate-800/60 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tech?.color || 'from-amber-500 to-orange-500'} transition-all duration-700`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                        <div className="w-24 text-right shrink-0">
                          <span className="text-xs font-mono text-amber-400">{engine.thrustDisplay}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Power Requirement comparison (electric only) */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-1">Power Requirement (Electric Propulsion)</h3>
              <p className="text-xs text-slate-400 mb-5">
                Electric thrusters require onboard electrical power, typically from solar arrays. Higher power enables more thrust.
              </p>
              <div className="space-y-2">
                {ENGINES
                  .filter(e => e.powerKw !== null && e.powerKw > 0)
                  .sort((a, b) => (b.powerKw || 0) - (a.powerKw || 0))
                  .map(engine => {
                    const pct = ((engine.powerKw || 0) / MAX_POWER) * 100;
                    const tech = TECHNOLOGIES.find(t => t.id === engine.category);
                    return (
                      <div key={engine.id} className="flex items-center gap-3">
                        <div className="w-28 sm:w-36 text-right shrink-0">
                          <p className="text-xs font-medium text-slate-200 truncate" title={engine.name}>{engine.name}</p>
                          <p className="text-[10px] text-slate-500">{engine.manufacturer}</p>
                        </div>
                        <div className="flex-1 h-5 bg-slate-800/60 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tech?.color || 'from-purple-500 to-blue-500'} transition-all duration-700`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                        <div className="w-20 text-right shrink-0">
                          <span className="text-xs font-mono text-purple-400">{engine.powerKw?.toFixed(1)} kW</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Thrust-to-Weight Ratio */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-1">Thrust-to-Weight Ratio</h3>
              <p className="text-xs text-slate-400 mb-5">
                How much thrust an engine produces relative to its own weight. Chemical engines have TWR &gt;50; electric thrusters are well below 1.
              </p>
              <div className="space-y-2">
                {ENGINES
                  .filter(e => e.twr !== null)
                  .sort((a, b) => (b.twr || 0) - (a.twr || 0))
                  .map(engine => {
                    const maxTwr = Math.max(...ENGINES.filter(e => e.twr !== null).map(e => e.twr!));
                    const logMax = Math.log10(maxTwr);
                    const logVal = Math.log10(Math.max(engine.twr!, 0.00001));
                    const logMin = Math.log10(0.00001);
                    const pct = ((logVal - logMin) / (logMax - logMin)) * 100;
                    const tech = TECHNOLOGIES.find(t => t.id === engine.category);
                    return (
                      <div key={engine.id} className="flex items-center gap-3">
                        <div className="w-28 sm:w-36 text-right shrink-0">
                          <p className="text-xs font-medium text-slate-200 truncate" title={engine.name}>{engine.name}</p>
                          <p className="text-[10px] text-slate-500">{engine.manufacturer}</p>
                        </div>
                        <div className="flex-1 h-5 bg-slate-800/60 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tech?.color || 'from-emerald-500 to-teal-500'} transition-all duration-700`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                        <div className="w-20 text-right shrink-0">
                          <span className="text-xs font-mono text-emerald-400">
                            {engine.twr! >= 1 ? engine.twr!.toFixed(1) : engine.twr!.toExponential(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Isp vs Thrust scatter overview */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-1">The Propulsion Trade-Off</h3>
              <p className="text-xs text-slate-400 mb-5">
                The fundamental engineering trade-off: high-Isp systems have low thrust, and high-thrust systems have low Isp. This is why mission profiles dictate engine selection.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TECHNOLOGIES.map(tech => {
                  const techEngines = ENGINES.filter(e => e.category === tech.id);
                  return (
                    <div key={tech.id} className="bg-slate-800/40 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{tech.icon}</span>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200">{tech.name}</h4>
                          <p className="text-[10px] text-slate-500">{tech.subtitle}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-slate-500">Isp Range</p>
                          <p className="text-xs font-mono text-cyan-400">{tech.ispRange[0]}-{tech.ispRange[1]}s</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Thrust</p>
                          <p className="text-xs font-mono text-amber-400">{tech.thrustClass.split('(')[0].trim()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Engines</p>
                          <p className="text-xs font-mono text-slate-300">{techEngines.length}</p>
                        </div>
                      </div>
                      {/* mini Isp bar */}
                      <div className="mt-3">
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tech.color}`}
                            style={{ width: `${(tech.ispRange[1] / 10000) * 100}%`, minWidth: '4%' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
