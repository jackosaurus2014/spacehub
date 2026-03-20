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
  baseCost: number;
  buildTimeMonths: number;
  maintenanceCostPerMonth: number;
  requiredResearch: string[];
  requiredLocation: string;
  enabledServices: string[];
  tier: number;
}

export interface BuildingInstance {
  instanceId: string;
  definitionId: string;
  locationId: string;
  buildStartDate: GameDate;
  completionDate: GameDate;
  isComplete: boolean;
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
  | 'propulsion';

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
}

export interface ActiveResearch {
  definitionId: string;
  startDate: GameDate;
  progressMonths: number;
  totalMonths: number;
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
  | 'outer_system';

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
  | 'random_event';

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

  eventLog: GameEvent[];
  stats: GameStats;
}

// ─── UI Tabs ────────────────────────────────────────────────────────────────

export type GameTab = 'dashboard' | 'build' | 'research' | 'map' | 'services';
