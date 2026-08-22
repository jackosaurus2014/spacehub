// ─── Space Tycoon: Radial map command menu (Wave A2, item 1) ────────────────
// Sins of a Solar Empire's signature interaction: the verbs live at the
// cursor, on the body you clicked, not in a side panel three metres away.
//
// This module owns the two PURE halves of that interaction so both the menu
// component and the unit tests can share them:
//
//   1. deriveRadialActions() — the action set for a location, derived from
//      what the game ACTUALLY supports there and from the player's current
//      state. Nothing is invented: every action maps to an existing engine
//      handler or an existing tab. Unavailable actions are returned
//      DISABLED-WITH-REASON (never hidden), matching how the rest of the game
//      gates — e.g. the orbital slot gate's verbatim "…saturated — win a
//      slot-lease auction to build here" text is passed straight through.
//
//   2. computeRadialLayout() — the arc geometry, including the near-edge
//      repositioning that keeps every 44px target on screen at 375px.
//
// No React, no DOM, no three.js.

import type { GameState } from './types';
import type { IconName } from './icons';
import { LOCATION_MAP } from './solar-system';
import { BUILDINGS } from './buildings';
import { formatMoney } from './formulas';
import { getTierUnlockedTabs, isFoldedFeatureUnlocked, FOLDED_FEATURE_TIERS } from './corporation-tiers';
import { getCommandQueueCapacity } from './command-queue';
import { ORBITAL_SLOT_MAP, checkOrbitalSlotGate } from './spatial-strategy';
import { computeSlotRing } from './map-bodies';
import { INTERSTELLAR_SYSTEM_MAP, getJumpPrerequisites } from './interstellar';
import { getExpeditionCapableShips, getExpeditionLaunchReadiness } from './expeditions';

export type RadialActionId =
  | 'detail'    // open the full MapContextPanel overview
  | 'unlock'    // pay to unlock a locked location (engine handler)
  | 'build'     // MapContextPanel → Build sub-view (BuildPanel, locked to here)
  | 'dispatch'  // MapContextPanel → Dispatch sub-view
  | 'demand'    // Markets hub → Analytics → Demand map
  | 'orders'    // Fleet tab → Standing Orders (command queue + directives)
  | 'slots';    // Map HUD → Spatial Strategy → Orbital Slots

export interface RadialAction {
  id: RadialActionId;
  /** Short label rendered around the ring. */
  label: string;
  icon: IconName;
  /** Sentence describing what activating this does (screen readers + the
   *  focused-item readout under the ring). */
  description: string;
  enabled: boolean;
  /** Present iff !enabled. Rendered verbatim and read by screen readers. */
  reason?: string;
  /** Live value chip (e.g. '4 idle', '15/180 slots'). Null = no chip. */
  detail: string | null;
}

/** Ring order — 'detail' first (top of the arc) so the previous behaviour
 *  (click → panel) is always the first thing under the keyboard cursor. */
const ACTION_ORDER: RadialActionId[] = ['detail', 'build', 'dispatch', 'unlock', 'slots', 'demand', 'orders'];

function tabUnlocked(state: GameState, tab: 'market' | 'fleet'): boolean {
  return getTierUnlockedTabs(state.corporationTier || 1).includes(tab);
}

/**
 * The action set for `locationId`. Order is stable (ACTION_ORDER) so the
 * ring doesn't reshuffle under the player's cursor between openings.
 *
 * 'unlock' is the only conditionally-PRESENT action: it is meaningless once
 * the location is unlocked (it isn't "unavailable", it's finished). Every
 * other action is always present, disabled-with-reason when it can't run.
 */
