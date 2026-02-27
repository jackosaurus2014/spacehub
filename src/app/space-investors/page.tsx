'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ── Types ──────────────────────────────────────────────────────────────────────

type InvestorType = 'VC' | 'CVC' | 'Government' | 'Angel' | 'Accelerator' | 'PE';
type StageTag = 'Seed' | 'Series A' | 'Series B' | 'Growth' | 'Late Stage';

interface Investor {
  id: string;
  name: string;
  keyPeople: string;
  type: InvestorType;
  aumDisplay: string;        // formatted for display
  aumValue: number;          // numeric for sorting (in millions)
  stages: StageTag[];
  spaceInvestments: number;
  notablePortfolio: string[];
  thesis: string;
  founded: number;
  hq: string;
  website: string;
}

// ── Investor Data (25+ investors) ──────────────────────────────────────────────

const INVESTORS: Investor[] = [
  {
    id: 'space-capital',
    name: 'Space Capital',
    keyPeople: 'Chad Anderson',
    type: 'VC',
    aumDisplay: '$100M',
    aumValue: 100,
    stages: ['Seed', 'Series A'],
    spaceInvestments: 52,
    notablePortfolio: ['Astranis', 'Pixxel', 'Ursa Major', 'Isotropic Systems', 'Phase Four'],
    thesis: 'The only VC fund investing exclusively in the space economy. Focuses on GPS, geospatial intelligence, and communications infrastructure layers that underpin the modern economy.',
    founded: 2017,
    hq: 'New York, NY',
    website: 'https://www.spacecapital.com',
  },
  {
    id: 'founders-fund',
    name: 'Founders Fund',
    keyPeople: 'Peter Thiel, Ken Howery',
    type: 'VC',
    aumDisplay: '$11B',
    aumValue: 11000,
    stages: ['Series A', 'Series B', 'Growth'],
    spaceInvestments: 8,
    notablePortfolio: ['SpaceX', 'Planet Labs', 'Relativity Space', 'Varda Space'],
    thesis: 'Backs transformative companies building breakthrough technology. Early SpaceX investor with conviction in vertically integrated launch and space manufacturing.',
    founded: 2005,
    hq: 'San Francisco, CA',
    website: 'https://foundersfund.com',
  },
  {
    id: 'a16z',
    name: 'Andreessen Horowitz (a16z)',
    keyPeople: 'Marc Andreessen, Katherine Boyle',
    type: 'VC',
    aumDisplay: '$42B',
    aumValue: 42000,
    stages: ['Seed', 'Series A', 'Series B', 'Growth'],
    spaceInvestments: 12,
    notablePortfolio: ['K2 Space', 'Hadrian', 'Anduril', 'Shield AI', 'Skydio'],
    thesis: 'American Dynamism thesis backs defense-tech and space companies strengthening national security. Believes software-defined approaches will transform space manufacturing and operations.',
    founded: 2009,
    hq: 'Menlo Park, CA',
    website: 'https://a16z.com',
  },
  {
    id: 'bessemer',
    name: 'Bessemer Venture Partners',
    keyPeople: 'Tess Hatch',
    type: 'VC',
    aumDisplay: '$20B',
    aumValue: 20000,
    stages: ['Seed', 'Series A', 'Series B', 'Growth'],
    spaceInvestments: 15,
    notablePortfolio: ['Rocket Lab', 'Planet Labs', 'Spire Global', 'Skylo', 'Arqlite'],
    thesis: 'Pioneer in space investing with a dedicated Space Economy roadmap. Focuses on launch, satellite infrastructure, and data analytics driving commercial space adoption.',
    founded: 1911,
    hq: 'San Francisco, CA',
    website: 'https://www.bvp.com',
  },
  {
    id: 'lux-capital',
    name: 'Lux Capital',
    keyPeople: 'Josh Wolfe, Peter Hebert',
    type: 'VC',
    aumDisplay: '$5B',
    aumValue: 5000,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 14,
    notablePortfolio: ['Axiom Space', 'Hadrian', 'Saildrone', 'Impulse Space', 'Orbital Sidekick'],
    thesis: 'Deep-tech venture capital investing at the frontier of science and engineering. Bets on hard problems in space infrastructure, manufacturing, and defense.',
    founded: 2000,
    hq: 'New York, NY',
    website: 'https://luxcapital.com',
  },
  {
    id: 'khosla',
    name: 'Khosla Ventures',
    keyPeople: 'Vinod Khosla',
    type: 'VC',
    aumDisplay: '$15B',
    aumValue: 15000,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 6,
    notablePortfolio: ['Varda Space Industries', 'Momentus', 'Dawn Aerospace', 'CesiumAstro'],
    thesis: 'Invests in audacious ideas that can have massive impact. In space, focuses on green propulsion, in-space manufacturing, and novel approaches to orbital logistics.',
    founded: 2004,
    hq: 'Menlo Park, CA',
    website: 'https://www.khoslaventures.com',
  },
  {
    id: 'tiger-global',
    name: 'Tiger Global Management',
    keyPeople: 'Chase Coleman, Scott Shleifer',
    type: 'VC',
    aumDisplay: '$75B',
    aumValue: 75000,
    stages: ['Growth', 'Late Stage'],
    spaceInvestments: 5,
    notablePortfolio: ['Relativity Space', 'Planet Labs', 'Spire Global'],
    thesis: 'High-growth stage investor that rapidly deploys capital into category-defining companies. In space, targets companies with clear paths to large revenue at scale.',
    founded: 2001,
    hq: 'New York, NY',
    website: 'https://www.tigerglobal.com',
  },
  {
    id: 'google-ventures',
    name: 'Google Ventures (GV)',
    keyPeople: 'David Krane, Tom Hulme',
    type: 'CVC',
    aumDisplay: '$8B',
    aumValue: 8000,
    stages: ['Seed', 'Series A', 'Series B', 'Growth'],
    spaceInvestments: 7,
    notablePortfolio: ['SpaceX', 'Planet Labs', 'SkyBridge Capital', 'Orbital Insight'],
    thesis: 'Alphabet\'s venture arm investing across sectors including space. Leverages Google\'s expertise in data, AI, and cloud to support portfolio companies in geospatial and Earth observation.',
    founded: 2009,
    hq: 'Mountain View, CA',
    website: 'https://www.gv.com',
  },
  {
    id: 't-rowe-price',
    name: 'T. Rowe Price',
    keyPeople: 'Rob Sharps',
    type: 'PE',
    aumDisplay: '$1.4T',
    aumValue: 1400000,
    stages: ['Late Stage'],
    spaceInvestments: 3,
    notablePortfolio: ['SpaceX', 'Rocket Lab', 'Planet Labs'],
    thesis: 'Major institutional investor participating in late-stage private rounds and public offerings of proven space companies with strong revenue trajectories.',
    founded: 1937,
    hq: 'Baltimore, MD',
    website: 'https://www.troweprice.com',
  },
  {
    id: 'fidelity',
    name: 'Fidelity Investments',
    keyPeople: 'Abigail Johnson',
    type: 'PE',
    aumDisplay: '$4.5T',
    aumValue: 4500000,
    stages: ['Late Stage'],
    spaceInvestments: 2,
    notablePortfolio: ['SpaceX'],
    thesis: 'Provides late-stage private capital to high-profile space companies approaching IPO. Brings institutional credibility and long-term holding capacity.',
    founded: 1946,
    hq: 'Boston, MA',
    website: 'https://www.fidelity.com',
  },
  {
    id: 'in-q-tel',
    name: 'In-Q-Tel',
    keyPeople: 'Steve Bowsher',
    type: 'Government',
    aumDisplay: 'Strategic',
    aumValue: 500,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 20,
    notablePortfolio: ['Spire Global', 'Planet Labs', 'Capella Space', 'BlackSky', 'HawkEye 360'],
    thesis: 'CIA-linked strategic investor identifying and adapting cutting-edge technologies for the U.S. intelligence community. Strong focus on Earth observation, SIGINT, and space situational awareness.',
    founded: 1999,
    hq: 'Arlington, VA',
    website: 'https://www.iqt.org',
  },
  {
    id: 'dcvc',
    name: 'DCVC (Data Collective)',
    keyPeople: 'Zachary Bogue, Matt Ocko',
    type: 'VC',
    aumDisplay: '$3B',
    aumValue: 3000,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 8,
    notablePortfolio: ['Orbital Insight', 'Descartes Labs', 'Planet Labs', 'Muon Space'],
    thesis: 'Invests in data-driven companies transforming massive industries. In space, focuses on companies leveraging satellite data, geospatial analytics, and machine learning.',
    founded: 2011,
    hq: 'San Francisco, CA',
    website: 'https://www.dcvc.com',
  },
  {
    id: 'spark-capital',
    name: 'Spark Capital',
    keyPeople: 'Bijan Sabet, Nabeel Hyatt',
    type: 'VC',
    aumDisplay: '$4B',
    aumValue: 4000,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 5,
    notablePortfolio: ['Astra', 'Wayfinder', 'Hermeus'],
    thesis: 'Invests in companies building critical infrastructure for the future. Selectively backs space companies with strong software layers and scalable business models.',
    founded: 2005,
    hq: 'Boston, MA',
    website: 'https://www.sparkcapital.com',
  },
  {
    id: 'shield-capital',
    name: 'Shield Capital',
    keyPeople: 'Raj Shah, Will Hunt',
    type: 'VC',
    aumDisplay: '$300M',
    aumValue: 300,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 6,
    notablePortfolio: ['Albedo', 'True Anomaly', 'Impulse Space', 'Slingshot Aerospace'],
    thesis: 'National security-focused fund investing in defense and intelligence technologies. In space, prioritizes orbital domain awareness, very-low-Earth-orbit imaging, and space combat capabilities.',
    founded: 2021,
    hq: 'Washington, D.C.',
    website: 'https://www.shieldcap.com',
  },
  {
    id: 'riot-ventures',
    name: 'Riot Ventures',
    keyPeople: 'Jess Dorogusker',
    type: 'VC',
    aumDisplay: '$150M',
    aumValue: 150,
    stages: ['Seed', 'Series A'],
    spaceInvestments: 5,
    notablePortfolio: ['True Anomaly', 'Kayhan Space', 'Muon Space'],
    thesis: 'Defense-tech focused fund backing founders building technology for national security missions. In space, invests in orbital maneuvering, space domain awareness, and resilient architectures.',
    founded: 2018,
    hq: 'San Francisco, CA',
    website: 'https://riot.vc',
  },
  {
    id: 'seraphim',
    name: 'Seraphim Space',
    keyPeople: 'Mark Boggett, James Bruegger',
    type: 'VC',
    aumDisplay: '$400M',
    aumValue: 400,
    stages: ['Seed', 'Series A', 'Series B', 'Growth'],
    spaceInvestments: 42,
    notablePortfolio: ['ICEYE', 'Spire Global', 'Arqit', 'LeoLabs', 'D-Orbit', 'Isotropic Systems'],
    thesis: 'Europe\'s largest dedicated space-tech venture fund. Invests globally across the space value chain from launch and satellites to downstream data applications and sustainability.',
    founded: 2015,
    hq: 'London, UK',
    website: 'https://seraphim.vc',
  },
  {
    id: 'airbus-ventures',
    name: 'Airbus Ventures',
    keyPeople: 'Tom Enders, Lewis Pinault',
    type: 'CVC',
    aumDisplay: '$250M',
    aumValue: 250,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 10,
    notablePortfolio: ['Spire Global', 'Loft Orbital', 'Infinite Orbits', 'Mynaric'],
    thesis: 'Strategic venture arm of Airbus investing in technologies that complement and disrupt aerospace. Focuses on satellite-as-a-service, optical communications, and autonomous operations.',
    founded: 2015,
    hq: 'San Francisco, CA',
    website: 'https://airbusventures.com',
  },
  {
    id: 'boeing-horizonx',
    name: 'Boeing HorizonX (now Boeing Ventures)',
    keyPeople: 'Brian Schettler',
    type: 'CVC',
    aumDisplay: '$200M',
    aumValue: 200,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 8,
    notablePortfolio: ['SparkCognition', 'Wisk Aero', 'Matternet', 'SkyGrid'],
    thesis: 'Boeing\'s venture arm investing in autonomous systems, advanced materials, and space technologies that can enhance Boeing\'s defense and space business lines.',
    founded: 2017,
    hq: 'Arlington, VA',
    website: 'https://www.boeing.com/company/key-orgs/ventures',
  },
  {
    id: 'lockheed-ventures',
    name: 'Lockheed Martin Ventures',
    keyPeople: 'Chris Moran',
    type: 'CVC',
    aumDisplay: '$400M',
    aumValue: 400,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 12,
    notablePortfolio: ['Terran Orbital', 'Cognitive Space', 'Slingshot Aerospace', 'Orbit Fab'],
    thesis: 'Strategic CVC arm investing in technologies relevant to national security and space. Focuses on satellite servicing, autonomous space operations, and in-space logistics.',
    founded: 2007,
    hq: 'Bethesda, MD',
    website: 'https://www.lockheedmartin.com/en-us/who-we-are/lockheed-martin-ventures.html',
  },
  {
    id: 'rtx-ventures',
    name: 'RTX Ventures',
    keyPeople: 'Daniel Reiber',
    type: 'CVC',
    aumDisplay: '$350M',
    aumValue: 350,
    stages: ['Seed', 'Series A', 'Series B'],
    spaceInvestments: 9,
    notablePortfolio: ['Hermeus', 'Second Front Systems', 'Fortem Technologies'],
    thesis: 'Strategic investment arm of RTX (Raytheon Technologies). Invests in emerging defense and space technologies including hypersonics, advanced sensors, and satellite communications.',
    founded: 2019,
    hq: 'Arlington, VA',
    website: 'https://www.rtx.com/our-company/rtx-ventures',
  },
  {
    id: 'spacefund',
    name: 'SpaceFund (formerly Space Angels)',
    keyPeople: 'Meagan Crawford, Ryan Dunn',
    type: 'Angel',
    aumDisplay: '$50M',
    aumValue: 50,
    stages: ['Seed', 'Series A'],
    spaceInvestments: 35,
    notablePortfolio: ['Relativity Space', 'Rocket Lab', 'Planet Labs', 'Astrobotic', 'Momentus'],
    thesis: 'Pioneer angel network turned VC focused exclusively on the space industry. Maintains the Space Investment Quarterly report and provides retail investor access to space deals.',
    founded: 2007,
    hq: 'Houston, TX',
    website: 'https://spacefund.com',
  },
  {
    id: 'promus-ventures',
    name: 'Promus Ventures',
    keyPeople: 'Steve Jurvetson',
    type: 'VC',
    aumDisplay: '$200M',
    aumValue: 200,
    stages: ['Seed', 'Series A'],
    spaceInvestments: 10,
    notablePortfolio: ['SpaceX', 'Astra', 'Relativity Space', 'Planet Labs', 'Momentus'],
    thesis: 'Founded by legendary space investor Steve Jurvetson. Focuses on exponential technologies including rocket propulsion, satellite constellations, and space manufacturing.',
    founded: 2017,
    hq: 'Menlo Park, CA',
    website: 'https://www.promusventures.com',
  },
  {
    id: 'type-one',
    name: 'Type One Ventures',
    keyPeople: 'Will Robbins',
    type: 'VC',
    aumDisplay: '$75M',
    aumValue: 75,
    stages: ['Seed', 'Series A'],
    spaceInvestments: 12,
    notablePortfolio: ['K2 Space', 'Inversion Space', 'Turion Space', 'Starfish Space'],
    thesis: 'Early-stage fund dedicated to the space economy. Believes the next generation of space companies will be built by software-native founders applying modern engineering practices.',
    founded: 2021,
    hq: 'Los Angeles, CA',
    website: 'https://typeoneventures.com',
  },
  {
    id: 'starburst',
    name: 'Starburst Aerospace',
    keyPeople: 'Francois Chopard, Van Espahbodi',
    type: 'Accelerator',
    aumDisplay: '$250M',
    aumValue: 250,
    stages: ['Seed', 'Series A'],
    spaceInvestments: 30,
    notablePortfolio: ['Momentus', 'Cognitive Space', 'Privateer', 'Turion Space', 'Slingshot Aerospace'],
    thesis: 'Global aerospace accelerator and venture fund connecting startups with defense and commercial partners. Runs accelerator programs with USAF, NATO, and major primes.',
    founded: 2012,
    hq: 'Los Angeles, CA',
    website: 'https://starburst.aero',
  },
  {
    id: 'techstars-allied',
    name: 'Techstars Allied Space Accelerator',
    keyPeople: 'David Brown, Maarten Wetselaar',
    type: 'Accelerator',
    aumDisplay: '$30M',
    aumValue: 30,
    stages: ['Seed'],
    spaceInvestments: 40,
    notablePortfolio: ['Orbit Fab', 'Atlas Space Operations', 'Saber Astronautics', 'Scout'],
    thesis: 'Accelerator program backed by the U.S. Space Force, Lockheed Martin, and other partners. Provides $120K in funding plus mentorship for early-stage space startups per cohort.',
    founded: 2019,
    hq: 'Los Angeles, CA',
    website: 'https://www.techstars.com/accelerators/allied-space',
  },
  {
    id: 'draper-associates',
    name: 'Draper Associates',
    keyPeople: 'Tim Draper',
    type: 'VC',
    aumDisplay: '$2B',
    aumValue: 2000,
    stages: ['Seed', 'Series A'],
    spaceInvestments: 6,
    notablePortfolio: ['SpaceX', 'Planet Labs', 'Tyvak Nano-Satellite Systems'],
    thesis: 'Legendary Silicon Valley VC with early conviction in commercial space. Focuses on founders building transformative companies that can reshape entire industries.',
    founded: 1985,
    hq: 'San Mateo, CA',
    website: 'https://draper.vc',
  },
  {
    id: 'first-round',
    name: 'First Round Capital',
    keyPeople: 'Josh Kopelman, Howard Morgan',
    type: 'VC',
    aumDisplay: '$3B',
    aumValue: 3000,
    stages: ['Seed'],
    spaceInvestments: 3,
    notablePortfolio: ['Planet Labs', 'Orbital Insight'],
    thesis: 'Seed-stage VC that backed Planet Labs from its earliest days. Invests in founders reimagining industries with data-centric and platform approaches.',
    founded: 2004,
    hq: 'Philadelphia, PA',
    website: 'https://firstround.com',
  },
];

