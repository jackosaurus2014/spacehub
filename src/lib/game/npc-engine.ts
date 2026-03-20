// ─── Space Tycoon: NPC AI Engine ────────────────────────────────────────────
// Pure function that processes one game-month tick for all NPC companies.
// NPCs mine resources, earn revenue, research, expand, and sell on the market.

import type { GameEvent, GameDate } from './types';
import type { NPCCompanyState } from './npc-companies';
import { SERVICE_MAP } from './services';
import { MINING_PRODUCTION } from './resources';
import { generateId, formatMoney } from './formulas';

export interface NPCMarketAction {
  npcId: string;
  npcName: string;
  resourceId: string;
  quantity: number;
}

// Research order by strategy (simplified — NPCs auto-complete these in sequence)
const RESEARCH_ORDER: Record<string, string[]> = {
  aggressive: [
    'reusable_boosters', 'high_res_optical', 'rad_hard_processors', 'rapid_launch_cadence',
    'modular_spacecraft', 'triple_junction', 'ion_drives', 'super_heavy_lift',
    'resource_prospecting', 'edge_ai', 'regolith_processing', 'autonomous_docking',
    'hall_thrusters', 'orbital_assembly', 'asteroid_capture', 'interplanetary_cruisers',
    'nuclear_thermal', 'deep_drilling',
  ],
  balanced: [
    'reusable_boosters', 'high_res_optical', 'modular_spacecraft', 'triple_junction',
    'rad_hard_processors', 'resource_prospecting', 'ion_drives', 'improved_cooling',
    'rapid_launch_cadence', 'edge_ai', 'regolith_processing', 'orbital_assembly',
    'autonomous_docking', 'hall_thrusters', 'super_heavy_lift', 'asteroid_capture',
    'interplanetary_cruisers', 'nuclear_thermal', 'deep_drilling',
  ],
  conservative: [
    'triple_junction', 'high_res_optical', 'resource_prospecting', 'improved_cooling',
    'modular_spacecraft', 'reusable_boosters', 'ion_drives', 'regolith_processing',
    'rad_hard_processors', 'perovskite_tandem', 'orbital_assembly', 'rapid_launch_cadence',
    'autonomous_docking', 'hall_thrusters', 'asteroid_capture', 'super_heavy_lift',
    'interplanetary_cruisers', 'deep_drilling', 'nuclear_thermal',
  ],
};

// Services NPCs activate as they progress (in order)
const SERVICE_PROGRESSION: string[] = [
  'svc_launch_small', 'svc_ground_tracking', 'svc_mission_ops',
  'svc_telecom_leo', 'svc_sensor_leo', 'svc_ai_datacenter',
  'svc_telecom_geo', 'svc_tourism_leo', 'svc_launch_medium',
  'svc_fabrication_orbital', 'svc_mining_lunar', 'svc_tourism_moon',
  'svc_sensor_geo', 'svc_launch_heavy', 'svc_mining_mars',
  'svc_mining_asteroid', 'svc_ai_mars', 'svc_fabrication_lunar',
  'svc_tourism_mars', 'svc_mining_europa', 'svc_mining_titan',
];

// Location unlock progression
const LOCATION_PROGRESSION: { id: string; tier: number; cost: number }[] = [
  { id: 'geo', tier: 1, cost: 50_000_000 },
  { id: 'lunar_orbit', tier: 2, cost: 1_000_000_000 },
  { id: 'lunar_surface', tier: 2, cost: 2_000_000_000 },
  { id: 'mars_orbit', tier: 3, cost: 10_000_000_000 },
  { id: 'mars_surface', tier: 3, cost: 25_000_000_000 },
  { id: 'asteroid_belt', tier: 3, cost: 15_000_000_000 },
  { id: 'jupiter_system', tier: 4, cost: 100_000_000_000 },
  { id: 'saturn_system', tier: 4, cost: 200_000_000_000 },
  { id: 'outer_system', tier: 5, cost: 500_000_000_000 },
];

