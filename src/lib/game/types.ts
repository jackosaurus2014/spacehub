// ─── Space Tycoon: Type Definitions ─────────────────────────────────────────

// W8 (Leaders 2.0): type-only import — commanders.ts imports `type { GameState }`
// from this file, so this is a type-only circular reference (erased at
// compile time, safe). Keeps HiredCommander/CommanderPool defined in one
// place instead of drifting inline copies.
import type { HiredCommander, CommanderPool } from './commanders';

// W13 (Corporate Doctrine & Board Politics): same type-only circular-import
// pattern as commanders.ts above — corporate-doctrine.ts imports `type {
// GameState }` from this file, erased at compile time.
import type { CorporateDoctrineState, BoardDirective } from './corporate-doctrine';

// E2 (One Price Truth): type-only import of the bounded market snapshot the
// server sends each sync. spot-price.ts is a pure module (price-band only),
// so this is a compile-time-erased edge — no runtime cycle.
import type { MarketSnapshot } from './spot-price';

// E4 (Finite Demand Pools): type-only import of the per-(location, category)
// demand-pool snapshot the sync route delivers — same pattern as
// MarketSnapshot above (demand-pools.ts never value-imports types.ts).
import type { DemandPoolSnapshot } from './demand-pools';

// E5 (Depletion, Labor & Lanes): type-only imports of the three new
// server-shared snapshots this wave delivers via sync — same compile-time-
// erased pattern as MarketSnapshot/DemandPoolSnapshot above.
import type { ExtractionPressureSnapshot } from './extraction-pressure';
import type { LaborMarketSnapshot } from './labor-market';
import type { LaneBonusSnapshot } from './trade-lanes';

export interface GameDate {
  year: number;
  month: number; // 1-12
}

export type TickSpeed = 0 | 1 | 2 | 5 | 10;

// ─── Buildings ──────────────────────────────────────────────────────────────

export type BuildingCategory =
  | 'launch_pad'
  | 'rocket'
  | 'satellite'
  | 'space_station'
  | 'fabrication_facility'
  | 'datacenter'
  | 'mining_enterprise'
  | 'ground_station'
  | 'solar_farm';

export type BuildingSynergyRange = 'location' | 'body' | 'system';

/**
 * Comprehensive building stats per STATS_DESIGN.md Phase I. Derived from
 * category + tier when not set explicitly. Populated with sensible defaults
 * by getBuildingDerivedStats.
 */
export interface BuildingDerivedStats {
  // Capacity & throughput
  dockingCapacity: number;
  storageCapacity: number;          // m³
  manufacturingThroughput: number;  // modules/game-month
  refiningThroughput: number;       // units/game-month
  marketLiquidityContribution: number;  // contributes to location market depth
  // Service quality
  serviceQualityMultiplier: number; // 0.5-2.0
  customerCapacity: number;
  uplinkBandwidth: number;          // Gbps
  // Crew
  crewQuarters: number;
  crewMoraleModifier: number;       // 0-1
  // Hazard resilience
  structuralIntegrity: number;
  shieldingRating: number;          // 0-0.9
  stabilityRating: number;          // 0-1
  // Network
  synergyTags: string[];
  synergyRange: BuildingSynergyRange;
  // Upgrade path
  maxUpgradeLevel: number;
}

/**
 * Construction Purposes wave (docs/CONSTRUCTION_PURPOSES_2026-08.md):
 * non-revenue purposes a building contributes to EXISTING systems. Every
 * field is a real modifier consumed by an existing formula — no parallel
 * mechanics. All fractional fields are additive per completed, operational
 * building copy and capped centrally in building-capabilities.ts
 * (CAPABILITY_CAPS), so stacking copies has bounded returns and the risk /
 * balance pillars stay intact. Absent field = 0 (pre-wave behavior exactly).
 */
export interface BuildingCapabilities {
  /** LOCATION-scoped: extra hazard mitigation for every asset (building or
   *  ship) at this building's location — hazards.ts getBuilding/
   *  ShipHazardMitigation, under the global MITIGATION_CAP. */
  hazardShielding?: number;
  /** LOCATION-scoped: reduces the inventory loss fraction when solar storms /
   *  pirate raids destroy location stock (hazards.ts
   *  rollLocationInventoryShocks). Hardened storage. */
  inventoryProtection?: number;
  /** LOCATION-scoped: freight fuel discount when this building sits at a
   *  dispatch's origin or destination (cargo-logistics.ts getFreightFuelCost).
   *  Propellant infrastructure = cheaper logistics. */
  logisticsSupport?: number;
  /** GLOBAL: raises the chance rival espionage against you is detected
   *  (espionage-system.ts executeEspionageAction — tracking/sensor network). */
  detectionBonus?: number;
  /** GLOBAL: shortens LS6 training/leader program durations
   *  (programs.ts enqueueProgram). */
  trainingSpeed?: number;
  /** GLOBAL: adds to the away-efficiency investment bonus
   *  (away-operations.ts getAwayEfficiencyInvestmentBonus) — autonomous ops. */
  awayAutomation?: number;
  /** GLOBAL: reduces interstellar-expedition transit hazard damage
   *  (expeditions.ts processExpeditionTick — deep-space support network). */
  expeditionSupport?: number;
  /** GLOBAL: amplifies positive faction reputation gains
   *  (factions.ts shiftReputation — stations host diplomatic missions). */
  diplomacy?: number;
  /** GLOBAL: multiplies research speed (game-engine.ts research queues —
   *  orbital compute runs simulations). */
  researchSpeed?: number;
  /** GLOBAL: extra crew capacity headcount (workforce.ts getCrewCapacity —
   *  habitats house crew). Integer, additive per copy. */
  crewQuarters?: number;
  /** GLOBAL: extra shipyard construction slots (shipyard-slots.ts —
   *  counted once per definition, MAX_SHIPYARD_SLOTS still binds). */
  shipyardSlots?: number;
}

export interface BuildingDefinition {
  id: string;
  name: string;
  category: BuildingCategory;
  description: string;
  /** Detailed tooltip explaining gameplay purpose, when to build, revenue, and strategy */
  tooltip?: string;
  baseCost: number;
  buildTimeMonths: number;
  maintenanceCostPerMonth: number;
  requiredResearch: string[];
  requiredLocation: string;
  enabledServices: string[];
  tier: number;
  /** Real-time seconds to build (wall clock). Tier 1 ≈ 5 min, max ≈ 24 hr */
  realBuildSeconds: number;
  /** Resource costs to build (in addition to money). Optional for tier 1. */
  resourceCost?: Record<string, number>;
  /** Power required to operate this building (MW). 0 or undefined = no power needed. */
  powerRequired?: number;
  /** Power generated by this building (MW). Solar farms and power plants set this. */
  powerGenerated?: number;
  /** Early-fab wave (2026-08-31): hard per-corporation cap on how many of
   *  this building a single player may own across ALL locations (complete +
   *  under construction). Absent = uncapped (the 1.15^n cost curve remains
   *  the only brake). First user: fabrication_earth (max 1 — Earth-side
   *  industry is politically capped; expansion means going to orbit). */
  maxPerPlayer?: number;
  /** Wave E3 "Consumption Engine" (docs/ECONOMY_PVP_2026-08.md §2.2/§E3):
   *  ongoing monthly inputs this building draws from its LOCATION inventory
   *  (home cluster → the global pool; remote → local stockpile per
   *  cargo-logistics.ts rules). Shortfall degrades the building to a 0.5
   *  efficiency soft floor — it browns out, it never hard-stops. Absent =
   *  pre-E3 behavior (no consumption). Fractional values allowed
   *  (satellite-bus attrition 0.05-0.1/mo). */
  consumesPerMonth?: Record<string, number>;
  /** Wave E3: direct monthly outputs (propellant plants, agri domes,
   *  refineries) credited to the building's location pool, scaled by supply
   *  efficiency and the migration phase-in. Absent = no direct output. */
  producesPerMonth?: Record<string, number>;
  /** Phase I: optional per-building overrides for any derived stats.
   *  Values not specified here are filled in by category+tier defaults. */
  stats?: Partial<BuildingDerivedStats>;
  /** Construction Purposes wave: non-revenue purposes wired into existing
   *  formulas (see BuildingCapabilities doc + building-capabilities.ts). */
  capabilities?: BuildingCapabilities;
}

export interface BuildingInstance {
  instanceId: string;
  definitionId: string;
  locationId: string;
  buildStartDate: GameDate;
  completionDate: GameDate;
  isComplete: boolean;
  /** Unix ms timestamp when construction started (real clock) */
  startedAtMs: number;
  /** Real-time seconds required for this instance */
  realDurationSeconds: number;
  /** Building upgrade level: 0=Standard, 1=Advanced, 2=Elite */
  upgradeLevel?: number;
  /** If currently upgrading, when it started and how long */
  upgradeStartedAtMs?: number;
  upgradeDurationSeconds?: number;
  /** V15 (audit Wave D / A4): persistent hazard damage 0-0.85. Penalizes the
   *  revenue of services this building enables until auto-repair (a
   *  repair-cost money sink in game-engine) works it back to 0. */
  damagePct?: number;
  /** Wave E3 (§2.2 "auto-procurement" — the founder's vertical-integration-
   *  vs-market pillar): per-building sourcing policy for consumesPerMonth
   *  inputs. 'local' (default when absent) = supply from own production /
   *  freighted stock only — zero cash cost, full logistics burden, runs
   *  degraded when short. 'market' = monthly shortfalls become server-side
   *  standing buy orders on the shared book (real MarketLimitOrder rows other
   *  players can see, front-run, and supply) at live spot + 2% fee. */
  supplyPolicy?: 'local' | 'market';
  /** Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5, "the exit
   *  decision"): operating status. Absent/'active' = normal operation.
   *  'mothballed' = paused: zero revenue, zero consumption/production, 25%
   *  maintenance — the "market turned, park it" tool. 'reactivating' =
   *  mothball toggled back on, spinning up (still zero revenue/consumption,
   *  still 25% maintenance) until `reactivationStartMonth` + the spin-up
   *  window elapses, then flips to 'active' automatically.
   *  'decommissioning' = scrap in progress (T3+ buildings only — T1/T2 scrap
   *  instantly and are simply removed, never reach this state): zero
   *  revenue/consumption, 25% maintenance, until `decommissionCompletesAtMonth`
   *  elapses, then the building (and its linked service) is removed and
   *  scrap recovery is credited. Server world-month grid throughout (same
   *  clock consumption.ts/hazards.ts key off), not the player's personal
   *  gameDate — see mothball.ts's header. */
  status?: 'active' | 'mothballed' | 'reactivating' | 'decommissioning';
  /** World-month index (server clock) the building was last mothballed at.
   *  Display-only (Situation Log "mothballed since"); not read by any math. */
  mothballedAtMonth?: number;
  /** World-month index (server clock) reactivation began — set by
   *  reactivateBuilding, cleared once status flips back to 'active'. */
  reactivationStartMonth?: number;
  /** World-month index (server clock) at which a T3+ decommission's teardown
   *  finishes and scrap recovery is credited — set by decommissionBuilding. */
  decommissionCompletesAtMonth?: number;
}

// ─── Research ───────────────────────────────────────────────────────────────

export type ResearchCategory =
  | 'rocketry'
  | 'spacecraft'
  | 'sensors'
  | 'ai_chips'
  | 'satellite_components'
  | 'solar_arrays'
  | 'mining'
  | 'infrastructure'
  | 'propulsion'
  | 'crew'
  | 'services'
  | 'ships'
  | 'terraforming'
  | 'materials'
  | 'defense'
  | 'exploration'
  | 'economy';

