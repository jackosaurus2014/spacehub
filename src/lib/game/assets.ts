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
export const SHIP_ASSETS: Record<string, string> = {
  cargo_shuttle: `${BASE}/ship-cargo-shuttle.webp`,
  heavy_transport: `${BASE}/ship-heavy-transport.webp`,
  space_freighter: `${BASE}/ship-space-freighter.webp`,
  mining_drone: `${BASE}/ship-mining-drone.webp`,
  ore_harvester: `${BASE}/ship-ore-harvester.webp`,
  fuel_tanker: `${BASE}/ship-fuel-tanker.webp`,
  scout: `${BASE}/ship-scout.webp`,
  survey_probe: `${BASE}/ship-scout.webp`,
  deep_space_explorer: `${BASE}/ship-space-freighter.webp`,
};

// ─── BACKGROUND ASSETS ───────────────────────────────────────────────────────
export const BG_ASSETS = {
  loadingScreen: `${BASE}/bg-loading-screen.webp`,
  spaceNebula: `${BASE}/bg-space-nebula.webp`,
  starfield: `${BASE}/bg-starfield.webp`,
};

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

// Helper: Get building asset by building ID (falls back to category match)
export function getBuildingAsset(buildingId: string, category: string): string {
  return BUILDING_ASSETS[category] || BUILDING_ASSETS.habitat;
}

// Helper: Get ship asset by ship definition ID
export function getShipAsset(shipId: string): string {
  return SHIP_ASSETS[shipId] || SHIP_ASSETS.cargo_shuttle;
}
