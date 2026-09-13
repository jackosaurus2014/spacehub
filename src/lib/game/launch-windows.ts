// ─── Transfer (launch) windows — graphics Phase 3, item 3 ───────────────────
// The payoff of putting the planets at their real positions: once the map
// knows where Earth and Mars actually are on a given game date, it can answer
// "when is the next window, and how long is the ride?"
//
// This is an INTELLIGENCE feature (CLAUDE.md: "Market intelligence is a
// first-class feature ... the numbers must be honest"), so the maths is the
// textbook Hohmann model and the UI labels every number an ESTIMATE:
//
//   • Circular, coplanar orbits at each body's semi-major axis. Real
//     transfers to eccentric, inclined targets (Mars e = 0.093, Pluto
//     i = 17°) cost more delta-v and shift the date by days to weeks.
//   • A single impulsive burn at each end, no gravity assists, no low-thrust
//     spirals, no launch-site or parking-orbit constraints.
//   • Phase angles come from the ephemeris (orbital-elements.ts), which is
//     itself a mean-element approximation — see its accuracy note.
//
// It is deliberately NOT the engine's travel model: ships.ts / solar-system.ts
// still own real dispatch times and delta-v costs. Nothing here reads or
// writes GameState. Pure module, no React / three.js / DOM.

import {
  ORBITAL_BODIES,
  ORBITAL_BODY_MAP,
  ORBITAL_PIPS,
  KEPLER_ELEMENTS,
  bodyPositionAt,
  orbitalPeriodDays,
  wrapDeg360,
  wrapDegSigned,
} from './orbital-elements';

/** Days per game month — the game calendar is twelve equal months per year
 *  (server-time.ts), so a month is a Julian year / 12. */
export const DAYS_PER_GAME_MONTH = 365.25 / 12;

// ── Body resolution ─────────────────────────────────────────────────────────

/** Walk a body up to the thing that actually orbits the Sun: Io → Jupiter,
 *  the Moon → Earth, Mars → Mars. Null if the id is unknown or has no
 *  element set (so transfer maths is never attempted on it). */
export function heliocentricRootOf(bodyId: string | null | undefined): string | null {
  let id = bodyId || null;
  for (let i = 0; id && i < 8; i++) {
    const def = ORBITAL_BODY_MAP.get(id);
    if (!def) return null;
    if (!def.parent) return KEPLER_ELEMENTS[id] ? id : null;
    id = def.parent;
  }
  return null;
}

/** The heliocentric body a GAME LOCATION belongs to. LEO → earth,
 *  lunar_orbit → earth, io_surface → jupiter, ceres_surface → ceres.
 *  Returns null for the free-floating region pips (the belt operations
 *  marker, the deep-space relay), which are not on a single orbit. */
export function transferRootForLocation(locationId: string | null | undefined): string | null {
  if (!locationId) return null;
  const pip = ORBITAL_PIPS.find(p => p.locationId === locationId);
  if (pip) {
    if (pip.parent === 'belt' || pip.parent === 'deep') return null;
    return heliocentricRootOf(pip.parent);
  }
  const body = ORBITAL_BODIES.find(b => b.locationId === locationId);
  return body ? heliocentricRootOf(body.id) : null;
}

/** Display name of a heliocentric root ("Mars", "Jupiter"). */
export function rootName(bodyId: string): string {
  return ORBITAL_BODY_MAP.get(bodyId)?.name ?? bodyId;
}

function semiMajorAxisAU(bodyId: string): number | null {
  const el = KEPLER_ELEMENTS[bodyId];
  return el ? el.aAU : null;
}

// ── Hohmann maths ───────────────────────────────────────────────────────────

/**
 * Time of flight for a Hohmann transfer between circular orbits of radius
 * a1 and a2 (AU): half the period of the transfer ellipse, whose semi-major
 * axis is the mean of the two. Earth → Mars = 258.9 days (8.5 game months).
 */
export function hohmannTransferDays(a1AU: number, a2AU: number): number {
  const aT = (a1AU + a2AU) / 2;
  return 0.5 * orbitalPeriodDays(aT);
}

/**
 * The phase angle the TARGET must lead the ORIGIN by at departure, in degrees
 * wrapped to (-180, 180]: the target travels half a revolution of the
 * transfer minus whatever it covers during the flight. Earth → Mars = +44.3°;
 * Mars → Earth = -75.1° (Earth must TRAIL Mars).
 */
