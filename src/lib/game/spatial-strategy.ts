// ─── Space Tycoon: Spatial Strategy ─────────────────────────────────────────
// Shipping lanes, chokepoint analysis, and finite orbital slot inventory.
// Realizes the "Spatial strategy — geography matters" principle in CLAUDE.md.

import type { GameState, BuildingInstance } from './types';
import { LOCATION_MAP } from './solar-system';
import { isInFrontier } from './frontier';

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
    // Early-fab wave (2026-08-31): LEO joins the slot system. More slots
    // than GEO (many usable shells) but it is where EVERY corporation's
    // early satellites, fab labs and datacenters go — congestion is the
    // designed early-game pressure that pushes industry outward.
    locationId: 'leo',
    totalSlots: 240,
    label: 'LEO Shells',
    description: 'Debris-managed low-Earth shells hold ~240 coordinated slots. Cheap to reach and everyone starts here — the first orbit to congest.',
  },
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

/** Balance Pass 4 (docs/BALANCE.md "Pass 4"): does this building instance
 *  occupy an orbital slot? Completed AND operationally present — a
 *  mothballed or decommissioning building has powered down its station-
 *  keeping and releases its slot (it is never retro-blocked from
 *  reactivating: the gate below only guards NEW builds). Shared by the
 *  client-side occupancy report AND the server occupancy cron
 *  (orbital-slots/resolve) so both count identically. */
export function isSlotOccupant(b: Pick<BuildingInstance, 'isComplete' | 'status'>): boolean {
  if (!b.isComplete) return false;
  return b.status !== 'mothballed' && b.status !== 'decommissioning';
}

/** Count player buildings at a given location (proxy for slot occupancy).
 *  Pass 4: mothballed/decommissioning buildings no longer count — they free
 *  their slot (matching the server aggregation in orbital-slots/resolve). */
export function countPlayerBuildingsAt(state: GameState, locationId: string): number {
  return state.buildings.filter(b => isSlotOccupant(b) && b.locationId === locationId).length;
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
  /** True once the server-aggregated pool crosses SATURATED_OCCUPANCY_PCT —
   *  new builds at this location require winning an OrbitalSlotAuction
   *  (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 5). */
  requiresLeaseAuction: boolean;
}

/** Server-aggregated occupancy snapshot, one entry per ORBITAL_SLOT_POOLS
 *  locationId. Delivered via sync/route.ts's marketSnapshot (populated from
 *  the OrbitalSlotOccupancy cache table, mirroring the demand-pools pipe) —
 *  this is what finally makes computeOrbitalSlotReport server-aggregated
 *  instead of a hardcoded 'low' TODO. */
export interface OrbitalSlotOccupancySnapshot {
  occupiedCount: number;
  // Widened to `string` (not the narrower bucket union) because this is
  // server-delivered data crossing the GameState boundary (types.ts can't
  // import this module's narrower type without a circular import — same
  // trade-off MarketSnapshot-adjacent fields make elsewhere). Validated
  // against the known buckets at the one read site below.
  bucket: string;
}

/** Occupancy % at/above which a pool is ABSOLUTELY saturated (canon:
 *  "orbital slots are finite… ownership transfers at market-clearing
 *  prices", §5 item 5: "when a pool crosses 85%"). Since D6 (docs/BALANCE.md
 *  "D6 population gates (2026-09-02)") this is no longer the only auction
 *  trigger: orbital-slot-auctions.computeSlotAuctionEligibility also
 *  contests the most-occupied pool on RELATIVE grounds (≥8 occupied and
 *  ≥ max(40%, P80 across pools)). The resolve cron writes bucket
 *  'saturated' for either case, so the build gate below and every UI
 *  consumer key off the stored bucket, not this constant. This constant
 *  still drives the physical congestion buckets (occupancyBucket) and the
 *  maintenance multiplier, which are about crowding, not contestedness. */
export const SATURATED_OCCUPANCY_PCT = 85;

export function occupancyBucket(occupiedCount: number, totalSlots: number): OrbitalSlotOccupancySnapshot['bucket'] {
  const pct = totalSlots > 0 ? (occupiedCount / totalSlots) * 100 : 0;
  if (pct >= SATURATED_OCCUPANCY_PCT) return 'saturated';
  if (pct >= 60) return 'high';
  if (pct >= 25) return 'medium';
  return 'low';
}

