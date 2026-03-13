'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ════════════════════════════════════════
// Types & Data
// ════════════════════════════════════════

interface Company {
  name: string;
  description: string;
  focus: string;
  funding: string;
  status: 'Active' | 'Operational' | 'Expanding';
  website: string;
  highlight: string;
  category: 'startup' | 'hyperscaler' | 'space-operator';
}

interface UseCase {
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Critical';
  examples: string[];
}

interface TechRow {
  category: string;
  option1: string;
  option1Pros: string;
  option1Cons: string;
  option2: string;
  option2Pros: string;
  option2Cons: string;
}

interface Challenge {
  title: string;
  severity: 'Critical' | 'High' | 'Medium';
  description: string;
  metric: string;
}

interface FundingRound {
  company: string;
  amount: string;
  round: string;
  date: string;
  investors: string;
}

const MARKET_STATS = [
  {
    label: 'Market Size by 2030',
    value: '$5.2B',
    detail: 'Space-based cloud computing projected market',
    color: 'cyan',
  },
  {
    label: 'Growth Rate',
    value: '28%',
    detail: 'Compound annual growth rate (CAGR)',
    color: 'emerald',
  },
  {
    label: 'Key Driver',
    value: '80+ EB/yr',
    detail: 'Earth observation data generated annually',
    color: 'purple',
  },
];

const KEY_DRIVERS = [
  {
    title: 'Earth Observation Data Explosion',
    description: 'Satellite constellations generate 80+ exabytes of imagery per year. Downlinking raw data is becoming a bandwidth bottleneck, making in-orbit processing essential.',
  },
  {
    title: 'Latency Reduction',
    description: 'Processing data at the edge (in orbit) eliminates the round-trip to ground stations, cutting latency from minutes to milliseconds for time-critical applications.',
  },
  {
    title: 'LEO Compute Demand',
    description: 'The proliferation of mega-constellations (Starlink, Kuiper, OneWeb) creates demand for on-orbit networking, data routing, and localized processing nodes.',
  },
  {
    title: 'Autonomous Operations',
    description: 'Next-generation satellites require on-board AI for collision avoidance, orbit maintenance, and real-time decision-making without ground intervention.',
  },
];