export function requiredPhaseAngleDeg(a1AU: number, a2AU: number): number {
  const tof = hohmannTransferDays(a1AU, a2AU);
  const targetPeriod = orbitalPeriodDays(a2AU);
  return wrapDegSigned(180 - 360 * (tof / targetPeriod));
}

/** Synodic period in days — how often the same alignment recurs. Earth/Mars
 *  = 779.9 days (25.6 game months). Infinity for identical orbits. */
export function synodicPeriodDays(a1AU: number, a2AU: number): number {
  const n1 = 360 / orbitalPeriodDays(a1AU);
  const n2 = 360 / orbitalPeriodDays(a2AU);
  const rel = Math.abs(n1 - n2);
  return rel < 1e-12 ? Infinity : 360 / rel;
}

/**
 * Current phase angle: the target's ecliptic longitude minus the origin's,
 * wrapped to (-180, 180]. Positive = the target leads. Uses the REAL
 * ephemeris at `dateMs` (a real UTC instant derived from the game calendar).
 */
export function phaseAngleAt(fromId: string, toId: string, dateMs: number): number | null {
  const a = bodyPositionAt(fromId, dateMs);
  const b = bodyPositionAt(toId, dateMs);
  if (!a || !b) return null;
  return wrapDegSigned(b.lonDeg - a.lonDeg);
}

export interface TransferWindow {
  fromId: string;
  toId: string;
  /** Real UTC ms of departure (feed it back through the game calendar for a
   *  label — see `windowGameMonths`). */
  departMs: number;
  /** Real UTC ms of arrival. */
  arriveMs: number;
  /** Days from the reference date until departure. */
  waitDays: number;
  /** Flight time, days, and the same in game months. */
  transferDays: number;
  transferMonths: number;
  /** Phase angle required at departure, degrees (-180, 180]. */
  requiredPhaseDeg: number;
  /** Phase angle at the reference date, degrees (-180, 180]. */
  phaseAtReferenceDeg: number;
  /** Recurrence interval, days. */
  synodicDays: number;
}

/**
 * The next `count` Hohmann departure opportunities from `fromId` to `toId`
 * after `fromDateMs`. Empty when either body has no elements, when the two
 * are the same body, or when the orbits are so close that no synodic period
 * exists (never true for the bodies we carry, but guarded).
 *
 * Method: take the phase angle now, take the phase angle required at
 * departure, and divide the gap by the relative angular rate — advancing
 * FORWARD in whichever direction the pair actually drifts. Later windows are
 * one synodic period apart.
 */
export function nextTransferWindows(
  fromId: string,
  toId: string,
  fromDateMs: number,
  count = 3,
): TransferWindow[] {
  if (fromId === toId) return [];
  const a1 = semiMajorAxisAU(fromId);
  const a2 = semiMajorAxisAU(toId);
  if (a1 == null || a2 == null || !Number.isFinite(fromDateMs)) return [];
  const synodicDays = synodicPeriodDays(a1, a2);
  if (!Number.isFinite(synodicDays)) return [];

  const phaseNow = phaseAngleAt(fromId, toId, fromDateMs);
  if (phaseNow == null) return [];
  const requiredPhaseDeg = requiredPhaseAngleDeg(a1, a2);
  const transferDays = hohmannTransferDays(a1, a2);

  // Relative drift of the phase angle, degrees per day. An inner origin
  // (Earth → Mars) sees the target fall behind: the rate is negative.
  const rate = 360 / orbitalPeriodDays(a2) - 360 / orbitalPeriodDays(a1);
  let gap = wrapDeg360(requiredPhaseDeg - phaseNow); // [0, 360)
  if (rate < 0) gap = gap === 0 ? 0 : gap - 360;     // (-360, 0]
  const firstWaitDays = gap / rate;

  const out: TransferWindow[] = [];
  const n = Math.max(1, Math.min(12, Math.floor(count)));
  for (let i = 0; i < n; i++) {
    const waitDays = firstWaitDays + i * synodicDays;
    const departMs = fromDateMs + waitDays * 86_400_000;
    out.push({
      fromId,
      toId,
      departMs,
      arriveMs: departMs + transferDays * 86_400_000,
      waitDays,
      transferDays,
      transferMonths: transferDays / DAYS_PER_GAME_MONTH,
      requiredPhaseDeg,
      phaseAtReferenceDeg: phaseNow,
      synodicDays,
    });
  }
  return out;
}

/** Convenience: just the next one. */
export function nextTransferWindow(fromId: string, toId: string, fromDateMs: number): TransferWindow | null {
  return nextTransferWindows(fromId, toId, fromDateMs, 1)[0] ?? null;
}

// ── Pairs the player can actually use ───────────────────────────────────────

