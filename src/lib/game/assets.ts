// ─── Space Tycoon: Asset Mapping ──────────────────────────────────────────────
// Maps game entity IDs to their art asset paths in /public/game/

const BASE = '/game';

// ─── BUILDING ASSETS ─────────────────────────────────────────────────────────
// Maps building category → asset image
export const BUILDING_ASSETS: Record<string, string> = {
  launch_pad: `${BASE}/building-launch-pad.webp`,
  ground_station: `${BASE}/building-data-center.webp`,
  satellite: `${BASE}/building-satellite.webp`,
  space_station: `${BASE}/building-space-station.webp`,
  datacenter: `${BASE}/building-data-center.webp`,
  solar_farm: `${BASE}/building-solar-farm.webp`,
  mining: `${BASE}/building-mining-facility.webp`,
  habitat: `${BASE}/building-habitat.webp`,
  fabrication: `${BASE}/building-fabrication.webp`,
  refinery: `${BASE}/building-fabrication.webp`,
  propellant_depot: `${BASE}/building-fabrication.webp`,
};

// ─── LOCATION ASSETS ─────────────────────────────────────────────────────────
export const LOCATION_ASSETS: Record<string, string> = {
  earth_surface: `${BASE}/location-earth-surface.webp`,
  leo: `${BASE}/location-leo.webp`,
  geo: `${BASE}/location-geo.webp`,
  lunar_orbit: `${BASE}/location-lunar-orbit.webp`,
  lunar_surface: `${BASE}/location-lunar-surface.webp`,
  mars_orbit: `${BASE}/location-mars-orbit.webp`,
  mars_surface: `${BASE}/location-mars-surface.webp`,
  asteroid_belt: `${BASE}/location-asteroid-belt.webp`,
  jupiter_system: `${BASE}/location-jupiter-system.webp`,
  saturn_system: `${BASE}/location-saturn-system.webp`,
  outer_system: `${BASE}/location-outer-system.webp`,
  // Colony locations — biome-specific planet art per body
  mercury_surface: `${BASE}/planet-lava.webp`,
  venus_orbit: `${BASE}/planet-colony.webp`,
  ceres_surface: `${BASE}/planet-asteroid-field.webp`,
  io_surface: `${BASE}/planet-lava.webp`,
  europa_surface: `${BASE}/planet-ice.webp`,
  ganymede_surface: `${BASE}/planet-ice.webp`,
  callisto_surface: `${BASE}/planet-ice.webp`,
  titan_surface: `${BASE}/planet-gas-giant.webp`,
  enceladus_surface: `${BASE}/planet-ice.webp`,
  titania_surface: `${BASE}/planet-ice.webp`,
  triton_surface: `${BASE}/planet-ice.webp`,
  pluto_surface: `${BASE}/planet-ice.webp`,
};

// ─── PLANET BIOME ASSETS ─────────────────────────────────────────────────────
// Thematic art for biome/terrain — used for hero imagery on detail panels
// and as fallback art for exotic locations (anomalies, black holes, ruins).
export const PLANET_ASSETS: Record<string, string> = {
  terrestrial: `${BASE}/planet-terrestrial.webp`,
  desert: `${BASE}/planet-desert.webp`,
  ice: `${BASE}/planet-ice.webp`,
  lava: `${BASE}/planet-lava.webp`,
  gas_giant: `${BASE}/planet-gas-giant.webp`,
  nebula: `${BASE}/planet-nebula.webp`,
  black_hole: `${BASE}/planet-black-hole.webp`,
  asteroid_field: `${BASE}/planet-asteroid-field.webp`,
  ancient_ruins: `${BASE}/planet-ancient-ruins.webp`,
  anomaly: `${BASE}/planet-anomaly.webp`,
  colony: `${BASE}/planet-colony.webp`,
};

// ─── RESOURCE ASSETS ─────────────────────────────────────────────────────────
export const RESOURCE_ASSETS: Record<string, string> = {
  lunar_water: `${BASE}/resource-lunar-water-ice.webp`,
  mars_water: `${BASE}/resource-martian-water.webp`,
  iron: `${BASE}/resource-iron.webp`,
  aluminum: `${BASE}/resource-aluminum.webp`,
  titanium: `${BASE}/resource-titanium.webp`,
  platinum_group: `${BASE}/resource-platinum-group.webp`,
  gold: `${BASE}/resource-gold.webp`,
  rare_earth: `${BASE}/resource-rare-earth.webp`,
  methane: `${BASE}/resource-methane.webp`,
  ethane: `${BASE}/resource-ethane.webp`,
  exotic_materials: `${BASE}/resource-exotic-materials.webp`,
  helium3: `${BASE}/resource-helium3.webp`,
};

