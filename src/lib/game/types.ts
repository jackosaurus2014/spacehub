// ─── Space Tycoon: Type Definitions ─────────────────────────────────────────

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
  activeServices: ServiceInstance[];
  unlockedLocations: string[];
  resources: Record<string, number>; // ResourceId → quantity

  eventLog: GameEvent[];
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
  activeEffects?: { eventId: string; label: string; expiresAtMonth: number; revenueMultiplier: number; costMultiplier: number }[];
  pendingChoice?: { eventId: string; eventName: string; eventIcon: string; eventDescription: string; choices: { label: string; description: string }[] } | null;
  incomeHistory?: number[];

  // Contracts
  availableContracts?: string[];
  activeContracts?: string[];
  completedContracts?: string[];
  lastContractRefresh?: number;

  // Competitive milestones
  claimedMilestones?: Record<string, string>;

  // Refining / Production
  activeRefining?: { recipeId: string; startedAtMs: number; durationSeconds: number } | null;
  craftedProducts?: Record<string, number>; // Product inventory (steel_ingots, etc.)

  // Workforce
  workforce?: { engineers: number; scientists: number; miners: number; operators: number };

  // Ships
  ships?: {
    instanceId: string;
    definitionId: string;
    name: string;
    status: 'idle' | 'in_transit' | 'loading' | 'mining' | 'refining' | 'building' | 'surveying';
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

  // Corporation tier (1-6, company evolution)
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

  // Speed boosts (earned from contracts)
  availableBoosts?: { id: string; type: 'construction' | 'research'; multiplier: number; durationSeconds: number; source: string; label: string }[];
  activeBoosts?: { boostId: string; type: 'construction' | 'research'; multiplier: number; activatedAtMs: number; expiresAtMs: number; label: string }[];

  // Dynamic service pricing (from server — multiplier per service ID)
  servicePriceMultipliers?: Record<string, number>;

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

  // Subsidiaries
  subsidiaries?: {
    id: string;
    type: 'sub_launch' | 'sub_mining' | 'sub_telecom' | 'sub_tourism' | 'sub_fabrication' | 'sub_research';
    createdAtMs: number;
    operations: number;
    synergy: number;
    efficiency: number;
  }[];
}

// ─── UI Tabs ────────────────────────────────────────────────────────────────

export type GameTab = 'dashboard' | 'build' | 'research' | 'map' | 'services' | 'fleet' | 'crafting' | 'workforce' | 'market' | 'contracts' | 'alliance' | 'bounties' | 'leaderboard' | 'rivals' | 'leagues' | 'bidding' | 'seasons' | 'territory' | 'speedruns' | 'espionage' | 'megaproject' | 'megastructures';
