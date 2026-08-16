// ─── Space Tycoon: Building Definitions ─────────────────────────────────────
// realBuildSeconds: Tier 1 ≈ 3-5 min (180-300s), Tier 2 ≈ 10-20 min, Tier 3 ≈ 30-45 min, Tier 4 ≈ 45-60 min
// Duplicate builds at same location scale by 1.3x time (in addition to cost scaling)

import type { BuildingDefinition, BuildingCategory, BuildingDerivedStats, BuildingSynergyRange } from './types';

export const BUILDINGS: BuildingDefinition[] = [
  // ─── LAUNCH PADS ──────────────────────────────────────────────────────
  { id: 'launch_pad_small', name: 'Small Launch Pad', category: 'launch_pad', tier: 1,
    description: 'Supports small and medium rockets up to 5 tons to LEO.',
    tooltip: 'YOUR FIRST REVENUE GENERATOR. Build this immediately — it activates Small Launch Services earning $5M/mo revenue at $2M/mo operating cost = $3M/mo net profit. Combined with maintenance ($500K/mo), you net $2.5M/mo. At $50M build cost, it pays for itself in 20 months. No research needed. This is how you start making money.',
    baseCost: 50_000_000, buildTimeMonths: 6, maintenanceCostPerMonth: 500_000,
    requiredResearch: [], requiredLocation: 'earth_surface', enabledServices: ['svc_launch_small'],
    realBuildSeconds: 300,
    // Wave E3 (§2.2): propellant per launch operations. 10/mo ≈ $1.2M at base
    // spot = 24% of the $5M gross (spec's 15-30% input-cost band; the table's
    // illustrative 20/60/150 overshot it at these service grosses). Fully
    // waived inside the Protected Frontier (consumption.ts) so the tutorial
    // building stays the honest first money-maker.
    consumesPerMonth: { rocket_fuel: 10 } },
  { id: 'launch_pad_medium', name: 'Medium Launch Pad', category: 'launch_pad', tier: 2,
    description: 'Supports reusable medium-lift vehicles up to 25 tons to LEO.',
    tooltip: 'MAJOR REVENUE UPGRADE. Activates Medium Launch Services at $18M/mo revenue vs $7M/mo operating cost = $11M/mo net. A huge jump from the small pad\'s $3M net. Requires "Reusable Boosters" research first. At $200M cost, payback is ~18 months. Build this as your second or third building once research completes.',
    baseCost: 200_000_000, buildTimeMonths: 12, maintenanceCostPerMonth: 1_500_000,
    requiredResearch: ['reusable_boosters'], requiredLocation: 'earth_surface', enabledServices: ['svc_launch_medium'],
    realBuildSeconds: 900, resourceCost: { iron: 50, aluminum: 30 },
    consumesPerMonth: { rocket_fuel: 40 } }, // E3: 40 × $120K ≈ 27% of $18M gross
  { id: 'launch_pad_heavy', name: 'Heavy Launch Pad', category: 'launch_pad', tier: 3,
    description: 'Supports super-heavy vehicles. 100+ tons to LEO.',
    tooltip: 'HIGHEST-REVENUE LAUNCH SERVICE. Activates Heavy Launch at $55M/mo revenue vs $20M/mo cost = $35M/mo net profit. The single highest-margin Earth-based service. Requires "Super Heavy Lift" research (Tier 3 rocketry). At $800M cost, payback is ~23 months. Essential for mid-game income before mining operations come online.',
    baseCost: 800_000_000, buildTimeMonths: 18, maintenanceCostPerMonth: 3_000_000,
    requiredResearch: ['super_heavy_lift'], requiredLocation: 'earth_surface', enabledServices: ['svc_launch_heavy'],
    realBuildSeconds: 2700, resourceCost: { iron: 200, titanium: 50, aluminum: 100 },
    consumesPerMonth: { rocket_fuel: 120 } }, // E3: 120 × $120K ≈ 26% of $55M gross

  // ─── GROUND ───────────────────────────────────────────────────────────
  { id: 'ground_station', name: 'Ground Station', category: 'ground_station', tier: 1,
    description: 'Antenna complex for satellite comms and tracking. Generates revenue from tracking services.',
    tooltip: 'CHEAPEST BUILDING IN THE GAME ($30M, 3 min build). Activates Ground Tracking at $2M/mo revenue vs $600K cost = $1.4M/mo net. Low profit but fast payback (21 months) and no research needed. Build this first — it starts generating income immediately while you research and save for bigger buildings. Also counts toward building-count contracts.',
    baseCost: 30_000_000, buildTimeMonths: 4, maintenanceCostPerMonth: 300_000,
    requiredResearch: [], requiredLocation: 'earth_surface', enabledServices: ['svc_ground_tracking'],
    realBuildSeconds: 180 },
  { id: 'mission_control', name: 'Mission Control Center', category: 'ground_station', tier: 1,
    description: 'Command center for space ops. Generates revenue from mission management contracts.',
    tooltip: 'DOUBLES YOUR GROUND REVENUE. Activates Mission Operations at $4M/mo revenue vs $1.5M cost = $2.5M/mo net. No research needed. Build right after Ground Station for a combined $3.9M/mo ground income. Also required for the Space Insurance service later (when you research SAR Imaging). Strong early-game foundation building.',
    baseCost: 80_000_000, buildTimeMonths: 8, maintenanceCostPerMonth: 800_000,
    requiredResearch: [], requiredLocation: 'earth_surface', enabledServices: ['svc_mission_ops'],
    realBuildSeconds: 360 },

  // ─── SATELLITES (LEO) ─────────────────────────────────────────────────
  { id: 'sat_telecom', name: 'LEO Telecom Satellite', category: 'satellite', tier: 1,
    description: 'Low-latency broadband satellite for LEO constellation.',
    tooltip: 'CHEAPEST SATELLITE ($15M). Activates LEO Broadband at $3.5M/mo revenue vs $1.2M cost = $2.3M/mo net. No research needed — just unlock LEO (free). Great ROI for the price. Build 3-5 to create a constellation and boost your satellite count for contracts. Each additional one has slightly higher cost (1.15x scaling) but same revenue. Foundation of your space economy.',
    baseCost: 15_000_000, buildTimeMonths: 3, maintenanceCostPerMonth: 200_000,
    requiredResearch: [], requiredLocation: 'leo', enabledServices: ['svc_telecom_leo'],
    realBuildSeconds: 240,
    consumesPerMonth: { satellite_bus: 0.05 } }, // E3: constellation attrition spares (§2.2)
  { id: 'sat_sensor', name: 'LEO Sensor Satellite', category: 'satellite', tier: 1,
    description: 'Earth observation satellite with optical and infrared sensors.',
    tooltip: 'EARTH OBSERVATION REVENUE. Activates LEO Earth Observation at $3M/mo vs $800K cost = $2.2M/mo net. Requires "High Res Optical" research. Great margin (73% profit). Also needed as a prerequisite for the high-value Asteroid Survey service ($28M/mo) later. Deploy multiple for satellite contract milestones.',
    baseCost: 25_000_000, buildTimeMonths: 4, maintenanceCostPerMonth: 250_000,
    requiredResearch: ['high_res_optical'], requiredLocation: 'leo', enabledServices: ['svc_sensor_leo'],
    realBuildSeconds: 300,
    consumesPerMonth: { satellite_bus: 0.05 } },

  // ─── SATELLITES (GEO) ─────────────────────────────────────────────────
  { id: 'sat_telecom_geo', name: 'GEO Telecom Satellite', category: 'satellite', tier: 1,
    description: 'High-throughput geostationary communications satellite.',
    tooltip: 'PREMIUM TELECOM REVENUE. Activates GEO Communications at $8M/mo vs $2.5M cost = $5.5M/mo net. More than double the LEO telecom profit per satellite, but costs 10x more ($150M). Requires unlocking GEO orbit ($50M). Build once you have stable early income. The $5.5M/mo net makes this one of the best mid-early investments.',
    baseCost: 150_000_000, buildTimeMonths: 8, maintenanceCostPerMonth: 800_000,
    requiredResearch: [], requiredLocation: 'geo', enabledServices: ['svc_telecom_geo'],
    realBuildSeconds: 420,
    consumesPerMonth: { satellite_bus: 0.1 } },
  { id: 'sat_sensor_geo', name: 'GEO Sensor Satellite', category: 'satellite', tier: 2,
    description: 'Persistent Earth monitoring from geostationary orbit.',
    tooltip: 'PERSISTENT MONITORING. Activates GEO Persistent Monitoring at $8M/mo vs $2.5M cost = $5.5M/mo net. Same economics as GEO telecom but requires "High Res Optical" research. The advantage is diversification — having both telecom and sensor GEO satellites means more total revenue from the same orbit slot. Needs rare earth (10) and titanium (20) to build.',
    baseCost: 200_000_000, buildTimeMonths: 10, maintenanceCostPerMonth: 1_000_000,
    requiredResearch: ['high_res_optical'], requiredLocation: 'geo', enabledServices: ['svc_sensor_geo'],
    realBuildSeconds: 900, resourceCost: { rare_earth: 10, titanium: 20 },
    consumesPerMonth: { satellite_bus: 0.1 } },

  // ─── SPACE STATIONS ───────────────────────────────────────────────────
  { id: 'space_station_small', name: 'Orbital Outpost', category: 'space_station', tier: 1,
    description: 'Small modular space station in LEO. 4-person crew capacity.',
    tooltip: 'YOUR FIRST SPACE STATION (+15% REVENUE BONUS). Activates LEO Space Tourism at $12M/mo vs $4M cost = $8M/mo net. Also boosts ALL service revenue in LEO by +15% (stacks with other stations). Requires "Modular Spacecraft" research and costs aluminum (50) + titanium (20). At $500M and 15 min build, payback is ~167 months, but it unlocks tourism — a key revenue category — and counts toward station contracts. Essential mid-game milestone.',
    baseCost: 500_000_000, buildTimeMonths: 18, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['modular_spacecraft'], requiredLocation: 'leo', enabledServices: ['svc_tourism_leo'],
    realBuildSeconds: 900, resourceCost: { aluminum: 50, titanium: 20 }, powerRequired: 5,
    // E3 (§2.2): life support ≈ 1 pack / 25 crew — authored statically from
    // each crewed building's crewQuarters so the recipe stays additive data.
    // Shortfall also hits crew morale (consumption.ts).
    consumesPerMonth: { life_support_pack: 3 } },
  { id: 'space_station_lunar', name: 'Lunar Gateway', category: 'space_station', tier: 2,
    description: 'Orbital station around the Moon. Staging point for surface operations.',
    tooltip: 'CISLUNAR HUB (+15% REVENUE BONUS). Activates Lunar Gateway Tours at $25M/mo vs $10M cost = $15M/mo net. Also boosts ALL service revenue in Lunar Orbit by +15%. Positions you as a lunar operator and fulfills "station at location" competitive contracts. Requires Lunar Orbit unlock ($1B) plus research. The $15M/mo net profit justifies the $2B cost over time, and you need a presence here for late-game lunar dominance.',
    baseCost: 2_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 8_000_000,
    requiredResearch: ['modular_spacecraft', 'reusable_boosters'], requiredLocation: 'lunar_orbit', enabledServices: ['svc_tourism_lunar_gateway'],
    realBuildSeconds: 1200, resourceCost: { aluminum: 100, titanium: 40, iron: 80 }, powerRequired: 8,
    consumesPerMonth: { life_support_pack: 4 } },
  { id: 'space_station_mars', name: 'Mars Orbital Station', category: 'space_station', tier: 3,
    description: 'Permanent crewed station in Mars orbit.',
    tooltip: 'MARS COMMAND CENTER (+15% REVENUE BONUS). Activates Mars Station Operations at $45M/mo vs $15M cost = $30M/mo net. Also boosts ALL service revenue in Mars Orbit by +15%. One of the highest-profit services in the game. Requires "Interplanetary Cruisers" research. Critical for Mars colonization contracts and late-game competitive milestones.',
    baseCost: 8_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 10_000_000,
    requiredResearch: ['interplanetary_cruisers'], requiredLocation: 'mars_orbit', enabledServices: ['svc_mars_station_ops'],
    realBuildSeconds: 3600, resourceCost: { titanium: 100, aluminum: 200, rare_earth: 30, iron: 300 }, powerRequired: 10,
    consumesPerMonth: { life_support_pack: 5 } },

  // ─── DATA CENTERS ─────────────────────────────────────────────────────
  { id: 'datacenter_orbital', name: 'Orbital Data Center', category: 'datacenter', tier: 2,
    description: 'AI compute facility in orbit. Free cooling, solar powered.',
    tooltip: 'HIGH-MARGIN TECH PLAY. Activates Orbital AI Compute at $12M/mo vs $4M cost = $8M/mo net. Excellent 67% profit margin. Requires "Rad-Hardened Processors" research. At $300M cost, payback is ~37 months. The AI datacenter revenue is one of the best returns per dollar invested. Build as soon as you complete the research.',
    baseCost: 300_000_000, buildTimeMonths: 12, maintenanceCostPerMonth: 2_000_000,
    requiredResearch: ['rad_hard_processors'], requiredLocation: 'leo', enabledServices: ['svc_ai_datacenter'],
    realBuildSeconds: 420, resourceCost: { rare_earth: 15, titanium: 10 }, powerRequired: 10,
    consumesPerMonth: { electronics_package: 2 } }, // E3: compute spares, 2 × $1.5M = 25% of $12M gross
  { id: 'datacenter_mars_orbit', name: 'Mars Data Relay', category: 'datacenter', tier: 3,
    description: 'Data processing and relay facility at Mars.',
    tooltip: 'DEEP-SPACE COMPUTE. Activates Mars Data Processing at $25M/mo vs $8M cost = $17M/mo net. Required for Mars operations communication and data relay. Requires "Edge AI" research. At $3B cost, payback is long, but it\'s essential infrastructure if you\'re building a Mars presence. Also enables Propellant Brokerage when combined with other Mars infrastructure.',
    baseCost: 3_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['edge_ai'], requiredLocation: 'mars_orbit', enabledServices: ['svc_ai_mars'],
    realBuildSeconds: 2700, resourceCost: { rare_earth: 50, titanium: 40, iron: 100 }, powerRequired: 20,
    consumesPerMonth: { electronics_package: 3 } }, // E3: 3 × $1.5M = 18% of $25M gross

  // ─── SOLAR FARMS ──────────────────────────────────────────────────────
  { id: 'solar_farm_orbital', name: 'Orbital Solar Farm', category: 'solar_farm', tier: 1,
    description: 'Large solar array providing power to orbital facilities.',
    tooltip: 'POWER INFRASTRUCTURE. Activates Orbital Power Sales at $3M/mo vs $800K cost = $2.2M/mo net. Low revenue but high margin (73%) and cheap to build ($100M). Requires "Triple Junction" research. Power generation supports your other orbital facilities and is a prerequisite for advanced energy research. Good filler building while saving for bigger investments.',
    baseCost: 100_000_000, buildTimeMonths: 6, maintenanceCostPerMonth: 500_000,
    requiredResearch: ['triple_junction'], requiredLocation: 'leo', enabledServices: ['svc_power_orbital'],
    realBuildSeconds: 300, powerGenerated: 20 },
  { id: 'solar_farm_lunar', name: 'Lunar Solar Farm', category: 'solar_farm', tier: 2,
    description: 'Solar arrays on the lunar surface. Powers mining and fabrication.',
    tooltip: 'LUNAR POWER GRID. Activates Lunar Power Grid at $5M/mo vs $1.2M cost = $3.8M/mo net. Essential infrastructure for your lunar mining and fabrication operations. Without power, your lunar buildings operate less efficiently. Requires "Triple Junction" research and Lunar Surface unlock. Build alongside your first lunar mining operation.',
    baseCost: 400_000_000, buildTimeMonths: 10, maintenanceCostPerMonth: 800_000,
    requiredResearch: ['triple_junction'], requiredLocation: 'lunar_surface', enabledServices: ['svc_power_lunar'],
    realBuildSeconds: 900, powerGenerated: 30 },

  // ─── MINING ───────────────────────────────────────────────────────────
  { id: 'mining_lunar_basic', name: 'Basic Lunar Extractor', category: 'mining_enterprise', tier: 1,
    description: 'Simple surface skimmer that scrapes loose regolith ice. Small output, but no advanced materials needed to build.',
    tooltip: 'BOOTSTRAP MINING. Money-only build ($250M, no resource inputs) so you can start producing lunar water before having iron/aluminum. Output is 20 water + 0.5 helium-3 per game month — modest but enough to unlock follow-on construction and start earning Lunar Basic Water Sales revenue. Upgrade to the full Lunar Ice Mine when you have the metals to afford it.',
    baseCost: 250_000_000, buildTimeMonths: 6, maintenanceCostPerMonth: 800_000,
    requiredResearch: [], requiredLocation: 'lunar_surface', enabledServices: ['svc_mining_lunar_basic'],
    realBuildSeconds: 420, powerRequired: 3 },
  { id: 'mining_lunar_ice', name: 'Lunar Ice Mine', category: 'mining_enterprise', tier: 2,
    description: 'Extract water ice from permanently shadowed craters.',
    tooltip: 'YOUR GATEWAY TO RESOURCES. Activates Lunar Water Sales at $18M/mo vs $7M cost = $11M/mo net. More importantly, it produces 100 lunar water + 2 helium-3 per game month — resources you NEED for advanced buildings and research. Water sells for $50K/unit on the global Market (already open from turn one). Once built, your resource economy begins. Requires "Resource Prospecting" research + Lunar Surface unlock ($2B).',
    baseCost: 1_500_000_000, buildTimeMonths: 18, maintenanceCostPerMonth: 3_000_000,
    requiredResearch: ['resource_prospecting'], requiredLocation: 'lunar_surface', enabledServices: ['svc_mining_lunar'],
    realBuildSeconds: 1200, resourceCost: { iron: 80, aluminum: 40, titanium: 15 }, powerRequired: 10,
    // E3 (§2.2): hauler propellant on tier-2+ mining ops. The T1 Basic Lunar
    // Extractor is deliberately recipe-free — it is the bootstrap building
    // new players own before any fuel chain exists (on-ramp protection).
    consumesPerMonth: { rocket_fuel: 5 } },
  { id: 'mining_mars', name: 'Mars Mining Operation', category: 'mining_enterprise', tier: 3,
    description: 'Extract metals and water from Martian regolith.',
    tooltip: 'BULK METAL PRODUCTION. Activates Mars Resource Extraction at $35M/mo vs $13M cost = $22M/mo net. Produces 200 iron + 50 aluminum + 80 Mars water per month — massive quantities of building materials. If you\'re running low on iron and aluminum for construction, this is the solution. Requires "Regolith Processing" research + Mars Surface unlock ($25B). Expensive to set up but the resource output fuels your entire expansion.',
    baseCost: 5_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 8_000_000,
    requiredResearch: ['regolith_processing'], requiredLocation: 'mars_surface', enabledServices: ['svc_mining_mars'],
    realBuildSeconds: 2700, resourceCost: { iron: 200, titanium: 80, aluminum: 100, rare_earth: 20 }, powerRequired: 15,
    consumesPerMonth: { rocket_fuel: 5 } },
  { id: 'mining_asteroid', name: 'Asteroid Mining Rig', category: 'mining_enterprise', tier: 3,
    description: 'Capture and process metallic asteroids.',
    tooltip: 'PRECIOUS METALS BONANZA. Activates Asteroid Metals at $50M/mo vs $18M cost = $32M/mo net. Produces 500 iron + 10 platinum + 15 gold + 20 rare earth + 30 titanium per month. This is where the REAL money is — platinum ($500K/unit) and gold ($300K/unit) are the most valuable tradeable resources. Requires "Asteroid Capture" research + Belt unlock ($15B). The $32M/mo net plus resource value makes this one of the best investments in the game.',
    baseCost: 8_000_000_000, buildTimeMonths: 30, maintenanceCostPerMonth: 10_000_000,
    requiredResearch: ['asteroid_capture'], requiredLocation: 'asteroid_belt', enabledServices: ['svc_mining_asteroid'],
    realBuildSeconds: 3600, resourceCost: { titanium: 100, iron: 300, rare_earth: 30 }, powerRequired: 12,
    consumesPerMonth: { rocket_fuel: 5 } },
  { id: 'mining_europa', name: 'Europa Ice Drill', category: 'mining_enterprise', tier: 4,
    description: 'Drill through Europa\'s ice shell for subsurface ocean resources.',
    tooltip: 'EXOTIC MATERIALS SOURCE. Activates Europa Subsurface Resources at $120M/mo vs $45M cost = $75M/mo net — one of the highest-profit services in the game. Produces 5 exotic materials ($2M each) + 200 lunar water per month. Exotic materials are needed for Tier 5 research and endgame construction. Requires "Deep Drilling" research + Jupiter unlock ($100B). The $75M/mo net profit makes this worth the massive investment.',
    baseCost: 30_000_000_000, buildTimeMonths: 48, maintenanceCostPerMonth: 20_000_000,
    requiredResearch: ['deep_drilling'], requiredLocation: 'jupiter_system', enabledServices: ['svc_mining_europa'],
    realBuildSeconds: 5400, resourceCost: { titanium: 200, rare_earth: 80, platinum_group: 20 }, powerRequired: 15,
    consumesPerMonth: { rocket_fuel: 5 } },
  { id: 'mining_titan', name: 'Titan Hydrocarbon Harvester', category: 'mining_enterprise', tier: 4,
    description: 'Harvest methane and ethane from Titan\'s lakes.',
    tooltip: 'HIGHEST REVENUE SERVICE IN THE GAME. Activates Titan Hydrocarbon Exports at $160M/mo vs $55M cost = $105M/mo net. Produces 300 methane + 150 ethane per month. The $105M/mo net is the single best revenue source available. Requires "Deep Drilling" research + Saturn unlock ($200B). Late-game mega-investment that funds everything else. Build as soon as you can afford the Saturn system.',
    baseCost: 40_000_000_000, buildTimeMonths: 48, maintenanceCostPerMonth: 25_000_000,
    requiredResearch: ['deep_drilling'], requiredLocation: 'saturn_system', enabledServices: ['svc_mining_titan'],
    realBuildSeconds: 5400, resourceCost: { titanium: 250, rare_earth: 100, platinum_group: 30 }, powerRequired: 15,
    consumesPerMonth: { rocket_fuel: 5 } },

  // ─── FABRICATION ──────────────────────────────────────────────────────
  { id: 'fabrication_orbital', name: 'Orbital Fabrication Lab', category: 'fabrication_facility', tier: 2,
    description: 'Manufacture components in microgravity.',
    tooltip: 'UNLOCKS CRAFTING. Activates Orbital Manufacturing at $10M/mo vs $4M cost = $6M/mo net. More importantly, this unlocks the Crafting tab — letting you refine raw resources into higher-value products (steel ingots, electronics, solar panels). Also produces 5 titanium + 3 rare earth per month passively. Requires "Orbital Assembly" research. Build to unlock the entire production chain system.',
    baseCost: 600_000_000, buildTimeMonths: 14, maintenanceCostPerMonth: 3_000_000,
    requiredResearch: ['orbital_assembly'], requiredLocation: 'leo', enabledServices: ['svc_fabrication_orbital'],
    realBuildSeconds: 900, resourceCost: { iron: 60, aluminum: 40, rare_earth: 10 }, powerRequired: 8 },
  { id: 'fabrication_lunar', name: 'Lunar Manufacturing Plant', category: 'fabrication_facility', tier: 2,
    description: 'Use lunar materials to build components on-site.',
    tooltip: 'LUNAR INDUSTRY. Activates Lunar Manufacturing at $15M/mo vs $6M cost = $9M/mo net. Produces 30 aluminum + 50 iron per month — a steady stream of building materials without needing mining ships. Combined with your Lunar Ice Mine, creates a self-sustaining lunar economy. Requires both "Orbital Assembly" and "Regolith Processing" research. Build alongside your lunar mining operation.',
    baseCost: 2_000_000_000, buildTimeMonths: 20, maintenanceCostPerMonth: 4_000_000,
    requiredResearch: ['orbital_assembly', 'regolith_processing'], requiredLocation: 'lunar_surface', enabledServices: ['svc_fabrication_lunar'],
    realBuildSeconds: 1200, resourceCost: { iron: 100, aluminum: 60, lunar_water: 30, titanium: 20 }, powerRequired: 12 },

  // ─── HABITATS ─────────────────────────────────────────────────────────
  { id: 'habitat_lunar', name: 'Lunar Habitat', category: 'space_station', tier: 2,
    description: 'Pressurized habitat on the lunar surface. 8-person capacity.',
    tooltip: 'LUNAR TOURISM HUB (+15% REVENUE BONUS). Activates Lunar Tourism at $30M/mo vs $12M cost = $18M/mo net. Also boosts ALL service revenue on the Lunar Surface by +15% (stacks with other stations). The highest-revenue lunar service. Lunar Tourism is a premium revenue stream that attracts wealthy tourists. Requires "Modular Spacecraft" + "Resource Prospecting" research plus lunar water (50) and metals to build. At $3B cost, payback is ~14 years, but the steady $18M/mo income is valuable for mid-game stability.',
    baseCost: 3_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['modular_spacecraft', 'resource_prospecting'], requiredLocation: 'lunar_surface', enabledServices: ['svc_tourism_moon'],
    realBuildSeconds: 1500, resourceCost: { aluminum: 80, titanium: 30, lunar_water: 50, iron: 60 }, powerRequired: 8,
    consumesPerMonth: { life_support_pack: 3 } },
  { id: 'habitat_mars', name: 'Mars Habitat', category: 'space_station', tier: 3,
    description: 'First permanent human settlement on Mars.',
    tooltip: 'MARS COLONIZATION (+15% REVENUE BONUS). Activates Mars Tourism at $80M/mo vs $35M cost = $45M/mo net — one of the top 5 revenue sources in the game. Also boosts ALL service revenue on Mars Surface by +15% (stacks with other stations). Establishes humanity\'s first Mars settlement and counts toward the "Mars Colonization Initiative" contract ($1B reward). Requires "Interplanetary Cruisers" + "Regolith Processing" research. At $15B cost and heavy resource requirements, this is a late mid-game milestone that defines your Mars strategy.',
    baseCost: 15_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 12_000_000,
    requiredResearch: ['interplanetary_cruisers', 'regolith_processing'], requiredLocation: 'mars_surface', enabledServices: ['svc_tourism_mars'],
    realBuildSeconds: 3600, resourceCost: { titanium: 120, aluminum: 150, iron: 200, mars_water: 50, rare_earth: 25 }, powerRequired: 12,
    consumesPerMonth: { life_support_pack: 5 } },

  // ─── GEO INFRASTRUCTURE ─────────────────────────────────────────────
  { id: 'solar_farm_geo', name: 'GEO Solar Power Platform', category: 'solar_farm', tier: 2,
    description: 'High-power solar farm in geostationary orbit for space-based solar power.',
    tooltip: 'ENABLES NAVIGATION SERVICES. Activates Navigation (GPS) at $15M/mo vs $4M cost = $11M/mo net. The main reason to build this is unlocking the high-margin navigation service. Requires "Triple Junction" + "High Power Comms" research. At $300M, payback is ~27 months from the nav service alone. Build in GEO orbit after you have telecom satellites there.',
    baseCost: 300_000_000, buildTimeMonths: 10, maintenanceCostPerMonth: 1_500_000,
    requiredResearch: ['triple_junction', 'high_power_comms'], requiredLocation: 'geo', enabledServices: ['svc_navigation'],
    realBuildSeconds: 600, resourceCost: { aluminum: 40, rare_earth: 10 }, powerGenerated: 40 }, // 10 min

  // ─── RELAY SATELLITES ───────────────────────────────────────────────
  { id: 'sat_lunar_relay', name: 'Lunar Relay Satellite', category: 'satellite', tier: 2,
    description: 'Communication relay for cislunar operations and debris tracking.',
    tooltip: 'TWO SERVICES IN ONE. Activates both Debris Removal ($12M/mo, $5M cost = $7M net) AND Space Insurance ($8M/mo, $1.8M cost = $6.2M net). Combined: $13.2M/mo net from a single $200M building. Best ROI of any satellite. Requires "Reusable Boosters" research + Lunar Orbit unlock ($1B). Build this as soon as you unlock Lunar Orbit — two revenue streams from one building.',
    baseCost: 200_000_000, buildTimeMonths: 6, maintenanceCostPerMonth: 800_000,
    requiredResearch: ['reusable_boosters'], requiredLocation: 'lunar_orbit', enabledServices: ['svc_debris_removal', 'svc_space_insurance'],
    realBuildSeconds: 720, resourceCost: { aluminum: 15, rare_earth: 5 }, powerRequired: 3 }, // 12 min
  { id: 'sat_mars_relay', name: 'Mars Relay Satellite', category: 'satellite', tier: 3,
    description: 'Deep-space communications relay for Mars operations.',
    tooltip: 'MARS COMMS + PROPELLANT BROKERAGE. Activates Propellant Brokerage at $40M/mo vs $15M cost = $25M/mo net. One of the highest-profit services available at Mars. Essential for supporting your Mars fleet and trading operations. Requires "Super Heavy Lift" + "Ion Drives" research + Mars Orbit unlock ($10B). Build alongside your Mars orbital station.',
    baseCost: 1_000_000_000, buildTimeMonths: 12, maintenanceCostPerMonth: 2_000_000,
    requiredResearch: ['super_heavy_lift', 'ion_drives'], requiredLocation: 'mars_orbit', enabledServices: ['svc_propellant_brokerage'],
    realBuildSeconds: 900, resourceCost: { titanium: 20, rare_earth: 10 } }, // 15 min

  // ─── MARS SURFACE INFRASTRUCTURE ────────────────────────────────────
  { id: 'fabrication_mars', name: 'Mars Manufacturing Plant', category: 'fabrication_facility', tier: 3,
    description: 'Manufacture components using Martian resources. Key to Mars self-sufficiency.',
    tooltip: 'MARS SELF-SUFFICIENCY + PROPELLANT DEPOT. Activates Propellant Depot Services at $20M/mo vs $7M cost = $13M/mo net. Makes Mars operations sustainable by manufacturing components locally instead of shipping from Earth. Combined with Mars Mining, creates a self-sufficient Mars economy. Requires "Orbital Assembly" + "Regolith Processing" research. Essential for long-term Mars presence.',
    baseCost: 8_000_000_000, buildTimeMonths: 28, maintenanceCostPerMonth: 6_000_000,
    requiredResearch: ['orbital_assembly', 'regolith_processing'], requiredLocation: 'mars_surface', enabledServices: ['svc_propellant_depot'],
    realBuildSeconds: 2400, resourceCost: { titanium: 80, aluminum: 100, iron: 150, mars_water: 40 }, powerRequired: 15 }, // 40 min
  { id: 'solar_farm_mars', name: 'Mars Solar Farm', category: 'solar_farm', tier: 3,
    description: 'Large solar array on the Martian surface. Lower efficiency than Earth but essential.',
    tooltip: 'MARS POWER INFRASTRUCTURE. Supports Mars mining and fabrication operations. While it doesn\'t directly enable a revenue service, Mars surface buildings need power infrastructure to operate efficiently. Requires "Triple Junction" + "Resource Prospecting" research. Build alongside your Mars Mining Operation and Habitat to create a complete Mars base. Adds to your building count for infrastructure contracts.',
    baseCost: 2_000_000_000, buildTimeMonths: 14, maintenanceCostPerMonth: 2_000_000,
    requiredResearch: ['triple_junction', 'resource_prospecting'], requiredLocation: 'mars_surface', enabledServices: [],
    realBuildSeconds: 1200, resourceCost: { aluminum: 60, iron: 80, rare_earth: 15 }, powerGenerated: 25 }, // 20 min

  // ─── NUCLEAR POWER & ADVANCED ENERGY ──────────────────────────────
  { id: 'nuclear_reactor_leo', name: 'Orbital Nuclear Reactor', category: 'solar_farm', tier: 2,
    description: 'Compact fission reactor providing reliable continuous power in LEO. Not dependent on solar exposure.',
    tooltip: 'RELIABLE LEO POWER. Unlike solar farms, nuclear reactors provide constant power regardless of orbital position. At 30 MW output, this single reactor covers the power needs of a data center (10 MW), fabrication lab (8 MW), and station (5 MW) combined. Requires "Surface Fission Reactor" research. More expensive than solar ($500M vs $100M) but higher output and no solar dependency. Essential for heavy LEO infrastructure.',
    baseCost: 500_000_000, buildTimeMonths: 6, maintenanceCostPerMonth: 2_000_000,
    requiredResearch: ['fission_surface_power'], requiredLocation: 'leo', enabledServices: [],
    realBuildSeconds: 1200, resourceCost: { titanium: 30, rare_earth: 15 }, powerGenerated: 30 }, // 20 min
  { id: 'solar_array_lunar_orbit', name: 'Lunar Orbital Solar Array', category: 'solar_farm', tier: 2,
    description: 'Large solar array in lunar orbit providing power to orbital facilities.',
    tooltip: 'LUNAR ORBIT POWER. Provides 25 MW to power your Lunar Gateway (8 MW) and relay satellites (3 MW each). Without this, your Lunar Gateway operates at reduced efficiency and loses revenue. Requires "Perovskite-Si Tandem" research. Build this immediately when you unlock Lunar Orbit to avoid power penalties on your Gateway station.',
    baseCost: 400_000_000, buildTimeMonths: 5, maintenanceCostPerMonth: 1_500_000,
    requiredResearch: ['perovskite_tandem'], requiredLocation: 'lunar_orbit', enabledServices: [],
    realBuildSeconds: 900, resourceCost: { aluminum: 20, rare_earth: 10 }, powerGenerated: 25 }, // 15 min
  { id: 'nuclear_reactor_lunar', name: 'Lunar Surface Reactor', category: 'solar_farm', tier: 2,
    description: 'Compact fission reactor for lunar surface operations. Provides reliable power during the 14-day lunar night when solar is unavailable.',
    tooltip: 'LUNAR NIGHT POWER. During the 14-day lunar night, solar farms produce zero power. This reactor ensures continuous operations for your mining, fabrication, and habitat. At 35 MW output, it covers the full 30 MW demand of all lunar surface buildings with headroom for expansion. Combined with the solar farm (30 MW), you get 65 MW total — plenty for duplicate buildings. Build alongside your Lunar Solar Farm for a robust power grid. Requires "Surface Fission Reactor" research.',
    baseCost: 800_000_000, buildTimeMonths: 8, maintenanceCostPerMonth: 3_000_000,
    requiredResearch: ['fission_surface_power'], requiredLocation: 'lunar_surface', enabledServices: [],
    realBuildSeconds: 1200, resourceCost: { titanium: 40, rare_earth: 20 }, powerGenerated: 35 }, // 20 min
  { id: 'nuclear_reactor_mars_orbit', name: 'Mars Orbital Reactor', category: 'solar_farm', tier: 3,
    description: 'Nuclear fission reactor powering Mars orbital infrastructure. Essential for data relay and station operations.',
    tooltip: 'MARS ORBIT POWER. Provides 35 MW to power your Mars Orbital Station (10 MW), Mars Data Relay (20 MW), and other orbital facilities. Solar is weaker at Mars distance, making nuclear the better option. Requires "Surface Fission Reactor" research. Build before or alongside your Mars station to avoid crippling power penalties.',
    baseCost: 1_200_000_000, buildTimeMonths: 8, maintenanceCostPerMonth: 4_000_000,
    requiredResearch: ['fission_surface_power'], requiredLocation: 'mars_orbit', enabledServices: [],
    realBuildSeconds: 1800, resourceCost: { titanium: 50, rare_earth: 25, platinum_group: 5 }, powerGenerated: 35 }, // 30 min
  { id: 'nuclear_reactor_mars_surface', name: 'Mars Surface Reactor', category: 'solar_farm', tier: 3,
    description: 'Kilopower-class fission reactor for Mars surface operations. Provides reliable power during dust storms when solar is unavailable.',
    tooltip: 'MARS SURFACE POWERHOUSE. Generates 40 MW — enough to supplement your Mars Solar Farm (25 MW) and cover all surface operations: mining (15 MW), fabrication (15 MW), habitat (12 MW) = 42 MW total need. During dust storms, solar output drops but nuclear keeps running. Build alongside your Mars Solar Farm for full power coverage. Requires "Surface Fission Reactor" research.',
    baseCost: 1_500_000_000, buildTimeMonths: 10, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['fission_surface_power'], requiredLocation: 'mars_surface', enabledServices: [],
    realBuildSeconds: 2400, resourceCost: { titanium: 60, rare_earth: 30, platinum_group: 8 }, powerGenerated: 40 }, // 40 min
  { id: 'nuclear_reactor_asteroid', name: 'Asteroid Belt Reactor', category: 'solar_farm', tier: 3,
    description: 'Self-contained nuclear reactor powering mining and refining operations in the asteroid belt, where solar power is insufficient.',
    tooltip: 'BELT POWER — NO SOLAR ALTERNATIVE. The asteroid belt is too far from the Sun for effective solar power. This is the ONLY way to power your Asteroid Mining Rig (12 MW), Asteroid Refinery (10 MW), and Ceres Station (8 MW). At 35 MW, one reactor covers a mining rig + refinery. Build two for full belt coverage. Requires "Surface Fission Reactor" + "Spacecraft Nuclear Reactors" research.',
    baseCost: 1_800_000_000, buildTimeMonths: 10, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['fission_surface_power', 'nuclear_power_spacecraft'], requiredLocation: 'asteroid_belt', enabledServices: [],
    realBuildSeconds: 2400, resourceCost: { titanium: 70, rare_earth: 30, platinum_group: 10 }, powerGenerated: 35 }, // 40 min
  { id: 'nuclear_reactor_jupiter', name: 'Jovian Nuclear Plant', category: 'solar_farm', tier: 4,
    description: 'High-output nuclear reactor for Jupiter system operations. Solar power is impractical at this distance from the Sun.',
    tooltip: 'JUPITER POWER — ESSENTIAL. At Jupiter distance, solar panels produce only 4% of their Earth output. Nuclear is mandatory. Your Jovian Station generates 15 MW but needs 10 MW + 15 MW for the data center. Europa Ice Drill needs 15 MW. This 40 MW reactor fills the gap. The station\'s built-in reactor (net +5 MW) is not enough alone. Requires "Surface Fission Reactor" + "Spacecraft Nuclear Reactors" research.',
    baseCost: 3_000_000_000, buildTimeMonths: 12, maintenanceCostPerMonth: 8_000_000,
    requiredResearch: ['fission_surface_power', 'nuclear_power_spacecraft'], requiredLocation: 'jupiter_system', enabledServices: [],
    realBuildSeconds: 3600, resourceCost: { titanium: 100, rare_earth: 50, platinum_group: 15, exotic_materials: 3 }, powerGenerated: 40,
    consumesPerMonth: { helium3: 0.2, deuterium: 0.5 } }, // E3: T4 fusion fuel cycle (§2.2 chain D)
  { id: 'nuclear_reactor_saturn', name: 'Saturnian Nuclear Plant', category: 'solar_farm', tier: 4,
    description: 'Advanced nuclear reactor for Saturn system operations. Powers Titan mining and chemical processing.',
    tooltip: 'SATURN POWER — ESSENTIAL. Saturn receives only 1% of Earth\'s solar energy. Nuclear is the only option. Your Kronos Station generates 20 MW (net +8 MW) but Titan Hydrocarbon Harvester (15 MW) + Titan Chemical Plant (12 MW) need far more. This 40 MW reactor ensures full operations. The $105M/mo from Titan mining makes this investment trivial. Requires "Surface Fission Reactor" + "Spacecraft Nuclear Reactors" research.',
    baseCost: 3_500_000_000, buildTimeMonths: 12, maintenanceCostPerMonth: 9_000_000,
    requiredResearch: ['fission_surface_power', 'nuclear_power_spacecraft'], requiredLocation: 'saturn_system', enabledServices: [],
    realBuildSeconds: 3600, resourceCost: { titanium: 120, rare_earth: 60, platinum_group: 20, exotic_materials: 5 }, powerGenerated: 40,
    consumesPerMonth: { helium3: 0.2, deuterium: 0.5 } }, // E3: T4 fusion fuel cycle

  // ─── ASTEROID BELT INFRASTRUCTURE ───────────────────────────────────
  { id: 'fabrication_asteroid', name: 'Asteroid Refinery', category: 'fabrication_facility', tier: 3,
    description: 'Process asteroid materials in-situ. Reduces transport costs dramatically.',
    tooltip: 'ASTEROID SURVEY DATA. Activates Asteroid Survey Data service at $28M/mo vs $10M cost = $18M/mo net. Processes raw asteroid materials on-site, eliminating the need to ship unrefined ore back to Earth. Also a prerequisite for advanced asteroid belt operations. Requires "Asteroid Capture" + "Orbital Assembly" research. Build after your Asteroid Mining Rig is operational.',
    baseCost: 12_000_000_000, buildTimeMonths: 30, maintenanceCostPerMonth: 8_000_000,
    requiredResearch: ['asteroid_capture', 'orbital_assembly'], requiredLocation: 'asteroid_belt', enabledServices: ['svc_asteroid_survey'],
    realBuildSeconds: 2700, resourceCost: { titanium: 100, iron: 200, platinum_group: 10, rare_earth: 30 }, powerRequired: 10 }, // 45 min
  { id: 'space_station_belt', name: 'Ceres Station', category: 'space_station', tier: 3,
    description: 'Deep-space outpost at Ceres. Hub for asteroid belt operations.',
    tooltip: 'DEEP-SPACE HUB (+15% REVENUE BONUS). Establishes a permanent presence at Ceres — the largest object in the asteroid belt. Boosts ALL service revenue at the Asteroid Belt by +15%. Serves as a staging point for asteroid mining ships, reducing transit times. Adds to your station count for competitive contracts. At $15B it\'s a prestige investment that signals dominance of the Belt. Required for serious endgame asteroid belt operations.',
    baseCost: 15_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 10_000_000,
    requiredResearch: ['asteroid_capture', 'modular_spacecraft'], requiredLocation: 'asteroid_belt', enabledServices: [],
    realBuildSeconds: 3600, resourceCost: { titanium: 150, aluminum: 200, iron: 300, rare_earth: 40 }, powerRequired: 8,
    consumesPerMonth: { life_support_pack: 4 } }, // 1 hr

  // ─── JUPITER SYSTEM INFRASTRUCTURE ──────────────────────────────────
  { id: 'space_station_jupiter', name: 'Jovian Station', category: 'space_station', tier: 4,
    description: 'Orbital research platform in Jupiter system. Supports Europa operations.',
    tooltip: 'JUPITER COMMAND (+15% REVENUE BONUS). Staging platform for Europa mining and Jovian moon exploration. Boosts ALL service revenue in the Jupiter System by +15%. Supports your Europa Ice Drill operations and fulfills "Jupiter Expedition" competitive contracts (up to $5B reward + "Jovian Pioneer" title). At $50B it\'s a major late-game investment, but Jupiter system access is required for exotic materials production. Build alongside Europa Ice Drill.',
    baseCost: 50_000_000_000, buildTimeMonths: 48, maintenanceCostPerMonth: 30_000_000,
    requiredResearch: ['nuclear_thermal', 'interplanetary_cruisers'], requiredLocation: 'jupiter_system', enabledServices: [],
    realBuildSeconds: 7200, resourceCost: { titanium: 200, platinum_group: 25, rare_earth: 60, exotic_materials: 3 }, powerRequired: 10, powerGenerated: 15,
    consumesPerMonth: { life_support_pack: 5 } }, // 2 hr — nuclear powered, net +5 MW
  { id: 'datacenter_jupiter', name: 'Jupiter Relay Hub', category: 'datacenter', tier: 4,
    description: 'Deep-space data relay and edge computing center for outer system.',
    tooltip: 'OUTER SYSTEM COMMS. Provides communication relay for Jupiter and Saturn operations. Without this, your outer system facilities operate in isolation. Edge computing processes scientific data locally instead of transmitting raw data back to Earth. Requires "Nuclear Thermal" + "Edge AI" research. Build to support your Jupiter and Saturn expansion.',
    // M1/F1: maintenance cut 15M->5M and electronics_package upkeep trimmed
    // 3->1/mo (still a real recipe tie, not free) so the flagship T4 comms
    // building isn't a first-copy loss once its required reactor's own
    // maintenance/fuel draw is counted (see MEANINGFUL_2026-08 §5 M1.2).
    baseCost: 20_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['nuclear_thermal', 'edge_ai'], requiredLocation: 'jupiter_system', enabledServices: ['svc_jupiter_relay'],
    realBuildSeconds: 5400, resourceCost: { titanium: 100, rare_earth: 50, platinum_group: 15 }, powerRequired: 15,
    consumesPerMonth: { electronics_package: 1 } }, // 90 min

  // ─── SATURN SYSTEM INFRASTRUCTURE ───────────────────────────────────
  { id: 'space_station_saturn', name: 'Kronos Station', category: 'space_station', tier: 4,
    description: 'Saturn orbital platform. Staging for Titan and Enceladus operations.',
    tooltip: 'SATURN COMMAND (+15% REVENUE BONUS). Staging platform for Titan Hydrocarbon Harvester — the highest-revenue building in the game ($105M/mo net). Boosts ALL service revenue in the Saturn System by +15%. Without Kronos Station, Titan operations have no support infrastructure. Also fulfills deep-space station competitive contracts. At $80B it\'s the most expensive station, but Titan\'s $105M/mo revenue justifies the investment.',
    baseCost: 80_000_000_000, buildTimeMonths: 60, maintenanceCostPerMonth: 40_000_000,
    requiredResearch: ['nuclear_thermal', 'interplanetary_cruisers', 'deep_drilling'], requiredLocation: 'saturn_system', enabledServices: [],
    realBuildSeconds: 7200, resourceCost: { titanium: 300, platinum_group: 40, rare_earth: 80, exotic_materials: 5 }, powerRequired: 12, powerGenerated: 20,
    consumesPerMonth: { life_support_pack: 6 } }, // 2 hr — nuclear powered, net +8 MW
  { id: 'fabrication_titan', name: 'Titan Chemical Plant', category: 'fabrication_facility', tier: 4,
    description: 'Process Titan hydrocarbons into rocket fuel and industrial chemicals.',
    tooltip: 'FUEL REFINERY. Processes Titan\'s methane and ethane into rocket fuel and industrial chemicals on-site. Reduces the cost of fueling deep-space missions from Saturn. Combined with Titan Hydrocarbon Harvester, creates a self-sustaining fuel production chain. At $25B it\'s expensive but essential for efficient outer system operations.',
    // M1/F1: maintenance cut 18M->8M (frontier premium, see docs/MEANINGFUL_2026-08.md §5 M1.2).
    baseCost: 25_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 8_000_000,
    requiredResearch: ['deep_drilling', 'orbital_assembly'], requiredLocation: 'saturn_system', enabledServices: ['svc_titan_processing'],
    realBuildSeconds: 5400, resourceCost: { titanium: 150, rare_earth: 60, platinum_group: 20, methane: 100 }, powerRequired: 12 }, // 90 min

  // ─── OUTER SYSTEM INFRASTRUCTURE ────────────────────────────────────
  { id: 'outpost_outer', name: 'Deep Space Outpost', category: 'space_station', tier: 5,
    description: 'Humanity\'s farthest permanent settlement. Research and exploration hub.',
    tooltip: 'ENDGAME PRESTIGE (+15% REVENUE BONUS). Humanity\'s most distant permanent outpost — beyond Neptune. Boosts ALL service revenue in the Outer System by +15%. The ultimate achievement in the game. Requires "Fusion Drive" + "Generation Ships" research (Tier 5) and the Outer System unlock ($500B). At $200B with exotic materials (20) and helium-3 (10) required, this is the final building milestone. Fulfills the "Architect of the Final Frontier" competitive contract.',
    baseCost: 200_000_000_000, buildTimeMonths: 96, maintenanceCostPerMonth: 60_000_000,
    requiredResearch: ['fusion_drive', 'generation_ships'], requiredLocation: 'outer_system', enabledServices: [],
    realBuildSeconds: 14400, resourceCost: { titanium: 500, platinum_group: 100, exotic_materials: 20, helium3: 10 }, powerRequired: 10, powerGenerated: 50,
    consumesPerMonth: { life_support_pack: 6, helium3: 0.2, deuterium: 0.5 } }, // 4 hr — fusion powered, net +40 MW; E3: crew + fusion fuel
  { id: 'mining_kuiper', name: 'Kuiper Belt Mining Platform', category: 'mining_enterprise', tier: 5,
    description: 'Extract exotic materials and volatiles from Kuiper Belt objects.',
    tooltip: 'ULTIMATE MINING. Extracts the rarest materials in the solar system from Kuiper Belt objects. Exotic materials ($2M each) and other volatiles not available anywhere else in these quantities. Requires "Fusion Drive" + "Automated Mining Fleet" research. At $150B it\'s the most expensive mining operation, but the resource output is unmatched. Late endgame only.',
    // M1/F1: maintenance cut 50M->18M (was 25-60x a T1 satellite's while its
    // pool/service gross was only ~10x — see docs/MEANINGFUL_2026-08.md §5 M1.2).
    // powerRequired dropped (was 15, unmet — outer_system's only generator is
    // the $200B outpost_outer, an absurd pairing for every mining platform):
    // RTG-powered like real deep-space probes, matching deep_space_relay
    // (also unpowered) rather than needing a co-built reactor.
    baseCost: 150_000_000_000, buildTimeMonths: 72, maintenanceCostPerMonth: 18_000_000,
    requiredResearch: ['fusion_drive', 'automated_mining_fleet'], requiredLocation: 'outer_system', enabledServices: ['svc_mining_kuiper'],
    realBuildSeconds: 10800, resourceCost: { titanium: 400, platinum_group: 80, exotic_materials: 15 },
    consumesPerMonth: { rocket_fuel: 5 } }, // 3 hr
  { id: 'deep_space_relay', name: 'Deep Space Communication Relay', category: 'satellite', tier: 5,
    description: 'Long-range communication relay for outer system operations.',
    tooltip: 'OUTER SYSTEM COMMS. Maintains communication with your Deep Space Outpost and Kuiper Belt Mining Platform. Without this relay, outer system operations lose coordination. The farthest communication infrastructure ever built. Requires "Fusion Drive" research. Build alongside your other outer system facilities.',
    // M1/F1: maintenance cut 20M->6M (frontier premium — long payback, never negative).
    baseCost: 50_000_000_000, buildTimeMonths: 48, maintenanceCostPerMonth: 6_000_000,
    requiredResearch: ['fusion_drive'], requiredLocation: 'outer_system', enabledServices: ['svc_deep_space_comm'],
    realBuildSeconds: 7200, resourceCost: { titanium: 200, rare_earth: 80, exotic_materials: 10 } }, // 2 hr

  // ─── WAVE E3 "THE CONSUMPTION ENGINE" — SUPPLY-CHAIN PRODUCERS ───────────
  // docs/ECONOMY_PVP_2026-08.md §4.4 — the five buildings deferred from the
  // Goods wave (E2 shipped the resources; the recipes needed the
  // consumesPerMonth/producesPerMonth fields that land here). All mid-cost
  // T2-T3; the two NEW T3 defs pay part of their resourceCost in COMPONENTS
  // (structural_beams/electronics_package/steel_ingots) per §4.4 —
  // construction as the economy's component sink. Existing defs above keep
  // their raw-ore costs untouched (grandfathering, §7). Output/input numbers
  // are tuned against live base prices so running at the 0.5 efficiency
  // floor (no inputs supplied) is always maintenance-negative — the soft
  // floor can never be farmed as a something-from-nothing printer (BALANCE.md
  // sinks-first invariant).
  { id: 'propellant_plant_lunar', name: 'Lunar Propellant Plant', category: 'fabrication_facility', tier: 2,
    description: 'Electrolyzes lunar ice into cryogenic propellant. The Moon becomes a gas station.',
    tooltip: 'VERTICAL INTEGRATION FOR LAUNCH CORPS. Passively converts 30 lunar water into 20 rocket fuel every game month — no crafting queue needed. Pair with a Lunar Ice Mine and your launch pads (which consume propellant every month, per their recipes) never buy fuel at market spread again. When fuel spot spikes, sell the surplus instead. Requires "Water ISRU" research.',
    baseCost: 900_000_000, buildTimeMonths: 14, maintenanceCostPerMonth: 1_500_000,
    requiredResearch: ['isru_water'], requiredLocation: 'lunar_surface', enabledServices: [],
    realBuildSeconds: 900, resourceCost: { iron: 60, aluminum: 30 }, powerRequired: 8,
    consumesPerMonth: { lunar_water: 30 }, producesPerMonth: { rocket_fuel: 20 } },
  { id: 'propellant_plant_mars', name: 'Mars Propellant Plant', category: 'fabrication_facility', tier: 3,
    description: 'ISRU propellant production from Martian subsurface ice. Fuels the outbound frontier.',
    tooltip: 'THE FRONTIER FUEL DEPOT. Converts 30 Mars water into 20 rocket fuel per game month, passively. Mars-side fuel supply is what makes deep-system mining recipes (5 fuel/mo haulers) and heavy freight sustainable without hauling propellant up Earth\'s gravity well. New T3 construction pays part of its cost in components — the E3 component sink.',
    baseCost: 2_500_000_000, buildTimeMonths: 18, maintenanceCostPerMonth: 2_500_000,
    requiredResearch: ['isru_water', 'regolith_processing'], requiredLocation: 'mars_surface', enabledServices: [],
    realBuildSeconds: 1500, resourceCost: { structural_beams: 10, steel_ingots: 20, iron: 100 }, powerRequired: 10,
    consumesPerMonth: { mars_water: 30 }, producesPerMonth: { rocket_fuel: 20 } },
  { id: 'agri_dome', name: 'Agricultural Dome', category: 'fabrication_facility', tier: 2,
    description: 'Pressurized hydroponic farm dome. Grows the organics that keep crews alive.',
    tooltip: 'THE FOOD CHAIN STARTS HERE. Converts 10 Mars water + 5 ammonia into 8 organic compounds per game month — the key feedstock for Life Support Works. Every crewed station and habitat in the game consumes life support packs monthly, so organics demand scales with the whole server\'s population. Requires "Hydroponic Agriculture" research.',
    baseCost: 1_200_000_000, buildTimeMonths: 16, maintenanceCostPerMonth: 3_500_000,
    requiredResearch: ['hydroponic_agriculture'], requiredLocation: 'mars_surface', enabledServices: [],
    realBuildSeconds: 1200, resourceCost: { aluminum: 60, iron: 80, mars_water: 20 }, powerRequired: 8,
    consumesPerMonth: { mars_water: 10, ammonia: 5 }, producesPerMonth: { organic_compounds: 8 } },
  { id: 'life_support_works', name: 'Life Support Works', category: 'fabrication_facility', tier: 2,
    description: 'Assembles water, ammonia, and organics into sealed life-support cartridges.',
    tooltip: 'THE PAYROLL OF MATTER. Produces 8 life support packs per game month from water, ammonia, and organic compounds. Packs are a PLAYER-ONLY market (the NPC maker quotes none) and every crewed building on the server consumes them monthly — undersupply hits rivals\' efficiency AND crew morale. Ceres ammonia logistics is the classic supply line. Requires "Oxygen Extraction" research.',
    baseCost: 1_500_000_000, buildTimeMonths: 16, maintenanceCostPerMonth: 1_500_000,
    requiredResearch: ['isru_oxygen'], requiredLocation: 'lunar_surface', enabledServices: [],
    realBuildSeconds: 1200, resourceCost: { iron: 80, aluminum: 50, titanium: 15 }, powerRequired: 10,
    consumesPerMonth: { lunar_water: 10, ammonia: 4, organic_compounds: 2 }, producesPerMonth: { life_support_pack: 8 } },
  { id: 'orbital_refinery', name: 'Orbital Refinery', category: 'fabrication_facility', tier: 3,
    description: 'Belt-anchored bulk refinery. Moves tier-1 smelting off the fab queue into passive throughput.',
    tooltip: 'PASSIVE BULK REFINING AT THE SOURCE. Converts 200 iron + 80 aluminum into 100 steel ingots + 40 aluminum alloy every game month — no crafting queue time. Anchor it next to an Asteroid Mining Rig (500 iron/mo at the same location) and refine in situ, then freight the dense product: the classic Δv play. Requires "Orbital Refining Complex" research. Construction pays in components.',
    baseCost: 6_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['orbital_refining_complex'], requiredLocation: 'asteroid_belt', enabledServices: [],
    realBuildSeconds: 2400, resourceCost: { structural_beams: 15, electronics_package: 3, steel_ingots: 25, titanium: 60 }, powerRequired: 12,
    consumesPerMonth: { iron: 200, aluminum: 80 }, producesPerMonth: { steel_ingots: 100, aluminum_alloy: 40 } },
];