const COMPANIES: Company[] = [
  {
    name: 'Lumen Orbit',
    description: 'Building the first commercial in-space data centers. Deploying orbital compute nodes to process satellite data without downlinking to Earth.',
    focus: 'In-Space Data Centers',
    funding: '$4M Seed',
    status: 'Active',
    website: 'https://lumenorbit.com',
    highlight: 'First dedicated orbital compute startup',
    category: 'startup',
  },
  {
    name: 'OrbitsEdge',
    description: 'Developed the SatFrame platform for edge computing in orbit. Partnered with HPE to deploy hardened compute hardware on satellites and space stations.',
    focus: 'Orbital Edge Platform',
    funding: 'Series A',
    status: 'Operational',
    website: 'https://orbitsedge.com',
    highlight: 'HPE partnership for space-hardened servers',
    category: 'startup',
  },
  {
    name: 'Microsoft Azure Orbital',
    description: 'Cloud-to-space ground segment as a service. Integrates Azure cloud with satellite ground stations and edge compute, partnered with SpaceX for Starlink connectivity.',
    focus: 'Ground Segment + Edge',
    funding: 'Enterprise Division',
    status: 'Operational',
    website: 'https://azure.microsoft.com/en-us/products/orbital',
    highlight: 'SpaceX Starlink partnership for Azure cloud',
    category: 'hyperscaler',
  },
  {
    name: 'AWS Ground Station + Outposts',
    description: 'Hybrid cloud for space data processing. AWS Ground Station downlinks satellite data directly into AWS; Outposts enables edge compute at ground station locations.',
    focus: 'Hybrid Cloud for Space',
    funding: 'Enterprise Division',
    status: 'Operational',
    website: 'https://aws.amazon.com/ground-station',
    highlight: 'Largest cloud-to-satellite ground network',
    category: 'hyperscaler',
  },
  {
    name: 'Axiom Space',
    description: 'Deploying compute modules on the ISS and future commercial space station. Provides microgravity data processing and hosting for research workloads.',
    focus: 'ISS Compute Modules',
    funding: '$350M+ Total',
    status: 'Expanding',
    website: 'https://axiomspace.com',
    highlight: 'ISS-hosted compute for commercial customers',
    category: 'space-operator',
  },
  {
    name: 'Spire Global',
    description: 'Operates 100+ nanosatellites with on-board AI for weather data processing. Filters and analyzes atmospheric data in orbit before downlinking refined datasets.',
    focus: 'On-Board AI for Weather',
    funding: 'Public (NYSE: SPIR)',
    status: 'Operational',
    website: 'https://spire.com',
    highlight: '100+ satellites with on-board AI processing',
    category: 'space-operator',
  },
  {
    name: 'Planet Labs',
    description: 'Operates the largest commercial Earth observation fleet (200+ satellites). Developing on-board ML models to filter imagery and reduce downlink volume by up to 80%.',
    focus: 'On-Board ML for EO',
    funding: 'Public (NYSE: PL)',
    status: 'Operational',
    website: 'https://planet.com',
    highlight: 'On-board ML reduces downlink by 80%',
    category: 'space-operator',
  },
  {
    name: 'Pixxel',
    description: 'Building a hyperspectral satellite constellation with on-board AI analysis. Processes spectral data in orbit to deliver actionable insights directly to customers.',
    focus: 'Hyperspectral + On-Board AI',
    funding: '$71M Total',
    status: 'Active',
    website: 'https://pixxel.space',
    highlight: 'Hyperspectral imaging with in-orbit AI',
    category: 'startup',
  },
];

const USE_CASES: UseCase[] = [
  {
    title: 'Real-Time Earth Observation Analytics',
    description: 'Process satellite imagery in orbit for wildfire detection, maritime vessel tracking, and severe weather nowcasting. Eliminates downlink latency for time-critical alerts.',
    impact: 'Critical',
    examples: ['Wildfire perimeter mapping in <5 minutes', 'Illegal fishing vessel detection', 'Hurricane intensity estimation from orbit'],
  },
  {
    title: 'Autonomous Satellite Operations',
    description: 'On-board AI enables satellites to perform collision avoidance, orbit adjustments, and payload scheduling without waiting for ground commands.',
    impact: 'High',
    examples: ['Automated conjunction assessment', 'Dynamic orbit maintenance', 'Self-healing constellation management'],
  },
  {
    title: 'Space-to-Space Communications Relay',
    description: 'In-orbit compute nodes act as intelligent relays, routing data between satellites, aggregating telemetry, and reducing ground station dependency.',
    impact: 'High',
    examples: ['Inter-satellite optical mesh networks', 'Deep space relay processing', 'LEO-GEO data bridging'],
  },
  {
    title: 'Secure Government Compute',
    description: 'Physically isolated compute infrastructure in orbit provides an air-gapped processing environment for classified data and sensitive national security workloads.',
    impact: 'Critical',
    examples: ['Classified SIGINT processing', 'Sovereign data processing', 'Cyber-resilient command and control'],
  },
  {
    title: 'Scientific Data Reduction',
    description: 'Space telescopes and science missions generate terabytes of raw data. On-board processing filters noise, compresses data, and identifies high-priority observations before downlink.',
    impact: 'Medium',
    examples: ['Exoplanet transit detection filtering', 'Cosmic ray rejection in real-time', 'Automated anomaly flagging for astronomy'],
  },
];

