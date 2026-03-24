// ─── Space Tycoon: Shipyard Construction Slots ──────────────────────────────
// Players start with 1 active ship construction slot.
// Additional slots unlocked via research and buildings.

import type { GameState } from './types';

/** Base number of ships that can be under construction simultaneously */
export const BASE_SHIPYARD_SLOTS = 1;
/** Maximum possible shipyard slots */
export const MAX_SHIPYARD_SLOTS = 4;

interface ShipyardSlotBonus {
  source: string;      // Research ID or building ID that grants this
  type: 'research' | 'building' | 'prestige';
  label: string;
  slots: number;
}

/** All possible shipyard slot bonuses */
const SHIPYARD_SLOT_BONUSES: ShipyardSlotBonus[] = [
  {
    source: 'modular_spacecraft',
    type: 'research',
    label: 'Modular Spacecraft research',
    slots: 1,  // 1 → 2 slots
  },
  {
    source: 'space_dock',
    type: 'research',
    label: 'Space Dock research',
    slots: 1,  // 2 → 3 slots
  },
  {
    source: 'automated_mining_fleet',
    type: 'research',
    label: 'Automated Mining Fleet research',
    slots: 1,  // 3 → 4 slots
  },
];

/**
 * Calculate total shipyard slots available to the player.
 * Base: 1 slot. Max: 4 slots.
 */
export function getShipyardSlots(state: GameState): number {
  let slots = BASE_SHIPYARD_SLOTS;

  for (const bonus of SHIPYARD_SLOT_BONUSES) {
    if (bonus.type === 'research' && state.completedResearch.includes(bonus.source)) {
      slots += bonus.slots;
    }
  }

  // Prestige bonus: +1 slot at prestige level 3+
  if (state.prestige && state.prestige.level >= 3) {
    slots += 1;
  }

  return Math.min(slots, MAX_SHIPYARD_SLOTS);
}

/**
 * Get the number of ships currently under construction.
 */
export function getActiveShipBuilds(state: GameState): number {
  return (state.ships || []).filter(s => !s.isBuilt).length;
}

/**
 * Check if the player can start building a new ship.
 */
export function canBuildShip(state: GameState): boolean {
  return getActiveShipBuilds(state) < getShipyardSlots(state);
}

/**
 * Get a breakdown of shipyard slot bonuses for display.
 */
export function getShipyardBreakdown(state: GameState): { label: string; active: boolean }[] {
  const breakdown: { label: string; active: boolean }[] = [
    { label: `Base shipyard: ${BASE_SHIPYARD_SLOTS} slot`, active: true },
  ];

  for (const bonus of SHIPYARD_SLOT_BONUSES) {
    const active = bonus.type === 'research' && state.completedResearch.includes(bonus.source);
    breakdown.push({
      label: `+${bonus.slots} from ${bonus.label}`,
      active,
    });
  }

  if (state.prestige && state.prestige.level >= 3) {
    breakdown.push({ label: '+1 from Prestige Level 3', active: true });
  } else {
    breakdown.push({ label: '+1 from Prestige Level 3', active: false });
  }

  return breakdown;
}
