// ─── Space Tycoon: Save/Load System ─────────────────────────────────────────
// 200-cycle polish: initialize all game subsystems, persist NPC state,
// initialize prestige/workforce/milestones/achievements on load.

import type { GameState } from './types';
import { SAVE_KEY, SAVE_VERSION, STARTING_MONEY, STARTING_YEAR } from './constants';
import { createAllNPCs } from './npc-companies';
import { DEFAULT_LEGACY, LEGACY_MILESTONES, STRETCH_LEGACIES, getLegacyPower, getLegacyDisplayTier } from './legacy-system';
import type { LegacyState } from './legacy-system';
import { checkCorporationTier } from './corporation-tiers';
import { initializeFrontier } from './frontier';
import { DEFAULT_DOCTRINE } from './corporate-doctrine';

/** Create a fresh new game state */
export function getNewGameState(): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    lastTickAt: Date.now(),
    money: STARTING_MONEY,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: STARTING_YEAR, month: 1 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeResearch2: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    eventLog: [{
      id: 'start',
      date: { year: STARTING_YEAR, month: 1 },
      type: 'milestone',
      title: 'Company Founded',
      description: `Your space venture begins with $${(STARTING_MONEY / 1_000_000).toFixed(0)}M in funding. Build your first launch pad.`,
    }],
    stats: {
      rocketsLaunched: 0,
      satellitesDeployed: 0,
      stationsBuilt: 0,
      researchCompleted: 0,
      missionsToMoon: 0,
      missionsToMars: 0,
      missionsToOuterPlanets: 0,
    },
    npcCompanies: createAllNPCs(),
    npcMarketPressure: {},
    // Initialize all subsystems
    activeEffects: [],
    incomeHistory: [],
    pendingChoice: null,
    activeRefining: null,
    activeMarketEvents: [],
    claimedMilestones: {},
    earnedAchievements: [],
    playerTitle: null,
    ships: [],
    reports: [],
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, morale: 1.0, fatigue: 0, trainingLevel: 0.5, trainingBudgetPerCrew: 0 },
    // prestige: deleted in Wave F (prestige.ts removed; legacy-system.ts is
    // the permanent-progression system). New games no longer initialize it.
    completedContracts: [],
    activeContracts: [],
    // V3 fields
    availableBoosts: [],
    activeBoosts: [],
    servicePriceMultipliers: {},
    // V5 fields — mini-activities
    miniActivityCooldowns: {},
    // V6 fields — legacy system & corporation tiers
    legacy: { ...DEFAULT_LEGACY },
    corporationTier: 1,
    // V7 fields — megastructures & reputation
    megastructures: [],
    reputation: 0,
    // V9 fields — tutorial onboarding
    tutorialStep: 1,
    tutorialDismissed: false,
    // V10 fields — mining bonuses from survey probes
    miningBonuses: [],
    // V11 — Protected Frontier (new-player onramp shield)
    ...initializeFrontier(Date.now()),
    // V12 — Quarterly corporate reports
    quarterlyReports: [],
    // V13 — Interstellar era (expeditions.ts): expeditions, colonies, trade routes
    expeditions: [],
    interstellarColonies: [],
    interstellarTradeRoutes: [],
    // V14 — Audit Wave B: wired-bonus state (alliance/zones/espionage/leagues)
    zoneStandings: [],
    activeIntelPerks: [],
    claimedLeagueBoostSeasonIds: [],
    // V15 — Audit Waves D+E: risk pillar + market integrity.
    // Insurance defaults ON: hazards can now destroy assets (Wave D / A4), so
    // a fresh corporation starts covered; premiums are waived while in the
    // Protected Frontier, so the on-ramp stays gentle and the first premium
    // coincides with the first month hazards can actually strike.
    insuranceActive: true,
    hazardWarnings: [],
    pendingMarketFlows: { mined: {}, npc: {} },
    // V17 — Narrative Event Chains (4X Wave W4, narrative-events.ts)
    narrativeChains: [],
    chainHazardMitigationBonuses: [],
    unlockedRareTechIds: [],
    // V18 — Flagship Scientific Missions (4X Wave W6, science-missions.ts)
    scienceMissions: [],
    npcProgramContributions: [],
    // V19 — Leaders 2.0 (4X Wave W8, commanders.ts): xp/level/assignment
    // live ON each HiredCommander element, not as a new top-level array.
    // A fresh game has no hiredCommanders yet (undefined until the first
    // hire), and hireCommander() always stamps new hires with
    // { xp: 0, level: 1, assignment: null } — no default needed here.
    // V20 — Research Tree 2.0: doctrine gates + repeatable programs (4X
    // Waves W3+W10, research-tree.ts). No doctrine chosen yet / no
    // repeatable levels completed on a fresh game — matching "no doctrine
    // chosen = both sides available" and "repeatable starts at level 0".
    doctrineChoices: {},
    repeatableResearchLevels: {},
    // V21 — Accord Council Senate (4X Wave W11, accord-senate.ts): no
    // docket has published yet on a fresh game — the first quarter boundary
    // (processTick's advanceAccordSenate) publishes one.
    accordDocket: null,
    accordLobbying: [],
    accordVoteHistory: [],
    factionLicenses: [],
    // V22 — Corporate Doctrine & Board Politics (4X Wave W13,
    // corporate-doctrine.ts). Fresh corporations run every policy category
    // neutral (no bonus, no penalty) until the player makes a choice; the
    // board hasn't issued its first quarterly directive yet (seeded by the
    // first recordQuarterlyReport call). Constituency approval is NOT
    // initialized here — it's a pure derived selector, never persisted.
    corporateDoctrine: { ...DEFAULT_DOCTRINE },
    boardDirectives: [],
    // V23 — Cargo logistics + per-location inventory (4X Wave W14,
    // cargo-logistics.ts). Fresh games start with no remote stockpiles and
    // the grace ratchet OFF — production credits the global pool until the
    // first transport/tanker is built (then remote accrual goes local).
    locationInventories: {},
    logisticsUnlocked: false,
    // V24 — Live-Service Wave LS1 "Night Shift" (command-queue.ts,
    // standing-directives.ts, away-operations.ts). A fresh corporation has
    // no queued orders and no standing directives yet (both are opt-in, free
    // to configure — see the StandingOrdersPanel); no away catch-up has run.
    commandQueue: [],
    standingDirectives: [],
    awayLedger: null,
  };
}

