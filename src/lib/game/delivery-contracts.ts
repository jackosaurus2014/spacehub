// ─── Space Tycoon: Delivery Contracts ───────────────────────────────────────
// NPC-faction-issued binding contracts that require physical delivery of
// resources by a deadline. Ties Factions ↔ Contracts ↔ Reputation together.
//
// v1 scope: NPC-issued only. P2P player contracts will extend this system
// later — the UI and data shape are designed to support both from day one.

import type { GameState, DeliveryContractState } from './types';
import { FACTIONS, FACTION_MAP, getFactionRep, shiftReputation, type FactionId } from './factions';
import { RESOURCES, RESOURCE_MAP, type ResourceId } from './resources';
import { isInFrontier, FRONTIER_CONTRACT_PAYOUT_MULTIPLIER } from './frontier';
import { getReputationBonuses } from './reputation';
import { getWorkforceBonuses } from './workforce';
// Live-Service Wave LS9 (docs/LIVE_SERVICE_2026-08.md §LS9): quarterly
// Realignment posture — contract-generosity multiplier + procurement-focus
// category, both bounded within POSTURE_BAND. Pure/DB-free (see
// realignment.ts's header); one-directional import (realignment.ts never
// imports this module, so no cycle).
import { computeFactionPostures, getCurrentRealignmentEpoch, type FactionPosture } from './realignment';
import type { ResourceCategory } from './economic-seasons';

/** Public type alias — the persisted DeliveryContractState is the contract. */
export type DeliveryContract = DeliveryContractState;
export type DeliveryStatus = DeliveryContractState['status'];

// ─── Template generation ──────────────────────────────────────────────────────
// Each faction has a preferred resource category and offers contracts
// consistent with its character. Mentioned in lore / flavor text.

interface FactionFlavor {
  preferredResources: ResourceId[];
  avoidedResources: ResourceId[];
  paymentMultiplier: number;   // faction's pay vs baseline
  deadlineHoursRange: [number, number];
  reputationOnComplete: number;
  reputationOnDefault: number;
  quantityMultiplier: number;  // faction's typical request size
  titleTemplates: string[];
}

const FACTION_FLAVOR: Record<FactionId, FactionFlavor> = {
  'the-dominion': {
    preferredResources: ['iron', 'aluminum', 'titanium', 'rare_earth'],
    avoidedResources: [],
    paymentMultiplier: 1.0,
    deadlineHoursRange: [12, 72],
    reputationOnComplete: 6,
    reputationOnDefault: -10,
    quantityMultiplier: 1.2,
    titleTemplates: [
      'Strategic Reserve: {qty} {res}',
      'Fleet Refit Contract: {qty} {res}',
      'Infrastructure Appropriation: {qty} {res}',
      'Official Procurement #{{n}}: {qty} {res}',
    ],
  },
  'the-syndicate': {
    preferredResources: ['platinum_group', 'gold', 'rare_earth', 'exotic_materials'],
    avoidedResources: [],
    paymentMultiplier: 1.3,   // pays more but can be a reputation trap
    deadlineHoursRange: [6, 48],
    reputationOnComplete: 8,
    reputationOnDefault: -12,  // stiff default penalty
    quantityMultiplier: 0.8,
    titleTemplates: [
      'Discreet Handover: {qty} {res}',
      'Off-the-Books Shipment: {qty} {res}',
      'Pallas-4 Priority: {qty} {res}',
      'Gray-Market Exchange: {qty} {res}',
    ],
  },
  'void-corsairs': {
    preferredResources: ['methane', 'ethane', 'aluminum', 'iron'],
    avoidedResources: ['rare_earth', 'platinum_group'],
    paymentMultiplier: 0.9,   // pays less but low rep gate
    deadlineHoursRange: [8, 36],
    reputationOnComplete: 5,
    reputationOnDefault: -4,
    quantityMultiplier: 1.0,
    titleTemplates: [
      'Tribute Shipment: {qty} {res}',
      'Clan Supplies: {qty} {res}',
      'Convoy Fee: {qty} {res}',
    ],
  },
  'hive-collective': {
    preferredResources: ['exotic_materials', 'helium3', 'lunar_water', 'mars_water'],
    avoidedResources: [],
    paymentMultiplier: 1.5,   // best pay; rarest asks
    deadlineHoursRange: [24, 120],
    reputationOnComplete: 10,
    reputationOnDefault: -6,
    quantityMultiplier: 0.5,
    titleTemplates: [
      'Pattern Exchange: {qty} {res}',
      'Collective Provisioning: {qty} {res}',
      'Resonance Trade: {qty} {res}',
    ],
  },
  'nebula-reavers': {
    preferredResources: ['methane', 'helium3', 'ethane', 'exotic_materials'],
    avoidedResources: ['iron', 'aluminum'],
    paymentMultiplier: 1.1,
    deadlineHoursRange: [18, 96],
    reputationOnComplete: 7,
    reputationOnDefault: -8,
    quantityMultiplier: 0.9,
    titleTemplates: [
      'Drift Cache: {qty} {res}',
      'Convocation Dispatch: {qty} {res}',
      'Deep Run: {qty} {res}',
    ],
  },
  'echo-remnants': {
    preferredResources: ['exotic_materials', 'rare_earth', 'titanium', 'platinum_group'],
    avoidedResources: [],
    paymentMultiplier: 1.4,
    deadlineHoursRange: [24, 168],  // scholarly patience
    reputationOnComplete: 9,
    reputationOnDefault: -6,
    quantityMultiplier: 0.7,
    titleTemplates: [
      'Archive Acquisition: {qty} {res}',
      'Preservation Order: {qty} {res}',
      'Order Requisition: {qty} {res}',
    ],
  },
};

