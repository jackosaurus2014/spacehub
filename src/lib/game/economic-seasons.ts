// ─── Space Tycoon: Economic Seasons — Commodity Super-Cycles (LS7) ──────────
// docs/LIVE_SERVICE_2026-08.md §LS7. "Each 28-day season now has an
// announced economic theme — a commodity super-cycle published one week
// ahead on the calendar ('S9: Volatiles Boom — water/methane demand +X%,
// He-3 glut') implemented through the existing demand/mean-reversion
// machinery so markets differ season to season."
//
// Design: a super-cycle THEME is a pure function of the season number
// (seasonal-events.ts's existing deterministic 1-indexed season clock —
// getCurrentSeasonNumber/getSeasonSchedule). No new DB table, no new save
// field: exactly the same "DB-free deterministic schedule" discipline
// seasonal-events.ts's own header documents ("the schedule is a pure
// function of time — no DB state needed to know what's next"). Because the
// theme is derived the same way on the server (mean-revert cron) and the
// client (calendar view / SeasonPanel), every player sees the identical
// cycle for the identical season with zero synchronization risk.
//
// The bias is applied as a SHIFTED MEAN-REVERSION TARGET, not a one-off
// price shock: /api/space-tycoon/market/mean-revert (market-engine.ts's
// calculateIdleDecay) already drifts each resource's currentPrice toward a
// target over time. Previously that target was always resource.basePrice;
// this module computes a season-adjusted target
// (basePrice * (1 + bias)) so the market "heals" toward the CURRENT season's
// economic reality instead of erasing it. A trade can still move price
// further in either direction — the super-cycle only moves where idle price
// discovery settles, exactly the demand-modifier hook BALANCE.md prescribes
// for this kind of world-shared bias.
//
// BALANCE.md cap: no single season may move a commodity's equilibrium more
// than ±25% ("bounded so no season invalidates a build" — LS7 spec). Every
// bias in SUPER_CYCLE_THEMES is authored inside that band, and
// getResourceBias() clamps defensively regardless.

import type { ResourceId } from './resources';
import { RESOURCE_MAP } from './resources';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Hard cap on any single resource's super-cycle bias — BALANCE.md /
 *  LS7 spec: "bounded ±25% so no season invalidates a build." */
export const MAX_SUPER_CYCLE_BIAS = 0.25;

/** How far ahead of a season's start its super-cycle is published on the
 *  Mission Calendar (LS7 spec: "published one week ahead"). Forecastable —
 *  the intelligence-layer play is positioning inventory before the cycle
 *  lands (CLAUDE.md "market intelligence is a first-class feature"). */
export const SUPER_CYCLE_ANNOUNCE_LEAD_MS = 7 * 24 * 60 * 60 * 1000;

export type ResourceCategory = 'water' | 'metal' | 'precious' | 'rare_earth' | 'hydrocarbon' | 'exotic';

export interface SuperCycleTheme {
  id: string;
  name: string;
  icon: string;
  /** Player-facing summary, e.g. "Volatiles Boom — water/methane demand
   *  surges while fusion-grade He-3 gluts the market." */
  description: string;
  /** Bias applied to every resource in the category, as a fraction of
   *  basePrice (e.g. 0.20 = mean-reversion target raised 20%). */
  categoryBias: Partial<Record<ResourceCategory, number>>;
  /** Per-resource overrides layered on top of the category bias (e.g. the
   *  spec's named "He-3 glut" during a water/hydrocarbon boom) — replaces,
   *  does not add to, the category value for that one resource. */
  resourceOverrides?: Partial<Record<ResourceId, number>>;
}

// ─── Theme catalog ────────────────────────────────────────────────────────────
// Six themes, each authored within the ±25% band, each pairing a demand
// surge in one or two categories with a softening somewhere else — a real
// stockpile-before-it-lands decision, never a free system-wide bull run.

export const SUPER_CYCLE_THEMES: SuperCycleTheme[] = [
  {
    id: 'volatiles_boom',
    name: 'Volatiles Boom',
    icon: '💧',
    description: 'Water and hydrocarbon demand surges system-wide for propellant and colony life support — while a fusion capacity glut softens Helium-3.',
    categoryBias: { water: 0.20, hydrocarbon: 0.15, exotic: -0.08 },
    resourceOverrides: { helium3: -0.15 },
  },
  {
    id: 'metals_squeeze',
    name: 'Metals Squeeze',
    icon: '⚙️',
    description: 'Shipyard expansion across the belt tightens structural-metal supply. Precious metals soften as speculative capital rotates into the squeeze.',
    categoryBias: { metal: 0.22, precious: -0.08 },
  },
  {
    id: 'precious_rally',
    name: 'Precious Rally',
    icon: '💎',
    description: 'A flight to hard assets rallies platinum-group and gold prices; rare-earth electronics demand rides the same wave.',
    categoryBias: { precious: 0.25, rare_earth: 0.10 },
  },
  {
    id: 'rare_earth_crunch',
    name: 'Rare Earth Crunch',
    icon: '🔬',
    description: 'Sensor and propulsion manufacturers bid up rare-earth elements ahead of a fleet refresh cycle. Structural metals ease as belt output catches up.',
    categoryBias: { rare_earth: 0.25, metal: -0.05 },
  },
  {
    id: 'exotic_frontier_surge',
    name: 'Exotic Frontier Surge',
    icon: '✨',
    description: 'Interstellar-prelude research contracts spike demand for exotic materials and Helium-3, drawing capital (and water haulers) away from the inner system.',
    categoryBias: { exotic: 0.20, water: -0.08 },
  },
  {
    id: 'belt_glut',
    name: 'Belt Glut',
    icon: '☄️',
    description: 'A record asteroid-rush harvest floods the market with common and precious metals alike. Buyers, not miners, have the leverage this season.',
    categoryBias: { metal: -0.15, precious: -0.10 },
  },
];