const TECH_COMPARISON: TechRow[] = [
  {
    category: 'Processors',
    option1: 'Radiation-Hardened (Rad-Hard)',
    option1Pros: 'Proven reliability, SEU-immune, long heritage',
    option1Cons: '5-10x cost, 2-3 gen behind COTS performance',
    option2: 'COTS with Shielding',
    option2Pros: 'Latest performance, lower cost, flexible',
    option2Cons: 'Requires shielding mass, periodic reboots, shorter lifespan',
  },
  {
    category: 'Compute Architecture',
    option1: 'FPGAs',
    option1Pros: 'Reconfigurable in orbit, radiation-tolerant, low power',
    option1Cons: 'Complex development, lower peak performance',
    option2: 'GPUs / Custom ASICs',
    option2Pros: 'High throughput for ML/AI, parallel processing',
    option2Cons: 'Higher power draw, heat generation, radiation sensitivity',
  },
  {
    category: 'Storage',
    option1: 'Radiation-Tolerant SSDs',
    option1Pros: 'No moving parts, fast access, compact form factor',
    option1Cons: 'Limited capacity (typically <1TB), bit-flip risk',
    option2: 'ECC DRAM + NAND Flash',
    option2Pros: 'Error correction built-in, higher capacity',
    option2Cons: 'Higher power, thermal concerns, mass penalty',
  },
  {
    category: 'Networking',
    option1: 'Optical Inter-Satellite Links (OISL)',
    option1Pros: '10+ Gbps, low latency, no spectrum licensing',
    option1Cons: 'Precise pointing required, weather N/A for ground',
    option2: 'RF Inter-Satellite Links',
    option2Pros: 'Proven technology, omnidirectional, simpler pointing',
    option2Cons: 'Lower bandwidth (~1 Gbps), spectrum congestion',
  },
];

const CHALLENGES: Challenge[] = [
  {
    title: 'Radiation Effects on Electronics',
    severity: 'Critical',
    description: 'Single event upsets (SEUs), total ionizing dose (TID), and displacement damage degrade electronics. LEO provides some shielding from the Van Allen belts, but GEO and deep space are far harsher.',
    metric: 'LEO: ~0.1 rad/day | GEO: ~1 rad/day',
  },
  {
    title: 'Power Constraints',
    severity: 'Critical',
    description: 'Satellite solar panels provide limited power, typically 1-15 kW for most spacecraft. Modern GPUs alone can draw 300W+. Every watt consumed as compute generates heat that must be radiated away.',
    metric: '~0.5-2 TFLOPS/watt (space) vs ~10 TFLOPS/watt (ground)',
  },
  {
    title: 'Thermal Management in Vacuum',
    severity: 'High',
    description: 'No convective cooling in space means all heat must be radiated. Compute-intensive workloads require large radiator panels, adding mass and complexity. Temperature cycling between sun and shadow stresses components.',
    metric: 'Sun-facing: +120C | Shadow: -170C',
  },
  {
    title: 'Ground Communication Latency',
    severity: 'High',
    description: 'LEO satellites have ground contact windows of only 5-15 minutes per pass. Uploading new models, downloading results, and managing operations must fit within these windows or use inter-satellite links.',
    metric: 'LEO pass: 5-15 min | Round-trip: 5-40 ms',
  },
  {
    title: 'Cost Per Compute Cycle',
    severity: 'Medium',
    description: 'Launching compute hardware to orbit costs $2,000-5,000/kg. A space-rated server rack weighing 50kg costs $100K-250K in launch costs alone, before the hardware itself. Only justified when downlink savings or latency requirements offset the premium.',
    metric: 'Space: ~100x ground cost per FLOP',
  },
];

