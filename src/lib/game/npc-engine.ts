// ─── Space Tycoon: NPC AI Engine ────────────────────────────────────────────
// NPCs exist to ADD FLAVOR AND MARKET ACTIVITY, not to compete with players.
//
// DESIGN RULES:
// 1. NPCs progress at 1/10th player speed (research, building)
// 2. NPCs NEVER claim rare/unique locations (no Pluto, Triton, Enceladus, etc.)
// 3. NPCs only mine COMMON resources (iron, aluminum, water, methane)
// 4. NPCs buy and sell to gently nudge market prices (not crash them)
// 5. NPCs NEVER claim competitive milestones
// 6. NPCs provide background activity and make the world feel alive

import type { GameEvent, GameDate } from './types';
import type { NPCCompanyState } from './npc-companies';
import { SERVICE_MAP } from './services';
import { MINING_PRODUCTION } from './resources';
import { generateId, formatMoney } from './formulas';
import { TICKS_PER_GAME_MONTH } from './constants';

export interface NPCMarketAction {
  npcId: string;
  npcName: string;
  resourceId: string;
  quantity: number;
}

// NPCs only research these BASIC techs (no endgame/exotic research)
const NPC_RESEARCH_POOL = [
  'reusable_boosters', 'high_res_optical', 'modular_spacecraft',
  'triple_junction', 'ion_drives', 'resource_prospecting',
  'rad_hard_processors', 'improved_cooling',
  'rapid_launch_cadence', 'regolith_processing',
];

// NPCs only activate these BASIC services (no exotic mining, no endgame)
const NPC_SERVICE_POOL = [
  'svc_ground_tracking', 'svc_mission_ops',
  'svc_launch_small', 'svc_telecom_leo', 'svc_telecom_geo',
  'svc_sensor_leo', 'svc_power_orbital',
  'svc_launch_medium', 'svc_mining_lunar',
  'svc_fabrication_orbital', 'svc_mining_mars',
];

// NPCs can ONLY unlock these common locations (never rare colonies)
const NPC_ALLOWED_LOCATIONS: { id: string; cost: number }[] = [
  { id: 'geo', cost: 50_000_000 },
  { id: 'lunar_orbit', cost: 1_000_000_000 },
  { id: 'lunar_surface', cost: 2_000_000_000 },
  { id: 'mars_orbit', cost: 10_000_000_000 },
  { id: 'mars_surface', cost: 25_000_000_000 },
  // NPCs NEVER unlock: asteroid_belt, jupiter, saturn, outer_system, colonies
];

// Resources NPCs are allowed to mine (no exotics, no rare materials)
const NPC_ALLOWED_RESOURCES = new Set([
  'iron', 'aluminum', 'titanium', 'lunar_water', 'mars_water',
  'methane', 'ethane',
]);

// Resources NPCs will buy from the market (to create buy pressure)
const NPC_BUY_RESOURCES = ['iron', 'aluminum', 'titanium', 'lunar_water'];

/**
 * Process one game-month tick for all NPC companies.
 * NPCs are throttled to 1/10th player speed and restricted from rare content.
 */
