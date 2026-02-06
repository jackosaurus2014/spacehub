import prisma from './db';
import { safeJsonParse } from './errors';

// ============================================================
// Blueprint Types
// ============================================================

export type BlueprintCategory = 'engine' | 'satellite_bus' | 'lander' | 'spacecraft';
export type BlueprintStatus = 'operational' | 'development' | 'retired' | 'proposed';

export interface BlueprintSpecifications {
  // Engine specs
  thrust?: number; // kN
  thrustVacuum?: number; // kN
  isp?: number; // seconds (sea level)
  ispVacuum?: number; // seconds (vacuum)
  cycleType?: string;
  throttleRange?: string;
  massFlowRate?: number; // kg/s
  chamberPressure?: number; // bar
  nozzleRatio?: number;
  restartCapability?: boolean;
  gimbalRange?: number; // degrees

  // Satellite bus specs
  dryMass?: number; // kg
  maxPayloadMass?: number; // kg
  power?: number; // W
  designLife?: number; // years
  propulsion?: string;
  attitude?: string;
  dataRate?: number; // Mbps
  stationkeeping?: string;
  dimensions?: string;

  // Lander specs
  landingMass?: number; // kg
  payloadCapacity?: number; // kg
  payloadVolume?: number; // m^3
  landingAccuracy?: string;
  surfaceOperations?: string;

  // Common specs
  height?: number; // m
  diameter?: number; // m
  mass?: number; // kg
  cost?: number; // USD millions
}

export interface BlueprintSeed {
  slug: string;
  name: string;
  category: BlueprintCategory;
  manufacturer: string;
  specifications: BlueprintSpecifications;
  propellantType?: string;
  firstFlight?: Date;
  missionsFlown?: number;
  keyInnovations: string[];
  description: string;
  technicalNotes?: string;
  imageUrl?: string;
  diagramUrl?: string;
  sourceUrls: string[];
  status: BlueprintStatus;
}

// ============================================================
// Seed Data: Rocket Engines (15+)
// ============================================================

