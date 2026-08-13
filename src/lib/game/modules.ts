// ─── Space Tycoon: Module System v1 ──────────────────────────────────────────
// Per STATS_DESIGN.md Phase IV. Ships have moduleSlots + hardpointTypes
// (from Phase I). Modules are inventory items the player owns and fits into
// those slots. Each module applies stat deltas to the host ship.
//
// v1 scope: 10 pre-defined module types. Purchased with money at any
// fabrication_facility (simple shop) — full manufacturing chain from raw
// resources is deferred. Fitted modules live in state.fittedModules; owned
// but un-fitted modules live in state.moduleInventory.

import type { GameState } from './types';
import type { ShipHardpointType, ShipDerivedStats } from './ships';
import { SHIP_MAP, getShipDerivedStats } from './ships';
import { generateId } from './formulas';

export type ModuleRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ModuleEffect {
  /** Which ShipDerivedStats key to modify */
  stat: keyof ShipDerivedStats;
  /** Additive delta. For a multiplier stat (shieldingRating 0-1) keep small. */
  delta: number;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  icon: string;
  hardpointType: ShipHardpointType;
  rarity: ModuleRarity;
  tier: 1 | 2 | 3 | 4 | 5;
  baseCost: number;
  /** Role restrictions. If empty, compatible with all roles. */
  compatibleRoles?: string[];
  description: string;
  effects: ModuleEffect[];
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'mod_ext_cargo_bay', name: 'Extended Cargo Bay', icon: '📦',
    hardpointType: 'cargo', rarity: 'common', tier: 1, baseCost: 40_000_000,
    description: '+30% cargo capacity at the cost of some top speed.',
    effects: [
      { stat: 'moduleSlots', delta: 0 }, // placeholder so the effect map parses
    ],
  },
  {
    id: 'mod_ion_thruster', name: 'Ion Thruster Array', icon: '🚀',
    hardpointType: 'engine', rarity: 'uncommon', tier: 2, baseCost: 120_000_000,
    description: '+20% warp factor, slightly higher fuel burn.',
    effects: [
      { stat: 'warpFactor', delta: 0.2 },
      { stat: 'fuelBurnRate', delta: 0.5 },
    ],
  },
  {
    id: 'mod_quantum_sensor', name: 'Quantum Sensor Array', icon: '📡',
    hardpointType: 'sensor', rarity: 'rare', tier: 3, baseCost: 400_000_000,
    compatibleRoles: ['survey'],
    description: '+50% survey range, +25% survey accuracy (survey ships only).',
    effects: [
      { stat: 'surveyRange', delta: 2.0 },
      { stat: 'surveyAccuracy', delta: 0.25 },
    ],
  },
  {
    id: 'mod_whipple_shield', name: 'Whipple Shield Plating', icon: '🛡️',
    hardpointType: 'shield', rarity: 'uncommon', tier: 2, baseCost: 90_000_000,
    description: '+200 hull integrity against micrometeorite strikes.',
    effects: [
      { stat: 'hullIntegrity', delta: 200 },
      { stat: 'shieldingRating', delta: 0.05 },
    ],
  },
  {
    id: 'mod_stealth_coating', name: 'Stealth Coating', icon: '🕶️',
    hardpointType: 'utility', rarity: 'rare', tier: 3, baseCost: 280_000_000,
    description: '−40% stealth signature at higher insurance premium.',
    effects: [
      { stat: 'stealthSignature', delta: -0.4 },
      { stat: 'insurancePremium', delta: 50_000 },
    ],
  },
  {
    id: 'mod_mining_laser', name: 'Mining Laser Cluster', icon: '🎯',
    hardpointType: 'drone', rarity: 'uncommon', tier: 2, baseCost: 150_000_000,
    compatibleRoles: ['mining'],
    description: '+30% mining rate (mining ships only). Goes in a drone hardpoint.',
    effects: [
      // mining rate is on ShipDefinition not ShipDerivedStats, so this
      // module's effect is flagged here for the ship-mining-engine reader
      // to respect; UI indicates the effect separately.
      { stat: 'moduleSlots', delta: 0 },
    ],
  },
  {
    id: 'mod_life_support', name: 'Life Support Redundancy', icon: '🩺',
    hardpointType: 'utility', rarity: 'common', tier: 1, baseCost: 25_000_000,
    description: '+7 days of life support autonomy.',
    effects: [
      { stat: 'lifeSupportDays', delta: 7 },
    ],
  },
  {
    id: 'mod_navcomp_mk2', name: 'Navigation Computer Mk II', icon: '🧭',
    hardpointType: 'utility', rarity: 'uncommon', tier: 2, baseCost: 80_000_000,
    description: '+15% sublight speed, +1,500 m/s delta-v budget.',
    effects: [
      { stat: 'sublightSpeed', delta: 500 },
      { stat: 'deltaVBudget', delta: 1_500 },
    ],
  },
  {
    id: 'mod_point_defense', name: 'Point Defense Battery', icon: '⚡',
    hardpointType: 'drone', rarity: 'rare', tier: 3, baseCost: 350_000_000,
    description: '+0.20 point-defense — meaningful boost to pirate-raid mitigation.',
    effects: [
      { stat: 'pointDefenseRating', delta: 0.2 },
    ],
  },
  {
    id: 'mod_deep_tank', name: 'Deep Space Fuel Tank', icon: '⛽',
    hardpointType: 'cargo', rarity: 'uncommon', tier: 2, baseCost: 180_000_000,
    compatibleRoles: ['tanker', 'survey', 'transport'],
    description: '+2,000 fuel capacity for long-range operations.',
    effects: [
      { stat: 'fuelCapacity', delta: 2_000 },
    ],
  },
];

