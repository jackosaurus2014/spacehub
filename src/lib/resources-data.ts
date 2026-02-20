import prisma from '@/lib/db';
import { safeJsonParse } from '@/lib/errors';

// Conversion constants
export const KG_TO_LB = 2.20462;
export const LB_TO_KG = 0.453592;

export interface ResourceData {
  slug: string;
  name: string;
  description: string;
  category: string;
  earthPricePerKg: number;
  priceUnit?: string;
  priceSource?: string;
  density?: number;
  applications: string[];
  usedIn?: string[];
  primarySuppliers?: string[];
  availability: string;
}

export interface LaunchProviderData {
  slug: string;
  name: string;
  vehicle: string;
  costPerKgToLEO: number;
  costPerKgToGEO?: number;
  costPerKgToMoon?: number;
  costPerKgToMars?: number;
  payloadToLEO?: number;
  status: string;
  country: string;
  reusable: boolean;
}

// Launch provider data with current market costs
const LAUNCH_PROVIDERS: LaunchProviderData[] = [
  {
    slug: 'spacex-falcon9',
    name: 'SpaceX',
    vehicle: 'Falcon 9',
    costPerKgToLEO: 2720,
    costPerKgToGEO: 5500,
    payloadToLEO: 22800,
    status: 'operational',
    country: 'USA',
    reusable: true,
  },
  {
    slug: 'spacex-falcon-heavy',
    name: 'SpaceX',
    vehicle: 'Falcon Heavy',
    costPerKgToLEO: 1500,
    costPerKgToGEO: 3000,
    costPerKgToMoon: 8000,
    payloadToLEO: 63800,
    status: 'operational',
    country: 'USA',
    reusable: true,
  },
  {
    slug: 'spacex-starship',
    name: 'SpaceX',
    vehicle: 'Starship',
    costPerKgToLEO: 200,
    costPerKgToGEO: 500,
    costPerKgToMoon: 1000,
    costPerKgToMars: 2000,
    payloadToLEO: 150000,
    status: 'development',
    country: 'USA',
    reusable: true,
  },
  {
    slug: 'rocketlab-electron',
    name: 'Rocket Lab',
    vehicle: 'Electron',
    costPerKgToLEO: 25000,
    payloadToLEO: 300,
    status: 'operational',
    country: 'USA',
    reusable: true,
  },
  {
    slug: 'ula-vulcan',
    name: 'ULA',
    vehicle: 'Vulcan Centaur',
    costPerKgToLEO: 8500,
    costPerKgToGEO: 15000,
    payloadToLEO: 27200,
    status: 'operational',
    country: 'USA',
    reusable: false,
  },
  {
    slug: 'arianespace-ariane6',
    name: 'Arianespace',
    vehicle: 'Ariane 6',
    costPerKgToLEO: 10000,
    costPerKgToGEO: 18000,
    payloadToLEO: 21650,
    status: 'operational',
    country: 'FRA',
    reusable: false,
  },
  {
    slug: 'casc-long-march-5',
    name: 'CASC',
    vehicle: 'Long March 5',
    costPerKgToLEO: 5000,
    costPerKgToGEO: 10000,
    costPerKgToMoon: 15000,
    payloadToLEO: 25000,
    status: 'operational',
    country: 'CHN',
    reusable: false,
  },
  {
    slug: 'roscosmos-soyuz',
    name: 'Roscosmos',
    vehicle: 'Soyuz 2',
    costPerKgToLEO: 12000,
    costPerKgToGEO: 25000,
    payloadToLEO: 8200,
    status: 'operational',
    country: 'RUS',
    reusable: false,
  },
  {
    slug: 'isro-lvm3',
    name: 'ISRO',
    vehicle: 'LVM3',
    costPerKgToLEO: 4500,
    costPerKgToGEO: 9000,
    payloadToLEO: 10000,
    status: 'operational',
    country: 'IND',
    reusable: false,
  },
  {
    slug: 'blue-origin-new-glenn',
    name: 'Blue Origin',
    vehicle: 'New Glenn',
    costPerKgToLEO: 3500,
    costPerKgToGEO: 7000,
    payloadToLEO: 45000,
    status: 'development',
    country: 'USA',
    reusable: true,
  },
  {
    slug: 'relativity-terran-r',
    name: 'Relativity Space',
    vehicle: 'Terran R',
    costPerKgToLEO: 6000,
    payloadToLEO: 23500,
    status: 'development',
    country: 'USA',
    reusable: true,
  },
];