export const BUILDING_MAP = new Map(BUILDINGS.map(b => [b.id, b]));

// ─── Phase I: Building Derived Stats ────────────────────────────────────────
// Category + tier defaults, with per-building overrides via def.stats.
// Populated per STATS_DESIGN.md so later waves (hazards, modules, market
// depth) can assume every building has every stat.

const CATEGORY_PROFILE: Record<BuildingCategory, (tier: number) => BuildingDerivedStats> = {
  launch_pad: (tier) => ({
    dockingCapacity: 1 + tier,
    storageCapacity: 200 + tier * 100,
    manufacturingThroughput: tier * 2,
    refiningThroughput: 0,
    marketLiquidityContribution: 0,
    serviceQualityMultiplier: 0.9 + tier * 0.1,
    customerCapacity: 50 + tier * 100,
    uplinkBandwidth: 0,
    crewQuarters: 20 + tier * 15,
    crewMoraleModifier: 0.4 + tier * 0.05,
    structuralIntegrity: 600 + tier * 300,
    shieldingRating: 0.1 + tier * 0.03,  // Earth atmospheric protection
    stabilityRating: 0.9,
    synergyTags: ['launch', 'ground'],
    synergyRange: 'location' as BuildingSynergyRange,
    maxUpgradeLevel: 3,
  }),
  rocket: (tier) => ({
    dockingCapacity: 0,
    storageCapacity: 100 + tier * 50,
    manufacturingThroughput: tier,
    refiningThroughput: 0,
    marketLiquidityContribution: 0,
    serviceQualityMultiplier: 0.9 + tier * 0.1,
    customerCapacity: 0,
    uplinkBandwidth: 0,
    crewQuarters: 10,
    crewMoraleModifier: 0.3,
    structuralIntegrity: 300 + tier * 150,
    shieldingRating: 0.1 + tier * 0.03,
    stabilityRating: 0.85,
    synergyTags: ['launch'],
    synergyRange: 'location',
    maxUpgradeLevel: 3,
  }),
  satellite: (tier) => ({
    dockingCapacity: 0,
    storageCapacity: 2 + tier,
    manufacturingThroughput: 0,
    refiningThroughput: 0,
    marketLiquidityContribution: 0,
    serviceQualityMultiplier: 0.9 + tier * 0.1,
    customerCapacity: 1_000 + tier * 3_000,  // satellites serve many customers each
    uplinkBandwidth: 50 + tier * 80,
    crewQuarters: 0,
    crewMoraleModifier: 0,
    structuralIntegrity: 50 + tier * 30,  // fragile
    shieldingRating: 0.05 + tier * 0.03,
    stabilityRating: 0.8,
    synergyTags: ['telecom', 'constellation'],
    synergyRange: 'system',  // constellation benefits interplanetary
    maxUpgradeLevel: 2,
  }),
  space_station: (tier) => ({
    dockingCapacity: 3 + tier * 2,
    storageCapacity: 800 + tier * 400,
    manufacturingThroughput: 1 + tier,
    refiningThroughput: tier * 5,
    marketLiquidityContribution: 20 + tier * 40,
    serviceQualityMultiplier: 1.0 + tier * 0.15,
    customerCapacity: 200 + tier * 150,
    uplinkBandwidth: 30 + tier * 50,
    crewQuarters: 40 + tier * 30,
    crewMoraleModifier: 0.7 + tier * 0.05,  // stations = comfortable life
    structuralIntegrity: 1_200 + tier * 500,
    shieldingRating: 0.25 + tier * 0.08,
    stabilityRating: 0.7,
    synergyTags: ['habitation', 'logistics', 'trade'],
    synergyRange: 'location',
    maxUpgradeLevel: 4,
  }),
  fabrication_facility: (tier) => ({
    dockingCapacity: 1 + tier,
    storageCapacity: 500 + tier * 250,
    manufacturingThroughput: 10 + tier * 8,  // the factory role
    refiningThroughput: 2 + tier * 3,
    marketLiquidityContribution: 10 + tier * 15,
    serviceQualityMultiplier: 0.9 + tier * 0.1,
    customerCapacity: 100 + tier * 150,
    uplinkBandwidth: 10 + tier * 10,
    crewQuarters: 15 + tier * 10,
    crewMoraleModifier: 0.4 + tier * 0.05,
    structuralIntegrity: 700 + tier * 300,
    shieldingRating: 0.15 + tier * 0.05,
    stabilityRating: 0.85,
    synergyTags: ['manufacturing', 'industry'],
    synergyRange: 'location',
    maxUpgradeLevel: 4,
  }),
  datacenter: (tier) => ({
    dockingCapacity: 0,
    storageCapacity: 20 + tier * 10,
    manufacturingThroughput: 0,
    refiningThroughput: 0,
    marketLiquidityContribution: 0,
    serviceQualityMultiplier: 1.0 + tier * 0.2,
    customerCapacity: 2_000 + tier * 5_000,
    uplinkBandwidth: 500 + tier * 1_500,  // data ops = big bandwidth
    crewQuarters: 5 + tier * 5,
    crewMoraleModifier: 0.5,
    structuralIntegrity: 400 + tier * 200,
    shieldingRating: 0.2 + tier * 0.05,   // radiation-hardened
    stabilityRating: 0.9,
    synergyTags: ['data', 'AI'],
    synergyRange: 'location',
    maxUpgradeLevel: 4,
  }),
  mining_enterprise: (tier) => ({
    dockingCapacity: 1 + Math.floor(tier / 2),
    storageCapacity: 1_000 + tier * 500,   // big ore bins
    manufacturingThroughput: 0,
    refiningThroughput: 15 + tier * 10,
    marketLiquidityContribution: 5 + tier * 8,
    serviceQualityMultiplier: 0.85 + tier * 0.1,
    customerCapacity: 0,
    uplinkBandwidth: 5 + tier * 5,
    crewQuarters: 10 + tier * 8,
    crewMoraleModifier: 0.35 + tier * 0.05,  // rough life
    structuralIntegrity: 800 + tier * 350,
    shieldingRating: 0.15 + tier * 0.05,
    stabilityRating: 0.8,
    synergyTags: ['mining', 'extraction'],
    synergyRange: 'body',
    maxUpgradeLevel: 4,
  }),
  ground_station: (tier) => ({
    dockingCapacity: 0,
    storageCapacity: 30 + tier * 20,
    manufacturingThroughput: 0,
    refiningThroughput: 0,
    marketLiquidityContribution: 0,
    serviceQualityMultiplier: 0.95 + tier * 0.1,
    customerCapacity: 500 + tier * 1_500,
    uplinkBandwidth: 200 + tier * 500,
    crewQuarters: 8 + tier * 6,
    crewMoraleModifier: 0.6,
    structuralIntegrity: 500 + tier * 200,
    shieldingRating: 0.2 + tier * 0.04,
    stabilityRating: 0.95,  // ground is very stable
    synergyTags: ['ground', 'communications', 'relay'],
    synergyRange: 'system',
    maxUpgradeLevel: 3,
  }),
  solar_farm: (tier) => ({
    dockingCapacity: 0,
    storageCapacity: 10,
    manufacturingThroughput: 0,
    refiningThroughput: 0,
    marketLiquidityContribution: 0,
    serviceQualityMultiplier: 1.0,
    customerCapacity: 0,
    uplinkBandwidth: 0,
    crewQuarters: 2 + tier,
    crewMoraleModifier: 0.3,
    structuralIntegrity: 200 + tier * 100,
    shieldingRating: 0.08 + tier * 0.03,
    stabilityRating: 0.9,
    synergyTags: ['power'],
    synergyRange: 'location',
    maxUpgradeLevel: 3,
  }),
};

