// ─── Ship traffic layer — shared contract, placement maths, client poll ─────
// docs/GRAPHICS_REVIEW_2026-09-12.md addendum ("Flight mode", point 3) and
// the founder decision of 2026-09-13: "anonymised contacts always visible,
// identities earned". Other corporations' ships appear on the solar map as
// anonymised CONTACTS — hull class and lane only. A contact's corporation,
// cargo and destination are attached ONLY when the requester holds an
// active fleet-reveal from the espionage system (ship-traffic-server.ts,
// FLEET_REVEAL_ACTIONS). docs/POLICY.md "Ship visibility" is the player-
// facing statement of the rule.
//
// This file is renderer-neutral and DB-free: the wire types, the pure
// placement maths both solar renderers share (map-modes.ts precedent — one
// derivation, two renderers, never disagreeing) and the label helpers. The
// polling hook is src/hooks/useShipTraffic.ts (client-
// only); the server-side builder is ship-traffic-server.ts (node crypto,
// prisma shapes) — and because the API route imports THIS file, it must
// stay React-free.

import { SHIP_MAP } from './ships';
import { LOCATION_MAP } from './solar-system';
import type { FactionId } from './factions';

// ─── Wire contract ───────────────────────────────────────────────────────────

/** Ship CATEGORY only — never the definition id (a hull's exact class is
 *  itself intelligence: a Deep Space Miner on the belt lane says a lot). */
export type ContactHullClass = 'freighter' | 'miner' | 'survey' | 'tanker' | 'servicer' | 'ark' | 'flagship';

export const CONTACT_HULL_LABEL: Record<ContactHullClass, string> = {
  freighter: 'Freighter',
  miner: 'Mining ship',
  survey: 'Survey ship',
  tanker: 'Tanker',
  servicer: 'Servicer',
  ark: 'Colony ark',
  flagship: 'Flagship',
};

/** Identity block — present ONLY on contacts whose owner the requester holds
 *  an active fleet reveal on. Its absence is the anonymisation guarantee the
 *  tests pin down (no profile id, no company name anywhere else). */
export interface ContactIntel {
  corpId: string;
  corpName: string;
  /** "Metal 120, Water 40" — top cargo lines, or "Empty hold". */
  cargoSummary: string;
  /** Where the ship is going (transit) or sitting (holding). */
  destinationId: string;
}

export interface TrafficContact {
  /** Opaque, salted per UTC day from the ship instance — cannot be joined
   *  across days, never a ship or profile id. */
  id: string;
  hullClass: ContactHullClass;
  status: 'transit' | 'holding';
  /** Transit: canonical undirected lane id (trade-lanes.ts laneKey order —
   *  `laneA|laneB`, endpoints sorted). Progress runs from laneA to laneB. */
  laneId?: string;
  laneA?: string;
  laneB?: string;
  /** 0..1 from laneA toward laneB at `asOfMs` of the feed. */
  progress?: number;
  /** Milliseconds to arrival at `asOfMs` of the feed. */
  etaMs?: number;
  /** Holding: the location the contact is stationed at. */
  locationId?: string;
  /** NPC backdrop traffic (synthesised per lane so lanes look alive at low
   *  population) — flagged so the UI can tint and label it honestly. */
  npc?: true;
  factionHint?: FactionId;
  intel?: ContactIntel;
}

export interface TrafficFeed {
  contacts: TrafficContact[];
  /** Server time the positions were computed at (ISO). */
  asOf: string;
  asOfMs: number;
  /** Total before the cap (so the HUD can say "2,000 of 3,140"). */
  total: number;
  capped: boolean;
  /** Number of contacts carrying an identity block for this requester. */
  revealed: number;
}

/** Hard cap on contacts per feed (nearest to the requester's holdings first). */
export const TRAFFIC_FEED_CAP = 2000;
/** Renderer safety cap — instancing only, never more instances than this. */
export const TRAFFIC_RENDER_CAP = 5000;
/** Client poll cadence while the map is visible. */
export const TRAFFIC_POLL_MS = 60_000;

// ─── Hull class derivation ───────────────────────────────────────────────────