// Space resources and commodities
const SPACE_RESOURCES: ResourceData[] = [
  // Raw Materials
  {
    slug: 'aluminum-6061',
    name: 'Aluminum 6061-T6',
    description: 'Primary aerospace aluminum alloy used in spacecraft structures, fuel tanks, and frames.',
    category: 'raw_material',
    earthPricePerKg: 3.50,
    priceSource: 'LME Aluminum + processing',
    density: 2700,
    applications: ['spacecraft_structures', 'fuel_tanks', 'fairings', 'frames'],
    usedIn: ['ISS', 'Orion', 'Dragon', 'Satellites'],
    primarySuppliers: ['USA', 'China', 'Russia'],
    availability: 'abundant',
  },
  {
    slug: 'titanium-6al4v',
    name: 'Titanium 6Al-4V',
    description: 'High-strength titanium alloy for critical aerospace components requiring strength and heat resistance.',
    category: 'raw_material',
    earthPricePerKg: 35,
    priceSource: 'Aerospace grade titanium market',
    density: 4430,
    applications: ['engine_components', 'fasteners', 'pressure_vessels', 'structural_parts'],
    usedIn: ['Rocket engines', 'Spacecraft frames', 'Heat shields'],
    primarySuppliers: ['USA', 'Russia', 'China', 'Japan'],
    availability: 'common',
  },
  {
    slug: 'inconel-718',
    name: 'Inconel 718',
    description: 'Nickel-based superalloy for extreme temperature applications in rocket engines.',
    category: 'raw_material',
    earthPricePerKg: 45,
    priceSource: 'Specialty metals market',
    density: 8190,
    applications: ['rocket_engines', 'turbopumps', 'combustion_chambers', 'nozzles'],
    usedIn: ['Raptor engine', 'RS-25', 'Merlin engine'],
    primarySuppliers: ['USA', 'Germany', 'Japan'],
    availability: 'limited',
  },
  {
    slug: 'copper-c10100',
    name: 'Oxygen-Free Copper (OFC)',
    description: 'High-purity copper for electrical systems and heat exchangers in spacecraft.',
    category: 'raw_material',
    earthPricePerKg: 12,
    priceSource: 'LME Copper + OFC premium',
    density: 8940,
    applications: ['electrical_systems', 'heat_exchangers', 'wiring', 'thermal_management'],
    usedIn: ['Power systems', 'Avionics', 'Cooling systems'],
    primarySuppliers: ['Chile', 'USA', 'Japan'],
    availability: 'abundant',
  },
  {
    slug: 'stainless-steel-304l',
    name: 'Stainless Steel 304L',
    description: 'Cryogenic-grade stainless steel used in fuel tanks and propellant lines.',
    category: 'raw_material',
    earthPricePerKg: 4.50,
    priceSource: 'Steel market + cryogenic grade',
    density: 8000,
    applications: ['fuel_tanks', 'propellant_lines', 'ground_equipment', 'structures'],
    usedIn: ['Starship', 'Ground support equipment'],
    primarySuppliers: ['USA', 'Japan', 'Germany'],
    availability: 'abundant',
  },

  // Composites
  {
    slug: 'carbon-fiber-t700',
    name: 'Carbon Fiber (T700)',
    description: 'High-strength carbon fiber for lightweight composite structures.',
    category: 'composite',
    earthPricePerKg: 25,
    priceSource: 'Industrial carbon fiber market',
    density: 1800,
    applications: ['fairings', 'payload_adapters', 'structural_tubes', 'pressure_vessels'],
    usedIn: ['Falcon 9 fairing', 'Satellite buses', 'Solar arrays'],
    primarySuppliers: ['Japan', 'USA', 'China'],
    availability: 'common',
  },
  {
    slug: 'carbon-fiber-t1000',
    name: 'Carbon Fiber (T1000)',
    description: 'Ultra-high modulus carbon fiber for critical aerospace applications.',
    category: 'composite',
    earthPricePerKg: 200,
    priceSource: 'Aerospace-grade carbon fiber',
    density: 1800,
    applications: ['primary_structures', 'pressure_vessels', 'high_performance_parts'],
    usedIn: ['Advanced satellites', 'Deep space probes'],
    primarySuppliers: ['Japan', 'USA'],
    availability: 'limited',
  },
  {
    slug: 'kevlar-49',
    name: 'Kevlar 49',
    description: 'Aramid fiber for impact protection and lightweight reinforcement.',
    category: 'composite',
    earthPricePerKg: 40,
    priceSource: 'DuPont/specialty markets',
    density: 1440,
    applications: ['micrometeorite_protection', 'pressure_vessels', 'thermal_blankets'],
    usedIn: ['ISS modules', 'Spacesuits', 'Inflatable habitats'],
    primarySuppliers: ['USA', 'Japan', 'Netherlands'],
    availability: 'common',
  },
  {
    slug: 'nanofiber-cnt',
    name: 'Carbon Nanotube Fiber',
    description: 'Advanced nanofiber material with exceptional strength-to-weight ratio.',
    category: 'composite',
    earthPricePerKg: 50000,
    priceSource: 'Research/specialty market',
    density: 1600,
    applications: ['next_gen_structures', 'tethers', 'radiation_shielding', 'electronics'],
    usedIn: ['Research applications', 'Experimental spacecraft'],
    primarySuppliers: ['USA', 'Japan', 'China'],
    availability: 'rare',
  },
  {
    slug: 'aerogel',
    name: 'Silica Aerogel',
    description: 'Ultra-lightweight insulation material for thermal protection.',
    category: 'composite',
    earthPricePerKg: 2000,
    priceSource: 'Specialty insulation market',
    density: 100,
    applications: ['thermal_insulation', 'dust_collection', 'impact_absorption'],
    usedIn: ['Mars rovers', 'Stardust mission', 'Spacesuits'],
    primarySuppliers: ['USA', 'Germany'],
    availability: 'limited',
  },

  // Propellants & Fuels
  {
    slug: 'liquid-oxygen',
    name: 'Liquid Oxygen (LOX)',
    description: 'Cryogenic oxidizer used in most rocket propulsion systems.',
    category: 'fuel',
    earthPricePerKg: 0.20,
    priceUnit: 'per kg (bulk)',
    priceSource: 'Industrial gas market',
    density: 1141,
    applications: ['rocket_oxidizer', 'life_support', 'fuel_cells'],
    usedIn: ['Falcon 9', 'Starship', 'SLS', 'All LOX/kerosene rockets'],
    primarySuppliers: ['USA', 'Europe', 'Russia', 'China'],
    availability: 'abundant',
  },
  {
    slug: 'liquid-hydrogen',
    name: 'Liquid Hydrogen (LH2)',
    description: 'Cryogenic fuel with highest specific impulse for upper stages.',
    category: 'fuel',
    earthPricePerKg: 6,
    priceUnit: 'per kg (bulk)',
    priceSource: 'Industrial hydrogen market',
    density: 70.8,
    applications: ['rocket_fuel', 'fuel_cells', 'upper_stages'],
    usedIn: ['SLS', 'Delta IV', 'Ariane', 'Centaur'],
    primarySuppliers: ['USA', 'Europe', 'Japan'],
    availability: 'common',
  },
  {
    slug: 'liquid-methane',
    name: 'Liquid Methane (LCH4)',
    description: 'Cryogenic fuel becoming standard for next-generation rockets.',
    category: 'fuel',
    earthPricePerKg: 0.80,
    priceUnit: 'per kg (bulk)',
    priceSource: 'Natural gas/LNG market',
    density: 422,
    applications: ['rocket_fuel', 'isru_production', 'mars_missions'],
    usedIn: ['Starship', 'New Glenn', 'Vulcan', 'Terran R'],
    primarySuppliers: ['USA', 'Qatar', 'Russia'],
    availability: 'abundant',
  },
  {
    slug: 'rp1-kerosene',
    name: 'RP-1 Kerosene',
    description: 'Refined kerosene rocket fuel used in first stages.',
    category: 'fuel',
    earthPricePerKg: 1.50,
    priceUnit: 'per kg',
    priceSource: 'Rocket-grade kerosene market',
    density: 810,
    applications: ['rocket_fuel', 'first_stages'],
    usedIn: ['Falcon 9', 'Soyuz', 'Atlas V', 'Electron'],
    primarySuppliers: ['USA', 'Russia'],
    availability: 'abundant',
  },
  {
    slug: 'hydrazine',
    name: 'Hydrazine (N2H4)',
    description: 'Hypergolic monopropellant for spacecraft attitude control.',
    category: 'fuel',
    earthPricePerKg: 50,
    priceSource: 'Specialty chemical market',
    density: 1004,
    applications: ['attitude_control', 'satellite_propulsion', 'emergency_systems'],
    usedIn: ['Most satellites', 'ISS', 'Deep space probes'],
    primarySuppliers: ['USA', 'France', 'Japan'],
    availability: 'common',
  },
  {
    slug: 'xenon-gas',
    name: 'Xenon Gas',
    description: 'Noble gas propellant for ion and Hall-effect thrusters.',
    category: 'fuel',
    earthPricePerKg: 3000,
    priceSource: 'Rare gas market',
    density: 5.894,
    applications: ['ion_propulsion', 'hall_thrusters', 'electric_propulsion'],
    usedIn: ['Starlink', 'Deep space missions', 'Station keeping'],
    primarySuppliers: ['Russia', 'USA', 'Ukraine'],
    availability: 'limited',
  },

  // Life Support
  {
    slug: 'potable-water',
    name: 'Potable Water',
    description: 'Clean water for crew consumption and systems.',
    category: 'life_support',
    earthPricePerKg: 0.002,
    priceSource: 'Municipal water (reference)',
    density: 1000,
    applications: ['crew_hydration', 'food_prep', 'oxygen_generation', 'cooling'],
    usedIn: ['ISS', 'Crew Dragon', 'Orion', 'All crewed missions'],
    primarySuppliers: ['Local production'],
    availability: 'abundant',
  },
  {
    slug: 'freeze-dried-food',
    name: 'Freeze-Dried Space Food',
    description: 'Specially prepared food for spaceflight with long shelf life.',
    category: 'life_support',
    earthPricePerKg: 200,
    priceSource: 'NASA/Space food contractors',
    density: 300,
    applications: ['crew_nutrition', 'long_duration_missions'],
    usedIn: ['ISS', 'All crewed missions'],
    primarySuppliers: ['USA', 'Russia', 'Japan'],
    availability: 'common',
  },
  {
    slug: 'lithium-hydroxide',
    name: 'Lithium Hydroxide',
    description: 'CO2 scrubber chemical for life support systems.',
    category: 'life_support',
    earthPricePerKg: 15,
    priceSource: 'Industrial chemical market',
    density: 1460,
    applications: ['co2_removal', 'air_revitalization', 'emergency_systems'],
    usedIn: ['Spacesuits', 'Orion', 'Emergency systems'],
    primarySuppliers: ['Chile', 'Australia', 'China'],
    availability: 'common',
  },

  // Electronics
  {
    slug: 'rad-hard-processor',
    name: 'Radiation-Hardened Processor',
    description: 'Space-qualified processors resistant to radiation effects.',
    category: 'electronics',
    earthPricePerKg: 500000,
    priceUnit: 'per unit (approx 0.1kg)',
    priceSource: 'Space electronics market',
    applications: ['flight_computers', 'guidance_systems', 'payload_processing'],
    usedIn: ['All spacecraft', 'Satellites', 'Probes'],
    primarySuppliers: ['USA', 'Europe'],
    availability: 'limited',
  },
  {
    slug: 'solar-cells-gaas',
    name: 'Triple-Junction GaAs Solar Cells',
    description: 'High-efficiency gallium arsenide solar cells for space power.',
    category: 'electronics',
    earthPricePerKg: 100000,
    priceUnit: 'per square meter (approx 2kg)',
    priceSource: 'Space solar cell market',
    applications: ['power_generation', 'solar_arrays'],
    usedIn: ['Most satellites', 'ISS', 'Mars rovers'],
    primarySuppliers: ['USA', 'Europe', 'Japan'],
    availability: 'common',
  },
  {
    slug: 'lithium-ion-battery',
    name: 'Space-Grade Li-Ion Battery',
    description: 'Radiation-tolerant lithium-ion batteries for spacecraft power storage.',
    category: 'electronics',
    earthPricePerKg: 500,
    priceSource: 'Space battery market',
    density: 2500,
    applications: ['power_storage', 'eclipse_power', 'peak_loads'],
    usedIn: ['Satellites', 'ISS', 'Rovers', 'Landers'],
    primarySuppliers: ['USA', 'Japan', 'South Korea'],
    availability: 'common',
  },

  // Exotic/Precious
  {
    slug: 'platinum',
    name: 'Platinum',
    description: 'Precious metal used in catalysts and specialized electronics.',
    category: 'exotic',
    earthPricePerKg: 30000,
    priceSource: 'Precious metals market',
    density: 21450,
    applications: ['catalysts', 'sensors', 'fuel_cells', 'contacts'],
    usedIn: ['Fuel cells', 'Thruster catalysts', 'Sensors'],
    primarySuppliers: ['South Africa', 'Russia', 'Zimbabwe'],
    availability: 'rare',
  },
  {
    slug: 'gold',
    name: 'Gold',
    description: 'Used for thermal control coatings and electrical connections.',
    category: 'exotic',
    earthPricePerKg: 60000,
    priceSource: 'Precious metals market',
    density: 19300,
    applications: ['thermal_coatings', 'electrical_contacts', 'radiation_shielding'],
    usedIn: ['James Webb', 'Satellites', 'Connectors'],
    primarySuppliers: ['China', 'Australia', 'Russia'],
    availability: 'rare',
  },
  {
    slug: 'beryllium',
    name: 'Beryllium',
    description: 'Lightweight metal for mirrors and precision instruments.',
    category: 'exotic',
    earthPricePerKg: 850,
    priceSource: 'Specialty metals market',
    density: 1850,
    applications: ['mirrors', 'precision_structures', 'x_ray_windows'],
    usedIn: ['James Webb mirrors', 'Space telescopes'],
    primarySuppliers: ['USA', 'Kazakhstan'],
    availability: 'rare',
  },
  {
    slug: 'tungsten',
    name: 'Tungsten',
    description: 'Dense metal for radiation shielding and counterweights.',
    category: 'raw_material',
    earthPricePerKg: 35,
    priceSource: 'Industrial metals market',
    density: 19250,
    applications: ['radiation_shielding', 'counterweights', 'high_temp_parts'],
    usedIn: ['Radiation shields', 'Balance masses'],
    primarySuppliers: ['China', 'Russia', 'Vietnam'],
    availability: 'common',
  },

  // Structural Components
  {
    slug: 'al-li-2195-panels',
    name: 'Al-Li 2195 Pressure Shell Panels',
    description: 'Aluminum-lithium alloy panels used for pressurized module shells. Offers 5% lower density and 10% higher stiffness than standard Al 2219.',
    category: 'structure',
    earthPricePerKg: 180,
    priceSource: 'Aerospace alloy market',
    density: 2710,
    applications: ['space_station_modules', 'commercial_habitats', 'pressure_vessels'],
    usedIn: ['ISS modules', 'SLS core stage', 'Orion spacecraft'],
    primarySuppliers: ['Arconic', 'Constellium', 'Aleris'],
    availability: 'moderate',
  },
  {
    slug: 'cfrp-truss-segments',
    name: 'CFRP Truss Segments',
    description: 'Carbon fiber reinforced polymer truss members for primary structural frameworks. Provides high stiffness-to-weight ratio for large orbital assemblies.',
    category: 'structure',
    earthPricePerKg: 450,
    priceSource: 'Aerospace composite structures market',
    density: 1600,
    applications: ['space_station_trusses', 'solar_array_booms', 'antenna_structures'],
    usedIn: ['ISS truss segments', 'Large satellite buses', 'Orbital platforms'],
    primarySuppliers: ['Northrop Grumman', 'Airbus Defence', 'Toray Industries'],
    availability: 'moderate',
  },
  {
    slug: 'berthing-adapters',
    name: 'Berthing Adapter Assemblies',
    description: 'Standardized berthing port hardware enabling module-to-module connections on orbital structures. Includes seals, latches, and alignment guides.',
    category: 'structure',
    earthPricePerKg: 2800,
    priceSource: 'Specialty aerospace hardware',
    applications: ['space_station_assembly', 'commercial_habitats', 'visiting_vehicle_ports'],
    usedIn: ['ISS Common Berthing Mechanism', 'Axiom Station', 'Orbital Reef'],
    primarySuppliers: ['Boeing', 'Thales Alenia Space', 'Sierra Space'],
    availability: 'scarce',
  },
  {
    slug: 'mmod-shielding-panels',
    name: 'MMOD Shielding Panels (Whipple)',
    description: 'Multi-layer micrometeorite and orbital debris shielding based on Whipple bumper design. Protects crew habitats from hypervelocity impacts.',
    category: 'structure',
    earthPricePerKg: 320,
    priceSource: 'Specialty shielding market',
    density: 2200,
    applications: ['habitat_protection', 'space_station_modules', 'commercial_stations'],
    usedIn: ['ISS modules', 'Lunar Gateway', 'Commercial habitats'],
    primarySuppliers: ['Northrop Grumman', 'Thales Alenia Space', 'Airbus Defence'],
    availability: 'moderate',
  },
  {
    slug: 'polyethylene-radiation-shield',
    name: 'Polyethylene Radiation Shielding',
    description: 'High-density polyethylene panels for galactic cosmic ray and solar particle event shielding. Hydrogen-rich composition effective at fragmenting heavy ions.',
    category: 'structure',
    earthPricePerKg: 45,
    priceSource: 'Specialty polymer market',
    density: 970,
    applications: ['crew_radiation_protection', 'storm_shelters', 'deep_space_habitats'],
    usedIn: ['ISS crew quarters', 'Orion spacecraft', 'Lunar Gateway'],
    primarySuppliers: ['SABIC', 'Braskem', 'LyondellBasell'],
    availability: 'abundant',
  },
  {
    slug: 'titanium-forgings-structural',
    name: 'Titanium Structural Forgings (Ti-6Al-4V)',
    description: 'Precision-forged titanium structural components for high-load applications. Includes node fittings, brackets, and pressure vessel end domes.',
    category: 'structure',
    earthPricePerKg: 280,
    priceSource: 'Aerospace titanium forgings market',
    density: 4430,
    applications: ['structural_nodes', 'pressure_vessel_domes', 'high_load_brackets'],
    usedIn: ['Spacecraft bus structures', 'Propellant tanks', 'Engine mounts'],
    primarySuppliers: ['VSMPO-AVISMA', 'Howmet Aerospace', 'Curtiss-Wright'],
    availability: 'moderate',
  },
  {
    slug: 'docking-ring-assemblies',
    name: 'Docking Ring Assemblies (IDSS)',
    description: 'International Docking System Standard ring assemblies for spacecraft rendezvous and docking. Includes soft-capture and hard-capture mechanisms.',
    category: 'structure',
    earthPricePerKg: 3500,
    priceSource: 'Specialty docking hardware market',
    applications: ['crewed_vehicle_docking', 'cargo_vehicle_docking', 'station_assembly'],
    usedIn: ['Crew Dragon', 'Starliner', 'Lunar Gateway'],
    primarySuppliers: ['Boeing', 'Northrop Grumman', 'Thales Alenia Space'],
    availability: 'scarce',
  },

  // Thermal Systems
  {
    slug: 'deployable-radiator-panels',
    name: 'Deployable Radiator Panels',
    description: 'Lightweight deployable thermal radiators for rejecting waste heat to space. Uses ammonia or other working fluids in embedded heat pipes.',
    category: 'thermal',
    earthPricePerKg: 1200,
    priceSource: 'Spacecraft thermal hardware market',
    applications: ['space_station_cooling', 'high_power_satellites', 'nuclear_electric_systems'],
    usedIn: ['ISS External Active Thermal Control', 'Lunar Gateway', 'GEO satellites'],
    primarySuppliers: ['Collins Aerospace', 'Northrop Grumman', 'Airbus Defence'],
    availability: 'scarce',
  },
  {
    slug: 'heat-exchangers-orbital',
    name: 'Orbital Heat Exchangers',
    description: 'Compact aerospace-grade heat exchangers for transferring thermal energy between fluid loops. Critical for ECLSS and power system thermal management.',
    category: 'thermal',
    earthPricePerKg: 850,
    priceSource: 'Aerospace thermal components market',
    applications: ['eclss_thermal_control', 'power_system_cooling', 'payload_thermal_management'],
    usedIn: ['ISS Internal Thermal Control', 'Commercial habitats', 'High-power satellites'],
    primarySuppliers: ['Collins Aerospace', 'Honeywell Aerospace', 'Safran'],
    availability: 'scarce',
  },
  {
    slug: 'mli-blanket-kits',
    name: 'MLI Blanket Kits (20-layer)',
    description: 'Multi-layer insulation blanket assemblies with 20 alternating layers of aluminized Mylar and Dacron netting. Standard passive thermal control for most spacecraft.',
    category: 'thermal',
    earthPricePerKg: 420,
    priceSource: 'Spacecraft insulation market',
    density: 50,
    applications: ['spacecraft_insulation', 'cryogenic_tank_insulation', 'instrument_thermal_control'],
    usedIn: ['Nearly all satellites', 'ISS', 'Cryogenic upper stages'],
    primarySuppliers: ['Dunmore', 'Sheldahl', 'Aerospace Fabrication'],
    availability: 'moderate',
  },
  {
    slug: 'cold-plate-assemblies',
    name: 'Cold Plate Assemblies',
    description: 'Aluminum cold plates with embedded fluid channels for direct conduction cooling of electronics and avionics boxes.',
    category: 'thermal',
    earthPricePerKg: 650,
    priceSource: 'Aerospace thermal management market',
    density: 2700,
    applications: ['avionics_cooling', 'battery_thermal_management', 'payload_electronics'],
    usedIn: ['Satellite avionics', 'ISS experiment racks', 'Crewed vehicles'],
    primarySuppliers: ['Collins Aerospace', 'Moog Inc.', 'Curtiss-Wright'],
    availability: 'moderate',
  },
  {
    slug: 'ammonia-loop-assemblies',
    name: 'Ammonia Loop Pump Assemblies',
    description: 'Pump packages for ammonia external thermal control loops. Includes redundant pump heads, accumulators, and control electronics for long-duration missions.',
    category: 'thermal',
    earthPricePerKg: 1800,
    priceSource: 'Specialty orbital hardware market',
    applications: ['space_station_external_cooling', 'large_platform_thermal_control', 'nuclear_power_systems'],
    usedIn: ['ISS External Active Thermal Control', 'Lunar Gateway', 'Orbital platforms'],
    primarySuppliers: ['Collins Aerospace', 'Northrop Grumman', 'Honeywell Aerospace'],
    availability: 'scarce',
  },
  {
    slug: 'heat-pipe-assemblies',
    name: 'Variable-Conductance Heat Pipes',
    description: 'Passive thermal transport devices using capillary-driven two-phase fluid flow. Variable conductance type adjusts heat transfer rate with changing thermal loads.',
    category: 'thermal',
    earthPricePerKg: 980,
    priceSource: 'Spacecraft thermal components market',
    applications: ['satellite_thermal_control', 'instrument_cooling', 'electronics_thermal_management'],
    usedIn: ['GEO satellites', 'Earth observation spacecraft', 'Science instruments'],
    primarySuppliers: ['Moog Inc.', 'Northrop Grumman', 'Teledyne Technologies'],
    availability: 'scarce',
  },

  // Propulsion Hardware
  {
    slug: 'hall-effect-thrusters',
    name: 'Hall-Effect Thrusters (5kW class)',
    description: 'Electric propulsion thrusters using Hall-effect plasma acceleration. 5kW class provides excellent thrust-to-power ratio for orbit raising and station keeping.',
    category: 'propulsion',
    earthPricePerKg: 4200,
    priceSource: 'Electric propulsion market',
    applications: ['orbit_raising', 'station_keeping', 'deep_space_propulsion'],
    usedIn: ['Starlink satellites', 'Lunar Gateway PPE', 'GEO satellites'],
    primarySuppliers: ['Aerojet Rocketdyne', 'Busek Co.', 'Safran'],
    availability: 'scarce',
  },
  {
    slug: 'bipropellant-engines',
    name: 'Bipropellant Engines (MMH/NTO, 490N)',
    description: 'Hypergolic bipropellant apogee engines producing 490N thrust. Uses monomethylhydrazine fuel and nitrogen tetroxide oxidizer for reliable deep-space maneuvers.',
    category: 'propulsion',
    earthPricePerKg: 5500,
    priceSource: 'Spacecraft propulsion market',
    applications: ['orbit_insertion', 'deep_space_maneuvers', 'deorbit_burns'],
    usedIn: ['GEO satellite apogee motors', 'Planetary probes', 'Crew vehicles'],
    primarySuppliers: ['Aerojet Rocketdyne', 'Moog Inc.', 'Safran'],
    availability: 'rare',
  },
  {
    slug: 'monoprop-thrusters-rcs',
    name: 'Monopropellant RCS Thrusters (22N)',
    description: 'Hydrazine monopropellant reaction control thrusters for attitude control and small delta-v maneuvers. Flight-proven across hundreds of missions.',
    category: 'propulsion',
    earthPricePerKg: 3800,
    priceSource: 'Spacecraft thruster market',
    applications: ['attitude_control', 'docking_maneuvers', 'orbit_maintenance'],
    usedIn: ['Most GEO satellites', 'Crew vehicles', 'Cargo spacecraft'],
    primarySuppliers: ['Aerojet Rocketdyne', 'Moog Inc.', 'Airbus Defence'],
    availability: 'scarce',
  },
  {
    slug: 'composite-propellant-tanks',
    name: 'Composite Overwrap Propellant Tanks',
    description: 'Lightweight propellant tanks with titanium liners and carbon fiber composite overwrap. Reduces mass by 30-40% compared to all-metal designs.',
    category: 'propulsion',
    earthPricePerKg: 1600,
    priceSource: 'Aerospace tank market',
    applications: ['satellite_propulsion', 'crew_vehicle_propulsion', 'upper_stage_tanks'],
    usedIn: ['GEO satellites', 'Orion service module', 'Crew Dragon'],
    primarySuppliers: ['Northrop Grumman', 'Airbus Defence', 'Cobham Advanced Electronic Solutions'],
    availability: 'scarce',
  },
  {
    slug: 'xenon-storage-tanks',
    name: 'Xenon Storage Tanks (high-pressure)',
    description: 'High-pressure composite tanks rated for 200+ bar xenon storage. Designed for electric propulsion systems on long-duration missions.',
    category: 'propulsion',
    earthPricePerKg: 2200,
    priceSource: 'High-pressure tank market',
    applications: ['electric_propulsion_storage', 'hall_thruster_feed', 'ion_engine_feed'],
    usedIn: ['All-electric GEO satellites', 'Starlink', 'Deep space probes'],
    primarySuppliers: ['Northrop Grumman', 'Cobham', 'MT Aerospace'],
    availability: 'scarce',
  },
  {
    slug: 'gridded-ion-engines',
    name: 'Gridded Ion Engines (NEXT-C class)',
    description: 'High-specific-impulse ion engines using electrostatic acceleration of xenon ions. NEXT-C class delivers up to 6.9kW with Isp over 4,000 seconds.',
    category: 'propulsion',
    earthPricePerKg: 6800,
    priceSource: 'Advanced electric propulsion market',
    applications: ['deep_space_missions', 'asteroid_missions', 'high_delta_v_maneuvers'],
    usedIn: ['DART mission', 'Dawn spacecraft', 'Deep space probes'],
    primarySuppliers: ['Aerojet Rocketdyne', 'QinetiQ', 'Busek Co.'],
    availability: 'rare',
  },
  {
    slug: 'electric-propulsion-ppu',
    name: 'Electric Propulsion PPUs',
    description: 'Power processing units that convert spacecraft bus power to the high-voltage, regulated supply required by electric thrusters. Typically 90%+ efficient.',
    category: 'propulsion',
    earthPricePerKg: 3200,
    priceSource: 'EP subsystem market',
    applications: ['hall_thruster_power', 'ion_engine_power', 'electric_propulsion_systems'],
    usedIn: ['All-electric satellites', 'Lunar Gateway PPE', 'Deep space missions'],
    primarySuppliers: ['Aerojet Rocketdyne', 'Moog Inc.', 'Busek Co.'],
    availability: 'scarce',
  },

  // Avionics & GNC
  {
    slug: 'rad-hard-flight-computers',
    name: 'Rad-Hard Flight Computers (RAD750)',
    description: 'Radiation-hardened single-board flight computers based on the RAD750 processor. Rated for total ionizing dose of 200-1000 krad and SEU immunity.',
    category: 'avionics',
    earthPricePerKg: 8500,
    priceSource: 'Space avionics market',
    applications: ['spacecraft_command_data', 'guidance_navigation', 'payload_processing'],
    usedIn: ['Mars rovers', 'Orion spacecraft', 'Military satellites'],
    primarySuppliers: ['BAE Systems', 'Honeywell Aerospace', 'Northrop Grumman'],
    availability: 'rare',
  },
  {
    slug: 'star-tracker-units',
    name: 'Star Tracker Units',
    description: 'Autonomous celestial navigation sensors that determine spacecraft attitude by matching observed star fields against an onboard catalog. Accuracy to arcsecond level.',
    category: 'avionics',
    earthPricePerKg: 5200,
    priceSource: 'Spacecraft sensor market',
    applications: ['attitude_determination', 'precision_pointing', 'navigation'],
    usedIn: ['Nearly all satellites', 'Space telescopes', 'Planetary probes'],
    primarySuppliers: ['Ball Aerospace', 'Leonardo', 'Sodern (Airbus)'],
    availability: 'scarce',
  },
  {
    slug: 'mems-imu-units',
    name: 'MEMS IMU Navigation Units',
    description: 'Micro-electromechanical inertial measurement units combining gyroscopes and accelerometers. Compact, lightweight alternative to ring-laser and fiber-optic gyros.',
    category: 'avionics',
    earthPricePerKg: 3400,
    priceSource: 'Inertial navigation market',
    applications: ['inertial_navigation', 'attitude_reference', 'launch_vehicle_guidance'],
    usedIn: ['SmallSats', 'Launch vehicles', 'Crew vehicles'],
    primarySuppliers: ['Honeywell Aerospace', 'Northrop Grumman', 'Safran'],
    availability: 'scarce',
  },
  {
    slug: 'reaction-wheel-assemblies',
    name: 'Reaction Wheel Assemblies (75 Nms)',
    description: 'Momentum exchange actuators for fine attitude control. 75 Nms class suited for medium spacecraft providing three-axis stabilization without propellant consumption.',
    category: 'avionics',
    earthPricePerKg: 2800,
    priceSource: 'Spacecraft actuator market',
    applications: ['attitude_control', 'precision_pointing', 'momentum_management'],
    usedIn: ['Earth observation satellites', 'Space telescopes', 'Science missions'],
    primarySuppliers: ['Collins Aerospace', 'Honeywell Aerospace', 'NewSpace Systems'],
    availability: 'scarce',
  },
  {
    slug: 'cmg-assemblies',
    name: 'Control Moment Gyroscope Assemblies',
    description: 'High-torque momentum exchange devices for attitude control of large spacecraft. Provides significantly more torque authority than reaction wheels for the same mass.',
    category: 'avionics',
    earthPricePerKg: 4500,
    priceSource: 'Large spacecraft actuator market',
    applications: ['space_station_attitude_control', 'large_satellite_platforms', 'agile_imaging_satellites'],
    usedIn: ['ISS', 'Lunar Gateway', 'Large GEO platforms'],
    primarySuppliers: ['Honeywell Aerospace', 'L3Harris', 'Collins Aerospace'],
    availability: 'rare',
  },
  {
    slug: 'gps-receivers-space',
    name: 'Space-Grade GPS Receivers',
    description: 'Radiation-tolerant GPS receivers for orbital position and velocity determination. Supports operation in LEO through GEO with specialized signal acquisition algorithms.',
    category: 'avionics',
    earthPricePerKg: 2100,
    priceSource: 'Space navigation electronics market',
    applications: ['orbit_determination', 'time_synchronization', 'formation_flying'],
    usedIn: ['LEO constellations', 'GEO satellites', 'Crew vehicles'],
    primarySuppliers: ['General Dynamics', 'Surrey Satellite Technology', 'Moog Inc.'],
    availability: 'moderate',
  },
  {
    slug: 'power-distribution-units',
    name: 'Power Distribution Units (28V/120V)',
    description: 'Spacecraft electrical power distribution units managing load switching, fault protection, and voltage regulation for all onboard subsystems.',
    category: 'avionics',
    earthPricePerKg: 1400,
    priceSource: 'Spacecraft power electronics market',
    applications: ['power_management', 'load_distribution', 'fault_protection'],
    usedIn: ['Satellites', 'Space stations', 'Crew vehicles'],
    primarySuppliers: ['L3Harris', 'Moog Inc.', 'Curtiss-Wright'],
    availability: 'moderate',
  },

  // Communications Equipment
  {
    slug: 's-band-transponders',
    name: 'S-Band Transponders',
    description: 'Space-qualified S-band transponders for telemetry, tracking, and command (TT&C) communications. Standard for LEO and deep-space uplink/downlink.',
    category: 'communications',
    earthPricePerKg: 2600,
    priceSource: 'Space communications market',
    applications: ['ttc_communications', 'telemetry_downlink', 'command_uplink'],
    usedIn: ['Nearly all spacecraft', 'CubeSats', 'Deep space probes'],
    primarySuppliers: ['L3Harris', 'General Dynamics', 'Teledyne Technologies'],
    availability: 'moderate',
  },
  {
    slug: 'x-band-transmitters',
    name: 'X-Band Transmitters (25W)',
    description: 'Medium-power X-band transmitters for high-rate science data downlink. 25W RF output suitable for LEO and MEO missions with moderate data volume.',
    category: 'communications',
    earthPricePerKg: 3800,
    priceSource: 'Space RF hardware market',
    applications: ['science_data_downlink', 'earth_observation_data', 'sar_data_downlink'],
    usedIn: ['Earth observation satellites', 'Science missions', 'Radar satellites'],
    primarySuppliers: ['L3Harris', 'Thales Alenia Space', 'General Dynamics'],
    availability: 'scarce',
  },
  {
    slug: 'ka-band-terminals',
    name: 'Ka-Band High-Rate Terminals',
    description: 'High-throughput Ka-band communication terminals for wideband data relay via TDRS or commercial relay networks. Supports rates exceeding 800 Mbps.',
    category: 'communications',
    earthPricePerKg: 5200,
    priceSource: 'High-rate space comm market',
    applications: ['high_rate_data_relay', 'tdrs_communication', 'commercial_relay'],
    usedIn: ['ISS', 'Hubble upgrades', 'High-data science missions'],
    primarySuppliers: ['L3Harris', 'Ball Aerospace', 'Honeywell Aerospace'],
    availability: 'scarce',
  },
  {
    slug: 'phased-array-antennas',
    name: 'Active Phased Array Antennas',
    description: 'Electronically steered phased array antennas with no moving parts. Enables rapid beam steering, multiple simultaneous beams, and graceful degradation.',
    category: 'communications',
    earthPricePerKg: 7200,
    priceSource: 'Advanced antenna systems market',
    applications: ['broadband_constellations', 'military_satcom', 'mobile_user_links'],
    usedIn: ['Starlink', 'SDA satellites', 'Advanced MILSATCOM'],
    primarySuppliers: ['L3Harris', 'Northrop Grumman', 'Ball Aerospace'],
    availability: 'rare',
  },
  {
    slug: 'optical-comm-terminals',
    name: 'Optical Communication Terminals (LCRD)',
    description: 'Laser-based free-space optical communication terminals achieving data rates 10-100x higher than RF links. Demonstrated on LCRD and DSOC missions.',
    category: 'communications',
    earthPricePerKg: 9500,
    priceSource: 'Emerging optical comm market',
    applications: ['high_bandwidth_relay', 'deep_space_optical_link', 'inter_satellite_links'],
    usedIn: ['LCRD', 'DSOC', 'Starlink inter-satellite links'],
    primarySuppliers: ['Ball Aerospace', 'MIT Lincoln Lab', 'Tesat-Spacecom'],
    availability: 'rare',
  },
  {
    slug: 'uhf-proximity-radios',
    name: 'UHF Proximity Link Radios',
    description: 'Short-range UHF radios for proximity operations including EVA communications, rover-to-lander links, and close-approach relay during docking.',
    category: 'communications',
    earthPricePerKg: 1800,
    priceSource: 'Space radio systems market',
    applications: ['eva_communications', 'proximity_operations', 'surface_relay'],
    usedIn: ['Mars rovers', 'Lunar landers', 'EVA suits'],
    primarySuppliers: ['L3Harris', 'General Dynamics', 'Honeywell Aerospace'],
    availability: 'moderate',
  },

  // Integrated Subsystems
  {
    slug: 'idss-docking-mechanisms',
    name: 'IDSS Docking Mechanisms (active)',
    description: 'Active-side docking mechanisms compliant with the International Docking System Standard. Includes soft-capture system, hard-capture latches, and avionics controller.',
    category: 'subsystem',
    earthPricePerKg: 4800,
    priceSource: 'Docking system market',
    applications: ['crewed_vehicle_docking', 'automated_cargo_docking', 'station_assembly'],
    usedIn: ['Crew Dragon', 'Starliner', 'Dream Chaser'],
    primarySuppliers: ['Boeing', 'SpaceX', 'Sierra Space'],
    availability: 'rare',
  },
  {
    slug: 'robotic-arm-7dof',
    name: '7-DOF Robotic Arm Systems',
    description: 'Seven-degree-of-freedom robotic manipulator arms for external servicing, payload handling, and assembly operations on orbital platforms.',
    category: 'subsystem',
    earthPricePerKg: 6200,
    priceSource: 'Space robotics market',
    applications: ['payload_handling', 'external_servicing', 'orbital_assembly'],
    usedIn: ['ISS (Canadarm2)', 'Lunar Gateway (Canadarm3)', 'Chinese Space Station'],
    primarySuppliers: ['MDA Space', 'Northrop Grumman', 'Airbus Defence'],
    availability: 'rare',
  },
  {
    slug: 'capture-berthing-mechanisms',
    name: 'Capture/Berthing Mechanisms',
    description: 'Robotic capture and berthing mechanisms for visiting vehicle operations. Uses grapple fixture and powered bolts for secure structural connection.',
    category: 'subsystem',
    earthPricePerKg: 3500,
    priceSource: 'Berthing hardware market',
    applications: ['cargo_vehicle_capture', 'module_berthing', 'experiment_pallet_install'],
    usedIn: ['ISS (Cygnus, Dragon cargo)', 'Lunar Gateway', 'Commercial stations'],
    primarySuppliers: ['MDA Space', 'Boeing', 'Thales Alenia Space'],
    availability: 'scarce',
  },
  {
    slug: 'eva-airlock-assemblies',
    name: 'EVA Airlock Assemblies',
    description: 'Crew airlock systems enabling extravehicular activity without depressurizing the entire habitat. Includes inner and outer hatches, suit ports, and environmental controls.',
    category: 'subsystem',
    earthPricePerKg: 5500,
    priceSource: 'Crewed systems hardware market',
    applications: ['eva_egress_ingress', 'suit_maintenance', 'emergency_operations'],
    usedIn: ['ISS Quest Airlock', 'Lunar Gateway', 'Commercial space stations'],
    primarySuppliers: ['Boeing', 'Northrop Grumman', 'Nanoracks'],
    availability: 'rare',
  },
  {
    slug: 'eclss-rack-assemblies',
    name: 'ECLSS Rack Assemblies (4-crew)',
    description: 'Environmental Control and Life Support System rack assemblies sized for 4-crew habitats. Integrates CO2 removal, trace contaminant control, and humidity management.',
    category: 'subsystem',
    earthPricePerKg: 3800,
    priceSource: 'Life support systems market',
    applications: ['habitat_atmosphere_management', 'crew_environmental_control', 'air_revitalization'],
    usedIn: ['ISS USOS', 'Lunar Gateway', 'Commercial space stations'],
    primarySuppliers: ['Collins Aerospace', 'Honeywell Aerospace', 'Paragon Space Development'],
    availability: 'rare',
  },
  {
    slug: 'water-recovery-systems',
    name: 'Water Recovery System (WRS)',
    description: 'Closed-loop water recovery systems that reclaim potable water from humidity condensate and urine. Achieves 90%+ water recovery rate for long-duration missions.',
    category: 'subsystem',
    earthPricePerKg: 4200,
    priceSource: 'ECLSS subsystem market',
    applications: ['water_reclamation', 'long_duration_missions', 'deep_space_habitats'],
    usedIn: ['ISS WRS racks', 'Lunar Gateway', 'Mars transit habitats'],
    primarySuppliers: ['Collins Aerospace', 'Paragon Space Development', 'Honeywell Aerospace'],
    availability: 'rare',
  },
  {
    slug: 'oxygen-generation-systems',
    name: 'Oxygen Generation System (OGS)',
    description: 'Electrolysis-based oxygen generation systems that produce breathable O2 from water. Critical for reducing resupply mass on long-duration crewed missions.',
    category: 'subsystem',
    earthPricePerKg: 3600,
    priceSource: 'Life support systems market',
    applications: ['oxygen_production', 'atmosphere_management', 'isru_integration'],
    usedIn: ['ISS OGS', 'Lunar Gateway', 'Mars surface habitats'],
    primarySuppliers: ['Collins Aerospace', 'Honeywell Aerospace', 'Paragon Space Development'],
    availability: 'rare',
  },
];