// ─── SHIP ASSETS ─────────────────────────────────────────────────────────────
// Keys must match the `id` field in src/lib/game/ships.ts.
export const SHIP_ASSETS: Record<string, string> = {
  cargo_shuttle: `${BASE}/ship-cargo-shuttle.webp`,
  freighter: `${BASE}/ship-space-freighter.webp`,
  heavy_transport: `${BASE}/ship-heavy-transport.webp`,
  fuel_tanker: `${BASE}/ship-fuel-tanker.webp`,
  mining_drone: `${BASE}/ship-mining-drone.webp`,
  ore_harvester: `${BASE}/ship-ore-harvester.webp`,
  asteroid_miner: `${BASE}/ship-mining-m.webp`,
  deep_space_miner: `${BASE}/ship-mining-l.webp`,
  survey_probe: `${BASE}/ship-scout.webp`,
  // Interstellar hulls (Wave 10) — distinct angle/hull variants so they read
  // differently from their solar-system cousins (survey_probe, heavy_transport).
  starfarer_explorer: `${BASE}/ship-scout-angle2.webp`,
  colony_ark: `${BASE}/ship-transport-l.webp`,
};

// ─── BACKGROUND ASSETS ───────────────────────────────────────────────────────
export const BG_ASSETS = {
  loadingScreen: `${BASE}/bg-loading-screen.webp`,
  spaceNebula: `${BASE}/bg-space-nebula.webp`,
  starfield: `${BASE}/bg-starfield.webp`,
};

// ─── EVENT ILLUSTRATION ASSETS (4X Wave W2) ─────────────────────────────────
// docs/4X_BASELINE_2026-08.md Part 3.3 "Event illustrations" gap +
// cinematic-moments.ts's documented art gap. 16:9 mission-imagery-style
// illustrations, one per narrative chain (src/lib/game/narrative-events.ts
// chain ids). Only the first 12 chain-heads got an art pass in W2 — this map
// is intentionally partial. Consumers MUST fall back to PLANET_ASSETS/
// BG_ASSETS biome art (see cinematic-moments.ts pickNarrativeArt) when a
// chainId has no entry here, so future chains never render broken art.
export const EVENT_ART: Record<string, string> = {
  space_weather_ladder: `${BASE}/event-space_weather_ladder.webp`,
  europa_biosignature: `${BASE}/event-europa_biosignature.webp`,
  contamination_protocols: `${BASE}/event-contamination_protocols.webp`,
  iso_flyby: `${BASE}/event-iso_flyby.webp`,
  accord_council: `${BASE}/event-accord_council.webp`,
  superconductor_crisis: `${BASE}/event-superconductor_crisis.webp`,
  industry_shocks: `${BASE}/event-industry_shocks.webp`,
  crew_health_crisis: `${BASE}/event-crew_health_crisis.webp`,
  great_silence_recurrence: `${BASE}/event-great_silence_recurrence.webp`,
  triton_archive_followup: `${BASE}/event-triton_archive_followup.webp`,
  wanderer1_anomaly: `${BASE}/event-wanderer1_anomaly.webp`,
  ring_fire_anniversary: `${BASE}/event-ring_fire_anniversary.webp`,
};

// ─── MISSION PATCH ASSETS (4X Wave W2) ──────────────────────────────────────
// docs/4X_BASELINE_2026-08.md Part 3.3 "Mission patches/emblems" gap. Flat
// insignia-style badges, one per flagship science program
// (src/lib/game/science-missions.ts SCIENCE_PROGRAMS ids). Consumers must
// treat this as optional (program.icon emoji is the load-bearing fallback —
// see getMissionPatchAsset below).
export const MISSION_PATCH_ASSETS: Record<string, string> = {
  meridian_observatory: `${BASE}/patch-meridian_observatory.webp`,
  europa_ocean_access: `${BASE}/patch-europa_ocean_access.webp`,
  enceladus_plume_sampler: `${BASE}/patch-enceladus_plume_sampler.webp`,
  venus_aerostat: `${BASE}/patch-venus_aerostat.webp`,
  mars_deep_drill: `${BASE}/patch-mars_deep_drill.webp`,
  kinetic_deflection_demo: `${BASE}/patch-kinetic_deflection_demo.webp`,
  iso_interceptor: `${BASE}/patch-iso_interceptor.webp`,
  restricted_sample_return: `${BASE}/patch-restricted_sample_return.webp`,
  heliophysics_sentinels: `${BASE}/patch-heliophysics_sentinels.webp`,
  titan_rotorcraft: `${BASE}/patch-titan_rotorcraft.webp`,
  gravitational_wave_array: `${BASE}/patch-gravitational_wave_array.webp`,
  heliopause_probe: `${BASE}/patch-heliopause_probe.webp`,
};

/** Get a program's mission patch art, or null if none exists yet (graceful
 *  fallback — callers should render program.icon instead, never a broken
 *  image). */
export function getMissionPatchAsset(programId: string): string | null {
  return MISSION_PATCH_ASSETS[programId] ?? null;
}

