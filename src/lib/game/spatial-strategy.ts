// ─── Space Tycoon: Spatial Strategy ─────────────────────────────────────────
// Shipping lanes, chokepoint analysis, and finite orbital slot inventory.
// Realizes the "Spatial strategy — geography matters" principle in CLAUDE.md.

import type { GameState } from './types';
import { LOCATION_MAP } from './solar-system';

// ─── Lane Definitions ────────────────────────────────────────────────────────
// Canonical transit routes between solar-system locations. Bidirectional — the
// same lane handles traffic both ways.

export interface ShippingLane {
  id: string;
  from: string;
  to: string;
  deltaV: number;       // m/s
  travelDays: number;   // approximate real-world-days equivalent
  category: 'orbital' | 'cislunar' | 'interplanetary' | 'outer' | 'deep';
  narrative?: string;   // lore colour for why this lane matters
}

export const LANES: ShippingLane[] = [
  // ─── Earth / LEO (the tightest corridor in the system) ───────────────
  { id: 'earth_leo',            from: 'earth_surface', to: 'leo',            deltaV: 9400,  travelDays: 0.02, category: 'orbital',       narrative: 'The only way up. Every cargo, every crew, every resource ultimately passes through this lane.' },
  { id: 'leo_geo',              from: 'leo',           to: 'geo',            deltaV: 3800,  travelDays: 0.2,  category: 'orbital',       narrative: 'Geostationary transfer. Telecom satellites, relay networks, observation platforms.' },

  // ─── Cislunar ────────────────────────────────────────────────────────
  { id: 'leo_lunar_orbit',      from: 'leo',           to: 'lunar_orbit',    deltaV: 4000,  travelDays: 5,    category: 'cislunar',      narrative: 'The cislunar bridge. Controlled by whoever dominates the Gateway stations.' },
  { id: 'lunar_orbit_surface',  from: 'lunar_orbit',   to: 'lunar_surface',  deltaV: 1870,  travelDays: 1,    category: 'cislunar' },

  // ─── Inner-system planetary ─────────────────────────────────────────
  { id: 'leo_mars_orbit',       from: 'leo',           to: 'mars_orbit',     deltaV: 5700,  travelDays: 240,  category: 'interplanetary', narrative: 'Hohmann window every 26 months. Miss the window, wait 2 years.' },
  { id: 'mars_orbit_surface',   from: 'mars_orbit',    to: 'mars_surface',   deltaV: 3800,  travelDays: 1,    category: 'interplanetary' },
  { id: 'leo_mercury',          from: 'leo',           to: 'mercury_surface', deltaV: 13000, travelDays: 180, category: 'interplanetary', narrative: 'Punishing delta-v. Metals reward those who pay the fuel bill.' },
  { id: 'leo_venus',            from: 'leo',           to: 'venus_orbit',    deltaV: 7500,  travelDays: 150,  category: 'interplanetary', narrative: 'Cloud cities. Sulfuric acid, atmospheric research.' },

  // ─── Asteroid Belt ───────────────────────────────────────────────────
  { id: 'leo_belt',             from: 'leo',           to: 'asteroid_belt',  deltaV: 9000,  travelDays: 540,  category: 'interplanetary', narrative: 'The long haul. Psyche-16 rush traffic. Major chokepoint for outer-system transits.' },
  { id: 'belt_ceres',           from: 'asteroid_belt', to: 'ceres_surface',  deltaV: 400,   travelDays: 3,    category: 'interplanetary', narrative: 'The Ceres hub. Logistics capital of the belt.' },

  // ─── Outer system ────────────────────────────────────────────────────
  { id: 'belt_jupiter',         from: 'asteroid_belt', to: 'jupiter_system', deltaV: 5000,  travelDays: 720,  category: 'outer',         narrative: 'Jovian approach. Radiation shielding required.' },
  { id: 'jupiter_europa',       from: 'jupiter_system', to: 'europa_surface', deltaV: 2050, travelDays: 7,    category: 'outer' },
  { id: 'jupiter_ganymede',     from: 'jupiter_system', to: 'ganymede_surface', deltaV: 2020, travelDays: 7,  category: 'outer' },
  { id: 'jupiter_callisto',     from: 'jupiter_system', to: 'callisto_surface', deltaV: 1870, travelDays: 7,  category: 'outer' },
  { id: 'jupiter_io',           from: 'jupiter_system', to: 'io_surface',    deltaV: 1750,  travelDays: 7,    category: 'outer',         narrative: 'Volcanic hell. Extreme radiation. Sulfur for those brave enough.' },

  // ─── Saturn ──────────────────────────────────────────────────────────
  { id: 'jupiter_saturn',       from: 'jupiter_system', to: 'saturn_system', deltaV: 4000,  travelDays: 900,  category: 'outer' },
  { id: 'saturn_titan',         from: 'saturn_system', to: 'titan_surface', deltaV: 1870,  travelDays: 3,    category: 'outer',         narrative: 'Methane lakes. The only body beyond Earth with a thick atmosphere.' },
  { id: 'saturn_enceladus',     from: 'saturn_system', to: 'enceladus_surface', deltaV: 1420, travelDays: 3, category: 'outer' },

  // ─── Deep ────────────────────────────────────────────────────────────
  { id: 'saturn_outer',         from: 'saturn_system', to: 'outer_system',   deltaV: 6000,  travelDays: 1800, category: 'deep',          narrative: 'Beyond the ring gate. Only the most committed corporations operate out here.' },
  { id: 'outer_triton',         from: 'outer_system',  to: 'triton_surface', deltaV: 2000,  travelDays: 14,   category: 'deep' },
  { id: 'outer_titania',        from: 'outer_system',  to: 'titania_surface', deltaV: 2000, travelDays: 14,   category: 'deep' },
  { id: 'outer_pluto',          from: 'outer_system',  to: 'pluto_surface',  deltaV: 2000,  travelDays: 14,   category: 'deep' },
];

