// ─── Space Tycoon: Game Engine (Tick Processor) ─────────────────────────────
// 200-cycle polish pass: integrates workforce, prestige, market events,
// achievements, ship cargo, bankruptcy protection, and revenue caps.

import type { GameState, GameEvent } from './types';
import { BUILDING_MAP } from './buildings';
import { SERVICE_MAP } from './services';
import { RESEARCH_MAP, getResearchBonuses } from './research-tree';
import { MINING_PRODUCTION } from './resources';
import { advanceDate, generateId, revenueMultiplier } from './formulas';
import { MAX_EVENT_LOG, TICKS_PER_GAME_MONTH } from './constants';
import { getGlobalGameDate } from './server-time';
import { processNPCTick, applyNPCMarketActions } from './npc-engine';
import { rollRandomEvent, applyEventEffect, getActiveMultipliers, cleanupExpiredEffects } from './random-events';
import { checkMilestones } from './milestones';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from './upgrades';
import { SHIP_MAP } from './ships';
import { getWorkforceBonuses, getMonthlyPayroll } from './workforce';
import { getActiveBoostMultiplier, cleanupExpiredBoosts } from './speed-boosts';
import type { ActiveBoost } from './speed-boosts';
import { rollMarketEvent } from './market-events';
import type { ActiveMarketEvent } from './market-events';
import { checkAchievements } from './achievements';

/**
 * Process a single game tick (1 in-game month).
 * Pure function: takes state, returns new state. Never mutates input.
 */
