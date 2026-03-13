'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import EmptyState from '@/components/ui/EmptyState';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type ImpactLevel = 'transformative' | 'significant' | 'emerging';
type TrendCategory =
  | 'Launch & Access'
  | 'Connectivity'
  | 'Operations & AI'
  | 'Business Models'
  | 'National Security'
  | 'Sustainability'
  | 'Infrastructure'
  | 'Manufacturing';

interface Trend {
  title: string;
  category: TrendCategory;
  impact: ImpactLevel;
  timeframe: string;
  description: string;
  evidence: string[];
  companies: string[];
  metrics: { label: string; value: string }[];
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const TRENDS: Trend[] = [
  {
    title: 'Rideshare Launches Becoming Dominant Mode for Smallsats',
    category: 'Launch & Access',
    impact: 'transformative',
    timeframe: '2023 - 2028',
    description:
      'Dedicated rideshare missions from SpaceX Transporter, RocketLab, and new entrants have collapsed the cost and wait time for smallsat operators. Over 70% of smallsats launched in 2025 flew on rideshare missions, up from 35% in 2021. The model enables rapid constellation deployment without dedicated launch contracts.',
    evidence: [
      'SpaceX Transporter missions averaged 110+ payloads per flight in 2025',
      'Rideshare pricing dropped to ~$5,000/kg for sun-synchronous orbit',
      'Exolaunch and D-Orbit deployed 400+ satellites via rideshare in 2025',
      'Average wait time for rideshare slot fell from 18 months to under 6 months',
    ],
    companies: ['SpaceX', 'Rocket Lab', 'Exolaunch', 'D-Orbit', 'Momentus', 'Spaceflight Inc.'],
    metrics: [
      { label: 'Smallsats via rideshare (2025)', value: '72%' },
      { label: 'Avg cost per kg', value: '$5,200' },
      { label: 'Missions per year', value: '40+' },
    ],
  },
  {
    title: 'Reusability Driving Cost per Kg Below $1,000',
    category: 'Launch & Access',
    impact: 'transformative',
    timeframe: '2024 - 2030',
    description:
      'Full and partial reusability is fundamentally reshaping launch economics. SpaceX Starship aims for sub-$100/kg to LEO, while Falcon 9 boosters have exceeded 20 reuses. Competitors including Rocket Lab Neutron and Blue Origin New Glenn are following suit, creating a race to the lowest cost per kilogram ever achieved.',
    evidence: [
      'Falcon 9 booster B1060 completed its 25th flight in early 2026',
      'Starship achieved full stack reuse milestones in late 2025',
      'Rocket Lab Neutron designed for 13+ reuses per booster',
      'Blue Origin New Glenn first stage designed for 25 flights',
    ],
    companies: ['SpaceX', 'Blue Origin', 'Rocket Lab', 'Relativity Space', 'Stoke Space'],
    metrics: [
      { label: 'Falcon 9 cost/kg (2025)', value: '~$2,700' },
      { label: 'Starship target cost/kg', value: '<$100' },
      { label: 'Max booster reuses', value: '25' },
    ],
  },
  {
    title: 'MEO Constellations Gaining Traction vs LEO',
    category: 'Connectivity',
    impact: 'significant',
    timeframe: '2024 - 2032',
    description:
      'While LEO mega-constellations dominate headlines, Medium Earth Orbit (MEO) is emerging as a compelling alternative for broadband, navigation augmentation, and Earth observation. MEO offers wider coverage per satellite, reducing constellation size requirements and ground segment complexity, though with higher latency than LEO.',
    evidence: [
      'SES O3b mPOWER MEO constellation became fully operational in 2025',
      'Astranis pivoting select capacity to MEO for wider coverage footprints',
      'European IRIS2 program selected MEO/LEO hybrid architecture',
      'MEO satellites cover 10x the area of equivalent LEO assets',
    ],
    companies: ['SES', 'Astranis', 'Rivada Space Networks', 'Eutelsat OneWeb', 'Intelsat'],
    metrics: [
      { label: 'MEO coverage per satellite', value: '10x LEO' },
      { label: 'MEO latency', value: '100-150ms' },
      { label: 'Constellation size needed', value: '60-80%  fewer' },
    ],
  },
  {
    title: 'Space-as-a-Service Replacing Ownership Models',
    category: 'Business Models',
    impact: 'transformative',
    timeframe: '2022 - 2030',
    description:
      'The space industry is shifting from asset-heavy ownership to consumption-based service models. Operators can now purchase imagery, bandwidth, compute, and even hosted payload capacity on demand. This mirrors the cloud computing revolution and dramatically lowers barriers to entry for new space users.',
    evidence: [
      'Planet Labs processes 30+ million km2 of imagery daily as a data service',
      'AWS Ground Station eliminated need for proprietary ground infrastructure',
      'Satellogic offers tasking-as-a-service for sub-meter Earth observation',
      'Loft Orbital hosts payloads on shared satellite buses for 1/10th the cost',
    ],
    companies: ['Planet Labs', 'AWS', 'Loft Orbital', 'Satellogic', 'Spire Global', 'Umbra'],
    metrics: [
      { label: 'XaaS revenue share (2025)', value: '38%' },
      { label: 'Cost reduction vs ownership', value: '60-90%' },
      { label: 'Time to first data', value: 'Days vs years' },
    ],
  },
  {
    title: 'National Security Space Spending Acceleration',
    category: 'National Security',
    impact: 'transformative',
    timeframe: '2023 - 2030',
    description:
      'Defense and intelligence spending on space capabilities is surging globally. The US Space Force budget exceeded $30B in FY2026, while the Space Development Agency rapidly deploys proliferated LEO constellations. Allies are establishing or expanding their own space commands, creating a growing national security market for commercial providers.',
    evidence: [
      'US Space Force FY2026 budget request exceeded $30 billion',
      'SDA Tranche 2 awarded contracts for 250+ satellites in tracking/transport layers',
      'NRO commercial imagery purchases tripled between 2022 and 2025',
      '18 nations now operate dedicated space commands or equivalents',
    ],
    companies: ['L3Harris', 'Northrop Grumman', 'Lockheed Martin', 'York Space Systems', 'SpaceX', 'BlackSky'],
    metrics: [
      { label: 'US Space Force budget (FY26)', value: '$30B+' },
      { label: 'SDA satellites planned', value: '500+' },
      { label: 'Allied space commands', value: '18' },
    ],
  },
  {
    title: 'Commercial Space Station Transition from ISS',
    category: 'Infrastructure',
    impact: 'significant',
    timeframe: '2025 - 2032',
    description:
      'With ISS deorbit planned for 2030, NASA and international partners are transitioning to commercially-owned and operated space stations. Multiple providers are developing orbital platforms, each with distinct architectures ranging from inflatable modules to repurposed rocket stages. This opens LEO to tourism, manufacturing, and research at commercial scale.',
    evidence: [
      'Axiom Space attached its first commercial module to ISS in 2025',
      'Vast Haven-1 targeting 2026 launch as first free-flying commercial station',
      'Orbital Reef (Blue Origin / Sierra Space) passed critical design review',
      'NASA CLD program awarded $415M across four providers',
    ],
    companies: ['Axiom Space', 'Vast', 'Blue Origin', 'Sierra Space', 'Nanoracks / Starlab', 'Gravitics'],
    metrics: [
      { label: 'ISS retirement', value: '~2030' },
      { label: 'NASA CLD funding', value: '$415M' },
      { label: 'Planned commercial stations', value: '4-5' },
    ],
  },
  {
    title: 'In-Space Manufacturing Moving from Concept to Reality',
    category: 'Manufacturing',
    impact: 'emerging',
    timeframe: '2025 - 2035',
    description:
      'Microgravity manufacturing is transitioning from experimental to commercial. ZBLAN fiber optics, semiconductor crystals, bioprinted tissues, and advanced alloys produced in orbit show properties unachievable on Earth. Early revenue streams are emerging, with several companies operating manufacturing payloads on ISS and planning dedicated facilities.',
    evidence: [
      'Varda Space Industries returned first pharmaceutical capsule from orbit in 2024',
      'Redwire produced high-purity ZBLAN fiber with 100x fewer defects than terrestrial',
      'Space Forge recovered reentry capsule with semiconductor samples in 2025',
      'Market projected to reach $10B by 2035 for orbital manufacturing',
    ],
    companies: ['Varda Space Industries', 'Redwire', 'Space Forge', 'Made In Space', 'Flawless Photonics', 'Axiom Space'],
    metrics: [
      { label: 'ZBLAN fiber value/kg', value: '$1M+' },
      { label: 'Projected market (2035)', value: '$10B' },
      { label: 'Active ISS experiments', value: '30+' },
    ],
  },
  {
    title: 'Direct-to-Device Satellite Connectivity',
    category: 'Connectivity',
    impact: 'transformative',
    timeframe: '2024 - 2030',
    description:
      'Satellites communicating directly with unmodified smartphones represent perhaps the largest addressable market expansion in space history. From emergency SOS to full broadband, multiple constellation operators and mobile carriers have partnered to blanket the planet in connectivity, targeting the 90% of Earth with no terrestrial coverage.',
    evidence: [
      'Apple iPhone satellite SOS expanded to 18 countries by 2025',
      'SpaceX and T-Mobile achieved direct-to-cell beta with Starlink v2 mini sats',
      'AST SpaceMobile launched BlueBird commercial satellites for voice/data',
      'Lynk Global secured spectrum agreements in 40+ countries',
    ],
    companies: ['AST SpaceMobile', 'SpaceX / T-Mobile', 'Lynk Global', 'Apple / Globalstar', 'Qualcomm', 'MediaTek'],
    metrics: [
      { label: 'Addressable users', value: '5B+ people' },
      { label: 'Uncovered Earth surface', value: '~90%' },
      { label: 'D2D revenue forecast (2030)', value: '$20B+' },
    ],
  },
  {
    title: 'Space Sustainability & Debris Removal Market Emergence',
    category: 'Sustainability',
    impact: 'significant',
    timeframe: '2024 - 2032',
    description:
      'The debris removal and space sustainability market is evolving from government R&D projects into a commercial sector. Regulatory pressure from the FCC 5-year deorbit rule, ESA Zero Debris Charter, and growing insurance concerns are creating demand for active debris removal (ADR) services, space traffic management, and lifecycle compliance tools.',
    evidence: [
      'Astroscale ADRAS-J completed rendezvous and inspection of a rocket body in 2024',
      'FCC 5-year post-mission disposal rule took effect September 2024',
      'ClearSpace-1 ESA mission contracted for 2026 launch',
      'Space sustainability startups raised over $400M in 2024-2025 combined',
    ],
    companies: ['Astroscale', 'ClearSpace', 'LeoLabs', 'Privateer', 'Neura Space', 'Kayhan Space'],
    metrics: [
      { label: 'Tracked debris objects', value: '40,000+' },
      { label: 'ADR market forecast (2030)', value: '$3.5B' },
      { label: 'FCC deorbit window', value: '5 years' },
    ],
  },
  {
    title: 'AI/ML Transforming Satellite Operations',
    category: 'Operations & AI',
    impact: 'transformative',
    timeframe: '2023 - 2030',
    description:
      'Artificial intelligence is automating satellite operations at every layer: autonomous collision avoidance, intelligent tasking and scheduling, onboard image processing, and predictive maintenance. As constellations grow to thousands of satellites, human-in-the-loop operations become infeasible, making AI the operational backbone of modern space systems.',
    evidence: [
      'SpaceX Starlink autonomously executes 99%+ of collision avoidance maneuvers',
      'Capella Space uses ML to prioritize SAR collection based on change detection',
      'Spire Global processes weather data onboard using edge AI before downlink',
      'Cognitive Space raised $12M for AI-driven satellite tasking automation',
    ],
    companies: ['SpaceX', 'Capella Space', 'Cognitive Space', 'Spire Global', 'Kayhan Space', 'Slingshot Aerospace'],
    metrics: [
      { label: 'Starlink auto-avoidance rate', value: '99%+' },
      { label: 'Ops cost reduction via AI', value: '40-70%' },
      { label: 'Onboard processing speedup', value: '10-100x' },
    ],
  },
  {
    title: 'Optical Communications Replacing RF',
    category: 'Connectivity',
    impact: 'significant',
    timeframe: '2024 - 2032',
    description:
      'Free-space optical (laser) communications deliver 10-100x the bandwidth of traditional radio frequency links while using smaller, lighter terminals. NASA LCRD and commercial inter-satellite laser links are proving the technology, with mega-constellations adopting optical crosslinks as standard architecture for backbone data routing in space.',
    evidence: [
      'NASA LCRD demonstrated 1.2 Gbps optical relay from GEO since 2022',
      'Starlink v2 satellites incorporate laser inter-satellite links as standard',
      'CACI acquired SA Photonics to scale optical terminal production',
      'Mynaric shipped 100+ laser communication terminals in 2025',
    ],
    companies: ['Mynaric', 'CACI / SA Photonics', 'SpaceX', 'Tesat-Spacecom', 'Skyloom', 'General Atomics'],
    metrics: [
      { label: 'Bandwidth improvement', value: '10-100x RF' },
      { label: 'Terminal mass reduction', value: '~50%' },
      { label: 'Laser terminals shipped (2025)', value: '200+' },
    ],
  },
  {
    title: 'Mega-Constellations Driving Ground Segment Innovation',
    category: 'Infrastructure',
    impact: 'significant',
    timeframe: '2023 - 2030',
    description:
      'Mega-constellations with thousands of satellites are overwhelming traditional ground segment architectures. Software-defined, electronically steered antenna arrays and cloud-native ground station networks are replacing legacy dish farms. The ground segment is becoming the critical bottleneck and the fastest-growing investment area in space infrastructure.',
    evidence: [
      'AWS Ground Station-as-a-Service spans 12+ global locations',
      'Kymeta and ThinKom shipping flat-panel antennas for mobile satellite comms',
      'Microsoft Azure Orbital partnered with SES for cloud-managed ground services',
      'Global ground segment market grew 18% CAGR from 2022-2025',
    ],
    companies: ['AWS', 'Microsoft Azure Orbital', 'Kymeta', 'ThinKom', 'Viasat', 'ATLAS Space Operations'],
    metrics: [
      { label: 'Ground segment CAGR', value: '18%' },
      { label: 'Cloud ground station sites', value: '30+' },
      { label: 'Flat-panel antenna shipments', value: '50K+/yr' },
    ],
  },
  {
    title: 'Space Insurance Market Evolution',
    category: 'Business Models',
    impact: 'emerging',
    timeframe: '2024 - 2030',
    description:
      'The space insurance market is adapting to mega-constellations, reusable launch, and in-orbit servicing. Traditional per-satellite policies are giving way to portfolio and parametric insurance products. Improved launch reliability has lowered premiums, but debris risk and cyber threats are creating new underwriting challenges.',
    evidence: [
      'Global space insurance premiums reached $600M in 2025',
      'Launch insurance rates fell below 3% for reusable vehicles',
      'Parametric insurance products emerged for constellation operators',
      'Cyber risk exclusions became standard in satellite insurance policies',
    ],
    companies: ['AXA XL', 'Marsh McLennan', 'Swiss Re', 'Munich Re', 'Assure Space', 'Global Aerospace'],
    metrics: [
      { label: 'Global premiums (2025)', value: '$600M' },
      { label: 'Launch failure rate (2025)', value: '<3%' },
      { label: 'Avg premium reduction (5yr)', value: '-25%' },
    ],
  },
  {
    title: 'Vertical Integration Trends (SpaceX Model Spreading)',
    category: 'Business Models',
    impact: 'transformative',
    timeframe: '2020 - 2030',
    description:
      'SpaceX demonstrated that controlling launch, satellites, ground terminals, and service delivery yields compounding cost and schedule advantages. Competitors are replicating this vertically integrated model. Amazon (Kuiper + AWS + Blue Origin), Rocket Lab (launch + spacecraft + components), and others are building end-to-end capabilities.',
    evidence: [
      'Rocket Lab acquired SolAero, Sinclair, PSC, and ASI for vertical integration',
      'Amazon Kuiper leverages Blue Origin launch, AWS ground, and in-house terminals',
      'L3Harris acquiring Aerojet Rocketdyne for propulsion vertical integration',
      'Airbus consolidated satellite and launcher divisions under Airbus Space',
    ],
    companies: ['SpaceX', 'Rocket Lab', 'Amazon / Kuiper', 'L3Harris', 'Airbus', 'Northrop Grumman'],
    metrics: [
      { label: 'SpaceX cost advantage', value: '3-5x vs peers' },
      { label: 'Rocket Lab acquisitions', value: '5 companies' },
      { label: 'Integration premium', value: '30-50% margin' },
    ],
  },
  {
    title: 'Edge Computing in Orbit',
    category: 'Operations & AI',
    impact: 'emerging',
    timeframe: '2025 - 2033',
    description:
      'Processing data onboard satellites rather than downlinking raw feeds is becoming essential as sensor resolution and constellation scale outpace ground bandwidth. Edge computing in orbit enables real-time analytics, reduces latency for decision-making, and cuts downlink costs by transmitting only actionable insights.',
    evidence: [
      'OrbitsEdge deploying ruggedized cloud servers in partnership with HPE for orbit',
      'Pixxel launched hyperspectral satellites with onboard ML classification',
      'Ubotica Technologies shipped 50+ AI processors for in-orbit edge computing',
      'Estimated 80% data reduction achievable through onboard preprocessing',
    ],
    companies: ['OrbitsEdge', 'Pixxel', 'Ubotica', 'Unibap', 'Xplore', 'Loft Orbital'],
    metrics: [
      { label: 'Data reduction onboard', value: 'Up to 80%' },
      { label: 'Latency improvement', value: 'Minutes to seconds' },
      { label: 'Edge compute market (2030)', value: '$2.5B' },
    ],
  },
  {
    title: 'Proliferated LEO for Resilient Military Comms',
    category: 'National Security',
    impact: 'significant',
    timeframe: '2024 - 2032',
    description:
      'Military space architectures are shifting from small numbers of exquisite GEO satellites to large constellations of smaller, cheaper LEO satellites. The Space Development Agency Proliferated Warfighter Space Architecture (PWSA) leads this transformation, creating a mesh network that is harder to target and cheaper to replenish than legacy systems.',
    evidence: [
      'SDA Tranche 1 Transport Layer achieved initial operating capability in 2025',
      'DARPA Blackjack demonstrated autonomous LEO mesh networking',
      'UK Skynet 6 program incorporating LEO resilience layer',
      'Proliferated architectures reduce single-point-of-failure risk by 90%+',
    ],
    companies: ['York Space Systems', 'Lockheed Martin', 'Northrop Grumman', 'L3Harris', 'Airbus Defence', 'Thales Alenia'],
    metrics: [
      { label: 'SDA Tranche 2 satellites', value: '250+' },
      { label: 'Resilience improvement', value: '90%+ SPOF reduction' },
      { label: 'Per-unit cost reduction', value: '70-80%' },
    ],
  },
  {
    title: 'Satellite Data Analytics & Geospatial AI',
    category: 'Operations & AI',
    impact: 'significant',
    timeframe: '2023 - 2030',
    description:
      'The real value in satellite data increasingly lies not in the imagery or signals themselves, but in the analytics derived from them. Geospatial AI companies are building vertical-specific products for agriculture, finance, insurance, supply chain, and energy using satellite data as a foundation, creating a rapidly expanding analytics layer.',
    evidence: [
      'Orbital Insight processes 30PB+ of satellite imagery annually for financial analytics',
      'Descartes Labs acquired by AntiSec for $200M+ for geospatial AI platform',
      'SpaceKnow provides satellite-derived economic indicators to central banks',
      'Geospatial analytics market projected at $120B by 2030',
    ],
    companies: ['Orbital Insight', 'Planet Labs', 'SpaceKnow', 'HawkEye 360', 'Synspective', 'UP42'],
    metrics: [
      { label: 'Geospatial AI market (2030)', value: '$120B' },
      { label: 'Imagery processed daily', value: '50+ PB' },
      { label: 'Vertical applications', value: '25+ industries' },
    ],
  },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; color: string; bg: string; border: string }> = {
  transformative: {
    label: 'Transformative',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
  },
  significant: {
    label: 'Significant',
    color: 'text-slate-300',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
  emerging: {
    label: 'Emerging',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
  },
};

const CATEGORY_COLORS: Record<TrendCategory, string> = {
  'Launch & Access': 'text-orange-400',
  Connectivity: 'text-blue-400',
  'Operations & AI': 'text-violet-400',
  'Business Models': 'text-pink-400',
  'National Security': 'text-red-400',
  Sustainability: 'text-green-400',
  Infrastructure: 'text-yellow-400',
  Manufacturing: 'text-teal-400',
};

const ALL_CATEGORIES: TrendCategory[] = [
  'Launch & Access',
  'Connectivity',
  'Operations & AI',
  'Business Models',
  'National Security',
  'Sustainability',
  'Infrastructure',
  'Manufacturing',
];

const ALL_IMPACTS: ImpactLevel[] = ['transformative', 'significant', 'emerging'];

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function IndustryTrendsPage() {
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TrendCategory | 'all'>('all');
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | 'all'>('all');

  const filteredTrends = TRENDS.filter((trend) => {
    if (categoryFilter !== 'all' && trend.category !== categoryFilter) return false;
    if (impactFilter !== 'all' && trend.impact !== impactFilter) return false;
    return true;
  });

  const impactCounts = {
    transformative: TRENDS.filter((t) => t.impact === 'transformative').length,
    significant: TRENDS.filter((t) => t.impact === 'significant').length,
    emerging: TRENDS.filter((t) => t.impact === 'emerging').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Industry Trends & Analysis"
          subtitle="Data-backed analysis of the forces reshaping the global space economy. Explore the macro trends driving investment, policy, and technology across all sectors."
          icon={<span>📈</span>}
          accentColor="cyan"
          breadcrumb="Market Intelligence"
        />

        {/* Summary Stats */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-300">{TRENDS.length}</p>
              <p className="text-sm text-slate-400 mt-1">Tracked Trends</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{impactCounts.transformative}</p>
              <p className="text-sm text-slate-400 mt-1">Transformative</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-300">{impactCounts.significant}</p>
              <p className="text-sm text-slate-400 mt-1">Significant</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{impactCounts.emerging}</p>
              <p className="text-sm text-slate-400 mt-1">Emerging</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Category Filter */}
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as TrendCategory | 'all')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15"
              >
                <option value="all">All Categories ({TRENDS.length})</option>
                {ALL_CATEGORIES.map((cat) => {
                  const count = TRENDS.filter((t) => t.category === cat).length;
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Impact Filter */}
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Impact Level</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setImpactFilter('all')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    impactFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  All
                </button>
                {ALL_IMPACTS.map((level) => {
                  const cfg = IMPACT_CONFIG[level];
                  return (
                    <button
                      key={level}
                      onClick={() => setImpactFilter(impactFilter === level ? 'all' : level)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        impactFilter === level
                          ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Results Count */}
        {filteredTrends.length !== TRENDS.length && (
          <p className="text-sm text-slate-400 mb-4">
            Showing {filteredTrends.length} of {TRENDS.length} trends
          </p>
        )}

        {/* Trend Cards */}
        <div className="space-y-4">
          {filteredTrends.map((trend, idx) => {
            const isExpanded = expandedTrend === idx;
            const impactCfg = IMPACT_CONFIG[trend.impact];
            const catColor = CATEGORY_COLORS[trend.category];

            return (
              <ScrollReveal key={trend.title} delay={idx * 0.05}>
                <div
                  className={`bg-slate-900/60 border rounded-xl transition-all duration-300 ${
                    isExpanded ? 'border-white/15 shadow-lg shadow-black/20/5' : 'border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedTrend(isExpanded ? null : idx)}
                    className="w-full text-left p-5 sm:p-6"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Category & Impact badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-xs font-medium ${catColor}`}>{trend.category}</span>
                          <span className="text-slate-600">|</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${impactCfg.bg} ${impactCfg.color} border ${impactCfg.border}`}
                          >
                            {impactCfg.label}
                          </span>
                          <span className="text-xs text-slate-500">{trend.timeframe}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-semibold text-slate-100 leading-tight">{trend.title}</h3>

                        {/* Description preview */}
                        {!isExpanded && (
                          <p className="mt-2 text-sm text-slate-400 line-clamp-2">{trend.description}</p>
                        )}

                        {/* Inline metrics preview */}
                        {!isExpanded && (
                          <div className="flex flex-wrap gap-3 mt-3">
                            {trend.metrics.slice(0, 3).map((m) => (
                              <span key={m.label} className="text-xs text-slate-500">
                                <span className="text-slate-300 font-semibold">{m.value}</span>{' '}
                                {m.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expand Chevron */}
                      <div className="flex-shrink-0 mt-1">
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-6 border-t border-slate-700/50 pt-4">
                      {/* Full Description */}
                      <p className="text-sm text-slate-300 leading-relaxed mb-5">{trend.description}</p>

                      <div className="grid md:grid-cols-3 gap-5">
                        {/* Evidence */}
                        <div className="md:col-span-2">
                          <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold">
                            Supporting Evidence
                          </h4>
                          <ul className="space-y-2">
                            {trend.evidence.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="text-slate-300 mt-0.5 flex-shrink-0">&#8226;</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Companies */}
                          <h4 className="text-xs uppercase tracking-wider text-slate-400 mt-5 mb-3 font-semibold">
                            Key Players
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {trend.companies.map((company) => (
                              <span
                                key={company}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/50"
                              >
                                {company}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Metrics Panel */}
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-semibold">
                            Key Metrics
                          </h4>
                          <div className="space-y-3">
                            {trend.metrics.map((m) => (
                              <div
                                key={m.label}
                                className="bg-slate-800/60 border border-slate-700/40 rounded-lg p-3"
                              >
                                <p className="text-lg font-bold text-slate-300">{m.value}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

        <RelatedModules modules={PAGE_RELATIONS['industry-trends']} />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTrends.length === 0 && (
          <EmptyState
            icon={<svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
            title="No trends found"
            description="No trends match the selected filters. Try adjusting your criteria."
            action={
              <button
                onClick={() => {
                  setCategoryFilter('all');
                  setImpactFilter('all');
                }}
                className="text-sm text-slate-300 hover:text-white underline underline-offset-2"
              >
                Clear all filters
              </button>
            }
          />
        )}

        {/* Related Pages */}
        <ScrollReveal delay={0.15}>
          <div className="mt-12 border-t border-slate-800 pt-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Related Analysis</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/market-intel"
                className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-white/10 transition-colors"
              >
                <div className="text-2xl mb-2">📊</div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                  Market Intelligence
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time data on the space economy, segments, and growth drivers.
                </p>
              </Link>
              <Link
                href="/market-map"
                className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-white/10 transition-colors"
              >
                <div className="text-2xl mb-2">🗺️</div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                  Market Map
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Visual landscape of companies across every space sector.
                </p>
              </Link>
              <Link
                href="/investment-tracker"
                className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-white/10 transition-colors"
              >
                <div className="text-2xl mb-2">💰</div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                  Investment Tracker
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Funding rounds, M&A activity, and investor trends.
                </p>
              </Link>
              <Link
                href="/tech-readiness"
                className="group bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-white/10 transition-colors"
              >
                <div className="text-2xl mb-2">🔬</div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                  Tech Readiness
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Technology maturity assessments and readiness levels.
                </p>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Methodology Note */}
        <ScrollReveal delay={0.2}>
          <div className="mt-8 bg-slate-900/30 border border-slate-800/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Methodology</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trends are identified and ranked through analysis of public filings, industry reports (Euroconsult,
              Bryce Tech, Space Capital), government budget documents, patent filings, conference proceedings, and
              primary interviews. Impact levels reflect a composite assessment of market size, rate of adoption,
              and potential to restructure existing value chains. Data is updated quarterly.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
