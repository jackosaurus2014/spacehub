'use client';

import { useState, useMemo, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ShareButton from '@/components/ui/ShareButton';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type VehicleFilter = 'all' | 'active' | 'historical';
type SortKey = 'costPerKg' | 'totalCost' | 'payloadCapacity';

interface LaunchVehicleEcon {
  id: string;
  name: string;
  provider: string;
  country: string;
  status: 'active' | 'historical' | 'development';
  costPerKgLeo: number;
  costPerKgLeoHigh?: number; // for ranges like Starship $10-50
  totalLaunchCost: number; // millions USD
  payloadLeoKg: number;
  reusable: boolean;
  firstFlight: string;
  lastFlight?: string;
  barColor: string;
  // Deep dive data
  manufacturingCostM?: number;
  refurbishmentCostM?: number;
  launchesPerVehicle?: number;
  revenuePerLaunchM?: number;
  marginEstimate?: string;
  fleetSize?: number;
  backlog?: number;
  notes?: string;
}

interface RevenueModel {
  name: string;
  description: string;
  percentage: number; // of total market
  color: string;
  examples: string[];
}

interface CostEra {
  era: string;
  years: string;
  costPerKg: string;
  description: string;
  color: string;
  widthPct: number;
}

interface MarketStat {
  label: string;
  value: string;
  subtext: string;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const VEHICLES: LaunchVehicleEcon[] = [
  {
    id: 'space-shuttle',
    name: 'Space Shuttle',
    provider: 'NASA / Rockwell / Thiokol',
    country: 'United States',
    status: 'historical',
    costPerKgLeo: 54500,
    totalLaunchCost: 1500,
    payloadLeoKg: 27500,
    reusable: true,
    firstFlight: '1981',
    lastFlight: '2011',
    barColor: 'bg-red-500',
    manufacturingCostM: 1700,
    launchesPerVehicle: 33,
    revenuePerLaunchM: 0,
    marginEstimate: 'Government program (no margin)',
    fleetSize: 5,
    notes: 'Partially reusable (orbiter + SRBs). External tank expended each flight. Per-flight cost driven by workforce of ~13,000.',
  },
  {
    id: 'delta-iv-heavy',
    name: 'Delta IV Heavy',
    provider: 'ULA (Boeing heritage)',
    country: 'United States',
    status: 'historical',
    costPerKgLeo: 14000,
    totalLaunchCost: 400,
    payloadLeoKg: 28790,
    reusable: false,
    firstFlight: '2004',
    lastFlight: '2024',
    barColor: 'bg-orange-500',
    manufacturingCostM: 350,
    launchesPerVehicle: 1,
    revenuePerLaunchM: 400,
    marginEstimate: '10-15%',
    fleetSize: 0,
    backlog: 0,
    notes: 'Retired April 2024 after 16 flights. Primary customer was NRO for heavy national security payloads.',
  },
  {
    id: 'atlas-v',
    name: 'Atlas V',
    provider: 'ULA (Lockheed heritage)',
    country: 'United States',
    status: 'active',
    costPerKgLeo: 13200,
    totalLaunchCost: 250,
    payloadLeoKg: 18850,
    reusable: false,
    firstFlight: '2002',
    barColor: 'bg-amber-500',
    manufacturingCostM: 200,
    launchesPerVehicle: 1,
    revenuePerLaunchM: 250,
    marginEstimate: '12-18%',
    fleetSize: 0,
    backlog: 17,
    notes: 'Uses RD-180 Russian engine (stockpiled). Being phased out in favor of Vulcan Centaur. 100% mission success rate.',
  },
  {
    id: 'ariane-5',
    name: 'Ariane 5',
    provider: 'Arianespace / ArianeGroup',
    country: 'European Union',
    status: 'historical',
    costPerKgLeo: 10500,
    totalLaunchCost: 220,
    payloadLeoKg: 21000,
    reusable: false,
    firstFlight: '1996',
    lastFlight: '2023',
    barColor: 'bg-yellow-500',
    manufacturingCostM: 180,
    launchesPerVehicle: 1,
    revenuePerLaunchM: 220,
    marginEstimate: '5-10% (subsidized)',
    fleetSize: 0,
    backlog: 0,
    notes: 'Retired July 2023 after 117 flights. Replaced by Ariane 6. Dual-launch capability for GEO satellites was a market advantage.',
  },
  {
    id: 'electron',
    name: 'Electron',
    provider: 'Rocket Lab',
    country: 'United States / New Zealand',
    status: 'active',
    costPerKgLeo: 25000,
    totalLaunchCost: 7.5,
    payloadLeoKg: 300,
    reusable: false,
    firstFlight: '2017',
    barColor: 'bg-violet-500',
    manufacturingCostM: 5,
    launchesPerVehicle: 1,
    revenuePerLaunchM: 7.5,
    marginEstimate: '20-30% (growing)',
    fleetSize: 0,
    backlog: 30,
    notes: 'Small-sat dedicated launcher. High $/kg but provides dedicated orbit, timing, and inclination. Electron recovery program underway.',
  },
  {
    id: 'falcon-9-expendable',
    name: 'Falcon 9 (expendable)',
    provider: 'SpaceX',
    country: 'United States',
    status: 'active',
    costPerKgLeo: 2720,
    totalLaunchCost: 67,
    payloadLeoKg: 22800,
    reusable: false,
    firstFlight: '2010',
    barColor: 'bg-white',
    manufacturingCostM: 50,
    launchesPerVehicle: 1,
    revenuePerLaunchM: 67,
    marginEstimate: '25-35%',
    fleetSize: 0,
    backlog: 200,
    notes: 'Expendable config rarely used now. Full 22,800 kg to LEO capacity. Government missions sometimes require new boosters.',
  },
  {
    id: 'falcon-9-reusable',
    name: 'Falcon 9 (reusable)',
    provider: 'SpaceX',
    country: 'United States',
    status: 'active',
    costPerKgLeo: 1500,
    totalLaunchCost: 27,
    payloadLeoKg: 17500,
    reusable: true,
    firstFlight: '2015',
    barColor: 'bg-blue-500',
    manufacturingCostM: 50,
    refurbishmentCostM: 2,
    launchesPerVehicle: 20,
    revenuePerLaunchM: 67,
    marginEstimate: '50-70%',
    fleetSize: 15,
    backlog: 200,
    notes: 'Dominant vehicle globally. B1062 reached 23 flights. Internal Starlink launches at marginal cost (~$15M). Fairing recovery saves ~$6M.',
  },
  {
    id: 'falcon-heavy',
    name: 'Falcon Heavy',
    provider: 'SpaceX',
    country: 'United States',
    status: 'active',
    costPerKgLeo: 1400,
    totalLaunchCost: 97,
    payloadLeoKg: 63800,
    reusable: true,
    firstFlight: '2018',
    barColor: 'bg-blue-400',
    manufacturingCostM: 150,
    refurbishmentCostM: 6,
    launchesPerVehicle: 10,
    revenuePerLaunchM: 97,
    marginEstimate: '40-50%',
    fleetSize: 5,
    backlog: 15,
    notes: 'Three Falcon 9 cores strapped together. Most powerful operational rocket. Government price ~$150M for expendable national security missions.',
  },
  {
    id: 'vulcan-centaur',
    name: 'Vulcan Centaur',
    provider: 'ULA',
    country: 'United States',
    status: 'active',
    costPerKgLeo: 4000,
    totalLaunchCost: 110,
    payloadLeoKg: 27200,
    reusable: false,
    firstFlight: '2024',
    barColor: 'bg-teal-500',
    manufacturingCostM: 85,
    launchesPerVehicle: 1,
    revenuePerLaunchM: 110,
    marginEstimate: '15-20%',
    fleetSize: 0,
    backlog: 70,
    notes: 'Atlas V / Delta IV replacement. BE-4 engines from Blue Origin. NSSL Phase 2 contract winner (60% ULA / 40% SpaceX). SMART reuse planned for future.',
  },
  {
    id: 'new-glenn',
    name: 'New Glenn',
    provider: 'Blue Origin',
    country: 'United States',
    status: 'active',
    costPerKgLeo: 3000,
    totalLaunchCost: 135,
    payloadLeoKg: 45000,
    reusable: true,
    firstFlight: '2025',
    barColor: 'bg-indigo-500',
    manufacturingCostM: 200,
    refurbishmentCostM: 10,
    launchesPerVehicle: 25,
    revenuePerLaunchM: 135,
    marginEstimate: 'TBD (early ops)',
    fleetSize: 2,
    backlog: 25,
    notes: 'First flight January 2025. Reusable first stage (7m diameter). NSSL Phase 2 Lane 1 awardee. BE-4 engines (same as Vulcan). Kuiper constellation primary launcher.',
  },
  {
    id: 'starship',
    name: 'Starship',
    provider: 'SpaceX',
    country: 'United States',
    status: 'development',
    costPerKgLeo: 10,
    costPerKgLeoHigh: 50,
    totalLaunchCost: 10,
    payloadLeoKg: 150000,
    reusable: true,
    firstFlight: '2025',
    barColor: 'bg-emerald-500',
    manufacturingCostM: 100,
    refurbishmentCostM: 1,
    launchesPerVehicle: 100,
    revenuePerLaunchM: 10,
    marginEstimate: 'TBD (target >50%)',
    fleetSize: 0,
    backlog: 0,
    notes: 'Fully reusable super heavy-lift. Chopstick catch system for booster. Target: airline-like operations. HLS variant for NASA Artemis. Massive Starlink V2 deployer.',
  },
];

const REVENUE_MODELS: RevenueModel[] = [
  {
    name: 'Government Contracts',
    description: 'NASA, DoD, NRO, and allied government missions. Highest per-launch revenue with firm fixed-price or cost-plus contracts.',
    percentage: 35,
    color: 'bg-blue-500',
    examples: ['NASA CRS/CCP ($3.5B)', 'NSSL Phase 2 ($5.6B)', 'NRO classified missions', 'ESA institutional launches'],
  },
  {
    name: 'Commercial GEO Satellites',
    description: 'Communications and broadcasting satellites to geostationary orbit. Traditional backbone of the launch market, now declining as LEO constellations grow.',
    percentage: 20,
    color: 'bg-purple-500',
    examples: ['SES O3b mPOWER', 'Intelsat fleet renewal', 'Eutelsat HOTBIRD', 'Arabsat BADR'],
  },
  {
    name: 'Rideshare / Small Sat',
    description: 'Dedicated and shared rides for small satellites (1-500 kg). Transporter missions launching 50+ satellites per flight.',
    percentage: 10,
    color: 'bg-white',
    examples: ['SpaceX Transporter ($1M per 200kg)', 'Rocket Lab Electron ($7.5M)', 'ISRO PSLV rideshare', 'Exolaunch brokerage'],
  },
  {
    name: 'Internal Constellations',
    description: 'Vertically integrated operators launching their own satellite fleets. Largest growth segment by launch count.',
    percentage: 25,
    color: 'bg-emerald-500',
    examples: ['SpaceX Starlink (~6,000 sats)', 'Amazon Kuiper (3,236 planned)', 'OneWeb (648 sats)', 'China SatNet (13,000 planned)'],
  },
  {
    name: 'Space Tourism',
    description: 'Suborbital and orbital human spaceflight for private customers. Premium pricing but low flight rate.',
    percentage: 5,
    color: 'bg-pink-500',
    examples: ['SpaceX Inspiration4 / Polaris', 'Blue Origin New Shepard', 'Virgin Galactic Unity', 'Axiom ISS missions (~$55M/seat)'],
  },
  {
    name: 'Point-to-Point Cargo',
    description: 'Earth-to-Earth logistics using rockets for time-critical delivery. Still largely theoretical but attracting military interest.',
    percentage: 5,
    color: 'bg-amber-500',
    examples: ['USTRANSCOM Rocket Cargo program', 'SpaceX Starship P2P concept', 'Phantom Space cargo', 'Military rapid global delivery'],
  },
];

const COST_ERAS: CostEra[] = [
  {
    era: 'Space Shuttle Era',
    years: '1981 - 2011',
    costPerKg: '$54,500/kg',
    description: 'Government-operated, partially reusable. Massive standing workforce drove per-flight costs above $1B despite reusability.',
    color: 'border-red-500 bg-red-500/10',
    widthPct: 100,
  },
  {
    era: 'EELV Era',
    years: '2000s - 2020s',
    costPerKg: '$10,000 - $15,000/kg',
    description: 'Atlas V and Delta IV under ULA monopoly. Reliable but expensive expendable rockets. Cost-plus contracting limited cost reduction incentives.',
    color: 'border-orange-500 bg-orange-500/10',
    widthPct: 27,
  },
  {
    era: 'SpaceX Disruption',
    years: '2013 - 2023',
    costPerKg: '$2,720/kg',
    description: 'Falcon 9 slashed prices by 80%. First orbital booster landing (2015), routine reuse by 2018. Forced industry-wide price cuts.',
    color: 'border-white/15 bg-white/5',
    widthPct: 5,
  },
  {
    era: 'Reusability Revolution',
    years: '2024+',
    costPerKg: '$1,500/kg',
    description: 'Proven Falcon 9 boosters flying 20+ times. New Glenn entering service. Marginal cost of reused booster approaches zero.',
    color: 'border-blue-500 bg-blue-500/10',
    widthPct: 2.7,
  },
  {
    era: 'Starship Era',
    years: '2025+',
    costPerKg: '$10 - $50/kg (target)',
    description: 'Fully reusable super heavy-lift. If targets met, launch cost drops 100x from today. Enables space industrialization, Mars colonization.',
    color: 'border-emerald-500 bg-emerald-500/10',
    widthPct: 0.1,
  },
];

const MARKET_STATS: MarketStat[] = [
  { label: '2024 Global Launch Market', value: '$9.1B', subtext: 'Total addressable market for orbital launch services' },
  { label: '2030 Market Forecast', value: '$32B', subtext: 'CAGR of ~23% driven by constellation deployments' },
  { label: '2025 Launch Cadence', value: '200+', subtext: 'Orbital launch attempts expected globally' },
  { label: 'SpaceX Market Share', value: '~65%', subtext: 'By number of orbital launches (2024)' },
];

const GROWTH_DRIVERS = [
  { driver: 'Mega-constellations', detail: 'Starlink, Kuiper, SatNet, and others need thousands of launches over the next decade' },
  { driver: 'National security demand', detail: 'DoD Space Development Agency proliferated LEO architecture requires rapid deployment' },
  { driver: 'Commercial space stations', detail: 'Axiom, Orbital Reef, and Starlab replacing ISS by 2030' },
  { driver: 'Lunar economy', detail: 'Artemis, CLPS, and commercial lunar landers driving beyond-LEO demand' },
  { driver: 'In-space manufacturing', detail: 'Pharmaceuticals, fiber optics, and advanced materials in microgravity' },
  { driver: 'Falling launch costs', detail: 'Lower prices unlock previously uneconomical use cases (SAR, IoT, AIS)' },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function LaunchEconomicsPage() {
  const [filter, setFilter] = useState<VehicleFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('costPerKg');
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  const toggleVehicle = useCallback((id: string) => {
    setExpandedVehicle(prev => (prev === id ? null : id));
  }, []);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    let result = [...VEHICLES];

    if (filter === 'active') {
      result = result.filter(v => v.status === 'active' || v.status === 'development');
    } else if (filter === 'historical') {
      result = result.filter(v => v.status === 'historical');
    }

    // Sort
    result.sort((a, b) => {
      switch (sortKey) {
        case 'costPerKg':
          return a.costPerKgLeo - b.costPerKgLeo;
        case 'totalCost':
          return a.totalLaunchCost - b.totalLaunchCost;
        case 'payloadCapacity':
          return b.payloadLeoKg - a.payloadLeoKg;
        default:
          return 0;
      }
    });

    return result;
  }, [filter, sortKey]);

  // For the bar chart, we need a max value
  const maxCostPerKg = useMemo(() => {
    return Math.max(...filteredVehicles.map(v => v.costPerKgLeo));
  }, [filteredVehicles]);

  // Top 5 vehicles for deep dive (currently active/development only)
  const deepDiveVehicles = useMemo(() => {
    return VEHICLES
      .filter(v => v.status === 'active' || v.status === 'development')
      .sort((a, b) => a.costPerKgLeo - b.costPerKgLeo)
      .slice(0, 5);
  }, []);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumbs */}

        {/* Header */}
        <AnimatedPageHeader
          title="Space Launch Economics"
          subtitle="Comprehensive cost analysis of orbital launch vehicles. Compare cost per kilogram, track industry trends, and understand the business of getting to space."
          accentColor="cyan"
        />

        <div className="flex justify-end mb-4">
          <ShareButton
            title="Space Launch Economics - SpaceNexus"
            description="Comprehensive cost analysis of orbital launch vehicles. Compare cost per kilogram and track industry trends."
          />
        </div>

        {/* ── Filter & Sort Controls ──────────────── */}
        <ScrollReveal>
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-medium">Filter:</span>
            {(['all', 'active', 'historical'] as VehicleFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 ${
                  filter === f
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {f === 'all' ? 'All Vehicles' : f === 'active' ? 'Currently Active' : 'Historical'}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-medium">Sort:</span>
            {([
              { key: 'costPerKg' as SortKey, label: 'Cost/kg' },
              { key: 'totalCost' as SortKey, label: 'Total Cost' },
              { key: 'payloadCapacity' as SortKey, label: 'Payload' },
            ]).map(s => (
              <button
                key={s.key}
                onClick={() => setSortKey(s.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 ${
                  sortKey === s.key
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        </ScrollReveal>

        {/* ══════════════════════════════════════════
            1. COST PER KILOGRAM COMPARISON
           ══════════════════════════════════════════ */}
        <ScrollReveal delay={0.1}>
        <section className="card p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-2">Cost Per Kilogram to LEO</h2>
          <p className="text-sm text-slate-400 mb-6">
            Comparison of launch cost per kilogram to Low Earth Orbit across vehicles.
            {sortKey !== 'costPerKg' && ' Sorted by ' + (sortKey === 'totalCost' ? 'total launch cost' : 'payload capacity') + '.'}
          </p>

          <div className="space-y-3">
            {filteredVehicles.map(vehicle => {
              const barWidth = Math.max(2, (vehicle.costPerKgLeo / maxCostPerKg) * 100);
              const isRange = vehicle.costPerKgLeoHigh !== undefined;
              const costLabel = isRange
                ? `$${formatNumber(vehicle.costPerKgLeo)} - $${formatNumber(vehicle.costPerKgLeoHigh!)}/kg`
                : `$${formatNumber(vehicle.costPerKgLeo)}/kg`;

              return (
                <div key={vehicle.id} className="group">
                  <div className="flex items-center gap-3 md:gap-4">
                    {/* Vehicle name */}
                    <div className="w-40 md:w-52 flex-shrink-0 text-right">
                      <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                        {vehicle.name}
                      </span>
                      {vehicle.status === 'historical' && (
                        <span className="ml-1.5 text-[10px] text-slate-500 uppercase tracking-wider">Retired</span>
                      )}
                      {vehicle.status === 'development' && (
                        <span className="ml-1.5 text-[10px] text-amber-500 uppercase tracking-wider">Target</span>
                      )}
                    </div>

                    {/* Bar */}
                    <div className="flex-1 relative">
                      <div className="h-8 bg-slate-800/40 rounded-lg overflow-hidden">
                        <div
                          className={`h-full ${vehicle.barColor} rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2`}
                          style={{ width: `${barWidth}%`, minWidth: '60px' }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-md whitespace-nowrap">
                            {costLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover detail line */}
                  <div className="flex items-center gap-3 md:gap-4 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-40 md:w-52 flex-shrink-0" />
                    <div className="flex-1 flex items-center gap-4 text-[11px] text-slate-500 pl-1">
                      <span>Payload: {formatNumber(vehicle.payloadLeoKg)} kg LEO</span>
                      <span>Launch Cost: ${vehicle.totalLaunchCost}M</span>
                      <span>{vehicle.reusable ? 'Reusable' : 'Expendable'}</span>
                      <span>{vehicle.provider}</span>
                    </div>

        <RelatedModules modules={PAGE_RELATIONS['launch-economics']} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-slate-700/50 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Historical (Retired)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white inline-block" /> Currently Active</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> In Development</span>
          </div>
        </section>
        </ScrollReveal>

        {/* ══════════════════════════════════════════
            2. COST TREND TIMELINE
           ══════════════════════════════════════════ */}
        <ScrollReveal delay={0.2}>
        <section className="card p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-2">Cost Trend Timeline</h2>
          <p className="text-sm text-slate-400 mb-6">
            How the cost to reach Low Earth Orbit has declined over decades, from $54,500/kg to a target of $10/kg.
          </p>

          <div className="space-y-4">
            {COST_ERAS.map((era, index) => (
              <div key={era.era} className={`border-l-4 ${era.color} rounded-r-xl p-4 md:p-5`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{era.era}</h3>
                    <span className="text-xs text-slate-400">{era.years}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-300">{era.costPerKg}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-3">{era.description}</p>
                {/* Visual relative cost bar */}
                <div className="relative h-3 bg-slate-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-white/80 to-blue-500/60 transition-all duration-1000"
                    style={{ width: `${Math.max(1, era.widthPct)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                  <span>$0</span>
                  <span>$54,500/kg</span>
                </div>
                {index < COST_ERAS.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-300">
            <strong>Key insight:</strong> If Starship achieves its $10-50/kg target, the cost reduction from Shuttle
            to Starship represents a <strong>1,000-5,000x decrease</strong> -- comparable to the drop in computing
            costs over the same period.
          </div>
        </section>
        </ScrollReveal>

        {/* ══════════════════════════════════════════
            3. REVENUE MODEL ANALYSIS
           ══════════════════════════════════════════ */}
        <section className="card p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-2">Revenue Model Analysis</h2>
          <p className="text-sm text-slate-400 mb-6">
            How launch providers generate revenue. Market share by revenue source (2024 estimates).
          </p>

          {/* Stacked bar */}
          <div className="h-10 flex rounded-xl overflow-hidden mb-6">
            {REVENUE_MODELS.map(model => (
              <div
                key={model.name}
                className={`${model.color} relative group cursor-default transition-all duration-200 hover:brightness-125`}
                style={{ width: `${model.percentage}%` }}
                title={`${model.name}: ${model.percentage}%`}
              >
                {model.percentage >= 10 && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {model.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REVENUE_MODELS.map(model => (
              <div
                key={model.name}
                className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 hover:border-slate-600/60 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${model.color} flex-shrink-0`} />
                  <h3 className="text-sm font-bold text-slate-100">{model.name}</h3>
                  <span className="ml-auto text-sm font-bold text-slate-300">{model.percentage}%</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{model.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {model.examples.map(ex => (
                    <span key={ex} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            4. MARKET SIZE & GROWTH
           ══════════════════════════════════════════ */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-6">Market Size & Growth</h2>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {MARKET_STATS.map(stat => (
              <div key={stat.label} className="card p-5 text-center">
                <p className="text-2xl md:text-3xl font-bold text-slate-300 mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-slate-200 mb-1">{stat.label}</p>
                <p className="text-xs text-slate-500">{stat.subtext}</p>
              </div>
            ))}
          </div>

          {/* Growth Drivers */}
          <div className="card p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Key Growth Drivers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GROWTH_DRIVERS.map((item, i) => (
                <div
                  key={item.driver}
                  className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg"
                >
                  <span className="text-slate-300 font-bold text-sm mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.driver}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Market projection visual */}
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Market Size Projection</h4>
              <div className="flex items-end gap-2 h-32">
                {[
                  { year: '2020', value: 5.3, color: 'bg-slate-600' },
                  { year: '2021', value: 5.8, color: 'bg-slate-600' },
                  { year: '2022', value: 6.5, color: 'bg-slate-500' },
                  { year: '2023', value: 7.7, color: 'bg-slate-500' },
                  { year: '2024', value: 9.1, color: 'bg-white' },
                  { year: '2025', value: 11.2, color: 'bg-white/80' },
                  { year: '2026', value: 14.0, color: 'bg-white/70' },
                  { year: '2027', value: 17.5, color: 'bg-white/60' },
                  { year: '2028', value: 21.5, color: 'bg-blue-500/60' },
                  { year: '2029', value: 26.0, color: 'bg-blue-500/50' },
                  { year: '2030', value: 32.0, color: 'bg-blue-500/40' },
                ].map(bar => (
                  <div key={bar.year} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">${bar.value}B</span>
                    <div
                      className={`w-full ${bar.color} rounded-t-md transition-all duration-500`}
                      style={{ height: `${(bar.value / 32) * 100}%` }}
                    />
                    <span className="text-[10px] text-slate-500">{bar.year}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            5. VEHICLE ECONOMICS DEEP DIVE
           ══════════════════════════════════════════ */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-2">Vehicle Economics Deep Dive</h2>
          <p className="text-sm text-slate-400 mb-6">
            Detailed economics for the top 5 active / upcoming vehicles. Click to expand.
          </p>

          <div className="space-y-3">
            {deepDiveVehicles.map(vehicle => {
              const isExpanded = expandedVehicle === vehicle.id;

              return (
                <div key={vehicle.id} className="card overflow-hidden">
                  {/* Header (always visible) */}
                  <button
                    onClick={() => toggleVehicle(vehicle.id)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${vehicle.barColor} flex-shrink-0`} />
                      <div>
                        <h3 className="text-base font-bold text-slate-100">{vehicle.name}</h3>
                        <p className="text-xs text-slate-400">{vehicle.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-300">
                          {vehicle.costPerKgLeoHigh
                            ? `$${formatNumber(vehicle.costPerKgLeo)}-$${formatNumber(vehicle.costPerKgLeoHigh)}/kg`
                            : `$${formatNumber(vehicle.costPerKgLeo)}/kg`
                          }
                        </p>
                        <p className="text-xs text-slate-500">${vehicle.totalLaunchCost}M per launch</p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-4 md:p-5 bg-slate-800/20">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {vehicle.manufacturingCostM !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Mfg. Cost</p>
                            <p className="text-sm font-bold text-slate-200">${vehicle.manufacturingCostM}M</p>
                          </div>
                        )}
                        {vehicle.refurbishmentCostM !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Refurb Cost</p>
                            <p className="text-sm font-bold text-slate-200">${vehicle.refurbishmentCostM}M</p>
                          </div>
                        )}
                        {vehicle.launchesPerVehicle !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Launches / Vehicle</p>
                            <p className="text-sm font-bold text-slate-200">
                              {vehicle.launchesPerVehicle === 1 ? '1 (expendable)' : `~${vehicle.launchesPerVehicle}`}
                            </p>
                          </div>
                        )}
                        {vehicle.revenuePerLaunchM !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Revenue / Launch</p>
                            <p className="text-sm font-bold text-slate-200">${vehicle.revenuePerLaunchM}M</p>
                          </div>
                        )}
                        {vehicle.marginEstimate && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Margin Est.</p>
                            <p className="text-sm font-bold text-emerald-400">{vehicle.marginEstimate}</p>
                          </div>
                        )}
                        {vehicle.fleetSize !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Fleet Size</p>
                            <p className="text-sm font-bold text-slate-200">{vehicle.fleetSize} boosters</p>
                          </div>
                        )}
                        {vehicle.backlog !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Backlog</p>
                            <p className="text-sm font-bold text-slate-200">{vehicle.backlog} missions</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Payload LEO</p>
                          <p className="text-sm font-bold text-slate-200">{formatNumber(vehicle.payloadLeoKg)} kg</p>
                        </div>
                      </div>

                      {/* Cost breakdown bar for reusable vehicles */}
                      {vehicle.reusable && vehicle.refurbishmentCostM !== undefined && vehicle.launchesPerVehicle && vehicle.launchesPerVehicle > 1 && (
                        <div className="mb-4 p-3 bg-slate-800/40 rounded-lg">
                          <p className="text-xs text-slate-400 mb-2 font-medium">Amortized Cost Per Flight</p>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex-1">
                              <div className="flex h-5 rounded overflow-hidden">
                                {(() => {
                                  const mfgPerFlight = (vehicle.manufacturingCostM || 0) / vehicle.launchesPerVehicle;
                                  const refurb = vehicle.refurbishmentCostM;
                                  const total = mfgPerFlight + refurb;
                                  const mfgPct = (mfgPerFlight / total) * 100;
                                  const refurbPct = (refurb / total) * 100;
                                  return (
                                    <>
                                      <div className="bg-blue-500 flex items-center justify-center text-white font-bold" style={{ width: `${mfgPct}%` }}>
                                        {mfgPct > 20 ? `$${mfgPerFlight.toFixed(1)}M` : ''}
                                      </div>
                                      <div className="bg-amber-500 flex items-center justify-center text-white font-bold" style={{ width: `${refurbPct}%` }}>
                                        {refurbPct > 20 ? `$${refurb}M` : ''}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="flex justify-between mt-1 text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Amortized Mfg.</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Refurbishment</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {vehicle.notes && (
                        <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                          <p className="text-xs text-slate-300 leading-relaxed">{vehicle.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Bottom CTA / Related Links ─────────── */}
        <section className="card p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Related Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: '/launch-vehicles', label: 'Launch Vehicle Database', desc: 'Specs, success rates, and comparisons' },
              { href: '/mission-cost', label: 'Mission Cost Calculator', desc: 'Estimate total mission cost' },
              { href: '/launch-cost-calculator', label: 'Launch Cost Calculator', desc: 'Quick cost estimation tool' },
              { href: '/unit-economics', label: 'Space Unit Economics', desc: 'Business model analysis' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                className="block p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl hover:border-white/15 hover:bg-slate-800/60 transition-all group"
              >
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{link.label}</p>
                <p className="text-xs text-slate-500 mt-1">{link.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* ── Explore More ── */}
        <section className="mt-16 border-t border-slate-800 pt-8">
          <h2 className="text-xl font-bold text-white mb-6">Explore More</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/launch-vehicles" className="card p-4 hover:border-white/15 transition-colors group">
              <h3 className="text-white font-medium group-hover:text-white transition-colors">Launch Vehicle Database</h3>
              <p className="text-slate-400 text-sm mt-1">Detailed specs, success rates, and comparisons for active and historical rockets.</p>
            </a>
            <a href="/funding-rounds" className="card p-4 hover:border-white/15 transition-colors group">
              <h3 className="text-white font-medium group-hover:text-white transition-colors">Funding Rounds</h3>
              <p className="text-slate-400 text-sm mt-1">Track venture capital and investment activity across the space industry.</p>
            </a>
            <a href="/mission-simulator" className="card p-4 hover:border-white/15 transition-colors group">
              <h3 className="text-white font-medium group-hover:text-white transition-colors">Mission Simulator</h3>
              <p className="text-slate-400 text-sm mt-1">Configure missions, calculate delta-V, and estimate costs with real vehicle data.</p>
            </a>
            <a href="/market-segments" className="card p-4 hover:border-white/15 transition-colors group">
              <h3 className="text-white font-medium group-hover:text-white transition-colors">Market Segments</h3>
              <p className="text-slate-400 text-sm mt-1">Analysis of space market segments including communications, EO, and defense.</p>
            </a>
          </div>
        </section>

        {/* Data disclaimer */}
        <p className="text-xs text-slate-600 text-center mt-8 mb-4">
          Data sourced from publicly available launch contracts, SEC filings, and industry estimates.
          Figures are approximate and intended for educational analysis. Last updated February 2026.
        </p>
      </div>
    </div>
  );
}