// Tier milestones (base months to reach each tier)
const TIER_THRESHOLDS = [0, 0, 18, 48, 96, 180]; // Index = tier, value = base months

/**
 * Process one game-month tick for all NPC companies.
 * Pure function — takes NPCs in, returns updated NPCs + events + market actions.
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

    // ─── 1. Revenue Collection ──────────────────────────────────────
    let monthlyRevenue = 0;
    let monthlyCosts = 0;
    for (const svcId of n.activeServiceIds) {
      const svc = SERVICE_MAP.get(svcId);
      if (!svc) continue;
      monthlyRevenue += svc.revenuePerMonth * n.progressionSpeed;
      monthlyCosts += svc.operatingCostPerMonth;
    }
    // Estimated maintenance
    monthlyCosts += n.buildingCount * 500_000;

    const netIncome = Math.round(monthlyRevenue - monthlyCosts);
    n.money += netIncome;
    if (netIncome > 0) n.totalEarned += netIncome;
    if (netIncome < 0) n.totalSpent += Math.abs(netIncome);

    // ─── 2. Research Progression ────────────────────────────────────
    const researchOrder = RESEARCH_ORDER[n.strategy] || RESEARCH_ORDER.balanced;
    const nextResearch = researchOrder.find(r => !n.completedResearch.includes(r));

    if (nextResearch) {
      // Research completes based on months played vs. progression speed
      const researchIndex = researchOrder.indexOf(nextResearch);
      const baseMonthsNeeded = 6 + researchIndex * 4; // Each subsequent research takes longer
      const actualMonths = Math.round(baseMonthsNeeded / n.progressionSpeed);

      if (n.monthsPlayed >= actualMonths + (n.completedResearch.length * 3)) {
        const researchCost = 50_000_000 * (1 + researchIndex * 0.5);
        if (n.money >= researchCost * n.riskTolerance) {
          n.completedResearch = [...n.completedResearch, nextResearch];
          n.money -= researchCost;
          n.totalSpent += researchCost;

          // Only log significant research milestones
          if (n.completedResearch.length % 5 === 0 || researchIndex < 3) {
            events.push({
              id: generateId(), date: gameDate, type: 'npc_activity' as GameEvent['type'],
              title: `${n.name} completed research`,
              description: `${nextResearch.replace(/_/g, ' ')} — ${n.completedResearch.length} total.`,
            });
          }
        }
      }
    }

    // ─── 3. Service/Building Progression ────────────────────────────
    const serviceInterval = Math.round(8 / n.progressionSpeed);
    if (n.monthsPlayed > 0 && n.monthsPlayed % serviceInterval === 0) {
      const nextService = SERVICE_PROGRESSION.find(s => !n.activeServiceIds.includes(s));
      if (nextService) {
        const svc = SERVICE_MAP.get(nextService);
        const buildCost = 50_000_000 * (1 + n.activeServiceIds.length * 0.3);
        if (svc && n.money >= buildCost * n.riskTolerance) {
          n.activeServiceIds = [...n.activeServiceIds, nextService];
          n.buildingCount += 1;
          n.money -= buildCost;
          n.totalSpent += buildCost;
        }
      }
    }

    // ─── 4. Location Unlock ─────────────────────────────────────────
    for (const loc of LOCATION_PROGRESSION) {
      if (n.unlockedLocations.includes(loc.id)) continue;
      if (n.currentTier < loc.tier) break;
      const scaledCost = loc.cost * (1 - n.riskTolerance * 0.3); // Aggressive NPCs pay less (take risk)
      if (n.money >= scaledCost) {
        n.unlockedLocations = [...n.unlockedLocations, loc.id];
        n.money -= loc.cost;
        n.totalSpent += loc.cost;
        events.push({
          id: generateId(), date: gameDate, type: 'npc_activity' as GameEvent['type'],
          title: `${n.name} expanded operations`,
          description: `Unlocked ${loc.id.replace(/_/g, ' ')}.`,
        });
        break; // Only unlock one per tick
      }
    }

    // ─── 5. Tier Progression ────────────────────────────────────────
    const nextTier = n.currentTier + 1;
    if (nextTier <= 5) {
      const threshold = TIER_THRESHOLDS[nextTier];
      if (threshold && n.monthsPlayed * n.progressionSpeed >= threshold) {
        n.currentTier = nextTier;
        events.push({
          id: generateId(), date: gameDate, type: 'npc_activity' as GameEvent['type'],
          title: `${n.name} reached Tier ${nextTier}`,
          description: `A competitor is advancing. Net worth: ${formatMoney(n.money)}.`,
        });
      }
    }

    // ─── 6. Resource Production ─────────────────────────────────────
    n.resources = { ...n.resources };
    for (const svcId of n.activeServiceIds) {
      const production = MINING_PRODUCTION[svcId];
      if (!production) continue;
      for (const { resource, amountPerMonth } of production) {
        const amount = Math.round(amountPerMonth * n.miningFocus * n.progressionSpeed);
        n.resources[resource] = (n.resources[resource] || 0) + amount;
      }
    }

    // ─── 7. Market Selling ──────────────────────────────────────────
    const marketActions: NPCMarketAction[] = [];
    // Only sell on staggered months to prevent all NPCs dumping at once
    const sellMonth = n.monthsPlayed % 3 === (NPC_SEEDS_INDEX.get(n.id) || 0) % 3;
    if (sellMonth) {
      for (const [resourceId, qty] of Object.entries(n.resources)) {
        if (qty > n.sellThreshold) {
          const sellQty = Math.round((qty - n.sellThreshold * 0.5) * 0.7);
          if (sellQty > 0) {
            marketActions.push({
              npcId: n.id,
              npcName: n.name,
              resourceId,
              quantity: sellQty,
            });
            n.resources[resourceId] = qty - sellQty;
            // Revenue from selling (estimated at base price)
            const estimatedPrice = getBasePrice(resourceId);
            const revenue = sellQty * estimatedPrice;
            n.money += revenue;
            n.totalEarned += revenue;
          }
        }
      }

      if (marketActions.length > 0) {
        events.push({
          id: generateId(), date: gameDate, type: 'npc_activity' as GameEvent['type'],
          title: `${n.name} sold resources`,
          description: `${marketActions.length} resource type${marketActions.length > 1 ? 's' : ''} on the market.`,
        });
      }
    }

    allEvents.push(...events);
    allMarketActions.push(...marketActions);
    return n;
  });

  // Limit events: only keep the 2 most significant NPC events per tick
  const limitedEvents = allEvents.slice(0, 2);

  return { npcs: updatedNpcs, events: limitedEvents, marketActions: allMarketActions };
}

// Helper: index lookup for staggered selling
import { NPC_SEEDS } from './npc-companies';
const NPC_SEEDS_INDEX = new Map(NPC_SEEDS.map((s, i) => [s.id, i]));

// Helper: base prices for NPC revenue estimation
function getBasePrice(resourceId: string): number {
  const prices: Record<string, number> = {
    lunar_water: 50_000, mars_water: 80_000, iron: 5_000, aluminum: 8_000,
    titanium: 25_000, platinum_group: 500_000, gold: 300_000, rare_earth: 200_000,
    methane: 15_000, ethane: 20_000, exotic_materials: 2_000_000, helium3: 5_000_000,
  };
  return prices[resourceId] || 10_000;
}

/**
 * Apply NPC market sell actions to the market pressure tracker.
 * Returns updated pressure record (cumulative supply from NPCs).
 */
export function applyNPCMarketActions(
  currentPressure: Record<string, number>,
  actions: NPCMarketAction[],
): Record<string, number> {
  const pressure = { ...currentPressure };
  for (const action of actions) {
    pressure[action.resourceId] = (pressure[action.resourceId] || 0) + action.quantity;
  }
  return pressure;
}