/**
 * The mechanical bonus buckets an authored research effect can target.
 * Six original buckets (buildCost..maintenance) plus six added by the
 * 4X_BASELINE_2026-08.md Part 2a / W1 "research effect-authoring pass":
 * travelSpeed, fuelEfficiency, insuranceDiscount, hazardResistance,
 * crewMorale, expeditionRisk. See research-tree.ts's `getResearchBonuses`
 * for aggregation/caps and `game-engine.ts` for which buckets are actually
 * multiplied into gameplay math today (fuelEfficiency is consumed by
 * cargo-logistics.ts freight pricing as of wave W14; expeditionRisk is
 * declared/aggregated but not yet consumed — see comments there).
 */
export type ResearchEffectType =
  | 'buildCost'          // reduces building construction cost
  | 'buildSpeed'         // speeds up construction
  | 'mining'             // increases mining yield
  | 'revenue'            // increases service revenue
  | 'research'           // increases research speed
  | 'maintenance'        // reduces maintenance / operating cost
  | 'travelSpeed'        // reduces ship transit time (transitSpeedMult)
  | 'fuelEfficiency'     // reduces freight fuel bills (wired: cargo-logistics.ts, wave W14)
  | 'insuranceDiscount'  // reduces monthly insurance premium
  | 'hazardResistance'   // reduces hazard damage beyond ship/building mitigation
  | 'crewMorale'         // raises workforce morale
  | 'expeditionRisk'     // reduces interstellar-expedition hazard damage
  | 'consumptionReduction'; // Wave E3 (§4.1): reduces building recipe input draw (consumption.ts; cap 0.40 per §4.1)

export interface ResearchEffect {
  type: ResearchEffectType;
  /** Decimal fraction (0-1). 0.15 = 15%. Capped at 0.30 per effect (research-tree.ts
   *  PER_EFFECT_CAP) to prevent hyperbolic flavor text from producing broken bonuses. */
  magnitude: number;
}

export interface ResearchDefinition {
  id: string;
  name: string;
  category: ResearchCategory;
  description: string;
  effect: string;
  baseCostMoney: number;
  baseTimeMonths: number;
  prerequisites: string[];
  tier: number;
  unlocks: string[];
  /** Real-time seconds to research (wall clock). Tier 1 ≈ 10 min, max ≈ 24 hr */
  realResearchSeconds: number;
  /** Resource costs for research (optional, primarily tier 3+) */
  resourceCost?: Record<string, number>;
  /**
   * Hand-authored mechanical effects. When present (all 254 techs as of the
   * W1 effect-authoring pass), this is used as-is by `resolveEffects()` and
   * takes precedence over the flavor-text keyword parser. Absent only for
   * mod/legacy content that predates authoring — the parser remains as a
   * fallback for that case (research-tree.ts `inferEffectsFromFlavor`).
   */
  effects?: ResearchEffect[];

  // ─── W3/W10 (4X_BASELINE_2026-08.md Part 2a Op4/Op5) ─────────────────────

  /**
   * MoO2-style mutually exclusive doctrine pick (Op4). Ids of research(es)
   * that become doctrine-locked once THIS research completes (and
   * vice-versa — every pair authors `excludes` symmetrically on both
   * sides). A locked research is still visible and still researchable, but
   * only at the Op4 override price: 2x baseCostMoney + a 6-month retooling
   * surcharge (research-tree.ts `getDoctrineOverrideCost`). Checked in
   * `isDoctrineLocked` / `canResearch` call sites, not enforced by
   * `resolveEffects` — this field only gates the research UI's start
   * button, it doesn't change what the tech does once researched.
   */
  excludes?: string[];

  /** Groups this research with its doctrine sibling(s) for display/history
   *  purposes (GameState.doctrineChoices is keyed by this). Present iff
   *  `excludes` is present. */
  doctrineGroup?: string;

  /**
   * Op5 rare tech: hidden from the research tree entirely until its id
   * appears in GameState.unlockedRareTechIds (granted by narrative-events.ts
   * chain payoffs or science-missions.ts program discoveries — the W4/W6
   * grant channel). research-tree.ts `isRareTechVisible` is the single
   * visibility check; ResearchPanel and canResearch both call it.
   */
  rare?: boolean;

  /**
   * Op5 bounded repeatable program (~6 in the tree, 5 levels each). When
   * set, completing this research does NOT push its id into
   * completedResearch (which would permanently hide it) — instead
   * GameState.repeatableResearchLevels[id] increments, and the research
   * re-arms for another level at an escalated cost, up to maxLevel.
   * effectPerLevel is summed once per completed level (not multiplied by
   * itself) inside getResearchBonuses' existing aggregate caps.
   */
  repeatable?: {
    /** Doc: 5 levels per program. */
    maxLevel: number;
    /** Granted once per completed level; doc: "+2% per level". */
    effectPerLevel: ResearchEffect[];
    /** Doc: "Cost scales x2.5/level" — next level's money cost is
     *  baseCostMoney * costMultiplierPerLevel^(levels already completed). */
    costMultiplierPerLevel: number;
  };
}

export interface ActiveResearch {
  definitionId: string;
  startDate: GameDate;
  progressMonths: number;
  totalMonths: number;
  /** Unix ms timestamp when research started (real clock) */
  startedAtMs: number;
  /** Real-time seconds required */
  realDurationSeconds: number;
}

// ─── Services ───────────────────────────────────────────────────────────────

export type ServiceType =
  | 'sensor_service'
  | 'telecom_service'
  | 'ai_datacenter'
  | 'launch_payload'
  | 'mining_output'
  | 'tourism'
  | 'fabrication_output';

export interface ServiceDefinition {
  id: string;
  name: string;
  type: ServiceType;
  description: string;
  revenuePerMonth: number;
  requiredBuildings: string[];
  requiredResearch: string[];
  operatingCostPerMonth: number;
  tier: number;
}

export interface ServiceInstance {
  definitionId: string;
  locationId: string;
  linkedBuildingIds: string[];
  startDate: GameDate;
  revenueMultiplier: number;
}

// ─── Solar System ───────────────────────────────────────────────────────────

export type LocationType =
  | 'earth_surface'
  | 'earth_orbit'
  | 'moon'
  | 'mars'
  | 'asteroid_belt'
  | 'jupiter'
  | 'saturn'
  | 'outer_system'
  | 'mercury'
  | 'venus'
  | 'uranus'
  | 'neptune';

export interface SolarSystemLocation {
  id: string;
  name: string;
  type: LocationType;
  description: string;
  distanceFromEarthAU: number;
  deltaVFromLEO: number;
  travelTimeMonths: number;
  unlockCost: number;
  requiredResearch: string[];
  availableBuildings: string[];
  tier: number;
}

// ─── Reports / Mail ─────────────────────────────────────────────────────────

export type ReportType = 'probe_discovery' | 'system_alert' | 'milestone';

export interface GameReport {
  id: string;
  type: ReportType;
  title: string;
  body: string;
  createdAt: number; // timestamp ms
  read: boolean;
  locationId?: string;
  rewards?: {
    money?: number;
    resources?: Record<string, number>;
    miningBonus?: { locationId: string; resourceId: string; bonusPct: number; durationMonths: number };
  };
}

// ─── Events ─────────────────────────────────────────────────────────────────

export type GameEventType =
  | 'build_complete'
  | 'research_complete'
  | 'service_started'
  | 'location_unlocked'
  | 'milestone'
  | 'random_event'
  | 'npc_activity';

export interface GameEvent {
  id: string;
  date: GameDate;
  type: GameEventType;
  title: string;
  description: string;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface GameStats {
  rocketsLaunched: number;
  satellitesDeployed: number;
  stationsBuilt: number;
  researchCompleted: number;
  missionsToMoon: number;
  missionsToMars: number;
  missionsToOuterPlanets: number;
}

// ─── Game State ─────────────────────────────────────────────────────────────

export interface GameState {
  version: number;
  createdAt: number;
  lastTickAt: number;

  money: number;
  totalEarned: number;
  totalSpent: number;

  gameDate: GameDate;
  tickSpeed: TickSpeed;

  buildings: BuildingInstance[];
  completedResearch: string[];
  activeResearch: ActiveResearch | null;
  activeResearch2?: ActiveResearch | null; // Second queue, unlocked via 'parallel_research'
  activeServices: ServiceInstance[];
  unlockedLocations: string[];
  resources: Record<string, number>; // ResourceId → quantity

  /** Active mining bonuses from survey probe discoveries */
  miningBonuses?: { locationId: string; resourceId: string; bonusPct: number; expiresAtMonth: number }[];

  eventLog: GameEvent[];
  reports?: GameReport[];
  stats: GameStats;

  // Multiplayer (synced to server)
  companyName?: string;
  lastSyncAt?: number;

  // NPC companies (NPCCompanyState defined in npc-companies.ts)
  // Using inline shape to avoid circular import issues with webpack
  npcCompanies?: {
    id: string;
    name: string;
    strategy: 'aggressive' | 'balanced' | 'conservative';
    money: number;
    totalEarned: number;
    totalSpent: number;
    currentTier: number;
    completedResearch: string[];
    activeServiceIds: string[];
    unlockedLocations: string[];
    resources: Record<string, number>;
    buildingCount: number;
    monthsPlayed: number;
    progressionSpeed: number;
    riskTolerance: number;
    miningFocus: number;
    sellThreshold: number;
  }[];
  npcMarketPressure?: Record<string, number>;

  // Random events & economy
  // researchSpeedMultiplier (V17 / Wave W4): additive-optional field so
  // narrative-events.ts consequences (chain rewards) can grant a temporary
  // research-speed boost through the SAME expiring-effect mechanism random
  // events already use, instead of inventing a parallel one. Defaults to 1
  // wherever unset — see game-engine.ts researchSpeedMult.
  activeEffects?: { eventId: string; label: string; expiresAtMonth: number; revenueMultiplier: number; costMultiplier: number; researchSpeedMultiplier?: number }[];
  pendingChoice?: {
    eventId: string; eventName: string; eventIcon: string; eventDescription: string;
    choices: { label: string; description: string; consequencePreview?: string[] }[];
    // V17 / Wave W4 (narrative-events.ts): set when this pendingChoice came
    // from a chain stage rather than random-events.ts, so the resolution
    // handler and the modal's chain-progress indicator know how to route it.
    chainId?: string;
    chainName?: string;
    stageIndex?: number;
    totalStages?: number;
    // V28 / Live-Service Wave LS8 (chapters.ts): set when this pendingChoice
    // came from a calendar-dated Story Chapter act or finale instead of a
    // narrative-events.ts chain — mutually exclusive with chainId/chainName
    // above. Reuses stageIndex/totalStages (act index / act count + 1 for
    // the finale slot) rather than adding parallel fields.
    chapterId?: string;
    chapterName?: string;
  } | null;
  incomeHistory?: number[];

  // Contracts
  availableContracts?: string[];
  activeContracts?: string[];
  completedContracts?: string[];
  lastContractRefresh?: number;
  /** V40: wall-clock timestamps of legacy CONTRACT_POOL completions — counted
   *  against the SHARED daily contract-completion cap alongside delivery
   *  contracts (founder directive: X completions per 24h across both
   *  systems). Pruned to the rolling window on write. */
  legacyContractCompletionsAt?: number[];

  /** V42: world epoch this save belongs to (world-reset.ts). When the shared
   *  world restarts fresh, WORLD_EPOCH is bumped and older-epoch saves are
   *  archived on load — the player starts the new era from scratch. */
  worldEpoch?: number;

  // Competitive milestones
  claimedMilestones?: Record<string, string>;

