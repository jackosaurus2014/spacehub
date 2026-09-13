// ─── Space Tycoon: Random Events System ─────────────────────────────────────
// Events fire randomly each game-month to create drama and player engagement.

import type { GameState, GameDate } from './types';
// Mining Phase B (2026-09-13): rock event cards read the surveyed rocks'
// live event state (asteroids.ts rockEventMults) and the fleet's orders.
import { getAsteroid, rockEventMults, RUBBLE_YIELD_MULT, RUBBLE_HULL_WEAR, SPIN_UP_RATE_MULT } from './asteroids';
import { miningOrderPhase } from './mining-orders';

export interface RandomEventEffect {
  moneyDelta?: number;
  /** Honest P&L pair (4X_BASELINE_2026-08.md defect ledger #1 / W1 fix):
   *  when BOTH are set, cost is debited to totalSpent and reward is
   *  credited to totalEarned as SEPARATE ledger lines, instead of the old
   *  single `moneyDelta: +150_000_000` which silently folded a real $150M
   *  cost and a real $300M reward into one "earned" number — accurate net,
   *  dishonest P&L (CLAUDE.md "Profit and loss must be tracked and
   *  visible"). Falls back to moneyDelta when only that is set. */
  moneyCost?: number;
  moneyReward?: number;
  revenueMultiplier?: number; // Applied for durationMonths
  costMultiplier?: number;
  resourceGrant?: Record<string, number>;
  durationMonths?: number;
  /** Mining Phase B: the choice stands the corporation off the card's rock
   *  (state.pendingChoice.asteroidId) until the rock event ends — new mining
   *  orders on it are refused locally (mining-orders.ts standing_off). A
   *  self-restriction: no cash, no yield, nothing the server must verify. */
  standOffRock?: boolean;
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
  /** Mining Phase B: 'rock_event' cards are raised by rollMiningEventCards
   *  from a rock's live state (server-rolled, shared by everyone working the
   *  rock — hazards.ts's "same weather for every player" precedent), never
   *  by the monthly dice. rollRandomEvent skips them. */
  trigger?: 'monthly' | 'rock_event';
}

export interface ActiveEffect {
  eventId: string;
  label: string;
  expiresAtMonth: number; // total game months when this expires
  revenueMultiplier: number;
  costMultiplier: number;
  /** V17 (4X Wave W4 narrative-events.ts): optional research-speed
   *  multiplier, so chain-event consequences ("Radio Science Windfall",
   *  "Fusion Ignition Milestone") can grant a temporary research boost
   *  through this SAME expiring-effect list instead of a parallel one.
   *  Defaults to 1 (no effect) for every pre-existing entry. */
  researchSpeedMultiplier?: number;
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
      // W1 sign-bug fix (4X_BASELINE_2026-08.md defect ledger #1): this used
      // to be `effect: { moneyDelta: 150_000_000 }` — a flat +$150M grant
      // that never actually debited the stated $150M mission cost, so the
      // "high cost" framing was fiction and the P&L showed a phantom $150M
      // of pure earnings. Same net (+$150M), honest ledger: a real $150M
      // cost against a real $300M reward, both lines visible.
      { label: 'Accept ($150M cost)', description: 'Launch the rescue mission for $300M reward.', effect: { moneyCost: 150_000_000, moneyReward: 300_000_000 } },
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

  // ─── MINING PHASE B — rock event cards (docs/SPACE_MINING_DESIGN §4) ───
  // Both carry NO cash and NO grant: the rock's state (yield x1.25 with
  // hull wear; rate x0.6) lives on the Asteroid row and the planner reads
  // it on both sides. The card's decision is whether to keep working the
  // rock or stand off it while the event runs. probability 0 + trigger
  // 'rock_event': never rolled by the monthly dice.
  {
    id: 'rubble_field', name: 'Rubble Field', icon: '🪨', category: 'choice',
    description: `A rock your crews are working has fractured into a rubble field. Loose material is easy to grab — yield x${RUBBLE_YIELD_MULT} while it lasts — but every order completed on it costs hull (${Math.round(RUBBLE_HULL_WEAR * 100)}% x (1 + risk)).`,
    probability: 0, minTier: 1, trigger: 'rock_event',
    choices: [
      { label: 'Work the rubble', description: 'Keep mining it hot: the bonus and the hull wear both apply.', effect: {} },
      { label: 'Stand off', description: 'No new orders on this rock until it settles. Orders already under way finish as planned.', effect: { standOffRock: true } },
    ],
  },
  {
    id: 'spin_up', name: 'Spin-Up', icon: '🌀', category: 'choice',
    description: `A rock your crews are working has spun up — anchoring and cutting are slower (rate x${SPIN_UP_RATE_MULT}) for the duration. Fuel per trip is unchanged; time on station is not.`,
    probability: 0, minTier: 1, trigger: 'rock_event',
    choices: [
      { label: 'Ride it out', description: 'Keep working it at the slower rate.', effect: {} },
      { label: 'Re-route crews', description: 'Stand off this rock until it settles; send hulls elsewhere.', effect: { standOffRock: true } },
    ],
  },
];

