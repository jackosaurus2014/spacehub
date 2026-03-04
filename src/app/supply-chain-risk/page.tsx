'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ============================================================================
// TYPES
// ============================================================================

type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
type SortOption = 'risk-desc' | 'risk-asc' | 'lead-time' | 'category';

interface RiskCategory {
  id: string;
  name: string;
  score: number;
  icon: string;
  description: string;
  items: string[];
}

interface WatchListItem {
  name: string;
  supplier: string;
  risk: RiskLevel;
  notes: string;
}

interface LeadTimeItem {
  component: string;
  minWeeks: number;
  maxWeeks: number;
  category: string;
}

// ============================================================================
// DATA
// ============================================================================

const OVERALL_SCORE = 6.8;
const OVERALL_TREND = +0.3;
const MAX_SCORE = 10;

const RISK_CATEGORIES: RiskCategory[] = [
  {
    id: 'critical-materials',
    name: 'Critical Materials',
    score: 8.2,
    icon: '\u{1F48E}',
    description: 'Scarce raw materials and specialty components essential for spacecraft manufacturing.',
    items: ['Rare earth elements', 'Radiation-hardened chips', 'Specialty alloys'],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing Bottlenecks',
    score: 7.1,
    icon: '\u{1F3ED}',
    description: 'Production capacity constraints across space-qualified manufacturing facilities.',
    items: ['Clean room capacity', 'Precision machining', 'Testing facilities'],
  },
  {
    id: 'regulatory',
    name: 'Regulatory / Export Controls',
    score: 6.5,
    icon: '\u{1F4DC}',
    description: 'Export restrictions and compliance requirements impacting procurement timelines.',
    items: ['ITAR compliance', 'EAR restrictions', 'Foreign sourcing limits'],
  },
  {
    id: 'geopolitical',
    name: 'Geopolitical',
    score: 7.8,
    icon: '\u{1F30D}',
    description: 'Foreign dependency risks from concentrated geographic supply sources.',
    items: ['China dependency for rare earths', 'Russia titanium', 'Taiwan semiconductors'],
  },
  {
    id: 'workforce',
    name: 'Workforce',
    score: 5.9,
    icon: '\u{1F477}',
    description: 'Skilled labor shortages and access limitations affecting production throughput.',
    items: ['Skilled engineer shortage', 'Security clearance backlog'],
  },
  {
    id: 'logistics',
    name: 'Logistics',
    score: 5.2,
    icon: '\u{1F69A}',
    description: 'Transportation, scheduling, and facility access challenges for space hardware.',
    items: ['Launch scheduling delays', 'Facility access', 'Transportation'],
  },
];

const WATCH_LIST: WatchListItem[] = [
  { name: 'Radiation-hardened FPGAs', supplier: 'Microchip / BAE (sole source)', risk: 'Critical', notes: 'Single-source dependency; no qualified alternative' },
  { name: 'Space-grade solar cells', supplier: 'Limited suppliers (SolAero, Spectrolab)', risk: 'High', notes: 'Rising demand from mega-constellations' },
  { name: 'Titanium forging', supplier: 'VSMPO-AVISMA (Russia)', risk: 'High', notes: 'Geopolitical risk; sanctions exposure' },
  { name: 'Reaction wheels', supplier: 'Few qualified (Honeywell, Collins, NewSpace)', risk: 'Medium', notes: 'Long heritage qualification cycles' },
  { name: 'Star trackers', supplier: 'Ball Aerospace, Leonardo', risk: 'Medium', notes: 'Niche market; limited production capacity' },
  { name: 'Traveling wave tube amplifiers', supplier: 'Thales, L3Harris', risk: 'High', notes: 'Critical for high-power comms; few foundries' },
  { name: 'MEMS gyroscopes', supplier: 'Honeywell, Northrop Grumman', risk: 'Medium', notes: 'Dual-use technology; export controlled' },
  { name: 'Thermal blankets (MLI)', supplier: 'Dunmore, Sheldahl', risk: 'Low', notes: 'Mature supply base; multiple vendors' },
  { name: 'Propellant (hydrazine, xenon)', supplier: 'Multiple chemical suppliers', risk: 'Medium', notes: 'Xenon price volatility; hydrazine handling restrictions' },
  { name: 'Heritage flight computers', supplier: 'Legacy designs (BAE RAD750)', risk: 'High', notes: 'Obsolescence risk; diminishing manufacturing sources' },
  { name: 'Optical mirrors (telescopes/EO)', supplier: 'L3Harris, Safran', risk: 'Medium', notes: 'Long lead precision optics; limited polishing capacity' },
  { name: 'Rad-hard memory', supplier: 'Limited foundries (BAE, Cobham)', risk: 'Critical', notes: 'Single-digit qualified sources worldwide' },
  { name: 'Carbon fiber composites', supplier: 'Toray, Hexcel, Solvay', risk: 'Low', notes: 'Broad commercial base; space-grade subset well-served' },
  { name: 'Patch antennas', supplier: 'Multiple COTS vendors', risk: 'Low', notes: 'Widely available; minimal qualification barriers' },
  { name: 'Space-qualified connectors', supplier: 'Amphenol, Glenair, TE Connectivity', risk: 'Medium', notes: 'Specialty plating and testing requirements' },
];

