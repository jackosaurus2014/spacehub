// ─── Space Tycoon: Random Events System ─────────────────────────────────────
// Events fire randomly each game-month to create drama and player engagement.

import type { GameState, GameDate } from './types';

export interface RandomEventEffect {
  moneyDelta?: number;
  revenueMultiplier?: number; // Applied for durationMonths
  costMultiplier?: number;
  resourceGrant?: Record<string, number>;
  durationMonths?: number;
}

export interface RandomEventChoice {
  label: string;
  description: string;
  effect: RandomEventEffect;
}

export interface RandomEventDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'positive' | 'negative' | 'choice';
  probability: number; // 0-1 chance per tick
  minTier: number;
  choices?: RandomEventChoice[];
  effect?: RandomEventEffect; // For non-choice events
}

export interface ActiveEffect {
  eventId: string;
  label: string;
  expiresAtMonth: number; // total game months when this expires
  revenueMultiplier: number;
  costMultiplier: number;
}

export const RANDOM_EVENTS: RandomEventDefinition[] = [
  // ─── POSITIVE ─────────────────────────────────────────────────────────
  {
    id: 'gov_contract', name: 'Government Contract', icon: '📋', category: 'positive',
    description: 'A government agency awards your company a space infrastructure contract.',
    probability: 0.04, minTier: 1,
    effect: { moneyDelta: 50_000_000 },
  },
  {
    id: 'solar_bonus', name: 'Solar Activity Boost', icon: '☀️', category: 'positive',
    description: 'Increased solar activity boosts energy output across your solar farms.',
    probability: 0.03, minTier: 1,
    effect: { revenueMultiplier: 1.2, durationMonths: 3 },
  },
  {
    id: 'resource_discovery', name: 'Resource Discovery', icon: '⛏️', category: 'positive',
    description: 'Your mining operations discovered a rich mineral vein!',
    probability: 0.03, minTier: 2,
    effect: { resourceGrant: { iron: 200, titanium: 50, rare_earth: 20 } },
  },
  {
    id: 'market_boom', name: 'Market Boom', icon: '📈', category: 'positive',
    description: 'Surging demand for space services drives up revenue across the board.',
    probability: 0.02, minTier: 1,
    effect: { revenueMultiplier: 1.3, durationMonths: 6 },
  },
  {
    id: 'tech_breakthrough', name: 'Unexpected Breakthrough', icon: '💡', category: 'positive',
    description: 'Your engineers made an unexpected breakthrough — bonus research funds!',
    probability: 0.025, minTier: 2,
    effect: { moneyDelta: 100_000_000 },
  },

  // ─── NEGATIVE ─────────────────────────────────────────────────────────
  {
    id: 'equipment_failure', name: 'Equipment Malfunction', icon: '⚠️', category: 'negative',
    description: 'Critical equipment failure increases maintenance costs temporarily.',
    probability: 0.04, minTier: 1,
    effect: { costMultiplier: 1.3, durationMonths: 2 },
  },
  {
    id: 'market_downturn', name: 'Market Downturn', icon: '📉', category: 'negative',
    description: 'Economic slowdown reduces demand for space services.',
    probability: 0.03, minTier: 1,
    effect: { revenueMultiplier: 0.8, durationMonths: 3 },
  },
  {
    id: 'supply_disruption', name: 'Supply Chain Disruption', icon: '🚫', category: 'negative',
    description: 'A critical component shortage increases building costs.',
    probability: 0.03, minTier: 2,
    effect: { costMultiplier: 1.3, durationMonths: 4 },
  },
  {
    id: 'solar_storm', name: 'Severe Solar Storm', icon: '🌊', category: 'negative',
    description: 'A Carrington-class event disrupts satellite operations.',
    probability: 0.015, minTier: 1,
    effect: { revenueMultiplier: 0.6, durationMonths: 2 },
  },

  // ─── CHOICE ───────────────────────────────────────────────────────────
  {
    id: 'rival_buyout', name: 'Acquisition Opportunity', icon: '🤝', category: 'choice',
    description: 'A failing competitor offers to sell their mining rights.',
    probability: 0.02, minTier: 2,
    choices: [
      { label: 'Buy ($200M)', description: 'Acquire their mining assets.', effect: { moneyDelta: -200_000_000, resourceGrant: { platinum_group: 50, gold: 30, iron: 500 } } },
      { label: 'Decline', description: 'Pass on this opportunity.', effect: {} },
    ],
  },
  {
    id: 'research_grant', name: 'Research Grant Opportunity', icon: '🎓', category: 'choice',
    description: 'A university consortium offers a joint research program.',
    probability: 0.025, minTier: 1,
    choices: [
      { label: 'Invest $100M', description: 'Join the program for accelerated research.', effect: { moneyDelta: -100_000_000, revenueMultiplier: 1.15, durationMonths: 12 } },
      { label: 'Decline', description: 'Focus on your own R&D.', effect: {} },
    ],
  },
  {
    id: 'emergency_contract', name: 'Emergency Rescue Contract', icon: '🆘', category: 'choice',
    description: 'A stranded crew needs emergency rescue. High reward but high cost.',
    probability: 0.02, minTier: 2,
    choices: [
      { label: 'Accept ($150M cost)', description: 'Launch the rescue mission for $300M reward.', effect: { moneyDelta: 150_000_000 } },
      { label: 'Decline', description: 'Too risky for your operations.', effect: {} },
    ],
  },
  {
    id: 'alien_signal', name: 'Anomalous Signal Detected', icon: '👽', category: 'choice',
    description: 'Your deep space antenna picked up an unexplained signal.',
    probability: 0.01, minTier: 3,
    choices: [
      { label: 'Investigate ($500M)', description: 'Invest in analysis. Could be a major discovery.', effect: { moneyDelta: -500_000_000, resourceGrant: { exotic_materials: 20, helium3: 10 } } },
      { label: 'Log and ignore', description: 'Probably natural. Save the money.', effect: {} },
    ],
  },
];