export function hullClassOf(definitionId: string): ContactHullClass {
  if (definitionId === 'colony_ark') return 'ark';
  if (definitionId === 'starfarer_explorer') return 'flagship';
  const def = SHIP_MAP.get(definitionId);
  switch (def?.role) {
    case 'mining': return 'miner';
    case 'survey': return 'survey';
    case 'tanker': return 'tanker';
    case 'maintenance': return 'servicer';
    // Mining Phase B: the Escort Cutter is a slim security craft — the
    // servicer silhouette (contacts only ever show a hull class; POLICY.md
    // "Ship Visibility").
    case 'security': return 'servicer';
    case 'transport':
    default: return 'freighter';
  }
}

// ─── Labels ──────────────────────────────────────────────────────────────────

function locName(id: string | undefined): string {
  if (!id) return '?';
  return LOCATION_MAP.get(id)?.name ?? id.replace(/_/g, ' ');
}

/** Short lane name: "Earth–Luna lane" style, from the canonical endpoints. */
export function laneLabel(a: string | undefined, b: string | undefined): string {
  return `${locName(a)}–${locName(b)} lane`;
}

/** "Freighter · Earth–Luna lane", "NPC miner · Ceres", or the revealed
 *  "Meridian Orbital · Freighter → Ceres". Never includes the opaque id. */
export function contactLabel(c: TrafficContact): string {
  const hull = CONTACT_HULL_LABEL[c.hullClass] ?? 'Contact';
  if (c.intel) {
    const arrow = c.status === 'transit' ? '→' : '·';
    return `${c.intel.corpName} · ${hull} ${arrow} ${locName(c.intel.destinationId)}`;
  }
  const who = c.npc ? `NPC ${hull.toLowerCase()}` : hull;
  if (c.status === 'transit') return `${who} · ${laneLabel(c.laneA, c.laneB)}`;
  return `${who} · ${locName(c.locationId)}`;
}

/** Second line for a tag: cargo + ETA for revealed contacts, an honest
 *  "identity not held" note otherwise. */
export function contactDetail(c: TrafficContact, nowMs: number, asOfMs: number): string {
  const parts: string[] = [];
  if (c.status === 'transit' && typeof c.etaMs === 'number') {
    const remaining = Math.max(0, c.etaMs - (nowMs - asOfMs));
    parts.push(`ETA ${formatEta(remaining)}`);
  }
  if (c.intel) parts.push(c.intel.cargoSummary);
  else if (c.npc) parts.push(c.factionHint ? `${factionShort(c.factionHint)} traffic` : 'Faction traffic');
  else parts.push('Identity: not held — run Fleet Tracking');
  return parts.join(' · ');
}

function factionShort(id: FactionId): string {
  switch (id) {
    case 'the-dominion': return 'Dominion';
    case 'the-syndicate': return 'Syndicate';
    case 'void-corsairs': return 'Corsair';
    case 'hive-collective': return 'Hive';
    case 'nebula-reavers': return 'Reaver';
    case 'echo-remnants': return 'Remnant';
    default: return 'Faction';
  }
}

function formatEta(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ─── Placement (pure; both renderers) ────────────────────────────────────────

export type ContactVec3 = [number, number, number];

/** What a renderer knows about each location: a position and the visual
 *  radius of whatever it is anchored to (holding contacts orbit outside it).
 *  3D passes ScenePositions.anchors; 2D passes its pixel layout with z = 0. */
export interface ContactAnchor { pos: ContactVec3; r: number }

export interface PlacedContact {
  contact: TrafficContact;
  pos: ContactVec3;
  /** Unit heading along the arc (transit only; null when holding). */
  heading: ContactVec3 | null;
  /** Live progress after extrapolating from the feed's asOf (transit only). */
  progress: number | null;
}

export interface PlaceContactsOptions {
  /** Feed time the `progress`/`etaMs` values refer to; default = nowMs (no
   *  extrapolation). */
  asOfMs?: number;
  /** Which plane the lane arc bends in: 'xz' for the 3D scene (bend sideways
   *  and lift in +y like TransitShip), 'xy' for the 2D canvas (in-plane). */
  plane?: 'xz' | 'xy';
  /** Cap on the arc's control-point offset (scene units or px). */
  bendCap?: number;
  /** Holding contacts orbit their anchor at `r + orbitGap`; angle advances
   *  at orbitRadPerSec unless `staticOrbit` (reduced motion) pins them. */
  orbitGap?: number;
  orbitRadPerSec?: number;
  staticOrbit?: boolean;
}

/** Deterministic 0..1 from an opaque id — spreads holding contacts around
 *  their anchor and de-phases arcs without any per-contact state. */
export function contactPhase(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10007) / 10007;
}

