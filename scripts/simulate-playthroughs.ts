#!/usr/bin/env npx tsx
/**
 * Space Tycoon: 1000+ Simulated Playthroughs
 * Validates every building, research, service, ship, and action has real impact.
 * Reports dead-end paths, useless items, and broken mechanics.
 */

import { BUILDINGS, BUILDING_MAP } from '../src/lib/game/buildings';
import { SERVICES, SERVICE_MAP } from '../src/lib/game/services';
import { RESEARCH, RESEARCH_MAP, getResearchBonuses } from '../src/lib/game/research-tree';
import { LOCATIONS, LOCATION_MAP } from '../src/lib/game/solar-system';
import { MINING_PRODUCTION, RESOURCES } from '../src/lib/game/resources';
import { WORKER_TYPES, getWorkforceBonuses, getMonthlyPayroll } from '../src/lib/game/workforce';
import { SHIPS as SHIP_DEFINITIONS, SHIP_MAP } from '../src/lib/game/ships';
import { revenueMultiplier, scaledBuildingCost } from '../src/lib/game/formulas';
import { STARTING_MONEY, TICKS_PER_GAME_MONTH, BUILDING_COST_SCALE } from '../src/lib/game/constants';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from '../src/lib/game/upgrades';
import type { GameState } from '../src/lib/game/types';

// ─── Simulation Config ───────────────────────────────────────────────────────
const NUM_SIMULATIONS = 1000;
const MAX_GAME_MONTHS = 240; // 20 years
const STRATEGIES = ['balanced', 'mining_rush', 'satellite_focused', 'tourism', 'research_heavy', 'fleet_builder'] as const;

// ─── Tracking ────────────────────────────────────────────────────────────────
const buildingUsage: Record<string, number> = {};
const serviceActivations: Record<string, number> = {};
const researchCompleted: Record<string, number> = {};
const locationUnlocks: Record<string, number> = {};
const shipBuilds: Record<string, number> = {};
const resourcesMined: Record<string, number> = {};

// Issues found
const issues: string[] = [];
const warnings: string[] = [];

// Stats
let totalSimulations = 0;
let bankruptcies = 0;
let totalEndMoney: number[] = [];
let totalEndNetWorth: number[] = [];
let maxMoneyReached: number[] = [];
let researchCountAtEnd: number[] = [];
let buildingCountAtEnd: number[] = [];
let serviceCountAtEnd: number[] = [];