export const POOL_SIZE = 8;
const POOL_TARGET_SIZE = POOL_SIZE;
const POOL_REFRESH_MS = 4 * 60 * 60 * 1000; // 4 hours

// Wave E1 (docs/ECONOMY_PVP_2026-08.md §E1, exploit #4 / §1c "three price
// surfaces that never meet"): `paymentMoney` is fixed at generation time off
// the STATIC `resource.baseMarketPrice` constant and never revisited — it
// never sees the shared, player-movable `MarketResource.currentPrice`. That
// makes delivery contracts a risk-free flip: crash a resource's live market
// price (market/trade sell), buy it back cheap on the crashed market, then
// deliver at the contract's untouched static price for pure profit.
//
// The full fix (spot-linked pricing via the server `marketSnapshot` sync
// pipe, §2) is later-wave infrastructure — delivery contracts currently have
// no server endpoint at all (100% client-simulated), so there is nothing to
// cross-check a live price against without first building that pipe. As the
// E1 stopgap, a flat settlement spread is deducted from every delivery
// payout, shrinking (not eliminating) the exploitable margin — the same
// "friction cost" role MARKET_BROKER_FEE_RATE plays on live market sells.
// Real per-delivery money is also bounded (as a backstop) by the sync-route
// client-money plausibility clamp (exploit #5, ledger-reconcile.ts).
export const DELIVERY_ARBITRAGE_SPREAD = 0.15; // 15% haircut on payout

export function getDeliveryPool(state: GameState): DeliveryContract[] {
  return state.availableDeliveries || [];
}

export function getActiveDeliveries(state: GameState): DeliveryContract[] {
  return state.activeDeliveries || [];
}

export function getCompletedDeliveries(state: GameState): DeliveryContract[] {
  return state.completedDeliveries || [];
}

