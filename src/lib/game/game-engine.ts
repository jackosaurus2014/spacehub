// ─── Space Tycoon: Game Engine (Tick Processor) ─────────────────────────────

import type { GameState, GameEvent } from './types';
import { BUILDING_MAP } from './buildings';
import { SERVICE_MAP } from './services';
import { RESEARCH_MAP } from './research-tree';
import { MINING_PRODUCTION } from './resources';
import { advanceDate, generateId, revenueMultiplier } from './formulas';
import { MAX_EVENT_LOG } from './constants';
import { processNPCTick, applyNPCMarketActions } from './npc-engine';
import { rollRandomEvent, applyEventEffect, getActiveMultipliers, cleanupExpiredEffects } from './random-events';

/**
 * Process a single game tick (1 in-game month).
 * Pure function: takes state, returns new state. Never mutates input.
 */
export function processTick(state: GameState): GameState {
  const newDate = advanceDate(state.gameDate, 1);
  const events: GameEvent[] = [];
  let money = state.money;
  let totalEarned = state.totalEarned;
  let totalSpent = state.totalSpent;
  const stats = { ...state.stats };

  // Get active effect multipliers (from random events)
  const multipliers = getActiveMultipliers(state);

  // ─── 1. Revenue collection from active services (with effect multipliers) ─
  let monthlyRevenue = 0;
  let monthlyCosts = 0;
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const revenue = Math.round(def.revenuePerMonth * svc.revenueMultiplier * multipliers.revenueMultiplier);
    const cost = Math.round(def.operatingCostPerMonth * multipliers.costMultiplier);
    money += revenue - cost;
    totalEarned += revenue;
    totalSpent += cost;
    monthlyRevenue += revenue;
    monthlyCosts += cost;
  }

  // ─── 2. Maintenance costs for completed buildings ─────────────────
  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    const maint = Math.round(def.maintenanceCostPerMonth * multipliers.costMultiplier);
    money -= maint;
    totalSpent += maint;
    monthlyCosts += maint;
  }

  // ─── 3. Construction completion check (real wall-clock time) ──────
  const now = Date.now();
  const buildings = state.buildings.map((bld) => {
    if (bld.isComplete) return bld;
    // Check real-time timer
    const elapsed = (now - (bld.startedAtMs || 0)) / 1000;
    if (elapsed >= (bld.realDurationSeconds || 0)) {
      const def = BUILDING_MAP.get(bld.definitionId);
      events.push({
        id: generateId(),
        date: newDate,
        type: 'build_complete',
        title: `${def?.name || 'Building'} Complete`,
        description: 'Construction finished. Ready for operation.',
      });

      // Update stats
      if (def?.category === 'satellite') stats.satellitesDeployed++;
      if (def?.category === 'space_station') stats.stationsBuilt++;

      return { ...bld, isComplete: true };
    }
    return bld;
  });

  // ─── 4. Research progress (real wall-clock time) ─────────────────
  let activeResearch = state.activeResearch;
  const completedResearch = [...state.completedResearch];

  if (activeResearch) {
    const researchElapsed = (now - (activeResearch.startedAtMs || 0)) / 1000;
    if (researchElapsed >= (activeResearch.realDurationSeconds || 0)) {
      // Research complete
      completedResearch.push(activeResearch.definitionId);
      stats.researchCompleted++;
      const def = RESEARCH_MAP.get(activeResearch.definitionId);
      events.push({
        id: generateId(),
        date: newDate,
        type: 'research_complete',
        title: `Research Complete: ${def?.name || 'Unknown'}`,
        description: def?.effect || 'New capabilities unlocked.',
      });
      activeResearch = null;
    } else {
      // Update progress for display (as percentage of real time)
      const totalMonths = activeResearch.totalMonths || 1;
      const pctDone = researchElapsed / (activeResearch.realDurationSeconds || 1);
      activeResearch = { ...activeResearch, progressMonths: Math.round(pctDone * totalMonths) };
    }
  }

  // ─── 5. Automatically activate services for newly completed buildings ─
  const activeServices = [...state.activeServices];
  for (const bld of buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    for (const svcId of def.enabledServices) {
      // Check if this service is already active
      const alreadyActive = activeServices.some(s => s.definitionId === svcId && s.locationId === bld.locationId);
      if (alreadyActive) continue;

      const svcDef = SERVICE_MAP.get(svcId);
      if (!svcDef) continue;

      // Check research requirements
      const hasResearch = svcDef.requiredResearch.every(r => completedResearch.includes(r));
      if (!hasResearch) continue;

      const relevantResearch = completedResearch.filter(r => {
        const rDef = RESEARCH_MAP.get(r);
        return rDef && svcDef.requiredResearch.includes(r);
      }).length;

      activeServices.push({
        definitionId: svcId,
        locationId: bld.locationId,
        linkedBuildingIds: [bld.instanceId],
        startDate: newDate,
        revenueMultiplier: revenueMultiplier(relevantResearch),
      });

      events.push({
        id: generateId(),
        date: newDate,
        type: 'service_started',
        title: `Service Online: ${svcDef.name}`,
        description: `Generating ${formatRevenue(svcDef.revenuePerMonth)}/month revenue.`,
      });
    }
  }

  // ─── 6. Resource production from mining/fabrication services ──────
  const resources = { ...(state.resources || {}) };
  for (const svc of activeServices) {
    const production = MINING_PRODUCTION[svc.definitionId];
    if (!production) continue;
    for (const { resource, amountPerMonth } of production) {
      resources[resource] = (resources[resource] || 0) + amountPerMonth;
    }
  }

  // ─── 7. Random events (8% chance per tick if no pending choice) ───
  let pendingChoice = state.pendingChoice || null;
  if (!pendingChoice && Math.random() < 0.08) {
    const event = rollRandomEvent(state);
    if (event) {
      if (event.category === 'choice' && event.choices) {
        pendingChoice = {
          eventId: event.id,
          eventName: event.name,
          eventIcon: event.icon,
          eventDescription: event.description,
          choices: event.choices.map(c => ({ label: c.label, description: c.description })),
        };
        events.push({
          id: generateId(), date: newDate, type: 'random_event',
          title: `${event.icon} ${event.name}`,
          description: 'Decision required — check your alerts.',
        });
      } else if (event.effect) {
        // Auto-apply non-choice events
        const effectResult = applyEventEffect(
          { ...state, money, totalEarned, totalSpent, resources, gameDate: newDate },
          event.effect,
          event.name,
        );
        money = effectResult.money;
        totalEarned = effectResult.totalEarned;
        totalSpent = effectResult.totalSpent;
        Object.assign(resources, effectResult.resources);

        events.push({
          id: generateId(), date: newDate, type: 'random_event',
          title: `${event.icon} ${event.name}`,
          description: event.description,
        });
      }
    }
  }

  // ─── 8. Clean up expired effects ────────────────────────────────
  const activeEffects = cleanupExpiredEffects({ ...state, gameDate: newDate });

  // ─── 9. Track income history (last 24 months) ──────────────────
  const netIncome = Math.round(monthlyRevenue - monthlyCosts);
  const incomeHistory = [...(state.incomeHistory || []), netIncome].slice(-24);

  // ─── 10. Trim event log ───────────────────────────────────────────
  const eventLog = [...events, ...state.eventLog].slice(0, MAX_EVENT_LOG);

  return {
    ...state,
    gameDate: newDate,
    money,
    totalEarned,
    totalSpent,
    buildings,
    completedResearch,
    activeResearch,
    activeServices,
    resources,
    activeEffects,
    pendingChoice,
    incomeHistory,
    eventLog,
    stats,
    lastTickAt: Date.now(),
  };
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

/**
 * Full tick: processes player state + NPC companies in lockstep.
 * This is the function called by the game loop in page.tsx.
 */
export function processFullTick(state: GameState): GameState {
  try {
  // 1. Process player tick
  let newState = processTick(state);

  // 2. Process NPC companies
  if (newState.npcCompanies && newState.npcCompanies.length > 0) {
    const npcResult = processNPCTick(newState.npcCompanies, newState.gameDate);
    newState = {
      ...newState,
      npcCompanies: npcResult.npcs,
      eventLog: [...npcResult.events, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
      npcMarketPressure: applyNPCMarketActions(
        newState.npcMarketPressure || {},
        npcResult.marketActions,
      ),
    };
  }

  return newState;
  } catch (err) {
    // Safety: if tick processing fails, return state unchanged rather than crashing
    console.error('processFullTick error:', err);
    return { ...state, lastTickAt: Date.now() };
  }
}
