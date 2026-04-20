// ─── Space Tycoon: Starting Archetypes ──────────────────────────────────────
// Three distinct new-game openings. Each gives a different capital /
// infrastructure / resource mix, creating genuine strategic choice at the
// start of the game instead of a uniform slow ramp-up.
//
// Per the "Meaningful decisions" principle in CLAUDE.md, the archetype picker
// is the player's first economic decision and sets the tone for what paths
// are fastest through the tier-1 contract pool.

import type { GameState, BuildingInstance, ServiceInstance } from './types';
import { STARTING_YEAR } from './constants';

export type StartingArchetype = 'cape_heritage' | 'meridian_signals' | 'tracking_consortium';

export interface ArchetypeDefinition {
  id: StartingArchetype;
  name: string;
  company: string;
  tagline: string;
  flavor: string;
  narrative: string;
  startingMoney: number;
  startingResources: Record<string, number>;
  startingBuildings: Array<{
    definitionId: string;
    locationId: string;
  }>;
  startingServices: Array<{
    definitionId: string;
    locationId: string;
    linkedBuildingIndex: number; // index into startingBuildings above
  }>;
  /** UI accent class (Tailwind) */
  accent: {
    border: string;
    bg: string;
    text: string;
  };
  icon: string;
  strategicHint: string;
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'cape_heritage',
    name: 'Cape Heritage',
    company: 'Cape Heritage Launch Systems',
    tagline: 'Rockets before suborbital was cool.',
    flavor: 'Launch specialist',
    narrative:
      'Your family has been putting mass into orbit for three generations. The first small launch pad is already operational, the logbook is thick with flown birds, and you know the telemetry cables by touch. The cash reserves are thin because the hardware exists, but the revenue clock is already ticking.',
    startingMoney: 75_000_000,
    startingResources: { iron: 30, aluminum: 20 },
    startingBuildings: [
      { definitionId: 'launch_pad_small', locationId: 'earth_surface' },
    ],
    startingServices: [
      { definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIndex: 0 },
    ],
    accent: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-300' },
    icon: '🚀',
    strategicHint:
      'Revenue from day one. Build a second Launch Pad or Ground Station to clear the Launch Provider Certification contract ($60M) quickly, then race to Medium Launch research.',
  },
  {
    id: 'meridian_signals',
    name: 'Meridian Signals',
    company: 'Meridian Orbital Communications',
    tagline: 'The constellation is already overhead.',
    flavor: 'Orbital telecom operator',
    narrative:
      'Two LEO telecom satellites you inherited from a minority stake in Meridian are already on-orbit and paying monthly. Cash is tighter than the launch specialists because your predecessors spent it building the constellation — but that constellation is now working for you without any further investment.',
    startingMoney: 60_000_000,
    startingResources: { aluminum: 10, rare_earth: 5 },
    startingBuildings: [
      { definitionId: 'sat_telecom', locationId: 'leo' },
      { definitionId: 'sat_telecom', locationId: 'leo' },
    ],
    startingServices: [
      { definitionId: 'svc_telecom_leo', locationId: 'leo', linkedBuildingIndex: 0 },
      { definitionId: 'svc_telecom_leo', locationId: 'leo', linkedBuildingIndex: 1 },
    ],
    accent: { border: 'border-cyan-500/40', bg: 'bg-cyan-500/10', text: 'text-cyan-300' },
    icon: '📡',
    strategicHint:
      'Two active revenue streams. Build three more LEO Telecom Satellites (~$45M) to earn the Satellite Network Deployment contract ($100M + research momentum).',
  },
  {
    id: 'tracking_consortium',
    name: 'Tracking Consortium',
    company: 'Tracking & Mission Services Consortium',
    tagline: 'Where every mission calls home.',
    flavor: 'Ground operations specialist',
    narrative:
      'You run the ground. Two tracking stations and a full Mission Control Center are staffed and generating revenue from everyone else\'s launches. Biggest war chest of the three archetypes — but your infrastructure is all Earth-bound until you build your first launch pad or buy into orbit.',
    startingMoney: 100_000_000,
    startingResources: { iron: 40 },
    startingBuildings: [
      { definitionId: 'ground_station', locationId: 'earth_surface' },
      { definitionId: 'ground_station', locationId: 'earth_surface' },
      { definitionId: 'mission_control', locationId: 'earth_surface' },
    ],
    startingServices: [
      { definitionId: 'svc_ground_tracking', locationId: 'earth_surface', linkedBuildingIndex: 0 },
      { definitionId: 'svc_ground_tracking', locationId: 'earth_surface', linkedBuildingIndex: 1 },
      { definitionId: 'svc_mission_ops',     locationId: 'earth_surface', linkedBuildingIndex: 2 },
    ],
    accent: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
    icon: '📡',
    strategicHint:
      '3 active services + 3 buildings completed = the Ground Station Network contract is available for $70M on day one. Claim it and invest the cash into your first launch pad and satellites.',
  },
];

export const ARCHETYPE_MAP = new Map(ARCHETYPES.map(a => [a.id, a]));

/**
 * Apply the archetype's starting conditions to a base GameState object.
 * Expects the state to have been produced by getNewGameState — this function
 * overwrites money, resources, buildings, activeServices, and companyName.
 */
export function applyArchetype(state: GameState, archetypeId: StartingArchetype): GameState {
  const def = ARCHETYPE_MAP.get(archetypeId);
  if (!def) return state;

  const now = Date.now();
  const startDate = { year: STARTING_YEAR, month: 1 };

  const buildings: BuildingInstance[] = def.startingBuildings.map((b, i) => ({
    instanceId: `arch-${def.id}-bld-${i}-${now}`,
    definitionId: b.definitionId,
    locationId: b.locationId,
    buildStartDate: startDate,
    completionDate: startDate,
    isComplete: true,
    startedAtMs: now - 1000,
    realDurationSeconds: 1,
  }));

  const activeServices: ServiceInstance[] = def.startingServices.map(svc => ({
    definitionId: svc.definitionId,
    locationId: svc.locationId,
    linkedBuildingIds: [buildings[svc.linkedBuildingIndex].instanceId],
    startDate,
    revenueMultiplier: 1.0,
  }));

  return {
    ...state,
    money: def.startingMoney,
    resources: { ...state.resources, ...def.startingResources },
    buildings: [...buildings, ...(state.buildings || [])],
    activeServices: [...activeServices, ...(state.activeServices || [])],
    companyName: state.companyName || def.company,
    startingArchetype: archetypeId,
    // Use LEO as an automatically unlocked location when the player starts
    // with satellites there — avoids a confusing "your sat is at an invisible
    // location" state.
    unlockedLocations: def.startingBuildings.some(b => b.locationId === 'leo')
      ? Array.from(new Set([...state.unlockedLocations, 'leo']))
      : state.unlockedLocations,
    eventLog: [
      ...state.eventLog,
      {
        id: `arch-event-${now}`,
        date: startDate,
        type: 'milestone',
        title: `${def.company} takes the helm`,
        description: def.narrative,
      },
    ],
  };
}