export const LANE_MAP = new Map(LANES.map(l => [l.id, l]));

// ─── Chokepoint analysis ─────────────────────────────────────────────────────
// A location is a chokepoint if many lanes terminate at or transit through it.
// LEO is the ultimate chokepoint — essentially all routes pass through it.

export interface Chokepoint {
  locationId: string;
  laneCount: number;   // number of distinct lanes touching this location
  laneIds: string[];
  severity: 'critical' | 'major' | 'minor';
}

/** Compute chokepoint rankings for all solar-system locations. */
export function computeChokepoints(): Chokepoint[] {
  const counts = new Map<string, string[]>();
  for (const lane of LANES) {
    counts.set(lane.from, [...(counts.get(lane.from) || []), lane.id]);
    counts.set(lane.to,   [...(counts.get(lane.to)   || []), lane.id]);
  }
  const result: Chokepoint[] = [];
  counts.forEach((laneIds, locationId) => {
    const laneCount = laneIds.length;
    const severity: Chokepoint['severity'] =
      laneCount >= 6 ? 'critical' : laneCount >= 3 ? 'major' : 'minor';
    result.push({ locationId, laneCount, laneIds, severity });
  });
  return result.sort((a, b) => b.laneCount - a.laneCount);
}

// ─── Orbital Slot Inventory ──────────────────────────────────────────────────
// Finite slots at premium orbits. Ownership transfers at market-clearing prices
// once player-to-player orbital slot markets exist; for now this shows scarcity.

export interface OrbitalSlotPool {
  locationId: string;
  totalSlots: number;
  label: string;
  description: string;
}

export const ORBITAL_SLOT_POOLS: OrbitalSlotPool[] = [
  {
    locationId: 'geo',
    totalSlots: 180,
    label: 'GEO Slots',
    description: 'The geostationary belt can sustain ~180 stable orbital slots (one per 2°). Premium real estate for telecom and Earth observation.',
  },
  {
    locationId: 'lunar_orbit',
    totalSlots: 24,
    label: 'Lunar Polar / Halo Orbits',
    description: 'Stable lunar orbits are scarcer than one might expect. The Gateway corridor holds ~24 productive slots.',
  },
  {
    locationId: 'mars_orbit',
    totalSlots: 60,
    label: 'Mars Areosynchronous',
    description: 'Areosynchronous orbit hosts ~60 stable slots. Critical for Mars colony communications and weather.',
  },
  {
    locationId: 'jupiter_system',
    totalSlots: 40,
    label: 'Jovian Stable Orbits',
    description: 'Radiation-shielded Jovian orbits with stable dynamics. ~40 usable slots.',
  },
];

