// ─── Space Tycoon: Location detail console model (Wave A2.2) ────────────────
// docs/VISUAL_AAA_2026-08.md §A2.2 — "Planet / location detail with orbital
// rings (MoO2 + Stellaris)". Sins of a Solar Empire's planet screen renders
// the body large, ringed by its orbital structure slots, with the numbers that
// matter legible at a glance. Ours was a competent text panel.
//
// This module owns the PURE half so the component and the unit tests share it:
//
//   1. deriveSlotRingDetail() — takes Wave A's computeSlotRing() (NOT a
//      reimplementation) and maps the "yours" arc down to the ACTUAL building
//      instances occupying it, so a ring segment can answer "what is that?".
//      Other corporations' occupancy is a server-side AGGREGATE count with no
//      per-corp attribution available client-side — the model says so
//      explicitly rather than inventing owners (intel canon: aggregate is
//      free, named detail is earned).
//
//   2. deriveLocationVitals() — MoO2-style icon-first vitals, every figure
//      read from the engine's OWN selector, never re-derived:
//
//        extraction pressure  getExtractionPressureMultiplier (extraction-pressure.ts)
//                             over MINING_PRODUCTION for the player's real
//                             services here — the exact pair the tick reads.
//        demand pools         state.demandPools, keyed by demandPoolKey()
//                             (demand-pools.ts), staleness-gated identically.
//        labour / wages       getWageIndex (labor-market.ts). SYSTEM-WIDE by
//                             construction — the index is per crew type, not
//                             per location — and labelled as such.
//        lanes                LANES + getLaneBonus (trade-lanes.ts) +
//                             getChokepointPremium (spatial-strategy.ts).
//        hazard exposure      getLocationCapabilityBonus(…,'hazardShielding')
//                             + state.hazardWarnings + state.recentHazards.
//        tariff / toll        computeFreightTolls' own snapshot + exemption
//                             rules (offense.ts), read not re-implemented.
//
// OMITTED RATHER THAN GUESSED — surfaced verbatim in the console's footnote,
// never silently dropped (the A1.3 disclosure discipline):
//   • per-corporation attribution of the "others" slot arc — the server sends
//     a count, not a roster;
//   • NPC production/consumption rates at this location — no per-location NPC
//     ledger exists client-side;
//   • a location-specific wage index — the labour market is per crew type;
//   • realized (as opposed to posted) toll spend — that lands in the P&L.
//
// No React, no DOM, no three.js.

import type { GameState } from './types';
import type { IconName } from './icons';
import { LOCATION_MAP } from './solar-system';
import { BUILDING_MAP } from './buildings';
import { MINING_PRODUCTION, RESOURCE_MAP, type ResourceId } from './resources';
import { computeSlotRing, type SlotRingModel } from './map-bodies';
import { isSlotOccupant } from './spatial-strategy';
import {
  LANES,
  getChokepointPremium,
  computeChokepoints,
  type ShippingLane,
} from './spatial-strategy';
// (isSlotOccupant is imported above from the same module.)
import { getLaneBonus, LANE_BONUS_CAP } from './trade-lanes';
import { getExtractionPressureMultiplier, getDepositGrade, type DepositGrade } from './extraction-pressure';
import {
  demandPoolKey,
  CATEGORY_LABELS,
  SERVICE_CATEGORIES,
  DEMAND_POOL_STALE_MS,
  type ServiceCategory,
} from './demand-pools';
import { getWageIndex, workforceDataToHeadcount, WAGE_INDEX_NEUTRAL } from './labor-market';
import { WORKER_TYPES, type WorkerType } from './workforce';
import { getLocationCapabilityBonus } from './building-capabilities';
import { LOCATION_TO_ZONE, ZONE_MAP } from './zone-influence';
import { clampTollPct, OFFENSE_SNAPSHOT_STALE_MS } from './offense';
import { isInFrontier } from './frontier';

// ─── 1. Orbital ring → real buildings ────────────────────────────────────────

