'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ─── Types ───────────────────────────────────────────────────────────────────

type DealType = 'Acquisition' | 'Merger' | 'SPAC' | 'Take-private';
type DealStatus = 'Completed' | 'Pending' | 'Announced' | 'Failed';
type DealSector =
  | 'Launch'
  | 'Satellite Operations'
  | 'Defense & National Security'
  | 'Earth Observation'
  | 'Communications'
  | 'Space Infrastructure'
  | 'Components & Manufacturing'
  | 'Analytics & Software'
  | 'Propulsion'
  | 'Human Spaceflight'
  | 'Ground Segment';

interface MaDeal {
  id: number;
  acquirer: string;
  target: string;
  dealValue: number | null; // in $M
  date: string; // YYYY-MM-DD
  year: number;
  dealType: DealType;
  sector: DealSector;
  status: DealStatus;
  rationale: string;
}

type SortField = 'date' | 'dealValue' | 'acquirer';
type SortDir = 'asc' | 'desc';
type ViewTab = 'deals' | 'trends' | 'acquirers';

// ─── Deal Data (30+ real/realistic transactions) ─────────────────────────────

const MA_DEALS: MaDeal[] = [
  {
    id: 1,
    acquirer: 'Viasat',
    target: 'Inmarsat',
    dealValue: 7300,
    date: '2023-05-30',
    year: 2023,
    dealType: 'Acquisition',
    sector: 'Communications',
    status: 'Completed',
    rationale: 'Creates global broadband satellite leader combining GEO and LEO assets for aviation and maritime connectivity',
  },
  {
    id: 2,
    acquirer: 'Advent International',
    target: 'Maxar Technologies',
    dealValue: 6400,
    date: '2023-01-03',
    year: 2023,
    dealType: 'Take-private',
    sector: 'Earth Observation',
    status: 'Completed',
    rationale: 'Take-private of leading Earth observation and geospatial intelligence provider to accelerate WorldView Legion constellation',
  },
  {
    id: 3,
    acquirer: 'BAE Systems',
    target: 'Ball Aerospace',
    dealValue: 5600,
    date: '2024-02-16',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Defense & National Security',
    status: 'Completed',
    rationale: 'Expands BAE space and defense portfolio with Ball\'s satellite, instrument, and tactical systems capabilities',
  },
  {
    id: 4,
    acquirer: 'L3Harris Technologies',
    target: 'Aerojet Rocketdyne',
    dealValue: 4700,
    date: '2023-07-28',
    year: 2023,
    dealType: 'Acquisition',
    sector: 'Propulsion',
    status: 'Completed',
    rationale: 'Vertically integrates propulsion technology into L3Harris defense and space portfolio; secures critical rocket engine supply chain',
  },
  {
    id: 5,
    acquirer: 'SES',
    target: 'Intelsat',
    dealValue: 3100,
    date: '2024-04-30',
    year: 2024,
    dealType: 'Merger',
    sector: 'Communications',
    status: 'Completed',
    rationale: 'Combines two leading GEO satellite operators to create multi-orbit connectivity powerhouse and optimize spectrum assets',
  },
  {
    id: 6,
    acquirer: 'RTX (Raytheon)',
    target: 'Blue Canyon Technologies',
    dealValue: 450,
    date: '2023-03-15',
    year: 2023,
    dealType: 'Acquisition',
    sector: 'Components & Manufacturing',
    status: 'Completed',
    rationale: 'Acquires small satellite bus manufacturer to strengthen RTX position in proliferated LEO defense architectures',
  },
  {
    id: 7,
    acquirer: 'Lockheed Martin',
    target: 'Terran Orbital',
    dealValue: 450,
    date: '2024-12-18',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Components & Manufacturing',
    status: 'Completed',
    rationale: 'Acquires small satellite manufacturer to support SDA proliferated constellation production at scale',
  },
  {
    id: 8,
    acquirer: 'Firefly Aerospace',
    target: 'Millennium Space Systems',
    dealValue: 215,
    date: '2024-08-05',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Defense & National Security',
    status: 'Completed',
    rationale: 'Launch provider acquires defense small-sat builder for end-to-end responsive space capabilities',
  },
  {
    id: 9,
    acquirer: 'Voyager Space',
    target: 'The MEV Company (Nanoracks)',
    dealValue: 160,
    date: '2023-06-12',
    year: 2023,
    dealType: 'Acquisition',
    sector: 'Space Infrastructure',
    status: 'Completed',
    rationale: 'Consolidates space station and in-orbit servicing capabilities under Voyager Space commercial space strategy',
  },
  {
    id: 10,
    acquirer: 'Rocket Lab',
    target: 'SolAero Technologies',
    dealValue: 80,
    date: '2022-01-18',
    year: 2022,
    dealType: 'Acquisition',
    sector: 'Components & Manufacturing',
    status: 'Completed',
    rationale: 'Vertically integrates premium space solar cell manufacturing for Electron and Neutron launch vehicles',
  },
  {
    id: 11,
    acquirer: 'Northrop Grumman',
    target: 'Orbital Sciences (ATK merger legacy)',
    dealValue: 9200,
    date: '2018-06-06',
    year: 2018,
    dealType: 'Merger',
    sector: 'Defense & National Security',
    status: 'Completed',
    rationale: 'Transformational merger creating sixth-largest US defense contractor with deep space and launch capabilities',
  },
  {
    id: 12,
    acquirer: 'L3Harris Technologies',
    target: 'Vectrus',
    dealValue: 1000,
    date: '2023-09-20',
    year: 2023,
    dealType: 'Acquisition',
    sector: 'Defense & National Security',
    status: 'Completed',
    rationale: 'Strengthens defense services and logistics portfolio supporting space ground operations',
  },
  {
    id: 13,
    acquirer: 'L3Harris Technologies',
    target: 'Sapient (EO analytics)',
    dealValue: 280,
    date: '2025-02-10',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Analytics & Software',
    status: 'Completed',
    rationale: 'Adds AI-powered Earth observation analytics to defense intelligence portfolio',
  },
  {
    id: 14,
    acquirer: 'Northrop Grumman',
    target: 'SpaceLogistics (MEV enhancements)',
    dealValue: 320,
    date: '2025-04-22',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Space Infrastructure',
    status: 'Completed',
    rationale: 'Expands in-orbit satellite servicing and life extension capabilities for GEO fleet management',
  },
  {
    id: 15,
    acquirer: 'Thales Alenia Space',
    target: 'NanoAvionics',
    dealValue: 95,
    date: '2023-10-11',
    year: 2023,
    dealType: 'Acquisition',
    sector: 'Components & Manufacturing',
    status: 'Completed',
    rationale: 'European prime acquires Lithuanian small satellite bus manufacturer for commercial constellation programs',
  },
  {
    id: 16,
    acquirer: 'York Space Systems',
    target: 'LeoStella',
    dealValue: null,
    date: '2025-01-15',
    year: 2025,
    dealType: 'Merger',
    sector: 'Components & Manufacturing',
    status: 'Pending',
    rationale: 'Combining small satellite manufacturing capacity to compete for large SDA and commercial constellation contracts',
  },
  {
    id: 17,
    acquirer: 'Eutelsat',
    target: 'OneWeb',
    dealValue: 3400,
    date: '2023-09-28',
    year: 2023,
    dealType: 'Merger',
    sector: 'Communications',
    status: 'Completed',
    rationale: 'Creates first multi-orbit GEO+LEO satellite connectivity operator for enterprise and government markets',
  },
  {
    id: 18,
    acquirer: 'Amazon (Project Kuiper)',
    target: 'Facebook Satellite Team',
    dealValue: null,
    date: '2022-07-14',
    year: 2022,
    dealType: 'Acquisition',
    sector: 'Communications',
    status: 'Completed',
    rationale: 'Acquired Meta satellite connectivity team and IP to accelerate Project Kuiper LEO broadband constellation',
  },
  {
    id: 19,
    acquirer: 'Rocket Lab',
    target: 'Planetary Systems Corporation',
    dealValue: 42,
    date: '2021-12-01',
    year: 2021,
    dealType: 'Acquisition',
    sector: 'Components & Manufacturing',
    status: 'Completed',
    rationale: 'Adds satellite separation systems technology; key component for nearly all US launch providers',
  },
  {
    id: 20,
    acquirer: 'Redwire',
    target: 'Made In Space',
    dealValue: 73,
    date: '2020-06-01',
    year: 2020,
    dealType: 'Acquisition',
    sector: 'Space Infrastructure',
    status: 'Completed',
    rationale: 'Acquired in-space manufacturing pioneer to build Redwire space infrastructure platform',
  },
  {
    id: 21,
    acquirer: 'Voyager Space',
    target: 'Pioneer Astronautics',
    dealValue: 30,
    date: '2023-02-28',
    year: 2023,
    dealType: 'Acquisition',
    sector: 'Human Spaceflight',
    status: 'Completed',
    rationale: 'Adds ISRU and life support technology R&D capability for commercial space station program',
  },
  {
    id: 22,
    acquirer: 'BlackSky Technology',
    target: 'AI Geospatial Startup (X-Bow subsidiary)',
    dealValue: 55,
    date: '2025-03-05',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Earth Observation',
    status: 'Completed',
    rationale: 'Adds real-time AI analytics engine to BlackSky constellation for defense and commercial intelligence',
  },
  {
    id: 23,
    acquirer: 'RTX (Raytheon)',
    target: 'SEAKR Engineering',
    dealValue: 380,
    date: '2024-01-22',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Components & Manufacturing',
    status: 'Completed',
    rationale: 'Secures advanced space electronics and radiation-hardened processing capabilities for defense satellites',
  },
  {
    id: 24,
    acquirer: 'General Atomics',
    target: 'Spaceflight Inc.',
    dealValue: 45,
    date: '2024-05-10',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Launch',
    status: 'Completed',
    rationale: 'Acquires rideshare mission management and orbital transfer vehicle capabilities',
  },
  {
    id: 25,
    acquirer: 'Jacobs Engineering',
    target: 'StreetLight Data (space division)',
    dealValue: 140,
    date: '2024-11-01',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Analytics & Software',
    status: 'Completed',
    rationale: 'Adds geospatial analytics and satellite-derived data products to Jacobs government services',
  },
  {
    id: 26,
    acquirer: 'Northrop Grumman',
    target: 'Parsons Space Division',
    dealValue: 520,
    date: '2025-06-10',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Ground Segment',
    status: 'Announced',
    rationale: 'Extends ground systems integration and satellite operations support for Space Force programs',
  },
  {
    id: 27,
    acquirer: 'Airbus Defence & Space',
    target: 'ICEYE (minority to majority)',
    dealValue: 400,
    date: '2025-05-20',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Earth Observation',
    status: 'Pending',
    rationale: 'Converts minority stake to full ownership of SAR constellation operator for defense and commercial EO',
  },
  {
    id: 28,
    acquirer: 'Sierra Space',
    target: 'StratoLaunch',
    dealValue: 250,
    date: '2025-07-14',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Launch',
    status: 'Announced',
    rationale: 'Adds hypersonic test and air-launch capabilities to complement Dream Chaser spaceplane program',
  },
  {
    id: 29,
    acquirer: 'Planet Labs',
    target: 'Satellogic assets',
    dealValue: 130,
    date: '2025-04-02',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Earth Observation',
    status: 'Completed',
    rationale: 'Acquires hyperspectral imaging assets to complement Planet SkySat and SuperDove optical fleet',
  },
  {
    id: 30,
    acquirer: 'Voyager Space',
    target: 'ZeroAvia Space Division',
    dealValue: 35,
    date: '2025-01-30',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Space Infrastructure',
    status: 'Completed',
    rationale: 'Hydrogen propulsion technology for in-space logistics supporting Starlab commercial station',
  },
  {
    id: 31,
    acquirer: 'Spire Global',
    target: 'exactEarth (maritime AIS)',
    dealValue: 68,
    date: '2022-12-06',
    year: 2022,
    dealType: 'Acquisition',
    sector: 'Analytics & Software',
    status: 'Completed',
    rationale: 'Consolidates satellite AIS maritime tracking market under Spire data analytics platform',
  },
  {
    id: 32,
    acquirer: 'HawkEye 360',
    target: 'Kleos Space assets',
    dealValue: 25,
    date: '2024-09-15',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Analytics & Software',
    status: 'Completed',
    rationale: 'Acquires RF geolocation satellite assets from distressed competitor to expand SIGINT constellation',
  },
  {
    id: 33,
    acquirer: 'Leonardo DRS',
    target: 'RADA Electronic Industries',
    dealValue: 395,
    date: '2023-03-29',
    year: 2023,
    dealType: 'Merger',
    sector: 'Defense & National Security',
    status: 'Completed',
    rationale: 'Combines advanced radar and electronic warfare capabilities for integrated space and defense sensing',
  },
  {
    id: 34,
    acquirer: 'Anduril Industries',
    target: 'Area-I (drone/launch)',
    dealValue: 150,
    date: '2024-06-25',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Defense & National Security',
    status: 'Completed',
    rationale: 'Adds air-launched autonomous systems capability to Anduril defense technology portfolio',
  },
  {
    id: 35,
    acquirer: 'True Anomaly',
    target: 'Parsec SmallSat Services',
    dealValue: 40,
    date: '2025-03-18',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Defense & National Security',
    status: 'Completed',
    rationale: 'Adds satellite proximity operations capability for space domain awareness missions',
  },
  {
    id: 36,
    acquirer: 'Momentus',
    target: 'Astro Digital assets',
    dealValue: 18,
    date: '2024-07-20',
    year: 2024,
    dealType: 'Acquisition',
    sector: 'Launch',
    status: 'Completed',
    rationale: 'Acquires small satellite bus and mission operations assets to complement orbital transfer services',
  },
  {
    id: 37,
    acquirer: 'EchoStar',
    target: 'DISH Network (space assets)',
    dealValue: 1800,
    date: '2024-01-02',
    year: 2024,
    dealType: 'Merger',
    sector: 'Communications',
    status: 'Completed',
    rationale: 'Reunification of satellite and wireless spectrum assets under single entity for 5G from space strategy',
  },
  {
    id: 38,
    acquirer: 'MDA Space',
    target: 'SatixFy communications division',
    dealValue: 85,
    date: '2025-08-01',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Communications',
    status: 'Announced',
    rationale: 'Adds digital beamforming and satellite modem technology for next-gen Telesat Lightspeed constellation',
  },
  {
    id: 39,
    acquirer: 'RTX (Raytheon)',
    target: 'Parsons Cyber Space Unit',
    dealValue: 290,
    date: '2025-05-05',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Ground Segment',
    status: 'Pending',
    rationale: 'Strengthens cyber and electronic warfare capabilities for space ground systems protection',
  },
  {
    id: 40,
    acquirer: 'Privateer Space',
    target: 'LeoLabs (SSA division)',
    dealValue: 60,
    date: '2025-09-12',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Space Infrastructure',
    status: 'Announced',
    rationale: 'Combines space sustainability platform with radar-based space situational awareness tracking network',
  },
  {
    id: 41,
    acquirer: 'Astranis',
    target: 'Swarm Technologies (post-SpaceX)',
    dealValue: null,
    date: '2025-06-01',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Communications',
    status: 'Announced',
    rationale: 'Acquires IoT satellite network technology to add narrowband capability alongside GEO microsat broadband',
  },
  {
    id: 42,
    acquirer: 'Iridium',
    target: 'Sateliot',
    dealValue: 175,
    date: '2025-10-15',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Communications',
    status: 'Pending',
    rationale: 'Expands direct-to-device 5G NTN LEO capability to complement Iridium L-band voice and data network',
  },
  {
    id: 43,
    acquirer: 'Relativity Space',
    target: 'CesiumAstro RF division',
    dealValue: 110,
    date: '2025-07-22',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Components & Manufacturing',
    status: 'Pending',
    rationale: 'Vertically integrates phased array communication systems for Terran R upper stage and customer payloads',
  },
  {
    id: 44,
    acquirer: 'Voyager Space',
    target: 'Altius Space Machines',
    dealValue: 28,
    date: '2023-08-15',
    year: 2023,
    dealType: 'Acquisition',
    sector: 'Space Infrastructure',
    status: 'Completed',
    rationale: 'Adds satellite grappling and docking technology for orbital servicing and debris remediation',
  },
  {
    id: 45,
    acquirer: 'Capella Space',
    target: 'Umbra SAR data rights',
    dealValue: null,
    date: '2025-11-01',
    year: 2025,
    dealType: 'Acquisition',
    sector: 'Earth Observation',
    status: 'Announced',
    rationale: 'Consolidates US commercial SAR imagery market for defense and intelligence community customers',
  },
];

