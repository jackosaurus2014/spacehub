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
// Keys must match the `id` field in src/lib/game/ships.ts. Every hull in SHIPS
// has a dedicated image — the map is complete, so getShipAsset's cargo_shuttle
// fallback is a defensive backstop rather than a load-bearing default.
//
// Wave A6 (fleet art pass) regenerated ALL of these. The prior set had been
// documented as "19 images / 11 hull ids, good coverage" but had never been
// visually audited: five of the eleven mapped images were not spacecraft at all
// (a station ring for asteroid_miner, a ground mining facility for
// deep_space_miner, a rail yard of cargo trains for colony_ark, a Mars surface
// base for ore_harvester), the starfarer_explorer reused a swept-wing fighter
// render, and several carried hull lettering — both of which violate canon
// (CLAUDE.md's absolute no-combat rule; the generator's own no-text directive).
//
// A6 replaced all of them with one unified silhouette treatment: orthographic
// top-down plan view, bow toward the top of the frame, single vessel isolated
// on a flat near-black field with a soft contact shadow, and a role-keyed
// accent (cyan = transport, amber = tanker, orange = mining, violet = survey)
// so role is legible from the thumbnail alone. Ships render small in fleet
// lists and as map markers, so silhouette legibility is the governing
// constraint — deliberately NOT the starfield hero-render treatment the old
// ship-scout used, which turns to mush below ~64px.
export const SHIP_ASSETS: Record<string, string> = {
  cargo_shuttle: `${BASE}/ship-cargo-shuttle.webp`,
  freighter: `${BASE}/ship-space-freighter.webp`,
  heavy_transport: `${BASE}/ship-heavy-transport.webp`,
  fuel_tanker: `${BASE}/ship-fuel-tanker.webp`,
  // Wave A6 addition — prospector_drone (the no-research starter miner) had no
  // entry at all and silently fell through to the cargo_shuttle image, showing
  // a crewed cargo hauler for an uncrewed mining drone.
  prospector_drone: `${BASE}/ship-prospector-drone.webp`,
  mining_drone: `${BASE}/ship-mining-drone.webp`,
  ore_harvester: `${BASE}/ship-ore-harvester.webp`,
  asteroid_miner: `${BASE}/ship-mining-m.webp`,
  deep_space_miner: `${BASE}/ship-mining-l.webp`,
  survey_probe: `${BASE}/ship-scout.webp`,
  // Interstellar hulls (Wave 10) — these previously borrowed other hulls' art
  // (ship-scout-angle2 / ship-transport-l). Wave A6 gave them dedicated
  // renders: the Starfarer's warp-coil rings and the Ark's rotating habitat
  // ring are the silhouette cues that mark the interstellar era.
  starfarer_explorer: `${BASE}/ship-starfarer-explorer.webp`,
  colony_ark: `${BASE}/ship-colony-ark.webp`,
};

// ─── BACKGROUND ASSETS ───────────────────────────────────────────────────────
export const BG_ASSETS = {
  loadingScreen: `${BASE}/bg-loading-screen.webp`,
  spaceNebula: `${BASE}/bg-space-nebula.webp`,
  starfield: `${BASE}/bg-starfield.webp`,
};

// ─── EVENT ILLUSTRATION ASSETS (4X Wave W2, completed Wave V6) ──────────────
// docs/4X_BASELINE_2026-08.md Part 3.3 "Event illustrations" gap +
// cinematic-moments.ts's documented art gap. 16:9 mission-imagery-style
// illustrations, one per narrative CHAIN (src/lib/game/narrative-events.ts
// CHAIN_DEFINITIONS ids — EVENT_ART is keyed by chainId, not by individual
// stage id, so one illustration covers every stage in that chain's arc).
// W2 shipped the first 12 of the (then) 12 chains; Wave V6
// (docs/VISUAL_DEPTH_2026-08.md) audited the live chain list and found
// exactly one chain added since (W13's board_politics_demand) lacked art —
// generated and added below, so this map is now complete for all chains in
// CHAIN_DEFINITIONS.
//
// Wave A3 (docs/VISUAL_AAA_2026-08.md) re-audited this map against live
// content and CONFIRMED it complete: 13/13 chains covered. The A3.2 backlog
// entry's "~32 missing event illustrations" counted individual chain STAGES
// (45 total) rather than chains, but only a stage flagged
// `presentationHint: 'cinematic'` ever reaches CinematicOverlay and thus ever
// renders art — and all 11 such stages today are chain-HEADS (stage 0), every
// one of which resolves through the chain-keyed entry below. Per-stage art
// would therefore be generated for surfaces that never display it. No
// generation was needed; see the A3 section of the AAA spec.
//
// Still keep the fallback contract for future chains: consumers MUST fall
// back to PLANET_ASSETS/BG_ASSETS biome art (see cinematic-moments.ts
// pickNarrativeArt) when a chainId has no entry here, so a future chain added
// without art still renders something on-theme instead of a broken image.
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
  // Wave V6 addition — W13's Governance/board-politics chain.
  board_politics_demand: `${BASE}/event-board_politics_demand.webp`,
};