/** Compute a deterministic hash for stable pool seeding. */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pickWeighted<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  const target = rng() * total;
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (target <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

/** Generate a single contract for the given faction.
 *
 *  LS9 posture params (both optional, default to "no change" so every
 *  existing caller/test keeps producing identical contracts):
 *  `postureMultiplier` — this epoch's band-bounded contract-generosity
 *  multiplier for `factionId` (realignment.ts getContractGenerosityMultiplier),
 *  layered on TOP of the faction's static FACTION_FLAVOR.paymentMultiplier,
 *  never replacing it. `focusCategory` — this epoch's procurement-focus
 *  category for `factionId`; resources in that category get a modest
 *  weight bump in the pick below (still bounded — avoidedResources are
 *  never included regardless of focus). */
export function generateContract(
  factionId: FactionId,
  rngSeed: number,
  now: number = Date.now(),
  postureMultiplier: number = 1,
  focusCategory?: ResourceCategory,
): DeliveryContract {
  const rng = mulberry32(rngSeed);
  const flavor = FACTION_FLAVOR[factionId];
  const faction = FACTION_MAP.get(factionId)!;

  // Pick a resource — weight preferred higher, avoid avoided. This epoch's
  // procurement focus (LS9) nudges the weight further when it lands on a
  // still-eligible resource — never overrides avoidedResources.
  const candidates = RESOURCES.filter(r => !flavor.avoidedResources.includes(r.id));
  const weights = candidates.map(r => {
    let w = flavor.preferredResources.includes(r.id) ? 5 : 1;
    if (focusCategory && r.category === focusCategory) w *= 1.6;
    return w;
  });
  const resource = pickWeighted(rng, candidates, weights);

  // Quantity: scales to flavor multiplier. Base range 20-200.
  const baseQty = Math.round(20 + rng() * 180);
  const quantity = Math.max(5, Math.round(baseQty * flavor.quantityMultiplier));

  // Payment: baseline market price × quantity × multiplier, with some noise.
  // LS9: postureMultiplier is this epoch's band-bounded (±20%) generosity
  // shift for this faction — a real, forecastable, world-shared variance on
  // top of the faction's fixed baseline, matching "BALANCE table becomes
  // dynamic ±0.2" per the LS9 spec.
  const basePrice = resource.baseMarketPrice;
  const payment = Math.round(basePrice * quantity * flavor.paymentMultiplier * postureMultiplier * (0.9 + rng() * 0.2));

  // Deadline: from flavor range, measured in real-time hours.
  const deadlineHours = randRange(rng, flavor.deadlineHoursRange[0], flavor.deadlineHoursRange[1]);
  const deadlineAtMs = now + deadlineHours * 60 * 60 * 1000;

  // Title from a template.
  const template = flavor.titleTemplates[Math.floor(rng() * flavor.titleTemplates.length)];
  const n = Math.floor(rng() * 9000) + 1000;
  const title = template
    .replace('{qty}', quantity.toLocaleString())
    .replace('{res}', resource.name)
    .replace('{{n}}', n.toString());

  return {
    id: `dlv-${factionId}-${rngSeed.toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`,
    issuerKind: 'faction',
    issuerFactionId: factionId,
    title,
    resourceId: resource.id,
    quantity,
    paymentMoney: payment,
    deadlineAtMs,
    reputationOnComplete: flavor.reputationOnComplete,
    reputationOnDefault: flavor.reputationOnDefault,
    status: 'open',
    offeredAtMs: now,
  };
}

/** Ensure the contract pool is fresh. Refreshes on a bucketed schedule so all
 *  clients converge without server persistence. */
export function ensureFreshDeliveryPool(state: GameState, now: number = Date.now()): GameState {
  const existing = state.availableDeliveries || [];
  // Remove expired open contracts
  const stillValid = existing.filter(c => c.status === 'open' && c.deadlineAtMs > now);

  // Refresh every POOL_REFRESH_MS
  const lastRefresh = state.deliveryPoolRefreshedAtMs || 0;
  const shouldRefresh = now - lastRefresh >= POOL_REFRESH_MS || stillValid.length < POOL_TARGET_SIZE / 2;

  if (!shouldRefresh) {
    return { ...state, availableDeliveries: stillValid };
  }

  // Generate new contracts across factions, weighted by player standing.
  // Allied factions offer more contracts; hostile factions offer fewer.
  const factionWeights: Record<FactionId, number> = FACTIONS.reduce((acc, f) => {
    const rep = getFactionRep(state, f.id);
    // Standing modifier: 0 rep = 1.0, +100 = 1.5, -100 = 0.3
    const mod = rep >= 0 ? 1 + (rep / 100) * 0.5 : Math.max(0.3, 1 + (rep / 100) * 0.7);
    acc[f.id] = mod;
    return acc;
  }, {} as Record<FactionId, number>);

  // LS9: this epoch's faction postures, computed ONCE per pool refresh (not
  // per contract) — computeFactionPostures is a bounded but non-trivial walk
  // (see realignment.ts), and refreshes only happen every POOL_REFRESH_MS or
  // when the pool runs low, so this stays cheap in practice.
  const epochIndex = getCurrentRealignmentEpoch(now);
  const postureByFaction = new Map<FactionId, FactionPosture>(
    computeFactionPostures(epochIndex).map(p => [p.factionId, p]),
  );

  const bucket = Math.floor(now / POOL_REFRESH_MS);
  const fresh: DeliveryContract[] = [];
  for (let i = 0; i < POOL_TARGET_SIZE; i++) {
    const fId = pickWeighted(mulberry32(bucket * 1000 + i), FACTIONS.map(f => f.id), FACTIONS.map(f => factionWeights[f.id]));
    const posture = postureByFaction.get(fId);
    fresh.push(generateContract(
      fId, bucket * 1000 + i * 37, now,
      posture?.contractGenerosityMultiplier ?? 1,
      posture?.procurementFocus,
    ));
  }

  return {
    ...state,
    availableDeliveries: fresh,
    deliveryPoolRefreshedAtMs: now,
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export function acceptDelivery(state: GameState, contractId: string, now: number = Date.now()): GameState {
  const pool = state.availableDeliveries || [];
  const contract = pool.find(c => c.id === contractId);
  if (!contract || contract.status !== 'open') return state;

  const accepted: DeliveryContract = {
    ...contract,
    status: 'accepted',
    acceptedAtMs: now,
  };

  return {
    ...state,
    availableDeliveries: pool.filter(c => c.id !== contractId),
    activeDeliveries: [...(state.activeDeliveries || []), accepted],
  };
}

export function canDeliver(state: GameState, contractId: string): boolean {
  const contract = (state.activeDeliveries || []).find(c => c.id === contractId);
  if (!contract || contract.status !== 'accepted') return false;
  const have = state.resources[contract.resourceId] || 0;
  return have >= contract.quantity;
}

export function deliverContract(state: GameState, contractId: string, now: number = Date.now()): GameState {
  const active = state.activeDeliveries || [];
  const contract = active.find(c => c.id === contractId);
  if (!contract || contract.status !== 'accepted') return state;
  if (!canDeliver(state, contractId)) return state;

  // Deduct resources, pay money, record completion, shift reputation.
  // Frontier-protected players earn the FRONTIER_CONTRACT_PAYOUT_MULTIPLIER bonus.
  const resources = { ...state.resources };
  resources[contract.resourceId] = (resources[contract.resourceId] || 0) - contract.quantity;

  const frontierBonus = isInFrontier(state, now) ? FRONTIER_CONTRACT_PAYOUT_MULTIPLIER : 1;
  // Audit Wave B (§1c): reputation contractRewardMultiplier (up to +60%) and
  // negotiator contractPayBonus were dead outputs — they now scale delivery
  // payouts, same as static contract rewards (contracts.applyContractReward).
  const repBonuses = getReputationBonuses(state.reputation || 0);
  const wfBonuses = getWorkforceBonuses(state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 });
  const payment = Math.round(
    contract.paymentMoney
    * (1 - DELIVERY_ARBITRAGE_SPREAD)
    * frontierBonus
    * repBonuses.contractRewardMultiplier
    * (1 + wfBonuses.contractPayBonus)
  );

  const completed: DeliveryContract = {
    ...contract,
    status: 'completed',
    completedAtMs: now,
    paymentMoney: payment,
  };

  let next: GameState = {
    ...state,
    resources,
    money: state.money + payment,
    totalEarned: state.totalEarned + payment,
    activeDeliveries: active.filter(c => c.id !== contractId),
    completedDeliveries: [completed, ...(state.completedDeliveries || [])].slice(0, 100),
  };

  if (contract.issuerKind === 'faction' && contract.issuerFactionId) {
    next = shiftReputation(next, contract.issuerFactionId as FactionId, contract.reputationOnComplete);
  }

  return next;
}

/** Automatically move any overdue accepted contracts to defaulted status and
 *  apply reputation penalties. Called from the game tick. */
export function processContractDeadlines(state: GameState, now: number = Date.now()): GameState {
  const active = state.activeDeliveries || [];
  const overdue = active.filter(c => c.deadlineAtMs <= now && c.status === 'accepted');
  if (overdue.length === 0) return state;

  let next: GameState = {
    ...state,
    activeDeliveries: active.filter(c => c.deadlineAtMs > now || c.status !== 'accepted'),
    completedDeliveries: [
      ...overdue.map(c => ({ ...c, status: 'defaulted' as const, defaultedAtMs: now })),
      ...(state.completedDeliveries || []),
    ].slice(0, 100),
  };

  for (const c of overdue) {
    if (c.issuerKind === 'faction' && c.issuerFactionId) {
      next = shiftReputation(next, c.issuerFactionId as FactionId, c.reputationOnDefault);
    }
  }

  return next;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatDeadline(deadlineAtMs: number, now: number = Date.now()): string {
  const delta = deadlineAtMs - now;
  if (delta <= 0) return 'OVERDUE';
  const mins = Math.floor(delta / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}
