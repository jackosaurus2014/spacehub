// ─── Space Tycoon: Headquarters (the Command Center as a place) ─────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md — the headquarters is a place with
// a window, and the window changes as the corporation grows. CC-1 ships the
// Earth Operations Center only; the rest of the ladder is listed here (with
// `comingSoon`) so the Bridge can show where the corporation is headed.
// Relocation (project, seat lease, bonuses, server route) is CC-2 — nothing
// in this file moves an HQ yet.
//
// The stage registry is the single source of truth for: the HQ chip on the
// Bridge, the sync route's sanitizer (GameProfile.hqLocationId only ever
// holds a registered location), and the public corp page / leaderboard
// label ("HQ: Earth Operations Center").

import type { GameState, HeadquartersState } from './types';

export type HqStageId =
  | 'earth_ops'
  | 'orbital_deck'
  | 'lunar_hq'
  | 'mars_hq'
  | 'jovian_hq'
  | 'saturnian_hq'
  | 'deep_space_hq'
  | 'interstellar_hq';

export interface HqStageDef {
  id: HqStageId;
  /** Full name, e.g. "Earth Operations Center". */
  label: string;
  /** Short name for chips and table cells, e.g. "Earth Ops". */
  shortLabel: string;
  /** The solar-system location the HQ sits at (solar-system.ts ids; the
   *  interstellar seat is a placeholder until CC-4 wires the colony charter). */
  locationId: string;
  /** Corporation tier (corporation-tiers.ts) at which this seat unlocks. */
  tier: number;
  /** One line of lore for the HoloTip (docs/LORE.md vocabulary). */
  lore: string;
  /** What the move requires, in the player's words (design §3). */
  requirement: string;
  /** Plates rendered and a stage manifest published under public/game/hq/. */
  plates?: { dir: string };
  /** Listed on the ladder but not yet buildable — relocation lands in CC-2+. */
  comingSoon?: boolean;
  /** Hours added to UTC to get the window's local clock. The Earth centre
   *  keeps 0 for now (design: "day/night from the world clock"; the game
   *  clock has no hour-of-day, so real UTC drives the variant). Switching
   *  the Cape to local time is a one-line change here. */
  clockOffsetHours: number;
}

