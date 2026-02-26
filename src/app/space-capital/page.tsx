'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';
import { clientLogger } from '@/lib/client-logger';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'overview' | 'investors' | 'startups' | 'matchmaker';

interface Investor {
  id: string;
  name: string;
  type: string;
  description: string;
  investmentThesis: string;
  aum: string;
  checkSizeRange: string;
  stagePreference: string[];
  sectorFocus: string[];
  dealCount: number;
  totalDeployed: string;
  notablePortfolio: string[];
  website: string;
  hqLocation: string;
  foundedYear: number;
}

interface FundingByYear {
  year: number;
  amount: number;
  deals: number;
}

interface StartupCompany {
  slug: string;
  name: string;
  description: string;
  country: string;
  headquarters?: string;
  founded?: number;
  website?: string;
  isPublic: boolean;
  totalFunding?: number;
  lastFundingRound?: string;
  lastFundingAmount?: number;
  lastFundingDate?: string;
  valuation?: number;
  focusAreas: string[];
  keyInvestors?: string[];
  employeeCount?: number;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'investors', label: 'Top Investors', icon: '🏦' },
  { id: 'startups', label: 'Top Startups', icon: '🚀' },
  { id: 'matchmaker', label: 'Matchmaker', icon: '🤝' },
];

const INVESTOR_TYPES = ['All', 'Dedicated Space VC', 'Deep Tech VC', 'Generalist VC', 'Corporate VC', 'Government/Strategic', 'Accelerator', 'Impact VC'];
const STAGE_OPTIONS = ['All', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Late Stage'];

const TYPE_COLORS: Record<string, string> = {
  'Dedicated Space VC': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Deep Tech VC': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Generalist VC': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Corporate VC': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Government/Strategic': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Accelerator': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Impact VC': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const FOCUS_AREA_LABELS: Record<string, string> = {
  launch_provider: 'Launch',
  satellites: 'Satellites',
  earth_observation: 'Earth Observation',
  in_space_services: 'In-Space Services',
  space_infrastructure: 'Space Infrastructure',
  defense: 'Defense',
  propulsion: 'Propulsion',
  debris_removal: 'Debris Removal',
  manufacturing: 'Manufacturing',
  communications: 'Communications',
  analytics: 'Analytics',
  spacecraft: 'Spacecraft',
  space_broadband: 'Broadband',
};

// ────────────────────────────────────────
// Fallback Data
// ────────────────────────────────────────

const FALLBACK_INVESTORS: Investor[] = [
  {
    id: 'space-capital',
    name: 'Space Capital',
    type: 'Dedicated Space VC',
    description: 'The leading dedicated space economy venture fund, investing in the technology layers powering the global space economy across GPS-denied navigation, geospatial analytics, and space infrastructure.',
    investmentThesis: 'Invest across the space economy technology stack including geospatial intelligence, communications, and sensing & networks.',
    aum: '$300M+',
    checkSizeRange: '$2M-$20M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Earth Observation', 'Communications', 'Analytics', 'Navigation'],
    dealCount: 75,
    totalDeployed: '$250M',
    notablePortfolio: ['Hawkeye 360', 'Cognitive Space', 'Slingshot Aerospace', 'Umbra'],
    website: 'https://www.spacecapital.com',
    hqLocation: 'New York, NY',
    foundedYear: 2017,
  },
  {
    id: 'seraphim',
    name: 'Seraphim Space',
    type: 'Dedicated Space VC',
    description: 'The world\'s largest space technology venture fund, listed on the London Stock Exchange. Seraphim invests in companies leveraging space technology to address the world\'s most pressing challenges.',
    investmentThesis: 'Back high-growth space-tech companies across Earth observation, communications, in-orbit economy, and enabling technologies.',
    aum: '$400M+',
    checkSizeRange: '$3M-$30M',
    stagePreference: ['Seed', 'Series A', 'Series B', 'Series C'],
    sectorFocus: ['Earth Observation', 'Satellites', 'Communications', 'In-Space Services'],
    dealCount: 60,
    totalDeployed: '$350M',
    notablePortfolio: ['Arqit Quantum', 'Iceye', 'D-Orbit', 'LeoLabs'],
    website: 'https://www.seraphim.vc',
    hqLocation: 'London, UK',
    foundedYear: 2016,
  },
  {
    id: 'bessemer',
    name: 'Bessemer Venture Partners',
    type: 'Generalist VC',
    description: 'Bessemer has been one of the most active generalist VCs in the space sector, backing early-stage companies across Earth observation, launch, and satellite communications.',
    investmentThesis: 'Back category-defining companies across cloud, consumer, healthcare, and frontier tech including space and geospatial.',
    aum: '$20B+',
    checkSizeRange: '$5M-$50M',
    stagePreference: ['Seed', 'Series A', 'Series B', 'Series C', 'Late Stage'],
    sectorFocus: ['Earth Observation', 'Satellites', 'Launch', 'Analytics'],
    dealCount: 25,
    totalDeployed: '$500M+',
    notablePortfolio: ['Rocket Lab', 'Spire Global', 'Planet Labs', 'Relativity Space'],
    website: 'https://www.bvp.com',
    hqLocation: 'San Francisco, CA',
    foundedYear: 1911,
  },
  {
    id: 'a16z',
    name: 'Andreessen Horowitz (a16z)',
    type: 'Generalist VC',
    description: 'a16z has made significant investments in the space economy, focusing on companies that leverage software and AI to transform space operations and Earth observation analytics.',
    investmentThesis: 'Invest in bold entrepreneurs building the future through software-driven space companies and defense technology.',
    aum: '$35B+',
    checkSizeRange: '$10M-$100M',
    stagePreference: ['Series A', 'Series B', 'Series C', 'Late Stage'],
    sectorFocus: ['Launch', 'Defense', 'Satellites', 'Analytics'],
    dealCount: 18,
    totalDeployed: '$1B+',
    notablePortfolio: ['Relativity Space', 'Hadrian', 'Anduril', 'Skydio'],
    website: 'https://a16z.com',
    hqLocation: 'Menlo Park, CA',
    foundedYear: 2009,
  },
  {
    id: 'khosla',
    name: 'Khosla Ventures',
    type: 'Deep Tech VC',
    description: 'Khosla invests in audacious technologies including space, clean energy, and AI. Known for early bets on deep-tech space companies with transformative potential.',
    investmentThesis: 'Fund bold, early-stage technology companies reimagining industries including space infrastructure and propulsion.',
    aum: '$15B+',
    checkSizeRange: '$1M-$50M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Propulsion', 'Launch', 'Manufacturing', 'Space Infrastructure'],
    dealCount: 12,
    totalDeployed: '$200M+',
    notablePortfolio: ['Momentus', 'Relativity Space', 'Astra Space'],
    website: 'https://www.khoslaventures.com',
    hqLocation: 'Menlo Park, CA',
    foundedYear: 2004,
  },
  {
    id: 'in-q-tel',
    name: 'In-Q-Tel',
    type: 'Government/Strategic',
    description: 'The strategic investment arm of the U.S. intelligence community, In-Q-Tel invests in cutting-edge space technologies that support national security missions including ISR, SIGINT, and space domain awareness.',
    investmentThesis: 'Identify and invest in commercial technologies that serve the intelligence and defense communities.',
    aum: '$1B+ (est.)',
    checkSizeRange: '$500K-$10M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Earth Observation', 'Defense', 'Communications', 'Analytics'],
    dealCount: 40,
    totalDeployed: '$400M+',
    notablePortfolio: ['Planet Labs', 'Capella Space', 'BlackSky', 'HawkEye 360'],
    website: 'https://www.iqt.org',
    hqLocation: 'Arlington, VA',
    foundedYear: 1999,
  },
  {
    id: 'boeing-horizonx',
    name: 'Boeing HorizonX',
    type: 'Corporate VC',
    description: 'Boeing\'s venture capital arm invests in technologies that complement Boeing\'s defense and space portfolio, including autonomous systems, advanced materials, and next-generation satellite technologies.',
    investmentThesis: 'Invest in early-stage companies with technologies aligned to Boeing\'s aerospace and defense roadmap.',
    aum: '$500M (est.)',
    checkSizeRange: '$2M-$15M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Manufacturing', 'Space Infrastructure', 'Satellites', 'Propulsion'],
    dealCount: 30,
    totalDeployed: '$150M+',
    notablePortfolio: ['SparkCognition', 'Matternet', 'Wisk Aero'],
    website: 'https://www.boeing.com/company/key-orgs/horizonx',
    hqLocation: 'Chicago, IL',
    foundedYear: 2017,
  },
  {
    id: 'lm-ventures',
    name: 'Lockheed Martin Ventures',
    type: 'Corporate VC',
    description: 'Lockheed Martin\'s strategic venture arm focuses on early-stage companies developing technologies in autonomy, cybersecurity, robotics, and space systems that support its defense and space businesses.',
    investmentThesis: 'Make strategic investments in emerging technology companies that align with Lockheed Martin\'s innovation priorities.',
    aum: '$200M+',
    checkSizeRange: '$2M-$20M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Defense', 'Space Infrastructure', 'Satellites', 'Propulsion'],
    dealCount: 35,
    totalDeployed: '$200M+',
    notablePortfolio: ['Terran Orbital', 'Rocket Lab', 'Orbit Fab', 'Atomos Space'],
    website: 'https://www.lockheedmartin.com/en-us/who-we-are/lockheed-martin-ventures.html',
    hqLocation: 'Bethesda, MD',
    foundedYear: 2007,
  },
  {
    id: 'lux-capital',
    name: 'Lux Capital',
    type: 'Deep Tech VC',
    description: 'Lux Capital is a leading deep tech venture firm investing in companies at the intersection of science and technology, with notable space investments in propulsion, manufacturing, and Earth observation.',
    investmentThesis: 'Back scientists and engineers building transformative companies in deep tech including space, defense, and advanced materials.',
    aum: '$4B+',
    checkSizeRange: '$5M-$40M',
    stagePreference: ['Seed', 'Series A', 'Series B', 'Series C'],
    sectorFocus: ['Propulsion', 'Manufacturing', 'Earth Observation', 'Defense'],
    dealCount: 20,
    totalDeployed: '$350M+',
    notablePortfolio: ['Hadrian', 'Planet Labs', 'Anduril', 'Saildrone'],
    website: 'https://luxcapital.com',
    hqLocation: 'New York, NY',
    foundedYear: 2000,
  },
  {
    id: 'founders-fund',
    name: 'Founders Fund',
    type: 'Generalist VC',
    description: 'Peter Thiel\'s Founders Fund is known for its bold bets on transformative technologies. Its space portfolio includes SpaceX, one of the most valuable private companies in history.',
    investmentThesis: 'Invest in revolutionary technology companies that others overlook, including space transportation and defense.',
    aum: '$11B+',
    checkSizeRange: '$5M-$100M',
    stagePreference: ['Series A', 'Series B', 'Series C', 'Late Stage'],
    sectorFocus: ['Launch', 'Defense', 'Space Infrastructure', 'Propulsion'],
    dealCount: 10,
    totalDeployed: '$1.5B+',
    notablePortfolio: ['SpaceX', 'Anduril', 'Varda Space Industries'],
    website: 'https://foundersfund.com',
    hqLocation: 'San Francisco, CA',
    foundedYear: 2005,
  },
  {
    id: 'type-one',
    name: 'Type One Ventures',
    type: 'Dedicated Space VC',
    description: 'Type One is a dedicated space VC fund investing exclusively in space infrastructure, Earth observation, and the broader space economy, with deep operator expertise.',
    investmentThesis: 'Invest in the infrastructure layer of the space economy with a focus on defensible technology moats.',
    aum: '$100M+',
    checkSizeRange: '$1M-$8M',
    stagePreference: ['Pre-seed', 'Seed', 'Series A'],
    sectorFocus: ['Space Infrastructure', 'Earth Observation', 'Communications', 'Debris Removal'],
    dealCount: 30,
    totalDeployed: '$80M+',
    notablePortfolio: ['Epsilon3', 'Muon Space', 'Privateer Space', 'Astroforge'],
    website: 'https://www.typeoneventures.com',
    hqLocation: 'Washington, DC',
    foundedYear: 2021,
  },
  {
    id: 'airbus-ventures',
    name: 'Airbus Ventures',
    type: 'Corporate VC',
    description: 'Airbus Ventures invests in early-stage companies that transform aerospace, with a strong portfolio in autonomy, connectivity, and space technologies across the U.S. and Europe.',
    investmentThesis: 'Back visionary entrepreneurs reimagining how we connect, protect, and explore through aerospace technology.',
    aum: '$400M+',
    checkSizeRange: '$2M-$15M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Satellites', 'Communications', 'Earth Observation', 'Manufacturing'],
    dealCount: 45,
    totalDeployed: '$300M+',
    notablePortfolio: ['Archer Aviation', 'Loft Orbital', 'Mynaric', 'Phase Four'],
    website: 'https://airbusventures.vc',
    hqLocation: 'Menlo Park, CA',
    foundedYear: 2015,
  },
  {
    id: 'starburst',
    name: 'Starburst Aerospace',
    type: 'Accelerator',
    description: 'The world\'s leading aerospace accelerator and venture fund, Starburst connects startups with major aerospace and defense corporations through its accelerator program and strategic venture fund.',
    investmentThesis: 'Accelerate and invest in early-stage aerospace startups that can partner with global aerospace leaders.',
    aum: '$200M+',
    checkSizeRange: '$500K-$5M',
    stagePreference: ['Pre-seed', 'Seed', 'Series A'],
    sectorFocus: ['Launch', 'Satellites', 'Defense', 'Manufacturing', 'Space Infrastructure'],
    dealCount: 55,
    totalDeployed: '$100M+',
    notablePortfolio: ['Turion Space', 'True Anomaly', 'Impulse Space', 'Slingshot Aerospace'],
    website: 'https://starburst.aero',
    hqLocation: 'Los Angeles, CA',
    foundedYear: 2012,
  },
  {
    id: 'techstars-allied',
    name: 'Techstars Allied Space Accelerator',
    type: 'Accelerator',
    description: 'Techstars, in partnership with the U.S. Air Force and Space Force, runs the Allied Space Accelerator to support startups developing dual-use space technologies.',
    investmentThesis: 'Accelerate startups building space technologies relevant to U.S. and allied defense and intelligence missions.',
    aum: '$50M+',
    checkSizeRange: '$120K-$2M',
    stagePreference: ['Pre-seed', 'Seed'],
    sectorFocus: ['Defense', 'Space Infrastructure', 'Communications', 'Analytics'],
    dealCount: 40,
    totalDeployed: '$30M+',
    notablePortfolio: ['Slingshot Aerospace', 'Kayhan Space', 'Scout Space'],
    website: 'https://www.techstars.com',
    hqLocation: 'Boulder, CO',
    foundedYear: 2006,
  },
  {
    id: 'promus-ventures',
    name: 'Promus Ventures',
    type: 'Dedicated Space VC',
    description: 'Promus is a dedicated space economy venture fund run by former NASA and aerospace professionals investing in next-generation space infrastructure and services.',
    investmentThesis: 'Invest in the emerging in-space economy including propulsion, debris removal, on-orbit servicing, and space logistics.',
    aum: '$60M+',
    checkSizeRange: '$1M-$5M',
    stagePreference: ['Pre-seed', 'Seed', 'Series A'],
    sectorFocus: ['Propulsion', 'Debris Removal', 'Space Infrastructure', 'In-Space Services'],
    dealCount: 20,
    totalDeployed: '$45M+',
    notablePortfolio: ['Orbit Fab', 'Astroscale', 'CisLunar Industries', 'Starfish Space'],
    website: 'https://www.promusventures.com',
    hqLocation: 'Washington, DC',
    foundedYear: 2019,
  },
  {
    id: 'rtx-ventures',
    name: 'RTX Ventures',
    type: 'Corporate VC',
    description: 'RTX Ventures (formerly Raytheon Technologies Ventures) invests in dual-use technologies across sensors, communications, and space systems that complement RTX\'s defense and aerospace businesses.',
    investmentThesis: 'Invest in early-stage companies developing breakthrough technologies in advanced sensing, AI, and space systems.',
    aum: '$300M+',
    checkSizeRange: '$2M-$10M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Defense', 'Communications', 'Satellites', 'Analytics'],
    dealCount: 25,
    totalDeployed: '$150M+',
    notablePortfolio: ['Ursa Major', 'BlackSky', 'Shield AI'],
    website: 'https://www.rtx.com',
    hqLocation: 'Arlington, VA',
    foundedYear: 2019,
  },
  {
    id: 'playground-global',
    name: 'Playground Global',
    type: 'Deep Tech VC',
    description: 'Playground Global invests in applied science and engineering companies, including space technology firms working on novel propulsion, advanced manufacturing, and satellite systems.',
    investmentThesis: 'Back inventors and engineers building transformative products at the intersection of physical and digital worlds.',
    aum: '$800M+',
    checkSizeRange: '$2M-$20M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Manufacturing', 'Propulsion', 'Spacecraft', 'Space Infrastructure'],
    dealCount: 10,
    totalDeployed: '$150M+',
    notablePortfolio: ['Relativity Space', 'Hadrian', 'Impulse Space'],
    website: 'https://playground.global',
    hqLocation: 'Palo Alto, CA',
    foundedYear: 2015,
  },
  {
    id: 'primo-space',
    name: 'Primo Space Fund',
    type: 'Dedicated Space VC',
    description: 'Primo Space is a European-based dedicated space venture fund investing in early-stage space startups across Earth observation, in-orbit services, and space data analytics.',
    investmentThesis: 'Back European and global space startups developing technologies for the downstream and upstream space economy.',
    aum: '$70M+',
    checkSizeRange: '$500K-$5M',
    stagePreference: ['Pre-seed', 'Seed', 'Series A'],
    sectorFocus: ['Earth Observation', 'In-Space Services', 'Satellites', 'Analytics'],
    dealCount: 25,
    totalDeployed: '$50M+',
    notablePortfolio: ['D-Orbit', 'Leaf Space', 'Arkadia Space'],
    website: 'https://www.primospace.fund',
    hqLocation: 'Rome, Italy',
    foundedYear: 2019,
  },
  {
    id: 'congruent',
    name: 'Congruent Ventures',
    type: 'Impact VC',
    description: 'Congruent invests in climate and sustainability-focused companies including space-enabled environmental monitoring, methane detection, and Earth observation analytics.',
    investmentThesis: 'Invest in companies using technology to address climate change and environmental sustainability, including space-based solutions.',
    aum: '$400M+',
    checkSizeRange: '$2M-$15M',
    stagePreference: ['Seed', 'Series A', 'Series B'],
    sectorFocus: ['Earth Observation', 'Analytics', 'Communications'],
    dealCount: 12,
    totalDeployed: '$100M+',
    notablePortfolio: ['Muon Space', 'GHGSat', 'Pachama'],
    website: 'https://congruentvc.com',
    hqLocation: 'San Francisco, CA',
    foundedYear: 2017,
  },
];