export const ORBITAL_SLOT_MAP = new Map(ORBITAL_SLOT_POOLS.map(p => [p.locationId, p]));

// ─── Player-perspective computations ─────────────────────────────────────────

/** Count player buildings at a given location (proxy for slot occupancy). */
export function countPlayerBuildingsAt(state: GameState, locationId: string): number {
  return state.buildings.filter(b => b.isComplete && b.locationId === locationId).length;
}

export interface LaneTraffic {
  laneId: string;
  lane: ShippingLane;
  playerShips: number;      // player's ships currently on or using this lane
  inTransit: number;        // subset that are actually in flight
  bothLocationsUnlocked: boolean;
}

/** Compute player-perspective lane traffic from GameState.ships. */
export function computeLaneTraffic(state: GameState): LaneTraffic[] {
  const ships = state.ships || [];
  const unlocked = new Set(state.unlockedLocations);

  return LANES.map(lane => {
    const inTransit = ships.filter(s =>
      s.isBuilt && s.status === 'in_transit' &&
      s.route &&
      ((s.route.from === lane.from && s.route.to === lane.to) ||
       (s.route.from === lane.to && s.route.to === lane.from))
    ).length;

    const playerShips = ships.filter(s =>
      s.isBuilt && (s.currentLocation === lane.from || s.currentLocation === lane.to)
    ).length;

    return {
      laneId: lane.id,
      lane,
      playerShips,
      inTransit,
      bothLocationsUnlocked: unlocked.has(lane.from) && unlocked.has(lane.to),
    };
  });
}

export interface OrbitalSlotReport {
  pool: OrbitalSlotPool;
  playerOccupied: number;         // from state.buildings
  playerOccupancyPct: number;     // 0-100
  overallOccupancyBucket: 'low' | 'medium' | 'high' | 'saturated';
}

/** Orbital-slot occupancy snapshot for all pools. Uses player-side data for
 *  player occupancy; the overall occupancy bucket is a placeholder bucketed
 *  reading — the real source of truth will come from a server-aggregated
 *  count once the slot-market system is built. */
export function computeOrbitalSlotReport(state: GameState): OrbitalSlotReport[] {
  return ORBITAL_SLOT_POOLS.map(pool => {
    const playerOccupied = countPlayerBuildingsAt(state, pool.locationId);
    const playerOccupancyPct = Math.min(100, (playerOccupied / pool.totalSlots) * 100);
    // TODO: replace with server-aggregated count when the slot-market system is live
    return {
      pool,
      playerOccupied,
      playerOccupancyPct,
      overallOccupancyBucket: 'low' as const,
    };
  });
}

// ─── Category helpers ────────────────────────────────────────────────────────

export const CATEGORY_LABEL: Record<ShippingLane['category'], string> = {
  orbital: 'Orbital',
  cislunar: 'Cislunar',
  interplanetary: 'Interplanetary',
  outer: 'Outer System',
  deep: 'Deep Space',
};

export const CATEGORY_ACCENT: Record<ShippingLane['category'], { text: string; border: string; bg: string }> = {
  orbital:        { text: 'text-cyan-300',   border: 'border-cyan-500/30',   bg: 'bg-cyan-500/5' },
  cislunar:       { text: 'text-sky-300',    border: 'border-sky-500/30',    bg: 'bg-sky-500/5' },
  interplanetary: { text: 'text-amber-300',  border: 'border-amber-500/30',  bg: 'bg-amber-500/5' },
  outer:          { text: 'text-purple-300', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
  deep:           { text: 'text-slate-300',  border: 'border-slate-500/30',  bg: 'bg-slate-500/5' },
};

/** Human-readable location name with fallback. */
export function locationName(locationId: string): string {
  return LOCATION_MAP.get(locationId)?.name || locationId;
}