// ─── Static Analysis (pre-simulation) ────────────────────────────────────────
function staticAnalysis() {
  console.log('\n═══ STATIC ANALYSIS ═══\n');

  // 1. Check every building enables at least one service or has resource production
  for (const bld of BUILDINGS) {
    buildingUsage[bld.id] = 0;
    if (bld.enabledServices.length === 0) {
      // Check if it's a hub/support building
      const hasMiningProd = Object.keys(MINING_PRODUCTION).some(svcId => {
        const svc = SERVICE_MAP.get(svcId);
        return svc?.requiredBuildings?.includes(bld.id);
      });
      if (!hasMiningProd) {
        warnings.push(`Building "${bld.name}" (${bld.id}) enables 0 services — verify it has indirect purpose`);
      }
    }
  }

  // 2. Check every service has at least one building that enables it
  for (const svc of SERVICES) {
    serviceActivations[svc.id] = 0;
    const enablers = BUILDINGS.filter(b => b.enabledServices.includes(svc.id));
    if (enablers.length === 0) {
      issues.push(`SERVICE "${svc.name}" (${svc.id}) has NO building that enables it — DEAD SERVICE`);
    }
    if (svc.revenuePerMonth <= 0) {
      issues.push(`SERVICE "${svc.name}" (${svc.id}) has $0 revenue — useless service`);
    }
    if (svc.revenuePerMonth <= svc.operatingCostPerMonth) {
      warnings.push(`SERVICE "${svc.name}" (${svc.id}) revenue ($${svc.revenuePerMonth}) <= cost ($${svc.operatingCostPerMonth}) — net negative before multipliers`);
    }
  }

  // 3. Check every research has prerequisites that exist
  for (const res of RESEARCH) {
    researchCompleted[res.id] = 0;
    for (const prereq of res.prerequisites) {
      if (!RESEARCH_MAP.has(prereq)) {
        issues.push(`RESEARCH "${res.name}" requires "${prereq}" which DOES NOT EXIST`);
      }
    }
    // Check if research unlocks anything or provides category bonuses
    const unlocksBuildings = BUILDINGS.some(b => b.requiredResearch?.includes(res.id));
    const unlocksSvcs = SERVICES.some(s => s.requiredResearch?.includes(res.id));
    const unlocksLocations = LOCATIONS.some(l => l.requiredResearch?.includes(res.id));
    const hasUnlocksField = res.unlocks && res.unlocks.length > 0;
    const hasEffect = res.effect && res.effect.length > 0;
    if (!unlocksBuildings && !unlocksSvcs && !unlocksLocations && !hasUnlocksField && !hasEffect) {
      warnings.push(`RESEARCH "${res.name}" (${res.id}) doesn't unlock any building, service, or location`);
    }
  }

  // 4. Check every location has at least one building
  for (const loc of LOCATIONS) {
    locationUnlocks[loc.id] = 0;
    if (loc.availableBuildings.length === 0) {
      warnings.push(`LOCATION "${loc.name}" (${loc.id}) has 0 available buildings — may be empty`);
    }
    // Check buildings actually exist
    for (const bldId of loc.availableBuildings) {
      if (!BUILDING_MAP.has(bldId)) {
        issues.push(`LOCATION "${loc.name}" references building "${bldId}" which DOES NOT EXIST`);
      }
    }
  }

  // 5. Check research bonus system covers all categories
  const categories = Array.from(new Set(RESEARCH.map(r => r.category)));
  const testBonuses = getResearchBonuses(RESEARCH.map(r => r.id));
  console.log('Research bonus system covers all categories:');
  console.log(`  Service Revenue Bonus: ${(testBonuses.serviceRevenueBonus * 100).toFixed(1)}% (cap 50%)`);
  console.log(`  Mining Output Bonus: ${(testBonuses.miningOutputBonus * 100).toFixed(1)}% (cap 100%)`);
  console.log(`  Build Cost Reduction: ${(testBonuses.buildCostReduction * 100).toFixed(1)}% (cap 50%)`);
  console.log(`  Build Speed Bonus: ${(testBonuses.buildSpeedBonus * 100).toFixed(1)}% (cap 50%)`);
  console.log(`  Research Speed Bonus: ${(testBonuses.researchSpeedBonus * 100).toFixed(1)}% (cap 50%)`);
  console.log(`  Maintenance Reduction: ${(testBonuses.maintenanceReduction * 100).toFixed(1)}% (cap 50%)`);
  console.log(`  Categories tested: ${categories.join(', ')}`);

  // 6. Check workforce bonuses
  const fullWorkforce = { engineers: 5, scientists: 5, miners: 5, operators: 5 };
  const wfBonuses = getWorkforceBonuses(fullWorkforce);
  const payroll = getMonthlyPayroll(fullWorkforce);
  console.log(`\nWorkforce (5 each): payroll $${(payroll/1e6).toFixed(1)}M/mo`);
  console.log(`  Service Revenue: +${(wfBonuses.serviceRevenue * 100).toFixed(0)}%`);
  console.log(`  Mining Output: +${(wfBonuses.miningOutput * 100).toFixed(0)}%`);
  console.log(`  Build Speed: +${(wfBonuses.buildSpeed * 100).toFixed(0)}%`);
  console.log(`  Research Speed: +${(wfBonuses.researchSpeed * 100).toFixed(0)}%`);

  // 7. Check mining production — every mining service produces something
  for (const svc of SERVICES) {
    if (svc.id.includes('mining')) {
      const prod = MINING_PRODUCTION[svc.id];
      if (!prod || prod.length === 0) {
        issues.push(`MINING SERVICE "${svc.name}" (${svc.id}) produces NO resources`);
      }
    }
  }

  // 8. Check ship definitions
  if (typeof SHIP_DEFINITIONS !== 'undefined') {
    for (const ship of SHIP_DEFINITIONS) {
      shipBuilds[ship.id] = 0;
      if (ship.cargoCapacity <= 0 && !ship.miningRate && !ship.id.includes('probe')) {
        warnings.push(`SHIP "${ship.name}" (${ship.id}) has 0 cargo and no mining rate — limited utility`);
      }
    }
  }

  console.log(`\n  Static checks: ${issues.length} issues, ${warnings.length} warnings`);
}

