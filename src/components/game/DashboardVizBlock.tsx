'use client';

import { useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { formatMoney } from '@/lib/game/formulas';

/**
 * DashboardVizBlock — HUD-styled data visualizations for the player's empire.
 * Three panels:
 *   1. Revenue-by-region donut — where your money actually comes from
 *   2. Fleet status cluster — idle / mining / transit / total with mini gauges
 *   3. Infrastructure footprint — buildings by tier, one bar per tier
 *
 * Kept deliberately compact. Designed to read at a glance, not be the
 * spreadsheet hiding in a tab. Complements IncomeChart (which already handles
 * the P&L time series).
 */

interface DashboardVizBlockProps {
  state: GameState;
}

// Tint by general region — used for the donut segments and the
// infrastructure bars so the dashboard stays visually anchored.
const REGION_COLOR: Record<string, string> = {
  earth_surface: '#38bdf8',
  leo: '#22d3ee',
  geo: '#a78bfa',
  lunar_orbit: '#94a3b8',
  lunar_surface: '#cbd5e1',
  mars_orbit: '#fdba74',
  mars_surface: '#ef4444',
  asteroid_belt: '#a8a29e',
  jupiter_system: '#fbbf24',
  saturn_system: '#fde68a',
  outer_system: '#818cf8',
};

function colorFor(loc: string): string {
  return REGION_COLOR[loc] || '#64748b';
}

/** Revenue-by-region donut — SVG-based, no chart lib. Shows the top 6 regions
 *  by revenue with an "other" bucket so the donut doesn't shatter into too many
 *  slices at late game. */
function RevenueDonut({ state }: { state: GameState }) {
  const slices = useMemo(() => {
    const byLoc: Record<string, number> = {};
    for (const svc of state.activeServices) {
      const def = SERVICE_MAP.get(svc.definitionId);
      if (!def) continue;
      byLoc[svc.locationId] = (byLoc[svc.locationId] || 0) + def.revenuePerMonth * svc.revenueMultiplier;
    }
    const entries = Object.entries(byLoc)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 6);
    const rest = entries.slice(6);
    if (rest.length > 0) {
      const restTotal = rest.reduce((a, [, v]) => a + v, 0);
      top.push(['__other__', restTotal]);
    }
    return top;
  }, [state.activeServices]);

  const total = slices.reduce((a, [, v]) => a + v, 0);
  if (total === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] text-slate-600 uppercase tracking-widest">
        No revenue yet
      </div>
    );
  }

  // Build arc commands. The donut is stroked, not filled — gives a cleaner
  // HUD ring than pie slices.
  const r = 34;
  const cx = 48;
  const cy = 48;
  const circumference = 2 * Math.PI * r;
  let offsetPct = 0;
  const segments = slices.map(([loc, val], i) => {
    const pct = val / total;
    const dashArray = `${circumference * pct} ${circumference}`;
    const dashOffset = -(circumference * offsetPct);
    offsetPct += pct;
    const color = loc === '__other__' ? '#475569' : colorFor(loc);
    return (
      <circle
        key={`${loc}-${i}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
  });

  return (
    <div className="flex items-center gap-3">
      <span className="sr-only">Total revenue: {formatMoney(Math.round(total))} per month, across {slices.length} region{slices.length !== 1 ? 's' : ''}.</span>
      <svg width={96} height={96} className="flex-shrink-0" aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={8} />
        {segments}
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-white font-hud text-[11px] font-bold">
          {formatMoney(Math.round(total))}
        </text>
      </svg>
      <ul className="text-[10px] space-y-0.5 flex-1 min-w-0">
        {slices.map(([loc, val]) => {
          const locName = loc === '__other__' ? 'Other' : (LOCATION_MAP.get(loc)?.name || loc);
          const pct = Math.round((val / total) * 100);
          return (
            <li key={loc} className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: loc === '__other__' ? '#475569' : colorFor(loc) }}
              />
              <span className="text-slate-400 truncate flex-1">{locName}</span>
              <span className="text-slate-300 font-mono tabular-nums">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Fleet status gauges — 4 compact circles showing current fleet composition. */
function FleetGauges({ state }: { state: GameState }) {
  const ships = state.ships || [];
  const built = ships.filter(s => s.isBuilt);
  const idle = built.filter(s => s.status === 'idle').length;
  const mining = built.filter(s => s.status === 'mining').length;
  const transit = built.filter(s => s.status === 'in_transit').length;
  const total = built.length;

  const gauges: { label: string; value: number; color: string }[] = [
    { label: 'Total',   value: total,   color: '#22d3ee' },
    { label: 'Idle',    value: idle,    color: '#94a3b8' },
    { label: 'Mining',  value: mining,  color: '#fbbf24' },
    { label: 'Transit', value: transit, color: '#4ade80' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 h-full">
      {gauges.map(g => (
        <div key={g.label} className="flex flex-col items-center justify-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center border"
            style={{
              borderColor: `${g.color}60`,
              background: `radial-gradient(circle, ${g.color}20, transparent 70%)`,
              boxShadow: `0 0 10px ${g.color}30`,
            }}
          >
            <span className="font-hud text-sm font-bold" style={{ color: g.color }}>{g.value}</span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-slate-500 mt-1">{g.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Infrastructure — stacked bar of building count by tier. */
function InfrastructureFootprint({ state }: { state: GameState }) {
  const byTier = useMemo(() => {
    const tiers: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const b of state.buildings) {
      if (!b.isComplete) continue;
      const def = BUILDING_MAP.get(b.definitionId);
      if (!def) continue;
      const t = Math.min(5, Math.max(1, def.tier)) as 1 | 2 | 3 | 4 | 5;
      tiers[t]++;
    }
    return tiers;
  }, [state.buildings]);

  const total = (Object.values(byTier) as number[]).reduce((a, b) => a + b, 0);
  const TIER_COLOR = ['#94a3b8', '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b'];

  return (
    <div className="flex flex-col gap-2 h-full justify-center">
      <div className="flex items-baseline gap-2">
        <span className="font-hud text-2xl font-bold text-white tabular-nums">{total}</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">buildings</span>
      </div>
      {total > 0 && (
        <>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/[0.04]" aria-hidden="true">
            {([1, 2, 3, 4, 5] as const).map(t => {
              const pct = (byTier[t] / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={t}
                  style={{ width: `${pct}%`, background: TIER_COLOR[t - 1] }}
                  title={`T${t}: ${byTier[t]}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-mono tabular-nums">
            {([1, 2, 3, 4, 5] as const).map(t => (
              <span key={t} style={{ color: byTier[t] > 0 ? TIER_COLOR[t - 1] : '#475569' }}>
                T{t}·{byTier[t]}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardVizBlock({ state }: DashboardVizBlockProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Revenue donut */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="font-hud text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          Revenue / Region
        </div>
        <RevenueDonut state={state} />
      </div>

      {/* Fleet gauges */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3" style={{ ['--hud-color' as string]: 'rgba(74, 222, 128, 0.35)' }}>
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="font-hud text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          Fleet Status
        </div>
        <FleetGauges state={state} />
      </div>

      {/* Infrastructure */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3" style={{ ['--hud-color' as string]: 'rgba(167, 139, 250, 0.35)' }}>
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="font-hud text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          Infrastructure
        </div>
        <InfrastructureFootprint state={state} />
      </div>
    </div>
  );
}