export interface SlotOccupantSlice {
  /** The building instance actually sitting in this slot. */
  instanceId: string;
  definitionId: string;
  /** Building definition name, or the raw id when the definition is unknown. */
  name: string;
  category: string;
  /** Fraction of the FULL circle this occupant's tick starts / ends at —
   *  carved out of the ring's own 'yours' segment, so the tick marks always
   *  land inside the arc computeSlotRing drew. */
  startFrac: number;
  endFrac: number;
}

export interface SlotRingDetail {
  /** Verbatim from map-bodies.computeSlotRing — never recomputed here. */
  ring: SlotRingModel;
  /** One slice per operational building of yours occupying a slot, in stable
   *  instance order. Length === ring.yours unless truncated (below). */
  occupants: SlotOccupantSlice[];
  /** How many of your occupants were dropped from `occupants` because the arc
   *  cannot carry more legible ticks. 0 in every realistic save. */
  truncated: number;
  /** True when the server-wide occupancy snapshot is missing: the 'others'
   *  and 'free' arcs are then not knowable and the UI must say so. */
  unsynced: boolean;
}

/** Above this the per-building ticks stop being individually legible on a
 *  380px panel; the arc keeps its full extent and the overflow is reported. */
export const MAX_SLOT_OCCUPANT_TICKS = 32;

/**
 * The ring plus the mapping from its 'yours' arc to the real building
 * instances. Returns null for locations with no finite orbital-slot pool
 * (surfaces, LEO, the belt…) — exactly where computeSlotRing returns null.
 */
export function deriveSlotRingDetail(
  state: GameState,
  locationId: string,
  now: number = Date.now(),
): SlotRingDetail | null {
  const ring = computeSlotRing(state, locationId, now);
  if (!ring) return null;

  // The SAME predicate spatial-strategy.countPlayerBuildingsAt counts with,
  // so `occupants.length` can never disagree with `ring.yours`.
  const mine = (state.buildings || [])
    .filter(b => b.locationId === locationId && isSlotOccupant(b))
    .slice()
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));

  const yoursSegment = ring.segments.find(s => s.kind === 'yours');
  const span = yoursSegment ? yoursSegment.endFrac - yoursSegment.startFrac : 0;
  const base = yoursSegment ? yoursSegment.startFrac : 0;

  const shown = mine.slice(0, MAX_SLOT_OCCUPANT_TICKS);
  const step = shown.length > 0 ? span / shown.length : 0;

  const occupants: SlotOccupantSlice[] = shown.map((b, i) => {
    const def = BUILDING_MAP.get(b.definitionId);
    return {
      instanceId: b.instanceId,
      definitionId: b.definitionId,
      name: def?.name || b.definitionId.replace(/_/g, ' '),
      category: def?.category || 'other',
      startFrac: base + step * i,
      endFrac: base + step * (i + 1),
    };
  });

  return {
    ring,
    occupants,
    truncated: Math.max(0, mine.length - shown.length),
    unsynced: !ring.synced,
  };
}

/** Which occupant (if any) sits under a point on the ring, expressed as a
 *  fraction of the circle. Used by both the click hit-test and the keyboard
 *  manifest so they can never disagree. */
export function occupantAtFraction(detail: SlotRingDetail, frac: number): SlotOccupantSlice | null {
  const f = ((frac % 1) + 1) % 1;
  return detail.occupants.find(o => f >= o.startFrac && f < o.endFrac) ?? null;
}

// ─── 2. Location vitals ──────────────────────────────────────────────────────

export type VitalTone = 'neutral' | 'good' | 'caution' | 'bad';

export interface ExtractionVital {
  resourceId: string;
  resourceName: string;
  /** Mining-output multiplier the tick applies here, 0.4…1.0. */
  pressure: number;
  grade: DepositGrade;
}

