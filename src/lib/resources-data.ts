import prisma from '@/lib/db';

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
      applications: JSON.parse(r.applications),
      usedIn: r.usedIn ? JSON.parse(r.usedIn) : null,
      primarySuppliers: r.primarySuppliers ? JSON.parse(r.primarySuppliers) : null,
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
