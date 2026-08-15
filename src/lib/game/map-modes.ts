// ─── Space Tycoon: Map Modes (Wave V4 — docs/VISUAL_DEPTH_2026-08.md §V4) ───
// "Stellaris lenses" for the solar map: Standard / Economy / Hazard /
// Territory / Logistics. Each mode recolors and re-badges EXISTING data —
// no new data sources. This module is the single derivation shared by BOTH
// renderers (SolarMap3D + SolarSystemCanvas — 2D parity is the a11y
// requirement), so the math lives here as pure functions of GameState.
//
// Accessibility invariant: a mode is never conveyed by color alone. Every
// ModeVisual carries a text `glyph` and/or `badge` string that the renderers
// must draw next to the location label, plus an `srText` sentence for the
// keyboard Location List / screen readers.

import type { GameState } from './types';
import { SERVICE_MAP } from './services';
import { BUILDING_MAP } from './buildings';
import { formatMoney } from './formulas';
import { ZONE_MAP } from './zone-influence';
import {
  LANES,
  ORBITAL_SLOT_POOLS,
  computeChokepoints,
  countPlayerBuildingsAt,
} from './spatial-strategy';

export type MapMode = 'standard' | 'economy' | 'hazard' | 'territory' | 'logistics';

export interface MapModeDef {
  id: MapMode;
  label: string;
  /** IconName from src/lib/game/icons.tsx (Wave V1 icon system). */
  icon: 'map' | 'money' | 'warning' | 'territory' | 'cargo-truck';
  /** One-line legend — shown as a text chip whenever the mode is active
   *  ("each mode's legend chip states meaning in text"). */
  legend: string;
}

export const MAP_MODES: MapModeDef[] = [
  { id: 'standard',  label: 'Standard',  icon: 'map',        legend: 'Normal view — locations, lanes, ships, hazards.' },
  { id: 'economy',   label: 'Economy',   icon: 'money',      legend: 'Monthly net P&L per location: ▲ profit (green), ▼ loss (red).' },
  { id: 'hazard',    label: 'Hazard',    icon: 'warning',    legend: 'Risk lens: ⚠ forecast telegraphs (amber), ✸ recent strikes (red).' },
  { id: 'territory', label: 'Territory', icon: 'territory',  legend: 'Zone standing at full strength: ♛ governor (gold), ◆ stakeholder (cyan).' },
  { id: 'logistics', label: 'Logistics', icon: 'cargo-truck', legend: 'Lanes & slots: ⇄ lane hub with traffic count, ◍ orbital-slot occupancy.' },
];

export const MAP_MODE_MAP = new Map(MAP_MODES.map(m => [m.id, m]));

/** Cycle to the next mode (keyboard `M` shortcut). Wraps. */
export function cycleMapMode(current: MapMode, dir: 1 | -1 = 1): MapMode {
  const idx = MAP_MODES.findIndex(m => m.id === current);
  const next = (idx < 0 ? 0 : idx + dir + MAP_MODES.length) % MAP_MODES.length;
  return MAP_MODES[next].id;
}

/** Per-location visual for the active mode. Renderers translate this into
 *  a tint ring/glow (color + intensity) AND a text glyph/badge (never color
 *  alone). Locations absent from the record render unchanged. */
export interface ModeVisual {
  /** Hex tint for the location's mode ring / glow. */
  tint: string;
  /** 0..1 — relative strength within this mode (ring alpha / glow size). */
  intensity: number;
  /** Short text glyph appended to the location label (e.g. '▲', '⚠×2'). */
  glyph: string;
  /** Optional second text row under the label (e.g. '+$12.5M/mo', '3/180 slots'). */
  badge: string | null;
  /** Screen-reader / Location List sentence fragment. */
  srText: string;
}

export const MODE_TINT = {
  profit: '#34d399',
  loss: '#f87171',
  forecast: '#fbbf24',
  struck: '#ef4444',
  governor: '#fbbf24',
  stakeholder: '#22d3ee',
  laneHub: '#22d3ee',
  slots: '#a78bfa',
} as const;

/** Recent-hazard lookback for the Hazard lens (matches the 60 s strike rings
 *  both renderers already draw, extended to 10 min so the lens keeps context
 *  after the ring fades). */