export interface DemandVital {
  category: ServiceCategory;
  label: string;
  /** Pool multiplier on service revenue here, 0.35…1.25. */
  mult: number;
  /** Your share of supplier capacity in this pool, 0…1. */
  playerShare: number;
  supplierCount: number;
  /** Total pool demand $/mo. */
  dTotal: number;
  /** NPC backdrop component of dTotal, $/mo. */
  dNpc: number;
}

export interface LaborVital {
  type: WorkerType;
  label: string;
  /** Wage index 0.8…1.6. SYSTEM-WIDE, not location-specific. */
  wageIndex: number;
  /** Your headcount of this crew type (corporate total). */
  employed: number;
}

export interface LaneVital {
  laneId: string;
  lane: ShippingLane;
  /** The location at the far end of this lane. */
  otherId: string;
  otherName: string;
  /** Freight fuel discount this lane has earned through traffic, 0…0.15. */
  bonusPct: number;
  /** Both endpoints unlocked for you. */
  usable: boolean;
}

export interface HazardVital {
  /** Location-scoped shielding umbrella from your buildings here, 0…1. */
  shielding: number;
  warnings: { id: string; severity: string; summary: string }[];
  /** Strikes recorded here in the save's rolling hazard log. */
  recentStrikes: number;
  worstRecentSeverity: string | null;
}

export interface TollVital {
  zoneSlug: string;
  zoneName: string;
  /** Governor's posted freight toll, 0.005…0.02 of cargo value. */
  tollPct: number;
  governorName: string | null;
  /** You do not pay it — you govern the zone, or you are Frontier-shielded. */
  exempt: boolean;
  exemptReason: string | null;
}

export interface LocationVitals {
  locationId: string;
  name: string;
  /** Finite orbital-slot pool + real occupants, or null where none exists. */
  slots: SlotRingDetail | null;
  extraction: ExtractionVital[];
  demand: DemandVital[];
  labor: LaborVital[];
  lanes: LaneVital[];
  chokepoint: { severity: 'critical' | 'major' | 'minor'; laneCount: number; premium: number } | null;
  hazard: HazardVital;
  toll: TollVital | null;
  /** Verbatim disclosure list — rendered, never silently dropped. */
  omitted: string[];
}

/** Stated in the console footnote. Kept as data so the text and the code that
 *  chooses not to compute these can't drift apart. */
export const OMITTED_VITALS: string[] = [
  'Which corporations hold the other orbital slots — the server publishes an occupancy count, not a roster.',
  'NPC production and consumption rates at this location — no per-location NPC ledger reaches the client.',
  'A location-specific wage index — the labour market is priced per crew type across the whole system.',
  'Toll and tariff actually paid — posted rates are shown here; realized spend lands in the P&L.',
];

const CHOKEPOINT_SEVERITY: Map<string, { severity: 'critical' | 'major' | 'minor'; laneCount: number }> = (() => {
  const m = new Map<string, { severity: 'critical' | 'major' | 'minor'; laneCount: number }>();
  for (const c of computeChokepoints()) m.set(c.locationId, { severity: c.severity, laneCount: c.laneCount });
  return m;
})();

const WORKER_LABEL: Record<string, string> = Object.fromEntries(
  WORKER_TYPES.map(w => [w.type, w.name]),
);

