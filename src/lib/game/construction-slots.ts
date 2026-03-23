// ─── Space Tycoon: Construction Queue System ─────────────────────────────────
// Players start with 2 active construction slots.
// Additional slots unlocked via research, buildings, and upgrades.

import type { GameState } from './types';
import { BASE_CONSTRUCTION_SLOTS, MAX_CONSTRUCTION_SLOTS } from './constants';

interface SlotBonus {
  source: string;      // What grants this slot (research ID, building ID, etc.)
  type: 'research' | 'building' | 'prestige';
  label: string;       // Display name
  slots: number;       // How many extra slots this grants
}

/** All possible construction slot bonuses */
const SLOT_BONUSES: SlotBonus[] = [
  // Research unlocks
  {
    source: 'orbital_assembly',
    type: 'research',
    label: 'Orbital Assembly research',
    slots: 1,  // 2 → 3 slots
  },
  {
    source: 'space_dock',
    type: 'research',
    label: 'Space Dock research',
    slots: 1,  // 3 → 4 slots
  },
  {
    source: '3d_printing_space',
    type: 'research',
    label: '3D Printing in Space research',
    slots: 1,  // 4 → 5 slots
  },
];

/**
 * Calculate total construction slots available to the player.
 * Base: 2 slots. Max: 5 slots.
 */
export function getConstructionSlots(state: GameState): number {
  let slots = BASE_CONSTRUCTION_SLOTS;

  // Check research bonuses
  for (const bonus of SLOT_BONUSES) {
    if (bonus.type === 'research' && state.completedResearch.includes(bonus.source)) {
      slots += bonus.slots;
    }
  }

  // Prestige bonus: +1 slot at prestige level 2+
  if (state.prestige && state.prestige.level >= 2) {
    slots += 1;
  }

  return Math.min(slots, MAX_CONSTRUCTION_SLOTS);
}

/**
 * Get the number of currently active (in-progress) constructions.
 */
export function getActiveConstructions(state: GameState): number {
  return state.buildings.filter(b => !b.isComplete).length;
}

/**
 * Check if the player can start a new construction.
 */
export function canStartConstruction(state: GameState): boolean {
  return getActiveConstructions(state) < getConstructionSlots(state);
}

/**
 * Get a breakdown of slot bonuses for display.
 */
export function getSlotBreakdown(state: GameState): { label: string; active: boolean }[] {
  const breakdown: { label: string; active: boolean }[] = [
    { label: `Base slots: ${BASE_CONSTRUCTION_SLOTS}`, active: true },
  ];

  for (const bonus of SLOT_BONUSES) {
    const active = bonus.type === 'research' && state.completedResearch.includes(bonus.source);
    breakdown.push({
      label: `+${bonus.slots} from ${bonus.label}`,
      active,
    });
  }

  if (state.prestige && state.prestige.level >= 2) {
    breakdown.push({ label: '+1 from Prestige Level 2', active: true });
  } else {
    breakdown.push({ label: '+1 from Prestige Level 2', active: false });
  }

  return breakdown;
}