export const SUPER_CYCLE_THEME_MAP = new Map(SUPER_CYCLE_THEMES.map(t => [t.id, t]));

// ─── Seeded deterministic selection ──────────────────────────────────────────
// Same small string-hash + LCG pattern seasonal-events.ts uses for its daily
// challenge selection (hashString/nextSeed) — kept local here so this module
// has no coupling to that file's internals (both stay pure, both stay
// independently testable).

function hashSeasonSeed(seasonNumber: number): number {
  let hash = 0;
  const str = `super-cycle-${Math.max(1, Math.floor(seasonNumber))}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * The super-cycle theme for a given 1-indexed season number. Pure and
 * deterministic — identical output for identical input on server and
 * client, forever (no DB, no clock read). Adjacent seasons never repeat the
 * same theme back-to-back (a themeless "just basePrice again" season would
 * read as a bug, not a deliberate calm season).
 *
 * Resolved ITERATIVELY from season 1 forward (not by comparing raw hashes)
 * so the no-adjacent-repeat guarantee holds against the actual resolved
 * theme of season n-1, including one that was itself bumped — the same
 * bounded-walk-from-1 discipline getCurrentSeasonNumber (seasonal-events.ts)
 * already uses for schedule lookups. O(n), but n only grows a few dozen
 * per real year (28-day seasons) — fine at any realistic scale.
 */
export function getSuperCycleForSeason(seasonNumber: number): SuperCycleTheme {
  const target = Math.max(1, Math.floor(seasonNumber));
  const themes = SUPER_CYCLE_THEMES;
  let idx = Math.abs(hashSeasonSeed(1)) % themes.length;
  for (let n = 2; n <= target; n++) {
    let next = Math.abs(hashSeasonSeed(n)) % themes.length;
    if (next === idx) next = (next + 1) % themes.length;
    idx = next;
  }
  return themes[idx];
}

// ─── Bias lookup ──────────────────────────────────────────────────────────────

/** This season's bias for one resource, clamped to ±MAX_SUPER_CYCLE_BIAS
 *  regardless of what the theme table authored (defense in depth — a typo'd
 *  theme can never blow the cap). 0 = no season effect on this resource. */
export function getResourceBias(theme: SuperCycleTheme, resourceId: ResourceId): number {
  const override = theme.resourceOverrides?.[resourceId];
  if (override !== undefined) {
    return clampBias(override);
  }
  const def = RESOURCE_MAP.get(resourceId);
  const category = def?.category as ResourceCategory | undefined;
  if (!category) return 0;
  const bias = theme.categoryBias[category];
  return bias === undefined ? 0 : clampBias(bias);
}

/** Same lookup keyed by MarketResource's plain `category` string column
 *  (server rows don't carry a typed ResourceCategory) — used by the
 *  mean-revert cron, which reads MarketResource rows directly rather than
 *  RESOURCE_MAP. Falls back to 0 for slugs/categories the theme doesn't
 *  mention. */
export function getResourceBiasBySlug(
  theme: SuperCycleTheme,
  resourceSlug: string,
  category: string,
): number {
  const override = theme.resourceOverrides?.[resourceSlug as ResourceId];
  if (override !== undefined) return clampBias(override);
  const bias = theme.categoryBias[category as ResourceCategory];
  return bias === undefined ? 0 : clampBias(bias);
}

function clampBias(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-MAX_SUPER_CYCLE_BIAS, Math.min(MAX_SUPER_CYCLE_BIAS, value));
}

/**
 * The mean-reversion TARGET price for a resource this season — what
 * calculateIdleDecay should drift `currentPrice` toward, in place of raw
 * basePrice. Always positive (a -25% bias on a well-formed basePrice never
 * reaches zero).
 */
export function getSeasonalMeanRevertTarget(
  basePrice: number,
  resourceSlug: string,
  category: string,
  seasonNumber: number,
): number {
  const theme = getSuperCycleForSeason(seasonNumber);
  const bias = getResourceBiasBySlug(theme, resourceSlug, category);
  return Math.max(1, Math.round(basePrice * (1 + bias)));
}

/** Human-readable "+20% water demand" style line for one resource under a
 *  theme, for UI/log copy. Returns null when the theme doesn't touch this
 *  resource (nothing to announce). */
export function formatBiasLabel(theme: SuperCycleTheme, resourceId: ResourceId): string | null {
  const bias = getResourceBias(theme, resourceId);
  if (bias === 0) return null;
  const def = RESOURCE_MAP.get(resourceId);
  const pct = Math.round(Math.abs(bias) * 100);
  const direction = bias > 0 ? 'demand' : 'glut';
  return `${def?.name || resourceId} ${direction} ${bias > 0 ? '+' : '-'}${pct}%`;
}

/** Every resource this theme meaningfully touches (bias !== 0), sorted by
 *  magnitude descending — feeds the calendar announcement / SeasonPanel
 *  banner without either duplicating the theme's category math. */
export function getThemeHeadlines(theme: SuperCycleTheme): { resourceId: ResourceId; bias: number; label: string }[] {
  const out: { resourceId: ResourceId; bias: number; label: string }[] = [];
  for (const def of Array.from(RESOURCE_MAP.values())) {
    const bias = getResourceBias(theme, def.id);
    if (bias === 0) continue;
    const label = formatBiasLabel(theme, def.id);
    if (label) out.push({ resourceId: def.id, bias, label });
  }
  return out.sort((a, b) => Math.abs(b.bias) - Math.abs(a.bias));
}
