// ─── Flight mode — fly-to camera paths, local spheres, local scenes ──────────
// docs/GRAPHICS_REVIEW_2026-09-12.md addendum "Flight mode" (part a). The
// founder asked for something like the Solar System Experience on Steam:
// pick a body, fly to it, and find yourself in orbit with its moons, its
// orbital shells, your satellites and the ships coming and going.
//
// Everything here is PURE (no three.js, no canvas, no React) and shared by
// BOTH solar renderers, following the map-modes / map-zoom / ship-traffic
// precedent: one derivation, two renderers, never disagreeing.
//
//   1. FLY PATHS — an eased camera-pose tween (position + orbit target)
//      whose duration scales with the distance flown between FLY_MIN_MS and
//      FLY_MAX_MS, is zero under reduced motion (an instant cut), and is
//      skippable by any input (the renderer jumps to t = 1).
//
//   2. LOCAL SPHERES — every celestial body owns a sphere of radius
//      LOCAL_SPHERE_ENTER_FACTOR × its visual radius. When the camera is
//      inside it the renderer swaps the system view for that body's LOCAL
//      SCENE; the camera has to back out past LOCAL_SPHERE_EXIT_FACTOR ×
//      radius to leave (25 % hysteresis, so nothing flickers on the
//      boundary). Moons nest: inside Earth's sphere the camera can dive into
//      the Moon's, and leaving the Moon's lands back in Earth's.
//
//   3. LOCAL SCENE MODEL — what a local scene contains, built from GameState
//      (and the traffic feed) and cached per body by the renderers:
//        • the body at its system-view visual radius (the swap is a scene
//          change, not a scale change — the body does not jump),
//        • its real moons on the hand-tuned orbit scales the system view
//          already uses (continuity + the Galilean moons stay apart),
//        • its orbital SHELLS (LEO / MEO / GEO for Earth, lunar orbit, Mars
//          areosynchronous, the Jovian stable band) as thin rings at a
//          log-compressed altitude — see shellScale(),
//        • orbital SLOTS as pips on the ring: yours bright, other
//          corporations dim (with a corp tag when the world feed names
//          them), free hollow — from computeSlotRing (the same sync-
//          delivered occupancy the ring segments use),
//        • YOUR satellites and stations on their shell (from state.buildings
//          by category and locationId) as instanced glints / silhouettes,
//          other corporations' satellites as dim glints (public counts),
//        • ships arriving / departing / holding along their lane with an
//          ETA — your ships bright, traffic contacts dim, both placed by the
//          SAME placeContacts() the system view uses (own ships are wrapped
//          as contact records so one placement path serves both).
//
//   4. 2D DIAGRAM LAYOUT — the pixel layout the 2D canvas draws the same
//      model with (body + rings + pips + glints + ship dots).
//
//   5. BREADCRUMB — "System › Earth › Local" chip state for the map bar.

import type { GameState } from './types';
import { BUILDING_MAP } from './buildings';
import { LOCATION_MAP } from './solar-system';
import { computeSlotRing, type SlotRingModel, type SlotRingSegmentKind } from './map-bodies';
import { hullClassOf, type TrafficContact, type ContactAnchor } from './ship-traffic';
import {
  ORBITAL_BODIES,
  ORBITAL_BODY_MAP,
  ORBITAL_PIPS,
  sceneBodyRadius,
  moonDisplayPeriodSec,
  type OrbitalBody,
  type ScenePositions,
  type Vec3,
} from './orbital-elements';

export type { Vec3 };

// ─── 1. Fly paths ────────────────────────────────────────────────────────────

export interface CameraPose {
  pos: Vec3;
  /** The orbit-controls target the camera looks at. */
  target: Vec3;
}

/** Flight duration bounds (the addendum's 1.5–3 s). */
export const FLY_MIN_MS = 1500;
export const FLY_MAX_MS = 3000;
/** A flight this long (scene units, camera displacement) takes FLY_MAX_MS;
 *  shorter flights scale linearly down to FLY_MIN_MS. Earth→Mars from the
 *  home frame is ~35 units; a Jupiter run ~50. */
export const FLY_UNITS_FOR_MAX = 60;

/** How long a flight over `distance` scene units takes. Zero under reduced
 *  motion — the renderer then cuts straight to the end pose. */