// Database initialization functions
export async function initializeResources() {
  let resourceCount = 0;
  let providerCount = 0;

  // Insert launch providers
  for (const provider of LAUNCH_PROVIDERS) {
    await prisma.launchProvider.upsert({
      where: { slug: provider.slug },
      update: {
        name: provider.name,
        vehicle: provider.vehicle,
        costPerKgToLEO: provider.costPerKgToLEO,
        costPerKgToGEO: provider.costPerKgToGEO,
        costPerKgToMoon: provider.costPerKgToMoon,
        costPerKgToMars: provider.costPerKgToMars,
        payloadToLEO: provider.payloadToLEO,
        status: provider.status,
        country: provider.country,
        reusable: provider.reusable,
      },
      create: {
        slug: provider.slug,
        name: provider.name,
        vehicle: provider.vehicle,
        costPerKgToLEO: provider.costPerKgToLEO,
        costPerKgToGEO: provider.costPerKgToGEO,
        costPerKgToMoon: provider.costPerKgToMoon,
        costPerKgToMars: provider.costPerKgToMars,
        payloadToLEO: provider.payloadToLEO,
        status: provider.status,
        country: provider.country,
        reusable: provider.reusable,
      },
    });
    providerCount++;
  }

  // Insert resources
  for (const resource of SPACE_RESOURCES) {
    await prisma.spaceResource.upsert({
      where: { slug: resource.slug },
      update: {
        name: resource.name,
        description: resource.description,
        category: resource.category,
        earthPricePerKg: resource.earthPricePerKg,
        priceUnit: resource.priceUnit,
        priceSource: resource.priceSource,
        density: resource.density,
        applications: JSON.stringify(resource.applications),
        usedIn: resource.usedIn ? JSON.stringify(resource.usedIn) : null,
        primarySuppliers: resource.primarySuppliers ? JSON.stringify(resource.primarySuppliers) : null,
        availability: resource.availability,
      },
      create: {
        slug: resource.slug,
        name: resource.name,
        description: resource.description,
        category: resource.category,
        earthPricePerKg: resource.earthPricePerKg,
        priceUnit: resource.priceUnit,
        priceSource: resource.priceSource,
        density: resource.density,
        applications: JSON.stringify(resource.applications),
        usedIn: resource.usedIn ? JSON.stringify(resource.usedIn) : null,
        primarySuppliers: resource.primarySuppliers ? JSON.stringify(resource.primarySuppliers) : null,
        availability: resource.availability,
      },
    });
    resourceCount++;
  }

  return {
    success: true,
    resourceCount,
    providerCount,
  };
}

