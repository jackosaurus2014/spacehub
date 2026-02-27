'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { motion } from 'framer-motion';

// ── Market Segment Data ──────────────────────────────────────────────

interface MarketSegment {
  id: string;
  name: string;
  marketSize: number; // in billions USD
  cagr: number | null; // percentage, null for TBD
  cagrLabel: string;
  keyPlayers: string[];
  description: string;
  color: string;
  icon: string;
  maturity: 'nascent' | 'emerging' | 'growing' | 'mature';
}

const MARKET_SEGMENTS: MarketSegment[] = [
  {
    id: 'satcom',
    name: 'Satellite Communications',
    marketSize: 180,
    cagr: 8,
    cagrLabel: '8% CAGR',
    keyPlayers: ['Starlink', 'SES', 'Intelsat', 'Viasat'],
    description: 'Direct-to-home TV, broadband internet, mobile backhaul, and enterprise connectivity via GEO, MEO, and LEO satellite constellations.',
    color: 'from-blue-500 to-cyan-400',
    icon: '\uD83D\uDCE1',
    maturity: 'mature',
  },
  {
    id: 'earth-observation',
    name: 'Earth Observation',
    marketSize: 5.2,
    cagr: 12,
    cagrLabel: '12% CAGR',
    keyPlayers: ['Planet', 'Maxar', 'BlackSky', 'Spire'],
    description: 'Optical, SAR, and hyperspectral imagery for agriculture, climate monitoring, defense intelligence, and urban planning.',
    color: 'from-emerald-500 to-green-400',
    icon: '\uD83C\uDF0D',
    maturity: 'growing',
  },
  {
    id: 'launch-services',
    name: 'Launch Services',
    marketSize: 9.1,
    cagr: 15,
    cagrLabel: '15% CAGR',
    keyPlayers: ['SpaceX', 'Rocket Lab', 'Arianespace', 'ULA'],
    description: 'Dedicated and rideshare launch to LEO, GTO, and beyond. Reusable rockets are driving down cost-per-kg dramatically.',
    color: 'from-orange-500 to-amber-400',
    icon: '\uD83D\uDE80',
    maturity: 'growing',
  },
  {
    id: 'satellite-manufacturing',
    name: 'Satellite Manufacturing',
    marketSize: 19.5,
    cagr: 6,
    cagrLabel: '6% CAGR',
    keyPlayers: ['Airbus', 'Boeing', 'Northrop Grumman', 'L3Harris'],
    description: 'Design and assembly of communication, navigation, Earth observation, and science satellites across all orbit classes.',
    color: 'from-slate-400 to-zinc-300',
    icon: '\uD83D\uDEF0\uFE0F',
    maturity: 'mature',
  },
  {
    id: 'ground-equipment',
    name: 'Ground Equipment',
    marketSize: 65,
    cagr: 7,
    cagrLabel: '7% CAGR',
    keyPlayers: ['Hughes', 'Cobham', 'General Dynamics', 'Kratos'],
    description: 'Satellite receivers, user terminals, ground station antennas, VSATs, and signal processing equipment for commercial and government use.',
    color: 'from-violet-500 to-purple-400',
    icon: '\uD83D\uDCBB',
    maturity: 'mature',
  },
  {
    id: 'navigation-gnss',
    name: 'Navigation / GNSS',
    marketSize: 195,
    cagr: 10,
    cagrLabel: '10% CAGR',
    keyPlayers: ['GPS (USA)', 'Galileo (EU)', 'BeiDou (China)', 'Trimble'],
    description: 'Position, navigation, and timing services underpinning transport, precision agriculture, surveying, and autonomous systems.',
    color: 'from-sky-500 to-blue-400',
    icon: '\uD83D\uDDFA\uFE0F',
    maturity: 'mature',
  },
  {
    id: 'space-tourism',
    name: 'Space Tourism',
    marketSize: 0.8,
    cagr: 25,
    cagrLabel: '25% CAGR',
    keyPlayers: ['Virgin Galactic', 'Blue Origin', 'SpaceX', 'Axiom Space'],
    description: 'Suborbital and orbital tourism flights, space station visits, and emerging lunar tourism offerings for high-net-worth individuals.',
    color: 'from-pink-500 to-rose-400',
    icon: '\uD83C\uDF1F',
    maturity: 'emerging',
  },
  {
    id: 'in-space-services',
    name: 'In-Space Services',
    marketSize: 4.5,
    cagr: 20,
    cagrLabel: '20% CAGR',
    keyPlayers: ['Astroscale', 'Northrop (MEV)', 'Orbit Fab', 'ClearSpace'],
    description: 'On-orbit servicing, life extension, refueling, inspection, and active debris removal for LEO and GEO assets.',
    color: 'from-teal-500 to-cyan-400',
    icon: '\uD83D\uDD27',
    maturity: 'emerging',
  },
  {
    id: 'space-defense',
    name: 'Space Defense',
    marketSize: 52,
    cagr: 8,
    cagrLabel: '8% CAGR',
    keyPlayers: ['Lockheed Martin', 'Northrop Grumman', 'L3Harris', 'SDA'],
    description: 'Military satellite communications, missile warning, space domain awareness, and proliferated LEO defense architectures.',
    color: 'from-red-500 to-orange-400',
    icon: '\uD83D\uDEE1\uFE0F',
    maturity: 'mature',
  },
  {
    id: 'space-mining',
    name: 'Space Mining',
    marketSize: 0.1,
    cagr: 35,
    cagrLabel: '35% CAGR (projected)',
    keyPlayers: ['AstroForge', 'TransAstra', 'Karman+', 'Origin Space'],
    description: 'Nascent market targeting asteroid and lunar resource extraction for water, platinum-group metals, and in-situ construction materials.',
    color: 'from-amber-500 to-yellow-400',
    icon: '\u26CF\uFE0F',
    maturity: 'nascent',
  },
  {
    id: 'space-solar-power',
    name: 'Space-Based Solar Power',
    marketSize: 0.05,
    cagr: null,
    cagrLabel: 'Long-term play',
    keyPlayers: ['Caltech SSPP', 'ESA Solaris', 'Virtus Solis', 'Space Solar'],
    description: 'Collecting solar energy in orbit and beaming it to Earth via microwave or laser. Still in research/demo phase with Caltech prototype.',
    color: 'from-yellow-500 to-orange-300',
    icon: '\u2600\uFE0F',
    maturity: 'nascent',
  },
  {
    id: 'space-data-analytics',
    name: 'Space Data & Analytics',
    marketSize: 8.3,
    cagr: 14,
    cagrLabel: '14% CAGR',
    keyPlayers: ['Orbital Insight', 'Spire Global', 'Tomorrow.io', 'HawkEye 360'],
    description: 'Processing raw satellite data into actionable intelligence: weather forecasting, supply chain monitoring, RF analytics, and geospatial platforms.',
    color: 'from-indigo-500 to-blue-400',
    icon: '\uD83D\uDCCA',
    maturity: 'growing',
  },
];