/** Extrapolate a feed progress value to `nowMs`: the ship keeps its speed
 *  along the lane, arriving when the feed's ETA runs out. */
export function liveProgress(progress: number, etaMs: number | undefined, nowMs: number, asOfMs: number): number {
  const p = Math.max(0, Math.min(1, progress));
  if (typeof etaMs !== 'number' || etaMs <= 0 || nowMs <= asOfMs) return p;
  const remaining = 1 - p;
  if (remaining <= 0) return 1;
  const rate = remaining / etaMs; // progress per ms
  return Math.max(0, Math.min(1, p + (nowMs - asOfMs) * rate));
}

/** Quadratic bezier + tangent, shared by the transit placement. */
function quad(f: ContactVec3, c: ContactVec3, t: ContactVec3, u: number): { pos: ContactVec3; tan: ContactVec3 } {
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const d = u * u;
  const pos: ContactVec3 = [
    a * f[0] + b * c[0] + d * t[0],
    a * f[1] + b * c[1] + d * t[1],
    a * f[2] + b * c[2] + d * t[2],
  ];
  const tan: ContactVec3 = [
    2 * (1 - u) * (c[0] - f[0]) + 2 * u * (t[0] - c[0]),
    2 * (1 - u) * (c[1] - f[1]) + 2 * u * (t[1] - c[1]),
    2 * (1 - u) * (c[2] - f[2]) + 2 * u * (t[2] - c[2]),
  ];
  const len = Math.hypot(tan[0], tan[1], tan[2]) || 1;
  return { pos, tan: [tan[0] / len, tan[1] / len, tan[2] / len] };
}

/**
 * Position every contact for `nowMs`. Contacts whose lane endpoints or
 * location the renderer has no anchor for are dropped (a lane to an
 * interstellar system, a location the layout does not draw). Pure.
 */
export function placeContacts(
  contacts: TrafficContact[],
  anchors: Record<string, ContactAnchor>,
  nowMs: number,
  opts: PlaceContactsOptions = {},
): PlacedContact[] {
  const asOfMs = opts.asOfMs ?? nowMs;
  const plane = opts.plane ?? 'xz';
  const bendCap = opts.bendCap ?? (plane === 'xz' ? 2.2 : 30);
  const orbitGap = opts.orbitGap ?? (plane === 'xz' ? 0.42 : 16);
  const orbitRadPerSec = opts.orbitRadPerSec ?? 0.35;
  const out: PlacedContact[] = [];
  const limit = Math.min(contacts.length, TRAFFIC_RENDER_CAP);
  for (let i = 0; i < limit; i++) {
    const c = contacts[i];
    if (c.status === 'transit') {
      const from = c.laneA ? anchors[c.laneA] : undefined;
      const to = c.laneB ? anchors[c.laneB] : undefined;
      if (!from || !to || typeof c.progress !== 'number') continue;
      const u = liveProgress(c.progress, c.etaMs, nowMs, asOfMs);
      const f = from.pos;
      const t = to.pos;
      const chord: ContactVec3 = [t[0] - f[0], t[1] - f[1], t[2] - f[2]];
      const len = Math.hypot(chord[0], chord[1], chord[2]);
      const bend = Math.min(bendCap, len * 0.08);
      // Perpendicular in the chosen plane; a per-contact sign spreads several
      // contacts on the same lane onto two arcs instead of one pile.
      const side = contactPhase(c.id) < 0.5 ? 1 : -1;
      let ctrl: ContactVec3;
      if (plane === 'xz') {
        // cross(chord, up) → sideways in the ecliptic; plus a lift in +y so
        // arcs never hug the plane (TransitShip's convention).
        const px = -chord[2], pz = chord[0];
        const pl = Math.hypot(px, pz) || 1;
        const lift = Math.min(2.0, 0.6 + len * 0.06);
        ctrl = [
          (f[0] + t[0]) / 2 + (px / pl) * bend * side,
          (f[1] + t[1]) / 2 + lift,
          (f[2] + t[2]) / 2 + (pz / pl) * bend * side,
        ];
      } else {
        const px = -chord[1], py = chord[0];
        const pl = Math.hypot(px, py) || 1;
        ctrl = [
          (f[0] + t[0]) / 2 + (px / pl) * bend * side,
          (f[1] + t[1]) / 2 + (py / pl) * bend * side,
          0,
        ];
      }
      const q = quad(f, ctrl, t, u);
      out.push({ contact: c, pos: q.pos, heading: q.tan, progress: u });
    } else {
      const a = c.locationId ? anchors[c.locationId] : undefined;
      if (!a) continue;
      const phase = contactPhase(c.id) * Math.PI * 2;
      const angle = opts.staticOrbit ? phase : phase + (nowMs / 1000) * orbitRadPerSec;
      const R = a.r + orbitGap;
      const pos: ContactVec3 = plane === 'xz'
        ? [a.pos[0] + Math.cos(angle) * R, a.pos[1] + 0.08, a.pos[2] + Math.sin(angle) * R]
        : [a.pos[0] + Math.cos(angle) * R, a.pos[1] + Math.sin(angle) * R, 0];
      out.push({ contact: c, pos, heading: null, progress: null });
    }
  }
  return out;
}