export function processTick(state: GameState): GameState {
  // Global server time: all players share the same game date.
  // The calendar is derived from real wall-clock time (server epoch),
  // NOT from tick counting. Revenue/costs apply fractionally each tick.
  const globalDate = getGlobalGameDate();
  const prevTotalMonths = state.gameDate.year * 12 + state.gameDate.month - 1 - (2025 * 12);
  const isMonthEnd = globalDate.totalMonths > prevTotalMonths;
  const newDate = { year: globalDate.year, month: globalDate.month };
  const tickCount = isMonthEnd ? 0 : (state.tickCount || 0) + 1;
  const fraction = 1 / TICKS_PER_GAME_MONTH; // Fraction of monthly revenue/cost per tick

  const events: GameEvent[] = [];
  let money = state.money;
  let totalEarned = state.totalEarned;
  let totalSpent = state.totalSpent;
  const stats = { ...state.stats };

  // Get active effect multipliers (from random events)
  const multipliers = getActiveMultipliers(state);

  // Get workforce bonuses (build speed, research speed, mining output, revenue)
  const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
  const wfBonuses = getWorkforceBonuses(workforce);

  // Get research bonuses (category-specific bonuses from completed research)
  const resBonuses = getResearchBonuses(state.completedResearch);

  // Get prestige bonuses
  const prestige = state.prestige || { level: 0, legacyPoints: 0, permanentBonuses: { revenueMultiplier: 1, buildSpeedMultiplier: 1, researchSpeedMultiplier: 1, miningMultiplier: 1, startingMoney: 200_000_000 } };
  const prestigeRevMult = prestige.permanentBonuses?.revenueMultiplier || 1;
  const prestigeMiningMult = prestige.permanentBonuses?.miningMultiplier || 1;

  // ─── 0. Workforce payroll (fractional per tick) ──────────────────
  const payroll = Math.round(getMonthlyPayroll(workforce) * fraction);
  if (payroll > 0) {
    money -= payroll;
    totalSpent += payroll;
  }

  // ─── 1. Revenue collection from active services ───────────────────
  // Applies: event multipliers, upgrade boost, workforce bonus, prestige bonus
  let monthlyRevenue = 0;
  let monthlyCosts = 0;
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
    const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
    // Dynamic service pricing: server-reported multiplier based on global supply
    const supplyMult = (state.servicePriceMultipliers || {})[svc.definitionId] ?? 1.0;
    const revenue = Math.round(
      def.revenuePerMonth * fraction
      * svc.revenueMultiplier
      * multipliers.revenueMultiplier
      * upgradeBoost
      * (1 + wfBonuses.serviceRevenue)
      * (1 + resBonuses.serviceRevenueBonus)
      * prestigeRevMult
      * supplyMult
    );
    const cost = Math.round(def.operatingCostPerMonth * fraction * multipliers.costMultiplier);
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
    const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
    const maint = Math.round(def.maintenanceCostPerMonth * fraction * multipliers.costMultiplier * maintMult * (1 - resBonuses.maintenanceReduction));
    money -= maint;
    totalSpent += maint;
    monthlyCosts += maint;
  }

  // ─── 3. Construction completion check (real wall-clock time) ──────
  const now = Date.now();
  const activeBoosts: ActiveBoost[] = (state.activeBoosts || []) as ActiveBoost[];
  const buildBoostMult = getActiveBoostMultiplier(activeBoosts, 'construction');
  const buildings = state.buildings.map((bld) => {
    if (bld.isComplete) return bld;
    const elapsed = (now - (bld.startedAtMs || 0)) / 1000;
    // Speed boosts reduce effective duration
    const effectiveDuration = (bld.realDurationSeconds || 0) / buildBoostMult;
    if (elapsed >= effectiveDuration) {
      const def = BUILDING_MAP.get(bld.definitionId);
      events.push({
        id: generateId(), date: newDate, type: 'build_complete',
        title: `${def?.name || 'Building'} Complete`,
        description: 'Construction finished. Ready for operation.',
      });
      if (def?.category === 'satellite') stats.satellitesDeployed++;
      if (def?.category === 'space_station') stats.stationsBuilt++;
      return { ...bld, isComplete: true };
    }
    return bld;
  });

  // ─── 4. Research progress (real wall-clock time) ──────────────────
  let activeResearch = state.activeResearch;
  const completedResearch = [...state.completedResearch];

  if (activeResearch) {
    const researchElapsed = (now - (activeResearch.startedAtMs || 0)) / 1000;
    const researchBoostMult = getActiveBoostMultiplier(activeBoosts, 'research');
    const researchSpeedMult = (1 + wfBonuses.researchSpeed) * (1 + resBonuses.researchSpeedBonus) * (prestige.permanentBonuses?.researchSpeedMultiplier || 1) * researchBoostMult;
    const effectiveDuration = (activeResearch.realDurationSeconds || 0) / researchSpeedMult;
    if (researchElapsed >= effectiveDuration) {
      completedResearch.push(activeResearch.definitionId);
      stats.researchCompleted++;
      const def = RESEARCH_MAP.get(activeResearch.definitionId);
      events.push({
        id: generateId(), date: newDate, type: 'research_complete',
        title: `Research Complete: ${def?.name || 'Unknown'}`,
        description: def?.effect || 'New capabilities unlocked.',
      });
      activeResearch = null;
    } else {
      const totalMonths = activeResearch.totalMonths || 1;
      const pctDone = researchElapsed / effectiveDuration;
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
      const alreadyActive = activeServices.some(s => s.definitionId === svcId && s.locationId === bld.locationId);
      if (alreadyActive) continue;
      const svcDef = SERVICE_MAP.get(svcId);
      if (!svcDef) continue;
      const hasResearch = svcDef.requiredResearch.every(r => completedResearch.includes(r));
      if (!hasResearch) continue;

      // Revenue multiplier: count ALL completed research (broader benefit)
      const totalResearchCount = completedResearch.length;
      activeServices.push({
        definitionId: svcId,
        locationId: bld.locationId,
        linkedBuildingIds: [bld.instanceId],
        startDate: newDate,
        revenueMultiplier: revenueMultiplier(Math.min(totalResearchCount, 10)),
      });
      events.push({
        id: generateId(), date: newDate, type: 'service_started',
        title: `Service Online: ${svcDef.name}`,
        description: `Generating ${formatRevenue(svcDef.revenuePerMonth)}/month revenue.`,
      });
    }
  }

  // ─── 6. Resource production (fractional per tick, with bonuses) ───
  const resources = { ...(state.resources || {}) };
  const miningMult = (1 + wfBonuses.miningOutput) * (1 + resBonuses.miningOutputBonus) * prestigeMiningMult;
  for (const svc of activeServices) {
    const production = MINING_PRODUCTION[svc.definitionId];
    if (!production) continue;
    for (const { resource, amountPerMonth } of production) {
      // Accumulate fractional amounts — only add whole units
      const fractionalAmount = amountPerMonth * fraction * miningMult;
      if (fractionalAmount >= 1) {
        resources[resource] = (resources[resource] || 0) + Math.round(fractionalAmount);
      } else if (isMonthEnd) {
        // On month boundary, add at least the monthly total
        resources[resource] = (resources[resource] || 0) + Math.round(amountPerMonth * miningMult);
      }
    }
  }

  // ─── 7. Random events (8% chance per MONTH, only on month boundary) ───
  let pendingChoice = state.pendingChoice || null;
  if (isMonthEnd && !pendingChoice && Math.random() < 0.08) {
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
        const effectResult = applyEventEffect(
          { ...state, money, totalEarned, totalSpent, resources, gameDate: newDate },
          event.effect, event.name,
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

  // ─── 8. Market events (5% chance per MONTH, only on month boundary) ──
  let activeMarketEvents: ActiveMarketEvent[] = [...(state.activeMarketEvents || [])];
  try {
    const marketEventDef = isMonthEnd ? rollMarketEvent() : null;
    if (marketEventDef) {
      const now = Date.now();
      const activeEvent: ActiveMarketEvent = {
        eventId: marketEventDef.id,
        name: marketEventDef.name,
        icon: marketEventDef.icon,
        affectedResources: marketEventDef.affectedResources,
        priceMultiplier: marketEventDef.priceMultiplier,
        startedAtMs: now,
        expiresAtMs: now + marketEventDef.durationHours * 3600000,
      };
      activeMarketEvents.push(activeEvent);
      events.push({
        id: generateId(), date: newDate, type: 'random_event',
        title: `📈 ${marketEventDef.name}`,
        description: `${marketEventDef.description} (${marketEventDef.durationHours}h)`,
      });
    }
    // Cleanup expired market events
    activeMarketEvents = activeMarketEvents.filter(e => Date.now() < e.expiresAtMs);
  } catch { /* market events non-critical */ }

  // ─── 9. Clean up expired effects and boosts ─────────────────────
  const activeEffects = cleanupExpiredEffects({ ...state, gameDate: newDate });
  const cleanedBoosts = cleanupExpiredBoosts(activeBoosts);

  // ─── 10. Track income history (last 24 months) ────────────────────
  const netIncome = Math.round(monthlyRevenue - monthlyCosts - payroll);
  const incomeHistory = [...(state.incomeHistory || []), netIncome].slice(-24);

  // ─── 11. Bankruptcy protection ────────────────────────────────────
  // Don't let money go below -$50M (prevents death spiral)
  if (money < -50_000_000) money = -50_000_000;

  // ─── 12. Trim event log ──────────────────────────────────────────
  const eventLog = [...events, ...state.eventLog].slice(0, MAX_EVENT_LOG);

  return {
    ...state,
    gameDate: newDate,
    tickCount: isMonthEnd ? 0 : tickCount,
    money,
    totalEarned,
    totalSpent,
    buildings,
    completedResearch,
    activeResearch,
    activeServices,
    resources,
    activeEffects,
    activeMarketEvents,
    activeBoosts: cleanedBoosts,
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
 * Full tick: processes player state + NPC companies + achievements in lockstep.
 */
export function processFullTick(state: GameState): GameState {
  // 1. Process player tick
  let newState: GameState;
  try {
    newState = processTick(state);
  } catch (err) {
    console.error('processTick error:', err);
    return { ...state, lastTickAt: Date.now() };
  }

  // 2. Process NPC companies (can fail safely)
  try {
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
  } catch (err) {
    console.error('NPC tick error (non-fatal):', err);
  }

  // 3. Check competitive milestones
  try {
    const claimedMilestones = { ...(newState.claimedMilestones || {}) };
    const newClaims = checkMilestones(newState, claimedMilestones);
    if (newClaims.length > 0) {
      let milestoneReward = 0;
      const milestoneEvents: typeof newState.eventLog = [];
      for (const claim of newClaims) {
        claimedMilestones[claim.id] = claim.claimedBy;
        if (claim.isPlayer) {
          milestoneReward += claim.reward;
          milestoneEvents.push({
            id: generateId(), date: newState.gameDate, type: 'milestone',
            title: `🏆 Milestone: ${claim.claimedBy} — First to achieve "${claim.id.replace(/_/g, ' ')}"!`,
            description: `Reward: +$${(claim.reward / 1_000_000).toFixed(0)}M`,
          });
        } else {
          milestoneEvents.push({
            id: generateId(), date: newState.gameDate, type: 'npc_activity',
            title: `🏆 ${claim.claimedBy} claimed "${claim.id.replace(/_/g, ' ')}"`,
            description: 'An NPC beat you to this milestone.',
          });
        }
      }
      newState = {
        ...newState,
        claimedMilestones,
        money: newState.money + milestoneReward,
        totalEarned: newState.totalEarned + milestoneReward,
        eventLog: [...milestoneEvents, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
      };
    }
  } catch (err) {
    console.error('Milestone check error (non-fatal):', err);
  }

  // 4. Check refining completion and deliver outputs
  try {
    if (newState.activeRefining) {
      const elapsed = (Date.now() - (newState.activeRefining.startedAtMs || 0)) / 1000;
      if (elapsed >= (newState.activeRefining.durationSeconds || 0)) {
        // Look up recipe to find outputs
        const { CHAIN_MAP } = require('./production-chains');
        const recipe = CHAIN_MAP.get(newState.activeRefining.recipeId);
        const resources = { ...(newState.resources || {}) };
        if (recipe) {
          resources[recipe.outputId] = (resources[recipe.outputId] || 0) + recipe.outputQuantity;
        }
        newState = { ...newState, activeRefining: null, resources };
      }
    }
  } catch (err) {
    console.error('Refining check error (non-fatal):', err);
  }

  // 5. Check building upgrade completion
  try {
    const upgradedBuildings = newState.buildings.map(bld => {
      if (!bld.upgradeStartedAtMs || !bld.upgradeDurationSeconds) return bld;
      const elapsed = (Date.now() - bld.upgradeStartedAtMs) / 1000;
      if (elapsed >= bld.upgradeDurationSeconds) {
        return {
          ...bld,
          upgradeLevel: (bld.upgradeLevel || 0) + 1,
          upgradeStartedAtMs: undefined,
          upgradeDurationSeconds: undefined,
        };
      }
      return bld;
    });
    if (upgradedBuildings !== newState.buildings) {
      newState = { ...newState, buildings: upgradedBuildings };
    }
  } catch (err) {
    console.error('Upgrade check error (non-fatal):', err);
  }

  // 6. Process ships (build, mine, transit, survey expeditions, fleet maintenance)
  try {
    if (newState.ships && newState.ships.length > 0) {
      const now = Date.now();
      const resources = { ...(newState.resources || {}) };
      let shipMoney = newState.money;
      let shipTotalSpent = newState.totalSpent;
      const wfBonuses = getWorkforceBonuses(newState.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 });
      const shipMiningMult = (1 + wfBonuses.miningOutput) * ((newState.prestige?.permanentBonuses?.miningMultiplier) || 1);
      const shipEvents: typeof newState.eventLog = [];
      const shipsToRemove: string[] = []; // For consumed survey probes

      const updatedShips = newState.ships.map(ship => {
        // Build completion
        if (!ship.isBuilt && ship.buildStartedAtMs && ship.buildDurationSeconds) {
          const elapsed = (now - ship.buildStartedAtMs) / 1000;
          if (elapsed >= ship.buildDurationSeconds) {
            return { ...ship, isBuilt: true, status: 'idle' as const, buildStartedAtMs: undefined, buildDurationSeconds: undefined };
          }
        }

        // Fleet maintenance (per built ship, per tick)
        if (ship.isBuilt) {
          const shipDef = SHIP_MAP.get(ship.definitionId);
          if (shipDef && shipDef.maintenancePerMonth > 0) {
            shipMoney -= shipDef.maintenancePerMonth;
            shipTotalSpent += shipDef.maintenancePerMonth;
          }
        }

        // Mining production (with workforce and prestige bonuses)
        if (ship.isBuilt && ship.status === 'mining' && ship.miningOperation) {
          const shipDef = SHIP_MAP.get(ship.definitionId);
          if (shipDef?.miningRate) {
            const resId = ship.miningOperation.resourceId;
            resources[resId] = (resources[resId] || 0) + Math.round(shipDef.miningRate * 0.5 * shipMiningMult);
          }
        }

        // Transit arrival — deliver cargo to destination
        if (ship.status === 'in_transit' && ship.route) {
          if (now >= ship.route.arrivalAtMs) {
            if (ship.route.cargo) {
              for (const [resId, qty] of Object.entries(ship.route.cargo)) {
                resources[resId] = (resources[resId] || 0) + qty;
              }
            }
            return { ...ship, status: 'idle' as const, currentLocation: ship.route.to, route: undefined };
          }
        }

        // Survey expedition completion — probe is consumed, discovery applied
        if (ship.isBuilt && ship.status === 'surveying' && ship.surveyExpedition) {
          const elapsed = (now - ship.surveyExpedition.startedAtMs) / 1000;
          if (elapsed >= ship.surveyExpedition.durationSeconds) {
            const { rollSurveyDiscovery } = require('./ships');
            const discovery = rollSurveyDiscovery(ship.surveyExpedition.targetLocation);
            if (discovery) {
              // Apply discovery rewards
              if (discovery.rewards.money) {
                shipMoney += discovery.rewards.money;
              }
              if (discovery.rewards.resources) {
                for (const [resId, qty] of Object.entries(discovery.rewards.resources)) {
                  resources[resId] = (resources[resId] || 0) + (qty as number);
                }
              }
              shipEvents.push({
                id: generateId(),
                date: newState.gameDate,
                type: 'random_event',
                title: `📡 Survey Discovery: ${discovery.title}`,
                description: discovery.description,
              });
              // TODO: Apply miningBonus to location (store in game state for duration)
            }
            // Probe is consumed after expedition
            shipsToRemove.push(ship.instanceId);
            return ship; // Will be filtered out below
          }
        }

        return ship;
      });

      // Remove consumed probes
      const finalShips = shipsToRemove.length > 0
        ? updatedShips.filter(s => !shipsToRemove.includes(s.instanceId))
        : updatedShips;

      newState = {
        ...newState,
        ships: finalShips,
        resources,
        money: shipMoney,
        totalSpent: shipTotalSpent,
        eventLog: shipEvents.length > 0
          ? [...shipEvents, ...newState.eventLog].slice(0, MAX_EVENT_LOG)
          : newState.eventLog,
      };
    }
  } catch (err) {
    console.error('Ship processing error (non-fatal):', err);
  }

  // 7. Check achievements (every 5 ticks to reduce overhead)
  try {
    const tickCount = Math.floor((newState.gameDate.year * 12 + newState.gameDate.month) % 5);
    if (tickCount === 0) {
      const earnedAchievements = newState.earnedAchievements || [];
      const newAchievements = checkAchievements(newState, earnedAchievements);
      if (newAchievements.length > 0) {
        const achievementEvents: typeof newState.eventLog = [];
        for (const ach of newAchievements) {
          achievementEvents.push({
            id: generateId(), date: newState.gameDate, type: 'milestone',
            title: `🎖️ Achievement: ${ach.name}`,
            description: ach.description,
          });
        }
        newState = {
          ...newState,
          earnedAchievements: [...earnedAchievements, ...newAchievements.map(a => a.id)],
          playerTitle: newAchievements.find(a => a.title)?.title || newState.playerTitle,
          eventLog: [...achievementEvents, ...newState.eventLog].slice(0, MAX_EVENT_LOG),
        };
      }
    }
  } catch (err) {
    console.error('Achievement check error (non-fatal):', err);
  }

  return newState;
}