  // Refining / Production
  activeRefining?: { recipeId: string; startedAtMs: number; durationSeconds: number } | null;
  /**
   * @deprecated Wave E2 "Goods on the Book" (docs/ECONOMY_PVP_2026-08.md §E2,
   * save-load.ts V31): crafted-product stock now lives in `resources` — every
   * CRAFTED_PRODUCT_IDS slug is a first-class RESOURCE_MAP entry, tradeable
   * on the shared market like any raw resource. `loadGame` one-time-merges
   * any pre-V31 stockpile here into `resources` and clears this field.
   * Kept on the type (empty after migration) only because CraftingPanel/
   * page.tsx still spread it into their input-availability checks —
   * additive-safe, never written to again.
   */
  craftedProducts?: Record<string, number>; // Product inventory (steel_ingots, etc.)

  // Workforce
  workforce?: {
    engineers: number;
    scientists: number;
    miners: number;
    operators: number;
    // Phase III additions (all optional; game-engine falls back to 0/defaults)
    pilots?: number;
    negotiators?: number;
    securitys?: number;
    medics?: number;
    morale?: number;
    fatigue?: number;
    trainingLevel?: number;
    trainingBudgetPerCrew?: number;
  };

  // Ships
  ships?: {
    instanceId: string;
    definitionId: string;
    name: string;
    status: 'idle' | 'in_transit' | 'loading' | 'mining' | 'refining' | 'building' | 'surveying' | 'expedition';
    currentLocation: string;
    isBuilt: boolean;
    buildStartedAtMs?: number;
    buildDurationSeconds?: number;
    route?: {
      from: string;
      to: string;
      departedAtMs: number;
      arrivalAtMs: number;
      cargo: Record<string, number>;
    };
    miningOperation?: {
      resourceId: string;
      startedAtMs: number;
      locationId: string;
    };
    surveyExpedition?: {
      targetLocation: string;
      startedAtMs: number;
      durationSeconds: number;
    };
    /** V15 (audit Wave D / A4): persistent hull damage 0-0.85. Penalizes
     *  mining rate until auto-repair (money sink) restores the hull. */
    hullDamagePct?: number;
  }[];

  // Prestige (deprecated — kept for migration; see legacy-system.ts)
  prestige?: { level: number; legacyPoints: number; permanentBonuses: { revenueMultiplier: number; buildSpeedMultiplier: number; researchSpeedMultiplier: number; miningMultiplier: number; startingMoney: number } };

  // Legacy system (replaces prestige — permanent bonuses without resets)
  legacy?: {
    completedMilestones: string[];
    stretchLevels: Record<string, number>;
    trackers: {
      totalResourcesMined: number;
      totalContractsCompleted: number;
      totalShipsBuilt: number;
      totalBuildingsCompleted: number;
    };
    legacyPower: number;
    displayTier: 'Pioneer' | 'Colonist' | 'Admiral' | 'Architect' | 'Legend';
  };

  // Corporation tier (1-7, company evolution)
  corporationTier?: number;

  // Weekly events
  currentWeekId?: number;
  weeklyProgress?: Record<string, number>; // metric → value this week

  // Market events
  activeMarketEvents?: { eventId: string; name: string; icon: string; affectedResources: string[]; priceMultiplier: number; startedAtMs: number; expiresAtMs: number }[];

  // Tick counter (for sub-month tick tracking)
  tickCount?: number;

  // Achievements
  earnedAchievements?: string[];
  playerTitle?: string | null;

  // Speed boosts (earned from contracts, leagues, mini-activities).
  // 'mining' added in audit Wave B so mini-activity mining_boost rewards
  // (audit §1c mini-activities) have a mechanical home.
  availableBoosts?: { id: string; type: 'construction' | 'research' | 'mining'; multiplier: number; durationSeconds: number; source: string; label: string }[];
  activeBoosts?: { boostId: string; type: 'construction' | 'research' | 'mining'; multiplier: number; activatedAtMs: number; expiresAtMs: number; label: string }[];

  // DEPRECATED (E4 — Finite Demand Pools): the old global log10-decay
  // multipliers per service ID. No longer written by the sync route and no
  // longer read by any revenue path (getServiceDemandMultiplier replaced
  // every consumer); kept on the type so pre-V33 exported saves still parse,
  // and cleared to {} by the V33 migration so stale decay stops persisting.
  servicePriceMultipliers?: Record<string, number>;

  // One Wallet (audit A1): highest server ledger seq already applied into
  // this state's money/resources. Sent with every sync as the ack cursor;
  // the server only returns (and re-returns) entries beyond it, making
  // reconciliation idempotent under sync retries. Lives in GameState so the
  // cursor persists/saves atomically with the balance it describes.
  serverLedgerAck?: number;

  // Timed competitive events
  activeTimedEvents?: {
    templateId: string;
    name: string;
    icon: string;
    category: string;
    description: string;
    targetLabel: string;
    target: number;
    startedAtMs: number;
    expiresAtMs: number;
    rewardAmount: number;
    boostReward?: 'construction' | 'research' | null;
    completed?: boolean;
    completedAtMs?: number;
  }[];
  lastTimedEventSpawnMs?: number;

  // Mini-activities — rotating slot system
  miniActivityCooldowns?: Record<string, number>; // activityId → lastExecutedAtMs
  miniActivitySlots?: string[]; // Currently visible activity IDs (max 4)
  miniActivityLastSpawnMs?: number; // When the last activity was added to slots

  // Personal Megastructures
  megastructures?: {
    definitionId: string;
    currentPhase: number;
    completedPhases: number;
    totalPhases: number;
    status: 'building' | 'paused' | 'complete';
    phaseStartedAtMs?: number;
    phaseDurationSeconds?: number;
    startedAtMs: number;
    completedAtMs?: number;
  }[];

  // Reputation
  reputation?: number;

  // Victory conditions
  earnedVictories?: string[];

  // Specialization
  specialization?: {
    primary: { path: 'launch_magnate' | 'mining_baron' | 'data_overlord' | 'tourism_mogul' | 'fleet_commander' | 'fabrication_savant'; tier: number } | null;
    secondary: { path: 'launch_magnate' | 'mining_baron' | 'data_overlord' | 'tourism_mogul' | 'fleet_commander' | 'fabrication_savant'; tier: number } | null;
    respecCount: number;
  };

  // Daily task session metrics (reset daily, tracked client-side, synced to server)
  dailyMetrics?: {
    date: string; // YYYY-MM-DD
    units_mined: number;
    research_completed: number;
    revenue_earned: number;
    buildings_built: number;
    contracts_completed: number;
    research_started: number;
    rockets_launched: number;
    market_orders_filled: number;
    trade_volume: number;
    buildings_upgraded: number;
    satellites_deployed: number;
    cargo_delivered: number;
    iron_mined: number;
    titanium_mined: number;
    platinum_group_mined: number;
  };

  // Tutorial / FTUE objective chain (onboarding.ts)
  /** 1-based position in the onboarding chain; >= ONBOARDING_DONE_STEP
   *  (onboarding.ts) = finished. Historic saves used 6 as the done sentinel
   *  for the old 5-step overlay — save-load.ts V41 bumps those forward. */
  tutorialStep?: number;
  tutorialDismissed?: boolean;
  /** V41 — which onboarding chain this save has been migrated to
   *  (ONBOARDING_CHAIN_VERSION). Guards the one-time done-sentinel bump. */
  onboardingChainVersion?: number;
  /** V41 — set the first time the player buys or sells on the market (page
   *  handlers); the onboarding chain's first-trade detection reads it. */
  hasTradedOnMarket?: boolean;

  // Subsidiaries
  subsidiaries?: {
    id: string;
    type: 'sub_launch' | 'sub_mining' | 'sub_telecom' | 'sub_tourism' | 'sub_fabrication' | 'sub_research';
    createdAtMs: number;
    operations: number;
    synergy: number;
    efficiency: number;
  }[];

  // Commanders (hired crew that grant passive bonuses; W8 Leaders 2.0 adds
  // xp/level/assignment on HiredCommander itself — see commanders.ts)
  hiredCommanders?: HiredCommander[];
  commanderPool?: CommanderPool;

  // Faction standing (reputation -100 to +100 per faction)
  factionReputation?: Record<string, number>;

  // Delivery contracts — NPC-issued binding resource-delivery agreements
  availableDeliveries?: DeliveryContractState[];
  activeDeliveries?: DeliveryContractState[];
  completedDeliveries?: DeliveryContractState[];
  deliveryPoolRefreshedAtMs?: number;

  // Protected Frontier — new-player onramp shield
  frontierStatus?: 'active' | 'graduated' | 'none';
  frontierEnteredAtMs?: number;
  frontierGraduatedAtMs?: number;

  // Quarterly corporate reports (Wave 8) — QuarterlyReport shape defined in
  // quarterly-reports.ts. Using an inline shape here (matching the
  // npcCompanies precedent above) to avoid circular import issues with
  // webpack. History of automatic public quarterly readouts, one per
  // completed in-game quarter (3 game-months), oldest first.
  quarterlyReports?: {
    id: string;
    quarterIndex: number;
    quarterNumber: number;
    gameYear: number;
    quarterOfYear: number;
    generatedAtMs: number;
    gameDate: GameDate;
    revenue: number;
    costs: number;
    profit: number;
    netWorth: number;
    fleetCount: number;
    buildingCount: number;
    corporationTier: number;
    notableEvents: string[];
    growthRatePct: number | null;
    // Wave F (h): previously-invisible P&L lines (governor tax, subsidiary
    // income, insurance premiums, outstanding repairs) — see quarterly-reports.ts.
    // Optional: reports stored before this wave don't have these fields.
    governorTaxQuarterly?: number;
    subsidiaryIncomeQuarterly?: number;
    insurancePremiumQuarterly?: number;
    outstandingRepairCost?: number;
  }[];

  // V22 — Corporate Doctrine & Board Politics (4X Wave W13,
  // corporate-doctrine.ts). Additive: an absent corporateDoctrine means no
  // policy has been chosen yet (every category neutral — no bonus, no
  // penalty); an absent boardDirectives means the board hasn't issued its
  // first quarterly target yet (seeded the first time recordQuarterlyReport
  // runs). Constituency approval is deliberately NOT persisted here — it's
  // a pure function of the fields above plus recentHazards/workforce/money,
  // recomputed on every read (see corporate-doctrine.ts
  // getConstituencyApprovals), so it can never drift or need a migration.
  corporateDoctrine?: CorporateDoctrineState;
  boardDirectives?: BoardDirective[];

  // Starting archetype — the path the player picked at game creation
  startingArchetype?: 'cape_heritage' | 'meridian_signals' | 'tracking_consortium';

  // Modules (Phase IV) — purchased modules + fitted modules per ship
  moduleInventory?: {
    instanceId: string;
    definitionId: string;
    acquiredAtMs: number;
  }[];
  /** Map of shipInstanceId → list of module instanceIds fitted to that ship. */
  fittedModules?: Record<string, string[]>;

  // Corporate governance (Phase VI) — shared treasury + dividend history
  /** Corporate shared wallet. Separate from personal money once multiplayer
   *  alliances exist; mirrors player money in single-player. */
  corporateTreasury?: number;
  dividendHistory?: {
    id: string;
    declaredAtMs: number;
    perShareAmount: number;
    totalPayout: number;
    declaringUserId?: string;
    treasuryBefore: number;
  }[];

  // Exploration (Phase VII) — per-corp discovery database + active claims
  knownAnomalies?: {
    id: string;
    kind: 'rich_deposit' | 'ancient_artifact' | 'derelict_ship' | 'uncharted_asteroid' | 'hazard_zone' | 'alien_signal' | 'gravitational_lens';
    locationId: string;
    discoveredByShipId?: string;
    discoveredAtMs: number;
    fadesAtMs: number;
    claimed: boolean;
    claimedByCorp?: string;
    claimedAtMs?: number;
    title: string;
    summary: string;
    rewards: {
      money?: number;
      miningBonus?: { resourceId: string; bonusPct: number; durationMonths: number };
      unlocksResearchId?: string;
      moduleId?: string;
    };
  }[];
  claimStakes?: {
    id: string;
    anomalyId: string;
    stakedAtMs: number;
    expiresAtMs: number;
    holderProfileId?: string;
  }[];