// ─── STORY CHAPTER ILLUSTRATIONS (Wave A3) ──────────────────────────────────
// docs/VISUAL_AAA_2026-08.md §A3. The Live-Service LS8 Story Chapters
// (src/lib/game/chapters.ts CHAPTER_DEFINITIONS ids) open on a
// `presentationHint: 'cinematic'` Act 1 — the SAME full-screen
// CinematicOverlay surface the narrative chains use — but shipped with no
// dedicated art, falling back to reused PLANET_ASSETS biome imagery. A3's
// art audit found this to be the only genuine illustration gap left on that
// surface, so all three chapters got a dedicated 16:9 illustration in the
// established EVENT_ART house style (same 1344x768 / `--batch` /
// resize-art.ts pipeline as Wave V6's board_politics_demand).
//
// Lore-anchored per docs/LORE.md: the Great Nest bio-structure gone dark
// (Hive Collective, the 2103 Great Silence recurring), the Pallas-4 Free
// Port trading concourse (Syndicate), and the Triton Archive vault sealing
// (Echo Remnants, the unsolved 2149 breach). Keyed by chapterId; consumers
// keep the biome-art fallback for any future chapter authored without art
// (see chapters.ts pickChapterArt).
export const CHAPTER_ART_ASSETS: Record<string, string> = {
  the_second_silence: `${BASE}/chapter-the_second_silence.webp`,
  the_pallas_ledger: `${BASE}/chapter-the_pallas_ledger.webp`,
  triton_archive_second_breach: `${BASE}/chapter-triton_archive_second_breach.webp`,
};

/** Get a Story Chapter's dedicated illustration, or null if none exists yet
 *  (same graceful-fallback contract as getMissionPatchAsset — callers should
 *  fall back to thematic biome art rather than request a 404). */
export function getChapterArt(chapterId: string): string | null {
  return CHAPTER_ART_ASSETS[chapterId] ?? null;
}

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

// ─── FACTION LEADER PORTRAITS (Wave V6) ─────────────────────────────────────
// docs/VISUAL_DEPTH_2026-08.md Wave V6 batch B3. Distinct from the flat
// emblem-only faction art above (`faction-{id}.webp`, referenced via
// factions.ts's getFactionArtUrl) — these are portrait busts of the named
// faction leaders from docs/LORE.md's "Named leaders" per faction, keyed by
// the same FactionId used throughout src/lib/game/factions.ts. Hive
// Collective has no singular leader per lore ("interfaces rotate"), so its
// entry depicts a spokesbody interface rather than a named individual.
export const FACTION_LEADER_ASSETS: Record<string, string> = {
  'the-dominion': `${BASE}/faction-leader-the-dominion.webp`,
  'the-syndicate': `${BASE}/faction-leader-the-syndicate.webp`,
  'void-corsairs': `${BASE}/faction-leader-void-corsairs.webp`,
  'hive-collective': `${BASE}/faction-leader-hive-collective.webp`,
  'nebula-reavers': `${BASE}/faction-leader-nebula-reavers.webp`,
  'echo-remnants': `${BASE}/faction-leader-echo-remnants.webp`,
};

/** Get a faction's named-leader portrait, or null if none exists (keeps the
 *  same graceful-fallback contract as getMissionPatchAsset — callers should
 *  fall back to the flat emblem art (factions.ts getFactionArtUrl) rather
 *  than request a 404). */
export function getFactionLeaderArt(factionId: string): string | null {
  return FACTION_LEADER_ASSETS[factionId] ?? null;
}