/**
 * The distinct heliocentric bodies the player has unlocked a location on,
 * in map order. Region pips (belt operations, deep-space relay) contribute
 * nothing — they are not on one orbit.
 */
export function unlockedTransferRoots(unlockedLocationIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of ORBITAL_BODIES) {
    if (!b.locationId) continue;
    const root = heliocentricRootOf(b.id);
    if (!root || seen.has(root)) continue;
    const hasAny = unlockedLocationIds.some(id => transferRootForLocation(id) === root);
    if (!hasAny) continue;
    seen.add(root);
    out.push(root);
  }
  return out;
}

/** Every ordered pair of unlocked roots — the set the scrubber timeline and
 *  the local scene draw their windows from. */
export function unlockedTransferPairs(unlockedLocationIds: readonly string[]): { from: string; to: string }[] {
  const roots = unlockedTransferRoots(unlockedLocationIds);
  const out: { from: string; to: string }[] = [];
  for (const from of roots) for (const to of roots) if (from !== to) out.push({ from, to });
  return out;
}

/**
 * The corporation's departure port for planning purposes. Every Space Tycoon
 * save starts on Earth (cargo-logistics.ts HOME_LOCATION_IDS) and the command
 * centre is an Earth operations room (CLAUDE.md, "GUI and Command Center"),
 * so an unqualified "next window to Mars" means "from Earth".
 */
export const TRANSFER_ORIGIN_ROOT = 'earth';

/**
 * The next windows worth showing for a selected body: its pairs with every
 * unlocked root, plus the Earth-origin pair so a brand-new corporation (which
 * has unlocked exactly one root) still gets planning intelligence. Sorted by
 * departure, soonest first.
 */
export function windowsForBody(
  bodyId: string,
  unlockedLocationIds: readonly string[],
  fromDateMs: number,
  count = 4,
): TransferWindow[] {
  const root = heliocentricRootOf(bodyId);
  if (!root) return [];
  const partners = new Set<string>(unlockedTransferRoots(unlockedLocationIds));
  partners.add(TRANSFER_ORIGIN_ROOT);
  partners.delete(root);
  const out: TransferWindow[] = [];
  for (const partner of partners) {
    // Both directions: leaving for the body, and leaving it to come back.
    out.push(...nextTransferWindows(partner, root, fromDateMs, 2));
    out.push(...nextTransferWindows(root, partner, fromDateMs, 2));
  }
  out.sort((a, b) => a.departMs - b.departMs);
  return out.slice(0, Math.max(1, count));
}

// ── Formatting ──────────────────────────────────────────────────────────────

/** "8.5 months" / "24 days" — flight time in the unit that reads best. */
export function formatTransferTime(transferDays: number): string {
  const months = transferDays / DAYS_PER_GAME_MONTH;
  if (months < 1.5) return `${Math.round(transferDays)} days`;
  return `${months.toFixed(1)} months`;
}

/**
 * The Location List / local-scene line, e.g.
 * "Next window to Mars: Nov 2084, 8.5 months transit (estimate)".
 * `formatDate` turns the departure's real ms back into the game-calendar
 * label — the caller passes map-time's formatter so this module stays free
 * of the calendar's details.
 */
export function formatWindowLine(
  w: TransferWindow,
  formatDate: (departMs: number) => string,
): string {
  return `Next window to ${rootName(w.toId)}: ${formatDate(w.departMs)}, ${formatTransferTime(w.transferDays)} transit`;
}

/**
 * The compact form for a Location List cell, which is ~110 px wide: a marker
 * glyph, the departure month and the flight time. The full sentence from
 * formatWindowLine goes in the row's title and screen-reader text, so the
 * abbreviation is never the only place the information exists.
 */
export function formatWindowChip(
  w: TransferWindow,
  formatDate: (departMs: number) => string,
): string {
  const months = w.transferDays / DAYS_PER_GAME_MONTH;
  const dur = months < 1.5 ? `${Math.round(w.transferDays)}d` : `${months.toFixed(1)}mo`;
  return `◆ ${formatDate(w.departMs)} · ${dur}`;
}

/** Both ends named — the local-scene chip, where the body in view may be the
 *  origin OR the destination: "Mars → Earth: Apr 2087, 8.5 months transit". */
export function formatWindowPairLine(
  w: TransferWindow,
  formatDate: (departMs: number) => string,
): string {
  return `${rootName(w.fromId)} → ${rootName(w.toId)}: ${formatDate(w.departMs)}, ${formatTransferTime(w.transferDays)} transit`;
}