export const HAZARD_LENS_RECENT_MS = 10 * 60_000;

// ── Per-mode derivations (each pure; exported for tests) ─────────────────────

/** Economy lens: monthly net P&L per location — service revenue × multiplier
 *  minus service operating costs minus building maintenance. Same formula
 *  family as formulas.calculateNetIncome, bucketed by ServiceInstance /
 *  BuildingInstance.locationId (the "dashboard already computes per-location
 *  figures" data, derived here so both renderers share it). */
export function computeLocationPnL(state: GameState): Record<string, number> {
  const pnl: Record<string, number> = {};
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    pnl[svc.locationId] = (pnl[svc.locationId] || 0)
      + def.revenuePerMonth * svc.revenueMultiplier
      - def.operatingCostPerMonth;
  }
  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    pnl[bld.locationId] = (pnl[bld.locationId] || 0) - def.maintenanceCostPerMonth;
  }
  return pnl;
}

function economyVisuals(state: GameState): Record<string, ModeVisual> {
  const pnl = computeLocationPnL(state);
  const entries = Object.entries(pnl).filter(([, v]) => Math.round(v) !== 0);
  const maxAbs = entries.reduce((m, [, v]) => Math.max(m, Math.abs(v)), 0);
  const out: Record<string, ModeVisual> = {};
  for (const [locId, net] of entries) {
    const profit = net > 0;
    const rounded = Math.round(net);
    out[locId] = {
      tint: profit ? MODE_TINT.profit : MODE_TINT.loss,
      intensity: maxAbs > 0 ? Math.max(0.25, Math.abs(net) / maxAbs) : 0.25,
      glyph: profit ? '▲' : '▼',
      badge: `${profit ? '+' : '−'}${formatMoney(Math.abs(rounded))}/mo`,
      srText: profit
        ? `earning ${formatMoney(rounded)} per month`
        : `losing ${formatMoney(Math.abs(rounded))} per month`,
    };
  }
  return out;
}

/** Hazard lens: forecast telegraphs (state.hazardWarnings) + recent strikes
 *  (state.recentHazards within HAZARD_LENS_RECENT_MS of nowMs). A location
 *  both struck and forecast shows the struck (red) tint with both counts. */
function hazardVisuals(state: GameState, nowMs: number): Record<string, ModeVisual> {
  const warnings = new Map<string, number>();
  for (const w of state.hazardWarnings || []) {
    warnings.set(w.locationId, (warnings.get(w.locationId) || 0) + 1);
  }
  const struck = new Map<string, number>();
  for (const h of state.recentHazards || []) {
    if (nowMs - h.occurredAtMs > HAZARD_LENS_RECENT_MS) continue;
    struck.set(h.locationId, (struck.get(h.locationId) || 0) + 1);
  }
  const out: Record<string, ModeVisual> = {};
  const locIds = new Set<string>();
  warnings.forEach((_, locId) => locIds.add(locId));
  struck.forEach((_, locId) => locIds.add(locId));
  for (const locId of Array.from(locIds)) {
    const w = warnings.get(locId) || 0;
    const s = struck.get(locId) || 0;
    const parts: string[] = [];
    if (s > 0) parts.push(s > 1 ? `✸×${s}` : '✸');
    if (w > 0) parts.push(w > 1 ? `⚠×${w}` : '⚠');
    out[locId] = {
      tint: s > 0 ? MODE_TINT.struck : MODE_TINT.forecast,
      intensity: Math.min(1, 0.45 + 0.2 * (w + s)),
      glyph: parts.join(' '),
      badge: null,
      srText: [
        s > 0 ? `${s} recent hazard strike${s > 1 ? 's' : ''}` : '',
        w > 0 ? `${w} severe hazard${w > 1 ? 's' : ''} forecast next month` : '',
      ].filter(Boolean).join(', '),
    };
  }
  return out;
}

/** Territory lens: the W9 zone-standing tints promoted to full opacity —
 *  governor gold ♛ / stakeholder cyan ◆ per zone location. Governor wins
 *  where zones overlap (same precedence both renderers already use). */