const FALLBACK_FUNDING_BY_YEAR: FundingByYear[] = [
  { year: 2015, amount: 2.3, deals: 120 },
  { year: 2016, amount: 2.8, deals: 135 },
  { year: 2017, amount: 3.9, deals: 163 },
  { year: 2018, amount: 5.8, deals: 212 },
  { year: 2019, amount: 5.7, deals: 237 },
  { year: 2020, amount: 8.9, deals: 272 },
  { year: 2021, amount: 15.4, deals: 382 },
  { year: 2022, amount: 10.3, deals: 310 },
  { year: 2023, amount: 8.1, deals: 268 },
  { year: 2024, amount: 9.4, deals: 295 },
  { year: 2025, amount: 10.8, deals: 318 },
];

// ────────────────────────────────────────
// Helper
// ────────────────────────────────────────

function formatFunding(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

// ────────────────────────────────────────
// Tab 1: Overview
// ────────────────────────────────────────

function OverviewTab({ investors, fundingByYear, startups }: {
  investors: Investor[];
  fundingByYear: FundingByYear[];
  startups: StartupCompany[];
}) {
  const totalDeals = fundingByYear.reduce((sum, y) => sum + y.deals, 0);
  const totalFunding = fundingByYear.reduce((sum, y) => sum + y.amount, 0);
  const maxAmount = Math.max(...fundingByYear.map(f => f.amount), 1);

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              ${totalFunding.toFixed(0)}B+
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Total Space VC (2019-2025)</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-cyan-400">{investors.length}+</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Active Investors</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-purple-400">{startups.length}</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Top Funded Startups</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-amber-400">{totalDeals}+</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Total Deals</div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Funding Trends */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">📈</span>
          Space Startup Funding by Year
        </h3>
        <p className="text-slate-400 text-sm mb-6">Global venture investment in space startups (billions USD)</p>
        <div className="flex items-end gap-3 h-48">
          {fundingByYear.map((item) => {
            const heightPct = (item.amount / maxAmount) * 100;
            const isMax = item.amount === maxAmount;
            return (
              <div key={item.year} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-medium text-slate-400">${item.amount}B</div>
                <div className="w-full flex justify-center">
                  <div
                    className={`w-full max-w-[52px] rounded-t-md transition-all duration-500 ${
                      isMax
                        ? 'bg-gradient-to-t from-green-600 to-green-400'
                        : 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                    }`}
                    style={{ height: `${heightPct * 1.6}px` }}
                  />
                </div>
                <div className="text-xs text-slate-400 font-medium">{item.year}</div>
                <div className="text-xs text-slate-500">{item.deals} deals</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">Peak: $15.4B in 2021 driven by SPAC mergers and mega-rounds</span>
          <span className="text-xs text-slate-400">Source: Space Capital, Bryce Tech</span>
        </div>
      </div>

      {/* Top 20 Investors + Top 20 Startups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top {Math.min(investors.length, 20)} Investors</h3>
          <div className="space-y-3">
            {investors.slice(0, 20).map((inv, i) => (
              <div key={inv.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-500 w-6 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{inv.name}</div>
                  <div className="text-slate-400 text-xs">{inv.type} &middot; {inv.aum} AUM</div>
                </div>
                <span className="text-cyan-400 text-sm font-mono">{inv.dealCount}+ deals</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top 20 Funded Startups</h3>
          <div className="space-y-3">
            {startups.slice(0, 20).map((s, i) => (
              <div key={s.slug || s.name} className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-500 w-6 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{s.name}</div>
                  <div className="text-slate-400 text-xs">
                    {s.headquarters || s.country}
                    {s.lastFundingRound ? ` \u00B7 ${s.lastFundingRound}` : ''}
                  </div>
                </div>
                <span className="text-green-400 text-sm font-mono font-bold">
                  {s.totalFunding ? formatFunding(s.totalFunding) : '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 2: Top Investors
// ────────────────────────────────────────

function InvestorsTab({ investors }: { investors: Investor[] }) {
  const [typeFilter, setTypeFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  const filtered = useMemo(() => {
    let result = [...investors];
    if (typeFilter !== 'All') result = result.filter(i => i.type === typeFilter);
    if (stageFilter !== 'All') result = result.filter(i => i.stagePreference.some(s => s.toLowerCase().includes(stageFilter.toLowerCase())));
    return result;
  }, [investors, typeFilter, stageFilter]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-slate-400 text-sm mb-1">Investor Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          >
            {INVESTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-1">Stage Focus</label>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          >
            {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <span className="text-slate-500 text-sm pb-2">Showing {filtered.length} of {investors.length} investors</span>
      </div>

      {/* Investor Cards */}
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((inv, idx) => (
          <StaggerItem key={inv.id}>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-slate-500">#{idx + 1}</span>
                    <h4 className="text-white font-semibold">{inv.name}</h4>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[inv.type] || 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                    {inv.type}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-cyan-400 font-mono font-bold">{inv.aum}</div>
                  <div className="text-slate-500 text-xs">AUM</div>
                </div>
              </div>

              <p className="text-slate-400 text-sm mb-3 line-clamp-2">{inv.investmentThesis}</p>

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">Deals</span>
                  <div className="text-white font-medium">{inv.dealCount}+</div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Check Size</span>
                  <div className="text-white font-medium text-xs">{inv.checkSizeRange}</div>
                </div>
              </div>

              {/* Stage pills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {inv.stagePreference.map(s => (
                  <span key={s} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>

              {/* Sector pills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {inv.sectorFocus.map(s => (
                  <span key={s} className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>

              {/* Notable Portfolio */}
              <div className="border-t border-slate-700/50 pt-3">
                <span className="text-slate-500 text-xs">Notable Portfolio: </span>
                <span className="text-slate-300 text-xs">{inv.notablePortfolio.join(', ')}</span>
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>{inv.hqLocation}</span>
                <span>Est. {inv.foundedYear}</span>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 3: Top Startups
// ────────────────────────────────────────

function StartupsTab({ startups }: { startups: StartupCompany[] }) {
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    startups.forEach(s => s.focusAreas.forEach(fa => {
      const label = FOCUS_AREA_LABELS[fa] || fa;
      cats.add(label);
    }));
    return ['All', ...Array.from(cats).sort()];
  }, [startups]);

  const filtered = useMemo(() => {
    if (categoryFilter === 'All') return startups;
    return startups.filter(s =>
      s.focusAreas.some(fa => (FOCUS_AREA_LABELS[fa] || fa) === categoryFilter)
    );
  }, [startups, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-slate-400 text-sm">Category:</span>
        {categories.slice(0, 10).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              categoryFilter === cat
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <span className="text-slate-500 text-sm">Showing {filtered.length} private startups sorted by total funding</span>

      {/* Startup Cards */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, idx) => (
          <StaggerItem key={s.slug}>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 hover:border-green-500/30 transition-colors h-full flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>
                  <h4 className="text-white font-semibold text-sm">{s.name}</h4>
                </div>
                <div className="text-green-400 font-mono font-bold text-sm">
                  {s.totalFunding ? formatFunding(s.totalFunding) : '--'}
                </div>
              </div>

              <p className="text-slate-400 text-xs mb-3 line-clamp-2 flex-1">{s.description}</p>

              <div className="space-y-2 text-xs">
                {s.lastFundingRound && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Round</span>
                    <span className="text-white">{s.lastFundingRound}{s.lastFundingAmount ? ` ($${s.lastFundingAmount}M)` : ''}</span>
                  </div>
                )}
                {s.valuation && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valuation</span>
                    <span className="text-purple-400">${s.valuation}B</span>
                  </div>
                )}
                {s.headquarters && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">HQ</span>
                    <span className="text-slate-300">{s.headquarters}</span>
                  </div>
                )}
              </div>

              {/* Focus areas */}
              <div className="flex flex-wrap gap-1 mt-3">
                {s.focusAreas.map(fa => (
                  <span key={fa} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
                    {FOCUS_AREA_LABELS[fa] || fa}
                  </span>
                ))}
              </div>

              {/* Key investors */}
              {s.keyInvestors && s.keyInvestors.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-700/30">
                  <span className="text-slate-500 text-xs">Key Investors: </span>
                  <span className="text-cyan-400 text-xs">{s.keyInvestors.join(', ')}</span>
                </div>
              )}
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 4: Matchmaker
// ────────────────────────────────────────

const MATRIX_STAGES = ['Pre-seed/Seed', 'Series A', 'Series B', 'Series C+'];
const MATRIX_SECTORS = ['Launch', 'Earth Observation', 'Communications', 'Defense', 'In-Space Services', 'Satellites'];

function MatchmakerTab({ investors, startups }: { investors: Investor[]; startups: StartupCompany[] }) {
  const [mode, setMode] = useState<'startup' | 'investor'>('startup');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState('');

  const sectorOptions = useMemo(() => {
    const sectors = new Set<string>();
    investors.forEach(i => i.sectorFocus.forEach(s => sectors.add(s)));
    return Array.from(sectors).sort();
  }, [investors]);

  const stageOptions = ['Seed', 'Series A', 'Series B', 'Series C', 'Late Stage'];

  // Startup Mode: find matching investors for a given category + stage
  const matchingInvestors = useMemo(() => {
    if (mode !== 'startup' || (!selectedCategory && !selectedStage)) return [];
    return investors.filter(inv => {
      const categoryMatch = !selectedCategory || inv.sectorFocus.some(s =>
        s.toLowerCase().includes(selectedCategory.toLowerCase())
      );
      const stageMatch = !selectedStage || inv.stagePreference.some(s =>
        s.toLowerCase().includes(selectedStage.toLowerCase())
      );
      return categoryMatch && stageMatch;
    }).sort((a, b) => b.dealCount - a.dealCount);
  }, [mode, selectedCategory, selectedStage, investors]);

  // Investor Mode: find startups matching an investor's thesis
  const selectedInvestorData = investors.find(i => i.id === selectedInvestor);
  const matchingStartups = useMemo(() => {
    if (mode !== 'investor' || !selectedInvestorData) return [];
    return startups.filter(s => {
      return s.focusAreas.some(fa => {
        const label = (FOCUS_AREA_LABELS[fa] || fa).toLowerCase();
        return selectedInvestorData.sectorFocus.some(sf => sf.toLowerCase().includes(label) || label.includes(sf.toLowerCase()));
      });
    });
  }, [mode, selectedInvestorData, startups]);

  // Matrix data for the visual grid
  const matrixData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    MATRIX_STAGES.forEach(stage => {
      data[stage] = {};
      MATRIX_SECTORS.forEach(sector => {
        data[stage][sector] = investors.filter(inv =>
          inv.stagePreference.some(s => s.toLowerCase().includes(stage.split('/')[0].toLowerCase().trim())) &&
          inv.sectorFocus.some(sf => sf.toLowerCase().includes(sector.toLowerCase()))
        ).length;
      });
    });
    return data;
  }, [investors]);

  const maxDensity = Math.max(1, ...Object.values(matrixData).flatMap(row => Object.values(row)));

  return (
    <div className="space-y-8">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('startup'); setSelectedInvestor(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'startup'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          I&apos;m a Startup
        </button>
        <button
          onClick={() => { setMode('investor'); setSelectedCategory(''); setSelectedStage(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'investor'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          I&apos;m an Investor
        </button>
      </div>

      {/* Startup Mode */}
      {mode === 'startup' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-white font-semibold mb-4">Find investors for your space startup</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Your Sector</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                >
                  <option value="">Select sector...</option>
                  {sectorOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Your Stage</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                >
                  <option value="">Select stage...</option>
                  {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {matchingInvestors.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-4">
                {matchingInvestors.length} matching investor{matchingInvestors.length !== 1 ? 's' : ''} found
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchingInvestors.map(inv => (
                  <div key={inv.id} className="bg-slate-800/50 rounded-xl border border-green-500/30 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-semibold">{inv.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[inv.type] || 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                        {inv.type}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{inv.investmentThesis}</p>
                    <div className="flex gap-4 text-xs text-slate-300">
                      <span>Check: {inv.checkSizeRange}</span>
                      <span>{inv.dealCount}+ deals</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(selectedCategory || selectedStage) && matchingInvestors.length === 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <p className="text-slate-400">No investors match your criteria. Try broadening your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Investor Mode */}
      {mode === 'investor' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-white font-semibold mb-4">Find startups matching your thesis</h3>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Select Investor</label>
              <select
                value={selectedInvestor}
                onChange={(e) => setSelectedInvestor(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none w-full max-w-md"
              >
                <option value="">Choose an investor...</option>
                {investors.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
              </select>
            </div>
          </div>

          {selectedInvestorData && (
            <div className="bg-slate-800/50 rounded-xl border border-cyan-500/30 p-5">
              <h4 className="text-white font-semibold mb-1">{selectedInvestorData.name}</h4>
              <p className="text-slate-400 text-sm mb-3">{selectedInvestorData.investmentThesis}</p>
              <div className="flex flex-wrap gap-1">
                {selectedInvestorData.sectorFocus.map(s => (
                  <span key={s} className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}

          {matchingStartups.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-4">{matchingStartups.length} matching startups</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingStartups.map(s => (
                  <div key={s.slug} className="bg-slate-800/50 rounded-xl border border-green-500/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold text-sm">{s.name}</h4>
                      <span className="text-green-400 font-mono text-sm">
                        {s.totalFunding ? formatFunding(s.totalFunding) : '--'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2 line-clamp-2">{s.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {s.focusAreas.map(fa => (
                        <span key={fa} className="text-xs bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
                          {FOCUS_AREA_LABELS[fa] || fa}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Investment Activity Matrix */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">📊</span>
          Investor Activity Matrix
        </h3>
        <p className="text-slate-400 text-sm mb-6">Number of active investors by stage and sector</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs"></th>
                {MATRIX_SECTORS.map(sector => (
                  <th key={sector} className="py-2 px-3 text-slate-400 font-medium text-xs text-center">{sector}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_STAGES.map(stage => (
                <tr key={stage}>
                  <td className="py-2 px-3 text-slate-300 font-medium text-xs whitespace-nowrap">{stage}</td>
                  {MATRIX_SECTORS.map(sector => {
                    const count = matrixData[stage]?.[sector] || 0;
                    const intensity = count / maxDensity;
                    return (
                      <td key={sector} className="py-2 px-3 text-center">
                        <div
                          className="mx-auto w-12 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: count > 0 ? `rgba(6, 182, 212, ${0.1 + intensity * 0.5})` : 'rgba(51, 65, 85, 0.3)',
                            color: count > 0 ? '#06b6d4' : '#64748b',
                          }}
                        >
                          {count}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }} /> Low activity
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(6, 182, 212, 0.35)' }} /> Medium
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(6, 182, 212, 0.6)' }} /> High activity
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Inner component (needs useSearchParams)
// ────────────────────────────────────────

function SpaceCapitalInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'overview');

  const [investors, setInvestors] = useState<Investor[]>(FALLBACK_INVESTORS);
  const [fundingByYear, setFundingByYear] = useState<FundingByYear[]>(FALLBACK_FUNDING_BY_YEAR);
  const [startups, setStartups] = useState<StartupCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const url = tab === 'overview' ? '/space-capital' : `/space-capital?tab=${tab}`;
    router.replace(url, { scroll: false });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [investorsRes, fundingRes, startupsRes] = await Promise.all([
        fetch('/api/content/space-capital?section=investors'),
        fetch('/api/content/space-capital?section=funding-by-year'),
        fetch('/api/companies?isPublic=false&sort=totalFunding&minFunding=1&limit=50'),
      ]);

      const investorsJson = await investorsRes.json();
      const fundingJson = await fundingRes.json();
      const startupsJson = await startupsRes.json();

      setInvestors(investorsJson.data?.length > 5 ? investorsJson.data : FALLBACK_INVESTORS);
      setFundingByYear(fundingJson.data?.length > 3 ? fundingJson.data : FALLBACK_FUNDING_BY_YEAR);
      if (startupsJson.companies) {
        setStartups(startupsJson.companies);
      } else if (startupsJson.data) {
        setStartups(startupsJson.data);
      } else if (Array.isArray(startupsJson)) {
        setStartups(startupsJson);
      }

      const timestamps = [investorsJson.meta?.lastRefreshed, fundingJson.meta?.lastRefreshed].filter(Boolean);
      if (timestamps.length > 0) setRefreshedAt(timestamps.sort().reverse()[0]);
    } catch (error) {
      clientLogger.error('Failed to fetch space capital data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Space Capital' },
      ]} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Capital"
          subtitle="Connect space startups with investors -- top VCs, funding trends, and matchmaking tools"
          icon="💸"
          accentColor="emerald"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium mb-3">{error}</div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab investors={investors} fundingByYear={fundingByYear} startups={startups} />}
        {activeTab === 'investors' && <InvestorsTab investors={investors} />}
        {activeTab === 'startups' && <StartupsTab startups={startups} />}
        {activeTab === 'matchmaker' && <MatchmakerTab investors={investors} startups={startups} />}

        <RelatedModules modules={[
          { name: 'Space Economy', description: 'Market size, government budgets, and trends', href: '/space-economy', icon: '\u{1F30D}' },
          { name: 'Funding Tracker', description: 'Latest funding rounds and deals', href: '/funding-tracker', icon: '\u{1F4CA}' },
          { name: 'Market Intelligence', description: 'Public company data and stock prices', href: '/market-intel', icon: '\u{1F4C8}' },
          { name: 'Deal Flow', description: 'Active deal pipeline and opportunities', href: '/deals', icon: '\u{1F91D}' },
        ]} />

        {/* Data Sources Footer */}
        <ScrollReveal>
          <div className="mt-12 bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
            <h4 className="text-slate-400 font-semibold text-sm mb-3">Data Sources</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
              <div>Space Capital -- Quarterly Investment Reports</div>
              <div>Crunchbase -- Startup Funding Data</div>
              <div>PitchBook -- Private Market Intelligence</div>
              <div>Bryce Tech -- Space Investment Quarterly</div>
              <div>CB Insights -- Venture Capital Analytics</div>
              <div>Public company filings and press releases</div>
            </div>
            <p className="text-slate-600 text-xs mt-3">
              Investor and funding data is compiled from publicly available sources and may not reflect the most recent activity.
              This is not investment advice. Always conduct your own due diligence.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component (with Suspense)
// ────────────────────────────────────────

export default function SpaceCapitalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-2/3"></div>
        </div>
      </div>
    }>
      <SpaceCapitalInner />
    </Suspense>
  );
}
