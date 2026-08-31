// ─── Space Tycoon: Building Capabilities ────────────────────────────────────
// Construction Purposes wave (docs/CONSTRUCTION_PURPOSES_2026-08.md).
// Founder directive: "let's come up with uses and purposes for various
// constructions in our game beyond just revenue/income."
//
// Design contract:
//   - Capabilities live on BuildingDefinition (types.ts BuildingCapabilities)
//     — pure content data, nothing persisted in saves (no save-version bump).
//   - Every capability is a REAL modifier into an EXISTING formula (hazard
//     mitigation, inventory shocks, freight fuel, espionage detection,
//     program durations, away efficiency, expedition transit damage, faction
//     rep gains, research speed, crew capacity, shipyard slots). No parallel
//     mechanics.
//   - Only COMPLETED, OPERATIONAL buildings count (mothballed / reactivating /
//     decommissioning copies contribute nothing — same isBuildingOperational
//     predicate the revenue path uses, so a mothballed station loses its
//     shielding umbrella along with its income).
//   - Stacking copies is additive but CAPPED per capability (CAPABILITY_CAPS)
//     — bounded returns, per BALANCE.md's stacking-cap discipline and
//     CLAUDE.md's "real risk" pillar (hazardShielding can never stack past
//     0.12; hazards.ts MITIGATION_CAP 0.90 still binds on top).
//   - Deterministic: pure reads of state.buildings. Away-parity comes free —
//     every consumer either runs on the shared catch-up path (hazards,
//     expeditions, away efficiency) or is a user action (freight dispatch,
//     program enqueue, envoy).

import type { GameState, BuildingCapabilities } from './types';
import { BUILDING_MAP } from './buildings';
import { isBuildingOperational } from './mothball';

export type CapabilityKey = keyof BuildingCapabilities;

/** Central caps for summed fractional capabilities. Integer capabilities
 *  (crewQuarters, shipyardSlots) are bounded by their consumers instead
 *  (crew capacity is naturally small; MAX_SHIPYARD_SLOTS = 8). */
export const CAPABILITY_CAPS: Record<Exclude<CapabilityKey, 'crewQuarters' | 'shipyardSlots'>, number> = {
  hazardShielding: 0.12,     // location total — risk pillar stays real
  inventoryProtection: 0.40, // location total — shocks still hurt
  logisticsSupport: 0.15,    // origin+destination combined — mirrors LANE_BONUS_CAP
  detectionBonus: 0.10,      // on top of security-level detection, total ≤ 0.95
  trainingSpeed: 0.25,       // LS6 durations never collapse below 75%
  awayAutomation: 0.08,      // AWAY_EFFICIENCY_INVESTMENT_CAP still binds above
  expeditionSupport: 0.15,   // transit hazards stay lethal when unshielded
  diplomacy: 0.25,           // envoys/contracts still do the heavy lifting
  researchSpeed: 0.20,       // raised 0.10→0.20 for the dedicated research-facility family (2026-08-31, Jay) — still one modest term in a 2.0-capped multiplier stack
};

type MinimalBuilding = { definitionId: string; isComplete: boolean; locationId?: string; status?: string };

function contributes(b: MinimalBuilding): boolean {
  return b.isComplete && isBuildingOperational(b as Parameters<typeof isBuildingOperational>[0]);
}

function capabilityOf(definitionId: string, key: CapabilityKey): number {
  const def = BUILDING_MAP.get(definitionId);
  const v = def?.capabilities?.[key];
  return typeof v === 'number' && v > 0 ? v : 0;
}

/** Sum a fractional capability over a building list, applying the central cap. */
function sumCapped(buildings: MinimalBuilding[], key: Exclude<CapabilityKey, 'crewQuarters' | 'shipyardSlots'>): number {
  let total = 0;
  for (const b of buildings) {
    if (!contributes(b)) continue;
    total += capabilityOf(b.definitionId, key);
  }
  return Math.min(CAPABILITY_CAPS[key], total);
}

