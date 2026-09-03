// ─── Space Tycoon: Interstellar Era v1 ──────────────────────────────────────
// Per STATS_DESIGN.md Phase VIII. End-game content: jump drives, exotic fuel,
// signal lag, first interstellar destinations, and the narrative
// "Wanderer-1 returns" era that bridges solar-system and galactic play.
//
// This module defines the *data* — types, destinations, gating. Engine
// integration (actual jumps, time-lag simulation, interstellar market) is
// deferred; declaring the data here lets UI and future waves depend on it.

import type { SolarSystemLocation } from './types';
// Row 12 (signal lag): the lag rate is quoted in game-months, so it is
// derived from the ONE world-clock constant rather than a shadow copy.
import { REAL_SECONDS_PER_GAME_MONTH } from './server-time';

// ─── Interstellar waypoints ──────────────────────────────────────────────────
// Five initial star systems reachable with jump-drive tech. Distances in
// light-years. Travel time is NOT proportional to distance once you have a
// jump drive — jumps are instantaneous from a fuel-cost perspective but
// require increasingly exotic fuel volumes at larger distances.

export interface InterstellarSystem {
  id: string;
  name: string;
  distanceLy: number;              // light-years from Sol
  jumpFuelRequired: number;        // units of exotic fuel for a single jump
  /** Signal round-trip time in real minutes (for future signal-lag mechanic). */
  signalRoundTripMinutes: number;
  description: string;
  knownResources: string[];
  /** Unlock prerequisites — beyond the jump_drive research. */
  prerequisites: string[];
  /** Faction contact — arriving corp gets a diplomatic event with this faction. */
  firstContactFaction?: string;
}

export const INTERSTELLAR_SYSTEMS: InterstellarSystem[] = [
  {
    id: 'proxima_centauri',
    name: 'Proxima Centauri',
    distanceLy: 4.24,
    jumpFuelRequired: 500,
    signalRoundTripMinutes: 8.5 * 60,  // 8.5 years = but "minutes" is narrative placeholder
    description: 'Nearest star system to Sol. Proxima Centauri b sits in the habitable zone — the first plausible extra-solar colony. Home of the Wanderer-1 probe return.',
    knownResources: ['mars_water', 'exotic_materials', 'helium3'],
    prerequisites: ['jump_drive'],
    firstContactFaction: 'echo-remnants',  // Echo Remnants have been here before
  },
  {
    id: 'barnards_star',
    name: "Barnard's Star",
    distanceLy: 5.96,
    jumpFuelRequired: 750,
    signalRoundTripMinutes: 12 * 60,
    description: 'Dim red dwarf with a confirmed frozen super-Earth. Rich in rare-earth spectral signatures — the gold rush of the interstellar era will start here.',
    knownResources: ['rare_earth', 'platinum_group', 'exotic_materials'],
    prerequisites: ['jump_drive'],
  },
  {
    id: 'wolf_359',
    name: 'Wolf 359',
    distanceLy: 7.86,
    jumpFuelRequired: 1_100,
    signalRoundTripMinutes: 16 * 60,
    description: 'Low-luminosity flare star. Unusual gravitational anomalies detected; Hive Collective probe wreckage observed but not investigated.',
    knownResources: ['exotic_materials'],
    prerequisites: ['jump_drive'],
    firstContactFaction: 'hive-collective',
  },
  {
    id: 'alpha_centauri',
    name: 'Alpha Centauri A/B',
    distanceLy: 4.37,
    jumpFuelRequired: 550,
    signalRoundTripMinutes: 8.7 * 60,
    description: 'Binary star system with multiple planets, including a confirmed Earth-analog in the habitable zone. The crown jewel of nearby interstellar destinations.',
    knownResources: ['mars_water', 'lunar_water', 'iron', 'aluminum', 'titanium', 'gold'],
    prerequisites: ['jump_drive', 'exotic_matter_refining'],
  },
  {
    id: 'sirius',
    name: 'Sirius A/B',
    distanceLy: 8.60,
    jumpFuelRequired: 1_400,
    signalRoundTripMinutes: 17 * 60,
    description: 'Bright binary with a white dwarf companion. Heavy metals concentrated in the Sirius B accretion disk. Route is dangerous — high radiation.',
    knownResources: ['gold', 'platinum_group', 'rare_earth', 'exotic_materials'],
    prerequisites: ['jump_drive', 'exotic_matter_refining', 'heavy_radiation_shielding'],
  },
];