// ─── Simulation Engine ───────────────────────────────────────────────────────

interface SimState {
  money: number;
  totalEarned: number;
  totalSpent: number;
  buildings: { id: string; locationId: string; isComplete: boolean; upgradeLevel: number }[];
  activeServices: { id: string; locationId: string; revMult: number }[];
  completedResearch: string[];
  unlockedLocations: string[];
  resources: Record<string, number>;
  ships: { id: string; isBuilt: boolean }[];
  workforce: { engineers: number; scientists: number; miners: number; operators: number };
  month: number;
  maxMoney: number;
  wentBankrupt: boolean;
}

function createInitialState(): SimState {
  return {
    money: STARTING_MONEY || 100_000_000,
    totalEarned: 0,
    totalSpent: 0,
    buildings: [],
    activeServices: [],
    completedResearch: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    ships: [],
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
    month: 0,
    maxMoney: STARTING_MONEY || 100_000_000,
    wentBankrupt: false,
  };
}

function canAffordBuilding(state: SimState, bldId: string, locId: string): boolean {
  const bld = BUILDING_MAP.get(bldId);
  if (!bld) return false;
  const count = state.buildings.filter(b => b.id === bldId && b.locationId === locId).length;
  const cost = scaledBuildingCost(bld.baseCost, count);
  if (state.money < cost) return false;
  // Check resource costs
  if (bld.resourceCost) {
    for (const [resId, qty] of Object.entries(bld.resourceCost)) {
      if ((state.resources[resId] || 0) < qty) return false;
    }
  }
  return true;
}

function canResearch(state: SimState, resId: string): boolean {
  if (state.completedResearch.includes(resId)) return false;
  const res = RESEARCH_MAP.get(resId);
  if (!res) return false;
  if (state.money < res.baseCostMoney) return false;
  if (!res.prerequisites.every(p => state.completedResearch.includes(p))) return false;
  // Check resource costs
  if (res.resourceCost) {
    for (const [rId, qty] of Object.entries(res.resourceCost)) {
      if ((state.resources[rId] || 0) < qty) return false;
    }
  }
  return true;
}

function getMonthlyRevenue(state: SimState): number {
  const wfBonuses = getWorkforceBonuses(state.workforce);
  const resBonuses = getResearchBonuses(state.completedResearch);
  let revenue = 0;
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.id);
    if (!def) continue;
    const upgradeBoost = getUpgradeRevenueMultiplier(0); // simplified
    revenue += Math.round(
      def.revenuePerMonth * svc.revMult * upgradeBoost
      * (1 + wfBonuses.serviceRevenue)
      * (1 + resBonuses.serviceRevenueBonus)
    );
  }
  return revenue;
}

function getMonthlyCosts(state: SimState): number {
  const resBonuses = getResearchBonuses(state.completedResearch);
  let costs = 0;
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.id);
    if (def) costs += def.operatingCostPerMonth;
  }
  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.id);
    if (def) costs += Math.round(def.maintenanceCostPerMonth * (1 - resBonuses.maintenanceReduction));
  }
  costs += getMonthlyPayroll(state.workforce);
  return costs;
}

function buildBuilding(state: SimState, bldId: string, locId: string): SimState {
  const bld = BUILDING_MAP.get(bldId);
  if (!bld) return state;
  const count = state.buildings.filter(b => b.id === bldId && b.locationId === locId).length;
  const cost = scaledBuildingCost(bld.baseCost, count);
  const resources = { ...state.resources };
  if (bld.resourceCost) {
    for (const [resId, qty] of Object.entries(bld.resourceCost)) {
      resources[resId] = (resources[resId] || 0) - qty;
    }
  }
  buildingUsage[bldId] = (buildingUsage[bldId] || 0) + 1;

  // Auto-activate services
  const newServices = [...state.activeServices];
  for (const svcId of bld.enabledServices) {
    const svcDef = SERVICE_MAP.get(svcId);
    if (!svcDef) continue;
    const hasResearch = svcDef.requiredResearch.every(r => state.completedResearch.includes(r));
    if (!hasResearch) continue;
    const alreadyActive = newServices.some(s => s.id === svcId && s.locationId === locId);
    if (alreadyActive) continue;
    const resCount = Math.min(state.completedResearch.length, 10);
    newServices.push({ id: svcId, locationId: locId, revMult: revenueMultiplier(resCount) });
    serviceActivations[svcId] = (serviceActivations[svcId] || 0) + 1;
  }

  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    buildings: [...state.buildings, { id: bldId, locationId: locId, isComplete: true, upgradeLevel: 0 }],
    activeServices: newServices,
    resources,
  };
}