const TOTAL_MARKET_2024 = 546;
const TOTAL_MARKET_2030 = 1100;

// ── Sort / Filter Options ────────────────────────────────────────────

type SortKey = 'size-desc' | 'size-asc' | 'growth-desc' | 'growth-asc' | 'name-asc' | 'name-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'size-desc', label: 'Market Size (High to Low)' },
  { value: 'size-asc', label: 'Market Size (Low to High)' },
  { value: 'growth-desc', label: 'Growth Rate (High to Low)' },
  { value: 'growth-asc', label: 'Growth Rate (Low to High)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
];

type MaturityFilter = 'all' | 'nascent' | 'emerging' | 'growing' | 'mature';

const MATURITY_OPTIONS: { value: MaturityFilter; label: string }[] = [
  { value: 'all', label: 'All Stages' },
  { value: 'nascent', label: 'Nascent' },
  { value: 'emerging', label: 'Emerging' },
  { value: 'growing', label: 'Growing' },
  { value: 'mature', label: 'Mature' },
];

// ── Key Trends Data ──────────────────────────────────────────────────

const KEY_TRENDS = [
  {
    title: 'Democratization of Access',
    description: 'Launch costs have dropped from $54,500/kg (Space Shuttle) to under $2,700/kg (Falcon 9), opening space to startups, universities, and developing nations. Small-sat launchers are pushing costs even lower.',
    icon: '\uD83C\uDF10',
  },
  {
    title: 'LEO Mega-Constellations',
    description: 'Starlink (6,000+ active sats), Amazon Kuiper, and OneWeb are reshaping global connectivity. By 2030, over 50,000 commercial satellites could be in LEO, driving demand across manufacturing, launch, and ground segments.',
    icon: '\uD83D\uDCE1',
  },
  {
    title: 'The In-Space Economy',
    description: 'On-orbit servicing, refueling, manufacturing, and debris removal are creating a self-sustaining space economy. Orbit Fab\'s fuel depots and Astroscale\'s debris removal missions signal a new era of space infrastructure.',
    icon: '\uD83C\uDFED',
  },
  {
    title: 'Defense Proliferation',
    description: 'The Space Development Agency is deploying hundreds of LEO satellites for missile tracking and tactical data transport. Space is now recognized as a warfighting domain by all major powers.',
    icon: '\uD83D\uDEE1\uFE0F',
  },
  {
    title: 'AI-Powered Analytics',
    description: 'Machine learning is unlocking the value of petabytes of satellite data. Real-time change detection, predictive analytics, and automated monitoring are driving the space data segment\'s 14% CAGR.',
    icon: '\uD83E\uDD16',
  },
  {
    title: 'Commercial Space Stations',
    description: 'With ISS retirement planned for ~2030, Axiom, Vast, and Orbital Reef are building commercial replacements. These will serve as research labs, manufacturing facilities, and tourism destinations.',
    icon: '\uD83C\uDFE2',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatMarketSize(size: number): string {
  if (size >= 1) return `$${size}B`;
  return `$${(size * 1000).toFixed(0)}M`;
}

function getMaturityColor(maturity: string): string {
  switch (maturity) {
    case 'nascent': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'emerging': return 'text-pink-400 bg-pink-400/10 border-pink-400/30';
    case 'growing': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'mature': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  }
}

// ── Components ───────────────────────────────────────────────────────

function TotalMarketBanner() {
  const growthPercent = ((TOTAL_MARKET_2030 - TOTAL_MARKET_2024) / TOTAL_MARKET_2024 * 100).toFixed(0);

  return (
    <ScrollReveal>
      <div className="card p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Global Space Economy (2024)</p>
            <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              ${TOTAL_MARKET_2024}B
            </p>
          </div>

          <div className="hidden md:block h-16 w-px bg-slate-700" />

          <div className="flex items-center gap-4">
            <svg className="w-6 h-6 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div>
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Projected by 2030</p>
              <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                ${(TOTAL_MARKET_2030 / 1000).toFixed(1)}T
              </p>
            </div>
          </div>

          <div className="hidden md:block h-16 w-px bg-slate-700" />

          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Growth</p>
            <p className="text-2xl font-bold text-emerald-400">+{growthPercent}%</p>
            <p className="text-xs text-slate-500">over 6 years</p>
          </div>
        </div>

        {/* Progress bar showing current vs 2030 */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>2024: ${TOTAL_MARKET_2024}B</span>
            <span>2030 Target: ${(TOTAL_MARKET_2030 / 1000).toFixed(1)}T</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(TOTAL_MARKET_2024 / TOTAL_MARKET_2030) * 100}%` }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

function SegmentCard({ segment }: { segment: MarketSegment }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card p-5 flex flex-col cursor-pointer group"
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{segment.icon}</span>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
            {segment.name}
          </h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${getMaturityColor(segment.maturity)}`}>
          {segment.maturity}
        </span>
      </div>

      {/* Market size & CAGR */}
      <div className="flex items-end gap-4 mb-3">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Market Size</p>
          <p className={`text-2xl font-bold bg-gradient-to-r ${segment.color} bg-clip-text text-transparent`}>
            {formatMarketSize(segment.marketSize)}
          </p>
        </div>
        {segment.cagr !== null && (
          <div className="mb-1">
            <p className="text-xs text-slate-500 mb-0.5">Growth</p>
            <p className="text-sm font-semibold text-emerald-400">{segment.cagrLabel}</p>
          </div>
        )}
        {segment.cagr === null && (
          <div className="mb-1">
            <p className="text-xs text-slate-500 mb-0.5">Growth</p>
            <p className="text-sm font-semibold text-amber-400">{segment.cagrLabel}</p>
          </div>
        )}
      </div>

      {/* Market size bar relative to largest segment */}
      <div className="mb-3">
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${segment.color} rounded-full transition-all duration-700`}
            style={{ width: `${Math.max((segment.marketSize / 195) * 100, 2)}%` }}
          />
        </div>
      </div>

      {/* Key Players */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {segment.keyPlayers.map((player) => (
          <span key={player} className="text-xs px-2 py-0.5 bg-slate-800/80 text-slate-300 rounded-md border border-slate-700/50">
            {player}
          </span>
        ))}
      </div>

      {/* Expandable description */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <p className="text-sm text-slate-400 leading-relaxed pt-2 border-t border-slate-700/50">
          {segment.description}
        </p>
      </motion.div>

      {/* Expand hint */}
      <div className="mt-auto pt-2 text-center">
        <svg
          className={`w-4 h-4 text-slate-600 mx-auto transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function TreemapVisualization({ segments }: { segments: MarketSegment[] }) {
  // Sort by market size descending for treemap layout
  const sorted = [...segments].sort((a, b) => b.marketSize - a.marketSize);
  const totalSize = sorted.reduce((sum, s) => sum + s.marketSize, 0);

  return (
    <ScrollReveal>
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Market Size Treemap</h2>
        <p className="text-sm text-slate-400 mb-4">
          Area proportional to segment market size. Hover or tap for details.
        </p>

        <div className="flex flex-wrap gap-1.5 min-h-[320px]">
          {sorted.map((segment) => {
            const pct = (segment.marketSize / totalSize) * 100;
            // Compute approximate dimensions — wider blocks for bigger segments
            const minWidth = Math.max(pct * 2.5, 8);

            return (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={`relative bg-gradient-to-br ${segment.color} rounded-lg overflow-hidden group cursor-default`}
                style={{
                  flexBasis: `${minWidth}%`,
                  flexGrow: pct,
                  minHeight: pct > 10 ? '140px' : pct > 3 ? '100px' : '70px',
                }}
                title={`${segment.name}: ${formatMarketSize(segment.marketSize)} (${pct.toFixed(1)}% of tracked segments)`}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="relative p-3 h-full flex flex-col justify-between">
                  <div>
                    <span className="text-lg">{segment.icon}</span>
                    <p className={`font-semibold text-white ${pct > 10 ? 'text-sm' : 'text-xs'}`}>
                      {segment.name}
                    </p>
                  </div>
                  <div>
                    <p className={`font-bold text-white ${pct > 10 ? 'text-lg' : 'text-sm'}`}>
                      {formatMarketSize(segment.marketSize)}
                    </p>
                    <p className="text-xs text-white/70">{pct.toFixed(1)}%</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </ScrollReveal>
  );
}

function GrowthMatrix({ segments }: { segments: MarketSegment[] }) {
  // Plot segments on a size (x) vs growth (y) matrix
  // X axis: market size (log scale conceptual), Y axis: CAGR
  const maxCagr = 35;
  const maxLogSize = Math.log10(200); // ~195B is max

  return (
    <ScrollReveal>
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-100 mb-2">Growth Matrix</h2>
        <p className="text-sm text-slate-400 mb-6">
          Segments plotted by market size (horizontal) vs. growth rate (vertical). Bubble size represents relative market value.
        </p>

        <div className="relative" style={{ height: '380px' }}>
          {/* Grid lines */}
          <div className="absolute inset-0">
            {/* Horizontal grid lines (growth rates) */}
            {[0, 10, 20, 30].map((rate) => {
              const bottom = (rate / maxCagr) * 100;
              return (
                <div key={rate} className="absolute left-10 right-0" style={{ bottom: `${bottom}%` }}>
                  <div className="border-t border-slate-800 w-full" />
                  <span className="absolute -left-10 -top-2.5 text-xs text-slate-600 w-8 text-right">{rate}%</span>
                </div>
              );
            })}
          </div>

          {/* Y axis label */}
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-500 whitespace-nowrap tracking-wider">
            CAGR
          </div>

          {/* X axis label */}
          <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-xs text-slate-500 tracking-wider">
            Market Size (log scale)
          </div>

          {/* Bubbles */}
          {segments.map((segment) => {
            const cagr = segment.cagr ?? 5; // position TBD segments low
            const yPos = (cagr / maxCagr) * 100;
            const xPos = segment.marketSize > 0
              ? (Math.log10(segment.marketSize * 1000) / (maxLogSize + Math.log10(1000))) * 100
              : 5;
            // Bubble size based on market size, min 24px, max 80px
            const bubbleSize = Math.max(24, Math.min(80, Math.sqrt(segment.marketSize) * 8));

            return (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`absolute bg-gradient-to-br ${segment.color} rounded-full flex items-center justify-center cursor-default group z-10`}
                style={{
                  left: `${Math.max(8, Math.min(92, xPos))}%`,
                  bottom: `${Math.max(4, Math.min(92, yPos))}%`,
                  width: `${bubbleSize}px`,
                  height: `${bubbleSize}px`,
                  transform: 'translate(-50%, 50%)',
                  opacity: 0.85,
                }}
                title={`${segment.name}: ${formatMarketSize(segment.marketSize)}, ${segment.cagrLabel}`}
              >
                <span className={`${bubbleSize > 40 ? 'text-base' : 'text-xs'}`}>{segment.icon}</span>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                  <p className="font-semibold text-slate-100">{segment.name}</p>
                  <p className="text-slate-400">{formatMarketSize(segment.marketSize)} | {segment.cagrLabel}</p>
                </div>
              </motion.div>
            );
          })}

          {/* Quadrant labels */}
          <div className="absolute top-2 right-3 text-[10px] text-slate-700 uppercase tracking-wider">High Growth / Large Market</div>
          <div className="absolute top-2 left-12 text-[10px] text-slate-700 uppercase tracking-wider">High Growth / Small Market</div>
          <div className="absolute bottom-2 right-3 text-[10px] text-slate-700 uppercase tracking-wider">Low Growth / Large Market</div>
          <div className="absolute bottom-2 left-12 text-[10px] text-slate-700 uppercase tracking-wider">Low Growth / Small Market</div>
        </div>

        {/* Legend */}
        <div className="mt-8 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap gap-3">
            {segments.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <span className="text-sm">{s.icon}</span>
                <span className="text-xs text-slate-500">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

function KeyTrendsSection() {
  return (
    <ScrollReveal>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Key Industry Trends</h2>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {KEY_TRENDS.map((trend) => (
            <StaggerItem key={trend.title}>
              <div className="card p-5 h-full">
                <span className="text-2xl mb-3 block">{trend.icon}</span>
                <h3 className="text-base font-semibold text-slate-100 mb-2">{trend.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{trend.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </ScrollReveal>
  );
}

function InvestmentInsights() {
  return (
    <ScrollReveal>
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Investment Landscape</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">Highest CAGR Segments</p>
            <ol className="space-y-2">
              {MARKET_SEGMENTS
                .filter(s => s.cagr !== null)
                .sort((a, b) => (b.cagr ?? 0) - (a.cagr ?? 0))
                .slice(0, 4)
                .map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600 font-mono">{i + 1}.</span>
                    <span>{s.icon}</span>
                    <span className="text-slate-300">{s.name}</span>
                    <span className="ml-auto text-emerald-400 font-semibold">{s.cagr}%</span>
                  </li>
                ))}
            </ol>
          </div>

          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">Largest Market Segments</p>
            <ol className="space-y-2">
              {[...MARKET_SEGMENTS]
                .sort((a, b) => b.marketSize - a.marketSize)
                .slice(0, 4)
                .map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600 font-mono">{i + 1}.</span>
                    <span>{s.icon}</span>
                    <span className="text-slate-300">{s.name}</span>
                    <span className="ml-auto text-cyan-400 font-semibold">{formatMarketSize(s.marketSize)}</span>
                  </li>
                ))}
            </ol>
          </div>

          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">Emerging Opportunities</p>
            <ol className="space-y-2">
              {MARKET_SEGMENTS
                .filter(s => s.maturity === 'nascent' || s.maturity === 'emerging')
                .sort((a, b) => (b.cagr ?? 0) - (a.cagr ?? 0))
                .map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600 font-mono">{i + 1}.</span>
                    <span>{s.icon}</span>
                    <span className="text-slate-300">{s.name}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded border ${getMaturityColor(s.maturity)}`}>{s.maturity}</span>
                  </li>
                ))}
            </ol>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function MarketSegmentsPage() {
  const [sortKey, setSortKey] = useState<SortKey>('size-desc');
  const [maturityFilter, setMaturityFilter] = useState<MaturityFilter>('all');

  const filteredSegments = useMemo(() => {
    let result = [...MARKET_SEGMENTS];

    // Filter
    if (maturityFilter !== 'all') {
      result = result.filter(s => s.maturity === maturityFilter);
    }

    // Sort
    switch (sortKey) {
      case 'size-desc':
        result.sort((a, b) => b.marketSize - a.marketSize);
        break;
      case 'size-asc':
        result.sort((a, b) => a.marketSize - b.marketSize);
        break;
      case 'growth-desc':
        result.sort((a, b) => (b.cagr ?? 0) - (a.cagr ?? 0));
        break;
      case 'growth-asc':
        result.sort((a, b) => (a.cagr ?? 0) - (b.cagr ?? 0));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return result;
  }, [sortKey, maturityFilter]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[
          { label: 'Market Intelligence', href: '/market-intel' },
          { label: 'Market Segments' },
        ]} />

        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Market Segments"
          subtitle="Breaking down the global space economy into 12 investable market segments with size, growth rates, key players, and trend analysis."
          icon={<span className="text-4xl">{'\uD83D\uDCC8'}</span>}
          accentColor="cyan"
        />

        {/* Total Market Banner */}
        <TotalMarketBanner />

        {/* Filter & Sort Controls */}
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-slate-400 whitespace-nowrap">Sort by:</label>
              <select
                id="sort-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="maturity-select" className="text-sm text-slate-400 whitespace-nowrap">Stage:</label>
              <select
                id="maturity-select"
                value={maturityFilter}
                onChange={(e) => setMaturityFilter(e.target.value as MaturityFilter)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                {MATURITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-sm text-slate-500 self-center">
              {filteredSegments.length} of {MARKET_SEGMENTS.length} segments
            </div>
          </div>
        </ScrollReveal>

        {/* Segment Cards Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {filteredSegments.map((segment) => (
            <StaggerItem key={segment.id}>
              <SegmentCard segment={segment} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {filteredSegments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No segments match the current filter.</p>
            <button
              onClick={() => setMaturityFilter('all')}
              className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Treemap Visualization */}
        <TreemapVisualization segments={MARKET_SEGMENTS} />

        {/* Growth Matrix */}
        <GrowthMatrix segments={MARKET_SEGMENTS} />

        {/* Investment Insights */}
        <InvestmentInsights />

        {/* Key Trends Section */}
        <KeyTrendsSection />

        {/* Source Attribution */}
        <ScrollReveal>
          <div className="card p-5 mt-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-400">Data Sources & Notes:</strong> Market size estimates compiled from SIA State of the Satellite Industry Report 2024, Euroconsult, Morgan Stanley Space Economy research, BryceTech, and Northern Sky Research. CAGR projections reflect consensus analyst estimates through 2030. Actual market sizes vary by source and methodology. The $546B total reflects the 2024 global space economy per the Space Foundation; individual segment sizes above may not sum exactly due to classification differences and overlap.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