  // Market depth (Phase V) — open futures positions
  futuresContracts?: {
    id: string;
    holderProfileId?: string;
    resourceSlug: string;
    quantity: number;
    strikePrice: number;
    direction: 'long' | 'short';
    marginLocked: number;
    openedAtMs: number;
    expiresAtMs: number;
    settledAtMs?: number;
    settlementPnL?: number;
    status: 'open' | 'settled' | 'liquidated';
  }[];

  // Interstellar era (V13, Wave 10) — expeditions, colonies, trade routes.
  // Shapes defined below (ExpeditionState etc.) alongside DeliveryContractState;
  // engine logic lives in expeditions.ts. Campaign-loop content per
  // docs/SESSION_DESIGN.md ("Interstellar expansion — Campaign (end-game)").
  expeditions?: ExpeditionState[];
  interstellarColonies?: InterstellarColonyState[];
  interstellarTradeRoutes?: InterstellarTradeRouteState[];

  // ─── Audit Wave B (V14) — server-computed bonuses that reach the tick ────
  // All fields additive + optional; solo/logged-out players never set them
  // and every consumer falls back to neutral values.

  /** Audit A2: alliance bonus aggregate (member count + tier + research +
   *  perks + projects), computed by sync/route.ts and piped through
   *  server-effects.ts. Multiplied into the tick next to tier bonuses. */
  allianceBonuses?: {
    revenueBonus: number;
    miningBonus: number;
    researchBonus: number;
    buildSpeedBonus: number;
    tradeBonus?: number;
  };

  /** Audit A7: per-zone standing (governor / stakeholder) from the server
   *  zone-influence tables. Drives getStakeholderServiceBonus on services in
   *  the zone and the governor tax revenue line. */
  zoneStandings?: {
    zoneSlug: string;
    sharePct: number;
    isGovernor: boolean;
    taxBaseMonthly: number;
  }[];

  /** Audit A8: persisted espionage rewards (EspionageMission.reward) become
   *  consumable perks: market_discount cuts the broker fee (applied
   *  server-side in market/trade), headhunt_voucher discounts the next hire
   *  (workforce.getHireCost). */
  activeIntelPerks?: {
    type: 'market_discount' | 'headhunt_voucher';
    discount: number;
    expiresAtMs: number;
    resources?: string[];
  }[];

  /** Audit §1b "Leagues": seasons whose promotion boost has already been
   *  granted (dedupe cursor for server-effects league boost grants). */
  claimedLeagueBoostSeasonIds?: string[];

  /** Sol Events (real-world feed, src/lib/game/real-world-feed.ts): modest,
   *  time-bounded, world-shared bonus mirror while a real launch window is
   *  open or a program milestone is <7 days old. Queued client-side by
   *  WorldEventsBanner.tsx via server-effects.ts's existing hand-off queue —
   *  same pattern as allianceBonuses above, but sourced from the public
   *  /api/space-tycoon/world-feed route rather than the authenticated sync
   *  route, so it applies even to solo/logged-out play. */
  worldEventBonuses?: {
    contractPayoutBonus: number;
    researchSpeedBonus: number;
    expiresAtMs: number;
  } | null;

  // Hazards (Phase II) — recent hazard log
  recentHazards?: {
    id: string;
    type: 'solar_storm' | 'micrometeorite' | 'pirate_raid' | 'equipment_failure';
    /** V15 (Wave D): severity class of the strike. */
    severity?: 'minor' | 'major' | 'severe';
    locationId: string;
    occurredAtMs: number;
    affectedShipInstanceId?: string;
    affectedBuildingInstanceId?: string;
    targetName?: string;
    damagePct: number;
    mitigatedPct: number;
    destroyed: boolean;
    insurancePayout: number;
    summary: string;
  }[];

  // ─── Audit Waves D+E (V15) — risk pillar + market integrity state ─────────
  // All fields additive + optional with save-migration defaults in
  // save-load.ts; every consumer falls back to a neutral value.

  /** Wave D (A4): corporate hazard insurance policy. While true, monthly
   *  premiums are charged (economic-sinks.calculateInsurancePremium — a real
   *  recurring sink) and destroyed assets pay out their insured value.
   *  Defaults ON (player-protective now that hazards can destroy); toggled
   *  via economic-sinks.setInsuranceActive (UI wave surfaces the switch).
   *  Premiums are waived inside the Protected Frontier. */
  insuranceActive?: boolean;

  /** Wave D (A4 warning cadence): severe hazards forecast for next
   *  game-month at the player's asset locations. Refreshed each month-end;
   *  surfaced in the event log now and as map overlays in the UI wave. */
  hazardWarnings?: {
    id: string;
    type: 'solar_storm' | 'micrometeorite' | 'pirate_raid' | 'equipment_failure';
    severity: 'minor' | 'major' | 'severe';
    locationId: string;
    forecastMonthIndex: number;
    issuedAtMs: number;
    summary: string;
  }[];

  /** Wave E (A5-i/A5-iv): market flows awaiting transmission to the shared
   *  market via sync — mined units (supply pressure) and net NPC trade flow.
   *  Drained after each successful sync (market-pressure.ts). Wave E5 adds
   *  `minedByLocation` (per-deposit extraction-pressure attribution) and
   *  `shock` (hazard-driven inventory-loss supply shock) — both optional so
   *  pre-E5 saves round-trip unchanged. */
  pendingMarketFlows?: {
    mined: Record<string, number>;
    npc: Record<string, number>;
    minedByLocation?: Record<string, Record<string, number>>;
    shock?: Record<string, number>;
  };

  /** Wave E (C5 §7): cash-reserve requirement status for T5+ corporations.
   *  Below a 3-month expense runway, services run at reduced efficiency.
   *  Computed at month-end; multiplier applied to service revenue. */
  reserveStatus?: {
    status: 'healthy' | 'warning' | 'critical';
    efficiencyMultiplier: number;
    requiredReserve: number;
  };

  // ─── V17 (Wave W4) — Narrative Event Chains ───────────────────────────────
  // docs/4X_BASELINE_2026-08.md Part 2c: 12 chains / 44 stages, unified under
  // one schema in narrative-events.ts. Shape defined there (ChainProgressState)
  // and inlined here (same precedent as npcCompanies/quarterlyReports above)
  // to avoid circular imports.

  /** Per-chain progress: which stage, whether awaiting a player choice, and
   *  flag state read by later stages (e.g. did the player announce the
   *  Europa finding early?). One entry per chain the player has triggered. */
  narrativeChains?: {
    chainId: string;
    stageIndex: number;
    status: 'active' | 'completed';
    startedAtMonth: number;
    lastAdvancedMonth: number;
    awaitingChoice?: boolean;
    completedAtMonth?: number;
    flags?: Record<string, boolean>;
  }[];

  /** Temporary hazard-mitigation bonuses granted by chain choices (e.g.
   *  "Emergency shielding spend"). Additive; summed into hazards.ts's
   *  getShipHazardMitigation / getBuildingHazardMitigation, capped by the
   *  existing MITIGATION_CAP like every other mitigation source. */
  chainHazardMitigationBonuses?: { amount: number; expiresAtMs: number; source: string }[];

  /** Forward-compatible rare-tech access flags granted by narrative chains
   *  (Europa biosignature confirmation, ISO exotic composition, Triton
   *  Archive follow-up, superconductor replication). research-tree.ts is
   *  off-limits to this wave (concurrent agent); a future wave (W10 per the
   *  doc) gates rare techs on this list so nothing discovered here is lost. */
  unlockedRareTechIds?: string[];

  // ─── V18 (4X Wave W6) — Flagship Scientific Missions ─────────────────────
  // docs/4X_BASELINE_2026-08.md Part 2b: a missions layer distinct from
  // economic contracts — multi-phase science programs with real instruments
  // and discovery payoffs, built on the expeditions.ts template. Shapes
  // defined below (ScienceMissionState); engine in science-missions.ts.
  // Monthly/quarterly-loop content per SESSION_DESIGN.md.

  /** Active + historical flagship science missions (one live instance per
   *  program at a time; failed programs can be restarted as new instances). */
  scienceMissions?: ScienceMissionState[];

  /** Co-funding stakes in deterministic, world-shared NPC faction science
   *  programs (NPC_BACKDROP: "NPC demand is visible and forecastable").
   *  Money flows settle client-side in the tick, mirroring the tick-insurance
   *  precedent (audit A4: no server-ledger integration for tick flows);
   *  server-ledger integration is the follow-up when co-funding becomes
   *  multiplayer-shared. */
  npcProgramContributions?: {
    id: string;
    npcProgramId: string;
    /** World cycle index of the NPC program run this stake belongs to. */
    cycleIndex: number;
    amount: number;
    contributedAtMonth: number;
    /** World month-index the stake settles on (deterministic, forecastable). */
    settlesAtMonth: number;
    settled: boolean;
    settledAtMonth?: number;
    payout?: number;
  }[];

  // ─── V20 (4X Waves W3+W10) — Research Tree 2.0: doctrine gates + ─────────
  // repeatable programs (docs/4X_BASELINE_2026-08.md Part 2a Op4/Op5).
  // Both fields are additive-only; a save with neither field behaves exactly
  // like today (no doctrine chosen = both sides of every pair stay
  // available; no repeatable levels = every repeatable starts at level 0).

  /** Which side of each mutually-exclusive doctrine pair the corporation
   *  originally committed to, keyed by ResearchDefinition.doctrineGroup
   *  (e.g. 'propulsion_doctrine' -> 'nuclear_thermal'). Recorded the first
   *  time either side of a pair completes, and never overwritten — so the
   *  original choice stays visible in the UI even after a player later pays
   *  the 2x-cost/6-month-retool override to research the locked sibling too
   *  (both ids end up in completedResearch, but this map still remembers
   *  which one was "the doctrine"). research-tree.ts's isDoctrineLocked /
   *  getDoctrineLockedBy / getDoctrineOverrideCost read `excludes` +
   *  completedResearch directly, so this map is purely a display/history
   *  record, not the source of truth for lock state. */
  doctrineChoices?: Record<string, string>;

  // ─── V21 (4X Wave W11) — Accord Council Senate ───────────────────────────
  // docs/4X_BASELINE_2026-08.md W11: quarterly vote docket + player lobbying
  // + faction licensing. Shapes defined in accord-senate.ts (AccordDocket /
  // LobbyingCommitment / AccordVoteResult) and inlined here (same precedent
  // as narrativeChains above) to avoid circular imports. factionLicenses
  // lives here too (its owning module, factions.ts, already imports
  // GameState from this file).

  /** The current quarter's docket of measures up for a vote — null before
   *  the first quarter boundary a save has lived through. World-shared:
   *  every player sees the identical docket for the same quarter index. */
  accordDocket?: {
    quarterIndex: number;
    measureIds: string[];
    resolved: boolean;
  } | null;

  /** This quarter's lobbying commitments (one per measure the player chose
   *  to lobby on). Reset to [] each time a new docket publishes. */
  accordLobbying?: {
    measureId: string;
    stance: 'support' | 'oppose';
    moneySpent: number;
    favorFactionId?: string;
    favorSpent: number;
    committedAtMonth: number;
  }[];

  /** Resolved vote history, most-recent-first, capped at 30 entries — the
   *  Council's public record (CLAUDE.md "public diplomacy feed" spirit). */
  accordVoteHistory?: {
    quarterIndex: number;
    measureId: string;
    measureName: string;
    icon: string;
    category: string;
    passed: boolean;
    playerStance: 'support' | 'oppose' | null;
    publishedOdds: number;
    finalOdds: number;
    effectLabel: string;
  }[];