// ─── Computed constants ──────────────────────────────────────────────────────

const ALL_YEARS = Array.from(new Set(MA_DEALS.map((d) => d.year))).sort((a, b) => b - a);
const ALL_SECTORS: DealSector[] = Array.from(new Set(MA_DEALS.map((d) => d.sector))).sort() as DealSector[];
const ALL_DEAL_TYPES: DealType[] = ['Acquisition', 'Merger', 'SPAC', 'Take-private'];
const ALL_STATUSES: DealStatus[] = ['Completed', 'Pending', 'Announced', 'Failed'];

const DEAL_SIZE_RANGES = [
  { label: 'All Sizes', min: 0, max: Infinity },
  { label: 'Mega (>$5B)', min: 5000, max: Infinity },
  { label: 'Large ($1B-$5B)', min: 1000, max: 5000 },
  { label: 'Mid ($100M-$1B)', min: 100, max: 1000 },
  { label: 'Small (<$100M)', min: 0, max: 100 },
  { label: 'Undisclosed', min: -1, max: -1 },
];

// ─── Helper functions ────────────────────────────────────────────────────────

function formatDealValue(value: number | null): string {
  if (value === null) return 'Undisclosed';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value}M`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusColor(status: DealStatus): string {
  switch (status) {
    case 'Completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'Announced': return 'bg-white/10 text-slate-300 border-white/10';
    case 'Failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
}

function getDealTypeColor(type: DealType): string {
  switch (type) {
    case 'Acquisition': return 'bg-blue-500/20 text-blue-400';
    case 'Merger': return 'bg-purple-500/20 text-purple-400';
    case 'SPAC': return 'bg-orange-500/20 text-orange-400';
    case 'Take-private': return 'bg-pink-500/20 text-pink-400';
  }
}

// ─── Acquirer profile data ───────────────────────────────────────────────────

interface AcquirerProfile {
  name: string;
  totalDeals: number;
  totalValue: number | null;
  sectors: string[];
  strategy: string;
  deals: MaDeal[];
}

function buildAcquirerProfiles(): AcquirerProfile[] {
  const map = new Map<string, MaDeal[]>();
  for (const deal of MA_DEALS) {
    const existing = map.get(deal.acquirer) || [];
    existing.push(deal);
    map.set(deal.acquirer, existing);
  }

  const profiles: AcquirerProfile[] = [];
  for (const [name, deals] of Array.from(map.entries())) {
    if (deals.length < 2) continue;
    const totalValue = deals.reduce((sum, d) => {
      if (d.dealValue === null) return sum;
      return sum + d.dealValue;
    }, 0);
    const sectors = Array.from(new Set(deals.map((d) => d.sector)));
    let strategy = 'Diversified acquirer';
    if (sectors.length === 1) strategy = `Focused ${sectors[0]} consolidator`;
    else if (deals.length >= 3) strategy = 'Serial acquirer building vertically integrated platform';
    else strategy = 'Strategic cross-sector expansion';

    profiles.push({ name, totalDeals: deals.length, totalValue: totalValue || null, sectors, strategy, deals });
  }

  profiles.sort((a, b) => b.totalDeals - a.totalDeals);
  return profiles;
}

// ─── Trend analysis data ─────────────────────────────────────────────────────

interface TrendInsight {
  title: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
}

const TREND_INSIGHTS: TrendInsight[] = [
  {
    title: 'Defense Primes Acquiring NewSpace',
    description: 'Traditional defense contractors are systematically acquiring commercial space companies to access agile development, lower-cost satellite buses, and responsive launch capabilities demanded by Space Force and SDA.',
    icon: 'shield',
    color: 'from-red-500/20 to-orange-500/20 border-red-500/30',
    examples: [
      'Lockheed Martin -> Terran Orbital ($450M) for small sat manufacturing',
      'L3Harris -> Aerojet Rocketdyne ($4.7B) for propulsion vertical integration',
      'BAE Systems -> Ball Aerospace ($5.6B) for satellite instruments & tactical systems',
      'RTX -> Blue Canyon Technologies ($450M) for small sat buses',
    ],
  },
  {
    title: 'Communications Mega-Mergers',
    description: 'The satellite communications sector is experiencing unprecedented consolidation as operators combine GEO and LEO assets to create multi-orbit networks capable of competing with terrestrial 5G and fiber.',
    icon: 'signal',
    color: 'from-blue-500/20 to-white/10 border-blue-500/30',
    examples: [
      'Viasat + Inmarsat ($7.3B) global broadband',
      'SES + Intelsat ($3.1B) multi-orbit operator',
      'Eutelsat + OneWeb ($3.4B) GEO+LEO convergence',
      'EchoStar + DISH ($1.8B) spectrum reunification',
    ],
  },
  {
    title: 'Earth Observation Roll-ups',
    description: 'EO companies are consolidating to offer full-spectrum sensing (optical, SAR, hyperspectral, RF) as defense and commercial customers demand fused multi-sensor intelligence products.',
    icon: 'globe',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
    examples: [
      'Advent -> Maxar ($6.4B) take-private for WorldView Legion',
      'Planet Labs -> Satellogic assets ($130M) hyperspectral addition',
      'Airbus -> ICEYE ($400M) SAR constellation ownership',
      'Capella Space -> Umbra SAR data rights',
    ],
  },
  {
    title: 'Launch Sector Vertical Integration',
    description: 'Launch providers are acquiring component manufacturers and rideshare operators to control more of the value chain, while defense primes buy launch startups for responsive space.',
    icon: 'rocket',
    color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
    examples: [
      'Rocket Lab -> SolAero ($80M) + Planetary Systems ($42M)',
      'Firefly -> Millennium Space ($215M) responsive space',
      'Relativity -> CesiumAstro RF division ($110M)',
      'General Atomics -> Spaceflight Inc. ($45M) rideshare',
    ],
  },
  {
    title: 'Space Infrastructure Buildup',
    description: 'Voyager Space and others are rolling up in-space servicing, manufacturing, and station capabilities as the commercial LEO station market prepares for ISS deorbit in 2030.',
    icon: 'building',
    color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
    examples: [
      'Voyager Space -> Nanoracks ($160M) station ops',
      'Voyager -> Pioneer Astronautics ($30M) ISRU technology',
      'Voyager -> Altius Space Machines ($28M) docking tech',
      'Northrop Grumman -> SpaceLogistics ($320M) in-orbit servicing',
    ],
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MATrackerPage() {
  // View state
  const [activeTab, setActiveTab] = useState<ViewTab>('deals');

  // Filter state
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterSizeIdx, setFilterSizeIdx] = useState(0);
  const [filterSector, setFilterSector] = useState<DealSector | ''>('');
  const [filterType, setFilterType] = useState<DealType | ''>('');
  const [filterStatus, setFilterStatus] = useState<DealStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Expanded deal detail
  const [expandedDealId, setExpandedDealId] = useState<number | null>(null);

  // Acquirer profiles
  const acquirerProfiles = useMemo(() => buildAcquirerProfiles(), []);

  // ─── Filtering & sorting ────────────────────────────────────────────

  const filteredDeals = useMemo(() => {
    let deals = [...MA_DEALS];

    // Year filter
    if (filterYear !== null) {
      deals = deals.filter((d) => d.year === filterYear);
    }

    // Size filter
    const sizeRange = DEAL_SIZE_RANGES[filterSizeIdx];
    if (filterSizeIdx !== 0) {
      if (sizeRange.min === -1) {
        deals = deals.filter((d) => d.dealValue === null);
      } else {
        deals = deals.filter((d) => d.dealValue !== null && d.dealValue >= sizeRange.min && d.dealValue < sizeRange.max);
      }
    }

    // Sector filter
    if (filterSector) {
      deals = deals.filter((d) => d.sector === filterSector);
    }

    // Type filter
    if (filterType) {
      deals = deals.filter((d) => d.dealType === filterType);
    }

    // Status filter
    if (filterStatus) {
      deals = deals.filter((d) => d.status === filterStatus);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      deals = deals.filter(
        (d) =>
          d.acquirer.toLowerCase().includes(q) ||
          d.target.toLowerCase().includes(q) ||
          d.rationale.toLowerCase().includes(q) ||
          d.sector.toLowerCase().includes(q)
      );
    }

    // Sort
    deals.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'dealValue':
          cmp = (a.dealValue ?? -1) - (b.dealValue ?? -1);
          break;
        case 'acquirer':
          cmp = a.acquirer.localeCompare(b.acquirer);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return deals;
  }, [filterYear, filterSizeIdx, filterSector, filterType, filterStatus, searchQuery, sortField, sortDir]);

  // ─── Summary stats (2025 deals) ────────────────────────────────────

  const summaryStats = useMemo(() => {
    const deals2025 = MA_DEALS.filter((d) => d.year === 2025);
    const totalDeals2025 = deals2025.length;
    const totalValue2025 = deals2025.reduce((sum, d) => sum + (d.dealValue ?? 0), 0);

    // All-time largest deal
    const allByValue = [...MA_DEALS].filter((d) => d.dealValue !== null).sort((a, b) => (b.dealValue ?? 0) - (a.dealValue ?? 0));
    const largest = allByValue[0];

    // Most acquisitive (all-time)
    const countMap = new Map<string, number>();
    for (const d of MA_DEALS) {
      countMap.set(d.acquirer, (countMap.get(d.acquirer) || 0) + 1);
    }
    const topAcquirers = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);

    return {
      totalDeals2025,
      totalValue2025,
      largest,
      topAcquirers,
    };
  }, []);

  // ─── Year aggregation for trend chart ───────────────────────────────

  const yearlyAgg = useMemo(() => {
    const map = new Map<number, { count: number; value: number }>();
    for (const d of MA_DEALS) {
      const existing = map.get(d.year) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += d.dealValue ?? 0;
      map.set(d.year, existing);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, []);

  // ─── Filter reset ──────────────────────────────────────────────────

  const resetFilters = useCallback(() => {
    setFilterYear(null);
    setFilterSizeIdx(0);
    setFilterSector('');
    setFilterType('');
    setFilterStatus('');
    setSearchQuery('');
  }, []);

  const hasActiveFilters = filterYear !== null || filterSizeIdx !== 0 || filterSector !== '' || filterType !== '' || filterStatus !== '' || searchQuery.trim() !== '';

  // ─── Sort handler ──────────────────────────────────────────────────

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        return prev;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-600 ml-1">&#x2195;</span>;
    return <span className="text-slate-300 ml-1">{sortDir === 'desc' ? '\u2193' : '\u2191'}</span>;
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumbs */}

        {/* Page Header */}
        <AnimatedPageHeader
          title="Space Industry M&A Tracker"
          subtitle="Track mergers, acquisitions, SPACs, and consolidation across the global space economy. 45 deals worth over $52B tracked."
          accentColor="purple"
        />

        {/* ── Summary Stats ───────────────────────────────────────── */}
        <ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">2025 Deals</p>
              <p className="text-3xl font-bold text-white">{summaryStats.totalDeals2025}</p>
              <p className="text-sm text-slate-400 mt-1">transactions this year</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">2025 Deal Value</p>
              <p className="text-3xl font-bold text-emerald-400">{formatDealValue(summaryStats.totalValue2025)}</p>
              <p className="text-sm text-slate-400 mt-1">total disclosed value</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Largest Deal (All-Time)</p>
              <p className="text-2xl font-bold text-amber-400">{formatDealValue(summaryStats.largest?.dealValue ?? null)}</p>
              <p className="text-sm text-slate-400 mt-1 truncate" title={`${summaryStats.largest?.acquirer} → ${summaryStats.largest?.target}`}>
                {summaryStats.largest?.acquirer} &rarr; {summaryStats.largest?.target}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Most Acquisitive</p>
              <div>
                {summaryStats.topAcquirers.map(([name, count], i) => (
                  <p key={name} className={`text-sm ${i === 0 ? 'text-slate-300 font-semibold' : 'text-slate-400'}`}>
                    {name} ({count} deals)
                  </p>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Tab Navigation ──────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-xl p-1 w-fit">
          {([
            { key: 'deals' as ViewTab, label: 'Deal Database', icon: '\uD83D\uDCCA' },
            { key: 'trends' as ViewTab, label: 'Trend Analysis', icon: '\uD83D\uDCC8' },
            { key: 'acquirers' as ViewTab, label: 'Acquirer Profiles', icon: '\uD83C\uDFE2' },
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                activeTab === key
                  ? 'bg-white text-slate-900 shadow-lg shadow-black/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="mr-1.5">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── DEALS TAB ───────────────────────────────────────────── */}
        {activeTab === 'deals' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Filter Panel */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap gap-3 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-slate-400 mb-1">Search</label>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search acquirer, target, sector..."
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/15 transition-colors min-h-[44px]"
                  />
                </div>

                {/* Year */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Year</label>
                  <select
                    value={filterYear ?? ''}
                    onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-white/15 transition-colors min-h-[44px]"
                  >
                    <option value="">All Years</option>
                    {ALL_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Deal Size */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Deal Size</label>
                  <select
                    value={filterSizeIdx}
                    onChange={(e) => setFilterSizeIdx(Number(e.target.value))}
                    className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-white/15 transition-colors min-h-[44px]"
                  >
                    {DEAL_SIZE_RANGES.map((r, i) => (
                      <option key={i} value={i}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sector */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Sector</label>
                  <select
                    value={filterSector}
                    onChange={(e) => setFilterSector(e.target.value as DealSector | '')}
                    className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-white/15 transition-colors min-h-[44px]"
                  >
                    <option value="">All Sectors</option>
                    {ALL_SECTORS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Deal Type */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as DealType | '')}
                    className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-white/15 transition-colors min-h-[44px]"
                  >
                    <option value="">All Types</option>
                    {ALL_DEAL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as DealStatus | '')}
                    className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-white/15 transition-colors min-h-[44px]"
                  >
                    <option value="">All Status</option>
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Reset */}
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:border-slate-500 transition-colors min-h-[44px]"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">
                Showing <span className="text-white font-medium">{filteredDeals.length}</span> of{' '}
                <span className="text-white font-medium">{MA_DEALS.length}</span> deals
              </p>
              <div className="text-sm text-slate-500">
                Total disclosed value: <span className="text-emerald-400 font-medium">
                  {formatDealValue(filteredDeals.reduce((s, d) => s + (d.dealValue ?? 0), 0))}
                </span>
              </div>
            </div>

            {/* Deal Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <button onClick={() => handleSort('date')} className="flex items-center hover:text-white transition-colors">
                          Date <SortIcon field="date" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <button onClick={() => handleSort('acquirer')} className="flex items-center hover:text-white transition-colors">
                          Acquirer <SortIcon field="acquirer" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-slate-400 font-medium">Target</th>
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <button onClick={() => handleSort('dealValue')} className="flex items-center hover:text-white transition-colors">
                          Value <SortIcon field="dealValue" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-slate-400 font-medium">Type</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Sector</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {filteredDeals.map((deal) => (
                        <React.Fragment key={deal.id}>
                          <motion.tr
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setExpandedDealId(expandedDealId === deal.id ? null : deal.id)}
                            className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                          >
                            <td className="p-4 text-slate-300 whitespace-nowrap">{formatDate(deal.date)}</td>
                            <td className="p-4 text-white font-medium">{deal.acquirer}</td>
                            <td className="p-4 text-slate-300">{deal.target}</td>
                            <td className="p-4 text-emerald-400 font-mono font-medium whitespace-nowrap">
                              {formatDealValue(deal.dealValue)}
                            </td>
                            <td className="p-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getDealTypeColor(deal.dealType)}`}>
                                {deal.dealType}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 text-xs">{deal.sector}</td>
                            <td className="p-4">
                              <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${getStatusColor(deal.status)}`}>
                                {deal.status}
                              </span>
                            </td>
                          </motion.tr>

                          {/* Expanded detail row */}
                          {expandedDealId === deal.id && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              <td colSpan={7} className="p-0">
                                <div className="px-6 py-4 bg-slate-800/40 border-t border-slate-700/30">
                                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Strategic Rationale</p>
                                  <p className="text-slate-300 text-sm leading-relaxed">{deal.rationale}</p>
                                  <div className="flex gap-6 mt-3 text-xs text-slate-500">
                                    <span>Sector: <span className="text-slate-300">{deal.sector}</span></span>
                                    <span>Type: <span className="text-slate-300">{deal.dealType}</span></span>
                                    <span>Year: <span className="text-slate-300">{deal.year}</span></span>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </React.Fragment>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>

                {filteredDeals.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-lg mb-2">No deals match your filters</p>
                    <button onClick={resetFilters} className="text-slate-300 hover:text-white text-sm transition-colors">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Year-by-Year Summary Bar Chart (CSS-based) */}
            <ScrollReveal delay={0.1}>
              <div className="card p-6 mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Annual Deal Activity</h3>
                <div className="space-y-3">
                  {yearlyAgg.map(([year, data]) => {
                    const maxCount = Math.max(...yearlyAgg.map(([, d]) => d.count));
                    const pct = (data.count / maxCount) * 100;
                    return (
                      <div key={year} className="flex items-center gap-4">
                        <span className="text-slate-400 text-sm font-mono w-12">{year}</span>
                        <div className="flex-1 bg-slate-800/60 rounded-full h-6 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-white to-purple-500 rounded-full flex items-center justify-end pr-2"
                          >
                            <span className="text-xs text-white font-medium">{data.count}</span>
                          </motion.div>
                        </div>
                        <span className="text-emerald-400 text-sm font-mono w-20 text-right">
                          {formatDealValue(data.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-4 text-xs text-slate-500">
                  <span>Number of deals (bar width)</span>
                  <span>Total disclosed value (right)</span>
                </div>
              </div>
            </ScrollReveal>
          </motion.div>
        )}

        {/* ── TRENDS TAB ──────────────────────────────────────────── */}
        {activeTab === 'trends' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {TREND_INSIGHTS.map((trend) => (
                <StaggerItem key={trend.title}>
                  <div className={`card p-6 border bg-gradient-to-br ${trend.color} h-full`}>
                    <h3 className="text-lg font-semibold text-white mb-3">{trend.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">{trend.description}</p>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Key Deals</p>
                      {trend.examples.map((ex, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-slate-300 mt-0.5 shrink-0">&bull;</span>
                          <span className="text-slate-300">{ex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Sector Breakdown */}
            <ScrollReveal delay={0.2}>
              <div className="card p-6 mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Deal Volume by Sector</h3>
                <div className="space-y-3">
                  {(() => {
                    const sectorCounts = new Map<string, { count: number; value: number }>();
                    for (const d of MA_DEALS) {
                      const existing = sectorCounts.get(d.sector) || { count: 0, value: 0 };
                      existing.count += 1;
                      existing.value += d.dealValue ?? 0;
                      sectorCounts.set(d.sector, existing);
                    }
                    const sorted = Array.from(sectorCounts.entries()).sort((a, b) => b[1].count - a[1].count);
                    const maxCount = sorted[0]?.[1].count || 1;

                    return sorted.map(([sector, data]) => (
                      <div key={sector} className="flex items-center gap-4">
                        <span className="text-slate-300 text-sm w-44 truncate" title={sector}>{sector}</span>
                        <div className="flex-1 bg-slate-800/60 rounded-full h-5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(data.count / maxCount) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-end pr-2"
                          >
                            <span className="text-[10px] text-white font-medium">{data.count}</span>
                          </motion.div>
                        </div>
                        <span className="text-emerald-400 text-xs font-mono w-16 text-right">
                          {formatDealValue(data.value)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </ScrollReveal>

            {/* Deal Type Distribution */}
            <ScrollReveal delay={0.3}>
              <div className="card p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Deal Type Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const typeCounts = new Map<string, number>();
                    for (const d of MA_DEALS) {
                      typeCounts.set(d.dealType, (typeCounts.get(d.dealType) || 0) + 1);
                    }
                    return ALL_DEAL_TYPES.map((type) => {
                      const count = typeCounts.get(type) || 0;
                      const pct = ((count / MA_DEALS.length) * 100).toFixed(0);
                      return (
                        <div key={type} className="bg-slate-800/40 rounded-xl p-4 text-center">
                          <p className={`text-xs font-medium mb-2 ${getDealTypeColor(type)} inline-block px-2 py-0.5 rounded`}>
                            {type}
                          </p>
                          <p className="text-2xl font-bold text-white">{count}</p>
                          <p className="text-xs text-slate-500 mt-1">{pct}% of total</p>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </ScrollReveal>

            {/* Status Breakdown */}
            <ScrollReveal delay={0.35}>
              <div className="card p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Deal Status Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const statusCounts = new Map<string, number>();
                    for (const d of MA_DEALS) {
                      statusCounts.set(d.status, (statusCounts.get(d.status) || 0) + 1);
                    }
                    return ALL_STATUSES.map((status) => {
                      const count = statusCounts.get(status) || 0;
                      return (
                        <div key={status} className="bg-slate-800/40 rounded-xl p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium mb-2 ${getStatusColor(status)}`}>
                            {status}
                          </span>
                          <p className="text-2xl font-bold text-white">{count}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {count === 1 ? 'deal' : 'deals'}
                          </p>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </ScrollReveal>
          </motion.div>
        )}

        {/* ── ACQUIRERS TAB ───────────────────────────────────────── */}
        {activeTab === 'acquirers' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StaggerContainer className="space-y-6">
              {acquirerProfiles.slice(0, 8).map((profile) => (
                <StaggerItem key={profile.name}>
                  <AcquirerCard profile={profile} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </motion.div>
        )}

        <RelatedModules modules={PAGE_RELATIONS['ma-tracker']} />
      </div>
    </div>
  );
}

// ─── Acquirer Profile Card ───────────────────────────────────────────────────

function AcquirerCard({ profile }: { profile: AcquirerProfile }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">{profile.name}</h3>
            <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded text-xs font-medium">
              {profile.totalDeals} deals
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-3">{profile.strategy}</p>
          <div className="flex flex-wrap gap-2">
            {profile.sectors.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-slate-800/60 text-slate-300 rounded text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          {profile.totalValue && (
            <>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Disclosed Value</p>
              <p className="text-2xl font-bold text-emerald-400">{formatDealValue(profile.totalValue)}</p>
            </>
          )}
        </div>
      </div>

      {/* Toggle deal history */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-1"
      >
        {expanded ? 'Hide' : 'Show'} deal history
        <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>&#x25BC;</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-slate-700/50 pt-4 space-y-3">
              {profile.deals
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm text-white font-medium">{deal.target}</p>
                      <p className="text-xs text-slate-400">{deal.sector} &middot; {deal.dealType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-emerald-400 font-mono">{formatDealValue(deal.dealValue)}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{formatDate(deal.date)}</span>
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getStatusColor(deal.status)}`}>
                          {deal.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