export const INTERSTELLAR_SYSTEM_MAP = new Map(INTERSTELLAR_SYSTEMS.map(s => [s.id, s]));

// ─── Jump-drive research (added to research tree in a follow-on commit) ──────

export const JUMP_DRIVE_RESEARCH = {
  id: 'jump_drive',
  name: 'Alcubierre-Class Jump Drive',
  category: 'propulsion',
  tier: 5,
  description:
    'Controlled metric-space warp bubble. Enables single-jump transit to nearby star systems given sufficient exotic-matter fuel. Unlocks the interstellar era.',
  effect: 'Enables interstellar travel',
  baseCostMoney: 500_000_000_000,
  baseTimeMonths: 72,
  prerequisites: ['fusion_drive', 'metallic_hydrogen'],
  unlocks: ['exotic_matter_refining', 'interstellar_colonization'],
} as const;

export const EXOTIC_MATTER_REFINING_RESEARCH = {
  id: 'exotic_matter_refining',
  name: 'Exotic Matter Refining',
  category: 'materials',
  tier: 5,
  description:
    'Production of negative-mass particles in sufficient volume to sustain jump-drive operations. Required for longer jumps.',
  effect: 'Enables exotic-fuel production for interstellar jumps',
  baseCostMoney: 200_000_000_000,
  baseTimeMonths: 60,
  prerequisites: ['jump_drive'],
  unlocks: [],
} as const;

// ─── Exotic fuel ─────────────────────────────────────────────────────────────
// A new resource category: 'exotic_fuel', distinct from existing exotic_materials.
// Produced at a special refinery (to be added in the interstellar-industry wave).

export const EXOTIC_FUEL_RESOURCE = {
  id: 'exotic_fuel',
  name: 'Exotic-Matter Fuel',
  icon: '⚛️',
  category: 'exotic',
  description:
    'Concentrated negative-mass particulates. Required to sustain the Alcubierre warp bubble. Produced only at Exotic-Matter Refineries.',
  baseMarketPrice: 5_000_000,  // $5M per unit — end-game pricing
  minPrice: 1_000_000,
  maxPrice: 50_000_000,
  volatility: 0.12,
  startingSupply: 0,  // not available at game start
  npcRestockPerHour: 0,
} as const;

// ─── Signal lag (row 12, 2026-09-02) ────────────────────────────────────────
// docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 12. Interstellar operations have
// real delay: a colony at Proxima cannot be told to break ground the instant
// the player clicks. Every order aimed at an asset in ANOTHER star system is
// transmitted, not executed — it sits in `state.pendingInterstellarCommands`
// until its light-lag has elapsed, and the engine tick applies it then.
//
// Lag rate (BALANCE.md "Signal lag"): 2 game-months per light-year. On the
// unified world clock (server-time.ts, 6 real hours per game-month) that is
// 12 real hours per light-year — Proxima at 4.24 ly ≈ 2.1 real days, Sirius
// at 8.60 ly ≈ 4.3 days. Deliberately NOT the physical 4.24-year one-way
// round trip: this is a campaign-loop texture knob (days, not decades), tuned
// so an order issued in one session lands in a later one.
//
// Rules, per the founder-approved row:
//   • Fees leave at ISSUE time through the existing ledger paths (the order
//     was paid for when it was sent).
//   • A command is cancellable until it executes — with NO refund. Recalling
//     a transmission does not un-spend the money that bought the mission.
//   • Execution is idempotent on the executing side (each command is removed
//     from the queue as it is applied).
//
// Sol-side assets are unaffected: nothing inside the heliopause queues here.

/** Game-months of signal lag per light-year of distance. */
export const SIGNAL_LAG_GAME_MONTHS_PER_LY = 2;

/** Real milliseconds of signal lag per light-year (2 game-months × the world
 *  clock's 6-real-hour game-month = 12 real hours per ly). */