export const ROCKET_ENGINES_SEED: BlueprintSeed[] = [
  // SpaceX Engines
  {
    slug: 'merlin-1d',
    name: 'Merlin 1D',
    category: 'engine',
    manufacturer: 'SpaceX',
    specifications: {
      thrust: 854,
      thrustVacuum: 981,
      isp: 282,
      ispVacuum: 311,
      cycleType: 'Gas Generator',
      throttleRange: '57%-100%',
      massFlowRate: 273,
      chamberPressure: 97,
      mass: 470,
      nozzleRatio: 16,
      restartCapability: true,
      gimbalRange: 5,
    },
    propellantType: 'RP-1/LOX',
    firstFlight: new Date('2013-09-29'),
    missionsFlown: 350,
    keyInnovations: [
      'Pintle injector design for deep throttling',
      'Regeneratively cooled combustion chamber',
      'Turbopump with single-shaft dual-impeller design',
      'Highest thrust-to-weight ratio of any operational engine',
      'Designed for rapid reusability',
    ],
    description: 'The Merlin 1D is a gas-generator rocket engine developed by SpaceX for use on the Falcon 9 and Falcon Heavy launch vehicles. It represents the culmination of SpaceX\'s engine development efforts and is noted for its exceptional thrust-to-weight ratio and reliability.',
    technicalNotes: 'Nine Merlin 1D engines power the Falcon 9 first stage in an octaweb configuration. The engine uses a pintle injector, which is unusual for engines of this class but allows for deep throttling capability essential for propulsive landing.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Merlin_1D.jpg',
    sourceUrls: [
      'https://www.spacex.com/vehicles/falcon-9/',
      'https://arc.aiaa.org/doi/10.2514/6.2013-4232',
    ],
    status: 'operational',
  },
  {
    slug: 'raptor-2',
    name: 'Raptor 2',
    category: 'engine',
    manufacturer: 'SpaceX',
    specifications: {
      thrust: 2300,
      thrustVacuum: 2550,
      isp: 327,
      ispVacuum: 350,
      cycleType: 'Full-Flow Staged Combustion',
      throttleRange: '40%-100%',
      massFlowRate: 650,
      chamberPressure: 330,
      mass: 1600,
      nozzleRatio: 40,
      restartCapability: true,
      gimbalRange: 15,
    },
    propellantType: 'CH4/LOX (Methalox)',
    firstFlight: new Date('2023-04-20'),
    missionsFlown: 15,
    keyInnovations: [
      'First full-flow staged combustion engine to fly',
      'Highest chamber pressure of any operational engine (330 bar)',
      'Methane fuel for in-situ resource utilization on Mars',
      'Designed for rapid reusability (1000+ flights)',
      'Oxidizer-rich and fuel-rich preburners',
      '3D-printed components for rapid manufacturing',
    ],
    description: 'Raptor 2 is SpaceX\'s next-generation rocket engine, designed to power the Starship spacecraft and Super Heavy booster. It employs full-flow staged combustion, making it one of the most advanced rocket engines ever built.',
    technicalNotes: 'The full-flow staged combustion cycle uses both fuel-rich and oxidizer-rich preburners, eliminating turbine temperature limits and enabling extremely high chamber pressures. The engine uses methane, which can be synthesized on Mars using the Sabatier reaction.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Raptor_2.jpg/800px-Raptor_2.jpg',
    sourceUrls: [
      'https://www.spacex.com/vehicles/starship/',
      'https://arc.aiaa.org/doi/10.2514/6.2019-3768',
    ],
    status: 'operational',
  },
  {
    slug: 'raptor-vacuum',
    name: 'Raptor Vacuum (RVac)',
    category: 'engine',
    manufacturer: 'SpaceX',
    specifications: {
      thrustVacuum: 2550,
      ispVacuum: 380,
      cycleType: 'Full-Flow Staged Combustion',
      throttleRange: '40%-100%',
      chamberPressure: 330,
      mass: 2000,
      nozzleRatio: 200,
      restartCapability: true,
      height: 3.7,
      diameter: 2.4,
    },
    propellantType: 'CH4/LOX (Methalox)',
    firstFlight: new Date('2024-03-14'),
    missionsFlown: 5,
    keyInnovations: [
      'Extremely large expansion ratio nozzle (200:1)',
      'Highest specific impulse of any operational chemical engine',
      'Regeneratively cooled nozzle extension',
      'Designed for deep space operations',
    ],
    description: 'The Raptor Vacuum is an extended nozzle variant of the Raptor engine, optimized for use in the vacuum of space. It features a significantly larger nozzle extension to maximize efficiency at altitude.',
    technicalNotes: 'Six RVac engines power the Starship upper stage. The large nozzle extension is regeneratively cooled and provides an estimated 380 seconds of specific impulse, among the highest of any chemical rocket engine.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Raptor_Vacuum.jpg/800px-Raptor_Vacuum.jpg',
    sourceUrls: [
      'https://www.spacex.com/vehicles/starship/',
    ],
    status: 'operational',
  },

  // Blue Origin Engines
  {
    slug: 'be-4',
    name: 'BE-4',
    category: 'engine',
    manufacturer: 'Blue Origin',
    specifications: {
      thrust: 2400,
      thrustVacuum: 2670,
      isp: 305,
      ispVacuum: 337,
      cycleType: 'Oxidizer-Rich Staged Combustion',
      throttleRange: '30%-100%',
      chamberPressure: 135,
      mass: 2250,
      nozzleRatio: 35,
      restartCapability: true,
      gimbalRange: 8,
    },
    propellantType: 'CH4/LOX (Methalox)',
    firstFlight: new Date('2024-01-08'),
    missionsFlown: 4,
    keyInnovations: [
      'First American oxygen-rich staged combustion engine',
      'Powers both New Glenn and Vulcan Centaur',
      'Designed for low manufacturing cost and reusability',
      'Advanced hydrostatic bearing turbopump',
      'Modular design for ease of assembly',
    ],
    description: 'The BE-4 is a large LOX/methane rocket engine developed by Blue Origin. It powers the first stage of both Blue Origin\'s New Glenn and ULA\'s Vulcan Centaur launch vehicles.',
    technicalNotes: 'The oxygen-rich staged combustion cycle was chosen for its combination of high performance and reusability. The engine uses an innovative turbopump with hydrostatic bearings that eliminate the need for seals.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/BE-4_rocket_engine.jpg/800px-BE-4_rocket_engine.jpg',
    sourceUrls: [
      'https://www.blueorigin.com/engines/be-4',
      'https://arc.aiaa.org/doi/10.2514/6.2018-4658',
    ],
    status: 'operational',
  },
  {
    slug: 'be-3',
    name: 'BE-3',
    category: 'engine',
    manufacturer: 'Blue Origin',
    specifications: {
      thrust: 490,
      thrustVacuum: 530,
      isp: 410,
      ispVacuum: 450,
      cycleType: 'Tap-off',
      throttleRange: '20%-100%',
      chamberPressure: 70,
      mass: 725,
      restartCapability: true,
      gimbalRange: 7,
    },
    propellantType: 'LH2/LOX',
    firstFlight: new Date('2015-04-29'),
    missionsFlown: 30,
    keyInnovations: [
      'Highly throttleable for precision landing',
      'Hydrogen-oxygen for high specific impulse',
      'Designed for vertical takeoff and landing',
      'Rapid restart capability',
    ],
    description: 'The BE-3 is a liquid hydrogen/liquid oxygen rocket engine developed by Blue Origin for the New Shepard suborbital vehicle. It is notable for its deep throttling capability, enabling vertical landing.',
    technicalNotes: 'The BE-3 uses a tap-off cycle where gases are bled from the main combustion chamber to power the turbopumps. This is simpler than staged combustion but still allows for excellent performance with hydrogen fuel.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/BE-3_engine.jpg/800px-BE-3_engine.jpg',
    sourceUrls: [
      'https://www.blueorigin.com/engines/be-3',
    ],
    status: 'operational',
  },

  // Aerojet Rocketdyne Engines
  {
    slug: 'rs-25',
    name: 'RS-25 (SSME)',
    category: 'engine',
    manufacturer: 'Aerojet Rocketdyne',
    specifications: {
      thrust: 1859,
      thrustVacuum: 2279,
      isp: 366,
      ispVacuum: 452.3,
      cycleType: 'Staged Combustion (Fuel-Rich)',
      throttleRange: '67%-109%',
      massFlowRate: 515,
      chamberPressure: 206,
      mass: 3177,
      nozzleRatio: 77.5,
      restartCapability: false,
      gimbalRange: 10.5,
    },
    propellantType: 'LH2/LOX',
    firstFlight: new Date('1981-04-12'),
    missionsFlown: 135,
    keyInnovations: [
      'Most tested rocket engine in history',
      'Pioneered high-pressure staged combustion in the West',
      'Reusable design (55+ missions per engine)',
      'Advanced engine controller for autonomy',
      'Record specific impulse for hydrogen engines',
    ],
    description: 'The RS-25, originally known as the Space Shuttle Main Engine (SSME), is a reusable staged-combustion rocket engine used on the Space Shuttle and now the SLS. It is considered one of the most complex and efficient engines ever built.',
    technicalNotes: 'The RS-25 was designed for reuse across up to 55 missions. It employs a fuel-rich staged combustion cycle with two separate turbopumps. The engine controller was one of the first to use digital computers for real-time engine management.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/SSME_test_firing.jpg/800px-SSME_test_firing.jpg',
    sourceUrls: [
      'https://www.nasa.gov/exploration/systems/sls/rs-25-engines.html',
      'https://arc.aiaa.org/doi/10.2514/6.2002-3758',
    ],
    status: 'operational',
  },
  {
    slug: 'rl-10',
    name: 'RL10',
    category: 'engine',
    manufacturer: 'Aerojet Rocketdyne',
    specifications: {
      thrust: 110,
      thrustVacuum: 110,
      ispVacuum: 465,
      cycleType: 'Expander',
      throttleRange: '20%-100%',
      chamberPressure: 40,
      mass: 167,
      nozzleRatio: 84,
      restartCapability: true,
    },
    propellantType: 'LH2/LOX',
    firstFlight: new Date('1963-11-27'),
    missionsFlown: 520,
    keyInnovations: [
      'First hydrogen-oxygen engine to fly',
      'Pioneered the expander cycle',
      'Highest production specific impulse',
      'Multiple restart capability',
      'Over 60 years of continuous improvement',
    ],
    description: 'The RL10 is a versatile upper stage engine with the highest production specific impulse of any chemical rocket engine. It has powered Centaur, Delta IV, and now SLS upper stages.',
    technicalNotes: 'The expander cycle uses heat from the combustion chamber walls to gasify the hydrogen fuel, which then drives the turbopump. This elegant design has proven extremely reliable across hundreds of missions.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/RL10_rocket_engine.jpg/800px-RL10_rocket_engine.jpg',
    sourceUrls: [
      'https://www.rocket.com/space/liquid-engines/rl10',
      'https://arc.aiaa.org/doi/10.2514/6.2014-3635',
    ],
    status: 'operational',
  },
  {
    slug: 'ar-1',
    name: 'AR1',
    category: 'engine',
    manufacturer: 'Aerojet Rocketdyne',
    specifications: {
      thrust: 2200,
      isp: 297,
      ispVacuum: 337,
      cycleType: 'Oxidizer-Rich Staged Combustion',
      throttleRange: '50%-100%',
      chamberPressure: 170,
      mass: 2000,
      restartCapability: true,
    },
    propellantType: 'RP-1/LOX',
    keyInnovations: [
      'Designed as RD-180 replacement',
      'American oxygen-rich staged combustion',
      'Advanced manufacturing techniques',
      'Reusable design',
    ],
    description: 'The AR1 was developed as an American-made replacement for the Russian RD-180 engine. Though development was completed, it was not selected for the Vulcan launch vehicle.',
    technicalNotes: 'The AR1 uses kerosene and liquid oxygen in an oxygen-rich staged combustion cycle, similar to the RD-180 but with modern American manufacturing techniques.',
    sourceUrls: [
      'https://www.rocket.com/space/liquid-engines/ar1',
    ],
    status: 'retired',
  },

  // Rocket Lab Engines
  {
    slug: 'rutherford',
    name: 'Rutherford',
    category: 'engine',
    manufacturer: 'Rocket Lab',
    specifications: {
      thrust: 25,
      thrustVacuum: 26.5,
      isp: 303,
      ispVacuum: 343,
      cycleType: 'Electric Pump-Fed',
      throttleRange: '40%-100%',
      massFlowRate: 8,
      chamberPressure: 12,
      mass: 35,
      restartCapability: true,
    },
    propellantType: 'RP-1/LOX',
    firstFlight: new Date('2017-05-25'),
    missionsFlown: 50,
    keyInnovations: [
      'First electric pump-fed engine to reach orbit',
      'Lithium-polymer batteries power turbopumps',
      '3D printed combustion chamber and injector',
      'Simplified propellant system (no turbomachinery)',
      'Designed for high-volume manufacturing',
    ],
    description: 'The Rutherford is a revolutionary small rocket engine that uses electric motors and batteries instead of gas-driven turbopumps. It powers the Electron launch vehicle.',
    technicalNotes: 'By using electric pumps, the Rutherford eliminates the complex turbomachinery found in traditional rocket engines. The battery system provides consistent performance throughout the flight and simplifies manufacturing significantly.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Rutherford_engine.jpg/800px-Rutherford_engine.jpg',
    sourceUrls: [
      'https://www.rocketlabusa.com/engines/rutherford/',
      'https://arc.aiaa.org/doi/10.2514/6.2017-4928',
    ],
    status: 'operational',
  },
  {
    slug: 'archimedes',
    name: 'Archimedes',
    category: 'engine',
    manufacturer: 'Rocket Lab',
    specifications: {
      thrust: 980,
      ispVacuum: 320,
      cycleType: 'Gas Generator',
      throttleRange: '50%-100%',
      mass: 600,
      restartCapability: true,
    },
    propellantType: 'CH4/LOX (Methalox)',
    keyInnovations: [
      'Designed for Neutron medium-lift vehicle',
      'Reusable from day one',
      'Optimized for rapid turnaround',
      'Modular design for manufacturing efficiency',
    ],
    description: 'Archimedes is Rocket Lab\'s medium-class engine being developed for the Neutron launch vehicle. It uses methane fuel and is designed for full reusability.',
    technicalNotes: 'The Archimedes represents Rocket Lab\'s move into the medium launch market, using methane for its reusability benefits and developing a new engine architecture.',
    sourceUrls: [
      'https://www.rocketlabusa.com/launch/neutron/',
    ],
    status: 'development',
  },

  // Relativity Space Engines
  {
    slug: 'aeon-1',
    name: 'Aeon 1',
    category: 'engine',
    manufacturer: 'Relativity Space',
    specifications: {
      thrust: 100,
      ispVacuum: 310,
      cycleType: 'Gas Generator',
      throttleRange: '50%-100%',
      restartCapability: true,
      mass: 100,
    },
    propellantType: 'RP-1/LOX',
    firstFlight: new Date('2023-03-22'),
    missionsFlown: 1,
    keyInnovations: [
      '85% 3D printed by mass',
      'Designed for additive manufacturing',
      'Reduced part count (100 vs 1000+)',
      'Rapid iteration and development',
      'Built by world\'s largest metal 3D printers',
    ],
    description: 'The Aeon 1 is a 3D-printed rocket engine developed by Relativity Space. It powers the Terran 1 rocket and demonstrates the viability of additive manufacturing for rocket engines.',
    technicalNotes: 'Relativity Space developed custom large-format metal 3D printers to manufacture the Aeon engine. The design is optimized for additive manufacturing, with integrated features that would be impossible with traditional machining.',
    imageUrl: 'https://www.relativityspace.com/images/aeon-engine.jpg',
    sourceUrls: [
      'https://www.relativityspace.com/engines',
    ],
    status: 'operational',
  },
  {
    slug: 'aeon-r',
    name: 'Aeon R',
    category: 'engine',
    manufacturer: 'Relativity Space',
    specifications: {
      thrust: 1400,
      ispVacuum: 350,
      cycleType: 'Oxidizer-Rich Staged Combustion',
      throttleRange: '40%-100%',
      restartCapability: true,
    },
    propellantType: 'CH4/LOX (Methalox)',
    keyInnovations: [
      'Fully 3D printed staged combustion engine',
      'Designed for Terran R reusable vehicle',
      'Methane fuel for reusability',
      'Advanced additive manufacturing techniques',
    ],
    description: 'The Aeon R is Relativity Space\'s next-generation engine for the Terran R reusable launch vehicle. It uses methane fuel and a more advanced cycle than Aeon 1.',
    technicalNotes: 'The Aeon R advances Relativity\'s additive manufacturing expertise to a staged combustion engine, pushing the boundaries of what can be 3D printed.',
    sourceUrls: [
      'https://www.relativityspace.com/terran-r',
    ],
    status: 'development',
  },

  // Firefly Aerospace Engines
  {
    slug: 'reaver',
    name: 'Reaver',
    category: 'engine',
    manufacturer: 'Firefly Aerospace',
    specifications: {
      thrust: 200,
      thrustVacuum: 222,
      isp: 294,
      ispVacuum: 311,
      cycleType: 'Tap-Off',
      throttleRange: '50%-100%',
      chamberPressure: 55,
      mass: 110,
      restartCapability: true,
    },
    propellantType: 'RP-1/LOX',
    firstFlight: new Date('2022-10-01'),
    missionsFlown: 3,
    keyInnovations: [
      'Tap-off cycle for simplicity',
      'Additively manufactured injector',
      'Designed for low-cost manufacturing',
      'Modular design for rapid assembly',
    ],
    description: 'The Reaver is the first-stage engine for the Firefly Alpha launch vehicle. It uses a tap-off cycle for simplicity and reliability.',
    technicalNotes: 'Four Reaver engines power the Alpha first stage. The tap-off cycle bleeds combustion gases to drive the turbopumps, simpler than staged combustion but with good performance.',
    sourceUrls: [
      'https://fireflyspace.com/vehicles/alpha/',
    ],
    status: 'operational',
  },
  {
    slug: 'lightning',
    name: 'Lightning',
    category: 'engine',
    manufacturer: 'Firefly Aerospace',
    specifications: {
      thrust: 10,
      thrustVacuum: 65,
      ispVacuum: 320,
      cycleType: 'Tap-Off',
      throttleRange: '60%-100%',
      mass: 30,
      restartCapability: true,
    },
    propellantType: 'RP-1/LOX',
    firstFlight: new Date('2022-10-01'),
    missionsFlown: 3,
    keyInnovations: [
      'Carbon composite nozzle extension',
      'Designed for vacuum operation',
      'Multiple restart capability',
      'Lightweight construction',
    ],
    description: 'The Lightning engine powers the second stage of the Firefly Alpha vehicle. It features a large expansion ratio nozzle for vacuum efficiency.',
    technicalNotes: 'The Lightning uses a carbon-carbon nozzle extension for high expansion ratio operation in vacuum, maximizing specific impulse for the upper stage.',
    sourceUrls: [
      'https://fireflyspace.com/vehicles/alpha/',
    ],
    status: 'operational',
  },

  // ULA Engines
  {
    slug: 'rd-180',
    name: 'RD-180',
    category: 'engine',
    manufacturer: 'NPO Energomash',
    specifications: {
      thrust: 3830,
      thrustVacuum: 4152,
      isp: 311,
      ispVacuum: 338,
      cycleType: 'Oxidizer-Rich Staged Combustion',
      throttleRange: '47%-100%',
      chamberPressure: 267,
      mass: 5480,
      nozzleRatio: 36.4,
      gimbalRange: 8,
    },
    propellantType: 'RP-1/LOX',
    firstFlight: new Date('2000-05-24'),
    missionsFlown: 108,
    keyInnovations: [
      'Derived from N1/Moon rocket technology',
      'Highest thrust-to-weight staged combustion',
      'Dual-combustion chamber design',
      'Advanced Russian metallurgy',
      'Exceptional reliability record',
    ],
    description: 'The RD-180 is a Russian-built engine that powered the Atlas V first stage. It is derived from the RD-170 developed for the Energia rocket and represents the pinnacle of Soviet/Russian engine technology.',
    technicalNotes: 'The dual-nozzle configuration derives from the four-nozzle RD-170, the world\'s most powerful liquid-fuel engine. The oxygen-rich staged combustion cycle achieves very high chamber pressures.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/RD-180_test_firing.jpg/800px-RD-180_test_firing.jpg',
    sourceUrls: [
      'https://www.rocket.com/space/liquid-engines/rd-180',
    ],
    status: 'retired',
  },
];