export function deriveRadialActions(state: GameState, locationId: string, now: number = Date.now()): RadialAction[] {
  const loc = LOCATION_MAP.get(locationId);
  const name = loc?.name || locationId;
  const unlocked = state.unlockedLocations.includes(locationId);
  const byId = new Map<RadialActionId, RadialAction>();

  // ── detail ────────────────────────────────────────────────────────────────
  byId.set('detail', {
    id: 'detail',
    label: 'Detail',
    icon: 'map',
    description: `Open the full command panel for ${name}`,
    enabled: true,
    detail: null,
  });

  // ── unlock (locked locations only) ────────────────────────────────────────
  if (loc && !unlocked) {
    const missingResearch = loc.requiredResearch.filter(r => !state.completedResearch.includes(r));
    const shortfall = loc.unlockCost - state.money;
    const canUnlock = missingResearch.length === 0 && shortfall <= 0;
    byId.set('unlock', {
      id: 'unlock',
      label: 'Unlock',
      icon: 'lock',
      description: `Unlock ${name} for ${formatMoney(loc.unlockCost)}`,
      enabled: canUnlock,
      reason: canUnlock
        ? undefined
        : missingResearch.length > 0
          ? `Research required: ${missingResearch.map(r => r.replace(/_/g, ' ')).join(', ')}`
          : `Need ${formatMoney(shortfall)} more`,
      detail: formatMoney(loc.unlockCost),
    });
  }

  // ── build ─────────────────────────────────────────────────────────────────
  {
    const buildable = BUILDINGS.filter(
      def => def.requiredLocation === locationId
        && def.requiredResearch.every(r => state.completedResearch.includes(r)),
    ).length;
    const totalHere = BUILDINGS.filter(def => def.requiredLocation === locationId).length;
    const gate = checkOrbitalSlotGate(state, locationId, now);
    let enabled = true;
    let reason: string | undefined;
    if (!unlocked) {
      enabled = false;
      reason = `Unlock ${name} first`;
    } else if (totalHere === 0) {
      enabled = false;
      reason = 'No construction is sited at this location';
    } else if (buildable === 0) {
      enabled = false;
      reason = `Research required — ${totalHere} construction${totalHere === 1 ? '' : 's'} here are still locked`;
    } else if (!gate.allowed) {
      enabled = false;
      reason = gate.reason; // verbatim slot-gate copy
    }
    byId.set('build', {
      id: 'build',
      label: 'Build',
      icon: 'build',
      description: `Start construction at ${name}`,
      enabled,
      reason,
      detail: buildable > 0 ? `${buildable} available` : null,
    });
  }

  // ── dispatch ──────────────────────────────────────────────────────────────
  {
    const ships = (state.ships || []).filter(s => s.isBuilt);
    const idleElsewhere = ships.filter(s => s.status === 'idle' && s.currentLocation !== locationId).length;
    const busy = ships.filter(s => s.status !== 'idle').length;
    let enabled = true;
    let reason: string | undefined;
    if (!unlocked) {
      enabled = false;
      reason = `Unlock ${name} first`;
    } else if (ships.length === 0) {
      enabled = false;
      reason = 'You have no ships yet — build one in the Fleet tab';
    } else if (idleElsewhere === 0) {
      enabled = false;
      reason = busy > 0
        ? `No idle ships — ${busy} mining, surveying or already en route`
        : 'Every idle ship is already stationed here';
    }
    byId.set('dispatch', {
      id: 'dispatch',
      label: 'Dispatch',
      icon: 'fleet',
      description: `Send a ship to ${name}`,
      enabled,
      reason,
      detail: idleElsewhere > 0 ? `${idleElsewhere} idle` : null,
    });
  }

  // ── slots (locations with a finite orbital-slot pool only) ────────────────
  if (ORBITAL_SLOT_MAP.has(locationId)) {
    const spatialUnlocked = isFoldedFeatureUnlocked(state.corporationTier || 1, 'spatial');
    const ring = computeSlotRing(state, locationId, now);
    // PvP Discoverability pass (2026-08): when the pool is SATURATED, the
    // arc says so in the description a screen reader reads out and a
    // keyboard user sees under the ring. The state was already in `ring`
    // (map-bodies.computeSlotRing) — it just never reached this verb, so
    // the one moment a player most needs to know that leases exist passed
    // silently. No new derivation, no new mechanic.
    const saturated = !!ring && ring.synced && ring.bucket === 'saturated';
    const leased = !!ring && ring.leased;
    byId.set('slots', {
      id: 'slots',
      label: 'Slots',
      icon: 'target',
      description: saturated && !leased
        ? `${name} is at capacity — new construction here needs a slot lease won at auction`
        : `Orbital slot inventory and lease auctions at ${name}`,
      enabled: spatialUnlocked,
      reason: spatialUnlocked ? undefined : `Spatial Strategy unlocks at Corporation Tier ${FOLDED_FEATURE_TIERS.spatial}`,
      detail: ring
        ? (ring.synced
            // "FULL" is a WORD, not a colour — greyscale/screen-reader safe.
            ? `${ring.occupied}/${ring.total} slots${saturated ? ' · FULL' : ''}`
            : `you ${ring.yours}/${ring.total}`)
        : null,
    });
  }

  // ── demand ────────────────────────────────────────────────────────────────
  {
    const marketUnlocked = tabUnlocked(state, 'market');
    const intelUnlocked = isFoldedFeatureUnlocked(state.corporationTier || 1, 'intelligence');
    byId.set('demand', {
      id: 'demand',
      label: 'Demand',
      icon: 'market',
      description: 'Open the demand map — finite service demand pools per location',
      enabled: marketUnlocked && intelUnlocked,
      reason: !marketUnlocked
        ? 'Markets unlock as your corporation grows'
        : !intelUnlocked
          ? `Market analytics unlock at Corporation Tier ${FOLDED_FEATURE_TIERS.intelligence}`
          : undefined,
      detail: null,
    });
  }

  // ── orders ────────────────────────────────────────────────────────────────
  {
    const fleetUnlocked = tabUnlocked(state, 'fleet');
    const capacity = getCommandQueueCapacity(state);
    const queued = (state.commandQueue || []).length;
    byId.set('orders', {
      id: 'orders',
      label: 'Orders',
      icon: 'cal-queue',
      description: 'Open standing orders — command queue and standing directives',
      enabled: fleetUnlocked,
      reason: fleetUnlocked ? undefined : 'Standing orders unlock with the Fleet tab',
      detail: fleetUnlocked ? `${queued}/${capacity} queued` : null,
    });
  }

  return ACTION_ORDER.map(id => byId.get(id)).filter((a): a is RadialAction => !!a);
}