function doResearch(state: SimState, resId: string): SimState {
  const res = RESEARCH_MAP.get(resId);
  if (!res) return state;
  const resources = { ...state.resources };
  if (res.resourceCost) {
    for (const [rId, qty] of Object.entries(res.resourceCost)) {
      resources[rId] = (resources[rId] || 0) - qty;
    }
  }
  researchCompleted[resId] = (researchCompleted[resId] || 0) + 1;
  return {
    ...state,
    money: state.money - res.baseCostMoney,
    totalSpent: state.totalSpent + res.baseCostMoney,
    completedResearch: [...state.completedResearch, resId],
    resources,
  };
}

function unlockLocation(state: SimState, locId: string): SimState {
  const loc = LOCATION_MAP.get(locId);
  if (!loc || state.unlockedLocations.includes(locId)) return state;
  if (state.money < loc.unlockCost) return state;
  if (loc.requiredResearch && !loc.requiredResearch.every(r => state.completedResearch.includes(r))) return state;
  locationUnlocks[locId] = (locationUnlocks[locId] || 0) + 1;
  return {
    ...state,
    money: state.money - loc.unlockCost,
    totalSpent: state.totalSpent + loc.unlockCost,
    unlockedLocations: [...state.unlockedLocations, locId],
  };
}

function simulateMonth(state: SimState): SimState {
  const revenue = getMonthlyRevenue(state);
  const costs = getMonthlyCosts(state);
  const net = revenue - costs;

  // Mining production
  const resources = { ...state.resources };
  const wfBonuses = getWorkforceBonuses(state.workforce);
  const resBonuses = getResearchBonuses(state.completedResearch);
  const miningMult = (1 + wfBonuses.miningOutput) * (1 + resBonuses.miningOutputBonus);

  for (const svc of state.activeServices) {
    const prod = MINING_PRODUCTION[svc.id];
    if (!prod) continue;
    for (const { resource, amountPerMonth } of prod) {
      const amount = Math.round(amountPerMonth * miningMult);
      if (amount > 0) {
        resources[resource] = (resources[resource] || 0) + amount;
        resourcesMined[resource] = (resourcesMined[resource] || 0) + amount;
      }
    }
  }

  const newMoney = state.money + net;
  return {
    ...state,
    money: Math.max(newMoney, -50_000_000), // bankruptcy protection
    totalEarned: state.totalEarned + Math.max(0, revenue),
    totalSpent: state.totalSpent + costs,
    resources,
    month: state.month + 1,
    maxMoney: Math.max(state.maxMoney, newMoney),
    wentBankrupt: newMoney < 0 ? true : state.wentBankrupt,
  };
}

// ─── Strategy Functions ──────────────────────────────────────────────────────

type Strategy = typeof STRATEGIES[number];