// ============================================================
// Seed Data: Satellite Buses (10+)
// ============================================================

export const SATELLITE_BUSES_SEED: BlueprintSeed[] = [
  {
    slug: 'maxar-1300',
    name: 'SSL 1300 / Maxar 1300',
    category: 'satellite_bus',
    manufacturer: 'Maxar Technologies',
    specifications: {
      dryMass: 1500,
      maxPayloadMass: 2000,
      power: 25000,
      designLife: 15,
      propulsion: 'Bi-propellant and Electric',
      attitude: '3-axis stabilized',
      dimensions: '3.2m x 2.4m x 2.4m',
      stationkeeping: 'Chemical and EP',
    },
    keyInnovations: [
      'Modular architecture for mission flexibility',
      'All-electric variant (1300-EP)',
      'High power with flexible solar arrays',
      'Heritage from over 100 missions',
      'Supports multiple payload configurations',
    ],
    description: 'The SSL/Maxar 1300 is one of the most successful commercial satellite platforms, used for communications, Earth observation, and government missions. It offers configurations from medium to high-power applications.',
    technicalNotes: 'The 1300 platform supports both chemical and all-electric propulsion variants. The all-electric version significantly reduces launch mass at the cost of longer orbit raising time.',
    firstFlight: new Date('1989-09-01'),
    missionsFlown: 110,
    sourceUrls: [
      'https://www.maxar.com/products/spacecraft-platforms/1300-series',
    ],
    status: 'operational',
  },
  {
    slug: 'maxar-500',
    name: 'Maxar 500',
    category: 'satellite_bus',
    manufacturer: 'Maxar Technologies',
    specifications: {
      dryMass: 600,
      maxPayloadMass: 500,
      power: 4500,
      designLife: 15,
      propulsion: 'All-Electric (Hall Thrusters)',
      attitude: '3-axis stabilized',
      dimensions: '1.8m x 1.5m x 1.5m',
    },
    keyInnovations: [
      'All-electric propulsion standard',
      'Compact form factor for rideshare',
      'Designed for LEO and MEO',
      'Rapid manufacturing capability',
    ],
    description: 'The Maxar 500 is a smaller, all-electric satellite bus designed for LEO and MEO missions. It offers a cost-effective solution for smaller payloads.',
    missionsFlown: 35,
    sourceUrls: [
      'https://www.maxar.com/products/spacecraft-platforms',
    ],
    status: 'operational',
  },
  {
    slug: 'eurostar-neo',
    name: 'Eurostar Neo',
    category: 'satellite_bus',
    manufacturer: 'Airbus Defence and Space',
    specifications: {
      dryMass: 2000,
      maxPayloadMass: 2200,
      power: 25000,
      designLife: 15,
      propulsion: 'Electric (plasma) and Chemical',
      attitude: '3-axis stabilized',
      dimensions: '4.0m x 3.5m x 3.5m',
      dataRate: 500,
    },
    keyInnovations: [
      'All-electric orbit raising capability',
      'Modular payload accommodation',
      'Enhanced thermal control',
      'Flexible power system up to 25kW',
      'Software-defined radio capability',
    ],
    description: 'The Eurostar Neo is Airbus\'s next-generation GEO satellite platform, offering improved performance and flexibility over previous Eurostar generations. It supports both electric and chemical propulsion.',
    firstFlight: new Date('2021-07-30'),
    missionsFlown: 8,
    sourceUrls: [
      'https://www.airbus.com/en/products-services/space/satellites/eurostar-neo',
    ],
    status: 'operational',
  },
  {
    slug: 'onesat',
    name: 'OneSat',
    category: 'satellite_bus',
    manufacturer: 'Airbus Defence and Space',
    specifications: {
      dryMass: 1000,
      maxPayloadMass: 3500,
      power: 20000,
      designLife: 15,
      propulsion: 'All-Electric',
      attitude: '3-axis stabilized',
    },
    keyInnovations: [
      'Fully reconfigurable in orbit',
      'Software-defined satellite concept',
      'Standardized manufacturing process',
      'Digital payload architecture',
      'Beam forming flexibility',
    ],
    description: 'OneSat is Airbus\'s revolutionary software-defined satellite platform that can be fully reconfigured in orbit. This allows operators to change coverage, capacity, and frequency on demand.',
    firstFlight: new Date('2023-06-23'),
    missionsFlown: 4,
    sourceUrls: [
      'https://www.airbus.com/en/products-services/space/satellites/onesat',
    ],
    status: 'operational',
  },
  {
    slug: 'geostar-3',
    name: 'GEOStar-3',
    category: 'satellite_bus',
    manufacturer: 'Northrop Grumman',
    specifications: {
      dryMass: 1500,
      maxPayloadMass: 1800,
      power: 15000,
      designLife: 15,
      propulsion: 'Bi-propellant',
      attitude: '3-axis stabilized',
      dimensions: '3.0m x 2.5m x 2.5m',
    },
    keyInnovations: [
      'Proven heritage from GEOStar-2',
      'Flexible power and thermal systems',
      'Multiple launch vehicle compatibility',
      'Advanced avionics suite',
    ],
    description: 'The GEOStar-3 is Northrop Grumman\'s premier GEO satellite platform, building on decades of experience with the GEOStar product line for commercial and government applications.',
    missionsFlown: 25,
    sourceUrls: [
      'https://www.northropgrumman.com/space/satellite-buses/',
    ],
    status: 'operational',
  },
  {
    slug: 'bcp-2000',
    name: 'BCP 2000',
    category: 'satellite_bus',
    manufacturer: 'Ball Aerospace',
    specifications: {
      dryMass: 800,
      maxPayloadMass: 1200,
      power: 3000,
      designLife: 7,
      propulsion: 'Hydrazine Monopropellant',
      attitude: '3-axis stabilized',
    },
    keyInnovations: [
      'Designed for Earth observation',
      'High agility for imaging missions',
      'Modular avionics architecture',
      'Rapid slew capability',
    ],
    description: 'The BCP 2000 is Ball Aerospace\'s medium-class platform designed for high-performance Earth observation and science missions. It emphasizes agility and pointing accuracy.',
    firstFlight: new Date('2010-09-02'),
    missionsFlown: 12,
    sourceUrls: [
      'https://www.ball.com/aerospace',
    ],
    status: 'operational',
  },
  {
    slug: 'bcp-100',
    name: 'BCP 100',
    category: 'satellite_bus',
    manufacturer: 'Ball Aerospace',
    specifications: {
      dryMass: 150,
      maxPayloadMass: 200,
      power: 500,
      designLife: 5,
      propulsion: 'Electric or Monopropellant',
      attitude: '3-axis stabilized',
      dimensions: '1.0m x 0.8m x 0.8m',
    },
    keyInnovations: [
      'Small satellite form factor',
      'LEO optimized design',
      'Rapid development cycle',
      'Commercial-off-the-shelf components',
    ],
    description: 'The BCP 100 is Ball Aerospace\'s small satellite platform for LEO missions, offering a cost-effective solution for smaller payloads and technology demonstration.',
    missionsFlown: 8,
    sourceUrls: [
      'https://www.ball.com/aerospace',
    ],
    status: 'operational',
  },
  {
    slug: 'photon',
    name: 'Photon',
    category: 'satellite_bus',
    manufacturer: 'Rocket Lab',
    specifications: {
      dryMass: 60,
      maxPayloadMass: 200,
      power: 200,
      designLife: 5,
      propulsion: 'Curie Engine (Bi-propellant)',
      attitude: '3-axis stabilized',
      dimensions: '0.8m x 0.8m x 0.6m',
    },
    keyInnovations: [
      'Derived from Electron kick stage',
      'Integrated with Electron launcher',
      'High delta-V capability for small sat',
      'Interplanetary mission capable',
      'End-to-end mission solution',
    ],
    description: 'Photon is Rocket Lab\'s versatile satellite bus derived from their Electron kick stage. It has been used for LEO, lunar, and interplanetary missions including NASA\'s CAPSTONE.',
    firstFlight: new Date('2020-08-31'),
    missionsFlown: 8,
    sourceUrls: [
      'https://www.rocketlabusa.com/space-systems/photon/',
    ],
    status: 'operational',
  },
  {
    slug: 'york-s-class',
    name: 'S-Class',
    category: 'satellite_bus',
    manufacturer: 'York Space Systems',
    specifications: {
      dryMass: 85,
      maxPayloadMass: 100,
      power: 750,
      designLife: 7,
      propulsion: 'Green Monopropellant',
      attitude: '3-axis stabilized',
      dimensions: '0.9m x 0.7m x 0.5m',
    },
    keyInnovations: [
      'Mass-produced satellite bus',
      'Designed for constellation deployment',
      'Standardized interfaces',
      'Rapid manufacturing (days not months)',
      'Affordable mission access',
    ],
    description: 'The York Space Systems S-Class is a standardized, mass-produced satellite bus designed for rapid constellation deployment. It emphasizes affordability and rapid manufacturing.',
    firstFlight: new Date('2020-06-13'),
    missionsFlown: 30,
    sourceUrls: [
      'https://www.yorkspacesystems.com/spacecraft',
    ],
    status: 'operational',
  },
  {
    slug: 'spacebus-neo',
    name: 'Spacebus Neo',
    category: 'satellite_bus',
    manufacturer: 'Thales Alenia Space',
    specifications: {
      dryMass: 1200,
      maxPayloadMass: 2000,
      power: 20000,
      designLife: 15,
      propulsion: 'Electric and Chemical Options',
      attitude: '3-axis stabilized',
    },
    keyInnovations: [
      'All-electric or hybrid propulsion',
      'Enhanced power density',
      'Digital payload ready',
      'Flexible configuration options',
    ],
    description: 'Spacebus Neo is Thales Alenia Space\'s next-generation telecom platform, offering improved performance and flexibility for GEO communications satellites.',
    firstFlight: new Date('2021-01-17'),
    missionsFlown: 10,
    sourceUrls: [
      'https://www.thalesgroup.com/en/spacebus-neo',
    ],
    status: 'operational',
  },
  {
    slug: 'leostar-3',
    name: 'LEOStar-3',
    category: 'satellite_bus',
    manufacturer: 'Northrop Grumman',
    specifications: {
      dryMass: 500,
      maxPayloadMass: 800,
      power: 2000,
      designLife: 7,
      propulsion: 'Hydrazine Monopropellant',
      attitude: '3-axis stabilized',
    },
    keyInnovations: [
      'Optimized for LEO science missions',
      'High pointing accuracy',
      'NASA heritage missions',
      'Flexible instrument accommodation',
    ],
    description: 'LEOStar-3 is Northrop Grumman\'s platform for LEO science and Earth observation missions, with heritage from DSCOVR, ICON, and other NASA missions.',
    missionsFlown: 15,
    sourceUrls: [
      'https://www.northropgrumman.com/space/satellite-buses/',
    ],
    status: 'operational',
  },
];