/** LOCATION-scoped capability total (hazardShielding / inventoryProtection /
 *  logisticsSupport) from completed, operational buildings AT that location. */
export function getLocationCapabilityBonus(
  state: Pick<GameState, 'buildings'>,
  locationId: string,
  key: 'hazardShielding' | 'inventoryProtection' | 'logisticsSupport',
): number {
  const at = (state.buildings || []).filter(b => b.locationId === locationId);
  return sumCapped(at, key);
}

/** GLOBAL fractional capability total from all completed, operational buildings. */
export function getGlobalCapabilityBonus(
  state: Pick<GameState, 'buildings'>,
  key: 'detectionBonus' | 'trainingSpeed' | 'awayAutomation' | 'expeditionSupport' | 'diplomacy' | 'researchSpeed',
): number {
  return sumCapped(state.buildings || [], key);
}

/** GLOBAL integer crew-capacity bonus (habitats/stations house crew).
 *  Additive per copy; consumed by workforce.getCrewCapacity. */
export function getCapabilityCrewQuarters(state: Pick<GameState, 'buildings'>): number {
  let total = 0;
  for (const b of state.buildings || []) {
    if (!contributes(b)) continue;
    total += Math.max(0, Math.floor(capabilityOf(b.definitionId, 'crewQuarters')));
  }
  return total;
}

/** GLOBAL shipyard-slot bonus — counted ONCE per definition id (a second
 *  Heavy Launch Pad doesn't add a second slot; MAX_SHIPYARD_SLOTS binds in
 *  shipyard-slots.ts). Returns the granting definition ids for UI breakdown. */
export function getCapabilityShipyardSlots(state: Pick<GameState, 'buildings'>): { slots: number; sources: string[] } {
  const seen = new Set<string>();
  let slots = 0;
  const sources: string[] = [];
  for (const b of state.buildings || []) {
    if (!contributes(b) || seen.has(b.definitionId)) continue;
    const v = Math.max(0, Math.floor(capabilityOf(b.definitionId, 'shipyardSlots')));
    if (v > 0) {
      seen.add(b.definitionId);
      slots += v;
      sources.push(b.definitionId);
    }
  }
  return { slots, sources };
}

/** Server-safe detection bonus from a raw buildingsData list (espionage
 *  execute route stores buildings as JSON — parse defensively; entries
 *  missing isComplete are ignored). Same cap as getGlobalCapabilityBonus. */
export function getDetectionBonusFromBuildingList(buildingsData: unknown[]): number {
  let total = 0;
  for (const raw of buildingsData || []) {
    const b = raw as { definitionId?: unknown; isComplete?: unknown; status?: unknown };
    if (typeof b?.definitionId !== 'string' || b.isComplete !== true) continue;
    if (typeof b.status === 'string' && b.status !== 'active') continue;
    total += capabilityOf(b.definitionId, 'detectionBonus');
  }
  return Math.min(CAPABILITY_CAPS.detectionBonus, total);
}

// ─── UI metadata (purpose chips on build cards) ─────────────────────────────

export interface CapabilityChip {
  key: CapabilityKey;
  label: string;
  /** icons.ts IconName — kept as string here to avoid a UI import in lib. */
  icon: string;
  /** Short mechanic explanation for the HoloTip body. */
  describe: (value: number) => string;
  /** Which formula consumes it (HoloTip source caption). */
  source: string;
}