function pickAction(state: SimState, strategy: Strategy): SimState {
  // Priority research for all strategies
  const researchPriorities: Record<Strategy, string[]> = {
    balanced: ['reusable_boosters', 'high_res_optical', 'modular_spacecraft', 'triple_junction', 'resource_prospecting', 'rad_hard_processors', 'ion_drives', 'regolith_processing', 'autonomous_docking', 'asteroid_capture'],
    mining_rush: ['resource_prospecting', 'regolith_processing', 'reusable_boosters', 'modular_spacecraft', 'asteroid_capture', 'deep_drilling', 'ion_drives', 'isru_water', 'isru_metals', 'electrochemical_mining'],
    satellite_focused: ['high_res_optical', 'triple_junction', 'improved_cooling', 'high_power_comms', 'sar_imaging', 'reusable_boosters', 'rad_hard_processors', 'edge_ai', 'inter_satellite_links', 'multispectral_imaging'],
    tourism: ['modular_spacecraft', 'reusable_boosters', 'launch_abort_systems', 'space_tourism_ops', 'triple_junction', 'life_support_recycling', 'artificial_gravity', 'autonomous_docking', 'resource_prospecting', 'ion_drives'],
    research_heavy: ['rad_hard_processors', 'edge_ai', 'high_res_optical', 'reusable_boosters', 'modular_spacecraft', 'neuromorphic_chips', 'triple_junction', 'resource_prospecting', 'fpga_reconfigurable', 'optical_computing'],
    fleet_builder: ['reusable_boosters', 'modular_spacecraft', 'resource_prospecting', 'ion_drives', 'cargo_optimization', 'ship_automation', 'mining_laser', 'heavy_hauler_design', 'high_res_optical', 'autonomous_docking'],
  };

  // 1. Try priority research
  for (const resId of researchPriorities[strategy]) {
    if (canResearch(state, resId)) {
      return doResearch(state, resId);
    }
  }

  // 2. Try any affordable research (prefer lower tier)
  const affordableResearch = RESEARCH
    .filter(r => canResearch(state, r.id))
    .sort((a, b) => a.tier - b.tier || a.baseCostMoney - b.baseCostMoney);
  if (affordableResearch.length > 0 && Math.random() < 0.4) {
    return doResearch(state, affordableResearch[0].id);
  }

  // 3. Try to build based on strategy
  const buildPriorities: Record<Strategy, string[]> = {
    balanced: ['ground_station', 'mission_control', 'launch_pad_small', 'sat_telecom', 'solar_farm_orbital', 'space_station_small', 'sat_sensor', 'sat_telecom_geo', 'mining_lunar_ice', 'datacenter_orbital'],
    mining_rush: ['ground_station', 'launch_pad_small', 'mining_lunar_ice', 'fabrication_lunar', 'mining_mars', 'mining_asteroid', 'mining_europa', 'mining_titan'],
    satellite_focused: ['ground_station', 'mission_control', 'sat_telecom', 'sat_telecom_geo', 'sat_sensor', 'sat_sensor_geo', 'solar_farm_orbital', 'datacenter_orbital'],
    tourism: ['ground_station', 'mission_control', 'launch_pad_small', 'space_station_small', 'space_station_lunar', 'habitat_lunar', 'space_station_mars', 'habitat_mars'],
    research_heavy: ['ground_station', 'mission_control', 'datacenter_orbital', 'sat_sensor', 'solar_farm_orbital', 'launch_pad_small', 'fabrication_orbital'],
    fleet_builder: ['ground_station', 'launch_pad_small', 'launch_pad_medium', 'mining_lunar_ice', 'fabrication_orbital'],
  };

  for (const bldId of buildPriorities[strategy]) {
    const bld = BUILDING_MAP.get(bldId);
    if (!bld) continue;
    // Find a valid location
    for (const locId of state.unlockedLocations) {
      const loc = LOCATION_MAP.get(locId);
      if (!loc) continue;
      if (!loc.availableBuildings.includes(bldId)) continue;
      if (canAffordBuilding(state, bldId, locId)) {
        // Check research requirements
        if (bld.requiredResearch && !bld.requiredResearch.every(r => state.completedResearch.includes(r))) continue;
        return buildBuilding(state, bldId, locId);
      }
    }
  }

  // 4. Try to unlock locations
  const locationPriorities: Record<Strategy, string[]> = {
    balanced: ['geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit', 'mars_surface', 'asteroid_belt'],
    mining_rush: ['lunar_surface', 'mars_surface', 'asteroid_belt', 'jupiter_system', 'saturn_system'],
    satellite_focused: ['geo', 'lunar_orbit'],
    tourism: ['lunar_orbit', 'lunar_surface', 'mars_orbit', 'mars_surface'],
    research_heavy: ['geo', 'lunar_orbit', 'lunar_surface'],
    fleet_builder: ['lunar_surface', 'asteroid_belt', 'mars_surface'],
  };

  for (const locId of locationPriorities[strategy]) {
    if (!state.unlockedLocations.includes(locId)) {
      const newState = unlockLocation(state, locId);
      if (newState !== state) return newState;
    }
  }

  // 5. Hire workforce
  const totalWorkers = state.workforce.engineers + state.workforce.scientists + state.workforce.miners + state.workforce.operators;
  if (totalWorkers < 10 && state.money > 10_000_000 && state.activeServices.length > 0) {
    const wf = { ...state.workforce };
    if (strategy === 'mining_rush' && wf.miners < 5) {
      wf.miners++;
      return { ...state, money: state.money - 2_400_000, workforce: wf };
    } else if (strategy === 'research_heavy' && wf.scientists < 5) {
      wf.scientists++;
      return { ...state, money: state.money - 3_600_000, workforce: wf };
    } else if (wf.operators < 3) {
      wf.operators++;
      return { ...state, money: state.money - 2_700_000, workforce: wf };
    } else if (wf.engineers < 3) {
      wf.engineers++;
      return { ...state, money: state.money - 3_000_000, workforce: wf };
    }
  }

  return state; // No action taken this month — save money
}