// ─── REGION BANNERS (Wave V6) ───────────────────────────────────────────────
// docs/VISUAL_DEPTH_2026-08.md Wave V6 batch B4. Ultra-wide 21:9 hero vistas
// for the 8 canonical regions named throughout CLAUDE.md's GUI/Command
// Center section and the V6 spec's prompt table (inner system / asteroid
// belt / lunar / martian / jovian / saturnian / outer system / interstellar).
// This is a coarser grouping than RegionBackdrop.tsx's per-location
// REGION_PALETTE (12+ location ids) or SolarSystemCanvas's LocationType-keyed
// REGION_LABELS — intended for V5 ConsolePanel keylines and V4's galactic
// vista thumbnails, both of which think in terms of these 8 zones rather
// than individual locations. `interstellar` is new (no LocationType/location
// id maps to it yet — it represents the post-heliopause end-game zone
// introduced by interstellar.ts).
export const REGION_ART: Record<string, string> = {
  inner_system: `${BASE}/region-inner_system.webp`,
  asteroid_belt: `${BASE}/region-asteroid_belt.webp`,
  lunar: `${BASE}/region-lunar.webp`,
  martian: `${BASE}/region-martian.webp`,
  jovian: `${BASE}/region-jovian.webp`,
  saturnian: `${BASE}/region-saturnian.webp`,
  outer_system: `${BASE}/region-outer_system.webp`,
  interstellar: `${BASE}/region-interstellar.webp`,
};

/** Get a canonical region's hero banner, or null if the id isn't one of the
 *  8 canonical regions above. */
export function getRegionArt(regionId: string): string | null {
  return REGION_ART[regionId] ?? null;
}

// ─── INTERSTELLAR SYSTEM VISTAS (Wave V6) ───────────────────────────────────
// docs/VISUAL_DEPTH_2026-08.md Wave V6 batch B5. One vista per
// src/lib/game/interstellar.ts INTERSTELLAR_SYSTEMS id — consumed by V4's
// galactic layer restage (per-system vista thumbnails behind node buttons).
export const SYSTEM_ART: Record<string, string> = {
  proxima_centauri: `${BASE}/system-proxima_centauri.webp`,
  barnards_star: `${BASE}/system-barnards_star.webp`,
  wolf_359: `${BASE}/system-wolf_359.webp`,
  alpha_centauri: `${BASE}/system-alpha_centauri.webp`,
  sirius: `${BASE}/system-sirius.webp`,
};

/** Get an interstellar system's vista art, or null if none exists yet. */
export function getSystemVista(systemId: string): string | null {
  return SYSTEM_ART[systemId] ?? null;
}

// ─── SKYBOX (Wave V6) ────────────────────────────────────────────────────────
// docs/VISUAL_DEPTH_2026-08.md Wave V6 batch B6 — a single seamless
// equirectangular nebula panorama for SolarMap3D's scene atmosphere pass
// (Wave V4, "equirect nebula skybox (Gemini-generated, V6 asset) at 2k").
// Generated via Gemini at 21:9 (the nearest valid aspect ratio to 2:1 — see
// scripts/generate-art.ts's VALID_ASPECT_RATIOS) then center-cropped to an
// exact 2048x1024 (true 2:1 equirect) with sharp — ready to load directly
// into a THREE.EquirectangularReflectionMapping texture, no further resize
// needed.
export const SKYBOX_ASSETS = {
  nebulaEquirect: `${BASE}/skybox-nebula-equirect.webp`,
};

// ─── MULTI-SIZE VARIANTS (Wave V6) ──────────────────────────────────────────
// scripts/resize-art.ts emits 1536/512/128px WebP siblings next to a base
// asset (e.g. `commander-dr-solene-marchetti-512.webp`) for every asset
// generated as part of Wave V6 (2026-08-15 onward) — and, as of Wave A6, for
// every entry in SHIP_ASSETS above (all 12 hulls have -512/-128 siblings; the
// -1536 tier is absent because Gemini returns 1024² and resize-art.ts never
// upscales, exactly as with the commander portraits). The rest of the
// pre-existing legacy backlog does NOT have these siblings — deferred per
// docs/VISUAL_DEPTH_2026-08.md Wave V6 ("do not block on the 377-image
// legacy backlog"). Use getArtVariant() rather than string-splicing a size
// onto a path directly so intent is documented at the call site; this
// function does NOT check the filesystem (it runs in the browser too), so
// only call it for assets known to have variants — passing a legacy asset
// without siblings will produce a path that 404s.
export const ART_VARIANT_SIZES = [1536, 512, 128] as const;
export type ArtVariantSize = typeof ART_VARIANT_SIZES[number];

export function getArtVariant(basePath: string, size: ArtVariantSize): string {
  const dot = basePath.lastIndexOf('.');
  return `${basePath.slice(0, dot)}-${size}${basePath.slice(dot)}`;
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