// ============================================================
// Seed Data: Lunar Landers (8+)
// ============================================================

export const LUNAR_LANDERS_SEED: BlueprintSeed[] = [
  {
    slug: 'starship-hls',
    name: 'Starship HLS',
    category: 'lander',
    manufacturer: 'SpaceX',
    specifications: {
      landingMass: 100000,
      payloadCapacity: 100000,
      height: 50,
      diameter: 9,
      propulsion: 'Raptor engines (methane/LOX)',
      landingAccuracy: '<100m',
      surfaceOperations: 'Extended duration with solar arrays',
    },
    propellantType: 'CH4/LOX (Methalox)',
    keyInnovations: [
      'Largest lunar lander ever designed',
      'Fully reusable architecture',
      'Propellant depot refueling in orbit',
      'Massive cargo and crew capacity',
      'In-situ propellant production capability',
    ],
    description: 'The Starship Human Landing System (HLS) is SpaceX\'s lunar lander variant, selected by NASA for Artemis III. It will be the largest spacecraft ever to land on the Moon.',
    technicalNotes: 'The HLS variant features an elevator system for surface access, additional RCS thrusters, and specialized landing legs. It requires orbital refueling from multiple Starship tanker flights.',
    sourceUrls: [
      'https://www.spacex.com/vehicles/starship/',
      'https://www.nasa.gov/humans-in-space/human-landing-system/',
    ],
    status: 'development',
  },
  {
    slug: 'blue-moon',
    name: 'Blue Moon MK2',
    category: 'lander',
    manufacturer: 'Blue Origin',
    specifications: {
      landingMass: 20000,
      payloadCapacity: 6000,
      height: 12,
      diameter: 7,
      propulsion: 'BE-7 engine (hydrogen/LOX)',
      landingAccuracy: '<100m',
      surfaceOperations: 'Up to 14 Earth days',
    },
    propellantType: 'LH2/LOX',
    keyInnovations: [
      'Vertical cargo configuration',
      'Precision landing with BE-7',
      'Sustainable architecture for repeat missions',
      'Large payload bay access',
    ],
    description: 'Blue Moon MK2 is Blue Origin\'s crewed lunar lander, selected for the Artemis V mission. It uses the BE-7 high-performance hydrogen engine for precision landing.',
    technicalNotes: 'The Blue Moon lander family includes cargo and crew variants. The MK2 crewed variant partners with Lockheed Martin for the crew module.',
    firstFlight: new Date('2029-01-01'),
    sourceUrls: [
      'https://www.blueorigin.com/blue-moon',
      'https://www.nasa.gov/humans-in-space/human-landing-system/',
    ],
    status: 'development',
  },
  {
    slug: 'nova-c',
    name: 'Nova-C',
    category: 'lander',
    manufacturer: 'Intuitive Machines',
    specifications: {
      landingMass: 1900,
      payloadCapacity: 130,
      height: 3.9,
      diameter: 1.5,
      propulsion: 'VR900 engine (methane/LOX)',
      landingAccuracy: '<200m',
      surfaceOperations: 'Up to 14 Earth days',
    },
    propellantType: 'CH4/LOX (Methalox)',
    firstFlight: new Date('2024-02-22'),
    missionsFlown: 2,
    keyInnovations: [
      'First US commercial lunar lander (Odysseus)',
      'Precision navigation with hazard detection',
      'Cryogenic methane propulsion',
      'Flexible payload integration',
    ],
    description: 'Nova-C is Intuitive Machines\' commercial lunar lander that made history as the first US spacecraft to soft-land on the Moon since Apollo. It carries payloads for NASA CLPS.',
    technicalNotes: 'The IM-1 mission (Odysseus) successfully landed near the lunar south pole in February 2024, though landing on its side. The VR900 engine uses methalox for performance and simplicity.',
    imageUrl: 'https://www.intuitivemachines.com/post/odysseus-lunar-lander-media-resources',
    sourceUrls: [
      'https://www.intuitivemachines.com/nova-c',
      'https://www.nasa.gov/commercial-lunar-payload-services',
    ],
    status: 'operational',
  },
  {
    slug: 'peregrine',
    name: 'Peregrine',
    category: 'lander',
    manufacturer: 'Astrobotic Technology',
    specifications: {
      landingMass: 1283,
      payloadCapacity: 265,
      height: 1.9,
      diameter: 2.5,
      propulsion: 'Bi-propellant main engine',
      landingAccuracy: '<100m',
      surfaceOperations: 'Up to 192 hours',
    },
    propellantType: 'MMH/MON-3',
    firstFlight: new Date('2024-01-08'),
    missionsFlown: 1,
    keyInnovations: [
      'First US commercial lunar landing attempt since Apollo',
      'Compact lander design',
      'Multiple payload bays',
      'Autonomous landing capability',
    ],
    description: 'Peregrine was Astrobotic\'s first lunar lander, launched in January 2024. Though a propulsion anomaly prevented lunar landing, it advanced commercial lunar exploration.',
    technicalNotes: 'The Peregrine-1 mission experienced a propellant leak after launch that prevented the landing attempt. The spacecraft was intentionally deorbited over the Pacific Ocean.',
    sourceUrls: [
      'https://www.astrobotic.com/lunar-delivery/peregrine/',
      'https://www.nasa.gov/commercial-lunar-payload-services',
    ],
    status: 'operational',
  },
  {
    slug: 'griffin',
    name: 'Griffin',
    category: 'lander',
    manufacturer: 'Astrobotic Technology',
    specifications: {
      landingMass: 5300,
      payloadCapacity: 625,
      payloadVolume: 13,
      height: 4.5,
      diameter: 4.5,
      propulsion: 'VIPER delivery main engine',
      landingAccuracy: '<100m',
      surfaceOperations: 'Varies by mission',
    },
    propellantType: 'MMH/MON-3',
    keyInnovations: [
      'Large payload capacity for small lander',
      'Rover deployment capable',
      'Flexible payload deck',
      'Selected for NASA VIPER mission',
    ],
    description: 'Griffin is Astrobotic\'s larger lunar lander, selected to deliver NASA\'s VIPER rover to the lunar south pole. It offers significantly more capacity than Peregrine.',
    technicalNotes: 'Griffin was selected for the VIPER mission but the mission was subsequently cancelled. The Griffin lander design continues development for other missions.',
    sourceUrls: [
      'https://www.astrobotic.com/lunar-delivery/griffin/',
    ],
    status: 'development',
  },
  {
    slug: 'hakuto-r',
    name: 'HAKUTO-R',
    category: 'lander',
    manufacturer: 'ispace',
    specifications: {
      landingMass: 1000,
      payloadCapacity: 30,
      height: 2.3,
      diameter: 2.6,
      propulsion: 'Bi-propellant main engine',
      landingAccuracy: '<100m',
    },
    propellantType: 'MMH/MON-3',
    firstFlight: new Date('2022-12-11'),
    missionsFlown: 2,
    keyInnovations: [
      'First Japanese commercial lunar lander',
      'Compact design for rideshare launch',
      'Lunar development vision',
      'Micro rover deployment',
    ],
    description: 'HAKUTO-R is ispace\'s lunar lander, representing Japan\'s commercial lunar ambitions. Mission 1 crashed during landing, while Mission 2 is planned with improvements.',
    technicalNotes: 'The M1 lander experienced a software anomaly during descent that caused it to run out of propellant and crash. ispace has implemented corrections for subsequent missions.',
    sourceUrls: [
      'https://ispace-inc.com/hakuto-r/',
    ],
    status: 'operational',
  },
  {
    slug: 'blue-ghost',
    name: 'Blue Ghost',
    category: 'lander',
    manufacturer: 'Firefly Aerospace',
    specifications: {
      landingMass: 1700,
      payloadCapacity: 150,
      height: 2.0,
      diameter: 3.5,
      propulsion: 'Bi-propellant',
      landingAccuracy: '<100m',
      surfaceOperations: 'Up to 14 Earth days',
    },
    propellantType: 'Hypergolic',
    keyInnovations: [
      'Selected for NASA CLPS',
      'Mare Crisium landing site',
      'Multiple payload types supported',
      'Rapid development timeline',
    ],
    description: 'Blue Ghost is Firefly Aerospace\'s lunar lander selected for NASA\'s Commercial Lunar Payload Services program. It will deliver payloads to Mare Crisium on the near side of the Moon.',
    technicalNotes: 'Blue Ghost Ghost Mission 1 (BG-1) will carry 10 NASA payloads plus commercial cargo. The lander uses a heritage propulsion system for reliability.',
    sourceUrls: [
      'https://fireflyspace.com/vehicles/blue-ghost/',
      'https://www.nasa.gov/commercial-lunar-payload-services',
    ],
    status: 'development',
  },
  {
    slug: 'chang-e-lander',
    name: 'Chang\'e Lunar Lander',
    category: 'lander',
    manufacturer: 'CNSA/CASC',
    specifications: {
      landingMass: 3780,
      payloadCapacity: 400,
      height: 3.0,
      propulsion: 'Variable-thrust engine',
      landingAccuracy: '<100m',
      surfaceOperations: 'Multiple lunar days',
    },
    propellantType: 'Hypergolic',
    firstFlight: new Date('2013-12-14'),
    missionsFlown: 6,
    keyInnovations: [
      'First Chinese lunar landers',
      'Sample return capability (Chang\'e 5/6)',
      'Far side landing (Chang\'e 4)',
      'Autonomous hazard avoidance',
      'Rover deployment',
    ],
    description: 'The Chang\'e series landers represent China\'s successful lunar exploration program, including the first far-side landing and recent sample return missions.',
    technicalNotes: 'The Chang\'e lander design has evolved across missions, from the basic Chang\'e 3 lander to the sample-return capable Chang\'e 5/6 designs.',
    sourceUrls: [
      'http://www.cnsa.gov.cn/',
    ],
    status: 'operational',
  },
  {
    slug: 'chandrayaan-lander',
    name: 'Vikram Lander',
    category: 'lander',
    manufacturer: 'ISRO',
    specifications: {
      landingMass: 1752,
      payloadCapacity: 50,
      height: 2.0,
      diameter: 2.0,
      propulsion: 'Throttleable main engines',
      landingAccuracy: '<500m',
      surfaceOperations: 'One lunar day',
    },
    propellantType: 'Hypergolic',
    firstFlight: new Date('2023-08-23'),
    missionsFlown: 1,
    keyInnovations: [
      'First landing near lunar south pole',
      'Autonomous powered descent',
      'Pragyan rover deployment',
      'Cost-effective design',
    ],
    description: 'The Vikram lander, part of Chandrayaan-3, successfully landed near the lunar south pole in August 2023, making India the fourth country to achieve a soft landing on the Moon.',
    technicalNotes: 'Vikram carried the Pragyan rover and several scientific instruments. The mission operated for one lunar day before entering sleep mode.',
    sourceUrls: [
      'https://www.isro.gov.in/Chandrayaan3.html',
    ],
    status: 'operational',
  },
];