export const LIGHT_LAG_PER_LY_MS = SIGNAL_LAG_GAME_MONTHS_PER_LY * REAL_SECONDS_PER_GAME_MONTH * 1000;

/** Every order shape that can be sent across interstellar distance. */
export type InterstellarCommandKind =
  | 'found_colony'
  | 'upgrade_colony'
  | 'establish_trade_route'
  | 'set_trade_route_status'
  | 'recall_expedition';

export interface PendingInterstellarCommand {
  id: string;
  kind: InterstellarCommandKind;
  /** Destination system — what sets the lag. */
  targetSystemId: string;
  distanceLy: number;
  /** Money already debited at issue time (0 for free orders). Never refunded. */
  feePaid: number;
  sentAtMs: number;
  /** Wall-clock instant the order arrives and is applied by the tick. */
  executeAtMs: number;
  /** Player-facing one-liner for the queue chip / panel row. */
  label: string;
  /** Per-kind arguments; only the fields that kind needs are set. */
  expeditionId?: string;
  colonyId?: string;
  tradeRouteId?: string;
  resourceId?: string;
  colonyName?: string;
  routeStatus?: 'active' | 'suspended';
}

/** Signal lag for a distance in light-years, in real milliseconds. */
export function getSignalLagMs(distanceLy: number): number {
  return Math.round(Math.max(0, distanceLy) * LIGHT_LAG_PER_LY_MS);
}

/** Signal lag to a known system (0 for an unknown id — never block an order
 *  on a data gap). */
export function getSystemSignalLagMs(systemId: string): number {
  return getSignalLagMs(INTERSTELLAR_SYSTEM_MAP.get(systemId)?.distanceLy ?? 0);
}

// ─── First-contact events ───────────────────────────────────────────────────
// When a player first arrives at an interstellar system, narrative events
// fire. These are stubbed here; Phase VIII v2 will flesh them out.

export interface FirstContactEvent {
  systemId: string;
  factionId?: string;
  title: string;
  description: string;
  choices: Array<{ label: string; summary: string }>;
}

export const FIRST_CONTACT_EVENTS: Record<string, FirstContactEvent> = {
  proxima_centauri: {
    systemId: 'proxima_centauri',
    factionId: 'echo-remnants',
    title: 'Wanderer-1 Signal',
    description:
      'Your jump drive decoheres cleanly into Proxima space. Immediately, your systems detect a carrier signal — the Wanderer-1 probe is still broadcasting after all these years. And something else: an Echo Remnants outpost is already here, their sensors locked on you.',
    choices: [
      { label: 'Hail them openly', summary: 'Diplomatic first contact — +10 Echo Remnants rep, gain research access.' },
      { label: 'Maintain silence', summary: 'Observe without revealing yourself. No rep change but Remnants will eventually notice you.' },
      { label: 'Retrieve the probe', summary: 'Recover Wanderer-1 regardless of the Remnants — they will consider it theft.' },
    ],
  },
  wolf_359: {
    systemId: 'wolf_359',
    factionId: 'hive-collective',
    title: 'Wreckage Anomaly',
    description:
      'The Hive Collective probe wreckage your scanners flagged from Sol is worse than expected. Alive and signalling. A swarm-pattern handshake offers trade: their star-chart data for a sample of your jump drive.',
    choices: [
      { label: 'Accept the trade', summary: 'Exchange jump-drive tech for their charts. Risky — the Hive may reverse-engineer your advantage.' },
      { label: 'Decline politely', summary: 'Leave the wreckage. No rep change; you learn nothing new.' },
      { label: 'Salvage and leave', summary: 'Take the wreckage by force. -20 Hive rep. Their future contracts close to you.' },
    ],
  },
};

/**
 * Check if a corporation has completed the prerequisites to jump to a given
 * interstellar system. Returns a list of missing prerequisites, empty if
 * cleared.
 */
export function getJumpPrerequisites(
  targetSystemId: string,
  completedResearch: string[],
): string[] {
  const system = INTERSTELLAR_SYSTEM_MAP.get(targetSystemId);
  if (!system) return ['unknown_system'];
  return system.prerequisites.filter(p => !completedResearch.includes(p));
}
