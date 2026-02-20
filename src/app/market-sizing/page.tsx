'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { LineChart } from '@/components/charts';
import { DonutChart } from '@/components/charts';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import {
  REGIONAL_BREAKDOWN,
  type MarketSegment,
  type MarketDataPoint,
  type RegionalBreakdown,
} from '@/lib/market-sizing-data';

// ── Formatting helpers ──────────────────────────────────────────────

function formatBillions(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
  if (value >= 100) return `$${Math.round(value)}B`;
  if (value >= 10) return `$${value.toFixed(1)}B`;
  if (value >= 1) return `$${value.toFixed(1)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

function formatCAGR(cagr: number): string {
  return `${(cagr * 100).toFixed(1)}%`;
}

function getCAGRColor(cagr: number): { bg: string; text: string; border: string } {
  if (cagr >= 0.20) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  if (cagr >= 0.15) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
  if (cagr >= 0.08) return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
  return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
}

function getCAGRLabel(cagr: number): string {
  if (cagr >= 0.25) return 'Hypergrowth';
  if (cagr >= 0.15) return 'High Growth';
  if (cagr >= 0.08) return 'Growth';
  return 'Mature';
}

type ChartColorKey = 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose';

const REGION_COLORS: Record<string, ChartColorKey> = {
  'North America': 'cyan',
  'Europe': 'purple',
  'Asia-Pacific': 'amber',
  'Rest of World': 'emerald',
};

// ── Sub-components ──────────────────────────────────────────────────

function HeroStats({ segments }: { segments: MarketSegment[] }) {
  const global = segments.find(s => s.id === 'global-space-economy');
  if (!global) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
    >
      {[
        {
          label: 'Global Space Economy (2024)',
          value: formatBillions(global.currentTAM),
          color: 'text-cyan-400',
          sub: `${formatCAGR(global.cagr)} CAGR`,
        },
        {
          label: `Projected ${global.projectedYear}`,
          value: formatBillions(global.projectedTAM),
          color: 'text-emerald-400',
          sub: `${((global.projectedTAM / global.currentTAM - 1) * 100).toFixed(0)}% growth`,
        },
        {
          label: 'Market Segments Tracked',
          value: segments.length.toString(),
          color: 'text-purple-400',
          sub: 'Across all verticals',
        },
        {
          label: 'Fastest Growing',
          value: formatCAGR(Math.max(...segments.map(s => s.cagr))),
          color: 'text-amber-400',
          sub: segments.reduce((a, b) => a.cagr > b.cagr ? a : b).name,
        },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          className="card p-4 text-center"
        >
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{stat.sub}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function GlobalGrowthChart({ history }: { history: MarketDataPoint[] }) {
  const sorted = useMemo(
    () => [...history].sort((a, b) => a.year - b.year),
    [history]
  );
  if (sorted.length === 0) return null;

  const labels = sorted.map(d => d.year.toString());
  const actualValues = sorted.map(d => d.type === 'actual' ? d.value : 0);
  const projectedValues = sorted.map(d => d.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="card p-6 mb-8"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-white">Global Space Economy Growth (2019-2035)</h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-cyan-400 rounded-full" />
            <span className="text-slate-400">Projected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-purple-400 rounded-full" />
            <span className="text-slate-400">Actual</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">USD billions - Sources: SIA, Morgan Stanley</p>
      <LineChart
        series={[
          { name: 'Projected', data: projectedValues, color: 'cyan' },
          { name: 'Actual', data: actualValues, color: 'purple' },
        ]}
        labels={labels}
        height={320}
        yAxisLabel="USD Billions"
        xAxisLabel="Year"
        showLegend={false}
      />
    </motion.div>
  );
}

function TAMTreemap({
  segments,
  onSelect,
}: {
  segments: MarketSegment[];
  onSelect: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Sort by TAM descending for visual weight
  const sorted = useMemo(
    () => [...segments].sort((a, b) => b.currentTAM - a.currentTAM),
    [segments]
  );

  const maxTAM = Math.max(...sorted.map(s => s.currentTAM));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="card p-6 mb-8"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-white">Market Segments by TAM</h2>
        <span className="text-xs text-slate-500">Click to explore</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Size represents current TAM, border color indicates CAGR growth rate</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {sorted.map((segment, i) => {
          const cagrStyle = getCAGRColor(segment.cagr);
          const isHovered = hoveredId === segment.id;
          // Scale the card height based on relative TAM
          const relativeSize = Math.max(0.4, segment.currentTAM / maxTAM);
          const minH = 120;
          const maxH = 200;
          const h = minH + (maxH - minH) * relativeSize;

          return (
            <motion.button
              key={segment.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(segment.id)}
              onMouseEnter={() => setHoveredId(segment.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative text-left rounded-xl border p-4 transition-all duration-200 overflow-hidden cursor-pointer ${
                isHovered
                  ? `bg-slate-800/80 ${cagrStyle.border}`
                  : 'bg-slate-800/50 border-slate-700/50'
              }`}
              style={{ minHeight: h }}
            >
              {/* Background glow matching segment color */}
              <div
                className="absolute inset-0 opacity-10 rounded-xl"
                style={{ background: `radial-gradient(circle at 30% 30%, ${segment.color}40, transparent 70%)` }}
              />

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1 truncate">{segment.name}</div>
                  <div className="text-xl font-bold text-white">{formatBillions(segment.currentTAM)}</div>
                  <div className="text-[10px] text-slate-500">{segment.tamYear} TAM</div>
                </div>

                <div className="mt-auto pt-2">
                  <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${cagrStyle.bg} ${cagrStyle.text}`}>
                    {formatCAGR(segment.cagr)} CAGR
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {formatBillions(segment.projectedTAM)} by {segment.projectedYear}
                  </div>
                </div>
              </div>

              {/* Color indicator bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl"
                style={{ backgroundColor: segment.color, opacity: isHovered ? 0.8 : 0.4 }}
              />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function SegmentDetailPanel({
  segment,
  childSegments,
  history,
  regional,
  onBack,
  onDrillDown,
}: {
  segment: MarketSegment;
  childSegments: MarketSegment[];
  history: MarketDataPoint[];
  regional: RegionalBreakdown[];
  onBack: () => void;
  onDrillDown: (id: string) => void;
}) {
  const cagrStyle = getCAGRColor(segment.cagr);

  // Build line chart data from history
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => a.year - b.year),
    [history]
  );

  const govPercent = Math.round(segment.governmentShare * 100);
  const commPercent = 100 - govPercent;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 mb-8"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all segments
      </button>

      {/* Segment header card */}
      <div className="card p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{ background: `radial-gradient(circle at 20% 50%, ${segment.color}, transparent 60%)` }}
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{segment.name}</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">{segment.description}</p>
              {segment.parentId && (
                <p className="text-xs text-slate-500 mt-1">
                  Parent segment: {segment.parentId.replace(/-/g, ' ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg ${cagrStyle.bg} ${cagrStyle.text} border ${cagrStyle.border}`}>
                {getCAGRLabel(segment.cagr)} &middot; {formatCAGR(segment.cagr)} CAGR
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Current TAM ({segment.tamYear})</div>
              <div className="text-xl font-bold text-white mt-1">{formatBillions(segment.currentTAM)}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Projected ({segment.projectedYear})</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{formatBillions(segment.projectedTAM)}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Gov vs Commercial</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                    style={{ width: `${govPercent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{govPercent}% Gov</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{commPercent}% Commercial</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Growth Multiple</div>
              <div className="text-xl font-bold text-purple-400 mt-1">
                {(segment.projectedTAM / segment.currentTAM).toFixed(1)}x
              </div>
              <div className="text-[10px] text-slate-500">
                {segment.tamYear} to {segment.projectedYear}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History chart */}
      {sortedHistory.length > 2 && (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-4">Historical & Projected Growth</h3>
          <LineChart
            series={[
              {
                name: segment.name,
                data: sortedHistory.map(d => d.value),
                color: 'cyan',
              },
            ]}
            labels={sortedHistory.map(d => d.year.toString())}
            height={280}
            yAxisLabel="USD Billions"
          />
          <div className="flex gap-3 mt-3 text-xs text-slate-500">
            {sortedHistory.map(d => (
              <span key={d.year} className={d.type === 'projected' ? 'text-cyan-500/60' : 'text-slate-400'}>
                {d.year}: {formatBillions(d.value)}
                {d.type === 'projected' ? ' (P)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Players */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-3">Key Players</h3>
          <div className="flex flex-wrap gap-2">
            {segment.keyPlayers.map(player => (
              <Link
                key={player}
                href={`/company-profiles?search=${encodeURIComponent(player)}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400 transition-colors"
              >
                {player}
              </Link>
            ))}
          </div>
        </div>

        {/* Trends */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-3">Key Trends</h3>
          <ul className="space-y-2">
            {segment.trends.map((trend, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-cyan-400 mt-0.5 flex-shrink-0">&#x2022;</span>
                {trend}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Regional breakdown */}
      {regional.length > 0 && (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-4">Regional Market Share</h3>
          <DonutChart
            data={regional.map(r => ({
              label: r.region,
              value: Math.round(r.share * segment.currentTAM * 10) / 10,
              color: REGION_COLORS[r.region] || ('rose' as ChartColorKey),
            }))}
            size={200}
            thickness={25}
            centerLabel="Total"
            centerValue={formatBillions(segment.currentTAM)}
            valueFormatter={(v) => formatBillions(v)}
          />
        </div>
      )}

      {/* Child segments */}
      {childSegments.length > 0 && (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-4">Sub-Segments</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {childSegments.sort((a, b) => b.currentTAM - a.currentTAM).map(child => {
              const childCagr = getCAGRColor(child.cagr);
              return (
                <motion.button
                  key={child.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onDrillDown(child.id)}
                  className="text-left rounded-lg bg-slate-800/50 border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all cursor-pointer"
                >
                  <div className="text-sm font-medium text-white mb-1">{child.name}</div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-white">{formatBillions(child.currentTAM)}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${childCagr.bg} ${childCagr.text}`}>
                      {formatCAGR(child.cagr)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {formatBillions(child.projectedTAM)} by {child.projectedYear}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Source */}
      <div className="text-xs text-slate-500 italic px-1">
        Source: {segment.source}
      </div>
    </motion.div>
  );
}

function SegmentCards({
  segments,
  onSelect,
}: {
  segments: MarketSegment[];
  onSelect: (id: string) => void;
}) {
  // All segments sorted by TAM
  const sorted = useMemo(
    () => [...segments].sort((a, b) => b.currentTAM - a.currentTAM),
    [segments]
  );

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">All Market Segments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((segment, i) => {
          const cagrStyle = getCAGRColor(segment.cagr);
          const govPercent = Math.round(segment.governmentShare * 100);

          return (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
            >
              <motion.button
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(segment.id)}
                className="w-full text-left card p-5 group cursor-pointer relative overflow-hidden"
              >
                {/* Subtle color accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: segment.color, opacity: 0.5 }}
                />

                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 pr-3">
                    <h3 className="font-semibold text-white text-sm group-hover:text-cyan-400 transition-colors truncate">
                      {segment.name}
                    </h3>
                    {segment.parentId && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Sub-segment of {segment.parentId.replace(/-/g, ' ')}
                      </div>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${cagrStyle.bg} ${cagrStyle.text}`}>
                    {formatCAGR(segment.cagr)} CAGR
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                  {segment.description}
                </p>

                {/* TAM row */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">TAM {segment.tamYear}</div>
                    <div className="text-sm font-semibold text-white">{formatBillions(segment.currentTAM)}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{segment.projectedYear} Est.</div>
                    <div className="text-sm font-semibold text-emerald-400">{formatBillions(segment.projectedTAM)}</div>
                  </div>
                </div>

                {/* Gov vs Commercial bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Gov {govPercent}%</span>
                    <span>Commercial {100 - govPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                      style={{ width: `${govPercent}%` }}
                    />
                  </div>
                </div>

                {/* Key Players */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {segment.keyPlayers.slice(0, 4).map(player => (
                    <span key={player} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
                      {player}
                    </span>
                  ))}
                  {segment.keyPlayers.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500">
                      +{segment.keyPlayers.length - 4} more
                    </span>
                  )}
                </div>

                {/* Source */}
                <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-700/50 truncate">
                  {segment.source}
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function GrowthLeadersTable({
  segments,
  onSelect,
}: {
  segments: MarketSegment[];
  onSelect: (id: string) => void;
}) {
  const sorted = useMemo(
    () => [...segments].sort((a, b) => b.cagr - a.cagr),
    [segments]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="card p-6 mb-8"
    >
      <h2 className="text-lg font-semibold text-white mb-4">Growth Leaders (by CAGR)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">Rank</th>
              <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">Segment</th>
              <th className="text-right text-xs text-slate-500 font-medium py-2 pr-4">CAGR</th>
              <th className="text-right text-xs text-slate-500 font-medium py-2 pr-4">2024 TAM</th>
              <th className="text-right text-xs text-slate-500 font-medium py-2 pr-4">2035 TAM</th>
              <th className="text-right text-xs text-slate-500 font-medium py-2">Growth</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((segment, i) => {
              const cagrStyle = getCAGRColor(segment.cagr);
              const growth = ((segment.projectedTAM / segment.currentTAM - 1) * 100).toFixed(0);

              return (
                <tr
                  key={segment.id}
                  onClick={() => onSelect(segment.id)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 pr-4">
                    <span className="text-slate-500 font-mono text-xs">#{i + 1}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-white font-medium hover:text-cyan-400 transition-colors text-xs">
                        {segment.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cagrStyle.bg} ${cagrStyle.text}`}>
                      {formatCAGR(segment.cagr)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-xs text-slate-300">
                    {formatBillions(segment.currentTAM)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-xs text-emerald-400">
                    {formatBillions(segment.projectedTAM)}
                  </td>
                  <td className="py-2.5 text-right text-xs text-slate-400">
                    {growth}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function RegionalOverview({
  segments,
  regional,
}: {
  segments: MarketSegment[];
  regional: RegionalBreakdown[];
}) {
  const globalRegional = regional.filter(r => r.segmentId === 'global-space-economy');
  const globalSegment = segments.find(s => s.id === 'global-space-economy');

  if (globalRegional.length === 0 || !globalSegment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
      className="card p-6 mb-8"
    >
      <h2 className="text-lg font-semibold text-white mb-4">Regional Market Distribution</h2>
      <DonutChart
        data={globalRegional.map(r => ({
          label: r.region,
          value: Math.round(r.share * globalSegment.currentTAM * 10) / 10,
          color: REGION_COLORS[r.region] || ('rose' as ChartColorKey),
        }))}
        size={220}
        thickness={28}
        centerLabel="Global"
        centerValue={formatBillions(globalSegment.currentTAM)}
        valueFormatter={(v) => `$${v.toFixed(1)}B`}
      />
    </motion.div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────

export default function MarketSizingPage() {
  const [allSegments, setAllSegments] = useState<MarketSegment[]>([]);
  const [globalHistory, setGlobalHistory] = useState<MarketDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down state
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    segment: MarketSegment;
    children: MarketSegment[];
    history: MarketDataPoint[];
    regional: RegionalBreakdown[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load overview data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/market-sizing');
        if (!res.ok) throw new Error('Failed to load market data');
        const data = await res.json();
        setAllSegments(data.allSegments || []);
        setGlobalHistory(data.globalHistory || []);
      } catch {
        setError('Failed to load market sizing data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load detail data when a segment is selected
  const selectSegment = useCallback(async (id: string) => {
    setSelectedSegmentId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/market-sizing?segment=${id}`);
      if (!res.ok) throw new Error('Segment not found');
      const data = await res.json();
      setDetailData(data);
    } catch {
      setError('Failed to load segment detail.');
    } finally {
      setDetailLoading(false);
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSegmentId(null);
    setDetailData(null);
  }, []);

  // Get top-level segments (no parent) for the treemap
  const topLevelSegments = useMemo(
    () => allSegments.filter(s => !s.parentId),
    [allSegments]
  );

  // Regional data is static and imported directly from the data file
  const allRegional = REGIONAL_BREAKDOWN;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Market Sizing' },
      ]} />
      <AnimatedPageHeader
        title="Space Industry Market Intelligence"
        subtitle="Comprehensive market sizing, TAM analysis, and growth projections across every major space industry vertical"
        icon="📊"
        accentColor="cyan"
      />

      {error && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Hero stats always visible */}
      <HeroStats segments={allSegments} />

      <AnimatePresence mode="wait">
        {selectedSegmentId && detailData && !detailLoading ? (
          <SegmentDetailPanel
            key={selectedSegmentId}
            segment={detailData.segment}
            childSegments={detailData.children}
            history={detailData.history}
            regional={detailData.regional}
            onBack={clearSelection}
            onDrillDown={selectSegment}
          />
        ) : selectedSegmentId && detailLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-20"
          >
            <LoadingSpinner />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Global growth chart */}
            <GlobalGrowthChart history={globalHistory} />

            {/* Market segment treemap */}
            <TAMTreemap segments={topLevelSegments} onSelect={selectSegment} />

            {/* Growth leaders table */}
            <GrowthLeadersTable segments={allSegments} onSelect={selectSegment} />

            {/* Regional overview */}
            <RegionalOverview segments={allSegments} regional={allRegional} />

            {/* All segment cards */}
            <SegmentCards segments={allSegments} onSelect={selectSegment} />

            {/* Methodology note */}
            <div className="card p-6 mb-8 border-slate-700/30">
              <h3 className="text-sm font-semibold text-white mb-2">Data Sources & Methodology</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Market sizing data is sourced from the Satellite Industry Association (SIA) State of the Satellite Industry Report,
                Morgan Stanley Space Economy Research, Euroconsult market reports, BryceTech industry analysis, NSR sector reports,
                and publicly available government budget documents. Projected values use compound annual growth rates (CAGR) derived
                from analyst consensus estimates. All values are in current USD billions. Last updated: February 2026.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['SIA', 'Morgan Stanley', 'Euroconsult', 'BryceTech', 'NSR', 'McKinsey', 'FAA'].map(src => (
                  <span key={src} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/50 text-slate-500 border border-slate-700/30">
                    {src}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center card p-8 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border-cyan-800/50">
              <h2 className="text-lg font-semibold text-white mb-2">Deep Dive Into Space Market Intelligence</h2>
              <p className="text-sm text-slate-400 mb-4 max-w-xl mx-auto">
                Explore company profiles, financial data, and competitive analysis for 100+ space industry companies.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/company-profiles">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Company Profiles
                  </motion.button>
                </Link>
                <Link href="/market-intel">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Market Intel Dashboard
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