const LEAD_TIMES: LeadTimeItem[] = [
  { component: 'Rad-hard FPGAs', minWeeks: 52, maxWeeks: 78, category: 'critical-materials' },
  { component: 'Space-grade solar cells', minWeeks: 26, maxWeeks: 36, category: 'critical-materials' },
  { component: 'Reaction wheels', minWeeks: 18, maxWeeks: 24, category: 'manufacturing' },
  { component: 'Star trackers', minWeeks: 24, maxWeeks: 32, category: 'manufacturing' },
  { component: 'Propulsion systems', minWeeks: 36, maxWeeks: 52, category: 'manufacturing' },
  { component: 'TWTAs', minWeeks: 30, maxWeeks: 44, category: 'critical-materials' },
  { component: 'Rad-hard memory', minWeeks: 40, maxWeeks: 64, category: 'critical-materials' },
  { component: 'Heritage flight computers', minWeeks: 32, maxWeeks: 48, category: 'critical-materials' },
  { component: 'Optical mirrors', minWeeks: 20, maxWeeks: 36, category: 'manufacturing' },
  { component: 'Space-qualified connectors', minWeeks: 12, maxWeeks: 20, category: 'logistics' },
];

const MITIGATION_STRATEGIES = [
  {
    title: 'Dual-Source Qualification Programs',
    description:
      'Qualify at least two suppliers for every critical component to eliminate single-source dependencies and enable competitive pricing.',
    icon: '\u{1F504}',
  },
  {
    title: 'Strategic Inventory Reserves',
    description:
      'Maintain 12-18 month buffer stock of long-lead and sole-source components to insulate programs from supply disruptions.',
    icon: '\u{1F4E6}',
  },
  {
    title: 'Domestic Production Incentives (CHIPS Act for Space)',
    description:
      'Leverage federal programs to reshore radiation-hardened semiconductor fabrication and reduce dependency on foreign foundries.',
    icon: '\u{1F3DB}',
  },
  {
    title: 'Alternative Material Development',
    description:
      'Invest in R&D for substitute materials (e.g., gallium nitride replacing gallium arsenide, recycled rare earths) to diversify sourcing.',
    icon: '\u{1F52C}',
  },
  {
    title: '3D Printing / Additive Manufacturing for Spares',
    description:
      'Adopt metal additive manufacturing to produce low-volume spare parts on demand, reducing warehousing costs and obsolescence risk.',
    icon: '\u{1F5A8}',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRiskColor(score: number): string {
  if (score >= 8) return '#ef4444';   // red
  if (score >= 7) return '#f97316';   // orange
  if (score >= 5.5) return '#f59e0b'; // amber
  return '#10b981';                    // emerald
}

function getRiskLevelColor(level: RiskLevel): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (level) {
    case 'Critical':
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-400',
        border: 'border-red-500/30',
        dot: 'bg-red-500',
      };
    case 'High':
      return {
        bg: 'bg-orange-500/15',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        dot: 'bg-orange-500',
      };
    case 'Medium':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
      };
    case 'Low':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-500',
      };
  }
}