// ─── TEXTURE ASSETS ──────────────────────────────────────────────────────────
export const TEXTURE_ASSETS = {
  earth: `${BASE}/texture-earth.webp`,
  moon: `${BASE}/texture-moon.webp`,
  mars: `${BASE}/texture-mars.webp`,
  gasGiant: `${BASE}/texture-gas-giant.webp`,
};

// ─── UI ASSETS ───────────────────────────────────────────────────────────────
export const UI_ASSETS = {
  panelBackground: `${BASE}/ui-panel-background.webp`,
  iconSun: `${BASE}/icon-sun.webp`,
};

// ─── VFX ASSETS ──────────────────────────────────────────────────────────────
// Effect overlays ready for future combat / travel / mining animations.
export const EFFECT_ASSETS = {
  beamWeapon: `${BASE}/effect-beam-weapon.webp`,
  engineTrail: `${BASE}/effect-engine-trail.webp`,
  explosion: `${BASE}/effect-explosion.webp`,
  kineticProjectile: `${BASE}/effect-kinetic-projectile.webp`,
  miningLaser: `${BASE}/effect-mining-laser.webp`,
  missile: `${BASE}/effect-missile.webp`,
  shield: `${BASE}/effect-shield.webp`,
  warpJump: `${BASE}/effect-warp-jump.webp`,
};

// ─── SEASONAL SKINS ──────────────────────────────────────────────────────────
// Calendar-holiday overlay art keyed by building base name.
// Activate via getSeasonalSkin() during the Halloween / Winter windows.
export type SeasonalHoliday = 'halloween' | 'winter' | null;

const SEASONAL_BUILDING_NAMES = [
  'command-center', 'defense-grid', 'energy-generator', 'research-lab', 'shipyard',
] as const;

export const SEASONAL_ASSETS: Record<'halloween' | 'winter', {
  banner: string;
  frame: string;
  backgrounds: string[];
  buildings: Record<string, string>;
}> = {
  halloween: {
    banner: `${BASE}/seasonal-halloween-banner.webp`,
    frame: `${BASE}/seasonal-halloween-frame.webp`,
    backgrounds: [1, 2, 3].map(i => `${BASE}/seasonal-halloween-bg-${i}.webp`),
    buildings: Object.fromEntries(SEASONAL_BUILDING_NAMES.map(n => [n, `${BASE}/seasonal-halloween-${n}.webp`])),
  },
  winter: {
    banner: `${BASE}/seasonal-winter-banner.webp`,
    frame: `${BASE}/seasonal-winter-frame.webp`,
    backgrounds: [1, 2, 3].map(i => `${BASE}/seasonal-winter-bg-${i}.webp`),
    buildings: Object.fromEntries(SEASONAL_BUILDING_NAMES.map(n => [n, `${BASE}/seasonal-winter-${n}.webp`])),
  },
};

/** Active holiday based on real-world date. Halloween: Oct 20–Nov 5. Winter: Dec 15–Jan 15. */
export function getActiveHoliday(date: Date = new Date()): SeasonalHoliday {
  const m = date.getUTCMonth(); // 0-indexed
  const d = date.getUTCDate();
  if ((m === 9 && d >= 20) || (m === 10 && d <= 5)) return 'halloween';
  if ((m === 11 && d >= 15) || (m === 0 && d <= 15)) return 'winter';
  return null;
}

/** Get a holiday-themed skin for a building if one is active, else null. */
export function getSeasonalBuildingSkin(
  buildingArtName: string,
  date: Date = new Date()
): string | null {
  const holiday = getActiveHoliday(date);
  if (!holiday) return null;
  return SEASONAL_ASSETS[holiday].buildings[buildingArtName] ?? null;
}

// Categories whose new art has tier variants (-s2 through -s5).
// Tier 1 uses the base image (no suffix).
const BUILDING_TIER_BASE: Record<string, string> = {
  solar_farm: 'energy-generator',
  mining: 'mineral-extractor',
  habitat: 'population-center',
  fabrication: 'fabrication-plant',
  refinery: 'gas-refinery',
  propellant_depot: 'storage-vault',
  datacenter: 'research-academy',
  ground_station: 'sensor-array',
};

// Helper: Get building asset by building ID + category + tier
// Categories in BUILDING_TIER_BASE get tier-specific art (-s2 to -s5).
// Everything else falls back to the flat category image.
export function getBuildingAsset(buildingId: string, category: string, tier: number = 1): string {
  const tierBase = BUILDING_TIER_BASE[category];
  if (tierBase) {
    const suffix = tier >= 2 && tier <= 5 ? `-s${tier}` : '';
    return `${BASE}/building-${tierBase}${suffix}.webp`;
  }
  return BUILDING_ASSETS[category] || BUILDING_ASSETS.habitat;
}

// Helper: Get ship asset by ship definition ID
export function getShipAsset(shipId: string): string {
  return SHIP_ASSETS[shipId] || SHIP_ASSETS.cargo_shuttle;
}