export const HQ_STAGES: readonly HqStageDef[] = [
  {
    id: 'earth_ops',
    label: 'Earth Operations Center',
    shortLabel: 'Earth Ops',
    locationId: 'earth_surface',
    tier: 1,
    lore: 'A coastal launch complex licensed under the Accord of 2089. Every corporation starts here.',
    requirement: 'Default seat — free.',
    plates: { dir: '/game/hq/earth/' },
    clockOffsetHours: 0,
  },
  {
    id: 'orbital_deck',
    label: 'Orbital Command Deck',
    shortLabel: 'LEO Deck',
    locationId: 'leo',
    tier: 2,
    lore: 'An anchorage rented from the Syndicate-run station registry. Earth fills the window; sunrise every ninety minutes.',
    requirement: 'Orbital Outpost + a leased LEO seat, then a relocation project.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'lunar_hq',
    label: 'Lunar Gateway HQ',
    shortLabel: 'Lunar HQ',
    locationId: 'lunar_surface',
    tier: 3,
    lore: 'A seat inside the Belt Rush-era infrastructure at the south pole. Colony lights on the crater rim.',
    requirement: 'Lunar station or habitat + a relocation project.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'mars_hq',
    label: 'Mars Orbital HQ',
    shortLabel: 'Mars HQ',
    locationId: 'mars_orbit',
    tier: 4,
    lore: 'The relay station above Meridian. Dust storms roll across the window in season.',
    requirement: 'Mars relay + habitat; seat sold at auction.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'jovian_hq',
    label: 'Jovian Station HQ',
    shortLabel: 'Jovian HQ',
    locationId: 'jupiter_system',
    tier: 5,
    lore: 'Bordering Void Corsair space. Radiation glow on the horizon, pirate warnings in the window.',
    requirement: 'Outer-system station; seat sold at auction. One of Jovian or Saturnian.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'saturnian_hq',
    label: 'Saturnian Ring HQ',
    shortLabel: 'Saturn HQ',
    locationId: 'saturn_system',
    tier: 5,
    lore: 'Ring shadow sweeps the deck twice a shift. The quietest seat in the system, and the furthest from help.',
    requirement: 'Outer-system station; seat sold at auction. One of Jovian or Saturnian.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'deep_space_hq',
    label: 'Heliopause Station HQ',
    shortLabel: 'Deep Space',
    locationId: 'outer_system',
    tier: 6,
    lore: 'A Kuiper station at the edge of the heliosphere. Expedition ships return through the haze.',
    requirement: 'Mothership-class flagship docked.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'interstellar_hq',
    label: 'Interstellar HQ',
    shortLabel: 'Interstellar',
    locationId: 'interstellar',
    tier: 7,
    lore: "A new star's disc and an unfamiliar planet. The corporation writes its own chapter.",
    requirement: 'Completed interstellar expedition + colony charter.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
];

export const HQ_STAGE_MAP: ReadonlyMap<HqStageId, HqStageDef> = new Map(HQ_STAGES.map(s => [s.id, s]));

export const DEFAULT_HQ_STAGE: HqStageId = 'earth_ops';
export const DEFAULT_HQ_LOCATION = HQ_STAGE_MAP.get(DEFAULT_HQ_STAGE)!.locationId;

export function isHqStageId(value: unknown): value is HqStageId {
  return typeof value === 'string' && HQ_STAGE_MAP.has(value as HqStageId);
}

export function getHqStage(id: HqStageId): HqStageDef {
  return HQ_STAGE_MAP.get(id) ?? HQ_STAGE_MAP.get(DEFAULT_HQ_STAGE)!;
}

/** Stages that have rendered plates today (the Bridge can draw them). */
export function hqStagesWithPlates(): HqStageDef[] {
  return HQ_STAGES.filter(s => !!s.plates && !s.comingSoon);
}

/** The founding-day default: Earth, moved in on the corporation's createdAt. */
export function defaultHeadquarters(foundedAtMs: number): HeadquartersState {
  const stage = getHqStage(DEFAULT_HQ_STAGE);
  return {
    stage: stage.id,
    locationId: stage.locationId,
    movedAtMs: Number.isFinite(foundedAtMs) && foundedAtMs > 0 ? foundedAtMs : 0,
  };
}

/** A save's headquarters block is valid when it names a registered stage
 *  and its location agrees with that stage's seat. Anything else (missing,
 *  pre-CC-1 save, tampered blob) is replaced by the default on load. */
export function isValidHeadquarters(hq: unknown): hq is HeadquartersState {
  if (!hq || typeof hq !== 'object') return false;
  const h = hq as Partial<HeadquartersState>;
  if (!isHqStageId(h.stage)) return false;
  if (h.locationId !== getHqStage(h.stage).locationId) return false;
  return typeof h.movedAtMs === 'number' && Number.isFinite(h.movedAtMs) && h.movedAtMs >= 0;
}

/** Read the HQ off a state, never undefined — a save that predates CC-1
 *  (or a state built by a test fixture) reads as the Earth default. */
export function getHeadquarters(state: Pick<GameState, 'headquarters' | 'createdAt'>): HeadquartersState {
  return isValidHeadquarters(state.headquarters) ? state.headquarters : defaultHeadquarters(state.createdAt);
}

/** Bring a loaded save up to CC-1: add `headquarters` when missing or
 *  malformed. Additive, no SAVE_VERSION bump (constants.ts convention). */
export function migrateHeadquarters(state: GameState): GameState {
  if (!isValidHeadquarters(state.headquarters)) state.headquarters = defaultHeadquarters(state.createdAt);
  return state;
}

/** Server-side sanitizer for GameProfile.hqLocationId: the client sends a
 *  location id; only a registered stage's seat is stored, everything else
 *  collapses to Earth. (CC-2's relocation route becomes the authoritative
 *  writer; until then the sync mirrors the client's — always Earth.) */
export function sanitizeHqLocationId(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_HQ_LOCATION;
  const stage = HQ_STAGES.find(s => s.locationId === raw);
  return stage ? stage.locationId : DEFAULT_HQ_LOCATION;
}

/** Stage for a stored location id (public corp page, leaderboard). */
export function hqStageForLocationId(locationId: string | null | undefined): HqStageDef {
  return HQ_STAGES.find(s => s.locationId === locationId) ?? getHqStage(DEFAULT_HQ_STAGE);
}

/** "HQ: Earth Operations Center" — the public label. */
export function hqLabelForLocationId(locationId: string | null | undefined): string {
  return hqStageForLocationId(locationId).label;
}