function getRiskSortOrder(level: RiskLevel): number {
  switch (level) {
    case 'Critical': return 0;
    case 'High': return 1;
    case 'Medium': return 2;
    case 'Low': return 3;
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

/** Large circular risk score indicator */
function OverallRiskGauge({
  score,
  trend,
}: {
  score: number;
  trend: number;
}) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270-degree arc
  const filled = (score / MAX_SCORE) * circumference * arcFraction;
  const strokeDashoffset = circumference * arcFraction - filled;
  const color = getRiskColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-56 h-56">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.12)"
            strokeWidth="14"
            strokeDasharray={`${circumference * arcFraction} ${circumference * (1 - arcFraction)}`}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={`${circumference * arcFraction} ${circumference * (1 - arcFraction)}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-slate-100">{score}</span>
          <span className="text-sm text-slate-400 mt-0.5">/ {MAX_SCORE}</span>
        </div>
      </div>
      {/* Labels */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <span className="px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-sm font-bold text-amber-400 tracking-wider">
          MODERATE-HIGH
        </span>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          +{trend} from last quarter
        </span>

        <RelatedModules modules={PAGE_RELATIONS['supply-chain-risk']} />
      </div>
    </div>
  );
}

/** Individual risk category card */
function RiskCategoryCard({ category }: { category: RiskCategory }) {
  const color = getRiskColor(category.score);
  const barPct = (category.score / MAX_SCORE) * 100;

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{category.icon}</span>
          <h3 className="text-sm font-semibold text-slate-100">{category.name}</h3>
        </div>
        <span className="text-lg font-bold" style={{ color }}>
          {category.score}
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${barPct}%`, backgroundColor: color }}
        />
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{category.description}</p>

      <div className="flex flex-wrap gap-1.5 mt-auto">
        {category.items.map((item) => (
          <span
            key={item}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-700/40 text-slate-300 border border-slate-600/30"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Watch list row */
function WatchListRow({ item, index }: { item: WatchListItem; index: number }) {
  const c = getRiskLevelColor(item.risk);

  return (
    <tr className={`border-b border-slate-700/30 ${index % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
      <td className="py-3 px-4 text-sm text-slate-200 font-medium">{item.name}</td>
      <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">{item.supplier}</td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text} ${c.border} border`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          {item.risk}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-slate-400 hidden lg:table-cell">{item.notes}</td>
    </tr>
  );
}

/** Lead time horizontal bar */
function LeadTimeBar({
  item,
  maxWeeksGlobal,
}: {
  item: LeadTimeItem;
  maxWeeksGlobal: number;
}) {
  const leftPct = (item.minWeeks / maxWeeksGlobal) * 100;
  const widthPct = ((item.maxWeeks - item.minWeeks) / maxWeeksGlobal) * 100;

  // Color based on max lead time
  let barColor: string;
  if (item.maxWeeks >= 52) barColor = '#ef4444';
  else if (item.maxWeeks >= 36) barColor = '#f97316';
  else if (item.maxWeeks >= 24) barColor = '#f59e0b';
  else barColor = '#10b981';

  return (
    <div className="flex items-center gap-4">
      <div className="w-44 shrink-0 text-right">
        <span className="text-xs text-slate-300 leading-tight">{item.component}</span>
      </div>
      <div className="flex-1 relative h-7 bg-slate-700/25 rounded">
        {/* Range bar */}
        <div
          className="absolute top-0.5 bottom-0.5 rounded transition-all duration-700"
          style={{
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, 2)}%`,
            backgroundColor: barColor,
            opacity: 0.75,
          }}
        />
        {/* Min marker */}
        <div
          className="absolute top-0 h-full w-px bg-slate-400/50"
          style={{ left: `${leftPct}%` }}
        />
      </div>
      <div className="w-28 shrink-0">
        <span className="text-xs text-slate-400">
          {item.minWeeks}-{item.maxWeeks} weeks
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function SupplyChainRiskPage() {
  const [sortBy, setSortBy] = useState<SortOption>('risk-desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Sorted & filtered watch list
  const sortedWatchList = useMemo(() => {
    let items = [...WATCH_LIST];

    // Filter by category if selected
    if (filterCategory !== 'all') {
      const categoryMap: Record<string, string[]> = {
        'critical-materials': [
          'Radiation-hardened FPGAs',
          'Space-grade solar cells',
          'Titanium forging',
          'Traveling wave tube amplifiers',
          'Heritage flight computers',
          'Rad-hard memory',
          'Carbon fiber composites',
        ],
        manufacturing: [
          'Reaction wheels',
          'Star trackers',
          'MEMS gyroscopes',
          'Optical mirrors (telescopes/EO)',
        ],
        regulatory: [
          'Space-qualified connectors',
          'MEMS gyroscopes',
        ],
        geopolitical: [
          'Titanium forging',
          'Rad-hard memory',
          'Radiation-hardened FPGAs',
        ],
        workforce: [],
        logistics: [
          'Thermal blankets (MLI)',
          'Propellant (hydrazine, xenon)',
          'Patch antennas',
        ],
      };
      const allowed = categoryMap[filterCategory] || [];
      items = items.filter((i) => allowed.includes(i.name));
    }

    // Sort
    switch (sortBy) {
      case 'risk-desc':
        items.sort((a, b) => getRiskSortOrder(a.risk) - getRiskSortOrder(b.risk));
        break;
      case 'risk-asc':
        items.sort((a, b) => getRiskSortOrder(b.risk) - getRiskSortOrder(a.risk));
        break;
      case 'lead-time': {
        const leadMap = new Map(LEAD_TIMES.map((l) => [l.component, l.maxWeeks]));
        items.sort(
          (a, b) => (leadMap.get(b.name) ?? 0) - (leadMap.get(a.name) ?? 0)
        );
        break;
      }
      case 'category':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return items;
  }, [sortBy, filterCategory]);

  // Sorted lead times
  const sortedLeadTimes = useMemo(() => {
    const items = [...LEAD_TIMES];
    if (sortBy === 'lead-time') {
      items.sort((a, b) => b.maxWeeks - a.maxWeeks);
    } else {
      items.sort((a, b) => b.maxWeeks - a.maxWeeks);
    }
    return items;
  }, [sortBy]);

  const maxWeeksGlobal = Math.max(...LEAD_TIMES.map((l) => l.maxWeeks));

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <AnimatedPageHeader
          title="Supply Chain Risk Dashboard"
          subtitle="Monitor and assess risk across the space industry supply chain. Track critical components, manufacturing bottlenecks, geopolitical dependencies, and lead times."
          breadcrumb="Business Intelligence"
          accentColor="amber"
        />

        {/* ── OVERALL RISK SCORE ──────────────────────────────────────── */}
        <ScrollReveal>
        <section className="card p-8 mb-8 flex flex-col lg:flex-row items-center gap-8">
          <OverallRiskGauge score={OVERALL_SCORE} trend={OVERALL_TREND} />

          <div className="flex-1 space-y-4">
            <h2 className="text-xl font-bold text-slate-100">Overall Supply Chain Risk</h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              The composite risk index aggregates scores from six categories covering materials,
              manufacturing, regulatory, geopolitical, workforce, and logistics dimensions.
              A score of {OVERALL_SCORE}/{MAX_SCORE} reflects elevated risk driven primarily
              by critical material scarcity and geopolitical dependencies on single-country
              suppliers for essential raw materials and components.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Categories</p>
                <p className="text-2xl font-bold text-slate-100">{RISK_CATEGORIES.length}</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Components Tracked</p>
                <p className="text-2xl font-bold text-slate-100">{WATCH_LIST.length}</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Critical Items</p>
                <p className="text-2xl font-bold text-red-400">
                  {WATCH_LIST.filter((w) => w.risk === 'Critical').length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FILTER / SORT CONTROLS ──────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-slate-800/60 border border-slate-700/50 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="risk-desc">Risk Level (High to Low)</option>
            <option value="risk-asc">Risk Level (Low to High)</option>
            <option value="lead-time">Lead Time (Longest first)</option>
            <option value="category">Alphabetical</option>
          </select>

          <label className="text-xs text-slate-500 uppercase tracking-wider font-medium ml-4">
            Category:
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800/60 border border-slate-700/50 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="all">All Categories</option>
            {RISK_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        </ScrollReveal>

        {/* ── RISK CATEGORY CARDS ─────────────────────────────────────── */}
        <ScrollReveal delay={0.1}>
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Risk Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RISK_CATEGORIES.map((cat) => (
              <RiskCategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </section>

        </ScrollReveal>

        {/* ── CRITICAL COMPONENT WATCH LIST ────────────────────────────── */}
        <ScrollReveal delay={0.15}>
        <section className="card p-6 mb-10 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Critical Component Watch List
            </h2>
            <span className="text-xs text-slate-500">
              {sortedWatchList.length} component{sortedWatchList.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Component
                  </th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                    Supplier(s)
                  </th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWatchList.map((item, i) => (
                  <WatchListRow key={item.name} item={item} index={i} />
                ))}
              </tbody>
            </table>
          </div>

          {sortedWatchList.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              No components match the selected category filter.
            </p>
          )}
        </section>

        </ScrollReveal>

        {/* ── LEAD TIME TRACKER ───────────────────────────────────────── */}
        <ScrollReveal delay={0.2}>
        <section className="card p-6 mb-10">
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Lead Time Tracker</h2>
          <p className="text-sm text-slate-400 mb-6">
            Estimated procurement lead times for critical space components. Bars show the
            min-max range in weeks from order to delivery.
          </p>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-slate-400">52+ weeks</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
              <span className="text-slate-400">36-51 weeks</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
              <span className="text-slate-400">24-35 weeks</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
              <span className="text-slate-400">&lt; 24 weeks</span>
            </span>
          </div>

          <div className="space-y-3">
            {sortedLeadTimes.map((item) => (
              <LeadTimeBar
                key={item.component}
                item={item}
                maxWeeksGlobal={maxWeeksGlobal}
              />
            ))}
          </div>
        </section>

        </ScrollReveal>

        {/* ── MITIGATION STRATEGIES ───────────────────────────────────── */}
        <ScrollReveal delay={0.25}>
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Supply Chain Mitigation Strategies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MITIGATION_STRATEGIES.map((strategy) => (
              <div key={strategy.title} className="card p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{strategy.icon}</span>
                  <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                    {strategy.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {strategy.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        </ScrollReveal>

        {/* ── DISCLAIMER ──────────────────────────────────────────────── */}
        <div className="text-center mt-12">
          <p className="text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Risk scores and lead times are estimates based on publicly available data, industry
            reports, and expert assessments. They are provided for informational purposes only
            and should not be used as the sole basis for procurement or investment decisions.
            Data last refreshed Q1 2026.
          </p>
        </div>
      </div>
    </main>
  );
}