  /** Purchased faction licensing deals (factions.ts FACTION_LICENSES ids) —
   *  standing-gated, pay-once unlocks for tech/route access. */
  factionLicenses?: string[];

  /** AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md "E1 implementation"):
   *  the Accord Chair snapshot. SERVER-AUTHORITATIVE and READ-ONLY — the
   *  election, the tally, the writs and the fracture roster are shared
   *  world state and live in the AccordChair* Prisma tables; this field is
   *  the sync-delivered view, exactly like `equity` (M6) and `demandPools`
   *  (E4).
   *
   *  NO SAVE MIGRATION. The field is optional and null-until-sync: a save
   *  written before E1 simply has `undefined` here, every reader
   *  (accord-senate's writ lookup and fracture exemption, factions.ts's
   *  effective standing) treats null/undefined as "no Chair system", and
   *  save-load.ts writes nothing. The client never mutates it. */
  accordChair?: import('./accord-chair').ChairSnapshot | null;

  // ─── AAA Program Round 2 — Systemic Crises (docs/AAA_PROGRAM_2026-08.md) ──
  // THREE OPTIONAL FIELDS. NO SAVE MIGRATION, NO VERSION BUMP.
  //
  //  - `systemicCrisis` is SERVER-AUTHORITATIVE and READ-ONLY, exactly like
  //    `accordChair` (E1) and `equity` (M6): the published world index, the
  //    assessment target and pool, and this corporation's own pledge all
  //    live in the SystemicCrisis* Prisma tables. Null/undefined = "no
  //    crisis system", which is what a pre-Round-2 save, a logged-out
  //    session, and an un-pushed schema all read as.
  //  - `crisisSituation` and `crisisHistory` are CLIENT-OWNED save state,
  //    the same shape and lifecycle `storyChapters` has: a progress bar and
  //    a bounded record of resolved crises. `save-load.ts` is untouched;
  //    `advanceSystemicCrisis` creates both lazily on the first tick that
  //    needs them.
  systemicCrisis?: import('./systemic-crises').CrisisSnapshot | null;
  crisisSituation?: import('./systemic-crises').CorporateSituation | null;
  crisisHistory?: import('./systemic-crises').CrisisRecord[];

  // ─── V23 (4X Wave W14) — Cargo Logistics + Per-Location Inventory ────────
  // docs/GAME_SYSTEMS_AUDIT_2026-08.md C1. Both fields additive-only; engine
  // logic + freight mutator live in cargo-logistics.ts.

  /** Local stockpiles: locationId → resourceId → quantity, for every
   *  NON-home location. The global `resources` pool above remains the
   *  Earth/home-cluster inventory (earth_surface/leo/geo) — the pool the NPC
   *  market, build costs, and crafting draw from. Migration (audit C1
   *  prescription): pre-W14 saves start with {} here — the global pool
   *  "seeds" the Earth inventory and nothing a player owned is moved. */
  locationInventories?: Record<string, Record<string, number>>;

  /** One-way ratchet for local production accrual. False = grace default
   *  (production credits the global pool exactly as before W14). Flips true
   *  in the tick the first time the corporation owns a built
   *  transport/tanker hull, and never reverts — from then on, production at
   *  remote locations accrues into locationInventories and must be
   *  freighted home (cargo-logistics.ts dispatchShipWithCargo). */
  logisticsUnlocked?: boolean;

  /** Levels completed for each repeatable research program, keyed by
   *  ResearchDefinition.id (e.g. 'launch_cadence_optimization' -> 3).
   *  Repeatable techs deliberately never get pushed into completedResearch
   *  (that would permanently hide them from the research UI after the first
   *  completion) — this map is their only completion state, capped at
   *  def.repeatable.maxLevel. getResearchBonuses(completedResearchIds,
   *  repeatableResearchLevels) sums def.repeatable.effectPerLevel once per
   *  completed level, inside the same aggregate caps as every other bonus. */
  repeatableResearchLevels?: Record<string, number>;

  // ─── V24 (Live-Service Wave LS1 "Night Shift") ───────────────────────────
  // docs/LIVE_SERVICE_2026-08.md §LS1. Command queues + priced standing
  // directives + honest uncapped-time/capped-rate away efficiency, replacing
  // offline-income.ts's dishonest 8h hard-cap (appendix defect #1). All
  // fields additive/optional; see save-load.ts's V24 migration block and
  // away-operations.ts / command-queue.ts / standing-directives.ts.

  /** Ordered list of orders waiting for a free channel (research slot 1/2,
   *  construction pool). Executes automatically as slots free — on every
   *  live tick (game-engine.ts) and during away catch-up
   *  (away-operations.ts). Capacity from getCommandQueueCapacity(state);
   *  everything free/earnable per CLAUDE.md's monetization-hold exception. */
  commandQueue?: CommandQueueOrder[];

  /** Persistent automation policies (auto-sell, auto-restock, auto-renew
   *  delivery contracts, maintenance reserve floor). Each active directive
   *  adds to a superlinear monthly ops-fee sink (standing-directives.ts) —
   *  automation is a priced economic trade-off, never a free default. */
  standingDirectives?: StandingDirective[];

  /** Summary of the most recent away-operations catch-up — what the
   *  efficiency curve credited, which queue orders started/skipped, what
   *  directives cost/did, and which forecasted hazards struck while away.
   *  Consumed by the (LS2) Operations Debrief; LS1 only guarantees the data
   *  exists. Cleared to null once the player has seen it. */
  awayLedger?: AwayLedger | null;

  // ─── V25 (Live-Service Wave LS2 "Operations Debrief") ────────────────────
  // docs/LIVE_SERVICE_2026-08.md §LS2. All fields additive/optional; see
  // save-load.ts's V25 migration block, returning-commander.ts, debrief.ts.

  /** Active Returning Commander re-onboarding track — set once when a lapse
   *  of RETURNING_COMMANDER_LAPSE_MS+ is detected on load (returning-
   *  commander.ts's startReturningCommanderTrack), null otherwise. Drives a
   *  7-day objective checklist and a 14-day decaying earnings boost; never
   *  persists a stored multiplier — every read recomputes from
   *  `startedAtMs` so it can never drift (same determinism discipline as
   *  the away-efficiency curve). */
  returningCommanderTrack?: ReturningCommanderTrack | null;

  /** Server-aggregated mentorship bonus (LS2 mechanic 3 — wiring catchup-
   *  mechanics.ts's previously dead-code calculateMentorshipRewards through
   *  a real GameMentorship pairing). Delivered via the SAME sync ->
   *  server-effects -> tick hand-off as allianceBonuses (server-effects.ts);
   *  re-clamped defensively on apply. A profile is either a mentor (only
   *  revenueBonus set, from mentorRevenueBonus) or a mentee (all three set,
   *  from menteeBoost) — never both in the same snapshot. */
  mentorshipBonuses?: {
    revenueBonus: number;
    miningBonus: number;
    researchBonus: number;
  } | null;

  /** E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 6): world-shared
   *  cooperative mega-project permanentBonus, finally applied (audit §1d —
   *  previously display-string-only). Same sync -> server-effects -> tick
   *  hand-off as allianceBonuses/mentorshipBonuses; re-clamped defensively
   *  on apply (server-effects.ts clampMegaProjectBonuses). */
  megaProjectBonuses?: {
    revenueBonus: number;
    miningBonus: number;
    researchBonus: number;
    launchCostReduction: number;
  } | null;

  // ─── V26 (Live-Service Wave LS4 "Corporate Eras") ────────────────────────
  // docs/LIVE_SERVICE_2026-08.md §LS4. 90-real-day chartered epochs with a
  // declared focus (bonus/malus trade-off pair) and bracket-scaled goal
  // scoring; completed eras earn a permanent medal that feeds legacy-system.ts
  // as a new milestone family and (opt-in) publishes to the public Chronicle.
  // Additive/optional; see save-load.ts's V26 migration block and
  // corporate-eras.ts. Null/absent = no era ever chartered (identical to a
  // fresh game — getActiveEraModifiers(undefined) returns the neutral 1.0
  // multiplier set used throughout game-engine.ts/economy-report.ts).
  corporateEras?: CorporateErasState;

  // ─── V27 (Live-Service Wave LS6 "Programs Queue") ────────────────────────
  // docs/LIVE_SERVICE_2026-08.md §LS6. Wall-clock crew certification cohorts
  // + leader development/R&D residency postings, queued EVE-style (up to 3
  // ahead per track), plus leader retirement after ~2 real months of
  // continuous assignment. All fields additive/optional; see save-load.ts's
  // V27 migration block and programs.ts / commanders.ts.

  /** Three independent single-channel program queues. Null/absent = no
   *  programs ever queued (identical to a fresh game — getProgramWorkforceBonuses
   *  returns the zero set). */
  programs?: ProgramsState;

  /** Permanent retirement history — see RetiredLeaderRecord. Also the
   *  progress source for legacy-system.ts's leader-legacy stretch family. */
  retiredLeaders?: RetiredLeaderRecord[];

  /** Active mentor boosts waiting to be consumed by the next matching hire.
   *  See LeaderMentorBoost. */
  leaderMentorBoosts?: LeaderMentorBoost[];

  // ─── V28 (Live-Service Wave LS8 "Story Chapters") ────────────────────────
  // docs/LIVE_SERVICE_2026-08.md §LS8. Calendar-dated, world-synchronized
  // narrative arcs built on the W4 chain engine (narrative-events.ts) — every
  // player experiences the same chapter during the same real-world window,
  // seeded deterministically off a pure function of wall-clock time (no new
  // scheduling state, same discipline as world-calendar.ts/appointment-
  // events.ts). Shapes defined here (same precedent as corporateEras above)
  // and consumed by chapters.ts, which imports GameState from this file.
  // Additive/optional; see save-load.ts's V28 migration block. Null/absent =
  // no chapter progress ever recorded (identical to a fresh game — the very
  // next tick starts one from the world's current cycle).
  storyChapters?: StoryChaptersState;

  // ─── V29 (Live-Service Wave LS9 "The Realignment") ───────────────────────
  // docs/LIVE_SERVICE_2026-08.md §LS9. Quarterly (real-world UTC calendar
  // quarter) faction-posture shift + Epoch Address. NOTE: LS9 ran
  // concurrently with LS8 above and originally targeted V28 — LS8 claimed it
  // first, so this wave takes V29 (see save-load.ts's V29 migration block
  // for the coordination note). The epoch's CONTENT (postures, address text)
  // is never persisted — realignment.ts computes it fresh from the clock
  // every time (same "pure function of time" discipline as
  // economic-seasons.ts/seasonal-events.ts, and StoryChaptersState's own
  // header two fields above). This one field exists purely so the engine can
  // fire the "a new epoch has begun" event/banner exactly once per epoch per
  // save, not to store the epoch itself.

  /** The last Realignment epoch index (realignment.ts
   *  getCurrentRealignmentEpoch) this save has already announced. Null/absent
   *  = never announced one yet (identical to a fresh game — the next tick's
   *  clock check announces the current epoch exactly once). */
  lastSeenRealignmentEpoch?: number | null;

  /** E2 (One Price Truth — docs/ECONOMY_PVP_2026-08.md §2.5): the last
   *  market snapshot the server delivered via sync. The deterministic client
   *  tick reads this (never a live network call) to value delivery contracts
   *  at spot-at-acceptance and settle the NPC backdrop at spot. Null/absent =
   *  never synced (solo / logged-out) — consumers fall back to static
   *  baseMarketPrice, identical to pre-E2 behavior. */
  marketSnapshot?: MarketSnapshot | null;