export function processNPCTick(
  npcs: NPCCompanyState[],
  gameDate: GameDate,
): { npcs: NPCCompanyState[]; events: GameEvent[]; marketActions: NPCMarketAction[] } {
  const allEvents: GameEvent[] = [];
  const allMarketActions: NPCMarketAction[] = [];

  const updatedNpcs = npcs.map(npc => {
    const n = { ...npc, monthsPlayed: npc.monthsPlayed + 1 };
    const events: GameEvent[] = [];

    // ─── 1. Revenue (normal — NPCs earn from their services) ──────
    let monthlyRevenue = 0;
    let monthlyCosts = 0;
    for (const svcId of n.activeServiceIds) {
      const svc = SERVICE_MAP.get(svcId);
      if (!svc) continue;
      monthlyRevenue += svc.revenuePerMonth * 0.5; // NPCs earn 50% of service revenue
      monthlyCosts += svc.operatingCostPerMonth;
    }
    monthlyCosts += n.buildingCount * 300_000;

    const netIncome = Math.round(monthlyRevenue - monthlyCosts);
    n.money += netIncome;
    if (netIncome > 0) n.totalEarned += netIncome;

    // ─── 2. Research (1/10th speed — very slow) ───────────────────
    // NPCs complete one research every ~60-100 game months (vs ~6-10 for players)
    const researchInterval = Math.round(60 / n.progressionSpeed);
    if (n.monthsPlayed > 0 && n.monthsPlayed % researchInterval === 0) {
      const nextResearch = NPC_RESEARCH_POOL.find(r => !n.completedResearch.includes(r));
      if (nextResearch) {
        const researchCost = 30_000_000 * (1 + n.completedResearch.length * 0.3);
        if (n.money >= researchCost) {
          n.completedResearch = [...n.completedResearch, nextResearch];
          n.money -= researchCost;
          n.totalSpent += researchCost;

          if (n.completedResearch.length % 3 === 0) {
            events.push({
              id: generateId(), date: gameDate, type: 'npc_activity' as GameEvent['type'],
              title: `${n.name} completed research`,
              description: `${nextResearch.replace(/_/g, ' ')} — ${n.completedResearch.length} total.`,
            });
          }
        }
      }
    }

    // ─── 3. Service/Building (1/10th speed) ───────────────────────
    // NPCs add one service every ~30-50 game months (vs ~3-5 for players)
    const serviceInterval = Math.round(30 / n.progressionSpeed);
    if (n.monthsPlayed > 10 && n.monthsPlayed % serviceInterval === 0) {
      const nextService = NPC_SERVICE_POOL.find(s => !n.activeServiceIds.includes(s));
      if (nextService && n.activeServiceIds.length < 8) { // Cap at 8 services
        const svc = SERVICE_MAP.get(nextService);
        const buildCost = 30_000_000 * (1 + n.activeServiceIds.length * 0.2);
        if (svc && n.money >= buildCost) {
          n.activeServiceIds = [...n.activeServiceIds, nextService];
          n.buildingCount += 1;
          n.money -= buildCost;
          n.totalSpent += buildCost;
        }
      }
    }

    // ─── 4. Location Unlock (restricted to common locations) ──────
    // NPCs only unlock basic locations — NEVER rare colonies
    if (n.monthsPlayed > 30 && n.monthsPlayed % 40 === 0) {
      for (const loc of NPC_ALLOWED_LOCATIONS) {
        if (n.unlockedLocations.includes(loc.id)) continue;
        if (n.money >= loc.cost * 0.8) {
          n.unlockedLocations = [...n.unlockedLocations, loc.id];
          n.money -= loc.cost * 0.8;
          n.totalSpent += loc.cost * 0.8;
          events.push({
            id: generateId(), date: gameDate, type: 'npc_activity' as GameEvent['type'],
            title: `${n.name} expanded to ${loc.id.replace(/_/g, ' ')}`,
            description: 'Background expansion to common locations.',
          });
          break;
        }
      }
    }

    // ─── 5. Resource Production (common resources only) ───────────
    n.resources = { ...n.resources };
    for (const svcId of n.activeServiceIds) {
      const production = MINING_PRODUCTION[svcId];
      if (!production) continue;
      for (const { resource, amountPerMonth } of production) {
        // Only produce allowed resources
        if (!NPC_ALLOWED_RESOURCES.has(resource)) continue;
        const amount = Math.round(amountPerMonth * n.miningFocus * 0.3); // 30% of player rate
        if (amount > 0) {
          n.resources[resource] = (n.resources[resource] || 0) + amount;
        }
      }
    }

    // ─── 6. Market Activity (gentle nudges, not crashes) ──────────
    const marketActions: NPCMarketAction[] = [];

    // Sell excess resources (staggered to prevent dumps)
    const sellMonth = n.monthsPlayed % 5 === (NPC_SEEDS_INDEX.get(n.id) || 0) % 5;
    if (sellMonth) {
      for (const [resourceId, qty] of Object.entries(n.resources)) {
        if (!NPC_ALLOWED_RESOURCES.has(resourceId)) continue;
        // Only sell when well above threshold (gentle trickle, not dump)
        if (qty > n.sellThreshold * 2) {
          const sellQty = Math.round((qty - n.sellThreshold) * 0.3); // Sell 30% of excess
          if (sellQty > 0 && sellQty < 100) { // Cap sells to prevent price crashes
            marketActions.push({ npcId: n.id, npcName: n.name, resourceId, quantity: sellQty });
            n.resources[resourceId] = qty - sellQty;
            const revenue = sellQty * getBasePrice(resourceId);
            n.money += revenue;
            n.totalEarned += revenue;
          }
        }
      }
    }

    // Occasionally BUY resources (creates buy pressure, stabilizes prices)
    if (n.monthsPlayed % 7 === (NPC_SEEDS_INDEX.get(n.id) || 0) % 7 && n.money > 10_000_000) {
      const buyResource = NPC_BUY_RESOURCES[n.monthsPlayed % NPC_BUY_RESOURCES.length];
      const buyQty = Math.round(5 + Math.random() * 15); // Buy 5-20 units
      const cost = buyQty * getBasePrice(buyResource);
      if (n.money > cost * 3) { // Only buy if we can easily afford it
        n.resources[buyResource] = (n.resources[buyResource] || 0) + buyQty;
        n.money -= cost;
        n.totalSpent += cost;
        // Create a "buy" market action (negative quantity = buy pressure)
        marketActions.push({ npcId: n.id, npcName: n.name, resourceId: buyResource, quantity: -buyQty });
      }
    }

    if (marketActions.length > 0 && Math.random() < 0.3) { // Only log 30% of market activity
      events.push({
        id: generateId(), date: gameDate, type: 'npc_activity' as GameEvent['type'],
        title: `${n.name} market activity`,
        description: `${marketActions.length} trade${marketActions.length > 1 ? 's' : ''} on the market.`,
      });
    }

    // ─── 7. Tier Progression (very slow — capped at tier 3) ───────
    if (n.currentTier < 3 && n.monthsPlayed * n.progressionSpeed >= [0, 0, 60, 150][n.currentTier + 1]) {
      n.currentTier = n.currentTier + 1;
    }

    allEvents.push(...events);
    allMarketActions.push(...marketActions);
    return n;
  });

  // Limit NPC events to 1 per tick (reduce log spam)
  const limitedEvents = allEvents.slice(0, 1);

  return { npcs: updatedNpcs, events: limitedEvents, marketActions: allMarketActions };
}

/** Apply NPC market actions to global pressure tracking */
export function applyNPCMarketActions(
  currentPressure: Record<string, number>,
  actions: NPCMarketAction[],
): Record<string, number> {
  const updated = { ...currentPressure };
  for (const action of actions) {
    updated[action.resourceId] = (updated[action.resourceId] || 0) + action.quantity;
  }
  return updated;
}

// Helper: index lookup for staggered activity
import { NPC_SEEDS } from './npc-companies';
const NPC_SEEDS_INDEX = new Map(NPC_SEEDS.map((s, i) => [s.id, i]));

// Helper: base prices for NPC revenue estimation
function getBasePrice(resourceId: string): number {
  const prices: Record<string, number> = {
    lunar_water: 50_000, mars_water: 80_000, iron: 5_000, aluminum: 8_000,
    titanium: 25_000, methane: 15_000, ethane: 20_000,
  };
  return prices[resourceId] || 5_000;
}