// ─── Run Simulation ──────────────────────────────────────────────────────────

function runSimulation(simId: number): SimState {
  const strategy = STRATEGIES[simId % STRATEGIES.length];
  let state = createInitialState();

  for (let month = 0; month < MAX_GAME_MONTHS; month++) {
    // Simulate revenue/costs/mining
    state = simulateMonth(state);

    // Every 1-3 months, take an action
    if (month % (1 + Math.floor(Math.random() * 3)) === 0) {
      state = pickAction(state, strategy);
    }
  }

  return state;
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Space Tycoon: 1000+ Playthrough Simulation & Validation   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Phase 1: Static analysis
  staticAnalysis();

  // Phase 2: Run simulations
  console.log(`\n═══ RUNNING ${NUM_SIMULATIONS} SIMULATIONS ═══\n`);
  const startTime = Date.now();

  for (let i = 0; i < NUM_SIMULATIONS; i++) {
    const state = runSimulation(i);
    totalSimulations++;

    if (state.wentBankrupt) bankruptcies++;
    totalEndMoney.push(state.money);
    maxMoneyReached.push(state.maxMoney);
    researchCountAtEnd.push(state.completedResearch.length);
    buildingCountAtEnd.push(state.buildings.length);
    serviceCountAtEnd.push(state.activeServices.length);

    const netWorth = state.money + state.buildings.reduce((sum, b) => {
      const def = BUILDING_MAP.get(b.id);
      return sum + (def ? def.baseCost * 0.5 : 0);
    }, 0);
    totalEndNetWorth.push(netWorth);

    if ((i + 1) % 200 === 0) {
      console.log(`  Completed ${i + 1}/${NUM_SIMULATIONS} simulations...`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Done in ${elapsed}s\n`);

  // Phase 3: Results
  console.log('═══ SIMULATION RESULTS ═══\n');

  // Stats
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = (arr: number[]) => { const s = [...arr].sort((a,b) => a-b); return s[Math.floor(s.length/2)]; };
  const pct = (arr: number[], p: number) => { const s = [...arr].sort((a,b) => a-b); return s[Math.floor(s.length * p)]; };

  console.log(`Simulations: ${totalSimulations}`);
  console.log(`Strategies: ${STRATEGIES.join(', ')}`);
  console.log(`Duration: ${MAX_GAME_MONTHS} months (${MAX_GAME_MONTHS / 12} years) per sim\n`);

  console.log('─── Financial Results ───');
  console.log(`  Bankruptcies: ${bankruptcies} (${(bankruptcies/totalSimulations*100).toFixed(1)}%)`);
  console.log(`  Avg end money:   $${(avg(totalEndMoney)/1e9).toFixed(2)}B`);
  console.log(`  Median end money: $${(median(totalEndMoney)/1e9).toFixed(2)}B`);
  console.log(`  25th pct:   $${(pct(totalEndMoney, 0.25)/1e9).toFixed(2)}B`);
  console.log(`  75th pct:   $${(pct(totalEndMoney, 0.75)/1e9).toFixed(2)}B`);
  console.log(`  Max money ever: $${(Math.max(...maxMoneyReached)/1e9).toFixed(2)}B`);
  console.log(`  Avg net worth:  $${(avg(totalEndNetWorth)/1e9).toFixed(2)}B`);

  console.log('\n─── Progression ───');
  console.log(`  Avg research:  ${avg(researchCountAtEnd).toFixed(1)} / ${RESEARCH.length}`);
  console.log(`  Avg buildings: ${avg(buildingCountAtEnd).toFixed(1)}`);
  console.log(`  Avg services:  ${avg(serviceCountAtEnd).toFixed(1)}`);

  // Phase 4: Usage analysis — find unused items
  console.log('\n═══ ITEM USAGE ANALYSIS ═══\n');

  // Buildings never built
  const neverBuilt = Object.entries(buildingUsage).filter(([_, count]) => count === 0).map(([id]) => id);
  if (neverBuilt.length > 0) {
    console.log(`─── Buildings NEVER built (${neverBuilt.length}/${BUILDINGS.length}) ───`);
    for (const id of neverBuilt) {
      const bld = BUILDING_MAP.get(id);
      const requiredRes = bld?.requiredResearch || [];
      const reqLocs = LOCATIONS.filter(l => l.availableBuildings.includes(id)).map(l => l.id);
      console.log(`  ❌ ${bld?.name || id} — requires: [${requiredRes.join(', ')}] at [${reqLocs.join(', ')}], cost: $${((bld?.baseCost||0)/1e9).toFixed(1)}B`);
    }
  } else {
    console.log('✅ All buildings were built at least once');
  }

  // Services never activated
  const neverActivated = Object.entries(serviceActivations).filter(([_, count]) => count === 0).map(([id]) => id);
  if (neverActivated.length > 0) {
    console.log(`\n─── Services NEVER activated (${neverActivated.length}/${SERVICES.length}) ───`);
    for (const id of neverActivated) {
      const svc = SERVICE_MAP.get(id);
      console.log(`  ❌ ${svc?.name || id} — revenue: $${((svc?.revenuePerMonth||0)/1e6).toFixed(0)}M/mo, requires: [${svc?.requiredResearch?.join(', ')}]`);
    }
  } else {
    console.log('✅ All services were activated at least once');
  }

  // Research never completed
  const neverResearched = Object.entries(researchCompleted).filter(([_, count]) => count === 0).map(([id]) => id);
  if (neverResearched.length > 0) {
    console.log(`\n─── Research NEVER completed (${neverResearched.length}/${RESEARCH.length}) ───`);
    // Group by category
    const byCategory: Record<string, string[]> = {};
    for (const id of neverResearched) {
      const res = RESEARCH_MAP.get(id);
      if (!res) continue;
      if (!byCategory[res.category]) byCategory[res.category] = [];
      byCategory[res.category].push(`${res.name} (T${res.tier}, $${(res.baseCostMoney/1e9).toFixed(1)}B)`);
    }
    for (const [cat, items] of Object.entries(byCategory)) {
      console.log(`  ${cat}: ${items.length} never researched`);
      for (const item of items.slice(0, 3)) console.log(`    ❌ ${item}`);
      if (items.length > 3) console.log(`    ... and ${items.length - 3} more`);
    }
  } else {
    console.log('✅ All research was completed at least once');
  }

  // Locations never unlocked
  const neverUnlocked = Object.entries(locationUnlocks).filter(([_, count]) => count === 0).map(([id]) => id);
  if (neverUnlocked.length > 0) {
    console.log(`\n─── Locations NEVER unlocked (${neverUnlocked.length}) ───`);
    for (const id of neverUnlocked) {
      const loc = LOCATION_MAP.get(id);
      console.log(`  ❌ ${loc?.name || id} — cost: $${((loc?.unlockCost||0)/1e9).toFixed(0)}B, requires: [${loc?.requiredResearch?.join(', ')}]`);
    }
  }

  // Resources never mined
  const neverMined = RESOURCES.filter(r => !resourcesMined[r.id] || resourcesMined[r.id] === 0);
  if (neverMined.length > 0) {
    console.log(`\n─── Resources NEVER mined (${neverMined.length}/${RESOURCES.length}) ───`);
    for (const r of neverMined) {
      console.log(`  ❌ ${r.name} (${r.id})`);
    }
  } else {
    console.log('\n✅ All resources were mined at least once');
  }

  // Phase 5: Research effect validation
  console.log('\n═══ RESEARCH EFFECT VALIDATION ═══\n');

  // Test that research bonuses actually increase with more research
  const emptyBonuses = getResearchBonuses([]);
  const t1Bonuses = getResearchBonuses(RESEARCH.filter(r => r.tier === 1).map(r => r.id));
  const allBonuses = getResearchBonuses(RESEARCH.map(r => r.id));

  console.log('Research bonus progression:');
  console.log(`  No research:      rev +${(emptyBonuses.serviceRevenueBonus*100).toFixed(0)}%, mining +${(emptyBonuses.miningOutputBonus*100).toFixed(0)}%, maint -${(emptyBonuses.maintenanceReduction*100).toFixed(0)}%`);
  console.log(`  All T1 (${RESEARCH.filter(r=>r.tier===1).length}):     rev +${(t1Bonuses.serviceRevenueBonus*100).toFixed(0)}%, mining +${(t1Bonuses.miningOutputBonus*100).toFixed(0)}%, maint -${(t1Bonuses.maintenanceReduction*100).toFixed(0)}%`);
  console.log(`  All (${RESEARCH.length}):    rev +${(allBonuses.serviceRevenueBonus*100).toFixed(0)}%, mining +${(allBonuses.miningOutputBonus*100).toFixed(0)}%, maint -${(allBonuses.maintenanceReduction*100).toFixed(0)}%`);

  if (allBonuses.serviceRevenueBonus <= emptyBonuses.serviceRevenueBonus) {
    issues.push('CRITICAL: Research bonuses do NOT increase service revenue');
  }
  if (allBonuses.miningOutputBonus <= emptyBonuses.miningOutputBonus) {
    issues.push('CRITICAL: Research bonuses do NOT increase mining output');
  }

  // Test workforce impact
  console.log('\nWorkforce impact on $10M/mo base revenue:');
  const baseRev = 10_000_000;
  for (const wt of WORKER_TYPES) {
    const wf = { engineers: 0, scientists: 0, miners: 0, operators: 0 };
    (wf as any)[`${wt.type}s`] = 1;
    const bonus = getWorkforceBonuses(wf);
    const revWithWorker = Math.round(baseRev * (1 + bonus.serviceRevenue));
    const salary = wt.salary;
    const netBenefit = (revWithWorker - baseRev) - salary;
    console.log(`  1 ${wt.name}: +$${((revWithWorker - baseRev)/1e6).toFixed(2)}M rev - $${(salary/1e6).toFixed(2)}M salary = ${netBenefit >= 0 ? '+' : ''}$${(netBenefit/1e6).toFixed(2)}M/mo net`);
    if (wt.bonus.serviceRevenue && wt.bonus.serviceRevenue > 0 && netBenefit < 0) {
      warnings.push(`${wt.name} workforce is net negative at $10M base revenue — consider rebalancing salary or bonus`);
    }
  }

  // Phase 6: Dead-end analysis
  console.log('\n═══ DEAD-END PATH ANALYSIS ═══\n');

  // Check for research that doesn't unlock anything and doesn't contribute to category bonuses
  let deadEndCount = 0;
  for (const res of RESEARCH) {
    const isPrereqForOther = RESEARCH.some(r => r.prerequisites.includes(res.id));
    const unlocksBuilding = BUILDINGS.some(b => b.requiredResearch?.includes(res.id));
    const unlocksService = SERVICES.some(s => s.requiredResearch?.includes(res.id));
    const unlocksLocation = LOCATIONS.some(l => l.requiredResearch?.includes(res.id));
    const hasUnlocks = res.unlocks && res.unlocks.length > 0;

    // Even if it doesn't unlock anything specific, it still provides category bonuses
    // via getResearchBonuses(). So it's not truly dead-end.
    // Only flag if it's T4-T5 and unlocks nothing — expensive for just a bonus
    if (!isPrereqForOther && !unlocksBuilding && !unlocksService && !unlocksLocation && !hasUnlocks && res.tier >= 4) {
      deadEndCount++;
      if (deadEndCount <= 10) {
        console.log(`  ⚠️  ${res.name} (${res.category} T${res.tier}, $${(res.baseCostMoney/1e9).toFixed(0)}B) — expensive endpoint, only provides category bonus`);
      }
    }
  }
  if (deadEndCount > 10) console.log(`  ... and ${deadEndCount - 10} more`);
  if (deadEndCount === 0) console.log('  ✅ No expensive dead-end research paths found');

  // Phase 7: Summary
  console.log('\n═══ FINAL SUMMARY ═══\n');
  console.log(`  Total issues found:  ${issues.length}`);
  console.log(`  Total warnings:      ${warnings.length}`);

  if (issues.length > 0) {
    console.log('\n─── ISSUES (must fix) ───');
    for (const issue of issues) {
      console.log(`  🔴 ${issue}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n─── WARNINGS (review) ───');
    for (const w of warnings.slice(0, 20)) {
      console.log(`  🟡 ${w}`);
    }
    if (warnings.length > 20) console.log(`  ... and ${warnings.length - 20} more warnings`);
  }

  console.log('\n═══ SIMULATION COMPLETE ═══');
}

main();