export const MODULE_MAP = new Map(MODULES.map(m => [m.id, m]));

// ─── Inventory & fitting state ────────────────────────────────────────────────

export interface OwnedModule {
  instanceId: string;
  definitionId: string;
  acquiredAtMs: number;
}

/** Returns the list of owned modules not currently fitted to any ship. */
export function getInventoryModules(state: GameState): OwnedModule[] {
  const all = state.moduleInventory || [];
  const fittedIds = new Set<string>();
  for (const fit of Object.values(state.fittedModules || {})) {
    (fit || []).forEach(id => fittedIds.add(id));
  }
  return all.filter(m => !fittedIds.has(m.instanceId));
}

/** Returns the modules currently fitted to a given ship. */
export function getFittedModulesForShip(state: GameState, shipInstanceId: string): OwnedModule[] {
  const ids = new Set((state.fittedModules || {})[shipInstanceId] || []);
  return (state.moduleInventory || []).filter(m => ids.has(m.instanceId));
}

/**
 * Compute effective ship stats: derived stats + stat deltas from fitted modules.
 * Clamps unrealistic values back into range.
 */
export function getEffectiveShipStats(state: GameState, shipInstanceId: string): ShipDerivedStats | null {
  const ship = (state.ships || []).find(s => s.instanceId === shipInstanceId);
  if (!ship) return null;
  const def = SHIP_MAP.get(ship.definitionId);
  if (!def) return null;

  const base = getShipDerivedStats(def);
  const fitted = getFittedModulesForShip(state, shipInstanceId);
  const out = { ...base };
  for (const m of fitted) {
    const mod = MODULE_MAP.get(m.definitionId);
    if (!mod) continue;
    for (const eff of mod.effects) {
      const current = out[eff.stat];
      if (typeof current === 'number') {
        (out[eff.stat] as number) = current + eff.delta;
      }
    }
  }
  // Clamp
  out.shieldingRating = Math.max(0, Math.min(0.9, out.shieldingRating));
  out.pointDefenseRating = Math.max(0, Math.min(1, out.pointDefenseRating));
  out.surveyAccuracy = Math.max(0, Math.min(1, out.surveyAccuracy));
  out.stealthSignature = Math.max(0.1, out.stealthSignature);
  return out;
}

// ─── Engine readers (audit Wave B — §1b "Modules") ───────────────────────────
// The audit found modules were a "fake shop": getEffectiveShipStats was
// called only by ModulesPanel for display while the engine read raw
// shipDef stats. These readers are what game-engine.ts now consumes.

/** The mining-laser module's rate bonus lives here (not in ShipDerivedStats —
 *  miningRate is on ShipDefinition; see the in-file note at the module def). */
