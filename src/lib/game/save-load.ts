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
import { DEFAULT_CORPORATE_ERAS } from './corporate-eras';
import { DEFAULT_CONSUMPTION_STATE, applyGrandfatherGrace } from './consumption';
import { getGlobalGameDate } from './server-time';
import { ONBOARDING_CHAIN_VERSION, ONBOARDING_DONE_STEP } from './onboarding';

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
    // V9 fields — tutorial onboarding (V41: 8-step objective chain, onboarding.ts)
    tutorialStep: 1,
    tutorialDismissed: false,
    onboardingChainVersion: ONBOARDING_CHAIN_VERSION,
    hasTradedOnMarket: false,
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
    // V25 — Live-Service Wave LS2 "Operations Debrief" (docs/
    // LIVE_SERVICE_2026-08.md §LS2). A fresh corporation has never lapsed,
    // so no Returning Commander track; mentorship bonuses arrive only via
    // the server sync hop (server-effects.ts), same pattern as
    // allianceBonuses — null until a sync response actually carries one.
    returningCommanderTrack: null,
    mentorshipBonuses: null,
    // V26 — Live-Service Wave LS4 "Corporate Eras" (docs/
    // LIVE_SERVICE_2026-08.md §LS4). A fresh corporation hasn't chartered an
    // era yet (Tier 3+ gate) — no active era, no completed eras, nothing to
    // publish to the Chronicle.
    corporateEras: { ...DEFAULT_CORPORATE_ERAS },
    // V27 — Live-Service Wave LS6 "Programs Queue" (docs/
    // LIVE_SERVICE_2026-08.md §LS6). A fresh corporation has no programs
    // queued yet (all three track queues empty, no cohort completions), no
    // retirement history, and no pending mentor boosts.
    programs: { queues: { crew_cohort: [], leader_development: [], rd_residency: [] }, completedCohortDefIds: [] },
    retiredLeaders: [],
    leaderMentorBoosts: [],
    // V28 — Live-Service Wave LS8 "Story Chapters" (docs/
    // LIVE_SERVICE_2026-08.md §LS8). A fresh corporation has no chapter
    // progress yet — the next tick's advanceStoryChapters call starts fresh
    // progress from the world's current calendar cycle.
    storyChapters: { current: null, history: [] },
    // V29 — Live-Service Wave LS9 "The Realignment" (docs/
    // LIVE_SERVICE_2026-08.md §LS9). A fresh save has never had a
    // Realignment epoch announced — the next tick's clock check announces
    // the current epoch exactly once, same as a save that just migrated in.
    lastSeenRealignmentEpoch: null,
    // V30 — Economic PvP Wave E2 "One Price Truth" (docs/
    // ECONOMY_PVP_2026-08.md §2.5). A fresh save holds no market snapshot yet
    // — the first authenticated sync delivers one; until then delivery
    // contracts and NPC settlement fall back to static baseMarketPrice
    // (identical to pre-E2 behavior).
    marketSnapshot: null,
    // V32 — Economic PvP Wave E3 "The Consumption Engine" (docs/
    // ECONOMY_PVP_2026-08.md §E3). Fresh games run recipes at FULL rate
    // (phaseInStartMonth null — the phase-in ramp is migration grace, not a
    // new-game mechanic; new corporations are Frontier-shielded anyway) and
    // anchor the world-month consumption cursor on their first tick
    // (lastProcessedMonth null → advanceConsumptionToMonth anchors without
    // retro-consuming).
    consumptionState: { ...DEFAULT_CONSUMPTION_STATE },
    // V33 — Economic PvP Wave E4 "Finite Demand Pools" (docs/
    // ECONOMY_PVP_2026-08.md §E4). A fresh save holds no pool snapshot yet —
    // the first authenticated sync delivers one; until then the tick uses
    // the deterministic local pool (own activity vs the authored NPC floor).
    // No phase-in for fresh games (pools are migration grace, not a
    // new-game mechanic; new corporations are Frontier-shielded anyway).
    demandPools: null,
    demandPoolPhaseInStartMonth: null,
    // V37 — Meaningful Decisions Wave M3 (docs/MEANINGFUL_2026-08.md §M3 —
    // finding F3). Fresh games get the new spot-linked mining formula at
    // full weight immediately — no grandfather blend needed (not a
    // migration penalty).
    miningPriceLinkPhaseInStartMonth: null,
    // V34 — Economic PvP Wave E5 "Depletion, Labor & Lanes" (docs/
    // ECONOMY_PVP_2026-08.md §E5). A fresh save holds no server snapshots
    // yet — the first authenticated sync delivers them; until then mining
    // runs at full deposit pressure (1.0), payroll at neutral wage index
    // (1.0), and freight at zero lane discount — identical to pre-E5
    // behavior. No pending flows to transmit either.
    extractionPressure: null,
    laborMarket: null,
    laneBonuses: null,
    pendingLaneUsage: {},
    // V35 — Economic PvP Wave E7 "Chokepoints, Tariffs & NPC Drives" (docs/
    // ECONOMY_PVP_2026-08.md §E7). A fresh save holds no server snapshots
    // yet — orbitalSlotOccupancy and megaProjectBonuses arrive only via the
    // authenticated sync hop (same "null until sync delivers one" pattern
    // as demandPools/mentorshipBonuses above); until then
    // computeOrbitalSlotReport falls back to 'low' occupancy and the tick
    // applies zero cooperative mega-project bonus — both identical to
    // pre-E7 behavior.
    orbitalSlotOccupancy: null,
    megaProjectBonuses: null,
    // V38 — Meaningful Decisions Wave M5 "Offense Toolkit I" (docs/
    // MEANINGFUL_2026-08.md §M5). A fresh save has never been targeted by
    // (or launched) an economic offense — the offense snapshot arrives only
    // via the authenticated sync hop (same "null until sync delivers one"
    // pattern as demandPools), no poach outcomes have been applied, and no
    // freight tolls are pending settlement.
    offense: null,
    appliedPoachOfferIds: [],
    pendingTollPayments: {},
    // V39 — Meaningful Decisions Wave M6 "Takeovers & the Share Registry"
    // (docs/MEANINGFUL_2026-08.md §M6). A fresh save holds no equity
    // snapshot yet — the first authenticated sync delivers one, and only
    // once the server-side population gate opens (TAKEOVER_MIN_ACTIVE_CORPS
    // active corporations); until then every consumer (Situation Log tender
    // alerts, calendar closings, the integration-malus multiplier) treats
    // the equity system as absent. Server-side truth (CorpShareRegistry et
    // al.) is created lazily after Frontier graduation, never stored in the
    // save.
    equity: null,
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

    // V25 fields — Live-Service Wave LS2 "Operations Debrief" (docs/
    // LIVE_SERVICE_2026-08.md §LS2). Additive-only: an existing save with no
    // returningCommanderTrack simply hasn't triggered one yet (the very next
    // load runs the lapse check the same way a fresh game never would);
    // mentorshipBonuses null means "no active mentorship pairing reported by
    // the last sync" — numerically identical to a fresh game (zero bonus).
    if (state.returningCommanderTrack === undefined) state.returningCommanderTrack = null;
    if (state.mentorshipBonuses === undefined) state.mentorshipBonuses = null;

    // V26 fields — Live-Service Wave LS4 "Corporate Eras" (docs/
    // LIVE_SERVICE_2026-08.md §LS4). Additive-only: an existing save with no
    // corporateEras simply has never chartered an era (numerically identical
    // to a fresh game — getActiveEraModifiers returns the neutral 1.0 set,
    // no completed eras means no legacy "era" milestones have fired yet).
    if (!state.corporateEras) state.corporateEras = { ...DEFAULT_CORPORATE_ERAS };
    if (!state.corporateEras.completedEras) state.corporateEras.completedEras = [];
    if (state.corporateEras.currentEra === undefined) state.corporateEras.currentEra = null;

    // V27 fields — Live-Service Wave LS6 "Programs Queue" (docs/
    // LIVE_SERVICE_2026-08.md §LS6). Additive-only: an existing save with no
    // programs state simply has never queued a training program (numerically
    // identical to a fresh game — getProgramWorkforceBonuses returns the
    // zero set, getEffectiveWorkforceForBonuses is a no-op with nothing
    // reserved). No retirement history and no pending mentor boosts either —
    // existing hired commanders simply aren't on the retirement clock yet
    // (assignedSinceMs is undefined on any pre-LS6 HiredCommander, which
    // isRetirementEligible already treats as "not currently assigned for
    // retirement purposes" even if `assignment` is set — the clock only
    // starts the next time assignCommander() runs).
    if (!state.programs) {
      state.programs = { queues: { crew_cohort: [], leader_development: [], rd_residency: [] }, completedCohortDefIds: [] };
    } else {
      if (!state.programs.queues) state.programs.queues = { crew_cohort: [], leader_development: [], rd_residency: [] };
      if (!state.programs.queues.crew_cohort) state.programs.queues.crew_cohort = [];
      if (!state.programs.queues.leader_development) state.programs.queues.leader_development = [];
      if (!state.programs.queues.rd_residency) state.programs.queues.rd_residency = [];
      if (!state.programs.completedCohortDefIds) state.programs.completedCohortDefIds = [];
    }
    if (!state.retiredLeaders) state.retiredLeaders = [];
    if (!state.leaderMentorBoosts) state.leaderMentorBoosts = [];

    // V28 fields — Live-Service Wave LS8 "Story Chapters" (docs/
    // LIVE_SERVICE_2026-08.md §LS8). Additive-only: an existing save with no
    // storyChapters simply has never tracked chapter progress yet
    // (numerically identical to a fresh game — the very next tick's
    // advanceStoryChapters call starts fresh progress from the world's
    // current calendar cycle; no consequence is lost by the field being
    // absent, since chapter acts only ever apply once actually resolved).
    if (!state.storyChapters) state.storyChapters = { current: null, history: [] };

    // V29 fields — Live-Service Wave LS9 "The Realignment" (docs/
    // LIVE_SERVICE_2026-08.md §LS9, coordination note: LS9 ran concurrently
    // with LS8 and originally targeted V28; LS8 claimed it first, so LS9
    // took V29 — see types.ts's matching field comment). Additive-only: an
    // existing save with no lastSeenRealignmentEpoch simply hasn't had a
    // Realignment epoch announced to it yet — numerically identical to a
    // fresh game (the next tick's clock check announces the CURRENT epoch,
    // never retroactively "catches up" on epochs the save missed while it
    // didn't exist).
    if (state.lastSeenRealignmentEpoch === undefined) state.lastSeenRealignmentEpoch = null;

    // V30 fields — Economic PvP Wave E2 "One Price Truth" (docs/
    // ECONOMY_PVP_2026-08.md §2.5). Additive-only: an existing save with no
    // marketSnapshot just hasn't received one from a sync yet (numerically
    // identical to a fresh game — spot consumers fall back to static
    // baseMarketPrice until the first authenticated sync populates it).
    if (state.marketSnapshot === undefined) state.marketSnapshot = null;

    // V31 — Economic PvP Wave E2 "Goods on the Book" (docs/
    // ECONOMY_PVP_2026-08.md §E2, [SAVE] note). Crafted products
    // (production-chains.ts CRAFTED_PRODUCT_IDS) are now first-class
    // RESOURCE_MAP/`state.resources` entries — tradeable on the shared
    // market exactly like any raw resource. `craftedProducts` predates that
    // promotion and is no longer written to (game-engine.ts's refining-
    // completion credit and the crafting sell path both target `resources`
    // now); this is a ONE-TIME move of any stockpile a save is still
    // carrying in the old field into the new one, additive
    // (`(resources[id]||0) + (craftedProducts[id]||0)`, so nothing is lost
    // or double-counted on repeated loads since craftedProducts is cleared
    // immediately after). `craftedProducts` itself is kept on the type as a
    // deprecated alias — CraftingPanel/page.tsx still merge it into their
    // "do I have enough inputs" checks — but after this migration runs once
    // it stays empty, so it costs nothing going forward.
    if (state.craftedProducts && Object.keys(state.craftedProducts).length > 0) {
      const merged = { ...(state.resources || {}) };
      for (const [resId, qty] of Object.entries(state.craftedProducts)) {
        if (typeof qty !== 'number' || !Number.isFinite(qty) || qty === 0) continue;
        merged[resId] = (merged[resId] || 0) + qty;
      }
      state.resources = merged;
      state.craftedProducts = {};
    } else if (!state.craftedProducts) {
      state.craftedProducts = {};
    }

    // V32 — Economic PvP Wave E3 "The Consumption Engine" (docs/
    // ECONOMY_PVP_2026-08.md §E3 [SAVE] + §7 grandfathering). Additive, with
    // an explicit grace program rather than a bare field-default: existing
    // saves get (a) a one-time 6-game-month input stockpile credited per
    // affected completed building, delivered into that building's own draw
    // pool, and (b) a 25%→100% recipe phase-in over 3 game-months anchored at
    // the CURRENT world month — so nobody's economy craters on update. The
    // consumption cursor also anchors at the current world month: months
    // before migration are never retro-billed. applyGrandfatherGrace mutates
    // in place (loadGame's house style) and posts the one-shot explainer
    // event, mirroring the V15 insurance announcement.
    if (!state.consumptionState) {
      applyGrandfatherGrace(state, getGlobalGameDate().totalMonths);
    }

    // V33 — Economic PvP Wave E4 "Finite Demand Pools" (docs/
    // ECONOMY_PVP_2026-08.md §E4 [SAVE] + §7). Additive with the same
    // grandfather ramp E3 used: existing saves anchor a 25%→100% pool
    // phase-in at the CURRENT world month, so service revenue shifts to the
    // finite-pool regime over 3 game-months instead of overnight (the
    // multiplier is also floored at 0.35 — nobody's economy craters). The
    // retired global log-decay multipliers are cleared so stale penalties
    // stop round-tripping forever; the pool snapshot itself arrives via the
    // next authenticated sync (until then: deterministic local pools,
    // which at migration-time capacity are ≥ the old decay for any real
    // save). One-shot explainer event mirrors the V15/V32 announcements.
    if (state.demandPools === undefined) {
      state.demandPools = null;
      state.demandPoolPhaseInStartMonth = getGlobalGameDate().totalMonths;
      state.servicePriceMultipliers = {};
      state.eventLog = [{
        id: 'evt_v33_demand_pools',
        date: state.gameDate,
        type: 'random_event' as const,
        title: '📊 Finite demand pools activated',
        description: 'Every service market now has a finite demand pool per location. Suppliers split the pool by capacity share — crowded markets pay less per instance (competitors take customers), underserved locations pay up to +25%. Pools phase in over the next 3 game months. See Market Intelligence → Demand for pool sizes, your share, and competitor pressure.',
      }, ...(state.eventLog || [])].slice(0, 50);
    }

    // V34 — Economic PvP Wave E5 "Depletion, Labor & Lanes" (docs/
    // ECONOMY_PVP_2026-08.md §E5 [SAVE] + §7). Additive, and — unlike E3/E4 —
    // needs NO grandfather phase-in ramp: every new snapshot field defaults
    // to the exact pre-E5 neutral value (extraction pressure 1.0 = untouched
    // deposit, wage index 1.0 = old constant-salary behavior, lane bonus
    // 0 = old flat fuel cost), so an existing save's economy is bit-for-bit
    // unchanged until the next authenticated sync actually delivers a
    // non-neutral server snapshot — the same "no phase-in for a neutral
    // default" precedent V30's marketSnapshot set. One-shot explainer event
    // mirrors the V15/V32/V33 announcements.
    if (state.extractionPressure === undefined) {
      state.extractionPressure = null;
      state.laborMarket = null;
      state.laneBonuses = null;
      state.pendingLaneUsage = {};
      state.eventLog = [{
        id: 'evt_v34_depletion_labor_lanes',
        date: state.gameDate,
        type: 'random_event' as const,
        title: '⛏ Deposit depletion, labor market & trade lanes activated',
        description: 'Mining deposits now show real extraction pressure — a deposit everyone strip-mines thins for everyone, recovering over time. Crew wages respond to server-wide hiring demand and the housing you build. Repeated freight routes earn a fuel discount (up to −15%) that fades if the lane goes quiet. See the Mining, Workforce, and Logistics map layer for details.',
      }, ...(state.eventLog || [])].slice(0, 50);
    }
    if (!state.pendingMarketFlows) state.pendingMarketFlows = { mined: {}, npc: {}, minedByLocation: {}, shock: {} };
    if (!state.pendingMarketFlows.minedByLocation) state.pendingMarketFlows.minedByLocation = {};
    if (!state.pendingMarketFlows.shock) state.pendingMarketFlows.shock = {};

    // V35 — Economic PvP Wave E7 "Chokepoints, Tariffs & NPC Drives" (docs/
    // ECONOMY_PVP_2026-08.md §E7 [SAVE]). Additive, no grandfather phase-in
    // needed: orbitalSlotOccupancy defaults to null (spatial-strategy.ts's
    // computeOrbitalSlotReport falls back to 'low' bucket — identical to
    // pre-E7 behavior) and megaProjectBonuses defaults to null (zero tick
    // bonus, identical to pre-E7 — permanentBonus was display-only before
    // this wave regardless). Both populated only once the next authenticated
    // sync delivers a real snapshot. One-shot explainer mirrors the
    // V15/V32/V33/V34 announcements.
    if (state.orbitalSlotOccupancy === undefined) {
      state.orbitalSlotOccupancy = null;
      state.megaProjectBonuses = null;
      state.eventLog = [{
        id: 'evt_v35_chokepoints_tariffs_npc_drives',
        date: state.gameDate,
        type: 'random_event' as const,
        title: '🛰 Orbital-slot auctions, faction tariffs & NPC procurement drives activated',
        description: 'Saturated orbital-slot pools now require winning a sealed-bid lease auction to build further — proceeds are burned, and zone governors earn a revenue share. Faction realignment postures now bite: trades and NPC contracts crossing a faction\'s governed economy carry a real tariff, and standing with that faction shifts your broker fee. NPC companies publish forecastable procurement drives — public reverse auctions any player can underbid to fill. See Spatial Strategy → Orbital Slots and the Contracts board.',
      }, ...(state.eventLog || [])].slice(0, 50);
    } else if (state.megaProjectBonuses === undefined) {
      // Defensive: a save that somehow got orbitalSlotOccupancy without
      // megaProjectBonuses (shouldn't happen via this migration, but keeps
      // the invariant "every V35 field is defined" bulletproof).
      state.megaProjectBonuses = null;
    }

    // V36 — Meaningful Decisions Wave M2 "The Exit Decision" (docs/
    // MEANINGFUL_2026-08.md §M2 / finding F5). Additive-only, no migration
    // code needed: BuildingInstance.status is optional and every read site
    // (mothball.ts's isBuildingOperational, consumption.ts, game-engine.ts
    // §1/§2/§6, service-pricing.ts's local pool, away-operations.ts) treats
    // an absent status as 'active' — an existing save's buildings are
    // bit-for-bit unchanged on load. mothballedAtMonth/reactivationStartMonth
    // /decommissionCompletesAtMonth are likewise optional and only ever
    // written by the new mothballBuilding/reactivateBuilding/
    // decommissionBuilding actions. This comment documents the version bump
    // per the wave's [SAVE] note; there is nothing to default.

    // V37 — Meaningful Decisions Wave M3 "Demand Grows With the Economy"
    // (docs/MEANINGFUL_2026-08.md §M3 — finding F3, "price-linked mining").
    // Existing saves anchor a 50/50 old-flat/new-spot-linked blend of
    // mining_output revenue for 3 game-months from migration, then switch
    // fully — mirrors the V33/E4 grandfather precedent, but a flat 50%
    // blend rather than a ramp (mining-pricing.ts's own header explains
    // why: the new formula already reproduces the old flat number at
    // neutral spot/pressure/bonus conditions, so a fixed damper covers the
    // migration-moment risk without needing a multi-step ramp). F6's
    // derived-demand rebase (demand-pools.ts) needs no migration flag at
    // all — DERIVED_DEMAND_RATES is read fresh every aggregation, so an
    // existing save picks up the new coefficients on its very next pool
    // sync with no field to default. One-shot explainer mirrors the
    // V15/V32/V33/V34/V35 announcements.
    if (state.miningPriceLinkPhaseInStartMonth === undefined) {
      state.miningPriceLinkPhaseInStartMonth = getGlobalGameDate().totalMonths;
      state.eventLog = [{
        id: 'evt_v37_price_linked_mining',
        date: state.gameDate,
        type: 'random_event' as const,
        title: '⛏ Mining revenue now tracks the live market',
        description: 'Mining service income now values what you actually extract at the live spot price instead of a fixed monthly rate — a commodity crash bites your mining income, and a shortage pays a premium. Extraction pressure and mining bonuses now move cash revenue directly. Blends in gradually over the next 3 game months so nobody\'s income craters overnight.',
      }, ...(state.eventLog || [])].slice(0, 50);
    }

    // V38 — Meaningful Decisions Wave M5 "Offense Toolkit I" (docs/
    // MEANINGFUL_2026-08.md §M5 / §3.2 [SAVE]). Additive: the offense
    // snapshot defaults to null (no offense state until the next
    // authenticated sync delivers one — pre-M5 behavior exactly), the poach
    // idempotency cursor starts empty (nothing has been applied), and no
    // freight tolls are pending. One-shot explainer mirrors the
    // V15/V32-V35/V37 announcements.
    if (state.appliedPoachOfferIds === undefined) {
      state.appliedPoachOfferIds = [];
      state.offense = state.offense ?? null;
      state.pendingTollPayments = state.pendingTollPayments ?? {};
      state.eventLog = [{
        id: 'evt_v38_offense_toolkit',
        date: state.gameDate,
        type: 'random_event' as const,
        title: '⚔ Economic offense toolkit activated',
        description: 'Corporations can now declare public price campaigns (dumping) on a commodity market, poach rival crew with escrowed signing bonuses (48h counteroffer window — watch your Situation Log), buy standing-order demand intelligence, and zone governors can levy small freight tolls. Every offensive act is public, costs real money, has documented counterplay, and never touches Protected Frontier corporations.',
      }, ...(state.eventLog || [])].slice(0, 50);
    }

    // V39 — Meaningful Decisions Wave M6 "Takeovers & the Share Registry"
    // (docs/MEANINGFUL_2026-08.md §M6 [SAVE]). Additive, no grandfather
    // phase-in needed: the equity snapshot defaults to null — the exact
    // pre-M6 "no equity system" behavior — and stays null until BOTH the
    // next authenticated sync AND the server-side population gate
    // (TAKEOVER_MIN_ACTIVE_CORPS) open the market. No one-shot explainer
    // here: the announcement belongs to the moment the gate actually opens
    // (the Situation Log emits it from the first non-null snapshot), not to
    // the code shipping — a dormant system shouldn't advertise itself.
    if (state.equity === undefined) {
      state.equity = null;
    }

    // V40 — shared contract-completion cap (founder follow-up 8/16): legacy
    // CONTRACT_POOL completions now count against the same rolling-24h daily
    // budget as delivery contracts. Additive: existing saves start with an
    // empty stamp list (their historical legacy completions have no
    // timestamps — the window starts fresh, which only ever UNDER-counts).
    if (state.legacyContractCompletionsAt === undefined) {
      state.legacyContractCompletionsAt = [];
    }

    // V41 — FTUE objective chain v2 (onboarding.ts, simulated-newcomer audit
    // 8/16). The old 5-step tutorial used "6 = done" as its sentinel; the new
    // 8-step chain's done sentinel is ONBOARDING_DONE_STEP. One-time bump:
    // any un-migrated save at/past the OLD sentinel is finished onboarding
    // (never re-show a longer tutorial to a veteran); a save mid-old-tutorial
    // (1-5) keeps its position — the new chain's steps 1-5 cover the same
    // build/income/research ground and its detections fast-forward anything
    // already done. onboardingChainVersion guards re-runs so a save
    // legitimately on NEW steps 6-8 is never bumped.
    if (state.onboardingChainVersion !== ONBOARDING_CHAIN_VERSION) {
      if ((state.tutorialStep ?? 0) >= 6) state.tutorialStep = ONBOARDING_DONE_STEP;
      state.onboardingChainVersion = ONBOARDING_CHAIN_VERSION;
    }
    if (state.hasTradedOnMarket === undefined) state.hasTradedOnMarket = false;

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
