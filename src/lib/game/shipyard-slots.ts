// ─── Space Tycoon: Shipyard Construction Slots ──────────────────────────────
// Base shipyard slots come from corporation tier.
// Additional slots unlocked via research.

import type { GameState } from './types';
import { getTierShipyardSlots, getTierDef } from './corporation-tiers';

/** Maximum possible shipyard slots (tier base + research bonuses) */
export const MAX_SHIPYARD_SLOTS = 8;

interface ShipyardSlotBonus {
  source: string;      // Research ID or building ID that grants this
  type: 'research' | 'building';
  label: string;
  slots: number;
}

/** All possible shipyard slot bonuses (on top of tier base) */
const SHIPYARD_SLOT_BONUSES: ShipyardSlotBonus[] = [
  {
    source: 'modular_spacecraft',
    type: 'research',
    label: 'Modular Spacecraft research',
    slots: 1,
  },
  {
    source: 'space_dock',
    type: 'research',
    label: 'Space Dock research',
    slots: 1,
  },
  {
    source: 'automated_mining_fleet',
    type: 'research',
    label: 'Automated Mining Fleet research',
    slots: 1,
  },
];

/**
 * Calculate total shipyard slots available to the player.
 * Base comes from corporation tier. Research adds on top.
 */
export function getShipyardSlots(state: GameState): number {
  const corpTier = state.corporationTier || 1;
  let slots = getTierShipyardSlots(corpTier);

  for (const bonus of SHIPYARD_SLOT_BONUSES) {
    if (bonus.type === 'research' && state.completedResearch.includes(bonus.source)) {
      slots += bonus.slots;
    }
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
  const corpTier = state.corporationTier || 1;
  const tierDef = getTierDef(corpTier);
  const breakdown: { label: string; active: boolean }[] = [
    { label: `${tierDef.name} tier base: ${tierDef.shipyardSlots} slot${tierDef.shipyardSlots > 1 ? 's' : ''}`, active: true },
  ];

  for (const bonus of SHIPYARD_SLOT_BONUSES) {
    const active = bonus.type === 'research' && state.completedResearch.includes(bonus.source);
    breakdown.push({
      label: `+${bonus.slots} from ${bonus.label}`,
      active,
    });
  }

  return breakdown;
}