// ============================================================
// Combined Seed Data
// ============================================================

export const BLUEPRINTS_SEED: BlueprintSeed[] = [
  ...ROCKET_ENGINES_SEED,
  ...SATELLITE_BUSES_SEED,
  ...LUNAR_LANDERS_SEED,
];

// ============================================================
// Database Operations
// ============================================================

export async function initializeBlueprintData() {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const blueprint of BLUEPRINTS_SEED) {
    try {
      const existing = await prisma.blueprint.findUnique({
        where: { slug: blueprint.slug },
      });

      const data = {
        name: blueprint.name,
        category: blueprint.category,
        manufacturer: blueprint.manufacturer,
        specifications: JSON.stringify(blueprint.specifications),
        propellantType: blueprint.propellantType || null,
        firstFlight: blueprint.firstFlight || null,
        missionsFlown: blueprint.missionsFlown || null,
        keyInnovations: JSON.stringify(blueprint.keyInnovations),
        description: blueprint.description,
        technicalNotes: blueprint.technicalNotes || null,
        imageUrl: blueprint.imageUrl || null,
        diagramUrl: blueprint.diagramUrl || null,
        sourceUrls: JSON.stringify(blueprint.sourceUrls),
        status: blueprint.status,
      };

      if (existing) {
        await prisma.blueprint.update({
          where: { slug: blueprint.slug },
          data,
        });
        results.updated++;
      } else {
        await prisma.blueprint.create({
          data: {
            slug: blueprint.slug,
            ...data,
          },
        });
        results.created++;
      }
    } catch (error) {
      console.error(`Error processing blueprint ${blueprint.slug}:`, error);
      results.errors++;
    }
  }

  return results;
}