// ─── Galactic-layer action set (Wave A4) ─────────────────────────────────────
// The solar action set above is LOCATION-shaped (build / dispatch / slots /
// demand) and none of those verbs exist at a star system: you cannot site a
// construction 4.24 light-years away, there is no orbital-slot pool out there,
// and the demand-pool map is a Sol-system instrument. Rather than force the
// same seven items and disable five of them — which would be a lie about what
// the interstellar layer is — the galactic layer gets its OWN, smaller arc of
// verbs that are all genuinely meaningful there. Every one routes to an
// existing handler or tab; nothing new is invented.

export type SystemRadialActionId =
  | 'sys-detail'      // open the full MapContextPanel system dossier
  | 'sys-expedition'  // MapContextPanel → Plan Expedition sub-view
  | 'sys-research'    // Research tab — the jump-drive chain gating this system
  | 'sys-fleet'       // Fleet tab — build a Starfarer / Colony Ark
  | 'sys-gateway';    // Interstellar Gateway (Mission Control)

/** Same shape as RadialAction so the menu component renders one thing. */
export interface SystemRadialAction {
  id: SystemRadialActionId;
  label: string;
  icon: IconName;
  description: string;
  enabled: boolean;
  reason?: string;
  detail: string | null;
}

const SYSTEM_ACTION_ORDER: SystemRadialActionId[] = [
  'sys-detail', 'sys-expedition', 'sys-research', 'sys-fleet', 'sys-gateway',
];

/**
 * The galactic action set for `systemId`. Gating runs the expedition planner
 * itself (getExpeditionLaunchReadiness) so the arc can never offer a launch
 * the planner would refuse — nor refuse one the planner would accept.
 *
 * E3.1: this used to require `exotic_fuel` in inventory, which no Sol-side
 * source can supply. The planner buys the shortfall at a 1.25x premium; the
 * arc now gates on that same affordability rule.
 */
export function deriveSystemRadialActions(state: GameState, systemId: string): SystemRadialAction[] {
  const sys = INTERSTELLAR_SYSTEM_MAP.get(systemId);
  const name = sys?.name || systemId;
  const missing = sys ? getJumpPrerequisites(systemId, state.completedResearch) : [];
  const readiness = sys ? getExpeditionLaunchReadiness(state, systemId) : null;
  const ships = getExpeditionCapableShips(state);
  const colony = (state.interstellarColonies || []).find(c => c.systemId === systemId);

  const byId = new Map<SystemRadialActionId, SystemRadialAction>();

  byId.set('sys-detail', {
    id: 'sys-detail',
    label: 'Dossier',
    icon: 'map',
    description: `Open the full system dossier for ${name}`,
    enabled: true,
    detail: sys ? `${sys.distanceLy.toFixed(2)} ly` : null,
  });

  {
    let enabled = true;
    let reason: string | undefined;
    if (!sys || !readiness) {
      enabled = false;
      reason = 'Unknown destination system';
    } else if (!readiness.canLaunch) {
      enabled = false;
      reason = readiness.blockers[0] || 'Launch unavailable';
    }
    byId.set('sys-expedition', {
      id: 'sys-expedition',
      label: 'Expedition',
      icon: 'comet',
      description: `Plan an expedition to ${name}`,
      enabled,
      reason,
      detail: ships.length > 0 ? `${ships.length} ready` : null,
    });
  }

  byId.set('sys-research', {
    id: 'sys-research',
    label: 'Research',
    icon: 'research',
    description: missing.length > 0
      ? `Open the research tree — ${missing.length} prerequisite${missing.length === 1 ? '' : 's'} still block ${name}`
      : `Open the research tree — every jump prerequisite for ${name} is complete`,
    enabled: true,
    detail: missing.length > 0 ? `${missing.length} missing` : 'complete',
  });

  byId.set('sys-fleet', {
    id: 'sys-fleet',
    label: 'Shipyard',
    icon: 'fleet',
    description: 'Open the shipyard — expedition-capable hulls are built here',
    enabled: tabUnlocked(state, 'fleet'),
    reason: tabUnlocked(state, 'fleet') ? undefined : 'The Fleet tab unlocks as your corporation grows',
    detail: `${ships.length} idle`,
  });

  byId.set('sys-gateway', {
    id: 'sys-gateway',
    label: 'Gateway',
    icon: 'interstellar',
    description: 'Open the Interstellar Gateway — expeditions, colonies and trade routes',
    enabled: true,
    detail: colony ? 'colony' : null,
  });

  return SYSTEM_ACTION_ORDER.map(id => byId.get(id)).filter((a): a is SystemRadialAction => !!a);
}