  /** E7 (Chokepoints, Tariffs & NPC Drives — docs/ECONOMY_PVP_2026-08.md
   *  §E7 / §5 item 5): server-aggregated orbital-slot occupancy per
   *  ORBITAL_SLOT_POOLS locationId, delivered via sync the same direct-stash
   *  way as marketSnapshot above (ephemeral telemetry, not deterministic
   *  tick input). Null/absent = never synced — spatial-strategy.ts's
   *  computeOrbitalSlotReport falls back to 'low' (identical to pre-E7
   *  behavior). */
  orbitalSlotOccupancy?: Record<string, { occupiedCount: number; bucket: string }> | null;

  /** Balance Pass 4 (docs/BALANCE.md "Pass 4") — NEW OPTIONAL FIELD, no save
   *  migration (absent = null = no leases, gate behaves exactly as before
   *  for never-synced saves). This player's ACTIVE orbital-slot leases
   *  (OrbitalSlotLease rows, status 'active'), delivered via sync the same
   *  direct-stash way as orbitalSlotOccupancy above. Read by
   *  spatial-strategy.ts's checkOrbitalSlotGate: at a saturated pool a NEW
   *  build requires one of these (or the Frontier first-building
   *  exemption) — the E7 `requiresLeaseAuction` flag finally enforced. */
  orbitalSlotLeases?: { locationId: string; expiresAtMs: number }[] | null;

  /** V39 — Wave M6 "Takeovers & the Share Registry" (docs/
   *  MEANINGFUL_2026-08.md §M6, engine: share-registry.ts). Server-owned
   *  equity snapshot delivered via sync the same null-until-sync way as
   *  demandPools: my corp's capital structure (float, valuation,
   *  controller, dividend policy, integration malus), open tender offers
   *  targeting me, my open offers, and my holdings in other corporations.
   *  Null/absent = never synced or the population gate is closed —
   *  consumers (Situation Log tender alerts, world-calendar closings, the
   *  game-engine integration malus) all treat null as "no equity system",
   *  identical to pre-M6 behavior. Inline import type keeps types.ts free
   *  of engine logic (share-registry.ts is pure). */
  equity?: import('./share-registry').EquitySnapshot | null;

  /** V32 — Wave E3 "The Consumption Engine" (docs/ECONOMY_PVP_2026-08.md
   *  §2.2/§E3, engine: consumption.ts). Additive. Tracks the world-month
   *  consumption grid (dedupe between live tick and away catch-up — the two
   *  paths share advanceConsumptionToMonth so identical elapsed time always
   *  consumes identically), the migration phase-in anchor, per-building
   *  supply efficiency (0.5 soft floor), and the two sync-up accumulators
   *  (aggregate demand telemetry + standing-order procurement requests).
   *  Inline shape (not imported from consumption.ts) to avoid a types ←→
   *  engine import cycle — same pattern as npcCompanies above. */
  consumptionState?: {
    /** World-month index (server-time totalMonths) when recipes began
     *  phasing in for this save. Null = no phase-in — full rate from the
     *  start (fresh games). Migrated saves get the current world month, then
     *  ramp 25% → 100% over 3 game-months (§E3 grandfather grace). */
    phaseInStartMonth: number | null;
    /** One-time §E3 grace: 6 game-months of recipe inputs credited per
     *  affected completed building at migration, so nobody's economy craters
     *  on update. */
    graceCredited: boolean;
    /** Last world-month index already consumed. Null = never processed —
     *  the next pass anchors here WITHOUT retro-consuming earlier months. */
    lastProcessedMonth: number | null;
    /** Per-building supply efficiency from the latest monthly pass
     *  (instanceId → 0.5..1). Multiplies that building's service revenue and
     *  mining/production output until the next pass. Absent id = 1.0. */
    efficiency: Record<string, number>;
    /** instanceId → resource ids that ran short last pass (Situation Log /
     *  building card detail). */
    shortfallResources: Record<string, string[]>;
    /** Aggregate units consumed since the last successful sync, per
     *  resource — sent as `consumedThisTick` and applied server-side as
     *  background BUY flow + MarketResource.totalDemand (§2.2 "aggregate
     *  demand telemetry": your factory's inputs are my mine's customers). */
    pendingDemandFlows: Record<string, number>;
    /** Shortfall units queued for server-side standing buy orders, per
     *  resource — only accrued by buildings whose supplyPolicy is 'market'.
     *  Sent as `procurementRequests`; the server places bounded, band-limited
     *  MarketLimitOrder rows (source 'standing') and escrow flows through
     *  the One-Wallet ledger like any MarketPanel trade. */
    pendingProcurement: Record<string, number>;
    /** Balance Pass 1 (docs/BALANCE.md "Pass 1 — Resource generation vs
     *  sinks"): world-month anchor for the storage-integrity ramp (volatile
     *  boiloff + warehouse-overflow decay ramp 0 → 100% over 6 game-months
     *  from here). Absent/null = not yet anchored — the next monthly pass
     *  lazily stamps the current month, so existing saves get a 36-real-hour
     *  grace window with NO save migration. Optional by design. */
    storageDecayStartMonth?: number | null;
  };

  /** V33 — Wave E4 "Finite Demand Pools" (docs/ECONOMY_PVP_2026-08.md
   *  §2.1/§E4, engine: demand-pools.ts + service-pricing.ts). The last
   *  per-(location, serviceCategory) demand-pool snapshot the server
   *  delivered via sync — pool size, saturation multiplier, this player's
   *  capacity share, anonymized top-supplier shares. The deterministic tick
   *  reads it (never a live network call); null/absent or stale (> 7 days)
   *  = the deterministic local pool fallback (own activity vs authored NPC
   *  floor). Delivered through server-effects.ts exactly like
   *  allianceBonuses. */
  demandPools?: DemandPoolSnapshot | null;

  /** V33 — world-month index (server-time totalMonths convention) when
   *  demand pools began phasing in for this save. Existing saves get the
   *  migration month (pool effect ramps 25%→100% over 3 game-months — the
   *  same grandfather ramp E3's consumption used); null = full effect
   *  (fresh games — new corps are Frontier-shielded anyway). */
  demandPoolPhaseInStartMonth?: number | null;

  /** V37 — Meaningful Decisions Wave M3 (docs/MEANINGFUL_2026-08.md §M3 —
   *  finding F3, "price-linked mining"). World-month index when an existing
   *  save's mining_output revenue began transitioning from the flat
   *  authored rate to the spot-linked formula. Blends 50/50 old/new for 3
   *  game-months from this anchor, then switches fully (mining-pricing.ts's
   *  getMiningPriceLinkFraction); null = full new-formula weight
   *  immediately (fresh games — not a migration penalty). */
  miningPriceLinkPhaseInStartMonth?: number | null;

  // ─── V34 — Economic PvP Wave E5 "Depletion, Labor & Lanes" (docs/
  // ECONOMY_PVP_2026-08.md §2.4/§2.6/§2.8/§E5) ────────────────────────────

  /** The last per-(location, resource) deposit extraction-pressure snapshot
   *  the server delivered via sync (extraction-pressure.ts). Mining output
   *  at a deposit multiplies by its pressure (0.4-1.0); null/absent/stale
   *  = neutral 1.0 (the deterministic local fallback — an unsynced player
   *  never sees cross-player depletion). Delivered through server-effects.ts
   *  exactly like demandPools. */
  extractionPressure?: ExtractionPressureSnapshot | null;

  /** The last server-wide wage-index-per-crew-type snapshot (labor-market.ts),
   *  refreshed by the weekly labor cron. Salary = base × wageIndex; null/
   *  absent/stale = neutral 1.0 for every type (pre-E5 payroll behavior).
   *  Delivered through server-effects.ts exactly like demandPools. */
  laborMarket?: { index: LaborMarketSnapshot; asOf: number } | null;

  /** Balance Pass 9 ([SAVE] optional field, no migration): the last
   *  offense-fee-index snapshot (fee-index.ts) — a quarterly, server-
   *  computed factor clamp(worldMedianMonthlyNet / $30M, 1, 50) that
   *  multiplies poach action fees, freight-toll caps, and intel/report
   *  fees so fixed offense prices scale with the economy's era. null/
   *  absent/stale = factor 1 (pre-Pass-9 behavior, and the by-design
   *  relaunch value). Delivered through server-effects.ts exactly like
   *  laborMarket. */
  feeIndex?: import('./fee-index').FeeIndexSnapshot | null;

  /** The last per-lane fuel-discount snapshot (trade-lanes.ts) — heavily
   *  used lanes discount the Δv fuel bill up to LANE_BONUS_CAP; null/absent/
   *  stale = 0 (no bonus, pre-E5 fuel-cost behavior). Delivered through
   *  server-effects.ts exactly like demandPools. */
  laneBonuses?: LaneBonusSnapshot | null;

  /** Dispatches recorded since the last successful sync, per canonical lane
   *  key (trade-lanes.ts laneKey) — written directly by
   *  dispatchShipWithCargo (cargo-logistics.ts) at departure time, since
   *  dispatch happens outside the periodic tick loop. Sent as
   *  `laneDispatchesThisTick`; drained via the same single-slot hand-off
   *  pattern as pendingMarketFlows (trade-lanes.ts's own queue). */
  pendingLaneUsage?: Record<string, number>;

  // ─── V38 — Meaningful Decisions Wave M5 "Offense Toolkit I" (docs/
  // MEANINGFUL_2026-08.md §M5 / §3.2 O2-O8) ───────────────────────────────

  /** The last offense snapshot the server delivered via sync (offense.ts):
   *  active price campaigns (public), incoming poach offers awaiting a
   *  counteroffer + resolved poach outcomes, zone freight tolls (public),
   *  and cornering alerts. Feeds the Situation Log's "you are under
   *  economic attack at X" items and the dispatch-time toll math.
   *  Null/absent = never synced — no offense state, pre-M5 behavior. */
  offense?: import('./offense').OffenseSnapshot | null;

  /** PoachOffer outcome ids already applied to this save's workforce/event
   *  log (offense.ts applyOffenseToState) — the idempotency cursor that
   *  makes crew transfers apply exactly once under sync retries. The
   *  [SAVE] V38 "counteroffer inbox on the save's alert surface" field. */
  appliedPoachOfferIds?: string[];

  /** Freight tolls (O6) debited at dispatch time but not yet settled to the
   *  zone governor, per zone slug. Sent as `tollPaymentsThisTick`; the
   *  server credits the governor via the One-Wallet ledger (capped) and the
   *  client drains via offense.ts's own hand-off queue. */
  pendingTollPayments?: Record<string, number>;

  // ─── PvP Discoverability pass (2026-08, competitive-posture.ts) ──────────