// ─── Corp colour for revealed contacts ───────────────────────────────────────

/** Stable hue per corporation so a revealed corp's hulls share one ring
 *  colour on both renderers. Colour is a secondary cue — the ring shape is
 *  the state (CLAUDE.md accessibility: nothing conveyed by colour alone). */
export function corpRingColor(corpId: string): string {
  const hue = Math.round(contactPhase(`corp:${corpId}`) * 360);
  return `hsl(${hue} 85% 62%)`;
}

/** Faction tint for NPC contacts. Muted on purpose — NPC traffic is backdrop. */
export const FACTION_CONTACT_TINT: Record<FactionId, string> = {
  'the-dominion': '#b45a5a',
  'the-syndicate': '#8b5fb8',
  'void-corsairs': '#b08a3e',
  'hive-collective': '#4f9a7a',
  'nebula-reavers': '#4d7fb3',
  'echo-remnants': '#7f8ea3',
};

export const ANON_CONTACT_COLOR = '#7c8594';

// ─── Local-scene tags (graphics Phase 2, addendum (c)) ───────────────────────

/** One-line tag for a contact inside a body's local scene: the revealed
 *  corporation and hull, or the honest anonymised class, plus the live ETA
 *  for transits. Short on purpose — it hangs off the hull in the scene; the
 *  full detail stays on hover / in the screen-reader list. */
export function contactTagText(c: TrafficContact, nowMs: number, asOfMs: number): string {
  const hull = CONTACT_HULL_LABEL[c.hullClass] ?? 'Contact';
  const who = c.intel ? `${c.intel.corpName} · ${hull}` : c.npc ? `NPC ${hull.toLowerCase()}` : hull;
  if (c.status === 'transit' && typeof c.etaMs === 'number') {
    const remaining = Math.max(0, c.etaMs - (nowMs - asOfMs));
    return `${who} · ETA ${formatEta(remaining)}`;
  }
  return who;
}

/** Which contacts get a persistent tag in a local scene (the rest stay
 *  hover-only): revealed first, then the soonest arrivals, capped. */
export const LOCAL_CONTACT_TAG_CAP = 12;

export function pickTaggedContacts(contacts: readonly TrafficContact[], cap = LOCAL_CONTACT_TAG_CAP): TrafficContact[] {
  const transit = contacts.filter(c => c.status === 'transit');
  transit.sort((a, b) => {
    const ra = a.intel ? 0 : a.npc ? 2 : 1;
    const rb = b.intel ? 0 : b.npc ? 2 : 1;
    if (ra !== rb) return ra - rb;
    return (a.etaMs ?? Infinity) - (b.etaMs ?? Infinity);
  });
  return transit.slice(0, Math.max(0, cap));
}