export function flyDurationMs(distance: number, reducedMotion = false): number {
  if (reducedMotion) return 0;
  const d = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const k = Math.min(1, d / FLY_UNITS_FOR_MAX);
  return Math.round(FLY_MIN_MS + (FLY_MAX_MS - FLY_MIN_MS) * k);
}

export function easeOutCubic(t: number): number {
  const u = 1 - Math.max(0, Math.min(1, t));
  return 1 - u * u * u;
}

/** 0..1 progress of a flight `elapsedMs` in. A zero-length flight is
 *  complete immediately (reduced motion = cut). */
export function flyProgress(elapsedMs: number, durationMs: number): number {
  if (!(durationMs > 0)) return 1;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(1, elapsedMs / durationMs);
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function dist3(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Lift applied to the camera path at its midpoint (fraction of the
 *  distance flown) — a shallow arc above the ecliptic so a flight from one
 *  planet to another never threads through the Sun or a body en route. */
export const FLY_ARC_LIFT = 0.18;

/**
 * Camera pose at eased progress `t` (0..1). Position follows a shallow
 * quadratic arc (lifted in +y), the target moves in a straight line. Exact
 * at both ends, so `to` may be re-derived from a body's LIVE position every
 * frame and the flight still lands precisely on it.
 */
export function interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const e = easeOutCubic(t);
  if (e <= 0) return { pos: [...from.pos] as Vec3, target: [...from.target] as Vec3 };
  if (e >= 1) return { pos: [...to.pos] as Vec3, target: [...to.target] as Vec3 };
  const lift = dist3(from.pos, to.pos) * FLY_ARC_LIFT;
  const pos = lerp3(from.pos, to.pos, e);
  // 4·e·(1−e) peaks at 1 in the middle and is 0 at both ends.
  pos[1] += lift * 4 * e * (1 - e);
  return { pos, target: lerp3(from.target, to.target, e) };
}

// ─── 2. Local spheres ────────────────────────────────────────────────────────

/** Local sphere = visual body radius × these. Enter at 6 r (Earth 0.81 →
 *  4.9 units, Jupiter 1.31 → 7.9, the Moon 0.54 → 3.2): far enough out that
 *  the outermost hand-tuned moon orbit (Callisto 3.3 r, Titan 2.9 r) and the
 *  GEO shell (2.05 r) sit comfortably inside, close enough that the system
 *  view keeps its cluster picking (a click on LEO from the home frame does
 *  not trip it). Exit at 7.5 r = 25 % hysteresis: the damping glide of a
 *  scroll settles well inside one band or the other. */
export const LOCAL_SPHERE_ENTER_FACTOR = 6;
export const LOCAL_SPHERE_EXIT_FACTOR = 7.5;
/** Where a fly-to lands: 5 r from the body, inside the enter sphere, so
 *  selecting a body flies you INTO its local scene (Earth then spans ~190 px
 *  of a 900 px-tall stage; the Moon's orbit is in frame). */
export const LOCAL_FRAME_FACTOR = 5;
/** Where the reverse fly (Escape / "System") lands: outside the exit
 *  sphere, with a floor so tiny moons still get a readable system frame. */
export const SYSTEM_FRAME_FACTOR = 9.5;
export const SYSTEM_FRAME_MIN = 6;

export function localSphereRadii(bodyR: number): { enter: number; exit: number } {
  const r = Math.max(0, bodyR);
  return { enter: r * LOCAL_SPHERE_ENTER_FACTOR, exit: r * LOCAL_SPHERE_EXIT_FACTOR };
}

/** Camera distance a fly-to lands at. `local` = into the body's scene;
 *  `system` = the system-view frame outside its exit sphere (also used for
 *  bodies without a local scene — belt / relay pips). */
export function frameDistance(bodyR: number, mode: 'local' | 'system'): number {
  const r = Math.max(0, bodyR);
  return mode === 'local' ? Math.max(r * LOCAL_FRAME_FACTOR, 1.5) : Math.max(r * SYSTEM_FRAME_FACTOR, SYSTEM_FRAME_MIN);
}

export interface LocalCandidate {
  /** Orbital body id (orbital-elements). */
  id: string;
  /** Parent body id for moons — a moon's scene nests inside its parent's. */
  parent?: string;
  /** Camera → body centre distance, scene units. */
  dist: number;
  /** Visual body radius, scene units. */
  r: number;
}

/**
 * The local scene the camera should be in after this frame, given the one
 * it is in now. Hysteresis: a current scene is only left once the camera is
 * past its EXIT radius; a scene is only entered once the camera is inside
 * its ENTER radius. From a scene, the only direct switch is into one of its
 * own moons (deeper nesting). Leaving a moon's scene lands in whichever
 * scene the camera is still inside (its parent, usually) — evaluated in the
 * same call so the system view never flashes for a frame between them.
 */
export function nextLocalBody(current: string | null, candidates: LocalCandidate[]): string | null {
  const byId = new Map(candidates.map(c => [c.id, c]));
  const cur = current ? byId.get(current) : undefined;
  if (cur) {
    const { exit } = localSphereRadii(cur.r);
    if (cur.dist <= exit) {
      // Still inside — but maybe deep enough for one of its moons.
      let best: LocalCandidate | null = null;
      let bestRatio = 1;
      for (const c of candidates) {
        if (c.parent !== cur.id) continue;
        const ratio = c.dist / Math.max(1e-6, localSphereRadii(c.r).enter);
        if (ratio < bestRatio) { bestRatio = ratio; best = c; }
      }
      return best ? best.id : cur.id;
    }
    // Exited — fall through and re-evaluate entry, excluding the scene just
    // left (it is outside its exit radius, so it fails the enter test too).
  }
  let best: LocalCandidate | null = null;
  let bestRatio = 1;
  for (const c of candidates) {
    if (cur && c.id === cur.id) continue;
    const ratio = c.dist / Math.max(1e-6, localSphereRadii(c.r).enter);
    if (ratio < bestRatio) { bestRatio = ratio; best = c; }
  }
  return best ? best.id : null;
}

// ─── 3. Local scene model ────────────────────────────────────────────────────

/** Orbital shells per body. Altitudes are real (km above the surface); the
 *  drawn radius comes from shellScale() below. `locationId` links a shell to
 *  the game location whose slot pool / buildings / ships it carries; MEO is
 *  decorative (the game has no MEO location yet) and only exists so Earth's
 *  three-shell structure reads. */
export interface LocalShellDef {
  id: string;
  label: string;
  locationId?: string;
  altitudeKm: number;
  color: string;
}

export const LOCAL_SHELLS: Readonly<Record<string, LocalShellDef[]>> = {
  earth: [
    { id: 'leo', label: 'LEO', locationId: 'leo', altitudeKm: 400, color: '#22d3ee' },
    { id: 'meo', label: 'MEO', altitudeKm: 20_200, color: '#64748b' },
    { id: 'geo', label: 'GEO', locationId: 'geo', altitudeKm: 35_786, color: '#a78bfa' },
  ],
  moon: [
    { id: 'lunar_orbit', label: 'Lunar orbit', locationId: 'lunar_orbit', altitudeKm: 100, color: '#94a3b8' },
  ],
  mars: [
    { id: 'mars_orbit', label: 'Areosynchronous', locationId: 'mars_orbit', altitudeKm: 17_032, color: '#fdba74' },
  ],
  jupiter: [
    // The pool is "radiation-shielded Jovian orbits with stable dynamics";
    // drawn between Europa and Ganymede where the real belts thin out.
    { id: 'jovian_stable', label: 'Stable orbits', locationId: 'jupiter_system', altitudeKm: 1_000_000, color: '#fbbf24' },
  ],
};

/** Log-compressed shell radius as a multiple of the body's visual radius:
 *  1.2 + 0.45·ln(1 + altitude/R), floored at 1.3 so a 400 km LEO ring is
 *  not glued to the limb. Earth: LEO 1.30, MEO 1.94, GEO 2.16; Mars
 *  areosynchronous 2.05; the Jovian band 2.43 (between Europa's hand-tuned
 *  2.3 and Ganymede's 2.8). Real ratios (GEO is 6.6 R, MEO 4.2 R) would put
 *  GEO outside the Moon's hand-tuned 2.6 R orbit, so the shells are
 *  compressed to keep ordering AND keep the Moon the outermost thing. */
export const SHELL_SCALE_MIN = 1.3;
export function shellScale(altitudeKm: number, radiusKm: number): number {
  const ratio = Math.max(0, altitudeKm) / Math.max(1, radiusKm);
  return Math.max(SHELL_SCALE_MIN, 1.2 + 0.45 * Math.log(1 + ratio));
}

export interface LocalSlotPip {
  index: number;
  /** 0..1 around the ring, clockwise from the top. */
  frac: number;
  kind: SlotRingSegmentKind;
  /** "Yours", "Free", or the corporation's name when the world feed names
   *  one, else "Other corporation". */
  tag: string;
}

export interface LocalShell extends LocalShellDef {
  /** Ring radius as a multiple of the body's visual radius. */
  scale: number;
  slots: SlotRingModel | null;
  pips: LocalSlotPip[];
  /** Your completed satellites here (BuildingCategory 'satellite'). */
  satellites: number;
  /** Your completed non-satellite orbital assets here (stations, orbital
   *  fabs, datacenters …). */
  stations: number;
  /** Other corporations' occupied slots — drawn as dim glints. */
  otherSatellites: number;
}

export interface LocalMoon {
  id: string;
  name: string;
  locationId?: string;
  /** Visual radius, scene units (same as the system view). */
  r: number;
  /** Orbit radius as a multiple of the parent's visual radius. */
  orbitScale: number;
  periodSec: number;
  phaseDeg: number;
  color: string;
  texture?: string;
  unlocked: boolean;
  /** The moon's own shells (lunar orbit around the Moon inside Earth's
   *  scene), scaled by the MOON's visual radius. */
  shells: LocalShell[];
}

export interface LocalShip {
  id: string;
  /** Own ships carry their name; contacts carry the anonymised label. */
  name: string;
  own: boolean;
  status: 'arriving' | 'departing' | 'holding';
  /** Placement record — own ships are wrapped as contacts so placeContacts
   *  serves both (laneA → laneB is the direction of travel). */
  contact: TrafficContact;
  etaMs?: number;
  color: string;
}

export interface LocalSceneModel {
  bodyId: string;
  locationId: string;
  name: string;
  /** Visual body radius (scene units) — the unit everything below scales by. */
  bodyR: number;
  radiusKm: number;
  color: string;
  texture?: string;
  unlocked: boolean;
  enterR: number;
  exitR: number;
  shells: LocalShell[];
  moons: LocalMoon[];
  ships: LocalShip[];
  /** Game locations that live inside this scene (body, shells, moons and
   *  their shells) — the set that decides which ships/contacts belong here. */
  locationIds: string[];
  /** Lane endpoints OUTSIDE the scene that local ships travel to/from; the
   *  renderer places their exit anchors on the sphere edge toward them. */
  externalIds: string[];
  /** Largest orbit scale drawn (moons, shells) — sizes the 2D diagram. */
  extentScale: number;
  /** Wall-clock the ship progress / ETA values refer to. */
  builtAtMs: number;
  /** Screen-reader summary for the Location List / breadcrumb. */
  srText: string;
}

/** The body whose local scene a game location belongs to: a body's own id,
 *  a pip's parent body (LEO → earth, lunar_orbit → moon), or null for the
 *  region pips (belt / deep-space relay) that have no local scene. */
export function localBodyForLocation(locationId: string | null | undefined): string | null {
  if (!locationId) return null;
  const pip = ORBITAL_PIPS.find(p => p.locationId === locationId);
  if (pip) return pip.parent === 'belt' || pip.parent === 'deep' ? null : pip.parent;
  const body = ORBITAL_BODIES.find(b => b.locationId === locationId);
  return body ? body.id : null;
}

/** Every body that owns a local scene, with its parent for nesting. */
export function localCandidatesFrom(positions: ScenePositions, cameraPos: Vec3): LocalCandidate[] {
  const out: LocalCandidate[] = [];
  for (const b of ORBITAL_BODIES) {
    if (!b.locationId) continue;
    const p = positions.bodies[b.id];
    if (!p) continue;
    out.push({ id: b.id, parent: b.parent, dist: dist3(cameraPos, p), r: sceneBodyRadius(b.radiusKm) });
  }
  return out;
}

function ownShipColor(definitionId: string): string {
  switch (hullClassOf(definitionId)) {
    case 'miner': return '#fbbf24';
    case 'survey': return '#c084fc';
    case 'tanker': return '#60a5fa';
    default: return '#22d3ee';
  }
}

export interface BuildLocalSceneOptions {
  contacts?: TrafficContact[];
  nowMs?: number;
  /** Corporation names present per location (useWorldState's
   *  world.colonies) — tags the "others" slot pips. */
  worldNames?: Record<string, string[]> | null;
}

/**
 * Build the local scene for `bodyId` from the save. Null for ids that are
 * not celestial bodies. Pure; renderers cache the result per body and
 * rebuild when state or the traffic feed changes.
 */
export function buildLocalSceneModel(state: GameState, bodyId: string, opts: BuildLocalSceneOptions = {}): LocalSceneModel | null {
  const body = ORBITAL_BODY_MAP.get(bodyId);
  if (!body || !body.locationId) return null;
  const nowMs = opts.nowMs ?? Date.now();
  const bodyR = sceneBodyRadius(body.radiusKm);
  const unlockedSet = new Set(state.unlockedLocations || []);
  const { enter, exit } = localSphereRadii(bodyR);

  // Shells — for the body and (below) for each of its moons.
  const buildShells = (ownerId: string, ownerRadiusKm: number): LocalShell[] => (LOCAL_SHELLS[ownerId] || []).map(def => {
    const scale = shellScale(def.altitudeKm, ownerRadiusKm);
    const slots = def.locationId ? computeSlotRing(state, def.locationId, nowMs) : null;
    let satellites = 0;
    let stations = 0;
    if (def.locationId) {
      for (const b of state.buildings) {
        if (!b.isComplete || b.locationId !== def.locationId) continue;
        const cat = BUILDING_MAP.get(b.definitionId)?.category;
        if (cat === 'satellite') satellites++;
        else stations++; // stations, orbital fabs, datacenters, depots — silhouettes
      }
    }
    const pips: LocalSlotPip[] = [];
    if (slots) {
      const names = (def.locationId && opts.worldNames?.[def.locationId]) || [];
      const total = slots.total;
      let idx = 0;
      const push = (kind: SlotRingSegmentKind, n: number) => {
        for (let i = 0; i < n && idx < total; i++, idx++) {
          const tag = kind === 'yours' ? 'Yours' : kind === 'free' ? 'Free' : (names.length ? names[i % names.length] : 'Other corporation');
          pips.push({ index: idx, frac: idx / total, kind, tag });
        }
      };
      push('yours', slots.yours);
      push('others', slots.others);
      push('free', slots.free);
    }
    return { ...def, scale, slots, pips, satellites, stations, otherSatellites: slots?.others ?? 0 };
  });
  const shells = buildShells(bodyId, body.radiusKm);

  // Moons (the system view's hand-tuned scales, for continuity on the swap).
  const moons: LocalMoon[] = ORBITAL_BODIES.filter(m => m.parent === bodyId).map((m: OrbitalBody) => ({
    id: m.id,
    name: m.name,
    locationId: m.locationId,
    r: sceneBodyRadius(m.radiusKm),
    orbitScale: m.orbitScale || 2,
    periodSec: moonDisplayPeriodSec(m.periodDays),
    phaseDeg: m.phaseDeg,
    color: m.color,
    texture: m.texture,
    unlocked: m.locationId ? unlockedSet.has(m.locationId) : true,
    shells: buildShells(m.id, m.radiusKm),
  }));

  // The location set this scene owns.
  const locationIds: string[] = [body.locationId];
  for (const s of shells) if (s.locationId) locationIds.push(s.locationId);
  for (const m of moons) {
    if (m.locationId) locationIds.push(m.locationId);
    for (const s of m.shells) if (s.locationId) locationIds.push(s.locationId);
  }
  const localSet = new Set(locationIds);
  const externals = new Set<string>();

  // Ships: yours, wrapped as contacts so placeContacts serves both.
  const ships: LocalShip[] = [];
  for (const ship of state.ships || []) {
    if (!ship.isBuilt) continue;
    const color = ownShipColor(ship.definitionId);
    const hullClass = hullClassOf(ship.definitionId);
    const name = ship.name || hullClass;
    if (ship.status === 'in_transit' && ship.route) {
      const fromIn = localSet.has(ship.route.from);
      const toIn = localSet.has(ship.route.to);
      if (!fromIn && !toIn) continue;
      const total = Math.max(1, ship.route.arrivalAtMs - ship.route.departedAtMs);
      const progress = Math.max(0, Math.min(1, (nowMs - ship.route.departedAtMs) / total));
      const etaMs = Math.max(0, ship.route.arrivalAtMs - nowMs);
      if (!fromIn) externals.add(ship.route.from);
      if (!toIn) externals.add(ship.route.to);
      ships.push({
        id: `own:${ship.instanceId}`, name, own: true, color, etaMs,
        status: toIn ? 'arriving' : 'departing',
        contact: { id: `own:${ship.instanceId}`, hullClass, status: 'transit', laneA: ship.route.from, laneB: ship.route.to, progress, etaMs },
      });
    } else if (localSet.has(ship.currentLocation)) {
      ships.push({
        id: `own:${ship.instanceId}`, name, own: true, color, status: 'holding',
        contact: { id: `own:${ship.instanceId}`, hullClass, status: 'holding', locationId: ship.currentLocation },
      });
    }
  }
  // Contacts from the traffic feed (already anonymised server-side).
  for (const c of opts.contacts || []) {
    if (c.status === 'transit') {
      const fromIn = !!c.laneA && localSet.has(c.laneA);
      const toIn = !!c.laneB && localSet.has(c.laneB);
      if (!fromIn && !toIn) continue;
      if (!fromIn && c.laneA) externals.add(c.laneA);
      if (!toIn && c.laneB) externals.add(c.laneB);
      ships.push({ id: c.id, name: '', own: false, color: '#7c8594', status: toIn ? 'arriving' : 'departing', contact: c, etaMs: c.etaMs });
    } else if (c.locationId && localSet.has(c.locationId)) {
      ships.push({ id: c.id, name: '', own: false, color: '#7c8594', status: 'holding', contact: c });
    }
  }

  const extentScale = Math.max(1.5, ...shells.map(s => s.scale), ...moons.map(m => m.orbitScale));

  const yours = shells.reduce((n, s) => n + s.satellites + s.stations, 0);
  const arriving = ships.filter(s => s.own && s.status === 'arriving').length;
  const departing = ships.filter(s => s.own && s.status === 'departing').length;
  const contacts = ships.filter(s => !s.own).length;
  const parts = [`${body.name} local view.`];
  if (moons.length) parts.push(`${moons.length} moon${moons.length === 1 ? '' : 's'}: ${moons.map(m => m.name).join(', ')}.`);
  if (shells.length) parts.push(`Orbital shells: ${shells.map(s => s.label).join(', ')}.`);
  parts.push(`${yours} of your orbital assets here.`);
  if (arriving || departing) parts.push(`Your ships: ${arriving} arriving, ${departing} departing.`);
  if (contacts) parts.push(`${contacts} other contact${contacts === 1 ? '' : 's'} nearby.`);
  for (const s of shells) if (s.slots) parts.push(s.slots.srText);

  return {
    bodyId,
    locationId: body.locationId,
    name: body.name,
    bodyR,
    radiusKm: body.radiusKm,
    color: body.color,
    texture: body.texture,
    unlocked: unlockedSet.has(body.locationId),
    enterR: enter,
    exitR: exit,
    shells,
    moons,
    ships,
    locationIds,
    externalIds: Array.from(externals),
    extentScale,
    builtAtMs: nowMs,
    srText: parts.join(' '),
  };
}

const DEG = Math.PI / 180;

/** Moon position in the local frame (body centre at the origin, ecliptic
 *  plane xz) at scene time tSec, in multiples of the body's visual radius.
 *  `tSec = 0` freezes the layout (reduced motion). */
export function localMoonOffset(moon: LocalMoon, tSec: number): Vec3 {
  const theta = moon.phaseDeg * DEG + (tSec / Math.abs(moon.periodSec || 1)) * Math.PI * 2 * Math.sign(moon.periodSec || 1);
  return [moon.orbitScale * Math.cos(theta), 0, moon.orbitScale * Math.sin(theta)];
}

/** Ring "port" angle: where ships on a lane join/leave a shell. Spread per
 *  shell so LEO and GEO traffic does not stack on one radial. */
export function shellPortAngle(shellIndex: number): number {
  return -Math.PI / 3 + shellIndex * (Math.PI * 0.55);
}

/** Exit-anchor distance (multiples of bodyR): beyond every drawn orbit and
 *  still inside the enter sphere, so departing ships leave the frame before
 *  the scene would swap. */
export const LOCAL_EXIT_SCALE = 4.6;

export interface LocalAnchors {
  /** Endpoints for transit placement (a port point on each shell, the moon
   *  itself, the body, and the exit points toward external locations). */
  lane: Record<string, ContactAnchor>;
  /** Anchors for holding placement: centre + radius such that a holding
   *  ship orbits ON its shell (orbitGap must be passed as 0). */
  hold: Record<string, ContactAnchor>;
}

/**
 * Anchor tables for placeContacts() in the local frame, in the renderer's
 * units (`unitR` = pixels or scene units per body radius). `exitDirs` maps
 * an external location id to a unit direction in the local plane (x, z) —
 * the 3D renderer derives it from live body positions, the 2D canvas from
 * its layout. Missing externals fall back to a deterministic direction so
 * every lane still resolves.
 */
export function localAnchorsAt(model: LocalSceneModel, tSec: number, unitR: number, exitDirs: Record<string, [number, number]> = {}): LocalAnchors {
  const lane: Record<string, ContactAnchor> = {};
  const hold: Record<string, ContactAnchor> = {};
  lane[model.locationId] = { pos: [0, 0, 0], r: unitR };
  hold[model.locationId] = { pos: [0, 0, 0], r: unitR * 1.12 };
  model.shells.forEach((s, i) => {
    if (!s.locationId) return;
    const a = shellPortAngle(i);
    lane[s.locationId] = { pos: [Math.cos(a) * s.scale * unitR, 0, Math.sin(a) * s.scale * unitR], r: 0.08 * unitR };
    hold[s.locationId] = { pos: [0, 0, 0], r: s.scale * unitR };
  });
  for (const m of model.moons) {
    if (!m.locationId) continue;
    const o = localMoonOffset(m, tSec);
    const pos: Vec3 = [o[0] * unitR, 0, o[2] * unitR];
    const mr = (m.r / model.bodyR) * unitR;
    lane[m.locationId] = { pos, r: mr };
    hold[m.locationId] = { pos, r: mr * 1.3 };
    // A moon's own shells (lunar orbit around the Moon inside Earth's scene).
    for (const s of m.shells) {
      if (!s.locationId) continue;
      lane[s.locationId] = { pos: [pos[0] + mr * s.scale, 0, pos[2]], r: 0.06 * unitR };
      hold[s.locationId] = { pos, r: mr * s.scale };
    }
  }
  model.externalIds.forEach((id, i) => {
    let d = exitDirs[id];
    if (!d) {
      const a = (i / Math.max(1, model.externalIds.length)) * Math.PI * 2 + 0.7;
      d = [Math.cos(a), Math.sin(a)];
    }
    const len = Math.hypot(d[0], d[1]) || 1;
    const pos: Vec3 = [(d[0] / len) * LOCAL_EXIT_SCALE * unitR, 0, (d[1] / len) * LOCAL_EXIT_SCALE * unitR];
    lane[id] = { pos, r: 0.05 * unitR };
    hold[id] = { pos, r: 0.05 * unitR };
  });
  return { lane, hold };
}

/** Unit direction (x, z) from body A to location B using system positions —
 *  the 3D renderer's exit direction. Null when either is unknown. */
export function exitDirection(positions: ScenePositions, bodyId: string, externalId: string): [number, number] | null {
  const from = positions.bodies[bodyId];
  const to = positions.anchors[externalId]?.pos;
  if (!from || !to) return null;
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return null;
  return [dx / len, dz / len];
}

/** Glint angle for the i-th of n satellites on a shell — evenly spread,
 *  slowly drifting unless frozen (reduced motion). */
export function glintAngle(i: number, n: number, tSec: number, radPerSec = 0.12): number {
  return (i / Math.max(1, n)) * Math.PI * 2 + tSec * radPerSec;
}

// ─── 4. 2D orbit-diagram layout ──────────────────────────────────────────────

export interface LocalDiagramLayout {
  cx: number;
  cy: number;
  /** Body radius in px. */
  R: number;
  rings: { id: string; radiusPx: number }[];
  moons: { id: string; orbitPx: number; rPx: number }[];
  /** Pixels per body-radius unit (= R). */
  unitR: number;
}

/** Body radius the diagram would like (px) before fitting. */
export const DIAGRAM_BODY_PX = 46;
export const DIAGRAM_BODY_MIN_PX = 22;

/** Fit the model into a w×h canvas: the outermost orbit stays inside 46 %
 *  of the shorter side (room for labels), the body never below 22 px. */
export function layoutLocalDiagram(model: LocalSceneModel, w: number, h: number): LocalDiagramLayout {
  const short = Math.max(1, Math.min(w, h));
  // Outermost drawn edge in body-radius units: a moon's own disc extends
  // past its orbit (the Moon is 0.66 Earth radii wide in scene units).
  const edge = Math.max(
    model.extentScale,
    ...model.moons.map(m => m.orbitScale + m.r / Math.max(1e-6, model.bodyR)),
  );
  const fit = (short * 0.46) / Math.max(1.5, edge + 0.3);
  const R = Math.max(DIAGRAM_BODY_MIN_PX, Math.min(DIAGRAM_BODY_PX, fit));
  return {
    cx: w / 2,
    cy: h / 2,
    R,
    unitR: R,
    rings: model.shells.map(s => ({ id: s.id, radiusPx: s.scale * R })),
    moons: model.moons.map(m => ({ id: m.id, orbitPx: m.orbitScale * R, rPx: Math.max(3, (m.r / model.bodyR) * R) })),
  };
}

// ─── 5. Breadcrumb ───────────────────────────────────────────────────────────

export interface BreadcrumbChip {
  kind: 'system' | 'body' | 'local';
  label: string;
  /** The chip names where you are (aria-current). */
  current: boolean;
  /** Clicking the chip does something (never for the current chip). */
  actionable: boolean;
  bodyId?: string;
}

/**
 * "System › Earth › Local". `localBodyId` = the scene the camera is in;
 * `selectedBodyId` = the body a selection resolves to (localBodyForLocation).
 *   • system view, nothing selected → [System·]
 *   • system view, Earth selected   → [System·] › [Earth] › [Local]  (Local enters)
 *   • Earth local scene             → [System] › [Earth] › [Local·]  (System exits)
 *   • Moon local (nested)           → [System] › [Earth] › [Moon] › [Local·]
 */
export function buildBreadcrumb(localBodyId: string | null, selectedBodyId: string | null): BreadcrumbChip[] {
  const chips: BreadcrumbChip[] = [];
  const focus = localBodyId ?? selectedBodyId;
  const inLocal = !!localBodyId;
  chips.push({ kind: 'system', label: 'System', current: !focus && !inLocal, actionable: inLocal || !!focus });
  if (!focus) return chips;
  const chain: string[] = [];
  let cursor: string | undefined = focus;
  while (cursor) {
    chain.unshift(cursor);
    cursor = ORBITAL_BODY_MAP.get(cursor)?.parent;
  }
  for (const id of chain) {
    const def = ORBITAL_BODY_MAP.get(id);
    chips.push({ kind: 'body', label: def?.name ?? id, current: false, actionable: true, bodyId: id });
  }
  chips.push({ kind: 'local', label: 'Local', current: inLocal, actionable: !inLocal, bodyId: focus });
  return chips;
}

/** The top-level body of a nested chain (Moon → Earth). Leaving a local
 *  scene flies out past THIS body's exit sphere, so "System" from the
 *  Moon's scene reaches the system view instead of stopping in Earth's. */
export function rootBodyId(bodyId: string): string {
  let cur = bodyId;
  for (let i = 0; i < 8; i++) {
    const parent = ORBITAL_BODY_MAP.get(cur)?.parent;
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

/** Human name for a body id (breadcrumb / announcements). */
export function bodyName(bodyId: string | null | undefined): string {
  if (!bodyId) return '';
  const def = ORBITAL_BODY_MAP.get(bodyId);
  if (def) return def.name;
  return LOCATION_MAP.get(bodyId)?.name ?? bodyId;
}

/** Storage key for the once-per-browser local-scene hint. */
export const LOCAL_HINT_KEY = 'tycoon-map-local-hint-seen';
export const LOCAL_HINT_TEXT = 'Scroll out or press Escape to return to the system.';

/** Colour helper shared by both renderers: hollow / dim / bright pip look. */
export const SLOT_PIP_STYLE: Record<SlotRingSegmentKind, { color: string; alpha: number; hollow: boolean }> = {
  yours: { color: '#67e8f9', alpha: 1, hollow: false },
  others: { color: '#f59e0b', alpha: 0.5, hollow: false },
  free: { color: '#94a3b8', alpha: 0.45, hollow: true },
};