// ── Filter / Sort Options ──────────────────────────────────────────────────────

const STAGE_OPTIONS: { value: StageTag | ''; label: string }[] = [
  { value: '', label: 'All Stages' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Growth', label: 'Growth' },
  { value: 'Late Stage', label: 'Late Stage' },
];

const TYPE_OPTIONS: { value: InvestorType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'VC', label: 'Venture Capital' },
  { value: 'CVC', label: 'Corporate VC' },
  { value: 'Government', label: 'Government' },
  { value: 'Angel', label: 'Angel Network' },
  { value: 'Accelerator', label: 'Accelerator' },
  { value: 'PE', label: 'Private Equity / Institutional' },
];

type SortKey = 'aum' | 'portfolio' | 'name';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'portfolio', label: 'Portfolio Count' },
  { value: 'aum', label: 'AUM / Fund Size' },
  { value: 'name', label: 'Name (A-Z)' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function typeColor(type: InvestorType): string {
  switch (type) {
    case 'VC': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    case 'CVC': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'Government': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'Angel': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'Accelerator': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    case 'PE': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

function stageColor(stage: StageTag): string {
  switch (stage) {
    case 'Seed': return 'bg-green-500/15 text-green-300';
    case 'Series A': return 'bg-blue-500/15 text-blue-300';
    case 'Series B': return 'bg-indigo-500/15 text-indigo-300';
    case 'Growth': return 'bg-purple-500/15 text-purple-300';
    case 'Late Stage': return 'bg-amber-500/15 text-amber-300';
    default: return 'bg-slate-500/15 text-slate-300';
  }
}

// ── Market Stats ───────────────────────────────────────────────────────────────

const MARKET_STATS = {
  totalDeployed2024: '$12.1B',
  totalDeployed2023: '$8.9B',
  growthRate: '+36%',
  avgSeedDeal: '$5.2M',
  avgSeriesA: '$22M',
  avgSeriesB: '$58M',
  totalInvestors: INVESTORS.length,
  totalPortfolio: INVESTORS.reduce((s, i) => s + i.spaceInvestments, 0),
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function SpaceInvestorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<StageTag | ''>('');
  const [typeFilter, setTypeFilter] = useState<InvestorType | ''>('');
  const [sortBy, setSortBy] = useState<SortKey>('portfolio');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...INVESTORS];

    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.name.toLowerCase().includes(q) ||
          inv.keyPeople.toLowerCase().includes(q) ||
          inv.notablePortfolio.some((p) => p.toLowerCase().includes(q)) ||
          inv.thesis.toLowerCase().includes(q)
      );
    }

    // stage filter
    if (stageFilter) {
      list = list.filter((inv) => inv.stages.includes(stageFilter));
    }

    // type filter
    if (typeFilter) {
      list = list.filter((inv) => inv.type === typeFilter);
    }

    // sort
    switch (sortBy) {
      case 'aum':
        list.sort((a, b) => b.aumValue - a.aumValue);
        break;
      case 'portfolio':
        list.sort((a, b) => b.spaceInvestments - a.spaceInvestments);
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [searchQuery, stageFilter, typeFilter, sortBy]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: 'Space Investors' }]} />

        <AnimatedPageHeader
          title="Space Venture Capital & Investors"
          subtitle="Explore the leading venture capital firms, corporate investors, and angel networks funding the next generation of space companies."
          accentColor="purple"
        />

        {/* ── Market Stats ─────────────────────────────────────────────── */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                Space VC Deployed (2024)
              </p>
              <p className="text-2xl md:text-3xl font-bold text-emerald-400">
                {MARKET_STATS.totalDeployed2024}
              </p>
              <p className="text-xs text-emerald-400/70 mt-1">
                {MARKET_STATS.growthRate} YoY
              </p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                Investors Tracked
              </p>
              <p className="text-2xl md:text-3xl font-bold text-cyan-400">
                {MARKET_STATS.totalInvestors}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                VC, CVC, Gov, Angel
              </p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                Avg Seed Round
              </p>
              <p className="text-2xl md:text-3xl font-bold text-purple-400">
                {MARKET_STATS.avgSeedDeal}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Series A: {MARKET_STATS.avgSeriesA}
              </p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                Total Space Investments
              </p>
              <p className="text-2xl md:text-3xl font-bold text-amber-400">
                {MARKET_STATS.totalPortfolio}+
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Across all tracked funds
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Deal Size Trends ─────────────────────────────────────────── */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Average Deal Size Trends (Space Sector)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 pr-4 text-slate-400 font-medium">Stage</th>
                    <th className="text-right py-2 px-4 text-slate-400 font-medium">2021</th>
                    <th className="text-right py-2 px-4 text-slate-400 font-medium">2022</th>
                    <th className="text-right py-2 px-4 text-slate-400 font-medium">2023</th>
                    <th className="text-right py-2 px-4 text-slate-400 font-medium">2024</th>
                    <th className="text-right py-2 pl-4 text-slate-400 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 pr-4 font-medium">Seed</td>
                    <td className="text-right py-2.5 px-4">$3.1M</td>
                    <td className="text-right py-2.5 px-4">$3.8M</td>
                    <td className="text-right py-2.5 px-4">$4.5M</td>
                    <td className="text-right py-2.5 px-4 text-emerald-400 font-medium">$5.2M</td>
                    <td className="text-right py-2.5 pl-4 text-emerald-400">+68%</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 pr-4 font-medium">Series A</td>
                    <td className="text-right py-2.5 px-4">$15M</td>
                    <td className="text-right py-2.5 px-4">$18M</td>
                    <td className="text-right py-2.5 px-4">$20M</td>
                    <td className="text-right py-2.5 px-4 text-emerald-400 font-medium">$22M</td>
                    <td className="text-right py-2.5 pl-4 text-emerald-400">+47%</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 pr-4 font-medium">Series B</td>
                    <td className="text-right py-2.5 px-4">$40M</td>
                    <td className="text-right py-2.5 px-4">$48M</td>
                    <td className="text-right py-2.5 px-4">$52M</td>
                    <td className="text-right py-2.5 px-4 text-emerald-400 font-medium">$58M</td>
                    <td className="text-right py-2.5 pl-4 text-emerald-400">+45%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Growth / Late</td>
                    <td className="text-right py-2.5 px-4">$150M</td>
                    <td className="text-right py-2.5 px-4">$180M</td>
                    <td className="text-right py-2.5 px-4">$210M</td>
                    <td className="text-right py-2.5 px-4 text-emerald-400 font-medium">$275M</td>
                    <td className="text-right py-2.5 pl-4 text-emerald-400">+83%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <ScrollReveal>
          <div className="card p-4 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 min-w-0">
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
                    type="text"
                    placeholder="Search investors, portfolio companies, key people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Stage */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as StageTag | '')}
                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 min-w-[150px]"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Type */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as InvestorType | '')}
                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 min-w-[150px]"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 min-w-[160px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Sort: {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Active filters count */}
            {(stageFilter || typeFilter || searchQuery) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <span>
                  {filtered.length} of {INVESTORS.length} investors shown
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStageFilter('');
                    setTypeFilter('');
                  }}
                  className="ml-2 text-cyan-400 hover:text-cyan-300 underline transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* ── Investor Grid ────────────────────────────────────────────── */}
        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12"
          staggerDelay={0.06}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((inv) => (
              <StaggerItem key={inv.id}>
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card p-6 flex flex-col h-full"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-100 truncate">
                        {inv.name}
                      </h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {inv.keyPeople}
                      </p>
                    </div>
                    <span
                      className={`ml-3 flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border ${typeColor(inv.type)}`}
                    >
                      {inv.type}
                    </span>
                  </div>

                  {/* Key stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center bg-slate-800/40 rounded-lg py-2 px-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">AUM</p>
                      <p className="text-sm font-semibold text-cyan-400 mt-0.5">
                        {inv.aumDisplay}
                      </p>
                    </div>
                    <div className="text-center bg-slate-800/40 rounded-lg py-2 px-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Space Deals</p>
                      <p className="text-sm font-semibold text-purple-400 mt-0.5">
                        {inv.spaceInvestments}
                      </p>
                    </div>
                    <div className="text-center bg-slate-800/40 rounded-lg py-2 px-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Since</p>
                      <p className="text-sm font-semibold text-slate-300 mt-0.5">
                        {inv.founded}
                      </p>
                    </div>
                  </div>

                  {/* Stage tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {inv.stages.map((stage) => (
                      <span
                        key={stage}
                        className={`px-2 py-0.5 text-xs rounded-full ${stageColor(stage)}`}
                      >
                        {stage}
                      </span>
                    ))}
                  </div>

                  {/* Notable portfolio */}
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">
                      Notable Portfolio
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {inv.notablePortfolio.slice(0, expandedCard === inv.id ? undefined : 4).map((company) => (
                        <span
                          key={company}
                          className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded border border-slate-600/30"
                        >
                          {company}
                        </span>
                      ))}
                      {inv.notablePortfolio.length > 4 && expandedCard !== inv.id && (
                        <span className="px-2 py-0.5 text-xs text-slate-500">
                          +{inv.notablePortfolio.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thesis (collapsible) */}
                  <div className="flex-1">
                    <button
                      onClick={() =>
                        setExpandedCard(expandedCard === inv.id ? null : inv.id)
                      }
                      className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition-colors mb-1.5"
                    >
                      <span>Investment Thesis</span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${expandedCard === inv.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {expandedCard === inv.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {inv.thesis}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/40">
                    <span className="text-xs text-slate-500">
                      {inv.hq}
                    </span>
                    <a
                      href={inv.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                    >
                      Visit Website
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </AnimatePresence>
        </StaggerContainer>

        {/* No results */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-400 text-lg">No investors match your filters.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStageFilter('');
                setTypeFilter('');
              }}
              className="mt-4 px-5 py-2 text-sm text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* ── Investor Type Breakdown ──────────────────────────────────── */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">
              Space Investor Landscape by Type
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(
                INVESTORS.reduce((acc, inv) => {
                  acc[inv.type] = (acc[inv.type] || 0) + 1;
                  return acc;
                }, {} as Record<InvestorType, number>)
              ) as [InvestorType, number][]).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="bg-slate-800/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${typeColor(type)}`}>
                      {type}
                    </span>
                    <span className="text-lg font-bold text-slate-200">{count}</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
                      style={{ width: `${(count / INVESTORS.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    {Math.round((count / INVESTORS.length) * 100)}% of tracked investors
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Annual Space Investment Timeline ─────────────────────────── */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">
              Annual Global Space Venture Capital Investment
            </h2>
            <div className="space-y-3">
              {[
                { year: 2018, amount: 3.2, label: '$3.2B', deals: 120 },
                { year: 2019, amount: 4.5, label: '$4.5B', deals: 148 },
                { year: 2020, amount: 5.1, label: '$5.1B', deals: 137 },
                { year: 2021, amount: 14.5, label: '$14.5B', deals: 245 },
                { year: 2022, amount: 7.8, label: '$7.8B', deals: 178 },
                { year: 2023, amount: 8.9, label: '$8.9B', deals: 195 },
                { year: 2024, amount: 12.1, label: '$12.1B', deals: 228 },
              ].map((yr) => (
                <div key={yr.year} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-400 w-10 flex-shrink-0">
                    {yr.year}
                  </span>
                  <div className="flex-1 bg-slate-800/40 rounded-full h-6 relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(yr.amount / 15) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className={`h-6 rounded-full ${
                        yr.year === 2024
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                          : yr.year === 2021
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600'
                      }`}
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-xs font-medium text-white">
                      {yr.label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 w-16 flex-shrink-0 text-right">
                    {yr.deals} deals
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 italic">
              Source: Aggregated from Space Capital, Seraphim Space, BryceTech quarterly reports. 2021 peak driven by SPAC activity.
            </p>
          </div>
        </ScrollReveal>

        {/* ── How to Use This Directory ────────────────────────────────── */}
        <ScrollReveal>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              How to Use This Directory
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">For Founders</h3>
                <p className="leading-relaxed">
                  Identify investors whose stage focus and thesis align with your company. Check their portfolio for potential conflicts or synergies. Warm introductions through shared portfolio companies yield the highest response rates.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-purple-400 mb-2">For Investors</h3>
                <p className="leading-relaxed">
                  Track the competitive landscape and co-investment opportunities. Use the deal size trends to calibrate round expectations. Corporate VCs often seek strategic co-investors for follow-on rounds.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-amber-400 mb-2">For Analysts</h3>
                <p className="leading-relaxed">
                  Monitor capital flows across the space economy. The annual investment timeline and deal size data provide benchmarks for market reports and investment memos.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-8 mb-4">
          Data compiled from public filings, press releases, and industry reports. AUM figures are approximate and may reflect total firm assets, not space-specific allocations.
        </p>
      </div>
    </div>
  );
}