export function deriveLocationVitals(
  state: GameState,
  locationId: string,
  now: number = Date.now(),
): LocationVitals {
  const loc = LOCATION_MAP.get(locationId);

  // ── Extraction pressure ───────────────────────────────────────────────────
  // The engine reads (service.locationId, resource) pairs off MINING_PRODUCTION
  // — game-engine.ts:518-526. Reproduce that pairing exactly, deduped.
  const seen = new Set<string>();
  const extraction: ExtractionVital[] = [];
  for (const svc of state.activeServices || []) {
    if (svc.locationId !== locationId) continue;
    for (const { resource } of MINING_PRODUCTION[svc.definitionId] || []) {
      if (seen.has(resource)) continue;
      seen.add(resource);
      const pressure = getExtractionPressureMultiplier(state.extractionPressure, locationId, resource, now);
      extraction.push({
        resourceId: resource,
        resourceName: RESOURCE_MAP.get(resource as ResourceId)?.name || resource.replace(/_/g, ' '),
        pressure,
        grade: getDepositGrade(pressure),
      });
    }
  }
  extraction.sort((a, b) => a.pressure - b.pressure); // worst deposit first

  // ── Demand pools ──────────────────────────────────────────────────────────
  // Read the sync-delivered snapshot with the SAME staleness gate the pricing
  // path applies; a stale or absent snapshot yields no rows rather than a
  // fabricated neutral multiplier.
  const demand: DemandVital[] = [];
  const poolSnap = state.demandPools;
  const poolsFresh = !!poolSnap?.pools && now - (poolSnap.asOf || 0) <= DEMAND_POOL_STALE_MS;
  if (poolsFresh) {
    for (const category of SERVICE_CATEGORIES) {
      const entry = poolSnap!.pools[demandPoolKey(locationId, category)];
      if (!entry) continue;
      demand.push({
        category,
        label: CATEGORY_LABELS[category],
        mult: entry.mult,
        playerShare: entry.playerShare,
        supplierCount: entry.supplierCount,
        dTotal: entry.dTotal,
        dNpc: entry.dNpc,
      });
    }
    demand.sort((a, b) => b.dTotal - a.dTotal);
  }

  // ── Labour (system-wide by construction) ──────────────────────────────────
  // workforceDataToHeadcount is the engine's OWN singular→plural mapping
  // (including the irregular 'security' → 'securitys'); never re-key it here.
  const headcount = workforceDataToHeadcount(state.workforce as Record<string, unknown> | undefined);
  const labor: LaborVital[] = WORKER_TYPES
    .map(w => ({
      type: w.type,
      label: WORKER_LABEL[w.type] || w.type,
      wageIndex: getWageIndex(state.laborMarket, w.type, now),
      employed: headcount[w.type] || 0,
    }))
    // Only crew you actually employ, plus anything off neutral (a wage boom
    // is decision-relevant even before you hire).
    .filter(l => l.employed > 0 || Math.abs(l.wageIndex - WAGE_INDEX_NEUTRAL) > 0.001);

  // ── Lanes + chokepoint ────────────────────────────────────────────────────
  const unlocked = new Set(state.unlockedLocations || []);
  const lanes: LaneVital[] = LANES
    .filter(l => l.from === locationId || l.to === locationId)
    .map(l => {
      const otherId = l.from === locationId ? l.to : l.from;
      return {
        laneId: l.id,
        lane: l,
        otherId,
        otherName: LOCATION_MAP.get(otherId)?.name || otherId,
        bonusPct: getLaneBonus(state.laneBonuses, l.from, l.to, now),
        usable: unlocked.has(l.from) && unlocked.has(l.to),
      };
    })
    .sort((a, b) => b.bonusPct - a.bonusPct || a.lane.deltaV - b.lane.deltaV);

  const choke = CHOKEPOINT_SEVERITY.get(locationId);
  const chokepoint = choke && choke.severity !== 'minor'
    ? { severity: choke.severity, laneCount: choke.laneCount, premium: getChokepointPremium(locationId) }
    : null;

  // ── Hazard exposure ───────────────────────────────────────────────────────
  const warnings = (state.hazardWarnings || [])
    .filter(w => w.locationId === locationId)
    .map(w => ({ id: w.id, severity: w.severity, summary: w.summary }));
  const recent = (state.recentHazards || []).filter(h => h.locationId === locationId);
  const severityRank: Record<string, number> = { minor: 1, major: 2, severe: 3 };
  const worstRecentSeverity = recent.reduce<string | null>((worst, h) => {
    const s = h.severity || 'minor';
    if (!worst || (severityRank[s] || 0) > (severityRank[worst] || 0)) return s;
    return worst;
  }, null);
  const hazard: HazardVital = {
    shielding: getLocationCapabilityBonus(state, locationId, 'hazardShielding'),
    warnings,
    recentStrikes: recent.length,
    worstRecentSeverity,
  };

  // ── Freight toll (posted rate for the zone this location sits in) ─────────
  let toll: TollVital | null = null;
  const zoneSlug = LOCATION_TO_ZONE.get(locationId);
  const offense = state.offense;
  if (zoneSlug && offense && Array.isArray(offense.laneTolls)
      && typeof offense.asOf === 'number' && now - offense.asOf <= OFFENSE_SNAPSHOT_STALE_MS) {
    const entry = offense.laneTolls.find(t => t.zoneSlug === zoneSlug);
    const pct = entry ? clampTollPct(entry.tollPct) : 0;
    if (pct > 0) {
      const iAmGovernor = (state.zoneStandings || []).some(z => z.zoneSlug === zoneSlug && z.isGovernor);
      const frontier = isInFrontier(state, now);
      toll = {
        zoneSlug,
        zoneName: ZONE_MAP.get(zoneSlug)?.name || zoneSlug,
        tollPct: pct,
        governorName: entry?.governorName ?? null,
        exempt: iAmGovernor || frontier,
        exemptReason: iAmGovernor
          ? 'You govern this zone — no self-toll.'
          : frontier
            ? 'Protected Frontier corporations are exempt.'
            : null,
      };
    }
  }

  return {
    locationId,
    name: loc?.name || locationId,
    slots: deriveSlotRingDetail(state, locationId, now),
    extraction,
    demand,
    labor,
    lanes,
    chokepoint,
    hazard,
    toll,
    omitted: OMITTED_VITALS,
  };
}