/** Save game state to localStorage */
export function saveGame(state: GameState): boolean {
  try {
    const data = JSON.stringify({ ...state, lastTickAt: Date.now() });
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}

/** Load game state from localStorage — migrates missing fields */
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    if (!state || typeof state.version !== 'number') return null;

    // Restore NPCs from save, or create fresh if missing/corrupt
    if (!Array.isArray(state.npcCompanies) || state.npcCompanies.length === 0) {
      state.npcCompanies = createAllNPCs();
    }

    // Migrate missing fields (backwards compatibility)
    if (!state.npcMarketPressure) state.npcMarketPressure = {};
    if (!state.resources) state.resources = {};
    if (!state.activeEffects) state.activeEffects = [];
    if (!state.incomeHistory) state.incomeHistory = [];
    if (state.pendingChoice === undefined) state.pendingChoice = null;
    if (state.activeRefining === undefined) state.activeRefining = null;
    if (!state.activeMarketEvents) state.activeMarketEvents = [];
    if (!state.claimedMilestones) state.claimedMilestones = {};
    if (!state.earnedAchievements) state.earnedAchievements = [];
    if (!state.playerTitle) state.playerTitle = null;
    if (!state.ships) state.ships = [];
    if (!state.reports) state.reports = [];
    if (!state.workforce) state.workforce = { engineers: 0, scientists: 0, miners: 0, operators: 0 };
    if (!state.prestige) {
      state.prestige = {
        level: 0, legacyPoints: 0,
        permanentBonuses: { revenueMultiplier: 1, buildSpeedMultiplier: 1, researchSpeedMultiplier: 1, miningMultiplier: 1, startingMoney: STARTING_MONEY },
      };
    }
    if (!state.completedContracts) state.completedContracts = [];
    if (!state.activeContracts) state.activeContracts = [];
    // V3 fields — speed boosts and service pricing
    if (!state.availableBoosts) state.availableBoosts = [];
    if (!state.activeBoosts) state.activeBoosts = [];
    if (!state.servicePriceMultipliers) state.servicePriceMultipliers = {};
    // V4 fields — timed competitive events
    if (!state.activeTimedEvents) state.activeTimedEvents = [];
    if (!state.lastTimedEventSpawnMs) state.lastTimedEventSpawnMs = 0;
    // V5 fields — mini-activities (rotating slot system)
    if (!state.miniActivityCooldowns) state.miniActivityCooldowns = {};
    if (!state.miniActivitySlots) state.miniActivitySlots = [];
    if (!state.miniActivityLastSpawnMs) state.miniActivityLastSpawnMs = 0;

    // V6 fields — Legacy system & Corporation tiers
    if (!state.legacy) {
      // Migrate prestige -> legacy if player had prestige
      if (state.prestige && state.prestige.level > 0) {
        const prestigeLevel = state.prestige.level || 0;
        const milestonesPerPrestige = 4;
        const totalToGrant = Math.min(prestigeLevel * milestonesPerPrestige, 40);
        const milestonesToGrant: string[] = [];
        for (let i = 0; i < totalToGrant && i < LEGACY_MILESTONES.length; i++) {
          milestonesToGrant.push(LEGACY_MILESTONES[i].id);
        }

        // Convert legacy points into stretch legacy levels
        const legacyPoints = state.prestige.legacyPoints || 0;
        const totalStretchLevels = Math.floor(legacyPoints / 15);
        const stretchLevels: Record<string, number> = {};
        const stretchIds = STRETCH_LEGACIES.map(s => s.id);
        for (let i = 0; i < totalStretchLevels; i++) {
          const id = stretchIds[i % stretchIds.length];
          stretchLevels[id] = (stretchLevels[id] || 0) + 1;
        }

        const newLegacy: LegacyState = {
          completedMilestones: milestonesToGrant,
          stretchLevels,
          trackers: {
            totalResourcesMined: Object.values(state.resources || {}).reduce((a, b) => a + b, 0),
            totalContractsCompleted: (state.completedContracts || []).length,
            totalShipsBuilt: (state.ships || []).filter(s => s.isBuilt).length,
            totalBuildingsCompleted: state.buildings.filter(b => b.isComplete).length,
          },
          legacyPower: 0,
          displayTier: 'Pioneer',
        };
        newLegacy.legacyPower = getLegacyPower(newLegacy);
        newLegacy.displayTier = getLegacyDisplayTier(newLegacy);
        state.legacy = newLegacy;
      } else {
        // Fresh legacy state, initialize trackers from current game state
        state.legacy = {
          ...DEFAULT_LEGACY,
          trackers: {
            totalResourcesMined: Object.values(state.resources || {}).reduce((a, b) => a + b, 0),
            totalContractsCompleted: (state.completedContracts || []).length,
            totalShipsBuilt: (state.ships || []).filter(s => s.isBuilt).length,
            totalBuildingsCompleted: state.buildings.filter(b => b.isComplete).length,
          },
        };
      }
    }
    if (!state.corporationTier) {
      state.corporationTier = checkCorporationTier(state);
    }

    // V7 fields — megastructures & reputation
    if (!state.megastructures) state.megastructures = [];
    if (state.reputation === undefined || state.reputation === null) state.reputation = 0;
    // V8 fields — second research queue
    if (state.activeResearch2 === undefined) state.activeResearch2 = null;
    // V9 fields — tutorial onboarding
    if (state.tutorialStep === undefined) state.tutorialStep = 6; // Existing saves: skip tutorial (already playing)
    if (state.tutorialDismissed === undefined) state.tutorialDismissed = false;
    // V10 fields — mining bonuses from survey probes
    if (!state.miningBonuses) state.miningBonuses = [];
    // V12 fields — Quarterly corporate reports
    if (!state.quarterlyReports) state.quarterlyReports = [];
    // V13 fields — Interstellar era (expeditions, colonies, trade routes)
    if (!state.expeditions) state.expeditions = [];
    if (!state.interstellarColonies) state.interstellarColonies = [];
    if (!state.interstellarTradeRoutes) state.interstellarTradeRoutes = [];
    // V14 fields — Audit Wave B: wired-bonus state
    if (!state.zoneStandings) state.zoneStandings = [];
    if (!state.activeIntelPerks) state.activeIntelPerks = [];
    if (!state.claimedLeagueBoostSeasonIds) state.claimedLeagueBoostSeasonIds = [];
    // V14 morale migration (audit A10): the old default 0.8 was a hidden
    // -20% revenue tax with no writer. A save at exactly 0.8 (or unset) is
    // treated as the untouched default and lifted to the new 1.0 baseline.
    // (A managed crew that later drifts through exactly 0.800 would also be
    // bumped on reload — a rare, bounded, player-favoring edge we accept.)
    if (state.workforce) {
      if (state.workforce.morale === undefined || state.workforce.morale === 0.8) state.workforce.morale = 1.0;
      if (state.workforce.fatigue === undefined) state.workforce.fatigue = 0;
      if (state.workforce.trainingLevel === undefined) state.workforce.trainingLevel = 0.5;
      if (state.workforce.trainingBudgetPerCrew === undefined) state.workforce.trainingBudgetPerCrew = 0;
    }

    // V15 fields — Audit Waves D+E (risk pillar + market integrity)
    if (state.insuranceActive === undefined) {
      // Existing saves get coverage ON: Wave D makes hazards destructive and
      // an uninsured migration would be a silent downgrade. The premium sink
      // is announced once so it is never a hidden tax (BALANCE.md invariant
      // "transparent to the player"); opting out is a real decision the UI
      // wave surfaces via economic-sinks.setInsuranceActive.
      state.insuranceActive = true;
      state.eventLog = [{
        id: 'evt_v15_insurance',
        date: state.gameDate,
        type: 'random_event' as const,
        title: '🛡 Hazard insurance activated',
        description: 'Solar storms, impacts, raids, and equipment failures can now damage or destroy assets. Your corporation carries a policy: monthly premiums (0.5% of asset value + risk surcharges) buy payouts on catastrophic losses. Shielding modules, security crew, and structural tiers reduce damage.',
      }, ...(state.eventLog || [])].slice(0, 50);
    }
    if (!state.hazardWarnings) state.hazardWarnings = [];
    if (!state.pendingMarketFlows) state.pendingMarketFlows = { mined: {}, npc: {} };

    // V16 — Audit Wave F: prestige.ts (and refining.ts, research-generator.ts,
    // modular-construction.ts) deleted as dead/deprecated engines. The prestige
    // -> legacy conversion above (V6 block) already ran for any save that had
    // prestige progress and no legacy state yet, so `state.prestige` is safe
    // to strip now — nothing reads it anymore (corp tiers, victory conditions,
    // speed runs, and offline income all moved to Legacy Power). Additive-null:
    // the field stays optional on GameState for type compatibility with old
    // exported saves; this just clears it so it stops round-tripping forever.
    if (state.prestige !== undefined) {
      delete state.prestige;
    }

    // V17 fields — Narrative Event Chains (4X Wave W4, narrative-events.ts).
    // Additive-only: existing saves simply have no chains in progress yet;
    // the tick engine starts rolling for eligible chains from here on.
    if (!state.narrativeChains) state.narrativeChains = [];
    if (!state.chainHazardMitigationBonuses) state.chainHazardMitigationBonuses = [];
    if (!state.unlockedRareTechIds) state.unlockedRareTechIds = [];

    // V18 fields — Flagship Scientific Missions (4X Wave W6,
    // science-missions.ts). Additive-only: existing saves simply have no
    // programs running yet; the science tab unlocks per corp tier and the
    // tick engine starts processing from here on.
    if (!state.scienceMissions) state.scienceMissions = [];
    if (!state.npcProgramContributions) state.npcProgramContributions = [];

    // V19 fields — Leaders 2.0 (4X Wave W8, commanders.ts). Additive,
    // per-element migration (new sub-pattern vs V13-V18's whole-new-array
    // additions): existing hired commanders get xp 0 / level 1 / no
    // assignment, which is numerically IDENTICAL to the pre-W8 formula
    // (level 1 adds zero magnitude, unassigned earns zero trait bonus) —
    // a save reload never silently changes existing bonus totals.
    if (state.hiredCommanders) {
      state.hiredCommanders = state.hiredCommanders.map(h => ({
        ...h,
        xp: h.xp ?? 0,
        level: h.level ?? 1,
        assignment: h.assignment ?? null,
      }));
    }

    // V20 fields — Research Tree 2.0: doctrine gates + repeatable programs
    // (4X Waves W3+W10, research-tree.ts). Additive-only: an existing save
    // with neither field means no doctrine has been chosen yet (both sides
    // of every pair stay available — isDoctrineLocked reads
    // completedResearch directly, not this map) and no repeatable levels
    // have been completed yet (every repeatable starts fresh at level 0).
    if (!state.doctrineChoices) state.doctrineChoices = {};
    if (!state.repeatableResearchLevels) state.repeatableResearchLevels = {};

    // V21 fields — Accord Council Senate (4X Wave W11, accord-senate.ts).
    // Additive-only: an existing save with no docket yet just hasn't hit its
    // first quarter boundary since upgrading — processTick's
    // advanceAccordSenate publishes one on the next quarter-end tick exactly
    // like a fresh game would. No lobbying commitments, empty vote history,
    // no faction licenses purchased — nothing here changes existing bonus
    // totals on load.
    if (state.accordDocket === undefined) state.accordDocket = null;
    if (!state.accordLobbying) state.accordLobbying = [];
    if (!state.accordVoteHistory) state.accordVoteHistory = [];
    if (!state.factionLicenses) state.factionLicenses = [];

    // V22 fields — Corporate Doctrine & Board Politics (4X Wave W13,
    // corporate-doctrine.ts). Additive-only: an existing save with no
    // doctrine yet means every policy category is neutral (identical to a
    // fresh game — getDoctrineBonuses(undefined) already returns the
    // all-1.0/all-0 neutral set, so this migration doesn't even change
    // bonus totals, just gives the field a stable shape to write into). No
    // board directive history means the board hasn't set a target yet;
    // recordQuarterlyReport seeds one on the corporation's next quarterly
    // report exactly like a fresh game would.
    if (!state.corporateDoctrine) state.corporateDoctrine = { ...DEFAULT_DOCTRINE };
    if (!state.boardDirectives) state.boardDirectives = [];

    // V23 fields — Cargo logistics + per-location inventory (4X Wave W14,
    // cargo-logistics.ts, audit C1). Additive migration per the audit's
    // prescription: the global pool SEEDS the Earth/home inventory — i.e.
    // state.resources keeps its full contents and its meaning (Earth pool /
    // market pool), remote stockpiles simply start empty, and the
    // logisticsUnlocked ratchet starts false so production keeps crediting
    // the global pool ("existing behavior") until the corporation owns a
    // built transport/tanker — the tick engine then flips the ratchet and
    // remote production starts accruing locally. Nothing a pre-W14 save
    // owned moves, strands, or duplicates.
    if (!state.locationInventories) state.locationInventories = {};
    if (state.logisticsUnlocked === undefined) state.logisticsUnlocked = false;

    // V24 fields — Live-Service Wave LS1 "Night Shift" (docs/
    // LIVE_SERVICE_2026-08.md §LS1). Additive-only: an existing save with no
    // commandQueue/standingDirectives simply has nothing queued/automated
    // yet (numerically identical to a fresh game — an empty queue pops
    // nothing, zero active directives charge zero ops fee). awayLedger
    // starts null; the very next load computes one via
    // calculateAwayOperations if the player was away >= 30s.
    if (!state.commandQueue) state.commandQueue = [];
    if (!state.standingDirectives) state.standingDirectives = [];
    if (state.awayLedger === undefined) state.awayLedger = null;

    state.tickSpeed = 1; // Always 1x for fairness
    return state;
  } catch {
    return null;
  }
}

/** Delete saved game */
export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** Export save as base64 string */
export function exportSave(state: GameState): string {
  return btoa(JSON.stringify(state));
}

/** Import save from base64 string */
export function importSave(encoded: string): GameState | null {
  try {
    const state = JSON.parse(atob(encoded)) as GameState;
    if (!state || typeof state.version !== 'number') return null;
    return state;
  } catch {
    return null;
  }
}