export function getBuildingDerivedStats(def: BuildingDefinition): BuildingDerivedStats {
  const profile = CATEGORY_PROFILE[def.category];
  const defaults = profile(def.tier);
  if (!def.stats) return defaults;
  return { ...defaults, ...def.stats };
}

/** Scale build time for duplicates: 1.3x per existing instance at same location */
export function scaledBuildTime(baseSec: number, countAtLocation: number): number {
  return Math.round(baseSec * Math.pow(1.3, countAtLocation));
}

/** Crafting speed multiplier from fabrication buildings.
 *  Each additional completed fabrication_facility beyond the first gives +15% speed.
 *  1 fab = 1x, 2 fabs = 1.15x, 3 fabs = 1.30x, 5 fabs = 1.60x, 10 fabs = 2.35x
 */
export function getCraftingSpeedMultiplier(
  buildings: { definitionId: string; isComplete: boolean }[],
): number {
  const fabCount = buildings.filter(b =>
    b.isComplete && BUILDING_MAP.get(b.definitionId)?.category === 'fabrication_facility'
  ).length;
  return 1 + 0.15 * Math.max(0, fabCount - 1);
}

/** Locations where power is unlimited (Earth surface). No tracking needed. */
const UNLIMITED_POWER_LOCATIONS = new Set(['earth_surface']);

/** Calculate power balance per location from completed buildings.
 *  Earth surface has unlimited power. Satellites are self-powered (no powerRequired).
 *  Returns generated, required, and ratio per location.
 */
export function getPowerByLocation(
  buildings: { definitionId: string; locationId: string; isComplete: boolean }[],
): Record<string, { generated: number; required: number; ratio: number }> {
  const result: Record<string, { generated: number; required: number }> = {};

  for (const bld of buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    if (UNLIMITED_POWER_LOCATIONS.has(bld.locationId)) continue;

    const loc = bld.locationId;
    if (!result[loc]) result[loc] = { generated: 0, required: 0 };
    if (def.powerGenerated) result[loc].generated += def.powerGenerated;
    if (def.powerRequired) result[loc].required += def.powerRequired;
  }

  // Compute ratio for each location
  const withRatio: Record<string, { generated: number; required: number; ratio: number }> = {};
  for (const [loc, data] of Object.entries(result)) {
    const ratio = data.required > 0
      ? Math.min(1, data.generated / data.required)
      : 1; // No power needed = fully powered
    withRatio[loc] = { ...data, ratio };
  }
  return withRatio;
}