/** Early-fab wave (2026-08-31): CONTINUOUS congestion pricing on top of the
 *  binary 85% lease gate. A crowded orbit costs more to operate in every
 *  month — collision-avoidance burns, conjunction screening, debris
 *  insurance — long before it saturates. Driven by the server-aggregated
 *  occupancy COUNT (all players + NPCs, same snapshot the slot gate uses),
 *  re-bucketed here by physical occupancy %; never-synced saves fall back
 *  to 1.0, identical to pre-wave behavior. Applied to building maintenance
 *  at slot-pool locations only.
 *
 *  D6 (docs/BALANCE.md "D6 population gates"): the stored bucket now also
 *  reads 'saturated' for a pool contested on RELATIVE grounds (≥40% of a
 *  pool at small population), so this multiplier deliberately re-derives
 *  the physical bucket from the count instead of trusting the stored
 *  label — a lease-gated 40%-full pool pays 'medium' congestion (1.1×),
 *  not the 85% crowding rate (1.5×). No maintenance number changed for any
 *  occupancy level. Falls back to the stored bucket only when the count is
 *  missing (a pre-D6 snapshot shape). */
export function getCongestionMaintenanceMultiplier(state: GameState, locationId: string): number {
  const pool = ORBITAL_SLOT_MAP.get(locationId);
  if (!pool) return 1;
  const row = state.orbitalSlotOccupancy?.[locationId];
  if (!row) return 1;
  const bucket = typeof row.occupiedCount === 'number' && Number.isFinite(row.occupiedCount)
    ? occupancyBucket(row.occupiedCount, pool.totalSlots)
    : row.bucket;
  if (bucket === 'saturated') return 1.5;
  if (bucket === 'high') return 1.25;
  if (bucket === 'medium') return 1.1;
  return 1;
}

/** Orbital-slot occupancy snapshot for all pools. `serverOccupancy` (from the
 *  sync snapshot's OrbitalSlotOccupancy cache) supplies the REAL
 *  server-aggregated bucket across every player; omitted (offline/solo/
 *  never-synced) falls back to 'low' — the pre-E7 behavior — so no existing
 *  caller or save breaks. Player-side occupied-count stays client-derived
 *  (it only needs to reflect the requesting player's own buildings). */
export function computeOrbitalSlotReport(
  state: GameState,
  serverOccupancy?: Record<string, OrbitalSlotOccupancySnapshot>,
): OrbitalSlotReport[] {
  return ORBITAL_SLOT_POOLS.map(pool => {
    const playerOccupied = countPlayerBuildingsAt(state, pool.locationId);
    const playerOccupancyPct = Math.min(100, (playerOccupied / pool.totalSlots) * 100);
    const server = serverOccupancy?.[pool.locationId];
    const validBuckets: OrbitalSlotReport['overallOccupancyBucket'][] = ['low', 'medium', 'high', 'saturated'];
    const overallOccupancyBucket: OrbitalSlotReport['overallOccupancyBucket'] =
      server && validBuckets.includes(server.bucket as OrbitalSlotReport['overallOccupancyBucket'])
        ? (server.bucket as OrbitalSlotReport['overallOccupancyBucket'])
        : 'low';
    return {
      pool,
      playerOccupied,
      playerOccupancyPct,
      overallOccupancyBucket,
      requiresLeaseAuction: overallOccupancyBucket === 'saturated',
    };
  });
}

// ─── Balance Pass 4: slot-gate ENFORCEMENT (docs/BALANCE.md "Pass 4") ────────
// Pass 3 re-confirmed `requiresLeaseAuction` was display-only: the build path
// never checked it, so "orbital slots are finite" was UI fiction at
// saturation and O5's slot-lease denial denied nothing. This is the missing
// build-path check, enforced at every build entrance (page.tsx handleBuild,
// command-queue.ts attemptBuildStart, BuildPanel's build cards).
//
// Deterministic-offline honesty: the check reads ONLY sync-delivered
// snapshots already on the save (orbitalSlotOccupancy + orbitalSlotLeases) —
// never a live network call. A save that has never synced has no occupancy
// snapshot and the gate stays OPEN (identical to pre-Pass-4 behavior, and a
// solo/offline player can't be contending for slots anyway). Residual gap:
// between syncs the snapshot can lag the true pool state by up to the sync
// interval, and one active lease at a location permits builds there for its
// whole term (the client can't attribute a specific building to a specific
// lease row) — both documented in BALANCE.md Pass 4.

