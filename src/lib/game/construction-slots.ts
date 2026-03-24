// ─── Space Tycoon: Construction Queue System ─────────────────────────────────
// Base construction slots come from corporation tier.
// Additional slots unlocked via research.

import type { GameState } from './types';
import { MAX_CONSTRUCTION_SLOTS } from './constants';
import { getTierConstructionSlots, getTierDef } from './corporation-tiers';

interface SlotBonus {
  source: string;      // What grants this slot (research ID, building ID, etc.)
  type: 'research' | 'building';
  label: string;       // Display name
  slots: number;       // How many extra slots this grants
}

/** All possible construction slot bonuses (on top of tier base) */
const SLOT_BONUSES: SlotBonus[] = [
  // Research unlocks
  {
    source: 'orbital_assembly',
    type: 'research',
    label: 'Orbital Assembly research',
    slots: 1,
  },
  {
    source: 'space_dock',
    type: 'research',
    label: 'Space Dock research',
    slots: 1,
  },
  {
    source: '3d_printing_space',
    type: 'research',
    label: '3D Printing in Space research',
    slots: 1,
  },
];

/**
 * Calculate total construction slots available to the player.
 * Base comes from corporation tier. Research adds on top.
 * Max: 10 slots (Megacorp base) + 3 research = 13 (capped at MAX_CONSTRUCTION_SLOTS or higher).
 */
export function getConstructionSlots(state: GameState): number {
  const corpTier = state.corporationTier || 1;
  let slots = getTierConstructionSlots(corpTier);

  // Check research bonuses
  for (const bonus of SLOT_BONUSES) {
    if (bonus.type === 'research' && state.completedResearch.includes(bonus.source)) {
      slots += bonus.slots;
    }
  }

  return Math.min(slots, Math.max(MAX_CONSTRUCTION_SLOTS, getTierConstructionSlots(corpTier) + 3));
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
  const corpTier = state.corporationTier || 1;
  const tierDef = getTierDef(corpTier);
  const breakdown: { label: string; active: boolean }[] = [
    { label: `${tierDef.name} tier base: ${tierDef.constructionSlots} slots`, active: true },
  ];

  for (const bonus of SLOT_BONUSES) {
    const active = bonus.type === 'research' && state.completedResearch.includes(bonus.source);
    breakdown.push({
      label: `+${bonus.slots} from ${bonus.label}`,
      active,
    });
  }

  return breakdown;
}