const FUNDING_ROUNDS: FundingRound[] = [
  {
    company: 'Lumen Orbit',
    amount: '$4M',
    round: 'Seed',
    date: 'Q3 2024',
    investors: 'Khosla Ventures, Founders Fund',
  },
  {
    company: 'Pixxel',
    amount: '$36M',
    round: 'Series B',
    date: 'Q1 2024',
    investors: 'Google, Radical Ventures, Lightspeed',
  },
  {
    company: 'Axiom Space',
    amount: '$350M',
    round: 'Series C',
    date: 'Q4 2023',
    investors: 'Aljazira Capital, Boryung',
  },
  {
    company: 'OrbitsEdge',
    amount: '$4.1M',
    round: 'Series A',
    date: 'Q2 2023',
    investors: 'Lockheed Martin Ventures, HPE',
  },
  {
    company: 'Spire Global',
    amount: '$IPO',
    round: 'SPAC Merger',
    date: '2021',
    investors: 'NYSE: SPIR (Public)',
  },
  {
    company: 'Planet Labs',
    amount: '$IPO',
    round: 'SPAC Merger',
    date: '2021',
    investors: 'NYSE: PL (Public)',
  },
];

// ════════════════════════════════════════
// Helper Components
// ════════════════════════════════════════

function SeverityBadge({ severity }: { severity: 'Critical' | 'High' | 'Medium' }) {
  const colors = {
    Critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    High: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[severity]}`}>
      {severity}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: 'Critical' | 'High' | 'Medium' }) {
  const colors = {
    Critical: 'bg-white/10 text-slate-200 border-white/10',
    High: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Medium: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[impact]}`}>
      {impact} Impact
    </span>
  );
}

