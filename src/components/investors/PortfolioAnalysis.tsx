'use client';

import React, { useMemo, useState } from 'react';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface Investor {
  id: string;
  name: string;
  type: string;
  headquarters: string | null;
  aum: number | null;
  investmentStage: string[];
  sectorFocus: string[];
}

interface PortfolioAnalysisProps {
  investors: Investor[];
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const STAGES = ['pre_seed', 'seed', 'series_a', 'series_b', 'growth', 'late_stage'] as const;
const SECTORS = ['launch', 'satellite', 'earth_observation', 'defense', 'in_space', 'ground_segment'] as const;

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  growth: 'Growth',
  late_stage: 'Late Stage',
};

const SECTOR_LABELS: Record<string, string> = {
  launch: 'Launch',
  satellite: 'Satellite',
  earth_observation: 'Earth Obs.',
  defense: 'Defense',
  in_space: 'In-Space',
  ground_segment: 'Ground Seg.',
};

function formatAUM(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function SectorStageHeatmap({ investors }: { investors: Investor[] }) {
  const [hoveredCell, setHoveredCell] = useState<{ sector: string; stage: string } | null>(null);

  // Build the heatmap data: count of investors for each sector-stage pair
  const { grid, maxCount } = useMemo(() => {
    const g: Record<string, Record<string, number>> = {};
    let max = 0;

    for (const sector of SECTORS) {
      g[sector] = {};
      for (const stage of STAGES) {
        g[sector][stage] = 0;
      }
    }

    for (const inv of investors) {
      for (const sector of inv.sectorFocus) {
        if (g[sector]) {
          for (const stage of inv.investmentStage) {
            if (g[sector][stage] !== undefined) {
              g[sector][stage]++;
              if (g[sector][stage] > max) max = g[sector][stage];
            }
          }
        }
      }
    }

    return { grid: g, maxCount: max || 1 };
  }, [investors]);

  function getCellColor(count: number): string {
    if (count === 0) return 'bg-slate-800/30';
    const intensity = count / maxCount;
    if (intensity >= 0.8) return 'bg-white/70';
    if (intensity >= 0.6) return 'bg-white/50';
    if (intensity >= 0.4) return 'bg-white/35';
    if (intensity >= 0.2) return 'bg-white/10';
    return 'bg-white/5';
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
          {'#'}
        </span>
        Sector x Stage Heatmap
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        Investor concentration across sectors and investment stages
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs text-slate-500 font-medium pb-2 pr-3 min-w-[100px]">
                Sector
              </th>
              {STAGES.map((stage) => (
                <th
                  key={stage}
                  className="text-center text-xs text-slate-500 font-medium pb-2 px-1 min-w-[70px]"
                >
                  {STAGE_LABELS[stage]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTORS.map((sector) => (
              <tr key={sector}>
                <td className="text-sm text-slate-300 font-medium pr-3 py-1">
                  {SECTOR_LABELS[sector]}
                </td>
                {STAGES.map((stage) => {
                  const count = grid[sector]?.[stage] || 0;
                  const isHovered =
                    hoveredCell?.sector === sector && hoveredCell?.stage === stage;
                  return (
                    <td key={stage} className="px-1 py-1">
                      <div
                        className={`relative rounded-md h-10 flex items-center justify-center cursor-default transition-all duration-200 border ${
                          getCellColor(count)
                        } ${
                          isHovered
                            ? 'border-white/10/60 ring-1 ring-white/10'
                            : 'border-slate-700/30'
                        }`}
                        onMouseEnter={() => setHoveredCell({ sector, stage })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            count > 0 ? 'text-white' : 'text-slate-600'
                          }`}
                        >
                          {count}
                        </span>
                        {isHovered && count > 0 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-600 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-lg pointer-events-none">
                            {count} investor{count !== 1 ? 's' : ''} in {SECTOR_LABELS[sector]} / {STAGE_LABELS[stage]}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 justify-end">
        <span className="text-xs text-slate-500">Low</span>
        <div className="flex gap-0.5">
          {['bg-white/5', 'bg-white/10', 'bg-white/35', 'bg-white/50', 'bg-white/70'].map(
            (color, i) => (
              <div key={i} className={`w-5 h-3 rounded-sm ${color}`} />
            )
          )}
        </div>
        <span className="text-xs text-slate-500">High</span>
      </div>
    </div>
  );
}

function GeographicDistribution({ investors }: { investors: Investor[] }) {
  // Group by region/country from headquarters
  const regionData = useMemo(() => {
    const regionMap = new Map<string, { count: number; totalAUM: number }>();

    for (const inv of investors) {
      // Extract country/region from headquarters string
      const hq = inv.headquarters;
      let region = 'Unknown';
      if (hq) {
        // Try to extract country (typically last part after comma)
        const parts = hq.split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          region = parts[parts.length - 1];
        } else {
          region = parts[0];
        }
        // Normalize common patterns
        if (/^US$|United States|USA/i.test(region)) region = 'United States';
        if (/^UK$|United Kingdom/i.test(region)) region = 'United Kingdom';
      }

      const existing = regionMap.get(region) || { count: 0, totalAUM: 0 };
      existing.count++;
      existing.totalAUM += inv.aum || 0;
      regionMap.set(region, existing);
    }

    return Array.from(regionMap.entries())
      .map(([region, data]) => ({ region, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [investors]);

  const maxCount = Math.max(...regionData.map((r) => r.count), 1);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
          {'G'}
        </span>
        Geographic Distribution
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        Investors by headquarters location
      </p>

      <div className="space-y-3">
        {regionData.slice(0, 12).map((item) => {
          const widthPct = (item.count / maxCount) * 100;
          return (
            <div key={item.region}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{item.region}</span>
                <span className="text-slate-400">
                  {item.count} investor{item.count !== 1 ? 's' : ''}
                  {item.totalAUM > 0 ? ` -- ${formatAUM(item.totalAUM)} AUM` : ''}
                </span>
              </div>
              <div className="w-full bg-slate-700/30 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-purple-500 to-slate-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function PortfolioAnalysis({ investors }: PortfolioAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (investors.length === 0) return null;

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 mb-4 group cursor-pointer"
      >
        <h2 className="text-xl font-bold text-white group-hover:text-white transition-colors">
          Portfolio Analysis
        </h2>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
          {isExpanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <SectorStageHeatmap investors={investors} />
          <GeographicDistribution investors={investors} />
        </div>
      )}
    </div>
  );
}