export interface OrbitalSlotGateCheck {
  allowed: boolean;
  /** Why the build is blocked (present iff !allowed) — surfaced verbatim on
   *  the build card. */
  reason?: string;
  /** The gate was passed via an active slot lease at this location. */
  viaLease?: boolean;
  /** The gate was passed via the Frontier first-building exemption. */
  viaFrontierExemption?: boolean;
}

/** True when the player holds an unexpired slot lease at `locationId`
 *  (sync-delivered orbitalSlotLeases snapshot). */
export function hasActiveSlotLease(state: GameState, locationId: string, now: number = Date.now()): boolean {
  return (state.orbitalSlotLeases || []).some(l => l.locationId === locationId && l.expiresAtMs > now);
}

/**
 * May this player start a NEW building at `locationId` right now?
 * - Non-pool locations (surfaces, LEO, belt…): always allowed.
 * - Pool not contested (or no occupancy snapshot yet): allowed.
 * - Contested pool (stored bucket 'saturated' — absolute 85% saturation OR
 *   the D6 relative rule, decided by the resolve cron via
 *   orbital-slot-auctions.computeSlotAuctionEligibility): allowed only with
 *   an active slot lease there — EXCEPT a Protected-Frontier player's FIRST
 *   building at the location, which is always allowed (Pass 3 requirement:
 *   without this, the newcomer wall returns at a contested GEO).
 * Existing buildings are never retro-blocked — this guards build STARTS only.
 */
export function checkOrbitalSlotGate(
  state: GameState,
  locationId: string,
  now: number = Date.now(),
): OrbitalSlotGateCheck {
  const pool = ORBITAL_SLOT_MAP.get(locationId);
  if (!pool) return { allowed: true };

  const server = state.orbitalSlotOccupancy?.[locationId];
  if (!server || server.bucket !== 'saturated') return { allowed: true };

  if (hasActiveSlotLease(state, locationId, now)) return { allowed: true, viaLease: true };

  // Frontier first-building exemption: count EVERY building the player has
  // at the location (including under-construction and mothballed) so the
  // exemption can't be chained into multiple queued builds.
  if (isInFrontier(state, now) && !state.buildings.some(b => b.locationId === locationId)) {
    return { allowed: true, viaFrontierExemption: true };
  }

  return {
    allowed: false,
    reason: `${pool.label} contested (${server.occupiedCount}/${pool.totalSlots} slots) — win a slot-lease auction to build here (Map → Spatial Strategy → Orbital Slots).`,
  };
}

// ─── Chokepoint premiums ─────────────────────────────────────────────────────
// §5 item 5 / §E7: chokepoint locations (LEO, GEO, the belt approach…) carry
// a premium on slot-lease auction minimum bids AND on freight passing
// through them (cargo-logistics.ts) — scarcity has a price, not just a label.

/** Premium multiplier by chokepoint severity. 1.0 = not a chokepoint. */
export const CHOKEPOINT_PREMIUM: Record<Chokepoint['severity'], number> = {
  critical: 1.5,
  major: 1.25,
  minor: 1.0,
};

let _chokepointSeverityCache: Map<string, Chokepoint['severity']> | null = null;
function chokepointSeverityMap(): Map<string, Chokepoint['severity']> {
  if (!_chokepointSeverityCache) {
    _chokepointSeverityCache = new Map(computeChokepoints().map(c => [c.locationId, c.severity]));
  }
  return _chokepointSeverityCache;
}

/** Premium multiplier for a location — 1.5x at critical chokepoints (LEO),
 *  1.25x at major ones, 1.0x elsewhere. Used for both slot-auction minimum
 *  bids and freight tariff/toll pricing at that location. */
export function getChokepointPremium(locationId: string): number {
  const severity = chokepointSeverityMap().get(locationId);
  return severity ? CHOKEPOINT_PREMIUM[severity] : 1.0;
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