function CategoryBadge({ category }: { category: Company['category'] }) {
  const config = {
    startup: { label: 'Startup', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    hyperscaler: { label: 'Hyperscaler', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    'space-operator': { label: 'Space Operator', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  };
  const { label, cls } = config[category];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: Company['status'] }) {
  const colors = {
    Active: 'bg-white',
    Operational: 'bg-emerald-400',
    Expanding: 'bg-amber-400',
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
      <span className={`w-2 h-2 rounded-full ${colors[status]} animate-pulse`} />
      {status}
    </span>
  );
}

// ════════════════════════════════════════
// Section Components
// ════════════════════════════════════════

function MarketOverview() {
  return (
    <section className="mb-12">
      <ScrollReveal>
        <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
          <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Market Overview
        </h2>
      </ScrollReveal>

      {/* Stat cards */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {MARKET_STATS.map((stat) => {
          const borderColors: Record<string, string> = {
            cyan: 'border-white/15/40 hover:border-white/10/60',
            emerald: 'border-emerald-500/40 hover:border-emerald-400/60',
            purple: 'border-purple-500/40 hover:border-purple-400/60',
          };
          const textColors: Record<string, string> = {
            cyan: 'text-slate-300',
            emerald: 'text-emerald-400',
            purple: 'text-purple-400',
          };
          return (
            <StaggerItem key={stat.label}>
              <div className={`card p-6 text-center border ${borderColors[stat.color] || ''}`}>
                <p className="text-sm text-slate-400 mb-1 uppercase tracking-wide">{stat.label}</p>
                <p className={`text-4xl font-bold ${textColors[stat.color] || 'text-slate-300'}`}>{stat.value}</p>
                <p className="text-sm text-slate-300 mt-2">{stat.detail}</p>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Key drivers */}
      <ScrollReveal>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Key Market Drivers</h3>
      </ScrollReveal>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KEY_DRIVERS.map((driver) => (
          <StaggerItem key={driver.title}>
            <div className="card p-5">
              <h4 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {driver.title}
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">{driver.description}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}

function CompanyProfiles() {
  const [filter, setFilter] = useState<'all' | Company['category']>('all');

  const filtered = filter === 'all' ? COMPANIES : COMPANIES.filter((c) => c.category === filter);

  const filterButtons: { value: typeof filter; label: string }[] = [
    { value: 'all', label: 'All Companies' },
    { value: 'startup', label: 'Startups' },
    { value: 'hyperscaler', label: 'Hyperscalers' },
    { value: 'space-operator', label: 'Space Operators' },
  ];

  return (
    <section className="mb-12">
      <ScrollReveal>
        <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
          Company Profiles
        </h2>
        <p className="text-slate-400 mb-6">Leading companies in space-based data processing and edge computing</p>
      </ScrollReveal>

      {/* Filter bar */}
      <ScrollReveal>
        <div className="flex flex-wrap gap-2 mb-6">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === btn.value
                  ? 'bg-white text-white'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </ScrollReveal>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((company) => (
          <StaggerItem key={company.name}>
            <div className="card p-6 h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{company.name}</h3>
                  <p className="text-sm text-slate-300 font-medium">{company.focus}</p>
                </div>
                <StatusDot status={company.status} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4 flex-1">{company.description}</p>
              <div className="bg-slate-800/40 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Key Highlight</p>
                <p className="text-sm text-slate-200">{company.highlight}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-3">
                  <CategoryBadge category={company.category} />
                  <span className="text-xs text-slate-400">{company.funding}</span>
                </div>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                >
                  Visit
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}

function UseCases() {
  return (
    <section className="mb-12">
      <ScrollReveal>
        <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Use Cases
        </h2>
        <p className="text-slate-400 mb-6">Key applications driving adoption of space-based compute</p>
      </ScrollReveal>

      <StaggerContainer className="space-y-4">
        {USE_CASES.map((uc) => (
          <StaggerItem key={uc.title}>
            <div className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-100">{uc.title}</h3>
                <ImpactBadge impact={uc.impact} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">{uc.description}</p>
              <div className="flex flex-wrap gap-2">
                {uc.examples.map((ex) => (
                  <span
                    key={ex}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-slate-800/60 text-slate-300 border border-slate-700/50"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}

function TechnologyComparison() {
  return (
    <section className="mb-12">
      <ScrollReveal>
        <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0015.75 4.5h-9A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5z" />
          </svg>
          Technology Comparison
        </h2>
        <p className="text-slate-400 mb-6">Key hardware and architecture trade-offs for space-based compute</p>
      </ScrollReveal>

      {/* Desktop table (hidden on mobile) */}
      <ScrollReveal>
        <div className="card overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-slate-400 font-medium uppercase tracking-wider text-xs">Category</th>
                  <th className="text-left p-4 text-slate-300 font-medium uppercase tracking-wider text-xs">Option A</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-xs">Pros</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-xs">Cons</th>
                  <th className="text-left p-4 text-purple-400 font-medium uppercase tracking-wider text-xs">Option B</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-xs">Pros</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-xs">Cons</th>
                </tr>
              </thead>
              <tbody>
                {TECH_COMPARISON.map((row, i) => (
                  <tr key={row.category} className={`border-b border-slate-700/30 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                    <td className="p-4 font-semibold text-slate-200 whitespace-nowrap">{row.category}</td>
                    <td className="p-4 text-slate-200 font-medium">{row.option1}</td>
                    <td className="p-4 text-emerald-300/80 text-xs">{row.option1Pros}</td>
                    <td className="p-4 text-red-300/80 text-xs">{row.option1Cons}</td>
                    <td className="p-4 text-purple-300 font-medium">{row.option2}</td>
                    <td className="p-4 text-emerald-300/80 text-xs">{row.option2Pros}</td>
                    <td className="p-4 text-red-300/80 text-xs">{row.option2Cons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* Mobile-friendly stacked cards (shown on mobile only) */}
      <div className="md:hidden mt-6 space-y-4">
        {TECH_COMPARISON.map((row) => (
          <ScrollReveal key={row.category}>
            <div className="card p-5">
              <h4 className="font-semibold text-slate-100 mb-4 text-base">{row.category}</h4>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-200 mb-2">{row.option1}</p>
                  <p className="text-xs text-emerald-300/80 mb-1">+ {row.option1Pros}</p>
                  <p className="text-xs text-red-300/80">- {row.option1Cons}</p>
                </div>
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-purple-300 mb-2">{row.option2}</p>
                  <p className="text-xs text-emerald-300/80 mb-1">+ {row.option2Pros}</p>
                  <p className="text-xs text-red-300/80">- {row.option2Cons}</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

function Challenges() {
  return (
    <section className="mb-12">
      <ScrollReveal>
        <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Key Challenges
        </h2>
        <p className="text-slate-400 mb-6">Technical and economic barriers facing space-based compute</p>
      </ScrollReveal>

      <StaggerContainer className="space-y-4">
        {CHALLENGES.map((challenge) => (
          <StaggerItem key={challenge.title}>
            <div className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-100">{challenge.title}</h3>
                <SeverityBadge severity={challenge.severity} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-3">{challenge.description}</p>
              <div className="bg-slate-800/40 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                <span className="text-xs text-slate-300 font-mono">{challenge.metric}</span>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}

function InvestmentTracker() {
  return (
    <section className="mb-12">
      <ScrollReveal>
        <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Investment Tracker
        </h2>
        <p className="text-slate-400 mb-6">Recent funding activity in space compute companies</p>
      </ScrollReveal>

      {/* Desktop table (hidden on mobile) */}
      <ScrollReveal>
        <div className="card overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-slate-400 font-medium uppercase tracking-wider text-xs">Company</th>
                  <th className="text-left p-4 text-slate-400 font-medium uppercase tracking-wider text-xs">Amount</th>
                  <th className="text-left p-4 text-slate-400 font-medium uppercase tracking-wider text-xs">Round</th>
                  <th className="text-left p-4 text-slate-400 font-medium uppercase tracking-wider text-xs">Date</th>
                  <th className="text-left p-4 text-slate-400 font-medium uppercase tracking-wider text-xs">Investors</th>
                </tr>
              </thead>
              <tbody>
                {FUNDING_ROUNDS.map((round, i) => (
                  <tr key={`${round.company}-${round.round}`} className={`border-b border-slate-700/30 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                    <td className="p-4 font-semibold text-slate-200">{round.company}</td>
                    <td className="p-4 text-emerald-400 font-bold">{round.amount}</td>
                    <td className="p-4 text-slate-300">{round.round}</td>
                    <td className="p-4 text-slate-400">{round.date}</td>
                    <td className="p-4 text-slate-300 text-xs">{round.investors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* Mobile-friendly stacked cards (shown on mobile only) */}
      <div className="md:hidden mt-6 space-y-3">
        {FUNDING_ROUNDS.map((round) => (
          <ScrollReveal key={`${round.company}-${round.round}-mobile`}>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-100">{round.company}</h4>
                <span className="text-emerald-400 font-bold text-sm">{round.amount}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{round.round}</span>
                <span className="text-slate-600">|</span>
                <span>{round.date}</span>
              </div>
              <p className="text-xs text-slate-300 mt-2">{round.investors}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

// ════════════════════════════════════════
// Main Page
// ════════════════════════════════════════

export default function SpaceEdgeComputingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <AnimatedPageHeader
          title="Space-Based Data Processing & Edge Computing"
          subtitle="Explore the emerging $5.2B space-based cloud computing market — in-orbit data centers, edge AI, and the companies transforming how we process data beyond Earth."
          accentColor="cyan"
          icon={
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0015.75 4.5h-9A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5z" />
            </svg>
          }
        />

        <MarketOverview />
        <CompanyProfiles />
        <UseCases />
        <TechnologyComparison />
        <Challenges />
        <InvestmentTracker />

        {/* Back to modules */}
        <ScrollReveal>
          <div className="text-center pt-8 pb-4 border-t border-slate-700/50">
            <Link
              href="/business-opportunities"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Business Opportunities
            </Link>
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['space-edge-computing']} />
      </div>
    </div>
  );
}