  /** [SAVE] NEW OPTIONAL FIELD — no migration, no version bump. Ids from
   *  competitive-posture.ts's COMPETITIVE_TOOLS whose one-time "this tool is
   *  now available to you" announcement has already fired for this save.
   *
   *  ABSENT is a legal, expected value meaning "this save has never been
   *  read by the announcer". reconcileToolAnnouncements treats that as a
   *  silent BASELINE — it records everything currently available WITHOUT
   *  announcing any of it — so a veteran loading a build that contains this
   *  pass never receives a backlog of toasts, and a fresh Frontier corp
   *  (which qualifies for none of the tools) baselines to the empty array
   *  and then gets each unlock announced exactly once, at the moment it
   *  happens. Once written it is ordinary save data on the normal
   *  localStorage/sync path; re-announcement is impossible because the id is
   *  recorded before the announcement is rendered. */
  seenCompetitiveTools?: string[];
}

/** One chapter act's live/catch-up progress marker (0..acts.length-1 while
 *  acts are resolving, acts.length once every act is done and only the
 *  finale remains). */
export interface ChapterProgressState {
  /** World chapter-cycle this progress belongs to — chapters.ts's
   *  getChapterCycleIndex(weekIndex). The moment the world moves to a new
   *  cycle without this reaching 'completed', advanceStoryChapters files it
   *  as missed and starts fresh progress for the new cycle. */
  cycleIndex: number;
  chapterId: string;
  actIndex: number;
  status: 'active' | 'completed';
  awaitingChoice?: boolean;
  /** World week-in-cycle at which this save first started tracking THIS
   *  cycle — informational (drives the "you joined partway through" banner
   *  note); advanceStoryChapters's catch-up/recap decision is driven purely
   *  by how many acts are due at once, not by this field. */
  joinedAtWeek: number;
  /** Per-chapter-progress flags set by act/finale consequences, read by
   *  later acts' resolve() and by the finale-answered/participated gates
   *  (`finaleAnswered`, `finaleParticipated`, `epilogueResolved`) — same
   *  flag-bag convention as narrative-events.ts's ChainProgressState. */
  flags?: Record<string, boolean>;
}

/** Permanent record of a resolved chapter — the Chronicle-feed precedent
 *  (LS4 corporate eras, LS7 season archive): a chapter's outcome becomes
 *  part of this save's history the moment its finale resolves (or its
 *  window closes unanswered). */
export interface CompletedChapterRecord {
  cycleIndex: number;
  chapterId: string;
  chapterName: string;
  finaleSuccess: boolean;
  completedAtMs: number;
  headline: string;
}

export interface StoryChaptersState {
  current: ChapterProgressState | null;
  /** Most-recent-last, capped at 20 — plenty for the in-game history view;
   *  a future public Chronicle wave can republish selected entries the same
   *  opt-in way LS4's corp-era registry does. */
  history: CompletedChapterRecord[];
}

/** One re-engagement objective inside a ReturningCommanderTrack — one per
 *  CLAUDE.md time loop (tactical/daily/weekly/monthly), evaluated live from
 *  GameState deltas against the track's baseline (returning-commander.ts's
 *  getReturningCommanderObjectives) rather than stored as mutable state, so
 *  it can never desync from the actual save. */
export interface ReturningCommanderObjective {
  id: string;
  loop: 'tactical' | 'daily' | 'weekly' | 'monthly';
  label: string;
  done: boolean;
}

export interface ReturningCommanderTrack {
  startedAtMs: number;
  /** 7-day objective window end (RETURNING_COMMANDER_TRACK_DURATION_MS). */
  expiresAtMs: number;
  /** How long the player was away, for display ("welcome back after N
   *  days"). Captured once at track creation — the lapse that TRIGGERED it. */
  lapseDays: number;
  /** Snapshot of cumulative counters at track creation — objectives compare
   *  current state against this, never against zero, so partial progress
   *  made before the lapse doesn't retroactively complete an objective. */
  baseline: {
    researchCompleted: number;
    buildingsComplete: number;
    completedContracts: number;
    earnedAchievements: number;
    claimedMilestones: number;
  };
  /** One-time re-entry stipend already granted when the track started
   *  (informational — the money was already applied to state.money). */
  stipendGranted: number;
}

export interface DeliveryContractState {
  id: string;
  issuerKind: 'faction' | 'player';
  issuerFactionId?: string;
  issuerPlayerName?: string;
  title: string;
  resourceId: string;
  quantity: number;
  paymentMoney: number;
  deadlineAtMs: number;
  reputationOnComplete: number;
  reputationOnDefault: number;
  status: 'open' | 'accepted' | 'completed' | 'defaulted' | 'cancelled';
  offeredAtMs: number;
  acceptedAtMs?: number;
  completedAtMs?: number;
  defaultedAtMs?: number;
  /** E2 (§2.3): the live spot price per unit locked in when the contract was
   *  accepted — a genuine forward (lock today's spot, deliver in 72h). Absent
   *  = accepted before a snapshot was available (base-priced). */
  spotUnitAtAcceptance?: number;
  /** E7 (docs/ECONOMY_PVP_2026-08.md §E7): the zone this contract executes
   *  in (the issuing faction's territory — zone-influence.ts
   *  FACTION_TERRITORY). Display/flavor only for this client-simulated pool.
   *  Absent for factions with no mapped territory (Hive, Nebula Reavers). */
  zoneSlug?: string;
}

// ─── Interstellar era (Wave 10 — expeditions.ts) ────────────────────────────
// Per CLAUDE.md "Long-horizon expansion": solar-system gameplay is the
// mid-game; interstellar exploration / colonization / trade is the end-game.
// These types are defined here (like DeliveryContractState) so GameState can
// reference them without circular imports; all logic lives in expeditions.ts.

export type ExpeditionPhase =
  | 'outbound'     // in jump-transit to the target system
  | 'exploring'    // arrived; surveying — the colonize-or-return decision window
  | 'returning'    // in jump-transit back to Sol
  | 'colonizing'   // ship committed to founding a colony (terminal for the ship)
  | 'completed'    // returned to Sol; findings + cargo delivered
  | 'lost';        // destroyed en route by hazards (insurance may have paid out)

export interface ExpeditionHazardEntry {
  monthIndex: number;       // expedition month the hazard struck
  type: 'radiation_burst' | 'debris_impact' | 'systems_failure';
  damagePct: number;        // 0-1 hull integrity lost after mitigation
  mitigatedPct: number;     // 0-1 fraction of raw damage absorbed
  summary: string;
}

export interface ExpeditionOutcome {
  surveyDataPayout: number;                 // $ credited on return
  resourceSamples: Record<string, number>;  // cargo delivered to inventory on return
  colonySuitability: number;                // 0-1 — scales colony founding results
  firstContactFactionId?: string;           // faction met on arrival (lore hook)
  summary: string;
}

export interface ExpeditionState {
  id: string;
  targetSystemId: string;          // key into INTERSTELLAR_SYSTEMS
  shipInstanceId: string;          // committed ship (status 'expedition' while away)
  shipDefinitionId: string;
  crew: number;                    // workforce committed (returned on completion, lost with the ship)
  /** Which workforce pools the crew was drawn from (returned to the same pools). */
  crewBreakdown?: Record<string, number>;
  phase: ExpeditionPhase;
  launchedAtMs: number;
  /** Total game-months elapsed since game start (quarterly-reports convention) at launch. */
  launchGameMonth: number;
  /** Game-months of one-way transit (distanceLy × GAME_MONTHS_PER_LY). */
  outboundMonths: number;
  /** Game-months spent surveying at the destination before auto-return. */
  exploreMonths: number;
  /** Expedition-months processed so far (advanced by processExpeditionTick). */
  monthsElapsed: number;
  /** Deterministic RNG seed fixed at launch — hazards & outcomes are replayable. */
  seed: number;
  /** Upfront mitigation choices (CLAUDE.md: loss must be insurable/mitigable). */
  insured: boolean;
  insurancePremiumPaid: number;
  extraShielding: boolean;
  totalCost: number;               // full launch cost (basis for insurance payout)
  hullIntegrity: number;           // 1.0 → 0; expedition lost at ≤ 0
  hazardLog: ExpeditionHazardEntry[];
  outcome?: ExpeditionOutcome;     // rolled on arrival (start of 'exploring')
  colonyId?: string;               // set if this expedition founded a colony
  completedAtMs?: number;
}

export interface InterstellarColonyState {
  id: string;
  systemId: string;
  name: string;
  foundedAtMs: number;
  foundedGameMonth: number;
  /** Colonists on site. Grows monthly, capped by infrastructure. */
  population: number;
  /** 1-5. Each level raises production + population cap. */
  infrastructureLevel: number;
  upgradeInProgress?: { targetLevel: number; completesAtGameMonth: number } | null;
  /** ResourceIds this colony produces (drawn from the system's knownResources + exotic_fuel). */
  localResources: string[];
  /** Local warehouse — production accrues here; trade routes ship it to Sol. */
  stockpile: Record<string, number>;
  /** Total game-months processed for this colony (production cadence bookkeeping). */
  lastProcessedGameMonth: number;
  /** 0-1 from the founding expedition's survey — scales production. */
  suitability: number;
}

export interface InterstellarTradeRouteState {
  id: string;
  colonyId: string;
  systemId: string;
  resourceId: string;
  establishedAtMs: number;
  establishedGameMonth: number;
  /** One-way shipment transit in game-months (same physics as expeditions). */
  transitMonths: number;
  /** Game-months between departures. */
  cycleMonths: number;
  nextDepartureGameMonth: number;
  /** Shipments currently in transit toward Sol. */
  inTransit: { quantity: number; departedGameMonth: number; arrivesGameMonth: number }[];
  /** $ deducted per departure — logistics cost money (CLAUDE.md spatial strategy). */
  logisticsFeePerShipment: number;
  status: 'active' | 'suspended';
  totalDelivered: number;
}

// ─── Flagship Scientific Missions (4X Wave W6 — science-missions.ts) ────────
// docs/4X_BASELINE_2026-08.md Part 2b. Defined here (like ExpeditionState /
// DeliveryContractState) so GameState can reference them without circular
// imports; all logic lives in science-missions.ts.

export type ScienceMissionPhase =
  | 'design'        // mission design + instrument integration studies
  | 'build'         // flight-hardware assembly, integration & test
  | 'cruise'        // post-launch transit to the science target
  | 'on_station'    // ISO interceptor only: parked (Sun–Earth L2), awaiting a target
  | 'science_ops'   // primary science operations — discoveries roll monthly
  | 'extended_ops'  // open-ended programs after primary ops (benefits persist)
  | 'completed'     // data returned; one-time completion payout delivered
  | 'failed';       // lost at launch or in cruise (insurance may have paid)

export interface ScienceMissionDiscoveryRecord {
  id: string;
  /** Discovery-table entry id within the program definition. */
  entryId: string;
  name: string;
  /** Mission month-index (monthsElapsed) the discovery landed on. */
  missionMonth: number;
  summary: string;
  /** Human-readable payoff line for the discovery log. */
  payoffSummary: string;
}

export interface ScienceMissionState {
  id: string;
  programId: string;               // key into SCIENCE_PROGRAMS
  /** Exactly 3 instrument ids chosen at planning — the meaningful decision.
   *  Chosen instruments determine which discovery tables can roll. */
  instrumentIds: string[];
  phase: ScienceMissionPhase;
  startedAtMs: number;
  /** Total game-months since game start (quarterly-reports convention) at program start. */
  startGameMonth: number;
  /** Mission months processed so far (advanced by processScienceMissionTick). */
  monthsElapsed: number;
  /** Deterministic RNG seed fixed at start — launch, cruise, and discovery
   *  rolls are replayable and testable (expeditions.ts pattern). */
  seed: number;
  insured: boolean;
  insurancePremiumPaid: number;
  totalCost: number;
  /** Set true once the launch roll has been survived (build → cruise). */
  launched?: boolean;
  /** ISO interceptor: mission month the intercept window opened (world-shared roll). */
  interceptWindowMonth?: number;
  discoveries: ScienceMissionDiscoveryRecord[];
  /** Dedupe set — each discovery-table entry fires at most once. */
  discoveredEntryIds: string[];
  /** Global first-claim milestone this mission has become eligible for
   *  (server race via /api/space-tycoon/milestones — page posts the claim). */
  milestoneEligibleId?: string;
  /** Client bookkeeping: claim POST already attempted (idempotence). */
  milestoneClaimAttempted?: boolean;
  completedAtMs?: number;
  failedReason?: string;
}

// ─── UI Tabs ────────────────────────────────────────────────────────────────

// Audit Wave F (docs/GAME_SYSTEMS_AUDIT_2026-08.md §B2-B5): 36 tabs -> 28.
// Removed as standalone tabs (folded into a surviving hub tab as subtabs —
// see TAB_CATALOG comment in space-tycoon/page.tsx for the merge mapping):
// 'diplomacy' + 'bidding' -> 'contracts' (ContractsHubPanel, PVE/PVP subtabs)
// 'rivals' + 'leagues' -> 'leaderboard' (StandingsHubPanel)
// 'intelligence' + 'economy' + 'futures' -> 'market' (MarketHubPanel)
// 'spatial' -> 'map' (MapCommandCenter HUD overlay toggle)
// Legacy save tab ids for the six removed values are mapped forward by
// resolveLegacyTab() in space-tycoon/page.tsx so old saves/links never dead-end.
// 'science' added in 4X Wave W6 (flagship scientific missions — science-missions.ts).
export type GameTab = 'dashboard' | 'build' | 'research' | 'map' | 'services' | 'fleet' | 'crafting' | 'workforce' | 'market' | 'contracts' | 'alliance' | 'bounties' | 'predictions' | 'leaderboard' | 'seasons' | 'territory' | 'speedruns' | 'espionage' | 'megaproject' | 'megastructures' | 'reports' | 'commanders' | 'factions' | 'modules' | 'discoveries' | 'science' | 'interstellar' | 'subsidiaries' | 'specialization' | 'victory' | 'governance';

// ─── Live-Service Wave LS1 "Night Shift" — command queues, standing
// directives, away operations. docs/LIVE_SERVICE_2026-08.md §LS1. Types live
// here (GameState references them) — engine logic lives in command-queue.ts /
// standing-directives.ts / away-operations.ts.

/** Order kinds the queue can hold. Execution this wave is fully implemented
 *  for 'research' and 'build' (the two chaining examples in the LS1 player
 *  outcome: "queue the next three researches, chain two builds"). The other
 *  three kinds from the spec's data-model list are typed for forward
 *  compatibility but are not yet executable — command-queue.ts skips them
 *  with a logged reason the moment they reach the front of the queue
 *  (never silently vanish, per spec). 'service_activate' has no manual
 *  analogue in this codebase (services auto-activate when their building
 *  completes — game-engine.ts step 5), so a `build` order is the correct
 *  way to "activate" one; 'ship_dispatch' and 'craft' await a follow-up wave. */
export type CommandQueueOrderKind = 'research' | 'build' | 'ship_dispatch' | 'craft' | 'service_activate';

export interface CommandQueueOrder {
  id: string;
  kind: CommandQueueOrderKind;
  /** When the order was added to the queue (ms) — used as a floor for its
   *  simulated start time during away catch-up. */
  createdAtMs: number;
  /** Display label captured at enqueue time so the UI/ledger never breaks if
   *  a definition is later removed/renamed. */
  label: string;
  /** kind: 'research' */
  researchId?: string;
  /** kind: 'build' */
  buildingId?: string;
  locationId?: string;
}

/** Directive kinds implemented this wave. 'ship_loop' (route-repeating
 *  hauler automation via cargo-logistics.ts) is deferred — see LS1 report
 *  deviations — so it is deliberately NOT part of this union; charging its
 *  ops fee for a no-op would violate the "priced automation must actually
 *  automate something" invariant. */
export type StandingDirectiveType = 'auto_sell' | 'auto_restock' | 'auto_renew_contract' | 'maintenance_reserve';

export interface StandingDirective {
  id: string;
  type: StandingDirectiveType;
  createdAtMs: number;
  active: boolean;
  label: string;
  /** auto_sell: sell down to nothing (or maxUnitsPerMonth) while spot price
   *  stays at/above minPrice. */
  resourceId?: string;
  minPrice?: number;
  /** auto_restock: buy up toward targetStock while spot price stays at/below
   *  maxPrice, gated by any active maintenance_reserve floor. */
  maxPrice?: number;
  targetStock?: number;
  /** Shared unit cap per game-month for auto_sell / auto_restock. */
  maxUnitsPerMonth?: number;
  /** auto_renew_contract: only these resource ids (empty/undefined = any). */
  resourceWhitelist?: string[];
  maxContractsPerMonth?: number;
  /** maintenance_reserve: never let auto_restock spend money below this
   *  liquid floor. Multiple active reserve directives combine via max(). */
  reserveAmount?: number;
}

export interface AwayLedgerQueueEntry {
  kind: CommandQueueOrderKind;
  label: string;
  ok: boolean;
  reason?: string;
}

export interface AwayLedgerHazardEntry {
  monthIndex: number;
  summary: string;
}

/** Snapshot of one away-operations catch-up pass (away-operations.ts). Feeds
 *  the (LS2) Operations Debrief; LS1 only guarantees this data exists and is
 *  deterministic (same state + elapsed time -> identical ledger). */
export interface AwayLedger {
  computedAtMs: number;
  timeAwayMs: number;
  efficiencyTierLabel: string;
  /** 0-1 — the blended tier efficiency applied to revenue/mining. */
  effectiveEfficiencyPct: number;
  /** Net money delta actually applied (state.money after - before). */
  moneyDelta: number;
  resourcesDelta: Record<string, number>;
  gameMonthsProcessed: number;
  directiveFeesCharged: number;
  directiveActionsSummary: string[];
  queueExecuted: AwayLedgerQueueEntry[];
  queueSkipped: AwayLedgerQueueEntry[];
  hazardsApplied: AwayLedgerHazardEntry[];
  message: string;
}

// ─── Live-Service Wave LS4 — Corporate Eras ─────────────────────────────────
// docs/LIVE_SERVICE_2026-08.md §LS4. See corporate-eras.ts for the 8 charter
// definitions, modifier/goal math, and lifecycle functions. Types live here
// (not corporate-eras.ts) per the CommandQueueOrder/StandingDirective/
// AwayLedger precedent above — avoids a circular import with legacy-system.ts,
// which references CompletedCorporateEra's `medal` field for the new era
// milestone family without needing to import corporate-eras.ts itself.

export type EraCharterId =
  | 'expansion_era'
  | 'research_renaissance'
  | 'consolidation'
  | 'belt_century'
  | 'science_age'
  | 'logistics_empire'
  | 'civic_era'
  | 'interstellar_prelude';

/** Bronze/silver/gold/platinum per how far the era's goal was carried;
 *  'filed' = the era completed but fell short of even the bronze bar — still
 *  a permanent, honestly-recorded Chronicle entry, never hidden or punitive. */
export type EraMedal = 'filed' | 'bronze' | 'silver' | 'gold' | 'platinum';

/** Snapshot of tracked stats at era charter time — every completed era's
 *  goal is scored off the DELTA between this and the same read at era end,
 *  never off cumulative totals (so a corporation's 3rd era isn't graded
 *  against its 1st era's head start). */
export interface EraStatSnapshot {
  buildingsCompleted: number;
  researchCompleted: number;
  resourcesMined: number;
  shipsBuilt: number;
  reputation: number;
  expeditionsLaunched: number;
  totalSpent: number;
  netWorth: number;
}

export interface ActiveCorporateEra {
  /** 0-based, sequential per corporation — never reused. */
  eraIndex: number;
  charterId: EraCharterId;
  startedAtMs: number;
  /** startedAtMs + ERA_DURATION_MS (90 real days) — fixed at charter time,
   *  wall-clock, decoupled from tick speed so a lapsed player's era still
   *  ends on schedule (LS1's clock-fix precedent). */
  endsAtMs: number;
  /** League bracket (1-8, league-system.ts assignPlayerToLeague) at charter
   *  time — the goal target bracket-scales off this so grading is fair at
   *  every corporate scale, never re-evaluated mid-era even if net worth
   *  crosses a bracket boundary. */
  bracketAtStart: number;
  startSnapshot: EraStatSnapshot;
}

export interface CompletedCorporateEra {
  eraIndex: number;
  charterId: EraCharterId;
  startedAtMs: number;
  endedAtMs: number;
  bracketAtStart: number;
  medal: EraMedal;
  /** Raw goal-completion ratio (1.0 = target exactly met) — uncapped for
   *  display; getEraMedalForScore() buckets it into the 5 medal grades. */
  goalScore: number;
  goalActual: number;
  goalTarget: number;
  /** A few headline stat deltas for the Chronicle card — not exhaustive,
   *  just the ones worth reading as history. */
  headlineStats: { label: string; value: number }[];
  /** Up to 5 milestone-type eventLog titles still present in the log at
   *  completion time (best-effort — see corporate-eras.ts's completeEra doc
   *  comment for why this isn't a strict era-window filter). */
  notableEvents: string[];
}

export interface CorporateErasState {
  currentEra: ActiveCorporateEra | null;
  completedEras: CompletedCorporateEra[];
}

// ─── Live-Service Wave LS6 — Programs Queue (crew/leader training, the EVE
// skill-queue trick) ─────────────────────────────────────────────────────
// docs/LIVE_SERVICE_2026-08.md §LS6. Types live here (GameState references
// them) per the CommandQueueOrder/StandingDirective/CorporateEra precedent
// above; engine logic lives in programs.ts, retirement logic in
// commanders.ts. `class`/`rarity` below are stored as plain strings (not
// commanders.ts's CommanderClass/CommanderRarity unions) to avoid a
// types.ts -> commanders.ts circular import (commanders.ts already imports
// GameState from this file).

export type ProgramTrack = 'crew_cohort' | 'leader_development' | 'rd_residency';

/** One program instance sitting in a track's FIFO queue. Unlike
 *  CommandQueueOrder (which shares a multi-channel pool — 2 research slots,
 *  N build slots), each ProgramTrack is exactly ONE channel: only
 *  queues[track][0] can ever be "active" (startedAtMs set); everything
 *  behind it waits. `startedAtMs === null` means still queued. */
export interface ProgramInstance {
  id: string;
  track: ProgramTrack;
  defId: string;
  /** Display label captured at enqueue time (same rationale as
   *  CommandQueueOrder.label — survives a later content rename/removal). */
  label: string;
  createdAtMs: number;
  startedAtMs: number | null;
  /** Effective wall-clock duration in ms, captured at enqueue time from the
   *  program definition (durationDays * 86_400_000). */
  durationMs: number;
  /** leader_development / rd_residency: the hired commander this program is
   *  posted to. Cleared from any assignment for the duration — the
   *  opportunity cost the spec calls for. */
  targetCommanderId?: string;
  /** rd_residency only: the ResearchCategory id the residency is themed on
   *  (display/flavor — see programs.ts header for why the compounding bonus
   *  itself is not literally category-scoped this wave). */
  targetCategory?: string;
}

export interface ProgramsState {
  queues: Record<ProgramTrack, ProgramInstance[]>;
  /** One entry per completed crew_cohort program (duplicates allowed — a
   *  cohort can be re-run for a repeated, capped contribution). Drives
   *  getProgramWorkforceBonuses(); crew_cohort completions ONLY — leader
   *  programs grant their effects directly onto the HiredCommander record,
   *  not through this list. */
  completedCohortDefIds: string[];
}

/** A permanent record of a retired leader — commanders.ts's
 *  processLeaderRetirements() appends one and removes the commander from
 *  hiredCommanders. Feeds legacy-system.ts's leader-legacy stretch family
 *  (state.retiredLeaders.length) and the (future) Chronicle. */
export interface RetiredLeaderRecord {
  definitionId: string;
  name: string;
  /** CommanderClass, stored as a plain string — see file-header note. */
  class: string;
  /** CommanderRarity, stored as a plain string — see file-header note. */
  rarity: string;
  retiredAtMs: number;
  monthsServed: number;
}

/** A time-boxed onboarding boost for the NEXT hire of a matching class,
 *  granted when a leader of that class retires (the spec's "mentor bonuses
 *  to successors"). One-shot: hireCommander() consumes (removes) the first
 *  matching unexpired entry it finds. */
export interface LeaderMentorBoost {
  /** CommanderClass, stored as a plain string — see file-header note. */
  class: string;
  bonusXp: number;
  expiresAtMs: number;
}