// ============================================================
// Query Functions
// ============================================================

export interface BlueprintQueryOptions {
  category?: BlueprintCategory;
  manufacturer?: string;
  status?: BlueprintStatus;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'manufacturer' | 'firstFlight' | 'missionsFlown';
  sortOrder?: 'asc' | 'desc';
}

export async function getBlueprints(options: BlueprintQueryOptions = {}) {
  const {
    category,
    manufacturer,
    status,
    search,
    limit = 50,
    offset = 0,
    sortBy = 'name',
    sortOrder = 'asc',
  } = options;

  const where: Record<string, unknown> = {};

  if (category) {
    where.category = category;
  }
  if (manufacturer) {
    where.manufacturer = manufacturer;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [blueprints, total] = await Promise.all([
    prisma.blueprint.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    }),
    prisma.blueprint.count({ where }),
  ]);

  // Parse JSON fields
  const parsed = blueprints.map(bp => ({
    ...bp,
    specifications: bp.specifications ? safeJsonParse(bp.specifications, {}) : {},
    keyInnovations: bp.keyInnovations ? safeJsonParse(bp.keyInnovations, []) : [],
    sourceUrls: bp.sourceUrls ? safeJsonParse(bp.sourceUrls, []) : [],
  }));

  return { blueprints: parsed, total };
}