export const MINING_LASER_MODULE_ID = 'mod_mining_laser';
export const MINING_LASER_RATE_BONUS = 0.30;

/**
 * Mining-rate multiplier from modules fitted to a ship (mining laser +30%
 * each, additive). Consumed by the ship-mining branch of processFullTick.
 */
export function getShipMiningRateMultiplier(state: GameState, shipInstanceId: string): number {
  let mult = 1;
  for (const m of getFittedModulesForShip(state, shipInstanceId)) {
    if (m.definitionId === MINING_LASER_MODULE_ID) mult += MINING_LASER_RATE_BONUS;
  }
  return mult;
}

/**
 * Transit-speed multiplier from fitted engine/nav modules, derived from the
 * ratio of effective vs base warpFactor / sublightSpeed (ion thrusters +20%
 * warp, navcomp +15% sublight). The engine divides remaining transit time by
 * this, so fitted ships arrive early even though dispatch ETAs were computed
 * from base stats. Clamped 1.0-1.6 (speed-ups only; audit Wave B keeps
 * effects conservative).
 */
export function getShipTransitSpeedMultiplier(state: GameState, shipInstanceId: string): number {
  const ship = (state.ships || []).find(s => s.instanceId === shipInstanceId);
  if (!ship) return 1;
  const def = SHIP_MAP.get(ship.definitionId);
  if (!def) return 1;
  const eff = getEffectiveShipStats(state, shipInstanceId);
  if (!eff) return 1;
  const base = getShipDerivedStats(def);
  const warpRatio = base.warpFactor > 0 ? eff.warpFactor / base.warpFactor : 1;
  const sublightRatio = base.sublightSpeed > 0 ? eff.sublightSpeed / base.sublightSpeed : 1;
  return Math.max(1, Math.min(1.6, Math.max(warpRatio, sublightRatio)));
}

// ─── Purchase & fitting actions ──────────────────────────────────────────────

export function purchaseModule(state: GameState, moduleId: string, now: number = Date.now()): GameState {
  const def = MODULE_MAP.get(moduleId);
  if (!def) return state;
  if (state.money < def.baseCost) return state;

  const owned: OwnedModule = {
    instanceId: generateId(),
    definitionId: moduleId,
    acquiredAtMs: now,
  };
  return {
    ...state,
    money: state.money - def.baseCost,
    totalSpent: state.totalSpent + def.baseCost,
    moduleInventory: [...(state.moduleInventory || []), owned],
  };
}

/** Fit a module to a ship if compatible + slot free. No-op otherwise. */
export function fitModule(state: GameState, shipInstanceId: string, moduleInstanceId: string): GameState {
  const ship = (state.ships || []).find(s => s.instanceId === shipInstanceId);
  if (!ship) return state;
  const def = SHIP_MAP.get(ship.definitionId);
  if (!def) return state;
  const stats = getShipDerivedStats(def);

  const ownedModule = (state.moduleInventory || []).find(m => m.instanceId === moduleInstanceId);
  if (!ownedModule) return state;
  const modDef = MODULE_MAP.get(ownedModule.definitionId);
  if (!modDef) return state;

  // Hardpoint compatibility
  if (!stats.hardpointTypes.includes(modDef.hardpointType)) return state;
  // Role compatibility (if specified)
  if (modDef.compatibleRoles && modDef.compatibleRoles.length > 0 && !modDef.compatibleRoles.includes(def.role)) {
    return state;
  }

  const existing = (state.fittedModules || {})[shipInstanceId] || [];
  if (existing.includes(moduleInstanceId)) return state;  // already fitted
  if (existing.length >= stats.moduleSlots) return state; // slots full

  return {
    ...state,
    fittedModules: {
      ...(state.fittedModules || {}),
      [shipInstanceId]: [...existing, moduleInstanceId],
    },
  };
}

export function unfitModule(state: GameState, shipInstanceId: string, moduleInstanceId: string): GameState {
  const existing = (state.fittedModules || {})[shipInstanceId] || [];
  if (!existing.includes(moduleInstanceId)) return state;
  return {
    ...state,
    fittedModules: {
      ...(state.fittedModules || {}),
      [shipInstanceId]: existing.filter(id => id !== moduleInstanceId),
    },
  };
}

export const RARITY_LABEL: Record<ModuleRarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};