// ─── Arc geometry ────────────────────────────────────────────────────────────

export interface RadialLayoutInput {
  count: number;
  /** Click point, relative to the map container. */
  anchorX: number;
  anchorY: number;
  viewportW: number;
  viewportH: number;
  /** Desired ring radius (px). Shrinks automatically on small viewports. */
  radius?: number;
  /** Half-size of one action target (px). 26 → 52px targets (>44px floor). */
  itemRadius?: number;
  /** Keep-out margin from the container edge (px). */
  padding?: number;
}

export interface RadialLayoutItem {
  x: number;
  y: number;
  angleRad: number;
}

export interface RadialLayout {
  /** Ring centre — the anchor, pulled inward when the anchor is near an edge
   *  so the whole arc stays on screen. */
  centerX: number;
  centerY: number;
  radius: number;
  /** The original click point (the ring draws a tether back to it). */
  anchorX: number;
  anchorY: number;
  /** True when the ring had to be moved off the click point to stay visible. */
  displaced: boolean;
  items: RadialLayoutItem[];
}

export const RADIAL_DEFAULT_RADIUS = 96;
export const RADIAL_DEFAULT_ITEM_RADIUS = 26; // 52px target, above the 44px floor
export const RADIAL_DEFAULT_PADDING = 8;
export const RADIAL_MIN_RADIUS = 52;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Full-circle layout starting at 12 o'clock and running clockwise (so arrow
 * keys and the visual order agree), repositioned to stay on screen.
 *
 * Near-edge handling is a CENTRE CLAMP rather than an arc flip: the ring keeps
 * its full circle (predictable for keyboard traversal — item N is always at
 * the same angle) and slides inward until it fits, with `displaced` telling
 * the component to draw a tether back to the real click point. If the
 * container is smaller than the ring in an axis, the ring centres on that
 * axis instead.
 */
export function computeRadialLayout(input: RadialLayoutInput): RadialLayout {
  const {
    count,
    anchorX,
    anchorY,
    viewportW,
    viewportH,
    itemRadius = RADIAL_DEFAULT_ITEM_RADIUS,
    padding = RADIAL_DEFAULT_PADDING,
  } = input;

  const desired = input.radius ?? RADIAL_DEFAULT_RADIUS;
  const fitRadius = Math.min(viewportW, viewportH) / 2 - itemRadius - padding;
  const radius = Math.max(0, Math.min(desired, Math.max(RADIAL_MIN_RADIUS, fitRadius)));

  const margin = radius + itemRadius + padding;
  const centerX = viewportW >= margin * 2 ? clamp(anchorX, margin, viewportW - margin) : viewportW / 2;
  const centerY = viewportH >= margin * 2 ? clamp(anchorY, margin, viewportH - margin) : viewportH / 2;

  const n = Math.max(1, Math.floor(count));
  const items: RadialLayoutItem[] = [];
  for (let i = 0; i < n; i++) {
    const angleRad = -Math.PI / 2 + (i / n) * Math.PI * 2;
    items.push({
      x: centerX + Math.cos(angleRad) * radius,
      y: centerY + Math.sin(angleRad) * radius,
      angleRad,
    });
  }

  return {
    centerX,
    centerY,
    radius,
    anchorX,
    anchorY,
    displaced: Math.abs(centerX - anchorX) > 0.5 || Math.abs(centerY - anchorY) > 0.5,
    items,
  };
}

/** Arrow-key traversal around the ring (wraps in both directions). */
export function cycleRadialIndex(current: number, dir: 1 | -1, count: number): number {
  if (count <= 0) return 0;
  return ((current + dir) % count + count) % count;
}