export async function getBlueprintBySlug(slug: string) {
  const blueprint = await prisma.blueprint.findUnique({
    where: { slug },
  });

  if (!blueprint) return null;

  return {
    ...blueprint,
    specifications: blueprint.specifications ? safeJsonParse(blueprint.specifications, {}) : {},
    keyInnovations: blueprint.keyInnovations ? safeJsonParse(blueprint.keyInnovations, []) : [],
    sourceUrls: blueprint.sourceUrls ? safeJsonParse(blueprint.sourceUrls, []) : [],
  };
}

export async function getBlueprintStats() {
  const [
    total,
    byCategory,
    byStatus,
    byManufacturer,
    totalMissions,
  ] = await Promise.all([
    prisma.blueprint.count(),
    prisma.blueprint.groupBy({
      by: ['category'],
      _count: true,
    }),
    prisma.blueprint.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.blueprint.groupBy({
      by: ['manufacturer'],
      _count: true,
      orderBy: { _count: { manufacturer: 'desc' } },
      take: 10,
    }),
    prisma.blueprint.aggregate({
      _sum: { missionsFlown: true },
    }),
  ]);

  return {
    total,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {} as Record<string, number>),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>),
    byManufacturer: byManufacturer.map(item => ({
      manufacturer: item.manufacturer,
      count: item._count,
    })),
    totalMissionsFlown: totalMissions._sum.missionsFlown || 0,
  };
}

export async function getManufacturers() {
  const manufacturers = await prisma.blueprint.findMany({
    select: { manufacturer: true },
    distinct: ['manufacturer'],
    orderBy: { manufacturer: 'asc' },
  });

  return manufacturers.map(m => m.manufacturer);
}