// ─── Presentation helpers (text twins — colour is never the only signal) ─────

export interface VitalBadge {
  icon: IconName;
  label: string;
  value: string;
  /** Redundant non-colour carrier — always rendered next to the value. */
  glyph: string;
  tone: VitalTone;
  /** Full sentence for screen readers / the focused readout. */
  srText: string;
}

const TONE_GLYPH: Record<VitalTone, string> = {
  neutral: '■',
  good: '▲',
  caution: '●',
  bad: '▼',
};

export function toneGlyph(tone: VitalTone): string {
  return TONE_GLYPH[tone];
}

/** Deposit pressure → tone. Mirrors getDepositGrade's own tier boundaries so
 *  the colour, the glyph and the word can never disagree. */
export function extractionTone(pressure: number): VitalTone {
  const tier = getDepositGrade(pressure).tier;
  if (tier === 'abundant') return 'good';
  if (tier === 'healthy') return 'neutral';
  if (tier === 'critical') return 'bad';
  return 'caution';
}

/** Demand pool multiplier → tone. 1.0 is the neutral pool; the server clamps
 *  the multiplier to [0.35, 1.25]. */
export function demandTone(mult: number): VitalTone {
  if (mult >= 1.05) return 'good';
  if (mult >= 0.85) return 'neutral';
  if (mult >= 0.6) return 'caution';
  return 'bad';
}

/** Wage index → tone. Neutral is 1.0; above it labour is expensive. */
export function wageTone(index: number): VitalTone {
  if (index <= 0.95) return 'good';
  if (index <= 1.1) return 'neutral';
  if (index < 1.45) return 'caution';
  return 'bad';
}

/** Lane traffic discount → tone. 0 is untravelled; the cap is LANE_BONUS_CAP. */
export function laneTone(bonusPct: number): VitalTone {
  if (bonusPct >= LANE_BONUS_CAP * 0.66) return 'good';
  if (bonusPct > 0.001) return 'neutral';
  return 'neutral';
}

export function hazardTone(h: HazardVital): VitalTone {
  if (h.warnings.some(w => w.severity === 'severe')) return 'bad';
  if (h.warnings.length > 0) return 'caution';
  if (h.shielding > 0) return 'good';
  return 'neutral';
}

/** Compact percentage with no false precision. */
export function formatPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Multiplier readout, e.g. `0.82x`. */
export function formatMult(mult: number): string {
  return `${mult.toFixed(2)}x`;
}