/** Roll for a random event this tick. Returns null if no event triggers. */
export function rollRandomEvent(state: GameState): RandomEventDefinition | null {
  const currentTier = Math.max(1, ...state.unlockedLocations.map(() => 1)); // Simplified tier check
  const eligible = RANDOM_EVENTS.filter(e => e.minTier <= currentTier);

  for (const event of eligible) {
    if (Math.random() < event.probability) {
      return event;
    }
  }
  return null;
}

/** Apply a non-choice event's effect to game state */
export function applyEventEffect(state: GameState, effect: RandomEventEffect, eventLabel: string): GameState {
  const newState = { ...state };

  // Money delta
  if (effect.moneyDelta) {
    newState.money += effect.moneyDelta;
    if (effect.moneyDelta > 0) newState.totalEarned += effect.moneyDelta;
    else newState.totalSpent += Math.abs(effect.moneyDelta);
  }

  // Resource grants
  if (effect.resourceGrant) {
    const resources = { ...newState.resources };
    for (const [id, qty] of Object.entries(effect.resourceGrant)) {
      resources[id] = (resources[id] || 0) + qty;
    }
    newState.resources = resources;
  }

  // Temporary modifiers
  if (effect.durationMonths && (effect.revenueMultiplier || effect.costMultiplier)) {
    const totalMonths = (newState.gameDate.year * 12 + newState.gameDate.month);
    const activeEffects: ActiveEffect[] = [...(newState.activeEffects || [])];
    activeEffects.push({
      eventId: eventLabel,
      label: eventLabel,
      expiresAtMonth: totalMonths + effect.durationMonths,
      revenueMultiplier: effect.revenueMultiplier || 1,
      costMultiplier: effect.costMultiplier || 1,
    });
    newState.activeEffects = activeEffects;
  }

  return newState;
}

/** Get combined multipliers from all active effects */
export function getActiveMultipliers(state: GameState): { revenueMultiplier: number; costMultiplier: number } {
  let rev = 1;
  let cost = 1;
  const totalMonths = state.gameDate.year * 12 + state.gameDate.month;

  for (const effect of (state.activeEffects || [])) {
    if (totalMonths < effect.expiresAtMonth) {
      rev *= effect.revenueMultiplier;
      cost *= effect.costMultiplier;
    }
  }

  return { revenueMultiplier: rev, costMultiplier: cost };
}

/** Clean up expired effects */
export function cleanupExpiredEffects(state: GameState): ActiveEffect[] {
  const totalMonths = state.gameDate.year * 12 + state.gameDate.month;
  return (state.activeEffects || []).filter(e => totalMonths < e.expiresAtMonth);
}