export async function getResources(options?: {
  category?: string;
  availability?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (options?.category) {
    where.category = options.category;
  }
  if (options?.availability) {
    where.availability = options.availability;
  }

  const [resources, total] = await Promise.all([
    prisma.spaceResource.findMany({
      where,
      orderBy: [{ category: 'asc' }, { earthPricePerKg: 'desc' }],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.spaceResource.count({ where }),
  ]);

  return {
    resources: resources.map((r) => ({
      ...r,
      applications: safeJsonParse(r.applications, []),
      usedIn: r.usedIn ? safeJsonParse(r.usedIn, null) : null,
      primarySuppliers: r.primarySuppliers ? safeJsonParse(r.primarySuppliers, null) : null,
    })),
    total,
  };
}

export async function getLaunchProviders(options?: {
  status?: string;
  country?: string;
}) {
  const where: Record<string, unknown> = {};

  if (options?.status) {
    where.status = options.status;
  }
  if (options?.country) {
    where.country = options.country;
  }

  return prisma.launchProvider.findMany({
    where,
    orderBy: { costPerKgToLEO: 'asc' },
  });
}

export async function getResourceStats() {
  const [
    total,
    byCategory,
    byAvailability,
    avgPrice,
    providers,
  ] = await Promise.all([
    prisma.spaceResource.count(),
    prisma.spaceResource.groupBy({
      by: ['category'],
      _count: { category: true },
    }),
    prisma.spaceResource.groupBy({
      by: ['availability'],
      _count: { availability: true },
    }),
    prisma.spaceResource.aggregate({
      _avg: { earthPricePerKg: true },
    }),
    prisma.launchProvider.count(),
  ]);

  // Get min/max launch costs
  const launchCosts = await prisma.launchProvider.aggregate({
    _min: { costPerKgToLEO: true },
    _max: { costPerKgToLEO: true },
    _avg: { costPerKgToLEO: true },
  });

  return {
    total,
    byCategory: Object.fromEntries(
      byCategory.map((c) => [c.category, c._count.category])
    ),
    byAvailability: Object.fromEntries(
      byAvailability.map((a) => [a.availability, a._count.availability])
    ),
    avgEarthPrice: avgPrice._avg.earthPricePerKg,
    launchProviders: providers,
    launchCosts: {
      min: launchCosts._min.costPerKgToLEO,
      max: launchCosts._max.costPerKgToLEO,
      avg: launchCosts._avg.costPerKgToLEO,
    },
  };
}

// Calculate space price based on earth price and launch cost
export function calculateSpacePrice(
  earthPricePerKg: number,
  launchCostPerKg: number
): number {
  return earthPricePerKg + launchCostPerKg;
}

// Get benchmark launch cost (Falcon 9 as current market standard)
export function getBenchmarkLaunchCost(): number {
  return 2720; // Falcon 9 cost per kg to LEO
}