export function computeStandingByLocation(state: GameState): Record<string, 'governor' | 'stakeholder'> {
  const out: Record<string, 'governor' | 'stakeholder'> = {};
  for (const zs of state.zoneStandings || []) {
    const kind: 'governor' | 'stakeholder' | null =
      zs.isGovernor ? 'governor' : zs.sharePct >= 1 ? 'stakeholder' : null;
    if (!kind) continue;
    const zone = ZONE_MAP.get(zs.zoneSlug);
    for (const locId of zone?.locations || []) {
      if (out[locId] !== 'governor') out[locId] = kind;
    }
  }
  return out;
}

function territoryVisuals(state: GameState): Record<string, ModeVisual> {
  const standing = computeStandingByLocation(state);
  const out: Record<string, ModeVisual> = {};
  for (const [locId, kind] of Object.entries(standing)) {
    out[locId] = {
      tint: kind === 'governor' ? MODE_TINT.governor : MODE_TINT.stakeholder,
      intensity: kind === 'governor' ? 1 : 0.7,
      glyph: kind === 'governor' ? '♛' : '◆',
      badge: kind === 'governor' ? 'Governor' : 'Stakeholder',
      srText: kind === 'governor' ? 'you govern this zone' : 'zone stakeholder',
    };
  }
  return out;
}

/** Logistics lens: lane hubs (chokepoints, weighted by the player's live
 *  in-transit traffic touching the location) + finite orbital-slot pools
 *  with the player's occupancy. SpatialStrategyPanel's popover keeps the
 *  detail tables; this lens paints the geography on the world. */
function logisticsVisuals(state: GameState): Record<string, ModeVisual> {
  const out: Record<string, ModeVisual> = {};

  // In-transit ships per lane endpoint (live traffic).
  const transitAt = new Map<string, number>();
  for (const ship of state.ships || []) {
    if (!ship.isBuilt || ship.status !== 'in_transit' || !ship.route) continue;
    for (const locId of [ship.route.from, ship.route.to]) {
      transitAt.set(locId, (transitAt.get(locId) || 0) + 1);
    }
  }

  const laneCountAt = new Map<string, number>();
  for (const lane of LANES) {
    laneCountAt.set(lane.from, (laneCountAt.get(lane.from) || 0) + 1);
    laneCountAt.set(lane.to, (laneCountAt.get(lane.to) || 0) + 1);
  }

  for (const cp of computeChokepoints()) {
    if (cp.severity === 'minor' && !transitAt.has(cp.locationId)) continue;
    const traffic = transitAt.get(cp.locationId) || 0;
    out[cp.locationId] = {
      tint: MODE_TINT.laneHub,
      intensity: cp.severity === 'critical' ? 1 : cp.severity === 'major' ? 0.65 : 0.4,
      glyph: traffic > 0 ? `⇄×${traffic}` : '⇄',
      badge: `${cp.laneCount} lanes${traffic > 0 ? ` · ${traffic} in transit` : ''}`,
      srText: `${cp.severity} chokepoint, ${cp.laneCount} shipping lanes${traffic > 0 ? `, ${traffic} of your ships in transit` : ''}`,
    };
  }

  // Orbital-slot pools override lane-hub visuals at the same location —
  // scarcity is the sharper signal at GEO / lunar / Mars orbits.
  for (const pool of ORBITAL_SLOT_POOLS) {
    const occupied = countPlayerBuildingsAt(state, pool.locationId);
    const laneHub = out[pool.locationId];
    out[pool.locationId] = {
      tint: MODE_TINT.slots,
      intensity: Math.max(0.5, Math.min(1, occupied / pool.totalSlots + 0.5)),
      glyph: laneHub ? `◍ ${laneHub.glyph}` : '◍',
      badge: `${occupied}/${pool.totalSlots} slots`,
      srText: `${occupied} of ${pool.totalSlots} orbital slots occupied${laneHub ? `, ${laneHub.srText}` : ''}`,
    };
  }

  return out;
}

/** THE mode derivation — pure function of (state, mode, nowMs), shared by
 *  both renderers. Standard mode returns an empty record (no repaint). */
export function computeModeVisuals(state: GameState, mode: MapMode, nowMs: number): Record<string, ModeVisual> {
  switch (mode) {
    case 'economy': return economyVisuals(state);
    case 'hazard': return hazardVisuals(state, nowMs);
    case 'territory': return territoryVisuals(state);
    case 'logistics': return logisticsVisuals(state);
    case 'standard':
    default:
      return {};
  }
}