/** Roll for a random event this tick. Returns null if no event triggers. */
export function rollRandomEvent(state: GameState): RandomEventDefinition | null {
  // Calculate player tier from unlocked locations count
  const locCount = state.unlockedLocations.length;
  const currentTier = locCount >= 8 ? 4 : locCount >= 5 ? 3 : locCount >= 3 ? 2 : 1;
  const eligible = RANDOM_EVENTS.filter(e => e.minTier <= currentTier && e.trigger !== 'rock_event');

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

  // Honest cost/reward pair (W1 sign-bug fix — see RandomEventEffect doc
  // comment). Preferred over moneyDelta when either is set.
  if (effect.moneyCost || effect.moneyReward) {
    if (effect.moneyCost) {
      newState.money -= effect.moneyCost;
      newState.totalSpent += effect.moneyCost;
    }
    if (effect.moneyReward) {
      newState.money += effect.moneyReward;
      newState.totalEarned += effect.moneyReward;
    }
  } else if (effect.moneyDelta) {
    // Legacy path: a single net delta with no separate cost/reward lines.
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

  // Mining Phase B: stand off the card's rock until its event ends.
  if (effect.standOffRock && state.pendingChoice?.asteroidId) {
    const rockId = state.pendingChoice.asteroidId;
    const rec = state.asteroidIntel?.[rockId];
    const ev = rockEventMults(rec, Date.now());
    const until = Math.max(ev.rubble ? (rec?.rubbleUntilMs ?? 0) : 0, ev.spinUp ? (rec?.spinUpUntilMs ?? 0) : 0);
    if (until > Date.now()) newState.miningStandOff = { ...(newState.miningStandOff || {}), [rockId]: until };
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

// ─── Mining Phase B: rock event cards ────────────────────────────────────────

/** Key for "this card was raised for this rock and this event window". */
export function rockEventCardKey(kind: 'rubble_field' | 'spin_up', asteroidId: string, untilMs: number): string {
  return `${kind}:${asteroidId}:${Math.round(untilMs)}`;
}

/**
 * Raise ONE rock event card when a rock the corporation is working (a ship
 * on a 'mine' order there, or one of its claims) has a live rubble field or
 * spin-up the player has not been shown yet. The pendingChoice slot is the
 * single card slot the game already has; a busy slot waits. Pure; returns
 * the same state when nothing is due.
 */
export function rollMiningEventCards(state: GameState, nowMs: number = Date.now()): GameState {
  if (state.pendingChoice) return state;
  const intel = state.asteroidIntel || {};
  const seen = new Set(state.miningNoticesSeen || []);
  const working = new Set<string>();
  for (const s of state.ships || []) {
    const o = s.miningOrder;
    if (o?.mode === 'mine' && o.asteroidId && miningOrderPhase(o, nowMs) !== 'complete') working.add(o.asteroidId);
  }
  for (const id of Object.keys(state.asteroidClaims || {})) working.add(id);
  for (const rockId of working) {
    const rec = intel[rockId];
    if (!rec) continue;
    const ev = rockEventMults(rec, nowMs);
    const kind: 'rubble_field' | 'spin_up' | null = ev.rubble ? 'rubble_field' : ev.spinUp ? 'spin_up' : null;
    if (!kind) continue;
    const until = kind === 'rubble_field' ? rec.rubbleUntilMs! : rec.spinUpUntilMs!;
    const key = rockEventCardKey(kind, rockId, until);
    if (seen.has(key)) continue;
    const def = RANDOM_EVENTS.find(e => e.id === kind);
    if (!def?.choices) continue;
    const rock = getAsteroid(rockId);
    return {
      ...state,
      pendingChoice: {
        eventId: def.id, eventName: `${def.name} — ${rock?.name || rockId}`, eventIcon: def.icon, eventDescription: def.description,
        choices: def.choices.map(c => ({ label: c.label, description: c.description })),
        asteroidId: rockId,
      },
      miningNoticesSeen: [...Array.from(seen), key].slice(-300),
    };
  }
  return state;
}

/** Get combined multipliers from all active effects */
export function getActiveMultipliers(state: GameState): { revenueMultiplier: number; costMultiplier: number; researchSpeedMultiplier: number } {
  let rev = 1;
  let cost = 1;
  let research = 1;
  const totalMonths = state.gameDate.year * 12 + state.gameDate.month;

  for (const effect of (state.activeEffects || [])) {
    if (totalMonths < effect.expiresAtMonth) {
      rev *= effect.revenueMultiplier;
      cost *= effect.costMultiplier;
      research *= effect.researchSpeedMultiplier ?? 1;
    }
  }

  return { revenueMultiplier: rev, costMultiplier: cost, researchSpeedMultiplier: research };
}

/** Clean up expired effects */
export function cleanupExpiredEffects(state: GameState): ActiveEffect[] {
  const totalMonths = state.gameDate.year * 12 + state.gameDate.month;
  return (state.activeEffects || []).filter(e => totalMonths < e.expiresAtMonth);
}