export const CAPABILITY_CHIPS: Record<CapabilityKey, Omit<CapabilityChip, 'key'>> = {
  hazardShielding: {
    label: 'Hazard shield',
    icon: 'shield',
    describe: v => `Absorbs +${Math.round(v * 100)}% hazard damage for EVERY asset at this location (yours included). Stacks with shielding, security crew, and insurance — capped so risk stays real.`,
    source: 'hazards.ts mitigation · location cap 12%',
  },
  inventoryProtection: {
    label: 'Hardened storage',
    icon: 'package',
    describe: v => `Cuts inventory losses from solar storms and pirate raids at this location by ${Math.round(v * 100)}%. Warehousing buffers supply shocks.`,
    source: 'hazards.ts inventory shocks · location cap 40%',
  },
  logisticsSupport: {
    label: 'Logistics hub',
    icon: 'fleet',
    describe: v => `Freight departing or arriving here burns ${Math.round(v * 100)}% less fuel. Propellant infrastructure makes the route cheaper.`,
    source: 'cargo-logistics.ts fuel bill · combined cap 15%',
  },
  detectionBonus: {
    label: 'Sensor net',
    icon: 'espionage',
    describe: v => `+${Math.round(v * 100)}% chance rival espionage against you is detected. Tracking networks see incoming operations.`,
    source: 'espionage detection roll · cap 10%',
  },
  trainingSpeed: {
    label: 'Training annex',
    icon: 'workforce',
    describe: v => `Crew and leader training programs run ${Math.round(v * 100)}% faster. Applies when a program is queued.`,
    source: 'programs.ts durations · cap 25%',
  },
  awayAutomation: {
    label: 'Autonomous ops',
    icon: 'clock',
    describe: v => `+${Math.round(v * 100)}% away-operations efficiency while you're logged off. Relays and ops centers keep the lights on.`,
    source: 'away-operations.ts efficiency curve · cap 8%',
  },
  expeditionSupport: {
    label: 'Deep-space support',
    icon: 'interstellar',
    describe: v => `Interstellar expeditions take ${Math.round(v * 100)}% less transit hazard damage. Sensor and relay coverage guides them through.`,
    source: 'expeditions.ts transit damage · cap 15%',
  },
  diplomacy: {
    label: 'Diplomatic post',
    icon: 'handshake',
    describe: v => `Positive faction reputation gains amplified by ${Math.round(v * 100)}%. Stations host envoys and summits.`,
    source: 'factions.ts shiftReputation · cap 25%',
  },
  researchSpeed: {
    label: 'Compute cluster',
    icon: 'research',
    describe: v => `+${Math.round(v * 100)}% research speed. Orbital compute runs the simulations your labs need.`,
    source: 'game-engine research queues · cap 10%',
  },
  crewQuarters: {
    label: 'Crew housing',
    icon: 'city',
    describe: v => `+${Math.round(v)} crew capacity. Habitats let you hire beyond bare infrastructure.`,
    source: 'workforce.ts crew capacity',
  },
  shipyardSlots: {
    label: 'Shipyard',
    icon: 'build',
    describe: v => `+${Math.round(v)} concurrent ship construction slot${v >= 2 ? 's' : ''} (once per building type; fleet cap 8).`,
    source: 'shipyard-slots.ts',
  },
};

/** One-line qualitative summary for the build-card live projection ("beyond
 *  the P&L, this also provides…"). Null when the def has no capabilities. */
export function summarizeCapabilities(definitionId: string): string | null {
  const chips = getCapabilityChipsForDefinition(definitionId);
  if (chips.length === 0) return null;
  const parts = chips.map(c => {
    if (c.key === 'crewQuarters') return `+${Math.round(c.value)} crew capacity`;
    if (c.key === 'shipyardSlots') return `+${Math.round(c.value)} shipyard slot`;
    return `${c.label.toLowerCase()} +${Math.round(c.value * 100)}%`;
  });
  return parts.join(' · ');
}

/** Ordered chip list for a definition's build card — empty when it has none. */
export function getCapabilityChipsForDefinition(definitionId: string): (CapabilityChip & { value: number })[] {
  const def = BUILDING_MAP.get(definitionId);
  if (!def?.capabilities) return [];
  const out: (CapabilityChip & { value: number })[] = [];
  for (const [key, value] of Object.entries(def.capabilities) as [CapabilityKey, number][]) {
    if (!value || value <= 0) continue;
    const meta = CAPABILITY_CHIPS[key];
    if (!meta) continue;
    out.push({ key, value, ...meta });
  }
  return out;
}
